/* ─── Instrument Quotes Tab ───
   Part of merged instruments page. Loaded by instruments.html.
   All functions/variables prefixed with iq_ to avoid namespace collisions.
   Entry point: iq_initPage() — called lazily when tab first clicked.
*/

// ── API accessors ──
async function iq_getClients() {
  try {
    var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '0');
    var data = await API.getAllClients(svcKey);
    var list = Array.isArray(data) ? data : (data && data.data ? data.data : []);
    return list.map(function(c) {
      return { lClientKey: c.lClientKey, sClientName1: c.sClientName1 || '', sClientCity: c.sMailCity || c.sCity || '', sClientState: c.sMailState || c.sState || '' };
    });
  } catch(e) { return []; }
}
async function iq_getDepts() {
  try {
    var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '0');
    var data = await API.getAllDepartments(svcKey);
    var list = Array.isArray(data) ? data : (data && data.data ? data.data : []);
    var map = {};
    list.forEach(function(d) {
      var ck = d.lClientKey;
      if (!map[ck]) map[ck] = [];
      map[ck].push({ lDepartmentKey: d.lDepartmentKey, sDepartmentName: d.sDepartmentName || '' });
    });
    return map;
  } catch(e) { return {}; }
}

// ── State ──
var iq_allQuotes = []; // Loaded async in iq_initPage()
var iq_filteredQuotes = [];
var iq_displayQuotes = [];
var iq_selectedId = null;
var iq_currentPage = 1;
var iq_pageSize = 25;
var iq_sortCol = 'quoteNum';
var iq_sortDir = 'asc';
var iq_filterChip = '';
var iq_filterGpo = '';
var iq_filterClient = '';
var iq_searchTerm = '';
var iq_searchTimer = null;
var iq_isDirty = false;
var iq_saveTimer = null;
var iq_wizStep = 1;
var iq_wizClient = null;
var iq_wizDept = null;

// ── Helpers ──
function iq_esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
function iq_fmtDate(d) { if (!d) return '--'; var p = d.split('-'); return (p[1]||'')+'/'+(p[2]||'')+'/'+(p[0]||''); }
function iq_statusBadge(s) {
  var map = {'Draft':'b-draft','Sent':'b-sent','Approved':'b-approved','Partially Approved':'b-partial','Declined':'b-declined'};
  return '<span class="badge ' + (map[s]||'b-draft') + '">' + iq_esc(s) + '</span>';
}
function iq_gpoLabel(g) { return g==='hpg'?'HPG':g==='viz'?'Vizient':g==='s3'?'S3':''; }
function iq_quoteTotal(q) { return q.items.reduce(function(s,i){ return s + (i.amount||0); }, 0); }
function iq_outsourcedCount(q) { return q.items.filter(function(i){ return i.outsource; }).length; }

// ── Init ──
function iq_initPage() {
  showDataBadge(false);
  iq_populateClientFilter();
  iq_applyFilters();
}

function iq_populateClientFilter() {
  var dd = document.getElementById('iq_filterClient');
  var clients = {};
  iq_allQuotes.forEach(function(q) { clients[q.clientKey] = q.clientName; });
  Object.keys(clients).sort(function(a,b){ return clients[a].localeCompare(clients[b]); }).forEach(function(k) {
    var o = document.createElement('option');
    o.value = k; o.textContent = clients[k];
    dd.appendChild(o);
  });
}

// ── Filtering / Sorting / Paging ──
function iq_applyFilters() {
  var s = iq_searchTerm.toLowerCase();
  iq_filteredQuotes = iq_allQuotes.filter(function(q) {
    if (iq_filterChip && q.status !== iq_filterChip) return false;
    if (iq_filterGpo === 'std' && q.gpo !== '') return false;
    if (iq_filterGpo && iq_filterGpo !== 'std' && q.gpo !== iq_filterGpo) return false;
    if (iq_filterClient && String(q.clientKey) !== iq_filterClient) return false;
    if (s && !(q.quoteNum.toLowerCase().includes(s) || q.clientName.toLowerCase().includes(s) || q.deptName.toLowerCase().includes(s) || (q.visitRef||'').toLowerCase().includes(s))) return false;
    return true;
  });
  iq_applySort();
  iq_updateKPIs();
  iq_currentPage = 1;
  iq_paginate();
  iq_renderTable();
  iq_updatePagination();
}

function iq_applySort() {
  if (!iq_sortCol) return;
  iq_filteredQuotes.sort(function(a, b) {
    var av = iq_sortCol === 'total' ? iq_quoteTotal(a) : iq_sortCol === 'itemCount' ? a.items.length : (a[iq_sortCol]||'');
    var bv = iq_sortCol === 'total' ? iq_quoteTotal(b) : iq_sortCol === 'itemCount' ? b.items.length : (b[iq_sortCol]||'');
    if (typeof av === 'number') return iq_sortDir === 'asc' ? av - bv : bv - av;
    return iq_sortDir === 'asc' ? String(av).localeCompare(String(bv)) : String(bv).localeCompare(String(av));
  });
}

function iq_paginate() { iq_displayQuotes = iq_filteredQuotes.slice((iq_currentPage-1)*iq_pageSize, iq_currentPage*iq_pageSize); }

function iq_sortBy(col) {
  if (iq_sortCol === col) iq_sortDir = iq_sortDir === 'asc' ? 'desc' : 'asc';
  else { iq_sortCol = col; iq_sortDir = 'asc'; }
  iq_applySort(); iq_paginate(); iq_renderTable(); iq_updatePagination();
  document.querySelectorAll('#iq_tableBody').forEach(function(){});
  var table = document.getElementById('iq_tableBody');
  if (table) {
    var thead = table.closest('table').querySelector('thead');
    if (thead) {
      thead.querySelectorAll('th').forEach(function(th) { th.classList.remove('sorted','asc','desc'); });
      var idx = ['quoteNum','clientName','deptName','quoteDate','itemCount',null,'total',null,'status'].indexOf(col);
      if (idx >= 0) {
        var ths = thead.querySelectorAll('th');
        if (ths[idx]) { ths[idx].classList.add('sorted', iq_sortDir); }
      }
    }
  }
}

function iq_chipFilter(status) {
  iq_filterChip = status;
  document.querySelectorAll('#iq_statStrip .stat-chip:not(.info-only)').forEach(function(c){ c.classList.remove('active-chip'); });
  var map = {'':'iq_kpiAll','Draft':'iq_kpiDraft','Sent':'iq_kpiSent','Approved':'iq_kpiApproved','Partially Approved':'iq_kpiPartial','Declined':'iq_kpiDeclined'};
  var el = document.getElementById(map[status]);
  if (el) el.classList.add('active-chip');
  iq_currentPage = 1; iq_applyFilters();
}

function iq_setGpoFilter(val, btn) {
  iq_filterGpo = val;
  btn.closest('.seg-group').querySelectorAll('.seg-btn').forEach(function(b){ b.classList.remove('active'); });
  btn.classList.add('active');
  iq_currentPage = 1; iq_applyFilters();
}

function iq_debounceSearch() {
  clearTimeout(iq_searchTimer);
  iq_searchTimer = setTimeout(function() {
    iq_searchTerm = document.getElementById('iq_searchInput').value;
    iq_currentPage = 1; iq_applyFilters();
  }, 280);
}

// ── KPIs ──
function iq_updateKPIs() {
  var counts = {Draft:0,Sent:0,Approved:0,'Partially Approved':0,Declined:0};
  var total = 0;
  iq_allQuotes.forEach(function(q) {
    if (counts[q.status] !== undefined) counts[q.status]++;
    total += iq_quoteTotal(q);
  });
  document.getElementById('iq_kpiAllVal').textContent = iq_allQuotes.length;
  document.getElementById('iq_kpiDraftVal').textContent = counts.Draft;
  document.getElementById('iq_kpiSentVal').textContent = counts.Sent;
  document.getElementById('iq_kpiApprovedVal').textContent = counts.Approved;
  document.getElementById('iq_kpiPartialVal').textContent = counts['Partially Approved'];
  document.getElementById('iq_kpiDeclinedVal').textContent = counts.Declined;
  document.getElementById('iq_kpiValueVal').textContent = fmtCur(total);
}

// ── Render Table ──
function iq_renderTable() {
  var tbody = document.getElementById('iq_tableBody');
  if (!iq_displayQuotes.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:24px;color:var(--muted)">No quotes match the current filters.</td></tr>';
    document.getElementById('iq_recordInfo').textContent = '0 records';
    return;
  }
  tbody.innerHTML = iq_displayQuotes.map(function(q) {
    var tot = iq_quoteTotal(q);
    var outCnt = iq_outsourcedCount(q);
    var gpo = iq_gpoLabel(q.gpo);
    return '<tr class="' + (q.id === iq_selectedId ? 'selected' : '') + '" onclick="iq_openDrawer(' + q.id + ')">' +
      '<td><span class="code-link">' + iq_esc(q.quoteNum) + '</span></td>' +
      '<td title="' + iq_esc(q.clientName) + '">' + iq_esc(q.clientName) + '</td>' +
      '<td title="' + iq_esc(q.deptName) + '">' + iq_esc(q.deptName) + '</td>' +
      '<td>' + iq_fmtDate(q.quoteDate) + '</td>' +
      '<td style="text-align:center">' + q.items.length + '</td>' +
      '<td>' + (outCnt ? '<span class="out-badge">&#x21A5; ' + outCnt + '</span>' : '<span style="color:var(--muted);font-size:10px">—</span>') + '</td>' +
      '<td style="font-weight:600">' + fmtCur(tot) + '</td>' +
      '<td>' + (gpo ? '<span class="gpo-tag">' + gpo + '</span>' : '<span style="color:var(--muted);font-size:10px">Std</span>') + '</td>' +
      '<td>' + iq_statusBadge(q.status) + '</td>' +
      '</tr>';
  }).join('');
  var total = iq_filteredQuotes.length;
  var start = (iq_currentPage-1)*iq_pageSize+1;
  var end = Math.min(iq_currentPage*iq_pageSize, total);
  document.getElementById('iq_recordInfo').textContent = total + ' record' + (total!==1?'s':'') + (total > iq_pageSize ? ' (showing ' + start + '–' + end + ')' : '');
}

function iq_updatePagination() {
  var totalPages = Math.ceil(iq_filteredQuotes.length / iq_pageSize);
  var pg = document.getElementById('iq_pagination');
  if (totalPages <= 1) { pg.innerHTML = ''; return; }
  var html = '<button class="pg-btn" onclick="iq_gotoPage(' + (iq_currentPage-1) + ')" ' + (iq_currentPage===1?'disabled':'') + '>&#8592;</button>';
  for (var i = 1; i <= totalPages; i++) {
    if (i === 1 || i === totalPages || Math.abs(i-iq_currentPage) <= 1) {
      html += '<button class="pg-btn' + (i===iq_currentPage?' active':'') + '" onclick="iq_gotoPage(' + i + ')">' + i + '</button>';
    } else if (Math.abs(i-iq_currentPage) === 2) { html += '<span style="padding:0 3px;color:var(--muted)">…</span>'; }
  }
  html += '<button class="pg-btn" onclick="iq_gotoPage(' + (iq_currentPage+1) + ')" ' + (iq_currentPage===totalPages?'disabled':'') + '>&#8594;</button>';
  pg.innerHTML = html;
}

function iq_gotoPage(p) {
  var totalPages = Math.ceil(iq_filteredQuotes.length / iq_pageSize);
  if (p < 1 || p > totalPages) return;
  iq_currentPage = p; iq_paginate(); iq_renderTable(); iq_updatePagination();
}

// ── Drawer ──
function iq_openDrawer(id) {
  iq_selectedId = id;
  var q = iq_allQuotes.find(function(x){ return x.id === id; });
  if (!q) return;
  iq_populateDrawer(q);
  document.getElementById('iq_quoteDrawer').classList.add('open');
  document.getElementById('iq_drawerOverlay').classList.add('open');
  iq_renderTable(); // highlight row
}

function iq_closeDrawer() {
  document.getElementById('iq_quoteDrawer').classList.remove('open');
  document.getElementById('iq_drawerOverlay').classList.remove('open');
  iq_selectedId = null;
  iq_renderTable();
}

function iq_populateDrawer(q) {
  document.getElementById('iq_dhQuoteNum').textContent = q.quoteNum;
  document.getElementById('iq_dhSub').textContent = q.clientName + ' — ' + q.deptName;
  document.getElementById('iq_dhStatusBadge').innerHTML = iq_statusBadge(q.status);
  document.getElementById('iq_dQuoteNum').value = q.quoteNum;
  document.getElementById('iq_dQuoteDate').value = q.quoteDate || '';
  document.getElementById('iq_dStatus').value = q.status;
  document.getElementById('iq_dClient').value = q.clientName;
  document.getElementById('iq_dDept').value = q.deptName;
  document.getElementById('iq_dGpo').value = q.gpo || '';
  document.getElementById('iq_dPo').value = q.poNumber || '';
  document.getElementById('iq_dReviewedBy').value = q.reviewedBy || '';
  document.getElementById('iq_dVisitRef').value = q.visitRef || '';
  document.getElementById('iq_dSalesRep').value = q.salesRep || '';
  document.getElementById('iq_dNotes').value = q.notes || '';
  document.getElementById('iq_dBillTo').innerHTML = iq_fmtAddr(q.billTo);
  document.getElementById('iq_dShipTo').innerHTML = iq_fmtAddr(q.shipTo);
  var sentRow = document.getElementById('iq_dSentDateRow');
  var sentInput = document.getElementById('iq_dSentDate');
  if (q.status === 'Sent' || q.sentDate) {
    sentRow.style.display = '';
    sentInput.value = q.sentDate || '';
  } else { sentRow.style.display = 'none'; }
  // Mark sent button visibility
  document.getElementById('iq_btnMarkSent').style.display = (q.status === 'Draft') ? '' : 'none';
  iq_renderItemsTab(q);
  iq_renderOutsourceTab(q);
  iq_setSaveStatus('', '');
  iq_isDirty = false;
  iq_switchTab('details', document.querySelector('#iq_quoteDrawer .dtab'));
}

function iq_fmtAddr(a) {
  if (!a) return '—';
  var parts = [a.name, a.attn ? 'ATTN: ' + a.attn : '', a.addr1, a.addr2||'', [a.city, a.state].filter(Boolean).join(', ') + (a.zip ? ' ' + a.zip : '')].filter(function(s){ return s.trim(); });
  return parts.join('<br/>');
}

function iq_switchTab(name, el) {
  document.querySelectorAll('#iq_quoteDrawer .dtab').forEach(function(t){ t.classList.remove('active'); });
  document.querySelectorAll('#iq_quoteDrawer .dpane').forEach(function(p){ p.classList.remove('active'); });
  if (el) el.classList.add('active');
  else {
    document.querySelectorAll('#iq_quoteDrawer .dtab').forEach(function(t){ if(t.textContent.toLowerCase().includes(name)) t.classList.add('active'); });
  }
  var pane = document.getElementById('iq_dpane-' + name);
  if (pane) pane.classList.add('active');
}

function iq_onStatusChange() {
  var s = document.getElementById('iq_dStatus').value;
  var sentRow = document.getElementById('iq_dSentDateRow');
  sentRow.style.display = (s === 'Sent' || s === 'Partially Approved' || s === 'Approved' || s === 'Declined') ? '' : 'none';
  iq_markDirty();
}

function iq_onGpoChange() {
  iq_markDirty();
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (q) iq_renderItemsTab(q);
}

// ── Line Items Tab ──
function iq_renderItemsTab(q) {
  var gpo = document.getElementById('iq_dGpo') ? document.getElementById('iq_dGpo').value : (q.gpo || '');
  var tbody = document.getElementById('iq_itemsTableBody');
  if (!q.items || !q.items.length) {
    tbody.innerHTML = '<tr><td colspan="9" style="padding:16px;text-align:center;color:var(--muted);font-size:11px">No items yet — click Add Line Item below.</td></tr>';
  } else {
    tbody.innerHTML = q.items.map(function(item, idx) {
      var lvlName = item.repairLevel ? (REPAIR_LEVELS.find(function(l){ return l.level===item.repairLevel; }) || {}).name || '—' : 'N/A';
      var ay = item.approval === true ? 'ay' : '';
      var an = item.approval === false ? 'an' : '';
      var ap = item.approval === null ? 'ap' : '';
      return '<tr class="item-row">' +
        '<td><input type="text" value="' + iq_esc(item.instrCode) + '" onchange="iq_updateItem(' + idx + ',\'instrCode\',this.value)"/></td>' +
        '<td><div style="font-size:10px;font-weight:600;color:var(--navy)">' + iq_esc(item.mfr) + '</div><div style="font-size:9.5px;color:var(--muted)">' + iq_esc(item.model) + '</div></td>' +
        '<td><input type="text" value="' + iq_esc(item.serial) + '" onchange="iq_updateItem(' + idx + ',\'serial\',this.value)"/></td>' +
        '<td title="' + iq_esc(item.issue) + '"><div style="font-size:10px;color:var(--text);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:140px">' + iq_esc(item.issue) + '</div>' +
          (item.techNote ? '<div style="font-size:9px;color:var(--muted);font-style:italic;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:140px">' + iq_esc(item.techNote) + '</div>' : '') + '</td>' +
        '<td><select onchange="iq_updateItemLevel(' + idx + ',this.value)">' +
          '<option value="">N/A</option>' +
          REPAIR_LEVELS.map(function(l){ return '<option value="' + l.level + '"' + (item.repairLevel===l.level?' selected':'') + '>L' + l.level + '</option>'; }).join('') +
        '</select></td>' +
        '<td><input type="number" min="0" step="0.01" value="' + (item.amount||0) + '" onchange="iq_updateItem(' + idx + ',\'amount\',parseFloat(this.value)||0)" style="text-align:right"/></td>' +
        '<td><div class="appr-btns">' +
          '<button class="appr-btn ' + ay + '" onclick="iq_setApproval(' + idx + ',true)" title="Approved">Y</button>' +
          '<button class="appr-btn ' + an + '" onclick="iq_setApproval(' + idx + ',false)" title="Declined">N</button>' +
          '<button class="appr-btn ' + ap + '" onclick="iq_setApproval(' + idx + ',null)" title="Pending">—</button>' +
        '</div></td>' +
        '<td style="text-align:center"><input type="checkbox" class="out-chk" ' + (item.outsource?'checked':'') + ' onchange="iq_toggleOutsource(' + idx + ',this.checked)" title="Outsource"/></td>' +
        '<td><button class="del-btn" onclick="iq_removeItem(' + idx + ')" title="Remove">&#x2715;</button></td>' +
        '</tr>';
    }).join('');
  }
  iq_updateTotals(q);
}

function iq_updateItem(idx, field, value) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q || !q.items[idx]) return;
  q.items[idx][field] = value;
  iq_markDirty(); iq_updateTotals(q); iq_renderOutsourceTab(q);
}

function iq_updateItemLevel(idx, levelStr) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q || !q.items[idx]) return;
  var level = levelStr ? parseInt(levelStr) : null;
  q.items[idx].repairLevel = level;
  if (level) {
    var gpo = document.getElementById('iq_dGpo').value;
    var inst = typeof RAW !== 'undefined' ? RAW.find(function(r){ return r.c === q.items[idx].instrCode; }) : null;
    var base = inst ? (gpo === 'hpg' && inst.hpg != null ? inst.hpg : gpo === 'viz' && inst.viz != null ? inst.viz : gpo === 's3' && inst.s3 != null ? inst.s3 : inst.mx || 0) : q.items[idx].basePrice || 0;
    var lvl = REPAIR_LEVELS.find(function(l){ return l.level === level; });
    if (base && lvl) { q.items[idx].amount = parseFloat((base * lvl.pct).toFixed(2)); }
  } else { q.items[idx].amount = 0; }
  iq_markDirty(); iq_renderItemsTab(q);
}

function iq_setApproval(idx, val) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q || !q.items[idx]) return;
  q.items[idx].approval = val;
  iq_markDirty(); iq_renderItemsTab(q);
}

function iq_toggleOutsource(idx, checked) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q || !q.items[idx]) return;
  q.items[idx].outsource = checked;
  iq_markDirty(); iq_renderOutsourceTab(q);
}

function iq_removeItem(idx) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  q.items.splice(idx, 1);
  iq_markDirty(); iq_renderItemsTab(q); iq_renderOutsourceTab(q);
}

function iq_addItem() {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  var newId = q.items.length ? Math.max.apply(null, q.items.map(function(i){ return i.id; })) + 1 : 1;
  q.items.push({id:newId,instrCode:'',mfr:'',model:'',serial:'',issue:'',techNote:'',repairLevel:null,basePrice:0,amount:0,approval:null,outsource:false,outsourceVendor:'',outsourceCost:0});
  iq_markDirty(); iq_renderItemsTab(q);
}

function iq_updateTotals(q) {
  var total = 0, approved = 0, pending = 0;
  q.items.forEach(function(i) {
    total += i.amount || 0;
    if (i.approval === true) approved += i.amount || 0;
    else if (i.approval === null) pending += i.amount || 0;
  });
  document.getElementById('iq_qtItems').textContent = q.items.length;
  document.getElementById('iq_qtApproved').textContent = fmtCur(approved);
  document.getElementById('iq_qtPending').textContent = fmtCur(pending);
  document.getElementById('iq_qtTotal').textContent = fmtCur(total);
}

// ── Outsource Tab ──
function iq_renderOutsourceTab(q) {
  var items = q.items.filter(function(i){ return i.outsource; });
  var el = document.getElementById('iq_outsourceContent');
  if (!items.length) {
    el.innerHTML = '<div class="out-empty">No items marked for outsource.<br/>Toggle the Out checkbox on items in the Line Items tab.</div>';
    return;
  }
  var totCost = 0, totBilled = 0;
  var rows = items.map(function(item, i) {
    totCost += item.outsourceCost || 0;
    totBilled += item.amount || 0;
    var margin = (item.amount || 0) - (item.outsourceCost || 0);
    var mClass = margin >= 0 ? 'ir-margin-pos' : 'ir-margin-neg';
    return '<tr>' +
      '<td><span class="code-link">' + iq_esc(item.instrCode) + '</span><br/><span style="font-size:10px;color:var(--muted)">' + iq_esc(item.mfr) + ' ' + iq_esc(item.model) + '</span></td>' +
      '<td><input type="text" value="' + iq_esc(item.outsourceVendor) + '" placeholder="Vendor name" onchange="iq_updateOutVendor(\'' + item.id + '\',this.value)" style="width:140px"/></td>' +
      '<td><input type="number" min="0" step="0.01" value="' + (item.outsourceCost||0) + '" onchange="iq_updateOutCost(\'' + item.id + '\',parseFloat(this.value)||0)" style="width:80px;text-align:right"/></td>' +
      '<td style="text-align:right;font-weight:600">' + fmtCur(item.amount) + '</td>' +
      '<td class="' + mClass + '" style="text-align:right">' + fmtCur(margin) + '</td>' +
      '</tr>';
  }).join('');
  var totMargin = totBilled - totCost;
  var totMClass = totMargin >= 0 ? 'ir-margin-pos' : 'ir-margin-neg';
  el.innerHTML = '<table class="out-table">' +
    '<thead><tr><th>Instrument</th><th>Vendor</th><th>Our Cost</th><th>Billed</th><th>Margin</th></tr></thead>' +
    '<tbody>' + rows + '</tbody>' +
    '<tfoot><tr class="out-total-row"><td colspan="2">Totals</td><td style="text-align:right">' + fmtCur(totCost) + '</td><td style="text-align:right">' + fmtCur(totBilled) + '</td><td class="' + totMClass + '" style="text-align:right">' + fmtCur(totMargin) + '</td></tr></tfoot>' +
    '</table>';
}

function iq_updateOutVendor(itemId, val) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  var item = q.items.find(function(i){ return i.id === parseInt(itemId)||i.id === itemId; });
  if (item) { item.outsourceVendor = val; iq_markDirty(); }
}

function iq_updateOutCost(itemId, val) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  var item = q.items.find(function(i){ return i.id === parseInt(itemId)||i.id === itemId; });
  if (item) { item.outsourceCost = val; iq_markDirty(); iq_renderOutsourceTab(q); }
}

// ── Save / Dirty ──
function iq_markDirty() {
  iq_isDirty = true;
  iq_setSaveStatus('dirty', 'Unsaved changes');
  clearTimeout(iq_saveTimer);
  iq_saveTimer = setTimeout(iq_autoSave, 2000);
}

function iq_autoSave() { if (iq_isDirty) iq_saveDrawer(true); }

function iq_saveDrawer(silent) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  q.status = document.getElementById('iq_dStatus').value;
  q.quoteDate = document.getElementById('iq_dQuoteDate').value;
  q.gpo = document.getElementById('iq_dGpo').value;
  q.poNumber = document.getElementById('iq_dPo').value;
  q.reviewedBy = document.getElementById('iq_dReviewedBy').value;
  q.visitRef = document.getElementById('iq_dVisitRef').value;
  q.salesRep = document.getElementById('iq_dSalesRep').value;
  q.notes = document.getElementById('iq_dNotes').value;
  if (document.getElementById('iq_dSentDate').value) q.sentDate = document.getElementById('iq_dSentDate').value;
  // Update header
  document.getElementById('iq_dhStatusBadge').innerHTML = iq_statusBadge(q.status);
  iq_isDirty = false;
  iq_setSaveStatus('saved', 'Saved');
  if (!silent) { setTimeout(function(){ iq_setSaveStatus('', ''); }, 2500); }
  iq_updateKPIs(); iq_renderTable();
}

function iq_setSaveStatus(state, msg) {
  var el = document.getElementById('iq_drawerSaveStatus');
  el.textContent = msg;
  el.style.color = state === 'saved' ? 'var(--green)' : state === 'dirty' ? 'var(--amber)' : 'var(--muted)';
}

function iq_markSent() {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  q.status = 'Sent';
  q.sentDate = new Date().toISOString().split('T')[0];
  document.getElementById('iq_dStatus').value = 'Sent';
  document.getElementById('iq_dSentDate').value = q.sentDate;
  document.getElementById('iq_dSentDateRow').style.display = '';
  document.getElementById('iq_btnMarkSent').style.display = 'none';
  document.getElementById('iq_dhStatusBadge').innerHTML = iq_statusBadge('Sent');
  iq_saveDrawer(true);
}

function iq_deleteQuote(btn) {
  var q = iq_allQuotes.find(function(x){ return x.id === iq_selectedId; });
  if (!q) return;
  if (!btn) return;
  if (btn.dataset.confirming) {
    iq_allQuotes = iq_allQuotes.filter(function(x){ return x.id !== iq_selectedId; });
    iq_closeDrawer(); iq_applyFilters(); iq_updateKPIs();
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

// ── New Quote Wizard ──
var iq_nextQuoteNum = 10;

function iq_newQuote() {
  iq_wizStep = 1; iq_wizClient = null; iq_wizDept = null;
  iq_wizGoStep(1);
  iq_wizRenderClients('');
  document.getElementById('iq_wClientSearch').value = '';
  document.getElementById('iq_wizOverlay').classList.add('open');
}

function iq_closeWiz() { document.getElementById('iq_wizOverlay').classList.remove('open'); }

function iq_wizGoStep(step) {
  iq_wizStep = step;
  for (var i = 1; i <= 3; i++) {
    var tab = document.getElementById('iq_wTab' + i);
    var panel = document.getElementById('iq_wPanel' + i);
    tab.classList.remove('active','done');
    panel.classList.remove('active');
    if (i < step) tab.classList.add('done');
    if (i === step) { tab.classList.add('active'); panel.classList.add('active'); }
  }
  document.getElementById('iq_wBtnBack').style.display = step > 1 ? '' : 'none';
  document.getElementById('iq_wBtnNext').style.display = step < 3 ? '' : 'none';
  document.getElementById('iq_wBtnCreate').style.display = step === 3 ? '' : 'none';
  iq_wizUpdateNext();
}

function iq_wizBack() { if (iq_wizStep > 1) iq_wizGoStep(iq_wizStep - 1); }

function iq_wizNext() {
  if (iq_wizStep === 1 && iq_wizClient) { iq_wizGoStep(2); iq_wizRenderDepts(''); document.getElementById('iq_wDeptSearch').value = ''; }
  else if (iq_wizStep === 2 && iq_wizDept) { iq_wizGoStep(3); iq_wizRenderSummary(); }
}

function iq_wizUpdateNext() {
  var btn = document.getElementById('iq_wBtnNext');
  var enabled = (iq_wizStep === 1 && iq_wizClient) || (iq_wizStep === 2 && iq_wizDept);
  btn.style.opacity = enabled ? '1' : '.5';
  btn.style.pointerEvents = enabled ? 'all' : 'none';
}

function iq_wizRenderClients(filter) {
  var q = (filter||'').toLowerCase();
  var clients = iq_getClients().filter(function(c){ return !q || c.sClientName1.toLowerCase().includes(q) || (c.sClientCity||'').toLowerCase().includes(q); });
  document.getElementById('iq_wClientGrid').innerHTML = clients.map(function(c) {
    var sel = iq_wizClient && iq_wizClient.lClientKey === c.lClientKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="iq_wizPickClient(' + c.lClientKey + ')">' +
      '<div class="wiz-card-name">' + iq_esc(c.sClientName1) + '</div>' +
      '<div class="wiz-card-detail">' + iq_esc(c.sClientCity) + ', ' + iq_esc(c.sClientState) + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No clients match.</div>';
}

function iq_wizFilterClients(val) { iq_wizRenderClients(val); }

function iq_wizPickClient(key) {
  iq_wizClient = iq_getClients().find(function(c){ return c.lClientKey === key; });
  iq_wizDept = null;
  // re-render to show selection
  iq_wizRenderClients(document.getElementById('iq_wClientSearch').value);
  iq_wizUpdateNext();
}

function iq_wizRenderDepts(filter) {
  if (!iq_wizClient) return;
  document.getElementById('iq_wClientBarName').textContent = iq_wizClient.sClientName1;
  var depts = (iq_getDepts()[iq_wizClient.lClientKey] || []);
  var q = (filter||'').toLowerCase();
  var filtered = depts.filter(function(d){ return !q || d.sDepartmentName.toLowerCase().includes(q); });
  document.getElementById('iq_wDeptGrid').innerHTML = filtered.map(function(d) {
    var sel = iq_wizDept && iq_wizDept.lDepartmentKey === d.lDepartmentKey ? ' selected' : '';
    return '<div class="wiz-card' + sel + '" onclick="iq_wizPickDept(' + d.lDepartmentKey + ')">' +
      '<div class="wiz-card-name">' + iq_esc(d.sDepartmentName) + '</div>' +
      '</div>';
  }).join('') || '<div style="padding:16px;color:var(--muted);font-size:11px">No departments found.</div>';
}

function iq_wizFilterDepts(val) { iq_wizRenderDepts(val); }

function iq_wizPickDept(key) {
  var depts = iq_getDepts()[iq_wizClient ? iq_wizClient.lClientKey : 0] || [];
  iq_wizDept = depts.find(function(d){ return d.lDepartmentKey === key; });
  iq_wizRenderDepts(document.getElementById('iq_wDeptSearch').value);
  iq_wizUpdateNext();
}

function iq_wizRenderSummary() {
  document.getElementById('iq_wSummaryName').textContent = (iq_wizClient ? iq_wizClient.sClientName1 : '—') + ' — ' + (iq_wizDept ? iq_wizDept.sDepartmentName : '—');
  document.getElementById('iq_wGpo').value = '';
  document.getElementById('iq_wVisitRef').value = '';
  document.getElementById('iq_wReviewedBy').value = '';
}

function iq_wizCreate() {
  if (!iq_wizClient || !iq_wizDept) return;
  var now = new Date();
  var qNum = 'IQ-2026-0' + String(iq_nextQuoteNum++).padStart(2,'0');
  var dateStr = now.toISOString().split('T')[0];
  var newQ = {
    id: Date.now(),
    quoteNum: qNum,
    status: 'Draft',
    clientKey: iq_wizClient.lClientKey,
    clientName: iq_wizClient.sClientName1,
    deptKey: iq_wizDept.lDepartmentKey,
    deptName: iq_wizDept.sDepartmentName,
    billTo: {name:iq_wizClient.sClientName1,attn:'Accounts Payable',addr1:'',city:iq_wizClient.sClientCity,state:iq_wizClient.sClientState,zip:''},
    shipTo: {name:iq_wizDept.sDepartmentName,attn:'Sterile Processing',addr1:'',city:'',state:'',zip:''},
    salesRep: '',
    gpo: document.getElementById('iq_wGpo').value,
    visitRef: document.getElementById('iq_wVisitRef').value,
    quoteDate: dateStr,
    sentDate: null,
    poNumber: '',
    reviewedBy: document.getElementById('iq_wReviewedBy').value,
    notes: '',
    items: []
  };
  iq_allQuotes.unshift(newQ);
  iq_closeWiz();
  iq_applyFilters(); iq_updateKPIs();
  setTimeout(function(){ iq_openDrawer(newQ.id); }, 100);
}
