// js/command-palette.js — Global command palette (Ctrl+K / Cmd+K)
// Searches across Repairs, Clients, Departments, Contracts with type-ahead.
// Loaded on every page via shell.js.

(function() {
  'use strict';

  // ── HTML escape ──────────────────────────────────────────────────────
  function _esc(s) { var d = document.createElement('div'); d.textContent = s || ''; return d.innerHTML; }

  // ── Type badge colors ────────────────────────────────────────────────
  var _badgeColors = {
    repair:     '#0E7490',
    client:     '#2E74B5',
    department: '#7C3AED',
    contract:   '#16A34A',
    action:     '#D97706'
  };

  // ── Quick Actions ────────────────────────────────────────────────────
  var _quickActions = [
    { label: 'New Repair Order',       page: 'repairs',      action: function() { if (typeof openNewOrderWizard === 'function') openNewOrderWizard('repairs', 'New Repair Order', 'repair'); } },
    { label: 'New Product Sale',       page: 'product-sale', action: function() { if (typeof openNewOrderWizard === 'function') openNewOrderWizard('product-sale', 'New Product Sale', 'sale'); } },
    { label: 'New Instrument Repair',  page: 'instruments',  action: function() { if (typeof openNewOrderWizard === 'function') openNewOrderWizard('instruments', 'New Instrument Repair', 'repair'); } },
    { label: 'New Endocart Order',     page: 'endocarts',    action: function() { if (typeof openNewOrderWizard === 'function') openNewOrderWizard('endocarts', 'New Endocart Order', 'endocart'); } }
  ];

  // ── Recent items (localStorage) ──────────────────────────────────────
  var _recentKey = 'tsi_cmd_recent';

  function _getRecent() {
    try { return JSON.parse(localStorage.getItem(_recentKey)) || []; }
    catch(e) { return []; }
  }

  function _addRecent(item) {
    var list = _getRecent();
    // Remove duplicate by key+type
    list = list.filter(function(r) { return !(r.key === item.key && r.type === item.type); });
    list.unshift({ type: item.type, title: item.title, subtitle: item.subtitle, page: item.page, key: item.key });
    if (list.length > 10) list = list.slice(0, 10);
    try { localStorage.setItem(_recentKey, JSON.stringify(list)); } catch(e) {}
  }

  // ── Search logic ─────────────────────────────────────────────────────
  var _searchCache = null;
  async function _search(q) {
    var groups = [];

    if (!q || q.length < 2) {
      // Show recent + quick actions
      var recent = _getRecent();
      if (recent.length) {
        groups.push({ label: 'Recent', items: recent.map(function(r) {
          return { type: r.type, title: r.title, subtitle: r.subtitle, page: r.page, key: r.key };
        })});
      }
      groups.push({ label: 'Quick Actions', items: _quickActions.map(function(a) {
        return { type: 'action', title: a.label, subtitle: '', page: a.page, key: null, action: a.action };
      })});
      return groups;
    }

    var lower = q.toLowerCase();
    var total = 0;
    var max = 20;
    var perType = 5;

    // Search is now async — uses API.  Caller must await.
    // We cache the last API results to avoid re-fetching on every keystroke.
    if (!_searchCache || _searchCache._ts < Date.now() - 60000) {
      // Cache expired or missing — fetch fresh data (all types in parallel)
      try {
        var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '0');
        var fetches = await Promise.all([
          typeof API !== 'undefined' && API.getRepairList ? API.getRepairList(svcKey).catch(function() { return []; }) : Promise.resolve([]),
          typeof API !== 'undefined' && API.getAllClients ? API.getAllClients(svcKey).catch(function() { return []; }) : Promise.resolve([]),
          typeof API !== 'undefined' && API.getAllDepartments ? API.getAllDepartments(svcKey).catch(function() { return []; }) : Promise.resolve([]),
          typeof API !== 'undefined' && API.getContractsList ? API.getContractsList().catch(function() { return []; }) : Promise.resolve([])
        ]);
        _searchCache = {
          repairs: Array.isArray(fetches[0]) ? fetches[0] : (fetches[0] && fetches[0].dataSource ? fetches[0].dataSource : []),
          clients: Array.isArray(fetches[1]) ? fetches[1] : (fetches[1] && fetches[1].data ? fetches[1].data : []),
          departments: Array.isArray(fetches[2]) ? fetches[2] : (fetches[2] && fetches[2].data ? fetches[2].data : []),
          contracts: Array.isArray(fetches[3]) ? fetches[3] : (fetches[3] && fetches[3].data ? fetches[3].data : []),
          _ts: Date.now()
        };
      } catch(e) { _searchCache = { repairs:[], clients:[], departments:[], contracts:[], _ts: Date.now() }; }
    }

    // 1. Repairs
    var repairHits = [];
    for (var i = 0; i < _searchCache.repairs.length && repairHits.length < perType; i++) {
      var r = _searchCache.repairs[i];
      var wo = r.sWorkOrderNumber || '';
      var sn = r.sSerialNumber || '';
      if (wo.toLowerCase().indexOf(lower) !== -1 || sn.toLowerCase().indexOf(lower) !== -1) {
        repairHits.push({
          type: 'repair',
          title: wo || 'Repair',
          subtitle: (r.sClientName1 || r.sShipName1 || '') + (sn ? ' \u2022 SN: ' + sn : ''),
          page: 'repairs',
          key: r.lRepairKey
        });
      }
    }
    if (repairHits.length) { groups.push({ label: 'Repairs', items: repairHits }); total += repairHits.length; }

    // 2. Clients
    if (total < max) {
      var clientHits = [];
      for (var ci = 0; ci < _searchCache.clients.length && clientHits.length < perType; ci++) {
        var c = _searchCache.clients[ci];
        var cname = c.sClientName1 || '';
        if (cname.toLowerCase().indexOf(lower) !== -1) {
          clientHits.push({
            type: 'client',
            title: cname,
            subtitle: (c.sCity || c.sMailCity || '') + ((c.sCity || c.sMailCity) && (c.sState || c.sMailState) ? ', ' : '') + (c.sState || c.sMailState || ''),
            page: 'clients',
            key: c.lClientKey
          });
        }
      }
      if (clientHits.length) { groups.push({ label: 'Clients', items: clientHits }); total += clientHits.length; }
    }

    // 3. Departments
    if (total < max) {
      var deptHits = [];
      for (var di = 0; di < _searchCache.departments.length && deptHits.length < perType; di++) {
        var dept = _searchCache.departments[di];
        var dname = dept.sDepartmentName || '';
        if (dname.toLowerCase().indexOf(lower) !== -1) {
          deptHits.push({
            type: 'department',
            title: dname,
            subtitle: '',
            page: 'departments',
            key: dept.lDepartmentKey
          });
        }
      }
      if (deptHits.length) { groups.push({ label: 'Departments', items: deptHits }); total += deptHits.length; }
    }

    // 4. Contracts
    if (total < max) {
      var contractHits = [];
      for (var ki = 0; ki < _searchCache.contracts.length && contractHits.length < perType; ki++) {
        var ct = _searchCache.contracts[ki];
        var ctName = ct.sContractNumber || '';
        var ctClient = ct.sClientName1 || '';
        if (ctName.toLowerCase().indexOf(lower) !== -1 || ctClient.toLowerCase().indexOf(lower) !== -1) {
          contractHits.push({
            type: 'contract',
            title: ctName || 'Contract',
            subtitle: ctClient,
            page: 'contracts',
            key: ct.lContractKey
          });
        }
      }
      if (contractHits.length) { groups.push({ label: 'Contracts', items: contractHits }); total += contractHits.length; }
    }

    return groups;
  }

  // ── Flatten groups into ordered result list ──────────────────────────
  function _flatten(groups) {
    var flat = [];
    groups.forEach(function(g) {
      g.items.forEach(function(item) { flat.push(item); });
    });
    return flat;
  }

  // ── Render ───────────────────────────────────────────────────────────
  var _selectedIdx = -1;
  var _flatResults = [];

  function _render(groups) {
    var el = document.getElementById('cmdResults');
    if (!el) return;

    _flatResults = _flatten(groups);

    if (!_flatResults.length) {
      var q = (document.getElementById('cmdInput').value || '').trim();
      el.innerHTML = '<div class="cmd-empty">No results for \u201c' + _esc(q) + '\u201d</div>';
      _selectedIdx = -1;
      return;
    }

    _selectedIdx = 0;
    var html = '';
    var idx = 0;

    groups.forEach(function(g) {
      html += '<div class="cmd-group-label">' + _esc(g.label) + '</div>';
      g.items.forEach(function(item) {
        var color = _badgeColors[item.type] || '#475569';
        var selected = idx === _selectedIdx ? ' cmd-selected' : '';
        html += '<div class="cmd-result' + selected + '" data-idx="' + idx + '">' +
          '<span class="cmd-badge" style="background:' + color + '">' + _esc(item.type) + '</span>' +
          '<div class="cmd-result-text">' +
            '<span class="cmd-result-title">' + _esc(item.title) + '</span>' +
            (item.subtitle ? '<span class="cmd-result-sub">' + _esc(item.subtitle) + '</span>' : '') +
          '</div>' +
        '</div>';
        idx++;
      });
    });

    el.innerHTML = html;

    // Attach click handlers
    var rows = el.querySelectorAll('.cmd-result');
    rows.forEach(function(row) {
      row.addEventListener('click', function() {
        var i = parseInt(row.getAttribute('data-idx'), 10);
        _navigate(_flatResults[i]);
      });
    });
  }

  // ── Selection management ─────────────────────────────────────────────
  function _updateSelection() {
    var el = document.getElementById('cmdResults');
    if (!el) return;
    var rows = el.querySelectorAll('.cmd-result');
    rows.forEach(function(row, i) {
      if (i === _selectedIdx) {
        row.classList.add('cmd-selected');
        row.scrollIntoView({ block: 'nearest' });
      } else {
        row.classList.remove('cmd-selected');
      }
    });
  }

  // ── Navigate to result ───────────────────────────────────────────────
  function _navigate(item) {
    if (!item) return;
    _close();

    if (item.action) {
      item.action();
      return;
    }

    _addRecent(item);
    window.location = item.page + '.html?key=' + item.key;
  }

  // ── Debounce ─────────────────────────────────────────────────────────
  var _debounceTimer = null;

  function _onInput() {
    clearTimeout(_debounceTimer);
    _debounceTimer = setTimeout(async function() {
      var q = (document.getElementById('cmdInput').value || '').trim();
      var groups = await _search(q);
      _render(groups);
    }, 200);
  }

  // ── Keyboard nav inside palette ──────────────────────────────────────
  function _onKeydown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (_flatResults.length) {
        _selectedIdx = (_selectedIdx + 1) % _flatResults.length;
        _updateSelection();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (_flatResults.length) {
        _selectedIdx = (_selectedIdx - 1 + _flatResults.length) % _flatResults.length;
        _updateSelection();
      }
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (_selectedIdx >= 0 && _selectedIdx < _flatResults.length) {
        _navigate(_flatResults[_selectedIdx]);
      }
    }
  }

  // ── Inject HTML ──────────────────────────────────────────────────────
  var _injected = false;

  function _inject() {
    if (_injected) return;
    _injected = true;

    var overlay = document.createElement('div');
    overlay.className = 'cmd-overlay';
    overlay.id = 'cmdOverlay';
    overlay.addEventListener('click', function(e) { if (e.target === overlay) _close(); });

    overlay.innerHTML =
      '<div class="cmd-box">' +
        '<div class="cmd-input-wrap">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px;color:var(--muted);flex-shrink:0"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>' +
          '<input id="cmdInput" placeholder="Search repairs, clients, or type a command\u2026" autocomplete="off"/>' +
          '<kbd>ESC</kbd>' +
        '</div>' +
        '<div class="cmd-results" id="cmdResults"></div>' +
      '</div>';

    document.body.appendChild(overlay);

    // Wire input events
    var inp = document.getElementById('cmdInput');
    inp.addEventListener('input', _onInput);
    inp.addEventListener('keydown', _onKeydown);
  }

  // ── Open / Close ─────────────────────────────────────────────────────
  function _open() {
    _inject();
    var overlay = document.getElementById('cmdOverlay');
    overlay.classList.add('open');
    var inp = document.getElementById('cmdInput');
    inp.value = '';
    inp.focus();
    // Show recent + quick actions on open
    _search('').then(function(groups) { _render(groups); });
  }

  function _close() {
    var overlay = document.getElementById('cmdOverlay');
    if (overlay) overlay.classList.remove('open');
    _selectedIdx = -1;
    _flatResults = [];
  }

  // ── Global keyboard shortcut ─────────────────────────────────────────
  document.addEventListener('keydown', function(e) {
    // Ctrl+K or Cmd+K
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
      e.preventDefault();
      var overlay = document.getElementById('cmdOverlay');
      if (overlay && overlay.classList.contains('open')) {
        _close();
      } else {
        _open();
      }
      return;
    }
    // Escape to close
    if (e.key === 'Escape') {
      var ov = document.getElementById('cmdOverlay');
      if (ov && ov.classList.contains('open')) {
        e.preventDefault();
        _close();
      }
    }
  });

  // ── Public API ───────────────────────────────────────────────────────
  window.CommandPalette = {
    open: _open,
    close: _close
  };

})();
