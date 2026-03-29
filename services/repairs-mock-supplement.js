// ═══════════════════════════════════════════════════════
//  Repair Mock Data Supplement — Realistic 75-repair queue
//  Deterministic (no Math.random()) — modulo cycling only
//
//  Usage: Load AFTER mock-db.js, BEFORE repairs.html inline script.
//  Adds records directly to MockDB via MockDB.seed().
//
//  window.REPAIRS_MOCK is also exposed for pages that cannot
//  use MockDB.seed() directly.
// ═══════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── Reference data ────────────────────────────────────

  var TECHS = ['Mike R.', 'Sarah K.', 'Dave P.', 'Lisa M.', 'Tom B.'];

  var CLIENTS = [
    { lClientKey: 1, name: 'Memorial Hospital',       flagged: false },
    { lClientKey: 2, name: 'Baptist Health',           flagged: false },
    { lClientKey: 3, name: 'VA Medical Center',        flagged: false },
    { lClientKey: 4, name: 'University Hospital',      flagged: false },
    { lClientKey: 5, name: "St. Luke's Medical",       flagged: false },
    { lClientKey: 6, name: 'Riverside Health System',  flagged: true  },
  ];

  var DEPTS = [
    { lDeptKey: 1,  clientKey: 1, name: 'GI Lab' },
    { lDeptKey: 2,  clientKey: 1, name: 'Endoscopy Suite' },
    { lDeptKey: 3,  clientKey: 1, name: 'Pulmonology' },
    { lDeptKey: 4,  clientKey: 2, name: 'Endoscopy' },
    { lDeptKey: 5,  clientKey: 2, name: 'OR Suite B' },
    { lDeptKey: 6,  clientKey: 2, name: 'GI Lab' },
    { lDeptKey: 7,  clientKey: 3, name: 'Urology' },
    { lDeptKey: 8,  clientKey: 3, name: 'GI Lab' },
    { lDeptKey: 9,  clientKey: 3, name: 'Pulmonology' },
    { lDeptKey: 10, clientKey: 4, name: 'Pulmonology' },
    { lDeptKey: 11, clientKey: 4, name: 'Endoscopy' },
    { lDeptKey: 12, clientKey: 4, name: 'GI Lab' },
    { lDeptKey: 13, clientKey: 5, name: 'GI Lab' },
    { lDeptKey: 14, clientKey: 5, name: 'OR Suite A' },
    { lDeptKey: 15, clientKey: 5, name: 'Endoscopy' },
    { lDeptKey: 16, clientKey: 6, name: 'GI Lab' },
    { lDeptKey: 17, clientKey: 6, name: 'Urology' },
    { lDeptKey: 18, clientKey: 6, name: 'Endoscopy Suite' },
    { lDeptKey: 19, clientKey: 1, name: 'Operating Room' },
    { lDeptKey: 20, clientKey: 4, name: 'Operating Room' },
  ];

  // Statuses that map correctly to statusCategory() in repairs.html
  // lRepairStatusID values match the repairStatuses table in mock-db.js
  var OPEN_STATUSES = [
    { id: 1,  name: 'Waiting on Inspection',         count: 8  },
    { id: 8,  name: 'In Repair Process',              count: 12 },
    { id: 8,  name: 'In Repair Process',              count: 8  }, // second block at Major level
    { id: 6,  name: 'Waiting for Approval',           count: 10 },
    { id: 21, name: 'QC - Waiting Customer Approval', count: 6  },
    { id: 10, name: 'Scheduled to Ship',              count: 4  },
    { id: 3,  name: 'In the Drying Room',             count: 4  },
    { id: 18, name: 'Parts Hold',                     count: 4  },
  ];

  var CLOSED_STATUSES = [
    { id: 7,  name: 'Invoiced', count: 10 },
    { id: 99, name: 'Shipped',  count: 5  },
  ];

  // Flat list: [statusID, statusName] per repair slot, deterministic
  // Open: 56 repairs; Closed: 15 repairs = 71 total (some repeat-offender overlaps below)
  var STATUS_SLOTS = [];
  OPEN_STATUSES.forEach(function (s) {
    for (var i = 0; i < s.count; i++) STATUS_SLOTS.push({ id: s.id, name: s.name, closed: false });
  });
  CLOSED_STATUSES.forEach(function (s) {
    for (var i = 0; i < s.count; i++) STATUS_SLOTS.push({ id: s.id, name: s.name, closed: true });
  });

  // ── Repeat offender scopes ─────────────────────────────
  var REPEAT_OFFENDERS = [
    { serial: 'SN-GIF8821', model: 'GIF-H190',    rf: 'F', clientKey: 1, deptKey: 1,  count: 9  },
    { serial: 'SN-PCF4402', model: 'PCF-H190L',   rf: 'F', clientKey: 2, deptKey: 4,  count: 7  },
    { serial: 'SN-URF9934', model: 'URF-V2',       rf: 'F', clientKey: 3, deptKey: 7,  count: 12 },
    { serial: 'SN-BF7711',  model: 'BF-Q180',      rf: 'F', clientKey: 1, deptKey: 3,  count: 6  },
    { serial: 'SN-WA3302',  model: 'WA50010A',     rf: 'R', clientKey: 2, deptKey: 5,  count: 5  },
    { serial: 'SN-TJF6612', model: 'TJF-Q180V',    rf: 'F', clientKey: 5, deptKey: 13, count: 8  },
    { serial: 'SN-GIF1103', model: 'GIF-H185',     rf: 'F', clientKey: 6, deptKey: 16, count: 5  },
    { serial: 'SN-CF8899',  model: 'CF-HQ190L',    rf: 'F', clientKey: 1, deptKey: 2,  count: 7  },
  ];

  // ── Scope descriptions per model ──────────────────────
  var MODEL_DESC = {
    'GIF-H190':  'Video Gastroscope GIF-H190',
    'PCF-H190L': 'Video Colonoscope PCF-H190L',
    'URF-V2':    'Video Ureteroscope URF-V2',
    'BF-Q180':   'Video Bronchoscope BF-Q180',
    'WA50010A':  'Rigid Arthroscope 4.0mm WA50010A',
    'TJF-Q180V': 'Video Duodenoscope TJF-Q180V',
    'GIF-H185':  'Video Gastroscope GIF-H185',
    'CF-HQ190L': 'Video Colonoscope CF-HQ190L',
  };

  // ── Complaints pool ────────────────────────────────────
  var COMPLAINTS = [
    'Fluid invasion at insertion tube',
    'Angulation wire broken - Up/Down',
    'CCD failure - image distorted',
    'Bending rubber cracked at distal tip',
    'Light guide damage',
    'Scope not advancing - friction in insertion tube',
    'Biopsy channel blocked',
    'Image quality degraded - dark spots',
    'Leak test failure - insertion tube',
    'Annual PM/preventive maintenance',
    'Water leak at light guide connector',
    'Optics cloudy - distal lens',
    'Angulation restricted - all directions',
    'Suction channel clogged',
  ];

  // ── PO number formats ──────────────────────────────────
  var PO_PREFIXES = ['70006', '80012', '91023', '65044', '44018', '55099'];
  var PO_SUFFIXES = ['0-GI', '0-OMR', '1-END', '0-PUL', '0-URO', '0-OR'];

  // ── Line item descriptions ─────────────────────────────
  var ITEM_DESCS = [
    'Clean & Polish Distal Lenses',
    'Replace Insertion Tube',
    'Angulation Rebuild - Up/Down',
    'Leak Test & Pressure Test',
    'CCD Replacement',
    'Bending Rubber Replacement',
    'Light Guide Bundle Replacement',
    'Biopsy Channel Repair',
    'Distal End Reseal',
    'Angulation Wire Replacement',
    'Full Fluid Invasion Repair',
    'Universal Cord Replacement',
    'Video Connector Reseal',
    'Suction Channel Reaming',
    'Annual Preventive Maintenance',
  ];

  var ITEM_FINDINGS = [
    'Confirmed damage consistent with complaint',
    'Wear pattern consistent with age',
    'Foreign body occlusion',
    'Corrosion at junction point',
    'Impact damage - distal tip',
    'Fluid contamination present',
    'Normal wear - scheduled replacement',
    'Operator-induced damage',
  ];

  // ── Repair level lookup ────────────────────────────────
  var LEVELS = ['Minor', 'Mid-Level', 'Major', 'VSI'];

  // ── Date helpers ──────────────────────────────────────
  // Base date: 2026-03-28 (today per project context)
  var BASE_MS = new Date('2026-03-28T00:00:00').getTime();

  function daysAgo(n) {
    return new Date(BASE_MS - n * 86400000).toISOString().slice(0, 10) + 'T00:00:00';
  }

  // ── Deterministic cycling helpers ─────────────────────
  function pick(arr, idx) { return arr[idx % arr.length]; }

  function pickClient(idx) { return CLIENTS[idx % CLIENTS.length]; }
  function pickDept(clientKey, idx) {
    var depts = DEPTS.filter(function (d) { return d.clientKey === clientKey; });
    return depts[idx % depts.length];
  }

  function buildPO(idx) {
    return PO_PREFIXES[idx % PO_PREFIXES.length] +
           String(idx + 100).padStart(2, '0') + '-' +
           PO_SUFFIXES[idx % PO_SUFFIXES.length];
  }

  function woNumber(idx) {
    // NR26 prefix, 6-digit sequence starting at 080001
    return 'NR26' + String(80001 + idx).padStart(6, '0');
  }

  // ── Build repair records ───────────────────────────────
  var repairs = [];
  var repairDetails = [];
  var statusHistory = [];

  var repairKey = 8001;
  var tranKey   = 900001;
  var histKey   = 700001;

  // -- Repeat offender repairs first (these populate scopeHistory naturally)
  var offenderRepairIdx = 0;
  REPEAT_OFFENDERS.forEach(function (scope) {
    var client = CLIENTS.filter(function (c) { return c.lClientKey === scope.clientKey; })[0];
    var dept   = DEPTS.filter(function (d) { return d.lDeptKey === scope.deptKey; })[0];

    for (var r = 0; r < scope.count; r++) {
      var slotIdx    = offenderRepairIdx % STATUS_SLOTS.length;
      var status     = STATUS_SLOTS[slotIdx];
      var isClosed   = r < Math.floor(scope.count * 0.6); // older 60% are closed
      var daysIn     = isClosed ? 45 + offenderRepairIdx * 7 : offenderRepairIdx * 2 + 1;
      var levelIdx   = (offenderRepairIdx + r) % LEVELS.length;
      var complaint  = pick(COMPLAINTS, offenderRepairIdx + r);
      var techName   = pick(TECHS, offenderRepairIdx + r);

      var effectiveStatus = isClosed
        ? (r % 2 === 0 ? { id: 7, name: 'Invoiced' } : { id: 99, name: 'Shipped' })
        : STATUS_SLOTS[(offenderRepairIdx + r * 3) % (STATUS_SLOTS.length - 15)]; // open only

      var dtIn  = daysAgo(daysIn);
      var dtOut = isClosed ? daysAgo(daysIn - (3 + r % 8)) : null;

      var repair = {
        lRepairKey:         repairKey,
        lDepartmentKey:     dept.lDeptKey,
        lScopeKey:          200000 + repairKey,
        lClientKey:         client.lClientKey,
        lDeptKey:           dept.lDeptKey,
        lRepairStatusID:    effectiveStatus.id,
        sRepairStatus:      effectiveStatus.name,
        sWorkOrderNumber:   woNumber(repairKey - 8001),
        dtDateIn:           dtIn,
        dtDateOut:          dtOut,
        sSerialNumber:      scope.serial,
        sScopeTypeDesc:     MODEL_DESC[scope.model] || scope.model,
        sRigidOrFlexible:   scope.rf,
        sClientName1:       client.name,
        sShipName1:         client.name,
        sDepartmentName:    dept.name,
        sPurchaseOrder:     buildPO(repairKey - 8001),
        sTechName:          techName,
        sComplaint:         complaint,
        sComplaintDesc:     complaint,
        bFlaggedClient:     client.flagged,
        nRepairLevel:       levelIdx + 1,
        sRepairLevel:       LEVELS[levelIdx],
        lServiceLocationKey: 1,
        _region:            'North',
        _dbKey:             1,
        _woType:            'Repair',
        _site:              'North',
        dblAmtRepair:       [485, 850, 1250, 1875, 2400, 2875, 3200][(repairKey - 8001) % 7],
      };

      repairs.push(repair);

      // -- Line items (2-5 per repair) ──
      var itemCount = 2 + (repairKey % 4);
      for (var t = 0; t < itemCount; t++) {
        var isApproved = (t < 4) && ((t % 5) !== 2); // ~80% approved
        repairDetails.push({
          lRepairItemTranKey: tranKey++,
          lRepairKey:         repairKey,
          lRepairItemKey:     (t + 1) * 10,
          lTechnicianKey:     (offenderRepairIdx % 10) + 30,
          sApproved:          isApproved ? 'Y' : 'N',
          dblRepairPrice:     [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
          nRepairPriceUnitCost: [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
          sItemDescription:   pick(ITEM_DESCS, tranKey - 900001),
          sFinding:           pick(ITEM_FINDINGS, tranKey - 900001 + t),
          lQuantity:          t % 4 === 0 ? 2 : 1,
          sComments:          pick(ITEM_FINDINGS, t + r),
          sRigidOrFlexible:   scope.rf,
          sPartOrLabor:       t % 2 === 0 ? 'L' : 'P',
          sUAorNWT:           'N',
          sFixType:           'N',
          dblTrueValue:       [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
        });
      }

      // -- Status history (3-6 entries per repair) ──
      var histSteps = 3 + (repairKey % 4);
      var histStepStatuses = [
        'Waiting on Inspection',
        'In Repair Process',
        'Waiting for Approval',
        effectiveStatus.name,
      ];
      for (var h = 0; h < histSteps; h++) {
        statusHistory.push({
          lStatusHistKey:  histKey++,
          lRepairKey:      repairKey,
          sRepairStatus:   histStepStatuses[h % histStepStatuses.length],
          sTechName:       pick(TECHS, h + repairKey),
          dtStatusDate:    daysAgo(daysIn - h * 2) + 'T08:' + String((h * 7) % 60).padStart(2, '0') + ':00',
          sNote:           h === 0 ? 'Scope received and logged' : '',
        });
      }

      repairKey++;
      offenderRepairIdx++;
    }
  });

  // -- Non-repeat-offender repairs to fill remaining slots
  // Target: 75 total repairs including offenders
  var nonRepeatCount = 75 - repairs.length;
  var nonRepeatSerialBase = 1000;

  for (var i = 0; i < nonRepeatCount; i++) {
    var client   = pickClient(i);
    var dept     = pickDept(client.lClientKey, i);
    var slot     = STATUS_SLOTS[i % STATUS_SLOTS.length];
    var levelIdx2 = i % LEVELS.length;
    var daysIn2   = slot.closed ? 40 + i * 3 : i + 1;
    var techName2 = pick(TECHS, i);
    var complaint2 = pick(COMPLAINTS, i);

    // Non-repeat serials: format SN-XXXX#### cycling through non-offender letters
    var serialLetters = ['ABD', 'EFG', 'HIJ', 'KLM', 'NOP', 'QRS', 'TUV', 'WXY'];
    var serial = 'SN-' + pick(serialLetters, i) + String(nonRepeatSerialBase + i).padStart(4, '0');

    // Model pool for non-repeat scopes
    var modelPool = [
      { model: 'CF-Q180AL', rf: 'F', desc: 'Video Colonoscope CF-Q180AL' },
      { model: 'GIF-XP190N', rf: 'F', desc: 'Video Gastroscope GIF-XP190N' },
      { model: 'EG-2990Z', rf: 'F', desc: 'Video Gastroscope EG-2990Z' },
      { model: 'EC-3890FK', rf: 'F', desc: 'Video Colonoscope EC-3890FK' },
      { model: 'BF-P190', rf: 'F', desc: 'Video Bronchoscope BF-P190' },
      { model: 'CYSTO-WA', rf: 'R', desc: 'Rigid Cystoscope 30-Degree' },
      { model: 'ARTHRO-STK', rf: 'R', desc: 'Rigid Arthroscope 4.0mm' },
      { model: 'CF-H190L', rf: 'F', desc: 'Video Colonoscope CF-H190L' },
      { model: 'GIF-H290Z', rf: 'F', desc: 'Video Gastroscope GIF-H290Z' },
      { model: 'LAPARO-WA', rf: 'R', desc: 'Rigid Laparoscope 10mm 0-Degree' },
    ];
    var scopeEntry = pick(modelPool, i);

    var dtIn2  = daysAgo(daysIn2);
    var dtOut2 = slot.closed ? daysAgo(daysIn2 - (3 + i % 8)) : null;

    var repair2 = {
      lRepairKey:         repairKey,
      lDepartmentKey:     dept.lDeptKey,
      lScopeKey:          200000 + repairKey,
      lClientKey:         client.lClientKey,
      lDeptKey:           dept.lDeptKey,
      lRepairStatusID:    slot.id,
      sRepairStatus:      slot.name,
      sWorkOrderNumber:   woNumber(repairKey - 8001),
      dtDateIn:           dtIn2,
      dtDateOut:          dtOut2,
      sSerialNumber:      serial,
      sScopeTypeDesc:     scopeEntry.desc,
      sRigidOrFlexible:   scopeEntry.rf,
      sClientName1:       client.name,
      sShipName1:         client.name,
      sDepartmentName:    dept.name,
      sPurchaseOrder:     buildPO(repairKey - 8001),
      sTechName:          techName2,
      sComplaint:         complaint2,
      sComplaintDesc:     complaint2,
      bFlaggedClient:     client.flagged,
      nRepairLevel:       levelIdx2 + 1,
      sRepairLevel:       LEVELS[levelIdx2],
      lServiceLocationKey: 1,
      _region:            'North',
      _dbKey:             1,
      _woType:            'Repair',
      _site:              'North',
      dblAmtRepair:       [485, 650, 850, 1250, 1875, 2400, 2875][(repairKey - 8001) % 7],
    };

    repairs.push(repair2);

    // -- Line items ──
    var itemCount2 = 2 + (i % 5);
    for (var t2 = 0; t2 < itemCount2; t2++) {
      var isApproved2 = (t2 % 5) !== 2;
      repairDetails.push({
        lRepairItemTranKey: tranKey++,
        lRepairKey:         repairKey,
        lRepairItemKey:     (t2 + 1) * 10,
        lTechnicianKey:     (i % 10) + 30,
        sApproved:          isApproved2 ? 'Y' : 'N',
        dblRepairPrice:     [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
        nRepairPriceUnitCost: [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
        sItemDescription:   pick(ITEM_DESCS, tranKey - 900001),
        sFinding:           pick(ITEM_FINDINGS, t2 + i),
        lQuantity:          t2 % 4 === 0 ? 2 : 1,
        sComments:          pick(ITEM_FINDINGS, t2),
        sRigidOrFlexible:   scopeEntry.rf,
        sPartOrLabor:       t2 % 2 === 0 ? 'L' : 'P',
        sUAorNWT:           'N',
        sFixType:           'N',
        dblTrueValue:       [150, 312, 601, 850, 1100, 1450, 2100][(tranKey - 900001) % 7],
      });
    }

    // -- Status history ──
    var histSteps2 = 2 + (i % 5);
    for (var h2 = 0; h2 < histSteps2; h2++) {
      var histStatusName = h2 === 0 ? 'Waiting on Inspection'
                        : h2 === 1 ? 'In Repair Process'
                        : slot.name;
      statusHistory.push({
        lStatusHistKey: histKey++,
        lRepairKey:     repairKey,
        sRepairStatus:  histStatusName,
        sTechName:      pick(TECHS, h2 + i),
        dtStatusDate:   daysAgo(daysIn2 - h2 * 2) + 'T09:' + String((h2 * 11) % 60).padStart(2, '0') + ':00',
        sNote:          h2 === 0 ? 'Received at intake' : '',
      });
    }

    repairKey++;
  }

  // ── Expose as window.REPAIRS_MOCK ─────────────────────
  // Provides the full dataset for any page that wants direct access.
  window.REPAIRS_MOCK = {
    repairs:       repairs,
    repairDetails: repairDetails,
    statusHistory: statusHistory,
  };

  // ── Seed into MockDB if available ─────────────────────
  // MockDB.seed() is append-safe — it does not overwrite existing records.
  if (typeof MockDB !== 'undefined' && MockDB.seed) {
    MockDB.seed('repairs',       repairs);
    MockDB.seed('repairDetails', repairDetails);
    // statusHistory maps to statusTrans table
    MockDB.seed('statusTrans',   statusHistory.map(function (h) {
      return {
        lStatusTranKey: h.lStatusHistKey,
        lRepairKey:     h.lRepairKey,
        sRepairStatus:  h.sRepairStatus,
        sTechName:      h.sTechName,
        dtStatusDate:   h.dtStatusDate,
        sNote:          h.sNote || '',
      };
    }));
    console.log('[TSI] repairs-mock-supplement: seeded',
      repairs.length, 'repairs,',
      repairDetails.length, 'repair detail lines,',
      statusHistory.length, 'status history entries');
  } else {
    console.warn('[TSI] repairs-mock-supplement: MockDB not available — window.REPAIRS_MOCK set but not seeded');
  }

})();
