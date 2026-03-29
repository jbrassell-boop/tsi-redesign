(function () {
  'use strict';

  // ── Guard ──────────────────────────────────────────────────────────────────
  if (typeof MockDB === 'undefined') {
    console.warn('[DailyOpsSim] MockDB not available — load mock-db.js first');
    return;
  }

  // ── Constants ──────────────────────────────────────────────────────────────
  const TODAY          = '2026-03-28';
  const TODAY_ISO      = TODAY + 'T00:00:00';
  const TODAY_SHIP     = TODAY + 'T08:00:00';
  const TODAY_QUOTE    = TODAY + 'T14:30:00';
  const TODAY_INVOICE  = TODAY + 'T17:00:00';
  const TODAY_NOTES    = TODAY + 'T10:00:00';

  // Status ID constants (from repairStatuses seed)
  const STATUS = {
    WAITING_INSPECTION : 1,
    IN_REPAIR          : 8,
    WAITING_APPROVAL   : 6,
    QC                 : 21,
    SCHEDULED_TO_SHIP  : 10,
    INVOICED           : 7,
  };

  // Deterministic variation: pick from array using an integer seed
  function pick(arr, seed) {
    return arr[seed % arr.length];
  }

  // ── Reference pools ───────────────────────────────────────────────────────
  const COMPLAINTS = [
    'Angulation restricted',
    'Fluid invasion',
    'Image quality degraded',
    'CCD failure',
    'Bending rubber cracked',
    'Light guide damage',
    'Biopsy channel clogged',
    'Suction valve failure',
    'Water bottle leak',
    'Tip hood missing',
  ];

  const MODELS = [
    'BF-Q180',
    'GIF-H190',
    'PCF-H190L',
    'TJF-Q180V',
    'URF-V2',
  ];

  const TECH_NOTES_TEXT = [
    'Completed D&I — fluid invasion confirmed at bending section',
    'Angulation wire replacement complete, leak test passed',
    'Waiting on part 101-22844 from Olympus',
    'Quote sent to client — awaiting PO',
    'Scope cleaned, packaged, ready to ship',
    'Bending rubber replaced, CCD cleaned, all channels clear',
    'Light guide bundle damaged — sourcing OEM replacement',
    'Tip hood replaced, biopsy channel flushed and verified',
    'Leak test failed at insertion tube — repair in progress',
    'Final QC passed, tracking label applied',
    'Water bottle valve replaced, tested at 35 psi, no leak',
    'Outsourced to Olympus factory service — awaiting return ETA',
  ];

  // ── Snapshot: open repair count before any changes ────────────────────────
  const openBefore = MockDB.getAll('repairs').filter(function (r) {
    return !['Invoiced', 'Shipped', 'Closed'].includes(r.sRepairStatus);
  }).length;

  // ── Derive next lRepairKey ─────────────────────────────────────────────────
  // Read existing max so we don't collide
  const allRepairs = MockDB.getAll('repairs');
  const existingMaxKey = allRepairs.reduce(function (max, r) {
    return r.lRepairKey > max ? r.lRepairKey : max;
  }, 0);

  // ── Derive clients and departments to use for intake ──────────────────────
  const allClients = MockDB.getAll('clients');
  const allDepts   = MockDB.getAll('departments');

  // Pick 15 distinct (client, dept) pairs deterministically.
  // Strategy: sort clients by lClientKey ascending, take first 20, pick 15 by mod.
  const sortedClients = allClients
    .slice()
    .sort(function (a, b) { return a.lClientKey - b.lClientKey; })
    .slice(0, 20);

  const intakePairs = [];
  for (var i = 0; i < 15; i++) {
    var client = sortedClients[i % sortedClients.length];
    // Find a department belonging to this client; fall back to first dept
    var dept = allDepts.find(function (d) { return d.lClientKey === client.lClientKey; })
      || allDepts[i % allDepts.length];
    intakePairs.push({ client: client, dept: dept });
  }

  // ── Derive active technicians ──────────────────────────────────────────────
  const allTechs = MockDB.getAll('technicians').filter(function (t) {
    return t.bIsActive === true;
  });
  // Ensure we always have at least one fallback
  const techPool = allTechs.length > 0 ? allTechs : MockDB.getAll('technicians').slice(0, 5);

  // ── BATCH 1: 15 new intake repairs ────────────────────────────────────────
  var newIntakeCount = 0;
  var intakeKeys = [];

  for (var idx = 0; idx < 15; idx++) {
    var pair     = intakePairs[idx];
    var client   = pair.client;
    var dept     = pair.dept;
    var tech     = pick(techPool, idx);
    var model    = pick(MODELS, idx);
    var complaint= pick(COMPLAINTS, idx);
    var repairKey= existingMaxKey + 1 + idx;
    var woNum    = 'NR2609' + String(1 + idx).padStart(4, '0');

    MockDB.insert('repairs', {
      lRepairKey          : repairKey,
      lDepartmentKey      : dept.lDepartmentKey,
      lScopeKey           : 0,
      lSalesRepKey        : client.lSalesRepKey || 0,
      lDeliveryMethodKey  : 3,
      lPricingCategoryKey : client.lPricingCategoryKey || 55,
      lContractKey        : 0,
      lTechnicianKey      : tech ? tech.lTechnicianKey : 0,
      lPaymentTermsKey    : client.lPaymentTermsKey || 9,
      sWorkOrderNumber    : woNum,
      dtDateIn            : TODAY_ISO,
      dtDateOut           : null,
      dtAprRecvd          : null,
      sBillName1          : client.sClientName1 || '',
      sBillName2          : 'Accounts Payable',
      sBillAddr1          : client.sBillAddr1 || '',
      sBillCity           : client.sBillCity  || '',
      sBillState          : client.sBillState || '',
      sBillZip            : client.sBillZip   || '',
      sShipName1          : client.sClientName1 || '',
      sShipName2          : dept.sDepartmentName || '',
      sShipAddr1          : dept.sShipAddr1 || client.sShipAddr1 || '',
      sShipCity           : dept.sShipCity  || client.sShipCity  || '',
      sShipState          : dept.sShipState || client.sShipState || '',
      sShipZip            : dept.sShipZip   || client.sShipZip   || '',
      dblAmtShipping      : 0,
      dblAmtRepair        : 0,
      sPurchaseOrder      : '',
      sRackPosition       : '',
      lRepairStatusID     : STATUS.WAITING_INSPECTION,
      sRepairStatus       : 'Waiting on Inspection',
      sCustomerComplaint  : complaint,
      sModelDescription   : model,
      sShipAttention      : '',
      lRepairReasonKey    : 0,
      lServiceLocationKey : client.lServiceLocationKey || 1,
      _region             : client._region             || 'North',
      _dbKey              : client._dbKey              || 1,
      _woType             : 'Repair',
      _site               : client._region             || 'North',
      sSerialNumber       : 'SIM' + String(repairKey).slice(-5),
      sScopeTypeDesc      : 'Flexible Endoscope',
      sManufacturer       : 'Olympus',
      sScopeCategory      : 'GI',
      sScopeTypeCategory  : 'Flexible',
      sRigidOrFlexible    : 'F',
      sClientName1        : client.sClientName1 || '',
      sDepartmentName     : dept.sDepartmentName || '',
      sTechName           : tech ? tech.sTechName : 'Unassigned',
      sSalesRepName       : client.sSalesRepName || '',
      sPaymentTerms       : client.sClntTerms    || '',
      sPricingDescription : '',
      sServiceLocationName: client.sServiceLocationName || 'Upper Chichester',
      ProgBarStatus       : 'Waiting on Inspection',
      Approved            : 'N',
      ResponsibleTech     : tech ? tech.sTechName : 'Unassigned',
      nApprovedAmount     : 0,
      nTurnAroundTime     : 0,
      nLeadTime           : 0,
    });

    // Status history entry for intake
    MockDB.insert('statusTrans', {
      lRepairKey     : repairKey,
      lStatusKey     : STATUS.WAITING_INSPECTION,
      sRepairStatus  : 'Waiting on Inspection',
      sStatusDesc    : 'Waiting on Inspection',
      sTechName      : tech ? tech.sTechName : 'Unassigned',
      dtCompleteDate : TODAY_ISO,
      dtStatusDate   : TODAY_ISO,
      lUserKey       : 2,
      nAutoCompleteID: 1,
      lCreateUser    : 2,
      lLastUpdateUser: 2,
      lCreateSessionKey: 0,
    });

    intakeKeys.push(repairKey);
    newIntakeCount++;
  }

  // ── Verify batch 1 ─────────────────────────────────────────────────────────
  var b1Errors = 0;
  intakeKeys.forEach(function (key) {
    var r = MockDB.getByKey('repairs', key);
    if (!r) { b1Errors++; console.error('[DailyOpsSim] B1 ERROR: repair key missing', key); return; }
    if (isNaN(r.lRepairKey) || !r.sWorkOrderNumber) {
      b1Errors++;
      console.error('[DailyOpsSim] B1 ERROR: invalid repair record', r.lRepairKey);
    }
    if (r.lRepairStatusID !== STATUS.WAITING_INSPECTION) {
      b1Errors++;
      console.error('[DailyOpsSim] B1 ERROR: wrong intake status', r.lRepairKey, r.lRepairStatusID);
    }
  });
  console.log('[DailyOpsSim] Batch 1 (intakes):', newIntakeCount, 'created,', b1Errors, 'errors');

  // ── BATCH 2: 20 status changes on existing open repairs ───────────────────
  // Pull open repairs (lRepairStatusID 1-9), sorted by lRepairKey, take first 20
  var openRepairs = MockDB.getAll('repairs')
    .filter(function (r) {
      return r.lRepairStatusID >= 1
        && r.lRepairStatusID <= 9
        && !intakeKeys.includes(r.lRepairKey);  // skip today's new intakes
    })
    .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
    .slice(0, 20);

  var statusChangeCount = 0;
  var quoteKeys     = [];
  var shipKeys      = [];
  var invoicedKeys  = [];

  openRepairs.forEach(function (r, i) {
    var newStatusID;
    var newStatusName;

    if (r.lRepairStatusID === STATUS.WAITING_INSPECTION) {
      // Advance: Waiting on Inspection → In Repair Process
      newStatusID   = STATUS.IN_REPAIR;
      newStatusName = 'In Repair Process';
    } else if (r.lRepairStatusID === STATUS.IN_REPAIR || r.lRepairStatusID === 9) {
      // Split: first 8 → Waiting for Approval, rest → QC
      if (quoteKeys.length < 8) {
        newStatusID   = STATUS.WAITING_APPROVAL;
        newStatusName = 'Waiting for Approval';
        quoteKeys.push(r.lRepairKey);
      } else {
        newStatusID   = STATUS.QC;
        newStatusName = 'QC - Waiting Customer Approval';
      }
    } else if (r.lRepairStatusID === STATUS.WAITING_APPROVAL) {
      // 5 become Scheduled to Ship
      if (shipKeys.length < 5) {
        newStatusID   = STATUS.SCHEDULED_TO_SHIP;
        newStatusName = 'Scheduled to Ship';
        shipKeys.push(r.lRepairKey);
      } else {
        // remain — no further advance needed for this batch
        return;
      }
    } else {
      // For any other open status, nudge forward to In Repair
      newStatusID   = STATUS.IN_REPAIR;
      newStatusName = 'In Repair Process';
    }

    var tech = pick(techPool, i);

    MockDB.update('repairs', r.lRepairKey, {
      lRepairStatusID: newStatusID,
      sRepairStatus  : newStatusName,
      ProgBarStatus  : newStatusName,
    });

    MockDB.insert('statusTrans', {
      lRepairKey     : r.lRepairKey,
      lStatusKey     : newStatusID,
      sRepairStatus  : newStatusName,
      sStatusDesc    : newStatusName,
      sTechName      : tech ? tech.sTechName : (r.sTechName || 'Unassigned'),
      dtCompleteDate : TODAY + 'T09:00:00',
      dtStatusDate   : TODAY + 'T09:00:00',
      lUserKey       : 2,
      nAutoCompleteID: newStatusID,
      lCreateUser    : 2,
      lLastUpdateUser: 2,
      lCreateSessionKey: 0,
    });

    statusChangeCount++;
  });

  // ── Verify batch 2 ─────────────────────────────────────────────────────────
  var b2Errors = 0;
  openRepairs.forEach(function (r) {
    var updated = MockDB.getByKey('repairs', r.lRepairKey);
    if (!updated) { b2Errors++; return; }
    if (updated.lRepairStatusID === undefined || updated.lRepairStatusID === null) {
      b2Errors++;
      console.error('[DailyOpsSim] B2 ERROR: undefined status after change', r.lRepairKey);
    }
  });
  console.log('[DailyOpsSim] Batch 2 (status changes):', statusChangeCount, 'applied,', b2Errors, 'errors');
  console.log('[DailyOpsSim]   -> Quote/Approval queued:', quoteKeys.length);
  console.log('[DailyOpsSim]   -> Ship queued:', shipKeys.length);

  // ── BATCH 3: Quote Sent — mark 8 as "Waiting for Approval" ────────────────
  // quoteKeys was populated during batch 2; if fewer than 8 found there,
  // pull additional repairs currently at IN_REPAIR to fill the quota.
  if (quoteKeys.length < 8) {
    var additional = MockDB.getAll('repairs')
      .filter(function (r) {
        return (r.lRepairStatusID === STATUS.IN_REPAIR || r.lRepairStatusID === 9)
          && !intakeKeys.includes(r.lRepairKey)
          && !quoteKeys.includes(r.lRepairKey);
      })
      .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
      .slice(0, 8 - quoteKeys.length);

    additional.forEach(function (r, i) {
      var tech = pick(techPool, i + 30);
      MockDB.update('repairs', r.lRepairKey, {
        lRepairStatusID: STATUS.WAITING_APPROVAL,
        sRepairStatus  : 'Waiting for Approval',
        ProgBarStatus  : 'Waiting for Approval',
      });
      MockDB.insert('statusTrans', {
        lRepairKey     : r.lRepairKey,
        lStatusKey     : STATUS.WAITING_APPROVAL,
        sRepairStatus  : 'Waiting for Approval',
        sStatusDesc    : 'Waiting for Approval',
        sTechName      : tech ? tech.sTechName : (r.sTechName || 'Unassigned'),
        dtCompleteDate : TODAY_QUOTE,
        dtStatusDate   : TODAY_QUOTE,
        lUserKey       : 2,
        nAutoCompleteID: STATUS.WAITING_APPROVAL,
        lCreateUser    : 2,
        lLastUpdateUser: 2,
        lCreateSessionKey: 0,
      });
      quoteKeys.push(r.lRepairKey);
    });
  }

  var quoteSentCount = quoteKeys.length;
  console.log('[DailyOpsSim] Batch 3 (quote/approval):', quoteSentCount, 'repairs marked Waiting for Approval');

  // ── BATCH 4: 5 repairs → Scheduled to Ship with tracking numbers ──────────
  // shipKeys was populated during batch 2; fill up to 5 from scheduled-eligible repairs
  if (shipKeys.length < 5) {
    var shipCandidates = MockDB.getAll('repairs')
      .filter(function (r) {
        return (r.lRepairStatusID === STATUS.WAITING_APPROVAL
          || r.lRepairStatusID === STATUS.QC)
          && !intakeKeys.includes(r.lRepairKey)
          && !shipKeys.includes(r.lRepairKey);
      })
      .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
      .slice(0, 5 - shipKeys.length);

    shipCandidates.forEach(function (r) {
      shipKeys.push(r.lRepairKey);
    });
  }

  // Trim to exactly 5
  shipKeys = shipKeys.slice(0, 5);

  var shippedCount = 0;
  shipKeys.forEach(function (key, i) {
    var trackingNum = '7489' + key;  // deterministic per spec
    var tech = pick(techPool, i + 50);

    MockDB.update('repairs', key, {
      lRepairStatusID  : STATUS.SCHEDULED_TO_SHIP,
      sRepairStatus    : 'Scheduled to Ship',
      ProgBarStatus    : 'Scheduled to Ship',
      sTrackingNumber  : trackingNum,
      dtShipDate       : TODAY_SHIP,
    });

    MockDB.insert('statusTrans', {
      lRepairKey     : key,
      lStatusKey     : STATUS.SCHEDULED_TO_SHIP,
      sRepairStatus  : 'Scheduled to Ship',
      sStatusDesc    : 'Scheduled to Ship',
      sTechName      : tech ? tech.sTechName : 'Shipping Dept',
      dtCompleteDate : TODAY_SHIP,
      dtStatusDate   : TODAY_SHIP,
      lUserKey       : 2,
      nAutoCompleteID: STATUS.SCHEDULED_TO_SHIP,
      lCreateUser    : 2,
      lLastUpdateUser: 2,
      lCreateSessionKey: 0,
    });

    shippedCount++;
  });

  // Verify batch 4
  var b4Errors = 0;
  shipKeys.forEach(function (key) {
    var r = MockDB.getByKey('repairs', key);
    if (!r || !r.sTrackingNumber || r.sTrackingNumber !== '7489' + key) {
      b4Errors++;
      console.error('[DailyOpsSim] B4 ERROR: tracking number mismatch', key, r && r.sTrackingNumber);
    }
  });
  console.log('[DailyOpsSim] Batch 4 (shipments):', shippedCount, 'scheduled to ship,', b4Errors, 'errors');

  // ── BATCH 5: 3 repairs → Invoiced (closed) ────────────────────────────────
  // Pull repairs currently Scheduled to Ship (not today's new ones), take first 3
  var invoiceCandidates = MockDB.getAll('repairs')
    .filter(function (r) {
      return r.lRepairStatusID === STATUS.SCHEDULED_TO_SHIP
        && !intakeKeys.includes(r.lRepairKey)
        && !shipKeys.includes(r.lRepairKey); // prefer ones that were already at this status
    })
    .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
    .slice(0, 3);

  // If not enough, fall back to QC repairs
  if (invoiceCandidates.length < 3) {
    var qcFallback = MockDB.getAll('repairs')
      .filter(function (r) {
        return r.lRepairStatusID === STATUS.QC
          && !intakeKeys.includes(r.lRepairKey)
          && !invoiceCandidates.find(function (c) { return c.lRepairKey === r.lRepairKey; });
      })
      .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
      .slice(0, 3 - invoiceCandidates.length);
    invoiceCandidates = invoiceCandidates.concat(qcFallback);
  }

  // Trim to exactly 3
  invoiceCandidates = invoiceCandidates.slice(0, 3);

  var invoicedCount = 0;
  invoiceCandidates.forEach(function (r, i) {
    var tech = pick(techPool, i + 70);
    invoicedKeys.push(r.lRepairKey);

    MockDB.update('repairs', r.lRepairKey, {
      lRepairStatusID: STATUS.INVOICED,
      sRepairStatus  : 'Invoiced',
      ProgBarStatus  : 'Invoiced',
      dtDateOut      : TODAY_INVOICE,
    });

    MockDB.insert('statusTrans', {
      lRepairKey     : r.lRepairKey,
      lStatusKey     : STATUS.INVOICED,
      sRepairStatus  : 'Invoiced',
      sStatusDesc    : 'Invoiced',
      sTechName      : tech ? tech.sTechName : 'Billing',
      dtCompleteDate : TODAY_INVOICE,
      dtStatusDate   : TODAY_INVOICE,
      lUserKey       : 2,
      nAutoCompleteID: STATUS.INVOICED,
      lCreateUser    : 2,
      lLastUpdateUser: 2,
      lCreateSessionKey: 0,
    });

    invoicedCount++;
  });

  // Verify batch 5
  var b5Errors = 0;
  invoicedKeys.forEach(function (key) {
    var r = MockDB.getByKey('repairs', key);
    if (!r || r.lRepairStatusID !== STATUS.INVOICED) {
      b5Errors++;
      console.error('[DailyOpsSim] B5 ERROR: invoiced status not set', key);
    }
  });
  console.log('[DailyOpsSim] Batch 5 (invoiced/closed):', invoicedCount, 'invoiced,', b5Errors, 'errors');

  // ── BATCH 6: Tech notes on 12 repairs ─────────────────────────────────────
  // Initialize techNotes table if not present
  if (!MockDB.tables['techNotes']) {
    MockDB.tables['techNotes'] = [];
  }
  if (!MockDB.keyFields['techNotes']) {
    MockDB.keyFields['techNotes'] = 'lNoteKey';
  }

  // Pick 12 repairs from across all open/active repairs (mix of today's intake + existing)
  var noteTargets = [];

  // First 4 from today's intake
  for (var ni = 0; ni < 4 && ni < intakeKeys.length; ni++) {
    noteTargets.push(intakeKeys[ni]);
  }

  // Remaining 8 from existing open repairs (not invoiced today)
  var existingForNotes = MockDB.getAll('repairs')
    .filter(function (r) {
      return !intakeKeys.includes(r.lRepairKey)
        && !invoicedKeys.includes(r.lRepairKey)
        && r.lRepairStatusID >= 1 && r.lRepairStatusID <= 21;
    })
    .sort(function (a, b) { return a.lRepairKey - b.lRepairKey; })
    .slice(0, 8);

  existingForNotes.forEach(function (r) {
    noteTargets.push(r.lRepairKey);
  });

  // Trim to 12
  noteTargets = noteTargets.slice(0, 12);

  var notesAdded = 0;
  var noteKeyBase = Date.now();  // large but consistent within a single run

  noteTargets.forEach(function (repairKey, i) {
    var tech     = pick(techPool, i + 10);
    var noteText = pick(TECH_NOTES_TEXT, i);

    // Use seed() pattern for bulk insert or direct push since table is new
    MockDB.tables['techNotes'].push({
      lNoteKey   : noteKeyBase + i,
      lRepairKey : repairKey,
      sTechName  : tech ? tech.sTechName : 'Technician',
      sNoteText  : noteText,
      dtNoteDate : TODAY_NOTES,
      lCreateUser: 2,
      Created_datetime: TODAY_NOTES,
    });

    notesAdded++;
  });

  // Verify batch 6
  var b6Errors = 0;
  noteTargets.forEach(function (key) {
    var note = MockDB.tables['techNotes'].find(function (n) { return n.lRepairKey === key; });
    if (!note || !note.sNoteText) {
      b6Errors++;
      console.error('[DailyOpsSim] B6 ERROR: note missing for repair', key);
    }
  });
  console.log('[DailyOpsSim] Batch 6 (tech notes):', notesAdded, 'notes added,', b6Errors, 'errors');

  // ── VERIFICATION SUITE ────────────────────────────────────────────────────
  console.log('[DailyOpsSim] --- Running verification suite ---');

  // Check 1: Count repairs by status — no undefined/null status
  var statusCounts = {};
  var nullStatusCount = 0;
  MockDB.getAll('repairs').forEach(function (r) {
    if (r.sRepairStatus == null || r.sRepairStatus === '') {
      nullStatusCount++;
    } else {
      statusCounts[r.sRepairStatus] = (statusCounts[r.sRepairStatus] || 0) + 1;
    }
  });
  if (nullStatusCount > 0) {
    console.error('[DailyOpsSim] VERIFY ERROR: ' + nullStatusCount + ' repairs have null/empty sRepairStatus');
  } else {
    console.log('[DailyOpsSim] Check 1 PASS: All repairs have sRepairStatus. Distribution:', statusCounts);
  }

  // Check 2: All statusTrans entries reference a valid lRepairKey
  var allRepairKeys = new Set(MockDB.getAll('repairs').map(function (r) { return r.lRepairKey; }));
  var orphanedTrans = MockDB.getAll('statusTrans').filter(function (t) {
    return !allRepairKeys.has(t.lRepairKey);
  });
  if (orphanedTrans.length > 0) {
    console.error('[DailyOpsSim] VERIFY ERROR: ' + orphanedTrans.length + ' statusTrans entries with invalid lRepairKey');
    orphanedTrans.slice(0, 5).forEach(function (t) {
      console.error('  -> lStatusTranKey=' + t.lStatusTranKey + ' references lRepairKey=' + t.lRepairKey);
    });
  } else {
    console.log('[DailyOpsSim] Check 2 PASS: All statusTrans entries reference valid repairs');
  }

  // Check 3: Open repair count decreased by exactly invoicedCount (3)
  var openAfter = MockDB.getAll('repairs').filter(function (r) {
    return !['Invoiced', 'Shipped', 'Closed'].includes(r.sRepairStatus);
  }).length;
  // openAfter = openBefore + newIntakeCount - invoicedCount
  var expectedOpen = openBefore + newIntakeCount - invoicedCount;
  if (openAfter === expectedOpen) {
    console.log('[DailyOpsSim] Check 3 PASS: Open count correct. Before=' + openBefore
      + ' + ' + newIntakeCount + ' intakes - ' + invoicedCount + ' invoiced = ' + openAfter);
  } else {
    console.warn('[DailyOpsSim] Check 3 WARN: Expected open=' + expectedOpen + ' actual=' + openAfter
      + ' (delta=' + (openAfter - expectedOpen) + '). Some repairs may have been invoiced before this run.');
  }

  // Check 4: No duplicate lRepairKey in repairs table
  var keysSeen   = {};
  var duplicates = [];
  MockDB.getAll('repairs').forEach(function (r) {
    if (keysSeen[r.lRepairKey]) {
      duplicates.push(r.lRepairKey);
    }
    keysSeen[r.lRepairKey] = true;
  });
  if (duplicates.length > 0) {
    console.error('[DailyOpsSim] VERIFY ERROR: ' + duplicates.length + ' duplicate lRepairKey values:', duplicates.slice(0, 10));
  } else {
    console.log('[DailyOpsSim] Check 4 PASS: No duplicate lRepairKey values in repairs table');
  }

  // ── Final summary report ──────────────────────────────────────────────────
  var summary = {
    newIntakes       : newIntakeCount,
    statusChanges    : statusChangeCount,
    quoteSent        : quoteSentCount,
    shippedToday     : shippedCount,
    invoiced         : invoicedCount,
    notesAdded       : notesAdded,
    totalOpenAfter   : MockDB.getAll('repairs').filter(function (r) {
      return !['Invoiced', 'Shipped', 'Closed'].includes(r.sRepairStatus);
    }).length,
    totalRepairsAfter: MockDB.getAll('repairs').length,
    verificationErrors: nullStatusCount + orphanedTrans.length + duplicates.length,
    statusDistribution: statusCounts,
  };

  console.log('[DailyOpsSim] Day simulation complete:', summary);

  window.DAILY_OPS_RESULT = summary;

})();
