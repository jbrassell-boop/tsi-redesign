/* ═══ repairs-queue.js ═══
   Queue rendering, filters, batch ops, split view, drag-drop, stage pipeline,
   tab content population, keyboard nav helpers.
   Part of repairs.html modularization.
*/
(function() {
'use strict';

function initDragDrop() {
  if (_dragDropInited) return;
  _dragDropInited = true;
  const container = document.getElementById('queueRows');
  if (!container) return;

  container.addEventListener('dragstart', function(e) {
    const row = e.target.closest('.q-row');
    if (!row) return;
    _dragSrcKey = row.dataset.rkey;
    row.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
  });

  container.addEventListener('dragover', function(e) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const row = e.target.closest('.q-row');
    if (!row || row.dataset.rkey === _dragSrcKey) return;
    container.querySelectorAll('.q-drop-above, .q-drop-below').forEach(r => r.classList.remove('q-drop-above','q-drop-below'));
    const rect = row.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    row.classList.add(e.clientY < mid ? 'q-drop-above' : 'q-drop-below');
  });

  container.addEventListener('dragleave', function(e) {
    if (!container.contains(e.relatedTarget)) {
      container.querySelectorAll('.q-drop-above, .q-drop-below').forEach(r => r.classList.remove('q-drop-above','q-drop-below'));
    }
  });

  container.addEventListener('drop', function(e) {
    e.preventDefault();
    const targetRow = e.target.closest('.q-row');
    if (!targetRow || !_dragSrcKey || targetRow.dataset.rkey === _dragSrcKey) return;

    const srcIdx = _queueAllRepairs.findIndex(r => String(r.lRepairKey) === String(_dragSrcKey));
    const tgtIdx = _queueAllRepairs.findIndex(r => String(r.lRepairKey) === String(targetRow.dataset.rkey));
    if (srcIdx === -1 || tgtIdx === -1) return;

    const [moved] = _queueAllRepairs.splice(srcIdx, 1);
    const rect = targetRow.getBoundingClientRect();
    const insertAfter = e.clientY > rect.top + rect.height / 2;
    const insertIdx = insertAfter ? (tgtIdx < srcIdx ? tgtIdx + 1 : tgtIdx) : (tgtIdx > srcIdx ? tgtIdx - 1 : tgtIdx);
    _queueAllRepairs.splice(insertIdx, 0, moved);

    localStorage.setItem('tsi_queue_order', JSON.stringify(_queueAllRepairs.map(r => r.lRepairKey)));

    container.querySelectorAll('.q-drop-above, .q-drop-below').forEach(r => r.classList.remove('q-drop-above','q-drop-below'));
    renderQueue();
  });

  container.addEventListener('dragend', function(e) {
    container.querySelectorAll('.dragging, .q-drop-above, .q-drop-below').forEach(r => {
      r.classList.remove('dragging','q-drop-above','q-drop-below');
    });
    _dragSrcKey = null;
  });
}

function toggleQueuePanel() {
  const panel = document.getElementById('queuePanel');
  const collapsed = document.getElementById('queueCollapsed');
  if (!panel) return;
  const isCollapsed = panel.classList.toggle('collapsed');
  if (collapsed) collapsed.style.display = isCollapsed ? 'flex' : 'none';
}

function setQueueFilter(filter, btn) {
  _queueFilter = filter;
  document.querySelectorAll('.qf-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderQueue();
}

// PERF-001: debounced queue search — 150ms delay prevents re-render on every keystroke
let _queueSearchTimer = null;
function queueSearch(val) {
  _queueSearch = val.toLowerCase();
  clearTimeout(_queueSearchTimer);
  _queueSearchTimer = setTimeout(renderQueue, 150);
}

function applySortAndFilter() { renderQueue(); }

function renderQueue() {
  const container = document.getElementById('queueRows');
  if (!container) return;

  let repairs = _queueAllRepairs.slice();
  const today = new Date();

  // Filter
  if (_queueFilter !== 'all') {
    if (_queueFilter === 'overdue') {
      repairs = repairs.filter(r => {
        const dIn = r.dtDateIn || r.dDateIn ? new Date(r.dtDateIn || r.dDateIn) : null;
        return dIn && (today - dIn) / 86400000 > 10;
      });
    } else {
      repairs = repairs.filter(r => {
        const st = (r._statusName || r.sStatus || '').toLowerCase();
        return st.includes(_queueFilter.toLowerCase());
      });
    }
  }

  // Preset filter (Feature 5) — applied after stage filter, before search
  if (typeof applyPresetFilter === 'function') repairs = applyPresetFilter(repairs, today);

  // Search
  if (_queueSearch) {
    repairs = repairs.filter(r =>
      (r.sWorkOrderNumber || r.sWONumber || '').toLowerCase().includes(_queueSearch) ||
      (r.sClientName1 || r.sClientName || r.sClient || r.sShipName1 || '').toLowerCase().includes(_queueSearch) ||
      (r.sSerialNumber || r.sSerial || '').toLowerCase().includes(_queueSearch) ||
      (r.sScopeTypeDesc || r.sModelNumber || r.sModel || '').toLowerCase().includes(_queueSearch)
    );
  }

  // Sort
  const sortVal = document.getElementById('queueSort')?.value || 'age';
  repairs.sort((a, b) => {
    const aIn = a.dtDateIn || a.dDateIn || '';
    const bIn = b.dtDateIn || b.dDateIn || '';
    if (sortVal === 'age') return aIn.localeCompare(bIn);
    if (sortVal === 'age-desc') return bIn.localeCompare(aIn);
    if (sortVal === 'client') return (a.sClientName1 || a.sClientName || a.sClient || a.sShipName1 || '').localeCompare(b.sClientName1 || b.sClientName || b.sClient || b.sShipName1 || '');
    if (sortVal === 'status') return (a._statusName || a.sStatus || '').localeCompare(b._statusName || b.sStatus || '');
    return 0;
  });

  // Update count
  const countEl = document.getElementById('queueCount');
  if (countEl) countEl.textContent = repairs.length;

  // Determine active WO
  const activeBadge = document.getElementById('repairBadge');
  const activeWO = activeBadge ? activeBadge.textContent.replace('#','').trim() : '';

  container.innerHTML = repairs.map(r => {
    const dIn = r.dtDateIn || r.dDateIn ? new Date(r.dtDateIn || r.dDateIn) : null;
    const ageDays = dIn ? Math.floor((today - dIn) / 86400000) : 0;
    const ageClass = ageDays > 14 ? 'q-age-danger' : ageDays > 7 ? 'q-age-warn' : '';
    const isOverdue = ageDays > 10;
    const isFlagged = !!(r.bFlagged || r.bFlaggedClient);
    const statusName = r._statusName || r.sStatus || '';
    const pillClass = (typeof statusPillClass === 'function') ? statusPillClass(statusName) : 'sp-neutral';
    const wo = r.sWorkOrderNumber || r.sWONumber || '';
    // esc() all user-data fields inserted into innerHTML to prevent XSS
    const woSafe = esc(wo);
    const clientName = esc((r.sClientName1 || r.sClientName || r.sClient || r.sShipName1 || 'Unknown').substring(0, 28));
    const dept = esc(r.sDepartmentName || r.sDept || '');
    const model = esc(r.sScopeTypeDesc || r.sModelNumber || r.sModel || '');
    const serial = esc(r.sSerialNumber || r.sSerial || '');
    const statusSafe = esc(statusName);
    const rawType = (r.sRigidOrFlexible || '').toUpperCase().charAt(0);
    const typeLabel = rawType === 'F' ? 'Flex' : rawType === 'R' ? 'Rigid' : rawType === 'C' ? 'Camera' : '';
    const typeColor = rawType === 'F' ? 'color:var(--blue)' : rawType === 'R' ? 'color:var(--navy)' : rawType === 'C' ? 'color:var(--primary)' : 'color:var(--muted)';
    const isActive = wo && activeWO && wo === activeWO;
    const rKey = r.lRepairKey || 0;
    const isChecked = _batchSelected.has(rKey);

    return `<div class="q-row${isActive?' active':''}${isOverdue?' overdue':''}${isFlagged?' flagged':''}${isChecked?' q-checked':''}"
      data-wo="${woSafe}" data-rkey="${rKey}" draggable="true"
      onclick="if(_batchMode){return;}if(event.shiftKey&&_splitMode){loadRepairIntoSplitRight(${rKey});return;}qRowClick(${rKey},'${woSafe}')"
      tabindex="0" onkeydown="if(event.key==='Enter')qRowClick(${rKey},'${woSafe}')">
      <input type="checkbox" class="q-row-check" ${isChecked?'checked':''} onclick="event.stopPropagation();toggleBatchRow(${rKey},this.checked)">
      <div class="q-row-top">
        <span class="q-drag-handle">&#10271;</span>
        <span class="q-wo">${woSafe}</span>
        <span class="q-age ${ageClass}">${ageDays}d</span>
      </div>
      <div class="q-row-client">${clientName}${dept?' &middot; '+dept:''}</div>
      <div class="q-row-model">${typeLabel?`<span style="font-size:9px;font-weight:700;${typeColor};font-family:inherit;margin-right:4px">${typeLabel}</span>`:''}${model}${serial?' &middot; '+serial:''}</div>
      <div class="q-row-status">
        <span class="sp-badge ${pillClass}">${statusSafe||'Unknown'}</span>
        ${isFlagged?'<span class="q-flag-icon" title="Flagged">&#9873;</span>':''}
        ${isOverdue?'<span class="q-overdue-icon" title="Overdue">&#9888;</span>':''}
      </div>
    </div>`;
  }).join('') || (function() {
    const iconClipboard = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:.2;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/></svg>';
    const iconSearch = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:.2;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>';
    let icon, title, sub;
    if (_queueAllRepairs.length === 0) {
      icon = iconClipboard;
      title = 'No repairs in system';
      sub = 'Create a new work order to get started.';
    } else if (_queueSearch) {
      icon = iconSearch;
      title = 'No results for \u201c' + _queueSearch.replace(/</g,'&lt;') + '\u201d';
      sub = '<button class="btn btn-sm btn-outline" onclick="document.getElementById(\'qSearch\').value=\'\';queueSearch(\'\')" style="margin-top:6px">Clear search</button>';
    } else if (typeof _activePreset !== 'undefined' && _activePreset) {
      const presetLabels = { mine:'My Repairs', overdue:'Overdue', waitingpo:'Waiting on PO', readyship:'Ready to Ship' };
      icon = iconSearch;
      title = 'No repairs match \u2605 ' + (presetLabels[_activePreset] || _activePreset);
      sub = '<button class="btn btn-sm btn-outline" onclick="setPresetFilter(\'' + _activePreset + '\',null)" style="margin-top:6px">Clear filter</button>';
    } else {
      icon = iconSearch;
      title = 'No repairs match this filter';
      sub = '<button class="btn btn-sm btn-outline" onclick="setQueueFilter(\'all\',document.querySelector(\'.qf-chip[data-f=all]\'))" style="margin-top:6px">Clear filter</button>';
    }
    return '<div class="queue-empty-state" style="padding:30px 16px;text-align:center;color:var(--muted)">' + icon + '<div style="font-size:11px;font-weight:600;margin-bottom:4px">' + title + '</div><div style="font-size:10px">' + sub + '</div></div>';
  }());

  // PERF-002: read from pre-computed cache instead of recomputing every render
  const counts = _queueFilterCounts;
  const idMap = { All:'qfAll', Received:'qfReceived', Inspection:'qfInspection', Approval:'qfApproval', 'In Repair':'qfInRepair', QC:'qfQC', Shipping:'qfShipping', overdue:'qfOverdue' };
  Object.entries(idMap).forEach(([k, id]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = counts[k] !== undefined ? counts[k] : counts.all;
  });
}

function qRowClick(rKey, wo) {
  if (rKey) {
    loadRepair(rKey);
  }
}

function loadRepairByWO(wo) {
  const r = _queueAllRepairs.find(x => (x.sWorkOrderNumber || x.sWONumber || '') === wo);
  if (r && r.lRepairKey) loadRepair(r.lRepairKey);
}

function navigateQueue(direction) {
  const rows = Array.from(document.querySelectorAll('.q-row'));
  const activeIdx = rows.findIndex(r => r.classList.contains('active'));
  const nextIdx = activeIdx + direction;
  if (nextIdx >= 0 && nextIdx < rows.length) {
    const rKey = parseInt(rows[nextIdx].dataset.rkey) || 0;
    const wo = rows[nextIdx].dataset.wo || '';
    qRowClick(rKey, wo);
    rows[nextIdx].scrollIntoView({ block: 'nearest' });
  }
}

// ── FEATURE 4: BATCH MODE ──────────────────────────────────────────────────

let _batchMode = false;
const _batchSelected = new Set(); // lRepairKey values

function toggleBatchMode() {
  _batchMode = !_batchMode;
  document.body.classList.toggle('batch-mode', _batchMode);
  const btn = document.getElementById('batchToggleBtn');
  if (btn) btn.classList.toggle('active', _batchMode);
  if (!_batchMode) {
    _batchSelected.clear();
    updateBulkBar();
  }
  renderQueue();
  // Populate status options on first enable
  if (_batchMode) {
    const sel = document.getElementById('bulkStatusSel');
    if (sel && sel.options.length <= 1 && typeof _statuses !== 'undefined' && _statuses.length) {
      sel.innerHTML = '<option value="">Set status…</option>' +
        _statuses.map(s => `<option value="${s.lRepairStatusID}">${esc(s.sRepairStatus || s.sStatus || '')}</option>`).join('');
    }
  }
}

function toggleBatchRow(rKey, checked) {
  if (checked) {
    _batchSelected.add(rKey);
  } else {
    _batchSelected.delete(rKey);
  }
  // Toggle .q-checked class on the row
  const row = document.querySelector(`.q-row[data-rkey="${rKey}"]`);
  if (row) row.classList.toggle('q-checked', checked);
  updateBulkBar();
}

function updateBulkBar() {
  const bar = document.getElementById('bulkBar');
  const countEl = document.getElementById('bulkCount');
  if (!bar) return;
  const n = _batchSelected.size;
  if (n > 0 && _batchMode) {
    bar.classList.add('show');
    if (countEl) countEl.textContent = n + (n === 1 ? ' selected' : ' selected');
  } else {
    bar.classList.remove('show');
  }
}

function clearBatchSelection() {
  _batchSelected.clear();
  document.querySelectorAll('.q-row.q-checked').forEach(r => r.classList.remove('q-checked'));
  document.querySelectorAll('.q-row-check:checked').forEach(cb => { cb.checked = false; });
  updateBulkBar();
}

async function applyBulkStatus() {
  const sel = document.getElementById('bulkStatusSel');
  const statusId = sel ? parseInt(sel.value) : 0;
  if (!statusId) { if (sel) sel.focus(); return; }
  if (_batchSelected.size === 0) return;
  const statusName = sel.options[sel.selectedIndex]?.text || '';
  const keys = Array.from(_batchSelected);
  // Optimistically update queue data
  keys.forEach(rKey => {
    const r = _queueAllRepairs.find(x => x.lRepairKey === rKey);
    if (r) {
      r.lRepairStatusID = statusId;
      r._statusName = statusName;
      r.sStatus = statusName;
    }
    // If the currently-viewed repair is in the batch, sync its UI too
    if (_currentRepair && _currentRepair.lRepairKey === rKey) {
      applyStatusFromPopover(statusId);
    }
  });
  clearBatchSelection();
  renderQueue();
  // Background save (best-effort, non-blocking)
  if (typeof isLocalMode === 'function' && isLocalMode()) {
    keys.forEach(rKey => {
      fetch(`/api/repair-status/${rKey}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lRepairStatusID: statusId })
      }).catch(() => {});
    });
  }
}

// ── FEATURE 5: PRESET FILTER CHIPS ────────────────────────────────────────

let _activePreset = null;

function setPresetFilter(preset, btn) {
  // Toggle: clicking active preset clears it
  if (_activePreset === preset) {
    _activePreset = null;
    document.querySelectorAll('.qp-chip').forEach(c => c.classList.remove('active'));
    renderQueue();
    return;
  }
  _activePreset = preset;
  document.querySelectorAll('.qp-chip').forEach(c => c.classList.remove('active'));
  if (btn) btn.classList.add('active');
  // Preset filters also clear the stage filter
  document.querySelectorAll('.qf-chip').forEach(c => c.classList.remove('active'));
  const allChip = document.querySelector('.qf-chip[data-f="all"]');
  if (allChip) allChip.classList.add('active');
  _queueFilter = 'all';
  renderQueue();
}

// Preset filter logic — applied inside renderQueue()
function applyPresetFilter(repairs, today) {
  if (!_activePreset) return repairs;
  switch (_activePreset) {
    case 'mine': {
      // Match repairs assigned to the current tech (use _currentUser if available)
      const me = (typeof _currentUser !== 'undefined' && _currentUser) ? (_currentUser.sTechCode || _currentUser.sUserName || '').toLowerCase() : '';
      if (!me) return repairs; // no user context, return all
      return repairs.filter(r => (r.sTechCode || r.sTech || '').toLowerCase() === me);
    }
    case 'overdue': {
      return repairs.filter(r => {
        const dIn = r.dtDateIn || r.dDateIn ? new Date(r.dtDateIn || r.dDateIn) : null;
        return dIn && (today - dIn) / 86400000 > 10;
      });
    }
    case 'waitingpo': {
      return repairs.filter(r => {
        const st = (r._statusName || r.sStatus || '').toLowerCase();
        return st.includes('waiting') || st.includes('wait') || st.includes('approval') ||
               st.includes('awaiting') || (r.sPONumber || r.sPO || '') === '';
      });
    }
    case 'readyship': {
      return repairs.filter(r => {
        const st = (r._statusName || r.sStatus || '').toLowerCase();
        return st.includes('ship') || st.includes('invoic') || st.includes('ready') || st.includes('sched');
      });
    }
    default: return repairs;
  }
}

// ── FEATURE 6: SPLIT-SCREEN VIEW ──────────────────────────────────────────

let _splitMode = false;
let _splitRepairKey = null;   // the repair in the right column
let _splitRepairData = null;  // loaded repair object for right column

function toggleSplitView() {
  _splitMode = !_splitMode;
  const btn = document.getElementById('splitToggleBtn');
  if (btn) btn.classList.toggle('split-active', _splitMode);
  const scroll = document.getElementById('detailScroll');
  if (scroll) scroll.classList.toggle('split-mode', _splitMode);
  if (!_splitMode) {
    // Collapse back — remove split column
    const rightCol = document.getElementById('splitRightCol');
    if (rightCol) rightCol.remove();
    _splitRepairKey = null;
    _splitRepairData = null;
    // Remove wrapper if present, restore original content to scroll
    const leftCol = document.getElementById('splitLeftCol');
    if (leftCol) {
      // Move children back to scroll
      while (leftCol.firstChild) scroll.appendChild(leftCol.firstChild);
      leftCol.remove();
    }
  } else {
    // Enter split mode — wrap current content in left column
    _wrapDetailInLeftCol();
    _buildSplitRightCol();
  }
}

function _wrapDetailInLeftCol() {
  const scroll = document.getElementById('detailScroll');
  if (!scroll || document.getElementById('splitLeftCol')) return;
  const leftCol = document.createElement('div');
  leftCol.className = 'split-col split-focused';
  leftCol.id = 'splitLeftCol';
  const inner = document.createElement('div');
  inner.className = 'split-col-inner';
  // Move all current children into inner
  while (scroll.firstChild) inner.appendChild(scroll.firstChild);
  leftCol.appendChild(inner);
  scroll.appendChild(leftCol);
}

function _buildSplitRightCol() {
  const scroll = document.getElementById('detailScroll');
  if (!scroll) return;
  if (document.getElementById('splitRightCol')) return;
  const rightCol = document.createElement('div');
  rightCol.className = 'split-col';
  rightCol.id = 'splitRightCol';
  rightCol.innerHTML = `
    <div class="split-header">
      <span class="split-wo">—</span>
      <span class="split-client" id="splitRightClient">Click a repair in the queue to open here</span>
      <button class="split-col-dismiss" onclick="dismissSplitRight()" title="Close right panel">&#x2715;</button>
    </div>
    <div class="split-col-inner" id="splitRightInner" style="align-items:center;justify-content:center;color:var(--muted);font-size:12px;padding:32px 16px;text-align:center">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:.2;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
      <div style="font-weight:600;font-size:11px;margin-bottom:4px">Right Panel Empty</div>
      <div style="font-size:10px">Hold <kbd style="background:var(--neutral-100);border:1px solid var(--border);border-radius:3px;padding:1px 4px;font-size:9px;font-family:monospace">Shift</kbd> + click a queue row to open here</div>
    </div>
  `;
  scroll.appendChild(rightCol);
  // Clicking left col focuses it
  const leftCol = document.getElementById('splitLeftCol');
  if (leftCol) {
    leftCol.addEventListener('click', () => {
      document.getElementById('splitLeftCol')?.classList.add('split-focused');
      document.getElementById('splitRightCol')?.classList.remove('split-focused');
    });
  }
}

function dismissSplitRight() {
  _splitRepairKey = null;
  _splitRepairData = null;
  const rightCol = document.getElementById('splitRightCol');
  if (rightCol) {
    rightCol.querySelector('.split-col-inner').innerHTML = `
      <div style="align-items:center;justify-content:center;color:var(--muted);font-size:12px;padding:32px 16px;text-align:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:28px;height:28px;opacity:.2;margin-bottom:8px;display:block;margin-left:auto;margin-right:auto"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="12" y1="3" x2="12" y2="21"/></svg>
        <div style="font-weight:600;font-size:11px;margin-bottom:4px">Panel Dismissed</div>
        <div style="font-size:10px">Shift+click a queue row to load a repair here</div>
      </div>`;
    const hdr = rightCol.querySelector('.split-wo');
    if (hdr) hdr.textContent = '—';
    const cl = document.getElementById('splitRightClient');
    if (cl) cl.textContent = 'No repair loaded';
    rightCol.classList.remove('split-focused');
    document.getElementById('splitLeftCol')?.classList.add('split-focused');
  }
}

async function loadRepairIntoSplitRight(rKey) {
  if (!_splitMode) return;
  _splitRepairKey = rKey;
  const rightCol = document.getElementById('splitRightCol');
  if (!rightCol) return;
  rightCol.classList.add('split-focused');
  document.getElementById('splitLeftCol')?.classList.remove('split-focused');
  const inner = rightCol.querySelector('.split-col-inner');
  if (inner) inner.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:11px">Loading…</div>';
  // Find repair in queue list for header
  const r = _queueAllRepairs.find(x => x.lRepairKey === rKey) || {};
  const wo = r.sWorkOrderNumber || r.sWONumber || String(rKey);
  const client = r.sClientName1 || r.sClientName || r.sClient || r.sShipName1 || '';
  const hdrWo = rightCol.querySelector('.split-wo');
  if (hdrWo) hdrWo.textContent = '#' + wo;
  const hdrCl = document.getElementById('splitRightClient');
  if (hdrCl) hdrCl.textContent = client;
  try {
    let detail;
    if (typeof isLocalMode === 'function' && isLocalMode()) {
      const resp = await fetch(`/api/repairs/${rKey}`);
      detail = await resp.json();
      if (detail && detail.data) detail = detail.data;
    } else {
      detail = await (typeof apiGetRepair === 'function' ? apiGetRepair(rKey) : Promise.resolve(r));
    }
    _splitRepairData = detail;
    if (inner) {
      const statusName = esc(detail._statusName || detail.sStatus || detail.sRepairStatus || '—');
      const scopeModel = esc(detail.sScopeTypeDesc || detail.sModelNumber || detail.sModel || '—');
      const serial = esc(detail.sSerialNumber || detail.sSerial || '—');
      const dept = esc(detail.sDepartmentName || detail.sDept || '—');
      const techName = esc(detail.sTechName || detail.sTech || '—');
      const complaint = esc(detail.sComplaint || detail.sSymptoms || '—');
      const dIn = detail.dtDateIn || detail.dDateIn ? new Date(detail.dtDateIn || detail.dDateIn).toLocaleDateString() : '—';
      inner.innerHTML = `
        <div style="padding:12px 14px;display:flex;flex-direction:column;gap:10px;overflow-y:auto;flex:1">
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Scope</label><div style="font-size:12px;font-weight:600;color:var(--navy)">${scopeModel}</div></div>
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Serial</label><div style="font-size:12px;font-family:monospace">${serial}</div></div>
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Status</label><div><span class="sp-badge ${statusPillClass(detail._statusName || detail.sStatus || '')}">${statusName}</span></div></div>
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Date In</label><div style="font-size:12px">${dIn}</div></div>
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Dept</label><div style="font-size:12px">${dept}</div></div>
            <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Tech</label><div style="font-size:12px">${techName}</div></div>
          </div>
          <div class="ff"><label style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase">Complaint</label><div style="font-size:12px;color:var(--text);line-height:1.4">${complaint}</div></div>
          <div style="margin-top:4px">
            <button class="btn btn-sm btn-navy" style="width:100%" onclick="loadRepair(${rKey});toggleSplitView()">Open Full Record</button>
          </div>
        </div>`;
    }
  } catch (e) {
    if (inner) inner.innerHTML = `<div style="padding:24px;text-align:center;color:var(--danger);font-size:11px">Failed to load repair.</div>`;
  }
}

// Populate queue from existing _repairListData after it's loaded
// Statuses that mean a repair is done — exclude from open queue by default
const CLOSED_STATUSES = /invoiced|billed|closed|complete|shipped|cancel|declined|no fault|write.?off/i;
function isClosedStatus(name) { return name && CLOSED_STATUSES.test(name); }

let _showClosedInQueue = false;

// PERF-002: cached filter counts — computed once in syncQueueFromRepairList, not on every renderQueue call
let _queueFilterCounts = { all: 0, Received: 0, Inspection: 0, Approval: 0, 'In Repair': 0, QC: 0, Shipping: 0, overdue: 0 };

function _recomputeQueueCounts(repairs) {
  const today = new Date();
  const c = { all: repairs.length, Received: 0, Inspection: 0, Approval: 0, 'In Repair': 0, QC: 0, Shipping: 0, overdue: 0 };
  repairs.forEach(function(r) {
    const st = (r._statusName || r.sStatus || '').toLowerCase();
    if (st.includes('received')) c.Received++;
    if (st.includes('inspection') || st.includes('d&i') || st.includes('d & i')) c.Inspection++;
    if (st.includes('approval') || st.includes('quoted') || st.includes('awaiting')) c.Approval++;
    if (st.includes('in repair') || st.includes('repair')) c['In Repair']++;
    if (st.includes('qc') || st.includes('quality')) c.QC++;
    if (st.includes('shipping') || st.includes('ship')) c.Shipping++;
    const dIn = r.dtDateIn || r.dDateIn ? new Date(r.dtDateIn || r.dDateIn) : null;
    if (dIn && (today - dIn) / 86400000 > 10) c.overdue++;
  });
  _queueFilterCounts = c;
}

function syncQueueFromRepairList() {
  if (typeof _repairListData !== 'undefined' && _repairListData.length) {
    _queueAllRepairs = _showClosedInQueue
      ? _repairListData
      : _repairListData.filter(r => !isClosedStatus(r._statusName || r.sRepairStatus || ''));
    // Restore saved drag-drop order if present
    const savedOrder = JSON.parse(localStorage.getItem('tsi_queue_order') || 'null');
    if (savedOrder && Array.isArray(savedOrder)) {
      const orderMap = new Map(savedOrder.map((k, i) => [String(k), i]));
      _queueAllRepairs.sort((a, b) => {
        const ia = orderMap.has(String(a.lRepairKey)) ? orderMap.get(String(a.lRepairKey)) : 9999;
        const ib = orderMap.has(String(b.lRepairKey)) ? orderMap.get(String(b.lRepairKey)) : 9999;
        return ia - ib;
      });
    }
    // Pre-compute filter counts once here, not inside renderQueue on every call
    _recomputeQueueCounts(_queueAllRepairs);
    renderQueue();
    initDragDrop();
    // Update the toggle label with closed count
    const closedCount = _repairListData.filter(r => isClosedStatus(r._statusName || r.sRepairStatus || '')).length;
    const toggleEl = document.getElementById('qToggleClosed');
    if (toggleEl) toggleEl.textContent = _showClosedInQueue ? 'Hide closed' : `+${closedCount} closed`;
  }
}

function toggleShowClosed() {
  _showClosedInQueue = !_showClosedInQueue;
  syncQueueFromRepairList();
}

// ── STAGE PIPELINE ──────────────────────────────────────────────
// Stage pipeline maps status IDs to the 8 visual stages
// Accepts either a status name (string) or status ID (number)
function updateStagePipeline(status) {
  var stages = ['Received','D&I','Quoted','Approved','In Repair','QC','Shipping','Invoiced'];
  // Map real status IDs to stage index
  var idToStageIdx = {
    1:0,         // Waiting on Inspection → Received
    3:1,         // In the Drying Room → D&I
    5:1,         // Additional Evaluation → D&I
    6:3,         // Waiting for Approved → Approved
    8:4, 9:4, 11:4, 14:4, 15:4, // In Repair variants
    4:4,         // Outsourced → In Repair
    18:4,        // Parts Hold → In Repair
    21:5,        // QC - Waiting Customer Approval → QC
    10:6, 12:6, 13:6, // Shipping variants
  };
  var idx = -1;
  // Try ID lookup first (if called with a number or the repair's status ID)
  var numStatus = Number(status);
  if (numStatus && idToStageIdx[numStatus] !== undefined) {
    idx = idToStageIdx[numStatus];
  } else if (_currentRepair && idToStageIdx[Number(_currentRepair.lRepairStatusID)] !== undefined) {
    idx = idToStageIdx[Number(_currentRepair.lRepairStatusID)];
  }
  if (idx < 0) idx = 0; // default to Received
  document.querySelectorAll('.stage-step').forEach(function(el, i) {
    el.classList.remove('active', 'completed');
    if (i < idx) el.classList.add('completed');
    else if (i === idx) el.classList.add('active');
  });
}

// ── KEYBOARD SHORTCUTS ────────────────────────────────────────
document.addEventListener('keydown', function(e) {
  const tag = document.activeElement.tagName;
  const editing = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    || document.activeElement.contentEditable === 'true';
  if (editing) return;

  switch(e.key.toLowerCase()) {
    case 'q': toggleQueuePanel(); break;
    case 'j': navigateQueue(1); break;
    case 'k': navigateQueue(-1); break;
    case 'a': if (!e.ctrlKey && !e.metaKey) { if (confirm('Advance repair to next status?')) advanceStatus(); } break;
    case 'l': openItemPicker(); break;
    case 'x': toggleSplitView(); break;
    case 'b': toggleBatchMode(); break;
    case 'i': openDrawer('qc'); break;
    case 'p': if (!e.ctrlKey && !e.metaKey) openFormPreview('requisition'); break;
    case 'w': if (!e.ctrlKey && !e.metaKey) openFormPreview('invoice'); break;
    case '/': e.preventDefault(); document.getElementById('qSearch')?.focus(); break;
    // Escape and arrow keys are handled by the extended keyboard handler below
  }
});

document.addEventListener('keydown', function(e) {
  if (e.key === '?' && !e.ctrlKey) showShortcutHelp();
});

// NEXT-STATUS MAP — direct ID→ID from real tblRepairStatuses
// 1=Waiting on Inspection, 3=Drying Room, 6=Waiting for Approved,
// 8=Minor, 9=Major, 11=Mid Level, 21=QC, 10=Scheduled to Ship
const STATUS_NEXT_MAP = {
  1:  6,   // Waiting on Inspection → Waiting for Approved
  3:  6,   // In the Drying Room → Waiting for Approved
  5:  6,   // Additional Evaluation → Waiting for Approved
  6:  8,   // Waiting for Approved → In Repair - Minor
  8:  21,  // In Repair - Minor → QC
  9:  21,  // In Repair - Major → QC
  11: 21,  // In Repair - Mid Level → QC
  14: 21,  // Semi Rigid Repair → QC
  15: 21,  // Special Rigid → QC
  21: 10,  // QC → Scheduled to Ship
  10: 0,   // Scheduled to Ship → end of workflow
  12: 0,   // Scheduled to Ship Tomorrow → end
  13: 0,   // Shipping Today or Tomorrow → end
};

function advanceStatus() {
  if (!_currentRepair) return;
  var currentId = Number(_currentRepair.lRepairStatusID);
  var nextId = STATUS_NEXT_MAP[currentId];
  if (nextId === undefined) {
    showWorkflowToast('No next stage for: ' + (getStatusName(currentId) || 'status ' + currentId));
    return;
  }
  if (nextId === 0) {
    showWorkflowToast('Workflow complete — this repair is ready to ship');
    return;
  }
  applyStatusFromPopover(nextId);
  showWorkflowToast('Advanced to: ' + getStatusName(nextId));
}

function showShortcutHelp() {
  const existing = document.getElementById('kbHelpModal');
  if (existing) { existing.remove(); return; }
  const modal = document.createElement('div');
  modal.id = 'kbHelpModal';
  modal.style.cssText = 'position:fixed;bottom:20px;right:20px;background:var(--primary-dark);color:#fff;border-radius:8px;padding:16px 20px;z-index:var(--z-toast);font-size:12px;min-width:220px;box-shadow:var(--shadow-modal)';
  modal.innerHTML = `
    <div style="font-weight:700;margin-bottom:10px;font-size:13px">Shortcuts</div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:4px 12px">
      <kbd>J/K</kbd><span>Next / Prev repair</span>
      <kbd>↑/↓</kbd><span>Navigate queue (arrows)</span>
      <kbd>Enter</kbd><span>Open focused queue row</span>
      <kbd>A</kbd><span>Advance stage</span>
      <kbd>L</kbd><span>Add line item</span>
      <kbd>I</kbd><span>QC inspection</span>
      <kbd>P</kbd><span>Print quote</span>
      <kbd>W</kbd><span>Print work order</span>
      <kbd>X</kbd><span>Toggle split view</span>
      <kbd>B</kbd><span>Toggle batch mode</span>
      <kbd>Q</kbd><span>Toggle queue</span>
      <kbd>/</kbd><span>Search queue</span>
      <kbd>Ctrl+S</kbd><span>Save repair</span>
      <kbd>Ctrl+F</kbd><span>Focus search</span>
      <kbd>?</kbd><span>Toggle this help</span>
      <kbd>Esc</kbd><span>Close panels / deselect</span>
    </div>
  `;
  const style = document.createElement('style');
  style.textContent = '#kbHelpModal kbd{background:rgba(255,255,255,.15);border-radius:3px;padding:1px 5px;font-family:monospace;font-size:11px}';
  modal.appendChild(style);
  document.body.appendChild(modal);
  setTimeout(() => { if (modal.parentNode) modal.remove(); }, 4000);
}

/* ── Breadcrumb helper ── */
function updateBreadcrumb(items) {
  var el = document.getElementById('breadcrumb');
  if (!el || !items || !items.length) { if (el) el.style.display = 'none'; return; }
  var html = '';
  for (var i = 0; i < items.length; i++) {
    if (i > 0) html += '<span class="breadcrumb-sep">\u203A</span>';
    if (i < items.length - 1 && items[i].href) {
      html += '<a href="' + items[i].href + '">' + items[i].label + '</a>';
    } else if (i < items.length - 1) {
      html += '<a href="#">' + items[i].label + '</a>';
    } else {
      html += '<span class="breadcrumb-current">' + items[i].label + '</span>';
    }
  }
  el.innerHTML = html;
  el.style.display = 'flex';
}

// ── LINE ITEMS TAB FUNCTIONS ──

// addLineItemInline / cancelNewLineItem / commitNewLineItem removed.
// liAddRow HTML removed. "+ Add Item" toolbar button now calls openItemPicker() directly.

function toggleLineItemPricing(show) {
  document.querySelectorAll('.li-price-col').forEach(el => el.style.display = show ? '' : 'none');
  const totalEl = document.getElementById('liTotal');
  if (totalEl) totalEl.style.display = show ? '' : 'none';
}

function populateLineItemsTab(items) {
  const tbody = document.getElementById('liTbody');
  if (!tbody) return;
  if (!items || !items.length) {
    tbody.innerHTML = '<tr id="liEmpty"><td colspan="7" class="li-empty">No line items yet — click <strong>+ Add Item</strong> to begin the repair quote</td></tr>';
    return;
  }
  tbody.innerHTML = items.map(function(item) {
    const name = item.sItemDescription || item.sRepairItemDesc || item.sDescription || item.sRepairItem || '—';
    const desc = item.sFinding || item.sNotes || item.sComment || item.sComments || '';
    const qty = item.nQty || item.nQuantity || 1;
    const approved = item.sApproved === 'Y' ? 'approved' : (item.bDeclined ? 'declined' : 'pending');
    const approvedLabel = item.sApproved === 'Y' ? 'Approved' : (item.bDeclined ? 'Declined' : 'Pending');
    const price = item.dblRepairPrice || item.nPrice || item.nCost || item.dblPrice || item.mAmount || 0;
    return '<tr>' +
      '<td><span class="li-drag-handle">&#8597;</span></td>' +
      '<td class="li-item-name">' + esc(name) + '</td>' +
      '<td class="li-desc"><span contenteditable="true" style="outline:none;min-width:40px;display:inline-block" onblur="markDirty()">' + esc(desc) + '</span></td>' +
      '<td style="text-align:center"><input type="number" value="' + qty + '" min="1" style="width:44px;height:24px;border:1px solid var(--border);border-radius:3px;text-align:center;font-size:11px;padding:0 4px" onchange="markDirty()"></td>' +
      '<td><span class="li-approved ' + approved + '">' + approvedLabel + '</span></td>' +
      '<td class="li-price-col" style="display:none;text-align:right;color:var(--navy);font-weight:600">$' + Number(price).toFixed(2) + '</td>' +
      '<td><button onclick="this.closest(\'tr\').remove();markDirty()" style="border:none;background:none;color:var(--muted);cursor:pointer;font-size:14px;padding:2px 4px" title="Remove">&#x2715;</button></td>' +
      '</tr>';
  }).join('');
}

// ── NOTES TAB FUNCTIONS ──

function addTechNote() {
  const txt = (document.getElementById('noteText')?.value || '').trim();
  if (!txt) return;
  const list = document.getElementById('notesList');
  const empty = document.getElementById('notesEmpty');
  if (empty) empty.remove();
  const tech = (_currentRepair && (_currentRepair.sTechName || _currentRepair.sTechInitials)) || 'Tech';
  const now = new Date();
  const timeStr = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
  const div = document.createElement('div');
  div.className = 'note-entry';
  div.innerHTML = '<div class="note-header"><span class="note-tech">' + tech + '</span><span class="note-time">' + timeStr + '</span><span class="note-type">Manual</span></div>' +
    '<div class="note-body">' + txt.replace(/</g,'&lt;').replace(/>/g,'&gt;') + '</div>';
  if (list) list.insertBefore(div, list.firstChild);
  const noteTextEl = document.getElementById('noteText');
  if (noteTextEl) noteTextEl.value = '';
  markDirty();
}

function populateNotesTab(statusHistory) {
  const list = document.getElementById('notesList');
  if (!list) return;
  const entries = (statusHistory || []).slice().reverse();
  if (!entries.length) {
    list.innerHTML = '<div class="notes-empty" id="notesEmpty">No notes yet. Add a tech note above to start the repair log.</div>';
    return;
  }
  list.innerHTML = entries.map(function(e) {
    const tech = e.sUserName || e.sTechName || e.sChangedBy || 'System';
    const time = e.dtCompleteDate || e.dtStatusDate || e.dtDate || '';
    const timeStr = time ? (new Date(time).toLocaleDateString() + ' ' + new Date(time).toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'})) : '';
    const msg = e.sStatusDesc || e.sRepairStatus || e.sStatus || e.sNote || e.sComment || e.mTranComments || '';
    const isAuto = !e.sNote && !e.sComment && !e.mTranComments;
    return '<div class="note-entry">' +
      '<div class="note-header">' +
        '<span class="note-tech">' + esc(tech) + '</span>' +
        '<span class="note-time">' + timeStr + '</span>' +
        '<span class="note-type">' + (isAuto ? 'Status' : 'Note') + '</span>' +
      '</div>' +
      '<div class="note-body">' + esc(msg) + '</div>' +
    '</div>';
  }).join('');
}

// ── SCOPE HISTORY TAB FUNCTIONS ──

function populateScopeHistoryTab(scopeHistory) {
  const tbody = document.getElementById('shTbody');
  const serialEl = document.getElementById('shSerial');
  const countEl = document.getElementById('shRepairCount');
  if (!tbody) return;
  const serial = _currentRepair ? (_currentRepair.sSerialNumber || '—') : '—';
  if (serialEl) serialEl.textContent = 'SN: ' + serial;
  const rows = Array.isArray(scopeHistory) ? scopeHistory : [];
  if (countEl) countEl.textContent = rows.length + ' prior repair' + (rows.length !== 1 ? 's' : '');
  if (!rows.length) {
    tbody.innerHTML = '<tr><td colspan="7" class="li-empty">First repair on record for this serial number.</td></tr>';
    return;
  }
  const currentWO = _currentRepair ? (_currentRepair.sWorkOrderNumber || '') : '';
  tbody.innerHTML = rows.map(function(r) {
    const wo = r.sWorkOrderNumber || r.sWONumber || '—';
    const dateIn = r.dtDateIn ? fmtDate(r.dtDateIn) : '—';
    const complaint = (r.sComplaintDesc || r.sComplaint || r.sCustomerComplaint || '').substring(0, 50);
    const items = r.nRepairItemCount || r.itemCount || '—';
    const tat = r.nTAT != null ? r.nTAT + 'd' : '—';
    const status = r.sRepairStatus || r.sStatus || '—';
    const client = (r.sClientName1 || r.sClientName || r.sShipName1 || '').substring(0, 20);
    const isCurrent = wo === currentWO || r.lRepairKey === (_currentRepair && _currentRepair.lRepairKey);
    return '<tr style="' + (isCurrent ? 'background:#BFDBFE;font-weight:600' : 'cursor:pointer') + '" ' + (!isCurrent ? 'onclick="loadRepairByWO(\'' + wo + '\')"' : '') + '>' +
      '<td style="font-family:monospace;font-weight:700;color:var(--navy)">' + wo + (isCurrent ? ' <span style="font-size:9px;background:var(--navy);color:#fff;padding:1px 4px;border-radius:3px">current</span>' : '') + '</td>' +
      '<td>' + dateIn + '</td>' +
      '<td style="color:var(--muted)">' + complaint + '</td>' +
      '<td style="text-align:center">' + items + '</td>' +
      '<td>' + tat + '</td>' +
      '<td>' + status + '</td>' +
      '<td style="color:var(--muted)">' + client + '</td>' +
    '</tr>';
  }).join('');
}

// ══════════════════════════════════════════════════════════════
// CHECKPOINT 1, FEATURE 1: COLOR-CODED STATUS PILLS
// ══════════════════════════════════════════════════════════════

/**
 * Maps a status name string to a CSS class for colored status pills.
 * Returns one of: sp-neutral, sp-blue, sp-amber, sp-navy, sp-purple, sp-teal, sp-green, sp-red
 */
function statusPillClass(statusName) {
  if (!statusName) return 'sp-neutral';
  const s = statusName.toLowerCase();

  // Cancelled / No Fault / Declined → red
  if (/cancel|no fault|declined|write.?off/.test(s)) return 'sp-red';

  // Invoiced / Shipped / Closed / Complete → green
  if (/invoic|shipped|closed|complet|billed/.test(s)) return 'sp-green';

  // Scheduled to Ship / Parts Hold → teal (primary)
  if (/sched.*ship|parts.?hold|ready.*ship/.test(s)) return 'sp-teal';

  // QC / Waiting Customer Approval → purple
  if (/\bqc\b|quality control|waiting.*customer|customer.*approv/.test(s)) return 'sp-purple';

  // In Repair Process → navy
  if (/in repair|repair process|semi.?rigid|special rigid|build|drying room/.test(s)) return 'sp-navy';

  // Quoted / Waiting for Approval / Awaiting → amber
  if (/quot|approv|await|waiting|follow.?up|on hold/.test(s)) return 'sp-amber';

  // D&I / Inspection / In Drying Room → blue
  if (/d&i|d & i|inspect|disassem|drying/.test(s)) return 'sp-blue';

  // Received / Waiting on Inspection → neutral
  if (/receiv|waiting.*insp/.test(s)) return 'sp-neutral';

  return 'sp-neutral';
}

// ══════════════════════════════════════════════════════════════
// CHECKPOINT 1, FEATURE 2: NOTIFICATION BADGES ON TABS
// ══════════════════════════════════════════════════════════════

function setTabBadge(tabName, count) {
  const el = document.getElementById('badge-' + tabName);
  if (!el) return;
  if (count > 0) {
    el.textContent = count > 99 ? '99+' : count;
    el.classList.add('show');
  } else {
    el.classList.remove('show');
    el.textContent = '';
  }
}

function updateTabBadges(repairData) {
  const d = repairData || _currentRepair;
  if (!d) return;

  // LINE ITEMS badge — count of unapproved items (sApproved !== 'Y')
  const items = (typeof _repairItems !== 'undefined' ? _repairItems : window._repairItems) || [];
  const unapproved = items.filter(function(item) {
    return item.sApproved !== 'Y' && !item.bDeclined;
  }).length;
  setTabBadge('lineitems', unapproved);

  // NOTES badge — notes added since last time this repair was opened
  // Track via localStorage key tsi_read_ts_{repairKey}
  const rKey = d.lRepairKey || 0;
  const readTsKey = 'tsi_read_ts_' + rKey;
  const lastReadTs = parseInt(localStorage.getItem(readTsKey) || '0');
  const notesList = document.getElementById('notesList');
  let unreadNotes = 0;
  if (notesList && lastReadTs > 0) {
    notesList.querySelectorAll('.note-entry').forEach(function(entry) {
      const timeEl = entry.querySelector('.note-time');
      if (timeEl && timeEl.textContent) {
        const noteTs = new Date(timeEl.textContent).getTime();
        if (!isNaN(noteTs) && noteTs > lastReadTs) unreadNotes++;
      }
    });
  }
  setTabBadge('notes', unreadNotes);
  // Update the read timestamp now that user sees this repair
  localStorage.setItem(readTsKey, Date.now().toString());

  // SCOPE HISTORY badge — count of prior repairs if > 2 (repeat offender)
  const badge = document.getElementById('hHistoryCount');
  const priorCount = badge && badge.style.display !== 'none' ? (parseInt(badge.textContent) || 0) : (_scopeHistory ? _scopeHistory.filter(function(r) { return r.lRepairKey !== (d.lRepairKey || 0); }).length : 0);
  setTabBadge('scopehistory', priorCount > 2 ? priorCount : 0);

  // IMAGES badge — count of image placeholders that have actual data
  // (using placeholder count from DOM for now; wire to real attachments when API is available)
  const imgGrid = document.querySelector('#pane-images .img-grid');
  const realImages = imgGrid ? imgGrid.querySelectorAll('.img-placeholder:not([style*="dashed"])').length : 0;
  setTabBadge('images', realImages > 0 ? realImages : 0);

  // SHIPPING badge — 1 if tracking number missing and status is "Scheduled to Ship"
  const statusName = (d._statusName || d.sRepairStatus || d.sStatus || '').toLowerCase();
  const trackingVal = (document.getElementById('sTracking2') || {}).value || (d.sShipTrackingNumber || '');
  const needsTracking = /sched.*ship|ready.*ship/i.test(statusName) && !trackingVal.trim();
  setTabBadge('shipping', needsTracking ? 1 : 0);
}

// ══════════════════════════════════════════════════════════════
// CHECKPOINT 1, FEATURE 3: KEYBOARD NAVIGATION POLISH
// ══════════════════════════════════════════════════════════════

// isEditing() helper — prevent nav shortcuts when typing in inputs
function isEditing() {
  const tag = document.activeElement ? document.activeElement.tagName : '';
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT'
    || (document.activeElement && document.activeElement.contentEditable === 'true');
}

// ── Exports ──
window.initDragDrop = initDragDrop;
window.toggleQueuePanel = toggleQueuePanel;
window.setQueueFilter = setQueueFilter;
window.queueSearch = queueSearch;
window.applySortAndFilter = applySortAndFilter;
window.renderQueue = renderQueue;
window.qRowClick = qRowClick;
window.loadRepairByWO = loadRepairByWO;
window.navigateQueue = navigateQueue;
window.toggleBatchMode = toggleBatchMode;
window.toggleBatchRow = toggleBatchRow;
window.updateBulkBar = updateBulkBar;
window.clearBatchSelection = clearBatchSelection;
window.applyBulkStatus = applyBulkStatus;
window.setPresetFilter = setPresetFilter;
window.applyPresetFilter = applyPresetFilter;
window.toggleSplitView = toggleSplitView;
window.dismissSplitRight = dismissSplitRight;
window.loadRepairIntoSplitRight = loadRepairIntoSplitRight;
window.isClosedStatus = isClosedStatus;
window.syncQueueFromRepairList = syncQueueFromRepairList;
window.toggleShowClosed = toggleShowClosed;
window.updateStagePipeline = updateStagePipeline;
window.advanceStatus = advanceStatus;
window.showShortcutHelp = showShortcutHelp;
window.updateBreadcrumb = updateBreadcrumb;
window.toggleLineItemPricing = toggleLineItemPricing;
window.populateLineItemsTab = populateLineItemsTab;
window.addTechNote = addTechNote;
window.populateNotesTab = populateNotesTab;
window.populateScopeHistoryTab = populateScopeHistoryTab;
window.statusPillClass = statusPillClass;
window.setTabBadge = setTabBadge;
window.updateTabBadges = updateTabBadges;
window.isEditing = isEditing;
window.CLOSED_STATUSES = CLOSED_STATUSES;
window.STATUS_NEXT_MAP = STATUS_NEXT_MAP;
})();
