/* ==================== REPORTS.JS ====================
   Relatórios com dados reais da tabela playback_logs
*/

let currentUser = null
let allLogs = []
let showAllLogs = false
let activeDays = 7

// Mesma lógica do dashboard — online = ping nos últimos 2 minutos
const OFFLINE_THRESHOLD_MS = 2 * 60 * 1000

function isScreenOnline(screen) {
  if (!screen.last_ping) return false
  const lastPing = new Date(screen.last_ping).getTime()
  return (Date.now() - lastPing) < OFFLINE_THRESHOLD_MS
}

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentUser = await checkAuth()
    if (!currentUser) return
    await loadSidebar('reports')
    setupEventListeners()
    setDefaultDates()
    await Promise.all([loadFilters(), loadReports()])
  } catch (error) {
    console.error('❌ Erro:', error)
    showNotification('Erro ao carregar página', 'error')
  }
})

// ==================== DATAS PADRÃO ====================

function setDefaultDates() {
  const end = new Date()
  const start = new Date()
  start.setDate(end.getDate() - 7)
  document.getElementById('filterEndDate').value = end.toISOString().split('T')[0]
  document.getElementById('filterStartDate').value = start.toISOString().split('T')[0]
}

function getDateRange() {
  const start = document.getElementById('filterStartDate').value
  const end = document.getElementById('filterEndDate').value
  return { start: start + 'T00:00:00', end: end + 'T23:59:59' }
}

// ==================== FILTROS ====================

async function loadFilters() {
  try {
    const [campaignsRes, screensRes] = await Promise.all([
      apiSelect('campaigns', { userId: currentUser.id, select: 'id,name' }),
      apiSelect('screens', { userId: currentUser.id, select: 'id,name' })
    ])

    const campaignSelect = document.getElementById('filterCampaign')
    ;(campaignsRes.data || []).forEach(c => {
      const opt = document.createElement('option')
      opt.value = c.id
      opt.textContent = c.name
      campaignSelect.appendChild(opt)
    })

    const screenSelect = document.getElementById('filterScreen')
    ;(screensRes.data || []).forEach(s => {
      const opt = document.createElement('option')
      opt.value = s.id
      opt.textContent = s.name
      screenSelect.appendChild(opt)
    })
  } catch (e) {
    console.error('Erro ao carregar filtros:', e)
  }
}

// ==================== CARREGAR RELATÓRIOS ====================

async function loadReports() {
  const { start, end } = getDateRange()
  const campaignFilter = document.getElementById('filterCampaign').value
  const screenFilter = document.getElementById('filterScreen').value

  try {
    // Busca logs com join em campaigns e screens — inclui last_ping para status correto
    let query = supabaseClient
      .from('playback_logs')
      .select('*, campaigns(name), screens(name, status, last_ping)')
      .eq('user_id', currentUser.id)
      .gte('played_at', start)
      .lte('played_at', end)
      .order('played_at', { ascending: false })

    if (campaignFilter) query = query.eq('campaign_id', campaignFilter)
    if (screenFilter) query = query.eq('screen_id', screenFilter)

    const { data: logs, error } = await query
    if (error) throw error

    allLogs = logs || []

    // KPIs paralelos — inclui last_ping para calcular online corretamente
    const [campaignsRes, screensRes] = await Promise.all([
      apiSelect('campaigns', { userId: currentUser.id, select: 'id' }),
      apiSelect('screens', { userId: currentUser.id, select: 'id,status,last_ping' })
    ])

    renderKPIs(allLogs, campaignsRes.data || [], screensRes.data || [])
    renderChart(allLogs, start, end)
    renderTopCampaigns(allLogs)
    renderTopScreens(allLogs)
    renderDetailedLog(allLogs)

  } catch (error) {
    console.error('❌ Erro ao carregar relatórios:', error)
    showNotification('Erro ao carregar dados', 'error')
    renderEmpty()
  }
}

// ==================== KPIs ====================

function renderKPIs(logs, campaigns, screens) {
  const totalViews = logs.length
  const totalSeconds = logs.reduce((sum, l) => sum + (l.duration_seconds || 0), 0)
  const totalHours = (totalSeconds / 3600).toFixed(1)
  const uniqueCampaigns = new Set(logs.map(l => l.campaign_id)).size

  // Usa last_ping para calcular online — mesma lógica do dashboard
  const onlineScreens = screens.filter(s => isScreenOnline(s)).length

  document.getElementById('totalViews').textContent = totalViews.toLocaleString('pt-BR')
  document.getElementById('totalHours').textContent = totalHours + 'h'
  document.getElementById('totalCampaigns').textContent = campaigns.length
  document.getElementById('totalScreens').textContent = screens.length

  document.getElementById('subViews').textContent =
    uniqueCampaigns > 0 ? `${uniqueCampaigns} campanha${uniqueCampaigns > 1 ? 's' : ''} diferentes` : 'Sem exibições no período'
  document.getElementById('subHours').textContent =
    `${Math.round(totalSeconds / 60)} minutos no total`
  document.getElementById('subCampaigns').textContent =
    `${uniqueCampaigns} ativas no período`
  document.getElementById('subScreens').textContent =
    `${onlineScreens} online agora`
}

// ==================== GRÁFICO DE BARRAS ====================

function renderChart(logs, startStr, endStr) {
  const chartArea = document.getElementById('chartArea')

  if (logs.length === 0) {
    chartArea.innerHTML = `
      <div class="chart-empty">
        <div style="font-size:32px;">📊</div>
        Sem dados no período selecionado
      </div>`
    return
  }

  // Agrupa por dia
  const byDay = {}
  logs.forEach(log => {
    const day = log.played_at.split('T')[0]
    byDay[day] = (byDay[day] || 0) + 1
  })

  // Gera todos os dias do período
  const start = new Date(startStr)
  const end = new Date(endStr)
  const days = []
  const cur = new Date(start)
  while (cur <= end) {
    days.push(cur.toISOString().split('T')[0])
    cur.setDate(cur.getDate() + 1)
  }

  // Limita a 30 dias no gráfico para legibilidade
  const displayDays = days.slice(-30)
  const maxVal = Math.max(...displayDays.map(d => byDay[d] || 0), 1)

  chartArea.innerHTML = displayDays.map(day => {
    const count = byDay[day] || 0
    const heightPct = maxVal > 0 ? Math.max((count / maxVal) * 100, count > 0 ? 4 : 0) : 0
    const label = new Date(day + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })

    return `
      <div class="bar-group" title="${label}: ${count} exibições">
        <div class="bar-count">${count > 0 ? count : ''}</div>
        <div class="bar-wrap">
          <div class="bar" style="height: ${heightPct}%"></div>
        </div>
        <div class="bar-label">${label}</div>
      </div>`
  }).join('')
}

// ==================== TOP CAMPANHAS ====================

function renderTopCampaigns(logs) {
  const tbody = document.getElementById('topCampaigns')

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sem dados no período</td></tr>`
    document.getElementById('campaignCount').textContent = '0'
    return
  }

  const byCampaign = {}
  logs.forEach(log => {
    const id = log.campaign_id
    const name = log.campaigns?.name || 'Sem nome'
    if (!byCampaign[id]) byCampaign[id] = { name, views: 0, seconds: 0 }
    byCampaign[id].views++
    byCampaign[id].seconds += log.duration_seconds || 0
  })

  const sorted = Object.values(byCampaign).sort((a, b) => b.views - a.views)
  document.getElementById('campaignCount').textContent = sorted.length

  tbody.innerHTML = sorted.slice(0, 10).map((c, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''
    const duration = formatSeconds(c.seconds)
    return `
      <tr>
        <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
        <td><div class="campaign-name" title="${escapeHtml(c.name)}">${escapeHtml(c.name)}</div></td>
        <td><span class="views-count">${c.views.toLocaleString('pt-BR')}</span></td>
        <td><span class="duration-text">${duration}</span></td>
      </tr>`
  }).join('')
}

// ==================== TOP TELAS ====================

function renderTopScreens(logs) {
  const tbody = document.getElementById('topScreens')

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sem dados no período</td></tr>`
    document.getElementById('screenCount').textContent = '0'
    return
  }

  // Agrupa por tela — guarda last_ping para calcular status correto
  const byScreen = {}
  logs.forEach(log => {
    const id = log.screen_id
    const name = log.screens?.name || 'Sem nome'
    const lastPing = log.screens?.last_ping || null
    if (!byScreen[id]) byScreen[id] = { name, views: 0, lastPing }
    byScreen[id].views++
    // Mantém o last_ping mais recente
    if (lastPing && (!byScreen[id].lastPing || lastPing > byScreen[id].lastPing)) {
      byScreen[id].lastPing = lastPing
    }
  })

  const sorted = Object.values(byScreen).sort((a, b) => b.views - a.views)
  document.getElementById('screenCount').textContent = sorted.length

  tbody.innerHTML = sorted.slice(0, 10).map((s, i) => {
    const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : ''
    // Usa last_ping para status — mesma lógica do dashboard
    const isOnline = isScreenOnline({ last_ping: s.lastPing })
    return `
      <tr>
        <td><span class="rank-badge ${rankClass}">${i + 1}</span></td>
        <td><div class="campaign-name" title="${escapeHtml(s.name)}">${escapeHtml(s.name)}</div></td>
        <td><span class="views-count">${s.views.toLocaleString('pt-BR')}</span></td>
        <td>
          <span class="status-badge ${isOnline ? 'online' : 'offline'}">
            <span class="status-dot"></span>
            ${isOnline ? 'Online' : 'Offline'}
          </span>
        </td>
      </tr>`
  }).join('')
}

// ==================== LOG DETALHADO ====================

function renderDetailedLog(logs) {
  const tbody = document.getElementById('detailedLog')

  if (logs.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Sem registros no período</td></tr>`
    return
  }

  const display = showAllLogs ? logs : logs.slice(0, 20)

  tbody.innerHTML = display.map(log => {
    const date = new Date(log.played_at).toLocaleString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })
    const campaign = log.campaigns?.name || '—'
    const screen = log.screens?.name || '—'
    const duration = formatSeconds(log.duration_seconds || 0)

    return `
      <tr>
        <td><span class="duration-text">${date}</span></td>
        <td><div class="campaign-name" title="${escapeHtml(campaign)}">${escapeHtml(campaign)}</div></td>
        <td><span style="color:var(--color-muted);">${escapeHtml(screen)}</span></td>
        <td><span class="duration-text">${duration}</span></td>
      </tr>`
  }).join('')

  document.getElementById('btnToggleLog').textContent =
    showAllLogs ? 'Ver menos' : `Ver todos (${logs.length})`
}

function renderEmpty() {
  ['topCampaigns', 'topScreens', 'detailedLog'].forEach(id => {
    const el = document.getElementById(id)
    if (el) el.innerHTML = `<tr><td colspan="4" class="table-empty">Erro ao carregar dados</td></tr>`
  })
}

// ==================== EXPORT CSV ====================

function exportCSV() {
  if (allLogs.length === 0) {
    showNotification('Sem dados para exportar', 'error')
    return
  }

  const headers = ['Data/Hora', 'Campanha', 'Tela', 'Duração (s)']
  const rows = allLogs.map(log => [
    new Date(log.played_at).toLocaleString('pt-BR'),
    log.campaigns?.name || '',
    log.screens?.name || '',
    log.duration_seconds || 0
  ])

  const csv = [headers, ...rows]
    .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n')

  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  const { start, end } = getDateRange()
  a.href = url
  a.download = `loopin-relatorio-${start.split('T')[0]}-${end.split('T')[0]}.csv`
  a.click()
  URL.revokeObjectURL(url)
  showNotification('CSV exportado com sucesso! ✓', 'success')
}

// ==================== EXPORT PDF ====================

async function exportPDF() {
  if (allLogs.length === 0) {
    showNotification('Sem dados para exportar', 'error')
    return
  }

  const btn = document.getElementById('btnExportPDF')
  btn.innerHTML = 'Gerando...'
  btn.disabled = true

  try {
    const { data: settings } = await apiSelect('settings', { eq: { user_id: currentUser.id } })
    const orgName = settings?.[0]?.organization_name || 'Loopin'
    const orgLogo = settings?.[0]?.organization_logo_url || ''

    const { start, end } = getDateRange()
    const totalViews = allLogs.length
    const totalSeconds = allLogs.reduce((s, l) => s + (l.duration_seconds || 0), 0)
    const totalHours = (totalSeconds / 3600).toFixed(1)

    const byCampaign = {}
    allLogs.forEach(log => {
      const name = log.campaigns?.name || 'Sem nome'
      if (!byCampaign[name]) byCampaign[name] = { views: 0, seconds: 0 }
      byCampaign[name].views++
      byCampaign[name].seconds += log.duration_seconds || 0
    })
    const topCampaigns = Object.entries(byCampaign)
      .sort((a, b) => b[1].views - a[1].views)
      .slice(0, 10)

    const periodLabel = `${new Date(start).toLocaleDateString('pt-BR')} a ${new Date(end).toLocaleDateString('pt-BR')}`

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
      <head>
        <meta charset="UTF-8">
        <style>
          * { box-sizing: border-box; margin: 0; padding: 0; }
          body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1a1a2e; background: white; padding: 40px; }
          .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 32px; padding-bottom: 24px; border-bottom: 2px solid #1EAF6A; }
          .header-left h1 { font-size: 22px; font-weight: 700; color: #1EAF6A; }
          .header-left p { font-size: 13px; color: #666; margin-top: 4px; }
          .header-right { font-size: 12px; color: #999; text-align: right; }
          .header-right img { height: 40px; display: block; margin-bottom: 6px; margin-left: auto; }
          .kpis { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16px; margin-bottom: 32px; }
          .kpi { background: #f8fffe; border: 1px solid #d1fae5; border-radius: 10px; padding: 16px; }
          .kpi-label { font-size: 11px; text-transform: uppercase; color: #666; letter-spacing: 0.05em; margin-bottom: 6px; }
          .kpi-val { font-size: 28px; font-weight: 700; color: #1EAF6A; }
          h2 { font-size: 15px; font-weight: 700; color: #1a1a2e; margin-bottom: 12px; }
          table { width: 100%; border-collapse: collapse; font-size: 13px; }
          th { background: #f1f5f9; padding: 10px 12px; text-align: left; font-size: 11px; text-transform: uppercase; color: #666; border-bottom: 1px solid #e2e8f0; }
          td { padding: 10px 12px; border-bottom: 1px solid #f1f5f9; }
          tr:last-child td { border-bottom: none; }
          .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; font-size: 11px; color: #999; text-align: center; }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="header-left">
            <h1>Relatório de Exibição</h1>
            <p>Período: ${periodLabel}</p>
          </div>
          <div class="header-right">
            ${orgLogo ? `<img src="${orgLogo}" alt="${orgName}">` : ''}
            <strong>${orgName}</strong><br>
            Gerado em ${new Date().toLocaleString('pt-BR')}
          </div>
        </div>

        <div class="kpis">
          <div class="kpi">
            <div class="kpi-label">Total de Exibições</div>
            <div class="kpi-val">${totalViews.toLocaleString('pt-BR')}</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Tempo Total no Ar</div>
            <div class="kpi-val">${totalHours}h</div>
          </div>
          <div class="kpi">
            <div class="kpi-label">Campanhas Diferentes</div>
            <div class="kpi-val">${topCampaigns.length}</div>
          </div>
        </div>

        <h2>Top Campanhas no Período</h2>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>Campanha</th>
              <th>Exibições</th>
              <th>Tempo Total</th>
            </tr>
          </thead>
          <tbody>
            ${topCampaigns.map(([name, data], i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${name}</td>
                <td><strong>${data.views.toLocaleString('pt-BR')}</strong></td>
                <td>${formatSeconds(data.seconds)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="footer">
          Relatório gerado automaticamente pelo sistema Loopin — ${orgName}
        </div>
      </body>
      </html>`

    const printWindow = window.open('', '_blank')
    printWindow.document.write(html)
    printWindow.document.close()
    printWindow.onload = () => { printWindow.print() }

    showNotification('PDF aberto para impressão ✓', 'success')

  } catch (e) {
    console.error('Erro ao gerar PDF:', e)
    showNotification('Erro ao gerar PDF', 'error')
  } finally {
    btn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg> Exportar PDF`
    btn.disabled = false
  }
}

// ==================== UTILITÁRIOS ====================

function formatSeconds(seconds) {
  if (!seconds || seconds < 60) return `${seconds || 0}s`
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) return `${h}h ${m}m`
  return `${m}m ${s}s`
}

function escapeHtml(str) {
  if (!str) return ''
  return String(str).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')
}

// ==================== EVENT LISTENERS ====================

function setupEventListeners() {
  document.getElementById('btnExportCSV').addEventListener('click', exportCSV)
  document.getElementById('btnExportPDF').addEventListener('click', exportPDF)
  document.getElementById('btnFilter').addEventListener('click', loadReports)

  document.getElementById('btnToggleLog').addEventListener('click', () => {
    showAllLogs = !showAllLogs
    renderDetailedLog(allLogs)
  })

  document.querySelectorAll('.pill').forEach(pill => {
    pill.addEventListener('click', () => {
      document.querySelectorAll('.pill').forEach(p => p.classList.remove('active'))
      pill.classList.add('active')

      const days = parseInt(pill.dataset.days)
      activeDays = days
      const customDates = document.getElementById('customDates')

      if (days === 0) {
        customDates.style.display = 'flex'
      } else {
        customDates.style.display = 'none'
        const end = new Date()
        const start = new Date()
        start.setDate(end.getDate() - days)
        document.getElementById('filterEndDate').value = end.toISOString().split('T')[0]
        document.getElementById('filterStartDate').value = start.toISOString().split('T')[0]
        loadReports()
      }
    })
  })
}

console.log('✅ Reports.js carregado')
