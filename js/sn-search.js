// js/sn-search.js — Global SN# Quick Lookup
// Injects a compact serial number search field into the topbar on every page.
// Returns scope: model, type, client, dept, last repair, open WO status.

(function() {
  'use strict';

  // ── Demo data (used when API is unavailable) ─────────────────────────────
  const _DEMO_SCOPES = [
    { lScopeKey:1001, sn:'GIF-H1234',   model:'Olympus GIF-H180',       type:'F', client:'Memorial Hospital',       dept:'Endoscopy',       lClientKey:1, lDeptKey:10, lastRepair:'2024-08-15', openWO:false },
    { lScopeKey:1002, sn:'CF-HQ1890',   model:'Olympus CF-HQ190',       type:'F', client:'Memorial Hospital',       dept:'Endoscopy',       lClientKey:1, lDeptKey:10, lastRepair:'2024-09-01', openWO:true  },
    { lScopeKey:1003, sn:'BF-P290',     model:'Olympus BF-P290',        type:'F', client:'Memorial Hospital',       dept:'Endoscopy',       lClientKey:1, lDeptKey:10, lastRepair:null,         openWO:false },
    { lScopeKey:1004, sn:'URF-V2-001',  model:'Olympus URF-V2',         type:'R', client:'Memorial Hospital',       dept:'Urology',         lClientKey:1, lDeptKey:11, lastRepair:'2024-04-10', openWO:false },
    { lScopeKey:1005, sn:'OLD-SCOPE-99',model:'Pentax FG-34W',          type:'F', client:'City General Medical',    dept:'GI Lab',          lClientKey:2, lDeptKey:12, lastRepair:'2024-03-01', openWO:false, inactive:true },
    { lScopeKey:1006, sn:'EC-760R',     model:'Fujifilm EC-760R',       type:'F', client:'City General Medical',    dept:'GI Lab',          lClientKey:2, lDeptKey:12, lastRepair:'2024-10-15', openWO:false },
    { lScopeKey:1007, sn:'CYF-V2-100',  model:'Olympus CYF-V2',        type:'R', client:'Memorial Hospital',       dept:'Urology',         lClientKey:1, lDeptKey:11, lastRepair:'2024-10-01', openWO:true  },
    { lScopeKey:1008, sn:'OTV-SP1-22',  model:'Olympus OTV-SP1',        type:'C', client:'Northside Surgery Center',dept:'Surgical Suite',  lClientKey:3, lDeptKey:14, lastRepair:'2024-11-05', openWO:false },
    { lScopeKey:1009, sn:'CLV-S200',    model:'Olympus CLV-S200',       type:'C', client:'Northside Surgery Center',dept:'Surgical Suite',  lClientKey:3, lDeptKey:14, lastRepair:null,         openWO:false },
    { lScopeKey:1010, sn:'BF-1TH190',   model:'Olympus BF-1TH190',     type:'F', client:'City General Medical',    dept:'Pulmonology',     lClientKey:2, lDeptKey:13, lastRepair:'2024-06-10', openWO:false },
    { lScopeKey:1011, sn:'EG-760Z',     model:'Fujifilm EG-760Z',       type:'F', client:'City General Medical',    dept:'GI Lab',          lClientKey:2, lDeptKey:12, lastRepair:'2024-08-20', openWO:false },
    { lScopeKey:1012, sn:'A5394-3',     model:'Stryker 5mm Arthroscope',type:'I', client:'Northside Surgery Center',dept:'Surgical Suite',  lClientKey:3, lDeptKey:14, lastRepair:'2024-09-15', openWO:false },
    { lScopeKey:1013, sn:'TJF-Q180V',   model:'Olympus TJF-Q180V',     type:'F', client:'Memorial Hospital',       dept:'Endoscopy',       lClientKey:1, lDeptKey:10, lastRepair:'2024-11-15', openWO:true  },
    { lScopeKey:1014, sn:'PCF-H190-7',  model:'Olympus PCF-H190',      type:'F', client:'Memorial Hospital',       dept:'Endoscopy',       lClientKey:1, lDeptKey:10, lastRepair:'2024-05-20', openWO:false, inactive:true },
    { lScopeKey:1015, sn:'WA50012A',    model:'Olympus WA50012A Resectoscope',type:'I', client:'Memorial Hospital', dept:'Urology',        lClientKey:1, lDeptKey:11, lastRepair:'2024-10-25', openWO:false },
    { lScopeKey:1016, sn:'EB-1990i',    model:'Pentax EB-1990i',        type:'F', client:'City General Medical',    dept:'Pulmonology',     lClientKey:2, lDeptKey:13, lastRepair:'2024-11-23', openWO:false },
  ];

  const _TYPE_LABELS = { F:'Flexible', R:'Rigid', C:'Camera', I:'Instrument' };
  const _TYPE_COLORS = { F:'#1D4ED8', R:'#15803D', C:'#7C3AED', I:'#B45309' };
  const _TYPE_BG     = { F:'#EFF6FF', R:'#F0FDF4', C:'#FDF4FF', I:'#FFFBEB' };

  function _fmtDate(d) {
    if (!d) return '—';
    const dt = new Date(d);
    return isNaN(dt) ? '—' : dt.toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'});
  }

  // ── Build & inject widget ────────────────────────────────────────────────
  function _inject() {
    const topbarRight = document.querySelector('.topbar-right');
    if (!topbarRight || document.getElementById('snSearchWrap')) return;

    const wrap = document.createElement('div');
    wrap.id = 'snSearchWrap';
    wrap.style.cssText = 'position:relative;display:flex;align-items:center;margin-right:8px';
    wrap.innerHTML = `
      <div style="position:relative;display:flex;align-items:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.5)" stroke-width="2"
          style="position:absolute;left:8px;width:13px;height:13px;pointer-events:none">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input id="snSearchInput" type="text" placeholder="SN# lookup…" autocomplete="off" spellcheck="false"
          style="height:28px;width:150px;background:rgba(255,255,255,.12);border:1px solid rgba(255,255,255,.2);
                 border-radius:5px;padding:0 10px 0 28px;font-size:11px;font-family:inherit;color:#fff;
                 outline:none;transition:all .15s;caret-color:#fff"
          onfocus="this.style.background='rgba(255,255,255,.18)';this.style.borderColor='rgba(255,255,255,.4)';this.style.width='190px'"
          onblur="this.style.background='rgba(255,255,255,.12)';this.style.borderColor='rgba(255,255,255,.2)';this.style.width='150px'"
          oninput="snSearch_onInput(this.value)"
          onkeydown="snSearch_onKey(event)">
      </div>
      <div id="snSearchResults" style="display:none;position:absolute;top:calc(100% + 6px);right:0;
            width:320px;background:#fff;border:1px solid #DDE3EE;border-radius:8px;
            box-shadow:0 8px 24px rgba(0,0,37,.18);z-index:9999;overflow:hidden;max-height:400px;overflow-y:auto">
      </div>
    `;

    // Insert before New Order button (or first child if not found)
    const newOrderWrap = topbarRight.querySelector('#newOrderWrap');
    if (newOrderWrap) {
      topbarRight.insertBefore(wrap, newOrderWrap);
    } else {
      topbarRight.insertBefore(wrap, topbarRight.firstChild);
    }

    // Close results on outside click
    document.addEventListener('click', function(e) {
      if (!wrap.contains(e.target)) {
        document.getElementById('snSearchResults').style.display = 'none';
      }
    });

    // Keyboard shortcut: / to focus the search (if not already in an input)
    document.addEventListener('keydown', function(e) {
      if (e.key === '/' && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
        e.preventDefault();
        document.getElementById('snSearchInput').focus();
      }
    });
  }

  // ── Search logic ─────────────────────────────────────────────────────────
  let _debounceTimer = null;

  window.snSearch_onInput = function(val) {
    clearTimeout(_debounceTimer);
    if (!val || val.trim().length < 2) {
      document.getElementById('snSearchResults').style.display = 'none';
      return;
    }
    _debounceTimer = setTimeout(() => _doSearch(val.trim()), 250);
  };

  window.snSearch_onKey = function(e) {
    if (e.key === 'Escape') {
      document.getElementById('snSearchResults').style.display = 'none';
      document.getElementById('snSearchInput').blur();
    }
    if (e.key === 'Enter') {
      clearTimeout(_debounceTimer);
      const val = e.target.value.trim();
      if (val.length >= 2) _doSearch(val);
    }
  };

  async function _doSearch(query) {
    const panel = document.getElementById('snSearchResults');
    panel.style.display = 'block';
    panel.innerHTML = '<div style="padding:14px 16px;font-size:11px;color:#8896AA;text-align:center">Searching…</div>';

    let results = [];
    try {
      // Try API first (scope lookup by serial number)
      if (typeof API !== 'undefined' && !API.isDemoMode()) {
        const data = await API.getScopeBySerialNumber(query);
        if (data && data.length) {
          results = data.map(s => ({
            lScopeKey: s.lScopeKey,
            sn: s.psSerialNumber || s.sSerialNumber,
            model: s.sScopeTypeDesc || s.sModel || '—',
            type: s.sInstrumentType || s.psInstrumentType || '—',
            client: s.sClientName || '—',
            dept: s.sDepartmentName || s.psDepartmentName || '—',
            lClientKey: s.lClientKey,
            lDeptKey: s.lDepartmentKey,
            lastRepair: s.dtLastRepair,
            openWO: s.hasOpenWO || s.bHasOpenWO || false,
            inactive: s.psScopeIsDead === 'Y' || s.bScopeIsDead,
          }));
        }
      }
    } catch(e) { /* fall through to demo */ }

    // Demo fallback — fuzzy match on serial number
    if (!results.length) {
      const q = query.toLowerCase();
      results = _DEMO_SCOPES.filter(s =>
        s.sn.toLowerCase().includes(q) || s.model.toLowerCase().includes(q)
      );
    }

    _renderResults(results, query, panel);
  }

  function _renderResults(results, query, panel) {
    if (!results.length) {
      panel.innerHTML = `<div style="padding:14px 16px;font-size:11.5px;color:#8896AA;text-align:center">
        <svg viewBox="0 0 24 24" fill="none" stroke="#CBD5E1" stroke-width="2" style="width:20px;height:20px;display:block;margin:0 auto 6px"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        No scopes found for "<strong>${_esc(query)}</strong>"</div>`;
      return;
    }

    const html = results.slice(0, 8).map(r => _resultCard(r)).join('');
    const footer = results.length > 8
      ? `<div style="padding:6px 12px;font-size:10px;color:#8896AA;border-top:1px solid #EEF0F4;text-align:center">${results.length - 8} more results — refine your search</div>`
      : '';
    panel.innerHTML = html + footer;
  }

  function _resultCard(r) {
    const typeColor = _TYPE_COLORS[r.type] || '#64748B';
    const typeBg    = _TYPE_BG[r.type]    || '#F8FAFF';
    const typeLabel = _TYPE_LABELS[r.type] || r.type;
    const woDot = r.openWO
      ? `<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;color:#EF4444;font-weight:600"><span style="width:7px;height:7px;border-radius:50%;background:#EF4444;display:inline-block"></span>Open WO</span>`
      : `<span style="font-size:10px;color:#94A3B8">No open WO</span>`;
    const inactiveBadge = r.inactive
      ? `<span style="background:#F3F4F6;color:#64748B;border:1px solid #E2E8F0;padding:1px 6px;border-radius:8px;font-size:10px;font-weight:600;margin-left:4px">Inactive</span>`
      : '';

    // Action buttons
    const deptLink = r.lDeptKey
      ? `<a onclick="document.getElementById('snSearchResults').style.display='none';window.location='departments?dept=${r.lDeptKey}'" style="font-size:10.5px;color:#2E74B5;font-weight:600;cursor:pointer;text-decoration:none;padding:4px 8px;border:1px solid #BFDBFE;border-radius:4px;background:#EFF6FF;white-space:nowrap">View Dept</a>`
      : '';
    const repairLink = r.openWO
      ? `<a onclick="document.getElementById('snSearchResults').style.display='none';window.location='repairs'" style="font-size:10.5px;color:#15803D;font-weight:600;cursor:pointer;text-decoration:none;padding:4px 8px;border:1px solid #BBF7D0;border-radius:4px;background:#F0FDF4;white-space:nowrap">Open Repair</a>`
      : `<a onclick="document.getElementById('snSearchResults').style.display='none';window.location='repairs?action=new'" style="font-size:10.5px;color:#64748B;font-weight:600;cursor:pointer;text-decoration:none;padding:4px 8px;border:1px solid #E2E8F0;border-radius:4px;background:#F8FAFF;white-space:nowrap">New Repair</a>`;

    return `<div style="padding:10px 14px;border-bottom:1px solid #F0F2F6;cursor:default"
      onmouseover="this.style.background='#F8FAFF'" onmouseout="this.style.background=''">
      <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:8px;margin-bottom:5px">
        <div style="display:flex;align-items:center;gap:6px;min-width:0">
          <span style="background:${typeBg};color:${typeColor};border:1px solid currentColor;padding:1px 6px;border-radius:8px;font-size:9.5px;font-weight:700;white-space:nowrap;opacity:.9">${typeLabel}</span>
          <span style="font-size:12.5px;font-weight:800;color:#00257A;letter-spacing:-.2px;white-space:nowrap">${_esc(r.sn)}</span>
          ${inactiveBadge}
        </div>
        <div style="display:flex;gap:4px;flex-shrink:0">${deptLink} ${repairLink}</div>
      </div>
      <div style="font-size:11px;color:#374151;font-weight:500;margin-bottom:2px">${_esc(r.model)}</div>
      <div style="display:flex;align-items:center;justify-content:space-between">
        <div style="font-size:10.5px;color:#64748B">
          <span style="font-weight:600;color:#374151">${_esc(r.client)}</span>
          <span style="color:#CBD5E1;margin:0 4px">/</span>
          ${_esc(r.dept)}
        </div>
        <div style="display:flex;align-items:center;gap:8px">
          <span style="font-size:10px;color:#94A3B8">Last: ${_fmtDate(r.lastRepair)}</span>
          ${woDot}
        </div>
      </div>
    </div>`;
  }

  function _esc(s) {
    return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  // ── Boot ─────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _inject);
  } else {
    _inject();
  }

})();
