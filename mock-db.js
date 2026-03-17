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
    companies:          'lCompanyKey',
    deliveryMethods:    'lDeliveryMethodKey',
    scopeCategories:    'lScopeCategoryKey',
    reportingGroups:    'lReportingGroupKey',
    cleaningSystems:    'lCleaningSystemKey',
    standardDepartments:'lStandardDeptKey',
    creditLimits:       'lCreditLimitKey',
    repairReasons:      'lRepairReasonKey',
    repairStatuses:     'lRepairStatusID',
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
    companies:          [],
    reportingGroups:    [],
    cleaningSystems:    [],
    standardDepartments:[],
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
  { lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt', sGreatPlainsID: 'DUEUPON', nDueDays: 0, sDueMode: 'Next Month', bDefaultForRepair: true },
  { lPaymentTermsKey: 2, sTermsDesc: 'Net 30', sGreatPlainsID: 'NET30', nDueDays: 30, sDueMode: 'Due in N Days', bDefaultForRepair: false },
  { lPaymentTermsKey: 3, sTermsDesc: 'Net 60', sGreatPlainsID: 'NET60', nDueDays: 60, sDueMode: 'Due in N Days', bDefaultForRepair: false },
  { lPaymentTermsKey: 4, sTermsDesc: 'Net 90', sGreatPlainsID: 'NET90', nDueDays: 90, sDueMode: 'Due in N Days', bDefaultForRepair: false },
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
  { lDistributorKey: 1, sDistName1: 'Total Scope South', sPhone: '615-555-0100', sFax: '615-555-0101', sContactName: 'Mike Davis', sCompanyName: 'Total Scope South LLC', bActive: true, sAddress1: '100 Commerce Way', sCity: 'Nashville', sState: 'TN', sZip: '37210' },
  { lDistributorKey: 2, sDistName1: 'Total Scope North', sPhone: '610-485-0200', sFax: '610-485-0201', sContactName: 'Sarah Kim', sCompanyName: 'Total Scope, Inc.', bActive: true, sAddress1: '200 Industrial Blvd', sCity: 'Upper Chichester', sState: 'PA', sZip: '19061' },
  { lDistributorKey: 3, sDistName1: 'Direct', sPhone: '', sFax: '', sContactName: '', sCompanyName: 'Total Scope, Inc.', bActive: true, sAddress1: '', sCity: '', sState: '', sZip: '' },
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
  { lScopeCategoryKey: 1, sScopeCategoryName: 'Gastroscope', sRigidOrFlexible: 'F', sSize: 'Large', bActive: true },
  { lScopeCategoryKey: 2, sScopeCategoryName: 'Colonoscope', sRigidOrFlexible: 'F', sSize: 'Large', bActive: true },
  { lScopeCategoryKey: 3, sScopeCategoryName: 'Bronchoscope', sRigidOrFlexible: 'F', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 4, sScopeCategoryName: 'Duodenoscope', sRigidOrFlexible: 'F', sSize: 'Large', bActive: true },
  { lScopeCategoryKey: 5, sScopeCategoryName: 'Enteroscope', sRigidOrFlexible: 'F', sSize: 'Large', bActive: true },
  { lScopeCategoryKey: 6, sScopeCategoryName: 'Cystoscope', sRigidOrFlexible: 'R', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 7, sScopeCategoryName: 'Arthroscope', sRigidOrFlexible: 'R', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 8, sScopeCategoryName: 'Laparoscope', sRigidOrFlexible: 'R', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 9, sScopeCategoryName: 'Ureteroscope', sRigidOrFlexible: 'R', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 10, sScopeCategoryName: 'Camera Head', sRigidOrFlexible: 'C', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 11, sScopeCategoryName: 'Light Source', sRigidOrFlexible: 'C', sSize: 'Large', bActive: true },
  { lScopeCategoryKey: 12, sScopeCategoryName: 'Biopsy Forceps', sRigidOrFlexible: 'I', sSize: 'Small', bActive: true },
  { lScopeCategoryKey: 13, sScopeCategoryName: 'Resectoscope', sRigidOrFlexible: 'I', sSize: 'Small', bActive: true },
]);

// ── Companies ─────────────────────────────────────────
MockDB.seed('companies', [
  { lCompanyKey: 1, sCompanyName: 'Total Scope, Inc.', sAbbreviation: 'TSI', sPhone: '610-485-0001', sFax: '610-485-0002', sPeachtreeSubId: 'TSI-001', sAddress1: '200 Industrial Blvd', sCity: 'Upper Chichester', sState: 'PA', sZip: '19061', sRemitAddress1: 'PO Box 1234', sRemitCity: 'Upper Chichester', sRemitState: 'PA', sRemitZip: '19061' },
  { lCompanyKey: 2, sCompanyName: 'Total Scope South, LLC', sAbbreviation: 'TSS', sPhone: '615-555-0100', sFax: '615-555-0101', sPeachtreeSubId: 'TSS-001', sAddress1: '100 Commerce Way', sCity: 'Nashville', sState: 'TN', sZip: '37210', sRemitAddress1: '100 Commerce Way', sRemitCity: 'Nashville', sRemitState: 'TN', sRemitZip: '37210' },
]);

// ── Reporting Groups (GPO affiliations) ───────────────
MockDB.seed('reportingGroups', [
  { lReportingGroupKey: 1, sGroupName: 'HPG', bActive: true },
  { lReportingGroupKey: 2, sGroupName: 'Healthnet', bActive: true },
  { lReportingGroupKey: 3, sGroupName: 'Novation', bActive: true },
  { lReportingGroupKey: 4, sGroupName: 'Surgical Solutions', bActive: true },
  { lReportingGroupKey: 5, sGroupName: 'Vizient', bActive: true },
  { lReportingGroupKey: 6, sGroupName: 'Vizient Carts', bActive: true },
  { lReportingGroupKey: 7, sGroupName: 'Capital L, LLC', bActive: true },
]);

// ── Cleaning Systems (Dept Profile) ───────────────────
MockDB.seed('cleaningSystems', [
  { lCleaningSystemKey: 1, sCleaningSystemName: 'Medivator', bActive: true },
  { lCleaningSystemKey: 2, sCleaningSystemName: 'Steris', bActive: true },
  { lCleaningSystemKey: 3, sCleaningSystemName: 'EvoTech', bActive: true },
]);

// ── Standard Departments (managed name list) ──────────
MockDB.seed('standardDepartments', [
  { lStandardDeptKey: 1, sStandardDeptName: 'Endoscopy', bActive: true },
  { lStandardDeptKey: 2, sStandardDeptName: 'GI Lab', bActive: true },
  { lStandardDeptKey: 3, sStandardDeptName: 'Surgery / OR', bActive: true },
  { lStandardDeptKey: 4, sStandardDeptName: 'Biomedical Engineering', bActive: true },
  { lStandardDeptKey: 5, sStandardDeptName: 'Pulmonology', bActive: true },
  { lStandardDeptKey: 6, sStandardDeptName: 'Urology', bActive: true },
  { lStandardDeptKey: 7, sStandardDeptName: 'Sterile Processing', bActive: true },
  { lStandardDeptKey: 8, sStandardDeptName: 'ICU / Critical Care', bActive: true },
  { lStandardDeptKey: 9, sStandardDeptName: 'Cardiology', bActive: true },
  { lStandardDeptKey: 10, sStandardDeptName: 'Otolaryngology', bActive: true },
  { lStandardDeptKey: 11, sStandardDeptName: 'Purchasing', bActive: true },
  { lStandardDeptKey: 12, sStandardDeptName: 'Materials Management', bActive: true },
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
  { lRepairReasonKey: 1, sRepairReasonDesc: 'Fluid Invasion', sRepairReason: 'Fluid Invasion', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 2, sRepairReasonDesc: 'Angulation Failure', sRepairReason: 'Angulation Failure', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 3, sRepairReasonDesc: 'Insertion Tube Damage', sRepairReason: 'Insertion Tube Damage', sCategory: 'Avoidable', bActive: true },
  { lRepairReasonKey: 4, sRepairReasonDesc: 'CCD/Image Failure', sRepairReason: 'CCD/Image Failure', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 5, sRepairReasonDesc: 'Light Guide Damage', sRepairReason: 'Light Guide Damage', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 6, sRepairReasonDesc: 'Universal Cord Leak', sRepairReason: 'Universal Cord Leak', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 7, sRepairReasonDesc: 'Suction Cylinder', sRepairReason: 'Suction Cylinder', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 8, sRepairReasonDesc: 'Biopsy Channel', sRepairReason: 'Biopsy Channel', sCategory: 'Normal Wear & Tear', bActive: true },
  { lRepairReasonKey: 9, sRepairReasonDesc: 'Preventive Maintenance', sRepairReason: 'Preventive Maintenance', sCategory: 'Preventive', bActive: true },
  { lRepairReasonKey: 10, sRepairReasonDesc: 'Evaluation Only', sRepairReason: 'Evaluation Only', sCategory: 'Preventive', bActive: true },
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
  { lRepairStatusID: 1, sRepairStatus: 'Received', nOrdinal: 1, bActive: true },
  { lRepairStatusID: 2, sRepairStatus: 'Evaluation', nOrdinal: 2, bActive: true },
  { lRepairStatusID: 3, sRepairStatus: 'Waiting for Approval', nOrdinal: 3, bActive: true },
  { lRepairStatusID: 4, sRepairStatus: 'In Repair', nOrdinal: 4, bActive: true },
  { lRepairStatusID: 5, sRepairStatus: 'On Hold', nOrdinal: 5, bActive: true },
  { lRepairStatusID: 6, sRepairStatus: 'Quality Check', nOrdinal: 6, bActive: true },
  { lRepairStatusID: 7, sRepairStatus: 'Ready to Ship', nOrdinal: 7, bActive: true },
  { lRepairStatusID: 8, sRepairStatus: 'Shipped', nOrdinal: 8, bActive: true },
  { lRepairStatusID: 9, sRepairStatus: 'Closed', nOrdinal: 9, bActive: true },
  { lRepairStatusID: 10, sRepairStatus: 'Cancelled', nOrdinal: 10, bActive: true },
]);

// ── Delivery Methods ────────────────────────────────────
MockDB.seed('deliveryMethods', [
  { lDeliveryMethodKey: 1, sDeliveryMethodDesc: 'FedEx Standard', sDeliveryDesc: 'FedEx Standard', nCost: 18.50, bDefaultForRepair: false, bActive: true },
  { lDeliveryMethodKey: 2, sDeliveryMethodDesc: 'FedEx Priority Overnight', sDeliveryDesc: 'FedEx Priority Overnight', nCost: 42.75, bDefaultForRepair: true, bActive: true },
  { lDeliveryMethodKey: 3, sDeliveryMethodDesc: 'UPS Ground', sDeliveryDesc: 'UPS Ground', nCost: 14.00, bDefaultForRepair: false, bActive: true },
  { lDeliveryMethodKey: 4, sDeliveryMethodDesc: 'TSI Courier', sDeliveryDesc: 'TSI Courier', nCost: 0, bDefaultForRepair: false, bActive: true },
  { lDeliveryMethodKey: 5, sDeliveryMethodDesc: 'Client Pickup', sDeliveryDesc: 'Client Pickup', nCost: 0, bDefaultForRepair: false, bActive: true },
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

// ── Repairs (20 — enriched with full field set) ─────────
MockDB.seed('repairs', [
  // ── 1. Status 4 (In Repair/Drying) — existing ──
  { lRepairKey: 6601, lScopeKey: 1017, lDepartmentKey: 12, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006601',
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
    lRepairReasonKey: 1, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 9105, sPurchaseOrder: 'PO-2026-0412',
    sContactName: 'Sarah Mitchell', sContactPhone: '(229) 382-7200', sContactEmail: 's.mitchell@tiftregional.com',
    sShipAddress: '901 East 18th Street', sShipCity: 'Tifton', sShipState: 'GA', sShipZip: '31794',
    sBillAddress: '901 East 18th Street', sBillCity: 'Tifton', sBillState: 'GA', sBillZip: '31794',
    sAngInUp: '198', sAngInDown: '92', sAngInRight: '108', sAngInLeft: '112',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.1, nOutgoingEpoxySize: null, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '4', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'A-12', sCarrierTracking: '1Z999AA10123456784', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ── 2. Status 3 (Waiting for Approval) — existing ──
  { lRepairKey: 6587, lScopeKey: 1018, lDepartmentKey: 15, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006587',
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
    lRepairReasonKey: 2, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Linda Farrow', sContactPhone: '(615) 341-4200', sContactEmail: 'l.farrow@nashgen.org',
    sShipAddress: '1818 Albion Street', sShipCity: 'Nashville', sShipState: 'TN', sShipZip: '37201',
    sBillAddress: '1818 Albion Street', sBillCity: 'Nashville', sBillState: 'TN', sBillZip: '37201',
    sAngInUp: '185', sAngInDown: '90', sAngInRight: '102', sAngInLeft: '105',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 3.4, nOutgoingEpoxySize: null, sMaxEpoxy: '4.0',
    sBrokenFibersIn: '12', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'B-03', sCarrierTracking: '1Z999AA10123456785', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 3. Status 4 (In Repair) — existing ──
  { lRepairKey: 6574, lScopeKey: 1019, lDepartmentKey: 10, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006574',
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
    lRepairReasonKey: 3, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 9022, sPurchaseOrder: 'PO-2026-0398',
    sContactName: 'Karen Whitfield', sContactPhone: '(937) 257-7650', sContactEmail: 'k.whitfield@wpafb.af.mil',
    sShipAddress: '4881 Sugar Maple Drive', sShipCity: 'Coosada', sShipState: 'AL', sShipZip: '36020',
    sBillAddress: '4881 Sugar Maple Drive', sBillCity: 'Coosada', sBillState: 'AL', sBillZip: '36020',
    sAngInUp: '192', sAngInDown: '94', sAngInRight: '118', sAngInLeft: '120',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.8, nOutgoingEpoxySize: null, sMaxEpoxy: '3.5',
    sBrokenFibersIn: '7', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'C-05', sCarrierTracking: '1Z999AA10123456786', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 4. Status 5 (On Hold) — existing ──
  { lRepairKey: 6541, lScopeKey: 1020, lDepartmentKey: 22, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006541',
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
    lRepairReasonKey: 4, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Derek Hanes', sContactPhone: '(216) 778-7900', sContactEmail: 'd.hanes@metrohealthoh.org',
    sShipAddress: '2500 MetroHealth Drive', sShipCity: 'Cleveland', sShipState: 'OH', sShipZip: '44102',
    sBillAddress: '2500 MetroHealth Drive', sBillCity: 'Cleveland', sBillState: 'OH', sBillZip: '44102',
    sAngInUp: '205', sAngInDown: '96', sAngInRight: '130', sAngInLeft: '128',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 1.5, nOutgoingEpoxySize: null, sMaxEpoxy: '2.5',
    sBrokenFibersIn: '2', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: 'LNR-BF-0042', sLoanerModel: 'BF-Q180', bLoanerOut: true,
    sRackPosition: 'D-01', sCarrierTracking: '1Z999AA10123456787', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 3, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ── 5. Status 4 (In Repair) — existing ──
  { lRepairKey: 6530, lScopeKey: 1021, lDepartmentKey: 19, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006530',
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
    lRepairReasonKey: 6, lRepairLevelKey: 3, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: 'PO-2026-0380',
    sContactName: 'Pam Nguyen', sContactPhone: '(404) 851-8200', sContactEmail: 'p.nguyen@northside.com',
    sShipAddress: '1000 Johnson Ferry Road NE', sShipCity: 'Atlanta', sShipState: 'GA', sShipZip: '30342',
    sBillAddress: '1000 Johnson Ferry Road NE', sBillCity: 'Atlanta', sBillState: 'GA', sBillZip: '30342',
    sAngInUp: '200', sAngInDown: '95', sAngInRight: '140', sAngInLeft: '135',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 3.0, nOutgoingEpoxySize: null, sMaxEpoxy: '3.5',
    sBrokenFibersIn: '9', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'A-08', sCarrierTracking: '1Z999AA10123456788', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 6. Status 7 (Ready to Ship) — existing ──
  { lRepairKey: 6445, lScopeKey: 1022, lDepartmentKey: 23, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006445',
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
    lRepairReasonKey: 7, lRepairLevelKey: 1, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0355',
    sContactName: 'Angela Torres', sContactPhone: '(318) 212-4050', sContactEmail: 'a.torres@westbozeman.com',
    sShipAddress: '1 St Mary Place', sShipCity: 'Shreveport', sShipState: 'LA', sShipZip: '71101',
    sBillAddress: '1 St Mary Place', sBillCity: 'Shreveport', sBillState: 'LA', sBillZip: '71101',
    sAngInUp: '190', sAngInDown: '93', sAngInRight: '115', sAngInLeft: '118',
    sAngOutUp: '200', sAngOutDown: '97', sAngOutRight: '125', sAngOutLeft: '128',
    nIncomingEpoxySize: 2.5, nOutgoingEpoxySize: 1.8, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '5', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-019', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00891', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-03-06T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'B-11', sCarrierTracking: '1Z999AA10123456789', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 7. Status 8 (Shipped) — existing ──
  { lRepairKey: 6398, lScopeKey: 1018, lDepartmentKey: 15, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006398',
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
    lRepairReasonKey: 3, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0341',
    sContactName: 'Linda Farrow', sContactPhone: '(615) 341-4200', sContactEmail: 'l.farrow@nashgen.org',
    sShipAddress: '1818 Albion Street', sShipCity: 'Nashville', sShipState: 'TN', sShipZip: '37201',
    sBillAddress: '1818 Albion Street', sBillCity: 'Nashville', sBillState: 'TN', sBillZip: '37201',
    sAngInUp: '188', sAngInDown: '91', sAngInRight: '110', sAngInLeft: '112',
    sAngOutUp: '205', sAngOutDown: '98', sAngOutRight: '130', sAngOutLeft: '132',
    nIncomingEpoxySize: 2.9, nOutgoingEpoxySize: 1.5, sMaxEpoxy: '3.5',
    sBrokenFibersIn: '8', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-019', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00845', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-03-03T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: null, sCarrierTracking: '1Z999AA10123456790', sCarrierTrackingOut: '1Z888BB20987654321',
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 8. Status 5 (On Hold) — existing ──
  { lRepairKey: 6110, lScopeKey: 1023, lDepartmentKey: 20, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006110',
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
    lRepairReasonKey: 10, lRepairLevelKey: 3, lDeliveryMethodKey: 0, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Greg Paulson', sContactPhone: '(312) 555-0192', sContactEmail: 'g.paulson@coliseummed.org',
    sShipAddress: '2100 W Harrison St', sShipCity: 'Chicago', sShipState: 'IL', sShipZip: '60607',
    sBillAddress: '2100 W Harrison St', sBillCity: 'Chicago', sBillState: 'IL', sBillZip: '60607',
    sAngInUp: '195', sAngInDown: '93', sAngInRight: '122', sAngInLeft: '120',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.2, nOutgoingEpoxySize: null, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '3', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'E-02', sCarrierTracking: '1Z999AA10123456791', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ═══════════════════════════════════════════════════════
  //  NEW REPAIRS (12 more — total 20)
  // ═══════════════════════════════════════════════════════

  // ── 9. Status 1 (Received/Evaluation) — just came in ──
  { lRepairKey: 6620, lScopeKey: 1024, lDepartmentKey: 24, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006620',
    sSerialNumber: '5501234', sScopeTypeDesc: 'ED-580XT', sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'GI Lab',
    sShipName1: 'Tampa Minimally Invasive', sShipName2: 'GI Lab', sBillName1: 'Tampa Minimally Invasive',
    sManufacturer: 'Fujifilm', sScopeCategory: 'Duodenoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Elevator wire stiff — limited articulation. Received for evaluation.',
    dtDateIn: '2026-03-15T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: null,
    EstDelDate: null, DaysLastIn: 1,
    lRepairStatusID: 1, sRepairStatus: 'Received', ProgBarStatus: 'Received',
    Approved: 0, dblAmtRepair: 0, sInvoiceNumber: '',
    ResponsibleTech: '', lTechnicianKey: 0, Note: 'Elevator wire stiff — limited articulation. Received for evaluation.',
    bHotList: true, IsCogentix: 0, VendorKey: 0, Diameter: '11.6',
    lRepairReasonKey: 2, lRepairLevelKey: 0, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Maria Delgado', sContactPhone: '(813) 844-7050', sContactEmail: 'm.delgado@tampami.com',
    sShipAddress: '4 Columbia Drive', sShipCity: 'Tampa', sShipState: 'FL', sShipZip: '33606',
    sBillAddress: '4 Columbia Drive', sBillCity: 'Tampa', sBillState: 'FL', sBillZip: '33606',
    sAngInUp: '182', sAngInDown: '90', sAngInRight: '105', sAngInLeft: '108',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.6, nOutgoingEpoxySize: null, sMaxEpoxy: '3.5',
    sBrokenFibersIn: '1', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'A-01', sCarrierTracking: '1Z777CC30111222333', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 3, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 10. Status 1 (Received/Evaluation) — just came in ──
  { lRepairKey: 6618, lScopeKey: 1025, lDepartmentKey: 18, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006618',
    sSerialNumber: '7820045', sScopeTypeDesc: '11101VP', sClientName1: 'Northside Hospital', sDepartmentName: 'Biomedical Engineering',
    sShipName1: 'Northside Hospital', sShipName2: 'Biomedical Engineering', sBillName1: 'Northside Hospital',
    sManufacturer: 'Karl Storz', sScopeCategory: 'Rhinolaryngoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Image quality degraded — possible fiber optic bundle damage. Incoming eval.',
    dtDateIn: '2026-03-14T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: null,
    EstDelDate: null, DaysLastIn: 2,
    lRepairStatusID: 1, sRepairStatus: 'Received', ProgBarStatus: 'Received',
    Approved: 0, dblAmtRepair: 0, sInvoiceNumber: '',
    ResponsibleTech: '', lTechnicianKey: 0, Note: 'Image quality degraded — possible fiber optic bundle damage. Incoming eval.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '3.7',
    lRepairReasonKey: 5, lRepairLevelKey: 0, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Pam Nguyen', sContactPhone: '(404) 851-8200', sContactEmail: 'p.nguyen@northside.com',
    sShipAddress: '1000 Johnson Ferry Road NE', sShipCity: 'Atlanta', sShipState: 'GA', sShipZip: '30342',
    sBillAddress: '1000 Johnson Ferry Road NE', sBillCity: 'Atlanta', sBillState: 'GA', sBillZip: '30342',
    sAngInUp: '180', sAngInDown: '90', sAngInRight: '100', sAngInLeft: '100',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 1.0, nOutgoingEpoxySize: null, sMaxEpoxy: '2.0',
    sBrokenFibersIn: '18', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'A-02', sCarrierTracking: '9400111899223100001', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 11. Status 2 (Waiting for Approval) — quote sent ──
  { lRepairKey: 6612, lScopeKey: 1026, lDepartmentKey: 21, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006612',
    sSerialNumber: '2210887', sScopeTypeDesc: 'EC-760R', sClientName1: 'Metro Health Hospital', sDepartmentName: 'Endoscopy',
    sShipName1: 'Metro Health Hospital', sShipName2: 'Endoscopy', sBillName1: 'Metro Health Hospital',
    sManufacturer: 'Fujifilm', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Biopsy channel blockage — unable to pass forceps. Cleaning attempted, needs replacement.',
    dtDateIn: '2026-03-10T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: '2026-03-12T00:00:00',
    EstDelDate: null, DaysLastIn: 6,
    lRepairStatusID: 2, sRepairStatus: 'Evaluation Complete', ProgBarStatus: 'Evaluation Complete',
    Approved: 0, dblAmtRepair: 720, sInvoiceNumber: '',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Biopsy channel blockage — cleaning failed. Channel replacement quoted.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 8, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Derek Hanes', sContactPhone: '(216) 778-7900', sContactEmail: 'd.hanes@metrohealthoh.org',
    sShipAddress: '2500 MetroHealth Drive', sShipCity: 'Cleveland', sShipState: 'OH', sShipZip: '44102',
    sBillAddress: '2500 MetroHealth Drive', sBillCity: 'Cleveland', sBillState: 'OH', sBillZip: '44102',
    sAngInUp: '196', sAngInDown: '94', sAngInRight: '128', sAngInLeft: '125',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.4, nOutgoingEpoxySize: null, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '0', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'B-06', sCarrierTracking: '1Z999AA10123456792', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ── 12. Status 3 (Approved/In Repair) — active work ──
  { lRepairKey: 6605, lScopeKey: 1027, lDepartmentKey: 12, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006605',
    sSerialNumber: '8830221', sScopeTypeDesc: 'EPK-i7010', sClientName1: 'Tift Regional Medical Center', sDepartmentName: 'GI Lab',
    sShipName1: 'Tift Regional Medical Center', sShipName2: 'GI Lab', sBillName1: 'Tift Regional Medical Center',
    sManufacturer: 'Pentax', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Light guide fiber degradation — output below threshold. Bundle replacement approved.',
    dtDateIn: '2026-03-07T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-10T00:00:00', dtReqSent: '2026-03-08T00:00:00',
    EstDelDate: '2026-03-20T00:00:00', DaysLastIn: 9,
    lRepairStatusID: 3, sRepairStatus: 'Approved', ProgBarStatus: 'Approved',
    Approved: 520, dblAmtRepair: 520, sInvoiceNumber: '',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Light guide fiber degradation — bundle replacement in progress.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.8',
    lRepairReasonKey: 5, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 9105, sPurchaseOrder: 'PO-2026-0420',
    sContactName: 'Sarah Mitchell', sContactPhone: '(229) 382-7200', sContactEmail: 's.mitchell@tiftregional.com',
    sShipAddress: '901 East 18th Street', sShipCity: 'Tifton', sShipState: 'GA', sShipZip: '31794',
    sBillAddress: '901 East 18th Street', sBillCity: 'Tifton', sBillState: 'GA', sBillZip: '31794',
    sAngInUp: '202', sAngInDown: '96', sAngInRight: '135', sAngInLeft: '130',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 2.0, nOutgoingEpoxySize: null, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '22', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'C-09', sCarrierTracking: '1Z999AA10123456793', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ── 13. Status 3 (Approved/In Repair) — active work ──
  { lRepairKey: 6595, lScopeKey: 1028, lDepartmentKey: 16, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006595',
    sSerialNumber: '6199402', sScopeTypeDesc: 'BF-1TH190', sClientName1: 'Nashville General Hospital', sDepartmentName: 'Pulmonology',
    sShipName1: 'Nashville General Hospital', sShipName2: 'Pulmonology', sBillName1: 'Nashville General Hospital',
    sManufacturer: 'Olympus', sScopeCategory: 'Bronchoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Suction valve not seating properly. Air/water nozzle intermittent.',
    dtDateIn: '2026-03-06T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-09T00:00:00', dtReqSent: '2026-03-07T00:00:00',
    EstDelDate: '2026-03-18T00:00:00', DaysLastIn: 10,
    lRepairStatusID: 3, sRepairStatus: 'Approved', ProgBarStatus: 'Approved',
    Approved: 310, dblAmtRepair: 310, sInvoiceNumber: '',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Suction valve replacement approved. Air/water nozzle rebuild.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '6.0',
    lRepairReasonKey: 7, lRepairLevelKey: 1, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: 'PO-2026-0405',
    sContactName: 'Linda Farrow', sContactPhone: '(615) 341-4200', sContactEmail: 'l.farrow@nashgen.org',
    sShipAddress: '1818 Albion Street', sShipCity: 'Nashville', sShipState: 'TN', sShipZip: '37201',
    sBillAddress: '1818 Albion Street', sBillCity: 'Nashville', sBillState: 'TN', sBillZip: '37201',
    sAngInUp: '208', sAngInDown: '98', sAngInRight: '155', sAngInLeft: '150',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 1.2, nOutgoingEpoxySize: null, sMaxEpoxy: '2.0',
    sBrokenFibersIn: '0', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'D-04', sCarrierTracking: '9400111899223100002', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 14. Status 4 (In Repair/Drying) ──
  { lRepairKey: 6558, lScopeKey: 1029, lDepartmentKey: 25, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006558',
    sSerialNumber: '4412900', sScopeTypeDesc: 'CYF-V2', sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'Surgery / OR',
    sShipName1: 'Tampa Minimally Invasive', sShipName2: 'Surgery / OR', sBillName1: 'Tampa Minimally Invasive',
    sManufacturer: 'Olympus', sScopeCategory: 'Cystoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Insertion tube outer sheath abraded — patient safety concern. Rush repair.',
    dtDateIn: '2026-03-02T00:00:00', dtDateOut: null, dtAprRecvd: '2026-03-03T00:00:00', dtReqSent: '2026-03-02T00:00:00',
    EstDelDate: '2026-03-14T00:00:00', DaysLastIn: 14,
    lRepairStatusID: 4, sRepairStatus: 'In Repair', ProgBarStatus: 'In Repair',
    Approved: 890, dblAmtRepair: 890, sInvoiceNumber: '',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Insertion tube outer sheath replacement — epoxy drying.',
    bHotList: true, IsCogentix: 0, VendorKey: 0, Diameter: '5.2',
    lRepairReasonKey: 3, lRepairLevelKey: 3, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0392',
    sContactName: 'Maria Delgado', sContactPhone: '(813) 844-7050', sContactEmail: 'm.delgado@tampami.com',
    sShipAddress: '4 Columbia Drive', sShipCity: 'Tampa', sShipState: 'FL', sShipZip: '33606',
    sBillAddress: '4 Columbia Drive', sBillCity: 'Tampa', sBillState: 'FL', sBillZip: '33606',
    sAngInUp: '185', sAngInDown: '92', sAngInRight: '110', sAngInLeft: '112',
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: 1.8, nOutgoingEpoxySize: null, sMaxEpoxy: '2.5',
    sBrokenFibersIn: '0', sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: 'LNR-CYF-0018', sLoanerModel: 'CYF-V2', bLoanerOut: true,
    sRackPosition: 'C-11', sCarrierTracking: '1Z777CC30111222334', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 3, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 15. Status 6 (Quality Check) ──
  { lRepairKey: 6480, lScopeKey: 1030, lDepartmentKey: 11, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006480',
    sSerialNumber: '3390556', sScopeTypeDesc: 'GIF-H190', sClientName1: '88th Medical Group', sDepartmentName: 'Endoscopy Unit',
    sShipName1: '88th Medical Group', sShipName2: 'Endoscopy Unit', sBillName1: '88th Medical Group',
    sManufacturer: 'Olympus', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Distal tip chip replaced. Final QC in progress — leak test pending.',
    dtDateIn: '2026-02-24T00:00:00', dtDateOut: null, dtAprRecvd: '2026-02-25T00:00:00', dtReqSent: '2026-02-24T00:00:00',
    EstDelDate: '2026-03-10T00:00:00', DaysLastIn: 20,
    lRepairStatusID: 6, sRepairStatus: 'Quality Check', ProgBarStatus: 'Quality Check',
    Approved: 285, dblAmtRepair: 285, sInvoiceNumber: '',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Distal tip chip replaced. Awaiting final leak test.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.9',
    lRepairReasonKey: 1, lRepairLevelKey: 2, lDeliveryMethodKey: 1, lContractKey: 9022, sPurchaseOrder: 'PO-2026-0370',
    sContactName: 'Marcus Tatum', sContactPhone: '(937) 257-1100', sContactEmail: 'm.tatum@wpafb.af.mil',
    sShipAddress: '4881 Sugar Maple Drive', sShipCity: 'Coosada', sShipState: 'AL', sShipZip: '36020',
    sBillAddress: '4881 Sugar Maple Drive', sBillCity: 'Coosada', sBillState: 'AL', sBillZip: '36020',
    sAngInUp: '194', sAngInDown: '93', sAngInRight: '120', sAngInLeft: '118',
    sAngOutUp: '204', sAngOutDown: '97', sAngOutRight: '130', sAngOutLeft: '128',
    nIncomingEpoxySize: 2.3, nOutgoingEpoxySize: 1.6, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '6', sBrokenFibersOut: '0',
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'B-09', sCarrierTracking: '1Z999AA10123456794', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 16. Status 7 (Ready to Ship) ──
  { lRepairKey: 6462, lScopeKey: 1031, lDepartmentKey: 23, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006462',
    sSerialNumber: '9910334', sScopeTypeDesc: 'EG-740N', sClientName1: 'Shreveport Endoscopy Center', sDepartmentName: 'Endoscopy',
    sShipName1: 'Shreveport Endoscopy Center', sShipName2: 'Endoscopy', sBillName1: 'Shreveport Endoscopy Center',
    sManufacturer: 'Fujifilm', sScopeCategory: 'Gastroscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Control body rebuild complete. Leak test passed. Ready for pickup.',
    dtDateIn: '2026-02-18T00:00:00', dtDateOut: null, dtAprRecvd: '2026-02-19T00:00:00', dtReqSent: '2026-02-18T00:00:00',
    EstDelDate: '2026-03-08T00:00:00', DaysLastIn: 26,
    lRepairStatusID: 7, sRepairStatus: 'Ready to Ship', ProgBarStatus: 'Ready to Ship',
    Approved: 550, dblAmtRepair: 550, sInvoiceNumber: 'INV-26-0460',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Control body rebuild complete. All QC passed.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '9.9',
    lRepairReasonKey: 6, lRepairLevelKey: 2, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: 'PO-2026-0348',
    sContactName: 'Angela Torres', sContactPhone: '(318) 212-4050', sContactEmail: 'a.torres@shreveportendo.com',
    sShipAddress: '1 St Mary Place', sShipCity: 'Shreveport', sShipState: 'LA', sShipZip: '71101',
    sBillAddress: '1 St Mary Place', sBillCity: 'Shreveport', sBillState: 'LA', sBillZip: '71101',
    sAngInUp: '188', sAngInDown: '91', sAngInRight: '115', sAngInLeft: '112',
    sAngOutUp: '206', sAngOutDown: '99', sAngOutRight: '135', sAngOutLeft: '132',
    nIncomingEpoxySize: 3.2, nOutgoingEpoxySize: 1.9, sMaxEpoxy: '4.0',
    sBrokenFibersIn: '10', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-019', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00905', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-03-12T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: 'A-15', sCarrierTracking: '9400111899223100003', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 1 },

  // ── 17. Status 8 (Shipped) ──
  { lRepairKey: 6380, lScopeKey: 1032, lDepartmentKey: 15, lServiceLocationKey: 2, sWorkOrderNumber: 'SR26006380',
    sSerialNumber: '3188920', sScopeTypeDesc: 'TJF-Q190V', sClientName1: 'Nashville General Hospital', sDepartmentName: 'Endoscopy',
    sShipName1: 'Nashville General Hospital', sShipName2: 'Endoscopy', sBillName1: 'Nashville General Hospital',
    sManufacturer: 'Olympus', sScopeCategory: 'Duodenoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Elevator mechanism rebuilt. Full service repair complete.',
    dtDateIn: '2026-02-10T00:00:00', dtDateOut: '2026-03-01T00:00:00', dtAprRecvd: '2026-02-12T00:00:00', dtReqSent: '2026-02-10T00:00:00',
    EstDelDate: '2026-03-02T00:00:00', DaysLastIn: 19,
    lRepairStatusID: 8, sRepairStatus: 'Shipped', ProgBarStatus: 'Shipped',
    Approved: 1450, dblAmtRepair: 1450, sInvoiceNumber: 'INV-26-0425',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Elevator mechanism rebuilt. Shipped UPS Ground.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '11.3',
    lRepairReasonKey: 2, lRepairLevelKey: 3, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: 'PO-2026-0330',
    sContactName: 'Linda Farrow', sContactPhone: '(615) 341-4200', sContactEmail: 'l.farrow@nashgen.org',
    sShipAddress: '1818 Albion Street', sShipCity: 'Nashville', sShipState: 'TN', sShipZip: '37201',
    sBillAddress: '1818 Albion Street', sBillCity: 'Nashville', sBillState: 'TN', sBillZip: '37201',
    sAngInUp: '180', sAngInDown: '90', sAngInRight: '100', sAngInLeft: '105',
    sAngOutUp: '210', sAngOutDown: '100', sAngOutRight: '140', sAngOutLeft: '140',
    nIncomingEpoxySize: 3.5, nOutgoingEpoxySize: 1.4, sMaxEpoxy: '4.0',
    sBrokenFibersIn: '15', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-019', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00820', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-02-28T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: null, sCarrierTracking: '1Z999AA10123456795', sCarrierTrackingOut: '1Z888BB20987654322',
    lPatientSafetyLevelKey: 3, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 18. Status 8 (Shipped) ──
  { lRepairKey: 6350, lScopeKey: 1033, lDepartmentKey: 10, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006350',
    sSerialNumber: '4480112', sScopeTypeDesc: 'CF-HQ190L', sClientName1: '88th Medical Group', sDepartmentName: 'Biomedical Engineering',
    sShipName1: '88th Medical Group', sShipName2: 'Biomedical Engineering', sBillName1: '88th Medical Group',
    sManufacturer: 'Olympus', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Angulation system overhaul — all four cables replaced. Complete.',
    dtDateIn: '2026-02-05T00:00:00', dtDateOut: '2026-02-28T00:00:00', dtAprRecvd: '2026-02-07T00:00:00', dtReqSent: '2026-02-05T00:00:00',
    EstDelDate: '2026-03-01T00:00:00', DaysLastIn: 23,
    lRepairStatusID: 8, sRepairStatus: 'Shipped', ProgBarStatus: 'Shipped',
    Approved: 980, dblAmtRepair: 980, sInvoiceNumber: 'INV-26-0418',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Angulation overhaul complete. All QC passed. Shipped FedEx Priority.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 2, lRepairLevelKey: 3, lDeliveryMethodKey: 1, lContractKey: 9022, sPurchaseOrder: 'PO-2026-0318',
    sContactName: 'Karen Whitfield', sContactPhone: '(937) 257-7650', sContactEmail: 'k.whitfield@wpafb.af.mil',
    sShipAddress: '4881 Sugar Maple Drive', sShipCity: 'Coosada', sShipState: 'AL', sShipZip: '36020',
    sBillAddress: '4881 Sugar Maple Drive', sBillCity: 'Coosada', sBillState: 'AL', sBillZip: '36020',
    sAngInUp: '182', sAngInDown: '90', sAngInRight: '102', sAngInLeft: '100',
    sAngOutUp: '208', sAngOutDown: '99', sAngOutRight: '145', sAngOutLeft: '142',
    nIncomingEpoxySize: 3.1, nOutgoingEpoxySize: 1.7, sMaxEpoxy: '3.5',
    sBrokenFibersIn: '3', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-022', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00798', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-02-26T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: null, sCarrierTracking: '1Z999AA10123456796', sCarrierTrackingOut: '1Z888BB20987654323',
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },

  // ── 19. Status 8 (Shipped) ──
  { lRepairKey: 6290, lScopeKey: 1034, lDepartmentKey: 24, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006290',
    sSerialNumber: '5599871', sScopeTypeDesc: 'EC-600WM', sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'GI Lab',
    sShipName1: 'Tampa Minimally Invasive', sShipName2: 'GI Lab', sBillName1: 'Tampa Minimally Invasive',
    sManufacturer: 'Fujifilm', sScopeCategory: 'Colonoscope', sRigidOrFlexible: 'F',
    sComplaintDesc: 'Fluid seal kit + biopsy channel. Routine service complete.',
    dtDateIn: '2026-01-28T00:00:00', dtDateOut: '2026-02-20T00:00:00', dtAprRecvd: '2026-01-30T00:00:00', dtReqSent: '2026-01-28T00:00:00',
    EstDelDate: '2026-02-21T00:00:00', DaysLastIn: 23,
    lRepairStatusID: 8, sRepairStatus: 'Shipped', ProgBarStatus: 'Shipped',
    Approved: 415, dblAmtRepair: 415, sInvoiceNumber: 'INV-26-0395',
    ResponsibleTech: 'Tom', lTechnicianKey: 2, Note: 'Fluid seal + biopsy channel. Routine service. Shipped UPS.',
    bHotList: false, IsCogentix: 0, VendorKey: 0, Diameter: '13.2',
    lRepairReasonKey: 8, lRepairLevelKey: 1, lDeliveryMethodKey: 2, lContractKey: 0, sPurchaseOrder: 'PO-2026-0295',
    sContactName: 'Maria Delgado', sContactPhone: '(813) 844-7050', sContactEmail: 'm.delgado@tampami.com',
    sShipAddress: '4 Columbia Drive', sShipCity: 'Tampa', sShipState: 'FL', sShipZip: '33606',
    sBillAddress: '4 Columbia Drive', sBillCity: 'Tampa', sBillState: 'FL', sBillZip: '33606',
    sAngInUp: '199', sAngInDown: '95', sAngInRight: '130', sAngInLeft: '128',
    sAngOutUp: '207', sAngOutDown: '98', sAngOutRight: '140', sAngOutLeft: '138',
    nIncomingEpoxySize: 2.0, nOutgoingEpoxySize: 1.5, sMaxEpoxy: '3.0',
    sBrokenFibersIn: '2', sBrokenFibersOut: '0',
    sLeakTesterSN: 'LT-2024-022', sLeakTesterVersion: '4.2.1', sLeakRunID: 'LR-26-00755', sLeakDuration: '120', sLeakResult: 'Pass', sFluidResult: 'Pass', dtLeakTestDate: '2026-02-18T00:00:00',
    sLoanerSN: null, sLoanerModel: null, bLoanerOut: false,
    sRackPosition: null, sCarrierTracking: '1Z777CC30111222335', sCarrierTrackingOut: '1Z888BB20987654324',
    lPatientSafetyLevelKey: 1, lSalesRepNameKey: 1, lPricingCategoryKey: 2 },

  // ── 20. Status 2 (Waiting for Approval) — quote sent ──
  { lRepairKey: 6615, lScopeKey: 1035, lDepartmentKey: 19, lServiceLocationKey: 1, sWorkOrderNumber: 'NR26006615',
    sSerialNumber: '7715508', sScopeTypeDesc: '11272VU', sClientName1: 'Northside Hospital', sDepartmentName: 'Surgery / OR',
    sShipName1: 'Northside Hospital', sShipName2: 'Surgery / OR', sBillName1: 'Northside Hospital',
    sManufacturer: 'Karl Storz', sScopeCategory: 'Cystoscope', sRigidOrFlexible: 'R',
    sComplaintDesc: 'Rod lens system cracked — image haze and dark spots. Quote for lens replacement sent.',
    dtDateIn: '2026-03-11T00:00:00', dtDateOut: null, dtAprRecvd: null, dtReqSent: '2026-03-13T00:00:00',
    EstDelDate: null, DaysLastIn: 5,
    lRepairStatusID: 2, sRepairStatus: 'Evaluation Complete', ProgBarStatus: 'Evaluation Complete',
    Approved: 0, dblAmtRepair: 960, sInvoiceNumber: '',
    ResponsibleTech: 'Rob', lTechnicianKey: 1, Note: 'Rod lens cracked — quote sent for full lens replacement.',
    bHotList: true, IsCogentix: 0, VendorKey: 0, Diameter: '4.0',
    lRepairReasonKey: 9, lRepairLevelKey: 3, lDeliveryMethodKey: 1, lContractKey: 0, sPurchaseOrder: '',
    sContactName: 'Pam Nguyen', sContactPhone: '(404) 851-8200', sContactEmail: 'p.nguyen@northside.com',
    sShipAddress: '1000 Johnson Ferry Road NE', sShipCity: 'Atlanta', sShipState: 'GA', sShipZip: '30342',
    sBillAddress: '1000 Johnson Ferry Road NE', sBillCity: 'Atlanta', sBillState: 'GA', sBillZip: '30342',
    sAngInUp: null, sAngInDown: null, sAngInRight: null, sAngInLeft: null,
    sAngOutUp: null, sAngOutDown: null, sAngOutRight: null, sAngOutLeft: null,
    nIncomingEpoxySize: null, nOutgoingEpoxySize: null, sMaxEpoxy: null,
    sBrokenFibersIn: null, sBrokenFibersOut: null,
    sLeakTesterSN: null, sLeakTesterVersion: null, sLeakRunID: null, sLeakDuration: null, sLeakResult: null, sFluidResult: null, dtLeakTestDate: null,
    sLoanerSN: 'LNR-KS-0007', sLoanerModel: '11272VU', bLoanerOut: true,
    sRackPosition: 'E-05', sCarrierTracking: '1Z999AA10123456797', sCarrierTrackingOut: null,
    lPatientSafetyLevelKey: 2, lSalesRepNameKey: 2, lPricingCategoryKey: 1 },
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

// ── Repair Details (line items per repair — all 20) ──────
MockDB.seed('repairDetails', [
  // Repair 6601: Fluid invasion (3 items)
  { lRepairItemTranKey: 5001, lRepairKey: 6601, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5002, lRepairKey: 6601, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 285.00, dblRepairPrice: 285.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5003, lRepairKey: 6601, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6587: Angulation cable (3 items)
  { lRepairItemTranKey: 5004, lRepairKey: 6587, lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', nRepairPrice: 850.00, dblRepairPrice: 850.00, sApproved: 'P', bPrimary: true, mComment: 'Both up/down cables' },
  { lRepairItemTranKey: 5005, lRepairKey: 6587, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5006, lRepairKey: 6587, lRepairItemKey: 5, sItemDescription: 'Light Guide Bundle', nRepairPrice: 150.00, dblRepairPrice: 150.00, sApproved: 'P', bPrimary: false, mComment: 'Partial dim noted during eval' },
  // Repair 6574: Insertion tube (2 items)
  { lRepairItemTranKey: 5007, lRepairKey: 6574, lRepairItemKey: 3, sItemDescription: 'Insertion Tube Replacement', nRepairPrice: 480.00, dblRepairPrice: 480.00, sApproved: 'Y', bPrimary: true, mComment: 'Kink at 60cm mark' },
  { lRepairItemTranKey: 5008, lRepairKey: 6574, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6541: CCD chip — on hold (3 items)
  { lRepairItemTranKey: 5009, lRepairKey: 6541, lRepairItemKey: 4, sItemDescription: 'CCD Chip Replacement', nRepairPrice: 450.00, dblRepairPrice: 450.00, sApproved: 'P', bPrimary: true, mComment: 'Backordered — ETA unknown' },
  { lRepairItemTranKey: 5010, lRepairKey: 6541, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'P', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5011, lRepairKey: 6541, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6530: Universal cord (2 items)
  { lRepairItemTranKey: 5012, lRepairKey: 6530, lRepairItemKey: 6, sItemDescription: 'Universal Cord Repair', nRepairPrice: 640.00, dblRepairPrice: 640.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5013, lRepairKey: 6530, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: 'Preventive replacement' },
  // Repair 6445: Suction cylinder (2 items)
  { lRepairItemTranKey: 5014, lRepairKey: 6445, lRepairItemKey: 7, sItemDescription: 'Suction Cylinder', nRepairPrice: 380.00, dblRepairPrice: 380.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5015, lRepairKey: 6445, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6398: Shipped — angulation + insertion tube (4 items)
  { lRepairItemTranKey: 5016, lRepairKey: 6398, lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', nRepairPrice: 240.00, dblRepairPrice: 240.00, sApproved: 'Y', bPrimary: true, mComment: 'Right cable only' },
  { lRepairItemTranKey: 5017, lRepairKey: 6398, lRepairItemKey: 3, sItemDescription: 'Insertion Tube Replacement', nRepairPrice: 350.00, dblRepairPrice: 350.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5018, lRepairKey: 6398, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5019, lRepairKey: 6398, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6110: On hold — pending (2 items)
  { lRepairItemTranKey: 5020, lRepairKey: 6110, lRepairItemKey: 4, sItemDescription: 'CCD Chip Replacement', nRepairPrice: 950.00, dblRepairPrice: 950.00, sApproved: 'N', bPrimary: true, mComment: 'Client reviewing cost' },
  { lRepairItemTranKey: 5021, lRepairKey: 6110, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },

  // ── NEW REPAIRS line items ──

  // Repair 6620: Duodenoscope elevator — just received (6 items)
  { lRepairItemTranKey: 5022, lRepairKey: 6620, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: 'Initial evaluation' },
  { lRepairItemTranKey: 5023, lRepairKey: 6620, lRepairItemKey: 2, sItemDescription: 'Elevator Wire Replacement', nRepairPrice: 1250.00, dblRepairPrice: 1250.00, sApproved: 'P', bPrimary: true, mComment: 'Stiff articulation — full cable replacement recommended' },
  { lRepairItemTranKey: 5060, lRepairKey: 6620, lRepairItemKey: 1, sItemDescription: 'Distal Tip Inspection & Reseal', nRepairPrice: 285.00, dblRepairPrice: 285.00, sApproved: 'P', bPrimary: false, mComment: 'Minor wear on distal cap — reseal recommended' },
  { lRepairItemTranKey: 5061, lRepairKey: 6620, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'P', bPrimary: false, mComment: 'Preventive — replace all seals during teardown' },
  { lRepairItemTranKey: 5062, lRepairKey: 6620, lRepairItemKey: 5, sItemDescription: 'Light Guide Bundle — Inspection', nRepairPrice: 120.00, dblRepairPrice: 120.00, sApproved: 'P', bPrimary: false, mComment: 'Brightness check — appears adequate but verify' },
  { lRepairItemTranKey: 5063, lRepairKey: 6620, lRepairItemKey: 8, sItemDescription: 'Biopsy Channel — Clean & Verify', nRepairPrice: 95.00, dblRepairPrice: 95.00, sApproved: 'P', bPrimary: false, mComment: 'Flush test pending' },
  // Repair 6618: Rhinolaryngoscope fiber damage — just received (2 items)
  { lRepairItemTranKey: 5024, lRepairKey: 6618, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5025, lRepairKey: 6618, lRepairItemKey: 5, sItemDescription: 'Light Guide Bundle', nRepairPrice: 0.00, dblRepairPrice: 0.00, sApproved: 'P', bPrimary: false, mComment: 'Suspected — pending eval' },
  // Repair 6612: Biopsy channel blockage — quote sent (3 items)
  { lRepairItemTranKey: 5026, lRepairKey: 6612, lRepairItemKey: 8, sItemDescription: 'Biopsy Channel Repair', nRepairPrice: 495.00, dblRepairPrice: 495.00, sApproved: 'P', bPrimary: true, mComment: 'Full channel replacement' },
  { lRepairItemTranKey: 5027, lRepairKey: 6612, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'P', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5028, lRepairKey: 6612, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6605: Light guide bundle — approved (3 items)
  { lRepairItemTranKey: 5029, lRepairKey: 6605, lRepairItemKey: 5, sItemDescription: 'Light Guide Bundle', nRepairPrice: 370.00, dblRepairPrice: 370.00, sApproved: 'Y', bPrimary: true, mComment: 'Severe degradation' },
  { lRepairItemTranKey: 5030, lRepairKey: 6605, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5031, lRepairKey: 6605, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6595: Suction valve + air/water — approved (3 items)
  { lRepairItemTranKey: 5032, lRepairKey: 6595, lRepairItemKey: 7, sItemDescription: 'Suction Cylinder', nRepairPrice: 120.00, dblRepairPrice: 120.00, sApproved: 'Y', bPrimary: true, mComment: 'Valve not seating' },
  { lRepairItemTranKey: 5033, lRepairKey: 6595, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: 'Air/water nozzle kit' },
  { lRepairItemTranKey: 5034, lRepairKey: 6595, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6558: Cystoscope insertion tube — in repair (4 items)
  { lRepairItemTranKey: 5035, lRepairKey: 6558, lRepairItemKey: 3, sItemDescription: 'Insertion Tube Replacement', nRepairPrice: 580.00, dblRepairPrice: 580.00, sApproved: 'Y', bPrimary: true, mComment: 'Outer sheath abraded' },
  { lRepairItemTranKey: 5036, lRepairKey: 6558, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 185.00, dblRepairPrice: 185.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5037, lRepairKey: 6558, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5038, lRepairKey: 6558, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6480: Distal tip — QC (3 items)
  { lRepairItemTranKey: 5039, lRepairKey: 6480, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 185.00, dblRepairPrice: 185.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5040, lRepairKey: 6480, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5041, lRepairKey: 6480, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6462: Control body rebuild — ready to ship (4 items)
  { lRepairItemTranKey: 5042, lRepairKey: 6462, lRepairItemKey: 6, sItemDescription: 'Universal Cord Repair', nRepairPrice: 280.00, dblRepairPrice: 280.00, sApproved: 'Y', bPrimary: true, mComment: 'Control body connector' },
  { lRepairItemTranKey: 5043, lRepairKey: 6462, lRepairItemKey: 7, sItemDescription: 'Suction Cylinder', nRepairPrice: 60.00, dblRepairPrice: 60.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5044, lRepairKey: 6462, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5045, lRepairKey: 6462, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6380: Duodenoscope elevator — shipped (5 items)
  { lRepairItemTranKey: 5046, lRepairKey: 6380, lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', nRepairPrice: 480.00, dblRepairPrice: 480.00, sApproved: 'Y', bPrimary: true, mComment: 'Elevator mechanism' },
  { lRepairItemTranKey: 5047, lRepairKey: 6380, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 285.00, dblRepairPrice: 285.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5048, lRepairKey: 6380, lRepairItemKey: 8, sItemDescription: 'Biopsy Channel Repair', nRepairPrice: 395.00, dblRepairPrice: 395.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5049, lRepairKey: 6380, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5050, lRepairKey: 6380, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6350: Angulation overhaul — shipped (4 items)
  { lRepairItemTranKey: 5051, lRepairKey: 6350, lRepairItemKey: 2, sItemDescription: 'Angulation Wire Repair', nRepairPrice: 720.00, dblRepairPrice: 720.00, sApproved: 'Y', bPrimary: true, mComment: 'All 4 cables replaced' },
  { lRepairItemTranKey: 5052, lRepairKey: 6350, lRepairItemKey: 1, sItemDescription: 'Distal Tip Replacement', nRepairPrice: 185.00, dblRepairPrice: 185.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5053, lRepairKey: 6350, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5054, lRepairKey: 6350, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6290: Fluid seal + biopsy — shipped (3 items)
  { lRepairItemTranKey: 5055, lRepairKey: 6290, lRepairItemKey: 8, sItemDescription: 'Biopsy Channel Repair', nRepairPrice: 195.00, dblRepairPrice: 195.00, sApproved: 'Y', bPrimary: true, mComment: '' },
  { lRepairItemTranKey: 5056, lRepairKey: 6290, lRepairItemKey: 11, sItemDescription: 'Fluid Seal Kit', nRepairPrice: 40.00, dblRepairPrice: 40.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5057, lRepairKey: 6290, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
  // Repair 6615: Rod lens — quote sent (3 items)
  { lRepairItemTranKey: 5058, lRepairKey: 6615, lRepairItemKey: 9, sItemDescription: 'Lens Replacement (Rigid)', nRepairPrice: 780.00, dblRepairPrice: 780.00, sApproved: 'P', bPrimary: true, mComment: 'Cracked rod lens system' },
  { lRepairItemTranKey: 5059, lRepairKey: 6615, lRepairItemKey: 10, sItemDescription: 'Rod Lens Realignment', nRepairPrice: 180.00, dblRepairPrice: 180.00, sApproved: 'P', bPrimary: false, mComment: '' },
  { lRepairItemTranKey: 5060, lRepairKey: 6615, lRepairItemKey: 12, sItemDescription: 'Evaluation Fee', nRepairPrice: 75.00, dblRepairPrice: 75.00, sApproved: 'Y', bPrimary: false, mComment: '' },
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

  // Repair 6620 — Duodenoscope elevator wire (parts staged for eval)
  { lRepairInventoryKey: 8, lRepairKey: 6620, lRepairItemTranKey: 5023, sRepairItemDesc: 'Elevator Wire Replacement', lInventoryKey: 3, sItemDescription: 'Elevator Cable Assembly', sSizeName: 'ED-580XT', sLotNumber: 'LOT-2026-0145', nQuantity: 1 },
  { lRepairInventoryKey: 9, lRepairKey: 6620, lRepairItemTranKey: 5061, sRepairItemDesc: 'Fluid Seal Kit', lInventoryKey: 6, sItemDescription: 'Control Body O-Ring Kit', sSizeName: 'Fujifilm Standard', sLotNumber: 'LOT-2026-0098', nQuantity: 1 },
  { lRepairInventoryKey: 10, lRepairKey: 6620, lRepairItemTranKey: 5060, sRepairItemDesc: 'Distal Tip Inspection & Reseal', lInventoryKey: 7, sItemDescription: 'Distal Tip Cover', sSizeName: 'ED-580XT', sLotNumber: 'LOT-2026-0102', nQuantity: 1 },
]);

// ── Status History (statusTrans) — tracks repair status changes ──
MockDB.seed('statusTrans', [
  // Repair 6620 — just received (Duodenoscope elevator wire)
  { lStatusTranKey: 1, lRepairKey: 6620, sDescription: 'Received', dtDateTime: '2026-03-15T08:45:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: 'Scope received via FedEx — elevator wire stiff, limited articulation' },
  { lStatusTranKey: 2, lRepairKey: 6620, sDescription: 'Evaluation', dtDateTime: '2026-03-15T10:30:00', sUserName: 'Joseph Brassell', sVoided: '', sComments: 'Assigned to bench for initial eval' },

  // Repair 6601 — Fluid invasion (In Repair)
  { lStatusTranKey: 3, lRepairKey: 6601, sDescription: 'Received', dtDateTime: '2026-03-05T08:30:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: 'Scope received via FedEx Priority' },
  { lStatusTranKey: 4, lRepairKey: 6601, sDescription: 'Evaluation', dtDateTime: '2026-03-05T10:15:00', sUserName: 'Rob Martinez', sVoided: '', sComments: 'Leak test positive — fluid invasion confirmed' },
  { lStatusTranKey: 5, lRepairKey: 6601, sDescription: 'D&I Inspection', dtDateTime: '2026-03-05T14:00:00', sUserName: 'Tim Johnson', sVoided: '', sComments: 'Disassembly & inspection complete' },
  { lStatusTranKey: 6, lRepairKey: 6601, sDescription: 'Waiting for Approval', dtDateTime: '2026-03-05T16:30:00', sUserName: 'System', sVoided: '', sComments: 'Repair estimate sent — $400.00' },
  { lStatusTranKey: 7, lRepairKey: 6601, sDescription: 'In Repair', dtDateTime: '2026-03-07T09:00:00', sUserName: 'Rob Martinez', sVoided: '', sComments: 'Approval received — repair started' },

  // Repair 6587 — Angulation cable (Waiting for Approval)
  { lStatusTranKey: 8, lRepairKey: 6587, sDescription: 'Received', dtDateTime: '2026-03-01T09:00:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: 'Scope received' },
  { lStatusTranKey: 9, lRepairKey: 6587, sDescription: 'Evaluation', dtDateTime: '2026-03-01T11:00:00', sUserName: 'Tim Johnson', sVoided: '', sComments: 'Both up/down cables stretched' },
  { lStatusTranKey: 10, lRepairKey: 6587, sDescription: 'Waiting for Approval', dtDateTime: '2026-03-02T08:30:00', sUserName: 'System', sVoided: '', sComments: 'Quote sent to client — $1,075.00' },

  // Repair 6574 — Insertion tube (In Repair)
  { lStatusTranKey: 11, lRepairKey: 6574, sDescription: 'Received', dtDateTime: '2026-02-25T08:00:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: '' },
  { lStatusTranKey: 12, lRepairKey: 6574, sDescription: 'Evaluation', dtDateTime: '2026-02-25T10:30:00', sUserName: 'Rob Martinez', sVoided: '', sComments: 'Kink at 60cm mark confirmed' },
  { lStatusTranKey: 13, lRepairKey: 6574, sDescription: 'In Repair', dtDateTime: '2026-02-27T09:00:00', sUserName: 'Rob Martinez', sVoided: '', sComments: 'Tube replacement in progress' },

  // Repair 6398 — Shipped
  { lStatusTranKey: 14, lRepairKey: 6398, sDescription: 'Received', dtDateTime: '2026-01-20T08:00:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: '' },
  { lStatusTranKey: 15, lRepairKey: 6398, sDescription: 'Evaluation', dtDateTime: '2026-01-20T11:00:00', sUserName: 'Tim Johnson', sVoided: '', sComments: '' },
  { lStatusTranKey: 16, lRepairKey: 6398, sDescription: 'In Repair', dtDateTime: '2026-01-22T09:00:00', sUserName: 'Tim Johnson', sVoided: '', sComments: 'Angulation + insertion tube repair' },
  { lStatusTranKey: 17, lRepairKey: 6398, sDescription: 'Quality Check', dtDateTime: '2026-01-28T14:00:00', sUserName: 'Marcus Powell', sVoided: '', sComments: 'Final QC passed' },
  { lStatusTranKey: 18, lRepairKey: 6398, sDescription: 'Completed', dtDateTime: '2026-01-29T10:00:00', sUserName: 'System', sVoided: '', sComments: 'Invoice #INV-26-0398 generated' },
  { lStatusTranKey: 19, lRepairKey: 6398, sDescription: 'Shipped', dtDateTime: '2026-01-30T08:30:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: 'FedEx Priority — 1Z888DD40222333444' },

  // Repair 6480 — QC
  { lStatusTranKey: 20, lRepairKey: 6480, sDescription: 'Received', dtDateTime: '2026-02-10T08:00:00', sUserName: 'Kevin Brooks', sVoided: '', sComments: '' },
  { lStatusTranKey: 21, lRepairKey: 6480, sDescription: 'In Repair', dtDateTime: '2026-02-12T09:00:00', sUserName: 'Marcus Powell', sVoided: '', sComments: '' },
  { lStatusTranKey: 22, lRepairKey: 6480, sDescription: 'Quality Check', dtDateTime: '2026-02-18T14:00:00', sUserName: 'Marcus Powell', sVoided: '', sComments: 'Awaiting final leak test' },
]);

// ── Documents (per-repair attachments) ──────────────────
MockDB.seed('documents', [
  // Repair 6620 — just received
  { lDocumentKey: 1, lOwnerKey: 6620, sDocumentName: 'Intake_Photo_Elevator.jpg', dtDateUploaded: '2026-03-15T08:50:00', sDocumentType: 'Photo' },
  { lDocumentKey: 2, lOwnerKey: 6620, sDocumentName: 'FedEx_BOL_6620.pdf', dtDateUploaded: '2026-03-15T08:52:00', sDocumentType: 'Shipping' },

  // Repair 6601 — fluid invasion
  { lDocumentKey: 3, lOwnerKey: 6601, sDocumentName: 'Intake_Photo_Front.jpg', dtDateUploaded: '2026-03-05T08:45:00', sDocumentType: 'Photo' },
  { lDocumentKey: 4, lOwnerKey: 6601, sDocumentName: 'Intake_Photo_DistalEnd.jpg', dtDateUploaded: '2026-03-05T08:46:00', sDocumentType: 'Photo' },
  { lDocumentKey: 5, lOwnerKey: 6601, sDocumentName: 'Leak_Test_Report.pdf', dtDateUploaded: '2026-03-05T10:30:00', sDocumentType: 'Report' },
  { lDocumentKey: 6, lOwnerKey: 6601, sDocumentName: 'DI_Inspection_Worksheet.pdf', dtDateUploaded: '2026-03-05T14:15:00', sDocumentType: 'Form' },
  { lDocumentKey: 7, lOwnerKey: 6601, sDocumentName: 'Repair_Estimate_6601.pdf', dtDateUploaded: '2026-03-05T16:30:00', sDocumentType: 'Estimate' },

  // Repair 6574 — insertion tube
  { lDocumentKey: 8, lOwnerKey: 6574, sDocumentName: 'Kink_Photo_60cm.jpg', dtDateUploaded: '2026-02-25T10:45:00', sDocumentType: 'Photo' },
  { lDocumentKey: 9, lOwnerKey: 6574, sDocumentName: 'Repair_Estimate_6574.pdf', dtDateUploaded: '2026-02-26T09:00:00', sDocumentType: 'Estimate' },

  // Repair 6398 — shipped (full set)
  { lDocumentKey: 10, lOwnerKey: 6398, sDocumentName: 'Intake_Photo.jpg', dtDateUploaded: '2026-01-20T08:30:00', sDocumentType: 'Photo' },
  { lDocumentKey: 11, lOwnerKey: 6398, sDocumentName: 'Repair_Estimate_6398.pdf', dtDateUploaded: '2026-01-21T09:00:00', sDocumentType: 'Estimate' },
  { lDocumentKey: 12, lOwnerKey: 6398, sDocumentName: 'Final_QC_Report.pdf', dtDateUploaded: '2026-01-28T14:30:00', sDocumentType: 'Report' },
  { lDocumentKey: 13, lOwnerKey: 6398, sDocumentName: 'Invoice_INV-26-0398.pdf', dtDateUploaded: '2026-01-29T10:15:00', sDocumentType: 'Invoice' },
  { lDocumentKey: 14, lOwnerKey: 6398, sDocumentName: 'Packing_Slip_6398.pdf', dtDateUploaded: '2026-01-30T08:00:00', sDocumentType: 'Shipping' },

  // Repair 6480 — QC
  { lDocumentKey: 15, lOwnerKey: 6480, sDocumentName: 'DistalTip_Before.jpg', dtDateUploaded: '2026-02-10T09:00:00', sDocumentType: 'Photo' },
  { lDocumentKey: 16, lOwnerKey: 6480, sDocumentName: 'DistalTip_After.jpg', dtDateUploaded: '2026-02-18T13:00:00', sDocumentType: 'Photo' },
]);

// ── Flags (repair-level alerts/notes) ───────────────────
MockDB.seed('flags', [
  // Repair 6620 — just received
  { lFlagKey: 1, lOwnerKey: 6620, lClientKey: 0, sFlag: 'Elevator wire stiff — evaluate for cable replacement vs. adjustment', sFlagType: 'Repair' },
  { lFlagKey: 2, lOwnerKey: 6620, lClientKey: 0, sFlag: 'Client requests 5-day turnaround — rush evaluation', sFlagType: 'Repair' },
  { lFlagKey: 3, lOwnerKey: 6620, lClientKey: 0, sFlag: 'Fujifilm ED-580XT — check parts availability before quoting', sFlagType: 'Repair' },

  // Repair 6601 — fluid invasion
  { lFlagKey: 4, lOwnerKey: 6601, lClientKey: 0, sFlag: 'Fluid invasion confirmed — full distal end rebuild required', sFlagType: 'Repair' },
  { lFlagKey: 5, lOwnerKey: 6601, lClientKey: 0, sFlag: 'Rush repair — 5 day turnaround per contract terms', sFlagType: 'Repair' },

  // Repair 6541 — on hold
  { lFlagKey: 6, lOwnerKey: 6541, lClientKey: 0, sFlag: 'CCD chip backordered — no ETA from Olympus', sFlagType: 'Repair' },
  { lFlagKey: 7, lOwnerKey: 6541, lClientKey: 0, sFlag: 'Client aware of delay — last contacted 3/10', sFlagType: 'Repair' },

  // Repair 6587 — waiting approval
  { lFlagKey: 8, lOwnerKey: 6587, lClientKey: 0, sFlag: 'Quote pending client approval since 3/2 — follow up needed', sFlagType: 'Repair' },
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
// ═══════════════════════════════════════════════════════
//  PHASE 5: Expanded Core Entities (WP-1)
//  +12 clients, +39 departments, +25 contacts, +70 scopes
// ═══════════════════════════════════════════════════════

// ── New Clients (+12) ─────────────────────────────────
// 6 NR (Upper Chichester, lServiceLocationKey: 1), 6 SR (Nashville, lServiceLocationKey: 2)
MockDB.seed('clients', [
  // ── NR clients (Upper Chichester) ───────────────────
  { lClientKey: 4002, sClientName1: 'Baylor Scott & White Medical Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '2401 S 31st Street', sMailAddr2: '', sMailCity: 'Temple', sMailState: 'TX', sMailZip: '76508', sMailCountry: 'USA',
    sPhoneNumber: '+1 (254) 724-2111', sFaxNumber: '(254) 724-2200',
    dtClientSince: '2012-06-15T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: true,
    lPricingCategoryKey: 2, sPricingDescription: 'Premier',
    lSalesRepKey: 1, sSalesRepName: 'Joseph Brassell',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '25,000', sBillTo: 'Customer',
    dblDiscountPct: 5, dblAdjustmentPct: 15,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '76508', sCity: 'Temple', sState: 'TX' },

  { lClientKey: 4003, sClientName1: 'Duke University Hospital', sClientName2: '', sUnitBuilding: 'DUMC Box 3708',
    sMailAddr1: '2301 Erwin Road', sMailAddr2: '', sMailCity: 'Durham', sMailState: 'NC', sMailZip: '27710', sMailCountry: 'USA',
    sPhoneNumber: '+1 (919) 684-8111', sFaxNumber: '(919) 684-8200',
    dtClientSince: '2009-03-01T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: true,
    lPricingCategoryKey: 5, sPricingDescription: 'HPG',
    lSalesRepKey: 3, sSalesRepName: 'Tom Velez',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 3, sTermsDesc: 'Net 60',
    sItemText: '50,000', sBillTo: 'Customer',
    dblDiscountPct: 8, dblAdjustmentPct: 20,
    bBlindPS3: false, bRequisitionTotalsOnly: true, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '27710', sCity: 'Durham', sState: 'NC' },

  { lClientKey: 4004, sClientName1: 'Inova Fairfax Hospital', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '3300 Gallows Road', sMailAddr2: '', sMailCity: 'Falls Church', sMailState: 'VA', sMailZip: '22042', sMailCountry: 'USA',
    sPhoneNumber: '+1 (703) 776-4001', sFaxNumber: '(703) 776-4100',
    dtClientSince: '2015-09-22T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 4, sSalesRepName: 'Rob Mancini',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '15,000', sBillTo: 'Customer',
    dblDiscountPct: 3, dblAdjustmentPct: 10,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '22042', sCity: 'Falls Church', sState: 'VA' },

  { lClientKey: 4005, sClientName1: 'Hackensack University Medical Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '30 Prospect Avenue', sMailAddr2: '', sMailCity: 'Hackensack', sMailState: 'NJ', sMailZip: '07601', sMailCountry: 'USA',
    sPhoneNumber: '+1 (551) 996-2000', sFaxNumber: '(551) 996-2100',
    dtClientSince: '2018-01-10T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 6, sSalesRepName: 'J. Miller',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt',
    sItemText: '10,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 10,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '07601', sCity: 'Hackensack', sState: 'NJ' },

  { lClientKey: 4006, sClientName1: 'UPMC Presbyterian', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '200 Lothrop Street', sMailAddr2: '', sMailCity: 'Pittsburgh', sMailState: 'PA', sMailZip: '15213', sMailCountry: 'USA',
    sPhoneNumber: '+1 (412) 647-2345', sFaxNumber: '(412) 647-2400',
    dtClientSince: '2008-11-05T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: true,
    lPricingCategoryKey: 2, sPricingDescription: 'Premier',
    lSalesRepKey: 7, sSalesRepName: 'R. Thompson',
    lDistributorKey: 2, sDistName1: 'Total Scope North',
    lPaymentTermsKey: 4, sTermsDesc: 'Net 90',
    sItemText: '40,000', sBillTo: 'Customer',
    dblDiscountPct: 10, dblAdjustmentPct: 25,
    bBlindPS3: true, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: true,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '15213', sCity: 'Pittsburgh', sState: 'PA' },

  { lClientKey: 4007, sClientName1: 'Beaumont Hospital Royal Oak', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '3601 W Thirteen Mile Road', sMailAddr2: '', sMailCity: 'Royal Oak', sMailState: 'MI', sMailZip: '48073', sMailCountry: 'USA',
    sPhoneNumber: '+1 (248) 898-5000', sFaxNumber: '(248) 898-5100',
    dtClientSince: '2020-04-18T00:00:00', nPortalMonths: 24,
    bActive: false, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 8, sSalesRepName: 'S. Chen',
    lDistributorKey: 3, sDistName1: 'Direct',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '10,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 8,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    sZipCode: '48073', sCity: 'Royal Oak', sState: 'MI' },

  // ── SR clients (Nashville) ──────────────────────────
  { lClientKey: 4008, sClientName1: 'MUSC Health University Hospital', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '171 Ashley Avenue', sMailAddr2: '', sMailCity: 'Charleston', sMailState: 'SC', sMailZip: '29425', sMailCountry: 'USA',
    sPhoneNumber: '+1 (843) 792-1414', sFaxNumber: '(843) 792-1500',
    dtClientSince: '2014-07-20T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 2, sSalesRepName: 'Brandi Cook',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '15,000', sBillTo: 'Customer',
    dblDiscountPct: 3, dblAdjustmentPct: 12,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '29425', sCity: 'Charleston', sState: 'SC' },

  { lClientKey: 4009, sClientName1: 'Johns Hopkins Bayview Medical Center', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '4940 Eastern Avenue', sMailAddr2: '', sMailCity: 'Baltimore', sMailState: 'MD', sMailZip: '21224', sMailCountry: 'USA',
    sPhoneNumber: '+1 (410) 550-0100', sFaxNumber: '(410) 550-0200',
    dtClientSince: '2010-02-14T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: true,
    lPricingCategoryKey: 5, sPricingDescription: 'HPG',
    lSalesRepKey: 5, sSalesRepName: 'Debbie Hightower',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 3, sTermsDesc: 'Net 60',
    sItemText: '35,000', sBillTo: 'Customer',
    dblDiscountPct: 7, dblAdjustmentPct: 18,
    bBlindPS3: false, bRequisitionTotalsOnly: true, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '21224', sCity: 'Baltimore', sState: 'MD' },

  { lClientKey: 4010, sClientName1: 'NYU Langone Hospital Brooklyn', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '150 55th Street', sMailAddr2: '', sMailCity: 'Brooklyn', sMailState: 'NY', sMailZip: '11220', sMailCountry: 'USA',
    sPhoneNumber: '+1 (718) 630-7000', sFaxNumber: '(718) 630-7100',
    dtClientSince: '2016-11-30T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 2, sPricingDescription: 'Premier',
    lSalesRepKey: 9, sSalesRepName: 'K. Davis',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '20,000', sBillTo: 'Customer',
    dblDiscountPct: 5, dblAdjustmentPct: 15,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '11220', sCity: 'Brooklyn', sState: 'NY' },

  { lClientKey: 4011, sClientName1: 'Barnes-Jewish Hospital', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '1 Barnes-Jewish Hospital Plaza', sMailAddr2: '', sMailCity: 'St. Louis', sMailState: 'MO', sMailZip: '63110', sMailCountry: 'USA',
    sPhoneNumber: '+1 (314) 747-3000', sFaxNumber: '(314) 747-3100',
    dtClientSince: '2011-08-25T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 3, sPricingDescription: 'GSA 2014 (Joint)',
    lSalesRepKey: 3, sSalesRepName: 'Tom Velez',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '20,000', sBillTo: 'Customer',
    dblDiscountPct: 4, dblAdjustmentPct: 12,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '63110', sCity: 'St. Louis', sState: 'MO' },

  { lClientKey: 4012, sClientName1: 'Baptist Health Lexington', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '1740 Nicholasville Road', sMailAddr2: '', sMailCity: 'Lexington', sMailState: 'KY', sMailZip: '40503', sMailCountry: 'USA',
    sPhoneNumber: '+1 (859) 260-6100', sFaxNumber: '(859) 260-6200',
    dtClientSince: '2019-05-12T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 1, sPricingDescription: 'Standard',
    lSalesRepKey: 1, sSalesRepName: 'Joseph Brassell',
    lDistributorKey: 1, sDistName1: 'Total Scope South',
    lPaymentTermsKey: 1, sTermsDesc: 'Due Upon Receipt',
    sItemText: '10,000', sBillTo: 'Customer',
    dblDiscountPct: 0, dblAdjustmentPct: 8,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '40503', sCity: 'Lexington', sState: 'KY' },

  { lClientKey: 4013, sClientName1: 'Merit Health Wesley', sClientName2: '', sUnitBuilding: '',
    sMailAddr1: '5001 Hardy Street', sMailAddr2: '', sMailCity: 'Hattiesburg', sMailState: 'MS', sMailZip: '39402', sMailCountry: 'USA',
    sPhoneNumber: '+1 (601) 268-8000', sFaxNumber: '(601) 268-8100',
    dtClientSince: '2022-02-01T00:00:00', nPortalMonths: 24,
    bActive: true, bSkipTracking: false, bOpenCreditMemo: false, bNationalAccount: false,
    lPricingCategoryKey: 4, sPricingDescription: 'Government',
    lSalesRepKey: 5, sSalesRepName: 'Debbie Hightower',
    lDistributorKey: 3, sDistName1: 'Direct',
    lPaymentTermsKey: 2, sTermsDesc: 'Net 30',
    sItemText: '8,000', sBillTo: 'Customer',
    dblDiscountPct: 2, dblAdjustmentPct: 10,
    bBlindPS3: false, bRequisitionTotalsOnly: false, bBlindTotalsOnFinal: false,
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    sZipCode: '39402', sCity: 'Hattiesburg', sState: 'MS' },
]);

// ── New Departments (+39) ─────────────────────────────
// Keys 28-66. Each new client gets 3-4 depts. Extra depts for existing clients with few.
MockDB.seed('departments', [
  // ── Existing client extras ──────────────────────────
  // 3341 West Side GI Center (NR, Chicago IL) — had only dept 20
  { lDepartmentKey: 28, lClientKey: 3341, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Chicago', sShipState: 'IL',
    sAddress1: '680 N Lake Shore Drive', sCity: 'Chicago', sState: 'IL', sZip: '60611',
    sPhone: '+1 (312) 555-0210', sContactName: 'Rachel Kim', sContactPhone: '+1 (312) 555-0200',
    sContactEmail: 'r.kim@westsidegi.com',
    lCleaningSystemKey: 1, lReportingGroupKey: 2, lDepartmentTypeKey: 1 },

  // 1650 Shreveport Endoscopy Center (NR) — had only dept 23
  { lDepartmentKey: 29, lClientKey: 1650, sDepartmentName: 'Sterile Processing',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Shreveport', sShipState: 'LA',
    sAddress1: '1 St Mary Place', sCity: 'Shreveport', sState: 'LA', sZip: '71101',
    sPhone: '+1 (318) 212-4055', sContactName: 'Angela Torres', sContactPhone: '+1 (318) 212-4050',
    sContactEmail: 'a.torres@shreveportendo.com',
    lCleaningSystemKey: 2, lReportingGroupKey: 3, lDepartmentTypeKey: 7 },

  // ── 4002 Baylor Scott & White (NR, Temple TX) — 3 depts ──
  { lDepartmentKey: 30, lClientKey: 4002, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Temple', sShipState: 'TX',
    sAddress1: '2401 S 31st Street', sCity: 'Temple', sState: 'TX', sZip: '76508',
    sPhone: '+1 (254) 724-2150', sContactName: 'Mark Hernandez', sContactPhone: '+1 (254) 724-2151',
    sContactEmail: 'm.hernandez@bswhealth.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 1, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 31, lClientKey: 4002, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Temple', sShipState: 'TX',
    sAddress1: '2401 S 31st Street', sCity: 'Temple', sState: 'TX', sZip: '76508',
    sPhone: '+1 (254) 724-2200', sContactName: 'Lisa Tran', sContactPhone: '+1 (254) 724-2201',
    sContactEmail: 'l.tran@bswhealth.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 1, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 32, lClientKey: 4002, sDepartmentName: 'Pulmonology',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Temple', sShipState: 'TX',
    sAddress1: '2401 S 31st Street', sCity: 'Temple', sState: 'TX', sZip: '76508',
    sPhone: '+1 (254) 724-2300', sContactName: 'Craig Adams', sContactPhone: '+1 (254) 724-2301',
    sContactEmail: 'c.adams@bswhealth.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 4, lDepartmentTypeKey: 5 },

  // ── 4003 Duke University Hospital (NR, Durham NC) — 4 depts ──
  { lDepartmentKey: 33, lClientKey: 4003, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Durham', sShipState: 'NC',
    sAddress1: '2301 Erwin Road', sCity: 'Durham', sState: 'NC', sZip: '27710',
    sPhone: '+1 (919) 684-8200', sContactName: 'Patricia Owens', sContactPhone: '+1 (919) 684-8201',
    sContactEmail: 'p.owens@duke.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 2, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 34, lClientKey: 4003, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Durham', sShipState: 'NC',
    sAddress1: '2301 Erwin Road', sCity: 'Durham', sState: 'NC', sZip: '27710',
    sPhone: '+1 (919) 684-8300', sContactName: 'Dennis Washington', sContactPhone: '+1 (919) 684-8301',
    sContactEmail: 'd.washington@duke.edu',
    lCleaningSystemKey: 2, lReportingGroupKey: 2, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 35, lClientKey: 4003, sDepartmentName: 'Urology',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Durham', sShipState: 'NC',
    sAddress1: '2301 Erwin Road', sCity: 'Durham', sState: 'NC', sZip: '27710',
    sPhone: '+1 (919) 684-8400', sContactName: 'James Yee', sContactPhone: '+1 (919) 684-8401',
    sContactEmail: 'j.yee@duke.edu',
    lCleaningSystemKey: 3, lReportingGroupKey: 5, lDepartmentTypeKey: 4 },
  { lDepartmentKey: 36, lClientKey: 4003, sDepartmentName: 'Biomedical Engineering',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Durham', sShipState: 'NC',
    sAddress1: '2301 Erwin Road', sCity: 'Durham', sState: 'NC', sZip: '27710',
    sPhone: '+1 (919) 684-8500', sContactName: 'Allen Rhodes', sContactPhone: '+1 (919) 684-8501',
    sContactEmail: 'a.rhodes@duke.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 2, lDepartmentTypeKey: 8 },

  // ── 4004 Inova Fairfax (NR, Falls Church VA) — 3 depts ──
  { lDepartmentKey: 37, lClientKey: 4004, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Falls Church', sShipState: 'VA',
    sAddress1: '3300 Gallows Road', sCity: 'Falls Church', sState: 'VA', sZip: '22042',
    sPhone: '+1 (703) 776-4100', sContactName: 'Sharon Burke', sContactPhone: '+1 (703) 776-4101',
    sContactEmail: 's.burke@inova.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 3, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 38, lClientKey: 4004, sDepartmentName: 'ICU / Critical Care',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Falls Church', sShipState: 'VA',
    sAddress1: '3300 Gallows Road', sCity: 'Falls Church', sState: 'VA', sZip: '22042',
    sPhone: '+1 (703) 776-4200', sContactName: 'Eric Lamb', sContactPhone: '+1 (703) 776-4201',
    sContactEmail: 'e.lamb@inova.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 6, lDepartmentTypeKey: 6 },
  { lDepartmentKey: 39, lClientKey: 4004, sDepartmentName: 'Otolaryngology',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: false, sShipCity: 'Falls Church', sShipState: 'VA',
    sAddress1: '3300 Gallows Road', sCity: 'Falls Church', sState: 'VA', sZip: '22042',
    sPhone: '+1 (703) 776-4300', sContactName: 'Nina Patel', sContactPhone: '+1 (703) 776-4301',
    sContactEmail: 'n.patel@inova.org',
    lCleaningSystemKey: 3, lReportingGroupKey: 7, lDepartmentTypeKey: 9 },

  // ── 4005 Hackensack UMC (NR, Hackensack NJ) — 3 depts ──
  { lDepartmentKey: 40, lClientKey: 4005, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Hackensack', sShipState: 'NJ',
    sAddress1: '30 Prospect Avenue', sCity: 'Hackensack', sState: 'NJ', sZip: '07601',
    sPhone: '+1 (551) 996-2050', sContactName: 'Greg Santoro', sContactPhone: '+1 (551) 996-2051',
    sContactEmail: 'g.santoro@hackensackmeridian.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 1, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 41, lClientKey: 4005, sDepartmentName: 'Sterile Processing',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Hackensack', sShipState: 'NJ',
    sAddress1: '30 Prospect Avenue', sCity: 'Hackensack', sState: 'NJ', sZip: '07601',
    sPhone: '+1 (551) 996-2060', sContactName: 'Yolanda Reyes', sContactPhone: '+1 (551) 996-2061',
    sContactEmail: 'y.reyes@hackensackmeridian.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 4, lDepartmentTypeKey: 7 },
  { lDepartmentKey: 42, lClientKey: 4005, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Hackensack', sShipState: 'NJ',
    sAddress1: '30 Prospect Avenue', sCity: 'Hackensack', sState: 'NJ', sZip: '07601',
    sPhone: '+1 (551) 996-2070', sContactName: 'David Archer', sContactPhone: '+1 (551) 996-2071',
    sContactEmail: 'd.archer@hackensackmeridian.org',
    lCleaningSystemKey: 3, lReportingGroupKey: 1, lDepartmentTypeKey: 3 },

  // ── 4006 UPMC Presbyterian (NR, Pittsburgh PA) — 4 depts ──
  { lDepartmentKey: 43, lClientKey: 4006, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Pittsburgh', sShipState: 'PA',
    sAddress1: '200 Lothrop Street', sCity: 'Pittsburgh', sState: 'PA', sZip: '15213',
    sPhone: '+1 (412) 647-2400', sContactName: 'Rebecca Voss', sContactPhone: '+1 (412) 647-2401',
    sContactEmail: 'r.voss@upmc.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 5, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 44, lClientKey: 4006, sDepartmentName: 'Cardiology',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Pittsburgh', sShipState: 'PA',
    sAddress1: '200 Lothrop Street', sCity: 'Pittsburgh', sState: 'PA', sZip: '15213',
    sPhone: '+1 (412) 647-2500', sContactName: 'Thomas Greer', sContactPhone: '+1 (412) 647-2501',
    sContactEmail: 't.greer@upmc.edu',
    lCleaningSystemKey: 2, lReportingGroupKey: 6, lDepartmentTypeKey: 5 },
  { lDepartmentKey: 45, lClientKey: 4006, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Pittsburgh', sShipState: 'PA',
    sAddress1: '200 Lothrop Street', sCity: 'Pittsburgh', sState: 'PA', sZip: '15213',
    sPhone: '+1 (412) 647-2600', sContactName: 'Amy Kaufman', sContactPhone: '+1 (412) 647-2601',
    sContactEmail: 'a.kaufman@upmc.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 5, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 46, lClientKey: 4006, sDepartmentName: 'Biomedical Engineering',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Pittsburgh', sShipState: 'PA',
    sAddress1: '200 Lothrop Street', sCity: 'Pittsburgh', sState: 'PA', sZip: '15213',
    sPhone: '+1 (412) 647-2700', sContactName: 'Kevin Slater', sContactPhone: '+1 (412) 647-2701',
    sContactEmail: 'k.slater@upmc.edu',
    lCleaningSystemKey: 3, lReportingGroupKey: 5, lDepartmentTypeKey: 8 },

  // ── 4007 Beaumont Royal Oak (NR, Royal Oak MI) — 3 depts ──
  { lDepartmentKey: 47, lClientKey: 4007, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Royal Oak', sShipState: 'MI',
    sAddress1: '3601 W Thirteen Mile Road', sCity: 'Royal Oak', sState: 'MI', sZip: '48073',
    sPhone: '+1 (248) 898-5100', sContactName: 'Donna Michaels', sContactPhone: '+1 (248) 898-5101',
    sContactEmail: 'd.michaels@beaumont.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 3, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 48, lClientKey: 4007, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: false, sShipCity: 'Royal Oak', sShipState: 'MI',
    sAddress1: '3601 W Thirteen Mile Road', sCity: 'Royal Oak', sState: 'MI', sZip: '48073',
    sPhone: '+1 (248) 898-5200', sContactName: 'Janet Novak', sContactPhone: '+1 (248) 898-5201',
    sContactEmail: 'j.novak@beaumont.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 3, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 49, lClientKey: 4007, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 1, sServiceLocationName: 'Upper Chichester',
    bActive: true, sShipCity: 'Royal Oak', sShipState: 'MI',
    sAddress1: '3601 W Thirteen Mile Road', sCity: 'Royal Oak', sState: 'MI', sZip: '48073',
    sPhone: '+1 (248) 898-5300', sContactName: 'Brian Cope', sContactPhone: '+1 (248) 898-5301',
    sContactEmail: 'b.cope@beaumont.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 7, lDepartmentTypeKey: 3 },

  // ── 4008 MUSC Health (SR, Charleston SC) — 3 depts ──
  { lDepartmentKey: 50, lClientKey: 4008, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Charleston', sShipState: 'SC',
    sAddress1: '171 Ashley Avenue', sCity: 'Charleston', sState: 'SC', sZip: '29425',
    sPhone: '+1 (843) 792-1500', sContactName: 'Tina Caldwell', sContactPhone: '+1 (843) 792-1501',
    sContactEmail: 't.caldwell@musc.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 4, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 51, lClientKey: 4008, sDepartmentName: 'Pulmonology',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Charleston', sShipState: 'SC',
    sAddress1: '171 Ashley Avenue', sCity: 'Charleston', sState: 'SC', sZip: '29425',
    sPhone: '+1 (843) 792-1600', sContactName: 'Marcus Reed', sContactPhone: '+1 (843) 792-1601',
    sContactEmail: 'm.reed@musc.edu',
    lCleaningSystemKey: 2, lReportingGroupKey: 4, lDepartmentTypeKey: 5 },
  { lDepartmentKey: 52, lClientKey: 4008, sDepartmentName: 'Sterile Processing',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Charleston', sShipState: 'SC',
    sAddress1: '171 Ashley Avenue', sCity: 'Charleston', sState: 'SC', sZip: '29425',
    sPhone: '+1 (843) 792-1700', sContactName: 'Kathy Lowe', sContactPhone: '+1 (843) 792-1701',
    sContactEmail: 'k.lowe@musc.edu',
    lCleaningSystemKey: 3, lReportingGroupKey: 6, lDepartmentTypeKey: 7 },

  // ── 4009 Johns Hopkins Bayview (SR, Baltimore MD) — 4 depts ──
  { lDepartmentKey: 53, lClientKey: 4009, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Baltimore', sShipState: 'MD',
    sAddress1: '4940 Eastern Avenue', sCity: 'Baltimore', sState: 'MD', sZip: '21224',
    sPhone: '+1 (410) 550-0300', sContactName: 'Steven Cho', sContactPhone: '+1 (410) 550-0301',
    sContactEmail: 's.cho@jhmi.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 2, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 54, lClientKey: 4009, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Baltimore', sShipState: 'MD',
    sAddress1: '4940 Eastern Avenue', sCity: 'Baltimore', sState: 'MD', sZip: '21224',
    sPhone: '+1 (410) 550-0400', sContactName: 'Laura Jennings', sContactPhone: '+1 (410) 550-0401',
    sContactEmail: 'l.jennings@jhmi.edu',
    lCleaningSystemKey: 2, lReportingGroupKey: 2, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 55, lClientKey: 4009, sDepartmentName: 'Biomedical Engineering',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Baltimore', sShipState: 'MD',
    sAddress1: '4940 Eastern Avenue', sCity: 'Baltimore', sState: 'MD', sZip: '21224',
    sPhone: '+1 (410) 550-0500', sContactName: 'Dan McBride', sContactPhone: '+1 (410) 550-0501',
    sContactEmail: 'd.mcbride@jhmi.edu',
    lCleaningSystemKey: 1, lReportingGroupKey: 7, lDepartmentTypeKey: 8 },
  { lDepartmentKey: 56, lClientKey: 4009, sDepartmentName: 'Urology',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Baltimore', sShipState: 'MD',
    sAddress1: '4940 Eastern Avenue', sCity: 'Baltimore', sState: 'MD', sZip: '21224',
    sPhone: '+1 (410) 550-0600', sContactName: 'Henry Park', sContactPhone: '+1 (410) 550-0601',
    sContactEmail: 'h.park@jhmi.edu',
    lCleaningSystemKey: 3, lReportingGroupKey: 5, lDepartmentTypeKey: 4 },

  // ── 4010 NYU Langone Brooklyn (SR, Brooklyn NY) — 3 depts ──
  { lDepartmentKey: 57, lClientKey: 4010, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Brooklyn', sShipState: 'NY',
    sAddress1: '150 55th Street', sCity: 'Brooklyn', sState: 'NY', sZip: '11220',
    sPhone: '+1 (718) 630-7100', sContactName: 'Michelle Ortiz', sContactPhone: '+1 (718) 630-7101',
    sContactEmail: 'm.ortiz@nyulangone.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 1, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 58, lClientKey: 4010, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Brooklyn', sShipState: 'NY',
    sAddress1: '150 55th Street', sCity: 'Brooklyn', sState: 'NY', sZip: '11220',
    sPhone: '+1 (718) 630-7200', sContactName: 'Carlos Vega', sContactPhone: '+1 (718) 630-7201',
    sContactEmail: 'c.vega@nyulangone.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 3, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 59, lClientKey: 4010, sDepartmentName: 'Cardiology',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: false, sShipCity: 'Brooklyn', sShipState: 'NY',
    sAddress1: '150 55th Street', sCity: 'Brooklyn', sState: 'NY', sZip: '11220',
    sPhone: '+1 (718) 630-7300', sContactName: 'Roy Albrecht', sContactPhone: '+1 (718) 630-7301',
    sContactEmail: 'r.albrecht@nyulangone.org',
    lCleaningSystemKey: 3, lReportingGroupKey: 6, lDepartmentTypeKey: 5 },

  // ── 4011 Barnes-Jewish (SR, St. Louis MO) — 3 depts ──
  { lDepartmentKey: 60, lClientKey: 4011, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'St. Louis', sShipState: 'MO',
    sAddress1: '1 Barnes-Jewish Hospital Plaza', sCity: 'St. Louis', sState: 'MO', sZip: '63110',
    sPhone: '+1 (314) 747-3200', sContactName: 'Brenda Scott', sContactPhone: '+1 (314) 747-3201',
    sContactEmail: 'b.scott@bjc.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 4, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 61, lClientKey: 4011, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'St. Louis', sShipState: 'MO',
    sAddress1: '1 Barnes-Jewish Hospital Plaza', sCity: 'St. Louis', sState: 'MO', sZip: '63110',
    sPhone: '+1 (314) 747-3300', sContactName: 'Wayne Dodd', sContactPhone: '+1 (314) 747-3301',
    sContactEmail: 'w.dodd@bjc.org',
    lCleaningSystemKey: 2, lReportingGroupKey: 4, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 62, lClientKey: 4011, sDepartmentName: 'Biomedical Engineering',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'St. Louis', sShipState: 'MO',
    sAddress1: '1 Barnes-Jewish Hospital Plaza', sCity: 'St. Louis', sState: 'MO', sZip: '63110',
    sPhone: '+1 (314) 747-3400', sContactName: 'Sam Kirkland', sContactPhone: '+1 (314) 747-3401',
    sContactEmail: 's.kirkland@bjc.org',
    lCleaningSystemKey: 1, lReportingGroupKey: 7, lDepartmentTypeKey: 8 },

  // ── 4012 Baptist Health Lexington (SR, Lexington KY) — 3 depts ──
  { lDepartmentKey: 63, lClientKey: 4012, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Lexington', sShipState: 'KY',
    sAddress1: '1740 Nicholasville Road', sCity: 'Lexington', sState: 'KY', sZip: '40503',
    sPhone: '+1 (859) 260-6200', sContactName: 'Andrea Fleming', sContactPhone: '+1 (859) 260-6201',
    sContactEmail: 'a.fleming@bhsi.com',
    lCleaningSystemKey: 1, lReportingGroupKey: 3, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 64, lClientKey: 4012, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Lexington', sShipState: 'KY',
    sAddress1: '1740 Nicholasville Road', sCity: 'Lexington', sState: 'KY', sZip: '40503',
    sPhone: '+1 (859) 260-6300', sContactName: 'Paul Brewer', sContactPhone: '+1 (859) 260-6301',
    sContactEmail: 'p.brewer@bhsi.com',
    lCleaningSystemKey: 2, lReportingGroupKey: 5, lDepartmentTypeKey: 3 },
  { lDepartmentKey: 65, lClientKey: 4012, sDepartmentName: 'Urology',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Lexington', sShipState: 'KY',
    sAddress1: '1740 Nicholasville Road', sCity: 'Lexington', sState: 'KY', sZip: '40503',
    sPhone: '+1 (859) 260-6400', sContactName: 'Mike Dawson', sContactPhone: '+1 (859) 260-6401',
    sContactEmail: 'm.dawson@bhsi.com',
    lCleaningSystemKey: 3, lReportingGroupKey: 6, lDepartmentTypeKey: 4 },

  // ── 4013 Merit Health Wesley (SR, Hattiesburg MS) — 3 depts ──
  { lDepartmentKey: 66, lClientKey: 4013, sDepartmentName: 'GI Lab',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Hattiesburg', sShipState: 'MS',
    sAddress1: '5001 Hardy Street', sCity: 'Hattiesburg', sState: 'MS', sZip: '39402',
    sPhone: '+1 (601) 268-8100', sContactName: 'Alicia Grant', sContactPhone: '+1 (601) 268-8101',
    sContactEmail: 'a.grant@merithealth.com',
    lCleaningSystemKey: 1, lReportingGroupKey: 1, lDepartmentTypeKey: 2 },
  { lDepartmentKey: 67, lClientKey: 4013, sDepartmentName: 'Endoscopy',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Hattiesburg', sShipState: 'MS',
    sAddress1: '5001 Hardy Street', sCity: 'Hattiesburg', sState: 'MS', sZip: '39402',
    sPhone: '+1 (601) 268-8200', sContactName: 'Tony Marsh', sContactPhone: '+1 (601) 268-8201',
    sContactEmail: 't.marsh@merithealth.com',
    lCleaningSystemKey: 2, lReportingGroupKey: 2, lDepartmentTypeKey: 1 },
  { lDepartmentKey: 68, lClientKey: 4013, sDepartmentName: 'Surgery / OR',
    lServiceLocationKey: 2, sServiceLocationName: 'Nashville',
    bActive: true, sShipCity: 'Hattiesburg', sShipState: 'MS',
    sAddress1: '5001 Hardy Street', sCity: 'Hattiesburg', sState: 'MS', sZip: '39402',
    sPhone: '+1 (601) 268-8300', sContactName: 'Rhonda Page', sContactPhone: '+1 (601) 268-8301',
    sContactEmail: 'r.page@merithealth.com',
    lCleaningSystemKey: 3, lReportingGroupKey: 3, lDepartmentTypeKey: 3 },
]);

// ── New Contacts (+25) ────────────────────────────────
// 2 per new client (client-level, lDepartmentKey: 0) = 24, plus 1 dept-level for existing client
MockDB.seed('contacts', [
  // ── 4002 Baylor Scott & White ──
  { lContactKey: 116, lClientKey: 4002, lDepartmentKey: 0,
    sContactLast: 'Hernandez', sContactFirst: 'Mark', sTitle: 'Biomed Manager',
    sContactPhoneNumber: '+1 (254) 724-2151', sContactFaxNumber: '(254) 724-2200',
    sContactEMail: 'm.hernandez@bswhealth.org', bActive: true },
  { lContactKey: 117, lClientKey: 4002, lDepartmentKey: 0,
    sContactLast: 'Tran', sContactFirst: 'Lisa', sTitle: 'OR Coordinator',
    sContactPhoneNumber: '+1 (254) 724-2201', sContactFaxNumber: '(254) 724-2200',
    sContactEMail: 'l.tran@bswhealth.org', bActive: true },

  // ── 4003 Duke University Hospital ──
  { lContactKey: 118, lClientKey: 4003, lDepartmentKey: 0,
    sContactLast: 'Owens', sContactFirst: 'Patricia', sTitle: 'GI Lab Director',
    sContactPhoneNumber: '+1 (919) 684-8201', sContactFaxNumber: '(919) 684-8200',
    sContactEMail: 'p.owens@duke.edu', bActive: true },
  { lContactKey: 119, lClientKey: 4003, lDepartmentKey: 0,
    sContactLast: 'Rhodes', sContactFirst: 'Allen', sTitle: 'Biomedical Engineering Director',
    sContactPhoneNumber: '+1 (919) 684-8501', sContactFaxNumber: '(919) 684-8200',
    sContactEMail: 'a.rhodes@duke.edu', bActive: true },

  // ── 4004 Inova Fairfax ──
  { lContactKey: 120, lClientKey: 4004, lDepartmentKey: 0,
    sContactLast: 'Burke', sContactFirst: 'Sharon', sTitle: 'Nurse Manager',
    sContactPhoneNumber: '+1 (703) 776-4101', sContactFaxNumber: '(703) 776-4100',
    sContactEMail: 's.burke@inova.org', bActive: true },
  { lContactKey: 121, lClientKey: 4004, lDepartmentKey: 0,
    sContactLast: 'Patel', sContactFirst: 'Nina', sTitle: 'Clinical Director',
    sContactPhoneNumber: '+1 (703) 776-4301', sContactFaxNumber: '(703) 776-4100',
    sContactEMail: 'n.patel@inova.org', bActive: true },

  // ── 4005 Hackensack UMC ──
  { lContactKey: 122, lClientKey: 4005, lDepartmentKey: 0,
    sContactLast: 'Santoro', sContactFirst: 'Greg', sTitle: 'GI Lab Director',
    sContactPhoneNumber: '+1 (551) 996-2051', sContactFaxNumber: '(551) 996-2100',
    sContactEMail: 'g.santoro@hackensackmeridian.org', bActive: true },
  { lContactKey: 123, lClientKey: 4005, lDepartmentKey: 0,
    sContactLast: 'Reyes', sContactFirst: 'Yolanda', sTitle: 'Sterile Processing Manager',
    sContactPhoneNumber: '+1 (551) 996-2061', sContactFaxNumber: '(551) 996-2100',
    sContactEMail: 'y.reyes@hackensackmeridian.org', bActive: true },

  // ── 4006 UPMC Presbyterian ──
  { lContactKey: 124, lClientKey: 4006, lDepartmentKey: 0,
    sContactLast: 'Voss', sContactFirst: 'Rebecca', sTitle: 'Endoscopy Director',
    sContactPhoneNumber: '+1 (412) 647-2401', sContactFaxNumber: '(412) 647-2400',
    sContactEMail: 'r.voss@upmc.edu', bActive: true },
  { lContactKey: 125, lClientKey: 4006, lDepartmentKey: 0,
    sContactLast: 'Slater', sContactFirst: 'Kevin', sTitle: 'Biomed Manager',
    sContactPhoneNumber: '+1 (412) 647-2701', sContactFaxNumber: '(412) 647-2400',
    sContactEMail: 'k.slater@upmc.edu', bActive: true },

  // ── 4007 Beaumont Royal Oak ──
  { lContactKey: 126, lClientKey: 4007, lDepartmentKey: 0,
    sContactLast: 'Michaels', sContactFirst: 'Donna', sTitle: 'Purchasing',
    sContactPhoneNumber: '+1 (248) 898-5101', sContactFaxNumber: '(248) 898-5100',
    sContactEMail: 'd.michaels@beaumont.org', bActive: true },
  { lContactKey: 127, lClientKey: 4007, lDepartmentKey: 0,
    sContactLast: 'Cope', sContactFirst: 'Brian', sTitle: 'OR Coordinator',
    sContactPhoneNumber: '+1 (248) 898-5301', sContactFaxNumber: '(248) 898-5100',
    sContactEMail: 'b.cope@beaumont.org', bActive: true },

  // ── 4008 MUSC Health ──
  { lContactKey: 128, lClientKey: 4008, lDepartmentKey: 0,
    sContactLast: 'Caldwell', sContactFirst: 'Tina', sTitle: 'Endoscopy Director',
    sContactPhoneNumber: '+1 (843) 792-1501', sContactFaxNumber: '(843) 792-1500',
    sContactEMail: 't.caldwell@musc.edu', bActive: true },
  { lContactKey: 129, lClientKey: 4008, lDepartmentKey: 0,
    sContactLast: 'Reed', sContactFirst: 'Marcus', sTitle: 'Pulmonology Nurse Manager',
    sContactPhoneNumber: '+1 (843) 792-1601', sContactFaxNumber: '(843) 792-1500',
    sContactEMail: 'm.reed@musc.edu', bActive: true },

  // ── 4009 Johns Hopkins Bayview ──
  { lContactKey: 130, lClientKey: 4009, lDepartmentKey: 0,
    sContactLast: 'Cho', sContactFirst: 'Steven', sTitle: 'GI Lab Director',
    sContactPhoneNumber: '+1 (410) 550-0301', sContactFaxNumber: '(410) 550-0200',
    sContactEMail: 's.cho@jhmi.edu', bActive: true },
  { lContactKey: 131, lClientKey: 4009, lDepartmentKey: 0,
    sContactLast: 'Jennings', sContactFirst: 'Laura', sTitle: 'OR Coordinator',
    sContactPhoneNumber: '+1 (410) 550-0401', sContactFaxNumber: '(410) 550-0200',
    sContactEMail: 'l.jennings@jhmi.edu', bActive: true },

  // ── 4010 NYU Langone Brooklyn ──
  { lContactKey: 132, lClientKey: 4010, lDepartmentKey: 0,
    sContactLast: 'Ortiz', sContactFirst: 'Michelle', sTitle: 'Nurse Manager',
    sContactPhoneNumber: '+1 (718) 630-7101', sContactFaxNumber: '(718) 630-7100',
    sContactEMail: 'm.ortiz@nyulangone.org', bActive: true },
  { lContactKey: 133, lClientKey: 4010, lDepartmentKey: 0,
    sContactLast: 'Vega', sContactFirst: 'Carlos', sTitle: 'Clinical Director',
    sContactPhoneNumber: '+1 (718) 630-7201', sContactFaxNumber: '(718) 630-7100',
    sContactEMail: 'c.vega@nyulangone.org', bActive: true },

  // ── 4011 Barnes-Jewish ──
  { lContactKey: 134, lClientKey: 4011, lDepartmentKey: 0,
    sContactLast: 'Scott', sContactFirst: 'Brenda', sTitle: 'GI Lab Director',
    sContactPhoneNumber: '+1 (314) 747-3201', sContactFaxNumber: '(314) 747-3100',
    sContactEMail: 'b.scott@bjc.org', bActive: true },
  { lContactKey: 135, lClientKey: 4011, lDepartmentKey: 0,
    sContactLast: 'Kirkland', sContactFirst: 'Sam', sTitle: 'Biomed Manager',
    sContactPhoneNumber: '+1 (314) 747-3401', sContactFaxNumber: '(314) 747-3100',
    sContactEMail: 's.kirkland@bjc.org', bActive: true },

  // ── 4012 Baptist Health Lexington ──
  { lContactKey: 136, lClientKey: 4012, lDepartmentKey: 0,
    sContactLast: 'Fleming', sContactFirst: 'Andrea', sTitle: 'Endoscopy Director',
    sContactPhoneNumber: '+1 (859) 260-6201', sContactFaxNumber: '(859) 260-6200',
    sContactEMail: 'a.fleming@bhsi.com', bActive: true },
  { lContactKey: 137, lClientKey: 4012, lDepartmentKey: 0,
    sContactLast: 'Brewer', sContactFirst: 'Paul', sTitle: 'Purchasing',
    sContactPhoneNumber: '+1 (859) 260-6301', sContactFaxNumber: '(859) 260-6200',
    sContactEMail: 'p.brewer@bhsi.com', bActive: true },

  // ── 4013 Merit Health Wesley ──
  { lContactKey: 138, lClientKey: 4013, lDepartmentKey: 0,
    sContactLast: 'Grant', sContactFirst: 'Alicia', sTitle: 'GI Lab Director',
    sContactPhoneNumber: '+1 (601) 268-8101', sContactFaxNumber: '(601) 268-8100',
    sContactEMail: 'a.grant@merithealth.com', bActive: true },
  { lContactKey: 139, lClientKey: 4013, lDepartmentKey: 0,
    sContactLast: 'Marsh', sContactFirst: 'Tony', sTitle: 'Biomed Manager',
    sContactPhoneNumber: '+1 (601) 268-8201', sContactFaxNumber: '(601) 268-8100',
    sContactEMail: 't.marsh@merithealth.com', bActive: true },

  // ── Dept-level contact for existing client (3502 — 88th Medical Group) ──
  { lContactKey: 140, lClientKey: 3502, lDepartmentKey: 11,
    sContactLast: 'Kowalski', sContactFirst: 'Andrea', sTitle: 'Endoscopy Unit Charge Nurse',
    sContactPhoneNumber: '+1 (937) 257-7680', sContactFaxNumber: '(937) 257-7700',
    sContactEMail: 'a.kowalski@wpafb.af.mil', bActive: true },
]);

// ── New Scopes (+70) ──────────────────────────────────
// Includes 1024-1035 (referenced by repairs but never seeded) + 1036-1093 (brand new)
MockDB.seed('scopes', [
  // ── Scopes 1024-1035: back-fill from repair references ──
  { lScopeKey: 1024, lScopeTypeKey: 1030, lDepartmentKey: 24, sSerialNumber: '5501234', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus TJF-Q180V' },
  { lScopeKey: 1025, lScopeTypeKey: 1023, lDepartmentKey: 18, sSerialNumber: '7820045', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Northside Hospital', sDepartmentName: 'Biomedical Engineering', sScopeTypeDesc: 'Pentax EB-1990i' },
  { lScopeKey: 1026, lScopeTypeKey: 1014, lDepartmentKey: 21, sSerialNumber: '2210887', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Metro Health Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lScopeKey: 1027, lScopeTypeKey: 1004, lDepartmentKey: 12, sSerialNumber: '8830221', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Tift Regional Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-Q165' },
  { lScopeKey: 1028, lScopeTypeKey: 1022, lDepartmentKey: 16, sSerialNumber: '6199402', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Nashville General Hospital', sDepartmentName: 'Pulmonology', sScopeTypeDesc: 'Olympus BF-1TH190' },
  { lScopeKey: 1029, lScopeTypeKey: 2004, lDepartmentKey: 25, sSerialNumber: '4412900', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1030, lScopeTypeKey: 1003, lDepartmentKey: 11, sSerialNumber: '3390556', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: '88th Medical Group', sDepartmentName: 'Endoscopy Unit', sScopeTypeDesc: 'Olympus GIF-H190' },
  { lScopeKey: 1031, lScopeTypeKey: 1005, lDepartmentKey: 23, sSerialNumber: '9910334', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Shreveport Endoscopy Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lScopeKey: 1032, lScopeTypeKey: 1030, lDepartmentKey: 15, sSerialNumber: '3188920', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Nashville General Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus TJF-Q180V' },
  { lScopeKey: 1033, lScopeTypeKey: 1010, lDepartmentKey: 10, sSerialNumber: '4480112', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: '88th Medical Group', sDepartmentName: 'Biomedical Engineering', sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lScopeKey: 1034, lScopeTypeKey: 1014, lDepartmentKey: 24, sSerialNumber: '5599871', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Tampa Minimally Invasive', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lScopeKey: 1035, lScopeTypeKey: 2001, lDepartmentKey: 19, sSerialNumber: '7715508', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Northside Hospital', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Storz 27005BA Cystoscope' },

  // ── Flexible scopes: Gastroscopes (1036-1045) ──
  { lScopeKey: 1036, lScopeTypeKey: 1001, lDepartmentKey: 30, sSerialNumber: '3802110', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H180' },
  { lScopeKey: 1037, lScopeTypeKey: 1002, lDepartmentKey: 33, sSerialNumber: 'GIF-HQ4401', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-HQ190' },
  { lScopeKey: 1038, lScopeTypeKey: 1003, lDepartmentKey: 37, sSerialNumber: '3805567', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Inova Fairfax Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H190' },
  { lScopeKey: 1039, lScopeTypeKey: 1004, lDepartmentKey: 40, sSerialNumber: 'GIF-Q1652', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Hackensack University Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-Q165' },
  { lScopeKey: 1040, lScopeTypeKey: 1001, lDepartmentKey: 43, sSerialNumber: '3809922', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H180' },
  { lScopeKey: 1041, lScopeTypeKey: 1005, lDepartmentKey: 50, sSerialNumber: 'EG-760Z-101', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'MUSC Health University Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lScopeKey: 1042, lScopeTypeKey: 1002, lDepartmentKey: 53, sSerialNumber: 'GIF-HQ5518', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-HQ190' },
  { lScopeKey: 1043, lScopeTypeKey: 1003, lDepartmentKey: 57, sSerialNumber: '3811445', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-H190' },
  { lScopeKey: 1044, lScopeTypeKey: 1001, lDepartmentKey: 60, sSerialNumber: '3812887', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Barnes-Jewish Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus GIF-H180' },
  { lScopeKey: 1045, lScopeTypeKey: 1004, lDepartmentKey: 63, sSerialNumber: 'GIF-Q1670', sRigidOrFlexible: 'F',
    sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus GIF-Q165' },

  // ── Flexible scopes: Colonoscopes (1046-1055) ──
  { lScopeKey: 1046, lScopeTypeKey: 1010, lDepartmentKey: 30, sSerialNumber: 'CF-HQ7701', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lScopeKey: 1047, lScopeTypeKey: 1011, lDepartmentKey: 33, sSerialNumber: '2920455', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus CF-H185L' },
  { lScopeKey: 1048, lScopeTypeKey: 1012, lDepartmentKey: 43, sSerialNumber: 'PCF-H190-55', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus PCF-H190DL' },
  { lScopeKey: 1049, lScopeTypeKey: 1014, lDepartmentKey: 53, sSerialNumber: 'EC-760R-220', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lScopeKey: 1050, lScopeTypeKey: 1013, lDepartmentKey: 57, sSerialNumber: 'PCF-H190-77', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus PCF-H190' },
  { lScopeKey: 1051, lScopeTypeKey: 1010, lDepartmentKey: 60, sSerialNumber: 'CF-HQ8804', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Barnes-Jewish Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lScopeKey: 1052, lScopeTypeKey: 1011, lDepartmentKey: 66, sSerialNumber: '2925501', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Merit Health Wesley', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus CF-H185L' },
  { lScopeKey: 1053, lScopeTypeKey: 1010, lDepartmentKey: 47, sSerialNumber: 'CF-HQ9912', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Beaumont Hospital Royal Oak', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lScopeKey: 1054, lScopeTypeKey: 1012, lDepartmentKey: 37, sSerialNumber: 'PCF-DL-415', sRigidOrFlexible: 'F',
    sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'Inova Fairfax Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus PCF-H190DL' },
  { lScopeKey: 1055, lScopeTypeKey: 1013, lDepartmentKey: 63, sSerialNumber: 'PCF-H190-88', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus PCF-H190' },

  // ── Flexible scopes: Bronchoscopes (1056-1060) ──
  { lScopeKey: 1056, lScopeTypeKey: 1020, lDepartmentKey: 32, sSerialNumber: 'BF-P290-TX1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Pulmonology', sScopeTypeDesc: 'Olympus BF-P290' },
  { lScopeKey: 1057, lScopeTypeKey: 1021, lDepartmentKey: 51, sSerialNumber: 'BF-UC180F-09', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'MUSC Health University Hospital', sDepartmentName: 'Pulmonology', sScopeTypeDesc: 'Olympus BF-UC180F' },
  { lScopeKey: 1058, lScopeTypeKey: 1022, lDepartmentKey: 44, sSerialNumber: 'BF-1TH190-22', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Cardiology', sScopeTypeDesc: 'Olympus BF-1TH190' },
  { lScopeKey: 1059, lScopeTypeKey: 1023, lDepartmentKey: 36, sSerialNumber: 'EB-1990i-DK', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Biomedical Engineering', sScopeTypeDesc: 'Pentax EB-1990i' },
  { lScopeKey: 1060, lScopeTypeKey: 1020, lDepartmentKey: 67, sSerialNumber: 'BF-P290-MS1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Merit Health Wesley', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus BF-P290' },

  // ── Flexible scopes: Duodenoscopes (1061-1065) ──
  { lScopeKey: 1061, lScopeTypeKey: 1030, lDepartmentKey: 33, sSerialNumber: 'TJF-Q180-DK1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus TJF-Q180V' },
  { lScopeKey: 1062, lScopeTypeKey: 1031, lDepartmentKey: 40, sSerialNumber: 'FG-34W-HK2', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Hackensack University Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Pentax FG-34W' },
  { lScopeKey: 1063, lScopeTypeKey: 1030, lDepartmentKey: 53, sSerialNumber: 'TJF-Q180-JH1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus TJF-Q180V' },
  { lScopeKey: 1064, lScopeTypeKey: 1031, lDepartmentKey: 60, sSerialNumber: 'FG-34W-BJ1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Barnes-Jewish Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Pentax FG-34W' },
  { lScopeKey: 1065, lScopeTypeKey: 1030, lDepartmentKey: 43, sSerialNumber: 'TJF-Q180-PM1', sRigidOrFlexible: 'F',
    sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus TJF-Q180V' },

  // ── Rigid scopes: Cystoscopes, Arthroscopes, Resectoscopes (1066-1085) ──
  { lScopeKey: 1066, lScopeTypeKey: 2001, lDepartmentKey: 35, sSerialNumber: '27005-DK1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lScopeKey: 1067, lScopeTypeKey: 2002, lDepartmentKey: 35, sSerialNumber: '26003-DK1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Storz 26003BA Resectoscope' },
  { lScopeKey: 1068, lScopeTypeKey: 2003, lDepartmentKey: 56, sSerialNumber: 'URF-V2-JH1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus URF-V2' },
  { lScopeKey: 1069, lScopeTypeKey: 2004, lDepartmentKey: 56, sSerialNumber: 'CYF-V2-JH1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1070, lScopeTypeKey: 2005, lDepartmentKey: 34, sSerialNumber: 'A5394-DK2', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 5mm Arthroscope' },
  { lScopeKey: 1071, lScopeTypeKey: 2001, lDepartmentKey: 65, sSerialNumber: '27005-BH1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Urology', sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lScopeKey: 1072, lScopeTypeKey: 2002, lDepartmentKey: 45, sSerialNumber: '26003-PM1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Storz 26003BA Resectoscope' },
  { lScopeKey: 1073, lScopeTypeKey: 2003, lDepartmentKey: 31, sSerialNumber: 'URF-V2-TX1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus URF-V2' },
  { lScopeKey: 1074, lScopeTypeKey: 2004, lDepartmentKey: 42, sSerialNumber: 'CYF-V2-HK1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Hackensack University Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1075, lScopeTypeKey: 2005, lDepartmentKey: 58, sSerialNumber: 'A5394-NY1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 5mm Arthroscope' },
  { lScopeKey: 1076, lScopeTypeKey: 2001, lDepartmentKey: 54, sSerialNumber: '27005-JH2', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lScopeKey: 1077, lScopeTypeKey: 2002, lDepartmentKey: 64, sSerialNumber: '26003-BH1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Storz 26003BA Resectoscope' },
  { lScopeKey: 1078, lScopeTypeKey: 2003, lDepartmentKey: 68, sSerialNumber: 'URF-V2-MS1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Merit Health Wesley', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus URF-V2' },
  { lScopeKey: 1079, lScopeTypeKey: 2004, lDepartmentKey: 49, sSerialNumber: 'CYF-V2-MI1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Beaumont Hospital Royal Oak', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1080, lScopeTypeKey: 2005, lDepartmentKey: 45, sSerialNumber: 'A5394-PM2', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 5mm Arthroscope' },
  { lScopeKey: 1081, lScopeTypeKey: 2001, lDepartmentKey: 38, sSerialNumber: '27005-VA1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Inova Fairfax Hospital', sDepartmentName: 'ICU / Critical Care', sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lScopeKey: 1082, lScopeTypeKey: 2002, lDepartmentKey: 50, sSerialNumber: '26003-SC1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'MUSC Health University Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Storz 26003BA Resectoscope' },
  { lScopeKey: 1083, lScopeTypeKey: 2003, lDepartmentKey: 57, sSerialNumber: 'URF-V2-NY1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus URF-V2' },
  { lScopeKey: 1084, lScopeTypeKey: 2004, lDepartmentKey: 61, sSerialNumber: 'CYF-V2-MO1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Barnes-Jewish Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus CYF-V2' },
  { lScopeKey: 1085, lScopeTypeKey: 2005, lDepartmentKey: 66, sSerialNumber: 'A5394-MS1', sRigidOrFlexible: 'R',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Merit Health Wesley', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Stryker 5mm Arthroscope' },

  // ── Camera/Video scopes (1086-1095) ──
  { lScopeKey: 1086, lScopeTypeKey: 3001, lDepartmentKey: 34, sSerialNumber: '1288-DK1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1288 Camera Head' },
  { lScopeKey: 1087, lScopeTypeKey: 3002, lDepartmentKey: 45, sSerialNumber: '1588-PM1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1588 Camera Head' },
  { lScopeKey: 1088, lScopeTypeKey: 3003, lDepartmentKey: 54, sSerialNumber: 'OTV-SP1-JH1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus OTV-SP1' },
  { lScopeKey: 1089, lScopeTypeKey: 3004, lDepartmentKey: 54, sSerialNumber: 'CLV-S200-JH1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus CLV-S200' },
  { lScopeKey: 1090, lScopeTypeKey: 3001, lDepartmentKey: 58, sSerialNumber: '1288-NY1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1288 Camera Head' },
  { lScopeKey: 1091, lScopeTypeKey: 3002, lDepartmentKey: 31, sSerialNumber: '1588-TX1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1588 Camera Head' },
  { lScopeKey: 1092, lScopeTypeKey: 3003, lDepartmentKey: 42, sSerialNumber: 'OTV-SP1-HK1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Hackensack University Medical Center', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus OTV-SP1' },
  { lScopeKey: 1093, lScopeTypeKey: 3004, lDepartmentKey: 68, sSerialNumber: 'CLV-S200-MS1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Merit Health Wesley', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Olympus CLV-S200' },
  { lScopeKey: 1094, lScopeTypeKey: 3001, lDepartmentKey: 64, sSerialNumber: '1288-KY1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1288 Camera Head' },
  { lScopeKey: 1095, lScopeTypeKey: 3002, lDepartmentKey: 49, sSerialNumber: '1588-MI1', sRigidOrFlexible: 'C',
    sScopeIsDead: 'Y', bOnSiteLoaner: false, sClientName1: 'Beaumont Hospital Royal Oak', sDepartmentName: 'Surgery / OR', sScopeTypeDesc: 'Stryker 1588 Camera Head' },

  // ── Instruments (1096-1105) ──
  { lScopeKey: 1096, lScopeTypeKey: 4001, lDepartmentKey: 33, sSerialNumber: 'FG-47L-DK1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus FG-47L Biopsy Forceps' },
  { lScopeKey: 1097, lScopeTypeKey: 4002, lDepartmentKey: 43, sSerialNumber: 'SD-230U-PM1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'UPMC Presbyterian', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus SD-230U Snare' },
  { lScopeKey: 1098, lScopeTypeKey: 4003, lDepartmentKey: 35, sSerialNumber: 'WA50012A-DK1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Duke University Hospital', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus WA50012A Resectoscope' },
  { lScopeKey: 1099, lScopeTypeKey: 4001, lDepartmentKey: 50, sSerialNumber: 'FG-47L-SC1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'MUSC Health University Hospital', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus FG-47L Biopsy Forceps' },
  { lScopeKey: 1100, lScopeTypeKey: 4002, lDepartmentKey: 53, sSerialNumber: 'SD-230U-JH1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus SD-230U Snare' },
  { lScopeKey: 1101, lScopeTypeKey: 4003, lDepartmentKey: 56, sSerialNumber: 'WA50012A-JH1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Johns Hopkins Bayview Medical Center', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus WA50012A Resectoscope' },
  { lScopeKey: 1102, lScopeTypeKey: 4001, lDepartmentKey: 57, sSerialNumber: 'FG-47L-NY1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'NYU Langone Hospital Brooklyn', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus FG-47L Biopsy Forceps' },
  { lScopeKey: 1103, lScopeTypeKey: 4002, lDepartmentKey: 60, sSerialNumber: 'SD-230U-MO1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Barnes-Jewish Hospital', sDepartmentName: 'GI Lab', sScopeTypeDesc: 'Olympus SD-230U Snare' },
  { lScopeKey: 1104, lScopeTypeKey: 4003, lDepartmentKey: 65, sSerialNumber: 'WA50012A-KY1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baptist Health Lexington', sDepartmentName: 'Urology', sScopeTypeDesc: 'Olympus WA50012A Resectoscope' },
  { lScopeKey: 1105, lScopeTypeKey: 4001, lDepartmentKey: 30, sSerialNumber: 'FG-47L-TX1', sRigidOrFlexible: 'I',
    sScopeIsDead: 'N', bOnSiteLoaner: false, sClientName1: 'Baylor Scott & White Medical Center', sDepartmentName: 'Endoscopy', sScopeTypeDesc: 'Olympus FG-47L Biopsy Forceps' },
]);

console.log('[MockDB] Phase 5 seeded: +12 clients (4002-4013), +41 departments (28-68), +25 contacts (116-140), +82 scopes (1024-1105 incl. 12 back-fills)');
// ═══════════════════════════════════════════════════════
//  WP-5: Expanded Suppliers, Inventory, Acquisitions & POs
//  Append to mock-db.js after Phase 3
// ═══════════════════════════════════════════════════════

// ── Suppliers (+7, keys 6-12) ─────────────────────────
MockDB.seed('suppliers', [
  { lSupplierKey: 6,  sSupplierName: 'Pentax Medical',       sAddress1: '3 Paragon Dr',             sCity: 'Montvale',       sState: 'NJ', sZip: '07645', sPhoneNumber: '+1 (800) 431-5880', sFaxNumber: '(201) 391-4189', sContactName: 'Linda Matsuda',   sContactEmail: 'lmatsuda@pentaxmedical.com',  bActive: true, bPartsVendor: false, bRepairVendor: true,  bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 7,  sSupplierName: 'Smith & Nephew Endo',  sAddress1: '150 Minuteman Rd',         sCity: 'Andover',        sState: 'MA', sZip: '01810', sPhoneNumber: '+1 (800) 343-5717', sFaxNumber: '(978) 749-1108', sContactName: 'Brian Kelley',    sContactEmail: 'bkelley@smith-nephew.com',    bActive: true, bPartsVendor: true,  bRepairVendor: true,  bAcquisitionVendor: true,  bCartsVendor: false },
  { lSupplierKey: 8,  sSupplierName: 'Arthrex Inc.',         sAddress1: '1370 Creekside Blvd',      sCity: 'Naples',         sState: 'FL', sZip: '34108', sPhoneNumber: '+1 (800) 933-7001', sFaxNumber: '(239) 643-5559', sContactName: 'Diane Ramirez',   sContactEmail: 'dramirez@arthrex.com',        bActive: true, bPartsVendor: true,  bRepairVendor: false, bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 9,  sSupplierName: 'ConMed Corporation',   sAddress1: '525 French Rd',            sCity: 'Utica',          sState: 'NY', sZip: '13502', sPhoneNumber: '+1 (800) 448-6506', sFaxNumber: '(315) 624-3601', sContactName: 'Tom Vitale',      sContactEmail: 'tvitale@conmed.com',          bActive: true, bPartsVendor: true,  bRepairVendor: false, bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 10, sSupplierName: 'Machida Endoscope',    sAddress1: '40 Boroline Rd',           sCity: 'Allendale',      sState: 'NJ', sZip: '07401', sPhoneNumber: '+1 (201) 818-7400', sFaxNumber: '(201) 818-7401', sContactName: 'Kenji Watanabe',  sContactEmail: 'kwatanabe@machida.com',       bActive: true, bPartsVendor: false, bRepairVendor: true,  bAcquisitionVendor: false, bCartsVendor: false },
  { lSupplierKey: 11, sSupplierName: 'Medivators (Cantel)',   sAddress1: '14605 28th Ave N',         sCity: 'Plymouth',       sState: 'MN', sZip: '55447', sPhoneNumber: '+1 (800) 843-6356', sFaxNumber: '(763) 553-7901', sContactName: 'Sarah Lindstrom', sContactEmail: 'slindstrom@cantelmedical.com', bActive: true, bPartsVendor: true,  bRepairVendor: false, bAcquisitionVendor: false, bCartsVendor: true  },
  { lSupplierKey: 12, sSupplierName: 'Richard Wolf Medical', sAddress1: '353 Corporate Woods Pkwy', sCity: 'Vernon Hills',   sState: 'IL', sZip: '60061', sPhoneNumber: '+1 (800) 323-9653', sFaxNumber: '(847) 913-1488', sContactName: 'Marcus Engel',    sContactEmail: 'mengel@richardwolf.com',      bActive: true, bPartsVendor: false, bRepairVendor: true,  bAcquisitionVendor: true,  bCartsVendor: false },
]);

// ── Supplier POs (+35, keys 1-35) ────────────────────
MockDB.seed('supplierPOs', [
  // ── Open (12) ──
  { lSupplierPOKey: 1,  lSupplierKey: 1,  sSupplierName: 'Olympus America',       sPONumber: 'PO-2026-1001', dtOrderDate: '2026-03-10T00:00:00', dtExpectedDate: '2026-03-25T00:00:00', dtReceivedDate: null, dblTotal: 4250.00, sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 2,  lSupplierKey: 2,  sSupplierName: 'Fujifilm Medical',      sPONumber: 'PO-2026-1002', dtOrderDate: '2026-03-08T00:00:00', dtExpectedDate: '2026-03-22T00:00:00', dtReceivedDate: null, dblTotal: 1875.50, sStatus: 'Open', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'Rush — needed for WO NR-2026-0412' },
  { lSupplierPOKey: 3,  lSupplierKey: 3,  sSupplierName: 'Karl Storz Endoscopy',  sPONumber: 'PO-2026-1003', dtOrderDate: '2026-03-12T00:00:00', dtExpectedDate: '2026-04-02T00:00:00', dtReceivedDate: null, dblTotal: 6320.00, sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 4,  lSupplierKey: 5,  sSupplierName: 'MCE Parts & Supply',    sPONumber: 'PO-2026-1004', dtOrderDate: '2026-03-14T00:00:00', dtExpectedDate: '2026-03-21T00:00:00', dtReceivedDate: null, dblTotal: 485.00,  sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 5,  lSupplierKey: 6,  sSupplierName: 'Pentax Medical',        sPONumber: 'PO-2026-1005', dtOrderDate: '2026-03-11T00:00:00', dtExpectedDate: '2026-03-28T00:00:00', dtReceivedDate: null, dblTotal: 2100.00, sStatus: 'Open', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'Repair parts for Pentax EG-2990i' },
  { lSupplierPOKey: 6,  lSupplierKey: 7,  sSupplierName: 'Smith & Nephew Endo',   sPONumber: 'PO-2026-1006', dtOrderDate: '2026-03-05T00:00:00', dtExpectedDate: '2026-03-20T00:00:00', dtReceivedDate: null, dblTotal: 3750.00, sStatus: 'Open', lSupplierPOTypeKey: 3, sSupplierPOTypeName: 'Blanket',  sNotes: 'Q1 blanket — arthroscopy consumables' },
  { lSupplierPOKey: 7,  lSupplierKey: 8,  sSupplierName: 'Arthrex Inc.',          sPONumber: 'PO-2026-1007', dtOrderDate: '2026-03-13T00:00:00', dtExpectedDate: '2026-03-27T00:00:00', dtReceivedDate: null, dblTotal: 1250.00, sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 8,  lSupplierKey: 9,  sSupplierName: 'ConMed Corporation',    sPONumber: 'PO-2026-1008', dtOrderDate: '2026-03-09T00:00:00', dtExpectedDate: '2026-03-23T00:00:00', dtReceivedDate: null, dblTotal: 890.00,  sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 9,  lSupplierKey: 10, sSupplierName: 'Machida Endoscope',     sPONumber: 'PO-2026-1009', dtOrderDate: '2026-03-15T00:00:00', dtExpectedDate: '2026-04-05T00:00:00', dtReceivedDate: null, dblTotal: 5400.00, sStatus: 'Open', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'Special rebuild parts' },
  { lSupplierPOKey: 10, lSupplierKey: 11, sSupplierName: 'Medivators (Cantel)',    sPONumber: 'PO-2026-1010', dtOrderDate: '2026-03-07T00:00:00', dtExpectedDate: '2026-03-21T00:00:00', dtReceivedDate: null, dblTotal: 2340.00, sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'AER replacement filters + hoses' },
  { lSupplierPOKey: 11, lSupplierKey: 12, sSupplierName: 'Richard Wolf Medical',  sPONumber: 'PO-2026-1011', dtOrderDate: '2026-03-06T00:00:00', dtExpectedDate: '2026-03-26T00:00:00', dtReceivedDate: null, dblTotal: 8150.00, sStatus: 'Open', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 12, lSupplierKey: 1,  sSupplierName: 'Olympus America',       sPONumber: 'PO-2026-1012', dtOrderDate: '2026-03-16T00:00:00', dtExpectedDate: '2026-04-01T00:00:00', dtReceivedDate: null, dblTotal: 3100.00, sStatus: 'Open', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'CCD + angulation wire for GIF-H190' },

  // ── Received (10) ──
  { lSupplierPOKey: 13, lSupplierKey: 1,  sSupplierName: 'Olympus America',       sPONumber: 'PO-2026-0901', dtOrderDate: '2026-01-15T00:00:00', dtExpectedDate: '2026-02-05T00:00:00', dtReceivedDate: '2026-02-03T00:00:00', dblTotal: 2750.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 14, lSupplierKey: 2,  sSupplierName: 'Fujifilm Medical',      sPONumber: 'PO-2026-0902', dtOrderDate: '2026-01-20T00:00:00', dtExpectedDate: '2026-02-10T00:00:00', dtReceivedDate: '2026-02-08T00:00:00', dblTotal: 1600.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 15, lSupplierKey: 3,  sSupplierName: 'Karl Storz Endoscopy',  sPONumber: 'PO-2026-0903', dtOrderDate: '2026-01-10T00:00:00', dtExpectedDate: '2026-01-30T00:00:00', dtReceivedDate: '2026-01-28T00:00:00', dblTotal: 4100.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 16, lSupplierKey: 5,  sSupplierName: 'MCE Parts & Supply',    sPONumber: 'PO-2026-0904', dtOrderDate: '2026-02-01T00:00:00', dtExpectedDate: '2026-02-08T00:00:00', dtReceivedDate: '2026-02-07T00:00:00', dblTotal: 320.00,  sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 17, lSupplierKey: 7,  sSupplierName: 'Smith & Nephew Endo',   sPONumber: 'PO-2026-0905', dtOrderDate: '2026-02-05T00:00:00', dtExpectedDate: '2026-02-20T00:00:00', dtReceivedDate: '2026-02-19T00:00:00', dblTotal: 5600.00, sStatus: 'Received', lSupplierPOTypeKey: 3, sSupplierPOTypeName: 'Blanket',  sNotes: '' },
  { lSupplierPOKey: 18, lSupplierKey: 8,  sSupplierName: 'Arthrex Inc.',          sPONumber: 'PO-2026-0906', dtOrderDate: '2026-01-25T00:00:00', dtExpectedDate: '2026-02-15T00:00:00', dtReceivedDate: '2026-02-14T00:00:00', dblTotal: 980.00,  sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 19, lSupplierKey: 9,  sSupplierName: 'ConMed Corporation',    sPONumber: 'PO-2026-0907', dtOrderDate: '2026-02-10T00:00:00', dtExpectedDate: '2026-02-28T00:00:00', dtReceivedDate: '2026-02-26T00:00:00', dblTotal: 1450.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 20, lSupplierKey: 11, sSupplierName: 'Medivators (Cantel)',    sPONumber: 'PO-2026-0908', dtOrderDate: '2026-01-18T00:00:00', dtExpectedDate: '2026-02-05T00:00:00', dtReceivedDate: '2026-02-04T00:00:00', dblTotal: 1875.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },
  { lSupplierPOKey: 21, lSupplierKey: 6,  sSupplierName: 'Pentax Medical',        sPONumber: 'PO-2026-0909', dtOrderDate: '2026-02-12T00:00:00', dtExpectedDate: '2026-03-01T00:00:00', dtReceivedDate: '2026-02-28T00:00:00', dblTotal: 3200.00, sStatus: 'Received', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: '' },
  { lSupplierPOKey: 22, lSupplierKey: 12, sSupplierName: 'Richard Wolf Medical',  sPONumber: 'PO-2026-0910', dtOrderDate: '2026-02-18T00:00:00', dtExpectedDate: '2026-03-08T00:00:00', dtReceivedDate: '2026-03-06T00:00:00', dblTotal: 7200.00, sStatus: 'Received', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '' },

  // ── Partial (8) ──
  { lSupplierPOKey: 23, lSupplierKey: 1,  sSupplierName: 'Olympus America',       sPONumber: 'PO-2026-0950', dtOrderDate: '2026-02-20T00:00:00', dtExpectedDate: '2026-03-10T00:00:00', dtReceivedDate: null, dblTotal: 5800.00, sStatus: 'Partial', lSupplierPOTypeKey: 3, sSupplierPOTypeName: 'Blanket',  sNotes: '3 of 5 line items received' },
  { lSupplierPOKey: 24, lSupplierKey: 3,  sSupplierName: 'Karl Storz Endoscopy',  sPONumber: 'PO-2026-0951', dtOrderDate: '2026-02-22T00:00:00', dtExpectedDate: '2026-03-12T00:00:00', dtReceivedDate: null, dblTotal: 3450.00, sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Rod lenses received, awaiting eyepieces' },
  { lSupplierPOKey: 25, lSupplierKey: 4,  sSupplierName: 'Stryker Medical',       sPONumber: 'PO-2026-0952', dtOrderDate: '2026-02-15T00:00:00', dtExpectedDate: '2026-03-05T00:00:00', dtReceivedDate: null, dblTotal: 4200.00, sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Camera heads received, cables on backorder' },
  { lSupplierPOKey: 26, lSupplierKey: 7,  sSupplierName: 'Smith & Nephew Endo',   sPONumber: 'PO-2026-0953', dtOrderDate: '2026-02-25T00:00:00', dtExpectedDate: '2026-03-15T00:00:00', dtReceivedDate: null, dblTotal: 2680.00, sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: '2 of 4 items shipped' },
  { lSupplierPOKey: 27, lSupplierKey: 5,  sSupplierName: 'MCE Parts & Supply',    sPONumber: 'PO-2026-0954', dtOrderDate: '2026-03-01T00:00:00', dtExpectedDate: '2026-03-10T00:00:00', dtReceivedDate: null, dblTotal: 625.00,  sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'O-rings received, epoxy on backorder' },
  { lSupplierPOKey: 28, lSupplierKey: 2,  sSupplierName: 'Fujifilm Medical',      sPONumber: 'PO-2026-0955', dtOrderDate: '2026-02-28T00:00:00', dtExpectedDate: '2026-03-18T00:00:00', dtReceivedDate: null, dblTotal: 3100.00, sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Bending rubber delivered, insertion tube pending' },
  { lSupplierPOKey: 29, lSupplierKey: 10, sSupplierName: 'Machida Endoscope',     sPONumber: 'PO-2026-0956', dtOrderDate: '2026-03-02T00:00:00', dtExpectedDate: '2026-03-20T00:00:00', dtReceivedDate: null, dblTotal: 1950.00, sStatus: 'Partial', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'Light guide received, CCD on order' },
  { lSupplierPOKey: 30, lSupplierKey: 11, sSupplierName: 'Medivators (Cantel)',    sPONumber: 'PO-2026-0957', dtOrderDate: '2026-03-03T00:00:00', dtExpectedDate: '2026-03-17T00:00:00', dtReceivedDate: null, dblTotal: 1540.00, sStatus: 'Partial', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Filters shipped, hoses pending' },

  // ── Cancelled (5) ──
  { lSupplierPOKey: 31, lSupplierKey: 4,  sSupplierName: 'Stryker Medical',       sPONumber: 'PO-2026-0801', dtOrderDate: '2026-01-05T00:00:00', dtExpectedDate: '2026-01-25T00:00:00', dtReceivedDate: null, dblTotal: 2200.00, sStatus: 'Cancelled', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Duplicate order — cancelled' },
  { lSupplierPOKey: 32, lSupplierKey: 6,  sSupplierName: 'Pentax Medical',        sPONumber: 'PO-2026-0802', dtOrderDate: '2026-01-12T00:00:00', dtExpectedDate: '2026-02-01T00:00:00', dtReceivedDate: null, dblTotal: 1500.00, sStatus: 'Cancelled', lSupplierPOTypeKey: 2, sSupplierPOTypeName: 'Rush',     sNotes: 'Client cancelled repair' },
  { lSupplierPOKey: 33, lSupplierKey: 9,  sSupplierName: 'ConMed Corporation',    sPONumber: 'PO-2026-0803', dtOrderDate: '2026-01-18T00:00:00', dtExpectedDate: '2026-02-08T00:00:00', dtReceivedDate: null, dblTotal: 750.00,  sStatus: 'Cancelled', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Wrong part number' },
  { lSupplierPOKey: 34, lSupplierKey: 12, sSupplierName: 'Richard Wolf Medical',  sPONumber: 'PO-2026-0804', dtOrderDate: '2026-02-02T00:00:00', dtExpectedDate: '2026-02-22T00:00:00', dtReceivedDate: null, dblTotal: 3800.00, sStatus: 'Cancelled', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Vendor discontinued part' },
  { lSupplierPOKey: 35, lSupplierKey: 8,  sSupplierName: 'Arthrex Inc.',          sPONumber: 'PO-2026-0805', dtOrderDate: '2026-01-28T00:00:00', dtExpectedDate: '2026-02-18T00:00:00', dtReceivedDate: null, dblTotal: 150.00,  sStatus: 'Cancelled', lSupplierPOTypeKey: 1, sSupplierPOTypeName: 'Standard', sNotes: 'Found alternate source' },
]);

// ── Inventory (+12, keys 11-22) ──────────────────────
MockDB.seed('inventory', [
  { lInventoryKey: 11, sItemDescription: 'Air/Water Nozzle',         sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true,  bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 12, sItemDescription: 'Suction Valve',            sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true,  bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 13, sItemDescription: 'Light Cable',              sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 14, sItemDescription: 'Elevator Cable',           sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 15, sItemDescription: 'Insertion Tube Sheath',    sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true,  bSkipPickList: false },
  { lInventoryKey: 16, sItemDescription: 'Bending Section',          sRigidOrFlexible: 'F', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true,  bSkipPickList: false },
  { lInventoryKey: 17, sItemDescription: 'Camera Cable',             sRigidOrFlexible: 'R', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 18, sItemDescription: 'Video Processor Board',    sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: true,  bAlwaysReOrder: false, bLargeDiameter: false, bSkipPickList: true  },
  { lInventoryKey: 19, sItemDescription: 'Cleaning Brush',           sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true,  bLargeDiameter: false, bSkipPickList: true  },
  { lInventoryKey: 20, sItemDescription: 'Scope Case / Container',   sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: false, bLargeDiameter: true,  bSkipPickList: true  },
  { lInventoryKey: 21, sItemDescription: 'Leak Tester Gasket',       sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true,  bLargeDiameter: false, bSkipPickList: false },
  { lInventoryKey: 22, sItemDescription: 'O-Ring Kit',               sRigidOrFlexible: 'B', bActive: true, bNoCountAdjustment: false, bAlwaysReOrder: true,  bLargeDiameter: false, bSkipPickList: false },
]);

// ── Inventory Sizes (+31, keys 115-145) ──────────────
MockDB.seed('inventorySizes', [
  // Air/Water Nozzle (11) — 3 sizes
  { lInventorySizeKey: 115, lInventoryKey: 11, sSizeName: 'Olympus Standard',        sBinLocation: 'A-30', nUnitCost: 18.00,  nLevelCurrent: 25, nLevelMinimum: 5,  nLevelMaximum: 50,  nReorderPoint: 10, bActive: true },
  { lInventorySizeKey: 116, lInventoryKey: 11, sSizeName: 'Fujifilm-specific',       sBinLocation: 'A-31', nUnitCost: 22.00,  nLevelCurrent: 8,  nLevelMinimum: 3,  nLevelMaximum: 30,  nReorderPoint: 6,  bActive: true },
  { lInventorySizeKey: 117, lInventoryKey: 11, sSizeName: 'Pentax-specific',         sBinLocation: 'A-32', nUnitCost: 20.00,  nLevelCurrent: 5,  nLevelMinimum: 2,  nLevelMaximum: 20,  nReorderPoint: 5,  bActive: true }, // at reorder

  // Suction Valve (12) — 2 sizes
  { lInventorySizeKey: 118, lInventoryKey: 12, sSizeName: 'Universal',               sBinLocation: 'A-35', nUnitCost: 12.50,  nLevelCurrent: 30, nLevelMinimum: 10, nLevelMaximum: 60,  nReorderPoint: 15, bActive: true },
  { lInventorySizeKey: 119, lInventoryKey: 12, sSizeName: 'Olympus 160/180/190',     sBinLocation: 'A-36', nUnitCost: 15.00,  nLevelCurrent: 14, nLevelMinimum: 5,  nLevelMaximum: 40,  nReorderPoint: 10, bActive: true },

  // Light Cable (13) — 3 sizes
  { lInventorySizeKey: 120, lInventoryKey: 13, sSizeName: 'Storz Fiber Optic 250cm',   sBinLocation: 'C-15', nUnitCost: 85.00,  nLevelCurrent: 4,  nLevelMinimum: 2,  nLevelMaximum: 10, nReorderPoint: 3, bActive: true },
  { lInventorySizeKey: 121, lInventoryKey: 13, sSizeName: 'Olympus Fiber Optic 230cm', sBinLocation: 'C-16', nUnitCost: 95.00,  nLevelCurrent: 3,  nLevelMinimum: 1,  nLevelMaximum: 8,  nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 122, lInventoryKey: 13, sSizeName: 'Universal LED 180cm',       sBinLocation: 'C-17', nUnitCost: 110.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 6,  nReorderPoint: 2, bActive: true }, // at reorder

  // Elevator Cable (14) — 2 sizes
  { lInventorySizeKey: 123, lInventoryKey: 14, sSizeName: 'Olympus TJF-Q180V',      sBinLocation: 'B-10', nUnitCost: 145.00, nLevelCurrent: 3,  nLevelMinimum: 1,  nLevelMaximum: 6,  nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 124, lInventoryKey: 14, sSizeName: 'Fujifilm ED-580XT',      sBinLocation: 'B-11', nUnitCost: 155.00, nLevelCurrent: 1,  nLevelMinimum: 1,  nLevelMaximum: 4,  nReorderPoint: 2, bActive: true }, // below reorder

  // Insertion Tube Sheath (15) — 3 sizes
  { lInventorySizeKey: 125, lInventoryKey: 15, sSizeName: 'Small (\u22646mm)',       sBinLocation: 'B-20', nUnitCost: 180.00, nLevelCurrent: 3,  nLevelMinimum: 1,  nLevelMaximum: 8,  nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 126, lInventoryKey: 15, sSizeName: 'Standard (6-10mm)',       sBinLocation: 'B-21', nUnitCost: 210.00, nLevelCurrent: 5,  nLevelMinimum: 2,  nLevelMaximum: 10, nReorderPoint: 3, bActive: true },
  { lInventorySizeKey: 127, lInventoryKey: 15, sSizeName: 'Large (>10mm)',           sBinLocation: 'B-22', nUnitCost: 240.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 6,  nReorderPoint: 2, bActive: true }, // at reorder

  // Bending Section (16) — 3 sizes
  { lInventorySizeKey: 128, lInventoryKey: 16, sSizeName: 'GIF-H190 Series',        sBinLocation: 'B-25', nUnitCost: 320.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 5,  nReorderPoint: 2, bActive: true }, // at reorder
  { lInventorySizeKey: 129, lInventoryKey: 16, sSizeName: 'CF-HQ190 Series',        sBinLocation: 'B-26', nUnitCost: 350.00, nLevelCurrent: 3,  nLevelMinimum: 1,  nLevelMaximum: 5,  nReorderPoint: 2, bActive: true },
  { lInventorySizeKey: 130, lInventoryKey: 16, sSizeName: 'BF-P290 Broncho',        sBinLocation: 'B-27', nUnitCost: 280.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 4,  nReorderPoint: 1, bActive: true },

  // Camera Cable (17) — 2 sizes
  { lInventorySizeKey: 131, lInventoryKey: 17, sSizeName: 'Storz Image1 S',         sBinLocation: 'C-20', nUnitCost: 420.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 4,  nReorderPoint: 1, bActive: true },
  { lInventorySizeKey: 132, lInventoryKey: 17, sSizeName: 'Stryker 1588',           sBinLocation: 'C-21', nUnitCost: 450.00, nLevelCurrent: 1,  nLevelMinimum: 1,  nLevelMaximum: 3,  nReorderPoint: 1, bActive: true }, // at reorder

  // Video Processor Board (18) — 2 sizes
  { lInventorySizeKey: 133, lInventoryKey: 18, sSizeName: 'CV-190 Main Board',      sBinLocation: 'C-30', nUnitCost: 850.00, nLevelCurrent: 1,  nLevelMinimum: 0,  nLevelMaximum: 3,  nReorderPoint: 1, bActive: true },
  { lInventorySizeKey: 134, lInventoryKey: 18, sSizeName: 'CV-190 Power Supply',    sBinLocation: 'C-31', nUnitCost: 380.00, nLevelCurrent: 2,  nLevelMinimum: 1,  nLevelMaximum: 4,  nReorderPoint: 1, bActive: true },

  // Cleaning Brush (19) — 3 sizes
  { lInventorySizeKey: 135, lInventoryKey: 19, sSizeName: 'Channel Brush 2.0mm',    sBinLocation: 'F-01', nUnitCost: 5.50,   nLevelCurrent: 45, nLevelMinimum: 10, nLevelMaximum: 100, nReorderPoint: 20, bActive: true },
  { lInventorySizeKey: 136, lInventoryKey: 19, sSizeName: 'Channel Brush 2.8mm',    sBinLocation: 'F-02', nUnitCost: 5.50,   nLevelCurrent: 38, nLevelMinimum: 10, nLevelMaximum: 100, nReorderPoint: 20, bActive: true },
  { lInventorySizeKey: 137, lInventoryKey: 19, sSizeName: 'Channel Brush 3.7mm',    sBinLocation: 'F-03', nUnitCost: 6.00,   nLevelCurrent: 22, nLevelMinimum: 10, nLevelMaximum: 80,  nReorderPoint: 20, bActive: true },

  // Scope Case / Container (20) — 2 sizes
  { lInventorySizeKey: 138, lInventoryKey: 20, sSizeName: 'Standard Flexible',      sBinLocation: 'G-01', nUnitCost: 75.00,  nLevelCurrent: 6,  nLevelMinimum: 2,  nLevelMaximum: 15,  nReorderPoint: 4,  bActive: true },
  { lInventorySizeKey: 139, lInventoryKey: 20, sSizeName: 'Rigid Telescope',        sBinLocation: 'G-02', nUnitCost: 65.00,  nLevelCurrent: 4,  nLevelMinimum: 1,  nLevelMaximum: 10,  nReorderPoint: 3,  bActive: true },

  // Leak Tester Gasket (21) — 3 sizes
  { lInventorySizeKey: 140, lInventoryKey: 21, sSizeName: 'Olympus MH-438',         sBinLocation: 'A-40', nUnitCost: 8.00,   nLevelCurrent: 20, nLevelMinimum: 5,  nLevelMaximum: 50,  nReorderPoint: 10, bActive: true },
  { lInventorySizeKey: 141, lInventoryKey: 21, sSizeName: 'Fujifilm Universal',     sBinLocation: 'A-41', nUnitCost: 9.50,   nLevelCurrent: 12, nLevelMinimum: 3,  nLevelMaximum: 30,  nReorderPoint: 8,  bActive: true },
  { lInventorySizeKey: 142, lInventoryKey: 21, sSizeName: 'Pentax Adapter Ring',    sBinLocation: 'A-42', nUnitCost: 10.00,  nLevelCurrent: 7,  nLevelMinimum: 2,  nLevelMaximum: 20,  nReorderPoint: 5,  bActive: true },

  // O-Ring Kit (22) — 3 sizes
  { lInventorySizeKey: 143, lInventoryKey: 22, sSizeName: 'Small Diameter Kit',     sBinLocation: 'A-45', nUnitCost: 12.00,  nLevelCurrent: 35, nLevelMinimum: 10, nLevelMaximum: 80,  nReorderPoint: 15, bActive: true },
  { lInventorySizeKey: 144, lInventoryKey: 22, sSizeName: 'Large Diameter Kit',     sBinLocation: 'A-46', nUnitCost: 14.00,  nLevelCurrent: 28, nLevelMinimum: 8,  nLevelMaximum: 60,  nReorderPoint: 12, bActive: true },
  { lInventorySizeKey: 145, lInventoryKey: 22, sSizeName: 'Specialty / Duodeno',    sBinLocation: 'A-47', nUnitCost: 18.00,  nLevelCurrent: 10, nLevelMinimum: 3,  nLevelMaximum: 25,  nReorderPoint: 6,  bActive: true },
]);

// ── Acquisitions (+30, keys 1-30) ────────────────────
MockDB.seed('acquisitions', [
  // ── InHouse (12) — TSI-owned scope inventory ──
  { lAcquisitionKey: 1,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0001', sScopeTypeDesc: 'Olympus GIF-H190',      sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',         sCondition: 'Excellent',   dblCost: 12500.00, dblListPrice: 18500.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-06-15', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 2,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0002', sScopeTypeDesc: 'Olympus CF-HQ190L',     sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',         sCondition: 'Good',        dblCost: 11800.00, dblListPrice: 17200.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-08-20', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 3,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0003', sScopeTypeDesc: 'Olympus TJF-Q190V',     sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',         sCondition: 'Refurbished', dblCost: 8500.00,  dblListPrice: 14000.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-11-01', dtSold: null,         sNotes: 'Full refurb by TSI — new CCD + bending section' },
  { lAcquisitionKey: 4,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0004', sScopeTypeDesc: 'Fujifilm EG-760R',      sRigidOrFlexible: 'F', lManufacturerKey: 2, sManufacturerName: 'Fujifilm',        sCondition: 'Good',        dblCost: 9200.00,  dblListPrice: 14500.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-09-10', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 5,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0005', sScopeTypeDesc: 'Karl Storz 11301BN1',   sRigidOrFlexible: 'R', lManufacturerKey: 4, sManufacturerName: 'Karl Storz',      sCondition: 'Excellent',   dblCost: 5200.00,  dblListPrice: 8500.00,  dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-10-05', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 6,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0006', sScopeTypeDesc: 'Olympus BF-P290',       sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',         sCondition: 'Fair',        dblCost: 4800.00,  dblListPrice: 9500.00,  dblSalePrice: 0,        lClientKey: 3502, sClientName1: '88th Medical Group',           sStatus: 'Reserved',  dtAcquired: '2025-07-22', dtSold: null,         sNotes: 'Reserved for 88th Medical — pending PO' },
  { lAcquisitionKey: 7,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0007', sScopeTypeDesc: 'Stryker 1588 Camera',   sRigidOrFlexible: 'R', lManufacturerKey: 5, sManufacturerName: 'Stryker',         sCondition: 'Refurbished', dblCost: 6800.00,  dblListPrice: 11000.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2025-12-15', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 8,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0008', sScopeTypeDesc: 'Pentax EG-2990i',       sRigidOrFlexible: 'F', lManufacturerKey: 3, sManufacturerName: 'Pentax',          sCondition: 'Good',        dblCost: 10200.00, dblListPrice: 15800.00, dblSalePrice: 0,        lClientKey: 917,  sClientName1: 'Northside Hospital',            sStatus: 'Reserved',  dtAcquired: '2025-10-30', dtSold: null,         sNotes: 'Demo unit reserved for Northside eval' },
  { lAcquisitionKey: 9,  sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0009', sScopeTypeDesc: 'Smith & Nephew 560P',   sRigidOrFlexible: 'R', lManufacturerKey: 6, sManufacturerName: 'Smith & Nephew',  sCondition: 'Excellent',   dblCost: 7400.00,  dblListPrice: 12000.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2026-01-08', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 10, sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0010', sScopeTypeDesc: 'Olympus GIF-XP190N',    sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',         sCondition: 'Good',        dblCost: 13500.00, dblListPrice: 19000.00, dblSalePrice: 0,        lClientKey: 2755, sClientName1: 'Metro Health Hospital',        sStatus: 'Reserved',  dtAcquired: '2026-01-20', dtSold: null,         sNotes: 'Pending contract finalization with Metro' },
  { lAcquisitionKey: 11, sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0011', sScopeTypeDesc: 'Arthrex SynergyUHD4',   sRigidOrFlexible: 'R', lManufacturerKey: 7, sManufacturerName: 'Arthrex',         sCondition: 'Excellent',   dblCost: 8900.00,  dblListPrice: 14200.00, dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2026-02-05', dtSold: null,         sNotes: '' },
  { lAcquisitionKey: 12, sCategory: 'InHouse', sSerialNumber: 'TSI-ACQ-0012', sScopeTypeDesc: 'ConMed Linvatec 5900',  sRigidOrFlexible: 'R', lManufacturerKey: 8, sManufacturerName: 'ConMed',          sCondition: 'Fair',        dblCost: 3200.00,  dblListPrice: 6500.00,  dblSalePrice: 0,        lClientKey: 0,    sClientName1: '',                              sStatus: 'Available', dtAcquired: '2026-02-18', dtSold: null,         sNotes: 'Cosmetic wear — functional' },

  // ── Consigned (10) — client-owned scopes held by TSI ──
  { lAcquisitionKey: 13, sCategory: 'Consigned', sSerialNumber: 'CON-88M-001',  sScopeTypeDesc: 'Olympus GIF-H180',        sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Good',        dblCost: 6000.00,  dblListPrice: 10000.00, dblSalePrice: 0, lClientKey: 3502, sClientName1: '88th Medical Group',              sStatus: 'On Loan', dtAcquired: '2025-09-01', dtSold: null, sNotes: 'Consigned from 88th — listed for resale' },
  { lAcquisitionKey: 14, sCategory: 'Consigned', sSerialNumber: 'CON-TIFT-001', sScopeTypeDesc: 'Olympus CF-H180AL',       sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Fair',        dblCost: 4500.00,  dblListPrice: 7800.00,  dblSalePrice: 0, lClientKey: 1084, sClientName1: 'Tift Regional Medical Center',    sStatus: 'On Loan', dtAcquired: '2025-10-15', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 15, sCategory: 'Consigned', sSerialNumber: 'CON-NASH-001', sScopeTypeDesc: 'Fujifilm EC-600WR',       sRigidOrFlexible: 'F', lManufacturerKey: 2, sManufacturerName: 'Fujifilm',       sCondition: 'Good',        dblCost: 7200.00,  dblListPrice: 11500.00, dblSalePrice: 0, lClientKey: 2210, sClientName1: 'Nashville General Hospital',     sStatus: 'On Loan', dtAcquired: '2025-11-20', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 16, sCategory: 'Consigned', sSerialNumber: 'CON-NSDE-001', sScopeTypeDesc: 'Pentax EG-29-i10',        sRigidOrFlexible: 'F', lManufacturerKey: 3, sManufacturerName: 'Pentax',         sCondition: 'Excellent',   dblCost: 11000.00, dblListPrice: 16500.00, dblSalePrice: 0, lClientKey: 917,  sClientName1: 'Northside Hospital',              sStatus: 'On Loan', dtAcquired: '2025-12-01', dtSold: null, sNotes: 'Excellent condition — high demand model' },
  { lAcquisitionKey: 17, sCategory: 'Consigned', sSerialNumber: 'CON-MH-001',   sScopeTypeDesc: 'Karl Storz 11272VN',      sRigidOrFlexible: 'R', lManufacturerKey: 4, sManufacturerName: 'Karl Storz',     sCondition: 'Good',        dblCost: 4800.00,  dblListPrice: 8200.00,  dblSalePrice: 0, lClientKey: 2755, sClientName1: 'Metro Health Hospital',          sStatus: 'On Loan', dtAcquired: '2026-01-05', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 18, sCategory: 'Consigned', sSerialNumber: 'CON-BAYL-001', sScopeTypeDesc: 'Olympus PCF-H290L',       sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Fair',        dblCost: 5500.00,  dblListPrice: 9200.00,  dblSalePrice: 0, lClientKey: 4002, sClientName1: 'Baylor Scott & White',          sStatus: 'On Loan', dtAcquired: '2026-01-15', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 19, sCategory: 'Consigned', sSerialNumber: 'CON-DUKE-001', sScopeTypeDesc: 'Stryker 502-880-105',     sRigidOrFlexible: 'R', lManufacturerKey: 5, sManufacturerName: 'Stryker',        sCondition: 'Good',        dblCost: 6200.00,  dblListPrice: 10500.00, dblSalePrice: 0, lClientKey: 4003, sClientName1: 'Duke University Medical',        sStatus: 'On Loan', dtAcquired: '2026-02-01', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 20, sCategory: 'Consigned', sSerialNumber: 'CON-88M-002',  sScopeTypeDesc: 'Olympus BF-1TH190',       sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Refurbished', dblCost: 7800.00,  dblListPrice: 13000.00, dblSalePrice: 0, lClientKey: 3502, sClientName1: '88th Medical Group',              sStatus: 'On Loan', dtAcquired: '2026-02-10', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 21, sCategory: 'Consigned', sSerialNumber: 'CON-TIFT-002', sScopeTypeDesc: 'Fujifilm EG-740N',        sRigidOrFlexible: 'F', lManufacturerKey: 2, sManufacturerName: 'Fujifilm',       sCondition: 'Good',        dblCost: 8500.00,  dblListPrice: 13500.00, dblSalePrice: 0, lClientKey: 1084, sClientName1: 'Tift Regional Medical Center',    sStatus: 'On Loan', dtAcquired: '2026-02-20', dtSold: null, sNotes: '' },
  { lAcquisitionKey: 22, sCategory: 'Consigned', sSerialNumber: 'CON-NASH-002', sScopeTypeDesc: 'Smith & Nephew 72204723', sRigidOrFlexible: 'R', lManufacturerKey: 6, sManufacturerName: 'Smith & Nephew', sCondition: 'Fair',        dblCost: 3800.00,  dblListPrice: 6800.00,  dblSalePrice: 0, lClientKey: 2210, sClientName1: 'Nashville General Hospital',     sStatus: 'On Loan', dtAcquired: '2026-03-01', dtSold: null, sNotes: '' },

  // ── Sold (8) — completed sales ──
  { lAcquisitionKey: 23, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0001', sScopeTypeDesc: 'Olympus GIF-H180',     sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Good',        dblCost: 5200.00,  dblListPrice: 9500.00,  dblSalePrice: 8200.00,  lClientKey: 4002, sClientName1: 'Baylor Scott & White',     sStatus: 'Sold', dtAcquired: '2025-04-10', dtSold: '2025-08-15', sNotes: '' },
  { lAcquisitionKey: 24, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0002', sScopeTypeDesc: 'Karl Storz 11301DD1',  sRigidOrFlexible: 'R', lManufacturerKey: 4, sManufacturerName: 'Karl Storz',     sCondition: 'Refurbished', dblCost: 3800.00,  dblListPrice: 7000.00,  dblSalePrice: 6200.00,  lClientKey: 917,  sClientName1: 'Northside Hospital',      sStatus: 'Sold', dtAcquired: '2025-03-20', dtSold: '2025-07-10', sNotes: '' },
  { lAcquisitionKey: 25, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0003', sScopeTypeDesc: 'Olympus CF-HQ190L',    sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Excellent',   dblCost: 11000.00, dblListPrice: 17500.00, dblSalePrice: 15800.00, lClientKey: 4003, sClientName1: 'Duke University Medical', sStatus: 'Sold', dtAcquired: '2025-05-01', dtSold: '2025-09-22', sNotes: '' },
  { lAcquisitionKey: 26, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0004', sScopeTypeDesc: 'Fujifilm EG-580RD',    sRigidOrFlexible: 'F', lManufacturerKey: 2, sManufacturerName: 'Fujifilm',       sCondition: 'Good',        dblCost: 8400.00,  dblListPrice: 13000.00, dblSalePrice: 11500.00, lClientKey: 2210, sClientName1: 'Nashville General Hospital', sStatus: 'Sold', dtAcquired: '2025-06-05', dtSold: '2025-10-18', sNotes: '' },
  { lAcquisitionKey: 27, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0005', sScopeTypeDesc: 'Pentax EC-3890Li',     sRigidOrFlexible: 'F', lManufacturerKey: 3, sManufacturerName: 'Pentax',         sCondition: 'Fair',        dblCost: 4200.00,  dblListPrice: 7500.00,  dblSalePrice: 5800.00,  lClientKey: 1084, sClientName1: 'Tift Regional Medical Center', sStatus: 'Sold', dtAcquired: '2025-07-15', dtSold: '2025-11-05', sNotes: 'Trade-in applied' },
  { lAcquisitionKey: 28, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0006', sScopeTypeDesc: 'Stryker 1488 Camera',  sRigidOrFlexible: 'R', lManufacturerKey: 5, sManufacturerName: 'Stryker',        sCondition: 'Refurbished', dblCost: 5600.00,  dblListPrice: 9800.00,  dblSalePrice: 8500.00,  lClientKey: 2755, sClientName1: 'Metro Health Hospital',    sStatus: 'Sold', dtAcquired: '2025-08-20', dtSold: '2025-12-10', sNotes: '' },
  { lAcquisitionKey: 29, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0007', sScopeTypeDesc: 'Olympus GIF-XP190N',   sRigidOrFlexible: 'F', lManufacturerKey: 1, sManufacturerName: 'Olympus',        sCondition: 'Excellent',   dblCost: 14000.00, dblListPrice: 20000.00, dblSalePrice: 18200.00, lClientKey: 3502, sClientName1: '88th Medical Group',       sStatus: 'Sold', dtAcquired: '2025-09-10', dtSold: '2026-01-15', sNotes: '' },
  { lAcquisitionKey: 30, sCategory: 'Sold', sSerialNumber: 'TSI-SLD-0008', sScopeTypeDesc: 'ConMed Linvatec 8810', sRigidOrFlexible: 'R', lManufacturerKey: 8, sManufacturerName: 'ConMed',         sCondition: 'Good',        dblCost: 2800.00,  dblListPrice: 5200.00,  dblSalePrice: 4500.00,  lClientKey: 4002, sClientName1: 'Baylor Scott & White',     sStatus: 'Sold', dtAcquired: '2025-10-01', dtSold: '2026-02-20', sNotes: '' },
]);

// ── Summary ──────────────────────────────────────────
console.log('[MockDB] WP-5 seeded: ' +
  '7 new suppliers (6-12), ' +
  '35 POs, ' +
  '12 new inventory items (11-22), ' +
  '31 new sizes (115-145), ' +
  '30 acquisitions (12 InHouse + 10 Consigned + 8 Sold)'
);
// ═══════════════════════════════════════════════════════
//  WP-6: Admin & Reference Data Seeds
//  Append to mock-db.js after existing seeds
// ═══════════════════════════════════════════════════════

// ── Security Groups (5, keys 1-5) ────────────────────────
MockDB.seed('securityGroups', [
  { lSecurityGroupKey: 1, sGroupName: 'Administrator', sDescription: 'Full system access including user management and configuration', bActive: true },
  { lSecurityGroupKey: 2, sGroupName: 'Manager', sDescription: 'Department-level oversight, reports, and approval authority', bActive: true },
  { lSecurityGroupKey: 3, sGroupName: 'Technician', sDescription: 'Repair workflow, scope intake, and work order management', bActive: true },
  { lSecurityGroupKey: 4, sGroupName: 'Sales Representative', sDescription: 'Client management, quotes, contracts, and sales reports', bActive: true },
  { lSecurityGroupKey: 5, sGroupName: 'Viewer', sDescription: 'Read-only access to dashboards and reports', bActive: true },
]);

// ── Additional Employees (7, keys 6-12) ──────────────────
MockDB.seed('employees', [
  { lEmployeeKey: 6,  lTechnicianKey: 6,    sEmployeeFirst: 'David',   sEmployeeLast: 'Nguyen',    sTechName: 'David Nguyen',    sEmployeeEMail: 'd.nguyen@tsi.com',    bActive: true,  bIsTechnician: true },
  { lEmployeeKey: 7,  lTechnicianKey: 7,    sEmployeeFirst: 'Sarah',   sEmployeeLast: 'Chen',      sTechName: 'Sarah Chen',      sEmployeeEMail: 's.chen@tsi.com',      bActive: true,  bIsTechnician: true },
  { lEmployeeKey: 8,  lTechnicianKey: 8,    sEmployeeFirst: 'Marcus',  sEmployeeLast: 'Williams',  sTechName: 'Marcus Williams', sEmployeeEMail: 'm.williams@tsi.com',  bActive: true,  bIsTechnician: true },
  { lEmployeeKey: 9,  lTechnicianKey: 9,    sEmployeeFirst: 'Lisa',    sEmployeeLast: 'Patel',     sTechName: 'Lisa Patel',      sEmployeeEMail: 'l.patel@tsi.com',     bActive: true,  bIsTechnician: true },
  { lEmployeeKey: 10, lTechnicianKey: 10,   sEmployeeFirst: 'James',   sEmployeeLast: 'Kowalski',  sTechName: 'James Kowalski',  sEmployeeEMail: 'j.kowalski@tsi.com',  bActive: true,  bIsTechnician: true },
  { lEmployeeKey: 11, lTechnicianKey: null,  sEmployeeFirst: 'Karen',   sEmployeeLast: 'Ortiz',     sTechName: 'Karen Ortiz',     sEmployeeEMail: 'k.ortiz@tsi.com',     bActive: true,  bIsTechnician: false },
  { lEmployeeKey: 12, lTechnicianKey: null,  sEmployeeFirst: 'Brian',   sEmployeeLast: 'Foster',    sTechName: 'Brian Foster',    sEmployeeEMail: 'b.foster@tsi.com',    bActive: true,  bIsTechnician: false },
]);

// ── Additional Users (8, keys 4-11) ──────────────────────
// Existing: key 2 (Joseph Brassell, Admin), key 3 (Admin User)
MockDB.seed('users', [
  { lUserKey: 4,  sFirstName: 'Rob',    sLastName: 'Martinez',  sUserName: 'rob.martinez',   sEmailAddress: 'r.martinez@tsi.com',  bActive: true,  bIsAdmin: false, lEmployeeKey: 1,    lSalesRepKey: null, lSecurityGroupKey: 3, dtLastLogin: '2026-03-15T14:22:00' },
  { lUserKey: 5,  sFirstName: 'Tom',    sLastName: 'Bradley',   sUserName: 'tom.bradley',    sEmailAddress: 't.bradley@tsi.com',   bActive: true,  bIsAdmin: false, lEmployeeKey: 2,    lSalesRepKey: null, lSecurityGroupKey: 3, dtLastLogin: '2026-03-16T08:05:00' },
  { lUserKey: 6,  sFirstName: 'Mike',   sLastName: 'Johnson',   sUserName: 'mike.johnson',   sEmailAddress: 'm.johnson@tsi.com',   bActive: true,  bIsAdmin: false, lEmployeeKey: 3,    lSalesRepKey: null, lSecurityGroupKey: 3, dtLastLogin: '2026-03-14T16:40:00' },
  { lUserKey: 7,  sFirstName: 'Chris',  sLastName: 'Lee',       sUserName: 'chris.lee',      sEmailAddress: 'c.lee@tsi.com',       bActive: true,  bIsAdmin: true,  lEmployeeKey: 4,    lSalesRepKey: null, lSecurityGroupKey: 1, dtLastLogin: '2026-03-16T09:10:00' },
  { lUserKey: 8,  sFirstName: 'Brandi', sLastName: 'Cook',      sUserName: 'brandi.cook',    sEmailAddress: 'b.cook@tsi.com',      bActive: true,  bIsAdmin: false, lEmployeeKey: null,  lSalesRepKey: 2,    lSecurityGroupKey: 4, dtLastLogin: '2026-03-15T11:30:00' },
  { lUserKey: 9,  sFirstName: 'Tom',    sLastName: 'Velez',     sUserName: 'tom.velez',      sEmailAddress: 't.velez@tsi.com',     bActive: true,  bIsAdmin: false, lEmployeeKey: null,  lSalesRepKey: 3,    lSecurityGroupKey: 4, dtLastLogin: '2026-03-13T10:15:00' },
  { lUserKey: 10, sFirstName: 'Karen',  sLastName: 'Ortiz',     sUserName: 'karen.ortiz',    sEmailAddress: 'k.ortiz@tsi.com',     bActive: true,  bIsAdmin: false, lEmployeeKey: 11,   lSalesRepKey: null, lSecurityGroupKey: 2, dtLastLogin: '2026-03-16T07:45:00' },
  { lUserKey: 11, sFirstName: 'Brian',  sLastName: 'Foster',    sUserName: 'brian.foster',   sEmailAddress: 'b.foster@tsi.com',    bActive: true,  bIsAdmin: false, lEmployeeKey: 12,   lSalesRepKey: null, lSecurityGroupKey: 5, dtLastLogin: '2026-03-10T09:00:00' },
]);

// ── Tasks (25, keys 1-25) ────────────────────────────────
MockDB.seed('tasks', [
  // Open tasks (10)
  { lTaskKey: 1,  lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Verify loaner return from 88th Medical', sDescription: 'Loaner GIF-H180 was due back 3/10. Confirm receipt and inspect for damage.',
    lAssignedToKey: 1, sAssignedTo: 'Rob Martinez', lClientKey: 3502, sClientName: '88th Medical Group', lDepartmentKey: 11,
    lRepairKey: 6601, sWorkOrderNumber: 'SR26006601', dtCreated: '2026-03-08T00:00:00', dtDue: '2026-03-12T00:00:00', dtCompleted: null },

  { lTaskKey: 2,  lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner',         lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Ship loaner colonoscope to Nashville Gen', sDescription: 'Dept 15 Endoscopy needs a loaner CF-HQ190L while unit 2918371 is in repair.',
    lAssignedToKey: 2, sAssignedTo: 'Tom Bradley', lClientKey: 2210, sClientName: 'Nashville General Hospital', lDepartmentKey: 15,
    lRepairKey: 6602, sWorkOrderNumber: 'SR26006602', dtCreated: '2026-03-10T00:00:00', dtDue: '2026-03-13T00:00:00', dtCompleted: null },

  { lTaskKey: 3,  lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Order bending section for BF-UC180F', sDescription: 'Part #MAJ-1985 bending rubber needed for Metro Health bronchoscope repair.',
    lAssignedToKey: 3, sAssignedTo: 'Mike Johnson', lClientKey: 2755, sClientName: 'Metro Health Hospital', lDepartmentKey: 22,
    lRepairKey: 6605, sWorkOrderNumber: 'NR26006605', dtCreated: '2026-03-11T00:00:00', dtDue: '2026-03-18T00:00:00', dtCompleted: null },

  { lTaskKey: 4,  lTaskTypeKey: 4, sTaskTypeDesc: 'Callback',       lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Call Baylor re: scope damage dispute', sDescription: 'Baylor is disputing the damage assessment on WO NR26006610. Need to review photos and call back.',
    lAssignedToKey: 4, sAssignedTo: 'Chris Lee', lClientKey: 4002, sClientName: 'Baylor University Medical', lDepartmentKey: 30,
    lRepairKey: 6610, sWorkOrderNumber: 'NR26006610', dtCreated: '2026-03-12T00:00:00', dtDue: '2026-03-14T00:00:00', dtCompleted: null },

  { lTaskKey: 5,  lTaskTypeKey: 5, sTaskTypeDesc: 'Quote',          lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Generate repair quote for Duke GI Lab', sDescription: 'Duke needs a quote for annual maintenance on 6 gastroscopes and 4 colonoscopes.',
    lAssignedToKey: 6, sAssignedTo: 'David Nguyen', lClientKey: 4003, sClientName: 'Duke University Hospital', lDepartmentKey: 33,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-13T00:00:00', dtDue: '2026-03-20T00:00:00', dtCompleted: null },

  { lTaskKey: 6,  lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Check warranty status on Inova scopes', sDescription: 'Inova Endoscopy has 3 scopes approaching warranty expiration. Review and notify sales rep.',
    lAssignedToKey: 7, sAssignedTo: 'Sarah Chen', lClientKey: 4004, sClientName: 'Inova Health System', lDepartmentKey: 37,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-05T00:00:00', dtDue: '2026-03-25T00:00:00', dtCompleted: null },

  { lTaskKey: 7,  lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Reorder CCD chip for Stryker 1588', sDescription: 'CCD image sensor needed for Northside Surgery camera head repair.',
    lAssignedToKey: 8, sAssignedTo: 'Marcus Williams', lClientKey: 917, sClientName: 'Northside Hospital', lDepartmentKey: 19,
    lRepairKey: 6607, sWorkOrderNumber: 'NR26006607', dtCreated: '2026-03-09T00:00:00', dtDue: '2026-03-19T00:00:00', dtCompleted: null },

  { lTaskKey: 8,  lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner',         lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Prepare loaner duodenoscope for UPMC', sDescription: 'UPMC Endoscopy requested a loaner TJF-Q180V for next week while their unit is serviced.',
    lAssignedToKey: 9, sAssignedTo: 'Lisa Patel', lClientKey: 4006, sClientName: 'UPMC', lDepartmentKey: 43,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-14T00:00:00', dtDue: '2026-03-21T00:00:00', dtCompleted: null },

  { lTaskKey: 9,  lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Confirm Hackensack PO for repair batch', sDescription: 'Hackensack submitted 4 scopes. PO received but amount does not match quote — clarify with purchasing.',
    lAssignedToKey: 10, sAssignedTo: 'James Kowalski', lClientKey: 4005, sClientName: 'Hackensack Meridian', lDepartmentKey: 40,
    lRepairKey: 6612, sWorkOrderNumber: 'NR26006612', dtCreated: '2026-03-11T00:00:00', dtDue: '2026-03-17T00:00:00', dtCompleted: null },

  { lTaskKey: 10, lTaskTypeKey: 4, sTaskTypeDesc: 'Callback',       lTaskStatusKey: 1, sTaskStatusDesc: 'Open',        lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Urgent callback: Tift scope leak detected', sDescription: 'Tift GI Lab reported a repaired scope is leaking again post-return. Arrange immediate pickup.',
    lAssignedToKey: 1, sAssignedTo: 'Rob Martinez', lClientKey: 1084, sClientName: 'Tift Regional Medical Center', lDepartmentKey: 12,
    lRepairKey: 6603, sWorkOrderNumber: 'SR26006603', dtCreated: '2026-03-15T00:00:00', dtDue: '2026-03-16T00:00:00', dtCompleted: null },

  // In Progress tasks (6)
  { lTaskKey: 11, lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Tracking insertion tube shipment for Tampa', sDescription: 'Olympus insertion tube on order, expected delivery 3/18. Monitor tracking and update repair ETA.',
    lAssignedToKey: 2, sAssignedTo: 'Tom Bradley', lClientKey: 3089, sClientName: 'Tampa Endoscopy Center', lDepartmentKey: 24,
    lRepairKey: 6608, sWorkOrderNumber: 'NR26006608', dtCreated: '2026-03-07T00:00:00', dtDue: '2026-03-18T00:00:00', dtCompleted: null },

  { lTaskKey: 12, lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Coordinate multi-scope pickup from Beaumont', sDescription: 'Beaumont sending 3 endoscopes for repair. FedEx pickup scheduled for 3/17 AM.',
    lAssignedToKey: 3, sAssignedTo: 'Mike Johnson', lClientKey: 4007, sClientName: 'Beaumont Health', lDepartmentKey: 47,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-10T00:00:00', dtDue: '2026-03-17T00:00:00', dtCompleted: null },

  { lTaskKey: 13, lTaskTypeKey: 5, sTaskTypeDesc: 'Quote',          lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Finalize contract renewal quote for MUSC', sDescription: 'MUSC Endoscopy CPO contract expires 4/30. Draft renewal pricing with updated scope inventory.',
    lAssignedToKey: 7, sAssignedTo: 'Sarah Chen', lClientKey: 4008, sClientName: 'MUSC Health', lDepartmentKey: 50,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-06T00:00:00', dtDue: '2026-03-22T00:00:00', dtCompleted: null },

  { lTaskKey: 14, lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner',         lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Track loaner bronchoscope at Johns Hopkins', sDescription: 'Loaner BF-1TH190 shipped 3/12, delivery confirmed. Awaiting return after their unit is repaired.',
    lAssignedToKey: 6, sAssignedTo: 'David Nguyen', lClientKey: 4009, sClientName: 'Johns Hopkins Hospital', lDepartmentKey: 53,
    lRepairKey: 6615, sWorkOrderNumber: 'NR26006615', dtCreated: '2026-03-09T00:00:00', dtDue: '2026-03-23T00:00:00', dtCompleted: null },

  { lTaskKey: 15, lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Light guide bundle on backorder — NYU', sDescription: 'Olympus light guide bundle MAJ-1462 is backordered. ETA 3/25. Notify NYU of delay.',
    lAssignedToKey: 8, sAssignedTo: 'Marcus Williams', lClientKey: 4010, sClientName: 'NYU Langone Health', lDepartmentKey: 57,
    lRepairKey: 6616, sWorkOrderNumber: 'NR26006616', dtCreated: '2026-03-08T00:00:00', dtDue: '2026-03-25T00:00:00', dtCompleted: null },

  { lTaskKey: 16, lTaskTypeKey: 4, sTaskTypeDesc: 'Callback',       lTaskStatusKey: 2, sTaskStatusDesc: 'In Progress',  lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Schedule training call with West Side GI', sDescription: 'West Side GI staff need refresher on proper scope handling. Coordinating with dept manager.',
    lAssignedToKey: 4, sAssignedTo: 'Chris Lee', lClientKey: 3341, sClientName: 'West Side GI Center', lDepartmentKey: 20,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-12T00:00:00', dtDue: '2026-03-20T00:00:00', dtCompleted: null },

  // Completed tasks (7)
  { lTaskKey: 17, lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Confirm Shreveport repair delivery', sDescription: 'Repaired colonoscope shipped FedEx Priority. Confirmed delivered and signed for by dept manager.',
    lAssignedToKey: 1, sAssignedTo: 'Rob Martinez', lClientKey: 1650, sClientName: 'Shreveport Endoscopy', lDepartmentKey: 23,
    lRepairKey: 6604, sWorkOrderNumber: 'NR26006604', dtCreated: '2026-03-01T00:00:00', dtDue: '2026-03-08T00:00:00', dtCompleted: '2026-03-07T00:00:00' },

  { lTaskKey: 18, lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Received angulation wires for GIF-H190', sDescription: 'Parts received and staged for Rob Martinez. Ready for installation on Barnes-Jewish scope.',
    lAssignedToKey: 9, sAssignedTo: 'Lisa Patel', lClientKey: 4011, sClientName: 'Barnes-Jewish Hospital', lDepartmentKey: 60,
    lRepairKey: 6617, sWorkOrderNumber: 'SR26006617', dtCreated: '2026-02-28T00:00:00', dtDue: '2026-03-07T00:00:00', dtCompleted: '2026-03-05T00:00:00' },

  { lTaskKey: 19, lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner',         lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Loaner returned from Baptist Health', sDescription: 'Loaner gastroscope returned in good condition. Cleaned, tested, and returned to loaner pool.',
    lAssignedToKey: 2, sAssignedTo: 'Tom Bradley', lClientKey: 4012, sClientName: 'Baptist Health', lDepartmentKey: 63,
    lRepairKey: 6618, sWorkOrderNumber: 'NR26006618', dtCreated: '2026-02-25T00:00:00', dtDue: '2026-03-05T00:00:00', dtCompleted: '2026-03-04T00:00:00' },

  { lTaskKey: 20, lTaskTypeKey: 5, sTaskTypeDesc: 'Quote',          lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Quote sent to Merit Health for scope sale', sDescription: 'Product sale quote for 2 new Olympus GIF-HQ190 gastroscopes. Sent via email to purchasing.',
    lAssignedToKey: 10, sAssignedTo: 'James Kowalski', lClientKey: 4013, sClientName: 'Merit Health', lDepartmentKey: 66,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-02-20T00:00:00', dtDue: '2026-03-01T00:00:00', dtCompleted: '2026-02-28T00:00:00' },

  { lTaskKey: 21, lTaskTypeKey: 4, sTaskTypeDesc: 'Callback',       lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 3, sTaskPriorityDesc: 'High',
    sSubject: 'Resolved billing dispute with Metro Health', sDescription: 'Credit memo issued for overcharge on WO NR26006605. Customer confirmed satisfaction.',
    lAssignedToKey: 5, sAssignedTo: 'Amy Sanders', lClientKey: 2755, sClientName: 'Metro Health Hospital', lDepartmentKey: 21,
    lRepairKey: 6605, sWorkOrderNumber: 'NR26006605', dtCreated: '2026-03-02T00:00:00', dtDue: '2026-03-10T00:00:00', dtCompleted: '2026-03-09T00:00:00' },

  { lTaskKey: 22, lTaskTypeKey: 1, sTaskTypeDesc: 'Follow Up',      lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Annual scope census completed for Northside', sDescription: 'Verified serial numbers and condition of all 12 scopes at Northside Biomed.',
    lAssignedToKey: 3, sAssignedTo: 'Mike Johnson', lClientKey: 917, sClientName: 'Northside Hospital', lDepartmentKey: 18,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-02-15T00:00:00', dtDue: '2026-03-01T00:00:00', dtCompleted: '2026-02-27T00:00:00' },

  { lTaskKey: 23, lTaskTypeKey: 3, sTaskTypeDesc: 'Parts Order',    lTaskStatusKey: 3, sTaskStatusDesc: 'Completed',    lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'O-rings and valves restocked', sDescription: 'Standard consumables order received. Shelved in parts room. Inventory updated.',
    lAssignedToKey: 6, sAssignedTo: 'David Nguyen', lClientKey: null, sClientName: '', lDepartmentKey: null,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-01T00:00:00', dtDue: '2026-03-10T00:00:00', dtCompleted: '2026-03-08T00:00:00' },

  // Cancelled tasks (2)
  { lTaskKey: 24, lTaskTypeKey: 5, sTaskTypeDesc: 'Quote',          lTaskStatusKey: 4, sTaskStatusDesc: 'Cancelled',    lTaskPriorityKey: 2, sTaskPriorityDesc: 'Normal',
    sSubject: 'Quote request withdrawn — Duke Urology', sDescription: 'Duke Urology decided to extend existing contract instead of requesting new quote. Task cancelled per sales rep.',
    lAssignedToKey: 7, sAssignedTo: 'Sarah Chen', lClientKey: 4003, sClientName: 'Duke University Hospital', lDepartmentKey: 35,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-04T00:00:00', dtDue: '2026-03-15T00:00:00', dtCompleted: '2026-03-06T00:00:00' },

  { lTaskKey: 25, lTaskTypeKey: 2, sTaskTypeDesc: 'Loaner',         lTaskStatusKey: 4, sTaskStatusDesc: 'Cancelled',    lTaskPriorityKey: 1, sTaskPriorityDesc: 'Low',
    sSubject: 'Loaner request cancelled — Inova ICU', sDescription: 'Inova ICU found a backup scope in their inventory. Loaner no longer needed.',
    lAssignedToKey: 8, sAssignedTo: 'Marcus Williams', lClientKey: 4004, sClientName: 'Inova Health System', lDepartmentKey: 38,
    lRepairKey: null, sWorkOrderNumber: '', dtCreated: '2026-03-10T00:00:00', dtDue: '2026-03-15T00:00:00', dtCompleted: '2026-03-11T00:00:00' },
]);

// ── Department GPOs (18, keys 1-18) ──────────────────────
MockDB.seed('departmentGPOs', [
  { lDepartmentGPOKey: 1,  lDepartmentKey: 11, lReportingGroupKey: 1, sGroupName: 'HPG' },
  { lDepartmentGPOKey: 2,  lDepartmentKey: 12, lReportingGroupKey: 5, sGroupName: 'Vizient' },
  { lDepartmentGPOKey: 3,  lDepartmentKey: 15, lReportingGroupKey: 5, sGroupName: 'Vizient' },
  { lDepartmentGPOKey: 4,  lDepartmentKey: 15, lReportingGroupKey: 6, sGroupName: 'Vizient Carts' },
  { lDepartmentGPOKey: 5,  lDepartmentKey: 19, lReportingGroupKey: 4, sGroupName: 'Surgical Solutions' },
  { lDepartmentGPOKey: 6,  lDepartmentKey: 20, lReportingGroupKey: 2, sGroupName: 'Healthnet' },
  { lDepartmentGPOKey: 7,  lDepartmentKey: 21, lReportingGroupKey: 3, sGroupName: 'Novation' },
  { lDepartmentGPOKey: 8,  lDepartmentKey: 23, lReportingGroupKey: 1, sGroupName: 'HPG' },
  { lDepartmentGPOKey: 9,  lDepartmentKey: 30, lReportingGroupKey: 5, sGroupName: 'Vizient' },
  { lDepartmentGPOKey: 10, lDepartmentKey: 33, lReportingGroupKey: 3, sGroupName: 'Novation' },
  { lDepartmentGPOKey: 11, lDepartmentKey: 37, lReportingGroupKey: 5, sGroupName: 'Vizient' },
  { lDepartmentGPOKey: 12, lDepartmentKey: 40, lReportingGroupKey: 2, sGroupName: 'Healthnet' },
  { lDepartmentGPOKey: 13, lDepartmentKey: 43, lReportingGroupKey: 1, sGroupName: 'HPG' },
  { lDepartmentGPOKey: 14, lDepartmentKey: 47, lReportingGroupKey: 7, sGroupName: 'Capital L, LLC' },
  { lDepartmentGPOKey: 15, lDepartmentKey: 50, lReportingGroupKey: 5, sGroupName: 'Vizient' },
  { lDepartmentGPOKey: 16, lDepartmentKey: 53, lReportingGroupKey: 3, sGroupName: 'Novation' },
  { lDepartmentGPOKey: 17, lDepartmentKey: 57, lReportingGroupKey: 4, sGroupName: 'Surgical Solutions' },
  { lDepartmentGPOKey: 18, lDepartmentKey: 60, lReportingGroupKey: 5, sGroupName: 'Vizient' },
]);

// ── SubGroups (22, keys 1-22) ────────────────────────────
MockDB.seed('subGroups', [
  { lSubGroupKey: 1,  lDepartmentKey: 11, sSubGroupName: 'Suite A',          bActive: true },
  { lSubGroupKey: 2,  lDepartmentKey: 11, sSubGroupName: 'Suite B',          bActive: true },
  { lSubGroupKey: 3,  lDepartmentKey: 12, sSubGroupName: 'Day Shift',        bActive: true },
  { lSubGroupKey: 4,  lDepartmentKey: 12, sSubGroupName: 'Night Shift',      bActive: true },
  { lSubGroupKey: 5,  lDepartmentKey: 15, sSubGroupName: 'Outpatient',       bActive: true },
  { lSubGroupKey: 6,  lDepartmentKey: 15, sSubGroupName: 'Inpatient',        bActive: true },
  { lSubGroupKey: 7,  lDepartmentKey: 19, sSubGroupName: 'Procedure Room 1', bActive: true },
  { lSubGroupKey: 8,  lDepartmentKey: 19, sSubGroupName: 'Procedure Room 2', bActive: true },
  { lSubGroupKey: 9,  lDepartmentKey: 20, sSubGroupName: 'Pre-Op',           bActive: true },
  { lSubGroupKey: 10, lDepartmentKey: 20, sSubGroupName: 'Recovery',         bActive: true },
  { lSubGroupKey: 11, lDepartmentKey: 30, sSubGroupName: 'Suite A',          bActive: true },
  { lSubGroupKey: 12, lDepartmentKey: 30, sSubGroupName: 'Suite B',          bActive: true },
  { lSubGroupKey: 13, lDepartmentKey: 33, sSubGroupName: 'Teaching Lab',     bActive: true },
  { lSubGroupKey: 14, lDepartmentKey: 33, sSubGroupName: 'Research Wing',    bActive: true },
  { lSubGroupKey: 15, lDepartmentKey: 37, sSubGroupName: 'Outpatient',       bActive: true },
  { lSubGroupKey: 16, lDepartmentKey: 37, sSubGroupName: 'Inpatient',        bActive: true },
  { lSubGroupKey: 17, lDepartmentKey: 43, sSubGroupName: 'Day Shift',        bActive: true },
  { lSubGroupKey: 18, lDepartmentKey: 43, sSubGroupName: 'Night Shift',      bActive: true },
  { lSubGroupKey: 19, lDepartmentKey: 50, sSubGroupName: 'Procedure Room 1', bActive: true },
  { lSubGroupKey: 20, lDepartmentKey: 50, sSubGroupName: 'Procedure Room 2', bActive: true },
  { lSubGroupKey: 21, lDepartmentKey: 53, sSubGroupName: 'Suite A',          bActive: true },
  { lSubGroupKey: 22, lDepartmentKey: 57, sSubGroupName: 'Pre-Op',           bActive: true },
]);

// ── Department Scope Types (40, keys 1-40) ───────────────
MockDB.seed('departmentScopeTypes', [
  // Dept 11 — 88th Medical Endoscopy Unit (GI: gastro + colono + duodeno)
  { lDeptScopeTypeKey: 1,  lDepartmentKey: 11, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180' },
  { lDeptScopeTypeKey: 2,  lDepartmentKey: 11, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190' },
  { lDeptScopeTypeKey: 3,  lDepartmentKey: 11, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lDeptScopeTypeKey: 4,  lDepartmentKey: 11, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V' },

  // Dept 12 — Tift GI Lab (gastro + colono + duodeno)
  { lDeptScopeTypeKey: 5,  lDepartmentKey: 12, lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190' },
  { lDeptScopeTypeKey: 6,  lDepartmentKey: 12, lScopeTypeKey: 1005, sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lDeptScopeTypeKey: 7,  lDepartmentKey: 12, lScopeTypeKey: 1014, sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lDeptScopeTypeKey: 8,  lDepartmentKey: 12, lScopeTypeKey: 1031, sScopeTypeDesc: 'Pentax FG-34W' },

  // Dept 15 — Nashville Gen Endoscopy (gastro + colono + duodeno)
  { lDeptScopeTypeKey: 9,  lDepartmentKey: 15, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180' },
  { lDeptScopeTypeKey: 10, lDepartmentKey: 15, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190' },
  { lDeptScopeTypeKey: 11, lDepartmentKey: 15, lScopeTypeKey: 1011, sScopeTypeDesc: 'Olympus CF-H185L' },
  { lDeptScopeTypeKey: 12, lDepartmentKey: 15, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V' },

  // Dept 16 — Nashville Gen Pulmonology (bronchoscopes)
  { lDeptScopeTypeKey: 13, lDepartmentKey: 16, lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290' },
  { lDeptScopeTypeKey: 14, lDepartmentKey: 16, lScopeTypeKey: 1022, sScopeTypeDesc: 'Olympus BF-1TH190' },
  { lDeptScopeTypeKey: 15, lDepartmentKey: 16, lScopeTypeKey: 1023, sScopeTypeDesc: 'Pentax EB-1990i' },

  // Dept 19 — Northside Surgery/OR (rigid + cameras)
  { lDeptScopeTypeKey: 16, lDepartmentKey: 19, lScopeTypeKey: 2005, sScopeTypeDesc: 'Stryker 5mm Arthroscope' },
  { lDeptScopeTypeKey: 17, lDepartmentKey: 19, lScopeTypeKey: 3001, sScopeTypeDesc: 'Stryker 1288 Camera Head' },
  { lDeptScopeTypeKey: 18, lDepartmentKey: 19, lScopeTypeKey: 3002, sScopeTypeDesc: 'Stryker 1588 Camera Head' },
  { lDeptScopeTypeKey: 19, lDepartmentKey: 19, lScopeTypeKey: 3003, sScopeTypeDesc: 'Olympus OTV-SP1' },
  { lDeptScopeTypeKey: 20, lDepartmentKey: 19, lScopeTypeKey: 3004, sScopeTypeDesc: 'Olympus CLV-S200' },

  // Dept 20 — West Side GI Lab (gastro + colono)
  { lDeptScopeTypeKey: 21, lDepartmentKey: 20, lScopeTypeKey: 1004, sScopeTypeDesc: 'Olympus GIF-Q165' },
  { lDeptScopeTypeKey: 22, lDepartmentKey: 20, lScopeTypeKey: 1012, sScopeTypeDesc: 'Olympus PCF-H190DL' },
  { lDeptScopeTypeKey: 23, lDepartmentKey: 20, lScopeTypeKey: 1013, sScopeTypeDesc: 'Olympus PCF-H190' },

  // Dept 27 — Memorial Urology (rigid urology scopes + instruments)
  { lDeptScopeTypeKey: 24, lDepartmentKey: 27, lScopeTypeKey: 2001, sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lDeptScopeTypeKey: 25, lDepartmentKey: 27, lScopeTypeKey: 2003, sScopeTypeDesc: 'Olympus URF-V2' },
  { lDeptScopeTypeKey: 26, lDepartmentKey: 27, lScopeTypeKey: 2004, sScopeTypeDesc: 'Olympus CYF-V2' },
  { lDeptScopeTypeKey: 27, lDepartmentKey: 27, lScopeTypeKey: 4003, sScopeTypeDesc: 'Olympus WA50012A Resectoscope' },

  // Dept 30 — Baylor Endoscopy (gastro + colono + duodeno)
  { lDeptScopeTypeKey: 28, lDepartmentKey: 30, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180' },
  { lDeptScopeTypeKey: 29, lDepartmentKey: 30, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lDeptScopeTypeKey: 30, lDepartmentKey: 30, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V' },

  // Dept 35 — Duke Urology (rigid urology)
  { lDeptScopeTypeKey: 31, lDepartmentKey: 35, lScopeTypeKey: 2001, sScopeTypeDesc: 'Storz 27005BA Cystoscope' },
  { lDeptScopeTypeKey: 32, lDepartmentKey: 35, lScopeTypeKey: 2002, sScopeTypeDesc: 'Storz 26003BA Resectoscope' },
  { lDeptScopeTypeKey: 33, lDepartmentKey: 35, lScopeTypeKey: 2003, sScopeTypeDesc: 'Olympus URF-V2' },

  // Dept 43 — UPMC Endoscopy (gastro + colono + duodeno)
  { lDeptScopeTypeKey: 34, lDepartmentKey: 43, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190' },
  { lDeptScopeTypeKey: 35, lDepartmentKey: 43, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L' },
  { lDeptScopeTypeKey: 36, lDepartmentKey: 43, lScopeTypeKey: 1031, sScopeTypeDesc: 'Pentax FG-34W' },

  // Dept 50 — MUSC Endoscopy (gastro + colono + broncho)
  { lDeptScopeTypeKey: 37, lDepartmentKey: 50, lScopeTypeKey: 1005, sScopeTypeDesc: 'Fujifilm EG-760Z' },
  { lDeptScopeTypeKey: 38, lDepartmentKey: 50, lScopeTypeKey: 1014, sScopeTypeDesc: 'Fujifilm EC-760R' },
  { lDeptScopeTypeKey: 39, lDepartmentKey: 50, lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290' },

  // Dept 57 — NYU Langone Endoscopy (gastro + colono)
  { lDeptScopeTypeKey: 40, lDepartmentKey: 57, lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190' },
]);

// ── Model Max Charges (35, keys 1-35) ────────────────────
MockDB.seed('modelMaxCharges', [
  // Dept 11 — 88th Medical Endoscopy
  { lModelMaxChargeKey: 1,  lDepartmentKey: 11, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180',          mMaxCharge: 2400.00 },
  { lModelMaxChargeKey: 2,  lDepartmentKey: 11, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190',         mMaxCharge: 2900.00 },
  { lModelMaxChargeKey: 3,  lDepartmentKey: 11, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L',         mMaxCharge: 3400.00 },
  { lModelMaxChargeKey: 4,  lDepartmentKey: 11, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V',         mMaxCharge: 4800.00 },

  // Dept 12 — Tift GI Lab
  { lModelMaxChargeKey: 5,  lDepartmentKey: 12, lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190',          mMaxCharge: 3100.00 },
  { lModelMaxChargeKey: 6,  lDepartmentKey: 12, lScopeTypeKey: 1005, sScopeTypeDesc: 'Fujifilm EG-760Z',          mMaxCharge: 2700.00 },
  { lModelMaxChargeKey: 7,  lDepartmentKey: 12, lScopeTypeKey: 1014, sScopeTypeDesc: 'Fujifilm EC-760R',          mMaxCharge: 2900.00 },
  { lModelMaxChargeKey: 8,  lDepartmentKey: 12, lScopeTypeKey: 1031, sScopeTypeDesc: 'Pentax FG-34W',             mMaxCharge: 4000.00 },

  // Dept 15 — Nashville Gen Endoscopy
  { lModelMaxChargeKey: 9,  lDepartmentKey: 15, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180',          mMaxCharge: 2500.00 },
  { lModelMaxChargeKey: 10, lDepartmentKey: 15, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190',         mMaxCharge: 3000.00 },
  { lModelMaxChargeKey: 11, lDepartmentKey: 15, lScopeTypeKey: 1011, sScopeTypeDesc: 'Olympus CF-H185L',          mMaxCharge: 3100.00 },
  { lModelMaxChargeKey: 12, lDepartmentKey: 15, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V',         mMaxCharge: 5000.00 },

  // Dept 16 — Nashville Gen Pulmonology
  { lModelMaxChargeKey: 13, lDepartmentKey: 16, lScopeTypeKey: 1020, sScopeTypeDesc: 'Olympus BF-P290',           mMaxCharge: 2700.00 },
  { lModelMaxChargeKey: 14, lDepartmentKey: 16, lScopeTypeKey: 1022, sScopeTypeDesc: 'Olympus BF-1TH190',         mMaxCharge: 3100.00 },
  { lModelMaxChargeKey: 15, lDepartmentKey: 16, lScopeTypeKey: 1023, sScopeTypeDesc: 'Pentax EB-1990i',           mMaxCharge: 2900.00 },

  // Dept 19 — Northside Surgery/OR
  { lModelMaxChargeKey: 16, lDepartmentKey: 19, lScopeTypeKey: 2005, sScopeTypeDesc: 'Stryker 5mm Arthroscope',   mMaxCharge: 1400.00 },
  { lModelMaxChargeKey: 17, lDepartmentKey: 19, lScopeTypeKey: 3001, sScopeTypeDesc: 'Stryker 1288 Camera Head',  mMaxCharge: 2100.00 },
  { lModelMaxChargeKey: 18, lDepartmentKey: 19, lScopeTypeKey: 3002, sScopeTypeDesc: 'Stryker 1588 Camera Head',  mMaxCharge: 2700.00 },
  { lModelMaxChargeKey: 19, lDepartmentKey: 19, lScopeTypeKey: 3003, sScopeTypeDesc: 'Olympus OTV-SP1',           mMaxCharge: 1900.00 },

  // Dept 20 — West Side GI Lab
  { lModelMaxChargeKey: 20, lDepartmentKey: 20, lScopeTypeKey: 1004, sScopeTypeDesc: 'Olympus GIF-Q165',          mMaxCharge: 2100.00 },
  { lModelMaxChargeKey: 21, lDepartmentKey: 20, lScopeTypeKey: 1012, sScopeTypeDesc: 'Olympus PCF-H190DL',        mMaxCharge: 3300.00 },
  { lModelMaxChargeKey: 22, lDepartmentKey: 20, lScopeTypeKey: 1013, sScopeTypeDesc: 'Olympus PCF-H190',          mMaxCharge: 3000.00 },

  // Dept 30 — Baylor Endoscopy
  { lModelMaxChargeKey: 23, lDepartmentKey: 30, lScopeTypeKey: 1001, sScopeTypeDesc: 'Olympus GIF-H180',          mMaxCharge: 2500.00 },
  { lModelMaxChargeKey: 24, lDepartmentKey: 30, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L',         mMaxCharge: 3500.00 },
  { lModelMaxChargeKey: 25, lDepartmentKey: 30, lScopeTypeKey: 1030, sScopeTypeDesc: 'Olympus TJF-Q180V',         mMaxCharge: 4900.00 },

  // Dept 35 — Duke Urology
  { lModelMaxChargeKey: 26, lDepartmentKey: 35, lScopeTypeKey: 2001, sScopeTypeDesc: 'Storz 27005BA Cystoscope',  mMaxCharge: 1700.00 },
  { lModelMaxChargeKey: 27, lDepartmentKey: 35, lScopeTypeKey: 2002, sScopeTypeDesc: 'Storz 26003BA Resectoscope', mMaxCharge: 1900.00 },
  { lModelMaxChargeKey: 28, lDepartmentKey: 35, lScopeTypeKey: 2003, sScopeTypeDesc: 'Olympus URF-V2',            mMaxCharge: 3400.00 },

  // Dept 43 — UPMC Endoscopy
  { lModelMaxChargeKey: 29, lDepartmentKey: 43, lScopeTypeKey: 1002, sScopeTypeDesc: 'Olympus GIF-HQ190',         mMaxCharge: 2900.00 },
  { lModelMaxChargeKey: 30, lDepartmentKey: 43, lScopeTypeKey: 1010, sScopeTypeDesc: 'Olympus CF-HQ190L',         mMaxCharge: 3400.00 },
  { lModelMaxChargeKey: 31, lDepartmentKey: 43, lScopeTypeKey: 1031, sScopeTypeDesc: 'Pentax FG-34W',             mMaxCharge: 4100.00 },

  // Dept 50 — MUSC Endoscopy
  { lModelMaxChargeKey: 32, lDepartmentKey: 50, lScopeTypeKey: 1005, sScopeTypeDesc: 'Fujifilm EG-760Z',          mMaxCharge: 2700.00 },
  { lModelMaxChargeKey: 33, lDepartmentKey: 50, lScopeTypeKey: 1014, sScopeTypeDesc: 'Fujifilm EC-760R',          mMaxCharge: 2900.00 },

  // Dept 57 — NYU Langone Endoscopy
  { lModelMaxChargeKey: 34, lDepartmentKey: 57, lScopeTypeKey: 1003, sScopeTypeDesc: 'Olympus GIF-H190',          mMaxCharge: 3100.00 },

  // Dept 27 — Memorial Urology
  { lModelMaxChargeKey: 35, lDepartmentKey: 27, lScopeTypeKey: 2001, sScopeTypeDesc: 'Storz 27005BA Cystoscope',  mMaxCharge: 1750.00 },
]);

console.log('[MockDB] WP-6 Admin seeded: ' +
  MockDB.getAll('tasks').length + ' tasks, ' +
  MockDB.getAll('users').length + ' users, ' +
  MockDB.getAll('securityGroups').length + ' security groups, ' +
  MockDB.getAll('employees').length + ' employees, ' +
  MockDB.getAll('departmentGPOs').length + ' dept GPOs, ' +
  MockDB.getAll('subGroups').length + ' sub-groups, ' +
  MockDB.getAll('departmentScopeTypes').length + ' dept scope types, ' +
  MockDB.getAll('modelMaxCharges').length + ' model max charges'
);
// ═══════════════════════════════════════════════════════
//  WP-3: Expanded Contracts + Child Records
//  Append to mock-db.js after existing contract seed data
// ═══════════════════════════════════════════════════════

// ── Contract Types (addition: key 8) ────────────────────
// Existing keys 1-7: CPO, Fuse, Capitated Service, Shared Risk, Cart, Airway, Rental
MockDB.seed('contractTypes', [
  { lContractTypeKey: 8, sContractTypeName: 'Time & Materials' },
]);

// ── Contracts (+13, keys 9200-9212) ─────────────────────
// Mix: 7 Active, 3 Expired, 2 Expiring (within 60 days), 1 Pending
MockDB.seed('contracts', [
  // --- Active (7) ---
  { lContractKey: 9200, sContractName1: 'Baylor Scott & White - Full Service',
    lClientKey: 4002, sClientName1: 'Baylor Scott & White Medical Center',
    sContractType: 'CPO', sContractStatus: 'Active',
    dtDateEffective: '2025-07-01T00:00:00', dtDateTermination: '2026-06-30T00:00:00',
    dblAmtTotal: 96000.00, dblAmtMonthly: 8000.00,
    sSalesRepName: 'Joseph Brassell', lSalesRepKey: 1,
    sInvoiceFrequency: 'Monthly', sPurchaseOrder: 'PO-2025-4100',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 5, nDepartmentCount: 3, sNotes: '' },

  { lContractKey: 9201, sContractName1: 'Duke University - Shared Risk',
    lClientKey: 4003, sClientName1: 'Duke University Hospital',
    sContractType: 'Shared Risk', sContractStatus: 'Active',
    dtDateEffective: '2025-09-01T00:00:00', dtDateTermination: '2026-08-31T00:00:00',
    dblAmtTotal: 120000.00, dblAmtMonthly: 10000.00,
    sSalesRepName: 'Brandi Cook', lSalesRepKey: 2,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-4210',
    sPaymentTerms: 'Net 60', sCoverageModel: 'Preferred',
    nScopeCount: 6, nDepartmentCount: 4, sNotes: 'Includes urology rigid scopes' },

  { lContractKey: 9202, sContractName1: 'UPMC Presbyterian - Capitated',
    lClientKey: 4006, sClientName1: 'UPMC Presbyterian',
    sContractType: 'Capitated Service', sContractStatus: 'Active',
    dtDateEffective: '2025-10-01T00:00:00', dtDateTermination: '2026-09-30T00:00:00',
    dblAmtTotal: 84000.00, dblAmtMonthly: 7000.00,
    sSalesRepName: 'Tom Velez', lSalesRepKey: 3,
    sInvoiceFrequency: 'Monthly', sPurchaseOrder: 'PO-2025-4305',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 5, nDepartmentCount: 4, sNotes: '' },

  { lContractKey: 9203, sContractName1: 'Johns Hopkins - Comprehensive',
    lClientKey: 4009, sClientName1: 'Johns Hopkins Bayview Medical Center',
    sContractType: 'Fuse', sContractStatus: 'Active',
    dtDateEffective: '2025-06-01T00:00:00', dtDateTermination: '2026-05-31T00:00:00',
    dblAmtTotal: 108000.00, dblAmtMonthly: 9000.00,
    sSalesRepName: 'J. Miller', lSalesRepKey: 6,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-4418',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Preferred',
    nScopeCount: 5, nDepartmentCount: 4, sNotes: '' },

  { lContractKey: 9204, sContractName1: 'NYU Langone - Preventive Maintenance',
    lClientKey: 4010, sClientName1: 'NYU Langone Hospital Brooklyn',
    sContractType: 'Fuse', sContractStatus: 'Active',
    dtDateEffective: '2025-11-01T00:00:00', dtDateTermination: '2026-10-31T00:00:00',
    dblAmtTotal: 48000.00, dblAmtMonthly: 4000.00,
    sSalesRepName: 'Rob Mancini', lSalesRepKey: 4,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-4520',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 4, nDepartmentCount: 3, sNotes: '' },

  { lContractKey: 9205, sContractName1: 'Metro Health - Full Service',
    lClientKey: 2755, sClientName1: 'Metro Health Hospital',
    sContractType: 'CPO', sContractStatus: 'Active',
    dtDateEffective: '2026-01-01T00:00:00', dtDateTermination: '2026-12-31T00:00:00',
    dblAmtTotal: 36000.00, dblAmtMonthly: 3000.00,
    sSalesRepName: 'R. Thompson', lSalesRepKey: 7,
    sInvoiceFrequency: 'Monthly', sPurchaseOrder: 'PO-2026-0015',
    sPaymentTerms: 'Due Upon Receipt', sCoverageModel: 'Performance',
    nScopeCount: 3, nDepartmentCount: 2, sNotes: '' },

  { lContractKey: 9206, sContractName1: 'Barnes-Jewish - Capitated Flex',
    lClientKey: 4011, sClientName1: 'Barnes-Jewish Hospital',
    sContractType: 'Capitated Service', sContractStatus: 'Active',
    dtDateEffective: '2025-08-01T00:00:00', dtDateTermination: '2026-07-31T00:00:00',
    dblAmtTotal: 60000.00, dblAmtMonthly: 5000.00,
    sSalesRepName: 'S. Chen', lSalesRepKey: 8,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-4630',
    sPaymentTerms: 'Net 60', sCoverageModel: 'Preferred',
    nScopeCount: 4, nDepartmentCount: 3, sNotes: '' },

  // --- Expired (3) ---
  { lContractKey: 9207, sContractName1: 'Hackensack - PM (Expired)',
    lClientKey: 4005, sClientName1: 'Hackensack University Medical Center',
    sContractType: 'Fuse', sContractStatus: 'Expired',
    dtDateEffective: '2024-10-01T00:00:00', dtDateTermination: '2025-09-30T00:00:00',
    dblAmtTotal: 42000.00, dblAmtMonthly: 3500.00,
    sSalesRepName: 'Debbie Hightower', lSalesRepKey: 5,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2024-3800',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 4, nDepartmentCount: 3, sNotes: 'Not renewed — pricing dispute' },

  { lContractKey: 9208, sContractName1: 'MUSC Health - Shared Risk (Expired)',
    lClientKey: 4008, sClientName1: 'MUSC Health University Hospital',
    sContractType: 'Shared Risk', sContractStatus: 'Expired',
    dtDateEffective: '2024-06-01T00:00:00', dtDateTermination: '2025-05-31T00:00:00',
    dblAmtTotal: 54000.00, dblAmtMonthly: 4500.00,
    sSalesRepName: 'K. Davis', lSalesRepKey: 9,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2024-3550',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Preferred',
    nScopeCount: 3, nDepartmentCount: 3, sNotes: 'Moved to time & materials' },

  { lContractKey: 9209, sContractName1: 'Northside - CPO (Expired)',
    lClientKey: 917, sClientName1: 'Northside Hospital',
    sContractType: 'CPO', sContractStatus: 'Expired',
    dtDateEffective: '2024-11-01T00:00:00', dtDateTermination: '2025-10-31T00:00:00',
    dblAmtTotal: 18000.00, dblAmtMonthly: 1500.00,
    sSalesRepName: 'Joseph Brassell', lSalesRepKey: 1,
    sInvoiceFrequency: 'Monthly', sPurchaseOrder: 'PO-2024-3700',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 3, nDepartmentCount: 2, sNotes: '' },

  // --- Expiring within 60 days (2) ---
  { lContractKey: 9210, sContractName1: 'Baptist Health - Expiring PM',
    lClientKey: 4012, sClientName1: 'Baptist Health Lexington',
    sContractType: 'Fuse', sContractStatus: 'Expiring',
    dtDateEffective: '2025-05-01T00:00:00', dtDateTermination: '2026-04-30T00:00:00',
    dblAmtTotal: 30000.00, dblAmtMonthly: 2500.00,
    sSalesRepName: 'Brandi Cook', lSalesRepKey: 2,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: 'PO-2025-4050',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 4, nDepartmentCount: 3, sNotes: 'Renewal proposal sent 2026-02-20' },

  { lContractKey: 9211, sContractName1: 'Inova Fairfax - Expiring CPO',
    lClientKey: 4004, sClientName1: 'Inova Fairfax Hospital',
    sContractType: 'CPO', sContractStatus: 'Expiring',
    dtDateEffective: '2025-05-15T00:00:00', dtDateTermination: '2026-05-14T00:00:00',
    dblAmtTotal: 72000.00, dblAmtMonthly: 6000.00,
    sSalesRepName: 'Tom Velez', lSalesRepKey: 3,
    sInvoiceFrequency: 'Monthly', sPurchaseOrder: 'PO-2025-4080',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Preferred',
    nScopeCount: 4, nDepartmentCount: 3, sNotes: 'Client reviewing renewal terms' },

  // --- Pending (1) ---
  { lContractKey: 9212, sContractName1: 'Merit Health - Pending Capitated',
    lClientKey: 4013, sClientName1: 'Merit Health Wesley',
    sContractType: 'Capitated Service', sContractStatus: 'Pending',
    dtDateEffective: '2026-04-01T00:00:00', dtDateTermination: '2027-03-31T00:00:00',
    dblAmtTotal: 24000.00, dblAmtMonthly: 2000.00,
    sSalesRepName: 'K. Davis', lSalesRepKey: 9,
    sInvoiceFrequency: 'Quarterly', sPurchaseOrder: '',
    sPaymentTerms: 'Net 30', sCoverageModel: 'Performance',
    nScopeCount: 3, nDepartmentCount: 3, sNotes: 'Awaiting finance approval' },
]);


// ── ContractDepartments (+35, keys 1-35) ────────────────
// Each contract links to 2-4 departments from its client
MockDB.seed('contractDepartments', [
  // 9200 — Baylor (4002): depts 30, 31, 32
  { lContractDepartmentKey: 1,  lContractKey: 9200, lDepartmentKey: 30, sDepartmentName: 'Endoscopy',       sClientName1: 'Baylor Scott & White Medical Center', dtAdded: '2025-07-01' },
  { lContractDepartmentKey: 2,  lContractKey: 9200, lDepartmentKey: 31, sDepartmentName: 'Surgery / OR',    sClientName1: 'Baylor Scott & White Medical Center', dtAdded: '2025-07-01' },
  { lContractDepartmentKey: 3,  lContractKey: 9200, lDepartmentKey: 32, sDepartmentName: 'Pulmonology',     sClientName1: 'Baylor Scott & White Medical Center', dtAdded: '2025-07-01' },

  // 9201 — Duke (4003): depts 33, 34, 35, 36
  { lContractDepartmentKey: 4,  lContractKey: 9201, lDepartmentKey: 33, sDepartmentName: 'GI Lab',                  sClientName1: 'Duke University Hospital', dtAdded: '2025-09-01' },
  { lContractDepartmentKey: 5,  lContractKey: 9201, lDepartmentKey: 34, sDepartmentName: 'Surgery / OR',            sClientName1: 'Duke University Hospital', dtAdded: '2025-09-01' },
  { lContractDepartmentKey: 6,  lContractKey: 9201, lDepartmentKey: 35, sDepartmentName: 'Urology',                 sClientName1: 'Duke University Hospital', dtAdded: '2025-09-01' },
  { lContractDepartmentKey: 7,  lContractKey: 9201, lDepartmentKey: 36, sDepartmentName: 'Biomedical Engineering',   sClientName1: 'Duke University Hospital', dtAdded: '2025-09-01' },

  // 9202 — UPMC (4006): depts 43, 44, 45, 46
  { lContractDepartmentKey: 8,  lContractKey: 9202, lDepartmentKey: 43, sDepartmentName: 'Endoscopy',               sClientName1: 'UPMC Presbyterian', dtAdded: '2025-10-01' },
  { lContractDepartmentKey: 9,  lContractKey: 9202, lDepartmentKey: 44, sDepartmentName: 'Cardiology',              sClientName1: 'UPMC Presbyterian', dtAdded: '2025-10-01' },
  { lContractDepartmentKey: 10, lContractKey: 9202, lDepartmentKey: 45, sDepartmentName: 'Surgery / OR',            sClientName1: 'UPMC Presbyterian', dtAdded: '2025-10-01' },
  { lContractDepartmentKey: 11, lContractKey: 9202, lDepartmentKey: 46, sDepartmentName: 'Biomedical Engineering',   sClientName1: 'UPMC Presbyterian', dtAdded: '2025-10-01' },

  // 9203 — Johns Hopkins (4009): depts 53, 54, 55, 56
  { lContractDepartmentKey: 12, lContractKey: 9203, lDepartmentKey: 53, sDepartmentName: 'GI Lab',                  sClientName1: 'Johns Hopkins Bayview Medical Center', dtAdded: '2025-06-01' },
  { lContractDepartmentKey: 13, lContractKey: 9203, lDepartmentKey: 54, sDepartmentName: 'Surgery / OR',            sClientName1: 'Johns Hopkins Bayview Medical Center', dtAdded: '2025-06-01' },
  { lContractDepartmentKey: 14, lContractKey: 9203, lDepartmentKey: 55, sDepartmentName: 'Biomedical Engineering',   sClientName1: 'Johns Hopkins Bayview Medical Center', dtAdded: '2025-06-01' },
  { lContractDepartmentKey: 15, lContractKey: 9203, lDepartmentKey: 56, sDepartmentName: 'Urology',                 sClientName1: 'Johns Hopkins Bayview Medical Center', dtAdded: '2025-06-01' },

  // 9204 — NYU Langone (4010): depts 57, 58, 59
  { lContractDepartmentKey: 16, lContractKey: 9204, lDepartmentKey: 57, sDepartmentName: 'Endoscopy',       sClientName1: 'NYU Langone Hospital Brooklyn', dtAdded: '2025-11-01' },
  { lContractDepartmentKey: 17, lContractKey: 9204, lDepartmentKey: 58, sDepartmentName: 'Surgery / OR',    sClientName1: 'NYU Langone Hospital Brooklyn', dtAdded: '2025-11-01' },
  { lContractDepartmentKey: 18, lContractKey: 9204, lDepartmentKey: 59, sDepartmentName: 'Cardiology',      sClientName1: 'NYU Langone Hospital Brooklyn', dtAdded: '2025-11-01' },

  // 9205 — Metro Health (2755): depts 21, 22
  { lContractDepartmentKey: 19, lContractKey: 9205, lDepartmentKey: 21, sDepartmentName: 'Endoscopy',           sClientName1: 'Metro Health Hospital', dtAdded: '2026-01-01' },
  { lContractDepartmentKey: 20, lContractKey: 9205, lDepartmentKey: 22, sDepartmentName: 'ICU / Critical Care', sClientName1: 'Metro Health Hospital', dtAdded: '2026-01-01' },

  // 9206 — Barnes-Jewish (4011): depts 60, 61, 62
  { lContractDepartmentKey: 21, lContractKey: 9206, lDepartmentKey: 60, sDepartmentName: 'GI Lab',                  sClientName1: 'Barnes-Jewish Hospital', dtAdded: '2025-08-01' },
  { lContractDepartmentKey: 22, lContractKey: 9206, lDepartmentKey: 61, sDepartmentName: 'Endoscopy',               sClientName1: 'Barnes-Jewish Hospital', dtAdded: '2025-08-01' },
  { lContractDepartmentKey: 23, lContractKey: 9206, lDepartmentKey: 62, sDepartmentName: 'Biomedical Engineering',   sClientName1: 'Barnes-Jewish Hospital', dtAdded: '2025-08-01' },

  // 9207 — Hackensack (4005): depts 40, 41, 42
  { lContractDepartmentKey: 24, lContractKey: 9207, lDepartmentKey: 40, sDepartmentName: 'GI Lab',             sClientName1: 'Hackensack University Medical Center', dtAdded: '2024-10-01' },
  { lContractDepartmentKey: 25, lContractKey: 9207, lDepartmentKey: 41, sDepartmentName: 'Sterile Processing', sClientName1: 'Hackensack University Medical Center', dtAdded: '2024-10-01' },
  { lContractDepartmentKey: 26, lContractKey: 9207, lDepartmentKey: 42, sDepartmentName: 'Surgery / OR',      sClientName1: 'Hackensack University Medical Center', dtAdded: '2024-10-01' },

  // 9208 — MUSC (4008): depts 50, 51, 52
  { lContractDepartmentKey: 27, lContractKey: 9208, lDepartmentKey: 50, sDepartmentName: 'Endoscopy',          sClientName1: 'MUSC Health University Hospital', dtAdded: '2024-06-01' },
  { lContractDepartmentKey: 28, lContractKey: 9208, lDepartmentKey: 51, sDepartmentName: 'Pulmonology',        sClientName1: 'MUSC Health University Hospital', dtAdded: '2024-06-01' },
  { lContractDepartmentKey: 29, lContractKey: 9208, lDepartmentKey: 52, sDepartmentName: 'Sterile Processing', sClientName1: 'MUSC Health University Hospital', dtAdded: '2024-06-01' },

  // 9209 — Northside (917): depts 18, 19
  { lContractDepartmentKey: 30, lContractKey: 9209, lDepartmentKey: 18, sDepartmentName: 'Biomedical Engineering', sClientName1: 'Northside Hospital', dtAdded: '2024-11-01' },
  { lContractDepartmentKey: 31, lContractKey: 9209, lDepartmentKey: 19, sDepartmentName: 'Surgery / OR',          sClientName1: 'Northside Hospital', dtAdded: '2024-11-01' },

  // 9210 — Baptist Health (4012): depts 63, 64, 65
  { lContractDepartmentKey: 32, lContractKey: 9210, lDepartmentKey: 63, sDepartmentName: 'Endoscopy',    sClientName1: 'Baptist Health Lexington', dtAdded: '2025-05-01' },
  { lContractDepartmentKey: 33, lContractKey: 9210, lDepartmentKey: 64, sDepartmentName: 'Surgery / OR', sClientName1: 'Baptist Health Lexington', dtAdded: '2025-05-01' },
  { lContractDepartmentKey: 34, lContractKey: 9210, lDepartmentKey: 65, sDepartmentName: 'Urology',      sClientName1: 'Baptist Health Lexington', dtAdded: '2025-05-01' },

  // 9211 — Inova (4004): depts 37, 38, 39
  { lContractDepartmentKey: 35, lContractKey: 9211, lDepartmentKey: 37, sDepartmentName: 'Endoscopy',           sClientName1: 'Inova Fairfax Hospital', dtAdded: '2025-05-15' },
]);


// ── ContractScopes (+50, keys 1-50) ─────────────────────
// 3-6 scopes per contract, using scopes that belong to the contract's client departments
MockDB.seed('contractScopes', [
  // 9200 — Baylor (depts 30, 31, 32): scopes 1036, 1046, 1056, 1073, 1091
  { lContractScopeKey: 1,  lContractKey: 9200, lScopeKey: 1036, sSerialNumber: '3802110',       sScopeTypeDesc: 'Olympus GIF-H180',       sRigidOrFlexible: 'F', lDepartmentKey: 30, sDepartmentName: 'Endoscopy',    dtAdded: '2025-07-01' },
  { lContractScopeKey: 2,  lContractKey: 9200, lScopeKey: 1046, sSerialNumber: 'CF-HQ7701',     sScopeTypeDesc: 'Olympus CF-HQ190L',      sRigidOrFlexible: 'F', lDepartmentKey: 30, sDepartmentName: 'Endoscopy',    dtAdded: '2025-07-01' },
  { lContractScopeKey: 3,  lContractKey: 9200, lScopeKey: 1056, sSerialNumber: 'BF-P290-TX1',   sScopeTypeDesc: 'Olympus BF-P290',        sRigidOrFlexible: 'F', lDepartmentKey: 32, sDepartmentName: 'Pulmonology',  dtAdded: '2025-07-01' },
  { lContractScopeKey: 4,  lContractKey: 9200, lScopeKey: 1073, sSerialNumber: 'URF-V2-TX1',    sScopeTypeDesc: 'Olympus URF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 31, sDepartmentName: 'Surgery / OR', dtAdded: '2025-07-01' },
  { lContractScopeKey: 5,  lContractKey: 9200, lScopeKey: 1091, sSerialNumber: '1588-TX1',      sScopeTypeDesc: 'Karl Storz 11272BN',     sRigidOrFlexible: 'C', lDepartmentKey: 31, sDepartmentName: 'Surgery / OR', dtAdded: '2025-07-01' },

  // 9201 — Duke (depts 33, 34, 35, 36): scopes 1037, 1047, 1061, 1066, 1067, 1070
  { lContractScopeKey: 6,  lContractKey: 9201, lScopeKey: 1037, sSerialNumber: 'GIF-HQ4401',    sScopeTypeDesc: 'Olympus GIF-HQ190',      sRigidOrFlexible: 'F', lDepartmentKey: 33, sDepartmentName: 'GI Lab',       dtAdded: '2025-09-01' },
  { lContractScopeKey: 7,  lContractKey: 9201, lScopeKey: 1047, sSerialNumber: '2920455',       sScopeTypeDesc: 'Olympus CF-H185L',       sRigidOrFlexible: 'F', lDepartmentKey: 33, sDepartmentName: 'GI Lab',       dtAdded: '2025-09-01' },
  { lContractScopeKey: 8,  lContractKey: 9201, lScopeKey: 1061, sSerialNumber: 'TJF-Q180-DK1',  sScopeTypeDesc: 'Olympus TJF-Q180V',      sRigidOrFlexible: 'F', lDepartmentKey: 33, sDepartmentName: 'GI Lab',       dtAdded: '2025-09-01' },
  { lContractScopeKey: 9,  lContractKey: 9201, lScopeKey: 1066, sSerialNumber: '27005-DK1',     sScopeTypeDesc: 'Stryker 27005 Arthroscope', sRigidOrFlexible: 'R', lDepartmentKey: 35, sDepartmentName: 'Urology',    dtAdded: '2025-09-01' },
  { lContractScopeKey: 10, lContractKey: 9201, lScopeKey: 1067, sSerialNumber: '26003-DK1',     sScopeTypeDesc: 'Stryker 26003 Cystoscope',  sRigidOrFlexible: 'R', lDepartmentKey: 35, sDepartmentName: 'Urology',    dtAdded: '2025-09-01' },
  { lContractScopeKey: 11, lContractKey: 9201, lScopeKey: 1070, sSerialNumber: 'A5394-DK2',     sScopeTypeDesc: 'Stryker 5mm Arthroscope',   sRigidOrFlexible: 'R', lDepartmentKey: 34, sDepartmentName: 'Surgery / OR', dtAdded: '2025-09-01' },

  // 9202 — UPMC (depts 43, 44, 45, 46): scopes 1040, 1048, 1065, 1058, 1072
  { lContractScopeKey: 12, lContractKey: 9202, lScopeKey: 1040, sSerialNumber: '3809922',       sScopeTypeDesc: 'Olympus GIF-H180',       sRigidOrFlexible: 'F', lDepartmentKey: 43, sDepartmentName: 'Endoscopy',    dtAdded: '2025-10-01' },
  { lContractScopeKey: 13, lContractKey: 9202, lScopeKey: 1048, sSerialNumber: 'PCF-H190-55',   sScopeTypeDesc: 'Olympus PCF-H190DL',     sRigidOrFlexible: 'F', lDepartmentKey: 43, sDepartmentName: 'Endoscopy',    dtAdded: '2025-10-01' },
  { lContractScopeKey: 14, lContractKey: 9202, lScopeKey: 1065, sSerialNumber: 'TJF-Q180-PM1',  sScopeTypeDesc: 'Olympus TJF-Q180V',      sRigidOrFlexible: 'F', lDepartmentKey: 43, sDepartmentName: 'Endoscopy',    dtAdded: '2025-10-01' },
  { lContractScopeKey: 15, lContractKey: 9202, lScopeKey: 1058, sSerialNumber: 'BF-1TH190-22',  sScopeTypeDesc: 'Olympus BF-1TH190',      sRigidOrFlexible: 'F', lDepartmentKey: 44, sDepartmentName: 'Cardiology',   dtAdded: '2025-10-01' },
  { lContractScopeKey: 16, lContractKey: 9202, lScopeKey: 1072, sSerialNumber: '26003-PM1',     sScopeTypeDesc: 'Stryker 26003 Cystoscope', sRigidOrFlexible: 'R', lDepartmentKey: 45, sDepartmentName: 'Surgery / OR', dtAdded: '2025-10-01' },

  // 9203 — Johns Hopkins (depts 53, 54, 55, 56): scopes 1042, 1049, 1063, 1068, 1069
  { lContractScopeKey: 17, lContractKey: 9203, lScopeKey: 1042, sSerialNumber: 'GIF-HQ5518',    sScopeTypeDesc: 'Olympus GIF-HQ190',      sRigidOrFlexible: 'F', lDepartmentKey: 53, sDepartmentName: 'GI Lab',       dtAdded: '2025-06-01' },
  { lContractScopeKey: 18, lContractKey: 9203, lScopeKey: 1049, sSerialNumber: 'EC-760R-220',   sScopeTypeDesc: 'Fujifilm EC-760R',        sRigidOrFlexible: 'F', lDepartmentKey: 53, sDepartmentName: 'GI Lab',       dtAdded: '2025-06-01' },
  { lContractScopeKey: 19, lContractKey: 9203, lScopeKey: 1063, sSerialNumber: 'TJF-Q180-JH1',  sScopeTypeDesc: 'Olympus TJF-Q180V',      sRigidOrFlexible: 'F', lDepartmentKey: 53, sDepartmentName: 'GI Lab',       dtAdded: '2025-06-01' },
  { lContractScopeKey: 20, lContractKey: 9203, lScopeKey: 1068, sSerialNumber: 'URF-V2-JH1',    sScopeTypeDesc: 'Olympus URF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 56, sDepartmentName: 'Urology',      dtAdded: '2025-06-01' },
  { lContractScopeKey: 21, lContractKey: 9203, lScopeKey: 1069, sSerialNumber: 'CYF-V2-JH1',    sScopeTypeDesc: 'Olympus CYF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 56, sDepartmentName: 'Urology',      dtAdded: '2025-06-01' },

  // 9204 — NYU Langone (depts 57, 58, 59): scopes 1043, 1050, 1083, 1075
  { lContractScopeKey: 22, lContractKey: 9204, lScopeKey: 1043, sSerialNumber: '3811445',       sScopeTypeDesc: 'Olympus GIF-H190',       sRigidOrFlexible: 'F', lDepartmentKey: 57, sDepartmentName: 'Endoscopy',    dtAdded: '2025-11-01' },
  { lContractScopeKey: 23, lContractKey: 9204, lScopeKey: 1050, sSerialNumber: 'PCF-H190-77',   sScopeTypeDesc: 'Olympus PCF-H190',       sRigidOrFlexible: 'F', lDepartmentKey: 57, sDepartmentName: 'Endoscopy',    dtAdded: '2025-11-01' },
  { lContractScopeKey: 24, lContractKey: 9204, lScopeKey: 1083, sSerialNumber: 'URF-V2-NY1',    sScopeTypeDesc: 'Olympus URF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 57, sDepartmentName: 'Endoscopy',    dtAdded: '2025-11-01' },
  { lContractScopeKey: 25, lContractKey: 9204, lScopeKey: 1075, sSerialNumber: 'A5394-NY1',     sScopeTypeDesc: 'Stryker 5mm Arthroscope', sRigidOrFlexible: 'R', lDepartmentKey: 58, sDepartmentName: 'Surgery / OR', dtAdded: '2025-11-01' },

  // 9205 — Metro Health (depts 21, 22): scopes 1020, 1026, 1084
  { lContractScopeKey: 26, lContractKey: 9205, lScopeKey: 1020, sSerialNumber: '3615290',       sScopeTypeDesc: 'Olympus BF-UC180F',      sRigidOrFlexible: 'F', lDepartmentKey: 22, sDepartmentName: 'ICU / Critical Care', dtAdded: '2026-01-01' },
  { lContractScopeKey: 27, lContractKey: 9205, lScopeKey: 1026, sSerialNumber: '2210887',       sScopeTypeDesc: 'Fujifilm EC-760R',        sRigidOrFlexible: 'F', lDepartmentKey: 21, sDepartmentName: 'Endoscopy',    dtAdded: '2026-01-01' },
  { lContractScopeKey: 28, lContractKey: 9205, lScopeKey: 1084, sSerialNumber: 'CYF-V2-MO1',   sScopeTypeDesc: 'Olympus CYF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 21, sDepartmentName: 'Endoscopy',    dtAdded: '2026-01-01' },

  // 9206 — Barnes-Jewish (depts 60, 61, 62): scopes 1044, 1051, 1064, 1103
  { lContractScopeKey: 29, lContractKey: 9206, lScopeKey: 1044, sSerialNumber: '3812887',       sScopeTypeDesc: 'Olympus GIF-H180',       sRigidOrFlexible: 'F', lDepartmentKey: 60, sDepartmentName: 'GI Lab',       dtAdded: '2025-08-01' },
  { lContractScopeKey: 30, lContractKey: 9206, lScopeKey: 1051, sSerialNumber: 'CF-HQ8804',     sScopeTypeDesc: 'Olympus CF-HQ190L',      sRigidOrFlexible: 'F', lDepartmentKey: 60, sDepartmentName: 'GI Lab',       dtAdded: '2025-08-01' },
  { lContractScopeKey: 31, lContractKey: 9206, lScopeKey: 1064, sSerialNumber: 'FG-34W-BJ1',    sScopeTypeDesc: 'Pentax FG-34W',          sRigidOrFlexible: 'F', lDepartmentKey: 60, sDepartmentName: 'GI Lab',       dtAdded: '2025-08-01' },
  { lContractScopeKey: 32, lContractKey: 9206, lScopeKey: 1103, sSerialNumber: 'SD-230U-MO1',   sScopeTypeDesc: 'Olympus SD-230U',        sRigidOrFlexible: 'I', lDepartmentKey: 60, sDepartmentName: 'GI Lab',       dtAdded: '2025-08-01' },

  // 9207 — Hackensack (depts 40, 41, 42): scopes 1039, 1062, 1074, 1092
  { lContractScopeKey: 33, lContractKey: 9207, lScopeKey: 1039, sSerialNumber: 'GIF-Q1652',     sScopeTypeDesc: 'Olympus GIF-Q165',       sRigidOrFlexible: 'F', lDepartmentKey: 40, sDepartmentName: 'GI Lab',       dtAdded: '2024-10-01' },
  { lContractScopeKey: 34, lContractKey: 9207, lScopeKey: 1062, sSerialNumber: 'FG-34W-HK2',    sScopeTypeDesc: 'Pentax FG-34W',          sRigidOrFlexible: 'F', lDepartmentKey: 40, sDepartmentName: 'GI Lab',       dtAdded: '2024-10-01' },
  { lContractScopeKey: 35, lContractKey: 9207, lScopeKey: 1074, sSerialNumber: 'CYF-V2-HK1',    sScopeTypeDesc: 'Olympus CYF-V2',         sRigidOrFlexible: 'R', lDepartmentKey: 42, sDepartmentName: 'Surgery / OR', dtAdded: '2024-10-01' },
  { lContractScopeKey: 36, lContractKey: 9207, lScopeKey: 1092, sSerialNumber: 'OTV-SP1-HK1',   sScopeTypeDesc: 'Olympus OTV-SP1',        sRigidOrFlexible: 'C', lDepartmentKey: 42, sDepartmentName: 'Surgery / OR', dtAdded: '2024-10-01' },

  // 9208 — MUSC (depts 50, 51, 52): scopes 1041, 1057, 1082
  { lContractScopeKey: 37, lContractKey: 9208, lScopeKey: 1041, sSerialNumber: 'EG-760Z-101',   sScopeTypeDesc: 'Fujifilm EG-760Z',       sRigidOrFlexible: 'F', lDepartmentKey: 50, sDepartmentName: 'Endoscopy',    dtAdded: '2024-06-01' },
  { lContractScopeKey: 38, lContractKey: 9208, lScopeKey: 1057, sSerialNumber: 'BF-UC180F-09',  sScopeTypeDesc: 'Olympus BF-UC180F',      sRigidOrFlexible: 'F', lDepartmentKey: 51, sDepartmentName: 'Pulmonology',  dtAdded: '2024-06-01' },
  { lContractScopeKey: 39, lContractKey: 9208, lScopeKey: 1082, sSerialNumber: '26003-SC1',     sScopeTypeDesc: 'Stryker 26003 Cystoscope', sRigidOrFlexible: 'R', lDepartmentKey: 50, sDepartmentName: 'Endoscopy',  dtAdded: '2024-06-01' },

  // 9209 — Northside (depts 18, 19): scopes 1025, 1021, 1035
  { lContractScopeKey: 40, lContractKey: 9209, lScopeKey: 1025, sSerialNumber: '7820045',       sScopeTypeDesc: 'Pentax EB-1990i',        sRigidOrFlexible: 'F', lDepartmentKey: 18, sDepartmentName: 'Biomedical Engineering', dtAdded: '2024-11-01' },
  { lContractScopeKey: 41, lContractKey: 9209, lScopeKey: 1021, sSerialNumber: '4450188',       sScopeTypeDesc: 'Fujifilm EG-760Z',       sRigidOrFlexible: 'F', lDepartmentKey: 19, sDepartmentName: 'Surgery / OR', dtAdded: '2024-11-01' },
  { lContractScopeKey: 42, lContractKey: 9209, lScopeKey: 1035, sSerialNumber: '7715508',       sScopeTypeDesc: 'Stryker 27005 Arthroscope', sRigidOrFlexible: 'R', lDepartmentKey: 19, sDepartmentName: 'Surgery / OR', dtAdded: '2024-11-01' },

  // 9210 — Baptist Health (depts 63, 64, 65): scopes 1045, 1055, 1071, 1077
  { lContractScopeKey: 43, lContractKey: 9210, lScopeKey: 1045, sSerialNumber: 'GIF-Q1670',     sScopeTypeDesc: 'Olympus GIF-Q165',       sRigidOrFlexible: 'F', lDepartmentKey: 63, sDepartmentName: 'Endoscopy',    dtAdded: '2025-05-01' },
  { lContractScopeKey: 44, lContractKey: 9210, lScopeKey: 1055, sSerialNumber: 'PCF-H190-88',   sScopeTypeDesc: 'Olympus PCF-H190',       sRigidOrFlexible: 'F', lDepartmentKey: 63, sDepartmentName: 'Endoscopy',    dtAdded: '2025-05-01' },
  { lContractScopeKey: 45, lContractKey: 9210, lScopeKey: 1071, sSerialNumber: '27005-BH1',     sScopeTypeDesc: 'Stryker 27005 Arthroscope', sRigidOrFlexible: 'R', lDepartmentKey: 65, sDepartmentName: 'Urology',  dtAdded: '2025-05-01' },
  { lContractScopeKey: 46, lContractKey: 9210, lScopeKey: 1077, sSerialNumber: '26003-BH1',     sScopeTypeDesc: 'Stryker 26003 Cystoscope', sRigidOrFlexible: 'R', lDepartmentKey: 64, sDepartmentName: 'Surgery / OR', dtAdded: '2025-05-01' },

  // 9211 — Inova (depts 37, 38, 39): scopes 1038, 1054, 1081
  { lContractScopeKey: 47, lContractKey: 9211, lScopeKey: 1038, sSerialNumber: '3805567',       sScopeTypeDesc: 'Olympus GIF-H190',       sRigidOrFlexible: 'F', lDepartmentKey: 37, sDepartmentName: 'Endoscopy',    dtAdded: '2025-05-15' },
  { lContractScopeKey: 48, lContractKey: 9211, lScopeKey: 1054, sSerialNumber: 'PCF-DL-415',    sScopeTypeDesc: 'Olympus PCF-H190DL',     sRigidOrFlexible: 'F', lDepartmentKey: 37, sDepartmentName: 'Endoscopy',    dtAdded: '2025-05-15' },
  { lContractScopeKey: 49, lContractKey: 9211, lScopeKey: 1081, sSerialNumber: '27005-VA1',     sScopeTypeDesc: 'Stryker 27005 Arthroscope', sRigidOrFlexible: 'R', lDepartmentKey: 38, sDepartmentName: 'ICU / Critical Care', dtAdded: '2025-05-15' },

  // 9212 — Merit Health (depts 66, 67, 68): scopes 1052, 1060, 1078
  { lContractScopeKey: 50, lContractKey: 9212, lScopeKey: 1052, sSerialNumber: '2925501',       sScopeTypeDesc: 'Olympus CF-H185L',       sRigidOrFlexible: 'F', lDepartmentKey: 66, sDepartmentName: 'GI Lab',       dtAdded: '2026-04-01' },
]);


// ── ContractInvoices (+25, keys 1-25) ───────────────────
// Quarterly/monthly invoices for active contracts. Mix paid/unpaid/overdue.
MockDB.seed('contractInvoices', [
  // 9200 — Baylor, Monthly $8,000 (active Jul 2025-Jun 2026)
  { lContractInvoiceKey: 1,  lContractKey: 9200, sInvoiceNumber: 'CI-2025-4101', dblAmount: 8000.00, dtInvoiceDate: '2025-10-01', dtDueDate: '2025-10-31', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 2,  lContractKey: 9200, sInvoiceNumber: 'CI-2025-4102', dblAmount: 8000.00, dtInvoiceDate: '2025-11-01', dtDueDate: '2025-12-01', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 3,  lContractKey: 9200, sInvoiceNumber: 'CI-2025-4103', dblAmount: 8000.00, dtInvoiceDate: '2025-12-01', dtDueDate: '2025-12-31', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 4,  lContractKey: 9200, sInvoiceNumber: 'CI-2026-4104', dblAmount: 8000.00, dtInvoiceDate: '2026-01-01', dtDueDate: '2026-01-31', sStatus: 'Paid', sPaymentMethod: 'Wire' },
  { lContractInvoiceKey: 5,  lContractKey: 9200, sInvoiceNumber: 'CI-2026-4105', dblAmount: 8000.00, dtInvoiceDate: '2026-02-01', dtDueDate: '2026-03-03', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 6,  lContractKey: 9200, sInvoiceNumber: 'CI-2026-4106', dblAmount: 8000.00, dtInvoiceDate: '2026-03-01', dtDueDate: '2026-03-31', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9201 — Duke, Quarterly $30,000 (active Sep 2025-Aug 2026)
  { lContractInvoiceKey: 7,  lContractKey: 9201, sInvoiceNumber: 'CI-2025-4211', dblAmount: 30000.00, dtInvoiceDate: '2025-09-01', dtDueDate: '2025-10-31', sStatus: 'Paid', sPaymentMethod: 'Wire' },
  { lContractInvoiceKey: 8,  lContractKey: 9201, sInvoiceNumber: 'CI-2025-4212', dblAmount: 30000.00, dtInvoiceDate: '2025-12-01', dtDueDate: '2026-01-30', sStatus: 'Paid', sPaymentMethod: 'Wire' },
  { lContractInvoiceKey: 9,  lContractKey: 9201, sInvoiceNumber: 'CI-2026-4213', dblAmount: 30000.00, dtInvoiceDate: '2026-03-01', dtDueDate: '2026-04-30', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9202 — UPMC, Monthly $7,000 (active Oct 2025-Sep 2026)
  { lContractInvoiceKey: 10, lContractKey: 9202, sInvoiceNumber: 'CI-2026-4301', dblAmount: 7000.00, dtInvoiceDate: '2026-01-01', dtDueDate: '2026-01-31', sStatus: 'Paid', sPaymentMethod: 'Check' },
  { lContractInvoiceKey: 11, lContractKey: 9202, sInvoiceNumber: 'CI-2026-4302', dblAmount: 7000.00, dtInvoiceDate: '2026-02-01', dtDueDate: '2026-03-03', sStatus: 'Paid', sPaymentMethod: 'Check' },
  { lContractInvoiceKey: 12, lContractKey: 9202, sInvoiceNumber: 'CI-2026-4303', dblAmount: 7000.00, dtInvoiceDate: '2026-03-01', dtDueDate: '2026-03-31', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9203 — Johns Hopkins, Quarterly $27,000 (active Jun 2025-May 2026)
  { lContractInvoiceKey: 13, lContractKey: 9203, sInvoiceNumber: 'CI-2025-4411', dblAmount: 27000.00, dtInvoiceDate: '2025-09-01', dtDueDate: '2025-10-01', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 14, lContractKey: 9203, sInvoiceNumber: 'CI-2025-4412', dblAmount: 27000.00, dtInvoiceDate: '2025-12-01', dtDueDate: '2026-01-01', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 15, lContractKey: 9203, sInvoiceNumber: 'CI-2026-4413', dblAmount: 27000.00, dtInvoiceDate: '2026-03-01', dtDueDate: '2026-03-31', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9205 — Metro Health, Monthly $3,000 (active Jan 2026-Dec 2026, Due Upon Receipt)
  { lContractInvoiceKey: 16, lContractKey: 9205, sInvoiceNumber: 'CI-2026-0016', dblAmount: 3000.00, dtInvoiceDate: '2026-01-01', dtDueDate: '2026-01-01', sStatus: 'Overdue', sPaymentMethod: '' },
  { lContractInvoiceKey: 17, lContractKey: 9205, sInvoiceNumber: 'CI-2026-0017', dblAmount: 3000.00, dtInvoiceDate: '2026-02-01', dtDueDate: '2026-02-01', sStatus: 'Overdue', sPaymentMethod: '' },
  { lContractInvoiceKey: 18, lContractKey: 9205, sInvoiceNumber: 'CI-2026-0018', dblAmount: 3000.00, dtInvoiceDate: '2026-03-01', dtDueDate: '2026-03-01', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9206 — Barnes-Jewish, Quarterly $15,000 (active Aug 2025-Jul 2026)
  { lContractInvoiceKey: 19, lContractKey: 9206, sInvoiceNumber: 'CI-2025-4631', dblAmount: 15000.00, dtInvoiceDate: '2025-11-01', dtDueDate: '2025-12-31', sStatus: 'Paid', sPaymentMethod: 'Wire' },
  { lContractInvoiceKey: 20, lContractKey: 9206, sInvoiceNumber: 'CI-2026-4632', dblAmount: 15000.00, dtInvoiceDate: '2026-02-01', dtDueDate: '2026-03-31', sStatus: 'Unpaid', sPaymentMethod: '' },

  // 9210 — Baptist Health (Expiring), Quarterly $7,500
  { lContractInvoiceKey: 21, lContractKey: 9210, sInvoiceNumber: 'CI-2025-4051', dblAmount: 7500.00, dtInvoiceDate: '2025-11-01', dtDueDate: '2025-11-30', sStatus: 'Paid', sPaymentMethod: 'ACH' },
  { lContractInvoiceKey: 22, lContractKey: 9210, sInvoiceNumber: 'CI-2026-4052', dblAmount: 7500.00, dtInvoiceDate: '2026-02-01', dtDueDate: '2026-03-03', sStatus: 'Paid', sPaymentMethod: 'ACH' },

  // 9211 — Inova (Expiring), Monthly $6,000
  { lContractInvoiceKey: 23, lContractKey: 9211, sInvoiceNumber: 'CI-2026-4081', dblAmount: 6000.00, dtInvoiceDate: '2026-01-15', dtDueDate: '2026-02-14', sStatus: 'Paid', sPaymentMethod: 'Check' },
  { lContractInvoiceKey: 24, lContractKey: 9211, sInvoiceNumber: 'CI-2026-4082', dblAmount: 6000.00, dtInvoiceDate: '2026-02-15', dtDueDate: '2026-03-17', sStatus: 'Overdue', sPaymentMethod: '' },
  { lContractInvoiceKey: 25, lContractKey: 9211, sInvoiceNumber: 'CI-2026-4083', dblAmount: 6000.00, dtInvoiceDate: '2026-03-15', dtDueDate: '2026-04-14', sStatus: 'Unpaid', sPaymentMethod: '' },
]);


// ── PendingContracts (+5, keys 4-8) ─────────────────────
MockDB.seed('pendingContracts', [
  { lPendingContractKey: 4, sContractType: 'CPO',              sContractName1: 'Pending - Tampa MIS Endoscopy',
    sClientName1: 'Tampa MIS Institute',  sSalesRepName: 'Joseph Brassell', dtCreated: '2026-03-10T00:00:00', sContractStatus: 'Draft' },
  { lPendingContractKey: 5, sContractType: 'Shared Risk',      sContractName1: 'Pending - Shreveport Flex Service',
    sClientName1: 'Shreveport Surgery Center', sSalesRepName: 'Brandi Cook', dtCreated: '2026-03-05T00:00:00', sContractStatus: 'Review' },
  { lPendingContractKey: 6, sContractType: 'Fuse',             sContractName1: 'Pending - Nashville Gen Comprehensive',
    sClientName1: 'Nashville General Hospital', sSalesRepName: 'R. Thompson', dtCreated: '2026-02-28T00:00:00', sContractStatus: 'Negotiation' },
  { lPendingContractKey: 7, sContractType: 'Capitated Service', sContractName1: 'Pending - West Side GI PM',
    sClientName1: 'West Side GI Center',  sSalesRepName: 'Tom Velez',       dtCreated: '2026-03-12T00:00:00', sContractStatus: 'Draft' },
  { lPendingContractKey: 8, sContractType: 'CPO',              sContractName1: 'Pending - 88th Medical Renewal',
    sClientName1: '88th Medical Group',   sSalesRepName: 'J. Miller',       dtCreated: '2026-03-01T00:00:00', sContractStatus: 'Review' },
]);


console.log('[MockDB] WP-3 contracts seeded: +13 contracts, +35 contract-depts, +50 contract-scopes, +25 invoices, +5 pending');
// ═══════════════════════════════════════════════════════
//  WP-4: Expanded Financial Data
//  Append these MockDB.seed() calls to mock-db.js
// ═══════════════════════════════════════════════════════

// ── GL Accounts (18 rows, keys 1-18) ───────────────────
// Replaces the sparse 5-row seed with a full chart of accounts
MockDB.seed('glAccounts', [
  { lGLAccountKey: 1,  sAccountNumber: '1000-00', sAccountName: 'Cash',                    sAccountType: 'Asset',     bActive: true },
  { lGLAccountKey: 2,  sAccountNumber: '1100-00', sAccountName: 'Accounts Receivable',     sAccountType: 'Asset',     bActive: true },
  { lGLAccountKey: 3,  sAccountNumber: '1200-00', sAccountName: 'Inventory Asset',         sAccountType: 'Asset',     bActive: true },
  { lGLAccountKey: 4,  sAccountNumber: '1500-00', sAccountName: 'Fixed Assets',            sAccountType: 'Asset',     bActive: true },
  { lGLAccountKey: 5,  sAccountNumber: '2000-00', sAccountName: 'Accounts Payable',        sAccountType: 'Liability', bActive: true },
  { lGLAccountKey: 6,  sAccountNumber: '2100-00', sAccountName: 'Accrued Liabilities',     sAccountType: 'Liability', bActive: true },
  { lGLAccountKey: 7,  sAccountNumber: '4000-00', sAccountName: 'Repair Revenue',          sAccountType: 'Revenue',   bActive: true },
  { lGLAccountKey: 8,  sAccountNumber: '4100-00', sAccountName: 'Product Sale Revenue',    sAccountType: 'Revenue',   bActive: true },
  { lGLAccountKey: 9,  sAccountNumber: '4200-00', sAccountName: 'Contract Revenue',        sAccountType: 'Revenue',   bActive: true },
  { lGLAccountKey: 10, sAccountNumber: '4300-00', sAccountName: 'Shipping Revenue',        sAccountType: 'Revenue',   bActive: true },
  { lGLAccountKey: 11, sAccountNumber: '5000-00', sAccountName: 'Parts / COGS',            sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 12, sAccountNumber: '5100-00', sAccountName: 'Labor',                   sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 13, sAccountNumber: '5200-00', sAccountName: 'Shipping Expense',        sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 14, sAccountNumber: '5300-00', sAccountName: 'Outsource Repair',        sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 15, sAccountNumber: '5400-00', sAccountName: 'Commission Expense',      sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 16, sAccountNumber: '5500-00', sAccountName: 'GPO Fees',                sAccountType: 'Expense',   bActive: true },
  { lGLAccountKey: 17, sAccountNumber: '6000-00', sAccountName: 'General & Administrative', sAccountType: 'Expense',  bActive: true },
  { lGLAccountKey: 18, sAccountNumber: '6100-00', sAccountName: 'Depreciation',            sAccountType: 'Expense',   bActive: true },
]);

// ── Invoices (+23, keys 8-30) ───────────────────────────
// Existing: keys 1-7 are lInvoiceKey 198-284 in mock-db.js
// Date range: Oct 2025 – Mar 2026. Status mix: 8 Paid, 6 Unpaid, 4 Partial, 4 Overdue, 1 Void
MockDB.seed('invoices', [
  // --- Paid (8) ---
  { lInvoiceKey: 8,  sInvoiceNumber: 'INV-2025-0142', lClientKey: 917,  sClientName1: 'Northside Hospital',           lRepairKey: 6605, sWorkOrderNumber: 'NR26006605', dblAmount: 3250.00, dblAmountPaid: 3250.00, dblBalance: 0,       dtIssuedDate: '2025-10-12', dtDueDate: '2025-11-11', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 9,  sInvoiceNumber: 'INV-2025-0158', lClientKey: 2755, sClientName1: 'Metro Health Hospital',        lRepairKey: 6612, sWorkOrderNumber: 'NR26006612', dblAmount: 1840.00, dblAmountPaid: 1840.00, dblBalance: 0,       dtIssuedDate: '2025-10-28', dtDueDate: '2025-11-27', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 10, sInvoiceNumber: 'INV-2025-0171', lClientKey: 4002, sClientName1: 'Baylor Scott & White',         lRepairKey: 6618, sWorkOrderNumber: 'NR26006618', dblAmount: 5420.00, dblAmountPaid: 5420.00, dblBalance: 0,       dtIssuedDate: '2025-11-05', dtDueDate: '2025-12-05', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 11, sInvoiceNumber: 'INV-2025-0189', lClientKey: 4003, sClientName1: 'Duke University Hospital',     lRepairKey: 0,    sWorkOrderNumber: '',            dblAmount: 2100.00, dblAmountPaid: 2100.00, dblBalance: 0,       dtIssuedDate: '2025-11-18', dtDueDate: '2025-12-18', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: 'Product sale' },
  { lInvoiceKey: 12, sInvoiceNumber: 'INV-2025-0203', lClientKey: 4008, sClientName1: 'MUSC Health',                  lRepairKey: 6624, sWorkOrderNumber: 'SR26006644', dblAmount: 4780.00, dblAmountPaid: 4780.00, dblBalance: 0,       dtIssuedDate: '2025-12-02', dtDueDate: '2026-01-01', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 13, sInvoiceNumber: 'INV-2025-0218', lClientKey: 4009, sClientName1: 'Johns Hopkins Hospital',       lRepairKey: 6628, sWorkOrderNumber: 'NR26006628', dblAmount: 8500.00, dblAmountPaid: 8500.00, dblBalance: 0,       dtIssuedDate: '2025-12-15', dtDueDate: '2026-01-14', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 14, sInvoiceNumber: 'INV-2026-0005', lClientKey: 4010, sClientName1: 'NYU Langone Health',           lRepairKey: 0,    sWorkOrderNumber: '',            dblAmount: 1290.00, dblAmountPaid: 1290.00, dblBalance: 0,       dtIssuedDate: '2026-01-03', dtDueDate: '2026-02-02', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: 'Contract billing' },
  { lInvoiceKey: 15, sInvoiceNumber: 'INV-2026-0038', lClientKey: 4012, sClientName1: 'Baptist Health',               lRepairKey: 6633, sWorkOrderNumber: 'NR26006633', dblAmount: 2950.00, dblAmountPaid: 2950.00, dblBalance: 0,       dtIssuedDate: '2026-01-20', dtDueDate: '2026-02-19', sStatus: 'Paid',    sPaymentTerms: 'Net 30', sNotes: '' },

  // --- Unpaid (6) ---
  { lInvoiceKey: 16, sInvoiceNumber: 'INV-2026-0295', lClientKey: 4004, sClientName1: 'Inova Health System',          lRepairKey: 6638, sWorkOrderNumber: 'NR26006638', dblAmount: 3680.00, dblAmountPaid: 0,       dblBalance: 3680.00, dtIssuedDate: '2026-03-01', dtDueDate: '2026-03-31', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 17, sInvoiceNumber: 'INV-2026-0298', lClientKey: 4005, sClientName1: 'Hackensack Meridian Health',   lRepairKey: 6640, sWorkOrderNumber: 'NR26006640', dblAmount: 5100.00, dblAmountPaid: 0,       dblBalance: 5100.00, dtIssuedDate: '2026-03-04', dtDueDate: '2026-04-03', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 18, sInvoiceNumber: 'INV-2026-0302', lClientKey: 4006, sClientName1: 'UPMC',                         lRepairKey: 0,    sWorkOrderNumber: '',            dblAmount: 2250.00, dblAmountPaid: 0,       dblBalance: 2250.00, dtIssuedDate: '2026-03-07', dtDueDate: '2026-04-06', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: 'Quarterly contract' },
  { lInvoiceKey: 19, sInvoiceNumber: 'INV-2026-0308', lClientKey: 4013, sClientName1: 'Merit Health',                 lRepairKey: 6645, sWorkOrderNumber: 'SR26006645', dblAmount: 1575.00, dblAmountPaid: 0,       dblBalance: 1575.00, dtIssuedDate: '2026-03-10', dtDueDate: '2026-04-09', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 20, sInvoiceNumber: 'INV-2026-0312', lClientKey: 4011, sClientName1: 'Barnes-Jewish Hospital',       lRepairKey: 6648, sWorkOrderNumber: 'NR26006648', dblAmount: 6200.00, dblAmountPaid: 0,       dblBalance: 6200.00, dtIssuedDate: '2026-03-12', dtDueDate: '2026-04-11', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 21, sInvoiceNumber: 'INV-2026-0315', lClientKey: 3502, sClientName1: '88th Medical Group',           lRepairKey: 6650, sWorkOrderNumber: 'NR26006650', dblAmount: 4350.00, dblAmountPaid: 0,       dblBalance: 4350.00, dtIssuedDate: '2026-03-14', dtDueDate: '2026-04-13', sStatus: 'Unpaid',  sPaymentTerms: 'Net 30', sNotes: '' },

  // --- Partial (4) ---
  { lInvoiceKey: 22, sInvoiceNumber: 'INV-2026-0052', lClientKey: 3089, sClientName1: 'Tampa MIS',                    lRepairKey: 6615, sWorkOrderNumber: 'NR26006615', dblAmount: 4200.00, dblAmountPaid: 2000.00, dblBalance: 2200.00, dtIssuedDate: '2026-01-25', dtDueDate: '2026-02-24', sStatus: 'Partial', sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 23, sInvoiceNumber: 'INV-2026-0088', lClientKey: 1084, sClientName1: 'Tift Regional Medical Center', lRepairKey: 6620, sWorkOrderNumber: 'NR26006620', dblAmount: 7350.00, dblAmountPaid: 4000.00, dblBalance: 3350.00, dtIssuedDate: '2026-02-03', dtDueDate: '2026-03-05', sStatus: 'Partial', sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 24, sInvoiceNumber: 'INV-2026-0120', lClientKey: 4009, sClientName1: 'Johns Hopkins Hospital',       lRepairKey: 6630, sWorkOrderNumber: 'NR26006630', dblAmount: 5800.00, dblAmountPaid: 3000.00, dblBalance: 2800.00, dtIssuedDate: '2026-02-10', dtDueDate: '2026-03-12', sStatus: 'Partial', sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 25, sInvoiceNumber: 'INV-2026-0155', lClientKey: 2210, sClientName1: 'Nashville General Hospital',   lRepairKey: 6635, sWorkOrderNumber: 'SR26006649', dblAmount: 3100.00, dblAmountPaid: 1500.00, dblBalance: 1600.00, dtIssuedDate: '2026-02-18', dtDueDate: '2026-03-20', sStatus: 'Partial', sPaymentTerms: 'Net 30', sNotes: '' },

  // --- Overdue (4) ---
  { lInvoiceKey: 26, sInvoiceNumber: 'INV-2025-0195', lClientKey: 1650, sClientName1: 'Shreveport Endoscopy Center',  lRepairKey: 6608, sWorkOrderNumber: 'SR26006641', dblAmount: 2880.00, dblAmountPaid: 0,       dblBalance: 2880.00, dtIssuedDate: '2025-11-28', dtDueDate: '2025-12-28', sStatus: 'Overdue', sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 27, sInvoiceNumber: 'INV-2025-0210', lClientKey: 3341, sClientName1: 'West Side GI Center',          lRepairKey: 6610, sWorkOrderNumber: 'NR26006610', dblAmount: 4150.00, dblAmountPaid: 0,       dblBalance: 4150.00, dtIssuedDate: '2025-12-08', dtDueDate: '2026-01-07', sStatus: 'Overdue', sPaymentTerms: 'Net 30', sNotes: '' },
  { lInvoiceKey: 28, sInvoiceNumber: 'INV-2026-0015', lClientKey: 4007, sClientName1: 'Beaumont Health',              lRepairKey: 6622, sWorkOrderNumber: 'NR26006622', dblAmount: 3400.00, dblAmountPaid: 0,       dblBalance: 3400.00, dtIssuedDate: '2026-01-08', dtDueDate: '2026-02-07', sStatus: 'Overdue', sPaymentTerms: 'Net 30', sNotes: 'Client inactive — escalated to collections' },
  { lInvoiceKey: 29, sInvoiceNumber: 'INV-2026-0070', lClientKey: 3089, sClientName1: 'Tampa MIS',                    lRepairKey: 6617, sWorkOrderNumber: 'NR26006617', dblAmount: 1950.00, dblAmountPaid: 0,       dblBalance: 1950.00, dtIssuedDate: '2026-01-30', dtDueDate: '2026-03-01', sStatus: 'Overdue', sPaymentTerms: 'Net 30', sNotes: '' },

  // --- Void (1) ---
  { lInvoiceKey: 30, sInvoiceNumber: 'INV-2025-0176', lClientKey: 4003, sClientName1: 'Duke University Hospital',     lRepairKey: 6619, sWorkOrderNumber: 'NR26006619', dblAmount: 800.00,  dblAmountPaid: 0,       dblBalance: 0,       dtIssuedDate: '2025-11-10', dtDueDate: '2025-12-10', sStatus: 'Void',    sPaymentTerms: 'Net 30', sNotes: 'Voided — duplicate of INV-2025-0171' },
]);

// ── Draft Invoices (+6, keys 3-8) ──────────────────────
MockDB.seed('draftInvoices', [
  { lInvoiceKey: 3, sInvoiceNumber: 'DRAFT-2026-0051', lClientKey: 4004, sClientName1: 'Inova Health System',        lRepairKey: 6651, sWorkOrderNumber: 'NR26006651', dblAmount: 2780.00, dtCreatedDate: '2026-03-08', sStatus: 'Draft', sNotes: '' },
  { lInvoiceKey: 4, sInvoiceNumber: 'DRAFT-2026-0052', lClientKey: 917,  sClientName1: 'Northside Hospital',         lRepairKey: 6652, sWorkOrderNumber: 'NR26006652', dblAmount: 4100.00, dtCreatedDate: '2026-03-10', sStatus: 'Draft', sNotes: '' },
  { lInvoiceKey: 5, sInvoiceNumber: 'DRAFT-2026-0053', lClientKey: 4006, sClientName1: 'UPMC',                       lRepairKey: 6653, sWorkOrderNumber: 'NR26006653', dblAmount: 1950.00, dtCreatedDate: '2026-03-12', sStatus: 'Draft', sNotes: '' },
  { lInvoiceKey: 6, sInvoiceNumber: 'DRAFT-2026-0054', lClientKey: 4010, sClientName1: 'NYU Langone Health',         lRepairKey: 6654, sWorkOrderNumber: 'NR26006654', dblAmount: 5600.00, dtCreatedDate: '2026-03-13', sStatus: 'Draft', sNotes: '' },
  { lInvoiceKey: 7, sInvoiceNumber: 'DRAFT-2026-0055', lClientKey: 4012, sClientName1: 'Baptist Health',             lRepairKey: 6655, sWorkOrderNumber: 'NR26006655', dblAmount: 3350.00, dtCreatedDate: '2026-03-15', sStatus: 'Draft', sNotes: '' },
  { lInvoiceKey: 8, sInvoiceNumber: 'DRAFT-2026-0056', lClientKey: 2755, sClientName1: 'Metro Health Hospital',      lRepairKey: 6642, sWorkOrderNumber: 'SR26006642', dblAmount: 2200.00, dtCreatedDate: '2026-03-16', sStatus: 'Draft', sNotes: '' },
]);

// ── Invoice Payments (+15, keys 4-18) ──────────────────
MockDB.seed('invoicePayments', [
  // Full payments for Paid invoices (keys 8-15)
  { lInvoicePaymentID: 4,  lInvoiceKey: 8,  sInvoiceNumber: 'INV-2025-0142', lClientKey: 917,  sClientName1: 'Northside Hospital',           dblAmount: 3250.00, dtPaymentDate: '2025-11-08', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-80412', sNotes: '' },
  { lInvoicePaymentID: 5,  lInvoiceKey: 9,  sInvoiceNumber: 'INV-2025-0158', lClientKey: 2755, sClientName1: 'Metro Health Hospital',        dblAmount: 1840.00, dtPaymentDate: '2025-11-22', sPaymentMethod: 'Check',       sCheckNumber: '8842', sReferenceNumber: 'REF-80519', sNotes: '' },
  { lInvoicePaymentID: 6,  lInvoiceKey: 10, sInvoiceNumber: 'INV-2025-0171', lClientKey: 4002, sClientName1: 'Baylor Scott & White',         dblAmount: 5420.00, dtPaymentDate: '2025-12-01', sPaymentMethod: 'Wire',        sCheckNumber: '',     sReferenceNumber: 'REF-80623', sNotes: '' },
  { lInvoicePaymentID: 7,  lInvoiceKey: 11, sInvoiceNumber: 'INV-2025-0189', lClientKey: 4003, sClientName1: 'Duke University Hospital',     dblAmount: 2100.00, dtPaymentDate: '2025-12-12', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-80735', sNotes: '' },
  { lInvoicePaymentID: 8,  lInvoiceKey: 12, sInvoiceNumber: 'INV-2025-0203', lClientKey: 4008, sClientName1: 'MUSC Health',                  dblAmount: 4780.00, dtPaymentDate: '2025-12-30', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-80841', sNotes: '' },
  { lInvoicePaymentID: 9,  lInvoiceKey: 13, sInvoiceNumber: 'INV-2025-0218', lClientKey: 4009, sClientName1: 'Johns Hopkins Hospital',       dblAmount: 8500.00, dtPaymentDate: '2026-01-10', sPaymentMethod: 'Wire',        sCheckNumber: '',     sReferenceNumber: 'REF-80953', sNotes: '' },
  { lInvoicePaymentID: 10, lInvoiceKey: 14, sInvoiceNumber: 'INV-2026-0005', lClientKey: 4010, sClientName1: 'NYU Langone Health',           dblAmount: 1290.00, dtPaymentDate: '2026-01-28', sPaymentMethod: 'Credit Card', sCheckNumber: '',     sReferenceNumber: 'REF-81064', sNotes: '' },
  { lInvoicePaymentID: 11, lInvoiceKey: 15, sInvoiceNumber: 'INV-2026-0038', lClientKey: 4012, sClientName1: 'Baptist Health',               dblAmount: 2950.00, dtPaymentDate: '2026-02-14', sPaymentMethod: 'Check',       sCheckNumber: '9117', sReferenceNumber: 'REF-81172', sNotes: '' },

  // Partial payments (sum < invoice total)
  { lInvoicePaymentID: 12, lInvoiceKey: 22, sInvoiceNumber: 'INV-2026-0052', lClientKey: 3089, sClientName1: 'Tampa MIS',                    dblAmount: 2000.00, dtPaymentDate: '2026-02-20', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-81280', sNotes: '' },
  { lInvoicePaymentID: 13, lInvoiceKey: 23, sInvoiceNumber: 'INV-2026-0088', lClientKey: 1084, sClientName1: 'Tift Regional Medical Center', dblAmount: 4000.00, dtPaymentDate: '2026-02-28', sPaymentMethod: 'Check',       sCheckNumber: '9203', sReferenceNumber: 'REF-81395', sNotes: '' },
  { lInvoicePaymentID: 14, lInvoiceKey: 24, sInvoiceNumber: 'INV-2026-0120', lClientKey: 4009, sClientName1: 'Johns Hopkins Hospital',       dblAmount: 3000.00, dtPaymentDate: '2026-03-05', sPaymentMethod: 'Wire',        sCheckNumber: '',     sReferenceNumber: 'REF-81508', sNotes: '' },
  { lInvoicePaymentID: 15, lInvoiceKey: 25, sInvoiceNumber: 'INV-2026-0155', lClientKey: 2210, sClientName1: 'Nashville General Hospital',   dblAmount: 1500.00, dtPaymentDate: '2026-03-10', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-81614', sNotes: '' },

  // Payments against existing invoices (mock-db.js keys 198-284)
  { lInvoicePaymentID: 16, lInvoiceKey: 229, sInvoiceNumber: 'INV-2026-0229', lClientKey: 917,  sClientName1: 'Northside Hospital',          dblAmount: 4480.00, dtPaymentDate: '2026-02-18', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-81720', sNotes: '' },
  { lInvoicePaymentID: 17, lInvoiceKey: 215, sInvoiceNumber: 'INV-2026-0215', lClientKey: 2755, sClientName1: 'Metro Health Hospital',       dblAmount: 2100.00, dtPaymentDate: '2026-02-10', sPaymentMethod: 'Check',       sCheckNumber: '9055', sReferenceNumber: 'REF-81833', sNotes: '' },
  { lInvoicePaymentID: 18, lInvoiceKey: 258, sInvoiceNumber: 'INV-2026-0258', lClientKey: 2210, sClientName1: 'Nashville General Hospital',  dblAmount: 2000.00, dtPaymentDate: '2026-03-01', sPaymentMethod: 'ACH',         sCheckNumber: '',     sReferenceNumber: 'REF-81941', sNotes: 'Partial — $1,650 balance remaining' },
]);

// ── Clients On Hold (+3, keys 3-5) ─────────────────────
MockDB.seed('clientsOnHold', [
  { lClientKey: 4007, sClientName1: 'Beaumont Health',              sDepartmentName: 'All Departments', dtOnHoldDate: '2026-02-20', sReason: 'Past due balance exceeds credit limit',    sHoldType: 'Credit' },
  { lClientKey: 3089, sClientName1: 'Tampa MIS',                    sDepartmentName: 'Endoscopy',       dtOnHoldDate: '2026-03-05', sReason: 'Payment dispute on INV-2026-0070',         sHoldType: 'Dispute' },
  { lClientKey: 1084, sClientName1: 'Tift Regional Medical Center', sDepartmentName: 'GI Lab',          dtOnHoldDate: '2026-03-12', sReason: 'Credit review pending — balance over $3k', sHoldType: 'Billing' },
]);

console.log('[MockDB] WP-4 financials seeded: 18 GL accounts, 23 invoices, 6 drafts, 15 payments, 3 holds');
