/* ─────────────────────────────────────────────────────────
   shell.js — Single source of truth for sidebar + topbar
   Injected on every page to guarantee consistency.
   Runs on DOMContentLoaded, BEFORE API.UI.init().
   ───────────────────────────────────────────────────────── */
(function () {
  'use strict';

  /* ── NAV ITEMS ─────────────────────────────────────────── */
  var NAV = [
    { label: 'My Workspace',        href: 'workspace.html',          icon: '<rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>' },
    { label: 'Dashboard',           href: 'dashboard.html',          icon: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/>' },
    { label: 'Clients',             href: 'clients.html',            icon: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>' },
    { label: 'Departments',         href: 'departments.html',        icon: '<path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9,22 9,12 15,12 15,22"/>' },
    { label: 'Repairs',             href: 'repairs.html',            icon: '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>' },
    { label: 'Inventory',           href: 'inventory.html',          icon: '<path d="M5 8h14M5 8a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM5 8v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8M10 12h4"/>' },
    { label: 'Suppliers',           href: 'suppliers.html',          icon: '<path d="M20 7H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>' },
    { label: 'Scope Model',         href: 'scope-model.html',        icon: '<circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/><path d="M8 11h6M11 8v6"/>' },
    { label: 'Instruments',         href: 'instruments.html',        icon: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>' },
    { label: 'Contracts',           href: 'contracts.html',          icon: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M9 9h6M9 12h6M9 15h4"/>' },
    { label: 'Acquisitions',        href: 'acquisitions.html',       icon: '<path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 0 1-8 0"/>' },
    { label: 'Carts',               href: 'endocarts.html',          icon: '<rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/><circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>' },
    { label: 'Loaners',             href: 'loaners.html',            icon: '<path d="M17 1l4 4-4 4"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><path d="M7 23l-4-4 4-4"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>' },
    { label: 'Onsite Services',     href: 'onsite-services.html',    icon: '<path d="M3 9h18M9 21V9"/><rect x="3" y="3" width="18" height="18" rx="2"/>' },
    { label: 'Outsource Validation',href: 'outsource-validation.html',icon: '<path d="M9 5H2v7l6.29 6.29c.94.94 2.48.94 3.42 0l4.58-4.58c.94-.94.94-2.48 0-3.42L9 5z"/><path d="M6 9.01V9"/><path d="M22 8l-5 5"/><path d="M19 5l-5 5"/>' },
    { label: 'Product Sale',        href: 'product-sale.html',       icon: '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>' },
    { label: 'Quality',             href: 'quality.html',            icon: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>' },
    { label: 'Financial',           href: 'financial.html',          icon: '<line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>' },
    { label: 'Reports/Extracts',    href: 'reports.html',            icon: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14,2 14,8 20,8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>' },
    { label: 'Administration',      href: 'administration.html',     icon: '<circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M4.93 4.93a10 10 0 0 0 0 14.14"/>' },
    { label: 'Development List',    href: 'development-list.html',   icon: '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>' }
  ];

  /* ── DETECT CURRENT PAGE ───────────────────────────────── */
  function currentPage() {
    var path = window.location.pathname;
    var file = path.substring(path.lastIndexOf('/') + 1) || 'index.html';
    // npx serve strips .html — add it back if missing
    if (file && file.indexOf('.') === -1) file += '.html';
    // Dashboard sub-tabs all highlight "Dashboard"
    if (file.indexOf('dashboard') === 0) return 'dashboard.html';
    // repair-items highlights "Repairs"
    if (file === 'repair-items.html') return 'repairs.html';
    return file;
  }

  /* ── BUILD SIDEBAR HTML ────────────────────────────────── */
  function buildSidebar() {
    var cur = currentPage();
    var html = '';
    html += '<div class="sidebar-brand" onclick="window.location=\'index.html\'" style="cursor:pointer" title="Back to Hub">';
    html += '  <div class="brand-logo"><svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg></div>';
    html += '  <div class="brand-text"><div class="t1">Total Scope, Inc.</div><div class="t2">The Leader in Medical Device Repair</div></div>';
    html += '</div>';
    html += '<div class="nav-group">';
    for (var i = 0; i < NAV.length; i++) {
      var n = NAV[i];
      var isActive = (n.href === cur);
      if (isActive) {
        html += '<div class="nav-item active"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + n.icon + '</svg>' + n.label + '</div>';
      } else {
        html += '<div class="nav-item" onclick="window.location=\'' + n.href + '\'"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + n.icon + '</svg>' + n.label + '</div>';
      }
    }
    html += '</div>';
    html += '<div class="sidebar-footer">&copy; 2026 Total Scope, Inc.</div>';
    return html;
  }

  /* ── BUILD TOPBAR HTML ─────────────────────────────────── */
  function buildTopbar() {
    var menuItem = function (onclick, iconSvg, title, subtitle, border) {
      return '<a class="order-menu-item" onclick="document.getElementById(\'newOrderMenu\').classList.remove(\'open\');' + onclick + '" ' +
        'style="border-bottom:' + border + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">' + iconSvg + '</svg>' +
        '<div>' + title + '<div class="om-sub">' + subtitle + '</div></div></a>';
    };

    var html = '';

    /* Left — logo */
    html += '<div class="topbar-left" onclick="window.location=\'index.html\'" style="cursor:pointer" title="Back to Hub"><img src="assets/logo-white.png" alt="Total Scope, Inc." style="height:48px"/></div>';

    /* Right */
    html += '<div class="topbar-right">';

    /* +Orders dropdown */
    html += '<div style="position:relative;margin-right:12px" id="newOrderWrap">';
    html += '<button class="btn-orders" onclick="document.getElementById(\'newOrderMenu\').classList.toggle(\'open\')">';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>';
    html += 'Work Orders ';
    html += '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:10px;height:10px;margin-left:2px"><polyline points="6 9 12 15 18 9"/></svg>';
    html += '</button>';
    html += '<div id="newOrderMenu" style="display:none;position:absolute;top:100%;right:0;margin-top:4px;background:#fff;border:1px solid #DDE3EE;border-radius:8px;box-shadow:0 8px 24px rgba(var(--primary-rgb),.18);min-width:200px;z-index:9999;overflow:hidden">';
    html += menuItem("openOrderSearch()",
      '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
      'Find / Open Order', 'Search by WO#, SN#, PO#', '2px solid var(--border)');
    html += menuItem("openNewOrderWizard('repairs','New Repair Order','repair')",
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      'Repair Order', 'New scope repair work order', '1px solid #f0f2f5');
    html += menuItem("openNewOrderWizard('instruments','New Instrument Repair','repair')",
      '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>',
      'Instrument Repair', 'New surgical instrument repair order', '1px solid #f0f2f5');
    html += menuItem("openNewOrderWizard('product-sale','New Product Sale','sale')",
      '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>',
      'Product Sale', 'New product sale order', '1px solid #f0f2f5');
    html += menuItem("openNewOrderWizard('endocarts','New Endocart Order','endocart')",
      '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><line x1="12" y1="11" x2="12" y2="15"/>',
      'Endocart Order', 'New endoscopy cart order', 'none');
    html += '</div></div>';

    /* Save indicator */
    html += '<div class="save-indicator" id="saveIndicator"></div>';

    /* Separator + Service Location */
    html += '<span style="opacity:0.5; margin: 0 4px;">|</span>';
    html += 'Service Location ';
    html += '<select class="svc-select" id="svcLocation" onchange="if(typeof changeServiceLocation===\'function\') changeServiceLocation();">';
    html += '<option value="1">Upper Chichester</option><option value="2">Nashville</option>';
    html += '</select>';

    /* Data badge */
    html += '<span id="dataBadge" class="data-badge"></span>';

    /* User info — read from stored user, fallback to initials/name */
    const _u = JSON.parse(localStorage.getItem('tsi_user') || 'null');
    const _fn = _u?.sFirstName || 'User';
    const _ln = _u?.sLastName || '';
    const _ini = ((_fn[0]||'') + (_ln[0]||'')).toUpperCase() || 'U';
    html += '<div class="topbar-avatar">' + _ini + '</div>';
    html += '<span class="topbar-welcome">Welcome back, <strong>' + _fn + '</strong></span>';
    html += '<button onclick="API.logout()" style="background:rgba(255,255,255,.15);border:1px solid rgba(255,255,255,.25);color:#fff;padding:4px 10px;border-radius:5px;font-size:11px;cursor:pointer;font-family:inherit">Sign Out</button>';

    html += '</div>'; // topbar-right
    return html;
  }

  /* ── DASHBOARD SUBNAV ──────────────────────────────────
     Single source of truth for the dashboard tab strip.
     Auto-renders when a #dashSubnav element is present.  */
  var DASH_TABS = [
    { id: 'scopes',         label: 'Scopes',           href: 'dashboard.html' },
    { id: 'tasks',          label: 'Tasks',             href: 'dashboard_tasks.html',          badge: '0',  badgeId: 'taskTabBadge' },
    { id: 'emails',         label: 'Emails',            href: 'dashboard_emails.html' },
    { id: 'shipping',       label: 'Shipping Status',   href: 'dashboard_shipping.html' },
    { id: 'inventory',      label: 'Inventory',         href: 'dashboard_inventory.html' },
    { id: 'purchaseorders', label: 'Purchase Orders',   href: 'dashboard_purchaseorders.html' },
    { id: 'invoices',       label: 'Invoices',          href: 'dashboard_invoices.html' },
    { id: 'flags',          label: 'Flags',             href: 'dashboard_flags.html',          badge: '0',  badgeId: 'flagTabBadge' },
    { id: 'analytics',      label: 'Analytics',         href: 'dashboard_analytics.html' }
  ];

  /** Map filename → tab id for auto-detection */
  var DASH_FILE_MAP = {};
  for (var t = 0; t < DASH_TABS.length; t++) DASH_FILE_MAP[DASH_TABS[t].href] = DASH_TABS[t].id;

  /**
   * renderDashboardSubnav(activeTab, badges)
   *   activeTab — tab id string (e.g. 'scopes', 'tasks')
   *   badges   — optional object of { tabId: { text, style, id } } overrides
   *
   * If no activeTab supplied, auto-detects from the current filename.
   * Populates #dashSubnav (or first .subnav) with tab links.
   */
  function renderDashboardSubnav(activeTab, badges) {
    var el = document.getElementById('dashSubnav') || document.querySelector('.subnav');
    if (!el) return;

    // Auto-detect active tab from URL if not supplied
    if (!activeTab) {
      var path = window.location.pathname;
      var file = path.substring(path.lastIndexOf('/') + 1) || 'dashboard.html';
      if (file.indexOf('.') === -1) file += '.html';
      activeTab = DASH_FILE_MAP[file] || 'scopes';
    }

    badges = badges || {};
    var html = '';
    for (var i = 0; i < DASH_TABS.length; i++) {
      var tab = DASH_TABS[i];
      var isActive = (tab.id === activeTab);
      var cls = 'subnav-tab' + (isActive ? ' active' : '');

      // Badge: allow per-call overrides, fall back to defaults
      var b = badges[tab.id] || {};
      var bText  = b.text  !== undefined ? b.text  : (tab.badge || '');
      var bStyle = b.style !== undefined ? b.style : (tab.badgeStyle || '');
      var bId    = b.id    !== undefined ? b.id    : (tab.badgeId || '');

      html += '<a class="' + cls + '" href="' + tab.href + '">' + tab.label;
      if (bText) {
        html += '<span class="tab-badge"';
        if (bId)    html += ' id="' + bId + '"';
        if (bStyle) html += ' style="' + bStyle + '"';
        html += '>' + bText + '</span>';
      }
      html += '</a>';
    }
    el.innerHTML = html;
  }

  // Expose globally so pages can call it with overrides if needed
  window.renderDashboardSubnav = renderDashboardSubnav;

  /* ── INJECT IMMEDIATELY ─────────────────────────────────
     Scripts are loaded at the bottom of <body>, so the sidebar
     and topbar DOM elements already exist. Injecting synchronously
     ensures the elements are ready before API.UI.init() runs.  */
  var sidebar = document.querySelector('.sidebar');
  var topbar  = document.querySelector('.topbar');
  if (sidebar) sidebar.innerHTML = buildSidebar();
  if (topbar)  topbar.innerHTML  = buildTopbar();

  // Auto-render dashboard subnav if placeholder exists
  var dashSubnav = document.getElementById('dashSubnav');
  if (dashSubnav) renderDashboardSubnav();

  // Close Orders menu on outside click
  document.addEventListener('click', function (e) {
    var menu = document.getElementById('newOrderMenu');
    if (menu && !e.target.closest('#newOrderWrap')) menu.classList.remove('open');
  });
})();
