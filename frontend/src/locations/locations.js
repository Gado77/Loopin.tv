/* ==================== LOCATIONS.JS ====================
   Gerenciamento de Locais com horários dinâmicos
*/

let currentUser = null
let searchTimeout = null

const DAYS = [
  { key: 'mon', label: 'Seg' },
  { key: 'tue', label: 'Ter' },
  { key: 'wed', label: 'Qua' },
  { key: 'thu', label: 'Qui' },
  { key: 'fri', label: 'Sex' },
  { key: 'sat', label: 'Sáb' },
  { key: 'sun', label: 'Dom' }
]

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentUser = await checkAuth()
    if (!currentUser) return

    await loadSidebar('locations')
    setupEventListeners()
    loadLocations()

  } catch (error) {
    console.error('Erro na inicialização:', error)
    showNotification('Erro ao carregar página', 'error')
  }
})

async function loadLocations(searchTerm = '') {
  const tbody = document.getElementById('locationsList')

  try {
    let result

    if (searchTerm.trim()) {
      result = await apiSearch(
        'locations',
        searchTerm,
        ['name', 'address', 'manager_name'],
        currentUser.id
      )
    } else {
      result = await apiSelect('locations', {
        userId: currentUser.id,
        select: '*, screens(count)',
        order: { field: 'created_at', ascending: false }
      })
    }

    const { data: locations, error } = result

    if (error) throw error

    renderLocationsTable(locations)

  } catch (error) {
    console.error('Erro ao carregar:', error)
    tbody.innerHTML = `<tr><td colspan="6" style="color: #E53E3E; text-align: center;">Erro ao carregar dados</td></tr>`
  }
}

function renderLocationsTable(locations) {
  const tbody = document.getElementById('locationsList')

  if (!locations || locations.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align: center; padding: 40px; color: #718096;">Nenhum local cadastrado</td></tr>`
    return
  }

  tbody.innerHTML = locations.map(loc => {
    const screenCount = loc.screens?.[0]?.count || 0
    const badgeClass = screenCount > 0 ? 'online' : 'offline'
    const badgeText = screenCount === 1 ? '1 Tela' : `${screenCount} Telas`

    return `
      <tr>
        <td><strong>${escapeHtml(loc.name)}</strong></td>
        <td>${loc.address ? escapeHtml(loc.address) : '<span style="color: #CBD5E0;">-</span>'}</td>
        <td><span class="status-badge ${badgeClass}">${badgeText}</span></td>
        <td>${loc.manager_name ? escapeHtml(loc.manager_name) : '-'}</td>
        <td>${loc.manager_phone ? formatPhone(loc.manager_phone) : '-'}</td>
        <td style="text-align: right;">
          <button class="btn-icon" onclick="openEditModal('${loc.id}')" title="Editar">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
            </svg>
          </button>
          <button class="btn-icon delete" onclick="deleteLocation('${loc.id}')" title="Excluir">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </button>
        </td>
      </tr>
    `
  }).join('')
}

// ==================== BUSINESS HOURS DINÂMICO ====================

function createHoursGroupHTML(groupId = null, selectedDays = [], turns = [{ open: '09:00', close: '12:00' }]) {
  const id = groupId || `group_${Date.now()}`
  
  const daysHTML = DAYS.map(day => {
    const isSelected = selectedDays.includes(day.key)
    return `<button type="button" class="day-btn ${isSelected ? 'selected' : ''}" data-day="${day.key}">${day.label}</button>`
  }).join('')

  const turnsHTML = turns.map((turn, index) => `
    <div class="turn-item" data-turn-index="${index}">
      <label>Das:</label>
      <input type="time" class="time-input turn-open" value="${turn.open || ''}">
      <span>às</span>
      <input type="time" class="time-input turn-close" value="${turn.close || ''}">
    </div>
  `).join('')

  const hasTurn2 = turns.length > 1
  const addTurnBtn = hasTurn2 ? '' : `<button type="button" class="btn-add-turn" onclick="addTurn(this)">+ Adicionar horário</button>`

  return `
    <div class="hours-group" data-group-id="${id}">
      <button type="button" class="btn-remove-group" onclick="removeHoursGroup(this)">✕</button>
      
      <div class="day-selector">
        ${daysHTML}
      </div>
      
      ${turnsHTML}
      
      ${addTurnBtn}
    </div>
  `
}

function addHoursGroup(containerId = 'businessHoursContainer', selectedDays = [], turns = []) {
  const container = document.getElementById(containerId)
  const html = createHoursGroupHTML(null, selectedDays, turns.length > 0 ? turns : [{ open: '09:00', close: '12:00' }])
  container.insertAdjacentHTML('beforeend', html)
  attachDayButtonListeners(container.lastElementChild)
}

function removeHoursGroup(btn) {
  btn.closest('.hours-group').remove()
}

function addTurn(btn) {
  const group = btn.closest('.hours-group')
  const turnItem = document.createElement('div')
  turnItem.className = 'turn-item'
  turnItem.dataset.turnIndex = group.querySelectorAll('.turn-item').length
  turnItem.innerHTML = `
    <label>Das:</label>
    <input type="time" class="time-input turn-open" value="14:00">
    <span>às</span>
    <input type="time" class="time-input turn-close" value="18:00">
  `
  btn.insertAdjacentHTML('beforebegin', turnItem.outerHTML)
  btn.remove()
}

function toggleDay(btn) {
  btn.classList.toggle('selected')
}

function attachDayButtonListeners(groupEl) {
  groupEl.querySelectorAll('.day-btn').forEach(btn => {
    btn.addEventListener('click', () => toggleDay(btn))
  })
}

function getBusinessHoursFromForm(containerId = 'businessHoursContainer') {
  const container = document.getElementById(containerId)
  const groups = container.querySelectorAll('.hours-group')
  const businessHours = {}

  groups.forEach(group => {
    const selectedDays = []
    group.querySelectorAll('.day-btn.selected').forEach(btn => {
      selectedDays.push(btn.dataset.day)
    })

    if (selectedDays.length === 0) return

    const turns = []
    group.querySelectorAll('.turn-item').forEach(turnEl => {
      const open = turnEl.querySelector('.turn-open')?.value
      const close = turnEl.querySelector('.turn-close')?.value
      if (open && close) {
        turns.push({ open, close })
      }
    })

    if (turns.length === 0) return

    selectedDays.forEach(day => {
      if (turns.length === 1) {
        businessHours[day] = { open: turns[0].open, close: turns[0].close }
      } else {
        businessHours[day] = { open: turns[0].open, close: turns[0].close }
        if (turns[1]) {
          businessHours[day].turn2 = { open: turns[1].open, close: turns[1].close }
        }
      }
    })
  })

  return businessHours
}

function loadBusinessHoursToForm(businessHours, containerId = 'editBusinessHoursContainer') {
  const container = document.getElementById(containerId)
  container.innerHTML = ''

  if (!businessHours || Object.keys(businessHours).length === 0) {
    addHoursGroup(containerId)
    return
  }

  const dayGroups = {}
  
  Object.entries(businessHours).forEach(([day, schedule]) => {
    const key = JSON.stringify({
      open: schedule.open,
      close: schedule.close,
      turn2: schedule.turn2
    })
    
    if (!dayGroups[key]) {
      dayGroups[key] = []
    }
    dayGroups[key].push(day)
  })

  Object.values(dayGroups).forEach(days => {
    const firstDay = businessHours[days[0]]
    const turns = [{ open: firstDay.open, close: firstDay.close }]
    if (firstDay.turn2) {
      turns.push({ open: firstDay.turn2.open, close: firstDay.turn2.close })
    }
    addHoursGroup(containerId, days, turns)
  })
}

// ==================== CRIAR ====================

async function handleCreateLocation(e) {
  e.preventDefault()

  const formData = {
    name: document.getElementById('locationName').value,
    address: document.getElementById('locationAddress').value,
    manager_name: document.getElementById('managerName').value,
    manager_phone: document.getElementById('managerPhone').value
  }

  const businessHours = getBusinessHoursFromForm('businessHoursContainer')
  if (Object.keys(businessHours).length > 0) {
    formData.business_hours = businessHours
  }

  setLoading('button[type="submit"]', true)

  try {
    const { data, error } = await apiInsert('locations', formData, currentUser.id)

    if (error) throw error

    document.getElementById('modalNewLocation').classList.remove('active')
    document.getElementById('formNewLocation').reset()
    document.getElementById('businessHoursContainer').innerHTML = ''
    loadLocations()
    showNotification('Local cadastrado com sucesso!', 'success')

  } catch (error) {
    console.error('Erro:', error)
    showNotification('Erro ao criar local', 'error')
  } finally {
    setLoading('button[type="submit"]', false, 'Salvar Local')
  }
}

// ==================== EDITAR ====================

async function openEditModal(locationId) {
  try {
    const { data: location, error } = await apiSelect('locations', {
      eq: { id: locationId }
    })

    if (error || !location || location.length === 0) throw new Error('Local não encontrado')

    const loc = location[0]

    document.getElementById('editLocationId').value = loc.id
    document.getElementById('editLocationName').value = loc.name
    document.getElementById('editLocationAddress').value = loc.address || ''
    document.getElementById('editManagerName').value = loc.manager_name || ''
    document.getElementById('editManagerPhone').value = loc.manager_phone || ''

    loadBusinessHoursToForm(loc.business_hours, 'editBusinessHoursContainer')

    document.getElementById('modalEditLocation').classList.add('active')

  } catch (error) {
    console.error('Erro:', error)
    showNotification('Erro ao carregar local', 'error')
  }
}

async function handleEditLocation(e) {
  e.preventDefault()

  const id = document.getElementById('editLocationId').value
  const updates = {
    name: document.getElementById('editLocationName').value,
    address: document.getElementById('editLocationAddress').value,
    manager_name: document.getElementById('editManagerName').value,
    manager_phone: document.getElementById('editManagerPhone').value
  }

  const businessHours = getBusinessHoursFromForm('editBusinessHoursContainer')
  updates.business_hours = businessHours

  setLoading('button[type="submit"]', true)

  try {
    const { error } = await apiUpdate('locations', id, updates)

    if (error) throw error

    document.getElementById('modalEditLocation').classList.remove('active')
    loadLocations()
    showNotification('Local atualizado com sucesso!', 'success')

  } catch (error) {
    console.error('Erro:', error)
    showNotification('Erro ao atualizar local', 'error')
  } finally {
    setLoading('button[type="submit"]', false, 'Salvar Alterações')
  }
}

// ==================== DELETAR ====================

async function deleteLocation(id) {
  if (!confirm('Tem certeza que deseja excluir este local?')) return

  try {
    const { error } = await apiDelete('locations', id)

    if (error) {
      if (error.code === '23503') {
        showNotification('Não é possível deletar: existem telas vinculadas', 'warning')
      } else {
        throw error
      }
      return
    }

    loadLocations()
    showNotification('Local excluído com sucesso!', 'success')

  } catch (error) {
    console.error('Erro:', error)
    showNotification('Erro ao excluir local', 'error')
  }
}

// ==================== EVENTOS ====================

function setupEventListeners() {
  setupModalHandlers('modalNewLocation', 'btnOpenModal', 'btnCloseModal', 'btnCancelModal')
  setupModalHandlers('modalEditLocation', null, 'btnCloseEditModal', 'btnCancelEditModal')

  document.getElementById('formNewLocation').addEventListener('submit', handleCreateLocation)
  document.getElementById('formEditLocation').addEventListener('submit', handleEditLocation)

  document.getElementById('btnAddHoursGroup').addEventListener('click', () => {
    addHoursGroup('businessHoursContainer')
  })

  document.getElementById('btnEditAddHoursGroup').addEventListener('click', () => {
    addHoursGroup('editBusinessHoursContainer')
  })

  const searchInput = document.getElementById('searchInput')
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchTimeout)
      searchTimeout = setTimeout(() => loadLocations(e.target.value), 500)
    })
  }
}

function formatPhone(v) {
  if (!v) return ''
  v = v.replace(/\D/g, '')
  v = v.replace(/^(\d{2})(\d)/g, '($1) $2')
  v = v.replace(/(\d)(\d{4})$/, '$1-$2')
  return v
}

console.log('✅ Locations.js carregado')
