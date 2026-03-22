/* ─── Instrument Repairs Tab ───
   Part of merged instruments page. Loaded by instruments.html.
   All functions/variables prefixed with ir_ to avoid namespace collisions.
   Entry point: ir_initPage() — called lazily when tab first clicked.
*/

// ─── State ────────────────────────────────────────────────────────────────────
var ir_allRepairs    = (typeof MockDB !== 'undefined' ? MockDB.getAll('instrumentRepairs') : []).map(function(r){ return JSON.parse(JSON.stringify(r)); });
var ir_filtered      = [];
var ir_display       = [];
var ir_selectedId    = null;
var ir_currentPage   = 1;
var ir_pageSize      = 25;
var ir_sortCol       = 'orderNum';
var ir_sortDir       = 'desc';
var ir_filterStatus  = '';
var ir_searchTerm    = '';
var ir_searchTimer   = null;
var ir_isDirty       = false;
var ir_saveTimer     = null;
var ir_wizStep       = 1;
var ir_wizClient     = null;
var ir_wizDept       = null;
var ir_wizClients    = [];
var ir_wizDepts      = [];
var ir_nextOrderNum  = 9;

// ─── Helpers ──────────────────────────────────────────────────────────────────
function ir_esc(s) {
  return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function ir_fmtDate(d) {
  if (!d) return '—';
  var p = d.split('-');
  return (p[1]||'')+'/'+(p[2]||'')+'/'+(p[0]||'');
}

function ir_orderTotal(r) {
  return r.items.reduce(function(s,i){ return s + (i.amount||0); }, 0);
}

function ir_dueClass(r) {
  if (r.status === 'Complete' || r.status === 'Invoiced') return '';
  if (!r.dateDue) return '';
  var today = new Date(); today.setHours(0,0,0,0);
  var due   = new Date(r.dateDue);
  var diff  = Math.round((due - today) / 86400000);
  if (diff < 0)  return 'overdue';
  if (diff <= 1) return 'due-soon';
  return '';
}

function ir_statusBadge(s) {
  var map = {
    'Received':    'ir-b-received',
    'In Progress': 'ir-b-inprog',
    'Outsourced':  'ir-b-out',
    'On Hold':     'ir-b-hold',
    'Complete':    'ir-b-complete',
    'Invoiced':    'ir-b-invoiced'
  };
  return '<span class="ir-badge ' + (map[s]||'ir-b-received') + '">' + ir_esc(s) + '</span>';
}

function ir_itemStatusBadge(s) {
  var map = {
    'Received':    'ir-b-received',
    'In Progress': 'ir-b-inprog',
    'Outsourced':  'ir-b-out',
    'On Hold':     'ir-b-hold',
    'Complete':    'ir-b-complete'
  };
  return '<span class="ir-badge ' + (map[s]||'ir-b-received') + '" style="font-size:9px">' + ir_esc(s) + '</span>';
}

// ─── Init ─────────────────────────────────────────────────────────────────────
function ir_initPage() {
  showDataBadge(false);
  ir_applyFilters();
}

// ─── Filtering / Sorting / Paging ─────────────────────────────────────────────
function ir_applyFilters() {
  var s = ir_searchTerm.toLowerCase();
  ir_filtered = ir_allRepairs.filter(function(r) {
    if (ir_filterStatus && r.status !== ir_filterStatus) return false;
    if (s && !(
      r.orderNum.toLowerCase().includes(s) ||
      r.clientName.toLowerCase().includes(s) ||
      r.deptName.toLowerCase().includes(s) ||
      (r.poNumber||'').toLowerCase().includes(s) ||
      (r.quoteRef||'').toLowerCase().includes(s)
    )) return false;
    return true;
  });
  ir_applySort();
  ir_updateKPIs();
  ir_currentPage = 1;
  ir_paginate();
  ir_renderTable();
  ir_updatePagination();
}

function ir_applySort() {
  if (!ir_sortCol) return;
  ir_filtered.sort(function(a, b) {
    var av, bv;
    if (ir_sortCol === 'total') { av = ir_orderTotal(a); bv = ir_orderTotal(b); }
    else if (ir_sortCol === 'items') { av = a.items.length; bv = b.items.length; }
    else { av = a[ir_sortCol]||''; bv = b[ir_sortCol]||''; }
    if (typeof av === 'number') return ir_sortDir === 'asc' ? av - bv : bv - av;
    return ir_sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

function ir_paginate() {
  ir_display = ir_filtered.slice((ir_currentPage-1)*ir_pageSize, ir_currentPage*ir_pageSize);
}

function ir_sortBy(col) {
  if (ir_sortCol === col) ir_sortDir = ir_sortDir === 'asc' ? 'desc' : 'asc';
  else { ir_sortCol = col; ir_sortDir = 'asc'; }
  ir_applySort(); ir_paginate(); ir_renderTable(); ir_updatePagination();
  // Update sort indicators on <th> elements
  var table = document.getElementById('ir_tableBody');
  if (table) {
    var thead = table.closest('table').querySelector('thead');
    if (thead) {
      thead.querySelectorAll('th').forEach(function(th) { th.classList.remove('sorted','asc','desc'); });
      var cols = ['orderNum','clientName','deptName','dateReceived','dateDue','items','total','status'];
      var idx = cols.indexOf(col);
      if (idx >= 0) {
        var ths = thead.querySelectorAll('th');
        if (ths[idx]) { ths[idx].classList.add('sorted', ir_sortDir); }
      }
    }
  }
}

function ir_chipFilter(status) {
  ir_filterStatus = status;
  document.querySelectorAll('#ir_statStrip .stat-chip').forEach(function(c){ c.classList.remove('active-chip'); });
  var map = {
    '':           'ir_kpiAll',
    'Received':   'ir_kpiReceived',
    'In Progress':'ir_kpiInprog',
    'Outsourced': 'ir_kpiOut',
    'On Hold':    'ir_kpiHold',
    'Complete':   'ir_kpiComplete',
    'Invoiced':   'ir_kpiInvoiced'
  };
  var el = document.getElementById(map[status]);
  if (el) el.classList.add('active-chip');
  ir_currentPage = 1; ir_applyFilters();
}

function ir_debounceSearch() {
  clearTimeout(ir_searchTimer);
  ir_searchTimer = setTimeout(function() {
    ir_searchTerm = document.getElementById('ir_searchInput').value;
    ir_currentPage = 1; ir_applyFilters();
  }, 280);
}

// ─── KPIs ─────────────────────────────────────────────────────────────────────
function ir_updateKPIs() {
  var counts = {'Received':0,'In Progress':0,'Outsourced':0,'On Hold':0,'Complete':0,'Invoiced':0};
  var totalValue = 0;
  ir_allRepairs.forEach(function(r) {
    if (counts[r.status] !== undefined) counts[r.status]++;
    totalValue += ir_orderTotal(r);
  });
  document.getElementById('ir_kpiAllVal').textContent       = ir_allRepairs.length;
  document.getElementById('ir_kpiReceivedVal').textContent  = counts['Received'];
  document.getElementById('ir_kpiInprogVal').textContent    = counts['In Progress'];
  document.getElementById('ir_kpiOutVal').textContent       = counts['Outsourced'];
  document.getElementById('ir_kpiHoldVal').textContent      = counts['On Hold'];
  document.getElementById('ir_kpiCompleteVal').textContent  = counts['Complete'];
  document.getElementById('ir_kpiInvoicedVal').textContent  = counts['Invoiced'];
  document.getElementById('ir_kpiValueVal').textContent     = fmtCur(totalValue);
}

// ─── Render Table ─────────────────────────────────────────────────────────────
function ir_renderTable() {
  var tbody = document.getElementById('ir_tableBody');
  if (!ir_display.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:24px;color:var(--muted)">No repairs match the current filters.</td></tr>';
    document.getElementById('ir_recordInfo').textContent = '0 records';
    return;
  }
  tbody.innerHTML = ir_display.map(function(r) {
    var tot = ir_orderTotal(r);
    var dueC = ir_dueClass(r);
    var dueTd = '<td>' + ir_fmtDate(r.dateDue) + '</td>';
    var trClass = (r.id === ir_selectedId ? 'selected' : '') + (dueC==='overdue' ? ' ir-overdue' : dueC==='due-soon' ? ' ir-due-soon' : '');
    return '<tr class="' + trClass.trim() + '" onclick="ir_openDrawer(' + r.id + ')">' +
      '<td><span class="code-link">' + ir_esc(r.orderNum) + '</span>' + (r.quoteRef ? ' <span class="ir-ref-link" title="Quote: ' + ir_esc(r.quoteRef) + '">&#x1F517;</span>' : '') + '</td>' +
      '<td title="' + ir_esc(r.clientName) + '">' + ir_esc(r.clientName) + '</td>' +
      '<td title="' + ir_esc(r.deptName) + '">' + ir_esc(r.deptName) + '</td>' +
      '<td>' + ir_fmtDate(r.dateReceived) + '</td>' +
      dueTd +
      '<td style="text-align:center">' + r.items.length + '</td>' +
      '<td style="font-weight:600">' + (tot > 0 ? fmtCur(tot) : '<span style="color:var(--muted)">—</span>') + '</td>' +
      '<td>' + ir_statusBadge(r.status) + '</td>' +
      '</tr>';
  }).join('');
  var total = ir_filtered.length;
  var start = (ir_currentPage-1)*ir_pageSize+1;
  var end   = Math.min(ir_currentPage*ir_pageSize, total);
  document.getElementById('ir_recordInfo').textContent = total + ' record' + (total!==1?'s':'') + (total > ir_pageSize ? ' (showing '+start+'–'+end+')' : '');
}

function ir_updatePagination() {
  var totalPages = Math.ceil(ir_filtered.length / ir_pageSize);
  var pg = document.getElementById('ir_pagination');
  if (totalPages <= 1) { pg.innerHTML = ''; return; }
  var html = '<button class="pg-btn" onclick="ir_gotoPage('+(ir_currentPage-1)+')" '+(ir_currentPage===1?'disabled':'')+'>&#8592;</button>';
  for (var i = 1; i <= totalPages; i++) {
    if (i===1 || i===totalPages || Math.abs(i-ir_currentPage)<=1) {
      html += '<button class="pg-btn'+(i===ir_currentPage?' active':'')+'" onclick="ir_gotoPage('+i+')">'+i+'</button>';
    } else if (Math.abs(i-ir_currentPage)===2) { html += '<span style="padding:0 3px;color:var(--muted)">…</span>'; }
  }
  html += '<button class="pg-btn" onclick="ir_gotoPage('+(ir_currentPage+1)+')" '+(ir_currentPage===totalPages?'disabled':'')+'>&#8594;</button>';
  pg.innerHTML = html;
}

function ir_gotoPage(p) {
  var totalPages = Math.ceil(ir_filtered.length / ir_pageSize);
  if (p < 1 || p > totalPages) return;
  ir_currentPage = p; ir_paginate(); ir_renderTable(); ir_updatePagination();
}

// ─── Drawer ───────────────────────────────────────────────────────────────────
function ir_openDrawer(id) {
  ir_selectedId = id;
  var r = ir_allRepairs.find(function(x){ return x.id === id; });
  if (!r) return;
  ir_populateDrawer(r);
  document.getElementById('ir_drawer').classList.add('open');
  document.getElementById('ir_drawerOverlay').classList.add('open');
  ir_renderTable();
}

function ir_closeDrawer() {
  document.getElementById('ir_drawer').classList.remove('open');
  document.getElementById('ir_drawerOverlay').classList.remove('open');
  ir_selectedId = null;
  ir_renderTable();
}

function ir_populateDrawer(r) {
  document.getElementById('ir_dhOrderNum').textContent   = r.orderNum;
  document.getElementById('ir_dhSub').textContent        = r.clientName + ' — ' + r.deptName;
  document.getElementById('ir_dhStatusBadge').innerHTML  = ir_statusBadge(r.status);

  document.getElementById('ir_dStatus').value       = r.status;
  document.getElementById('ir_dDateReceived').value = r.dateReceived || '';
  document.getElementById('ir_dDateDue').value      = r.dateDue || '';
  document.getElementById('ir_dDateCompleted').value= r.dateCompleted || '';
  document.getElementById('ir_dClient').value       = r.clientName;
  document.getElementById('ir_dDept').value         = r.deptName;
  document.getElementById('ir_dPoNumber').value     = r.poNumber || '';
  document.getElementById('ir_dQuoteRef').value     = r.quoteRef || '';
  document.getElementById('ir_dTechAssigned').value = r.techAssigned || '';
  document.getElementById('ir_dNotes').value        = r.notes || '';

  // Show/hide date completed based on status
  var compRow = document.getElementById('ir_dCompletedRow');
  var isClosing = (r.status === 'Complete' || r.status === 'Invoiced');
  compRow.style.display = isClosing ? '' : 'none';

  ir_renderDrawerItems(r);
  ir_renderDrawerOutsource(r);
  ir_setSaveStatus('', '');
  ir_isDirty = false;
  ir_drawerSwitchTab('details', document.querySelector('#ir_drawer .ir-dtab'));
}

function ir_onStatusChange() {
  var s = document.getElementById('ir_dStatus').value;
  var compRow = document.getElementById('ir_dCompletedRow');
  compRow.style.display = (s === 'Complete' || s === 'Invoiced') ? '' : 'none';
  ir_markDirty();
}

// ─── Drawer Item List ─────────────────────────────────────────────────────────
function ir_renderDrawerItems(r) {
  var tbody = document.getElementById('ir_itemsBody');
  if (!r.items || !r.items.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--muted);font-size:11px">No items on this order.</td></tr>';
    ir_updateDrawerTotals(r);
    return;
  }
  tbody.innerHTML = r.items.map(function(item, idx) {
    var lvlLabel = item.repairLevel ? 'L' + item.repairLevel : 'N/A';
    return '<tr>' +
      '<td><span style="font-family:monospace;font-size:10.5px;color:var(--blue)">' + ir_esc(item.instrCode) + '</span></td>' +
      '<td><div style="font-size:10.5px;font-weight:600;color:var(--navy)">' + ir_esc(item.mfr) + '</div>' +
          '<div style="font-size:9.5px;color:var(--muted)">' + ir_esc(item.model) + ' · ' + ir_esc(item.serial) + '</div></td>' +
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ir_esc(item.description) + '">' + ir_esc(item.description) + '</td>' +
      '<td style="text-align:center"><span class="ir-lvl-badge">' + lvlLabel + '</span></td>' +
      '<td style="text-align:right;font-weight:600">' + (item.amount > 0 ? fmtCur(item.amount) : '<span style="color:var(--muted)">—</span>') + '</td>' +
      '<td>' + (item.outsource ? '<span class="ir-out-dot" title="Outsourced to: ' + ir_esc(item.outsourceVendor||'TBD') + '">&#x21A5;</span>' : '') + '</td>' +
      '<td>' + ir_itemStatusBadge(item.status) + '</td>' +
      '<td><button class="del-btn" onclick="ir_removeItem(' + idx + ')" title="Remove">&#x2715;</button></td>' +
      '</tr>';
  }).join('');
  ir_updateDrawerTotals(r);
}

function ir_addItem() {
  var r = ir_allRepairs.find(function(x){ return x.id === ir_selectedId; });
  if (!r) return;
  var newId = r.items.length ? Math.max.apply(null, r.items.map(function(i){ return i.id; })) + 1 : 1;
  r.items.push({id:newId,instrCode:'',mfr:'',model:'',serial:'',description:'',repairLevel:null,amount:0,status:'Received',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''});
  ir_markDirty(); ir_renderDrawerItems(r); ir_renderDrawerOutsource(r);
}

function ir_removeItem(idx) {
  var r = ir_allRepairs.find(function(x){ return x.id === ir_selectedId; });
  if (!r) return;
  r.items.splice(idx, 1);
  ir_markDirty(); ir_renderDrawerItems(r); ir_renderDrawerOutsource(r);
}

function ir_updateDrawerTotals(r) {
  var total = 0, complete = 0, inprog = 0, outsourced = 0;
  (r.items||[]).forEach(function(i) {
    total += i.amount || 0;
    if (i.status === 'Complete') complete++;
    else if (i.status === 'In Progress') inprog++;
    else if (i.status === 'Outsourced') outsourced++;
  });
  document.getElementById('ir_qtItems').textContent    = (r.items||[]).length;
  document.getElementById('ir_qtComplete').textContent = complete;
  document.getElementById('ir_qtInprog').textContent   = inprog;
  document.getElementById('ir_qtOut').textContent      = outsourced;
  document.getElementById('ir_qtTotal').textContent    = fmtCur(total);
}

// ─── Drawer Outsource Tab ─────────────────────────────────────────────────────
function ir_renderDrawerOutsource(r) {
  var items = (r.items||[]).filter(function(i){ return i.outsource; });
  var el = document.getElementById('ir_outsourceContent');
  if (!items.length) {
    el.innerHTML = '<div class="ir-out-empty">No items marked for outsource on this order.</div>';
    return;
  }
  var totCost = 0, totBilled = 0;
  var rows = items.map(function(item) {
    totCost   += item.outsourceCost || 0;
    totBilled += item.amount || 0;
    var margin = (item.amount||0) - (item.outsourceCost||0);
    var mClass = margin >= 0 ? 'ir-margin-pos' : 'ir-margin-neg';
    return '<tr>' +
      '<td><span style="font-family:monospace;font-size:10.5px;color:var(--blue)">' + ir_esc(item.instrCode) + '</span>' +
          '<div style="font-size:9.5px;color:var(--muted)">' + ir_esc(item.mfr) + ' ' + ir_esc(item.model) + '</div></td>' +
      '<td>' + ir_esc(item.outsourceVendor||'—') + '</td>' +
      '<td style="text-align:right">' + fmtCur(item.outsourceCost||0) + '</td>' +
      '<td style="text-align:right;font-weight:600">' + fmtCur(item.amount||0) + '</td>' +
      '<td class="' + mClass + '" style="text-align:right">' + fmtCur(margin) + '</td>' +
      '<td>' + ir_itemStatusBadge(item.status) + '</td>' +
      '</tr>';
  }).join('');
  var totMargin = totBilled - totCost;
  var totMClass = totMargin >= 0 ? 'ir-margin-pos' : 'ir-margin-neg';
  el.innerHTML = '<table class="ir-out-table">' +
    '<thead><tr><th>Instrument</th><th>Vendor</th><th>Our Cost</th><th>Billed</th><th>Margin</th><th>Status</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr class="ir-out-total"><td colspan="2">Totals</td>' +
      '<td style="text-align:right">' + fmtCur(totCost) + '</td>' +
      '<td style="text-align:right;font-weight:600">' + fmtCur(totBilled) + '</td>' +
      '<td class="' + totMClass + '" style="text-align:right">' + fmtCur(totMargin) + '</td>' +
      '<td></td></tr></tfoot>' +
    '</table>';
}

// ─── Drawer Tab Switching ─────────────────────────────────────────────────────
function ir_drawerSwitchTab(name, btn) {
  document.querySelectorAll('#ir_drawer .ir-dtab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('#ir_drawer .ir-dpane').forEach(function(p){ p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var pane = document.getElementById('ir_dpane-' + name);
  if (pane) pane.classList.add('active');
}

// ─── Save / Dirty ─────────────────────────────────────────────────────────────
function ir_markDirty() {
  ir_isDirty = true;
  ir_setSaveStatus('dirty', 'Unsaved changes');
  clearTimeout(ir_saveTimer);
  ir_saveTimer = setTimeout(ir_autoSave, 2000);
}

function ir_autoSave() { if (ir_isDirty) ir_saveDrawer(true); }

function ir_saveDrawer(silent) {
  var r = ir_allRepairs.find(function(x){ return x.id === ir_selectedId; });
  if (!r) return;
  r.status        = document.getElementById('ir_dStatus').value;
  r.dateReceived  = document.getElementById('ir_dDateReceived').value;
  r.dateDue       = document.getElementById('ir_dDateDue').value;
  r.dateCompleted = document.getElementById('ir_dDateCompleted').value || null;
  r.poNumber      = document.getElementById('ir_dPoNumber').value;
  r.quoteRef      = document.getElementById('ir_dQuoteRef').value;
  r.techAssigned  = document.getElementById('ir_dTechAssigned').value;
  r.notes         = document.getElementById('ir_dNotes').value;
  document.getElementById('ir_dhStatusBadge').innerHTML = ir_statusBadge(r.status);
  ir_isDirty = false;
  ir_setSaveStatus('saved', 'Saved');
  if (!silent) { setTimeout(function(){ ir_setSaveStatus('', ''); }, 2500); }
  ir_updateKPIs(); ir_renderTable();
}

function ir_setSaveStatus(state, msg) {
  var el = document.getElementById('ir_drawerSaveStatus');
  el.textContent = msg;
  el.style.color = state==='saved' ? 'var(--green)' : state==='dirty' ? 'var(--amber)' : 'var(--muted)';
}

function ir_deleteRepair(btn) {
  var r = ir_allRepairs.find(function(x){ return x.id === ir_selectedId; });
  if (!r) return;
  if (!btn) return;
  if (btn.dataset.confirming) {
    ir_allRepairs = ir_allRepairs.filter(function(x){ return x.id !== ir_selectedId; });
    ir_closeDrawer(); ir_applyFilters(); ir_updateKPIs();
    return;
  }
  btn.dataset.confirming = '1';
  var orig = btn.innerHTML;
  btn.innerHTML = 'Sure?';
  btn.style.color = '#fff';
  btn.style.background = 'var(--red)';
  setTimeout(function() {
    delete btn.dataset.confirming;
    btn.innerHTML = orig;
    btn.style.color = '';
    btn.style.background = '';
  }, 2500);
}

// ─── New Repair Wizard ────────────────────────────────────────────────────────
async function ir_newRepair() {
  ir_wizStep = 1; ir_wizClient = null; ir_wizDept = null;
  // Load clients + departments from API if not cached
  if (!ir_wizClients.length) {
    try {
      var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
      var cData = await API.getAllClients(svcKey);
      ir_wizClients = Array.isArray(cData) ? cData : (cData.data || []);
      var dData = await API.getAllDepartments(svcKey);
      ir_wizDepts = Array.isArray(dData) ? dData : (dData.data || []);
    } catch(e) { ir_wizClients = []; ir_wizDepts = []; }
  }
  ir_wizGoStep(1);
  ir_wizRenderClients('');
  document.getElementById('ir_wClientSearch').value = '';
  document.getElementById('ir_wizOverlay').classList.add('open');
}

function ir_closeWiz() { document.getElementById('ir_wizOverlay').classList.remove('open'); }

function ir_wizGoStep(step) {
  ir_wizStep = step;
  for (var i = 1; i <= 3; i++) {
    var tab   = document.getElementById('ir_wTab' + i);
    var panel = document.getElementById('ir_wPanel' + i);
    tab.classList.remove('active','done');
    panel.classList.remove('active');
    if (i < step)  tab.classList.add('done');
    if (i === step){ tab.classList.add('active'); panel.classList.add('active'); }
  }
  document.getElementById('ir_wBtnBack').style.display   = step > 1 ? '' : 'none';
  document.getElementById('ir_wBtnNext').style.display   = step < 3 ? '' : 'none';
  document.getElementById('ir_wBtnCreate').style.display = step === 3 ? '' : 'none';
  ir_wizUpdateNext();
}

function ir_wizBack() { if (ir_wizStep > 1) ir_wizGoStep(ir_wizStep - 1); }

function ir_wizNext() {
  if (ir_wizStep === 1 && ir_wizClient) {
    ir_wizGoStep(2);
    ir_wizRenderDepts('');
    document.getElementById('ir_wDeptSearch').value = '';
  } else if (ir_wizStep === 2 && ir_wizDept) {
    ir_wizGoStep(3);
    ir_wizRenderSummary();
  }
}

function ir_wizUpdateNext() {
  var btn = document.getElementById('ir_wBtnNext');
  var enabled = (ir_wizStep === 1 && ir_wizClient) || (ir_wizStep === 2 && ir_wizDept);
  btn.style.opacity      = enabled ? '1' : '.5';
  btn.style.pointerEvents = enabled ? 'all' : 'none';
}

function ir_wizRenderClients(filter) {
  var q = (filter||'').toLowerCase();
  var clients = ir_wizClients.filter(function(c){
    var name = (c.sClientName1 || c.psClientName1 || '').toLowerCase();
    var city = (c.sCity || c.sMailCity || c.psCity || '').toLowerCase();
    var state = (c.sState || c.sMailState || c.psState || '').toLowerCase();
    return !q || name.includes(q) || city.includes(q) || state.includes(q) || String(c.lClientKey).includes(q);
  });
  document.getElementById('ir_wClientGrid').innerHTML = clients.slice(0, 60).map(function(c) {
    var name = c.sClientName1 || c.psClientName1 || 'Client ' + c.lClientKey;
    var city = c.sCity || c.sMailCity || c.psCity || '';
    var state = c.sState || c.sMailState || c.psState || '';
    var sel = ir_wizClient && ir_wizClient.lClientKey === c.lClientKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="ir_wizPickClient(' + c.lClientKey + ')">' +
      '<div class="wiz-card-name">' + ir_esc(name) + '</div>' +
      '<div class="wiz-card-detail">' + ir_esc(city) + (state ? ', ' + ir_esc(state) : '') + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No clients match.</div>';
}

function ir_wizFilterClients(val) { ir_wizRenderClients(val); }

function ir_wizPickClient(key) {
  ir_wizClient = ir_wizClients.find(function(c){ return c.lClientKey === key; });
  ir_wizDept = null;
  ir_wizRenderClients(document.getElementById('ir_wClientSearch').value);
  ir_wizUpdateNext();
}

function ir_wizRenderDepts(filter) {
  if (!ir_wizClient) return;
  var clientName = ir_wizClient.sClientName1 || ir_wizClient.psClientName1 || '';
  document.getElementById('ir_wClientBarName').textContent = clientName;
  var depts = ir_wizDepts.filter(function(d){ return d.lClientKey === ir_wizClient.lClientKey; });
  var q = (filter||'').toLowerCase();
  var filtered = depts.filter(function(d){
    var name = (d.sDepartmentName || d.psDepartmentName || '').toLowerCase();
    return !q || name.includes(q);
  });
  document.getElementById('ir_wDeptGrid').innerHTML = filtered.map(function(d) {
    var name = d.sDepartmentName || d.psDepartmentName || 'Dept ' + d.lDepartmentKey;
    var sel = ir_wizDept && ir_wizDept.lDepartmentKey === d.lDepartmentKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="ir_wizPickDept(' + d.lDepartmentKey + ')">' +
      '<div class="wiz-card-name">' + ir_esc(name) + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No departments found.</div>';
}

function ir_wizFilterDepts(val) { ir_wizRenderDepts(val); }

function ir_wizPickDept(key) {
  ir_wizDept = ir_wizDepts.find(function(d){ return d.lDepartmentKey === key; });
  ir_wizRenderDepts(document.getElementById('ir_wDeptSearch').value);
  ir_wizUpdateNext();
}

function ir_wizRenderSummary() {
  document.getElementById('ir_wSummaryName').textContent = (ir_wizClient ? (ir_wizClient.sClientName1 || ir_wizClient.psClientName1 || '') : '—') + ' — ' + (ir_wizDept ? (ir_wizDept.sDepartmentName || ir_wizDept.psDepartmentName || '') : '—');
  document.getElementById('ir_wQuoteRef').value  = '';
  document.getElementById('ir_wPoNumber').value  = '';
  document.getElementById('ir_wTech').value      = '';
  // Default due date = today + 7
  var due = new Date(); due.setDate(due.getDate() + 7);
  document.getElementById('ir_wDateDue').value   = due.toISOString().split('T')[0];
}

function ir_wizCreate() {
  if (!ir_wizClient || !ir_wizDept) return;
  var now = new Date();
  var num = 'IR-2026-0' + String(ir_nextOrderNum++).padStart(2,'0');
  var newR = {
    id:          Date.now(),
    orderNum:    num,
    status:      'Received',
    clientKey:   ir_wizClient.lClientKey,
    clientName:  ir_wizClient.sClientName1,
    deptKey:     ir_wizDept.lDepartmentKey,
    deptName:    ir_wizDept.sDepartmentName,
    dateReceived: now.toISOString().split('T')[0],
    dateDue:      document.getElementById('ir_wDateDue').value,
    dateCompleted:null,
    poNumber:     document.getElementById('ir_wPoNumber').value,
    quoteRef:     document.getElementById('ir_wQuoteRef').value,
    techAssigned: document.getElementById('ir_wTech').value,
    notes:        '',
    items:        []
  };
  ir_allRepairs.unshift(newR);
  ir_closeWiz();
  ir_applyFilters(); ir_updateKPIs();
  setTimeout(function(){ ir_openDrawer(newR.id); }, 100);
}
