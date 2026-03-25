// js/new-order-wizard.js — Shared Client → Department picker for New Order flow
// Used by "Product Sale" and "Endocart Order" menu items on every page.
// After picking client + dept, navigates to the target page with ?client=X&dept=Y

(function() {
  'use strict';

  // ── State ─────────────────────────────────────────────────────────────────
  let _target = '';          // 'product-sale' or 'endocarts'
  let _title  = '';          // modal title
  let _icon   = '';          // SVG icon path
  let _clients= [];
  let _depts  = [];
  let _selClient = null;
  let _selDeptKey = null;
  let _step = 1;

  // ── Inject modal HTML ────────────────────────────────────────────────────
  function _inject() {
    if (document.getElementById('nowOverlay')) return;

    var _s = document.createElement('style');
    _s.textContent = '#nowClientSearch:focus,#nowDeptSearch:focus{border-color:var(--navy);box-shadow:0 0 0 2px rgba(var(--primary-rgb),.08)}';
    document.head.appendChild(_s);

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
            <span id="nowTitle" style="font-size:14px;font-weight:600;letter-spacing:.3px">New Order</span>
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
          <div id="nowTab3" style="padding:8px 16px;font-size:11px;font-weight:500;color:#8896AA;
                cursor:default;user-select:none;border-bottom:2px solid transparent">
            <span id="nowTab3Num" style="display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;
                  background:#CBD5E1;color:#fff;border-radius:50%;font-size:9px;margin-right:5px">3</span>Confirm</div>
        </div>

        <!-- Body -->
        <div style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column">

          <!-- Panel 1: Client -->
          <div id="nowPanel1" style="display:flex;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:8px">
            <div style="display:flex;gap:8px;align-items:center;flex-shrink:0">
              <input id="nowClientSearch" type="text" placeholder="Search by name, city, state, zip, or ID…"
                oninput="nowFilterClients(this.value)"
                style="height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;font-size:12px;
                       font-family:inherit;outline:none;flex:1">
              <button onclick="nowOpenNewClientModal()" style="height:32px;padding:0 12px;border:1.5px solid var(--navy);
                      border-radius:5px;background:#fff;color:var(--navy);font-size:11px;font-weight:600;cursor:pointer;
                      font-family:inherit;white-space:nowrap;display:flex;align-items:center;gap:4px">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">
                  <path d="M12 5v14M5 12h14"/></svg>New Customer</button>
            </div>
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
>
            <div id="nowDeptGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;overflow-y:auto;flex:1"></div>
          </div>

          <!-- Panel 3: Confirm -->
          <div id="nowPanel3" style="display:none;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:12px">
            <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:10px 14px;flex-shrink:0">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:9px;font-weight:700;color:#15803D;text-transform:uppercase">Client</span>
                <button onclick="nowGoStep(1)" style="background:none;border:none;color:var(--blue);
                      font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline">Change</button>
              </div>
              <span id="nowConfClient" style="font-size:13px;font-weight:700;color:var(--navy)"></span>
              <span id="nowConfCity" style="font-size:10px;color:#8896AA;margin-left:4px"></span>
            </div>
            <div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:10px 14px;flex-shrink:0">
              <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
                <span style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase">Department</span>
                <button onclick="nowGoStep(2)" style="background:none;border:none;color:var(--blue);
                      font-size:11px;font-weight:600;cursor:pointer;text-decoration:underline">Change</button>
              </div>
              <span id="nowConfDept" style="font-size:13px;font-weight:700;color:var(--navy)"></span>
            </div>
            <div style="flex:1"></div>
            <button id="nowCreateBtn" onclick="nowConfirmCreate()"
              style="height:38px;background:var(--navy);color:#fff;border:none;border-radius:6px;
                     font-size:13px;font-weight:700;cursor:pointer;letter-spacing:.3px;flex-shrink:0;
                     display:flex;align-items:center;justify-content:center;gap:6px">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:15px;height:15px">
                <path d="M12 5v14M5 12h14"/></svg>
              Create Order
            </button>
          </div>
        </div>

      </div>
    `;
    document.body.appendChild(el);
    el.addEventListener('click', function(e) { if (e.target === el) nowClose(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && document.getElementById('nowOverlay').style.display !== 'none') nowClose();
    });
    _injectNewClientModal();
  }

  // ── Public API ────────────────────────────────────────────────────────────
  window.openNewOrderWizard = async function(target, titleText, iconType) {
    _inject();
    _target = target;
    _title  = titleText;
    _step   = 1;
    _selClient = null;
    _selDeptKey = null;

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
      const svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
      const data = await API.getAllClients(svcKey);
      _clients = Array.isArray(data) ? data : (data.data || []);
    } catch(e) {
      _clients = [];
    }

    // Load depts
    try {
      const svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
      const data = await API.getAllDepartments(svcKey);
      _depts = Array.isArray(data) ? data : (data.data || []);
    } catch(e) {
      _depts = [];
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
    document.getElementById('nowPanel3').style.display = step === 3 ? 'flex' : 'none';

    // Update tab styling
    var tabs  = [document.getElementById('nowTab1'), document.getElementById('nowTab2'), document.getElementById('nowTab3')];
    var nums  = [null, document.getElementById('nowTab2Num'), document.getElementById('nowTab3Num')];
    for (var i = 0; i < 3; i++) {
      var active = (i + 1) === step;
      var past   = (i + 1) < step;
      tabs[i].style.color        = active ? 'var(--navy)' : '#8896AA';
      tabs[i].style.borderBottom  = active ? '2px solid var(--navy)' : '2px solid transparent';
      tabs[i].style.fontWeight    = active ? '700' : '500';
      if (nums[i]) nums[i].style.background = (active || past) ? 'var(--navy)' : '#CBD5E1';
    }

    if (step === 2) {
      var inp = document.getElementById('nowDeptSearch');
      if (inp) { inp.value = ''; nowFilterDepts(''); inp.focus(); }
    }
  };

  function _cName(c) { return c.psClientName1 || c.sClientName1 || ''; }
  function _cCity(c) { return c.psCity || c.sMailCity || ''; }
  function _cState(c) { return c.psState || c.sMailState || ''; }
  function _cZip(c) { return c.psZip || c.sMailZip || c.sShipZip || ''; }

  window.nowFilterClients = function(q) {
    const grid = document.getElementById('nowClientGrid');
    const lower = q.toLowerCase();
    const filtered = q ? _clients.filter(c =>
      _cName(c).toLowerCase().includes(lower) ||
      _cCity(c).toLowerCase().includes(lower) ||
      _cState(c).toLowerCase().includes(lower) ||
      _cZip(c).toLowerCase().includes(lower) ||
      String(c.lClientKey).includes(lower)
    ) : _clients;

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:11px;color:#8896AA">No clients found</div>';
      return;
    }
    grid.innerHTML = filtered.map(c => `
      <div class="picker-card" onclick="nowSelectClient(${c.lClientKey})">
        <div class="picker-card-name">${_esc(_cName(c))}</div>
        <div class="picker-card-sub">${_esc(_cCity(c))}${_cState(c)?', '+_cState(c):''}</div>
      </div>
    `).join('');
  };

  window.nowSelectClient = function(clientKey) {
    _selClient = _clients.find(c => c.lClientKey === clientKey);
    if (!_selClient) return;
    document.getElementById('nowClientLabel').textContent = _cName(_selClient);
    document.getElementById('nowClientCity').textContent  = _cCity(_selClient) + (_cState(_selClient) ? ', '+_cState(_selClient) : '');
    nowGoStep(2);
  };

  function _dName(d) { return d.psDepartmentName || d.sDepartmentName || ''; }

  window.nowFilterDepts = function(q) {
    const grid = document.getElementById('nowDeptGrid');
    const lower = q.toLowerCase();
    const clientDepts = _depts.filter(d => d.lClientKey === _selClient.lClientKey);
    const filtered = q
      ? clientDepts.filter(d => _dName(d).toLowerCase().includes(lower))
      : clientDepts;

    if (!filtered.length) {
      grid.innerHTML = `<div style="grid-column:1/-1;padding:20px;text-align:center;font-size:11px;color:#8896AA">
        No departments found for this client</div>`;
      return;
    }
    grid.innerHTML = filtered.map(d => `
      <div class="picker-card" onclick="nowSelectDept(${d.lDepartmentKey})">
        <div class="picker-card-name">${_esc(_dName(d))}</div>
      </div>
    `).join('');
  };

  window.nowSelectDept = function(deptKey) {
    _selDeptKey = deptKey;
    var dept = _depts.find(function(d) { return d.lDepartmentKey === deptKey; });

    // Populate confirmation panel
    document.getElementById('nowConfClient').textContent = _cName(_selClient);
    document.getElementById('nowConfCity').textContent    = _cCity(_selClient) + (_cState(_selClient) ? ', '+_cState(_selClient) : '');
    document.getElementById('nowConfDept').textContent    = dept ? _dName(dept) : 'Dept #'+deptKey;

    nowGoStep(3);
  };

  window.nowConfirmCreate = function() {
    nowClose();
    window.location = _target + '?client=' + _selClient.lClientKey + '&dept=' + _selDeptKey + '&action=new';
  };

  function _esc(s) {
    return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── New Client Modal ───────────────────────────────────────────────────
  function _injectNewClientModal() {
    if (document.getElementById('nowNewClientOverlay')) return;
    const el = document.createElement('div');
    el.id = 'nowNewClientOverlay';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,37,.45);z-index:10000;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
    el.innerHTML = `
      <div style="background:#fff;border-radius:10px;width:540px;max-height:80vh;overflow:hidden;
            box-shadow:0 24px 72px rgba(0,0,37,.32);display:flex;flex-direction:column">
        <div style="padding:14px 20px;background:linear-gradient(120deg,var(--navy) 0%,var(--steel) 100%);
              color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">
          <div style="display:flex;align-items:center;gap:8px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/>
              <line x1="20" y1="8" x2="20" y2="14"/><line x1="23" y1="11" x2="17" y2="11"/></svg>
            <span style="font-size:14px;font-weight:600;letter-spacing:.3px">New Customer</span>
          </div>
          <button onclick="nowCloseNewClientModal()" style="background:transparent;border:1px solid rgba(255,255,255,.4);
                color:#fff;width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;line-height:1;
                display:flex;align-items:center;justify-content:center">&times;</button>
        </div>
        <div style="padding:16px 20px;overflow-y:auto;flex:1">
          <div id="nowNewClientError" style="display:none;background:#FEF2F2;border:1px solid #FECACA;
                border-radius:5px;padding:8px 12px;font-size:11px;color:#DC2626;margin-bottom:10px"></div>
          <div style="display:grid;grid-template-columns:1fr;gap:10px">
            <div>
              <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">
                Facility Name <span style="color:#DC2626">*</span></label>
              <input id="nowNC_name" type="text" placeholder="e.g. Keystone Surgical Center"
                style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                       font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">Address</label>
                <input id="nowNC_addr" type="text" placeholder="Street address"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
              </div>
              <div>
                <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">Zip Code</label>
                <input id="nowNC_zip" type="text" placeholder="e.g. 19341" maxlength="10"
                  onblur="nowNCLookupZip(this.value)"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
              </div>
            </div>
            <div style="display:grid;grid-template-columns:1fr 100px;gap:10px">
              <div>
                <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">City</label>
                <input id="nowNC_city" type="text" placeholder="City"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
              </div>
              <div>
                <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">State</label>
                <input id="nowNC_state" type="text" placeholder="PA" maxlength="2"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px;text-transform:uppercase">
              </div>
            </div>
            <div style="border-top:1px solid #DDE3EE;padding-top:10px;margin-top:2px">
              <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">Primary Contact</label>
            </div>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px">
              <div>
                <label style="font-size:10px;font-weight:600;color:#6B7280;letter-spacing:.3px">Contact Name</label>
                <input id="nowNC_contact" type="text" placeholder="Full name"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
              </div>
              <div>
                <label style="font-size:10px;font-weight:600;color:#6B7280;letter-spacing:.3px">Phone</label>
                <input id="nowNC_phone" type="text" placeholder="(555) 555-1234"
                  style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                         font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
              </div>
            </div>
            <div>
              <label style="font-size:10px;font-weight:600;color:#6B7280;letter-spacing:.3px">Email</label>
              <input id="nowNC_email" type="email" placeholder="contact@facility.com"
                style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                       font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
            </div>
            <div style="border-top:1px solid #DDE3EE;padding-top:10px;margin-top:2px">
              <label style="font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px">Default Department</label>
              <input id="nowNC_dept" type="text" placeholder="e.g. Endoscopy" value="Endoscopy"
                style="width:100%;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;
                       font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">
            </div>
          </div>
        </div>
        <div style="padding:12px 20px;border-top:1px solid #DDE3EE;display:flex;justify-content:flex-end;gap:8px;flex-shrink:0">
          <button onclick="nowCloseNewClientModal()" style="height:34px;padding:0 16px;border:1.5px solid #DDE3EE;
                border-radius:6px;background:#fff;color:#6B7280;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">Cancel</button>
          <button onclick="nowSaveNewClient()" style="height:34px;padding:0 20px;border:none;border-radius:6px;
                background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;
                display:flex;align-items:center;gap:5px">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:13px;height:13px">
              <path d="M12 5v14M5 12h14"/></svg>Create &amp; Select</button>
        </div>
      </div>`;
    document.body.appendChild(el);
    el.addEventListener('click', function(e) { if (e.target === el) nowCloseNewClientModal(); });
  }

  window.nowOpenNewClientModal = function() {
    _injectNewClientModal();
    // Clear all fields
    ['nowNC_name','nowNC_addr','nowNC_zip','nowNC_city','nowNC_state',
     'nowNC_contact','nowNC_phone','nowNC_email'].forEach(function(id) {
      var el = document.getElementById(id);
      if (el) el.value = '';
    });
    document.getElementById('nowNC_dept').value = 'Endoscopy';
    document.getElementById('nowNewClientError').style.display = 'none';
    document.getElementById('nowNewClientOverlay').style.display = 'flex';
    setTimeout(function() {
      var inp = document.getElementById('nowNC_name');
      if (inp) inp.focus();
    }, 50);
  };

  window.nowCloseNewClientModal = function() {
    var el = document.getElementById('nowNewClientOverlay');
    if (el) el.style.display = 'none';
  };

  window.nowNCLookupZip = async function(zip) {
    if (!zip || zip.length < 5) return;
    try {
      var result = await API.getCityStateByZip(zip);
      if (result && result.length > 0) {
        var r = result[0];
        var cityEl = document.getElementById('nowNC_city');
        var stateEl = document.getElementById('nowNC_state');
        if (cityEl && !cityEl.value) cityEl.value = r.sCity || r.City || '';
        if (stateEl && !stateEl.value) stateEl.value = r.sState || r.State || '';
      }
    } catch(e) { /* silently fail */ }
  };

  window.nowSaveNewClient = async function() {
    var name = (document.getElementById('nowNC_name').value || '').trim();
    if (!name) {
      var err = document.getElementById('nowNewClientError');
      err.textContent = 'Facility name is required.';
      err.style.display = 'block';
      document.getElementById('nowNC_name').focus();
      return;
    }

    var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');

    // Build client payload matching the API field naming convention
    var clientPayload = {
      psClientName1: name,
      sClientName1: name,
      sMailAddr1: (document.getElementById('nowNC_addr').value || '').trim(),
      sMailCity: (document.getElementById('nowNC_city').value || '').trim(),
      sMailState: (document.getElementById('nowNC_state').value || '').trim().toUpperCase(),
      sMailZip: (document.getElementById('nowNC_zip').value || '').trim(),
      sPhone1: (document.getElementById('nowNC_phone').value || '').trim(),
      sEmail: (document.getElementById('nowNC_email').value || '').trim(),
      lServiceLocationKey: svcKey,
      bActive: true
    };

    try {
      var clientResult = await API.addClient(clientPayload);
      var newClientKey = clientResult.lClientKey || clientResult;

      // Create default department
      var deptName = (document.getElementById('nowNC_dept').value || 'Endoscopy').trim();
      var deptPayload = {
        lClientKey: newClientKey,
        psDepartmentName: deptName,
        sDepartmentName: deptName,
        lServiceLocationKey: svcKey,
        bActive: true
      };
      await API.addDepartment(deptPayload);

      // Reload clients list
      var data = await API.getAllClients(svcKey);
      _clients = Array.isArray(data) ? data : (data.data || []);

      // Reload depts
      var deptData = await API.getAllDepartments(svcKey);
      _depts = Array.isArray(deptData) ? deptData : (deptData.data || []);

      // Close modal
      nowCloseNewClientModal();

      // Auto-select the new client
      nowFilterClients('');
      nowSelectClient(newClientKey);

      // Toast if available
      if (window.TSI && window.TSI.toast) {
        TSI.toast.success('Customer Created', name + ' has been added.', 2500);
      }
    } catch(e) {
      var err = document.getElementById('nowNewClientError');
      err.textContent = 'Failed to create customer: ' + (e.message || 'Unknown error');
      err.style.display = 'block';
    }
  };

  // Auto-inject on load
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _inject);
  } else {
    _inject();
  }

})();
