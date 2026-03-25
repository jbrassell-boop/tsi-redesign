/* ═══════════════════════════════════════════════════════════════════
   batch-ops.js  —  Multi-select batch operations for TSI tables
   Adds checkbox selection to tables + floating batch action bar
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

var _selected = {};  // tableId → Set of row keys
var _barEl = null;

// ── Inject floating batch bar ────────────────────────────────────
function _injectBar() {
  if (_barEl) return;
  _barEl = document.createElement('div');
  _barEl.className = 'batch-bar';
  _barEl.id = 'batchBar';
  _barEl.innerHTML =
    '<span><span class="batch-count" id="batchCount">0</span> selected</span>' +
    '<button class="batch-btn" onclick="BatchOps.action(\'status\')">Change Status</button>' +
    '<button class="batch-btn" onclick="BatchOps.action(\'export\')">Export Selected</button>' +
    '<button class="batch-close" onclick="BatchOps.clearAll()" title="Clear selection">&times;</button>';
  document.body.appendChild(_barEl);
}

// ── Initialize batch selection on a table ────────────────────────
function init(tableId, options) {
  options = options || {};
  _selected[tableId] = new Set();

  var tbl = document.getElementById(tableId);
  if (!tbl) return;

  // Add checkbox to header
  var thead = tbl.querySelector('thead tr');
  if (thead) {
    var th = document.createElement('th');
    th.style.cssText = 'width:28px;text-align:center;padding:4px';
    th.innerHTML = '<input type="checkbox" style="accent-color:var(--navy);width:14px;height:14px;cursor:pointer" onchange="BatchOps.toggleAll(\'' + tableId + '\', this.checked)"/>';
    thead.insertBefore(th, thead.firstChild);
  }

  // Add checkboxes to existing rows
  _addCheckboxesToRows(tableId);

  // Observe for new rows (pagination, filtering)
  var tbody = tbl.querySelector('tbody');
  if (tbody) {
    var observer = new MutationObserver(function() {
      _addCheckboxesToRows(tableId);
    });
    observer.observe(tbody, { childList: true });
  }

  _injectBar();
}

function _addCheckboxesToRows(tableId) {
  var tbl = document.getElementById(tableId);
  if (!tbl) return;
  var rows = tbl.querySelectorAll('tbody tr');
  rows.forEach(function(row) {
    if (row.querySelector('.batch-cb')) return; // already has checkbox
    var td = document.createElement('td');
    td.style.cssText = 'width:28px;text-align:center;padding:4px';
    td.innerHTML = '<input type="checkbox" class="batch-cb" style="accent-color:var(--navy);width:14px;height:14px;cursor:pointer"/>';
    row.insertBefore(td, row.firstChild);
    var cb = td.querySelector('.batch-cb');
    cb.addEventListener('change', function(e) {
      e.stopPropagation();
      var key = row.dataset.key || row.dataset.repairKey || row.dataset.id || row.rowIndex;
      if (cb.checked) {
        _selected[tableId].add(key);
        row.style.background = '#DBEAFE';
      } else {
        _selected[tableId].delete(key);
        row.style.background = '';
      }
      _updateBar();
    });
    // Prevent row click from triggering when clicking checkbox
    td.addEventListener('click', function(e) { e.stopPropagation(); });
  });
}

function _updateBar() {
  var total = 0;
  for (var t in _selected) { total += _selected[t].size; }
  if (!_barEl) return;
  document.getElementById('batchCount').textContent = total;
  if (total > 0) {
    _barEl.classList.add('visible');
  } else {
    _barEl.classList.remove('visible');
  }
}

// ── Public API ───────────────────────────────────────────────────

function toggleAll(tableId, checked) {
  var tbl = document.getElementById(tableId);
  if (!tbl) return;
  var cbs = tbl.querySelectorAll('tbody .batch-cb');
  cbs.forEach(function(cb) {
    cb.checked = checked;
    var row = cb.closest('tr');
    var key = row.dataset.key || row.dataset.repairKey || row.dataset.id || row.rowIndex;
    if (checked) {
      _selected[tableId].add(key);
      row.style.background = '#DBEAFE';
    } else {
      _selected[tableId].delete(key);
      row.style.background = '';
    }
  });
  _updateBar();
}

function clearAll() {
  for (var t in _selected) {
    _selected[t].clear();
    var tbl = document.getElementById(t);
    if (tbl) {
      tbl.querySelectorAll('tbody .batch-cb').forEach(function(cb) {
        cb.checked = false;
        cb.closest('tr').style.background = '';
      });
      var headerCb = tbl.querySelector('thead input[type=checkbox]');
      if (headerCb) headerCb.checked = false;
    }
  }
  _updateBar();
}

function getSelected(tableId) {
  return _selected[tableId] ? Array.from(_selected[tableId]) : [];
}

function action(type) {
  var allKeys = [];
  for (var t in _selected) {
    _selected[t].forEach(function(k) { allKeys.push(k); });
  }
  if (!allKeys.length) return;

  if (type === 'status') {
    alert('Batch status change for ' + allKeys.length + ' items — coming soon');
  } else if (type === 'export') {
    // Simple CSV export of selected keys
    var csv = 'Selected Keys\n' + allKeys.join('\n');
    var blob = new Blob([csv], { type: 'text/csv' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'batch-export.csv';
    a.click();
  }
}

window.BatchOps = {
  init: init,
  toggleAll: toggleAll,
  clearAll: clearAll,
  getSelected: getSelected,
  action: action
};

})();
