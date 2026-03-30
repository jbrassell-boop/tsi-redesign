/* ═══ repairs-items.js ═══
   Line item management, item picker, tech assignment, UANWT/WNCA cycles.
   Part of repairs.html modularization.
*/
(function() {
'use strict';

function renderRepairItems(ds) {
  _repairItems = ds || [];
  const tbody = document.getElementById('repairItemsBody');
  if (!_repairItems.length) {
    tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No repair items for this work order</td></tr>';
    updateItemTotals();
    return;
  }
  tbody.innerHTML = _repairItems.map((item, i) => {
    const key = item.lRepairItemTranKey || '';
    const appr = item.sApproved || '';
    const isApproved = appr === 'Y';
    const isBlind = item.bBlind === true || item.bBlind === 'Y';
    const tech = item.sTechInits || item.sTech1 || '';
    const tech2 = item.sTechInits2 || item.sTech2Inits || item.sTech2 || '';
    const techDisplay = tech + (tech2 ? '/' + tech2 : '');
    const comment = esc(item.sComments || '');
    const rowBg = isBlind ? 'background:var(--neutral-50);opacity:.65' : (isApproved ? 'background:#F0FDF4' : '');
    const descStyle = isBlind ? 'font-weight:500;font-style:italic;text-decoration:line-through;color:var(--neutral-500)' : 'font-weight:500';
    return '<tr data-tran="' + key + '" onclick="selectItemRow(this,' + i + ')" style="' + rowBg + '">' +
      '<td style="text-align:center;white-space:nowrap">' +
        '<button class="btn-xs" style="width:28px;height:22px;border-radius:4px;border:1.5px solid ' + (isApproved ? 'var(--success)' : 'var(--neutral-200)') + ';background:' + (isApproved ? 'var(--success)' : 'var(--card)') + ';color:' + (isApproved ? '#fff' : 'var(--neutral-500)') + ';cursor:pointer;font-size:12px;font-weight:700;display:inline-flex;align-items:center;justify-content:center" onclick="event.stopPropagation();toggleApproval(' + i + ')" title="Toggle approval">' + (isApproved ? '✓' : '—') + '</button>' +
        '<button class="btn-xs" style="width:22px;height:22px;border-radius:4px;border:1px solid ' + (isBlind ? 'var(--warning)' : 'var(--neutral-200)') + ';background:' + (isBlind ? '#FEF3C7' : 'var(--card)') + ';color:' + (isBlind ? '#92400E' : 'var(--neutral-400)') + ';cursor:pointer;font-size:10px;display:inline-flex;align-items:center;justify-content:center;margin-left:2px" onclick="event.stopPropagation();toggleBlind(' + i + ')" title="' + (isBlind ? 'Blind — hidden from client' : 'Mark as blind (hide from client)') + '">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">' + (isBlind ? '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/>' : '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>') + '</svg>' +
        '</button>' +
      '</td>' +
      '<td><code style="font-size:10px">' + esc(item.sTSICode||item.sRepairCode||'') + '</code></td>' +
      '<td><span style="' + descStyle + '">' + esc(item.sItemDescription||item.sDescription||item.sRepairItem||'') + (isBlind ? ' <span style="font-size:8px;font-weight:700;color:#92400E;font-style:normal;text-decoration:none">BLIND</span>' : '') + '</span></td>' +
      '<td style="text-align:center;cursor:pointer;user-select:none" onclick="event.stopPropagation();cycleUANWT(' + i + ')" title="Click to cycle: User Abuse / Normal Wear &amp; Tear / None">' + uanwtPill(item.sUAorNWT||item.sUANWT||'') + '</td>' +
      '<td style="text-align:center;cursor:pointer;user-select:none" onclick="event.stopPropagation();cycleWNCA(' + i + ')" title="Click to cycle: Repair / Warranty / Non-conformance / Customer / Amendment / None">' + wncaPill(item.sFixType||item.sWNCA||'') + '</td>' +
      '<td style="text-align:right;font-family:var(--mono);font-weight:600">' + fmtMoney(item.dblRepairPrice||item.mAmount||item.dblAmount||0) + '</td>' +
      '<td style="font-size:10px;color:var(--neutral-500)">' + techDisplay + '</td>' +
      '<td><input type="text" value="' + comment + '" placeholder="Add comment…" style="width:100%;height:22px;font-size:10px;border:1px solid transparent;border-radius:3px;padding:0 4px;font-family:inherit;color:var(--neutral-700);background:transparent;outline:none;box-sizing:border-box" onfocus="this.style.borderColor=\'var(--primary)\';this.style.background=\'var(--card)\'" onblur="this.style.borderColor=\'transparent\';this.style.background=\'transparent\'" onchange="setItemComment(' + i + ',this.value)" onclick="event.stopPropagation()"/></td></tr>';
  }).join('');
  // Update counter in header
  const approvedCount = _repairItems.filter(x => x.sApproved === 'Y').length;
  document.getElementById('riApprCounter').textContent = approvedCount + '/' + _repairItems.length + ' approved';
  updateItemTotals();
  // Sync Line Items tab
  populateLineItemsTab(_repairItems);
}

// Auto-populate repair level based on highest level among repair items
function autoPopulateRepairLevel(items) {
  if (!items || !items.length || !_currentRepair) return;
  // Only auto-set if repair doesn't already have a level
  if (_currentRepair.lRepairLevelKey) return;
  var hasMajor = false;
  items.forEach(function(item) {
    var cat = _repairItemsCatalog[item.lRepairItemKey];
    if (cat && cat.sMajorRepair === '1') hasMajor = true;
  });
  // Major=3, Minor=1
  var autoLevel = hasMajor ? 3 : 1;
  setSelectVal('hRepairLevel', autoLevel);
  // Update toolbar chip
  var lvl = _levels.find(function(x) { return x.lRepairLevelKey == autoLevel; });
  if (lvl) document.getElementById('ssLevel').querySelector('.ss-val').textContent = lvl.sRepairLevel;
}

function updateItemTotals() {
  let approved = 0, unapproved = 0, blind = 0;
  _repairItems.forEach(item => {
    const amt = parseFloat(item.dblRepairPrice || item.mAmount || item.dblAmount || 0);
    if (item.bBlind) blind += amt;
    else if (item.sApproved === 'Y') approved += amt;
    else unapproved += amt;
  });
  document.getElementById('aTotalApproved').textContent = fmtMoney(approved);
  document.getElementById('aTotalUnapproved').textContent = fmtMoney(unapproved);
  var blindEl = document.getElementById('aTotalBlind');
  if (blindEl) { blindEl.textContent = fmtMoney(blind); blindEl.parentElement.style.display = blind > 0 ? '' : 'none'; }
}

let _selectedItemIdx = -1;
function selectItemRow(tr, idx) {
  document.querySelectorAll('#repairItemsBody tr').forEach(r => r.classList.remove('selected-row'));
  tr.classList.add('selected-row');
  _selectedItemIdx = idx;
}

/* ── Bulk Tech Assignment (Techs Drawer) ── */
function renderTechsDrawer() {
  const body = document.getElementById('techsDrawerBody');
  if (!_repairItems.length) { body.innerHTML = '<div style="padding:20px;color:var(--muted);text-align:center">No repair items</div>'; return; }
  body.innerHTML = '<div style="margin-bottom:10px">' +
    '<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Bulk Assign</div>' +
    '<div style="display:flex;gap:6px;margin-bottom:8px">' +
      '<select id="bulkTechSel" style="flex:1;height:28px;font-size:11px">' +
        '<option value="">— Select Tech —</option>' + _techs.map(t => '<option value="' + t.sTechName.split(' ').map(w=>w[0]).join('') + '">' + t.sTechName + '</option>').join('') +
      '</select>' +
      '<button class="btn btn-navy btn-sm" onclick="bulkAssignTech(1)">→ Tech 1</button>' +
      '<button class="btn btn-outline btn-sm" onclick="bulkAssignTech(2)">→ Tech 2</button>' +
    '</div>' +
  '</div>' +
  '<div style="font-size:9px;font-weight:600;color:var(--muted);text-transform:uppercase;letter-spacing:.4px;margin-bottom:6px">Per-Item Assignment</div>' +
  '<div class="qc-check-grid">' +
    _repairItems.map((item, i) => {
      const code = item.sTSICode||item.sRepairCode||'';
      const t1 = item.sTechInits||item.sTech1||'';
      const t2 = item.sTechInits2||item.sTech2Inits||item.sTech2||'';
      return '<div class="qc-row" style="gap:6px">' +
        '<span style="font-size:10px;font-weight:600;flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + (item.sItemDescription||'') + '"><code style="font-size:9px;color:var(--blue)">' + code + '</code> ' + (item.sItemDescription||'').substring(0,30) + '</span>' +
        '<select style="width:70px;height:22px;font-size:10px" onchange="assignTechFromDrawer(' + i + ',1,this.value)">' +
          '<option value="">—</option>' + _techs.map(t => { const inits=t.sTechName.split(' ').map(w=>w[0]).join(''); return '<option value="'+inits+'"'+(inits===t1?' selected':'')+'>'+inits+'</option>'; }).join('') +
        '</select>' +
        '<select style="width:70px;height:22px;font-size:10px" onchange="assignTechFromDrawer(' + i + ',2,this.value)">' +
          '<option value="">—</option>' + _techs.map(t => { const inits=t.sTechName.split(' ').map(w=>w[0]).join(''); return '<option value="'+inits+'"'+(inits===t2?' selected':'')+'>'+inits+'</option>'; }).join('') +
        '</select>' +
      '</div>';
    }).join('') +
  '</div>';
}
function assignTechFromDrawer(idx, techNum, val) {
  const item = _repairItems[idx];
  if (techNum === 1) { item.sTechInits = val; item.sTech1 = val; }
  else { item.sTechInits2 = val; item.sTech2Inits = val; item.sTech2 = val; }
  markDirty();
  renderRepairItems(_repairItems);
}
function bulkAssignTech(techNum) {
  const val = document.getElementById('bulkTechSel').value;
  if (!val) return;
  _repairItems.forEach(item => {
    if (techNum === 1) { item.sTechInits = val; item.sTech1 = val; }
    else { item.sTechInits2 = val; item.sTech2Inits = val; item.sTech2 = val; }
  });
  markDirty();
  renderRepairItems(_repairItems);
  renderTechsDrawer();
}
function openTechsDrawer() { renderTechsDrawer(); openDrawer('techs'); }

/* ── Inventory Drawer ── */
let _invSelectedItem = -1;
function openInvDrawer() {
  renderInvItemsList();
  _invSelectedItem = -1;
  openDrawer('addInv');
}
function renderInvItemsList() {
  const el = document.getElementById('invItemsList');
  if (!_repairItems.length) { el.innerHTML = '<div style="padding:12px;color:var(--muted);font-size:10px;text-align:center">No repair items</div>'; return; }
  el.innerHTML = _repairItems.map((item, i) => {
    const code = item.sTSICode||item.sRepairCode||'';
    const desc = (item.sItemDescription||item.sDescription||'').substring(0,28);
    return '<div onclick="selectInvItem(' + i + ')" style="padding:6px 12px;cursor:pointer;border-bottom:1px solid var(--border);font-size:10px;' + (i===_invSelectedItem?'background:#ECFEFF;font-weight:600':'') + '" data-inv-idx="' + i + '">' +
      '<code style="font-size:9px;color:var(--blue)">' + code + '</code><br/>' +
      '<span style="color:var(--text)">' + desc + '</span></div>';
  }).join('');
}
function selectInvItem(idx) {
  _invSelectedItem = idx;
  document.querySelectorAll('#invItemsList > div').forEach((el, i) => {
    el.style.background = i === idx ? '#ECFEFF' : '';
    el.style.fontWeight = i === idx ? '600' : '';
  });

  const item = _repairItems[idx];
  if (!item) return;

  document.getElementById('invLotsBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">Loading...</td></tr>';
  document.getElementById('invAvailBody').innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">Loading...</td></tr>';

  var repairKey = _currentRepair ? _currentRepair.lRepairKey : null;
  if (repairKey) {
    API.getRepairInventory(repairKey).then(function(data) {
      var items = Array.isArray(data) ? data : (data && data.dataSource ? data.dataSource : []);
      var tranKey = item.lRepairItemTranKey;
      var assigned = items.filter(function(inv) { return inv.lRepairItemTranKey === tranKey; });
      if (!assigned.length) {
        document.getElementById('invLotsBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">No parts assigned</td></tr>';
      } else {
        document.getElementById('invLotsBody').innerHTML = assigned.map(function(inv) {
          return '<tr><td>' + esc(inv.sInventoryDescription || inv.sDescription || '') + '</td><td style="text-align:center">' + (inv.nQuantity || 1) + '</td><td style="text-align:right">' + fmtMoney(inv.dblUnitCost || 0) + '</td></tr>';
        }).join('');
      }
    }).catch(function() {
      document.getElementById('invLotsBody').innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">Error loading</td></tr>';
    });
  }

  API.getInventoryList({ Pagination: { PageNumber: 1, PageSize: 50 }, Filters: {} }).then(function(data) {
    var items = Array.isArray(data) ? data : (data && data.dataSource ? data.dataSource : []);
    if (!items.length) {
      document.getElementById('invAvailBody').innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">No inventory items found</td></tr>';
      return;
    }
    document.getElementById('invAvailBody').innerHTML = items.map(function(inv) {
      var binNum = inv.sBinNumber || inv.sBin || '';
      return '<tr style="cursor:pointer" onclick="addInvToRepair(' + (inv.lInventoryKey || inv.lInventoryItemKey) + ',' + _invSelectedItem + ')">' +
        '<td>' + esc(inv.sInventoryDescription || inv.sDescription || '') + '</td>' +
        '<td style="text-align:center;font-size:10px">' + binNum + '</td>' +
        '<td style="text-align:center">' + (inv.nCurrentLevel || inv.nOnHand || 0) + '</td>' +
        '<td style="text-align:right">' + fmtMoney(inv.dblUnitCost || 0) + '</td></tr>';
    }).join('');
  }).catch(function() {
    document.getElementById('invAvailBody').innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--muted);padding:12px;font-size:10px">Error loading inventory</td></tr>';
  });
}

async function addInvToRepair(inventoryKey, itemIdx) {
  if (!_currentRepair || itemIdx < 0) return;
  var item = _repairItems[itemIdx];
  if (!item || !item.lRepairItemTranKey) { showToast('Select a repair item first'); return; }
  try {
    await API.addRepairInventory({
      plRepairKey: _currentRepair.lRepairKey,
      plRepairItemTranKey: item.lRepairItemTranKey,
      plScopeTypeRepairItemInventoryKey: inventoryKey,
      pnQuantity: 1
    });
    showToast('Part added');
    selectInvItem(itemIdx);
    loadRepairInventory(_currentRepair.lRepairKey);
  } catch(e) { showToast('Failed to add part: ' + e.message); }
}

// ── Right-click context menu for repair items ──
let _ctxItemIdx = -1;
function initItemContextMenu() {
  const tbody = document.getElementById('repairItemsBody');
  tbody.addEventListener('contextmenu', function(e) {
    const tr = e.target.closest('tr');
    if (!tr || tr.querySelector('.empty-state')) return;
    e.preventDefault();
    const rows = Array.from(tbody.querySelectorAll('tr'));
    _ctxItemIdx = rows.indexOf(tr);
    if (_ctxItemIdx < 0) return;
    selectItemRow(tr, _ctxItemIdx);
    const menu = document.getElementById('itemCtxMenu');
    const item = _repairItems[_ctxItemIdx];
    document.getElementById('ctxItemLabel').textContent = (item.sItemDescription || item.sTSICode || 'Item #' + (_ctxItemIdx + 1));
    // Toggle approved text
    const apprEl = document.getElementById('ctxToggleApproved');
    apprEl.querySelector('.ctx-text').textContent = item.sApproved === 'Y' ? 'Mark Unapproved' : 'Mark Approved';
    // Toggle primary text
    const priEl = document.getElementById('ctxTogglePrimary');
    priEl.querySelector('.ctx-text').textContent = item.sPrimaryRepair === 'Y' ? 'Unset Primary' : 'Set as Primary';
    // Position menu
    menu.style.left = Math.min(e.clientX, window.innerWidth - 180) + 'px';
    menu.style.top = Math.min(e.clientY, window.innerHeight - 200) + 'px';
    menu.classList.add('open');
  });
  document.addEventListener('click', function() {
    document.getElementById('itemCtxMenu').classList.remove('open');
  });
  document.addEventListener('contextmenu', function(e) {
    if (!e.target.closest('#repairItemsBody')) {
      document.getElementById('itemCtxMenu').classList.remove('open');
    }
  });
}

function toggleApproval(i) {
  if (!_repairItems[i]) return;
  _repairItems[i].sApproved = _repairItems[i].sApproved === 'Y' ? 'N' : 'Y';
  renderRepairItems(_repairItems);
  markDirty();
}
function toggleBlind(i) {
  if (!_repairItems[i]) return;
  _repairItems[i].bBlind = !_repairItems[i].bBlind;
  renderRepairItems(_repairItems);
  markDirty();
}
function setItemComment(i, val) {
  if (!_repairItems[i]) return;
  _repairItems[i].sComments = val;
  markDirty();
}
function approveAllItems() {
  if (!_repairItems.length) return;
  _repairItems.forEach(item => item.sApproved = 'Y');
  renderRepairItems(_repairItems);
  markDirty();
}
function unapproveAllItems() {
  if (!_repairItems.length) return;
  _repairItems.forEach(item => item.sApproved = 'N');
  renderRepairItems(_repairItems);
  markDirty();
}

// ── Click-to-cycle for UA/NWT and W/N/C/A ──
const _uanwtCycle = ['UA','NWT',''];
const _uanwtLabels = {UA:'User Abuse',NWT:'Normal Wear & Tear','':'—'};
function setRepairedBy(idx, val) {
  if (_repairItems[idx]) { _repairItems[idx].sRepairedBy = val; markDirty(); }
}
function cycleUANWT(idx) {
  const item = _repairItems[idx];
  if (!item) return;
  const cur = item.sUAorNWT || item.sUANWT || '';
  const pos = _uanwtCycle.indexOf(cur);
  item.sUAorNWT = _uanwtCycle[(pos + 1) % _uanwtCycle.length];
  renderRepairItems(_repairItems);
  markDirty();
}
function uanwtPill(v) {
  var pill = 'display:inline-block;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600;letter-spacing:.02em';
  if (v === 'UA') return '<span style="' + pill + ';background:#FEE2E2;color:#991B1B">User Abuse</span>';
  if (v === 'NWT') return '<span style="' + pill + ';background:#FEF3C7;color:#92400E">Normal W&T</span>';
  return '<span style="color:var(--neutral-300);font-size:10px;cursor:pointer" title="Click to set">·</span>';
}
function uanwtStyle(v) {
  if (v === 'UA') return 'background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  if (v === 'NWT') return 'background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  return 'color:var(--muted);font-size:10px';
}

const _wncaCycle = ['R','W','N','C','A',''];
const _wncaLabels = {R:'Repair',W:'Warranty',N:'Non-conformance',C:'Customer Service',A:'Amendment','':'—'};
function cycleWNCA(idx) {
  const item = _repairItems[idx];
  if (!item) return;
  const cur = item.sFixType || item.sWNCA || '';
  const pos = _wncaCycle.indexOf(cur);
  const next = _wncaCycle[(pos + 1) % _wncaCycle.length];
  item.sFixType = next;
  item.sWNCA = next;
  renderRepairItems(_repairItems);
  markDirty();
}
function wncaPill(v) {
  var pill = 'display:inline-block;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600;letter-spacing:.02em';
  if (v === 'R') return '<span style="' + pill + ';background:var(--primary-light);color:var(--primary-dark)">Repair</span>';
  if (v === 'W') return '<span style="' + pill + ';background:#DCFCE7;color:#166534">Warranty</span>';
  if (v === 'N') return '<span style="' + pill + ';background:#FEE2E2;color:#991B1B">Non-conf</span>';
  if (v === 'C') return '<span style="' + pill + ';background:#DBEAFE;color:#1E40AF">Customer</span>';
  if (v === 'A') return '<span style="' + pill + ';background:#FEF3C7;color:#92400E">Amend</span>';
  return '<span style="color:var(--neutral-300);font-size:10px;cursor:pointer" title="Click to set">·</span>';
}
function wncaStyle(v) {
  if (v === 'R') return 'background:var(--primary-light);color:var(--primary-dark);padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  if (v === 'W') return 'background:#DCFCE7;color:#166534;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  if (v === 'N') return 'background:#FEE2E2;color:#991B1B;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  if (v === 'C') return 'background:#DBEAFE;color:#1E40AF;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  if (v === 'A') return 'background:#FEF3C7;color:#92400E;padding:1px 6px;border-radius:9999px;font-size:9px;font-weight:600';
  return 'color:var(--muted);font-size:10px';
}

function ctxToggleApproved() {
  if (_ctxItemIdx < 0 || !_repairItems[_ctxItemIdx]) return;
  _repairItems[_ctxItemIdx].sApproved = _repairItems[_ctxItemIdx].sApproved === 'Y' ? 'N' : 'Y';
  renderRepairItems(_repairItems);
  markDirty();
}

function ctxTogglePrimary() {
  if (_ctxItemIdx < 0 || !_repairItems[_ctxItemIdx]) return;
  const wasPrimary = _repairItems[_ctxItemIdx].sPrimaryRepair === 'Y';
  // Clear all primary flags first
  _repairItems.forEach(item => item.sPrimaryRepair = 'N');
  // Toggle: if it was already primary, leave all cleared; otherwise set this one
  if (!wasPrimary) _repairItems[_ctxItemIdx].sPrimaryRepair = 'Y';
  renderRepairItems(_repairItems);
  markDirty();
}

function ctxDeleteItem() {
  if (_ctxItemIdx < 0 || !_repairItems[_ctxItemIdx]) return;
  const desc = _repairItems[_ctxItemIdx].sItemDescription || '';
  _repairItems.splice(_ctxItemIdx, 1);
  _ctxItemIdx = -1;
  _selectedItemIdx = -1;
  renderRepairItems(_repairItems);
  markDirty();
}

// ── Item Picker (multi-select) ──
let _itemCatalog = [], _itemCatalogFiltered = [];
let _catalogLoading = false;
let _pickerSelected = new Set(); // keys of selected items
async function openItemPicker() {
  _pickerSelected.clear();
  _pickerMeta = {};
  updatePickerFooter();
  document.getElementById('itemPicker').classList.add('open');
  document.getElementById('itemPickerSearch').value = '';
  document.getElementById('itemPickerSearch').focus();
  var scopeType = (_currentRepair && _currentRepair.sRigidOrFlexible) || 'F';
  var catType = /^C/i.test(scopeType) ? 'Camera' : /^R/i.test(scopeType) ? 'Rigid' : 'Flexible';
  // Auto-select the matching seg-btn in the picker header
  var segBtns = document.querySelectorAll('#itemPicker .seg-btn');
  segBtns.forEach(function(b) {
    b.classList.toggle('active', b.textContent.trim() === catType);
  });
  // Always reload catalog for the current scope type (don't use stale cache)
  _itemCatalog = [];
  await loadItemCatalog(null, catType);
}
function closeItemPicker() { document.getElementById('itemPicker').classList.remove('open'); }

async function loadItemCatalog(btn, type) {
  if (_catalogLoading) return;
  _catalogLoading = true;
  if (btn) toggleSegBtn(btn);
  document.getElementById('itemPickerList').innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:11px">Loading ' + type + ' items...</div>';
  try {
    const data = await API.getRepairItemsCatalog(type);
    _itemCatalog = Array.isArray(data) ? data : [];
    _itemCatalog.sort((a, b) => (a.sItemDescription || '').localeCompare(b.sItemDescription || ''));
    renderPickerList(_itemCatalog);
  } catch (e) {
    document.getElementById('itemPickerList').innerHTML = '<div style="text-align:center;padding:20px;color:var(--red);font-size:11px">Failed to load: ' + e.message + '</div>';
  } finally {
    _catalogLoading = false;
  }
}

function filterItemPicker(q) {
  const term = q.toLowerCase().trim();
  if (!term) { renderPickerList(_itemCatalog); return; }
  _itemCatalogFiltered = _itemCatalog.filter(item =>
    (item.sItemDescription || '').toLowerCase().includes(term) ||
    String(item.lRepairItemKey || '').includes(term)
  );
  renderPickerList(_itemCatalogFiltered);
}

let _pickerMeta = {}; // keyed by lRepairItemKey: {comment, cause, fixType, amount}
function getPickerMeta(key) { return _pickerMeta[key] || {comment:'',cause:'',fixType:'',amount:''}; }

function renderPickerList(items) {
  const list = document.getElementById('itemPickerList');
  if (!items.length) {
    list.innerHTML = '<div style="text-align:center;padding:20px;color:var(--muted);font-size:11px">No items found</div>';
    return;
  }
  const shown = items.slice(0, 200);
  list.innerHTML = shown.map(item => {
    const key = item.lRepairItemKey;
    const checked = _pickerSelected.has(key);
    const meta = getPickerMeta(key);
    var html = '<div class="picker-item' + (checked ? ' pi-selected' : '') + '" onclick="togglePickerItem(' + key + ',this)" data-pk="' + key + '">' +
    '<span style="width:18px;height:18px;border:1.5px solid ' + (checked ? 'var(--green)' : 'var(--border-dk)') + ';border-radius:3px;display:flex;align-items:center;justify-content:center;flex-shrink:0;background:' + (checked ? 'var(--green)' : '#fff') + ';transition:all .12s">' +
    (checked ? '<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3"><polyline points="20 6 9 17 4 12"/></svg>' : '') + '</span>' +
    '<span class="pi-code">' + (key || '') + '</span>' +
    '<span class="pi-desc">' + (item.sItemDescription || '') + '</span>' +
    '<span class="pi-type">' + (item.sInstrumentType || '') + '</span>' +
    '</div>';
    if (checked) {
      html += '<div class="pi-detail" onclick="event.stopPropagation()" style="display:flex;gap:8px;align-items:center;padding:4px 16px 8px 44px;background:#F0FDF4;border-bottom:1px solid var(--neutral-200);flex-wrap:wrap">' +
        '<select style="height:24px;font-size:10px;border:1px solid var(--neutral-200);border-radius:4px;padding:0 4px;font-family:inherit" onchange="_pickerMeta[' + key + ']=_pickerMeta[' + key + ']||{};_pickerMeta[' + key + '].cause=this.value">' +
          '<option value="">Cause…</option><option value="UA"' + (meta.cause==='UA'?' selected':'') + '>User Abuse</option><option value="NWT"' + (meta.cause==='NWT'?' selected':'') + '>Normal Wear & Tear</option></select>' +
        '<select style="height:24px;font-size:10px;border:1px solid var(--neutral-200);border-radius:4px;padding:0 4px;font-family:inherit" onchange="_pickerMeta[' + key + ']=_pickerMeta[' + key + ']||{};_pickerMeta[' + key + '].fixType=this.value">' +
          '<option value="">Fix Type…</option><option value="R"' + (meta.fixType==='R'?' selected':'') + '>Repair</option><option value="W"' + (meta.fixType==='W'?' selected':'') + '>Warranty</option><option value="N"' + (meta.fixType==='N'?' selected':'') + '>Non-conformance</option><option value="C"' + (meta.fixType==='C'?' selected':'') + '>Customer</option><option value="A"' + (meta.fixType==='A'?' selected':'') + '>Amendment</option></select>' +
        '<input type="text" placeholder="Comment…" value="' + (meta.comment||'').replace(/"/g,'&quot;') + '" style="flex:1;min-width:120px;height:24px;font-size:10px;border:1px solid var(--neutral-200);border-radius:4px;padding:0 6px;font-family:inherit" onclick="event.stopPropagation()" onchange="_pickerMeta[' + key + ']=_pickerMeta[' + key + ']||{};_pickerMeta[' + key + '].comment=this.value">' +
        '<input type="number" step="0.01" placeholder="$0.00" value="' + (meta.amount||'') + '" style="width:80px;height:24px;font-size:10px;border:1px solid var(--neutral-200);border-radius:4px;padding:0 6px;font-family:var(--mono);text-align:right" onclick="event.stopPropagation()" onchange="_pickerMeta[' + key + ']=_pickerMeta[' + key + ']||{};_pickerMeta[' + key + '].amount=this.value" title="Tier price (auto-filled)">' +
      '</div>';
    }
    return html;
  }).join('') + (items.length > 200 ? '<div style="text-align:center;padding:8px;color:var(--muted);font-size:10px">Showing 200 of ' + items.length + ' — refine your search</div>' : '');
  updatePickerFooter();
}

async function togglePickerItem(key, el) {
  if (_pickerSelected.has(key)) {
    _pickerSelected.delete(key);
    delete _pickerMeta[key];
  } else {
    _pickerSelected.add(key);
    _pickerMeta[key] = {comment:'',cause:'',fixType:'',amount:''};
    // Auto-lookup tier price from repair's pricing category
    var catKey = _currentRepair ? (_currentRepair.lPricingCategoryKey || 0) : 0;
    if (catKey && API.validatePrice) {
      try {
        var priceData = await API.validatePrice(key, catKey);
        if (priceData && priceData.expected) {
          _pickerMeta[key].amount = priceData.expected;
        }
      } catch(e) { /* no price for this item/tier — leave at 0 */ }
    }
  }
  // Re-render to show/hide detail row
  const term = document.getElementById('itemPickerSearch').value.trim().toLowerCase();
  renderPickerList(term ? _itemCatalogFiltered : _itemCatalog);
}

function updatePickerFooter() {
  const count = _pickerSelected.size;
  const footer = document.getElementById('pickerFooter');
  footer.style.display = count > 0 ? 'flex' : 'none';
  document.getElementById('pickerSelectedCount').textContent = count + ' item' + (count !== 1 ? 's' : '') + ' selected';
}

function clearPickerSelections() {
  _pickerSelected.clear();
  // Re-render current list
  const term = document.getElementById('itemPickerSearch').value.trim().toLowerCase();
  renderPickerList(term ? _itemCatalogFiltered : _itemCatalog);
}

function addSelectedItems() {
  if (!_pickerSelected.size) return;
  _pickerSelected.forEach(key => {
    const item = _itemCatalog.find(x => x.lRepairItemKey === key);
    if (!item) return;
    const meta = getPickerMeta(key);
    _repairItems.push({
      lRepairItemKey: item.lRepairItemKey,
      sItemDescription: item.sItemDescription,
      sApproved: 'N',
      dblRepairPrice: parseFloat(meta.amount) || 0,
      sTechInits: '',
      sTech2Inits: '',
      sPrimaryRepair: '',
      sFixType: meta.fixType || '',
      sWNCA: meta.fixType || '',
      sUAorNWT: meta.cause || '',
      sUANWT: meta.cause || '',
      sComments: meta.comment || '',
      sTSICode: ''
    });
  });
  _pickerMeta = {};
  renderRepairItems(_repairItems);
  closeItemPicker();
  markDirty();
}

function resetMaxCharge() {
  if (_currentRepair) {
    document.getElementById('fMaxOverride').value = '';
    document.getElementById('fMaxCharge').value = _currentRepair.mMaxCharge ? fmtMoney(_currentRepair.mMaxCharge) : '';
    markDirty();
  }
}

// ── Address toggle ──
function toggleShipSame() {
  var same = document.getElementById('fShipSameBill').checked;
  var shipFields = ['Name1','Addr1','City','State','Zip'];
  shipFields.forEach(function(f) {
    var shipEl = document.getElementById('fShip' + f);
    if (same) {
      shipEl.value = document.getElementById('fBill' + f).value;
      shipEl.disabled = true;
      shipEl.style.opacity = '.6';
    } else {
      shipEl.disabled = false;
      shipEl.style.opacity = '1';
    }
  });
  markDirty();
}

// ── Shipping helpers ──
function copyTracking() {
  var val = document.getElementById('sTracking2').value.trim();
  if (!val) { showToast('No tracking number to copy'); return; }
  navigator.clipboard.writeText(val).then(function() {
    showToast('Tracking # copied');
  }).catch(function() {
    var ta = document.createElement('textarea');
    ta.value = val; ta.style.position = 'fixed'; ta.style.left = '-9999px';
    document.body.appendChild(ta); ta.select(); document.execCommand('copy');
    document.body.removeChild(ta);
    showToast('Tracking # copied');
  });
}

function populateShippingCost() {
  if (!_currentRepair) return;
  var dmKey = _currentRepair.lDeliveryMethodKey;
  if (dmKey && typeof _deliveryMethods !== 'undefined') {
    var dm = _deliveryMethods.find(function(m) { return m.lDeliveryMethodKey == dmKey; });
    if (dm && dm.dblAmtShipping) {
      var el = document.getElementById('sEstShipCost');
      if (el) el.textContent = fmtMoney(dm.dblAmtShipping);
    }
  }
}

// ── Exports ──
window.renderRepairItems = renderRepairItems;
window.autoPopulateRepairLevel = autoPopulateRepairLevel;
window.updateItemTotals = updateItemTotals;
window.selectItemRow = selectItemRow;
window.renderTechsDrawer = renderTechsDrawer;
window.assignTechFromDrawer = assignTechFromDrawer;
window.bulkAssignTech = bulkAssignTech;
window.openTechsDrawer = openTechsDrawer;
window.openInvDrawer = openInvDrawer;
window.renderInvItemsList = renderInvItemsList;
window.selectInvItem = selectInvItem;
window.addInvToRepair = addInvToRepair;
window.initItemContextMenu = initItemContextMenu;
window.toggleApproval = toggleApproval;
window.toggleBlind = toggleBlind;
window.setItemComment = setItemComment;
window.approveAllItems = approveAllItems;
window.unapproveAllItems = unapproveAllItems;
window.setRepairedBy = setRepairedBy;
window.cycleUANWT = cycleUANWT;
window.uanwtPill = uanwtPill;
window.uanwtStyle = uanwtStyle;
window.cycleWNCA = cycleWNCA;
window.wncaPill = wncaPill;
window.wncaStyle = wncaStyle;
window.ctxToggleApproved = ctxToggleApproved;
window.ctxTogglePrimary = ctxTogglePrimary;
window.ctxDeleteItem = ctxDeleteItem;
window.openItemPicker = openItemPicker;
window.closeItemPicker = closeItemPicker;
window.loadItemCatalog = loadItemCatalog;
window.filterItemPicker = filterItemPicker;
window.getPickerMeta = getPickerMeta;
window.renderPickerList = renderPickerList;
window.togglePickerItem = togglePickerItem;
window.updatePickerFooter = updatePickerFooter;
window.clearPickerSelections = clearPickerSelections;
window.addSelectedItems = addSelectedItems;
window.resetMaxCharge = resetMaxCharge;
window.toggleShipSame = toggleShipSame;
window.copyTracking = copyTracking;
window.populateShippingCost = populateShippingCost;
})();
