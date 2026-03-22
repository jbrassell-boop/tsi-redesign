// js/order-search.js — Universal "Find / Open Order" search modal
// Searches across Repairs, Product Sales, Instrument Repairs, and EndoCarts
// by WO#, SN#, PO#, or order number.
// Loaded on every page via shell.js.
// Styled to match the NWO repair wizard modal in repairs.html.

(function() {
  'use strict';


  // ── Status badge colors ────────────────────────────────────────────────
  function statusColor(s) {
    if (!s) return '#8896AA';
    var l = s.toLowerCase();
    if (l === 'complete' || l === 'billed' || l === 'invoiced' || l === 'shipped') return '#15803D';
    if (l === 'in progress' || l === 'in repair' || l === 'processing') return '#2563EB';
    if (l === 'received' || l === 'new' || l === 'quoted' || l === 'approved') return '#D97706';
    if (l === 'on hold' || l === 'outsourced' || l === 'waiting for approval') return '#DC2626';
    if (l === 'cancelled' || l === 'draft') return '#8896AA';
    return '#8896AA';
  }

  // ── Type badge ─────────────────────────────────────────────────────────
  function typeBadge(type) {
    var colors = {
      'Repair':      { bg:'#EFF6FF', text:'#2563EB' },
      'Product Sale':{ bg:'#F0FDF4', text:'#15803D' },
      'Instrument':  { bg:'#FFF7ED', text:'#C2410C' },
      'EndoCart':    { bg:'#FAF5FF', text:'#7C3AED' }
    };
    var c = colors[type] || { bg:'#F1F5F9', text:'#475569' };
    return '<span style="display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:700;' +
      'background:' + c.bg + ';color:' + c.text + '">' + type + '</span>';
  }

  // ── Collect results from all order types ───────────────────────────────
  function searchAll(q) {
    var results = [];
    var lower = q.toLowerCase();

    // 1. Repairs (from MockDB)
    if (typeof MockDB !== 'undefined') {
      var repairs = MockDB.getAll('repairs') || [];
      repairs.forEach(function(r) {
        if ((r.sWorkOrderNumber || '').toLowerCase().includes(lower) ||
            (r.sSerialNumber || '').toLowerCase().includes(lower) ||
            (r.sPurchaseOrder || '').toLowerCase().includes(lower)) {
          results.push({
            type: 'Repair',
            orderNum: r.sWorkOrderNumber || '',
            client: r.sClientName1 || r.sShipName1 || '\u2014',
            model: r.sScopeTypeDesc || r.sModel || '',
            serial: r.sSerialNumber || '',
            po: r.sPurchaseOrder || '',
            status: r.sRepairStatus || '',
            date: r.dtDateIn || '',
            page: 'repairs',
            key: r.lRepairKey
          });
        }
      });
    }

    // 2. Product Sales (from MockDB)
    if (typeof MockDB !== 'undefined') {
      var sales = MockDB.getAll('productSales') || [];
      sales.forEach(function(s) {
        if ((s.sWorkOrderNumber || '').toLowerCase().includes(lower) ||
            (s.sPurchaseOrder || '').toLowerCase().includes(lower)) {
          results.push({
            type: 'Product Sale',
            orderNum: s.sWorkOrderNumber || '',
            client: s.sClientName1 || '\u2014',
            model: '',
            serial: '',
            po: s.sPurchaseOrder || '',
            status: s.sStatus || '',
            date: s.dtOrderDate || '',
            page: 'product-sale',
            key: s.lProductSaleKey
          });
        }
      });
    }

    // 3. Instrument Repairs (from MockDB)
    var irList = (typeof MockDB !== 'undefined') ? (MockDB.getAll('instrumentRepairs') || []) : [];
    irList.forEach(function(r) {
      var serialMatch = false;
      if (r.items) {
        serialMatch = r.items.some(function(it) { return (it.serial || '').toLowerCase().includes(lower); });
      } else if (r.serials) {
        serialMatch = r.serials.some(function(sn) { return sn.toLowerCase().includes(lower); });
      }
      if ((r.orderNum || '').toLowerCase().includes(lower) ||
          (r.poNumber || '').toLowerCase().includes(lower) ||
          serialMatch) {
        results.push({
          type: 'Instrument',
          orderNum: r.orderNum || '',
          client: r.clientName || '\u2014',
          model: '',
          serial: '',
          po: r.poNumber || '',
          status: r.status || '',
          date: r.dateReceived || '',
          page: 'instruments',
          key: r.id
        });
      }
    });

    // 4. EndoCarts (from page data or MockDB)
    var ecList = (typeof _ecDemoQuotes !== 'undefined') ? _ecDemoQuotes : [];
    ecList.forEach(function(e) {
      if ((e.quoteNum || '').toLowerCase().includes(lower)) {
        results.push({
          type: 'EndoCart',
          orderNum: e.quoteNum || '',
          client: e.clientName || '\u2014',
          model: e.cartModel || '',
          serial: '',
          po: '',
          status: e.status || '',
          date: e.dateCreated || '',
          page: 'endocarts',
          key: e.lQuoteKey || e.id
        });
      }
    });

    return results;
  }

  // ── Format date ────────────────────────────────────────────────────────
  function fmtDate(d) {
    if (!d) return '';
    var dt = new Date(d);
    if (isNaN(dt)) return '';
    return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + String(dt.getFullYear()).slice(2);
  }

  function esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Inject styles + modal HTML ─────────────────────────────────────────
  var _injected = false;
  function inject() {
    if (_injected) return;
    _injected = true;

    // Inject scoped styles (mirrors .nwo-* from repairs.html)
    var style = document.createElement('style');
    style.textContent =
      '.os-overlay{position:fixed;inset:0;background:rgba(var(--primary-rgb),.3);z-index:9998;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .2s;backdrop-filter:blur(2px)}' +
      '.os-overlay.open{opacity:1;pointer-events:all}' +
      '.os-modal{background:#fff;border-radius:12px;width:1050px;max-width:98vw;box-shadow:0 24px 72px rgba(var(--primary-rgb),.25);overflow:hidden;transform:translateY(15px);transition:transform .2s;display:flex;flex-direction:column;max-height:90vh}' +
      '.os-overlay.open .os-modal{transform:translateY(0)}' +
      '.os-head{padding:16px 24px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;align-items:center;background:linear-gradient(120deg,var(--navy) 0%,var(--steel) 100%);border-radius:12px 12px 0 0;flex-shrink:0}' +
      '.os-head h2{font-size:14px;color:#fff;font-weight:600;display:flex;align-items:center;gap:8px;margin:0;letter-spacing:.3px}' +
      '.os-close{background:none;border:none;color:rgba(255,255,255,.7);cursor:pointer;display:flex;align-items:center;justify-content:center;padding:4px;border-radius:4px;transition:all .1s}' +
      '.os-close:hover{background:rgba(255,255,255,.15);color:#fff}' +
      '.os-close svg{width:18px;height:18px}' +
      '.os-search{display:flex;align-items:center;gap:8px;padding:14px 24px;border-bottom:1px solid var(--border);flex-shrink:0}' +
      '.os-results{flex:1;overflow:auto;background:#fff;padding:0}' +
      '.os-results table{width:100%;min-width:820px;border-collapse:collapse}' +
      '.os-results th{background:var(--bg);font-size:9.5px;font-weight:700;color:var(--label);text-transform:uppercase;letter-spacing:.3px;padding:6px 10px;text-align:left;border-bottom:1px solid var(--border-dk);white-space:nowrap;position:sticky;top:0;z-index:1}' +
      '.os-results td{padding:5px 10px;font-size:11px;border-bottom:1px solid var(--border);cursor:pointer}' +
      '.os-results tr:hover td{background:#ECFEFF}' +
      '.os-results tr.selected td{background:#DBEAFE;font-weight:600}' +
      '.os-results .msg-empty{text-align:center;padding:30px 20px;color:var(--muted);font-size:12px;cursor:default}' +
      '#orderSearchInput:focus{border-color:var(--navy);box-shadow:0 0 0 2px rgba(var(--primary-rgb),.08)}';
    document.head.appendChild(style);

    // Modal HTML
    var el = document.createElement('div');
    el.id = 'orderSearchOverlay';
    el.className = 'os-overlay';
    el.onclick = function(e) { if (e.target === el) orderSearchClose(); };
    el.innerHTML =
      '<div class="os-modal">' +

        // Header
        '<div class="os-head">' +
          '<h2><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:16px;height:16px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg> Find / Open Order</h2>' +
          '<button class="os-close" onclick="orderSearchClose()"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg></button>' +
        '</div>' +

        // Search bar
        '<div class="os-search">' +
          '<input type="text" id="orderSearchInput" placeholder="Search by WO#, SN#, PO#, or Order#\u2026" autocomplete="off"' +
          ' style="flex:1;height:32px;border:1.5px solid var(--border-dk);border-radius:4px 0 0 4px;padding:0 12px;font-size:12px;font-family:inherit;outline:none;transition:border-color .15s"' +
          ' onkeydown="if(event.key===\'Enter\')orderSearchRun()">' +
          '<button onclick="orderSearchRun()" style="height:32px;padding:0 18px;background:var(--navy);color:#fff;border:none;border-radius:0 4px 4px 0;font-size:12px;font-weight:700;cursor:pointer;font-family:inherit;white-space:nowrap">Search</button>' +
        '</div>' +

        // Results table
        '<div class="os-results">' +
          '<table>' +
            '<thead><tr>' +
              '<th style="width:8%">Type</th>' +
              '<th style="width:12%">Order #</th>' +
              '<th style="width:20%">Client</th>' +
              '<th style="width:12%">Model</th>' +
              '<th style="width:14%">Serial Number</th>' +
              '<th style="width:10%">P.O. #</th>' +
              '<th style="width:9%">Date In</th>' +
              '<th style="width:9%">Status</th>' +
            '</tr></thead>' +
            '<tbody id="orderSearchResults">' +
              '<tr><td colspan="8" class="msg-empty">Enter search criteria above and click Search.</td></tr>' +
            '</tbody>' +
          '</table>' +
        '</div>' +

      '</div>';

    document.body.appendChild(el);
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && el.classList.contains('open')) orderSearchClose();
    });
  }

  // ── Public API ─────────────────────────────────────────────────────────
  window.openOrderSearch = function() {
    inject();
    document.getElementById('orderSearchOverlay').classList.add('open');
    var inp = document.getElementById('orderSearchInput');
    if (inp) { inp.value = ''; inp.focus(); }
    document.getElementById('orderSearchResults').innerHTML =
      '<tr><td colspan="8" class="msg-empty">Enter search criteria above and click Search.</td></tr>';
  };

  window.orderSearchClose = function() {
    var el = document.getElementById('orderSearchOverlay');
    if (el) el.classList.remove('open');
  };

  window.orderSearchRun = function() {
    var tbody = document.getElementById('orderSearchResults');
    var q = (document.getElementById('orderSearchInput').value || '').trim();

    if (!q) {
      tbody.innerHTML = '<tr><td colspan="8" class="msg-empty">Enter search criteria above and click Search.</td></tr>';
      return;
    }

    tbody.innerHTML = '<tr><td colspan="8" class="msg-empty" style="color:var(--blue)">Searching\u2026</td></tr>';

    setTimeout(function() {
      var results = searchAll(q);

      if (!results.length) {
        tbody.innerHTML = '<tr><td colspan="8" class="msg-empty">No orders found matching \u201c' + esc(q) + '\u201d</td></tr>';
        return;
      }

      tbody.innerHTML = results.slice(0, 50).map(function(r) {
        return '<tr onclick="orderSearchOpen(\'' + r.page + '\',' + r.key + ')">' +
          '<td>' + typeBadge(r.type) + '</td>' +
          '<td><code style="font-size:10px">' + esc(r.orderNum) + '</code></td>' +
          '<td style="font-weight:600">' + esc(r.client) + '</td>' +
          '<td>' + esc(r.model) + '</td>' +
          '<td>' + esc(r.serial) + '</td>' +
          '<td>' + esc(r.po) + '</td>' +
          '<td>' + fmtDate(r.date) + '</td>' +
          '<td><span style="color:' + statusColor(r.status) + ';font-weight:600">' + esc(r.status) + '</span></td>' +
          '</tr>';
      }).join('');
    }, 50);
  };

  window.orderSearchOpen = function(page, key) {
    orderSearchClose();
    var paramMap = {
      'repairs':      'key',
      'product-sale': 'key',
      'instruments':  'id',
      'endocarts':    'key'
    };
    var param = paramMap[page] || 'key';
    window.location = page + '?' + param + '=' + key;
  };

})();
