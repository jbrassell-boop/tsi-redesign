// ═══════════════════════════════════════════════════════
//  TSI Mock Database — In-Memory Data Store
//  Replaces live BrightLogix API with local mock data
// ═══════════════════════════════════════════════════════

const MockDB = (() => {
  'use strict';

  // ── Auto-increment key generator ──────────────────────
  const _counters = {};
  function nextKey(table) {
    if (!_counters[table]) {
      // Initialize from existing data
      const rows = _tables[table];
      const keyField = _keyFields[table] || 'id';
      const maxKey = rows && rows.length
        ? Math.max(...rows.map(r => r[keyField] || 0))
        : 0;
      _counters[table] = maxKey;
    }
    return ++_counters[table];
  }

  // ── Primary key field names per table ─────────────────
  const _keyFields = {
    clients:            'lClientKey',
    departments:        'lDepartmentKey',
    scopes:             'lScopeKey',
    scopeTypes:         'lScopeTypeKey',
    repairs:            'lRepairKey',
    repairDetails:      'lRepairItemTranKey',
    repairItems:        'lRepairItemKey',
    repairInventory:    'lRepairInventoryKey',
    statusTrans:        'lStatusTranKey',
    inventory:          'lInventoryKey',
    inventorySizes:     'lInventorySizeKey',
    suppliers:          'lSupplierKey',
    supplierPOs:        'lSupplierPOKey',
    contracts:          'lContractKey',
    pendingContracts:   'lPendingContractKey',
    contacts:           'lContactKey',
    documents:          'lDocumentKey',
    flags:              'lFlagKey',
    tasks:              'lTaskKey',
    taskTypes:          'lTaskTypeKey',
    users:              'lUserKey',
    salesReps:          'lSalesRepKey',
    manufacturers:      'lManufacturerKey',
    employees:          'lEmployeeKey',
    invoices:           'lInvoiceKey',
    invoicePayments:    'lInvoicePaymentID',
    productSales:       'lProductSaleKey',
    productSaleItems:   'lProductSaleInventoryKey',
    securityGroups:     'lSecurityGroupKey',
    pricingCategories:  'lPricingCategoryKey',
    modelMaxCharges:    'lModelMaxChargeKey',
    departmentGPOs:     'lDepartmentGPOKey',
    subGroups:          'lSubGroupKey',
    acquisitions:       'lAcquisitionKey',
    glAccounts:         'lGLAccountKey',
    systemCodes:        'lSystemCodesKey',
  };

  // ── Data tables ───────────────────────────────────────
  // Each table is a plain array of objects.
  // Seed data is added in phases (see bottom of file).
  const _tables = {
    // Core entities
    clients:            [],
    departments:        [],
    scopes:             [],
    scopeTypes:         [],
    scopeCategories:    [],
    manufacturers:      [],
    instrumentTypes:    [],

    // Repairs
    repairs:            [],
    repairDetails:      [],
    repairItems:        [],
    repairInventory:    [],
    statusTrans:        [],

    // Inventory
    inventory:          [],
    inventorySizes:     [],
    inventoryAssembly:  [],

    // Suppliers
    suppliers:          [],
    supplierPOs:        [],
    supplierPOTrans:    [],

    // Contracts
    contracts:          [],
    contractDepartments:[],
    contractScopes:     [],
    contractInvoices:   [],
    pendingContracts:   [],

    // Financials
    invoices:           [],
    invoicePayments:    [],
    draftInvoices:      [],
    clientsOnHold:      [],
    workOrdersOnHold:   [],
    glAccounts:         [],

    // Product Sales
    productSales:       [],
    productSaleItems:   [],

    // Contacts
    contacts:           [],

    // Documents & Flags
    documents:          [],
    flags:              [],

    // Tasks
    tasks:              [],
    taskTypes:          [],
    taskStatuses:       [],
    taskPriorities:     [],
    taskLoaners:        [],

    // Lookups
    salesReps:          [],
    employees:          [],
    pricingCategories:  [],
    paymentTerms:       [],
    creditLimits:       [],
    distributors:       [],
    countries:          [],
    states:             [],
    systemCodes:        [],
    serviceLocations:   [],
    shippingCarriers:   [],
    repairReasons:      [],
    repairLevels:       [],
    repairStatuses:     [],
    deliveryMethods:    [],
    patientSafetyLevels:[],
    departmentTypes:    [],
    contractTypes:      [],
    contractInstallmentTypes: [],
    contractServicePlanTerms: [],
    videoImages:        [],
    diTypes:            [],
    emailTemplates:     [],
    pricingGpo:         [],
    jobTypes:           [],
    supplierPOTypes:    [],

    // Users & Security
    users:              [],
    securityGroups:     [],
    securityGroupMenuItems: [],
    userSecurityGroups: [],
    menuItems:          [],

    // Admin
    pricingDetails:     [],
    modelMaxCharges:    [],
    departmentGPOs:     [],
    subGroups:          [],
    departmentScopeTypes: [],

    // Acquisitions
    acquisitions:       [],

    // Dev Todo
    devTodoList:        [],
    devTodoStatuses:    [],
    devTodoPriorities:  [],
  };

  // ── CRUD helpers ──────────────────────────────────────
  function getAll(table) {
    return _tables[table] ? [..._tables[table]] : [];
  }

  function getByKey(table, keyValue) {
    const keyField = _keyFields[table];
    return _tables[table]?.find(r => r[keyField] === keyValue) || null;
  }

  function getFiltered(table, predicate) {
    return (_tables[table] || []).filter(predicate);
  }

  function insert(table, record) {
    const keyField = _keyFields[table];
    if (keyField && !record[keyField]) {
      record[keyField] = nextKey(table);
    }
    // Add audit fields
    record.Created_datetime = record.Created_datetime || new Date().toISOString();
    record.Created_UserKey = record.Created_UserKey || 2;
    _tables[table].push(record);
    return record;
  }

  function update(table, keyValue, changes) {
    const keyField = _keyFields[table];
    const idx = _tables[table]?.findIndex(r => r[keyField] === keyValue);
    if (idx === -1 || idx === undefined) return null;
    Object.assign(_tables[table][idx], changes, {
      Updated_datetime: new Date().toISOString(),
      Updated_UserKey: 2
    });
    return _tables[table][idx];
  }

  function remove(table, keyValue) {
    const keyField = _keyFields[table];
    const idx = _tables[table]?.findIndex(r => r[keyField] === keyValue);
    if (idx === -1 || idx === undefined) return false;
    _tables[table].splice(idx, 1);
    return true;
  }

  // ── Pagination helper ────────────────────────────────
  function paginate(rows, pagination) {
    if (!pagination) return rows;
    const page = pagination.PageNumber || 1;
    const size = pagination.PageSize || 100;
    const start = (page - 1) * size;
    return rows.slice(start, start + size);
  }

  // ── Seed function (called per-phase) ─────────────────
  function seed(table, data) {
    if (!_tables[table]) _tables[table] = [];
    _tables[table].push(...data);
    // Reset counter so nextKey starts after seeded data
    delete _counters[table];
  }

  // ── Public API ────────────────────────────────────────
  return {
    getAll,
    getByKey,
    getFiltered,
    insert,
    update,
    remove,
    paginate,
    seed,
    nextKey,
    tables: _tables,       // Direct access for mock-api.js route handlers
    keyFields: _keyFields,
  };
})();

// ═══════════════════════════════════════════════════════
//  SEED DATA — Added in phases
//  Phase 2: Core entities (clients, depts, scopes, lookups)
//  Phase 3: Repairs, inventory, financial, suppliers
// ═══════════════════════════════════════════════════════

// ═══════════════════════════════════════════════════════
//  PHASE 2: Core Entity Seed Data
//  Clients, Departments, Scopes, Scope Types, Lookups
// ═══════════════════════════════════════════════════════

// ── Service Locations ───────────────────────────────────
MockDB.seed('serviceLocations', [
  { lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', sAddress1: '2006 Market St', sCity: 'Upper Chichester', sState: 'PA', sZip: '19014', bActive: true },
  { lServiceLocationKey: 2, sServiceLocationName: 'Nashville', sAddress1: '820 4th Ave S', sCity: 'Nashville', sState: 'TN', sZip: '37210', bActive: true },
]);

// ── Sales Reps ──────────────────────────────────────────
MockDB.seed('salesReps', [
  { lSalesRepKey: 1, sSalesRepName: 'Joseph Brassell', sFirstName: 'Joseph', sLastName: 'Brassell', bActive: true },
  { lSalesRepKey: 2, sSalesRepName: 'Brandi Cook', sFirstName: 'Brandi', sLastName: 'Cook', bActive: true },
  { lSalesRepKey: 3, sSalesRepName: 'Tom Velez', sFirstName: 'Tom', sLastName: 'Velez', bActive: true },
  { lSalesRepKey: 4, sSalesRepName: 'Rob Mancini', sFirstName: 'Rob', sLastName: 'Mancini', bActive: true },
  { lSalesRepKey: 5, sSalesRepName: 'Debbie Hightower', sFirstName: 'Debbie', sLastName: 'Hightower', bActive: true },
  { lSalesRepKey: 6, sSalesRepName: 'J. Miller', sFirstName: 'Jim', sLastName: 'Miller', bActive: true },
  { lSalesRepKey: 7, sSalesRepName: 'R. Thompson', sFirstName: 'Rick', sLastName: 'Thompson', bActive: true },
  { lSalesRepKey: 8, sSalesRepName: 'S. Chen', sFirstName: 'Sarah', sLastName: 'Chen', bActive: true },
  { lSalesRepKey: 9, sSalesRepName: 'K. Davis', sFirstName: 'Kevin', sLastName: 'Davis', bActive: true },
]);

// ── Employees / Technicians ─────────────────────────────
MockDB.seed('employees', [
  { lEmployeeKey: 1, lTechnicianKey: 1, sEmployeeFirst: 'Rob', sEmployeeLast: 'Martinez', sTechName: 'Rob Martinez', sEmployeeEMail: 'r.martinez@tsi.com', bActive: true, bIsTechnician: true },
  { lEmployeeKey: 2, lTechnicianKey: 2, sEmployeeFirst: 'Tom', sEmployeeLast: 'Bradley', sTechName: 'Tom Bradley', sEmployeeEMail: 't.bradley@tsi.com', bActive: true, bIsTechnician: true },
  { lEmployeeKey: 3, lTechnicianKey: 3, sEmployeeFirst: 'Mike', sEmployeeLast: 'Johnson', sTechName: 'Mike Johnson', sEmployeeEMail: 'm.johnson@tsi.com', bActive: true, bIsTechnician: true },
  { lEmployeeKey: 4, lTechnicianKey: 4, sEmployeeFirst: 'Chris', sEmployeeLast: 'Lee', sTechName: 'Chris Lee', sEmployeeEMail: 'c.lee@tsi.com', bActive: true, bIsTechnician: true },
  { lEmployeeKey: 5, lTechnicianKey: 5, sEmployeeFirst: 'Amy', sEmployeeLast: 'Sanders', sTechName: 'Amy Sanders', sEmployeeEMail: 'a.sanders@tsi.com', bActive: true, bIsTechnician: false },
]);

// ── Pricing Categories ──────────────────────────────────
MockDB.seed('pricingCategories', [
  { lPricingCategoryKey: 1, sPricingDescription: 'Standard', bActive: true, bDefault: true },
  { lPricingCategoryKey: 2, sPricingDescription: 'Premier', bActive: true, bDefault: false },
  { lPricingCategoryKey: 3, sPricingDescription: 'GSA 2014 (Joint)', bActive: true, bDefault: false },
  { lPricingCategoryKey: 4, sPricingDescription: 'Government', bActive: true, bDefault: false },
  { lPricingCategoryKey: 5, sPricingDescription: 'HPG', bActive: true, bDefault: false },
]);

// ── Payment Terms ───────────────────────────────────────
MockDB.seed('paymentTerms', [
  { lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt' },
  { lPaymentTermsKey: 2, sTermsDesc: 'Net 30' },
  { lPaymentTermsKey: 3, sTermsDesc: 'Net 60' },
  { lPaymentTermsKey: 4, sTermsDesc: 'Net 90' },
]);

// ── Credit Limits ───────────────────────────────────────
MockDB.seed('creditLimits', [
  { lCreditLimitKey: 1, sItemText: '2,500' },
  { lCreditLimitKey: 2, sItemText: '3,000' },
  { lCreditLimitKey: 3, sItemText: '5,000' },
  { lCreditLimitKey: 4, sItemText: '8,000' },
  { lCreditLimitKey: 5, sItemText: '10,000' },
  { lCreditLimitKey: 6, sItemText: '12,000' },
  { lCreditLimitKey: 7, sItemText: '15,000' },
  { lCreditLimitKey: 8, sItemText: '25,000' },
]);

// ── Distributors ────────────────────────────────────────
MockDB.seed('distributors', [
  { lDistributorKey: 1, sDistName1: 'Total Scope South' },
  { lDistributorKey: 2, sDistName1: 'Total Scope North' },
  { lDistributorKey: 3, sDistName1: 'Direct' },
]);

// ── Countries ───────────────────────────────────────────
MockDB.seed('countries', [
  { lCountryKey: 1, sCountryName: 'USA' },
  { lCountryKey: 2, sCountryName: 'Canada' },
  { lCountryKey: 3, sCountryName: 'Mexico' },
]);

// ── States ──────────────────────────────────────────────
MockDB.seed('states', [
  { lStateKey: 1, sStateAbbreviation: 'AL', sStateName: 'Alabama' },
  { lStateKey: 2, sStateAbbreviation: 'AK', sStateName: 'Alaska' },
  { lStateKey: 3, sStateAbbreviation: 'AZ', sStateName: 'Arizona' },
  { lStateKey: 4, sStateAbbreviation: 'AR', sStateName: 'Arkansas' },
  { lStateKey: 5, sStateAbbreviation: 'CA', sStateName: 'California' },
  { lStateKey: 6, sStateAbbreviation: 'CO', sStateName: 'Colorado' },
  { lStateKey: 7, sStateAbbreviation: 'CT', sStateName: 'Connecticut' },
  { lStateKey: 8, sStateAbbreviation: 'DE', sStateName: 'Delaware' },
  { lStateKey: 9, sStateAbbreviation: 'FL', sStateName: 'Florida' },
  { lStateKey: 10, sStateAbbreviation: 'GA', sStateName: 'Georgia' },
  { lStateKey: 11, sStateAbbreviation: 'HI', sStateName: 'Hawaii' },
  { lStateKey: 12, sStateAbbreviation: 'ID', sStateName: 'Idaho' },
  { lStateKey: 13, sStateAbbreviation: 'IL', sStateName: 'Illinois' },
  { lStateKey: 14, sStateAbbreviation: 'IN', sStateName: 'Indiana' },
  { lStateKey: 15, sStateAbbreviation: 'IA', sStateName: 'Iowa' },
  { lStateKey: 16, sStateAbbreviation: 'KS', sStateName: 'Kansas' },
  { lStateKey: 17, sStateAbbreviation: 'KY', sStateName: 'Kentucky' },
  { lStateKey: 18, sStateAbbreviation: 'LA', sStateName: 'Louisiana' },
  { lStateKey: 19, sStateAbbreviation: 'ME', sStateName: 'Maine' },
  { lStateKey: 20, sStateAbbreviation: 'MD', sStateName: 'Maryland' },
  { lStateKey: 21, sStateAbbreviation: 'MA', sStateName: 'Massachusetts' },
  { lStateKey: 22, sStateAbbreviation: 'MI', sStateName: 'Michigan' },
  { lStateKey: 23, sStateAbbreviation: 'MN', sStateName: 'Minnesota' },
  { lStateKey: 24, sStateAbbreviation: 'MS', sStateName: 'Mississippi' },
  { lStateKey: 25, sStateAbbreviation: 'MO', sStateName: 'Missouri' },
  { lStateKey: 26, sStateAbbreviation: 'MT', sStateName: 'Montana' },
  { lStateKey: 27, sStateAbbreviation: 'NE', sStateName: 'Nebraska' },
  { lStateKey: 28, sStateAbbreviation: 'NV', sStateName: 'Nevada' },
  { lStateKey: 29, sStateAbbreviation: 'NH', sStateName: 'New Hampshire' },
  { lStateKey: 30, sStateAbbreviation: 'NJ', sStateName: 'New Jersey' },
  { lStateKey: 31, sStateAbbreviation: 'NM', sStateName: 'New Mexico' },
  { lStateKey: 32, sStateAbbreviation: 'NY', sStateName: 'New York' },
  { lStateKey: 33, sStateAbbreviation: 'NC', sStateName: 'North Carolina' },
  { lStateKey: 34, sStateAbbreviation: 'ND', sStateName: 'North Dakota' },
  { lStateKey: 35, sStateAbbreviation: 'OH', sStateName: 'Ohio' },
  { lStateKey: 36, sStateAbbreviation: 'OK', sStateName: 'Oklahoma' },
  { lStateKey: 37, sStateAbbreviation: 'OR', sStateName: 'Oregon' },
  { lStateKey: 38, sStateAbbreviation: 'PA', sStateName: 'Pennsylvania' },
  { lStateKey: 39, sStateAbbreviation: 'RI', sStateName: 'Rhode Island' },
  { lStateKey: 40, sStateAbbreviation: 'SC', sStateName: 'South Carolina' },
  { lStateKey: 41, sStateAbbreviation: 'SD', sStateName: 'South Dakota' },
  { lStateKey: 42, sStateAbbreviation: 'TN', sStateName: 'Tennessee' },
  { lStateKey: 43, sStateAbbreviation: 'TX', sStateName: 'Texas' },
  { lStateKey: 44, sStateAbbreviation: 'UT', sStateName: 'Utah' },
  { lStateKey: 45, sStateAbbreviation: 'VT', sStateName: 'Vermont' },
  { lStateKey: 46, sStateAbbreviation: 'VA', sStateName: 'Virginia' },
  { lStateKey: 47, sStateAbbreviation: 'WA', sStateName: 'Washington' },
  { lStateKey: 48, sStateAbbreviation: 'WV', sStateName: 'West Virginia' },
  { lStateKey: 49, sStateAbbreviation: 'WI', sStateName: 'Wisconsin' },
  { lStateKey: 50, sStateAbbreviation: 'WY', sStateName: 'Wyoming' },
  { lStateKey: 51, sStateAbbreviation: 'DC', sStateName: 'District of Columbia' },
]);

// ── Instrument Types ────────────────────────────────────
MockDB.seed('instrumentTypes', [
  { sInstrumentType: 'F', sDescription: 'Flexible Endoscope' },
  { sInstrumentType: 'R', sDescription: 'Rigid Endoscope' },
  { sInstrumentType: 'C', sDescription: 'Camera / Video' },
  { sInstrumentType: 'I', sDescription: 'Instrument' },
]);

// ── Shipping Carriers ───────────────────────────────────
MockDB.seed('shippingCarriers', [
  { lCarrierKey: 1, sCarrierName: 'FedEx', bActive: true },
  { lCarrierKey: 2, sCarrierName: 'UPS', bActive: true },
  { lCarrierKey: 3, sCarrierName: 'DHL', bActive: true },
  { lCarrierKey: 4, sCarrierName: 'TSI Courier', bActive: true },
  { lCarrierKey: 5, sCarrierName: 'Client Pickup', bActive: true },
]);

// ── Department Types ────────────────────────────────────
MockDB.seed('departmentTypes', [
  { lDepartmentTypeKey: 1, sDepartmentTypeName: 'Endoscopy' },
  { lDepartmentTypeKey: 2, sDepartmentTypeName: 'GI Lab' },
  { lDepartmentTypeKey: 3, sDepartmentTypeName: 'Surgery / OR' },
  { lDepartmentTypeKey: 4, sDepartmentTypeName: 'Biomedical Engineering' },
  { lDepartmentTypeKey: 5, sDepartmentTypeName: 'Pulmonology' },
  { lDepartmentTypeKey: 6, sDepartmentTypeName: 'Urology' },
  { lDepartmentTypeKey: 7, sDepartmentTypeName: 'Sterile Processing' },
  { lDepartmentTypeKey: 8, sDepartmentTypeName: 'ICU / Critical Care' },
  { lDepartmentTypeKey: 9, sDepartmentTypeName: 'Cardiology' },
]);

// ── Manufacturers ───────────────────────────────────────
MockDB.seed('manufacturers', [
  { lManufacturerKey: 1, sManufacturerName: 'Olympus', bActive: true },
  { lManufacturerKey: 2, sManufacturerName: 'Fujifilm', bActive: true },
  { lManufacturerKey: 3, sManufacturerName: 'Pentax', bActive: true },
  { lManufacturerKey: 4, sManufacturerName: 'Karl Storz', bActive: true },
  { lManufacturerKey: 5, sManufacturerName: 'Stryker', bActive: true },
  { lManufacturerKey: 6, sManufacturerName: 'Smith & Nephew', bActive: true },
  { lManufacturerKey: 7, sManufacturerName: 'Arthrex', bActive: true },
  { lManufacturerKey: 8, sManufacturerName: 'ConMed', bActive: true },
]);

// ── Scope Categories ────────────────────────────────────
MockDB.seed('scopeCategories', [
  { lScopeCategoryKey: 1, sScopeCategoryName: 'Gastroscope', sRigidOrFlexible: 'F' },
  { lScopeCategoryKey: 2, sScopeCategoryName: 'Colonoscope', sRigidOrFlexible: 'F' },
  { lScopeCategoryKey: 3, sScopeCategoryName: 'Bronchoscope', sRigidOrFlexible: 'F' },
  { lScopeCategoryKey: 4, sScopeCategoryName: 'Duodenoscope', sRigidOrFlexible: 'F' },
  { lScopeCategoryKey: 5, sScopeCategoryName: 'Enteroscope', sRigidOrFlexible: 'F' },
  { lScopeCategoryKey: 6, sScopeCategoryName: 'Cystoscope', sRigidOrFlexible: 'R' },
  { lScopeCategoryKey: 7, sScopeCategoryName: 'Arthroscope', sRigidOrFlexible: 'R' },
  { lScopeCategoryKey: 8, sScopeCategoryName: 'Laparoscope', sRigidOrFlexible: 'R' },
  { lScopeCategoryKey: 9, sScopeCategoryName: 'Ureteroscope', sRigidOrFlexible: 'R' },
  { lScopeCategoryKey: 10, sScopeCategoryName: 'Camera Head', sRigidOrFlexible: 'C' },
  { lScopeCategoryKey: 11, sScopeCategoryName: 'Light Source', sRigidOrFlexible: 'C' },
  { lScopeCategoryKey: 12, sScopeCategoryName: 'Biopsy Forceps', sRigidOrFlexible: 'I' },
  { lScopeCategoryKey: 13, sScopeCategoryName: 'Resectoscope', sRigidOrFlexible: 'I' },
]);

// ── Scope Types (models) ────────────────────────────────
MockDB.seed('scopeTypes', [
  // Flexible — Gastroscopes
  { lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 1, bActive: true, sInsertTubeDiameter: '9.9', sInsertTubeLength: '1030', sAngLeft: '100', sAngRight: '100', sAngUp: '210', sAngDown: '90', mMaxCharge: 2500 },
  { lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 1, bActive: true, sInsertTubeDiameter: '9.9', sInsertTubeLength: '1030', sAngLeft: '100', sAngRight: '100', sAngUp: '210', sAngDown: '90', mMaxCharge: 3000 },
  { lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 1, bActive: true, sInsertTubeDiameter: '9.9', sInsertTubeLength: '1030', sAngLeft: '100', sAngRight: '100', sAngUp: '210', sAngDown: '90', mMaxCharge: 3200 },
  { lScopeTypeKey: 1004, sScopeTypeDesc: 'Olympus GIF-Q165', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 1, bActive: true, sInsertTubeDiameter: '9.2', sInsertTubeLength: '1030', mMaxCharge: 2200 },
  { lScopeTypeKey: 1005, sScopeTypeDesc: 'Fujifilm EG-760Z', sRigidOrFlexible: 'F', lManufacturerKey: 2, lScopeCategoryKey: 1, bActive: true, sInsertTubeDiameter: '9.9', sInsertTubeLength: '1100', mMaxCharge: 2800 },
  // Flexible — Colonoscopes
  { lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 2, bActive: true, sInsertTubeDiameter: '13.2', sInsertTubeLength: '1680', mMaxCharge: 3500 },
  { lScopeTypeKey: 1011, sScopeTypeDesc: 'Olympus CF-H185L', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 2, bActive: true, sInsertTubeDiameter: '13.2', sInsertTubeLength: '1680', mMaxCharge: 3200 },
  { lScopeTypeKey: 1012, sScopeTypeDesc: 'Olympus PCF-H190DL', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 2, bActive: true, sInsertTubeDiameter: '11.5', sInsertTubeLength: '1680', mMaxCharge: 3400 },
  { lScopeTypeKey: 1013, sScopeTypeDesc: 'Olympus PCF-H190', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 2, bActive: true, sInsertTubeDiameter: '11.5', sInsertTubeLength: '1680', mMaxCharge: 3100 },
  { lScopeTypeKey: 1014, sScopeTypeDesc: 'Fujifilm EC-760R', sRigidOrFlexible: 'F', lManufacturerKey: 2, lScopeCategoryKey: 2, bActive: true, sInsertTubeDiameter: '12.8', mMaxCharge: 3000 },
  // Flexible — Bronchoscopes
  { lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 3, bActive: true, sInsertTubeDiameter: '4.2', sInsertTubeLength: '600', mMaxCharge: 2800 },
  { lScopeTypeKey: 1021, sScopeTypeDesc: 'Olympus BF-UC180F', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 3, bActive: true, sInsertTubeDiameter: '6.9', mMaxCharge: 4500 },
  { lScopeTypeKey: 1022, sScopeTypeDesc: 'Olympus BF-1TH190', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 3, bActive: true, sInsertTubeDiameter: '6.0', mMaxCharge: 3200 },
  { lScopeTypeKey: 1023, sScopeTypeDesc: 'Pentax EB-1990i', sRigidOrFlexible: 'F', lManufacturerKey: 3, lScopeCategoryKey: 3, bActive: true, sInsertTubeDiameter: '5.9', mMaxCharge: 3000 },
  // Flexible — Duodenoscopes
  { lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V', sRigidOrFlexible: 'F', lManufacturerKey: 1, lScopeCategoryKey: 4, bActive: true, sInsertTubeDiameter: '11.3', mMaxCharge: 5000 },
  { lScopeTypeKey: 1031, sScopeTypeDesc: 'Pentax FG-34W', sRigidOrFlexible: 'F', lManufacturerKey: 3, lScopeCategoryKey: 4, bActive: true, sInsertTubeDiameter: '11.6', mMaxCharge: 4200 },
  // Rigid
  { lScopeTypeKey: 2001, sScopeTypeDesc: 'Storz 27005BA Cystoscope', sRigidOrFlexible: 'R', lManufacturerKey: 4, lScopeCategoryKey: 6, bActive: true, mMaxCharge: 1800 },
  { lScopeTypeKey: 2002, sScopeTypeDesc: 'Storz 26003BA Resectoscope', sRigidOrFlexible: 'R', lManufacturerKey: 4, lScopeCategoryKey: 9, bActive: true, mMaxCharge: 2000 },
  { lScopeTypeKey: 2003, sScopeTypeDesc: 'Olympus URF-V2', sRigidOrFlexible: 'R', lManufacturerKey: 1, lScopeCategoryKey: 9, bActive: true, mMaxCharge: 3500 },
  { lScopeTypeKey: 2004, sScopeTypeDesc: 'Olympus CYF-V2', sRigidOrFlexible: 'R', lManufacturerKey: 1, lScopeCategoryKey: 6, bActive: true, mMaxCharge: 2500 },
  { lScopeTypeKey: 2005, sScopeTypeDesc: 'Stryker 5mm Arthroscope', sRigidOrFlexible: 'R', lManufacturerKey: 5, lScopeCategoryKey: 7, bActive: true, mMaxCharge: 1500 },
  // Camera / Video
  { lScopeTypeKey: 3001, sScopeTypeDesc: 'Stryker 1288 Camera Head', sRigidOrFlexible: 'C', lManufacturerKey: 5, lScopeCategoryKey: 10, bActive: true, mMaxCharge: 2200 },
  { lScopeTypeKey: 3002, sScopeTypeDesc: 'Stryker 1588 Camera Head', sRigidOrFlexible: 'C', lManufacturerKey: 5, lScopeCategoryKey: 10, bActive: true, mMaxCharge: 2800 },
  { lScopeTypeKey: 3003, sScopeTypeDesc: 'Olympus OTV-SP1', sRigidOrFlexible: 'C', lManufacturerKey: 1, lScopeCategoryKey: 10, bActive: true, mMaxCharge: 2000 },
  { lScopeTypeKey: 3004, sScopeTypeDesc: 'Olympus CLV-S200', sRigidOrFlexible: 'C', lManufacturerKey: 1, lScopeCategoryKey: 11, bActive: true, mMaxCharge: 1800 },
  // Instruments
  { lScopeTypeKey: 4001, sScopeTypeDesc: 'Olympus FG-47L Biopsy Forceps', sRigidOrFlexible: 'I', lManufacturerKey: 1, lScopeCategoryKey: 12, bActive: true, mMaxCharge: 800 },
  { lScopeTypeKey: 4002, sScopeTypeDesc: 'Olympus SD-230U Snare', sRigidOrFlexible: 'I', lManufacturerKey: 1, lScopeCategoryKey: 12, bActive: true, mMaxCharge: 600 },
  { lScopeTypeKey: 4003, sScopeTypeDesc: 'Olympus WA50012A Resectoscope', sRigidOrFlexible: 'I', lManufacturerKey: 1, lScopeCategoryKey: 13, bActive: true, mMaxCharge: 1200 },
]);

// ── Clients (8 — matching existing demo data) ──────────
MockDB.seed('clients', [
  { lClientKey: 3502, sClientName1: '88th Medical Group', sClientName2: '', sUnitBuilding: 'Wright Patterson AFB, Bldg. 830123',
    sMailAddr1: '4881 Sugar Maple Drive', sMailAddr2: '', sMailCity: 'Coosada', sMailState: 'AL', sMailZip: '36020', sMailCountry: 'USA',
    sPhoneNumber: '+1 (222) 222-2222', sFaxNumber: '(111) 111-1111',
    dtClientSince: '2006-06-04T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 3, sPricingDescription: 'GSA 2014 (Joint)',
    lSalesRepKey: 2, sSalesRepName: 'Brandi Cook',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt',
    sItemText: '5,000', sBillTo: 'Customer',
    dblDiscountPct: 18, dblAdjustmentPct: 42,
    bBlindPS3: true, bRequisitionTotalsOnly: true, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '36020', sCity: 'Coosada', sState: 'AL' },

  { lClientKey: 1084, sClientName1: 'Tift Regional Medical Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '901 East 18th Street', sMailAddr2: '', sMailCity: 'Tifton', sMailState: 'GA', sMailZip: '31794', sMailCountry: 'USA',
    sPhoneNumber: '+1 (229) 382-7120', sFaxNumber: '(229) 382-0555',
    dtClientSince: '2009-03-12T00:00:00', nPortalMonths: 12,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 3, sSalesRepName: 'Tom Velez',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '10,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 50,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '31794', sCity: 'Tifton', sState: 'GA' },

  { lClientKey: 2210, sClientName1: 'Nashville General Hospital', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '1818 Albion Street', sMailAddr2: 'Suite 200', sMailCity: 'Nashville', sMailState: 'TN', sMailZip: '37201', sMailCountry: 'USA',
    sPhoneNumber: '+1 (615) 341-4000', sFaxNumber: '(615) 341-4100',
    dtClientSince: '2011-07-22T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: true, bNationalAccount: true,
    lPricingCategoryKey: 2, sPricingDescription: 'Premier',
    lSalesRepKey: 1, sSalesRepName: 'Joseph Brassell',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '25,000', sBillTo: 'Customer',
    dblDiscountPct: 10, dblAdjustmentPct: 45,
    bBlindPS3: true, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '37201', sCity: 'Nashville', sState: 'TN' },

  { lClientKey: 917, sClientName1: 'Northside Hospital', sClientName2: '', sUnitBuilding: 'Biomed Dept',
    sMailAddr1: '1000 Johnson Ferry Road NE', sMailAddr2: '', sMailCity: 'Atlanta', sMailState: 'GA', sMailZip: '30342', sMailCountry: 'USA',
    sPhoneNumber: '+1 (404) 851-8000', sFaxNumber: '(404) 851-8100',
    dtClientSince: '2007-11-05T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: true, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 2, sSalesRepName: 'Brandi Cook',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 3, sTermsDesc: 'Net 60',
    sItemText: '15,000', sBillTo: 'Third Party',
    dblDiscountPct: 5, dblAdjustmentPct: 55,
    bBlindPS3: false, bRequisitionTotalsOnly: true, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '30342', sCity: 'Atlanta', sState: 'GA' },

  { lClientKey: 3341, sClientName1: 'West Side GI Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '2100 W Harrison St', sMailAddr2: '', sMailCity: 'Chicago', sMailState: 'IL', sMailZip: '60607', sMailCountry: 'USA',
    sPhoneNumber: '+1 (312) 555-0192', sFaxNumber: '(312) 555-0193',
    dtClientSince: '2015-02-14T00:00:00', nPortalMonths: 6,
    bActive: false, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 4, sSalesRepName: 'Rob Mancini',
    lDistributorKey: 3, sDistName1: 'Direct',
    lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt',
    sItemText: '2,500', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 60,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '60607', sCity: 'Chicago', sState: 'IL' },

  { lClientKey: 2755, sClientName1: 'Metro Health Hospital', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '2500 MetroHealth Drive', sMailAddr2: '', sMailCity: 'Cleveland', sMailState: 'OH', sMailZip: '44102', sMailCountry: 'USA',
    sPhoneNumber: '+1 (216) 778-7800', sFaxNumber: '(216) 778-5910',
    dtClientSince: '2013-09-30T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 5, sSalesRepName: 'Debbie Hightower',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '8,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 50,
    bBlindPS3: true, bRequisitionTotalsOnly: true, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '44102', sCity: 'Cleveland', sState: 'OH' },

  { lClientKey: 1650, sClientName1: 'Shreveport Endoscopy Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '1 St Mary Place', sMailAddr2: '', sMailCity: 'Shreveport', sMailState: 'LA', sMailZip: '71101', sMailCountry: 'USA',
    sPhoneNumber: '+1 (318) 212-4000', sFaxNumber: '(318) 212-4100',
    dtClientSince: '2016-05-18T00:00:00', nPortalMonths: 12,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 3, sSalesRepName: 'Tom Velez',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt',
    sItemText: '3,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 55,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '71101', sCity: 'Shreveport', sState: 'LA' },

  { lClientKey: 3089, sClientName1: 'Tampa Minimally Invasive', sClientName2: '', sUnitBuilding: 'Suite 300',
    sMailAddr1: '4 Columbia Drive', sMailAddr2: '', sMailCity: 'Tampa', sMailState: 'FL', sMailZip: '33606', sMailCountry: 'USA',
    sPhoneNumber: '+1 (813) 844-7000', sFaxNumber: '(813) 844-7001',
    dtClientSince: '2018-01-09T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 2, sPricingDescription: 'Premier',
    lSalesRepKey: 1, sSalesRepName: 'Joseph Brassell',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '12,000', sBillTo: 'Customer',
    dblDiscountPct: 8, dblAdjustmentPct: 48,
    bBlindPS3: true, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '33606', sCity: 'Tampa', sState: 'FL' },
]);

// ── Contacts ────────────────────────────────────────────
MockDB.seed('contacts', [
  // 88th Medical Group
  { lContactKey: 101, lClientKey: 3502, lDepartmentKey: 0, sContactLast: 'Whitfield', sContactFirst: 'Karen', sTitle: 'Biomedical Director', sContactPhoneNumber: '+1 (937) 257-7650', sContactFaxNumber: '(937) 257-7700', sContactEMail: 'k.whitfield@wpafb.af.mil', bActive: true },
  { lContactKey: 102, lClientKey: 3502, lDepartmentKey: 0, sContactLast: 'Tatum', sContactFirst: 'Marcus', sTitle: 'Dept. Coordinator', sContactPhoneNumber: '+1 (937) 257-1100', sContactFaxNumber: '(937) 257-1109', sContactEMail: 'm.tatum@wpafb.af.mil', bActive: true },
  { lContactKey: 103, lClientKey: 3502, lDepartmentKey: 0, sContactLast: 'Orozco', sContactFirst: 'Lisa', sTitle: 'Accounts Payable', sContactPhoneNumber: '+1 (937) 257-8823', sContactFaxNumber: '(937) 257-8800', sContactEMail: 'l.orozco@wpafb.af.mil', bActive: true },
  { lContactKey: 104, lClientKey: 3502, lDepartmentKey: 0, sContactLast: 'Hendrick', sContactFirst: 'James', sTitle: 'Chief, Medical Logistics', sContactPhoneNumber: '+1 (937) 257-4400', sContactFaxNumber: '(937) 257-4401', sContactEMail: 'j.hendrick@wpafb.af.mil', bActive: false },
  // Tift Regional
  { lContactKey: 105, lClientKey: 1084, lDepartmentKey: 0, sContactLast: 'Mitchell', sContactFirst: 'Sarah', sTitle: 'GI Lab Director', sContactPhoneNumber: '+1 (229) 382-7200', sContactFaxNumber: '(229) 382-7201', sContactEMail: 's.mitchell@tiftregional.com', bActive: true },
  { lContactKey: 106, lClientKey: 1084, lDepartmentKey: 0, sContactLast: 'Patterson', sContactFirst: 'Mike', sTitle: 'Biomed Tech', sContactPhoneNumber: '+1 (229) 382-7150', sContactFaxNumber: '(229) 382-0555', sContactEMail: 'm.patterson@tiftregional.com', bActive: true },
  // Nashville General
  { lContactKey: 107, lClientKey: 2210, lDepartmentKey: 0, sContactLast: 'Brooks', sContactFirst: 'Amanda', sTitle: 'Central Sterile Manager', sContactPhoneNumber: '+1 (615) 341-4200', sContactFaxNumber: '(615) 341-4100', sContactEMail: 'a.brooks@nashvillegeneral.org', bActive: true },
  { lContactKey: 108, lClientKey: 2210, lDepartmentKey: 0, sContactLast: 'Chen', sContactFirst: 'David', sTitle: 'Purchasing', sContactPhoneNumber: '+1 (615) 341-4050', sContactFaxNumber: '(615) 341-4100', sContactEMail: 'd.chen@nashvillegeneral.org', bActive: true },
  // Northside
  { lContactKey: 109, lClientKey: 917, lDepartmentKey: 0, sContactLast: 'Rivera', sContactFirst: 'Janet', sTitle: 'Biomed Manager', sContactPhoneNumber: '+1 (404) 851-8200', sContactFaxNumber: '(404) 851-8100', sContactEMail: 'j.rivera@northside.com', bActive: true },
  { lContactKey: 110, lClientKey: 917, lDepartmentKey: 0, sContactLast: 'Nguyen', sContactFirst: 'Tom', sTitle: 'OR Coordinator', sContactPhoneNumber: '+1 (404) 851-8300', sContactFaxNumber: '(404) 851-8100', sContactEMail: 't.nguyen@northside.com', bActive: true },
  // West Side GI
  { lContactKey: 111, lClientKey: 3341, lDepartmentKey: 0, sContactLast: 'Kim', sContactFirst: 'Rachel', sTitle: 'Office Manager', sContactPhoneNumber: '+1 (312) 555-0200', sContactFaxNumber: '(312) 555-0193', sContactEMail: 'r.kim@westsidegi.com', bActive: true },
  // Metro Health
  { lContactKey: 112, lClientKey: 2755, lDepartmentKey: 0, sContactLast: 'Foster', sContactFirst: 'Diane', sTitle: 'Nurse Manager', sContactPhoneNumber: '+1 (216) 778-7900', sContactFaxNumber: '(216) 778-5910', sContactEMail: 'd.foster@metrohealth.org', bActive: true },
  { lContactKey: 113, lClientKey: 2755, lDepartmentKey: 0, sContactLast: 'Watts', sContactFirst: 'Brian', sTitle: 'Supply Chain', sContactPhoneNumber: '+1 (216) 778-7850', sContactFaxNumber: '(216) 778-5910', sContactEMail: 'b.watts@metrohealth.org', bActive: true },
  // Shreveport
  { lContactKey: 114, lClientKey: 1650, lDepartmentKey: 0, sContactLast: 'Landry', sContactFirst: 'Paula', sTitle: 'Clinical Director', sContactPhoneNumber: '+1 (318) 212-4050', sContactFaxNumber: '(318) 212-4100', sContactEMail: 'p.landry@shreveportendo.com', bActive: true },
  // Tampa
  { lContactKey: 115, lClientKey: 3089, lDepartmentKey: 0, sContactLast: 'Vega', sContactFirst: 'Carlos', sTitle: 'Practice Administrator', sContactPhoneNumber: '+1 (813) 844-7050', sContactFaxNumber: '(813) 844-7001', sContactEMail: 'c.vega@tampamis.com', bActive: true },
]);

// ── Departments (18 — linked to clients) ────────────────
MockDB.seed('departments', [
  // 88th Medical Group (3502)
  { lDepartmentKey: 10, lClientKey: 3502, sDepartmentName: 'Biomedical Engineering', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Coosada', sShipState: 'AL' },
  { lDepartmentKey: 11, lClientKey: 3502, sDepartmentName: 'Endoscopy Unit', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Coosada', sShipState: 'AL' },
  // Tift Regional (1084)
  { lDepartmentKey: 12, lClientKey: 1084, sDepartmentName: 'GI Lab', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Tifton', sShipState: 'GA' },
  { lDepartmentKey: 13, lClientKey: 1084, sDepartmentName: 'Surgery', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Tifton', sShipState: 'GA' },
  { lDepartmentKey: 14, lClientKey: 1084, sDepartmentName: 'Central Sterile', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: false, sShipCity: 'Tifton', sShipState: 'GA' },
  // Nashville General (2210)
  { lDepartmentKey: 15, lClientKey: 2210, sDepartmentName: 'Endoscopy', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Nashville', sShipState: 'TN' },
  { lDepartmentKey: 16, lClientKey: 2210, sDepartmentName: 'Pulmonology', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Nashville', sShipState: 'TN' },
  { lDepartmentKey: 17, lClientKey: 2210, sDepartmentName: 'Cardiology', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Nashville', sShipState: 'TN' },
  // Northside Hospital (917)
  { lDepartmentKey: 18, lClientKey: 917, sDepartmentName: 'Biomedical Engineering', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Atlanta', sShipState: 'GA' },
  { lDepartmentKey: 19, lClientKey: 917, sDepartmentName: 'Surgery / OR', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Atlanta', sShipState: 'GA' },
  // West Side GI (3341)
  { lDepartmentKey: 20, lClientKey: 3341, sDepartmentName: 'GI Lab', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Chicago', sShipState: 'IL' },
  // Metro Health (2755)
  { lDepartmentKey: 21, lClientKey: 2755, sDepartmentName: 'Endoscopy', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Cleveland', sShipState: 'OH' },
  { lDepartmentKey: 22, lClientKey: 2755, sDepartmentName: 'ICU / Critical Care', lServiceLocationKey: 2, sServiceLocationName: 'Nashville', bActive: true, sShipCity: 'Cleveland', sShipState: 'OH' },
  // Shreveport (1650)
  { lDepartmentKey: 23, lClientKey: 1650, sDepartmentName: 'Endoscopy', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Shreveport', sShipState: 'LA' },
  // Tampa (3089)
  { lDepartmentKey: 24, lClientKey: 3089, sDepartmentName: 'GI Lab', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Tampa', sShipState: 'FL' },
  { lDepartmentKey: 25, lClientKey: 3089, sDepartmentName: 'Surgery / OR', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true, sShipCity: 'Tampa', sShipState: 'FL' },
  // Extra clients from NWO wizard (for client search coverage)
  { lDepartmentKey: 26, lClientKey: 4001, sDepartmentName: 'Endoscopy', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true },
  { lDepartmentKey: 27, lClientKey: 4001, sDepartmentName: 'Urology', lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester', bActive: true },
]);

// ── Scopes (16 — matching sn-search.js demo) ───────────
MockDB.seed('scopes', [
  { lScopeKey: 1001, lScopeTypeKey: 1001, lDepartmentKey: 26, sSerialNumber: 'GIF-H1234', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H180' },
  { lScopeKey: 1002, lScopeTypeKey: 1002, lDepartmentKey: 26, sSerialNumber: 'CF-HQ1890', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus CF-HQ190' },
  { lScopeKey: 1003, lScopeTypeKey: 1020, lDepartmentKey: 26, sSerialNumber: 'BF-P290', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus BF-P290' },
  { lScopeKey: 1004, lScopeTypeKey: 2003, lDepartmentKey: 27, sSerialNumber: 'URF-V2-001', sRigidOrFlexible: 'R', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus URF-V2' },
  { lScopeKey: 1005, lScopeTypeKey: 1031, lDepartmentKey: 12, sSerialNumber: 'OLD-SCOPE-99', sRigidOrFlexible: 'F', sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'City General Medical', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Pentax FG-34W' },
  { lScopeKey: 1006, lScopeTypeKey: 1014, lDepartmentKey: 12, sSerialNumber: 'EC-760R', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'City General Medical', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lScopeKey: 1007, lScopeTypeKey: 2004, lDepartmentKey: 27, sSerialNumber: 'CYF-V2-100', sRigidOrFlexible: 'R', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1008, lScopeTypeKey: 3003, lDepartmentKey: 19, sSerialNumber: 'OTV-SP1-22', sRigidOrFlexible: 'C', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Northside Surgery Center', sDepartmentName: 'Surgical Suite', sScopeTypeDesc: 'Olympus OTV-SP1' },
  { lScopeKey: 1009, lScopeTypeKey: 3004, lDepartmentKey: 19, sSerialNumber: 'CLV-S200', sRigidOrFlexible: 'C', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Northside Surgery Center', sDepartmentName: 'Surgical Suite', sScopeTypeDesc: 'Olympus CLV-S200' },
  { lScopeKey: 1010, lScopeTypeKey: 1022, lDepartmentKey: 16, sSerialNumber: 'BF-1TH190', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'City General Medical', sDepartmentName: 'Pulmonology', sScopeTypeDesc: 'Olympus BF-1TH190' },
  { lScopeKey: 1011, lScopeTypeKey: 1005, lDepartmentKey: 12, sSerialNumber: 'EG-760Z', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'City General Medical', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lScopeKey: 1012, lScopeTypeKey: 2005, lDepartmentKey: 19, sSerialNumber: 'A5394-3', sRigidOrFlexible: 'I', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Northside Surgery Center', sDepartmentName: 'Surgical Suite', sScopeTypeDesc: 'Stryker 5mm Arthroscope' },
  { lScopeKey: 1013, lScopeTypeKey: 1030, lDepartmentKey: 26, sSerialNumber: 'TJF-Q180V', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus TJF-Q180V' },
  { lScopeKey: 1014, lScopeTypeKey: 1013, lDepartmentKey: 26, sSerialNumber: 'PCF-H190-7', sRigidOrFlexible: 'F', sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus PCF-H190' },
  { lScopeKey: 1015, lScopeTypeKey: 4003, lDepartmentKey: 27, sSerialNumber: 'WA50012A', sRigidOrFlexible: 'I', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Memorial Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus WA50012A Resectoscope' },
  { lScopeKey: 1016, lScopeTypeKey: 1023, lDepartmentKey: 16, sSerialNumber: 'EB-1990i', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'City General Medical', sDepartmentName: 'Pulmonology', sScopeTypeDesc: 'Pentax EB-1990i' },
  // Extra scopes for dashboard demo data
  { lScopeKey: 1017, lScopeTypeKey: 1003, lDepartmentKey: 12, sSerialNumber: '3801442', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'Tift Regional Medical Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H190' },
  { lScopeKey: 1018, lScopeTypeKey: 1011, lDepartmentKey: 15, sSerialNumber: '2918371', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'Nashville General Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus CF-H185L' },
  { lScopeKey: 1019, lScopeTypeKey: 1010, lDepartmentKey: 10, sSerialNumber: '3912087', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: '88th Medical Group', sDepartmentName: 'Biomedical Engineering', sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lScopeKey: 1020, lScopeTypeKey: 1021, lDepartmentKey: 22, sSerialNumber: '3615290', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'Metro Health Hospital', sDepartmentName: 'Sterile Processing', sScopeTypeDesc: 'Olympus BF-UC180F' },
  { lScopeKey: 1021, lScopeTypeKey: 1005, lDepartmentKey: 19, sSerialNumber: '4450188', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'Northside Hospital', sDepartmentName: 'Surgery', sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lScopeKey: 1022, lScopeTypeKey: 1011, lDepartmentKey: 23, sSerialNumber: '3290118', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'West Bozeman Surgery Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus CF-H185L' },
  { lScopeKey: 1023, lScopeTypeKey: 1004, lDepartmentKey: 20, sSerialNumber: '3290405', sRigidOrFlexible: 'F', sScopeIsDead: 'N', sClientName1: 'Coliseum Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-Q165' },
]);

// ── Repair Reasons ──────────────────────────────────────
MockDB.seed('repairReasons', [
  { lRepairReasonKey: 1, sRepairReasonDesc: 'Fluid Invasion', sRepairReason: 'Fluid Invasion' },
  { lRepairReasonKey: 2, sRepairReasonDesc: 'Angulation Failure', sRepairReason: 'Angulation Failure' },
  { lRepairReasonKey: 3, sRepairReasonDesc: 'Insertion Tube Damage', sRepairReason: 'Insertion Tube Damage' },
  { lRepairReasonKey: 4, sRepairReasonDesc: 'CCD/Image Failure', sRepairReason: 'CCD/Image Failure' },
  { lRepairReasonKey: 5, sRepairReasonDesc: 'Light Guide Damage', sRepairReason: 'Light Guide Damage' },
  { lRepairReasonKey: 6, sRepairReasonDesc: 'Universal Cord Leak', sRepairReason: 'Universal Cord Leak' },
  { lRepairReasonKey: 7, sRepairReasonDesc: 'Suction Cylinder', sRepairReason: 'Suction Cylinder' },
  { lRepairReasonKey: 8, sRepairReasonDesc: 'Biopsy Channel', sRepairReason: 'Biopsy Channel' },
  { lRepairReasonKey: 9, sRepairReasonDesc: 'Preventive Maintenance', sRepairReason: 'Preventive Maintenance' },
  { lRepairReasonKey: 10, sRepairReasonDesc: 'Evaluation Only', sRepairReason: 'Evaluation Only' },
]);

// ── Repair Levels ───────────────────────────────────────
MockDB.seed('repairLevels', [
  { lRepairLevelKey: 1, sRepairLevelDesc: 'Minor', sRepairLevel: 'Minor' },
  { lRepairLevelKey: 2, sRepairLevelDesc: 'Mid-Level', sRepairLevel: 'Mid-Level' },
  { lRepairLevelKey: 3, sRepairLevelDesc: 'Major', sRepairLevel: 'Major' },
  { lRepairLevelKey: 4, sRepairLevelDesc: 'Rebuild', sRepairLevel: 'Rebuild' },
]);

// ── Repair Statuses ─────────────────────────────────────
MockDB.seed('repairStatuses', [
  { lRepairStatusID: 1, sRepairStatus: 'Received', nOrdinal: 1 },
  { lRepairStatusID: 2, sRepairStatus: 'Evaluation', nOrdinal: 2 },
  { lRepairStatusID: 3, sRepairStatus: 'Waiting for Approval', nOrdinal: 3 },
  { lRepairStatusID: 4, sRepairStatus: 'In Repair', nOrdinal: 4 },
  { lRepairStatusID: 5, sRepairStatus: 'On Hold', nOrdinal: 5 },
  { lRepairStatusID: 6, sRepairStatus: 'Quality Check', nOrdinal: 6 },
  { lRepairStatusID: 7, sRepairStatus: 'Ready to Ship', nOrdinal: 7 },
  { lRepairStatusID: 8, sRepairStatus: 'Shipped', nOrdinal: 8 },
  { lRepairStatusID: 9, sRepairStatus: 'Closed', nOrdinal: 9 },
  { lRepairStatusID: 10, sRepairStatus: 'Cancelled', nOrdinal: 10 },
]);

// ── Delivery Methods ────────────────────────────────────
MockDB.seed('deliveryMethods', [
  { lDeliveryMethodKey: 1, sDeliveryMethodDesc: 'FedEx Standard', sDeliveryDesc: 'FedEx Standard' },
  { lDeliveryMethodKey: 2, sDeliveryMethodDesc: 'FedEx Priority Overnight', sDeliveryDesc: 'FedEx Priority Overnight' },
  { lDeliveryMethodKey: 3, sDeliveryMethodDesc: 'UPS Ground', sDeliveryDesc: 'UPS Ground' },
  { lDeliveryMethodKey: 4, sDeliveryMethodDesc: 'TSI Courier', sDeliveryDesc: 'TSI Courier' },
  { lDeliveryMethodKey: 5, sDeliveryMethodDesc: 'Client Pickup', sDeliveryDesc: 'Client Pickup' },
]);

// ── Patient Safety Levels ───────────────────────────────
MockDB.seed('patientSafetyLevels', [
  { lPatientSafetyLevelKey: 1, sPatientSafetyLevelDesc: 'Level 1 — Low Risk' },
  { lPatientSafetyLevelKey: 2, sPatientSafetyLevelDesc: 'Level 2 — Moderate Risk' },
  { lPatientSafetyLevelKey: 3, sPatientSafetyLevelDesc: 'Level 3 — High Risk' },
]);

// ── Task Statuses & Priorities ──────────────────────────
MockDB.seed('taskStatuses', [
  { lTaskStatusKey: 1, sTaskStatusDesc: 'Open' },
  { lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress' },
  { lTaskStatusKey: 3, sTaskStatusDesc: 'Completed' },
  { lTaskStatusKey: 4, sTaskStatusDesc: 'Cancelled' },
]);
MockDB.seed('taskPriorities', [
  { lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low' },
  { lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal' },
  { lTaskPriorityKey: 3, sTaskPriorityDesc: 'High' },
  { lTaskPriorityKey: 4, sTaskPriorityDesc: 'Urgent' },
]);
MockDB.seed('taskTypes', [
  { lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up' },
  { lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner' },
  { lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order' },
  { lTaskTypeKey: 4, sTaskTypeDesc: 'Callback' },
  { lTaskTypeKey: 5, sTaskTypeDesc: 'Quote' },
]);

// ── Contract Types ──────────────────────────────────────
MockDB.seed('contractTypes', [
  { lContractTypeKey: 1, sContractTypeName: 'CPO' },
  { lContractTypeKey: 2, sContractTypeName: 'Fuse' },
  { lContractTypeKey: 3, sContractTypeName: 'Capitated Service' },
  { lContractTypeKey: 4, sContractTypeName: 'Shared Risk' },
  { lContractTypeKey: 5, sContractTypeName: 'Cart' },
  { lContractTypeKey: 6, sContractTypeName: 'Airway' },
  { lContractTypeKey: 7, sContractTypeName: 'Rental' },
]);

// ── Users (mock login user) ────────────────────────────
MockDB.seed('users', [
  { lUserKey: 2, sFirstName: 'Joseph', sLastName: 'Brassell', sEmailAddress: 'joe@tsi.com', bActive: true, lSalesRepKey: 1, bIsAdmin: true },
  { lUserKey: 3, sFirstName: 'Admin', sLastName: 'User', sEmailAddress: 'admin@tsi.com', bActive: true, lSalesRepKey: 0, bIsAdmin: true },
]);

// ── GL Accounts ─────────────────────────────────────────
MockDB.seed('glAccounts', [
  { lGLAccountKey: 1, sAccountNumber: '1000', sAccountName: 'Cash', sType: 'Asset', sDescription: 'Operating cash account' },
  { lGLAccountKey: 2, sAccountNumber: '1200', sAccountName: 'Accounts Receivable', sType: 'Asset', sDescription: 'Trade receivables' },
  { lGLAccountKey: 3, sAccountNumber: '4000', sAccountName: 'Repair Revenue', sType: 'Revenue', sDescription: 'Income from repair services' },
  { lGLAccountKey: 4, sAccountNumber: '4100', sAccountName: 'Product Sales Revenue', sType: 'Revenue', sDescription: 'Income from product sales' },
  { lGLAccountKey: 5, sAccountNumber: '5000', sAccountName: 'Cost of Goods Sold', sType: 'Expense', sDescription: 'Parts and materials' },
]);

console.log('[MockDB] Phase 2 seeded: ' +
  MockDB.getAll('clients').length + ' clients, ' +
  MockDB.getAll('departments').length + ' depts, ' +
  MockDB.getAll('scopes').length + ' scopes, ' +
  MockDB.getAll('scopeTypes').length + ' scope types, ' +
  MockDB.getAll('contacts').length + ' contacts'
);

// ═══════════════════════════════════════════════════════
//  PHASE 3: Repairs, Inventory, Financial, Suppliers
// ═══════════════════════════════════════════════════════

// ── Repairs (8 — matching dashboard demo data) ─────────
MockDB.seed('repairs', [
  { lRepairKey: 6601, lScopeKey: 1017, lDepartmentKey: 12, sWorkOrderNumber: 'NR26006601',
    sSerialNumber: '3801442', sScopeTypeDesc: 'GIF-H190', sClientName1: 'Tift Regional Medical Center', sDepartmentName: 'Endoscopy',
    sShipName1: 'Tift Regional Medical Center', sShipName2: 'Endoscopy', sBillName1: 'Tift Regional Medical Center',
    sManufacturer: 'Olympus', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Fluid invasion — distal end. Parts ordered from Olympus. ETA 03/12.',
    dtDateIn: '2026-03-05T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-06T00:00:00', dtReqSent: '2026-03-05T00:00:00',
    EstDelDate: '2026-03-14T00:00:00', DaysLastIn: 3,
    lRepairStatusID: 4, sRepairStatus: 'In Repair', ProgBarStatus: 'In Repair',
    Approved: 485, dblAmtRepair: 650, sInvoiceNumber: '',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Fluid invasion — distal end. Parts ordered from Olympus. ETA 03/12.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.9',
    lRepairReasonKey: 1, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0412' },

  { lRepairKey: 6587, lScopeKey: 1018, lDepartmentKey: 15, sWorkOrderNumber: 'NR26006587',
    sSerialNumber: '2918371', sScopeTypeDesc: 'CF-H185L', sClientName1: 'Nashville General Hospital', sDepartmentName: 'GI Lab',
    sShipName1: 'Nashville General Hospital', sShipName2: 'GI Lab', sBillName1: 'Nashville General Hospital',
    sManufacturer: 'Olympus', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Angulation cable failure. Quote sent 03/05. Awaiting PO from client.',
    dtDateIn: '2026-03-04T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: '2026-03-05T00:00:00',
    EstDelDate: null, DaysLastIn: 4,
    lRepairStatusID: 3, sRepairStatus: 'Waiting for Approval', ProgBarStatus: 'Waiting for Approval',
    Approved: 0, dblAmtRepair: 1250, sInvoiceNumber: '',
    ResponsibleTech: '', lTechnicianKey: 0, Note: 'Angulation cable failure. Quote sent 03/05. Awaiting PO from client.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 2, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '' },

  { lRepairKey: 6574, lScopeKey: 1019, lDepartmentKey: 10, sWorkOrderNumber: 'NR26006574',
    sSerialNumber: '3912087', sScopeTypeDesc: 'CF-HQ190L', sClientName1: '88th Medical Group', sDepartmentName: 'Biomedical Engineering',
    sShipName1: '88th Medical Group', sShipName2: 'Biomedical Engineering', sBillName1: '88th Medical Group',
    sManufacturer: 'Olympus', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Insertion tube kink damage. Mid-level repair in progress.',
    dtDateIn: '2026-03-03T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-04T00:00:00', dtReqSent: '2026-03-03T00:00:00',
    EstDelDate: '2026-03-15T00:00:00', DaysLastIn: 5,
    lRepairStatusID: 4, sRepairStatus: 'In Repair', ProgBarStatus: 'In Repair',
    Approved: 480, dblAmtRepair: 480, sInvoiceNumber: '',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Insertion tube kink damage. Mid-level repair in progress.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 3, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0398' },

  { lRepairKey: 6541, lScopeKey: 1020, lDepartmentKey: 22, sWorkOrderNumber: 'NR26006541',
    sSerialNumber: '3615290', sScopeTypeDesc: 'BF-UC180F', sClientName1: 'Metro Health Hospital', sDepartmentName: 'Sterile Processing',
    sShipName1: 'Metro Health Hospital', sShipName2: 'Sterile Processing', sBillName1: 'Metro Health Hospital',
    sManufacturer: 'Olympus', sScopeCategory: 'Bronchoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'CCD chip — no image. Part backordered.',
    dtDateIn: '2026-03-01T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: null,
    EstDelDate: null, DaysLastIn: 7,
    lRepairStatusID: 5, sRepairStatus: 'On Hold', ProgBarStatus: 'On Hold',
    Approved: 0, dblAmtRepair: 895, sInvoiceNumber: '',
    ResponsibleTech: '', lTechnicianKey: 0, Note: 'CCD chip — no image. Part backordered.',
    bHotList: true, IsCogentix: 0, VendorKey: 0, Diameter: '6.9',
    lRepairReasonKey: 4, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '' },

  { lRepairKey: 6530, lScopeKey: 1021, lDepartmentKey: 19, sWorkOrderNumber: 'NR26006530',
    sSerialNumber: '4450188', sScopeTypeDesc: 'EG-760Z', sClientName1: 'Northside Hospital', sDepartmentName: 'Surgery',
    sShipName1: 'Northside Hospital', sShipName2: 'Surgery', sBillName1: 'Northside Hospital',
    sManufacturer: 'Fujifilm', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Universal cord leak. Major repair.',
    dtDateIn: '2026-02-28T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-01T00:00:00', dtReqSent: '2026-02-28T00:00:00',
    EstDelDate: '2026-03-12T00:00:00', DaysLastIn: 8,
    lRepairStatusID: 4, sRepairStatus: 'In Repair', ProgBarStatus: 'In Repair',
    Approved: 640, dblAmtRepair: 640, sInvoiceNumber: '',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Universal cord leak. Major repair.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.9',
    lRepairReasonKey: 6, lRepairLevelKey: 3, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: 'PO-2026-0380' },

  { lRepairKey: 6445, lScopeKey: 1022, lDepartmentKey: 23, sWorkOrderNumber: 'NR26006445',
    sSerialNumber: '3290118', sScopeTypeDesc: 'CF-H185L', sClientName1: 'West Bozeman Surgery Center', sDepartmentName: 'Endoscopy',
    sShipName1: 'West Bozeman Surgery Center', sShipName2: 'Endoscopy', sBillName1: 'West Bozeman Surgery Center',
    sManufacturer: 'Olympus', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Suction cylinder repair. QC complete.',
    dtDateIn: '2026-02-20T00:00:00', dtDateOut: null, dtAprRecvd: '2026-02-21T00:00:00', dtReqSent: '2026-02-20T00:00:00',
    EstDelDate: '2026-03-07T00:00:00', DaysLastIn: 16,
    lRepairStatusID: 7, sRepairStatus: 'Ready to Ship', ProgBarStatus: 'Ready to Ship',
    Approved: 380, dblAmtRepair: 380, sInvoiceNumber: 'INV-26-0455',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Suction cylinder repair. QC complete.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 7, lRepairLevelKey: 1, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0355' },

  { lRepairKey: 6398, lScopeKey: 1018, lDepartmentKey: 15, sWorkOrderNumber: 'NR26006398',
    sSerialNumber: '2918371', sScopeTypeDesc: 'CF-H185L', sClientName1: 'Nashville General Hospital', sDepartmentName: 'GI Lab',
    sShipName1: 'Nashville General Hospital', sShipName2: 'GI Lab', sBillName1: 'Nashville General Hospital',
    sManufacturer: 'Olympus', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Repair complete. Shipped via FedEx.',
    dtDateIn: '2026-02-14T00:00:00', dtDateOut: '2026-03-04T00:00:00', dtAprRecvd: '2026-02-16T00:00:00', dtReqSent: '2026-02-14T00:00:00',
    EstDelDate: '2026-03-05T00:00:00', DaysLastIn: 22,
    lRepairStatusID: 8, sRepairStatus: 'Shipped', ProgBarStatus: 'Shipped',
    Approved: 620, dblAmtRepair: 620, sInvoiceNumber: 'INV-26-0430',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Repair complete. Shipped via FedEx.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 3, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0341' },

  { lRepairKey: 6110, lScopeKey: 1023, lDepartmentKey: 20, sWorkOrderNumber: 'NR26006110',
    sSerialNumber: '3290405', sScopeTypeDesc: 'GIF-Q165', sClientName1: 'Coliseum Medical Center', sDepartmentName: 'GI Lab',
    sShipName1: 'Coliseum Medical Center', sShipName2: 'GI Lab', sBillName1: 'Coliseum Medical Center',
    sManufacturer: 'Olympus', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Client requested hold.',
    dtDateIn: '2026-01-10T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: null,
    EstDelDate: null, DaysLastIn: 57,
    lRepairStatusID: 5, sRepairStatus: 'On Hold', ProgBarStatus: 'On Hold',
    Approved: 0, dblAmtRepair: 1800, sInvoiceNumber: '',
    ResponsibleTech: '', lTechnicianKey: 0, Note: 'Client requested hold.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.2',
    lRepairReasonKey: 10, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '' },
]);

// ── Repair Items (catalog entries) ──────────────────────
MockDB.seed('repairItems', [
  { lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 3, nUnitCost: 85.00, bActive: true, lRepairLevelKey: 2 },
  { lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', sRigidOrFlexible: 'F', sPartOrLabor: 'L', nTurnAroundTime: 4, nUnitCost: 120.00, bActive: true, lRepairLevelKey: 2 },
  { lRepairItemKey: 3, sItemDescription: 'Insertion Tube Replacement', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 5, nUnitCost: 350.00, bActive: true, lRepairLevelKey: 3 },
  { lRepairItemKey: 4, sItemDescription: 'CCD Chip Replacement', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 7, nUnitCost: 450.00, bActive: true, lRepairLevelKey: 3 },
  { lRepairItemKey: 5, sItemDescription: 'Light Guide Bundle', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 3, nUnitCost: 150.00, bActive: true, lRepairLevelKey: 2 },
  { lRepairItemKey: 6, sItemDescription: 'Universal Cord Repair', sRigidOrFlexible: 'F', sPartOrLabor: 'L', nTurnAroundTime: 4, nUnitCost: 200.00, bActive: true, lRepairLevelKey: 3 },
  { lRepairItemKey: 7, sItemDescription: 'Suction Cylinder', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 2, nUnitCost: 60.00, bActive: true, lRepairLevelKey: 1 },
  { lRepairItemKey: 8, sItemDescription: 'Biopsy Channel Repair', sRigidOrFlexible: 'F', sPartOrLabor: 'L', nTurnAroundTime: 3, nUnitCost: 95.00, bActive: true, lRepairLevelKey: 2 },
  { lRepairItemKey: 9, sItemDescription: 'Lens Replacement (Rigid)', sRigidOrFlexible: 'R', sPartOrLabor: 'P', nTurnAroundTime: 5, nUnitCost: 280.00, bActive: true, lRepairLevelKey: 3 },
  { lRepairItemKey: 10, sItemDescription: 'Rod Lens Realignment', sRigidOrFlexible: 'R', sPartOrLabor: 'L', nTurnAroundTime: 3, nUnitCost: 180.00, bActive: true, lRepairLevelKey: 2 },
  { lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', sRigidOrFlexible: 'F', sPartOrLabor: 'P', nTurnAroundTime: 1, nUnitCost: 40.00, bActive: true, lRepairLevelKey: 1 },
  { lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', sRigidOrFlexible: 'F', sPartOrLabor: 'L', nTurnAroundTime: 1, nUnitCost: 75.00, bActive: true, lRepairLevelKey: 1 },
]);

// ── Repair Details (line items per repair) ──────────────
MockDB.seed('repairDetails', [
  // Repair 6601: Fluid invasion
  { lRepairItemTranKey: 5001, lRepairKey: 6601, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5002, lRepairKey: 6601, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 285.00, dblRepairPrice: 285.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5003, lRepairKey: 6601, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6587: Angulation cable
  { lRepairItemTranKey: 5004, lRepairKey: 6587, lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', nRepairPrice: 850.00, dblRepairPrice: 850.00, sApproved: 'P', bPrimary: true, mComment: 'Both up/down cables' },
  { lRepairItemTranKey: 5005, lRepairKey: 6587, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6574: Insertion tube
  { lRepairItemTranKey: 5006, lRepairKey: 6574, lRepairItemKey: 3, sItemDescription: 'Insertion Tube Replacement', nRepairPrice: 480.00, dblRepairPrice: 480.00, sApproved: 'Y', bPrimary: true, mComment: 'Kink at 60cm mark' },
  // Repair 6530: Universal cord
  { lRepairItemTranKey: 5007, lRepairKey: 6530, lRepairItemKey: 6, sItemDescription: 'Universal Cord Repair', nRepairPrice: 640.00, dblRepairPrice: 640.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  // Repair 6445: Suction cylinder
  { lRepairItemTranKey: 5008, lRepairKey: 6445, lRepairItemKey: 7, sItemDescription: 'Suction Cylinder', nRepairPrice: 380.00, dblRepairPrice: 380.00, sApproved: 'Y', bPrimary: true, mComment: '' },
]);

// ── Repair Inventory (parts consumed per repair) ───────
MockDB.seed('repairInventory', [
  // Repair 6601 — Fluid invasion / distal rebuild
  { lRepairInventoryKey: 1, lRepairKey: 6601, lRepairItemTranKey: 1001, sRepairItemDesc: 'CCD Replacement (GIF-H190)', lInventoryKey: 5, sItemDescription: 'CCD Assembly', sSizeName: 'GIF-H190 CCD', sLotNumber: 'LOT-2026-0089', nQuantity: 1 },
  { lRepairInventoryKey: 2, lRepairKey: 6601, lRepairItemTranKey: 1002, sRepairItemDesc: 'Bending Section — Distal End Rebuild', lInventoryKey: 4, sItemDescription: 'Bending Section Mesh', sSizeName: '9.8mm', sLotNumber: 'LOT-2026-0112', nQuantity: 2 },
  { lRepairInventoryKey: 3, lRepairKey: 6601, lRepairItemTranKey: 1003, sRepairItemDesc: 'Water Resistance Cap Replacement', lInventoryKey: 6, sItemDescription: 'Control Body O-Ring Kit', sSizeName: 'Olympus Standard', sLotNumber: 'LOT-2025-0847', nQuantity: 1 },
  { lRepairInventoryKey: 4, lRepairKey: 6601, lRepairItemTranKey: 1004, sRepairItemDesc: 'Epoxy Application — Standard', lInventoryKey: 8, sItemDescription: 'Epoxy Resin', sSizeName: '3M DP125 Gray', sLotNumber: 'LOT-2026-0034', nQuantity: 1 },
  { lRepairInventoryKey: 5, lRepairKey: 6601, lRepairItemTranKey: 1004, sRepairItemDesc: 'Epoxy Application — Standard', lInventoryKey: 8, sItemDescription: 'Epoxy Resin', sSizeName: 'Araldite 2014 50ml cartridge', sLotNumber: 'LOT-2026-0035', nQuantity: 1 },
  { lRepairInventoryKey: 6, lRepairKey: 6601, lRepairItemTranKey: 1002, sRepairItemDesc: 'Bending Section — Distal End Rebuild', lInventoryKey: 6, sItemDescription: 'Control Body O-Ring Kit', sSizeName: 'Olympus Standard', sLotNumber: 'LOT-2026-0091', nQuantity: 3 },
  { lRepairInventoryKey: 7, lRepairKey: 6601, lRepairItemTranKey: 1007, sRepairItemDesc: 'Angulation Calibration & Adjustment', lInventoryKey: 3, sItemDescription: 'Angulation Wire Assembly', sSizeName: 'GIF-H180/190 Up', sLotNumber: 'LOT-2025-0723', nQuantity: 1 },
]);

// ── Contracts (12 — matching contracts.html demo) ───────
MockDB.seed('contracts', [
  { lContractKey: 9022, sContractName1: '88th Medical Group - Capitated', lClientKey: 3502, sClientName1: '88th Medical Group', sContractType: 'CPO', sContractStatus: 'Active', dtDateEffective: '2025-11-14T00:00:00', dtDateTermination: '2026-11-14T00:00:00', dblAmtTotal: 22400, sSalesRepName: 'J. Miller', sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-1184', sPaymentTerms: 'Net 30' },
  { lContractKey: 8841, sContractName1: 'Halifax Medical - Preventive Maint', lClientKey: 0, sClientName1: 'Halifax Medical', sContractType: 'Fuse', sContractStatus: 'Active', dtDateEffective: '2025-08-22T00:00:00', dtDateTermination: '2026-08-22T00:00:00', dblAmtTotal: 14500, sSalesRepName: 'R. Thompson', sInvoiceFrequency: 'Annual' },
  { lContractKey: 7720, sContractName1: 'Wills Eye - Full Service (Rigid)', lClientKey: 0, sClientName1: 'Wills Eye Hospital', sContractType: 'CPO', sContractStatus: 'Expired', dtDateEffective: '2025-01-15T00:00:00', dtDateTermination: '2026-01-15T00:00:00', dblAmtTotal: 9800, sSalesRepName: 'S. Chen', sInvoiceFrequency: 'Monthly' },
  { lContractKey: 9105, sContractName1: 'Tift Regional - Flexible Service', lClientKey: 1084, sClientName1: 'Tift Regional Medical', sContractType: 'Capitated Service', sContractStatus: 'Active', dtDateEffective: '2025-12-31T00:00:00', dtDateTermination: '2026-12-31T00:00:00', dblAmtTotal: 31000, sSalesRepName: 'J. Miller', sInvoiceFrequency: 'Quarterly' },
  { lContractKey: 9110, sContractName1: 'Memorial Health - Cart Service', lClientKey: 0, sClientName1: 'Memorial Health System', sContractType: 'Cart', sContractStatus: 'Active', dtDateEffective: '2026-03-31T00:00:00', dtDateTermination: '2027-03-31T00:00:00', dblAmtTotal: 18750, sSalesRepName: 'K. Davis', sInvoiceFrequency: 'Annual' },
  { lContractKey: 8990, sContractName1: "St. Luke's - Airway Mgmt", lClientKey: 0, sClientName1: "St. Luke's University", sContractType: 'Airway', sContractStatus: 'Active', dtDateEffective: '2025-06-30T00:00:00', dtDateTermination: '2026-06-30T00:00:00', dblAmtTotal: 8200, sSalesRepName: 'R. Thompson', sInvoiceFrequency: 'Quarterly' },
  { lContractKey: 9045, sContractName1: 'Christiana Care - Shared Risk', lClientKey: 0, sClientName1: 'Christiana Care Health', sContractType: 'Shared Risk', sContractStatus: 'Active', dtDateEffective: '2025-09-15T00:00:00', dtDateTermination: '2026-09-15T00:00:00', dblAmtTotal: 42000, sSalesRepName: 'J. Miller', sInvoiceFrequency: 'Monthly' },
  { lContractKey: 8875, sContractName1: 'Lehigh Valley - Rental Fleet', lClientKey: 0, sClientName1: 'Lehigh Valley Health', sContractType: 'Rental', sContractStatus: 'Active', dtDateEffective: '2025-04-20T00:00:00', dtDateTermination: '2026-04-20T00:00:00', dblAmtTotal: 11600, sSalesRepName: 'S. Chen', sInvoiceFrequency: 'Monthly' },
  { lContractKey: 7680, sContractName1: 'Coliseum - Capitated (Expired)', lClientKey: 0, sClientName1: 'Coliseum Medical Center', sContractType: 'CPO', sContractStatus: 'Expired', dtDateEffective: '2024-12-01T00:00:00', dtDateTermination: '2025-12-01T00:00:00', dblAmtTotal: 27500, sSalesRepName: 'K. Davis', sInvoiceFrequency: 'Annual' },
  { lContractKey: 9088, sContractName1: 'Geisinger - Comprehensive Svc', lClientKey: 0, sClientName1: 'Geisinger Health', sContractType: 'Fuse', sContractStatus: 'Active', dtDateEffective: '2025-10-01T00:00:00', dtDateTermination: '2026-10-01T00:00:00', dblAmtTotal: 38200, sSalesRepName: 'J. Miller', sInvoiceFrequency: 'Quarterly' },
  { lContractKey: 9120, sContractName1: 'HCA Florida - Flex PM', lClientKey: 0, sClientName1: 'HCA Florida', sContractType: 'Capitated Service', sContractStatus: 'Active', dtDateEffective: '2026-02-28T00:00:00', dtDateTermination: '2027-02-28T00:00:00', dblAmtTotal: 15400, sSalesRepName: 'R. Thompson', sInvoiceFrequency: 'Annual' },
  { lContractKey: 8950, sContractName1: 'Bayhealth - Full Service', lClientKey: 0, sClientName1: 'Bayhealth Medical', sContractType: 'CPO', sContractStatus: 'Expiring', dtDateEffective: '2025-04-15T00:00:00', dtDateTermination: '2026-04-15T00:00:00', dblAmtTotal: 19800, sSalesRepName: 'S. Chen', sInvoiceFrequency: 'Quarterly' },
]);

// ── Pending Contracts ───────────────────────────────────
MockDB.seed('pendingContracts', [
  { lPendingContractKey: 1, sContractType: 'Fuse', sContractName1: 'Regional Medical - Full Service 2026', sClientName1: 'Regional Medical Center', sSalesRepName: 'R. Thompson', dtCreated: '2026-03-02T00:00:00', sContractStatus: 'Pending' },
  { lPendingContractKey: 2, sContractType: 'CPO', sContractName1: "St. Mary's Hospital - Capitated", sClientName1: "St. Mary's Hospital", sSalesRepName: 'J. Miller', dtCreated: '2026-02-28T00:00:00', sContractStatus: 'Pending' },
  { lPendingContractKey: 3, sContractType: 'Shared Risk', sContractName1: 'Valley Health - Shared Risk Pilot', sClientName1: 'Valley Health System', sSalesRepName: 'S. Chen', dtCreated: '2026-02-15T00:00:00', sContractStatus: 'Pending' },
]);

// ── Suppliers ───────────────────────────────────────────
MockDB.seed('suppliers', [
  { lSupplierKey: 1, sSupplierName: 'Olympus America', sAddress1: '3500 Corporate Pkwy', sCity: 'Center Valley', sState: 'PA', sZip: '18034', sPhoneNumber: '(800) 848-9024', bActive: true, lSupplierRoleKey: 1, bPartsVendor: true, bRepairVendor: true, bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 2, sSupplierName: 'Fujifilm Medical', sAddress1: '47 Hulfish St', sCity: 'Princeton', sState: 'NJ', sZip: '08542', sPhoneNumber: '(800) 431-1850', bActive: true, lSupplierRoleKey: 1, bPartsVendor: true, bRepairVendor: true, bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 3, sSupplierName: 'Karl Storz Endoscopy', sAddress1: '2151 E Grand Ave', sCity: 'El Segundo', sState: 'CA', sZip: '90245', sPhoneNumber: '(800) 421-0837', bActive: true, lSupplierRoleKey: 1, bPartsVendor: true, bRepairVendor: true, bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 4, sSupplierName: 'Stryker Medical', sAddress1: '1941 Stryker Way', sCity: 'Portage', sState: 'MI', sZip: '49002', sPhoneNumber: '(800) 253-3210', bActive: true, lSupplierRoleKey: 1, bPartsVendor: true, bRepairVendor: false, bAcquisitionVendor: true, bCartsVendor: true },
  { lSupplierKey: 5, sSupplierName: 'MCE Parts & Supply', sAddress1: '100 Industrial Blvd', sCity: 'Nashville', sState: 'TN', sZip: '37210', sPhoneNumber: '(615) 555-0101', bActive: true, lSupplierRoleKey: 2, bPartsVendor: true, bRepairVendor: false, bAcquisitionVendor: false, bCartsVendor: false },
]);

MockDB.seed('supplierPOTypes', [
  { lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard' },
  { lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush' },
  { lSupplierPOTypeKey: 3, sSupplierPOTypeName: 'Blanket' },
]);

// ── Inventory (10 items with sizes) ─────────────────────
MockDB.seed('inventory', [
  { lInventoryKey: 1, sItemDescription: 'Achromat Lens Assembly', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 2, sItemDescription: 'Adapter / Coupler', sRigidOrFlexible: 'R', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 3, sItemDescription: 'Angulation Wire Assembly', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 4, sItemDescription: 'Bending Section Mesh', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 5, sItemDescription: 'CCD Assembly', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: true, bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 6, sItemDescription: 'Control Body O-Ring Kit', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 7, sItemDescription: 'Distal Tip Cover', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true, bSkipPickList: false },
  { lInventoryKey: 8, sItemDescription: 'Epoxy Resin', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true, bLargeDiameter: true, bSkipPickList: true },
  { lInventoryKey: 9, sItemDescription: 'Fiber Optic Bundle', sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 10, sItemDescription: 'Rod Lens (Rigid)', sRigidOrFlexible: 'R', bActive: true, bNoCountAdjustment: true, bAlwaysReOrder: false, bLargeDiameter: true, bSkipPickList: false },
]);

MockDB.seed('inventorySizes', [
  // Achromat Lens Assembly
  { lInventorySizeKey: 101, lInventoryKey: 1, sSizeName: 'DUR-B', sBinLocation: 'A-12', nUnitCost: 0.10, nLevelCurrent: 42, nLevelMinimum: 5, nLevelMaximum: 100, nReorderPoint: 10, bActive: true },
  { lInventorySizeKey: 102, lInventoryKey: 1, sSizeName: '2.70 x 3.55 w/stop', sBinLocation: 'A-13', nUnitCost: 0.35, nLevelCurrent: 18, nLevelMinimum: 3, nLevelMaximum: 50, nReorderPoint: 8, bActive: true },
  // Adapter / Coupler
  { lInventorySizeKey: 103, lInventoryKey: 2, sSizeName: 'AC-100 Universal', sBinLocation: 'D-01', nUnitCost: 12.50, nLevelCurrent: 8, nLevelMinimum: 2, nLevelMaximum: 20, nReorderPoint: 4, bActive: true },
  // Angulation Wire Assembly
  { lInventorySizeKey: 104, lInventoryKey: 3, sSizeName: 'GIF-H180/190 Up', sBinLocation: 'B-05', nUnitCost: 25.00, nLevelCurrent: 12, nLevelMinimum: 4, nLevelMaximum: 30, nReorderPoint: 8, bActive: true },
  { lInventorySizeKey: 105, lInventoryKey: 3, sSizeName: 'GIF-H180/190 Down', sBinLocation: 'B-06', nUnitCost: 25.00, nLevelCurrent: 10, nLevelMinimum: 4, nLevelMaximum: 30, nReorderPoint: 8, bActive: true },
  { lInventorySizeKey: 106, lInventoryKey: 3, sSizeName: 'CF-HQ190L Up/Down', sBinLocation: 'B-07', nUnitCost: 30.00, nLevelCurrent: 6, nLevelMinimum: 2, nLevelMaximum: 20, nReorderPoint: 5, bActive: true },
  // CCD Assembly
  { lInventorySizeKey: 107, lInventoryKey: 5, sSizeName: 'GIF-H190 CCD', sBinLocation: 'C-01', nUnitCost: 350.00, nLevelCurrent: 3, nLevelMinimum: 1, nLevelMaximum: 5, nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 108, lInventoryKey: 5, sSizeName: 'CF-HQ190L CCD', sBinLocation: 'C-02', nUnitCost: 380.00, nLevelCurrent: 2, nLevelMinimum: 1, nLevelMaximum: 5, nReorderPoint: 2, bActive: true },
  // Control Body O-Ring Kit
  { lInventorySizeKey: 109, lInventoryKey: 6, sSizeName: 'Olympus Standard', sBinLocation: 'A-20', nUnitCost: 5.00, nLevelCurrent: 50, nLevelMinimum: 10, nLevelMaximum: 100, nReorderPoint: 20, bActive: true },
  // Distal Tip Cover
  { lInventorySizeKey: 110, lInventoryKey: 7, sSizeName: 'GIF/CF Large', sBinLocation: 'A-25', nUnitCost: 15.00, nLevelCurrent: 22, nLevelMinimum: 5, nLevelMaximum: 40, nReorderPoint: 10, bActive: true },
  { lInventorySizeKey: 111, lInventoryKey: 7, sSizeName: 'BF Small', sBinLocation: 'A-26', nUnitCost: 12.00, nLevelCurrent: 15, nLevelMinimum: 3, nLevelMaximum: 30, nReorderPoint: 8, bActive: true },
  // Fiber Optic Bundle
  { lInventorySizeKey: 112, lInventoryKey: 9, sSizeName: 'GIF-H190 Light Guide', sBinLocation: 'C-10', nUnitCost: 120.00, nLevelCurrent: 4, nLevelMinimum: 2, nLevelMaximum: 8, nReorderPoint: 3, bActive: true },
  // Rod Lens
  { lInventorySizeKey: 113, lInventoryKey: 10, sSizeName: '4mm 0° Storz', sBinLocation: 'E-01', nUnitCost: 200.00, nLevelCurrent: 3, nLevelMinimum: 1, nLevelMaximum: 6, nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 114, lInventoryKey: 10, sSizeName: '4mm 30° Storz', sBinLocation: 'E-02', nUnitCost: 210.00, nLevelCurrent: 2, nLevelMinimum: 1, nLevelMaximum: 6, nReorderPoint: 2, bActive: true },
]);

// ── Financial: Outstanding Invoices ─────────────────────
MockDB.seed('invoices', [
  { lInvoiceKey: 284, sInvoiceNumber: 'INV-2026-0284', sClientName1: '88th Medical Group', dblAmount: 2840, dtIssuedDate: '2026-02-25T00:00:00', dtDueDate: '2026-03-25T00:00:00', sStatus: 'Unpaid' },
  { lInvoiceKey: 271, sInvoiceNumber: 'INV-2026-0271', sClientName1: 'Tift Regional Medical Center', dblAmount: 5120, dtIssuedDate: '2026-02-18T00:00:00', dtDueDate: '2026-03-18T00:00:00', sStatus: 'Unpaid' },
  { lInvoiceKey: 258, sInvoiceNumber: 'INV-2026-0258', sClientName1: 'Nashville General Hospital', dblAmount: 3650, dtIssuedDate: '2026-02-10T00:00:00', dtDueDate: '2026-03-10T00:00:00', sStatus: 'Partial' },
  { lInvoiceKey: 241, sInvoiceNumber: 'INV-2026-0241', sClientName1: 'West Side GI Center', dblAmount: 9300, dtIssuedDate: '2026-01-31T00:00:00', dtDueDate: '2026-03-01T00:00:00', sStatus: 'Overdue' },
  { lInvoiceKey: 229, sInvoiceNumber: 'INV-2026-0229', sClientName1: 'Northside Hospital', dblAmount: 4480, dtIssuedDate: '2026-01-22T00:00:00', dtDueDate: '2026-02-21T00:00:00', sStatus: 'Paid' },
  { lInvoiceKey: 215, sInvoiceNumber: 'INV-2026-0215', sClientName1: 'Metro Health Hospital', dblAmount: 2100, dtIssuedDate: '2026-01-15T00:00:00', dtDueDate: '2026-02-14T00:00:00', sStatus: 'Paid' },
  { lInvoiceKey: 198, sInvoiceNumber: 'INV-2026-0198', sClientName1: 'Shreveport Endoscopy Center', dblAmount: 1750, dtIssuedDate: '2026-01-08T00:00:00', dtDueDate: '2026-02-07T00:00:00', sStatus: 'Overdue' },
]);

MockDB.seed('draftInvoices', [
  { lInvoiceKey: 50, sInvoiceNumber: 'DRF-2026-0050', sClientName1: '88th Medical Group', dblAmount: 1200, dtCreatedDate: '2026-03-05T00:00:00', sStatus: 'Draft' },
  { lInvoiceKey: 49, sInvoiceNumber: 'DRF-2026-0049', sClientName1: 'Nashville General Hospital', dblAmount: 3400, dtCreatedDate: '2026-03-02T00:00:00', sStatus: 'Draft' },
]);

MockDB.seed('clientsOnHold', [
  { lClientKey: 3341, sClientName1: 'West Side GI Center', sDepartmentName: 'Endoscopy', dtOnHoldDate: '2026-02-15T00:00:00', sReason: 'Past due > 60 days' },
  { lClientKey: 1650, sClientName1: 'Shreveport Endoscopy Center', sDepartmentName: 'GI Lab', dtOnHoldDate: '2026-01-20T00:00:00', sReason: 'Billing dispute' },
]);

MockDB.seed('invoicePayments', [
  { lInvoicePaymentID: 10, sInvoiceNumber: 'INV-2026-0229', sClientName1: 'Northside Hospital', dblAmount: 4480, dtPaymentDate: '2026-02-20T00:00:00', sPaymentMethod: 'ACH' },
  { lInvoicePaymentID: 11, sInvoiceNumber: 'INV-2026-0215', sClientName1: 'Metro Health Hospital', dblAmount: 2100, dtPaymentDate: '2026-02-13T00:00:00', sPaymentMethod: 'Check' },
  { lInvoicePaymentID: 12, sInvoiceNumber: 'INV-2026-0258', sClientName1: 'Nashville General Hospital', dblAmount: 2000, dtPaymentDate: '2026-03-01T00:00:00', sPaymentMethod: 'ACH' },
]);

console.log('[MockDB] Phase 3 seeded: ' +
  MockDB.getAll('repairs').length + ' repairs, ' +
  MockDB.getAll('repairItems').length + ' repair items, ' +
  MockDB.getAll('contracts').length + ' contracts, ' +
  MockDB.getAll('inventory').length + ' inventory items, ' +
  MockDB.getAll('suppliers').length + ' suppliers, ' +
  MockDB.getAll('invoices').length + ' invoices'
);

// ═══════════════════════════════════════════════════════
//  PHASE 4: Loaners
// ═══════════════════════════════════════════════════════

// ── Loaner Scopes (flag existing scopes + add TSI-owned loaners) ──
(function seedLoanerScopes() {
  const scopes = MockDB.getAll('scopes');
  // Flag a few existing scopes as loaners
  [1001, 1002, 1003].forEach(key => {
    const s = scopes.find(r => r.lScopeKey === key);
    if (s) { s.bOnSiteLoaner = true; s.pbOnSiteLoaner = true; s.psLoanerRackPosition = 'A-' + (key - 1000); }
  });
  // Add TSI-owned loaner pool scopes
  const loanerPool = [
    { lScopeKey: 2001, lScopeTypeKey: 1001, sSerialNumber: 'LOAN-001', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'A-1', sScopeTypeDesc: 'Olympus GIF-H180',  sClientName1: 'Memorial Hospital',       sDepartmentName: 'Endoscopy',   lDepartmentKey: 26 },
    { lScopeKey: 2002, lScopeTypeKey: 1002, sSerialNumber: 'LOAN-002', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'A-2', sScopeTypeDesc: 'Olympus CF-HQ190',  sClientName1: 'City General Medical',    sDepartmentName: 'GI Lab',      lDepartmentKey: 12 },
    { lScopeKey: 2003, lScopeTypeKey: 1020, sSerialNumber: 'LOAN-003', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'B-1', sScopeTypeDesc: 'Olympus BF-P290',   sClientName1: 'Regional Medical Center', sDepartmentName: 'Pulmonology', lDepartmentKey: 16 },
    { lScopeKey: 2004, lScopeTypeKey: 1003, sSerialNumber: 'LOAN-004', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'C-3', sScopeTypeDesc: 'Olympus GIF-H190',  sClientName1: '',                        sDepartmentName: '',            lDepartmentKey: 0 },
    { lScopeKey: 2005, lScopeTypeKey: 1013, sSerialNumber: 'LOAN-005', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'B-4', sScopeTypeDesc: 'Olympus PCF-H190',  sClientName1: '',                        sDepartmentName: '',            lDepartmentKey: 0 },
    { lScopeKey: 2006, lScopeTypeKey: 1010, sSerialNumber: 'LOAN-006', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'D-1', sScopeTypeDesc: 'Olympus CF-HQ190L', sClientName1: '',                        sDepartmentName: '',            lDepartmentKey: 0 },
    { lScopeKey: 2007, lScopeTypeKey: 1022, sSerialNumber: 'LOAN-007', sRigidOrFlexible: 'F', sScopeIsDead: 'N', bOnSiteLoaner: true, pbOnSiteLoaner: true, psLoanerRackPosition: 'D-2', sScopeTypeDesc: 'Olympus BF-1TH190', sClientName1: '',                        sDepartmentName: '',            lDepartmentKey: 0 },
  ];
  loanerPool.forEach(s => MockDB.insert('scopes', s));
})();

// ── Task Loaners (8 records — mix of Out, Returned, Overdue) ──
MockDB.seed('taskLoaners', [
  { lTaskLoanerKey: 1, lTaskKey: 6601, sTaskNumber: 'NR26006601', lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180',  sSerialNumber: 'LOAN-001', lQuantity: 1, sDepartmentName: 'Endoscopy',   sClientName: 'Memorial Hospital',       psLoanerRackPosition: 'A-1', sStatus: 'Out',      dtLoanerOut: '2026-03-01T00:00:00', dtExpectedReturn: '2026-03-20T00:00:00', dtActualReturn: null },
  { lTaskLoanerKey: 2, lTaskKey: 6602, sTaskNumber: 'NR26006602', lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus CF-HQ190',  sSerialNumber: 'LOAN-002', lQuantity: 1, sDepartmentName: 'GI Lab',      sClientName: 'City General Medical',    psLoanerRackPosition: 'A-2', sStatus: 'Out',      dtLoanerOut: '2026-03-04T00:00:00', dtExpectedReturn: '2026-03-18T00:00:00', dtActualReturn: null },
  { lTaskLoanerKey: 3, lTaskKey: 6603, sTaskNumber: 'NR26006603', lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290',   sSerialNumber: 'LOAN-003', lQuantity: 2, sDepartmentName: 'Pulmonology', sClientName: 'Regional Medical Center', psLoanerRackPosition: 'B-1', sStatus: 'Out',      dtLoanerOut: '2026-02-20T00:00:00', dtExpectedReturn: '2026-03-10T00:00:00', dtActualReturn: null },
  { lTaskLoanerKey: 4, lTaskKey: 6604, sTaskNumber: 'NR26006604', lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190',  sSerialNumber: 'LOAN-004', lQuantity: 1, sDepartmentName: 'Endoscopy',   sClientName: 'Tift Regional Medical Center', psLoanerRackPosition: 'C-3', sStatus: 'Returned', dtLoanerOut: '2026-02-10T00:00:00', dtExpectedReturn: '2026-02-28T00:00:00', dtActualReturn: '2026-02-26T00:00:00' },
  { lTaskLoanerKey: 5, lTaskKey: 6605, sTaskNumber: 'NR26006605', lScopeTypeKey: 1013, sScopeTypeDesc: 'Olympus PCF-H190',  sSerialNumber: 'LOAN-005', lQuantity: 1, sDepartmentName: 'Surgery',     sClientName: 'Northside Hospital',      psLoanerRackPosition: 'B-4', sStatus: 'Returned', dtLoanerOut: '2026-01-15T00:00:00', dtExpectedReturn: '2026-02-15T00:00:00', dtActualReturn: '2026-02-12T00:00:00' },
  { lTaskLoanerKey: 6, lTaskKey: 6606, sTaskNumber: 'NR26006606', lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L', sSerialNumber: 'LOAN-006', lQuantity: 1, sDepartmentName: 'GI Lab',      sClientName: 'Nashville General Hospital', psLoanerRackPosition: 'D-1', sStatus: 'Out',   dtLoanerOut: '2026-02-01T00:00:00', dtExpectedReturn: '2026-02-28T00:00:00', dtActualReturn: null },
  { lTaskLoanerKey: 7, lTaskKey: 6607, sTaskNumber: 'NR26006607', lScopeTypeKey: 1022, sScopeTypeDesc: 'Olympus BF-1TH190', sSerialNumber: 'LOAN-007', lQuantity: 1, sDepartmentName: 'Pulmonology', sClientName: 'Metro Health Hospital',   psLoanerRackPosition: 'D-2', sStatus: 'Out',   dtLoanerOut: '2026-01-20T00:00:00', dtExpectedReturn: '2026-02-20T00:00:00', dtActualReturn: null },
  { lTaskLoanerKey: 8, lTaskKey: 6601, sTaskNumber: 'NR26006601', lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180',  sSerialNumber: 'LOAN-001', lQuantity: 1, sDepartmentName: 'Sterile Processing', sClientName: 'Metro Health Hospital', psLoanerRackPosition: 'A-1', sStatus: 'Returned', dtLoanerOut: '2026-01-05T00:00:00', dtExpectedReturn: '2026-01-25T00:00:00', dtActualReturn: '2026-01-22T00:00:00' },
  // Declined / Unable — models with no pool availability create demand gaps
  { lTaskLoanerKey: 9,  lTaskKey: 6608, sTaskNumber: 'NR26006608', lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V', sSerialNumber: '', lQuantity: 1, sDepartmentName: 'Endoscopy',   sClientName: 'Memorial Hospital',          psLoanerRackPosition: '', sStatus: 'Declined', dtLoanerOut: null, dtExpectedReturn: null, dtActualReturn: null },
  { lTaskLoanerKey: 10, lTaskKey: 6609, sTaskNumber: 'NR26006609', lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V', sSerialNumber: '', lQuantity: 1, sDepartmentName: 'GI Lab',      sClientName: 'Nashville General Hospital', psLoanerRackPosition: '', sStatus: 'Declined', dtLoanerOut: null, dtExpectedReturn: null, dtActualReturn: null },
  { lTaskLoanerKey: 11, lTaskKey: 6610, sTaskNumber: 'NR26006610', lScopeTypeKey: 1004, sScopeTypeDesc: 'Olympus GIF-Q165',  sSerialNumber: '', lQuantity: 1, sDepartmentName: 'Endoscopy',   sClientName: 'Coliseum Medical Center',    psLoanerRackPosition: '', sStatus: 'Unable',   dtLoanerOut: null, dtExpectedReturn: null, dtActualReturn: null },
  { lTaskLoanerKey: 12, lTaskKey: 6611, sTaskNumber: 'NR26006611', lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290',   sSerialNumber: '', lQuantity: 1, sDepartmentName: 'Pulmonology', sClientName: 'City General Medical',       psLoanerRackPosition: '', sStatus: 'Unable',   dtLoanerOut: null, dtExpectedReturn: null, dtActualReturn: null },
]);

console.log('[MockDB] Phase 4 seeded: ' +
  MockDB.getAll('taskLoaners').length + ' task loaners, ' +
  MockDB.getAll('scopes').filter(s => s.pbOnSiteLoaner || s.bOnSiteLoaner).length + ' loaner scopes'
);
