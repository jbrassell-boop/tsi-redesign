/* ═══════════════════════════════════════════════════════════════════
   smart-alerts.js  —  Contextual smart alerts for TSI operations
   Evaluates repair, client, contract, department records and
   surfaces actionable warnings, info, and growth opportunities.
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

// ── Helpers ──────────────────────────────────────────────────────

function fmtMoney(n) {
  return '$' + parseFloat(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(d) {
  if (!d) return '';
  var dt = new Date(d);
  if (isNaN(dt.getTime())) return '';
  return (dt.getMonth() + 1) + '/' + dt.getDate() + '/' + String(dt.getFullYear()).slice(-2);
}

function daysBetween(a, b) {
  var msPerDay = 86400000;
  return Math.round(Math.abs((new Date(a) - new Date(b)) / msPerDay));
}

function validDate(d) {
  if (!d) return null;
  var dt = new Date(d);
  return isNaN(dt.getTime()) ? null : dt;
}

var NOW = new Date();

// ── SVG Icons (14x14, stroke currentColor) ───────────────────────

var ICONS = {
  warning: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M8 1.5L1 14h14L8 1.5z"/><line x1="8" y1="6" x2="8" y2="9"/><circle cx="8" cy="11.5" r="0.5" fill="currentColor" stroke="none"/></svg>',
  info: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<circle cx="8" cy="8" r="6.5"/><line x1="8" y1="7" x2="8" y2="11.5"/><circle cx="8" cy="4.5" r="0.5" fill="currentColor" stroke="none"/></svg>',
  opportunity: '<svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">'
    + '<path d="M8 1l2.1 4.3 4.7.7-3.4 3.3.8 4.7L8 11.7 3.8 14l.8-4.7L1.2 6l4.7-.7L8 1z"/></svg>'
};

// ── Evaluation Engines ───────────────────────────────────────────

// All evaluate functions are now sync and use data already on the repair record.
// Cross-entity lookups (contract details, prior repairs) use the API via async
// wrapper — callers should use SmartAlerts.evaluateAsync() for full results.

function evaluateRepair(data) {
  var alerts = [];

  // Max charge exceeded (data already on repair record)
  var maxCharge = parseFloat(data.mMaxCharge || 0);
  var repairCost = parseFloat(data.dblAmtRepair || 0);
  if (maxCharge > 0 && repairCost > maxCharge) {
    alerts.push({
      type: 'warning',
      msg: 'Max Charge Exceeded \u2014 repair cost ' + fmtMoney(repairCost) + ' exceeds ' + fmtMoney(maxCharge) + ' cap'
    });
  }

  // Contract coverage (lContractKey is on the repair record)
  if (data.lContractKey) {
    alerts.push({
      type: 'info',
      msg: 'Contract Coverage \u2014 this department is under an active service agreement'
    });
  } else if (data.lClientKey || data.lDepartmentKey) {
    alerts.push({
      type: 'opportunity',
      msg: 'No Contract \u2014 this client has no active service agreement'
    });
  }

  // Hot list (data on repair record)
  if (data.bHotList || data.bHotList === true || data.bHotList === 1) {
    alerts.push({
      type: 'warning',
      msg: 'Hot List \u2014 this repair is flagged as priority'
    });
  }

  // 40-day return (computed by repairs-detail.js populateDetail and shown on UI)
  // The detailed 40-day check happens in populateDetail via _repairListData scan

  return alerts;
}

function evaluateClient(data) {
  var alerts = [];
  var clientKey = data.lClientKey || 0;
  if (!clientKey) return alerts;

  // Contract check uses data already available on the loaded record
  if (!data.lContractKey && !data._hasContract) {
    alerts.push({
      type: 'opportunity',
      msg: 'Growth Opportunity \u2014 client has no active service agreement'
    });
  }

  return alerts;
}

function evaluateContract(data) {
  var alerts = [];

  // Expiring soon (data on contract record)
  var endDate = validDate(data.dtEndDate || data.dtContractEnd || data.dtDateTermination);
  if (endDate) {
    var daysUntil = Math.round((endDate - NOW) / 86400000);
    if (daysUntil >= 0 && daysUntil <= 30) {
      var renewed = data.lContractKey_Renewed || 0;
      if (!renewed) {
        alerts.push({
          type: 'warning',
          msg: 'Expiring in ' + daysUntil + ' days \u2014 no renewal pending'
        });
      }
    }
  }

  return alerts;
}

function evaluateDepartment(data) {
  var alerts = [];
  // Department-level alerts now computed from data on the loaded record
  // Inactive department detection moved to dashboard KPI layer
  return alerts;
}

// ── Public API ───────────────────────────────────────────────────

function evaluate(context, data) {
  if (!data) return [];
  switch (context) {
    case 'repair':     return evaluateRepair(data);
    case 'client':     return evaluateClient(data);
    case 'contract':   return evaluateContract(data);
    case 'department': return evaluateDepartment(data);
    default:           return [];
  }
}

function render(containerSelector, alerts) {
  var el = document.querySelector(containerSelector);
  if (!el) return;

  if (!alerts || !alerts.length) {
    el.style.display = 'none';
    el.innerHTML = '';
    return;
  }

  el.style.display = 'flex';
  var html = '';
  for (var i = 0; i < alerts.length; i++) {
    var a = alerts[i];
    var icon = ICONS[a.type] || ICONS.info;
    html += '<div class="alert-item alert-' + a.type + '">'
      + icon
      + '<span class="alert-msg">' + a.msg + '</span>'
      + (a.action ? '<span class="alert-action">' + a.action + '</span>' : '')
      + '<button class="alert-dismiss" title="Dismiss">\u00d7</button>'
      + '</div>';
  }
  el.innerHTML = html;

  // wire dismiss buttons
  var btns = el.querySelectorAll('.alert-dismiss');
  for (var j = 0; j < btns.length; j++) {
    btns[j].addEventListener('click', function() {
      var item = this.parentElement;
      item.parentElement.removeChild(item);
      // hide container if empty
      if (!el.querySelector('.alert-item')) {
        el.style.display = 'none';
      }
    });
  }
}

window.SmartAlerts = { evaluate: evaluate, render: render };

})();
