// js/new-order-wizard.js — Shared Client → Department picker for New Order flow
// Used by "Product Sale" and "Endocart Order" menu items on every page.
// After picking client + dept, navigates to the target page with ?client=X&dept=Y

(function() {
  'use strict';

  // ── Demo data (mirrors NWO wizard demo in repairs.html) ──────────────────
  const _DEMO_CLIENTS = [
    { lClientKey:1, psClientName1:'Memorial Hospital',      psCity:'Philadelphia',   psState:'PA' },
    { lClientKey:2, psClientName1:'City General Medical',   psCity:'Nashville',      psState:'TN' },
    { lClientKey:3, psClientName1:'Northside Surgery Center',psCity:'Atlanta',       psState:'GA' },
    { lClientKey:4, psClientName1:'Regional Medical Center',psCity:'Charlotte',      psState:'NC' },
    { lClientKey:5, psClientName1:'St. Luke\'s Hospital',   psCity:'Houston',        psState:'TX' },
    { lClientKey:6, psClientName1:'Valley Health System',   psCity:'Phoenix',        psState:'AZ' },
  ];
  const _DEMO_DEPTS = [
    { lDepartmentKey:10, psDepartmentName:'Endoscopy',     lClientKey:1 },
    { lDepartmentKey:11, psDepartmentName:'Urology',       lClientKey:1 },
    { lDepartmentKey:12, psDepartmentName:'GI Lab',        lClientKey:2 },
    { lDepartmentKey:13, psDepartmentName:'Pulmonology',   lClientKey:2 },
    { lDepartmentKey:14, psDepartmentName:'Surgical Suite',lClientKey:3 },
    { lDepartmentKey:15, psDepartmentName:'OR Suite',      lClientKey:4 },
    { lDepartmentKey:16, psDepartmentName:'Endoscopy',     lClientKey:5 },
    { lDepartmentKey:17, psDepartmentName:'GI Lab',        lClientKey:6 },
  ];

  // ── State ─────────────────────────────────────────────────────────────────
  let _target = '';          // 'product-sale' or 'endocarts'
  let _title  = '';          // modal title
  let _icon   = '';          // SVG icon path
  let _clients= [];
  let _depts  = [];
  let _selClient = null;
  let _step = 1;

  // ── Inject modal HTML ────────────────────────────────────────────────────
  function _inject() {
    if (document.getElementById('nowOverlay')) return;

    const el = document.createElement('div');
    el.id = 'nowOverlay';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,37,.35);z-index:9998;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
    el.innerHTML = `
      <div id="nowModal" style="background:#fff;border-radius:10px;width:620px;max-height:82vh;overflow:hidden;
            box-shadow:0 24px 72px rgba(0,0,37,.28);display:flex;flex-direction:column">

        <!-- Header -->
        <div id="nowHead" style="padding:14px 20px;background:linear-gradient(120deg,var(--navy) 0%,var(--steel) 100%);
              color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px">
            <svg id="nowIcon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
              style="width:16px;height:16px;flex-shrink:0"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
              <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>
            <span id="nowTitle" style="font-size:14px;font-weight:700">New Order</span>
          </div>
          <button onclick="nowClose()" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;
                width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;line-height:1;display:flex;
                align-items:center;justify-content:center">×</button>
        </div>

        <!-- Step tabs -->
        <div id="nowStepBar" style="display:flex;background:#F7F8FC;border-bottom:1px solid #DDE3EE;flex-shrink:0">
          <div id="nowTab1" style="padding:8px 16px;font-size:11px;font-weight:700;color:var(--navy);
                border-bottom:2px solid var(--navy);cursor:default;user-select:none">
            <span style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
                  background:var(--navy);color:#fff;border-radius:50%;font-size:9px;margin-right:5px">1</span>Client</div>
          <div id="nowTab2" style="padding:8px 16px;font-size:11px;font-weight:500;color:#8896AA;
                cursor:default;user-select:none;border-bottom:2px solid transparent">
            <span id="nowTab2Num" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
                  background:#CBD5E1;color:#fff;border-radius:50%;font-size:9px;margin-right:5px">2</span>Department</div>
        </div>

        <!-- Body -->
        <div style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column">

          <!-- Panel 1: Client -->
          <div id="nowPanel1" style="display:flex;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:8px">
            <input id="nowClientSearch" type="text" placeholder="Search by client name or city…"
              oninput="nowFilterClients(this.value)"
              style="height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;font-size:12px;
                     font-family:inherit;outline:none;flex-shrink:0"
              onfocus="this.style.borderColor='var(--navy)'" onblur="this.style.borderColor='#DDE3EE'">
            <div id="nowClientGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow-y:auto;flex:1"></div>
          </div>

          <!-- Panel 2: Department -->
          <div id="nowPanel2" style="display:none;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:8px">
            <!-- selected client chip -->
            <div id="nowClientChip" style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:7px 12px;
                  display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
              <div>
                <span style="font-size:9px;font-weight:700;color:#15803D;text-transform:uppercase">Client</span><br/>
                <span id="nowClientLabel" style="font-size:12px;font-weight:700;color:var(--navy)"></span>
                <span id="nowClientCity"  style="font-size:10px;color:#8896AA;margin-left:4px"></span>
              </div>
              <button onclick="nowGoStep(1)" style="background:none;border:none;color:var(--blue);
                    font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline">Change</button>
            </div>
            <input id="nowDeptSearch" type="text" placeholder="Search departments…"
              oninput="nowFilterDepts(this.value)"
              style="height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;font-size:12px;
                     font-family:inherit;outline:none;flex-shrink:0"
              onfocus="this.style.borderColor='var(--navy)'" onblur="this.style.borderColor='#DDE3EE'">
            <div id="nowDeptGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow-y:auto;flex:1"></div>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(el);
    el.addEventListener('click', function(e) { if (e.target === el) nowClose(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('nowOverlay').style.display !== 'none') nowClose();
    });
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.openNewOrderWizard = async function(target, titleText, iconType) {
    _inject();
    _target = target;
    _title  = titleText;
    _step   = 1;
    _selClient = null;

    // Set title + icon
    document.getElementById('nowTitle').textContent = titleText;
    const iconSvg = document.getElementById('nowIcon');
    if (iconType === 'endocart') {
      iconSvg.innerHTML = '<rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/><line x1="12" y1="11" x2="12" y2="15"/>';
    } else if (iconType === 'repair') {
      iconSvg.innerHTML = '<path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/>';
    } else {
      iconSvg.innerHTML = '<circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>';
    }

    // Load clients
    try {
      if (typeof API !== 'undefined' && !API.isDemoMode()) {
        const svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
        const data = await API.getAllClients(svcKey);
        _clients = Array.isArray(data) ? data : (data.data || []);
        if (!_clients.length) throw new Error('empty');
      } else throw new Error('demo');
    } catch(e) {
      _clients = _DEMO_CLIENTS;
    }

    // Load depts
    try {
      if (typeof API !== 'undefined' && !API.isDemoMode()) {
        const data = await API.getAllDepartments();
        _depts = Array.isArray(data) ? data : (data.data || []);
        if (!_depts.length) throw new Error('empty');
      } else throw new Error('demo');
    } catch(e) {
      _depts = _DEMO_DEPTS;
    }

    nowGoStep(1);
    document.getElementById('nowOverlay').style.display = 'flex';
    setTimeout(() => {
      const inp = document.getElementById('nowClientSearch');
      if (inp) { inp.value = ''; nowFilterClients(''); inp.focus(); }
    }, 50);
  };

  window.nowClose = function() {
    const el = document.getElementById('nowOverlay');
    if (el) el.style.display = 'none';
  };

  window.nowGoStep = function(step) {
    _step = step;
    document.getElementById('nowPanel1').style.display = step === 1 ? 'flex' : 'none';
    document.getElementById('nowPanel2').style.display = step === 2 ? 'flex' : 'none';

    // Update tab styling
    const t1 = document.getElementById('nowTab1');
    const t2 = document.getElementById('nowTab2');
    const n2 = document.getElementById('nowTab2Num');
    if (step === 1) {
      t1.style.cssText += ';color:var(--navy);border-bottom:2px solid var(--navy);font-weight:700';
      t2.style.cssText += ';color:#8896AA;border-bottom:2px solid transparent;font-weight:500';
      n2.style.background = '#CBD5E1';
    } else {
      t1.style.cssText += ';color:#8896AA;border-bottom:2px solid transparent;font-weight:500';
      t2.style.cssText += ';color:var(--navy);border-bottom:2px solid var(--navy);font-weight:700';
      n2.style.background = 'var(--navy)';
    }

    if (step === 2) {
      const inp = document.getElementById('nowDeptSearch');
      if (inp) { inp.value = ''; nowFilterDepts(''); inp.focus(); }
    }
  };

  window.nowFilterClients = function(q) {
    const grid = document.getElementById('nowClientGrid');
    const lower = q.toLowerCase();
    const filtered = q ? _clients.filter(c =>
      (c.psClientName1||'').toLowerCase().includes(lower) ||
      (c.psCity||'').toLowerCase().includes(lower)
    ) : _clients;

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:11px;color:#8896AA">No clients found</div>';
      return;
    }
    grid.innerHTML = filtered.map(c => `
      <div onclick="nowSelectClient(${c.lClientKey})"
        style="padding:10px 12px;border:1.5px solid #DDE3EE;border-radius:6px;cursor:pointer;
               transition:all .1s;background:#fff"
        onmouseover="this.style.background='#EFF6FF';this.style.borderColor='#93C5FD'"
        onmouseout="this.style.background='#fff';this.style.borderColor='#DDE3EE'">
        <div style="font-size:11.5px;font-weight:700;color:var(--navy);margin-bottom:1px">${_esc(c.psClientName1)}</div>
        <div style="font-size:10px;color:#8896AA">${_esc(c.psCity||'')}${c.psState?', '+c.psState:''}</div>
      </div>
    `).join('');
  };

  window.nowSelectClient = function(clientKey) {
    _selClient = _clients.find(c => c.lClientKey === clientKey);
    if (!_selClient) return;
    document.getElementById('nowClientLabel').textContent = _selClient.psClientName1;
    document.getElementById('nowClientCity').textContent  = (_selClient.psCity||'') + (_selClient.psState ? ', '+_selClient.psState : '');
    nowGoStep(2);
  };

  window.nowFilterDepts = function(q) {
    const grid = document.getElementById('nowDeptGrid');
    const lower = q.toLowerCase();
    const clientDepts = _depts.filter(d => d.lClientKey === _selClient.lClientKey);
    const filtered = q
      ? clientDepts.filter(d => (d.psDepartmentName||'').toLowerCase().includes(lower))
      : clientDepts;

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:11px;color:#8896AA">
        No departments found for this client</div>`;
      return;
    }
    grid.innerHTML = filtered.map(d => `
      <div onclick="nowSelectDept(${d.lDepartmentKey})"
        style="padding:10px 12px;border:1.5px solid #DDE3EE;border-radius:6px;cursor:pointer;
               transition:all .1s;background:#fff"
        onmouseover="this.style.background='#EFF6FF';this.style.borderColor='#93C5FD'"
        onmouseout="this.style.background='#fff';this.style.borderColor='#DDE3EE'">
        <div style="font-size:11.5px;font-weight:700;color:var(--navy)">${_esc(d.psDepartmentName)}</div>
      </div>
    `).join('');
  };

  window.nowSelectDept = function(deptKey) {
    nowClose();
    window.location = _target + '?client=' + _selClient.lClientKey + '&dept=' + deptKey + '&action=new';
  };

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // Auto-inject on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _inject);
  } else {
    _inject();
  }

})();
