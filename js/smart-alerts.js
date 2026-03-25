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

function evaluateRepair(data) {
  var alerts = [];
  var scopeKey = data.lScopeKey || 0;
  var repairKey = data.lRepairKey || 0;
  var clientKey = data.lClientKey || 0;

  // Resolve clientKey from department if not on repair directly
  if (!clientKey && data.lDepartmentKey && typeof MockDB !== 'undefined') {
    var dept = MockDB.getByKey('departments', data.lDepartmentKey);
    if (dept) clientKey = dept.lClientKey || 0;
  }

  // 40-day return
  if (scopeKey && typeof MockDB !== 'undefined') {
    var priors = MockDB.getFiltered('repairs', function(r) {
      return (r.lScopeKey || 0) == scopeKey && (r.lRepairKey || 0) != repairKey;
    });
    if (priors && priors.length) {
      var currentIn = validDate(data.dtDateIn);
      if (currentIn) {
        // find most recent prior by dtDateOut
        var mostRecent = null;
        var mostRecentDate = null;
        for (var i = 0; i < priors.length; i++) {
          var pOut = validDate(priors[i].dtDateOut);
          if (pOut && (!mostRecentDate || pOut > mostRecentDate)) {
            mostRecentDate = pOut;
            mostRecent = priors[i];
          }
        }
        if (mostRecent && mostRecentDate) {
          var gap = daysBetween(mostRecentDate, currentIn);
          if (gap <= 40) {
            var priorWO = mostRecent.sWorkOrderNumber || mostRecent.psWorkOrderNumber || mostRecent.sWONbr || '?';
            alerts.push({
              type: 'warning',
              msg: '40-Day Return \u2014 this scope was last repaired ' + gap + ' days ago (WO# ' + priorWO + ')'
            });
          }
        }
      }
    }
  }

  // Max charge exceeded
  var maxCharge = parseFloat(data.mMaxCharge || 0);
  var repairCost = parseFloat(data.dblAmtRepair || 0);
  if (maxCharge > 0 && repairCost > maxCharge) {
    alerts.push({
      type: 'warning',
      msg: 'Max Charge Exceeded \u2014 repair cost ' + fmtMoney(repairCost) + ' exceeds ' + fmtMoney(maxCharge) + ' cap'
    });
  }

  // Contract coverage
  if (clientKey && typeof MockDB !== 'undefined') {
    var activeContracts = MockDB.getFiltered('contracts', function(c) {
      return (c.lClientKey || 0) == clientKey && (c.bActive || c.bActive === true || c.bActive === 1);
    });
    if (activeContracts && activeContracts.length) {
      var con = activeContracts[0];
      var cType = con.sContractType || con.sAgreementType || 'Service';
      var endStr = fmtDate(con.dtEndDate || con.dtContractEnd);
      alerts.push({
        type: 'info',
        msg: 'Contract Coverage \u2014 active agreement ' + cType + (endStr ? ' through ' + endStr : '')
      });
    } else {
      alerts.push({
        type: 'opportunity',
        msg: 'No Contract \u2014 this client has no active service agreement'
      });
    }
  }

  // Hot list
  if (data.bHotList || data.bHotList === true || data.bHotList === 1) {
    alerts.push({
      type: 'warning',
      msg: 'Hot List \u2014 this repair is flagged as priority'
    });
  }

  return alerts;
}

function evaluateClient(data) {
  var alerts = [];
  var clientKey = data.lClientKey || 0;
  if (!clientKey || typeof MockDB === 'undefined') return alerts;

  // No contract
  var activeContracts = MockDB.getFiltered('contracts', function(c) {
    return (c.lClientKey || 0) == clientKey && (c.bActive || c.bActive === true || c.bActive === 1);
  });
  if (!activeContracts || !activeContracts.length) {
    alerts.push({
      type: 'opportunity',
      msg: 'Growth Opportunity \u2014 client has no active service agreement (only 9.9% of active clients are under contract)'
    });
  }

  // Inactive > 6 months — check repairs across all departments for this client
  var depts = MockDB.getFiltered('departments', function(d) {
    return (d.lClientKey || 0) == clientKey;
  });
  if (depts && depts.length) {
    var deptKeys = {};
    for (var i = 0; i < depts.length; i++) {
      deptKeys[depts[i].lDepartmentKey || 0] = true;
    }
    var clientRepairs = MockDB.getFiltered('repairs', function(r) {
      return deptKeys[r.lDepartmentKey || 0];
    });
    if (clientRepairs && clientRepairs.length) {
      var mostRecentIn = null;
      for (var j = 0; j < clientRepairs.length; j++) {
        var dt = validDate(clientRepairs[j].dtDateIn);
        if (dt && (!mostRecentIn || dt > mostRecentIn)) {
          mostRecentIn = dt;
        }
      }
      if (mostRecentIn) {
        var monthsAgo = daysBetween(mostRecentIn, NOW);
        if (monthsAgo > 180) {
          alerts.push({
            type: 'warning',
            msg: 'Inactive Client \u2014 no repairs received in over 6 months'
          });
        }
      }
    }
  }

  return alerts;
}

function evaluateContract(data) {
  var alerts = [];
  var contractKey = data.lContractKey || data.lAgreementKey || 0;
  if (typeof MockDB === 'undefined') return alerts;

  // Expense multiplier
  var contractValue = parseFloat(data.dblContractValue || data.dblAgreementValue || 0);
  if (contractKey && contractValue > 0) {
    var contractRepairs = MockDB.getFiltered('repairs', function(r) {
      return (r.lContractKey || r.lAgreementKey || 0) == contractKey;
    });
    if (contractRepairs && contractRepairs.length) {
      var totalCost = 0;
      for (var i = 0; i < contractRepairs.length; i++) {
        totalCost += parseFloat(contractRepairs[i].dblAmtRepair || 0);
      }
      var ratio = totalCost / contractValue;
      if (ratio > 1.0) {
        alerts.push({
          type: 'warning',
          msg: 'Expense Multiplier ' + ratio.toFixed(1) + 'x \u2014 this contract is losing money'
        });
      }
    }
  }

  // Expiring soon
  var endDate = validDate(data.dtEndDate || data.dtContractEnd);
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

  // Avoidable damage rate
  if (contractKey) {
    var allRepairs = MockDB.getFiltered('repairs', function(r) {
      return (r.lContractKey || r.lAgreementKey || 0) == contractKey;
    });
    if (allRepairs && allRepairs.length > 0) {
      var damageCount = 0;
      for (var k = 0; k < allRepairs.length; k++) {
        var reason = (allRepairs[k].sRepairReason || '').toLowerCase();
        if (reason.indexOf('damage') !== -1) {
          damageCount++;
        }
      }
      var pct = Math.round((damageCount / allRepairs.length) * 100);
      if (pct > 20) {
        alerts.push({
          type: 'info',
          msg: 'Avoidable Damage Rate ' + pct + '% \u2014 consider training recommendation'
        });
      }
    }
  }

  return alerts;
}

function evaluateDepartment(data) {
  var alerts = [];
  var deptKey = data.lDepartmentKey || 0;
  if (!deptKey || typeof MockDB === 'undefined') return alerts;

  var deptRepairs = MockDB.getFiltered('repairs', function(r) {
    return (r.lDepartmentKey || 0) == deptKey;
  });
  if (deptRepairs && deptRepairs.length) {
    var mostRecentIn = null;
    for (var i = 0; i < deptRepairs.length; i++) {
      var dt = validDate(deptRepairs[i].dtDateIn);
      if (dt && (!mostRecentIn || dt > mostRecentIn)) {
        mostRecentIn = dt;
      }
    }
    if (mostRecentIn) {
      var daysGap = daysBetween(mostRecentIn, NOW);
      if (daysGap > 180) {
        alerts.push({
          type: 'warning',
          msg: 'Inactive Department \u2014 no repairs received in over 6 months'
        });
      }
    }
  }

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
