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

// Phase 2 seed data will go here
// Phase 3 seed data will go here
