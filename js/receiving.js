// js/receiving.js — Expected Arrivals + Walk-in Intake
// Replaces batch-receiving.js with portal-driven receiving flow.
// Portal submissions pre-fill intake; techs verify/correct against physical scope.

(function() {
  'use strict';

  // ── State ─────────────────────────────────────────────
  var _arrivals = [];       // pending arrivals for current svc location
  var _clients = [];
  var _depts = [];
  var _scopeTypes = [];
  var _selectedArrival = null;  // the pending arrival being processed (or null for walk-in)
  var _mode = '';           // 'expected' or 'walkin'
  var _step = 1;

  // Intake form state
  var _form = {
    clientKey: null, clientName: '', deptKey: null, deptName: '',
    scopeTypeKey: null, modelDesc: '', serial: '', scopeKey: null,
    complaint: '', poNumber: '', trackingIn: '', notes: '',
    isKnown: false,
    conditions: {} // insertionTube, lightGuide, distalTip, forcepsChannel → 'pass'|'fail'|undefined
  };

  // ── Helpers ───────────────────────────────────────────
  function _esc(s) { return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
  function _cName(c) { return c.psClientName1 || c.sClientName1 || ''; }
  function _cCity(c) { return c.psCity || c.sMailCity || ''; }
  function _cState(c) { return c.psState || c.sMailState || ''; }
  function _daysAgo(dateStr) {
    if (!dateStr) return 0;
    return Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000);
  }
  function _ageBadge(days) {
    if (days >= 14) return '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:#FEF2F2;color:#DC2626;font-weight:700">OVERDUE ' + days + 'd</span>';
    if (days >= 7) return '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:#FFFBEB;color:#D97706;font-weight:600">' + days + 'd ago</span>';
    return '<span style="font-size:9px;padding:1px 6px;border-radius:3px;background:#F0FDF4;color:#16A34A;font-weight:600">' + days + 'd ago</span>';
  }

  // ── Inject modal HTML ─────────────────────────────────
  function _inject() {
    if (document.getElementById('rcOverlay')) return;
    var el = document.createElement('div');
    el.id = 'rcOverlay';
    el.style.cssText = 'display:none;position:fixed;inset:0;background:rgba(0,0,37,.35);z-index:9998;align-items:center;justify-content:center;backdrop-filter:blur(2px)';
    el.innerHTML = [
      '<div id="rcModal" style="background:#fff;border-radius:10px;width:780px;max-height:90vh;overflow:hidden;',
      'box-shadow:0 24px 72px rgba(0,0,37,.28);display:flex;flex-direction:column">',

      // Header
      '<div style="padding:14px 20px;background:linear-gradient(120deg,var(--navy) 0%,var(--steel) 100%);',
      'color:#fff;display:flex;align-items:center;justify-content:space-between;flex-shrink:0">',
      '<div style="display:flex;align-items:center;gap:8px">',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:16px;height:16px">',
      '<path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/>',
      '<polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
      '<span style="font-size:14px;font-weight:600;letter-spacing:.3px">Receive Scope</span></div>',
      '<button onclick="rcClose()" style="background:transparent;border:1px solid rgba(255,255,255,.4);color:#fff;',
      'width:28px;height:28px;border-radius:5px;cursor:pointer;font-size:16px;line-height:1;display:flex;',
      'align-items:center;justify-content:center">&times;</button></div>',

      // Step tabs
      '<div id="rcStepBar" style="display:flex;background:#F7F8FC;border-bottom:1px solid #DDE3EE;flex-shrink:0">',
      '<div id="rcTab1" class="rc-tab rc-tab-active" onclick="rcGoStep(1)">',
      '<span class="rc-tab-num rc-tab-num-active">1</span>Expected Arrivals</div>',
      '<div id="rcTab2" class="rc-tab" onclick="rcGoStep(2)">',
      '<span class="rc-tab-num">2</span>Intake</div>',
      '<div id="rcTab3" class="rc-tab" onclick="rcGoStep(3)">',
      '<span class="rc-tab-num">3</span>Confirm</div>',
      '</div>',

      // Body
      '<div style="flex:1;min-height:0;overflow:hidden;display:flex;flex-direction:column">',

      // ── Panel 1: Expected Arrivals Queue ──
      '<div id="rcPanel1" style="display:flex;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:10px">',
      '<div style="display:flex;gap:8px;align-items:center;flex-shrink:0">',
      '<input id="rcArrivalSearch" type="text" placeholder="Search by customer, serial #, or model\u2026"',
      ' oninput="rcFilterArrivals(this.value)"',
      ' style="flex:1;height:32px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;font-size:12px;font-family:inherit;outline:none">',
      '<span id="rcArrivalCount" style="font-size:11px;color:#6B7280;font-weight:500;white-space:nowrap">0 pending</span>',
      '</div>',
      '<div id="rcArrivalList" style="flex:1;overflow-y:auto;display:flex;flex-direction:column;gap:6px"></div>',
      '<div style="flex-shrink:0;display:flex;justify-content:flex-end">',
      '<button onclick="rcStartWalkin()" style="height:34px;padding:0 20px;border:1.5px solid var(--navy);border-radius:6px;',
      'background:#fff;color:var(--navy);font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;',
      'display:flex;align-items:center;gap:6px">',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:12px;height:12px">',
      '<path d="M12 5v14M5 12h14"/></svg>Walk-in / No Match</button></div>',
      '</div>',

      // ── Panel 2: Intake Form ──
      '<div id="rcPanel2" style="display:none;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:8px;overflow-y:auto">',

      // Portal info banner (shown when from expected arrival)
      '<div id="rcPortalBanner" style="display:none;background:#EFF6FF;border:1px solid #BFDBFE;border-radius:6px;padding:8px 12px;flex-shrink:0">',
      '<span style="font-size:9px;font-weight:700;color:#1D4ED8;text-transform:uppercase">Portal Submission</span>',
      '<div id="rcPortalInfo" style="font-size:11px;color:#1E40AF;margin-top:2px"></div></div>',

      // Customer
      '<div>',
      '<label class="rc-lbl">Customer</label>',
      '<div id="rcClientSelected" style="display:none;background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:6px 12px;',
      'align-items:center;justify-content:space-between">',
      '<div><span style="font-size:9px;font-weight:700;color:#15803D;text-transform:uppercase">Selected</span><br/>',
      '<span id="rcClientLabel" style="font-size:12px;font-weight:700;color:var(--navy)"></span>',
      '<span id="rcClientCity" style="font-size:10px;color:#8896AA;margin-left:4px"></span></div>',
      '<button onclick="rcClearClient()" style="background:none;border:none;color:var(--blue);font-size:11px;',
      'font-weight:600;cursor:pointer;text-decoration:underline">Change</button></div>',
      '<input id="rcClientSearch" type="text" placeholder="Search customer\u2026"',
      ' oninput="rcFilterClients(this.value)"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:5px;padding:0 10px;font-size:12px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:3px">',
      '<div id="rcClientGrid" style="display:grid;grid-template-columns:1fr 1fr;gap:4px;max-height:100px;overflow-y:auto;margin-top:4px"></div>',
      '</div>',

      // Department + Model + Serial row
      '<div style="display:grid;grid-template-columns:1fr 1fr 140px;gap:8px">',
      '<div>',
      '<label class="rc-lbl">Department</label>',
      '<select id="rcDept" onchange="rcUpdateDept(this.value)"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 6px;font-size:11px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:2px;background:#fff">',
      '<option value="">— Select —</option></select></div>',
      '<div>',
      '<label class="rc-lbl">Model</label>',
      '<select id="rcModel" onchange="rcUpdateModel(this.value)"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 6px;font-size:11px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:2px;background:#fff">',
      '<option value="">— Select —</option></select></div>',
      '<div>',
      '<label class="rc-lbl">Serial #</label>',
      '<input id="rcSerial" type="text" placeholder="Serial #" onblur="rcLookupScope(this.value)"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 8px;font-size:11px;font-family:\'JetBrains Mono\',monospace;outline:none;box-sizing:border-box;margin-top:2px">',
      '</div></div>',

      // Known scope badge
      '<div id="rcKnownBadge" style="display:none;padding:4px 8px;border-radius:4px;',
      'background:#F0FDF4;border:1px solid #BBF7D0;font-size:10px;font-weight:600;color:#15803D"></div>',

      // Correction indicators
      '<div id="rcCorrections" style="display:none;padding:4px 8px;border-radius:4px;',
      'background:#FFFBEB;border:1px solid #FDE68A;font-size:10px;color:#92400E"></div>',

      // Complaint + PO + Tracking
      '<div style="display:grid;grid-template-columns:1fr 140px 160px;gap:8px">',
      '<div>',
      '<label class="rc-lbl">Complaint / Problem</label>',
      '<input id="rcComplaint" type="text" placeholder="Customer perceived problem\u2026"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 8px;font-size:11px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:2px">',
      '</div>',
      '<div>',
      '<label class="rc-lbl">PO #</label>',
      '<input id="rcPO" type="text" placeholder="PO number"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 8px;font-size:11px;font-family:inherit;outline:none;box-sizing:border-box;margin-top:2px">',
      '</div>',
      '<div>',
      '<label class="rc-lbl">Tracking # In</label>',
      '<input id="rcTracking" type="text" placeholder="Inbound tracking"',
      ' style="width:100%;height:30px;border:1.5px solid #DDE3EE;border-radius:4px;padding:0 8px;font-size:11px;font-family:\'JetBrains Mono\',monospace;outline:none;box-sizing:border-box;margin-top:2px">',
      '</div></div>',

      // Notes
      '<div>',
      '<label class="rc-lbl">Notes</label>',
      '<textarea id="rcNotes" placeholder="Condition notes, missing accessories, visible damage\u2026"',
      ' style="width:100%;height:40px;border:1px solid #DDE3EE;border-radius:4px;padding:5px 8px;font-size:11px;',
      'font-family:inherit;outline:none;box-sizing:border-box;resize:vertical;margin-top:2px"></textarea>',
      '</div>',

      // Nav buttons
      '<div style="display:flex;gap:8px;flex-shrink:0;justify-content:flex-end;margin-top:4px">',
      '<button onclick="rcGoStep(1)" style="height:34px;padding:0 16px;border:1.5px solid #DDE3EE;border-radius:6px;',
      'background:#fff;color:#6B7280;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&larr; Back</button>',
      '<button id="rcNextStep2" onclick="rcGoStep(3)" disabled style="height:34px;padding:0 20px;border:none;border-radius:6px;',
      'background:var(--navy);color:#fff;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit;',
      'opacity:0.4;pointer-events:none">Review &rarr;</button></div>',
      '</div>',

      // ── Panel 3: Confirm ──
      '<div id="rcPanel3" style="display:none;flex-direction:column;flex:1;min-height:0;padding:14px 18px;gap:10px">',
      '<div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:6px;padding:10px 14px;flex-shrink:0">',
      '<span style="font-size:9px;font-weight:700;color:#15803D;text-transform:uppercase">Ready to Receive</span><br/>',
      '<span id="rcConfClient" style="font-size:12px;font-weight:700;color:var(--navy)"></span>',
      '<span id="rcConfTracking" style="font-size:10px;color:#8896AA;margin-left:6px"></span></div>',
      '<div id="rcConfTable" style="flex:1;overflow-y:auto"></div>',
      '<div id="rcConfCorrections" style="display:none;padding:8px 12px;border-radius:6px;',
      'background:#FFFBEB;border:1px solid #FDE68A;font-size:11px;color:#92400E"></div>',
      '<div style="display:flex;gap:8px;flex-shrink:0;justify-content:flex-end">',
      '<button onclick="rcGoStep(2)" style="height:34px;padding:0 16px;border:1.5px solid #DDE3EE;border-radius:6px;',
      'background:#fff;color:#6B7280;font-size:12px;font-weight:600;cursor:pointer;font-family:inherit">&larr; Back</button>',
      '<button id="rcReceiveBtn" onclick="rcReceive()" style="height:38px;padding:0 24px;border:none;border-radius:6px;',
      'background:#16A34A;color:#fff;font-size:13px;font-weight:700;cursor:pointer;font-family:inherit;',
      'display:flex;align-items:center;gap:6px;letter-spacing:.3px">',
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px">',
      '<polyline points="20 6 9 17 4 12"/></svg>Create Work Order</button></div>',
      '</div>',

      '</div>', // body
      '</div>'  // modal
    ].join('\n');
    document.body.appendChild(el);

    // Inject styles
    var s = document.createElement('style');
    s.textContent = [
      '.rc-tab{padding:8px 16px;font-size:11px;font-weight:500;color:#8896AA;cursor:pointer;user-select:none;border-bottom:2px solid transparent}',
      '.rc-tab-active{color:var(--navy);font-weight:700;border-bottom-color:var(--navy)}',
      '.rc-tab-num{display:inline-flex;align-items:center;justify-content:center;width:16px;height:16px;background:#CBD5E1;color:#fff;border-radius:50%;font-size:9px;margin-right:5px}',
      '.rc-tab-num-active{background:var(--navy)}',
      '.rc-lbl{font-size:9px;font-weight:600;color:var(--navy);text-transform:uppercase;letter-spacing:.3px}',
      /* condition buttons removed — D&I handles this */
      '.rc-arrival-card{background:#fff;border:1.5px solid #DDE3EE;border-radius:6px;padding:10px 14px;cursor:pointer;transition:border-color .15s,box-shadow .15s}',
      '.rc-arrival-card:hover{border-color:var(--blue);box-shadow:0 2px 8px rgba(46,117,182,.12)}',
      '.rc-arrival-card.rc-overdue{border-left:3px solid #DC2626}',
      '.rc-arrival-card.rc-recent{border-left:3px solid #16A34A}'
    ].join('\n');
    document.head.appendChild(s);

    el.addEventListener('click', function(e) { if (e.target === el) rcClose(); });
    document.addEventListener('keydown', function(e) {
      if (e.key === 'Escape' && el.style.display !== 'none') rcClose();
    });
  }

  // ── Open / Close ──────────────────────────────────────
  window.openReceiving = async function() {
    _inject();
    _resetForm();
    _selectedArrival = null;
    _mode = '';
    _step = 1;

    var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
    try {
      var data = await API.getPendingArrivals(svcKey, 'pending');
      _arrivals = Array.isArray(data) ? data : (data.data || []);
    } catch(e) { _arrivals = []; }
    try {
      var data2 = await API.getAllClients(svcKey);
      _clients = Array.isArray(data2) ? data2 : (data2.data || []);
    } catch(e) { _clients = []; }
    try {
      var data3 = await API.getAllDepartments(svcKey);
      _depts = Array.isArray(data3) ? data3 : (data3.data || []);
    } catch(e) { _depts = []; }
    try {
      var st = await API.getAllScopeTypes();
      _scopeTypes = Array.isArray(st) ? st : (st.data || []);
    } catch(e) { _scopeTypes = []; }

    // Lazy expire: any >30 days old → expired
    _arrivals = _arrivals.filter(function(a) {
      if (_daysAgo(a.dtDateSubmitted) >= 30) {
        API.updatePendingArrival({ lPendingArrivalKey: a.lPendingArrivalKey, sStatus: 'expired' });
        return false;
      }
      return true;
    });

    rcGoStep(1);
    document.getElementById('rcOverlay').style.display = 'flex';
    setTimeout(function() {
      var inp = document.getElementById('rcArrivalSearch');
      if (inp) inp.focus();
    }, 50);
  };

  window.rcClose = function() {
    var el = document.getElementById('rcOverlay');
    if (el) el.style.display = 'none';
  };

  function _resetForm() {
    _form = {
      clientKey: null, clientName: '', deptKey: null, deptName: '',
      scopeTypeKey: null, modelDesc: '', serial: '', scopeKey: null,
      complaint: '', poNumber: '', trackingIn: '', notes: '',
      isKnown: false
    };
  }

  // ── Step Navigation ───────────────────────────────────
  window.rcGoStep = function(step) {
    if (step === 2 && !_mode && !_selectedArrival) return;
    if (step === 3 && !_form.clientKey) return;
    if (step === 3 && !_form.serial) return;

    _step = step;
    document.getElementById('rcPanel1').style.display = step === 1 ? 'flex' : 'none';
    document.getElementById('rcPanel2').style.display = step === 2 ? 'flex' : 'none';
    document.getElementById('rcPanel3').style.display = step === 3 ? 'flex' : 'none';

    ['rcTab1','rcTab2','rcTab3'].forEach(function(id, i) {
      var tab = document.getElementById(id);
      var active = (i+1) === step;
      var past = (i+1) < step;
      tab.className = 'rc-tab' + (active ? ' rc-tab-active' : '');
      var num = tab.querySelector('.rc-tab-num');
      if (num) num.className = 'rc-tab-num' + ((active || past) ? ' rc-tab-num-active' : '');
    });

    if (step === 1) {
      rcFilterArrivals('');
      var inp = document.getElementById('rcArrivalSearch');
      if (inp) { inp.value = ''; }
    }
    if (step === 2) {
      _populateIntakeForm();
    }
    if (step === 3) {
      _renderConfirmation();
    }
  };

  // ── Panel 1: Expected Arrivals ────────────────────────
  window.rcFilterArrivals = function(q) {
    var lower = (q || '').toLowerCase();
    var filtered = lower ? _arrivals.filter(function(a) {
      return (a.sCustomerName || '').toLowerCase().includes(lower) ||
        (a.sClaimedSerialNumber || '').toLowerCase().includes(lower) ||
        (a.sClaimedModel || '').toLowerCase().includes(lower) ||
        (a.sContactName || '').toLowerCase().includes(lower);
    }) : _arrivals;

    var countEl = document.getElementById('rcArrivalCount');
    if (countEl) countEl.textContent = filtered.length + ' pending';

    var list = document.getElementById('rcArrivalList');
    if (!filtered.length) {
      list.innerHTML = '<div style="padding:30px;text-align:center;font-size:12px;color:#8896AA">' +
        (lower ? 'No matching arrivals found' : 'No expected arrivals pending') + '</div>';
      return;
    }

    // Sort: overdue first, then by date submitted desc
    filtered.sort(function(a, b) {
      var da = _daysAgo(a.dtDateSubmitted), db = _daysAgo(b.dtDateSubmitted);
      if (da >= 14 && db < 14) return -1;
      if (db >= 14 && da < 14) return 1;
      return db - da;
    });

    list.innerHTML = filtered.map(function(a) {
      var days = _daysAgo(a.dtDateSubmitted);
      var cls = days >= 14 ? 'rc-arrival-card rc-overdue' : (days <= 3 ? 'rc-arrival-card rc-recent' : 'rc-arrival-card');
      return '<div class="' + cls + '" onclick="rcSelectArrival(' + a.lPendingArrivalKey + ')">' +
        '<div style="display:flex;justify-content:space-between;align-items:flex-start">' +
        '<div style="font-size:12px;font-weight:700;color:var(--navy)">' + _esc(a.sCustomerName) + '</div>' +
        _ageBadge(days) + '</div>' +
        '<div style="display:flex;gap:12px;margin-top:4px;font-size:11px;color:#6B7280">' +
        '<span><strong style="color:var(--navy)">Model:</strong> ' + _esc(a.sClaimedModel) + '</span>' +
        '<span><strong style="color:var(--navy)">SN:</strong> <span style="font-family:\'JetBrains Mono\',monospace">' + _esc(a.sClaimedSerialNumber) + '</span></span>' +
        (a.sPONumber ? '<span><strong style="color:var(--navy)">PO:</strong> ' + _esc(a.sPONumber) + '</span>' : '') +
        '</div>' +
        '<div style="font-size:10px;color:#8896AA;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' +
        _esc(a.sComplaintDesc) + '</div>' +
        '<div style="font-size:9px;color:#8896AA;margin-top:2px">' +
        _esc(a.sContactName) + ' &bull; ' + _esc(a.sSource) +
        '</div></div>';
    }).join('');
  };

  window.rcSelectArrival = function(key) {
    _selectedArrival = _arrivals.find(function(a) { return a.lPendingArrivalKey === key; });
    if (!_selectedArrival) return;
    _mode = 'expected';
    _resetForm();

    // Pre-fill from portal data
    _form.serial = _selectedArrival.sClaimedSerialNumber || '';
    _form.modelDesc = _selectedArrival.sClaimedModel || '';
    _form.complaint = _selectedArrival.sComplaintDesc || '';
    _form.poNumber = _selectedArrival.sPONumber || '';

    // Try to auto-match client by name
    var portalName = (_selectedArrival.sCustomerName || '').toLowerCase();
    var clientMatch = _clients.find(function(c) {
      return _cName(c).toLowerCase() === portalName;
    });
    if (!clientMatch) {
      // Fuzzy: check if portal name is contained in client name or vice versa
      clientMatch = _clients.find(function(c) {
        var cn = _cName(c).toLowerCase();
        return cn.includes(portalName) || portalName.includes(cn);
      });
    }
    if (clientMatch) {
      _form.clientKey = clientMatch.lClientKey;
      _form.clientName = _cName(clientMatch);
    }

    // Pre-fill department from portal submission
    if (_selectedArrival.lDepartmentKey) {
      _form.deptKey = _selectedArrival.lDepartmentKey;
      var deptMatch = _depts.find(function(d) { return d.lDepartmentKey === _selectedArrival.lDepartmentKey; });
      _form.deptName = deptMatch ? (deptMatch.psDepartmentName || deptMatch.sDepartmentName || '') : (_selectedArrival.sDepartmentName || '');
    }

    // Try to match model to scope type
    var modelLower = (_form.modelDesc || '').toLowerCase();
    var typeMatch = _scopeTypes.filter(function(t) {
      var rf = (t.sRigidOrFlexible || '').toUpperCase();
      return rf === 'R' || rf === 'F' || rf === 'C';
    }).find(function(t) {
      var desc = (t.sScopeTypeDesc || t.psScopeTypeDesc || '').toLowerCase();
      return desc === modelLower || desc.includes(modelLower) || modelLower.includes(desc);
    });
    if (typeMatch) {
      _form.scopeTypeKey = typeMatch.lScopeTypeKey;
    }

    rcGoStep(2);
  };

  window.rcStartWalkin = function() {
    _selectedArrival = null;
    _mode = 'walkin';
    _resetForm();
    rcGoStep(2);
  };

  // ── Panel 2: Intake Form ──────────────────────────────
  function _populateIntakeForm() {
    // Portal banner
    var banner = document.getElementById('rcPortalBanner');
    if (_selectedArrival) {
      banner.style.display = 'block';
      document.getElementById('rcPortalInfo').innerHTML =
        '<strong>' + _esc(_selectedArrival.sCustomerName) + '</strong> &bull; ' +
        _esc(_selectedArrival.sClaimedModel) + ' &bull; SN: ' +
        '<span style="font-family:\'JetBrains Mono\',monospace">' + _esc(_selectedArrival.sClaimedSerialNumber) + '</span>' +
        ' &bull; Submitted ' + _daysAgo(_selectedArrival.dtDateSubmitted) + 'd ago';
    } else {
      banner.style.display = 'none';
    }

    // Client
    if (_form.clientKey) {
      var c = _clients.find(function(x) { return x.lClientKey === _form.clientKey; });
      if (c) _showClientSelected(c);
    } else {
      rcClearClient();
      // If from portal, auto-search by customer name
      if (_selectedArrival) {
        var searchInp = document.getElementById('rcClientSearch');
        if (searchInp) {
          searchInp.value = _selectedArrival.sCustomerName || '';
          rcFilterClients(searchInp.value);
        }
      }
    }

    // Populate dept dropdown
    _populateDeptDropdown();

    // Model dropdown — scopes only (R=Rigid, F=Flexible, C=Camera), sorted alpha
    var scopeModels = _scopeTypes
      .filter(function(t) { var rf = (t.sRigidOrFlexible || '').toUpperCase(); return rf === 'R' || rf === 'F' || rf === 'C'; })
      .sort(function(a, b) { return (a.sScopeTypeDesc || '').localeCompare(b.sScopeTypeDesc || ''); });
    var modelSel = document.getElementById('rcModel');
    modelSel.innerHTML = '<option value="">— Select —</option>' +
      scopeModels.map(function(t) {
        var desc = t.sScopeTypeDesc || t.psScopeTypeDesc || '';
        var sel = (_form.scopeTypeKey && t.lScopeTypeKey === _form.scopeTypeKey) ? ' selected' : '';
        return '<option value="' + (t.lScopeTypeKey || '') + '"' + sel + '>' + _esc(desc) + '</option>';
      }).join('');

    // Serial
    document.getElementById('rcSerial').value = _form.serial;

    // Complaint, PO, Tracking
    document.getElementById('rcComplaint').value = _form.complaint;
    document.getElementById('rcPO').value = _form.poNumber;
    document.getElementById('rcTracking').value = _form.trackingIn;

    // Notes
    document.getElementById('rcNotes').value = _form.notes;

    // Reset known badge + corrections
    document.getElementById('rcKnownBadge').style.display = 'none';
    document.getElementById('rcCorrections').style.display = 'none';

    _updateIntakeValidation();

    // If we have a serial pre-filled, run the lookup
    if (_form.serial) {
      setTimeout(function() { rcLookupScope(_form.serial); }, 100);
    }
  }

  function _populateDeptDropdown() {
    var deptSel = document.getElementById('rcDept');
    var clientDepts = _depts.filter(function(d) { return d.lClientKey === _form.clientKey; });
    deptSel.innerHTML = '<option value="">— Select —</option>' +
      clientDepts.map(function(d) {
        var name = d.psDepartmentName || d.sDepartmentName || '';
        var sel = (_form.deptKey && d.lDepartmentKey === _form.deptKey) ? ' selected' : '';
        return '<option value="' + d.lDepartmentKey + '"' + sel + '>' + _esc(name) + '</option>';
      }).join('');
  }

  function _showClientSelected(c) {
    document.getElementById('rcClientLabel').textContent = _cName(c);
    document.getElementById('rcClientCity').textContent = _cCity(c) + (_cState(c) ? ', ' + _cState(c) : '');
    document.getElementById('rcClientSelected').style.display = 'flex';
    document.getElementById('rcClientSearch').style.display = 'none';
    document.getElementById('rcClientGrid').style.display = 'none';
  }

  window.rcFilterClients = function(q) {
    var grid = document.getElementById('rcClientGrid');
    var lower = q.toLowerCase();
    var filtered = q ? _clients.filter(function(c) {
      return _cName(c).toLowerCase().includes(lower) ||
        _cCity(c).toLowerCase().includes(lower) ||
        _cState(c).toLowerCase().includes(lower) ||
        String(c.lClientKey).includes(lower);
    }) : _clients;

    if (!filtered.length) {
      grid.innerHTML = '<div style="grid-column:1/-1;padding:12px;text-align:center;font-size:11px;color:#8896AA">No clients found</div>';
      return;
    }
    grid.innerHTML = filtered.slice(0, 20).map(function(c) {
      return '<div class="picker-card" onclick="rcSelectClient(' + c.lClientKey + ')">' +
        '<div class="picker-card-name">' + _esc(_cName(c)) + '</div>' +
        '<div class="picker-card-sub">' + _esc(_cCity(c)) + (_cState(c) ? ', ' + _cState(c) : '') + '</div></div>';
    }).join('');
  };

  window.rcSelectClient = function(clientKey) {
    var c = _clients.find(function(x) { return x.lClientKey === clientKey; });
    if (!c) return;
    _form.clientKey = clientKey;
    _form.clientName = _cName(c);
    _showClientSelected(c);
    _populateDeptDropdown();
    _updateIntakeValidation();
  };

  window.rcClearClient = function() {
    _form.clientKey = null;
    _form.clientName = '';
    _form.deptKey = null;
    _form.deptName = '';
    document.getElementById('rcClientSelected').style.display = 'none';
    document.getElementById('rcClientSearch').style.display = '';
    document.getElementById('rcClientGrid').style.display = '';
    rcFilterClients('');
    _updateIntakeValidation();
  };

  window.rcUpdateDept = function(val) {
    _form.deptKey = val ? parseInt(val) : null;
    var d = _depts.find(function(x) { return String(x.lDepartmentKey) === val; });
    _form.deptName = d ? (d.psDepartmentName || d.sDepartmentName || '') : '';
  };

  window.rcUpdateModel = function(val) {
    _form.scopeTypeKey = val ? parseInt(val) : null;
    var t = _scopeTypes.find(function(x) { return String(x.lScopeTypeKey) === val; });
    _form.modelDesc = t ? (t.sScopeTypeDesc || t.psScopeTypeDesc || '') : '';
    _checkCorrections();
    _updateIntakeValidation();
  };

  window.rcLookupScope = async function(serial) {
    serial = (serial || '').trim();
    _form.serial = serial;
    _checkCorrections();
    _updateIntakeValidation();
    if (!serial || !_form.clientKey) return;

    try {
      var scopes = await API.getAllScopes(_form.clientKey);
      var arr = Array.isArray(scopes) ? scopes : (scopes.data || []);
      var match = arr.find(function(s) {
        return (s.sSerialNumber || '').toLowerCase() === serial.toLowerCase();
      });

      var badge = document.getElementById('rcKnownBadge');
      if (match) {
        _form.isKnown = true;
        _form.scopeKey = match.lScopeKey;
        if (match.sScopeTypeDesc) _form.modelDesc = match.sScopeTypeDesc;
        if (match.lDepartmentKey) {
          _form.deptKey = match.lDepartmentKey;
          _form.deptName = match.sDepartmentName || '';
        }

        badge.style.display = 'block';
        badge.innerHTML = '&#10003; Known scope &mdash; ' + _esc(match.sScopeTypeDesc || '') +
          (match.sDepartmentName ? ' &bull; ' + _esc(match.sDepartmentName) : '');

        // Update dropdowns to reflect
        var modelSel = document.getElementById('rcModel');
        if (modelSel) { modelSel.disabled = true; modelSel.style.opacity = '0.5'; }
        var deptSel = document.getElementById('rcDept');
        if (deptSel) {
          _populateDeptDropdown();
          deptSel.value = String(_form.deptKey || '');
          deptSel.disabled = true;
          deptSel.style.opacity = '0.5';
        }
      } else {
        _form.isKnown = false;
        _form.scopeKey = null;
        badge.style.display = 'none';
        var modelSel = document.getElementById('rcModel');
        if (modelSel) { modelSel.disabled = false; modelSel.style.opacity = '1'; }
        var deptSel = document.getElementById('rcDept');
        if (deptSel) { deptSel.disabled = false; deptSel.style.opacity = '1'; }
      }
    } catch(e) {
      // lookup failed, treat as new
    }
    _updateIntakeValidation();
  };

  /* rcToggleCond removed — condition assessment moved to D&I */

  function _checkCorrections() {
    if (!_selectedArrival) return;
    var corrections = [];
    var curModel = _form.modelDesc || document.getElementById('rcModel')?.selectedOptions?.[0]?.textContent || '';
    var curSerial = _form.serial || document.getElementById('rcSerial')?.value || '';

    if (_selectedArrival.sClaimedModel && curModel && curModel !== '— Select —' &&
        curModel.toLowerCase() !== _selectedArrival.sClaimedModel.toLowerCase()) {
      corrections.push('Model: <s>' + _esc(_selectedArrival.sClaimedModel) + '</s> &rarr; <strong>' + _esc(curModel) + '</strong>');
    }
    if (_selectedArrival.sClaimedSerialNumber && curSerial &&
        curSerial.toLowerCase() !== _selectedArrival.sClaimedSerialNumber.toLowerCase()) {
      corrections.push('Serial: <s>' + _esc(_selectedArrival.sClaimedSerialNumber) + '</s> &rarr; <strong>' + _esc(curSerial) + '</strong>');
    }

    var el = document.getElementById('rcCorrections');
    if (corrections.length) {
      el.style.display = 'block';
      el.innerHTML = '<strong>Corrections from portal:</strong> ' + corrections.join(' &bull; ');
    } else {
      el.style.display = 'none';
    }
  }

  function _updateIntakeValidation() {
    var serial = _form.serial || (document.getElementById('rcSerial') ? document.getElementById('rcSerial').value : '');
    var valid = _form.clientKey && serial.trim();
    var btn = document.getElementById('rcNextStep2');
    if (btn) {
      btn.disabled = !valid;
      btn.style.opacity = valid ? '1' : '0.4';
      btn.style.pointerEvents = valid ? 'auto' : 'none';
    }
  }

  // ── Panel 3: Confirmation ─────────────────────────────
  function _renderConfirmation() {
    // Read latest form values from DOM
    _form.serial = (document.getElementById('rcSerial').value || '').trim();
    _form.complaint = (document.getElementById('rcComplaint').value || '').trim();
    _form.poNumber = (document.getElementById('rcPO').value || '').trim();
    _form.trackingIn = (document.getElementById('rcTracking').value || '').trim();
    _form.notes = (document.getElementById('rcNotes').value || '').trim();

    // If model not set from known scope, read from dropdown
    if (!_form.isKnown) {
      var modelSel = document.getElementById('rcModel');
      if (modelSel && modelSel.value) {
        _form.scopeTypeKey = parseInt(modelSel.value);
        var opt = modelSel.selectedOptions[0];
        if (opt) _form.modelDesc = opt.textContent;
      }
      var deptSel = document.getElementById('rcDept');
      if (deptSel && deptSel.value) {
        _form.deptKey = parseInt(deptSel.value);
        var dOpt = deptSel.selectedOptions[0];
        if (dOpt) _form.deptName = dOpt.textContent;
      }
    }

    document.getElementById('rcConfClient').textContent = _form.clientName;
    document.getElementById('rcConfTracking').textContent = _form.trackingIn ? 'Tracking: ' + _form.trackingIn : '';

    var rows = [
      ['Serial #', '<span style="font-family:monospace;font-weight:600">' + _esc(_form.serial) + '</span>'],
      ['Model', _esc(_form.modelDesc || '—')],
      ['Department', _esc(_form.deptName || '—')],
      ['Complaint', _esc(_form.complaint || '—')],
      ['PO #', _esc(_form.poNumber || '—')],
      ['Source', _selectedArrival ? 'Portal Submission' : 'Walk-in'],
      ['Notes', _esc(_form.notes || '—')]
    ];

    document.getElementById('rcConfTable').innerHTML =
      '<table style="width:100%;border-collapse:collapse;font-size:12px">' +
      rows.map(function(r) {
        return '<tr style="border-bottom:1px solid #F1F5F9">' +
          '<td style="padding:6px 8px;font-size:10px;font-weight:600;color:var(--navy);text-transform:uppercase;width:100px;vertical-align:top">' + r[0] + '</td>' +
          '<td style="padding:6px 8px;color:#374151">' + r[1] + '</td></tr>';
      }).join('') + '</table>';

    // Correction audit trail
    var confCorr = document.getElementById('rcConfCorrections');
    if (_selectedArrival) {
      var corrections = [];
      if (_selectedArrival.sClaimedModel && _form.modelDesc &&
          _form.modelDesc.toLowerCase() !== _selectedArrival.sClaimedModel.toLowerCase()) {
        corrections.push('Model: ' + _selectedArrival.sClaimedModel + ' → ' + _form.modelDesc);
      }
      if (_selectedArrival.sClaimedSerialNumber && _form.serial &&
          _form.serial.toLowerCase() !== _selectedArrival.sClaimedSerialNumber.toLowerCase()) {
        corrections.push('Serial: ' + _selectedArrival.sClaimedSerialNumber + ' → ' + _form.serial);
      }
      if (corrections.length) {
        confCorr.style.display = 'block';
        confCorr.innerHTML = '<strong>Corrections from portal submission:</strong><br/>' + corrections.join('<br/>');
      } else {
        confCorr.style.display = 'none';
      }
    } else {
      confCorr.style.display = 'none';
    }
  }

  // ── Receive (Create WO) ───────────────────────────────
  window.rcReceive = async function() {
    var btn = document.getElementById('rcReceiveBtn');
    btn.disabled = true;
    btn.innerHTML = '<span style="font-size:12px">Creating\u2026</span>';

    var svcKey = parseInt(localStorage.getItem('tsi_svcLocation') || '1');
    var today = new Date().toISOString().split('T')[0];
    var repair = {
      lClientKey: _form.clientKey,
      lDepartmentKey: _form.deptKey || null,
      lScopeKey: _form.scopeKey || null,
      lScopeTypeKey: _form.scopeTypeKey || null,
      sSerialNumber: _form.serial,
      sScopeTypeDesc: _form.modelDesc || '',
      sClientName1: _form.clientName,
      sDepartmentName: _form.deptName || '',
      sShipTrackingNumberIn: _form.trackingIn,
      dtDateIn: today,
      lRepairStatusID: 1,
      sRepairStatusDesc: 'Received',
      sRepairStatus: 'Received',
      ProgBarStatus: 'Received',
      sNotes: _form.complaint + (_form.notes ? '\n' + _form.notes : ''),
      sPONumber: _form.poNumber,
      lServiceLocationKey: svcKey,
      /* condition P/F fields removed — assessed during D&I */
      sTimeReceived: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      bFromPortal: !!_selectedArrival
    };

    try {
      var result = await API.addRepair(repair);
      var woNumber = result.sWorkOrderNumber || result.data?.sWorkOrderNumber || ('WO-' + (result.lRepairKey || '?'));

      // If from expected arrival, mark it received
      if (_selectedArrival) {
        var correctedModel = null, correctedSerial = null;
        if (_selectedArrival.sClaimedModel && _form.modelDesc &&
            _form.modelDesc.toLowerCase() !== _selectedArrival.sClaimedModel.toLowerCase()) {
          correctedModel = _form.modelDesc;
        }
        if (_selectedArrival.sClaimedSerialNumber && _form.serial &&
            _form.serial.toLowerCase() !== _selectedArrival.sClaimedSerialNumber.toLowerCase()) {
          correctedSerial = _form.serial;
        }
        await API.receivePendingArrival({
          lPendingArrivalKey: _selectedArrival.lPendingArrivalKey,
          lRepairKey: result.lRepairKey,
          sWorkOrderNumber: woNumber,
          sCorrectedModel: correctedModel,
          sCorrectedSerialNumber: correctedSerial
        });
      }

      rcClose();

      if (window.TSI && window.TSI.toast) {
        TSI.toast.success('Work Order Created',
          woNumber + ' — ' + _form.clientName + ' (' + _form.serial + ')', 4000);
      }

      // Refresh if on relevant page
      if (typeof loadDashboard === 'function') loadDashboard();
      if (typeof loadDashboardData === 'function') loadDashboardData();
      if (typeof loadRepairs === 'function') loadRepairs();

    } catch(e) {
      btn.disabled = false;
      btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" style="width:14px;height:14px">' +
        '<polyline points="20 6 9 17 4 12"/></svg>Create Work Order';
      if (window.TSI && window.TSI.toast) {
        TSI.toast.error('Error', 'Failed to create work order: ' + (e.message || 'Unknown error'), 4000);
      }
    }
  };

})();
