/* ═══ repairs-workflows.js ═══
   Slips, amendments, defects, NCPs — CRUD workflows for repair sub-records.
   Part of repairs.html modularization.
*/
(function() {
'use strict';

function loadSlips() {
  _updateSlips = [];
  if (!_currentRepair) return;
  const raw = _currentRepair.mCommentsHidden || '';
  const m = raw.match(/\[UPDATE_SLIP\]([\s\S]*?)\[\/UPDATE_SLIP\]/);
  if (m) {
    try { _updateSlips = JSON.parse(m[1]); } catch(e) { _updateSlips = []; }
  }
  _selectedSlipIdx = -1;
  renderSlips();
  hideSlipDetail();
}

function renderSlips() {
  const tbody = document.getElementById('slipsBody');
  if (!_updateSlips.length) {
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--muted);padding:12px;font-size:11px">No slips recorded</td></tr>';
    return;
  }
  tbody.innerHTML = _updateSlips.map((s, i) => {
    const techName = _techs.find(t => t.lTechnicianKey == s.techKey);
    const sel = i === _selectedSlipIdx ? 'background:var(--primary-light);' : '';
    const status = s.status || 'Open';
    const statusColor = status === 'Complete' ? 'background:#E6F4EA;color:var(--success)' : 'background:#FFF3E0;color:var(--warning)';
    return '<tr style="' + sel + 'cursor:pointer" onclick="selectSlip(' + i + ')">'
      + '<td>US-' + (i+1) + '</td>'
      + '<td>' + esc(s.date || '') + '</td>'
      + '<td>' + esc(s.reason || '') + '</td>'
      + '<td>' + esc(techName ? techName.sTechName : '—') + '</td>'
      + '<td><span style="font-size:9px;font-weight:600;padding:2px 8px;border-radius:9px;' + statusColor + '">' + esc(status) + '</span></td>'
      + '<td><button class="btn btn-outline" style="height:20px;font-size:9px;padding:0 6px" onclick="event.stopPropagation();removeSlip(this,' + i + ')">&times;</button></td>'
      + '</tr>';
  }).join('');
}

function selectSlip(idx) {
  _selectedSlipIdx = idx;
  renderSlips();
  showSlipDetail(idx);
}

function showNewSlipForm() {
  document.getElementById('slipNewForm').style.display = 'block';
  hideSlipDetail();
}
function hideNewSlipForm() {
  document.getElementById('slipNewForm').style.display = 'none';
}

function createSlip() {
  const reason = document.getElementById('slipReason').value;
  const techKey = document.getElementById('slipTech').value;
  if (!reason) { showToast('Select a reason'); return; }
  _updateSlips.push({
    date: new Date().toISOString().slice(0,10),
    reason,
    techKey: techKey || null,
    updateReason: '', comment: '', findings: '',
    status: 'Open',
    createdBy: (API.getUser() || {}).sUserName || 'demo',
    createdAt: new Date().toISOString()
  });
  serializeSlips();
  renderSlips();
  hideNewSlipForm();
  document.getElementById('slipReason').value = '';
  showToast('Slip created — print blank form or enter findings later');
  // Auto-select the new slip
  selectSlip(_updateSlips.length - 1);
}

function showSlipDetail(idx) {
  const s = _updateSlips[idx];
  if (!s) return;
  const panel = document.getElementById('slipDetail');
  panel.style.display = 'block';
  hideNewSlipForm();
  document.getElementById('slipDetailLabel').textContent = 'US-' + (idx+1) + ' — ' + (s.reason || '');
  const statusEl = document.getElementById('slipDetailStatus');
  const isComplete = s.status === 'Complete';
  statusEl.textContent = s.status || 'Open';
  statusEl.style.cssText = 'font-size:9px;font-weight:600;padding:2px 8px;border-radius:9px;' + (isComplete ? 'background:#E6F4EA;color:var(--success)' : 'background:#FFF3E0;color:var(--warning)');
  // Fill fields
  document.getElementById('slipDate').value = s.date || '';
  setSelectVal_safe('slipTech2', s.tech2Key || '');
  setSelectVal_safe('slipUpdateReason', s.updateReason || '');
  document.getElementById('slipComment').value = s.comment || '';
  document.getElementById('slipFindings').value = s.findings || '';
}

function hideSlipDetail() {
  document.getElementById('slipDetail').style.display = 'none';
}

function saveSlipField() {
  if (_selectedSlipIdx < 0 || !_updateSlips[_selectedSlipIdx]) return;
  const s = _updateSlips[_selectedSlipIdx];
  s.date = document.getElementById('slipDate').value || s.date;
  s.tech2Key = document.getElementById('slipTech2').value || null;
  s.updateReason = document.getElementById('slipUpdateReason').value;
  s.comment = document.getElementById('slipComment').value;
  s.findings = document.getElementById('slipFindings').value;
  serializeSlips();
  renderSlips();
}

function markSlipComplete() {
  if (_selectedSlipIdx < 0 || !_updateSlips[_selectedSlipIdx]) return;
  _updateSlips[_selectedSlipIdx].status = 'Complete';
  serializeSlips();
  renderSlips();
  showSlipDetail(_selectedSlipIdx);
  showToast('Slip marked complete');
}

function removeSlip(btn, idx) {
  if (!btn._confirming) {
    btn._confirming = true; btn._origText = btn.textContent; btn._origBg = btn.style.background;
    btn.textContent = 'Sure?'; btn.style.background = 'var(--danger)'; btn.style.color = '#fff'; btn.style.borderColor = 'var(--danger)';
    setTimeout(() => { if (btn._confirming) { btn._confirming = false; btn.textContent = btn._origText; btn.style.background = btn._origBg; btn.style.color = ''; btn.style.borderColor = ''; } }, 3000);
    return;
  }
  btn._confirming = false;
  _updateSlips.splice(idx, 1);
  _selectedSlipIdx = -1;
  serializeSlips();
  renderSlips();
  hideSlipDetail();
}

function serializeSlips() {
  if (!_currentRepair) return;
  let raw = (_currentRepair.mCommentsHidden || '').replace(/\[UPDATE_SLIP\][\s\S]*?\[\/UPDATE_SLIP\]\n?/, '');
  if (_updateSlips.length) {
    raw += '\n[UPDATE_SLIP]' + JSON.stringify(_updateSlips) + '[/UPDATE_SLIP]';
  }
  _currentRepair.mCommentsHidden = raw;
  markDirty();
}

function printSlip() {
  if (_selectedSlipIdx < 0 || !_updateSlips[_selectedSlipIdx]) { showToast('Select a slip first'); return; }
  const s = _updateSlips[_selectedSlipIdx];
  const d = _currentRepair || {};
  const techName = _techs.find(t => t.lTechnicianKey == s.techKey);
  const hasFindings = s.comment || s.findings || s.updateReason;
  const w = window.open('', '_blank', 'width=700,height=700');
  w.document.write('<html><head><title>Update Slip — ' + esc(d.sWorkOrderNumber || '') + '</title>');
  w.document.write('<style>body{font-family:Calibri,sans-serif;font-size:12px;padding:20px}h2{color:var(--est-navy);margin:0 0 10px}table{border-collapse:collapse;width:100%;margin:10px 0}td,th{border:1px solid #ccc;padding:6px 8px;text-align:left}th{background:#f0f4fa;font-size:10px;text-transform:uppercase}.blank-line{border-bottom:1px solid #999;height:22px;margin:4px 0}.section{margin:16px 0 6px;font-weight:700;font-size:11px;text-transform:uppercase;color:var(--est-navy)}</style>');
  w.document.write('</head><body>');
  w.document.write('<h2>UPDATE SLIP</h2>');
  w.document.write('<table><tr><td style="width:50%"><b>Work Order:</b> ' + esc(d.sWorkOrderNumber || '') + '</td><td><b>Date:</b> ' + esc(s.date) + '</td></tr>');
  w.document.write('<tr><td><b>Serial Number:</b> ' + esc(d.sSerialNumber || '') + '</td><td><b>Model:</b> ' + esc(d.sScopeTypeDesc || '') + '</td></tr>');
  w.document.write('<tr><td><b>Client:</b> ' + esc(d.sClientName1 || '') + '</td><td><b>Resp. Tech:</b> ' + esc(techName ? techName.sTechName : '—') + '</td></tr>');
  w.document.write('<tr><td colspan="2"><b>Reason:</b> ' + esc(s.reason) + '</td></tr></table>');
  if (hasFindings) {
    // Print with entered data
    w.document.write('<p class="section">Update Reason</p><p>' + esc(s.updateReason || '—') + '</p>');
    w.document.write('<p class="section">Comment</p><p>' + esc(s.comment || '—') + '</p>');
    w.document.write('<p class="section">Findings</p><p>' + esc(s.findings || '—') + '</p>');
  } else {
    // Print blank form for tech to fill in
    w.document.write('<p class="section">Update Reason (circle one)</p>');
    w.document.write('<p style="font-size:11px">Video Features &nbsp;&nbsp; Angulation &nbsp;&nbsp; Insertion Tube &nbsp;&nbsp; Light Guide &nbsp;&nbsp; Leak &nbsp;&nbsp; Other: ________</p>');
    w.document.write('<p class="section">Comment</p>');
    for (let i = 0; i < 4; i++) w.document.write('<div class="blank-line"></div>');
    w.document.write('<p class="section">Findings</p>');
    for (let i = 0; i < 6; i++) w.document.write('<div class="blank-line"></div>');
  }
  w.document.write('<br><br><table style="border:none"><tr><td style="border:none;width:50%"><div style="border-top:1px solid #000;width:200px;padding-top:4px">Technician Signature</div></td><td style="border:none"><div style="border-top:1px solid #000;width:150px;padding-top:4px">Date</div></td></tr></table>');
  w.document.write('</body></html>');
  w.document.close();
  w.print();
}

// ── Amendments ────────────────────────────────────────
// Session-based: open amendment → add repair items → close amendment
// Each amendment is a session with its own list of added items
// Stored in mCommentsISO with [AMENDMENTS] tag
let _amendments = [];       // History of closed amendments
let _activeAmendment = null; // Currently open amendment session

function loadAmendments() {
  _amendments = [];
  _activeAmendment = null;
  if (!_currentRepair) return;
  const raw = _currentRepair.mCommentsISO || '';
  const m = raw.match(/\[AMENDMENTS\]([\s\S]*?)\[\/AMENDMENTS\]/);
  if (m) {
    try {
      const parsed = JSON.parse(m[1]);
      // Separate active (open) from closed amendments
      _amendments = parsed.filter(a => a.status === 'Closed');
      _activeAmendment = parsed.find(a => a.status === 'Open') || null;
    } catch(e) { _amendments = []; _activeAmendment = null; }
  }
  renderAmendments();
  updateAmendPanels();
}

function renderAmendments() {
  const tbody = document.getElementById('amendBody');
  const all = [..._amendments];
  if (_activeAmendment) all.push(_activeAmendment);
  if (!all.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:12px;font-size:11px">No amendments</td></tr>';
    return;
  }
  tbody.innerHTML = all.map((a, i) => {
    const isActive = a.status === 'Open';
    const statusColor = isActive ? 'background:#FFF3E0;color:var(--warning)' : 'background:#E6F4EA;color:var(--success)';
    const itemCount = (a.items || []).length;
    return '<tr' + (isActive ? ' style="background:#FFFBF0"' : '') + '>'
      + '<td>A-' + (i+1) + '</td>'
      + '<td>' + esc(a.reason || '') + '</td>'
      + '<td>' + itemCount + ' item' + (itemCount !== 1 ? 's' : '') + '</td>'
      + '<td>' + esc(a.date || '') + '</td>'
      + '<td><span style="font-size:9px;font-weight:600;padding:2px 8px;border-radius:9px;' + statusColor + '">' + esc(a.status) + '</span></td>'
      + '</tr>';
  }).join('');
}

function updateAmendPanels() {
  const startPanel = document.getElementById('amendStartPanel');
  const activePanel = document.getElementById('amendActivePanel');
  if (_activeAmendment) {
    startPanel.style.display = 'none';
    activePanel.style.display = 'block';
    document.getElementById('amendActiveLabel').textContent = 'A-' + (_amendments.length + 1) + ' — ' + (_activeAmendment.reason || '');
    populateAmendItemDropdown();
    renderAmendItems();
  } else {
    startPanel.style.display = 'block';
    activePanel.style.display = 'none';
  }
}

function openAmendment() {
  const reason = document.getElementById('amendReason').value;
  const comment = document.getElementById('amendComment').value;
  if (!reason) { showToast('Select a reason'); return; }
  _activeAmendment = {
    reason, comment,
    items: [],
    status: 'Open',
    date: new Date().toISOString().slice(0,10),
    createdBy: (API.getUser() || {}).sUserName || 'demo'
  };
  serializeAmendments();
  renderAmendments();
  updateAmendPanels();
  document.getElementById('amendReason').value = '';
  document.getElementById('amendComment').value = '';
  showToast('Amendment opened — add repair items to amend the quote');
}

async function populateAmendItemDropdown() {
  const sel = document.getElementById('amendItem');
  if (!sel) return;
  sel.innerHTML = '<option value="">— Select repair item —</option>';
  // Load catalog matching current repair's scope type
  var scopeType = (_currentRepair && _currentRepair.sRigidOrFlexible) || 'F';
  var catType = /^R/i.test(scopeType) ? 'Rigid' : 'Flexible';
  if (!_itemCatalog.length) {
    try { await loadItemCatalog(null, catType); } catch(e) {}
  }
  const items = _itemCatalog.length ? _itemCatalog : _repairItems || [];
  items.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.lRepairItemKey || item.lRepairItemTranKey || '';
    opt.textContent = (item.sItemDescription || item.sDescription || item.sRepairItem || '(unnamed)');
    sel.appendChild(opt);
  });
}

function renderAmendItems() {
  const tbody = document.getElementById('amendItemsBody');
  if (!_activeAmendment || !_activeAmendment.items.length) {
    tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:8px;font-size:11px">No items added yet</td></tr>';
    return;
  }
  tbody.innerHTML = _activeAmendment.items.map((item, i) => {
    return '<tr><td>' + esc(item.description || '') + '</td>'
      + '<td>' + (item.isBlind ? '<span style="font-size:9px;font-weight:600;color:#B8860B">Yes</span>' : '—') + '</td>'
      + '<td><button class="btn btn-outline" style="height:20px;font-size:9px;padding:0 6px" onclick="removeAmendItem(' + i + ')">&times;</button></td></tr>';
  }).join('');
}

async function addAmendItem() {
  if (!_activeAmendment) return;
  const sel = document.getElementById('amendItem');
  const itemKey = sel.value;
  const itemDesc = sel.options[sel.selectedIndex]?.textContent || '';
  const isBlind = document.getElementById('amendIsBlind').checked;
  if (!itemKey) { showToast('Select a repair item'); return; }

  _activeAmendment.items.push({
    itemKey, description: itemDesc, isBlind,
    addedAt: new Date().toISOString()
  });

  // Add to local repair items array so it shows in the table immediately
  // Auto-lookup tier price from repair's pricing category
  const catItem = _itemCatalog.find(x => String(x.lRepairItemKey) === String(itemKey));
  var tierPrice = catItem ? (catItem.dblRepairPrice || 0) : 0;
  var catKey = _currentRepair ? (_currentRepair.lPricingCategoryKey || 0) : 0;
  if (catKey && API.validatePrice) {
    try {
      var priceData = await API.validatePrice(parseInt(itemKey), catKey);
      if (priceData && priceData.expected) tierPrice = priceData.expected;
    } catch(e) { /* fallback to catalog price */ }
  }
  _repairItems.push({
    lRepairItemKey: parseInt(itemKey),
    sItemDescription: itemDesc,
    sApproved: 'N',
    dblRepairPrice: tierPrice,
    sFixType: 'A',
    sWNCA: 'A',
    sUAorNWT: '',
    sComments: 'Amendment: ' + (_activeAmendment.reason || ''),
    bBlind: isBlind,
    sTSICode: catItem ? (catItem.sTSICode || '') : '',
    sTechInits: '',
    sTech2Inits: '',
    sPrimaryRepair: ''
  });
  renderRepairItems(_repairItems);

  // Try API call to add amended line item
  if (_liveMode && _currentRepair) {
    try {
      await API.addRepairDetail({
        plRepairKey: _currentRepair.lRepairKey,
        plRepairItemKey: parseInt(itemKey),
        pbAmended: true,
        pbBlind: isBlind
      });
      loadRepairItems(_currentRepair.lRepairKey);
    } catch (e) {
      console.warn('[TSI Repairs] AddRepairDetail not available:', e.message);
    }
  }

  serializeAmendments();
  renderAmendItems();
  renderAmendments();
  sel.value = '';
  document.getElementById('amendIsBlind').checked = false;
  showToast('Item added to amendment' + (isBlind ? ' (blind)' : ''));
}

function removeAmendItem(idx) {
  if (!_activeAmendment) return;
  _activeAmendment.items.splice(idx, 1);
  serializeAmendments();
  renderAmendItems();
  renderAmendments();
}

function closeAmendment(btn) {
  if (!_activeAmendment) return;
  if (!_activeAmendment.items.length) {
    // Inline "Sure?" confirm for discard
    if (btn && !btn._confirming) {
      btn._confirming = true; btn._origText = btn.textContent; btn._origBg = btn.style.background;
      btn.textContent = 'Sure? Discard'; btn.style.background = 'var(--danger)'; btn.style.color = '#fff';
      setTimeout(() => { if (btn._confirming) { btn._confirming = false; btn.textContent = btn._origText; btn.style.background = btn._origBg; btn.style.color = ''; } }, 3000);
      return;
    }
    if (btn) { btn._confirming = false; btn.textContent = btn._origText; btn.style.background = btn._origBg; btn.style.color = ''; }
    _activeAmendment = null;
    serializeAmendments();
    renderAmendments();
    updateAmendPanels();
    showToast('Amendment discarded');
    return;
  }
  _activeAmendment.status = 'Closed';
  _activeAmendment.closedAt = new Date().toISOString();
  _amendments.push(_activeAmendment);
  _activeAmendment = null;
  serializeAmendments();
  renderAmendments();
  updateAmendPanels();
  showToast('Amendment closed — ' + _amendments[_amendments.length-1].items.length + ' item(s) amended');

  // Modal: Reset Approval Date?
  _showResetApprovalModal();
}

function _showResetApprovalModal() {
  let overlay = document.getElementById('resetApprovalOverlay');
  if (overlay) { overlay.style.display = 'flex'; return; }
  overlay = document.createElement('div');
  overlay.id = 'resetApprovalOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(var(--primary-rgb),.3);display:flex;align-items:center;justify-content:center;z-index:var(--z-modal);backdrop-filter:blur(2px)';
  overlay.innerHTML = '<div style="background:#fff;border-radius:8px;padding:24px 28px;max-width:380px;box-shadow:0 8px 32px rgba(0,0,0,.18);font-family:inherit">'
    + '<h3 style="margin:0 0 10px;font-size:14px;color:var(--navy,#1B2A4A)">Reset Approval Date?</h3>'
    + '<p style="margin:0 0 18px;font-size:12.5px;color:#555;line-height:1.5">This will revert to the quoting stage. A new Requisition will be needed.</p>'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button id="resetApprNo" class="btn btn-outline" style="font-size:11px;padding:5px 14px">Keep Date</button>'
    + '<button id="resetApprYes" class="btn btn-navy" style="font-size:11px;padding:5px 14px;background:var(--danger);border-color:var(--danger)">Reset Date</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  document.getElementById('resetApprNo').onclick = function() { overlay.style.display = 'none'; };
  document.getElementById('resetApprYes').onclick = function() {
    overlay.style.display = 'none';
    if (_currentRepair) {
      _currentRepair.dtAprRecvd = null;
      if (document.getElementById('fRecvdApproval')) document.getElementById('fRecvdApproval').value = '';
      markDirty();
      showToast('Approval date reset — send new Requisition');
    }
  };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.style.display = 'none'; };
}

function serializeAmendments() {
  if (!_currentRepair) return;
  let raw = (_currentRepair.mCommentsISO || '').replace(/\[AMENDMENTS\][\s\S]*?\[\/AMENDMENTS\]\n?/, '');
  const all = [..._amendments];
  if (_activeAmendment) all.push(_activeAmendment);
  if (all.length) {
    raw += '\n[AMENDMENTS]' + JSON.stringify(all) + '[/AMENDMENTS]';
  }
  _currentRepair.mCommentsISO = raw;
  markDirty();
}

// ── Defect Tracking ──────────────────────────────────
// Stored as JSON array in mCommentsISO with [DEFECT] tag
let _defects = [];

function loadDefects() {
  _defects = [];
  if (!_currentRepair) return;
  const raw = _currentRepair.mCommentsISO || '';
  const m = raw.match(/\[DEFECTS\]([\s\S]*?)\[\/DEFECTS\]/);
  if (m) {
    try { _defects = JSON.parse(m[1]); } catch(e) { _defects = []; }
  }
  renderDefects();
}

function renderDefects() {
  const tbody = document.getElementById('defectsBody');
  if (!_defects.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:12px;font-size:11px">No defects recorded</td></tr>';
    return;
  }
  tbody.innerHTML = _defects.map((df, i) => {
    const techName = _techs.find(t => t.lTechnicianKey == df.techKey);
    const statusCls = df.resolved ? 'color:var(--green)' : 'color:var(--red);font-weight:700';
    return '<tr><td>' + esc(df.date || '') + '</td><td>' + esc(df.reason || '') + '</td><td>' + esc(techName ? techName.sTechName : '—') + '</td><td style="' + statusCls + '">' + (df.resolved ? 'Resolved' : 'Open') + '</td><td>' + (df.resolved ? '' : '<button class="btn btn-outline" style="height:20px;font-size:9px;padding:0 6px" onclick="resolveDefect(' + i + ')">Resolve</button>') + '</td></tr>';
  }).join('');
}

function logDefect() {
  const date = document.getElementById('defectDate').value;
  const time = document.getElementById('defectTime').value;
  const reason = document.getElementById('defectReason').value;
  const techKey = document.getElementById('defectTech').value;
  const notes = document.getElementById('defectNotes').value;
  if (!reason) { showToast('Select a reason'); return; }

  // Collect failed tests
  const failedTests = [];
  ['defLeakTest','defControlButtons','defImage','defVideoFunctions','defAngulation','defVariableFunction','defOther'].forEach(id => {
    const el = document.getElementById(id);
    if (el && el.checked) failedTests.push(el.closest('.qc-row').querySelector('.qc-label').textContent);
  });
  if (!failedTests.length) { showToast('Check at least one failed test'); return; }

  _defects.push({
    date: date || new Date().toISOString().slice(0,10),
    time: time || new Date().toTimeString().slice(0,5),
    reason, techKey: techKey || null,
    failedTests, notes,
    resolved: false,
    createdBy: (API.getUser() || {}).sUserName || 'demo',
    createdAt: new Date().toISOString()
  });
  serializeDefects();
  renderDefects();
  // Clear form
  document.getElementById('defectDate').value = '';
  document.getElementById('defectTime').value = '';
  document.getElementById('defectReason').value = '';
  document.getElementById('defectNotes').value = '';
  ['defLeakTest','defControlButtons','defImage','defVideoFunctions','defAngulation','defVariableFunction','defOther'].forEach(id => {
    const el = document.getElementById(id); if (el) el.checked = false;
  });
  showToast('Defect logged — repair placed on QA hold');
}

function resolveDefect(idx) {
  if (!_defects[idx]) return;
  let overlay = document.getElementById('resolveDefectOverlay');
  if (overlay) overlay.remove();
  overlay = document.createElement('div');
  overlay.id = 'resolveDefectOverlay';
  overlay.style.cssText = 'position:fixed;inset:0;background:rgba(var(--primary-rgb),.3);display:flex;align-items:center;justify-content:center;z-index:var(--z-modal);backdrop-filter:blur(2px)';
  overlay.innerHTML = '<div style="background:#fff;border-radius:8px;padding:24px 28px;max-width:380px;width:100%;box-shadow:0 8px 32px rgba(0,0,0,.18);font-family:inherit">'
    + '<h3 style="margin:0 0 10px;font-size:14px;color:var(--navy,#1B2A4A)">Resolve Defect</h3>'
    + '<label style="font-size:11px;color:#555;font-weight:500">Resolution notes <span style="color:var(--muted)">(optional)</span></label>'
    + '<input id="resolveDefectNotes" type="text" style="width:100%;margin:6px 0 16px;padding:7px 10px;border:1px solid var(--border,#D1D5DB);border-radius:5px;font-size:12.5px;font-family:inherit;box-sizing:border-box" placeholder="Enter notes...">'
    + '<div style="display:flex;gap:8px;justify-content:flex-end">'
    + '<button id="resolveDefectCancel" class="btn btn-outline" style="font-size:11px;padding:5px 14px">Cancel</button>'
    + '<button id="resolveDefectSubmit" class="btn btn-navy" style="font-size:11px;padding:5px 14px">Resolve</button>'
    + '</div></div>';
  document.body.appendChild(overlay);
  setTimeout(() => document.getElementById('resolveDefectNotes').focus(), 50);
  document.getElementById('resolveDefectCancel').onclick = function() { overlay.remove(); };
  document.getElementById('resolveDefectSubmit').onclick = function() {
    const notes = document.getElementById('resolveDefectNotes').value;
    overlay.remove();
    _defects[idx].resolved = true;
    _defects[idx].resolvedAt = new Date().toISOString();
    _defects[idx].resolvedNotes = notes || '';
    serializeDefects();
    renderDefects();
    showToast('Defect resolved');
  };
  document.getElementById('resolveDefectNotes').onkeydown = function(e) { if (e.key === 'Enter') document.getElementById('resolveDefectSubmit').click(); };
  overlay.onclick = function(e) { if (e.target === overlay) overlay.remove(); };
}

function hasUnresolvedDefects() {
  return _defects.some(d => !d.resolved);
}

function serializeDefects() {
  if (!_currentRepair) return;
  let raw = (_currentRepair.mCommentsISO || '').replace(/\[DEFECTS\][\s\S]*?\[\/DEFECTS\]\n?/, '');
  if (_defects.length) {
    raw += '\n[DEFECTS]' + JSON.stringify(_defects) + '[/DEFECTS]';
  }
  _currentRepair.mCommentsISO = raw;
  markDirty();
}

// ── NCP (Non-Conforming Product OM23-1) ──────────────────
var _ncps = [];

function loadNCPs() {
  _ncps = [];
  if (!_currentRepair) return;
  var raw = _currentRepair.mCommentsISO || '';
  var m = raw.match(/\[NCP\]([\s\S]*?)\[\/NCP\]/);
  if (m) { try { _ncps = JSON.parse(m[1]); } catch(e) {} }
  renderNCPs();
}

function renderNCPs() {
  var tbody = document.getElementById('ncpBody');
  if (!tbody) return;
  if (!_ncps.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;color:var(--muted);padding:12px;font-size:11px">No NCPs recorded</td></tr>';
    updateNCPBadge();
    return;
  }
  tbody.innerHTML = _ncps.map(function(n, i) {
    var statusBadge = n.status === 'Closed'
      ? '<span style="background:#D1FAE5;color:var(--success);padding:2px 6px;border-radius:3px;font-size:9px;font-weight:600">Closed</span>'
      : '<span style="background:#FEE2E2;color:var(--danger);padding:2px 6px;border-radius:3px;font-size:9px;font-weight:600">Open</span>';
    var closeBtn = n.status === 'Open'
      ? '<button onclick="closeNCP(' + i + ', this)" style="font-size:9px;padding:2px 6px;border:1px solid #ccc;border-radius:3px;cursor:pointer;background:#fff">Close</button>'
      : '';
    return '<tr><td style="font-size:10px;font-weight:600">' + n.ncpNum + '</td><td style="font-size:10px">' + (n.date||'') + '</td><td style="font-size:10px">' + (n.disposition||'—') + '</td><td>' + statusBadge + '</td><td>' + closeBtn + '</td></tr>';
  }).join('');
  updateNCPBadge();
}

function updateNCPBadge() {
  var item = document.getElementById('ncpBadgeItem');
  var badge = document.getElementById('ncpBadge');
  if (!item || !badge) return;
  if (!_ncps.length) { item.style.display = 'none'; return; }
  item.style.display = '';
  var openCount = _ncps.filter(function(n){ return n.status === 'Open'; }).length;
  if (openCount) {
    badge.textContent = 'Open';
    badge.style.color = 'var(--danger)';
    badge.style.fontWeight = '700';
  } else {
    badge.textContent = 'Closed';
    badge.style.color = 'var(--success)';
    badge.style.fontWeight = '600';
  }
}

function openNCPDrawer() {
  var r = _currentRepair || {};
  // Determine trigger codes from 40-day form checkboxes if open
  var codes = [];
  var fc4el = document.getElementById('fc4');
  var fc5el = document.getElementById('fc5');
  if (fc4el && fc4el.checked) codes.push(4);
  if (fc5el && fc5el.checked) codes.push(5);
  // Pre-fill context
  document.getElementById('ncpWO').textContent = r.sWorkOrderNumber || r.sWONumber || r.lWOKey || '—';
  document.getElementById('ncpDate').textContent = new Date().toLocaleDateString();
  document.getElementById('ncpClient').textContent = r.sClientName1 || r.sClientName || '—';
  document.getElementById('ncpModel').textContent = r.sScopeTypeDesc || r.sModel || r.sScopeModel || '—';
  document.getElementById('ncpSerial').textContent = r.sSerialNumber || r.sSerial || '—';
  var triggerLabels = [];
  if (codes.indexOf(4) >= 0) triggerLabels.push('Code 4: Improper repair technique');
  if (codes.indexOf(5) >= 0) triggerLabels.push('Code 5: Failure during previous final inspection');
  document.getElementById('ncpTrigger').textContent = triggerLabels.length ? triggerLabels.join(', ') : '—';
  // Date defaults
  var today = new Date().toISOString().slice(0,10);
  document.getElementById('ncpDispDate').value = today;
  document.getElementById('ncpQADate').value = today;
  // Populate user dropdowns
  var users = _techs || [];
  ['ncpDispBy','ncpQABy'].forEach(function(id) {
    var sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '<option value="">— Select —</option>';
    users.forEach(function(u) {
      var key = u.lTechnicianKey || u.lUserKey;
      var name = u.sTechName || u.sUserName || '';
      sel.innerHTML += '<option value="' + key + '">' + name + '</option>';
    });
  });
  loadNCPs();
  closeDrawer();
  document.getElementById('drawer-ncp').classList.add('open');
  document.getElementById('drawerBackdrop').classList.add('open');
}

function saveNCP() {
  var reason = (document.getElementById('ncpReason').value || '').trim();
  if (!reason) { showToast('Reason for Non-Conformance is required'); return; }
  var r = _currentRepair || {};
  var woNum = r.sWorkOrderNumber || r.sWONumber || r.lWOKey || 'UNK';
  var ncpNum = 'NCP-' + woNum + '-' + (_ncps.length + 1);
  var disp = document.querySelector('input[name="ncpDisp"]:checked');
  _ncps.push({
    ncpNum: ncpNum,
    repairKey: r.lRepairKey || null,
    woNum: woNum,
    date: new Date().toISOString().slice(0,10),
    reason: reason,
    investigation: (document.getElementById('ncpInvestigation').value || '').trim(),
    caRequired: document.getElementById('ncpCAYes').checked,
    carParNum: (document.getElementById('ncpCARNum').value || '').trim(),
    vcRequired: document.getElementById('ncpVCYes').checked,
    vcNum: (document.getElementById('ncpVCNum').value || '').trim(),
    disposition: disp ? disp.value : '',
    dispositionBy: document.getElementById('ncpDispBy').value,
    dispositionDate: document.getElementById('ncpDispDate').value,
    qaComments: (document.getElementById('ncpQAComments').value || '').trim(),
    qaReviewBy: document.getElementById('ncpQABy').value,
    qaReviewDate: document.getElementById('ncpQADate').value,
    status: 'Open',
    createdBy: (API.getUser() || {}).sUserName || 'demo',
    createdAt: new Date().toISOString()
  });
  serializeNCPs();
  renderNCPs();
  // Clear form
  document.getElementById('ncpReason').value = '';
  document.getElementById('ncpInvestigation').value = '';
  document.getElementById('ncpCARNum').value = '';
  document.getElementById('ncpVCNum').value = '';
  document.getElementById('ncpQAComments').value = '';
  document.getElementById('ncpCANo').checked = true;
  document.getElementById('ncpVCNo').checked = true;
  document.querySelectorAll('input[name="ncpDisp"]').forEach(function(r){ r.checked = false; });
  showToast('NCP recorded — ' + ncpNum);
}

function closeNCP(idx, btn) {
  if (!btn._confirmed) {
    var orig = btn.textContent;
    btn.textContent = 'Sure?';
    btn._confirmed = true;
    setTimeout(function(){ if(btn) { btn.textContent = orig; btn._confirmed = false; } }, 3000);
    return;
  }
  _ncps[idx].status = 'Closed';
  _ncps[idx].closedAt = new Date().toISOString();
  serializeNCPs();
  renderNCPs();
  showToast('NCP closed');
}

function serializeNCPs() {
  if (!_currentRepair) return;
  var raw = (_currentRepair.mCommentsISO || '').replace(/\[NCP\][\s\S]*?\[\/NCP\]\n?/, '');
  if (_ncps.length) raw += '\n[NCP]' + JSON.stringify(_ncps) + '[/NCP]';
  _currentRepair.mCommentsISO = raw;
  markDirty();
}

// ── Inline Validation ──────────────────────────────────
function validateRequired(formContainer) {
  var valid = true;
  var fields = formContainer.querySelectorAll('.inp[required]');
  fields.forEach(function(f) {
    var val = (f.value || '').trim();
    if (!val) {
      f.classList.add('error');
      valid = false;
    }
  });
  if (!valid && window.TSI && TSI.toast) {
    TSI.toast.error('Required Fields', 'Please fill in all required fields');
  }
  return valid;
}
document.addEventListener('input', function(e) {
  if (e.target.classList.contains('error')) e.target.classList.remove('error');
});
document.addEventListener('change', function(e) {
  if (e.target.classList.contains('error')) e.target.classList.remove('error');
});


// ── Exports ──
window.loadSlips = loadSlips;
window.renderSlips = renderSlips;
window.selectSlip = selectSlip;
window.showNewSlipForm = showNewSlipForm;
window.hideNewSlipForm = hideNewSlipForm;
window.createSlip = createSlip;
window.showSlipDetail = showSlipDetail;
window.hideSlipDetail = hideSlipDetail;
window.saveSlipField = saveSlipField;
window.markSlipComplete = markSlipComplete;
window.removeSlip = removeSlip;
window.printSlip = printSlip;
window.serializeSlips = serializeSlips;
window.loadAmendments = loadAmendments;
window.renderAmendments = renderAmendments;
window.updateAmendPanels = updateAmendPanels;
window.openAmendment = openAmendment;
window.closeAmendment = closeAmendment;
window.renderAmendItems = renderAmendItems;
window.addAmendItem = addAmendItem;
window.removeAmendItem = removeAmendItem;
window.serializeAmendments = serializeAmendments;
window.populateAmendItemDropdown = populateAmendItemDropdown;
window.loadDefects = loadDefects;
window.renderDefects = renderDefects;
window.logDefect = logDefect;
window.resolveDefect = resolveDefect;
window.hasUnresolvedDefects = hasUnresolvedDefects;
window.serializeDefects = serializeDefects;
window.loadNCPs = loadNCPs;
window.renderNCPs = renderNCPs;
window.updateNCPBadge = updateNCPBadge;
window.openNCPDrawer = openNCPDrawer;
window.saveNCP = saveNCP;
window.closeNCP = closeNCP;
window.serializeNCPs = serializeNCPs;
window.validateRequired = validateRequired;
})();
