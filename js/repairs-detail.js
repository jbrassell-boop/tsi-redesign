/* ═══ repairs-detail.js ═══
   Detail panel population, form sync, payload building, auto-save, dirty state.
   Part of repairs.html modularization.
*/
(function() {
'use strict';

function updateStatusBadge(statusId) {
  const sid = Number(statusId);
  // PO Required enforcement: block Shipping-phase statuses when PO is missing
  const poReq = document.getElementById('fPORequired');
  const poVal = (document.getElementById('hPO').value || '').trim();
  if (poReq && poReq.checked && !poVal) {
    const allSt = _statuses || [];
    const target = allSt.find(s => s.lRepairStatusID === sid);
    if (target && target.sPhaseGroup === 'Shipping') {
      // Redirect to "Approved - Awaiting PO" (ID 28)
      const sel = document.getElementById('hRepairStatus');
      if (sel) sel.value = '28';
      showWorkflowToast('PO # required before shipping. Status set to Approved - Awaiting PO.');
      updateWorkflowForms(28);
      const chip = document.getElementById('ssStatus');
      if (chip) chip.querySelector('.ss-val').textContent = 'Approved - Awaiting PO';
      return;
    }
  }
  const name = getStatusName(sid) || statusId;
  const chip = document.getElementById('ssStatus');
  if (chip) chip.querySelector('.ss-val').textContent = name || '—';
  updateWorkflowForms(sid);
  if (typeof updateStagePipeline === 'function') updateStagePipeline(name);
  // Also sync glance card badge text + color
  const sgcBadge = document.getElementById('sgcStatusBadge');
  if (sgcBadge) {
    sgcBadge.textContent = name || '—';
    const sl = (name || '').toLowerCase();
    if (/ship|complete|invoic/i.test(sl)) { sgcBadge.style.background='var(--primary-light)';sgcBadge.style.color='var(--navy)';sgcBadge.style.borderColor='var(--border-dk)'; }
    else if (/in repair|drying/i.test(sl)) { sgcBadge.style.background='var(--success-light)';sgcBadge.style.color='var(--success)';sgcBadge.style.borderColor='var(--success-border)'; }
    else if (/approv|wait|quoted/i.test(sl)) { sgcBadge.style.background='var(--warning-light)';sgcBadge.style.color='var(--amber)';sgcBadge.style.borderColor='var(--warning-border)'; }
    else if (/qc/i.test(sl)) { sgcBadge.style.background='var(--primary-light)';sgcBadge.style.color='var(--primary)';sgcBadge.style.borderColor='var(--border-dk)'; }
    else { sgcBadge.style.background='var(--neutral-100)';sgcBadge.style.color='var(--neutral-500)';sgcBadge.style.borderColor='var(--neutral-200)'; }
  }
}

// ── STATUS POPOVER (glance card clickable status control) ──────
function toggleStatusPopover() {
  const popover = document.getElementById('statusPopover');
  if (!popover) return;
  if (popover.classList.contains('open')) {
    popover.classList.remove('open');
    return;
  }
  // Build popover content from _statuses
  const allSt = _statuses.filter(function(s) { return !s.bIsLegacy; })
    .sort(function(a, b) { return (a.lRepairStatusSortOrder||99) - (b.lRepairStatusSortOrder||99); });
  const groups = ['Intake','Approval','In Repair','Shipping','On Hold'];
  const currentId = _currentRepair ? (_currentRepair.lRepairStatusID || 0) : 0;
  let html = '';
  groups.forEach(function(grp) {
    const items = allSt.filter(function(s) { return s.sPhaseGroup === grp; });
    if (!items.length) return;
    html += '<div class="sp-group-label">' + esc(grp) + '</div>';
    items.forEach(function(s) {
      const isActive = s.lRepairStatusID === currentId;
      const dotColor = statusPillClass(s.sRepairStatus).replace('sp-','');
      const dotColorMap = {neutral:'var(--neutral-400)',blue:'var(--blue)',amber:'var(--amber)',navy:'var(--navy)',purple:'#7C3AED',teal:'var(--primary)',green:'var(--success)',red:'var(--danger)'};
      const dotStyle = 'background:' + (dotColorMap[dotColor] || 'var(--muted)');
      html += '<div class="sp-option' + (isActive?' sp-active':'') + '" onclick="applyStatusFromPopover(' + s.lRepairStatusID + ')">' +
        '<span class="sp-dot" style="' + dotStyle + '"></span>' +
        esc(s.sRepairStatus) + (isActive ? ' ✓' : '') +
        '</div>';
    });
  });
  if (!html) html = '<div style="padding:8px 12px;font-size:11px;color:var(--muted)">No statuses available</div>';
  popover.innerHTML = html;
  popover.classList.add('open');
}

function applyStatusFromPopover(statusId) {
  const popover = document.getElementById('statusPopover');
  if (popover) popover.classList.remove('open');
  // Sync the hidden hRepairStatus select (used by save logic)
  const sel = document.getElementById('hRepairStatus');
  if (sel) sel.value = String(statusId);
  // Update current repair object
  if (_currentRepair) _currentRepair.lRepairStatusID = statusId;
  updateStatusBadge(statusId);
  markDirty();
}

// Close status popover when clicking outside
document.addEventListener('click', function(e) {
  const popover = document.getElementById('statusPopover');
  if (!popover || !popover.classList.contains('open')) return;
  const btn = document.getElementById('sgcStatusBtn');
  if (btn && btn.contains(e.target)) return; // handled by toggleStatusPopover
  popover.classList.remove('open');
});

function populateSelect(id, items, valKey, textKey, blank) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = blank ? '<option value="">—</option>' : '';
  items.slice().sort((a, b) => String(a[textKey] || '').localeCompare(String(b[textKey] || ''))).forEach(item => { const o = document.createElement('option'); o.value = item[valKey]; o.textContent = item[textKey]; sel.appendChild(o); });
}

// Grouped status dropdown — uses sPhaseGroup for <optgroup> sections
// isCartRepair: show Cart / Build statuses only for EndoCart repairs
// bIsLegacy entries are excluded from dropdown (lookup only)
function populateStatusSelect(isCartRepair) {
  const sel = document.getElementById('hRepairStatus');
  if (!sel) return;
  sel.innerHTML = '<option value="">—</option>';
  const groups = ['Intake', 'Approval', 'In Repair', 'Shipping', 'On Hold'];
  if (isCartRepair) groups.push('Cart / Build');
  // Sort by lRepairStatusSortOrder; exclude legacy entries
  const sorted = _statuses.slice()
    .filter(function(s) { return !s.bIsLegacy; })
    .sort(function(a, b) { return (a.lRepairStatusSortOrder || 99) - (b.lRepairStatusSortOrder || 99); });
  groups.forEach(function(grp) {
    const items = sorted.filter(function(s) { return s.sPhaseGroup === grp; });
    if (!items.length) return;
    const og = document.createElement('optgroup');
    og.label = grp;
    items.forEach(function(s) {
      const o = document.createElement('option');
      o.value = s.lRepairStatusID;
      o.textContent = s.sRepairStatus;
      og.appendChild(o);
    });
    sel.appendChild(og);
  });
  // Fallback: any active status without a sPhaseGroup
  const ungrouped = sorted.filter(function(s) { return !s.sPhaseGroup && !s.bIsCartStatus; });
  if (ungrouped.length) {
    const og = document.createElement('optgroup');
    og.label = 'Other';
    ungrouped.forEach(function(s) {
      const o = document.createElement('option');
      o.value = s.lRepairStatusID;
      o.textContent = s.sRepairStatus;
      og.appendChild(o);
    });
    sel.appendChild(og);
  }
}

function setSelectVal(id, val) {
  const sel = document.getElementById(id);
  if (!sel || val == null) return;
  for (let i = 0; i < sel.options.length; i++) { if (sel.options[i].value == val) { sel.selectedIndex = i; return; } }
}

// ── Tab Switching ──
document.getElementById('tabBar').addEventListener('click', function(e) {
  const tab = e.target.closest('.tab');
  if (!tab) return;
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
  tab.classList.add('active');
  const pane = document.getElementById('pane-' + tab.dataset.tab);
  if (pane) pane.classList.add('active');
});

// ── Load Single Repair ──
async function loadRepair(repairKey) {
  if (!repairKey) return;
  // Flush pending autosave before switching repairs
  if (_dirty && _currentRepair) {
    clearTimeout(_saveTimer);
    await autoSave();
  }
  clearTimeout(_saveTimer);
  // Loading guard: prevent concurrent calls for the same repair
  if (_loadingKey === repairKey) return;
  _loadingKey = repairKey;
  // Switch from idle state to content on first load
  const idleEl = document.getElementById('detailIdle');
  const contentEl = document.getElementById('detailContent');
  if (idleEl) idleEl.style.display = 'none';
  if (contentEl) { contentEl.style.display = 'flex'; }
  // Clear any previous error banner
  const errBannerInit = document.getElementById('detailErrorBanner');
  if (errBannerInit) errBannerInit.style.display = 'none';
  document.getElementById('hWO').textContent = 'Loading...';
  // Show skeleton while loading
  const skeleton = document.getElementById('detailSkeleton');
  const detailScroll = document.getElementById('detailScroll');
  if (skeleton) skeleton.classList.add('show');
  if (detailScroll) detailScroll.style.visibility = 'hidden';
  try {
    const svcKey = parseInt(document.getElementById('svcLocation').value) || 1;
    const detail = await API.getRepairDetail(repairKey, svcKey);
    if (_loadingKey !== repairKey) return; // Stale response, user clicked another
    const d = Array.isArray(detail) ? detail[0] : detail;
    // Check localStorage for persisted changes
    const persisted = loadPersistedRepair(repairKey);
    if (persisted && persisted.repair) {
      // Merge persisted fields over the fresh API data
      Object.assign(d, persisted.repair);
      if (DEBUG) console.log('[TSI Repairs] Restored persisted repair state for key:', repairKey);
    }
    _currentRepair = d;
    _dirty = false;
    updateSaveStatus('ready');
    updateLocalTag(!!persisted);
    // Sync URL so the selected repair is bookmarkable / refresh-safe
    if (d.sWorkOrderNumber) {
      const url = new URL(window.location.href);
      url.searchParams.set('wo', d.sWorkOrderNumber);
      url.searchParams.delete('key');
      url.searchParams.delete('action');
      history.replaceState({ wo: d.sWorkOrderNumber }, '', url.toString());
    }
    // Hide skeleton, reveal detail
    const _sk = document.getElementById('detailSkeleton');
    const _ds = document.getElementById('detailScroll');
    if (_sk) _sk.classList.remove('show');
    if (_ds) _ds.style.visibility = '';
    populateDetail(d);
    updateWorkflowForms(d.lRepairStatusID || 1);
    renderRepairAuditTrail(d);

    // Run initial tab badge update (shipping/status-based badges)
    if (typeof updateTabBadges === 'function') updateTabBadges(d);

    // Load sub-tabs + scope history in parallel (non-blocking)
    Promise.all([
      loadRepairItems(repairKey),
      loadRepairInventory(repairKey),
      loadRepairStatusHistory(repairKey),
      loadRepairDocuments(repairKey),
      loadRepairFlags(repairKey),
      loadScopeHistory(),
    ]).then(function() {
      // Re-run tab badges after sub-tabs loaded (line items, notes, scope history)
      if (typeof updateTabBadges === 'function') updateTabBadges(_currentRepair);
    }).catch(e => console.warn('[TSI Repairs] Sub-tab load error:', e.message));
  } catch (e) {
    console.warn('[TSI Repairs] Detail load failed:', e.message);
    document.getElementById('hWO').textContent = 'Error';
    // Hide skeleton on error, show detail area with error banner
    const _sk2 = document.getElementById('detailSkeleton');
    const _ds2 = document.getElementById('detailScroll');
    if (_sk2) _sk2.classList.remove('show');
    if (_ds2) _ds2.style.visibility = '';
    // Show inline error banner at top of detail panel
    const _errBanner = document.getElementById('detailErrorBanner');
    if (_errBanner) {
      _errBanner.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px;flex-shrink:0"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>' +
        '<span style="flex:1">Failed to load repair — try again</span>' +
        '<button onclick="document.getElementById(\'detailErrorBanner\').style.display=\'none\';loadRepair(' + repairKey + ')" style="background:rgba(255,255,255,.2);border:1px solid rgba(255,255,255,.4);color:#fff;border-radius:3px;padding:2px 8px;font-size:10px;cursor:pointer;font-family:inherit">Retry</button>';
      _errBanner.style.display = 'flex';
    }
  } finally {
    _loadingKey = null;
  }
}

async function loadRepairInventory(repairKey) {
  try {
    const data = await API.getRepairInventory(repairKey);
    const items = Array.isArray(data) ? data : (data?.dataSource || []);
    populateInventory(items);
    if (DEBUG) console.log('[TSI Repairs] Inventory loaded:', items.length, 'parts');
  } catch (e) { console.warn('[TSI Repairs] Inventory load:', e.message); }
}

async function loadRepairStatusHistory(repairKey) {
  try {
    const data = await API.getRepairStatusHistory(repairKey);
    const rows = Array.isArray(data) ? data : (data?.dataSource || []);
    populateStatus(rows);
    if (DEBUG) console.log('[TSI Repairs] Status history loaded:', rows.length, 'entries');
  } catch (e) {
    console.warn('[TSI Repairs] Status history load:', e.message);
    // Endpoint returns 500 — show friendly message
    document.getElementById('statusBody').innerHTML =
      '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:16px;font-size:10px">Status history unavailable (server error)</td></tr>';
  }
}

async function loadRepairDocuments(repairKey) {
  try {
    const data = await API.getDocuments(repairKey);
    const docs = Array.isArray(data) ? data : (data?.dataSource || []);
    populateDocuments(docs);
    if (DEBUG) console.log('[TSI Repairs] Documents loaded:', docs.length, 'files');
  } catch (e) { console.warn('[TSI Repairs] Documents load:', e.message); }
}

async function loadRepairFlags(repairKey) {
  try {
    const data = await API.getFlagsByOwner(repairKey);
    const flags = Array.isArray(data) ? data : (data?.dataSource || []);
    renderFlags(flags);
    if (DEBUG) console.log('[TSI Repairs] Flags loaded:', flags.length);
  } catch (e) { console.warn('[TSI Repairs] Flags load:', e.message); }
}

function renderFlags(flags) {
  const bar = document.getElementById('flagsBar');
  if (!bar) return;
  if (!flags || !flags.length) { bar.style.display = 'none'; return; }
  bar.style.display = 'flex';
  bar.innerHTML = flags.map(f =>
    '<span class="flag-chip">' + esc(f.psFlag || f.sFlag || f.sFlagDescription || 'Flag') + '</span>'
  ).join('');
}

function addRepeatVisitFlag(days) {
  const bar = document.getElementById('flagsBar');
  if (!bar) return;
  if (bar.querySelector('.flag-repeat')) return; // already added
  bar.style.display = 'flex';
  const chip = document.createElement('span');
  chip.className = 'flag-chip flag-repeat';
  chip.style.cssText = 'background:var(--danger-light);color:var(--danger);border-color:var(--danger-border);font-weight:700';
  chip.textContent = 'REPEAT VISIT \u2014 ' + days + ' days since last repair';
  // Insert after the FLAGS label
  bar.appendChild(chip);
}

// ── SCOPE TIMELINE helpers ──
function loadRepairByKey(key) { loadRepair(key); }

function renderScopeTimeline(scopeKey, currentRepairKey) {
  var el = document.getElementById('scopeTimeline');
  if (!el) return;
  if (!scopeKey) { el.classList.remove('tl-visible'); return; }
  // Uses cached repair list — filters by scope key for timeline display
  var allReps = (_repairListData || []).filter(function(r) { return (r.lScopeKey || 0) == scopeKey; });
  if (!allReps || allReps.length <= 1) { el.classList.remove('tl-visible'); return; }
  allReps.sort(function(a, b) { return (a.dtDateIn || '').localeCompare(b.dtDateIn || ''); });
  var has40 = false;
  var html = '<span class="tl-label">Scope History</span><div class="tl-track">';
  for (var i = 0; i < allReps.length; i++) {
    var r = allReps[i];
    var isCurr = (r.lRepairKey || 0) == currentRepairKey;
    var is40 = false;
    if (i > 0 && allReps[i - 1].dtDateOut && r.dtDateIn) {
      var gap = Math.round((new Date(r.dtDateIn) - new Date(allReps[i - 1].dtDateOut)) / 86400000);
      is40 = gap >= 0 && gap <= 40;
      if (is40) has40 = true;
    }
    var cls = 'tl-node' + (isCurr ? ' tl-current' : '') + (is40 ? ' tl-return' : '');
    var wo = r.sWorkOrderNumber || r.psWorkOrderNumber || r.sWONbr || '';
    var din = r.dtDateIn ? fmtDate(r.dtDateIn) : '';
    html += '<div class="' + cls + '" onclick="loadRepairByKey(' + r.lRepairKey + ')" title="' + wo + '">';
    html += '<div class="tl-dot"></div>';
    html += '<div class="tl-date">' + din + '</div>';
    html += '<div class="tl-wo">' + wo + '</div>';
    html += '</div>';
    if (i < allReps.length - 1) html += '<div class="tl-line"></div>';
  }
  html += '</div>';
  el.innerHTML = html;
  el.classList.add('tl-visible');
  if (has40) el.classList.add('tl-has-return'); else el.classList.remove('tl-has-return');
}

function populateDetail(d) {
  // ── TOOLBAR / STATUS STRIP ──
  document.getElementById('repairBadge').textContent = '#' + (d.sWorkOrderNumber || d.lRepairKey || '');
  const statusName = getStatusName(d.lRepairStatusID) || d.sRepairStatus || '—';
  document.getElementById('ssStatus').querySelector('.ss-val').textContent = statusName;
  const rep = _salesReps.find(x => (x.lSalesRepNameKey || x.lSalesRepKey) == d.lSalesRepKey);
  document.getElementById('ssRep').querySelector('.ss-val').textContent = d.sSalesRepName || (rep ? rep.sSalesRepName : '') || '—';
  document.getElementById('ssTech').querySelector('.ss-val').textContent = d.sTechName || '—';
  const lvl = _levels.find(x => x.lRepairLevelKey == d.lRepairLevelKey);
  document.getElementById('ssLevel').querySelector('.ss-val').textContent = lvl ? lvl.sRepairLevel : '';
  const dm = _deliveryMethods.find(x => x.lDeliveryMethodKey == d.lDeliveryMethodKey);
  document.getElementById('ssCarrier').querySelector('.ss-val').textContent = dm ? dm.sDeliveryDesc : '';
  document.getElementById('ssModified').textContent = d.dtLastUpdate ? 'Modified ' + fmtDate(d.dtLastUpdate) : '';

  // ── REFERENCE STRIP ──
  document.getElementById('hDateIn').value = toDateInput(d.dtDateIn);
  document.getElementById('hClient').textContent = d.sShipName1 || d.sBillName1 || d.sClientName1 || (_clients.find(c => c.lClientKey == d.lClientKey) || {}).sClientName1 || '—';
  document.getElementById('hDept').textContent = d.sShipName2 || d.sDepartmentName || (_departments.find(x => x.lDepartmentKey == d.lDepartmentKey) || {}).sDepartmentName || '—';
  document.getElementById('hPO').value = d.sPurchaseOrder || d.sPONumber || '';
  document.getElementById('fPORequired').checked = !!d.bPORequired;
  document.getElementById('fCustomerRef').value = d.sCustomerRefNumber || '';
  document.getElementById('hWO').textContent = d.sWorkOrderNumber || '—';
  document.getElementById('hRack').value = d.sRackPosition || '';
  setSelectVal('fRepairSource', d.sRepairSource || '');
  setSelectVal('hRepairLevel', d.lRepairLevelKey);
  setSelectVal('hRepairStatus', d.lRepairStatusID);

  // ── SYNC GLANCE CARD ──
  const sgcModel = document.getElementById('sgcModel');
  const sgcSerial = document.getElementById('sgcSerial');
  const sgcClient = document.getElementById('sgcClient');
  const sgcDept = document.getElementById('sgcDept');
  const sgcPO = document.getElementById('sgcPO');
  const sgcWO = document.getElementById('sgcWO');
  const sgcDays = document.getElementById('sgcDays');
  const sgcStatusBadge = document.getElementById('sgcStatusBadge');
  const sgcType = document.getElementById('sgcType');

  if (sgcModel) sgcModel.textContent = d.sScopeTypeDesc || '—';
  if (sgcSerial) sgcSerial.textContent = d.sSerialNumber || '—';
  if (sgcClient) sgcClient.textContent = d.sShipName1 || d.sClientName1 || '—';
  if (sgcDept) sgcDept.textContent = d.sDepartmentName || d.sShipName2 || '—';
  if (sgcPO) sgcPO.value = d.sPurchaseOrder || d.sPONumber || '';
  if (sgcWO) sgcWO.textContent = d.sWorkOrderNumber || '';
  const rawType = (d.sRigidOrFlexible || '').toUpperCase().charAt(0);
  if (sgcType) sgcType.textContent = rawType === 'F' ? 'Flexible' : rawType === 'R' ? 'Rigid' : rawType === 'C' ? 'Camera' : '';
  if (sgcDays && d.dtDateIn) {
    const dayCount = Math.floor((new Date() - new Date(d.dtDateIn)) / 86400000);
    sgcDays.textContent = dayCount;
    sgcDays.style.color = dayCount > 14 ? 'var(--danger)' : dayCount > 7 ? 'var(--amber)' : 'var(--navy)';
  } else if (sgcDays) { sgcDays.textContent = '—'; }
  if (sgcStatusBadge) {
    const sn = getStatusName(d.lRepairStatusID) || d.sRepairStatus || '—';
    sgcStatusBadge.textContent = sn;
    const sl = sn.toLowerCase();
    if (/ship|complete|invoic/i.test(sl)) { sgcStatusBadge.style.background = 'var(--primary-light)'; sgcStatusBadge.style.color = 'var(--navy)'; sgcStatusBadge.style.borderColor = 'var(--border-dk)'; }
    else if (/repair|drying/i.test(sl)) { sgcStatusBadge.style.background = 'var(--success-light)'; sgcStatusBadge.style.color = 'var(--success)'; sgcStatusBadge.style.borderColor = 'var(--success-border)'; }
    else if (/approv|wait|quoted/i.test(sl)) { sgcStatusBadge.style.background = 'var(--warning-light)'; sgcStatusBadge.style.color = 'var(--amber)'; sgcStatusBadge.style.borderColor = 'var(--warning-border)'; }
    else if (/qc/i.test(sl)) { sgcStatusBadge.style.background = 'var(--primary-light)'; sgcStatusBadge.style.color = 'var(--primary)'; sgcStatusBadge.style.borderColor = 'var(--border-dk)'; }
    else { sgcStatusBadge.style.background = 'var(--neutral-100)'; sgcStatusBadge.style.color = 'var(--neutral-500)'; sgcStatusBadge.style.borderColor = 'var(--neutral-200)'; }
  }

  // Breadcrumb
  const bcClient = d.sShipName1 || d.sBillName1 || d.sClientName1 || (_clients.find(c => c.lClientKey == d.lClientKey) || {}).sClientName1 || '';
  const bcWO = d.sWorkOrderNumber || ('Repair #' + d.lRepairKey);
  updateBreadcrumb([
    { label: 'Repairs', href: 'repairs.html' },
    { label: bcClient || 'Client' },
    { label: bcWO }
  ]);

  // Scope row (spans, not inputs)
  document.getElementById('hMfr').textContent = d.sManufacturer || '—';
  // Category: sScopeTypeCategory = "Gastroscope", "Colonoscope", etc. from scopeTypeCategories table
  document.getElementById('hScopeCat').textContent = d.sScopeTypeCategory || d.sScopeCategory || '—';
  document.getElementById('hModel').textContent = d.sScopeTypeDesc || '—';
  document.getElementById('hSerial').textContent = d.sSerialNumber || '—';
  document.getElementById('hCapFFS').textContent = d.lContractKey ? 'Contract' : 'FFS';
  // PERF-004: use cached _repairListData instead of a fresh API.getRepairList() network call
  // Compute days since last repair + 40-day warranty flag from repair history
  var daysLastIn = d.nDaysSinceLastIn;
  if (!daysLastIn && d.sSerialNumber && d.dtDateIn) {
    try {
      var _histList = (typeof _repairListData !== 'undefined' && _repairListData.length) ? _repairListData : null;
      function _computeGap(arr) {
        var curInDate = d.dtDateIn.substring(0, 10);
        var prevRepairs = arr.filter(function(r) {
          return r.sSerialNumber === d.sSerialNumber && r.lRepairKey !== d.lRepairKey && r.dtDateOut && r.dtDateOut.substring(0, 10) <= curInDate;
        }).sort(function(a, b) { return (b.dtDateOut || '').localeCompare(a.dtDateOut || ''); });
        if (prevRepairs.length) {
          var prevOut = new Date(prevRepairs[0].dtDateOut);
          var curIn = new Date(d.dtDateIn);
          var gap = Math.round((curIn - prevOut) / 86400000);
          document.getElementById('hDaysLastIn').textContent = gap + 'd';
          if (gap < 30) { document.getElementById('hDaysLastIn').style.cssText = 'color:var(--danger);font-weight:700'; addRepeatVisitFlag(gap); }
          var el40 = document.getElementById('hWithin40');
          if (gap <= 40) { el40.textContent = 'YES'; el40.style.color = 'var(--danger)'; el40.style.fontWeight = '700'; }
          else { el40.textContent = 'No'; el40.style.color = ''; el40.style.fontWeight = ''; }
        }
      }
      if (_histList) {
        _computeGap(_histList);
      } else if (_liveMode) {
        var svcKey = parseInt(document.getElementById('svcLocation').value) || 1;
        API.getRepairList(svcKey).then(function(list) {
          _computeGap(Array.isArray(list) ? list : []);
        }).catch(function() {});
      }
    } catch(e) {}
  } else {
    document.getElementById('hDaysLastIn').textContent = daysLastIn ? daysLastIn + 'd' : '—';
    if (daysLastIn && daysLastIn < 30) { document.getElementById('hDaysLastIn').style.cssText = 'color:var(--danger);font-weight:700'; addRepeatVisitFlag(daysLastIn); }
    else { document.getElementById('hDaysLastIn').style.cssText = ''; }
  }
  document.getElementById('hWithin40').textContent = daysLastIn && daysLastIn <= 40 ? 'YES' : '—';

  // Details tab — TAT / Dates (now spans, not inputs)
  if (d.dtDateIn) {
    const end = d.dtDateOut ? new Date(d.dtDateOut) : new Date();
    const days = Math.round((end - new Date(d.dtDateIn)) / 86400000);
    document.getElementById('hTAT').textContent = days + 'd' + (d.dtDateOut ? '' : ' (open)');
  } else { document.getElementById('hTAT').textContent = '—'; }
  document.getElementById('hLeadTime').textContent = d.nLeadTime != null ? d.nLeadTime + 'd' : '—';
  document.getElementById('hDateOutRO').textContent = d.dtDateOut ? fmtDate(d.dtDateOut) : '—';

  // ── SCOPE IN TAB ──
  document.getElementById('fComplaint').textContent = d.sComplaintDesc || '';
  setSelectVal('fRepairReason', d.lRepairReasonKey);
  document.getElementById('fMaxCharge').value = d.mMaxCharge ? fmtMoney(d.mMaxCharge) : '';
  document.getElementById('fMaxOverride').value = '';
  document.getElementById('fAngInUp').value = d.sAngInUp || '';
  document.getElementById('fAngInDown').value = d.sAngInDown || '';
  document.getElementById('fAngInRight').value = d.sAngInRight || '';
  document.getElementById('fAngInLeft').value = d.sAngInLeft || '';
  document.getElementById('fEpoxyIn').value = d.nIncomingEpoxySize || '';
  document.getElementById('fBRJig').value = d.sBRJigSize || '';
  setSelectVal('fPSLevelIn', d.lPatientSafetyLevelKey);
  document.getElementById('fScopeNotes').value = d.sNotes || '';

  // ── INCOMING INSPECTION — render type-specific template ──
  const scopeType = d.sRigidOrFlexible || 'R';
  document.getElementById('incomingInspBody').innerHTML = renderInspectionContent(scopeType, 'in');
  document.getElementById('postRepairInspBody').innerHTML = renderInspectionContent(scopeType, 'out');

  // Show config strip only for F/R (Camera has no static config fields)
  // Use display:contents so strip children participate in the parent flex row
  const isF = scopeType === 'F', isR = scopeType === 'R';
  document.getElementById('flexScopeSection').style.display = isF ? 'contents' : 'none';
  document.getElementById('rigidScopeSection').style.display = isR ? 'contents' : 'none';
  document.getElementById('scopeTypeDetails').style.display = (isF || isR) ? '' : 'none';

  // Populate dynamically-created dropdowns after inspection HTML is built
  populateSelect('fPSLevelOut', _safetyLevels, 'lPatientSafetyLevelKey', 'sPatientSafetyLevelDesc', false);
  // Pre-populate QC tech dropdowns (also populated on drawer open)
  populateDrawerTechDropdowns();

  // Populate P/F buttons for current scope type
  const tmpl = INSPECTION_TEMPLATES[scopeType] || INSPECTION_TEMPLATES.R;
  tmpl.categories.forEach(cat => {
    if (cat.showIf && d[cat.showIf] !== 'Y') return;
    cat.items.forEach(item => {
      setPFBtn(item.inField, d[item.inField] || '');
      setPFBtn(item.outField, d[item.outField] || '');
    });
  });

  // Populate shared fields that exist across types
  // Angulation (incoming — exists on Details tab, sync here too for flex)
  if (scopeType === 'F') {
    const angInUp = document.getElementById('fAngInUp_flex');
    if (angInUp) angInUp.value = d.sAngInUp || '';
    const angInDown = document.getElementById('fAngInDown_flex');
    if (angInDown) angInDown.value = d.sAngInDown || '';
    const angInRight = document.getElementById('fAngInRight_flex');
    if (angInRight) angInRight.value = d.sAngInRight || '';
    const angInLeft = document.getElementById('fAngInLeft_flex');
    if (angInLeft) angInLeft.value = d.sAngInLeft || '';
    const flexFibIn = document.getElementById('fFlexFibersIn');
    if (flexFibIn) flexFibIn.value = d.sBrokenFibersIn || '';
    const flexEpoxy = document.getElementById('fFlexEpoxyIn');
    if (flexEpoxy) flexEpoxy.value = d.nIncomingEpoxySize || '';
    const flexBRJig = document.getElementById('fFlexBRJig');
    if (flexBRJig) flexBRJig.value = d.sBRJigSize || '';
  }

  // Rigid-specific incoming measurements
  if (scopeType === 'R') {
    const lengthIn = document.getElementById('fLengthIn');
    if (lengthIn) lengthIn.value = d.nLengthIn || d.nInsertionTubeLengthIn || '';
    const diamIn = document.getElementById('fDiameterIn');
    if (diamIn) diamIn.value = d.nDiameterIn || d.nInsertionTubeDiameterIn || '';
    const fov = document.getElementById('fFieldOfView');
    if (fov) fov.value = d.lFieldOfView || '';
    const deg = document.getElementById('fDegreeKey');
    if (deg) deg.value = d.lDegreeKey || '';
  }

  // Metadata fields (shared across all types)
  const checkedInBy = document.getElementById('fCheckedInBy');
  if (checkedInBy) checkedInBy.value = d.sCheckedInBy || '';
  const inspName = document.getElementById('fInspectorName');
  if (inspName) inspName.value = d.sInspectorName || '';
  const timeRecv = document.getElementById('fTimeReceived');
  if (timeRecv) timeRecv.value = d.sTimeReceived || '';
  const timeClean = document.getElementById('fTimeCleaned');
  if (timeClean) timeClean.value = d.sTimeCleaned || '';
  const timeSoak = document.getElementById('fTimeSoaked');
  if (timeSoak) timeSoak.value = d.sTimeSoaked || '';

  // Condition checkboxes
  const repairable = document.getElementById('fRepairable');
  if (repairable) repairable.checked = !!d.bRepairable;
  const usable = document.getElementById('fUsable');
  if (usable) usable.checked = !!d.bUsable;
  const improperCare = document.getElementById('fImproperCare');
  if (improperCare) improperCare.checked = !!d.bImproperCare;
  const failDuringCase = document.getElementById('fFailureDuringCase');
  if (failDuringCase) failDuringCase.checked = !!d.bFailureDuringCase;

  // Rigid-only config fields
  if (scopeType === 'R') {
    const scopeDraw = document.getElementById('fScopeDrawing');
    if (scopeDraw) scopeDraw.checked = !!d.bScopeDrawing;
    setSelectVal('fTubeSystem', d.sTubeSystem);
    setSelectVal('fLensSystem', d.sLensSystem);
    const autoclave = document.getElementById('fAutoclave');
    if (autoclave) autoclave.checked = !!d.bAutoclave;
    const connCount = document.getElementById('fConnectorsCount');
    if (connCount) connCount.value = d.nConnectorsCount || '';
  }

  // Post-Repair outgoing angulation
  const angVerifUp = document.getElementById('fAngVerifUp');
  if (angVerifUp) angVerifUp.value = d.sAngOutUp || '';
  const angVerifDown = document.getElementById('fAngVerifDown');
  if (angVerifDown) angVerifDown.value = d.sAngOutDown || '';
  const angVerifRight = document.getElementById('fAngVerifRight');
  if (angVerifRight) angVerifRight.value = d.sAngOutRight || '';
  const angVerifLeft = document.getElementById('fAngVerifLeft');
  if (angVerifLeft) angVerifLeft.value = d.sAngOutLeft || '';

  // Post-Repair outgoing measurements (rigid only)
  if (scopeType === 'R') {
    const lenOut = document.getElementById('fLengthOut');
    if (lenOut) lenOut.value = d.nLengthOut || d.nInsertionTubeLengthOut || '';
    const diamOut = document.getElementById('fDiameterOut');
    if (diamOut) diamOut.value = d.nDiameterOut || d.nInsertionTubeDiameterOut || '';
    setSelectVal('fPSLevelOut', d.lPatientSafetyLevelOutKey || d.lPatientSafetyLevelKey);
  }

  // Broken fibers (Post-Repair section)
  const fibIn = document.getElementById('fBrokenFibersIn');
  if (fibIn) fibIn.value = d.sBrokenFibersIn || '';
  const fibOut = document.getElementById('fBrokenFibersOut');
  if (fibOut) fibOut.value = d.sBrokenFibersOut || '';

  // QC sign-off
  const qcDate = document.getElementById('fFinalQCDate');
  if (qcDate) qcDate.value = toDateInput(d.dtFinalQCDate);
  const finalInsp = document.getElementById('fFinalInspector');
  if (finalInsp) finalInsp.value = d.sFinalInspector || '';
  const rework = document.getElementById('fReworkRequired');
  if (rework) rework.checked = !!d.bReworkRequired;
  setSelectVal('fFinalPFStatus', d.sFinalPFStatus);

  // ── SCOPE-TYPE DETAILS (WP-R3) ──
  setRadioVal('fBendingRubberPF', d.sBendingRubberPF);
  document.getElementById('fFlexIncomingEpoxy').value = d.nIncomingEpoxySize || '';
  document.getElementById('fFlexMaxEpoxy').value = d.sMaxEpoxy || '';
  document.getElementById('fBRAgeing').checked = !!d.bBRAgeing;
  document.getElementById('fBRMold').checked = !!d.bBRMold;
  document.getElementById('fBRCut').checked = !!d.bBRCut;
  document.getElementById('fRgdEyeCup').value = d.sRgdInsEyeCup || '';
  document.getElementById('fRgdFiber').value = d.sRgdInsFiber || '';
  document.getElementById('fRgdTube').value = d.sRgdInsTube || '';
  document.getElementById('fRgdVision').value = d.sRgdInsVision || '';
  setRadioVal('fCamCable', d.sCamCablePF);
  setRadioVal('fCamCableConn', d.sCamCableConnPF);
  setRadioVal('fCamLensCleaned', d.sCamLensCleanedPF);
  setRadioVal('fCamControlBtns', d.sCamControlBtnsPF);
  setRadioVal('fCamFocus', d.sCamFocusPF);
  setRadioVal('fCamVideoAppear', d.sCamVideoAppearPF);
  setRadioVal('fCamWhiteBal', d.sCamWhiteBalPF);
  setRadioVal('fCamFocusMech', d.sCamFocusMechPF);
  setRadioVal('fCamSoakCap', d.sCamSoakCapPF);
  setRadioVal('fCplFocus', d.sCplFocusPF);
  setRadioVal('fCplFocusMech', d.sCplFocusMechPF);
  setRadioVal('fCplFog', d.sCplFogPF);
  setRadioVal('fCplLeak', d.sCplLeakPF);
  setRadioVal('fCplLensCleaned', d.sCplLensCleanedPF);

  // Outsource
  document.getElementById('fOutVendor').value = '';
  document.getElementById('fOutTracking').value = d.sShipTrackingNumberVendor || '';
  document.getElementById('fOutCost').value = d.dblOutSourceCost ? fmtMoney(d.dblOutSourceCost) : '';

  // ── DETAILS TAB ──
  setSelectVal('fPricingCat', d.lPricingCategoryKey);
  document.getElementById('fDiscount').value = '';
  document.getElementById('fReportGroup').value = '';
  setSelectVal('fPaymentTerms', d.lPaymentTermsKey);
  setSelectVal('fSalesRep', d.lSalesRepKey);
  setSelectVal('fBillTo', d.sBillTo || 'C');
  setSelectVal('fDistributor', d.lDistributorKey);
  document.getElementById('fShipCost').value = d.dblAmtShipping ? fmtMoney(d.dblAmtShipping) : '';
  document.getElementById('fDispAmounts').checked = d.sDisplayItemAmount === 'Y';
  document.getElementById('fDispDescrip').checked = d.sDisplayItemDescription === 'Y';
  document.getElementById('fDispComp').checked = d.sDisplayCustomerComplaint === 'Y';

  // Requisition
  document.getElementById('fRequisition').value = d.sReqAprTotalsOnly || '';
  document.getElementById('fSentDate').value = toDateInput(d.dtReqSent);
  document.getElementById('fRecvdApproval').value = toDateInput(d.dtAprRecvd);
  document.getElementById('fApprName').value = d.sApprName || '';

  // Addresses — editable fields, default from department
  // Bill To address fields
  document.getElementById('fBillName1').value = d.sBillName1 || '';
  document.getElementById('fBillAddr1').value = d.sBillAddr1 || '';
  document.getElementById('fBillCity').value = d.sBillCity || '';
  document.getElementById('fBillState').value = d.sBillState || '';
  document.getElementById('fBillZip').value = d.sBillZip || '';
  document.getElementById('fBillEmail').value = d.sBillEmail || '';
  setSelectVal('fBillingType', d.sBillingType || '');
  // Ship To address fields
  document.getElementById('fShipName1').value = d.sShipName1 || '';
  document.getElementById('fShipAddr1').value = d.sShipAddr1 || '';
  document.getElementById('fShipCity').value = d.sShipCity || '';
  document.getElementById('fShipState').value = d.sShipState || '';
  document.getElementById('fShipZip').value = d.sShipZip || '';
  var sameBill = (d.sShipAddr1 === d.sBillAddr1 && d.sShipName1 === d.sBillName1);
  document.getElementById('fShipSameBill').checked = sameBill;

  // Inbound
  document.getElementById('fTrackIn').value = d.sShipTrackingNumberIn || '';
  document.getElementById('fInboundSvcLevel').value = '';

  // -- DETAILS TAB -- Vendor / Outsourcing --
  // Vendor/Outsource fields consolidated to Scope In footer (fOutVendor, fOutCost, fOutTracking)
  document.getElementById('fOutsourced').checked = !!d.bOutsourced;
  document.getElementById('fVendorShipFlag').checked = !!d.bVendorShip;
  // Loaner
  document.getElementById('fLoanerRequested').checked = !!d.bLoanerRequested;
  document.getElementById('fLoanerProvidedChk').checked = d.sWasLoanerProduced === 'Y' || !!d.bLoanerProvided;
  document.getElementById('fLoanerScopeKey').textContent = d.lScopeKey_Loaner || '\u2014';
  // Scope Usage
  document.getElementById('fDaysSinceLastIn').textContent = d.nDaysSinceLastIn || '\u2014';
  document.getElementById('fAvgDailyUses').textContent = d.nAverageDailyUses || '\u2014';
  document.getElementById('fNumOfUses').textContent = d.sNumOfUses || '\u2014';
  document.getElementById('fAcuityRating').textContent = d.dblAcuityRating || '\u2014';
  // Delivery Dates
  document.getElementById('fExpDelFrom').value = toDateInput(d.dtExpDelDateFrom);
  document.getElementById('fExpDelTo').value = toDateInput(d.dtExpDelDateTo);
  document.getElementById('fExpDelTSI').value = toDateInput(d.dtExpDelDateTSI);
  document.getElementById('fGTDDelDate').value = toDateInput(d.dtDeliveryDateGuaranteed);
  document.getElementById('fDeliveryEmailSent').checked = !!d.bDeliveryEmailSent;
  // Shipping Costs
  document.getElementById('fShipAdj').value = d.dblShippingAdjustment ? fmtMoney(d.dblShippingAdjustment) : '';
  document.getElementById('fClientShipIn').value = d.dblClientShippingIn ? fmtMoney(d.dblClientShippingIn) : '';
  document.getElementById('fClientShipOut').value = d.dblClientShippingOut ? fmtMoney(d.dblClientShippingOut) : '';
  document.getElementById('fVendorShipIn').value = d.dblVendorShippingIn ? fmtMoney(d.dblVendorShippingIn) : '';
  document.getElementById('fVendorShipOut').value = d.dblVendorShippingOut ? fmtMoney(d.dblVendorShippingOut) : '';
  document.getElementById('fShipFromDistributor').checked = !!d.bShipFromDistributor;
  document.getElementById('fTrackingReq').checked = !!d.bTrackingNumberRequired;
  // Sales & Quality displays
  var repDisp2 = _salesReps.find(function(x){ return (x.lSalesRepNameKey || x.lSalesRepKey) == d.lSalesRepKey; });
  document.getElementById('fSalesRepDisp').textContent = repDisp2 ? repDisp2.sSalesRepName : '\u2014';
  var pcDisp = _pricingCategories.find(function(x){ return x.lPricingCategoryKey == d.lPricingCategoryKey; });
  document.getElementById('fPricingDisp').textContent = pcDisp ? (pcDisp.sPricingDescription || pcDisp.sPricingCategory) : '\u2014';
  document.getElementById('fHotList').checked = !!d.bHotList;
  document.getElementById('fFirstRepair').checked = !!d.bFirstRepair;
  document.getElementById('fNewCustomer').checked = !!d.bNewCustomer;

  // ── OUTGOING TAB ──
  document.getElementById('fAngOutUp').value = d.sAngOutUp || '';
  document.getElementById('fAngOutDown').value = d.sAngOutDown || '';
  document.getElementById('fAngOutRight').value = d.sAngOutRight || '';
  document.getElementById('fAngOutLeft').value = d.sAngOutLeft || '';
  document.getElementById('fShipWeight').value = d.sShipWeight || '';
  document.getElementById('fShipDate').value = toDateInput(d.dtShipDate);
  document.getElementById('fTrackOut').value = d.sShipTrackingNumber || '';
  document.getElementById('fGTDDelivery').value = d.dtCarrierDeliveryDateGuaranteed ? fmtDate(d.dtCarrierDeliveryDateGuaranteed) : '';
  document.getElementById('fActualDelivery').value = d.dtDeliveryDate ? fmtDate(d.dtDeliveryDate) : '';
  document.getElementById('fInvoiceNum').value = d.sInvoiceNumber || '';
  document.getElementById('fShipToName').value = d.sShipName1 || '';
  document.getElementById('fTrackRequired').checked = !!d.bTrackingNumberRequired;
  document.getElementById('fInclCase').checked = d.sIncludesCaseYN === 'Y';
  document.getElementById('fInclCap').checked = d.sIncludesCapYN === 'Y';
  document.getElementById('fInclWaterCap').checked = d.sIncludesWaterResCapYN === 'Y';
  document.getElementById('fInclVideoPlug').checked = d.sIncludesVideoPlugYN === 'Y';
  document.getElementById('fInclMouthpiece').checked = d.sIncludesMouthpieceYN === 'Y';
  document.getElementById('fInclAngleKnob').checked = d.sIncludesAngleKnobYN === 'Y';

  // ── SCOPE INCLUDES (WP-R10) ──
  document.getElementById('fInclETOCap').checked = d.fInclETOCap === 'Y' || !!d.fInclETOCap;
  document.getElementById('fInclAirWater').checked = d.fInclAirWater === 'Y' || !!d.fInclAirWater;
  document.getElementById('fInclWaterProof').checked = d.fInclWaterProof === 'Y' || !!d.fInclWaterProof;
  document.getElementById('fInclRimCap').checked = d.fInclRimCap === 'Y' || !!d.fInclRimCap;
  document.getElementById('fInclSuction').checked = d.fInclSuction === 'Y' || !!d.fInclSuction;
  document.getElementById('fInclLightPost').checked = d.fInclLightPost === 'Y' || !!d.fInclLightPost;
  document.getElementById('fInclBox').checked = d.fInclBox === 'Y' || !!d.fInclBox;

  // ── PICK LIST (WP-R8) ──
  populatePickList(d);

  // ── QC INSPECTION DRAWER ──
  setRadioVal('qcAngulation', d.sInsAngulationPF);
  setRadioVal('qcInsertionTube', d.sInsInsertionTubePF);
  setRadioVal('qcUniversalCord', d.sInsUniversalCordPF);
  setRadioVal('qcLightGuide', d.sInsLightGuidePF);
  setRadioVal('qcDistalTip', d.sInsDistalTipPF);
  setRadioVal('qcForcepChannel', d.sInsForcepChannelPF);
  setRadioVal('qcSuction', d.sInsSuctionPF);
  setRadioVal('qcAuxWater', d.sInsAuxWaterPF);
  setRadioVal('qcImage', d.sInsImagePF);
  setRadioVal('qcAirWater', d.sInsAirWaterPF);
  setRadioVal('qcLeakTest', d.sInsLeakTestPF);
  setRadioVal('qcFogTest', d.sInsFogTestPF);
  setRadioVal('qcAlcoholWipe', d.sInsAlcoholWipePF);
  setRadioVal('qcFinalInsp', d.sInsFinalInspPF);
  setRadioVal('qcImageCentration', d.sInsImageCentrationPF);
  document.getElementById('qcFibersIn').value = d.sBrokenFibersIn || '';
  document.getElementById('qcFibersOut').value = d.sBrokenFibersOut || '';
  document.getElementById('qcRepairable').checked = !!d.bRepairable;
  document.getElementById('qcUsable').checked = !!d.bUsable;

  // ── EXPENSE TAB ──
  const labor = parseFloat(d.dblAmtCostLabor) || 0;
  const material = parseFloat(d.dblAmtCostMaterial) || 0;
  const shipping = parseFloat(d.dblAmtShipping) || 0;
  const commission = parseFloat(d.dblAmtCommission) || 0;
  const outsource = parseFloat(d.dblOutSourceCost) || 0;
  const totalExpense = labor + material + shipping + commission + outsource;
  const revenue = parseFloat(d.dblAmtRepair) || 0;
  const margin = revenue - totalExpense;
  const marginPct = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : '0';

  // Financial totals on Scope In action bar
  document.getElementById('aTotalApproved').textContent = fmtMoney(revenue);
  document.getElementById('aTotalConsumption').textContent = fmtMoney(totalExpense);

  // ── FINANCIALS TAB ──
  const gpo = 0; // no API field yet
  const tax = parseFloat(d.dblAmtTax) || 0;
  const invoiceTotal = revenue + tax;
  const contractMargin = 0; // placeholder until contract data wired
  document.getElementById('finSaleAmt').textContent = fmtMoney(revenue);
  document.getElementById('finTax').textContent = fmtMoney(tax);
  document.getElementById('finInvoiceTotal').textContent = fmtMoney(invoiceTotal);
  document.getElementById('finOutsource').textContent = fmtMoney(outsource);
  document.getElementById('finShipping').textContent = fmtMoney(shipping);
  document.getElementById('finLabor').textContent = fmtMoney(labor);
  document.getElementById('finInventory').textContent = fmtMoney(material);
  document.getElementById('finGPO').textContent = fmtMoney(gpo);
  document.getElementById('finCommission').textContent = fmtMoney(commission);
  document.getElementById('finTotalExp').textContent = fmtMoney(totalExpense);
  const finMarginVal = revenue > 0 ? ((margin / revenue) * 100).toFixed(1) : '0.0';
  document.getElementById('finMarginPct').textContent = finMarginVal + '%';
  document.getElementById('finContractMargin').textContent = contractMargin.toFixed(1) + '%';
  // Margin color coding
  const marginNum = parseFloat(finMarginVal);
  const marginBadge = document.getElementById('finMarginBadge');
  const marginPctEl = document.getElementById('finMarginPct');
  marginBadge.textContent = finMarginVal + '%';
  marginBadge.className = 'fin-summary-val ' + (marginNum > 50 ? 'positive' : marginNum >= 30 ? 'amber' : 'negative');
  marginPctEl.className = 'fin-val ' + (marginNum > 50 ? 'positive' : marginNum >= 30 ? 'amber' : 'negative');

  // -- STATUS TAB -- Rework --
  document.getElementById('fReworkReqd').checked = d.sReworkReqd === 'Y' || !!d.bReworkRequired;
  var rwTech = _techs.find(function(x){ return x.lTechnicianKey == d.lReworkTech; });
  document.getElementById('fReworkTech').textContent = rwTech ? rwTech.sTechName : '\u2014';
  document.getElementById('fByPassOnHold').checked = !!d.bByPassOnHold;
  document.getElementById('fByPassUser').textContent = d.lByPassOnHoldUserKey || '\u2014';

  // -- FINANCIALS TAB -- Margin Analysis --
  document.getElementById('finMarginAdjReqd').textContent = d.dblMarginAdjustReqd ? fmtMoney(parseFloat(d.dblMarginAdjustReqd)) : '$0.00';
  document.getElementById('finMarginExpected').textContent = d.dblMarginAmtExpected ? fmtMoney(parseFloat(d.dblMarginAmtExpected)) : '$0.00';
  document.getElementById('finMarginPctActual').textContent = d.dblMarginPctActual ? parseFloat(d.dblMarginPctActual).toFixed(1) + '%' : '0.0%';
  document.getElementById('finMarginPctDefault').textContent = d.dblMarginPctDefault ? parseFloat(d.dblMarginPctDefault).toFixed(1) + '%' : '0.0%';
  document.getElementById('finMarginApprUser').textContent = d.lMarginApprUserKey || '\u2014';

  // ── COMMENTS TAB ──
  populateComments(d);
  loadNCPs();

  // ── SMART ALERTS ──
  if (typeof SmartAlerts !== 'undefined') {
    SmartAlerts.render('#alertsBar', SmartAlerts.evaluate('repair', d));
  }

  // ── CONTEXT-AWARE TABS ──
  // Primary tabs (lineitems, notes, scopehistory, images, shipping) are always prominent
  // ctx-dimmed applies only to secondary tabs (scopein/Workflow, details, inspections, financials)
  var _tabMap = {
    1:['scopein','inspections'], 2:['scopein','inspections'],
    3:['details'], 5:['details'],
    6:['inspections'], 7:['inspections'],
    8:['financials'], 9:['financials'], 18:['financials'], 19:['financials']
  };
  var recommended = _tabMap[d.lRepairStatusID] || ['lineitems'];
  const primaryTabs = ['lineitems','notes','scopehistory','images','shipping'];
  document.querySelectorAll('#tabBar .tab').forEach(function(t) {
    t.classList.remove('ctx-suggested','ctx-dimmed');
    // Primary tabs are never dimmed; secondary tabs get ctx-dimmed unless recommended
    if (primaryTabs.indexOf(t.dataset.tab) >= 0) {
      // primary tabs — never dimmed, no ctx-suggested dot needed
    } else if (recommended.indexOf(t.dataset.tab) >= 0) {
      t.classList.add('ctx-suggested');
    } else {
      t.classList.add('ctx-dimmed');
    }
  });
  // Always reset to Line Items tab on repair load
  document.querySelectorAll('#tabBar .tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.tab-pane').forEach(function(p){ p.classList.remove('active'); });
  document.querySelector('#tabBar .tab[data-tab="lineitems"]').classList.add('active');
  document.getElementById('pane-lineitems').classList.add('active');

  // ── SCOPE TIMELINE ──
  renderScopeTimeline(d.lScopeKey, d.lRepairKey);

  // ── COLLABORATION INDICATOR ──
  if (d.Updated_datetime || d.dtLastUpdate) {
    var editedAt = d.Updated_datetime || d.dtLastUpdate || '';
    var editDate = editedAt ? new Date(editedAt) : null;
    var agoText = '';
    if (editDate && !isNaN(editDate.getTime())) {
      var diffMin = Math.round((new Date() - editDate) / 60000);
      if (diffMin < 60) agoText = diffMin + 'm ago';
      else if (diffMin < 1440) agoText = Math.round(diffMin / 60) + 'h ago';
      else agoText = Math.round(diffMin / 1440) + 'd ago';
    }
    var modEl = document.getElementById('ssModified');
    if (modEl) modEl.textContent = agoText ? 'Edited ' + agoText : '';
  }

  // ── STAGE PIPELINE + QUEUE HIGHLIGHT ──
  const _statusNameForPipeline = getStatusName(d.lRepairStatusID) || d.sRepairStatus || '';
  if (typeof updateStagePipeline === 'function') updateStagePipeline(_statusNameForPipeline);
  // Refresh queue row active highlight
  const _activeWO = d.sWorkOrderNumber || '';
  document.querySelectorAll('.q-row').forEach(function(row) {
    row.classList.toggle('active', row.dataset.wo === _activeWO);
  });
}

// ── Repair Items ──
async function loadRepairItems(repairKey) {
  // Check localStorage for persisted items first
  const persisted = loadPersistedRepair(repairKey);
  if (persisted && persisted.items && persisted.items.length) {
    if (DEBUG) console.log('[TSI Repairs] Restored', persisted.items.length, 'persisted repair items for key:', repairKey);
    renderRepairItems(persisted.items);
    autoPopulateRepairLevel(persisted.items);
    return;
  }
  // Try Detail endpoint first (gives editable fields), fall back to RepairItems
  try {
    let ds = [];
    try {
      const detail = await API.getRepairDetailItems(repairKey);
      ds = Array.isArray(detail) ? detail : (detail?.dataSource || []);
    } catch (e1) {
      // Fallback to RepairItems endpoint
      const items = await API.getRepairItems(repairKey);
      ds = items?.dataSource || (Array.isArray(items) ? items : []);
    }
    renderRepairItems(ds);
    // Auto-populate repair level from highest level on repair items
    autoPopulateRepairLevel(ds);
  } catch (e) { console.warn('[TSI Repairs] Items load:', e.message); }
}


function markDirty() { _dirty = true; updateSaveStatus('unsaved'); clearTimeout(_saveTimer); _saveTimer = setTimeout(autoSave, 1500); if (_currentRepair) persistRepairState(); }
async function autoSave() {
  if (!_dirty || !_currentRepair) return;
  updateSaveStatus('saving');
  try {
    if (_liveMode && _currentRepair.lRepairKey > 0) {
      await API.updateRepair(buildRepairPayload());
    }
    // Always sync local state from form fields
    syncFormToRepair();
    _dirty = false;
    updateSaveStatus('saved');
    // Clear localStorage on successful live API save
    if (_liveMode && _currentRepair.lRepairKey > 0) {
      localStorage.removeItem(_lsKey(_currentRepair.lRepairKey));
      updateLocalTag(false);
    }
    if (DEBUG) console.log('[TSI Repairs] Autosave — key:', _currentRepair.lRepairKey);
  } catch (e) {
    console.warn('[TSI Repairs] Autosave failed:', e.message);
    updateSaveStatus('error');
    _dirty = true;
    showToast('Autosave failed — changes not saved', 'error');
  }
}

// ── localStorage persistence for demo survival ──
const _LS_PREFIX = 'tsi_repair_';
function _lsKey(repairKey) { return _LS_PREFIX + repairKey; }

function persistRepairState() {
  if (!_currentRepair || !_currentRepair.lRepairKey) return;
  syncFormToRepair();
  const bundle = { repair: _currentRepair, items: _repairItems, ts: Date.now() };
  try { localStorage.setItem(_lsKey(_currentRepair.lRepairKey), JSON.stringify(bundle)); } catch (e) { console.warn('[TSI Repairs] Persist failed:', e.message); }
  updateLocalTag(true);
}

function loadPersistedRepair(repairKey) {
  try {
    const raw = localStorage.getItem(_lsKey(repairKey));
    if (!raw) return null;
    const bundle = JSON.parse(raw);
    if (!bundle || !bundle.repair) return null;
    // Expire after 24 hours
    if (Date.now() - (bundle.ts || 0) > 86400000) { localStorage.removeItem(_lsKey(repairKey)); return null; }
    return bundle;
  } catch (e) { return null; }
}

function clearPersistedRepair() {
  if (!_currentRepair || !_currentRepair.lRepairKey) return;
  localStorage.removeItem(_lsKey(_currentRepair.lRepairKey));
  updateLocalTag(false);
  showToast('Local changes cleared — reloading original');
  loadRepair(_currentRepair.lRepairKey);
}

function clearAllPersistedRepairs() {
  Object.keys(localStorage).filter(k => k.startsWith(_LS_PREFIX)).forEach(k => localStorage.removeItem(k));
  updateLocalTag(false);
}

function updateLocalTag(show) {
  const el = document.getElementById('localChangesTag');
  if (el) el.style.display = show ? 'inline-block' : 'none';
}

// ── Build API payload from form fields (Hungarian notation, p-prefixed) ──
function buildRepairPayload() {
  const d = _currentRepair;
  return {
    plRepairKey: d.lRepairKey,
    plScopeKey: d.lScopeKey,
    plDepartmentKey: d.lDepartmentKey,
    plRepairStatusID: getSelectVal('hRepairStatus') || d.lRepairStatusID,
    plRepairLevelKey: getSelectVal('hRepairLevel') || d.lRepairLevelKey,
    plRepairReasonKey: getSelectVal('fRepairReason') || d.lRepairReasonKey,
    plPatientSafetyLevelKey: getSelectVal('fPSLevelIn') || d.lPatientSafetyLevelKey,
    plTechnicianKey: d.lTechnicianKey,
    plSalesRepKey: getSelectVal('fSalesRep') || d.lSalesRepKey,
    plDeliveryMethodKey: d.lDeliveryMethodKey,
    plDistributorKey: getSelectVal('fDistributor') || d.lDistributorKey,
    plPricingCategoryKey: getSelectVal('fPricingCat') || d.lPricingCategoryKey,
    plPaymentTermsKey: getSelectVal('fPaymentTerms') || d.lPaymentTermsKey,
    // Complaint & notes
    psComplaintDesc: document.getElementById('fComplaint').textContent || '',
    psNotes: document.getElementById('fScopeNotes').value || '',
    // Angulation in
    psAngInUp: document.getElementById('fAngInUp').value || '',
    psAngInDown: document.getElementById('fAngInDown').value || '',
    psAngInRight: document.getElementById('fAngInRight').value || '',
    psAngInLeft: document.getElementById('fAngInLeft').value || '',
    // Angulation out
    psAngOutUp: document.getElementById('fAngOutUp').value || '',
    psAngOutDown: document.getElementById('fAngOutDown').value || '',
    psAngOutRight: document.getElementById('fAngOutRight').value || '',
    psAngOutLeft: document.getElementById('fAngOutLeft').value || '',
    // Epoxy & jig
    pnIncomingEpoxySize: document.getElementById('fEpoxyIn').value || '',
    psBRJigSize: document.getElementById('fBRJig').value || '',
    // Logistics
    psRackPosition: document.getElementById('hRack').value || '',
    psPurchaseOrder: document.getElementById('hPO').value || '',
    pbPORequired: document.getElementById('fPORequired').checked,
    psCustomerRefNumber: document.getElementById('fCustomerRef').value || '',
    psRepairSource: getSelectVal('fRepairSource') || '',
    psBillingType: getSelectVal('fBillingType') || '',
    psShipTrackingNumberIn: document.getElementById('fTrackIn').value || '',
    psShipTrackingNumber: document.getElementById('fTrackOut').value || '',
    psShipTrackingNumberVendor: document.getElementById('fOutTracking').value || '',
    psShipWeight: document.getElementById('fShipWeight').value || '',
    pbTrackingNumberRequired: document.getElementById('fTrackRequired').checked,
    // Shipping
    pdblAmtShipping: parseFloat(document.getElementById('fShipCost').value) || 0,
    pdblOutSourceCost: parseFloat(document.getElementById('fOutCost').value) || 0,
    // Display toggles
    psDisplayItemAmount: document.getElementById('fDispAmounts').checked ? 'Y' : 'N',
    psDisplayItemDescription: document.getElementById('fDispDescrip').checked ? 'Y' : 'N',
    psDisplayCustomerComplaint: document.getElementById('fDispComp').checked ? 'Y' : 'N',
    // Requisition
    psReqAprTotalsOnly: document.getElementById('fRequisition').value || '',
    psApprName: document.getElementById('fApprName').value || '',
    // Bill To
    psBillTo: getSelectVal('fBillTo') || d.sBillTo || 'C',
    // Addresses
    psBillName1: document.getElementById('fBillName1').value || '',
    psBillAddr1: document.getElementById('fBillAddr1').value || '',
    psBillCity: document.getElementById('fBillCity').value || '',
    psBillState: document.getElementById('fBillState').value || '',
    psBillZip: document.getElementById('fBillZip').value || '',
    psBillEmail: document.getElementById('fBillEmail').value || '',
    psShipName1: document.getElementById('fShipName1').value || '',
    psShipAddr1: document.getElementById('fShipAddr1').value || '',
    psShipCity: document.getElementById('fShipCity').value || '',
    psShipState: document.getElementById('fShipState').value || '',
    psShipZip: document.getElementById('fShipZip').value || '',
    // Accessories
    psIncludesCaseYN: document.getElementById('fInclCase').checked ? 'Y' : 'N',
    psIncludesCapYN: document.getElementById('fInclCap').checked ? 'Y' : 'N',
    psIncludesWaterResCapYN: document.getElementById('fInclWaterCap').checked ? 'Y' : 'N',
    psIncludesVideoPlugYN: document.getElementById('fInclVideoPlug').checked ? 'Y' : 'N',
    psIncludesMouthpieceYN: document.getElementById('fInclMouthpiece').checked ? 'Y' : 'N',
    psIncludesAngleKnobYN: document.getElementById('fInclAngleKnob').checked ? 'Y' : 'N',
    // Comments
    pmComments: d.mComments || '',
    pmCommentsHidden: d.mCommentsHidden || '',
    pmCommentsRework: d.mCommentsRework || '',
    pmCommentsDisIns: d.mCommentsDisIns || '',
    pmCommentsISO: d.mCommentsISO || '',
    // Vendor / Outsourcing (Details tab expansion)
    pbOutsourced: document.getElementById('fOutsourced').checked,
    pbVendorShip: document.getElementById('fVendorShipFlag').checked,
    // Loaner
    pbLoanerRequested: document.getElementById('fLoanerRequested').checked,
    psWasLoanerProduced: document.getElementById('fLoanerProvidedChk').checked ? 'Y' : 'N',
    // Delivery dates
    pdtExpDelDateFrom: document.getElementById('fExpDelFrom').value || '',
    pdtExpDelDateTo: document.getElementById('fExpDelTo').value || '',
    pdtExpDelDateTSI: document.getElementById('fExpDelTSI').value || '',
    pdtDeliveryDateGuaranteed: document.getElementById('fGTDDelDate').value || '',
    pbDeliveryEmailSent: document.getElementById('fDeliveryEmailSent').checked,
    // Shipping
    pbShipFromDistributor: document.getElementById('fShipFromDistributor').checked,
    pdblShippingAdjustment: parseFloat(document.getElementById('fShipAdj').value) || 0,
    pdblClientShippingIn: parseFloat(document.getElementById('fClientShipIn').value) || 0,
    pdblClientShippingOut: parseFloat(document.getElementById('fClientShipOut').value) || 0,
    pdblVendorShippingIn: parseFloat(document.getElementById('fVendorShipIn').value) || 0,
    pdblVendorShippingOut: parseFloat(document.getElementById('fVendorShipOut').value) || 0,
    // Quality flags
    pbHotList: document.getElementById('fHotList').checked,
    pbFirstRepair: document.getElementById('fFirstRepair').checked,
    pbNewCustomer: document.getElementById('fNewCustomer').checked,
    // Status - Rework
    psReworkReqd: document.getElementById('fReworkReqd').checked ? 'Y' : 'N',
    pbByPassOnHold: document.getElementById('fByPassOnHold').checked,
    // QC Inspection — pass/fail checks (sIns*PF columns)
    psInsAngulationPF: getRadioVal('qcAngulation'),
    psInsInsertionTubePF: getRadioVal('qcInsertionTube'),
    psInsUniversalCordPF: getRadioVal('qcUniversalCord'),
    psInsLightGuidePF: getRadioVal('qcLightGuide'),
    psInsDistalTipPF: getRadioVal('qcDistalTip'),
    psInsForcepChannelPF: getRadioVal('qcForcepChannel'),
    psInsSuctionPF: getRadioVal('qcSuction'),
    psInsAuxWaterPF: getRadioVal('qcAuxWater'),
    psInsImagePF: getRadioVal('qcImage'),
    psInsAirWaterPF: getRadioVal('qcAirWater'),
    psInsLeakTestPF: getRadioVal('qcLeakTest'),
    psInsFogTestPF: getRadioVal('qcFogTest'),
    psInsAlcoholWipePF: getRadioVal('qcAlcoholWipe'),
    psInsFinalInspPF: getRadioVal('qcFinalInsp'),
    psInsImageCentrationPF: getRadioVal('qcImageCentration'),
    // QC — broken fibers, repairable, usable
    psBrokenFibersIn: document.getElementById('qcFibersIn').value || '',
    psBrokenFibersOut: document.getElementById('qcFibersOut').value || '',
    pbRepairable: document.getElementById('qcRepairable').checked,
    pbUsable: document.getElementById('qcUsable').checked,
    // Incoming Inspection + Post-Repair — type-aware P/F snapshot (dynamic elements)
    ...(() => { const o = {}; const st = (_currentRepair && _currentRepair.sRigidOrFlexible) || 'R'; const t = INSPECTION_TEMPLATES[st] || INSPECTION_TEMPLATES.R; t.categories.forEach(cat => { cat.items.forEach(item => { o['p'+item.inField] = getPFBtn(item.inField); o['p'+item.outField] = getPFBtn(item.outField); }); }); return o; })(),
    pnLengthIn: (document.getElementById('fLengthIn') || {}).value || '',
    pnDiameterIn: (document.getElementById('fDiameterIn') || {}).value || '',
    plFieldOfView: (document.getElementById('fFieldOfView') || {}).value || '',
    plDegreeKey: (document.getElementById('fDegreeKey') || {}).value || '',
    psCheckedInBy: (document.getElementById('fCheckedInBy') || {}).value || '',
    psInspectorName: (document.getElementById('fInspectorName') || {}).value || '',
    psTimeReceived: (document.getElementById('fTimeReceived') || {}).value || '',
    psTimeCleaned: (document.getElementById('fTimeCleaned') || {}).value || '',
    psTimeSoaked: (document.getElementById('fTimeSoaked') || {}).value || '',
    pbRepairable2: (document.getElementById('fRepairable') || {}).checked || false,
    pbUsable2: (document.getElementById('fUsable') || {}).checked || false,
    pbImproperCare: (document.getElementById('fImproperCare') || {}).checked || false,
    pbFailureDuringCase: (document.getElementById('fFailureDuringCase') || {}).checked || false,
    pbScopeDrawing: (document.getElementById('fScopeDrawing') || {}).checked || false,
    psTubeSystem: getSelectVal('fTubeSystem'),
    psLensSystem: getSelectVal('fLensSystem'),
    pbAutoclave: (document.getElementById('fAutoclave') || {}).checked || false,
    pnConnectorsCount: (document.getElementById('fConnectorsCount') || {}).value || '',
    // Post-Repair Verification — angulation, measurements, broken fibers, QC sign-off
    psAngVerifUp: (document.getElementById('fAngVerifUp') || {}).value || '',
    psAngVerifDown: (document.getElementById('fAngVerifDown') || {}).value || '',
    psAngVerifRight: (document.getElementById('fAngVerifRight') || {}).value || '',
    psAngVerifLeft: (document.getElementById('fAngVerifLeft') || {}).value || '',
    pnLengthOut: (document.getElementById('fLengthOut') || {}).value || '',
    pnDiameterOut: (document.getElementById('fDiameterOut') || {}).value || '',
    plPatientSafetyLevelOutKey: getSelectVal('fPSLevelOut'),
    psBrokenFibersIn2: (document.getElementById('fBrokenFibersIn') || {}).value || '',
    psBrokenFibersOut2: (document.getElementById('fBrokenFibersOut') || {}).value || '',
    psFinalQCDate: (document.getElementById('fFinalQCDate') || {}).value || '',
    psFinalInspector: (document.getElementById('fFinalInspector') || {}).value || '',
    pbReworkRequired: (document.getElementById('fReworkRequired') || {}).checked || false,
    psFinalPFStatus: getSelectVal('fFinalPFStatus')
  };
}

function getRadioVal(name) {
  const checked = document.querySelector('input[name="' + name + '"]:checked');
  return checked ? checked.value : '';
}
function setRadioVal(name, val) {
  if (!val) return;
  const radio = document.querySelector('input[name="' + name + '"][value="' + val + '"]');
  if (radio) radio.checked = true;
}

// ═══════════════════════════════════════════════════════
//  SCOPE-TYPE INSPECTION TEMPLATES
// ═══════════════════════════════════════════════════════
function syncFormToRepair() {
  const d = _currentRepair;
  if (!d) return;
  d.lRepairStatusID = getSelectVal('hRepairStatus') || d.lRepairStatusID;
  d.lRepairLevelKey = getSelectVal('hRepairLevel') || d.lRepairLevelKey;
  d.lRepairReasonKey = getSelectVal('fRepairReason') || d.lRepairReasonKey;
  d.lPatientSafetyLevelKey = getSelectVal('fPSLevelIn') || d.lPatientSafetyLevelKey;
  d.lSalesRepKey = getSelectVal('fSalesRep') || d.lSalesRepKey;
  d.lDistributorKey = getSelectVal('fDistributor') || d.lDistributorKey;
  d.lPricingCategoryKey = getSelectVal('fPricingCat') || d.lPricingCategoryKey;
  d.lPaymentTermsKey = getSelectVal('fPaymentTerms') || d.lPaymentTermsKey;
  d.sComplaintDesc = document.getElementById('fComplaint').textContent || '';
  d.sNotes = document.getElementById('fScopeNotes').value || '';
  d.sAngInUp = document.getElementById('fAngInUp').value || '';
  d.sAngInDown = document.getElementById('fAngInDown').value || '';
  d.sAngInRight = document.getElementById('fAngInRight').value || '';
  d.sAngInLeft = document.getElementById('fAngInLeft').value || '';
  d.sAngOutUp = document.getElementById('fAngOutUp').value || '';
  d.sAngOutDown = document.getElementById('fAngOutDown').value || '';
  d.sAngOutRight = document.getElementById('fAngOutRight').value || '';
  d.sAngOutLeft = document.getElementById('fAngOutLeft').value || '';
  d.nIncomingEpoxySize = document.getElementById('fEpoxyIn').value || '';
  d.sBRJigSize = document.getElementById('fBRJig').value || '';
  d.sRackPosition = document.getElementById('hRack').value || '';
  d.sPurchaseOrder = document.getElementById('hPO').value || '';
  d.bPORequired = document.getElementById('fPORequired').checked;
  d.sCustomerRefNumber = document.getElementById('fCustomerRef').value || '';
  d.sRepairSource = getSelectVal('fRepairSource') || '';
  d.sBillingType = getSelectVal('fBillingType') || '';
  d.sShipTrackingNumberIn = document.getElementById('fTrackIn').value || '';
  d.sShipTrackingNumber = document.getElementById('fTrackOut').value || '';
  d.sShipTrackingNumberVendor = document.getElementById('fOutTracking').value || '';
  d.sShipWeight = document.getElementById('fShipWeight').value || '';
  d.bTrackingNumberRequired = document.getElementById('fTrackRequired').checked;
  d.dblAmtShipping = parseFloat(document.getElementById('fShipCost').value) || 0;
  d.dblOutSourceCost = parseFloat(document.getElementById('fOutCost').value) || 0;
  d.sDisplayItemAmount = document.getElementById('fDispAmounts').checked ? 'Y' : 'N';
  d.sDisplayItemDescription = document.getElementById('fDispDescrip').checked ? 'Y' : 'N';
  d.sDisplayCustomerComplaint = document.getElementById('fDispComp').checked ? 'Y' : 'N';
  d.sReqAprTotalsOnly = document.getElementById('fRequisition').value || '';
  d.sApprName = document.getElementById('fApprName').value || '';
  d.sBillTo = getSelectVal('fBillTo') || d.sBillTo || 'C';
  d.sBillName1 = document.getElementById('fBillName1').value || '';
  d.sBillAddr1 = document.getElementById('fBillAddr1').value || '';
  d.sBillCity = document.getElementById('fBillCity').value || '';
  d.sBillState = document.getElementById('fBillState').value || '';
  d.sBillZip = document.getElementById('fBillZip').value || '';
  d.sBillEmail = document.getElementById('fBillEmail').value || '';
  d.sShipName1 = document.getElementById('fShipName1').value || '';
  d.sShipAddr1 = document.getElementById('fShipAddr1').value || '';
  d.sShipCity = document.getElementById('fShipCity').value || '';
  d.sShipState = document.getElementById('fShipState').value || '';
  d.sShipZip = document.getElementById('fShipZip').value || '';
  d.sIncludesCaseYN = document.getElementById('fInclCase').checked ? 'Y' : 'N';
  d.sIncludesCapYN = document.getElementById('fInclCap').checked ? 'Y' : 'N';
  d.sIncludesWaterResCapYN = document.getElementById('fInclWaterCap').checked ? 'Y' : 'N';
  d.sIncludesVideoPlugYN = document.getElementById('fInclVideoPlug').checked ? 'Y' : 'N';
  d.sIncludesMouthpieceYN = document.getElementById('fInclMouthpiece').checked ? 'Y' : 'N';
  d.sIncludesAngleKnobYN = document.getElementById('fInclAngleKnob').checked ? 'Y' : 'N';
  // Vendor / Outsourcing (Details tab expansion)
  d.bOutsourced = document.getElementById('fOutsourced').checked;
  d.bVendorShip = document.getElementById('fVendorShipFlag').checked;
  // Loaner
  d.bLoanerRequested = document.getElementById('fLoanerRequested').checked;
  d.sWasLoanerProduced = document.getElementById('fLoanerProvidedChk').checked ? 'Y' : 'N';
  // Delivery dates
  d.dtExpDelDateFrom = document.getElementById('fExpDelFrom').value || '';
  d.dtExpDelDateTo = document.getElementById('fExpDelTo').value || '';
  d.dtExpDelDateTSI = document.getElementById('fExpDelTSI').value || '';
  d.dtDeliveryDateGuaranteed = document.getElementById('fGTDDelDate').value || '';
  d.bDeliveryEmailSent = document.getElementById('fDeliveryEmailSent').checked;
  // Shipping
  d.bShipFromDistributor = document.getElementById('fShipFromDistributor').checked;
  d.dblShippingAdjustment = parseFloat(document.getElementById('fShipAdj').value) || 0;
  d.dblClientShippingIn = parseFloat(document.getElementById('fClientShipIn').value) || 0;
  d.dblClientShippingOut = parseFloat(document.getElementById('fClientShipOut').value) || 0;
  d.dblVendorShippingIn = parseFloat(document.getElementById('fVendorShipIn').value) || 0;
  d.dblVendorShippingOut = parseFloat(document.getElementById('fVendorShipOut').value) || 0;
  // Quality flags
  d.bHotList = document.getElementById('fHotList').checked;
  d.bFirstRepair = document.getElementById('fFirstRepair').checked;
  d.bNewCustomer = document.getElementById('fNewCustomer').checked;
  // Status - Rework
  d.sReworkReqd = document.getElementById('fReworkReqd').checked ? 'Y' : 'N';
  d.bByPassOnHold = document.getElementById('fByPassOnHold').checked;
  // QC Inspection
  d.sInsAngulationPF = getRadioVal('qcAngulation');
  d.sInsInsertionTubePF = getRadioVal('qcInsertionTube');
  d.sInsUniversalCordPF = getRadioVal('qcUniversalCord');
  d.sInsLightGuidePF = getRadioVal('qcLightGuide');
  d.sInsDistalTipPF = getRadioVal('qcDistalTip');
  d.sInsForcepChannelPF = getRadioVal('qcForcepChannel');
  d.sInsSuctionPF = getRadioVal('qcSuction');
  d.sInsAuxWaterPF = getRadioVal('qcAuxWater');
  d.sInsImagePF = getRadioVal('qcImage');
  d.sInsAirWaterPF = getRadioVal('qcAirWater');
  d.sInsLeakTestPF = getRadioVal('qcLeakTest');
  d.sInsFogTestPF = getRadioVal('qcFogTest');
  d.sInsAlcoholWipePF = getRadioVal('qcAlcoholWipe');
  d.sInsFinalInspPF = getRadioVal('qcFinalInsp');
  d.sInsImageCentrationPF = getRadioVal('qcImageCentration');
  d.sBrokenFibersIn = document.getElementById('qcFibersIn').value || '';
  d.sBrokenFibersOut = document.getElementById('qcFibersOut').value || '';
  d.bRepairable = document.getElementById('qcRepairable').checked;
  d.bUsable = document.getElementById('qcUsable').checked;
  // Incoming Inspection + Post-Repair — type-aware P/F sync
  const scopeType = d.sRigidOrFlexible || 'R';
  const tmpl = INSPECTION_TEMPLATES[scopeType] || INSPECTION_TEMPLATES.R;
  tmpl.categories.forEach(cat => {
    if (cat.showIf && d[cat.showIf] !== 'Y') return;
    cat.items.forEach(item => {
      d[item.inField] = getPFBtn(item.inField);
      d[item.outField] = getPFBtn(item.outField);
    });
  });

  // Flex-specific fields
  if (scopeType === 'F') {
    const angUpFlex = document.getElementById('fAngInUp_flex');
    if (angUpFlex) d.sAngInUp = angUpFlex.value || '';
    const angDownFlex = document.getElementById('fAngInDown_flex');
    if (angDownFlex) d.sAngInDown = angDownFlex.value || '';
    const angRightFlex = document.getElementById('fAngInRight_flex');
    if (angRightFlex) d.sAngInRight = angRightFlex.value || '';
    const angLeftFlex = document.getElementById('fAngInLeft_flex');
    if (angLeftFlex) d.sAngInLeft = angLeftFlex.value || '';
    const flexFibIn = document.getElementById('fFlexFibersIn');
    if (flexFibIn) d.sBrokenFibersIn = flexFibIn.value || '';
    const flexEpoxy = document.getElementById('fFlexEpoxyIn');
    if (flexEpoxy) d.nIncomingEpoxySize = flexEpoxy.value || '';
    const flexBRJig = document.getElementById('fFlexBRJig');
    if (flexBRJig) d.sBRJigSize = flexBRJig.value || '';
  }

  // Rigid incoming measurements (only if elements exist — they're scope-type-specific now)
  const lengthIn = document.getElementById('fLengthIn');
  if (lengthIn) d.nLengthIn = lengthIn.value || '';
  const diamIn = document.getElementById('fDiameterIn');
  if (diamIn) d.nDiameterIn = diamIn.value || '';
  const fov = document.getElementById('fFieldOfView');
  if (fov) d.lFieldOfView = fov.value || '';
  const degKey = document.getElementById('fDegreeKey');
  if (degKey) d.lDegreeKey = degKey.value || '';

  // Shared metadata
  const checkedInBy = document.getElementById('fCheckedInBy');
  if (checkedInBy) d.sCheckedInBy = checkedInBy.value || '';
  const inspName = document.getElementById('fInspectorName');
  if (inspName) d.sInspectorName = inspName.value || '';
  const timeRecv = document.getElementById('fTimeReceived');
  if (timeRecv) d.sTimeReceived = timeRecv.value || '';
  const timeClean = document.getElementById('fTimeCleaned');
  if (timeClean) d.sTimeCleaned = timeClean.value || '';
  const timeSoak = document.getElementById('fTimeSoaked');
  if (timeSoak) d.sTimeSoaked = timeSoak.value || '';
  const improperCare = document.getElementById('fImproperCare');
  if (improperCare) d.bImproperCare = improperCare.checked;
  const failCase = document.getElementById('fFailureDuringCase');
  if (failCase) d.bFailureDuringCase = failCase.checked;
  const scopeDraw = document.getElementById('fScopeDrawing');
  if (scopeDraw) d.bScopeDrawing = scopeDraw.checked;
  d.sTubeSystem = getSelectVal('fTubeSystem');
  d.sLensSystem = getSelectVal('fLensSystem');
  const autoclave = document.getElementById('fAutoclave');
  if (autoclave) d.bAutoclave = autoclave.checked;
  const connCount = document.getElementById('fConnectorsCount');
  if (connCount) d.nConnectorsCount = connCount.value || '';

  // Post-Repair outgoing angulation
  const angVerifUp = document.getElementById('fAngVerifUp');
  if (angVerifUp) d.sAngOutUp = angVerifUp.value || d.sAngOutUp;
  const angVerifDown = document.getElementById('fAngVerifDown');
  if (angVerifDown) d.sAngOutDown = angVerifDown.value || d.sAngOutDown;
  const angVerifRight = document.getElementById('fAngVerifRight');
  if (angVerifRight) d.sAngOutRight = angVerifRight.value || d.sAngOutRight;
  const angVerifLeft = document.getElementById('fAngVerifLeft');
  if (angVerifLeft) d.sAngOutLeft = angVerifLeft.value || d.sAngOutLeft;
  // Outgoing measurements (rigid only)
  const lenOut = document.getElementById('fLengthOut');
  if (lenOut) d.nLengthOut = lenOut.value || '';
  const diamOut = document.getElementById('fDiameterOut');
  if (diamOut) d.nDiameterOut = diamOut.value || '';
  d.lPatientSafetyLevelOutKey = getSelectVal('fPSLevelOut');
  const fibIn = document.getElementById('fBrokenFibersIn');
  if (fibIn) d.sBrokenFibersIn = fibIn.value || '';
  const fibOut = document.getElementById('fBrokenFibersOut');
  if (fibOut) d.sBrokenFibersOut = fibOut.value || '';
  const qcDate = document.getElementById('fFinalQCDate');
  if (qcDate) d.dtFinalQCDate = qcDate.value || '';
  const finalInsp = document.getElementById('fFinalInspector');
  if (finalInsp) d.sFinalInspector = finalInsp.value || '';
  const rework = document.getElementById('fReworkRequired');
  if (rework) d.bReworkRequired = rework.checked;
  d.sFinalPFStatus = getSelectVal('fFinalPFStatus');
}

// ── Helper: get select value safely ──
function getSelectVal(id) { const el = document.getElementById(id); return el ? el.value : ''; }

// ── Delete Repair ──
async function confirmDeleteRepair(btn) {
  if (!_currentRepair || !_currentRepair.lRepairKey) { showToast('No repair loaded'); return; }
  const wo = _currentRepair.sWorkOrderNumber || _currentRepair.lRepairKey;
  if (btn && !btn._confirming) {
    btn._confirming = true; btn._origText = btn.innerHTML; btn._origBg = btn.style.background;
    btn.innerHTML = 'Sure?'; btn.style.background = 'var(--danger)'; btn.style.color = '#fff';
    setTimeout(() => { if (btn._confirming) { btn._confirming = false; btn.innerHTML = btn._origText; btn.style.background = btn._origBg; btn.style.color = ''; } }, 3000);
    return;
  }
  if (btn) { btn._confirming = false; }
  try {
    if (_liveMode && _currentRepair.lRepairKey > 0) {
      await API.deleteRepair(_currentRepair.lRepairKey);
    }
    _currentRepair = null;
    _dirty = false;
    updateSaveStatus('ready');
    showToast('Work order ' + wo + ' deleted');
    // Clear form — redirect to dashboard after brief delay
    document.getElementById('repairBadge').textContent = '#—';
    document.getElementById('hWO').textContent = '—';
    document.getElementById('fComplaint').textContent = '';
    setTimeout(() => { window.location.href = 'dashboard.html'; }, 1500);
  } catch (e) {
    console.warn('[TSI Repairs] Delete failed:', e.message);
    showToast('Delete failed — API not available');
  }
}

// ── Exports ──
window.updateStatusBadge = updateStatusBadge;
window.toggleStatusPopover = toggleStatusPopover;
window.applyStatusFromPopover = applyStatusFromPopover;
window.populateSelect = populateSelect;
window.populateStatusSelect = populateStatusSelect;
window.setSelectVal = setSelectVal;
window.loadRepair = loadRepair;
window.loadRepairInventory = loadRepairInventory;
window.loadRepairStatusHistory = loadRepairStatusHistory;
window.loadRepairDocuments = loadRepairDocuments;
window.loadRepairFlags = loadRepairFlags;
window.renderFlags = renderFlags;
window.addRepeatVisitFlag = addRepeatVisitFlag;
window.loadRepairByKey = loadRepairByKey;
window.renderScopeTimeline = renderScopeTimeline;
window.populateDetail = populateDetail;
window.loadRepairItems = loadRepairItems;
window.markDirty = markDirty;
window.autoSave = autoSave;
window.persistRepairState = persistRepairState;
window.loadPersistedRepair = loadPersistedRepair;
window.clearPersistedRepair = clearPersistedRepair;
window.clearAllPersistedRepairs = clearAllPersistedRepairs;
window.updateLocalTag = updateLocalTag;
window.buildRepairPayload = buildRepairPayload;
window.getRadioVal = getRadioVal;
window.setRadioVal = setRadioVal;
window.syncFormToRepair = syncFormToRepair;
window.getSelectVal = getSelectVal;
window.confirmDeleteRepair = confirmDeleteRepair;
})();
