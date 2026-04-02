/* ==================== PLAYLISTS.JS ====================
   Gerenciamento completo: CRUD + Editor de Conteúdo
*/

let currentUser = null;
let searchTimeout = null;
let editingPlaylistId = null;

// ==================== INICIALIZAÇÃO ====================

document.addEventListener('DOMContentLoaded', async () => {
  try {
    currentUser = await checkAuth();
    if (!currentUser) return;

    await loadSidebar('playlists');
    setupEventListeners();
    await loadPlaylists();

  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    showNotification('Erro ao carregar página', 'error');
  }
});

// ==================== LISTAGEM ====================

async function loadPlaylists(searchTerm = '') {
  const tbody = document.getElementById('playlistsList');

  try {
    let result;
    if (searchTerm.trim()) {
      result = await apiSearch('playlists', searchTerm, ['name'], currentUser.id);
    } else {
      result = await apiSelect('playlists', {
        userId: currentUser.id,
        select: '*',
        order: { field: 'created_at', ascending: false }
      });
    }

    const { data: playlists, error } = result;
    if (error) throw error;

    if (!playlists || playlists.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" style="text-align:center; padding:48px; color:#A0AEC0;">
            <div style="font-size:32px; margin-bottom:8px;">📋</div>
            Nenhuma playlist encontrada
          </td>
        </tr>`;
      return;
    }

    renderPlaylistsTable(playlists);

  } catch (error) {
    console.error('❌ Erro ao carregar playlists:', error);
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#E53E3E; padding:20px;">Erro: ${error.message}</td></tr>`;
  }
}

function renderPlaylistsTable(playlists) {
  const tbody = document.getElementById('playlistsList');

  tbody.innerHTML = playlists.map(pl => `
    <tr>
      <td><strong>${escapeHtml(pl.name)}</strong></td>
      <td>${pl.description ? escapeHtml(pl.description) : '<span style="color:#CBD5E0;">—</span>'}</td>
      <td><span style="font-family:var(--font-mono); font-size:13px;">${formatDuration(pl.duration_total)}</span></td>
      <td>—</td>
      <td>
        <span style="font-size:12px; font-weight:600; color:${pl.loop_enabled ? '#10B981' : '#CBD5E0'};">
          ${pl.loop_enabled ? '● Ativo' : '○ Inativo'}
        </span>
      </td>
      <td style="text-align:right; white-space:nowrap;">
        <button class="btn-icon" onclick="openManageContent('${pl.id}', '${escapeHtml(pl.name)}')" title="Gerenciar Conteúdo" style="color:#3182CE; margin-right:4px;">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/>
            <line x1="8" y1="18" x2="21" y2="18"/>
            <path d="M3 6h.01M3 12h.01M3 18h.01"/>
          </svg>
        </button>
        <button class="btn-icon" onclick="openEditModal('${pl.id}')" title="Editar">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
          </svg>
        </button>
        <button class="btn-icon delete" onclick="deletePlaylist('${pl.id}')" title="Excluir">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"/>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
          </svg>
        </button>
      </td>
    </tr>
  `).join('');
}

// ==================== EDITOR DE CONTEÚDO ====================

async function openManageContent(playlistId, playlistName) {
  editingPlaylistId = playlistId;
  document.getElementById('manageTitle').textContent = playlistName;
  document.getElementById('libraryList').innerHTML = '<div class="spinner-small" style="margin:20px auto;display:block;"></div>';
  document.getElementById('playlistItems').innerHTML = '';
  document.getElementById('totalDuration').innerText = '0s';

  document.getElementById('modalManageContent').classList.add('active');

  await Promise.all([
    loadLibraryItems(),
    loadPlaylistItems(playlistId)
  ]);

  setupDragAndDrop();
}

async function loadLibraryItems() {
  const container = document.getElementById('libraryList');
  container.innerHTML = '';

  try {
    const [widgetsResult, campaignsResult] = await Promise.all([
      apiSelect('dynamic_contents', { userId: currentUser.id, eq: { is_active: true } }),
      apiSelect('campaigns', { userId: currentUser.id, eq: { status: 'active' } })
    ]);

    const items = [];

    (widgetsResult.data || []).forEach(w => items.push({
      id: w.id, name: w.name, type: 'widget',
      displayType: w.content_type || 'Widget', defaultDuration: 15
    }));

    (campaignsResult.data || []).forEach(c => items.push({
      id: c.id, name: c.name, type: 'campaign',
      displayType: 'Campanha', defaultDuration: c.duration_seconds || 15
    }));

    items.sort((a, b) => a.name.localeCompare(b.name));

    if (items.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/>
          </svg>
          Nenhum item disponível
        </div>`;
    } else {
      items.forEach(item => container.appendChild(createItemCard(item)));
    }

  } catch (error) {
    console.error('Erro ao carregar biblioteca:', error);
    container.innerHTML = '<div style="color:#E53E3E; padding:10px; font-size:13px;">Erro ao carregar</div>';
  }
}

async function loadPlaylistItems(playlistId) {
  const container = document.getElementById('playlistItems');

  const { data: items, error } = await supabaseClient
    .from('playlist_items')
    .select('*, dynamic_contents(name, content_type), campaigns(name, duration_seconds)')
    .eq('playlist_id', playlistId)
    .order('display_order', { ascending: true });

  if (items && items.length > 0) {
    items.forEach(item => {
      let itemData = null;

      if (item.widget_id && item.dynamic_contents) {
        itemData = {
          id: item.widget_id, name: item.dynamic_contents.name,
          type: 'widget', displayType: item.dynamic_contents.content_type,
          duration: item.duration
        };
      } else if (item.campaign_id && item.campaigns) {
        itemData = {
          id: item.campaign_id, name: item.campaigns.name,
          type: 'campaign', displayType: 'Campanha',
          duration: item.duration
        };
      }

      if (itemData) {
        container.appendChild(createItemCard(itemData, item.duration));
      }
    });
    updateTotalDuration();
  } else {
    container.innerHTML = `
      <div class="empty-state">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
        </svg>
        Adicione itens da biblioteca
      </div>`;
  }
}

function createItemCard(item, currentDuration = null) {
  const el = document.createElement('div');
  el.className = 'widget-card';
  el.dataset.id = item.id;
  el.dataset.type = item.type;

  const duration = currentDuration || item.defaultDuration || 15;

  // Cores por tipo
  const typeStyle = item.type === 'campaign'
    ? 'background:#FEFCBF; color:#92400E;'
    : 'background:#EBF8FF; color:#1E40AF;';

  const typeIcon = item.type === 'campaign' ? '📢' : '⚡';

  el.innerHTML = `
    <div class="card-top">
      <!-- Handle de arrastar — só aparece na playlist -->
      <div class="drag-handle" title="Arrastar para reordenar">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="9" cy="5" r="1" fill="currentColor"/>
          <circle cx="15" cy="5" r="1" fill="currentColor"/>
          <circle cx="9" cy="12" r="1" fill="currentColor"/>
          <circle cx="15" cy="12" r="1" fill="currentColor"/>
          <circle cx="9" cy="19" r="1" fill="currentColor"/>
          <circle cx="15" cy="19" r="1" fill="currentColor"/>
        </svg>
      </div>

      <div class="card-left">
        <div class="widget-title">${typeIcon} ${escapeHtml(item.name)}</div>
        <span class="widget-type" style="${typeStyle}">${item.displayType}</span>
      </div>

      <!-- Botão + só aparece na biblioteca -->
      <button class="btn-add" title="Adicionar à playlist">+</button>
    </div>

    <!-- Settings só aparecem na playlist -->
    <div class="item-settings">
      <div class="duration-wrapper">
        <span class="duration-label">Duração</span>
        <input type="number" class="duration-input" value="${duration}" min="5" max="3600">
        <span class="duration-unit">seg</span>
      </div>
      <button class="btn-remove" title="Remover">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <polyline points="3 6 5 6 21 6"/>
          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
        </svg>
        Remover
      </button>
    </div>
  `;

  attachCardEvents(el);
  return el;
}

function attachCardEvents(card) {
  // Botão + — adiciona à playlist
  const btnAdd = card.querySelector('.btn-add');
  if (btnAdd) {
    btnAdd.addEventListener('click', () => {
      const clone = card.cloneNode(true);
      const targetList = document.getElementById('playlistItems');
      const empty = targetList.querySelector('.empty-state');
      if (empty) empty.remove();
      targetList.appendChild(clone);
      attachCardEvents(clone);
      updateTotalDuration();

      // Feedback visual
      btnAdd.textContent = '✓';
      btnAdd.style.background = 'var(--color-primary)';
      btnAdd.style.color = 'white';
      setTimeout(() => {
        btnAdd.textContent = '+';
        btnAdd.style.background = '';
        btnAdd.style.color = '';
      }, 800);
    });
  }

  // Botão remover
  const btnRemove = card.querySelector('.btn-remove');
  if (btnRemove) {
    btnRemove.addEventListener('click', () => {
      card.style.transform = 'translateX(20px)';
      card.style.opacity = '0';
      setTimeout(() => {
        card.remove();
        updateTotalDuration();
        // Mostra empty state se vazio
        const target = document.getElementById('playlistItems');
        if (target && target.children.length === 0) {
          target.innerHTML = `
            <div class="empty-state">
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
                <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
              </svg>
              Adicione itens da biblioteca
            </div>`;
        }
      }, 200);
    });
  }

  // Input de duração
  const durationInput = card.querySelector('.duration-input');
  if (durationInput) {
    durationInput.addEventListener('input', updateTotalDuration);
    // Evita que clique no input acione drag
    durationInput.addEventListener('mousedown', e => e.stopPropagation());
    durationInput.addEventListener('touchstart', e => e.stopPropagation());
  }
}

function setupDragAndDrop() {
  const libraryList = document.getElementById('libraryList');
  const playlistItems = document.getElementById('playlistItems');

  // Biblioteca — clone ao arrastar, não reordena
  new Sortable(libraryList, {
    group: { name: 'shared', pull: 'clone', put: false },
    sort: false,
    animation: 150,
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onClone: function(evt) {
      // Reanexar eventos no clone que foi para a playlist
      setTimeout(() => {
        const targetList = document.getElementById('playlistItems');
        const lastCard = targetList.lastElementChild;
        if (lastCard && lastCard.classList.contains('widget-card')) {
          attachCardEvents(lastCard);
          updateTotalDuration();
        }
      }, 50);
    }
  });

  // Playlist — reordena SOMENTE pelo handle
  new Sortable(playlistItems, {
    group: 'shared',
    animation: 150,
    handle: '.drag-handle',  // ← só arrasta pelo handle, não pelo card inteiro
    ghostClass: 'sortable-ghost',
    chosenClass: 'sortable-chosen',
    onAdd: function(evt) {
      const empty = playlistItems.querySelector('.empty-state');
      if (empty) empty.remove();
      attachCardEvents(evt.item);
      updateTotalDuration();
    },
    onSort: updateTotalDuration
  });
}

function updateTotalDuration() {
  const inputs = document.querySelectorAll('#playlistItems .duration-input');
  let total = 0;
  inputs.forEach(input => { total += parseInt(input.value) || 0; });

  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  const text = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;
  document.getElementById('totalDuration').innerText = text;
}

// ==================== SALVAR CONTEÚDO ====================

async function saveContent() {
  const btn = document.getElementById('btnSaveContent');
  const originalText = btn.innerText;
  btn.innerText = 'Salvando...';
  btn.disabled = true;

  try {
    const itemElements = document.querySelectorAll('#playlistItems .widget-card');
    const itemsToSave = [];
    let totalDuration = 0;

    itemElements.forEach((el, index) => {
      const id = el.dataset.id;
      const type = el.dataset.type;
      const duration = parseInt(el.querySelector('.duration-input')?.value) || 15;
      totalDuration += duration;

      itemsToSave.push({
        playlist_id: editingPlaylistId,
        widget_id: type === 'widget' ? id : null,
        campaign_id: type === 'campaign' ? id : null,
        display_order: index + 1,
        duration: duration
      });
    });

    const { error: deleteError } = await supabaseClient
      .from('playlist_items').delete().eq('playlist_id', editingPlaylistId);
    if (deleteError) throw deleteError;

    if (itemsToSave.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('playlist_items').insert(itemsToSave);
      if (insertError) throw insertError;
    }

    await supabaseClient.from('playlists')
      .update({ duration_total: totalDuration })
      .eq('id', editingPlaylistId);

    showNotification('Playlist salva com sucesso! ✓', 'success');
    document.getElementById('modalManageContent').classList.remove('active');
    loadPlaylists();

  } catch (error) {
    console.error('Erro ao salvar:', error);
    showNotification('Erro ao salvar: ' + error.message, 'error');
  } finally {
    btn.innerText = originalText;
    btn.disabled = false;
  }
}

// ==================== CRUD BÁSICO ====================

async function handleCreatePlaylist(e) {
  e.preventDefault();
  const name = document.getElementById('playlistName').value;
  const description = document.getElementById('playlistDescription').value;
  const loop_enabled = document.getElementById('playlistLoop').checked;

  setLoading('#formNewPlaylist button[type="submit"]', true);

  try {
    const { error } = await apiInsert('playlists', {
      name, description, loop_enabled, duration_total: 0
    }, currentUser.id);

    if (error) throw error;

    document.getElementById('modalNewPlaylist').classList.remove('active');
    document.getElementById('formNewPlaylist').reset();
    loadPlaylists();
    showNotification('Playlist criada! ✓', 'success');
  } catch (error) {
    showNotification('Erro ao criar', 'error');
  } finally {
    setLoading('#formNewPlaylist button[type="submit"]', false, 'Salvar Playlist');
  }
}

async function openEditModal(playlistId) {
  try {
    const { data: playlists, error } = await apiSelect('playlists', { eq: { id: playlistId } });
    if (error || !playlists?.length) throw new Error('Não encontrada');
    const pl = playlists[0];
    document.getElementById('editPlaylistId').value = pl.id;
    document.getElementById('editPlaylistName').value = pl.name;
    document.getElementById('editPlaylistDescription').value = pl.description || '';
    document.getElementById('editPlaylistLoop').checked = pl.loop_enabled || false;
    document.getElementById('modalEditPlaylist').classList.add('active');
  } catch (error) {
    showNotification('Erro ao carregar', 'error');
  }
}

async function handleEditPlaylist(e) {
  e.preventDefault();
  const id = document.getElementById('editPlaylistId').value;
  const name = document.getElementById('editPlaylistName').value;
  const description = document.getElementById('editPlaylistDescription').value;
  const loop_enabled = document.getElementById('editPlaylistLoop').checked;

  setLoading('#formEditPlaylist button[type="submit"]', true);

  try {
    const { error } = await apiUpdate('playlists', id, { name, description, loop_enabled });
    if (error) throw error;
    document.getElementById('modalEditPlaylist').classList.remove('active');
    loadPlaylists();
    showNotification('Atualizado! ✓', 'success');
  } catch (error) {
    showNotification('Erro ao atualizar', 'error');
  } finally {
    setLoading('#formEditPlaylist button[type="submit"]', false, 'Salvar Alterações');
  }
}

async function deletePlaylist(id) {
  if (!confirm('Excluir esta playlist? Esta ação não pode ser desfeita.')) return;
  try {
    const { error } = await apiDelete('playlists', id);
    if (error) throw error;
    loadPlaylists();
    showNotification('Playlist excluída', 'success');
  } catch (error) {
    showNotification('Erro ao excluir', 'error');
  }
}

function formatDuration(seconds) {
  if (!seconds) return '0s';
  const minutes = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return minutes > 0 ? `${minutes}m ${secs}s` : `${secs}s`;
}

function setupEventListeners() {
  setupModalHandlers('modalNewPlaylist', 'btnOpenModal', 'btnCloseModal', 'btnCancelModal');
  setupModalHandlers('modalEditPlaylist', null, 'btnCloseEditModal', 'btnCancelEditModal');
  setupModalHandlers('modalManageContent', null, 'btnCloseManageModal', 'btnCancelManage');

  document.getElementById('formNewPlaylist').addEventListener('submit', handleCreatePlaylist);
  document.getElementById('formEditPlaylist').addEventListener('submit', handleEditPlaylist);
  document.getElementById('btnSaveContent').addEventListener('click', saveContent);

  document.getElementById('searchWidget').addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase();
    document.querySelectorAll('#libraryList .widget-card').forEach(card => {
      const title = card.querySelector('.widget-title').innerText.toLowerCase();
      card.style.display = title.includes(term) ? 'flex' : 'none';
    });
  });

  document.getElementById('searchInput').addEventListener('input', (e) => {
    clearTimeout(searchTimeout);
    searchTimeout = setTimeout(() => loadPlaylists(e.target.value), 500);
  });
}
