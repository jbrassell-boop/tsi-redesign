/* ─── Instrument Repairs Tab ───
   Part of merged instruments page. Loaded by instruments.html.
   All functions/variables prefixed with ir_ to avoid namespace collisions.
   Entry point: ir_initPage() — called lazily when tab first clicked.
   COCKPIT REDESIGN — inline detail view replaces slide-out drawer.
*/

// ─── State ────────────────────────────────────────────────────────────────────
var ir_allRepairs    = [];
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
var ir_instrCodes    = [];

// New cockpit state
var ir_currentRepair = null;

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

function ir_fmtTs(d) {
  if (!d) return '—';
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], {hour:'2-digit',minute:'2-digit'});
}

// ─── Init ─────────────────────────────────────────────────────────────────────
async function ir_initPage() {
  showDataBadge(false);
  var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
  try {
    var data = await API.getInstrumentRepairs(svcKey);
    ir_allRepairs = (Array.isArray(data) ? data : (data.data || [])).map(function(r) { return JSON.parse(JSON.stringify(r)); });
  } catch(e) { ir_allRepairs = []; }
  // Also load instrument codes for the picker
  try {
    var codes = await API.getInstrumentCodes();
    ir_instrCodes = Array.isArray(codes) ? codes : (codes.data || []);
  } catch(e) { ir_instrCodes = []; }
  ir_allRepairs.forEach(function(r) {
    if (!r.comments) r.comments = [];
    if (!r.history) r.history = [];
    if (!r.items) r.items = [];
  });
  ir_applyFilters();
  ir_renderListPanel();
  if (ir_filtered.length) ir_selectRepair(ir_filtered[0].id || ir_filtered[0].lInstrRepairKey);
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
  ir_renderListPanel();
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

// ─── List Panel ───────────────────────────────────────────────────────────────
function ir_renderListPanel() {
  var tbody = document.getElementById('irListTbody');
  if (!tbody) return;
  var info = document.getElementById('ir_recordInfo');
  if (info) info.textContent = ir_filtered.length + ' record' + (ir_filtered.length !== 1 ? 's' : '');

  if (!ir_filtered.length) {
    tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:12px;color:var(--muted);font-size:11px">No repairs found.</td></tr>';
    return;
  }
  tbody.innerHTML = ir_filtered.map(function(r) {
    var rKey = r.lInstrRepairKey || r.id;
    var curKey = ir_currentRepair ? (ir_currentRepair.lInstrRepairKey || ir_currentRepair.id) : null;
    var activeClass = (curKey && curKey === rKey) ? ' irl-active' : '';
    return '<tr class="' + activeClass.trim() + '" onclick="ir_selectRepair(' + rKey + ')">' +
      '<td><span style="font-weight:700;color:var(--navy);font-size:10.5px">' + ir_esc(r.orderNum) + '</span></td>' +
      '<td style="font-size:10px;color:var(--muted)">' + ir_fmtDate(r.dateReceived) + '</td>' +
      '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ir_esc(r.clientName) + '">' + ir_esc(r.clientName) + '</td>' +
      '<td style="text-align:center">' + r.items.length + '</td>' +
      '<td>' + ir_statusBadge(r.status) + '</td>' +
      '</tr>';
  }).join('');
}

function ir_toggleListPanel() {
  var panel = document.getElementById('irListPanel');
  if (panel) panel.classList.toggle('collapsed');
}

// ─── Selection ────────────────────────────────────────────────────────────────
function ir_selectRepair(id) {
  var r = ir_allRepairs.find(function(x){ return (x.lInstrRepairKey || x.id) === id; });
  if (!r) return;
  // Save any pending changes from previously selected repair
  if (ir_isDirty && ir_currentRepair) {
    ir_saveRepair(true);
  }
  ir_currentRepair = r;
  ir_selectedId = id;
  ir_isDirty = false;
  // Show detail area
  var detailArea = document.getElementById('irDetailArea');
  if (detailArea) detailArea.classList.add('active');
  // Hide empty state
  var emptyEl = document.getElementById('emptyInstruments');
  if (emptyEl) emptyEl.style.display = 'none';
  // Populate everything
  ir_populateDetail();
  ir_renderListPanel();
}

function ir_deselectRepair() {
  if (ir_isDirty && ir_currentRepair) {
    ir_saveRepair(true);
  }
  ir_currentRepair = null;
  ir_selectedId = null;
  ir_isDirty = false;
  var detailArea = document.getElementById('irDetailArea');
  if (detailArea) detailArea.classList.remove('active');
  ir_renderListPanel();
}

// ─── Detail Population ────────────────────────────────────────────────────────
function ir_populateDetail() {
  if (!ir_currentRepair) return;
  var r = ir_currentRepair;

  ir_updateRefStrip();
  ir_updateWorkflowBar();
  ir_updateBreadcrumb();

  // Status strip
  document.getElementById('ir_ssBadge').textContent = r.orderNum;
  document.getElementById('ir_ssStatus').innerHTML = ir_statusBadge(r.status);
  ir_updateItemsChip();

  // Populate detail form fields
  document.getElementById('ir_dDateReceived').value = r.dateReceived || '';
  document.getElementById('ir_dDateDue').value      = r.dateDue || '';
  document.getElementById('ir_dDateCompleted').value= r.dateCompleted || '';
  document.getElementById('ir_dClient').value       = r.clientName;
  document.getElementById('ir_dDept').value         = r.deptName;
  document.getElementById('ir_dPoNumber').value     = r.poNumber || '';
  document.getElementById('ir_dQuoteRef').value     = r.quoteRef || '';
  document.getElementById('ir_dNotes').value        = r.notes || '';

  // Show/hide date completed based on status
  var compRow = document.getElementById('ir_dCompletedRow');
  var isClosing = (r.status === 'Complete' || r.status === 'Invoiced');
  compRow.style.display = isClosing ? '' : 'none';

  // D&I strip fields (now on Instruments tab)
  var diClaimedEl = document.getElementById('ir_diClaimed');
  if (diClaimedEl) diClaimedEl.value = r.claimedCount != null ? r.claimedCount : '';
  ir_updateCountDiscrepancy();
  var diCleanEl = document.getElementById('ir_diClean');
  if (diCleanEl) diCleanEl.checked = !!r.cleanOnReceipt;
  var diRackEl = document.getElementById('ir_diRack');
  if (diRackEl) diRackEl.value = r.rackNumber || '';
  var dShipEl = document.getElementById('ir_dShipContainer');
  if (dShipEl) dShipEl.checked = !!r.shipContainer;

  // Render the active tab content
  ir_renderItemsTab();
  ir_renderOutsourceTab();
  ir_renderCommentsTab();
  ir_renderHistoryTab();
  ir_renderFinancialsTab();
  ir_renderQCTab();

  ir_setSaveStatus('', '');

  // Switch to Instruments tab (first tab, the primary workspace)
  ir_switchTab('items', document.querySelector('.ir-detail-tabs .ir-tab'));
}

function ir_updateRefStrip() {
  var r = ir_currentRepair;
  if (!r) return;
  document.getElementById('ir_refOrder').textContent  = r.orderNum;
  document.getElementById('ir_refClient').textContent = r.clientName;
  document.getElementById('ir_refDept').textContent   = r.deptName;
  document.getElementById('ir_refPO').textContent     = r.poNumber || '—';
  document.getElementById('ir_refStatus').value       = r.status;
  document.getElementById('ir_refDateRecv').textContent = ir_fmtDate(r.dateReceived);
  document.getElementById('ir_refDateDue').textContent  = ir_fmtDate(r.dateDue);
  document.getElementById('ir_refDateComp').textContent = ir_fmtDate(r.dateCompleted);

  // Days open
  var daysOpen = '—';
  if (r.dateReceived) {
    var start = new Date(r.dateReceived);
    var end = r.dateCompleted ? new Date(r.dateCompleted) : new Date();
    daysOpen = Math.max(0, Math.round((end - start) / 86400000));
  }
  document.getElementById('ir_refDaysOpen').textContent = daysOpen;
  document.getElementById('ir_refItemCount').textContent = r.items.length;
}

function ir_updateWorkflowBar() {
  var r = ir_currentRepair;
  if (!r) return;

  // Status → Phase mapping
  var phaseMap = {
    'Received': 1,
    'In Progress': 2,
    'Outsourced': 2,
    'On Hold': 2,
    'Complete': 3,
    'Invoiced': 4
  };
  var currentPhase = phaseMap[r.status] || 1;

  var pills = [
    {id: 'ir_wf-receive',  phase: 1},
    {id: 'ir_wf-inprog',   phase: 2},
    {id: 'ir_wf-complete', phase: 3},
    {id: 'ir_wf-invoice',  phase: 4}
  ];

  pills.forEach(function(p) {
    var el = document.getElementById(p.id);
    if (!el) return;
    el.classList.remove('ir-wf-locked', 'ir-wf-available', 'ir-wf-done');
    if (p.phase < currentPhase) {
      el.classList.add('ir-wf-done');
    } else if (p.phase === currentPhase) {
      el.classList.add('ir-wf-available');
    } else {
      el.classList.add('ir-wf-locked');
    }
  });
}

function ir_updateBreadcrumb() {
  var r = ir_currentRepair;
  var bc = document.getElementById('ir_breadcrumb');
  if (!bc || !r) return;
  bc.innerHTML = 'Instruments &rsaquo; <span>' + ir_esc(r.clientName) + '</span> &rsaquo; <span>' + ir_esc(r.orderNum) + '</span>';
}

// ─── Tab Switching ────────────────────────────────────────────────────────────
function ir_switchTab(name, btn) {
  document.querySelectorAll('.ir-detail-tabs .ir-tab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('.ir-tab-pane').forEach(function(p){ p.classList.remove('active'); });
  if (btn) btn.classList.add('active');
  var pane = document.getElementById('ir_pane-' + name);
  if (pane) pane.classList.add('active');
}

// ─── Tab Renderers ────────────────────────────────────────────────────────────
function ir_renderDetailsTab() {
  // Details are populated via ir_populateDetail — static form fields
}

function ir_renderItemsTab() {
  var r = ir_currentRepair;
  if (!r) return;
  var tbody = document.getElementById('ir_itemsBody');
  if (!r.items || !r.items.length) {
    tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:16px;color:var(--muted);font-size:11px">No items on this order.</td></tr>';
    ir_updateDrawerTotals(r);
    ir_updateCountDiscrepancy();
    return;
  }

  // Group items by category (look up from instrument codes if not on item)
  var groups = {};
  var groupOrder = [];
  r.items.forEach(function(item, idx) {
    var cat = item.category || item.sCategory;
    if (!cat && item.instrCode && ir_instrCodes.length) {
      var code = ir_instrCodes.find(function(c) { return c.sCode === item.instrCode; });
      if (code) cat = code.sCategory;
    }
    cat = cat || 'Uncategorized';
    if (!groups[cat]) { groups[cat] = []; groupOrder.push(cat); }
    groups[cat].push({item: item, idx: idx});
  });

  var html = '';
  groupOrder.forEach(function(cat) {
    var items = groups[cat];
    var catTotal = items.reduce(function(s, o) { return s + (o.item.amount || 0); }, 0);
    html += '<tr class="ir-cat-header"><td colspan="8" style="background:var(--neutral-50);padding:6px 10px;font-size:10px;font-weight:700;color:var(--navy);border-bottom:1px solid var(--neutral-200)">' +
      ir_esc(cat) + ' <span style="font-weight:400;color:var(--muted)">(' + items.length + ' item' + (items.length !== 1 ? 's' : '') + ' &mdash; ' + fmtCur(catTotal) + ')</span></td></tr>';
    items.forEach(function(o) {
      var item = o.item;
      var idx = o.idx;
      var isBer = !!(item.ber);
      var lvlLabel = item.repairLevel ? 'L' + item.repairLevel : 'N/A';
      var berBorder = isBer ? 'border-left:3px solid var(--red);' : '';
      var amtStyle = isBer ? 'text-align:right;font-weight:600;text-decoration:line-through;color:var(--muted)' : 'text-align:right;font-weight:600';
      html += '<tr style="' + berBorder + '">' +
        '<td><span style="font-family:monospace;font-size:10.5px;color:var(--blue)">' + ir_esc(item.instrCode) + '</span>' +
          (isBer ? ' <span style="font-size:8px;color:var(--red);font-weight:700">BER</span>' : '') + '</td>' +
        '<td><div style="font-size:10.5px;font-weight:600;color:var(--navy)">' + ir_esc(item.mfr) + '</div>' +
            '<div style="font-size:9.5px;color:var(--muted)">' + ir_esc(item.model) + ' &middot; ' + ir_esc(item.serial) + '</div></td>' +
        '<td style="max-width:160px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + ir_esc(item.description) + '">' + ir_esc(item.description) + '</td>' +
        '<td style="text-align:center"><span class="ir-lvl-badge">' + lvlLabel + '</span></td>' +
        '<td style="' + amtStyle + '">' + (item.amount > 0 ? fmtCur(item.amount) : '<span style="color:var(--muted)">&mdash;</span>') + '</td>' +
        '<td>' + (item.outsource ? '<span class="ir-out-dot" title="Outsourced to: ' + ir_esc(item.outsourceVendor||'TBD') + '">&#x21A5;</span>' : '') + '</td>' +
        '<td>' + ir_itemStatusBadge(item.status) + '</td>' +
        '<td><button class="del-btn" onclick="ir_removeItem(' + idx + ')" title="Remove">&#x2715;</button></td>' +
        '</tr>';
    });
  });
  tbody.innerHTML = html;
  ir_updateDrawerTotals(r);
  ir_updateCountDiscrepancy();
}

function ir_renderOutsourceTab() {
  var r = ir_currentRepair;
  if (!r) return;
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

function ir_renderCommentsTab() {
  var r = ir_currentRepair;
  if (!r) return;
  var list = document.getElementById('ir_commentsList');
  if (!r.comments || !r.comments.length) {
    list.innerHTML = '<div style="text-align:center;padding:16px;color:var(--muted);font-size:11px">No comments yet.</div>';
    return;
  }
  list.innerHTML = r.comments.map(function(c) {
    return '<div class="ir-comment">' +
      '<div class="ir-comment-ts">' + ir_fmtTs(new Date(c.ts)) + '</div>' +
      '<div class="ir-comment-text">' + ir_esc(c.text) + '</div>' +
      '</div>';
  }).join('');
}

function ir_addComment() {
  var r = ir_currentRepair;
  if (!r) return;
  var input = document.getElementById('ir_commentInput');
  var text = (input.value || '').trim();
  if (!text) return;
  if (!r.comments) r.comments = [];
  r.comments.push({ts: new Date().toISOString(), text: text});
  input.value = '';
  ir_renderCommentsTab();
}

function ir_renderHistoryTab() {
  var r = ir_currentRepair;
  if (!r) return;
  var tbody = document.getElementById('ir_historyBody');
  if (!r.history || !r.history.length) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;padding:16px;color:var(--muted);font-size:11px">No history entries.</td></tr>';
    return;
  }
  tbody.innerHTML = r.history.map(function(h) {
    return '<tr>' +
      '<td style="white-space:nowrap">' + ir_fmtTs(new Date(h.ts)) + '</td>' +
      '<td>' + ir_esc(h.action) + '</td>' +
      '<td>' + (h.from ? ir_statusBadge(h.from) : '—') + '</td>' +
      '<td>' + (h.to ? ir_statusBadge(h.to) : '—') + '</td>' +
      '</tr>';
  }).join('');
}

function ir_renderFinancialsTab() {
  var r = ir_currentRepair;
  if (!r) return;
  var revenue = 0, cost = 0;
  (r.items||[]).forEach(function(item) {
    revenue += item.amount || 0;
    if (item.outsource) cost += item.outsourceCost || 0;
  });
  var margin = revenue - cost;
  document.getElementById('ir_finRevenue').textContent = fmtCur(revenue);
  document.getElementById('ir_finCost').textContent    = fmtCur(cost);
  var marginEl = document.getElementById('ir_finMargin');
  marginEl.textContent = fmtCur(margin);
  marginEl.style.color = margin >= 0 ? 'var(--green)' : 'var(--red)';
}

// ─── Item Totals ──────────────────────────────────────────────────────────────
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

// ─── Count Discrepancy ────────────────────────────────────────────────────────
function ir_updateCountDiscrepancy() {
  var r = ir_currentRepair;
  if (!r) return;
  var actual = (r.items || []).length;
  // Update actual count display
  var actualEl = document.getElementById('ir_diActual');
  if (actualEl) actualEl.textContent = actual;
  // Update discrepancy
  var discEl = document.getElementById('ir_diDisc');
  if (!discEl) return;
  var claimedEl = document.getElementById('ir_diClaimed');
  var claimed = claimedEl ? (parseInt(claimedEl.value) || 0) : 0;
  if (!claimed) { discEl.textContent = '--'; discEl.style.color = 'var(--muted)'; discEl.style.background = ''; return; }
  var diff = actual - claimed;
  if (diff === 0) { discEl.textContent = '\u2713 Match'; discEl.style.color = 'var(--green)'; discEl.style.background = '#F0FDF4'; }
  else if (diff < 0) { discEl.textContent = Math.abs(diff) + ' short'; discEl.style.color = 'var(--red)'; discEl.style.background = '#FEF2F2'; }
  else { discEl.textContent = diff + ' over'; discEl.style.color = 'var(--amber)'; discEl.style.background = '#FFFBEB'; }
  // Also update status strip items chip
  ir_updateItemsChip();
}

function ir_updateItemsChip() {
  var r = ir_currentRepair;
  if (!r) return;
  var el = document.getElementById('ir_ssItems');
  var chip = document.getElementById('ir_ssItemsChip');
  if (!el) return;
  var actual = (r.items || []).length;
  var claimed = r.claimedCount || 0;
  if (claimed && actual < claimed) {
    el.textContent = actual + '/' + claimed + ' (' + (claimed - actual) + ' short)';
    if (chip) { chip.style.background = '#FEF2F2'; chip.style.borderColor = '#FECACA'; }
  } else if (claimed && actual === claimed) {
    el.textContent = actual + ' Items';
    if (chip) { chip.style.background = '#F0FDF4'; chip.style.borderColor = '#BBF7D0'; }
  } else {
    el.textContent = actual + ' Items';
    if (chip) { chip.style.background = ''; chip.style.borderColor = ''; }
  }
}

function ir_diStripChanged() {
  var r = ir_currentRepair;
  if (!r) return;
  var claimedEl = document.getElementById('ir_diClaimed');
  if (claimedEl) r.claimedCount = claimedEl.value ? parseInt(claimedEl.value) : null;
  var cleanEl = document.getElementById('ir_diClean');
  if (cleanEl) r.cleanOnReceipt = cleanEl.checked;
  var rackEl = document.getElementById('ir_diRack');
  if (rackEl) r.rackNumber = rackEl.value;
  ir_updateCountDiscrepancy();
  ir_markDirty();
}

// ─── Add Item Modal ──────────────────────────────────────────────────────────
function ir_addItem() {
  var r = ir_currentRepair;
  if (!r) return;
  // Build and show the add-item modal overlay
  var existing = document.getElementById('ir_addItemOverlay');
  if (existing) existing.remove();

  var overlay = document.createElement('div');
  overlay.id = 'ir_addItemOverlay';
  overlay.className = 'wiz-overlay open';
  overlay.innerHTML =
    '<div class="wiz-box" style="width:680px">' +
      '<div class="wiz-head"><div class="wiz-title">Add Instrument <span id="ir_aiCounter" style="font-size:11px;font-weight:400;opacity:.7"></span></div><button class="wiz-close" onclick="ir_closeAddItem()">&#10005;</button></div>' +
      '<div style="flex:1;overflow-y:auto;padding:16px 20px;display:flex;flex-direction:column;gap:12px">' +
        // OS Code picker
        '<div class="dc"><div class="dc-head">Instrument Code</div><div class="dc-body">' +
          '<input class="inp" id="ir_aiCodeSearch" type="text" placeholder="Search by code, description, or category..." oninput="ir_aiFilterCodes(this.value)" style="margin-bottom:6px"/>' +
          '<div id="ir_aiCodeResults" style="max-height:140px;overflow-y:auto;border:1px solid var(--border);border-radius:4px"></div>' +
          '<div id="ir_aiCodeSelected" style="margin-top:4px;font-size:10px;color:var(--muted)">No code selected</div>' +
        '</div></div>' +
        // Details
        '<div class="dc"><div class="dc-head">Item Details</div><div class="dc-body">' +
          '<div class="fg g2">' +
            '<div class="ff"><label>Manufacturer</label>' +
              '<select class="inp" id="ir_aiMfr" onchange="if(this.value===\'__custom\'){this.style.display=\'none\';document.getElementById(\'ir_aiMfrCustom\').style.display=\'\';document.getElementById(\'ir_aiMfrCustom\').focus();}">' +
                '<option value="">-- Select --</option><option>gSource</option><option>V. Mueller</option><option>Storz</option><option>Miltex</option><option>Generic</option><option value="__custom">Other (type in)...</option>' +
              '</select>' +
              '<input class="inp" id="ir_aiMfrCustom" type="text" placeholder="Type manufacturer..." style="display:none;margin-top:4px"/>' +
            '</div>' +
            '<div class="ff"><label>Model Number</label><input class="inp" id="ir_aiModel" type="text"/></div>' +
            '<div class="ff"><label>Serial Number</label><div style="display:flex;gap:4px"><input class="inp" id="ir_aiSerial" type="text" style="flex:1"/><button class="btn btn-outline" onclick="document.getElementById(\'ir_aiSerial\').value=\'N/A\'" style="height:28px;padding:0 8px;font-size:10px;white-space:nowrap">N/A</button></div></div>' +
            '<div class="ff"><label>Quantity</label><input class="inp" id="ir_aiQty" type="number" value="1" min="1" style="width:70px"/></div>' +
          '</div>' +
        '</div></div>' +
        // Repairs needed
        '<div class="dc"><div class="dc-head">Repairs Needed</div><div class="dc-body">' +
          '<div id="ir_aiRepairChips" style="display:flex;flex-wrap:wrap;gap:6px">' +
            ['Sharpen','Clean','Reset','Adjust','Replace','Resurface','Realign'].map(function(rp) {
              return '<label style="display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border:1.5px solid var(--border-dk);border-radius:14px;font-size:11px;font-weight:600;cursor:pointer;user-select:none;transition:all .12s">' +
                '<input type="checkbox" value="' + rp + '" style="display:none" onchange="this.parentElement.style.background=this.checked?\'var(--primary-light)\':\'\';;this.parentElement.style.borderColor=this.checked?\'var(--blue)\':\'var(--border-dk)\';this.parentElement.style.color=this.checked?\'var(--navy)\':\'\'"/>' + rp + '</label>';
            }).join('') +
          '</div>' +
        '</div></div>' +
        // BER toggle
        '<div class="dc"><div class="dc-head">BER (Beyond Economical Repair)</div><div class="dc-body">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<label style="display:flex;align-items:center;gap:6px;font-size:11px;font-weight:600;cursor:pointer"><input type="checkbox" id="ir_aiBer" onchange="ir_aiToggleBer(this.checked)"/> Mark as BER</label>' +
          '</div>' +
          '<div id="ir_aiBerReason" style="display:none;margin-top:8px"><div class="ff"><label>BER Findings / Reason</label><textarea class="inp" id="ir_aiBerFindings" rows="2"></textarea></div></div>' +
        '</div></div>' +
        // Notes
        '<div class="dc"><div class="dc-head">Notes / Findings</div><div class="dc-body">' +
          '<textarea class="inp" id="ir_aiNotes" rows="2" placeholder="Tech notes, findings..."></textarea>' +
        '</div></div>' +
      '</div>' +
      '<div class="wiz-footer">' +
        '<button class="btn btn-outline" onclick="ir_closeAddItem()">Cancel</button>' +
        '<div style="flex:1"></div>' +
        '<button class="btn btn-outline" onclick="ir_saveAddItem(false)" style="border-color:var(--navy);color:var(--navy)">Add &amp; Close</button>' +
        '<button class="btn btn-navy" onclick="ir_saveAddItem(true)">Add &amp; Next</button>' +
      '</div>' +
    '</div>';
  document.body.appendChild(overlay);
  ir_aiAddedCount = 0;
  // Render initial code list
  ir_aiFilterCodes('');
}

var ir_aiSelectedCode = null;
var ir_aiAddedCount = 0;
var ir_aiLastMfr = '';

function ir_closeAddItem() {
  var el = document.getElementById('ir_addItemOverlay');
  if (el) el.remove();
  ir_aiSelectedCode = null;
  ir_aiAddedCount = 0;
}

function ir_aiClearFields() {
  // Clear fields for next item, keep manufacturer
  ir_aiSelectedCode = null;
  document.getElementById('ir_aiCodeSearch').value = '';
  document.getElementById('ir_aiCodeSelected').innerHTML = 'No code selected';
  ir_aiFilterCodes('');
  document.getElementById('ir_aiModel').value = '';
  document.getElementById('ir_aiSerial').value = '';
  document.getElementById('ir_aiQty').value = '1';
  document.getElementById('ir_aiNotes').value = '';
  document.getElementById('ir_aiBer').checked = false;
  ir_aiToggleBer(false);
  document.getElementById('ir_aiBerFindings').value = '';
  document.querySelectorAll('#ir_aiRepairChips input[type=checkbox]').forEach(function(cb) {
    cb.checked = false;
    cb.parentElement.style.background = '';
    cb.parentElement.style.borderColor = 'var(--border-dk)';
    cb.parentElement.style.color = '';
  });
  // Keep mfr selection (same box = same manufacturer often)
  document.getElementById('ir_aiCodeSearch').focus();
}

function ir_aiToggleBer(checked) {
  var berReason = document.getElementById('ir_aiBerReason');
  if (berReason) berReason.style.display = checked ? '' : 'none';
}

function ir_aiFilterCodes(q) {
  var el = document.getElementById('ir_aiCodeResults');
  if (!el) return;
  var filter = (q || '').toLowerCase();
  var matches = ir_instrCodes.filter(function(c) {
    if (!filter) return true;
    return (c.sCode || '').toLowerCase().includes(filter) ||
           (c.sDescription || '').toLowerCase().includes(filter) ||
           (c.sCategory || '').toLowerCase().includes(filter);
  }).slice(0, 40);
  if (!matches.length) {
    el.innerHTML = '<div style="padding:8px 10px;font-size:10px;color:var(--muted)">No codes found</div>';
    return;
  }
  el.innerHTML = matches.map(function(c) {
    var selStyle = (ir_aiSelectedCode && ir_aiSelectedCode.sCode === c.sCode) ? 'background:var(--primary-light);border-left:2px solid var(--navy);' : '';
    return '<div style="padding:5px 10px;font-size:10.5px;cursor:pointer;border-bottom:1px solid var(--border);display:flex;align-items:center;gap:8px;' + selStyle + '" onclick="ir_aiPickCode(\'' + ir_esc(c.sCode) + '\')">' +
      '<span style="font-family:monospace;font-weight:700;color:var(--blue);min-width:60px">' + ir_esc(c.sCode) + '</span>' +
      '<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + ir_esc(c.sDescription || '') + '</span>' +
      '<span style="font-size:9px;color:var(--muted)">' + ir_esc(c.sCategory || '') + '</span>' +
      '<span style="font-size:10px;font-weight:600;min-width:50px;text-align:right">' + ((c.nBaseRate || c.dMaxCharge) ? fmtCur(c.nBaseRate || c.dMaxCharge) : '--') + '</span>' +
      '</div>';
  }).join('');
}

function ir_aiPickCode(code) {
  ir_aiSelectedCode = ir_instrCodes.find(function(c) { return c.sCode === code; });
  if (!ir_aiSelectedCode) return;
  var selEl = document.getElementById('ir_aiCodeSelected');
  if (selEl) selEl.innerHTML = '<span style="font-weight:700;color:var(--navy)">' + ir_esc(ir_aiSelectedCode.sCode) + '</span> &mdash; ' + ir_esc(ir_aiSelectedCode.sDescription || '') + ' <span style="color:var(--muted)">(' + ir_esc(ir_aiSelectedCode.sCategory || '') + ')</span>';
  // Re-render to show selected highlight
  var searchEl = document.getElementById('ir_aiCodeSearch');
  ir_aiFilterCodes(searchEl ? searchEl.value : '');
}

function ir_saveAddItem(keepOpen) {
  var r = ir_currentRepair;
  if (!r) return;
  var isBer = document.getElementById('ir_aiBer').checked;
  var mfrSel = document.getElementById('ir_aiMfr');
  var mfrCustom = document.getElementById('ir_aiMfrCustom');
  var mfr = mfrSel.style.display === 'none' ? mfrCustom.value : (mfrSel.value === '__custom' ? '' : mfrSel.value);
  var qty = parseInt(document.getElementById('ir_aiQty').value) || 1;

  // Gather selected repair chips
  var repairChips = [];
  document.querySelectorAll('#ir_aiRepairChips input[type=checkbox]:checked').forEach(function(cb) { repairChips.push(cb.value); });

  var baseCode = isBer ? 'OS090' : (ir_aiSelectedCode ? ir_aiSelectedCode.sCode : '');
  var baseAmt = isBer ? 0 : (ir_aiSelectedCode ? (ir_aiSelectedCode.nBaseRate || ir_aiSelectedCode.dMaxCharge || 0) : 0);
  var baseCat = ir_aiSelectedCode ? (ir_aiSelectedCode.sCategory || 'Uncategorized') : 'Uncategorized';
  var baseDesc = ir_aiSelectedCode ? (ir_aiSelectedCode.sDescription || '') : '';

  for (var q = 0; q < qty; q++) {
    var newId = r.items.length ? Math.max.apply(null, r.items.map(function(i){ return i.id || 0; })) + 1 : 1;
    r.items.push({
      id: newId,
      instrCode: baseCode,
      mfr: mfr,
      model: document.getElementById('ir_aiModel').value,
      serial: document.getElementById('ir_aiSerial').value || 'N/A',
      description: baseDesc,
      category: baseCat,
      sCategory: baseCat,
      repairLevel: null,
      amount: baseAmt,
      status: 'Received',
      outsource: false,
      outsourceVendor: '',
      outsourceCost: 0,
      techNote: document.getElementById('ir_aiNotes').value,
      repairsNeeded: repairChips,
      ber: isBer,
      berFindings: isBer ? document.getElementById('ir_aiBerFindings').value : ''
    });
  }

  ir_aiAddedCount += qty;
  ir_aiLastMfr = mfr;
  ir_markDirty(); ir_renderItemsTab(); ir_renderOutsourceTab(); ir_renderFinancialsTab(); ir_updateRefStrip();

  if (keepOpen) {
    // Update counter in modal header
    var counter = document.getElementById('ir_aiCounter');
    if (counter) counter.textContent = '(' + ir_aiAddedCount + ' added)';
    ir_aiClearFields();
  } else {
    ir_closeAddItem();
  }
}

function ir_removeItem(idx) {
  var r = ir_currentRepair;
  if (!r) return;
  r.items.splice(idx, 1);
  ir_markDirty(); ir_renderItemsTab(); ir_renderOutsourceTab(); ir_renderFinancialsTab(); ir_updateRefStrip();
}

// ─── Save / Dirty ─────────────────────────────────────────────────────────────
function ir_markDirty() {
  ir_isDirty = true;
  ir_setSaveStatus('dirty', 'Unsaved changes');
  clearTimeout(ir_saveTimer);
  ir_saveTimer = setTimeout(ir_autoSave, 2000);
}

function ir_autoSave() { if (ir_isDirty) ir_saveRepair(true); }

function ir_saveRepair(silent) {
  var r = ir_currentRepair;
  if (!r) return;
  r.status        = document.getElementById('ir_refStatus').value;
  r.dateReceived  = document.getElementById('ir_dDateReceived').value;
  r.dateDue       = document.getElementById('ir_dDateDue').value;
  r.dateCompleted = document.getElementById('ir_dDateCompleted').value || null;
  r.poNumber      = document.getElementById('ir_dPoNumber').value;
  r.quoteRef      = document.getElementById('ir_dQuoteRef').value;
  r.notes         = document.getElementById('ir_dNotes').value;

  // D&I strip fields
  var claimedEl = document.getElementById('ir_diClaimed');
  if (claimedEl) r.claimedCount = claimedEl.value ? parseInt(claimedEl.value) : null;
  var cleanEl = document.getElementById('ir_diClean');
  if (cleanEl) r.cleanOnReceipt = cleanEl.checked;
  var rackEl = document.getElementById('ir_diRack');
  if (rackEl) r.rackNumber = rackEl.value;
  var shipEl = document.getElementById('ir_dShipContainer');
  if (shipEl) r.shipContainer = shipEl.checked;

  // QC fields
  ir_saveQCFields();

  // Update status strip
  document.getElementById('ir_ssStatus').innerHTML = ir_statusBadge(r.status);
  ir_updateItemsChip();

  // Persist via API
  try { API.updateInstrumentRepair(r); } catch(e) { /* silent fail for demo */ }

  ir_isDirty = false;
  ir_setSaveStatus('saved', 'Saved');
  if (!silent) { setTimeout(function(){ ir_setSaveStatus('', ''); }, 2500); }
  ir_updateKPIs(); ir_renderListPanel(); ir_updateRefStrip(); ir_updateWorkflowBar();
}

function ir_setSaveStatus(state, msg) {
  var el = document.getElementById('ir_saveIndicator');
  if (!el) return;
  el.textContent = msg;
  el.style.color = state==='saved' ? 'var(--green)' : state==='dirty' ? 'var(--amber)' : 'var(--muted)';
}

function ir_onStatusChange() {
  var r = ir_currentRepair;
  if (!r) return;
  var newStatus = document.getElementById('ir_refStatus').value;
  var oldStatus = r.status;
  if (newStatus !== oldStatus) {
    // Log history entry
    if (!r.history) r.history = [];
    r.history.push({ts: new Date().toISOString(), action: 'Status changed', from: oldStatus, to: newStatus});
    r.status = newStatus;
    // Auto-set date completed
    if ((newStatus === 'Complete' || newStatus === 'Invoiced') && !r.dateCompleted) {
      r.dateCompleted = new Date().toISOString().split('T')[0];
      document.getElementById('ir_dDateCompleted').value = r.dateCompleted;
    }
    // Show/hide date completed row
    var compRow = document.getElementById('ir_dCompletedRow');
    compRow.style.display = (newStatus === 'Complete' || newStatus === 'Invoiced') ? '' : 'none';
  }
  ir_markDirty();
  ir_updateWorkflowBar();
  ir_updateRefStrip();
  ir_renderHistoryTab();
  document.getElementById('ir_ssStatus').innerHTML = ir_statusBadge(newStatus);
}

function ir_deleteRepair(btn) {
  var r = ir_currentRepair;
  if (!r) return;
  if (!btn) return;
  if (btn.dataset.confirming) {
    var rKey = r.lInstrRepairKey || r.id;
    ir_allRepairs = ir_allRepairs.filter(function(x){ return (x.lInstrRepairKey || x.id) !== rKey; });
    ir_deselectRepair(); ir_applyFilters(); ir_updateKPIs();
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
  var claimedDescEl = document.getElementById('ir_wClaimedDesc');
  if (claimedDescEl) claimedDescEl.value = '';
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
    techAssigned: '',
    notes:        document.getElementById('ir_wClaimedDesc').value ? 'Customer says: ' + document.getElementById('ir_wClaimedDesc').value : '',
    items:        [],
    comments:     [],
    history:      [{ts: now.toISOString(), action: 'Order created', from: null, to: 'Received'}]
  };
  ir_allRepairs.unshift(newR);
  ir_closeWiz();
  ir_applyFilters(); ir_updateKPIs();
  setTimeout(function(){ ir_selectRepair(newR.id); }, 100);
}

// ─── QC Tab ────────────────────────────────────────────────────────────────────
function ir_renderQCTab() {
  var r = ir_currentRepair;
  if (!r) return;
  if (!r.techQC) r.techQC = {};
  if (!r.commercialQC) r.commercialQC = {};
  var tq = r.techQC;
  var cq = r.commercialQC;

  // Tech QC fields
  var el;
  el = document.getElementById('ir_qcTechCount');       if (el) el.value = tq.verifiedCount || '';
  el = document.getElementById('ir_qcTechVisualP');     if (el) el.checked = tq.visualInspection === 'pass';
  el = document.getElementById('ir_qcTechVisualF');     if (el) el.checked = tq.visualInspection === 'fail';
  el = document.getElementById('ir_qcTechFuncP');       if (el) el.checked = tq.functionalInspection === 'pass';
  el = document.getElementById('ir_qcTechFuncF');       if (el) el.checked = tq.functionalInspection === 'fail';
  el = document.getElementById('ir_qcTechInspector');   if (el) el.value = tq.inspector || '';
  el = document.getElementById('ir_qcTechDate');        if (el) el.value = tq.date || '';
  el = document.getElementById('ir_qcTechNotes');       if (el) el.value = tq.notes || '';

  // Commercial QC fields
  el = document.getElementById('ir_qcCommCount');       if (el) el.value = cq.verifiedCount || '';
  el = document.getElementById('ir_qcCommVisualP');     if (el) el.checked = cq.visualInspection === 'pass';
  el = document.getElementById('ir_qcCommVisualF');     if (el) el.checked = cq.visualInspection === 'fail';
  el = document.getElementById('ir_qcCommInspector');   if (el) el.value = cq.inspector || '';
  el = document.getElementById('ir_qcCommDate');        if (el) el.value = cq.date || '';
  el = document.getElementById('ir_qcCommNotes');       if (el) el.value = cq.notes || '';

  // Status indicators
  var techStatus = document.getElementById('ir_qcTechStatus');
  if (techStatus) {
    var techPassed = tq.visualInspection === 'pass' && tq.functionalInspection === 'pass' && tq.inspector && tq.date;
    techStatus.innerHTML = techPassed ?
      '<span style="color:var(--green);font-weight:700;font-size:11px">&#x2713; Passed</span>' :
      '<span style="color:var(--amber);font-weight:700;font-size:11px">&#x26A0; Not complete</span>';
  }
  var commStatus = document.getElementById('ir_qcCommStatus');
  if (commStatus) {
    var commPassed = cq.visualInspection === 'pass' && cq.inspector && cq.date;
    commStatus.innerHTML = commPassed ?
      '<span style="color:var(--green);font-weight:700;font-size:11px">&#x2713; Passed</span>' :
      '<span style="color:var(--amber);font-weight:700;font-size:11px">&#x26A0; Not complete</span>';
  }
}

function ir_saveQCFields() {
  var r = ir_currentRepair;
  if (!r) return;
  if (!r.techQC) r.techQC = {};
  if (!r.commercialQC) r.commercialQC = {};

  var el;
  // Tech QC
  el = document.getElementById('ir_qcTechCount');       if (el) r.techQC.verifiedCount = el.value ? parseInt(el.value) : null;
  el = document.getElementById('ir_qcTechVisualP');     if (el && el.checked) r.techQC.visualInspection = 'pass';
  el = document.getElementById('ir_qcTechVisualF');     if (el && el.checked) r.techQC.visualInspection = 'fail';
  el = document.getElementById('ir_qcTechFuncP');       if (el && el.checked) r.techQC.functionalInspection = 'pass';
  el = document.getElementById('ir_qcTechFuncF');       if (el && el.checked) r.techQC.functionalInspection = 'fail';
  el = document.getElementById('ir_qcTechInspector');   if (el) r.techQC.inspector = el.value;
  el = document.getElementById('ir_qcTechDate');        if (el) r.techQC.date = el.value;
  el = document.getElementById('ir_qcTechNotes');       if (el) r.techQC.notes = el.value;

  // Commercial QC
  el = document.getElementById('ir_qcCommCount');       if (el) r.commercialQC.verifiedCount = el.value ? parseInt(el.value) : null;
  el = document.getElementById('ir_qcCommVisualP');     if (el && el.checked) r.commercialQC.visualInspection = 'pass';
  el = document.getElementById('ir_qcCommVisualF');     if (el && el.checked) r.commercialQC.visualInspection = 'fail';
  el = document.getElementById('ir_qcCommInspector');   if (el) r.commercialQC.inspector = el.value;
  el = document.getElementById('ir_qcCommDate');        if (el) r.commercialQC.date = el.value;
  el = document.getElementById('ir_qcCommNotes');       if (el) r.commercialQC.notes = el.value;
}

function ir_qcChanged() {
  ir_saveQCFields();
  ir_markDirty();
  ir_renderQCTab();
}
