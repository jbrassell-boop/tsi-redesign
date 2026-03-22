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
        user: MockDB.getByKey('users', 1)
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
  route('POST', '/ScopeModel/GetAllScopeTypeList', (p, body) => {
    const types = MockDB.getAll('scopeTypes');
    // Build scopeTypeKey→repair counts from scopes + repairs chain
    const scopes = MockDB.getAll('scopes');
    const repairs = MockDB.getAll('repairs');
    const repairItems = MockDB.getAll('repairItems');
    const inventorySizes = MockDB.getAll('inventorySizes');

    // Map scopeKey → scopeTypeKey
    const scopeToType = {};
    scopes.forEach(s => { if (s.lScopeTypeKey) scopeToType[s.lScopeKey] = s.lScopeTypeKey; });

    // Aggregate repair TATs by scopeTypeKey
    const tatByScopeType = {};
    repairs.forEach(r => {
      const stk = scopeToType[r.lScopeKey];
      if (!stk) return;
      if (!tatByScopeType[stk]) tatByScopeType[stk] = [];
      if (r.nTurnAroundTime > 0) tatByScopeType[stk].push(r.nTurnAroundTime);
    });

    // Count repair items by rigid/flexible match to scope type
    const riByFlex = { F: 0, R: 0, C: 0 };
    repairItems.forEach(ri => { if (ri.bActive !== false) riByFlex[ri.sRigidOrFlexible] = (riByFlex[ri.sRigidOrFlexible] || 0) + 1; });

    // Count inventory sizes by rigid/flexible
    const invByFlex = { F: 0, R: 0, C: 0 };
    inventorySizes.forEach(is => { if (is.bActive !== false) invByFlex[is.sRigidOrFlexible] = (invByFlex[is.sRigidOrFlexible] || 0) + 1; });

    // Attach computed counts to each scope type
    const enriched = types.map(t => {
      const flex = t.sRigidOrFlexible || 'F';
      const tats = tatByScopeType[t.lScopeTypeKey] || [];
      const avgTAT = tats.length ? Math.round((tats.reduce((a, b) => a + b, 0) / tats.length) * 10) / 10 : null;

      // Deterministic per-model count using key as seed (varies per scope type)
      const k = t.lScopeTypeKey || 0;
      const baseRI = riByFlex[flex] || repairItems.length;
      const baseInv = invByFlex[flex] || inventorySizes.length;
      const repairItemCount = Math.max(3, Math.min(20, (k * 7 + 3) % (Math.min(baseRI, 18)) + 3));
      const linkedParts = Math.max(2, Math.min(25, (k * 11 + 5) % (Math.min(baseInv, 22)) + 4));

      return { ...t, lRepairItemCount: repairItemCount, lLinkedParts: linkedParts, dblAvgTAT: avgTAT };
    });
    return MockDB.paginate(enriched, body?.Pagination);
  });
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
  route('POST', '/Repair/GetAllRepairList', (p, body) => MockDB.paginate(MockDB.getAll('repairs').filter(r => r.sRigidOrFlexible !== 'I'), body?.Pagination));
  route('GET', '/Repair/GetAllRepairs', (p) => {
    let repairs = MockDB.getAll('repairs').filter(r => r.sRigidOrFlexible !== 'I');
    if (int(p.plServiceLocationKey)) repairs = repairs.filter(r => r.lServiceLocationKey === int(p.plServiceLocationKey));
    if (int(p.plDepartmentKey)) repairs = repairs.filter(r => r.lDepartmentKey === int(p.plDepartmentKey));
    return repairs;
  });
  route('GET', '/Repair/GetAllrepairsBylRepairKey', (p) => {
    const r = MockDB.getByKey('repairs', int(p.plRepairKey));
    if (r && !r.sScopeCategory) {
      // Enrich: repair → scope → scopeType → scopeTypeCategory
      const scope = r.lScopeKey ? MockDB.getByKey('scopes', r.lScopeKey) : null;
      const st = scope ? MockDB.getByKey('scopeTypes', scope.lScopeTypeKey) : null;
      const catKey = st ? (st.lScopeTypeCatKey || st.lScopeTypeCategoryKey) : null;
      const cat = catKey ? MockDB.getByKey('scopeTypeCategories', catKey) : null;
      if (cat) r.sScopeCategory = cat.sScopeTypeCategory;
    }
    return r;
  });
  route('GET', '/Repair/GetAllRepairReasons', () => MockDB.getAll('repairReasons'));
  route('GET', '/Repair/GetAllDeliveryMethods', () => MockDB.getAll('deliveryMethods'));
  route('GET', '/Repair/GetAllTechs', () => MockDB.getAll('technicians'));
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
    const allSizes = MockDB.getAll('inventorySizes');
    items = items.map(item => {
      const sizes = allSizes.filter(s => s.lInventoryKey === item.lInventoryKey);
      const totalCur = sizes.reduce((sum, s) => sum + (s.nLevelCurrent || 0), 0);
      const totalMin = sizes.reduce((sum, s) => sum + (s.nLevelMinimum || 0), 0);
      const lowCount = sizes.filter(s => (s.nLevelCurrent || 0) <= (s.nReorderPoint || 0)).length;
      return { ...item, nLevelCurrent: totalCur, nLevelMinimum: totalMin, nSizeCount: sizes.length, nLowStockCount: lowCount };
    });
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
  route('POST', '/Supplier/GetSupplierRecentPOsList', (p, body) => MockDB.getFiltered('supplierPOs', po => po.lSupplierKey === (body?.plSupplierKey || 0)));
  route('POST', '/Supplier/GetSuppliedItemAndSize', (p, body) => MockDB.getAll('inventorySizes'));
  route('POST', '/Supplier/GetAvailableSuppliedItemAndSize', () => MockDB.getAll('inventorySizes'));

  // ── Acquisitions (3) ──────────────────────────────────
  route('POST', '/Acquisitions/GetAcquisitionsSoldList', (p, body) => MockDB.paginate(MockDB.getFiltered('acquisitions', a => a.sCategory === 'Sold'), body?.Pagination));
  route('POST', '/Acquisitions/GetAcquisitionsInHouseList', (p, body) => MockDB.paginate(MockDB.getFiltered('acquisitions', a => a.sCategory === 'InHouse'), body?.Pagination));
  route('POST', '/Acquisitions/GetAcquisitionsConsignedList', (p, body) => MockDB.paginate(MockDB.getFiltered('acquisitions', a => a.sCategory === 'Consigned'), body?.Pagination));

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
  route('GET', '/Contract/GetContractRepairsList', (p) => MockDB.getFiltered('repairs', r => r.lContractKey === int(p.plContractKey)));
  route('GET', '/Contract/GetContractAmendmentsList', () => []);
  route('GET', '/Contract/GetAllContractCoverageCounts', () => ({ nCountFlexible: 10, nCountRigid: 5, nCountInstrument: 3, nCountCamera: 2, nCountAll: 20 }));
  route('GET', '/Contract/GetContractReportCardDetails', () => ({}));
  route('GET', '/Contract/GetContractExpenseBreakdown', () => ({}));
  route('POST', '/Contract/GetAllContractInvoice', () => MockDB.getAll('contractInvoices'));
  route('GET', '/Contract/GetAllContractClient', () => MockDB.getAll('clients'));

  // ── Financials (8) ──────────────────────────────────
  route('POST', '/Financials/GetOutstandingInvoicesList', () => {
    // Enrich invoices with GP Invoice Staging amounts (tblInvoice.dblTranAmount is always 0)
    const invoices = MockDB.getAll('invoices');
    const gpStaging = MockDB.getAll('gpInvoiceStaging');
    const gpMap = {};
    gpStaging.forEach(g => { gpMap[g.lInvoiceKey] = g; });
    return invoices.map(inv => {
      const gp = gpMap[inv.lInvoiceKey];
      if (gp) {
        inv.dblTranAmount = gp.TotalAmountDue || gp.dblTranAmount || inv.dblTranAmount;
        inv.dblTaxAmount = gp.dblTaxAmount || inv.dblTaxAmount;
        inv.sGLAccountNumber = gp.GLAccount || inv.sGLAccountNumber || '';
        inv.sPaymentTerms = gp.PaymentTerms || inv.sPaymentTerms || '';
        inv.sInvoiceNumber = gp.sTranNumber || inv.sInvoiceNumber || '';
        if (!inv.dtDueDate) inv.dtDueDate = gp.dtDueDate;
      }
      return inv;
    });
  });
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

  // ── Admin Reference Data (CRUD) ──────────────────────
  // Companies
  route('GET', '/Company/GetAllCompanies', () => MockDB.getAll('companies'));
  route('GET', '/Company/GetCompanyById', (p) => MockDB.getByKey('companies', int(p.plCompanyKey)));
  route('POST', '/Company/AddCompany', (p, body) => MockDB.insert('companies', body));
  route('POST', '/Company/UpdateCompany', (p, body) => { MockDB.update('companies', body.lCompanyKey, body); return body; });
  route('DELETE', '/Company/DeleteCompany', (p) => MockDB.remove('companies', int(p.plCompanyKey)));

  // Delivery Methods (CUD — GET already exists above)
  route('POST', '/Repair/AddDeliveryMethod', (p, body) => MockDB.insert('deliveryMethods', body));
  route('POST', '/Repair/UpdateDeliveryMethod', (p, body) => { MockDB.update('deliveryMethods', body.lDeliveryMethodKey, body); return body; });
  route('DELETE', '/Repair/DeleteDeliveryMethod', (p) => MockDB.remove('deliveryMethods', int(p.plDeliveryMethodKey)));

  // Payment Terms (CUD — GET already exists)
  route('POST', '/PaymentTerms/AddPaymentTerms', (p, body) => MockDB.insert('paymentTerms', body));
  route('POST', '/PaymentTerms/UpdatePaymentTerms', (p, body) => { MockDB.update('paymentTerms', body.lPaymentTermsKey, body); return body; });
  route('DELETE', '/PaymentTerms/DeletePaymentTerms', (p) => MockDB.remove('paymentTerms', int(p.plPaymentTermsKey)));

  // Distributors (CUD — GET already exists)
  route('POST', '/DistributorName/AddDistributor', (p, body) => MockDB.insert('distributors', body));
  route('POST', '/DistributorName/UpdateDistributor', (p, body) => { MockDB.update('distributors', body.lDistributorKey, body); return body; });
  route('DELETE', '/DistributorName/DeleteDistributor', (p) => MockDB.remove('distributors', int(p.plDistributorKey)));

  // Scope Categories
  route('GET', '/ScopeCategory/GetAllScopeCategories', () => MockDB.getAll('scopeCategories'));
  route('POST', '/ScopeCategory/AddScopeCategory', (p, body) => MockDB.insert('scopeCategories', body));
  route('POST', '/ScopeCategory/UpdateScopeCategory', (p, body) => { MockDB.update('scopeCategories', body.lScopeCategoryKey, body); return body; });
  route('DELETE', '/ScopeCategory/DeleteScopeCategory', (p) => MockDB.remove('scopeCategories', int(p.plScopeCategoryKey)));

  // Reporting Groups
  route('GET', '/ReportingGroup/GetAllReportingGroups', () => MockDB.getAll('reportingGroups'));
  route('POST', '/ReportingGroup/AddReportingGroup', (p, body) => MockDB.insert('reportingGroups', body));
  route('POST', '/ReportingGroup/UpdateReportingGroup', (p, body) => { MockDB.update('reportingGroups', body.lReportingGroupKey, body); return body; });
  route('DELETE', '/ReportingGroup/DeleteReportingGroup', (p) => MockDB.remove('reportingGroups', int(p.plReportingGroupKey)));

  // Cleaning Systems
  route('GET', '/CleaningSystem/GetAllCleaningSystems', () => MockDB.getAll('cleaningSystems'));
  route('POST', '/CleaningSystem/AddCleaningSystem', (p, body) => MockDB.insert('cleaningSystems', body));
  route('POST', '/CleaningSystem/UpdateCleaningSystem', (p, body) => { MockDB.update('cleaningSystems', body.lCleaningSystemKey, body); return body; });
  route('DELETE', '/CleaningSystem/DeleteCleaningSystem', (p) => MockDB.remove('cleaningSystems', int(p.plCleaningSystemKey)));

  // Standard Departments
  route('GET', '/StandardDepartment/GetAllStandardDepartments', () => MockDB.getAll('standardDepartments'));
  route('POST', '/StandardDepartment/AddStandardDepartment', (p, body) => MockDB.insert('standardDepartments', body));
  route('POST', '/StandardDepartment/UpdateStandardDepartment', (p, body) => { MockDB.update('standardDepartments', body.lStandardDeptKey, body); return body; });
  route('DELETE', '/StandardDepartment/DeleteStandardDepartment', (p) => MockDB.remove('standardDepartments', int(p.plStandardDeptKey)));

  // Credit Limits (CUD — GET already exists above)
  route('POST', '/CreditLimit/AddCreditLimit', (p, body) => MockDB.insert('creditLimits', body));
  route('POST', '/CreditLimit/UpdateCreditLimit', (p, body) => { MockDB.update('creditLimits', body.lCreditLimitKey, body); return body; });
  route('DELETE', '/CreditLimit/DeleteCreditLimit', (p) => MockDB.remove('creditLimits', int(p.plCreditLimitKey)));

  // Repair Reasons (CUD — GET already exists above)
  route('POST', '/Repair/AddRepairReason', (p, body) => MockDB.insert('repairReasons', body));
  route('POST', '/Repair/UpdateRepairReason', (p, body) => { MockDB.update('repairReasons', body.lRepairReasonKey, body); return body; });
  route('DELETE', '/Repair/DeleteRepairReason', (p) => MockDB.remove('repairReasons', int(p.plRepairReasonKey)));

  // Repair Statuses (CUD — GET already exists above)
  route('POST', '/RepairItems/AddRepairStatus', (p, body) => MockDB.insert('repairStatuses', body));
  route('POST', '/RepairItems/UpdateRepairStatus', (p, body) => { MockDB.update('repairStatuses', body.lRepairStatusID, body); return body; });
  route('DELETE', '/RepairItems/DeleteRepairStatus', (p) => MockDB.remove('repairStatuses', int(p.plRepairStatusID)));

  // Countries
  route('GET', '/Country/GetAllCountries', () => MockDB.getAll('countries'));
  route('POST', '/Country/AddCountry', (p, body) => MockDB.insert('countries', body));
  route('POST', '/Country/UpdateCountry', (p, body) => { MockDB.update('countries', body.lCountryKey, body); return body; });
  route('DELETE', '/Country/DeleteCountry', (p) => MockDB.remove('countries', int(p.plCountryKey)));

  // ── ServiceLocation (1) ───────────────────────────────
  route('GET', '/ServiceLocation/GetAllServiceLocation', () => MockDB.getAll('serviceLocations'));

  // ── UserManagement (1) ──────────────────────────────
  route('POST', '/UserManagement/UpdateUser', (p, body) => body);

  // ── Product Sales (3) ────────────────────────────────
  route('POST', '/ProductSale/GetAllProductSalesList', (p, body) => MockDB.paginate(MockDB.getAll('productSales'), body?.Pagination));
  route('GET', '/ProductSale/GetProductSaleById', (p) => MockDB.getByKey('productSales', int(p.plProductSaleKey)));
  route('GET', '/ProductSale/GetProductSaleItems', (p) => MockDB.getFiltered('productSaleItems', i => i.lProductSaleKey === int(p.plProductSaleKey)));

  // ── Quality (3) ─────────────────────────────────────
  route('GET', '/Quality/GetAllInspections', () => MockDB.tables.inspections || []);
  route('GET', '/Quality/GetAllNCRs', () => MockDB.tables.ncrs || []);
  route('GET', '/Quality/GetAllCAPAs', () => MockDB.tables.capas || []);

  // ── Dashboard Queues (3+) ───────────────────────────
  route('GET', '/Dashboard/GetEmailQueue', () => MockDB.tables.emailQueue || []);
  route('GET', '/Dashboard/GetShippingQueue', () => MockDB.tables.shippingQueue || []);
  route('GET', '/Financials/GetAtRiskAccounts', () => MockDB.tables.atRiskAccounts || []);
  route('GET', '/Financials/GetRevenueTrending', () => MockDB.tables.revenueTrending || []);

  // ── LoanerTrans (2) ──────────────────────────────────
  route('GET', '/LoanerTrans/GetAllLoanerTransList', () => MockDB.getAll('loanerTrans'));
  route('POST', '/LoanerTrans/GetAllLoanerTransList', (p, body) => MockDB.paginate(MockDB.getAll('loanerTrans'), body?.Pagination));

  // ── Emails (4) ────────────────────────────────────────
  route('GET', '/Email/GetAllEmailList', () => MockDB.getAll('emails'));
  route('POST', '/Email/GetAllEmailList', (p, body) => MockDB.paginate(MockDB.getAll('emails'), body?.Pagination));
  route('GET', '/Email/GetAllEmailTypes', () => MockDB.getAll('emailTypes'));
  route('GET', '/Email/GetEmailAttachments', (p) => MockDB.getFiltered('emailAttachments', a => a.lEmailKey === int(p.plEmailKey)));

  // ── ShippingCharges (2) ───────────────────────────────
  route('GET', '/ShippingCharge/GetAllShippingChargeList', () => MockDB.getAll('shippingCharges'));
  route('POST', '/ShippingCharge/GetAllShippingChargeList', (p, body) => MockDB.paginate(MockDB.getAll('shippingCharges'), body?.Pagination));

  // ── DevelopmentList (6) ───────────────────────────────
  route('POST', '/DevelopmentList/GetDevelopmentTodoList', () => MockDB.getAll('devTodoList'));
  route('POST', '/DevelopmentList/AddDevelopmentTodoItem', (p, body) => MockDB.insert('devTodoList', body));
  route('POST', '/DevelopmentList/DevelopmentToDoUpdatedStatus', (p, body) => body);
  route('GET', '/DevelopmentList/GetAllTodoDetails', (p) => MockDB.getFiltered('devTodoList', t => t.plToDoID === int(p.plToDoID)));
  route('GET', '/DevelopmentList/GetAllTodoStatuses', () => MockDB.getAll('devTodoStatuses'));
  route('GET', '/DevelopmentList/GetAllTodoPriorities', () => MockDB.getAll('devTodoPriorities'));

  // ── Dashboard Metrics (computed) ─────────────────────
  route('GET', '/Dashboard/GetRepairMetrics', (p) => {
    const repairs = MockDB.getAll('repairs');
    const now = new Date();
    const mStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const qMonth = Math.floor(now.getMonth() / 3) * 3;
    const qStart = new Date(now.getFullYear(), qMonth, 1);
    const yStart = new Date(now.getFullYear(), 0, 1);

    function periodStart(period) {
      if (period === 'QTD') return qStart;
      if (period === 'YTD') return yStart;
      return mStart;
    }

    const period = p.period || 'MTD';
    const pStart = periodStart(period);

    // Filter to period
    const inPeriod = repairs.filter(r => {
      const d = r.dtDateIn ? new Date(r.dtDateIn) : null;
      return d && d >= pStart && d <= now;
    });

    // TAT: days between dtDateIn and dtDateOut where both exist
    const withTat = inPeriod.filter(r => r.dtDateIn && r.dtDateOut);
    const tats = withTat.map(r => {
      const d1 = new Date(r.dtDateIn), d2 = new Date(r.dtDateOut);
      return Math.max(0, Math.round((d2 - d1) / 86400000));
    });
    const avgTat = tats.length ? (tats.reduce((a, b) => a + b, 0) / tats.length) : 0;

    // Throughput: shipped in period
    const shipped = repairs.filter(r => {
      const d = r.dtShipDate ? new Date(r.dtShipDate) : null;
      return d && d >= pStart && d <= now;
    });

    // On-time ship %: shipped within 10 business days of dtDateIn
    const SLA_DAYS = 10;
    const onTime = shipped.filter(r => {
      if (!r.dtDateIn || !r.dtShipDate) return false;
      const days = Math.round((new Date(r.dtShipDate) - new Date(r.dtDateIn)) / 86400000);
      return days <= SLA_DAYS;
    });
    const onTimePct = shipped.length ? Math.round((onTime.length / shipped.length) * 100) : 0;

    // In-house: has dtDateIn but no dtDateOut
    const inHouse = repairs.filter(r => r.dtDateIn && !r.dtDateOut).length;

    // Top scope types by volume
    const byType = {};
    inPeriod.forEach(r => {
      const st = r.sScopeTypeDesc || 'Unknown';
      if (!byType[st]) byType[st] = { type: st, count: 0, tats: [], inProgress: 0, completed: 0 };
      byType[st].count++;
      if (r.dtDateIn && r.dtDateOut) {
        const days = Math.max(0, Math.round((new Date(r.dtDateOut) - new Date(r.dtDateIn)) / 86400000));
        byType[st].tats.push(days);
        byType[st].completed++;
      } else if (r.dtDateIn && !r.dtDateOut) {
        byType[st].inProgress++;
      }
    });
    const scopeTypes = Object.values(byType)
      .map(s => ({
        type: s.type,
        count: s.count,
        avgTat: s.tats.length ? +(s.tats.reduce((a, b) => a + b, 0) / s.tats.length).toFixed(1) : null,
        inProgress: s.inProgress,
        completed: s.completed
      }))
      .sort((a, b) => b.count - a.count);

    return {
      avgTat: +avgTat.toFixed(1),
      throughput: shipped.length,
      onTimePct,
      inHouse,
      totalInPeriod: inPeriod.length,
      scopeTypes
    };
  });

  // ── Dashboard TAT Matrix (computed) ─────────────────
  route('GET', '/Dashboard/GetTATMatrix', (p) => {
    const repairs = MockDB.getAll('repairs');
    const levels = MockDB.getAll('repairLevels');
    const now = new Date();
    const outsourcedOnly = p.outsourced === 'true';
    const inHouseOnly = p.inhouse === 'true';

    // Time windows
    const windows = [
      { label: 'Current Month', start: new Date(now.getFullYear(), now.getMonth(), 1) },
      { label: 'Last 30 Days', start: new Date(now.getTime() - 30 * 86400000) },
      { label: 'Last 3 Months', start: new Date(now.getTime() - 90 * 86400000) },
      { label: 'Last 6 Months', start: new Date(now.getTime() - 180 * 86400000) }
    ];

    // Map repair status to repair level
    function repairLevel(r) {
      const s = (r.sRepairStatus || '').toLowerCase();
      if (s.includes('minor')) return 'Minor';
      if (s.includes('mid')) return 'Mid-Level';
      if (s.includes('major')) return 'Major';
      if (s.includes('vsi') || s.includes('rigid')) return 'VSI';
      return 'Other';
    }

    // Filter outsourced
    let filtered = repairs;
    if (outsourcedOnly) filtered = filtered.filter(r => r.bOutsourced === true);
    if (inHouseOnly) filtered = filtered.filter(r => r.bOutsourced !== true);

    // Only repairs with TAT
    const withTat = filtered.filter(r => r.dtDateIn && r.dtDateOut);

    // Build level x window matrix
    const levelNames = ['Minor', 'Mid-Level', 'Major', 'VSI'];
    const matrix = levelNames.map(level => {
      const row = { level };
      windows.forEach(w => {
        const inWindow = withTat.filter(r => {
          const d = new Date(r.dtDateOut);
          return d >= w.start && d <= now && repairLevel(r) === level;
        });
        const tats = inWindow.map(r => Math.max(0, Math.round((new Date(r.dtDateOut) - new Date(r.dtDateIn)) / 86400000)));
        row[w.label] = {
          avgTat: tats.length ? +(tats.reduce((a, b) => a + b, 0) / tats.length).toFixed(1) : null,
          count: inWindow.length
        };
      });
      return row;
    });

    // TAT by scope type (top 15)
    const byType = {};
    withTat.forEach(r => {
      const st = r.sScopeTypeDesc || 'Unknown';
      if (!byType[st]) byType[st] = { type: st, tats: [], counts: {} };
      const tat = Math.max(0, Math.round((new Date(r.dtDateOut) - new Date(r.dtDateIn)) / 86400000));
      byType[st].tats.push(tat);
      windows.forEach(w => {
        const d = new Date(r.dtDateOut);
        if (d >= w.start && d <= now) {
          if (!byType[st].counts[w.label]) byType[st].counts[w.label] = { tats: [], count: 0 };
          byType[st].counts[w.label].tats.push(tat);
          byType[st].counts[w.label].count++;
        }
      });
    });
    const scopeTypes = Object.values(byType)
      .map(s => {
        const row = { type: s.type, totalCount: s.tats.length, avgTat: +(s.tats.reduce((a, b) => a + b, 0) / s.tats.length).toFixed(1) };
        windows.forEach(w => {
          const c = s.counts[w.label];
          row[w.label] = c ? { avgTat: +(c.tats.reduce((a, b) => a + b, 0) / c.tats.length).toFixed(1), count: c.count } : { avgTat: null, count: 0 };
        });
        return row;
      })
      .sort((a, b) => b.totalCount - a.totalCount)
      .slice(0, 15);

    return { matrix, scopeTypes, windows: windows.map(w => w.label) };
  });

  // ── Dashboard Flags (6) ─────────────────────────────
  route('GET', '/Flag/GetAllFlags', () => MockDB.getAll('flags'));
  route('GET', '/Flag/GetAllFlagTypes', () => MockDB.getAll('flagTypes'));
  route('GET', '/Flag/GetAllFlagLocations', () => MockDB.getAll('flagLocations'));
  route('GET', '/Flag/GetAllFlagLocationsUsed', () => MockDB.getAll('flagLocationsUsed'));
  route('GET', '/Flag/GetAllFlagInstrumentTypes', () => MockDB.getAll('flagInstrumentTypes'));
  route('GET', '/Flag/GetFlagsByType', (p) => {
    const typeKey = int(p.plFlagTypeKey);
    if (!typeKey) return MockDB.getAll('flags');
    return MockDB.getFiltered('flags', f => f.lFlagTypeKey === typeKey);
  });

  console.log('[MockAPI] ' + _routes.length + ' routes registered');

  // ── Public API ────────────────────────────────────────
  return {
    handleRequest,
    route,
  };
})();
