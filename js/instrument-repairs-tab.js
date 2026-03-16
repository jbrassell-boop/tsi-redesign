/* ─── Instrument Repairs Tab ───
   Part of merged instruments page. Loaded by instruments.html.
   All functions/variables prefixed with ir_ to avoid namespace collisions.
   Entry point: ir_initPage() — called lazily when tab first clicked.
*/

// ─── Demo Data ────────────────────────────────────────────────────────────────
var ir_DEMO_REPAIRS = [
  {
    id:2001, orderNum:'IR-2026-001', status:'Complete',
    clientKey:1, clientName:'Shreveport Endoscopy Center',
    deptKey:11, deptName:'Endoscopy — Mullica Hill',
    dateReceived:'2026-03-06', dateDue:'2026-03-13', dateCompleted:'2026-03-12',
    poNumber:'', quoteRef:'IQ-2026-001', techAssigned:'M. Santos',
    notes:'Received with original quote. All items evaluated on site.',
    items:[
      {id:1,instrCode:'OS865',mfr:'Microline',model:'3941',serial:'2797',description:'Handle housing cracked and lever broken',repairLevel:3,amount:430,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Housing replaced; lever repaired in-house'},
      {id:2,instrCode:'OS851',mfr:'Storz',model:'33132',serial:'FH01',description:'Repair rotation knob and replace locking spring',repairLevel:2,amount:170,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Knob rebuilt; spring replaced'},
      {id:3,instrCode:'OS1477',mfr:'Aesculap',model:'PM973R',serial:'N/A',description:'No Issues Found',repairLevel:null,amount:0,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Received within OEM Spec'}
    ]
  },
  {
    id:2002, orderNum:'IR-2026-002', status:'In Progress',
    clientKey:2, clientName:'Northside Hospital',
    deptKey:21, deptName:'GI Lab — East Baltimore',
    dateReceived:'2026-03-10', dateDue:'2026-03-17', dateCompleted:null,
    poNumber:'', quoteRef:'IQ-2026-002', techAssigned:'R. Okafor',
    notes:'Biopsy channel replacement in progress. Wolf scope sent to vendor.',
    items:[
      {id:1,instrCode:'OS1040',mfr:'Olympus',model:'FG-32L',serial:'A22-0441',description:'Biopsy channel worn — burr snagging forceps',repairLevel:3,amount:540,status:'Outsourced',outsource:true,outsourceVendor:'Olympus Repair Center',outsourceCost:380,techNote:'Sent 03/11/2026'},
      {id:2,instrCode:'OS712',mfr:'Wolf',model:'8985.431',serial:'B09-774',description:'Sheath cracked at distal end',repairLevel:2,amount:267,status:'In Progress',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'New sheath being fabricated in-house'}
    ]
  },
  {
    id:2003, orderNum:'IR-2026-003', status:'Invoiced',
    clientKey:3, clientName:'Valley Health System',
    deptKey:31, deptName:'Endoscopy — Hospital of the University of PA',
    dateReceived:'2026-03-05', dateDue:'2026-03-10', dateCompleted:'2026-03-09',
    poNumber:'PO-77423', quoteRef:'IQ-2026-003', techAssigned:'M. Santos',
    notes:'All work complete. Invoice issued 03/10/2026.',
    items:[
      {id:1,instrCode:'OS2200',mfr:'Storz',model:'26174A',serial:'SC-2201',description:'Light cable detached at eyepiece end',repairLevel:1,amount:95,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Reattached and retested — passed'},
      {id:2,instrCode:'OS810',mfr:'Gyrus ACMI',model:'A3290',serial:'GY-0981',description:'Insulation compromised on shaft',repairLevel:3,amount:620,status:'Complete',outsource:true,outsourceVendor:'ACMI Service Center',outsourceCost:420,techNote:'Returned from vendor 03/08/2026'},
      {id:3,instrCode:'OS440',mfr:'Aesculap',model:'FB382R',serial:'N/A',description:'No Issues Found',repairLevel:null,amount:0,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Received within OEM Spec'}
    ]
  },
  {
    id:2004, orderNum:'IR-2026-004', status:'Outsourced',
    clientKey:4, clientName:'Tampa General Hospital',
    deptKey:41, deptName:'Sterile Processing — Tampa Gen',
    dateReceived:'2026-02-20', dateDue:'2026-03-06', dateCompleted:null,
    poNumber:'TGH-14892', quoteRef:'IQ-2026-004', techAssigned:'D. Haynes',
    notes:'Two Stryker motors sent to vendor. Awaiting return.',
    items:[
      {id:1,instrCode:'OS320',mfr:'Stryker',model:'375-020-000',serial:'STR-0042',description:'Motor housing cracked — vibration and heat',repairLevel:3,amount:890,status:'Outsourced',outsource:true,outsourceVendor:'Stryker Instruments',outsourceCost:640,techNote:'Sent 02/22/2026'},
      {id:2,instrCode:'OS321',mfr:'Stryker',model:'375-020-000',serial:'STR-0043',description:'Motor housing cracked — same issue',repairLevel:3,amount:890,status:'Outsourced',outsource:true,outsourceVendor:'Stryker Instruments',outsourceCost:640,techNote:'Sent 02/22/2026'},
      {id:3,instrCode:'OS865',mfr:'Microline',model:'3941',serial:'ML-5591',description:'Lever spring broken',repairLevel:2,amount:370,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Spring replaced in-house'},
      {id:4,instrCode:'OS440',mfr:'Aesculap',model:'FB382R',serial:'AES-112',description:'Jaw alignment off — grip strength reduced',repairLevel:1,amount:82,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Realigned and tested'}
    ]
  },
  {
    id:2005, orderNum:'IR-2026-005', status:'Received',
    clientKey:5, clientName:'Regional Medical Center',
    deptKey:51, deptName:'OR — Virtua Voorhees',
    dateReceived:'2026-03-13', dateDue:'2026-03-20', dateCompleted:null,
    poNumber:'', quoteRef:'IQ-2026-005', techAssigned:'',
    notes:'Instruments received 03/13. Awaiting tech assignment.',
    items:[
      {id:1,instrCode:'OS1200',mfr:'Codman',model:'80-1550',serial:'CDM-2201',description:'Bipolar forcep tips oxidized',repairLevel:2,amount:327,status:'Received',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''},
      {id:2,instrCode:'OS990',mfr:'V. Mueller',model:'CH6275',serial:'VM-0043',description:'Ratchet lock skipping — intermittent failure',repairLevel:1,amount:99,status:'Received',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''}
    ]
  },
  {
    id:2006, orderNum:'IR-2026-006', status:'On Hold',
    clientKey:7, clientName:'West Side GI Center',
    deptKey:71, deptName:'GI Lab — West Side City',
    dateReceived:'2026-03-08', dateDue:'2026-03-15', dateCompleted:null,
    poNumber:'', quoteRef:'', techAssigned:'R. Okafor',
    notes:'Customer has not sent PO. Hold until approved.',
    items:[
      {id:1,instrCode:'OS2200',mfr:'Storz',model:'26174A',serial:'SZ-0017',description:'Imaging fiber bundle partially broken',repairLevel:null,amount:0,status:'On Hold',outsource:true,outsourceVendor:'Karl Storz Endoscopy',outsourceCost:0,techNote:'Vendor assessment pending — waiting on PO'}
    ]
  },
  {
    id:2007, orderNum:'IR-2026-007', status:'Invoiced',
    clientKey:8, clientName:'Coliseum Medical Center',
    deptKey:81, deptName:'Cath Lab — Thomas Jefferson',
    dateReceived:'2026-03-03', dateDue:'2026-03-08', dateCompleted:'2026-03-07',
    poNumber:'JEFF-5521', quoteRef:'IQ-2026-008', techAssigned:'M. Santos',
    notes:'',
    items:[
      {id:1,instrCode:'OS865',mfr:'Microline',model:'3941',serial:'ML-2210',description:'Housing cracked',repairLevel:2,amount:370,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''},
      {id:2,instrCode:'OS851',mfr:'Storz',model:'33132',serial:'SZ-0881',description:'Rotation knob stuck',repairLevel:1,amount:67,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''},
      {id:3,instrCode:'OS990',mfr:'V. Mueller',model:'CH6275',serial:'VM-0071',description:'Ratchet failure',repairLevel:2,amount:249,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''},
      {id:4,instrCode:'OS440',mfr:'Aesculap',model:'FB382R',serial:'AES-007',description:'No Issues Found',repairLevel:null,amount:0,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:''}
    ]
  },
  {
    id:2008, orderNum:'IR-2026-008', status:'In Progress',
    clientKey:9, clientName:'Baptist Health',
    deptKey:91, deptName:'OR — Baptist Health MC',
    dateReceived:'2026-03-09', dateDue:'2026-03-16', dateCompleted:null,
    poNumber:'', quoteRef:'IQ-2026-009', techAssigned:'D. Haynes',
    notes:'',
    items:[
      {id:1,instrCode:'OS1200',mfr:'Codman',model:'80-1550',serial:'CDM-3310',description:'Insulation damage on bipolar tips',repairLevel:3,amount:380,status:'In Progress',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Full re-tip in progress'},
      {id:2,instrCode:'OS320',mfr:'Stryker',model:'375-020-000',serial:'STR-1122',description:'Blade assembly stuck',repairLevel:2,amount:765,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Blade replaced'},
      {id:3,instrCode:'OS712',mfr:'Wolf',model:'8985.431',serial:'WLF-081',description:'Light guide detached',repairLevel:1,amount:105,status:'Complete',outsource:false,outsourceVendor:'',outsourceCost:0,techNote:'Reattached and tested'}
    ]
  }
];

// ─── State ────────────────────────────────────────────────────────────────────
var ir_allRepairs    = ir_DEMO_REPAIRS.map(function(r){ return JSON.parse(JSON.stringify(r)); });
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
    var dueTd = '<td class="' + (dueC==='overdue' ? 'ir-overdue' : dueC==='due-soon' ? 'ir-due-soon' : '') + '">' + ir_fmtDate(r.dateDue) + '</td>';
    return '<tr class="' + (r.id === ir_selectedId ? 'selected' : '') + '" onclick="ir_openDrawer(' + r.id + ')">' +
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
    tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:16px;color:var(--muted);font-size:11px">No items on this order.</td></tr>';
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
      '</tr>';
  }).join('');
  ir_updateDrawerTotals(r);
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

function ir_deleteRepair() {
  var r = ir_allRepairs.find(function(x){ return x.id === ir_selectedId; });
  if (!r) return;
  if (!confirm('Delete ' + r.orderNum + '? This cannot be undone.')) return;
  ir_allRepairs = ir_allRepairs.filter(function(x){ return x.id !== ir_selectedId; });
  ir_closeDrawer(); ir_applyFilters(); ir_updateKPIs();
}

// ─── New Repair Wizard ────────────────────────────────────────────────────────
function ir_newRepair() {
  ir_wizStep = 1; ir_wizClient = null; ir_wizDept = null;
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

// Reuse iq_DEMO_CLIENTS and iq_DEMO_DEPTS — same client/dept data
function ir_wizRenderClients(filter) {
  var q = (filter||'').toLowerCase();
  var clients = (typeof iq_DEMO_CLIENTS !== 'undefined' ? iq_DEMO_CLIENTS : []).filter(function(c){
    return !q || c.sClientName1.toLowerCase().includes(q) || (c.sClientCity||'').toLowerCase().includes(q);
  });
  document.getElementById('ir_wClientGrid').innerHTML = clients.map(function(c) {
    var sel = ir_wizClient && ir_wizClient.lClientKey === c.lClientKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="ir_wizPickClient(' + c.lClientKey + ')">' +
      '<div class="wiz-card-name">' + ir_esc(c.sClientName1) + '</div>' +
      '<div class="wiz-card-detail">' + ir_esc(c.sClientCity) + ', ' + ir_esc(c.sClientState) + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No clients match.</div>';
}

function ir_wizFilterClients(val) { ir_wizRenderClients(val); }

function ir_wizPickClient(key) {
  var clients = typeof iq_DEMO_CLIENTS !== 'undefined' ? iq_DEMO_CLIENTS : [];
  ir_wizClient = clients.find(function(c){ return c.lClientKey === key; });
  ir_wizDept = null;
  ir_wizRenderClients(document.getElementById('ir_wClientSearch').value);
  ir_wizUpdateNext();
}

function ir_wizRenderDepts(filter) {
  if (!ir_wizClient) return;
  var depts_map = typeof iq_DEMO_DEPTS !== 'undefined' ? iq_DEMO_DEPTS : {};
  document.getElementById('ir_wClientBarName').textContent = ir_wizClient.sClientName1;
  var depts = (depts_map[ir_wizClient.lClientKey] || []);
  var q = (filter||'').toLowerCase();
  var filtered = depts.filter(function(d){ return !q || d.sDepartmentName.toLowerCase().includes(q); });
  document.getElementById('ir_wDeptGrid').innerHTML = filtered.map(function(d) {
    var sel = ir_wizDept && ir_wizDept.lDepartmentKey === d.lDepartmentKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="ir_wizPickDept(' + d.lDepartmentKey + ')">' +
      '<div class="wiz-card-name">' + ir_esc(d.sDepartmentName) + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No departments found.</div>';
}

function ir_wizFilterDepts(val) { ir_wizRenderDepts(val); }

function ir_wizPickDept(key) {
  var depts_map = typeof iq_DEMO_DEPTS !== 'undefined' ? iq_DEMO_DEPTS : {};
  var depts = depts_map[ir_wizClient ? ir_wizClient.lClientKey : 0] || [];
  ir_wizDept = depts.find(function(d){ return d.lDepartmentKey === key; });
  ir_wizRenderDepts(document.getElementById('ir_wDeptSearch').value);
  ir_wizUpdateNext();
}

function ir_wizRenderSummary() {
  document.getElementById('ir_wSummaryName').textContent = (ir_wizClient ? ir_wizClient.sClientName1 : '—') + ' — ' + (ir_wizDept ? ir_wizDept.sDepartmentName : '—');
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
