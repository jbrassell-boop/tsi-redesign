/* ─── Repair Items Tab ───
   Part of merged instruments page. Loaded by instruments.html.
   All functions/variables prefixed with ri_ to avoid namespace collisions.
   Entry point: ri_init() — called lazily when tab first clicked.
*/

// ─── State ───────────────────────────────────────────────────────────────────
let ri_allItems      = [];
let ri_filteredItems = [];
let ri_selectedKey   = null;
let ri_selectedItem  = null;
let ri_isLive        = false;
let ri_repairLevels  = [];
let ri_repairStatuses = [];

// Active filter state
let ri_filterType   = '';
let ri_filterActive = '';

// ─── Demo data ───────────────────────────────────────────────────────────────
const ri_DEMO_ITEMS = [
  {lRepairItemKey:1,psItemDescription:'Bending Section Replacement',psTSICode:'BEND-001',psProductID:'P-BEND',psRigidOrFlexible:'F',psPartOrLabor:'L',pbActive:true,pnTurnAroundTime:3,plRepairLevelKey:2,plRepairStatusID:0,pdblAvgCostMaterial:45.00,pdblAvgCostLabor:85.00,ptMinutesTech1:45,ptMinutesTech2:60,ptMinutesTech3:75,ptMinutesTech1SmallDiameter:50,ptMinutesTech2SmallDiameter:65,ptMinutesTech3SmallDiameter:80,pbOkayToSkip:false,pbIsAdjustment:false,pbSkipPickList:false,pbProfitItemPlus:false,pbProfitItemMinus:false,pbLocked:false},
  {lRepairItemKey:2,psItemDescription:'Insertion Tube Replacement',psTSICode:'TUBE-001',psProductID:'P-TUBE',psRigidOrFlexible:'F',psPartOrLabor:'L',pbActive:true,pnTurnAroundTime:5,plRepairLevelKey:3,plRepairStatusID:0,pdblAvgCostMaterial:120.00,pdblAvgCostLabor:110.00,ptMinutesTech1:90,ptMinutesTech2:105,ptMinutesTech3:120,ptMinutesTech1SmallDiameter:100,ptMinutesTech2SmallDiameter:115,ptMinutesTech3SmallDiameter:130,pbOkayToSkip:false,pbIsAdjustment:false,pbSkipPickList:false,pbProfitItemPlus:false,pbProfitItemMinus:false,pbLocked:false},
  {lRepairItemKey:3,psItemDescription:'CCD Camera Replacement',psTSICode:'CCD-001',psProductID:'P-CCD',psRigidOrFlexible:'F',psPartOrLabor:'L',pbActive:true,pnTurnAroundTime:7,plRepairLevelKey:3,plRepairStatusID:0,pdblAvgCostMaterial:350.00,pdblAvgCostLabor:150.00,ptMinutesTech1:120,ptMinutesTech2:135,ptMinutesTech3:150,ptMinutesTech1SmallDiameter:130,ptMinutesTech2SmallDiameter:145,ptMinutesTech3SmallDiameter:160,pbOkayToSkip:false,pbIsAdjustment:false,pbSkipPickList:false,pbProfitItemPlus:false,pbProfitItemMinus:false,pbLocked:true},
  {lRepairItemKey:4,psItemDescription:'Light Guide Replacement',psTSICode:'LG-001',psProductID:'P-LG',psRigidOrFlexible:'F',psPartOrLabor:'L',pbActive:true,pnTurnAroundTime:2,plRepairLevelKey:1,plRepairStatusID:0,pdblAvgCostMaterial:25.00,pdblAvgCostLabor:40.00,ptMinutesTech1:30,ptMinutesTech2:40,ptMinutesTech3:50,ptMinutesTech1SmallDiameter:35,ptMinutesTech2SmallDiameter:45,ptMinutesTech3SmallDiameter:55,pbOkayToSkip:true,pbIsAdjustment:false,pbSkipPickList:false,pbProfitItemPlus:false,pbProfitItemMinus:false,pbLocked:false},
  {lRepairItemKey:5,psItemDescription:'Sheath Replacement - Rigid',psTSICode:'SHEATH-R01',psProductID:'P-SHR',psRigidOrFlexible:'R',psPartOrLabor:'L',pbActive:true,pnTurnAroundTime:1,plRepairLevelKey:1,plRepairStatusID:0,pdblAvgCostMaterial:15.00,pdblAvgCostLabor:30.00,ptMinutesTech1:20,ptMinutesTech2:25,ptMinutesTech3:30,ptMinutesTech1SmallDiameter:20,ptMinutesTech2SmallDiameter:25,ptMinutesTech3SmallDiameter:30,pbOkayToSkip:false,pbIsAdjustment:false,pbSkipPickList:false,pbProfitItemPlus:false,pbProfitItemMinus:false,pbLocked:false},
];

// ─── Helpers ─────────────────────────────────────────────────────────────────
function ri_setDetailSaveStatus(state, text) {
  const wrap = document.getElementById('ri_saveStatus');
  const icon = document.getElementById('ri_saveIcon');
  const txt  = document.getElementById('ri_saveText');
  wrap.className = 'save-status ' + state;
  txt.textContent = text;
}

function ri_num(val) {
  const n = parseFloat(val);
  return isNaN(n) ? 0 : n;
}

function ri_intVal(val) {
  const n = parseInt(val, 10);
  return isNaN(n) ? 0 : n;
}

// ─── Load Lookups ─────────────────────────────────────────────────────────────
async function ri_loadLookups() {
  try {
    const lvlResp = await API.getRepairLevels();
    if (lvlResp && Array.isArray(lvlResp)) ri_repairLevels = lvlResp;
  } catch(e) {
    ri_repairLevels = [
      {lRepairLevelKey:1, sRepairLevelDescription:'Level 1 - Minor'},
      {lRepairLevelKey:2, sRepairLevelDescription:'Level 2 - Moderate'},
      {lRepairLevelKey:3, sRepairLevelDescription:'Level 3 - Major'},
    ];
  }

  try {
    const stResp = await API.getRepairStatuses();
    if (stResp && Array.isArray(stResp)) ri_repairStatuses = stResp;
  } catch(e) {
    ri_repairStatuses = [
      {lRepairStatusID:1, sRepairStatusDescription:'Standard'},
      {lRepairStatusID:2, sRepairStatusDescription:'Rush'},
    ];
  }

  // Populate dropdowns
  ri_populateSelect('ri_fRepairLevel', ri_repairLevels, 'lRepairLevelKey', 'sRepairLevelDescription', '— none —');
  ri_populateSelect('ri_fRepairStatus', ri_repairStatuses, 'lRepairStatusID', 'sRepairStatusDescription', '— none —');
  ri_populateSelect('ri_mRepairLevel', ri_repairLevels, 'lRepairLevelKey', 'sRepairLevelDescription', '— none —');
}

function ri_populateSelect(id, items, keyField, labelField, blankLabel) {
  const sel = document.getElementById(id);
  if (!sel) return;
  sel.innerHTML = `<option value="">${blankLabel}</option>`;
  items.forEach(it => {
    const opt = document.createElement('option');
    opt.value = it[keyField] || '';
    opt.textContent = it[labelField] || String(it[keyField]);
    sel.appendChild(opt);
  });
}

// ─── Load Items ───────────────────────────────────────────────────────────────
async function ri_loadItems() {
  document.getElementById('ri_itemList').innerHTML = '<div class="empty-state">Loading…</div>';
  try {
    // getRepairItemsList is per-repair; use getRepairItemsCatalog for the master catalog
    const [flex, rigid] = await Promise.all([
      API.getRepairItemsCatalog('Flexible'),
      API.getRepairItemsCatalog('Rigid')
    ]);
    // Normalize catalog fields: API returns sItemDescription (not psItemDescription),
    // psRigidOrFlexible is null — inject from which catalog call returned the item.
    const norm = (items, type) => (Array.isArray(items) ? items : []).map(r => ({
      ...r,
      psItemDescription: r.psItemDescription || r.sItemDescription || '',
      psTSICode:         r.psTSICode         || r.sTSICode         || '',
      psPartOrLabor:     r.psPartOrLabor     || r.sPartOrLabor     || 'L',
      psRigidOrFlexible: r.psRigidOrFlexible || type,
      pbActive:          r.pbActive          ?? r.bActive          ?? true,
    }));
    ri_allItems = [...norm(flex, 'F'), ...norm(rigid, 'R')];
    if (ri_allItems.length === 0) throw new Error('Empty catalog response');
    showDataBadge(true);
    ri_isLive = true;
  } catch(e) {
    ri_allItems = ri_DEMO_ITEMS;
    showDataBadge(false);
    ri_isLive = false;
  }

  // Update summary stats
  const activeCount   = ri_allItems.filter(i => i.pbActive).length;
  const inactiveCount = ri_allItems.length - activeCount;
  const flexCount     = ri_allItems.filter(i => i.psRigidOrFlexible === 'F').length;
  const rigidCount    = ri_allItems.filter(i => i.psRigidOrFlexible === 'R').length;
  document.getElementById('ri_ssTotal').textContent    = ri_allItems.length;
  document.getElementById('ri_ssActive').textContent   = activeCount;
  document.getElementById('ri_ssInactive').textContent = inactiveCount;
  document.getElementById('ri_ssFlexible').textContent = flexCount;
  document.getElementById('ri_ssRigid').textContent    = rigidCount;
  document.getElementById('ri_ssLastSync').textContent = 'Last sync ' + new Date().toLocaleString('en-US', {month:'2-digit',day:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'});

  ri_applyFilters();
}

// ─── Filter & Render List ─────────────────────────────────────────────────────
function ri_setTypeFilter(val, btn) {
  ri_filterType = val;
  document.querySelectorAll('#ri_typeGroup .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ri_applyFilters();
}

function ri_setActiveFilter(val, btn) {
  ri_filterActive = val;
  document.querySelectorAll('#ri_activeGroup .seg-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  ri_applyFilters();
}

function ri_applyFilters() {
  const search = (document.getElementById('ri_searchInp').value || '').toLowerCase();

  ri_filteredItems = ri_allItems.filter(item => {
    if (ri_filterType && item.psRigidOrFlexible !== ri_filterType) return false;
    if (ri_filterActive === 'true'  && !item.pbActive) return false;
    if (ri_filterActive === 'false' &&  item.pbActive) return false;
    if (search) {
      const desc = (item.psItemDescription || '').toLowerCase();
      const code = (item.psTSICode || '').toLowerCase();
      if (!desc.includes(search) && !code.includes(search)) return false;
    }
    return true;
  });

  document.getElementById('ri_ssShowing').textContent = ri_filteredItems.length;
  document.getElementById('ri_listCount').textContent  = ri_filteredItems.length;
  ri_renderList();
}

function ri_renderList() {
  const container = document.getElementById('ri_itemList');
  if (ri_filteredItems.length === 0) {
    container.innerHTML = '<div class="empty-state">No repair items match the current filter.</div>';
    return;
  }

  const rows = ri_filteredItems.map(item => {
    const sel    = item.lRepairItemKey === ri_selectedKey ? ' selected' : '';
    const typeC  = item.psRigidOrFlexible === 'F' ? 'type-f' : 'type-r';
    const typeL  = item.psRigidOrFlexible === 'F' ? 'F' : 'R';
    const plC    = item.psPartOrLabor === 'P' ? 'pl-p' : 'pl-l';
    const plL    = item.psPartOrLabor === 'P' ? 'Part' : 'Labor';
    const dotC   = item.pbActive ? 'dot-yes' : 'dot-no';
    const code   = item.psTSICode || '—';
    const desc   = item.psItemDescription || '—';

    return `<tr class="${sel}" onclick="ri_selectItem(${item.lRepairItemKey})">
      <td style="font-family:monospace;font-size:10.5px;color:var(--blue)">${code}</td>
      <td class="td-desc" style="max-width:180px;overflow:hidden;text-overflow:ellipsis" title="${desc}">${desc}</td>
      <td><span class="type-badge ${typeC}">${typeL}</span></td>
      <td><span class="pl-badge ${plC}">${plL}</span></td>
      <td style="text-align:center"><span class="active-dot ${dotC}"></span></td>
    </tr>`;
  }).join('');

  container.innerHTML = `
    <table class="item-list">
      <thead>
        <tr>
          <th>TSI Code</th>
          <th>Description</th>
          <th>Type</th>
          <th>Part/Labor</th>
          <th style="text-align:center">Active</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>`;
}

// ─── Select Item ──────────────────────────────────────────────────────────────
async function ri_selectItem(key) {
  ri_selectedKey = key;
  ri_renderList(); // update selection highlight

  // Show detail contents
  document.getElementById('ri_detailEmpty').style.display    = 'none';
  document.getElementById('ri_detailContents').style.display = 'flex';

  ri_setDetailSaveStatus('save-ready', 'Ready');

  // Try to load detail from API first
  let item = null;
  try {
    const resp = await API.getRepairItemDetail(key);
    if (resp && resp.lRepairItemKey) {
      // Normalize detail response same as catalog (API returns sItemDescription etc.)
      item = {
        ...resp,
        psItemDescription: resp.psItemDescription || resp.sItemDescription || '',
        psTSICode:         resp.psTSICode         || resp.sTSICode         || '',
        psPartOrLabor:     resp.psPartOrLabor     || resp.sPartOrLabor     || 'L',
        psRigidOrFlexible: resp.psRigidOrFlexible || resp.sRigidOrFlexible || '',
      };
    } else {
      throw new Error('empty');
    }
  } catch(e) {
    item = ri_allItems.find(i => i.lRepairItemKey === key) || null;
  }

  if (!item) return;
  ri_selectedItem = item;
  ri_populateDetail(item);
}

function ri_populateDetail(item) {
  // Header
  document.getElementById('ri_dhTitle').textContent    = item.psItemDescription || '(unnamed)';
  document.getElementById('ri_dhTsiCode').textContent  = item.psTSICode || '—';

  const pid = document.getElementById('ri_dhProductId');
  if (item.psProductID) {
    pid.textContent  = item.psProductID;
    pid.style.display = '';
  } else {
    pid.style.display = 'none';
  }

  const typeC = item.psRigidOrFlexible === 'F' ? 'type-f' : 'type-r';
  const typeL = item.psRigidOrFlexible === 'F' ? 'Flexible' : 'Rigid';
  document.getElementById('ri_dhTypeBadge').innerHTML = `<span class="type-badge ${typeC}">${typeL}</span>`;

  const plC = item.psPartOrLabor === 'P' ? 'pl-p' : 'pl-l';
  const plL = item.psPartOrLabor === 'P' ? 'Part' : 'Labor';
  document.getElementById('ri_dhPlBadge').innerHTML = `<span class="pl-badge ${plC}">${plL}</span>`;

  // Overview fields
  document.getElementById('ri_fDescription').value = item.psItemDescription || '';
  document.getElementById('ri_fTsiCode').value      = item.psTSICode || '';
  document.getElementById('ri_fProductId').value    = item.psProductID || '';
  document.getElementById('ri_fType').value         = item.psRigidOrFlexible || 'F';
  document.getElementById('ri_fPartOrLabor').value  = item.psPartOrLabor || 'L';
  document.getElementById('ri_fRepairLevel').value  = item.plRepairLevelKey || '';
  document.getElementById('ri_fRepairStatus').value = item.plRepairStatusID || '';
  document.getElementById('ri_fTurnaround').value   = item.pnTurnAroundTime || 0;

  // Pricing & Time
  document.getElementById('ri_fCostMaterial').value = item.pdblAvgCostMaterial != null ? item.pdblAvgCostMaterial.toFixed(2) : '0.00';
  document.getElementById('ri_fCostLabor').value    = item.pdblAvgCostLabor != null ? item.pdblAvgCostLabor.toFixed(2) : '0.00';
  document.getElementById('ri_fT1').value   = item.ptMinutesTech1 || 0;
  document.getElementById('ri_fT2').value   = item.ptMinutesTech2 || 0;
  document.getElementById('ri_fT3').value   = item.ptMinutesTech3 || 0;
  document.getElementById('ri_fT1SD').value = item.ptMinutesTech1SmallDiameter || 0;
  document.getElementById('ri_fT2SD').value = item.ptMinutesTech2SmallDiameter || 0;
  document.getElementById('ri_fT3SD').value = item.ptMinutesTech3SmallDiameter || 0;

  // Flags
  document.getElementById('ri_fActive').checked        = !!item.pbActive;
  document.getElementById('ri_fOkayToSkip').checked    = !!item.pbOkayToSkip;
  document.getElementById('ri_fIsAdjustment').checked  = !!item.pbIsAdjustment;
  document.getElementById('ri_fSkipPickList').checked  = !!item.pbSkipPickList;
  document.getElementById('ri_fProfitPlus').checked    = !!item.pbProfitItemPlus;
  document.getElementById('ri_fProfitMinus').checked   = !!item.pbProfitItemMinus;
  document.getElementById('ri_fLocked').checked        = !!item.pbLocked;
}

// ─── Save ─────────────────────────────────────────────────────────────────────
async function ri_saveCurrentItem() {
  if (!ri_selectedItem) return;

  const payload = {
    plRepairItemKey:          ri_selectedItem.lRepairItemKey,
    psItemDescription:        document.getElementById('ri_fDescription').value.trim(),
    psTSICode:                document.getElementById('ri_fTsiCode').value.trim(),
    psProductID:              document.getElementById('ri_fProductId').value.trim(),
    psRigidOrFlexible:        document.getElementById('ri_fType').value,
    psPartOrLabor:            document.getElementById('ri_fPartOrLabor').value,
    pnTurnAroundTime:         ri_intVal(document.getElementById('ri_fTurnaround').value),
    plRepairLevelKey:         ri_intVal(document.getElementById('ri_fRepairLevel').value),
    plRepairStatusID:         ri_intVal(document.getElementById('ri_fRepairStatus').value),
    pbActive:                 document.getElementById('ri_fActive').checked,
    pdblAvgCostMaterial:      ri_num(document.getElementById('ri_fCostMaterial').value),
    pdblAvgCostLabor:         ri_num(document.getElementById('ri_fCostLabor').value),
    ptMinutesTech1:           ri_intVal(document.getElementById('ri_fT1').value),
    ptMinutesTech2:           ri_intVal(document.getElementById('ri_fT2').value),
    ptMinutesTech3:           ri_intVal(document.getElementById('ri_fT3').value),
    ptMinutesTech1SmallDiameter: ri_intVal(document.getElementById('ri_fT1SD').value),
    ptMinutesTech2SmallDiameter: ri_intVal(document.getElementById('ri_fT2SD').value),
    ptMinutesTech3SmallDiameter: ri_intVal(document.getElementById('ri_fT3SD').value),
    pbOkayToSkip:             document.getElementById('ri_fOkayToSkip').checked,
    pbIsAdjustment:           document.getElementById('ri_fIsAdjustment').checked,
    pbSkipPickList:           document.getElementById('ri_fSkipPickList').checked,
    pbProfitItemPlus:         document.getElementById('ri_fProfitPlus').checked,
    pbProfitItemMinus:        document.getElementById('ri_fProfitMinus').checked,
    pbLocked:                 document.getElementById('ri_fLocked').checked,
  };

  if (!payload.psItemDescription) {
    ri_setDetailSaveStatus('save-error', 'Description required');
    return;
  }

  ri_setDetailSaveStatus('save-saving', 'Saving…');

  try {
    await API.updateRepairItem(payload);

    // Update local state
    Object.assign(ri_selectedItem, {
      psItemDescription:    payload.psItemDescription,
      psTSICode:            payload.psTSICode,
      psProductID:          payload.psProductID,
      psRigidOrFlexible:    payload.psRigidOrFlexible,
      psPartOrLabor:        payload.psPartOrLabor,
      pnTurnAroundTime:     payload.pnTurnAroundTime,
      plRepairLevelKey:     payload.plRepairLevelKey,
      plRepairStatusID:     payload.plRepairStatusID,
      pbActive:             payload.pbActive,
      pdblAvgCostMaterial:  payload.pdblAvgCostMaterial,
      pdblAvgCostLabor:     payload.pdblAvgCostLabor,
      ptMinutesTech1:       payload.ptMinutesTech1,
      ptMinutesTech2:       payload.ptMinutesTech2,
      ptMinutesTech3:       payload.ptMinutesTech3,
      ptMinutesTech1SmallDiameter: payload.ptMinutesTech1SmallDiameter,
      ptMinutesTech2SmallDiameter: payload.ptMinutesTech2SmallDiameter,
      ptMinutesTech3SmallDiameter: payload.ptMinutesTech3SmallDiameter,
      pbOkayToSkip:         payload.pbOkayToSkip,
      pbIsAdjustment:       payload.pbIsAdjustment,
      pbSkipPickList:       payload.pbSkipPickList,
      pbProfitItemPlus:     payload.pbProfitItemPlus,
      pbProfitItemMinus:    payload.pbProfitItemMinus,
      pbLocked:             payload.pbLocked,
    });
    // sync into ri_allItems
    const idx = ri_allItems.findIndex(i => i.lRepairItemKey === ri_selectedItem.lRepairItemKey);
    if (idx >= 0) ri_allItems[idx] = Object.assign({}, ri_allItems[idx], ri_selectedItem);

    ri_setDetailSaveStatus('save-saved', 'Saved at ' + new Date().toLocaleTimeString('en-US', {hour:'2-digit',minute:'2-digit'}));
    // Refresh header
    document.getElementById('ri_dhTitle').textContent = payload.psItemDescription;
    document.getElementById('ri_dhTsiCode').textContent = payload.psTSICode || '—';
    // Refresh list row
    ri_applyFilters();
  } catch(e) {
    if (ri_isLive) {
      ri_setDetailSaveStatus('save-error', 'Save failed');
    } else {
      // Demo mode — update in-memory only
      const idx = ri_allItems.findIndex(i => i.lRepairItemKey === ri_selectedItem.lRepairItemKey);
      if (idx >= 0) {
        ri_allItems[idx] = Object.assign({}, ri_allItems[idx], {
          psItemDescription:    payload.psItemDescription,
          psTSICode:            payload.psTSICode,
          psProductID:          payload.psProductID,
          psRigidOrFlexible:    payload.psRigidOrFlexible,
          psPartOrLabor:        payload.psPartOrLabor,
          pbActive:             payload.pbActive,
          pnTurnAroundTime:     payload.pnTurnAroundTime,
          plRepairLevelKey:     payload.plRepairLevelKey,
          pdblAvgCostMaterial:  payload.pdblAvgCostMaterial,
          pdblAvgCostLabor:     payload.pdblAvgCostLabor,
          ptMinutesTech1:       payload.ptMinutesTech1,
          ptMinutesTech2:       payload.ptMinutesTech2,
          ptMinutesTech3:       payload.ptMinutesTech3,
          ptMinutesTech1SmallDiameter: payload.ptMinutesTech1SmallDiameter,
          ptMinutesTech2SmallDiameter: payload.ptMinutesTech2SmallDiameter,
          ptMinutesTech3SmallDiameter: payload.ptMinutesTech3SmallDiameter,
          pbOkayToSkip:         payload.pbOkayToSkip,
          pbIsAdjustment:       payload.pbIsAdjustment,
          pbSkipPickList:       payload.pbSkipPickList,
          pbProfitItemPlus:     payload.pbProfitItemPlus,
          pbProfitItemMinus:    payload.pbProfitItemMinus,
          pbLocked:             payload.pbLocked,
        });
        ri_selectedItem = ri_allItems[idx];
      }
      ri_setDetailSaveStatus('save-saved', 'Saved (demo)');
      document.getElementById('ri_dhTitle').textContent = payload.psItemDescription;
      document.getElementById('ri_dhTsiCode').textContent = payload.psTSICode || '—';
      ri_applyFilters();
    }
  }
}

// ─── Delete ───────────────────────────────────────────────────────────────────
function ri_deleteCurrentItem() {
  if (!ri_selectedItem) return;
  document.getElementById('ri_deleteItemName').textContent = ri_selectedItem.psItemDescription || 'this item';
  document.getElementById('ri_deleteModal').classList.add('open');
}

function ri_closeDeleteModal() {
  document.getElementById('ri_deleteModal').classList.remove('open');
}

async function ri_confirmDelete() {
  if (!ri_selectedItem) return;
  const key = ri_selectedItem.lRepairItemKey;
  ri_closeDeleteModal();

  try {
    await API.deleteRepairItem(key);
  } catch(e) {
    // Demo mode — just remove locally
  }

  ri_allItems = ri_allItems.filter(i => i.lRepairItemKey !== key);
  ri_selectedKey  = null;
  ri_selectedItem = null;
  document.getElementById('ri_detailEmpty').style.display    = '';
  document.getElementById('ri_detailContents').style.display = 'none';
  ri_applyFilters();

  // Update stats
  const activeCount   = ri_allItems.filter(i => i.pbActive).length;
  document.getElementById('ri_ssTotal').textContent    = ri_allItems.length;
  document.getElementById('ri_ssActive').textContent   = activeCount;
  document.getElementById('ri_ssInactive').textContent = ri_allItems.length - activeCount;
  document.getElementById('ri_ssFlexible').textContent = ri_allItems.filter(i => i.psRigidOrFlexible === 'F').length;
  document.getElementById('ri_ssRigid').textContent    = ri_allItems.filter(i => i.psRigidOrFlexible === 'R').length;
}

// ─── Add Modal ────────────────────────────────────────────────────────────────
function ri_openAddModal() {
  document.getElementById('ri_mDescription').value  = '';
  document.getElementById('ri_mTsiCode').value      = '';
  document.getElementById('ri_mProductId').value    = '';
  document.getElementById('ri_mType').value         = 'F';
  document.getElementById('ri_mPartOrLabor').value  = 'L';
  document.getElementById('ri_mTurnaround').value   = '1';
  document.getElementById('ri_mRepairLevel').value  = '';
  document.getElementById('ri_addModalError').style.display = 'none';
  document.getElementById('ri_addModal').classList.add('open');
  setTimeout(() => document.getElementById('ri_mDescription').focus(), 80);
}

function ri_closeAddModal() {
  document.getElementById('ri_addModal').classList.remove('open');
}

async function ri_submitAddItem() {
  const desc = document.getElementById('ri_mDescription').value.trim();
  if (!desc) {
    const err = document.getElementById('ri_addModalError');
    err.textContent = 'Description is required.';
    err.style.display = '';
    return;
  }

  const payload = {
    psItemDescription: desc,
    psTSICode:         document.getElementById('ri_mTsiCode').value.trim(),
    psProductID:       document.getElementById('ri_mProductId').value.trim(),
    psRigidOrFlexible: document.getElementById('ri_mType').value,
    psPartOrLabor:     document.getElementById('ri_mPartOrLabor').value,
    pnTurnAroundTime:  ri_intVal(document.getElementById('ri_mTurnaround').value),
    plRepairLevelKey:  ri_intVal(document.getElementById('ri_mRepairLevel').value),
    pbActive:          true,
    pdblAvgCostMaterial: 0, pdblAvgCostLabor: 0,
    ptMinutesTech1: 0, ptMinutesTech2: 0, ptMinutesTech3: 0,
    ptMinutesTech1SmallDiameter: 0, ptMinutesTech2SmallDiameter: 0, ptMinutesTech3SmallDiameter: 0,
    pbOkayToSkip: false, pbIsAdjustment: false, pbSkipPickList: false,
    pbProfitItemPlus: false, pbProfitItemMinus: false, pbLocked: false,
  };

  let newKey = null;
  try {
    const resp = await API.addRepairItem(payload);
    if (resp && resp.lRepairItemKey) newKey = resp.lRepairItemKey;
    else if (resp && resp.data && resp.data.lRepairItemKey) newKey = resp.data.lRepairItemKey;
  } catch(e) {
    // Demo fallback — assign local key
    newKey = Math.max(0, ...ri_allItems.map(i => i.lRepairItemKey)) + 1;
  }

  if (!newKey) newKey = Math.max(0, ...ri_allItems.map(i => i.lRepairItemKey)) + 1;

  const newItem = Object.assign({lRepairItemKey: newKey, plRepairStatusID: 0}, payload);
  ri_allItems.push(newItem);
  ri_closeAddModal();

  // Update stats
  const activeCount = ri_allItems.filter(i => i.pbActive).length;
  document.getElementById('ri_ssTotal').textContent    = ri_allItems.length;
  document.getElementById('ri_ssActive').textContent   = activeCount;
  document.getElementById('ri_ssInactive').textContent = ri_allItems.length - activeCount;
  document.getElementById('ri_ssFlexible').textContent = ri_allItems.filter(i => i.psRigidOrFlexible === 'F').length;
  document.getElementById('ri_ssRigid').textContent    = ri_allItems.filter(i => i.psRigidOrFlexible === 'R').length;

  ri_applyFilters();
  ri_selectItem(newKey);
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function ri_switchTab(name, btn) {
  document.querySelectorAll('.ri-tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.ri-pane').forEach(p => p.classList.remove('active'));
  btn.classList.add('active');
  const pane = document.getElementById('ri_pane-' + name);
  if (pane) pane.classList.add('active');
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function ri_init() {
  await ri_loadLookups();
  await ri_loadItems();
}
