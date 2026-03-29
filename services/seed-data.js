// ═══════════════════════════════════════════════════════
//  TSI Seed Data — Deterministic interconnected dataset
//
//  Generates consistent test data with valid FK chains:
//    Clients → Departments → Scopes → Repairs → Details
//    Clients → Contracts → Coverage
//    Clients → ProductSales → Items
//    Inventory → Suppliers
//
//  Key design rules:
//  - All FKs reference real records
//  - North (svcLocation=1) and South (svcLocation=2) reps
//  - WO prefix: NR = North repair, SR = South repair
//  - lClientKey starts at 9000 to avoid collision with
//    real extracted data (which uses low integer keys)
// ═══════════════════════════════════════════════════════

const SeedData = (() => {
  'use strict';

  // ── Key ranges (offset from real data) ────────────────
  const BASE = {
    client:      9000,
    dept:        9000,
    scope:       90000,
    repair:      900000,
    repairDetail:9000000,
    contract:    9000,
    productSale: 9000,
    productSaleItem: 90000,
    inventory:   9000,
    contact:     9000,
    invoice:     9000,
  };

  // ── Reference data ─────────────────────────────────────
  const SALES_REPS = [
    { lSalesRepKey: 80,  sSalesRepName: 'Bernie DeLacy' },
    { lSalesRepKey: 237, sSalesRepName: 'Rachel Martinez' },
  ];

  const TECHNICIANS = [
    { lTechnicianKey: 1, sTechName: 'Mike Rossi' },
    { lTechnicianKey: 2, sTechName: 'Dana Powell' },
    { lTechnicianKey: 3, sTechName: 'Chris Tan' },
    { lTechnicianKey: 4, sTechName: 'Jordan Webb' },
  ];

  const SERVICE_LOCATIONS = [
    { lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', _region: 'North' },
    { lServiceLocationKey: 2, sServiceLocationName: 'Nashville',         _region: 'South' },
  ];

  const PRICING_CATEGORIES = [
    { lPricingCategoryKey: 55, sPricingCategory: 'VSC Airway' },
    { lPricingCategoryKey: 60, sPricingCategory: 'Standard Flexible' },
    { lPricingCategoryKey: 65, sPricingCategory: 'Standard Rigid' },
    { lPricingCategoryKey: 70, sPricingCategory: 'Contracted' },
  ];

  const PAYMENT_TERMS = [
    { lPaymentTermsKey: 1, sPaymentTerms: 'Net 30 Days' },
    { lPaymentTermsKey: 2, sPaymentTerms: 'Net 45 Days' },
    { lPaymentTermsKey: 3, sPaymentTerms: 'Net 60 Days' },
  ];

  const CONTRACT_TYPES = [
    { lContractTypeKey: 1, sContractType: 'Capitated' },
    { lContractTypeKey: 2, sContractType: 'Shared Risk' },
    { lContractTypeKey: 3, sContractType: 'PSA' },
    { lContractTypeKey: 4, sContractType: 'Fuse' },
    { lContractTypeKey: 5, sContractType: 'Airway' },
    { lContractTypeKey: 6, sContractType: 'Rental' },
  ];

  const REPAIR_STATUSES = [
    { lRepairStatusID: 1,  sStatus: 'Received' },
    { lRepairStatusID: 2,  sStatus: 'D&I' },
    { lRepairStatusID: 3,  sStatus: '40-Day' },
    { lRepairStatusID: 4,  sStatus: 'In Repair' },
    { lRepairStatusID: 5,  sStatus: 'QC' },
    { lRepairStatusID: 6,  sStatus: 'Pending Ship' },
    { lRepairStatusID: 7,  sStatus: 'Shipped' },
    { lRepairStatusID: 8,  sStatus: 'Completed' },
    { lRepairStatusID: 9,  sStatus: 'On Hold' },
    { lRepairStatusID: 10, sStatus: 'Cancelled' },
  ];

  const REPAIR_ITEMS_CATALOG = [
    { lRepairItemKey: 1, sRepairItemDesc: 'Optical Repair',             sRepairItemCode: 'OPT-001', nPrice: 850.00,  sRigidOrFlexible: 'F' },
    { lRepairItemKey: 2, sRepairItemDesc: 'Bending Section Replacement', sRepairItemCode: 'BSR-001', nPrice: 1200.00, sRigidOrFlexible: 'F' },
    { lRepairItemKey: 3, sRepairItemDesc: 'Working Channel Repair',      sRepairItemCode: 'WCR-001', nPrice: 650.00,  sRigidOrFlexible: 'F' },
    { lRepairItemKey: 4, sRepairItemDesc: 'Light Guide Bundle',          sRepairItemCode: 'LGB-001', nPrice: 320.00,  sRigidOrFlexible: 'F' },
    { lRepairItemKey: 5, sRepairItemDesc: 'CCD Camera Replacement',      sRepairItemCode: 'CCD-001', nPrice: 2400.00, sRigidOrFlexible: 'C' },
    { lRepairItemKey: 6, sRepairItemDesc: 'Rod Lens Assembly',           sRepairItemCode: 'RLA-001', nPrice: 480.00,  sRigidOrFlexible: 'R' },
    { lRepairItemKey: 7, sRepairItemDesc: 'Sheath Repair',               sRepairItemCode: 'SHR-001', nPrice: 290.00,  sRigidOrFlexible: 'R' },
    { lRepairItemKey: 8, sRepairItemDesc: 'D&I Only',                    sRepairItemCode: 'DI-001',  nPrice: 95.00,   sRigidOrFlexible: 'F' },
    { lRepairItemKey: 9, sRepairItemDesc: 'Full Overhaul',               sRepairItemCode: 'FOH-001', nPrice: 1850.00, sRigidOrFlexible: 'F' },
  ];

  // ── Suppliers ──────────────────────────────────────────
  const SUPPLIERS = [
    { lSupplierKey: BASE.inventory + 1, sSupplierName: 'Olympus America Inc.', sSupplierCity: 'Center Valley', sSupplierState: 'PA', bActive: true },
    { lSupplierKey: BASE.inventory + 2, sSupplierName: 'Pentax Medical',       sSupplierCity: 'Montvale',      sSupplierState: 'NJ', bActive: true },
    { lSupplierKey: BASE.inventory + 3, sSupplierName: 'Fujifilm Medical',     sSupplierCity: 'Wayne',         sSupplierState: 'NJ', bActive: true },
  ];

  // ── Inventory items ────────────────────────────────────
  const INVENTORY = [
    { lInventoryKey: BASE.inventory + 1, lSupplierKey: BASE.inventory + 1, sDescription: 'Bending Rubber – OEF Series',   sItemCode: 'A5040-01',  nQtyOnHand: 12, nReorderPoint: 4, nUnitCost: 180.00, nSellPrice: 320.00, bActive: true, sRigidOrFlexible: 'F' },
    { lInventoryKey: BASE.inventory + 2, lSupplierKey: BASE.inventory + 1, sDescription: 'Angulation Wire Set',           sItemCode: 'A5040-02',  nQtyOnHand: 8,  nReorderPoint: 3, nUnitCost: 95.00,  nSellPrice: 180.00, bActive: true, sRigidOrFlexible: 'F' },
    { lInventoryKey: BASE.inventory + 3, lSupplierKey: BASE.inventory + 2, sDescription: 'Working Channel Tube 2.8mm',    sItemCode: 'A5071-01',  nQtyOnHand: 5,  nReorderPoint: 2, nUnitCost: 210.00, nSellPrice: 390.00, bActive: true, sRigidOrFlexible: 'F' },
    { lInventoryKey: BASE.inventory + 4, lSupplierKey: BASE.inventory + 1, sDescription: 'CCD Image Sensor OEF-V2',       sItemCode: 'A6200-01',  nQtyOnHand: 2,  nReorderPoint: 1, nUnitCost: 1200.00,nSellPrice: 2400.00,bActive: true, sRigidOrFlexible: 'C' },
    { lInventoryKey: BASE.inventory + 5, lSupplierKey: BASE.inventory + 3, sDescription: 'Light Guide Cable 1.8m',        sItemCode: 'FJ-LG-180', nQtyOnHand: 15, nReorderPoint: 5, nUnitCost: 140.00, nSellPrice: 260.00, bActive: true, sRigidOrFlexible: 'F' },
    { lInventoryKey: BASE.inventory + 6, lSupplierKey: BASE.inventory + 1, sDescription: 'Insertion Tube – GIF-H185',     sItemCode: 'A5800-01',  nQtyOnHand: 3,  nReorderPoint: 1, nUnitCost: 650.00, nSellPrice: 1150.00,bActive: true, sRigidOrFlexible: 'F' },
    { lInventoryKey: BASE.inventory + 7, lSupplierKey: BASE.inventory + 2, sDescription: 'Rod Lens System 5mm',           sItemCode: 'P-RL-5MM',  nQtyOnHand: 0,  nReorderPoint: 2, nUnitCost: 280.00, nSellPrice: 480.00, bActive: true, sRigidOrFlexible: 'R' },
  ];

  // ── Client definitions ────────────────────────────────
  // 6 North + 4 South clients
  const CLIENT_DEFS = [
    // North (svcLocation = 1, _dbKey = 1)
    { idx: 0, name: 'Jefferson University Hospital',    city: 'Philadelphia',  state: 'PA', zip: '19107', svcKey: 1, salesRep: 80,  pricingCat: 60, region: 'North', dbKey: 1 },
    { idx: 1, name: 'Penn Presbyterian Medical Center', city: 'Philadelphia',  state: 'PA', zip: '19104', svcKey: 1, salesRep: 80,  pricingCat: 70, region: 'North', dbKey: 1 },
    { idx: 2, name: 'Aria Health – Torresdale Campus',  city: 'Philadelphia',  state: 'PA', zip: '19114', svcKey: 1, salesRep: 80,  pricingCat: 60, region: 'North', dbKey: 1 },
    { idx: 3, name: 'Cooper University Health Care',    city: 'Camden',        state: 'NJ', zip: '08103', svcKey: 1, salesRep: 80,  pricingCat: 65, region: 'North', dbKey: 1 },
    { idx: 4, name: 'Virtua Marlton Hospital',          city: 'Marlton',       state: 'NJ', zip: '08053', svcKey: 1, salesRep: 80,  pricingCat: 60, region: 'North', dbKey: 1 },
    { idx: 5, name: 'Crozer Health System',             city: 'Upland',        state: 'PA', zip: '19013', svcKey: 1, salesRep: 80,  pricingCat: 70, region: 'North', dbKey: 1 },
    // South (svcLocation = 2, _dbKey = 2)
    { idx: 6, name: 'Vanderbilt University Medical Ctr',city: 'Nashville',     state: 'TN', zip: '37232', svcKey: 2, salesRep: 237, pricingCat: 60, region: 'South', dbKey: 2 },
    { idx: 7, name: 'Saint Thomas Midtown Hospital',    city: 'Nashville',     state: 'TN', zip: '37203', svcKey: 2, salesRep: 237, pricingCat: 65, region: 'South', dbKey: 2 },
    { idx: 8, name: 'TriStar Centennial Medical Center',city: 'Nashville',     state: 'TN', zip: '37203', svcKey: 2, salesRep: 237, pricingCat: 70, region: 'South', dbKey: 2 },
    { idx: 9, name: 'Baptist Memorial Hospital',        city: 'Memphis',       state: 'TN', zip: '38120', svcKey: 2, salesRep: 237, pricingCat: 60, region: 'South', dbKey: 2 },
  ];

  // ── Department templates per client ───────────────────
  const DEPT_TEMPLATES = [
    ['GI / Endoscopy',      'Gastroenterology'],
    ['Pulmonology',         'Pulmonary / Bronchoscopy'],
    ['Surgery – OR Suite',  'Operative Rooms'],
    ['ENT',                 'Ear Nose Throat'],
    ['Urology',             'Urology Department'],
  ];

  // ── Scope model pool ───────────────────────────────────
  const SCOPE_MODELS = [
    { model: 'GIF-H185',    mfr: 'Olympus',  type: 'F', desc: 'Video Gastroscope' },
    { model: 'CF-HQ190L',   mfr: 'Olympus',  type: 'F', desc: 'Video Colonoscope' },
    { model: 'BF-1TH180',   mfr: 'Olympus',  type: 'F', desc: 'Video Bronchoscope' },
    { model: 'URF-V2',      mfr: 'Olympus',  type: 'F', desc: 'Flexible Ureteroscope' },
    { model: 'ENF-V2',      mfr: 'Olympus',  type: 'F', desc: 'ENT Video Endoscope' },
    { model: 'EG-29i10',    mfr: 'Pentax',   type: 'F', desc: 'Video Gastroscope' },
    { model: 'EC-3490Li',   mfr: 'Pentax',   type: 'F', desc: 'Video Colonoscope' },
    { model: 'EB-1975K',    mfr: 'Pentax',   type: 'F', desc: 'Video Bronchoscope' },
    { model: '0° Hopkins',  mfr: 'Storz',    type: 'R', desc: 'Rigid Laparoscope' },
    { model: '30° Hopkins', mfr: 'Storz',    type: 'R', desc: 'Rigid Laparoscope' },
    { model: 'H3-Z1',       mfr: 'Stryker',  type: 'C', desc: 'Camera Head' },
    { model: '1288 4K',     mfr: 'Stryker',  type: 'C', desc: 'Camera Head 4K' },
  ];

  // ── Build functions ────────────────────────────────────

  function buildClients() {
    return CLIENT_DEFS.map(def => ({
      lClientKey:           BASE.client + def.idx,
      lSalesRepKey:         def.salesRep,
      lPricingCategoryKey:  def.pricingCat,
      lPaymentTermsKey:     1,
      lCreditLimitKey:      1442,
      lServiceLocationKey:  def.svcKey,
      lDistributorKey:      1,
      sClientName1:         def.name,
      sClientName2:         'Accounts Payable',
      sMailAddr1:           '1 Medical Center Drive',
      sMailCity:            def.city,
      sMailState:           def.state,
      sMailZip:             def.zip,
      sMailCountry:         'USA',
      sBillAddr1:           '1 Medical Center Drive',
      sBillCity:            def.city,
      sBillState:           def.state,
      sBillZip:             def.zip,
      sPhoneVoice:          '(215) 555-' + String(1000 + def.idx).padStart(4, '0'),
      sBillTo:              'Customer',
      sClntTerms:           'Net 30 Days',
      sPricingCategory:     PRICING_CATEGORIES.find(p => p.lPricingCategoryKey === def.pricingCat)?.sPricingCategory || '',
      sSalesRepName:        SALES_REPS.find(r => r.lSalesRepKey === def.salesRep)?.sSalesRepName || '',
      sServiceLocationName: SERVICE_LOCATIONS.find(l => l.lServiceLocationKey === def.svcKey)?.sServiceLocationName || '',
      sPaymentTerms:        'Net 30 Days',
      sDistName1:           'Total Scope, Inc.',
      dtClientSince:        '2010-01-01T00:00:00',
      dtLastUpdate:         '2025-06-15T09:00:00',
      bActive:              true,
      bNationalAccount:     def.idx <= 1,
      bSkipTracking:        false,
      bNeverHold:           false,
      bEmailNewRepairs:     true,
      bRequisitionTotalsOnly: false,
      sBadDebtRisk:         'N',
      sPORequired:          def.idx % 3 === 0 ? 'Y' : 'N',
      nPortalMonths:        24,
      _region:              def.region,
      _dbKey:               def.dbKey,
      Created_datetime:     '2010-01-01T00:00:00',
      Created_UserKey:      2,
    }));
  }

  function buildDepartments(clients) {
    const depts = [];
    let deptKey = BASE.dept;
    clients.forEach(client => {
      const count = 3 + (client.lClientKey % 3); // 3-5 depts
      for (let i = 0; i < count; i++) {
        deptKey++;
        const template = DEPT_TEMPLATES[i % DEPT_TEMPLATES.length];
        depts.push({
          lDepartmentKey:       deptKey,
          lClientKey:           client.lClientKey,
          sDepartmentName:      template[0],
          sDeptAddr1:           '1 Medical Center Drive',
          sDeptCity:            client.sMailCity,
          sDeptState:           client.sMailState,
          sDeptZip:             client.sMailZip,
          sPhoneVoice:          client.sPhoneVoice,
          sContactName:         ['Dr. James Carter', 'Nurse Manager Linda Wu', 'Tech Director Sam Obi'][i % 3],
          sContactEmail:        'dept' + deptKey + '@hospital.test',
          lServiceLocationKey:  client.lServiceLocationKey,
          sServiceLocationName: client.sServiceLocationName,
          sClientName:          client.sClientName1,
          bActive:              true,
          bPortalEnabled:       i === 0,
          bUseClientBillAddr:   true,
          _region:              client._region,
          _dbKey:               client._dbKey,
          Created_datetime:     '2010-01-01T00:00:00',
          Created_UserKey:      2,
        });
      }
    });
    return depts;
  }

  function buildScopes(departments) {
    const scopes = [];
    let scopeKey = BASE.scope;
    departments.forEach(dept => {
      const count = 2 + (dept.lDepartmentKey % 5); // 2-6 scopes
      const models = SCOPE_MODELS.slice(0, count);
      models.forEach((m, idx) => {
        scopeKey++;
        const serial = m.mfr.substring(0, 3).toUpperCase() + '-' + String(9000 + scopeKey).slice(-6);
        scopes.push({
          lScopeKey:        scopeKey,
          lDepartmentKey:   dept.lDepartmentKey,
          lClientKey:       dept.lClientKey,
          lScopeTypeKey:    idx + 1,
          sScopeDesc:       m.desc,
          sSerial:          serial,
          sModel:           m.model,
          sManufacturer:    m.mfr,
          sRigidOrFlexible: m.type,
          sScopeTypeName:   m.desc,
          sDepartmentName:  dept.sDepartmentName,
          sClientName:      dept.sClientName,
          bActive:          true,
          bDead:            false,
          dtLastRepair:     null,
          _region:          dept._region,
          _dbKey:           dept._dbKey,
          Created_datetime: '2015-01-01T00:00:00',
          Created_UserKey:  2,
        });
      });
    });
    return scopes;
  }

  function buildContacts(clients, departments) {
    const contacts = [];
    let contactKey = BASE.contact;

    // One primary client-level contact per client
    clients.forEach(client => {
      contactKey++;
      contacts.push({
        lContactKey:    contactKey,
        lClientKey:     client.lClientKey,
        lDepartmentKey: null,
        sContactName:   'Accounts Payable',
        sContactTitle:  'AP Coordinator',
        sContactEmail:  'ap@' + client.sClientName1.toLowerCase().replace(/[^a-z]/g, '').substring(0, 12) + '.test',
        sContactPhone:  client.sPhoneVoice,
        sContactFax:    '',
        bPrimary:       true,
        bActive:        true,
        Created_datetime: '2015-01-01T00:00:00',
        Created_UserKey: 2,
      });
    });

    // One dept-level contact per department
    departments.forEach(dept => {
      contactKey++;
      contacts.push({
        lContactKey:    contactKey,
        lClientKey:     dept.lClientKey,
        lDepartmentKey: dept.lDepartmentKey,
        sContactName:   dept.sContactName,
        sContactTitle:  'Department Manager',
        sContactEmail:  dept.sContactEmail,
        sContactPhone:  dept.sPhoneVoice,
        sContactFax:    '',
        bPrimary:       false,
        bActive:        true,
        Created_datetime: '2015-01-01T00:00:00',
        Created_UserKey: 2,
      });
    });

    return contacts;
  }

  function buildRepairs(scopes, departments) {
    const repairs = [];
    let repairKey = BASE.repair;
    const statuses = ['Received', 'D&I', 'In Repair', 'QC', 'Shipped', 'Completed', 'On Hold'];
    const complaints = [
      'Blurry image', 'Water leak', 'Angulation locked', 'Working channel blocked',
      'No image', 'Poor illumination', 'Camera malfunction', 'Insertion tube damage',
      'Bending section stiff', 'Scope will not pass water'
    ];

    // Create 3-5 repairs per scope, spread across dates
    scopes.forEach((scope, scopeIdx) => {
      const count = 1 + (scopeIdx % 4); // 1-4 repairs per scope
      const dept = departments.find(d => d.lDepartmentKey === scope.lDepartmentKey);
      if (!dept) return;

      for (let r = 0; r < count; r++) {
        repairKey++;
        const isNorth = dept._region === 'North';
        const prefix  = isNorth ? 'NR' : 'SR';
        const status  = statuses[(repairKey) % statuses.length];
        const isOpen  = !['Shipped', 'Completed', 'Cancelled'].includes(status);
        const daysAgo = 5 + (repairKey % 90); // received 5-95 days ago
        const dtReceived = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const dtShipped  = isOpen ? null : new Date(Date.now() - (daysAgo - 10) * 86400000).toISOString();
        const techKey    = TECHNICIANS[repairKey % TECHNICIANS.length].lTechnicianKey;
        const techName   = TECHNICIANS[repairKey % TECHNICIANS.length].sTechName;

        repairs.push({
          lRepairKey:           repairKey,
          lDepartmentKey:       scope.lDepartmentKey,
          lScopeKey:            scope.lScopeKey,
          lClientKey:           scope.lClientKey,
          lServiceLocationKey:  dept.lServiceLocationKey,
          lTechnicianKey:       techKey,
          lContractKey:         null, // linked by buildContracts below
          sWorkOrderNumber:     prefix + String(repairKey).slice(-8),
          sSerial:              scope.sSerial,
          sModel:               scope.sModel,
          sManufacturer:        scope.sManufacturer,
          sComplaint:           complaints[repairKey % complaints.length],
          sRepairStatus:        status,
          sClientName:          dept.sClientName,
          sDepartmentName:      dept.sDepartmentName,
          sTechnicianName:      techName,
          sServiceLocationName: dept.sServiceLocationName,
          dtReceived:           dtReceived,
          dtShipped:            dtShipped,
          dtPromised:           new Date(Date.parse(dtReceived) + 14 * 86400000).toISOString(),
          nRepairTotal:         0, // populated by repair details sum
          nContractExpense:     0,
          bUnderContract:       false,
          bUrgent:              repairKey % 15 === 0,
          bLoaner:              repairKey % 20 === 0,
          sPONumber:            repairKey % 3 === 0 ? 'PO-' + (10000 + repairKey) : '',
          sRigidOrFlexible:     scope.sRigidOrFlexible,
          _region:              dept._region,
          _dbKey:               dept._dbKey,
          Created_datetime:     dtReceived,
          Created_UserKey:      2,
        });
      }
    });

    return repairs;
  }

  function buildRepairDetails(repairs) {
    const details = [];
    let detailKey = BASE.repairDetail;

    repairs.forEach(repair => {
      // 1-3 line items per repair
      const itemCount = 1 + (repair.lRepairKey % 3);
      let repairTotal = 0;
      for (let i = 0; i < itemCount; i++) {
        detailKey++;
        const catalogItem = REPAIR_ITEMS_CATALOG[
          (repair.lRepairKey + i) % REPAIR_ITEMS_CATALOG.length
        ];
        const qty       = 1;
        const unitPrice = catalogItem.nPrice;
        const extPrice  = qty * unitPrice;
        repairTotal += extPrice;
        details.push({
          lRepairItemTranKey: detailKey,
          lRepairKey:         repair.lRepairKey,
          lRepairItemKey:     catalogItem.lRepairItemKey,
          sRepairItemDesc:    catalogItem.sRepairItemDesc,
          sRepairItemCode:    catalogItem.sRepairItemCode,
          nQty:               qty,
          nUnitPrice:         unitPrice,
          nExtPrice:          extPrice,
          bApproved:          repair.sRepairStatus !== 'Received',
          bWarranty:          false,
          sRigidOrFlexible:   repair.sRigidOrFlexible,
          Created_datetime:   repair.dtReceived,
          Created_UserKey:    2,
        });
      }
      // Back-fill total on repair
      repair.nRepairTotal = Math.round(repairTotal * 100) / 100;
    });

    return details;
  }

  function buildContracts(clients) {
    const contracts = [];
    let contractKey = BASE.contract;
    const contractTypes = ['Capitated', 'PSA', 'Shared Risk'];

    // ~30% of clients have contracts (mirrors real 9.9% active, but seed has more for dev utility)
    clients.forEach((client, idx) => {
      if (idx % 3 !== 0) return; // every 3rd client
      contractKey++;
      const isNorth    = client._region === 'North';
      const prefix     = isNorth ? 'NC' : 'SC';
      const typeIdx    = contractKey % contractTypes.length;
      const monthlyFee = 1200 + (contractKey % 10) * 150;

      contracts.push({
        lContractKey:         contractKey,
        lClientKey:           client.lClientKey,
        lContractTypeKey:     typeIdx + 1,
        sContractNumber:      prefix + String(contractKey).slice(-6),
        sContractType:        contractTypes[typeIdx],
        sClientName:          client.sClientName1,
        dtStartDate:          '2025-01-01T00:00:00',
        dtEndDate:            '2025-12-31T00:00:00',
        nMonthlyFee:          monthlyFee,
        nAnnualValue:         monthlyFee * 12,
        bActive:              true,
        bCapitated:           typeIdx === 0,
        nScopeCount:          0, // updated below
        nDeptCount:           0,
        lServiceLocationKey:  client.lServiceLocationKey,
        sServiceLocationName: client.sServiceLocationName,
        _region:              client._region,
        _dbKey:               client._dbKey,
        Created_datetime:     '2025-01-01T00:00:00',
        Created_UserKey:      2,
      });
    });

    return contracts;
  }

  function buildContractCoverage(contracts, departments, scopes) {
    const covDepts  = [];
    const covScopes = [];
    let cdKey = BASE.contract + 500;
    let csKey = BASE.contract + 5000;

    contracts.forEach(contract => {
      const clientDepts = departments.filter(d => d.lClientKey === contract.lClientKey);
      const deptSample  = clientDepts.slice(0, 2); // cover first 2 depts
      deptSample.forEach(dept => {
        cdKey++;
        covDepts.push({
          lContractDepartmentKey: cdKey,
          lContractKey:           contract.lContractKey,
          lDepartmentKey:         dept.lDepartmentKey,
          sDepartmentName:        dept.sDepartmentName,
          sClientName:            dept.sClientName,
        });

        const deptScopes = scopes.filter(s => s.lDepartmentKey === dept.lDepartmentKey);
        deptScopes.slice(0, 3).forEach(scope => {
          csKey++;
          covScopes.push({
            lContractScopeKey: csKey,
            lContractKey:      contract.lContractKey,
            lScopeKey:         scope.lScopeKey,
            sSerial:           scope.sSerial,
            sModel:            scope.sModel,
            sDepartmentName:   dept.sDepartmentName,
          });
        });
      });

      // Update counts
      contract.nDeptCount  = deptSample.length;
      contract.nScopeCount = covScopes.filter(cs => cs.lContractKey === contract.lContractKey).length;
    });

    return { covDepts, covScopes };
  }

  function buildProductSales(clients) {
    const sales = [];
    const items  = [];
    let saleKey  = BASE.productSale;
    let itemKey  = BASE.productSaleItem;

    // 1-3 sales per client for variety
    clients.forEach((client, idx) => {
      const saleCount = 1 + (idx % 3);
      for (let s = 0; s < saleCount; s++) {
        saleKey++;
        const isNorth = client._region === 'North';
        const prefix  = isNorth ? 'NI' : 'SI';
        const daysAgo = 10 + (saleKey % 120);
        const dtSale  = new Date(Date.now() - daysAgo * 86400000).toISOString();
        const status  = s === 0 ? 'Open' : 'Invoiced';

        const saleItemCount = 1 + (saleKey % 3);
        let saleTotal = 0;
        const saleItems = [];

        for (let i = 0; i < saleItemCount; i++) {
          itemKey++;
          const inv = INVENTORY[(saleKey + i) % INVENTORY.length];
          const qty = 1 + (i % 3);
          const ext = qty * inv.nSellPrice;
          saleTotal += ext;
          saleItems.push({
            lProductSaleInventoryKey: itemKey,
            lProductSaleKey:          saleKey,
            lInventoryKey:            inv.lInventoryKey,
            sDescription:             inv.sDescription,
            sItemCode:                inv.sItemCode,
            nQty:                     qty,
            nUnitPrice:               inv.nSellPrice,
            nExtPrice:                ext,
            Created_datetime:         dtSale,
            Created_UserKey:          2,
          });
        }

        sales.push({
          lProductSaleKey:    saleKey,
          lClientKey:         client.lClientKey,
          lDepartmentKey:     null,
          sInvoiceNumber:     prefix + String(saleKey).slice(-6),
          sPONumber:          saleKey % 2 === 0 ? 'PO-SALE-' + saleKey : '',
          sDescription:       'Parts & Supply Order',
          sClientName:        client.sClientName1,
          dtSaleDate:         dtSale,
          dtShipped:          status === 'Invoiced' ? new Date(Date.parse(dtSale) + 3 * 86400000).toISOString() : null,
          nTotal:             Math.round(saleTotal * 100) / 100,
          sStatus:            status,
          lServiceLocationKey: client.lServiceLocationKey,
          _region:             client._region,
          _dbKey:              client._dbKey,
          Created_datetime:    dtSale,
          Created_UserKey:     2,
        });

        items.push(...saleItems);
      }
    });

    return { sales, items };
  }

  function buildInvoices(repairs, clients) {
    // Build from completed repairs only (mirrors GP staging pattern)
    const invoices = [];
    let invKey = BASE.invoice;

    const completedRepairs = repairs.filter(r =>
      ['Shipped', 'Completed'].includes(r.sRepairStatus) && r.nRepairTotal > 0
    );

    completedRepairs.forEach(repair => {
      invKey++;
      const isPaid  = invKey % 3 !== 0;
      const dtInv   = repair.dtShipped || repair.Created_datetime;
      const dtDue   = new Date(Date.parse(dtInv) + 30 * 86400000).toISOString();
      invoices.push({
        lInvoiceKey:         invKey,
        lClientKey:          repair.lClientKey,
        lRepairKey:          repair.lRepairKey,
        lContractKey:        repair.lContractKey,
        sInvoiceNumber:      'INV-' + String(invKey).slice(-7),
        sClientName:         repair.sClientName,
        dtInvoiceDate:       dtInv,
        dtDueDate:           dtDue,
        nAmount:             repair.nRepairTotal,
        nBalance:            isPaid ? 0 : repair.nRepairTotal,
        sStatus:             isPaid ? 'Paid' : 'Open',
        bPaid:               isPaid,
        lServiceLocationKey: repair.lServiceLocationKey,
        _region:             repair._region,
        Created_datetime:    dtInv,
        Created_UserKey:     2,
      });
    });

    return invoices;
  }

  // ── Main build function ────────────────────────────────
  function build() {
    const clients     = buildClients();
    const departments = buildDepartments(clients);
    const scopes      = buildScopes(departments);
    const contacts    = buildContacts(clients, departments);
    const repairs     = buildRepairs(scopes, departments);
    const repairDetails = buildRepairDetails(repairs);
    const contracts   = buildContracts(clients);
    const { covDepts, covScopes } = buildContractCoverage(contracts, departments, scopes);
    const { sales, items: productSaleItems } = buildProductSales(clients);
    const invoices    = buildInvoices(repairs, clients);

    return {
      // Reference / lookup tables
      salesReps:        SALES_REPS,
      technicians:      TECHNICIANS,
      serviceLocations: SERVICE_LOCATIONS,
      pricingCategories: PRICING_CATEGORIES,
      paymentTerms:     PAYMENT_TERMS,
      contractTypes:    CONTRACT_TYPES,
      repairStatuses:   REPAIR_STATUSES,
      repairItems:      REPAIR_ITEMS_CATALOG,
      suppliers:        SUPPLIERS,

      // Core entities
      clients,
      departments,
      scopes,
      contacts,
      repairs,
      repairDetails,
      contracts,
      contractDepartments: covDepts,
      contractScopes:      covScopes,

      // Product sales
      productSales:     sales,
      productSaleItems,

      // Inventory
      inventory:        INVENTORY,

      // Invoices
      invoices,
    };
  }

  // ── Seed into MockDB (call once at app init) ───────────
  function seedIntoMockDB(db) {
    if (!db || !db.seed) throw new Error('MockDB instance required');
    const data = build();
    for (const [table, rows] of Object.entries(data)) {
      if (Array.isArray(rows) && rows.length > 0) {
        // Only seed tables that have no existing data (avoid double-seeding)
        const existing = db.getAll(table);
        if (existing.length === 0) {
          db.seed(table, rows);
        }
      }
    }
    return data;
  }

  return {
    build,
    seedIntoMockDB,
    // Expose reference constants for tests
    BASE,
    CLIENT_DEFS,
    REPAIR_STATUSES,
    CONTRACT_TYPES,
  };
})();

// ── Node.js export support ────────────────────────────
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SeedData;
}
