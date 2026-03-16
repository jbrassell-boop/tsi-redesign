// ═══════════════════════════════════════════════════════
//  TSI Mock API Router
//  Intercepts API calls and returns mock responses
//  from MockDB instead of hitting the network.
// ═══════════════════════════════════════════════════════

const MockAPI = (() => {
  'use strict';

  // ── Response envelope (matches BrightLogix format) ────
  // API wraps everything in: { responseData: "JSON string", isEnType: false }
  // Inside responseData: { statusCode: 200, data: <payload>, message: "" }
  //
  // But api.js unwraps this automatically, so our intercept
  // happens AFTER unwrapping. We just need to return what
  // request() would return: the `data` field contents.
  //
  // For paginated POST endpoints that return { dataSource: [...], totalRecord: N },
  // api.js also unwraps that to just the array.

  function success(data) {
    return data;
  }

  function error(message) {
    throw new Error(message || 'Mock API error');
  }

  // ── Query string parser ───────────────────────────────
  function parseQuery(url) {
    const params = {};
    const qIdx = url.indexOf('?');
    if (qIdx === -1) return params;
    const qs = url.substring(qIdx + 1);
    qs.split('&').forEach(pair => {
      const [k, v] = pair.split('=');
      params[decodeURIComponent(k)] = decodeURIComponent(v || '');
    });
    return params;
  }

  // ── Route matching ────────────────────────────────────
  // Routes are registered as { method, pattern, handler }
  // Pattern is a string like '/Client/GetAllClientList'
  // Handler receives (params, body) and returns data
  const _routes = [];

  function route(method, pattern, handler) {
    _routes.push({ method, pattern: pattern.toLowerCase(), handler });
  }

  // Match an incoming request to a route
  function match(method, endpoint) {
    const path = endpoint.split('?')[0].toLowerCase();
    return _routes.find(r =>
      r.method === method && r.pattern === path
    );
  }

  // ── Main intercept function ───────────────────────────
  // Called by api.js instead of fetch() when mock mode is active.
  // Returns the unwrapped data (what request() normally returns).
  async function handleRequest(method, endpoint, body) {
    const route = match(method, endpoint);
    if (!route) {
      console.warn('[MockAPI] No route for', method, endpoint, '— returning empty');
      return method === 'DELETE' ? true : [];
    }
    const params = parseQuery(endpoint);
    try {
      const result = route.handler(params, body);
      console.log('[MockAPI]', method, endpoint.split('?')[0], '→', Array.isArray(result) ? result.length + ' rows' : typeof result);
      return result;
    } catch (e) {
      console.error('[MockAPI] Error in', method, endpoint, ':', e.message);
      throw e;
    }
  }

  // ═══════════════════════════════════════════════════════
  //  ROUTE DEFINITIONS — Added in Phase 4
  //  Organized by controller, matching api.js structure
  // ═══════════════════════════════════════════════════════

  // ── Helper: parse int from query param ────────────────
  function int(v) { return parseInt(v) || 0; }
  function bool(v) { return v === 'true' || v === 'True' || v === true; }

  // ── Authentication (1) ────────────────────────────────
  route('POST', '/Authentication/UserLogin', (p, body) => {
    // Return a mock login response
    return {
      statusCode: 200,
      data: {
        isAuthenticated: true,
        token: 'mock-token-' + Date.now(),
        user: MockDB.getByKey('users', 2)
      }
    };
  });

  // ── Dashboard (1) ─────────────────────────────────────
  route('POST', '/Dashboard/GetDashboardScopeDataList', (p, body) => {
    let repairs = MockDB.getAll('repairs');
    // Filter by service location
    if (body?.plServiceLocationKey) {
      const depts = MockDB.getFiltered('departments', d => d.lServiceLocationKey === body.plServiceLocationKey);
      const deptKeys = new Set(depts.map(d => d.lDepartmentKey));
      repairs = repairs.filter(r => deptKeys.has(r.lDepartmentKey));
    }
    // Filter by instrument type
    if (body?.instrumentTypeValue && body.instrumentTypeValue !== 'all') {
      repairs = repairs.filter(r => r.sRigidOrFlexible === body.instrumentTypeValue);
    }
    // Filter hot list
    if (body?.chkHotList) {
      repairs = repairs.filter(r => r.bHotList);
    }
    return repairs;
  });

  // ── DashBoardTask (6) ─────────────────────────────────
  route('POST', '/DashBoardTask/GetAllTaskList', (p, body) => MockDB.getAll('tasks'));
  route('POST', '/DashBoardTask/AddTask', (p, body) => MockDB.insert('tasks', body));
  route('POST', '/DashBoardTask/UpdateTasks', (p, body) => {
    MockDB.update('tasks', body.lTaskKey, body);
    return body;
  });
  route('DELETE', '/DashBoardTask/DeleteTask', (p) => MockDB.remove('tasks', int(p.plTaskKey)));
  route('GET', '/DashBoardTask/GetAllTaskStatus', () => MockDB.getAll('taskStatuses'));
  route('GET', '/DashBoardTask/GetAllTaskPriorities', () => MockDB.getAll('taskPriorities'));

  // ── DashBoardTaskLoaner (3) ───────────────────────────
  route('POST', '/DashBoardTaskLoaner/AddTaskLoaner', (p, body) => MockDB.insert('taskLoaners', body));
  route('POST', '/DashBoardTaskLoaner/UpdateTaskLoaner', (p, body) => { MockDB.update('taskLoaners', body.lTaskLoanerKey, body); return body; });
  route('GET', '/DashBoardTaskLoaner/GetAllTaskLoanerList', (p) => { const tk = int(p.plTaskKey); return tk ? MockDB.getFiltered('taskLoaners', t => t.lTaskKey === tk) : MockDB.getAll('taskLoaners'); });
  route('DELETE', '/DashBoardTaskLoaner/DeleteTaskLoaner', (p) => MockDB.remove('taskLoaners', int(p.plTaskLoanerKey)));

  // ── DashboardTaskTypes (2) ────────────────────────────
  route('GET', '/DashboardTaskTypes/GetAllTaskTypeList', () => MockDB.getAll('taskTypes'));
  route('GET', '/DashboardTaskTypes/GetAllTaskType', () => MockDB.getAll('taskTypes'));

  // ── Client (5) ────────────────────────────────────────
  route('GET', '/Client/GetAllClientList', (p) => {
    let clients = MockDB.getAll('clients');
    if (p.plServiceLocationKey && p.plServiceLocationKey !== '0') {
      const svcKey = int(p.plServiceLocationKey);
      clients = clients.filter(c => c.lServiceLocationKey === svcKey);
    }
    return clients;
  });
  route('GET', '/Client/GetClientDetailsByClientId', (p) => {
    const client = MockDB.getByKey('clients', int(p.plClientKey));
    if (!client) return null;
    // Attach contacts and departments
    client.contacts = MockDB.getFiltered('contacts', c => c.lClientKey === client.lClientKey);
    client.departments = MockDB.getFiltered('departments', d => d.lClientKey === client.lClientKey);
    return client;
  });
  route('POST', '/Client/AddClient', (p, body) => MockDB.insert('clients', body));
  route('POST', '/Client/UpdateClient', (p, body) => {
    MockDB.update('clients', body.lClientKey, body);
    return body;
  });
  route('DELETE', '/Client/DeleteClient', (p) => MockDB.remove('clients', int(p.plClientKey)));
  route('GET', '/Client/GetCityStateUSA', (p) => {
    // Fake zip code lookup
    return { sCity: 'Unknown', sState: 'PA' };
  });

  // ── Departments (5) ───────────────────────────────────
  route('GET', '/Departments/GetAllDepartments', (p) => {
    let depts = MockDB.getAll('departments');
    if (p.plServiceLocationKey && p.plServiceLocationKey !== '0') {
      depts = depts.filter(d => d.lServiceLocationKey === int(p.plServiceLocationKey));
    }
    return depts;
  });
  route('GET', '/Departments/GetDepartmentDetailsByDepartmentId', (p) => {
    return MockDB.getByKey('departments', int(p.plDepartmentKey));
  });
  route('POST', '/Departments/AddDepartment', (p, body) => MockDB.insert('departments', body));
  route('POST', '/Departments/UpdateDepartment', (p, body) => { MockDB.update('departments', body.lDepartmentKey, body); return body; });
  route('DELETE', '/Departments/DeleteDepartment', (p) => MockDB.remove('departments', int(p.plDepartmentKey)));

  // ── DepartmentReportingGroups (1) ─────────────────────
  route('GET', '/DepartmentReportingGroups/GetAllDepartmentGPOList', (p) => MockDB.getFiltered('departmentGPOs', g => g.lDepartmentKey === int(p.plDepartmentKey)));

  // ── SubGroups (4) ─────────────────────────────────────
  route('GET', '/SubGroups/GetAllSubGroupsList', (p) => MockDB.getFiltered('subGroups', g => g.lDepartmentKey === int(p.plDepartmentKey)));
  route('GET', '/SubGroups/GetAllSubGroupsAvailableList', () => []);
  route('POST', '/SubGroups/AddDepartmentSubGroups', (p, body) => MockDB.insert('subGroups', body));
  route('DELETE', '/SubGroups/DeleteDepartmentSubGroups', (p) => MockDB.remove('subGroups', int(p.plSubGroupKey)));

  // ── Contacts (4) ──────────────────────────────────────
  route('GET', '/Contacts/GetContactsList', (p) => {
    if (int(p.plClientKey)) return MockDB.getFiltered('contacts', c => c.lClientKey === int(p.plClientKey));
    if (int(p.plDepartmentKey)) return MockDB.getFiltered('contacts', c => c.lDepartmentKey === int(p.plDepartmentKey));
    return MockDB.getAll('contacts');
  });
  route('GET', '/Contacts/GetAllContacts', (p) => MockDB.getFiltered('contacts', c => c.lDepartmentKey === int(p.plDepartmentKey) || c.lClientKey > 0));
  route('POST', '/Contacts/AddContacts', (p, body) => MockDB.insert('contacts', body));
  route('POST', '/Contacts/UpdateContacts', (p, body) => { MockDB.update('contacts', body.lContactKey, body); return body; });

  // ── Scopes (6) ──────────────────────────────────────
  route('GET', '/Scopes/GetAllScopes', (p) => {
    let scopes = MockDB.getAll('scopes');
    if (int(p.plDepartmentKey)) scopes = scopes.filter(s => s.lDepartmentKey === int(p.plDepartmentKey));
    if (p.psScopeIsDead) scopes = scopes.filter(s => s.sScopeIsDead === p.psScopeIsDead);
    return scopes;
  });
  route('POST', '/Scopes/GetAllScopesList', (p, body) => {
    let scopes = MockDB.getAll('scopes');
    if (body?.plDepartmentKey) scopes = scopes.filter(s => s.lDepartmentKey === body.plDepartmentKey);
    return MockDB.paginate(scopes, body?.Pagination);
  });
  route('GET', '/Scopes/GetScopeByScopeId', (p) => MockDB.getByKey('scopes', int(p.plScopeKey)));
  route('GET', '/Scopes/GetAllScopeType', () => MockDB.getAll('scopeTypes'));
  route('GET', '/Scopes/CheckOpenRepaireScope', (p) => {
    const open = MockDB.getFiltered('repairs', r => r.lScopeKey === int(p.plScopeKey) && r.lRepairStatusID < 8);
    return open.length > 0;
  });
  route('POST', '/Scopes/AddScope', (p, body) => MockDB.insert('scopes', body));
  route('DELETE', '/Scopes/DeleteScope', (p) => MockDB.remove('scopes', int(p.plScopeKey)));

  // ── ScopeType (6) ─────────────────────────────────────
  route('GET', '/ScopeType/GetscopeTypeNameList', (p) => {
    let types = MockDB.getAll('scopeTypes');
    if (p.psInstrumentType) types = types.filter(t => t.sRigidOrFlexible === p.psInstrumentType);
    return types;
  });
  route('GET', '/ScopeType/GetDepartmentScopeTypesList', (p) => MockDB.getFiltered('departmentScopeTypes', d => d.lDepartmentKey === int(p.plDepartmentKey)));
  route('GET', '/ScopeType/GetAvailableDepartmentScopeTypesList', (p) => {
    const assigned = new Set(MockDB.getFiltered('departmentScopeTypes', d => d.lDepartmentKey === int(p.plDepartmentKey)).map(d => d.lScopeTypeKey));
    let types = MockDB.getAll('scopeTypes').filter(t => !assigned.has(t.lScopeTypeKey));
    if (p.psScopeTypeDesc) types = types.filter(t => t.sScopeTypeDesc.toLowerCase().includes(p.psScopeTypeDesc.toLowerCase()));
    return types;
  });
  route('POST', '/ScopeType/AddDepartmentScopeTypes', (p, body) => MockDB.insert('departmentScopeTypes', body));
  route('DELETE', '/ScopeType/DeleteDepartmentScopeTypes', (p) => MockDB.remove('departmentScopeTypes', int(p.plScopeTypeKey)));
  route('DELETE', '/ScopeType/DeleteScopeTypes', (p) => MockDB.remove('scopeTypes', int(p.plScopeTypeKey)));

  // ── ScopeModel (4) ──────────────────────────────────
  route('POST', '/ScopeModel/GetAllManufacturersList', () => MockDB.getAll('manufacturers'));
  route('POST', '/ScopeModel/GetAllScopeTypeList', (p, body) => MockDB.paginate(MockDB.getAll('scopeTypes'), body?.Pagination));
  route('GET', '/ScopeModel/GetScopeTypeDetailsById', (p) => MockDB.getByKey('scopeTypes', int(p.plScopeTypeKey)));
  route('POST', '/ScopeModel/AddUpdateScopeType', (p, body) => {
    if (body.lScopeTypeKey) { MockDB.update('scopeTypes', body.lScopeTypeKey, body); return body; }
    return MockDB.insert('scopeTypes', body);
  });

  // ── ModelMaxCharges (4) ───────────────────────────────
  route('GET', '/ModelMaxCharges/GetAllModelMaxChargesList', (p) => MockDB.getFiltered('modelMaxCharges', m => m.lDepartmentKey === int(p.plDepartmentKey)));
  route('POST', '/ModelMaxCharges/AddModelMaxCharge', (p, body) => MockDB.insert('modelMaxCharges', body));
  route('POST', '/ModelMaxCharges/UpdateModelMaxCharge', (p, body) => body);
  route('DELETE', '/ModelMaxCharges/DeleteModelMaxCharge', () => true);

  // ── Repair (9) ──────────────────────────────────────
  route('POST', '/Repair/GetAllRepairList', (p, body) => MockDB.paginate(MockDB.getAll('repairs'), body?.Pagination));
  route('GET', '/Repair/GetAllRepairs', (p) => {
    let repairs = MockDB.getAll('repairs');
    if (int(p.plServiceLocationKey)) repairs = repairs.filter(r => r.lServiceLocationKey === int(p.plServiceLocationKey));
    if (int(p.plDepartmentKey)) repairs = repairs.filter(r => r.lDepartmentKey === int(p.plDepartmentKey));
    return repairs;
  });
  route('GET', '/Repair/GetAllrepairsBylRepairKey', (p) => MockDB.getByKey('repairs', int(p.plRepairKey)));
  route('GET', '/Repair/GetAllRepairReasons', () => MockDB.getAll('repairReasons'));
  route('GET', '/Repair/GetAllDeliveryMethods', () => MockDB.getAll('deliveryMethods'));
  route('GET', '/Repair/GetAllTechs', () => MockDB.getFiltered('employees', e => e.bIsTechnician));
  route('GET', '/Repair/GetAllPatientSafetyLevels', () => MockDB.getAll('patientSafetyLevels'));
  route('POST', '/Repair/AddRepair', (p, body) => MockDB.insert('repairs', body));
  route('POST', '/Repair/UpdateRepair', (p, body) => { MockDB.update('repairs', body.lRepairKey, body); return body; });
  route('DELETE', '/Repair/DeleteRepair', (p) => MockDB.remove('repairs', int(p.plRepairKey)));

  // ── RepairItems (8) ─────────────────────────────────
  route('POST', '/RepairItems/GetRepairItemsList', (p, body) => {
    if (body?.plRepairKey) return MockDB.getFiltered('repairDetails', d => d.lRepairKey === body.plRepairKey);
    return MockDB.paginate(MockDB.getAll('repairItems'), body?.Pagination);
  });
  route('GET', '/RepairItems/GetAllRepairItems', (p) => {
    let items = MockDB.getAll('repairItems');
    if (p.psRigidOrFlexible) items = items.filter(i => i.sRigidOrFlexible === p.psRigidOrFlexible[0]);
    return items;
  });
  route('GET', '/RepairItems/GetRepairItemsBylRepairItemKey', (p) => MockDB.getByKey('repairItems', int(p.plRepairItemKey)));
  route('POST', '/RepairItems/AddRepairItems', (p, body) => MockDB.insert('repairItems', body));
  route('POST', '/RepairItems/UpdateRepairItems', (p, body) => { MockDB.update('repairItems', body.lRepairItemKey, body); return body; });
  route('DELETE', '/RepairItems/DeleteRepairItems', (p) => MockDB.remove('repairItems', int(p.plRepairItemKey)));
  route('GET', '/RepairItems/GetRepairLevels', () => MockDB.getAll('repairLevels'));
  route('GET', '/RepairItems/GetRepairStatus', () => MockDB.getAll('repairStatuses'));

  // ── Detail (2) — Repair line items ────────────────────
  route('GET', '/Detail/GetAllRepairDetailsList', (p) => MockDB.getFiltered('repairDetails', d => d.lRepairKey === int(p.plRepairKey)));
  route('POST', '/Detail/AddRepairDetail', (p, body) => MockDB.insert('repairDetails', body));

  // ── RepairInventory (2) ───────────────────────────────
  route('GET', '/RepairInventory/GetAllRepairInventoryList', (p) => MockDB.getFiltered('repairInventory', i => i.lRepairKey === int(p.plRepairKey)));
  route('POST', '/RepairInventory/AddRepairInventory', (p, body) => MockDB.insert('repairInventory', body));

  // ── StatusTran (2) ────────────────────────────────────
  route('GET', '/StatusTran/GetAllRepairStatusesList', (p) => MockDB.getFiltered('statusTrans', s => s.lRepairKey === int(p.plRepairKey)));
  route('POST', '/StatusTran/AddRepairStatus', (p, body) => MockDB.insert('statusTrans', body));

  // ── Inventory (7) ───────────────────────────────────
  route('POST', '/Inventory/GetAllInventoryList', (p, body) => {
    let items = MockDB.getAll('inventory');
    if (!body?.pbIncludeInactive) items = items.filter(i => i.bActive);
    return MockDB.paginate(items, body?.Pagination);
  });
  route('POST', '/Inventory/GetAllInventorySizesList', (p, body) => {
    let sizes = MockDB.getFiltered('inventorySizes', s => s.lInventoryKey === (body?.plInventoryKey || 0));
    return MockDB.paginate(sizes, body?.Pagination);
  });
  route('POST', '/Inventory/AddInventory', (p, body) => MockDB.insert('inventory', body));
  route('GET', '/Inventory/GetAllInventorySizesById', (p) => MockDB.getByKey('inventorySizes', int(p.plInventorySizeKey)));
  route('POST', '/Inventory/AddInventorySize', (p, body) => MockDB.insert('inventorySizes', body));
  route('POST', '/Inventory/UpdateInventorySize', (p, body) => { MockDB.update('inventorySizes', body.lInventorySizeKey, body); return body; });
  route('DELETE', '/Inventory/DeleteInventorySize', (p) => MockDB.remove('inventorySizes', int(p.plInventorySizeKey)));

  // ── Supplier (8) ────────────────────────────────────
  route('POST', '/Supplier/GetSuppliersList', (p, body) => MockDB.paginate(MockDB.getAll('suppliers'), body?.Pagination));
  route('GET', '/Supplier/GetSupplierBySupplierKey', (p) => MockDB.getByKey('suppliers', int(p.plSupplierKey)));
  route('GET', '/Supplier/GetAllSupplierList', () => MockDB.getAll('suppliers'));
  route('POST', '/Supplier/AddSupplier', (p, body) => MockDB.insert('suppliers', body));
  route('POST', '/Supplier/UpdateSupplier', (p, body) => { MockDB.update('suppliers', body.lSupplierKey, body); return body; });
  route('DELETE', '/Supplier/DeleteSupplier', (p) => MockDB.remove('suppliers', int(p.plSupplierKey)));
  route('POST', '/Supplier/GetSupplierRecentPOsList', () => []);
  route('POST', '/Supplier/GetSuppliedItemAndSize', () => []);
  route('POST', '/Supplier/GetAvailableSuppliedItemAndSize', () => []);

  // ── Acquisitions (3) ──────────────────────────────────
  route('POST', '/Acquisitions/GetAcquisitionsSoldList', () => []);
  route('POST', '/Acquisitions/GetAcquisitionsInHouseList', () => []);
  route('POST', '/Acquisitions/GetAcquisitionsConsignedList', () => []);

  // ── Contract (16) ───────────────────────────────────
  route('POST', '/Contract/GetAllContractsList', (p, body) => MockDB.paginate(MockDB.getAll('contracts'), body?.Pagination));
  route('GET', '/Contract/GetContractById', (p) => MockDB.getByKey('contracts', int(p.plContractKey)));
  route('POST', '/Contract/AddContract', (p, body) => MockDB.insert('contracts', body));
  route('POST', '/Contract/UpdateContract', (p, body) => { MockDB.update('contracts', body.lContractKey, body); return body; });
  route('DELETE', '/Contract/DeleteContract', (p) => MockDB.remove('contracts', int(p.plContractKey)));
  route('GET', '/Contract/GetAllContractType', () => MockDB.getAll('contractTypes'));
  route('GET', '/Contract/GetAllContractServicePlanTerms', () => []);
  route('GET', '/Contract/GetContractDepartments', (p) => MockDB.getFiltered('contractDepartments', d => d.lContractKey === int(p.plContractKey)));
  route('GET', '/Contract/GetContractDepartmentsAvailable', () => MockDB.getAll('departments'));
  route('POST', '/Contract/GetAllContractScopes', (p, body) => MockDB.getFiltered('contractScopes', s => s.lContractKey === (body?.plContractKey || 0)));
  route('GET', '/Contract/CheckScopeSerialNumberExists', (p) => {
    const found = MockDB.getFiltered('scopes', s => s.sSerialNumber === p.psSerialNumber);
    return found.length > 0;
  });
  route('GET', '/Contract/GetContractRepairsList', () => []);
  route('GET', '/Contract/GetContractAmendmentsList', () => []);
  route('GET', '/Contract/GetAllContractCoverageCounts', () => ({ nCountFlexible: 10, nCountRigid: 5, nCountInstrument: 3, nCountCamera: 2, nCountAll: 20 }));
  route('GET', '/Contract/GetContractReportCardDetails', () => ({}));
  route('GET', '/Contract/GetContractExpenseBreakdown', () => ({}));
  route('POST', '/Contract/GetAllContractInvoice', () => MockDB.getAll('contractInvoices'));
  route('GET', '/Contract/GetAllContractClient', () => MockDB.getAll('clients'));

  // ── Financials (8) ──────────────────────────────────
  route('POST', '/Financials/GetOutstandingInvoicesList', () => MockDB.getAll('invoices'));
  route('GET', '/Financials/GetAllGLAccounts', () => MockDB.getAll('glAccounts'));
  route('POST', '/Financials/GetAllClientsOnHold', () => MockDB.getAll('clientsOnHold'));
  route('POST', '/Financials/clientUpdateOnHold', (p, body) => body);
  route('POST', '/Financials/GetAllInvoicePayments', () => MockDB.getAll('invoicePayments'));
  route('POST', '/Financials/GetAllDraftInvoices', () => MockDB.getAll('draftInvoices'));
  route('DELETE', '/Financials/DeleteDraftInvoice', (p) => MockDB.remove('draftInvoices', int(p.plInvoiceKey)));

  // ── Documents (3) ───────────────────────────────────
  route('GET', '/Documents/GetAllDocumentsList', (p) => MockDB.getFiltered('documents', d => d.lOwnerKey === int(p.plOwnerKey)));
  route('DELETE', '/Documents/DeleteDocuments', (p) => MockDB.remove('documents', int(p.plDocumentKey)));
  route('GET', '/Documents/DownloadDocument', () => ({ content: '', fileName: '' }));

  // ── Flags (3) ──────────────────────────────────────
  route('GET', '/Flag/GetFlagList', (p) => {
    if (int(p.plOwnerKey)) return MockDB.getFiltered('flags', f => f.lOwnerKey === int(p.plOwnerKey));
    if (int(p.plClientKey)) return MockDB.getFiltered('flags', f => f.lClientKey === int(p.plClientKey));
    return [];
  });
  route('POST', '/Flag/AddFlag', (p, body) => MockDB.insert('flags', body));
  route('DELETE', '/Flag/DeleteFlag', (p) => MockDB.remove('flags', int(p.plFlagKey)));

  // ── Lookups / Reference ───────────────────────────────
  route('GET', '/SalesRepNames/GetAllSalesRepNames', () => MockDB.getAll('salesReps'));
  route('GET', '/PricingCategory/GetAllPricingCategories', () => MockDB.getAll('pricingCategories'));
  route('GET', '/PaymentTerms/GetAllPaymentTerms', () => MockDB.getAll('paymentTerms'));
  route('GET', '/CreditLimit/GetAllCreditLimits', () => MockDB.getAll('creditLimits'));
  route('GET', '/DistributorName/GetAllDistributorNames', () => MockDB.getAll('distributors'));
  route('GET', '/InstrumentType/GetInstrumentTypes', () => MockDB.getAll('instrumentTypes'));

  // ── ServiceLocation (1) ───────────────────────────────
  route('GET', '/ServiceLocation/GetAllServiceLocation', () => MockDB.getAll('serviceLocations'));

  // ── UserManagement (1) ──────────────────────────────
  route('POST', '/UserManagement/UpdateUser', (p, body) => body);

  // ── DevelopmentList (6) ───────────────────────────────
  route('POST', '/DevelopmentList/GetDevelopmentTodoList', () => MockDB.getAll('devTodoList'));
  route('POST', '/DevelopmentList/AddDevelopmentTodoItem', (p, body) => MockDB.insert('devTodoList', body));
  route('POST', '/DevelopmentList/DevelopmentToDoUpdatedStatus', (p, body) => body);
  route('GET', '/DevelopmentList/GetAllTodoDetails', (p) => MockDB.getFiltered('devTodoList', t => t.plToDoID === int(p.plToDoID)));
  route('GET', '/DevelopmentList/GetAllTodoStatuses', () => MockDB.getAll('devTodoStatuses'));
  route('GET', '/DevelopmentList/GetAllTodoPriorities', () => MockDB.getAll('devTodoPriorities'));

  console.log('[MockAPI] ' + _routes.length + ' routes registered');

  // ── Public API ────────────────────────────────────────
  return {
    handleRequest,
    route,
  };
})();
