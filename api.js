// ═══════════════════════════════════════════════════════
//  TSI API Layer — handles auth, tokens, and all API calls
// ═══════════════════════════════════════════════════════

const API = (() => {
  // Change this ONE line when going to production
  // API supports CORS — call directly from any origin.
  // Netlify proxy is available as fallback at /api/* if needed.
  const BASE_URL = 'https://totalscopetestapi.mol-tech.com/api';

  // ── Token Management ──────────────────────────────────
  function getToken() {
    const token = localStorage.getItem('tsi_token');
    return token;
  }

  function isDemoMode() {
    return getToken() === 'demo';
  }

  function isMockMode() {
    return typeof MockAPI !== 'undefined' && typeof MockDB !== 'undefined';
  }

  function setToken(token) {
    localStorage.setItem('tsi_token', token);
  }

  function clearToken() {
    localStorage.removeItem('tsi_token');
    localStorage.removeItem('tsi_user');
  }

  function getUser() {
    const raw = localStorage.getItem('tsi_user');
    return raw ? JSON.parse(raw) : null;
  }

  function setUser(user) {
    localStorage.setItem('tsi_user', JSON.stringify(user));
  }

  function isLoggedIn() {
    return !!getToken();
  }

  // ── Auth Guard — call on every page load ──────────────
  // Redirects to login.html if no token. Pass skipRedirect=true to suppress.
  function requireAuth(skipRedirect) {
    if (!isLoggedIn()) {
      if (!skipRedirect) {
        window.location.href = 'login.html';
      }
      return false;
    }
    return true;
  }

  // ── Login ─────────────────────────────────────────────
  async function login(email, password) {
    // ── Mock mode: instant login ────────────────────────
    if (isMockMode()) {
      const mockUser = MockDB.getByKey('users', 2);
      const tokenStr = 'mock-token-' + Date.now();
      setToken(tokenStr);
      if (mockUser) setUser(mockUser);
      return { success: true, user: mockUser, data: { isAuthenticated: true, token: tokenStr, user: mockUser } };
    }

    const res = await fetch(BASE_URL + '/Authentication/UserLogin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        psEmailAddress: email,
        sPassword360: password
      })
    });

    const envelope = await res.json();

    // API wraps responses in { responseData: "JSON string", isEnType: false }
    // We need to parse responseData to get the actual payload
    let json;
    try {
      if (envelope.responseData && typeof envelope.responseData === 'string') {
        json = JSON.parse(envelope.responseData);
      } else if (envelope.statusCode !== undefined) {
        // Direct format (not wrapped)
        json = envelope;
      } else {
        json = envelope;
      }
    } catch (e) {
      return { success: false, message: 'Could not parse server response.' };
    }

    if (json.statusCode === 200 && json.data) {
      const d = json.data;
      console.log('[TSI Auth] Response data keys:', Object.keys(d));
      console.log('[TSI Auth] d.token type:', typeof d.token, 'value:', typeof d.token === 'object' ? JSON.stringify(d.token).substring(0,100) : String(d.token).substring(0,50));

      // Check authentication result
      if (d.isAuthenticated && d.token) {
        // token may be a string or an object like {token:"eyJ...", ...}
        const rawToken = (typeof d.token === 'object' && d.token.token) ? d.token.token : d.token;
        const tokenStr = typeof rawToken === 'string' ? rawToken : String(rawToken);
        setToken(tokenStr);
        if (d.user) setUser(d.user);
        console.log('[TSI Auth] Token stored, length:', tokenStr.length, 'type:', typeof tokenStr);
        console.log('[TSI Auth] User:', d.user?.sFirstName, d.user?.sLastName, 'Key:', d.user?.lUserKey);
        return { success: true, user: d.user, data: d };
      }

      // Also handle capitalized keys (Token.token / User) in case API varies
      const token = d.Token?.token || d.token;
      const user = d.User || d.user;
      if (token && typeof token === 'string' && token.length > 20) {
        setToken(token);
        if (user) setUser(user);
        return { success: true, user, data: d };
      }

      // 2FA required
      if (d.bIsTwoFactorAuthentication) {
        return { success: false, requires2FA: true, data: d };
      }

      // Not authenticated — return the API message
      return {
        success: false,
        message: d.message || json.message || 'Login failed. Check your credentials.'
      };
    }

    return {
      success: false,
      message: json.message || 'Login failed. Check your credentials.'
    };
  }

  // ── Logout ────────────────────────────────────────────
  function logout() {
    clearToken();
    window.location.href = 'login.html';
  }

  // ── Core Fetch Wrapper ────────────────────────────────
  // Handles token attachment, 401 detection, JSON parsing
  // When MockAPI is loaded, routes all calls through the mock layer.
  async function request(method, endpoint, body) {
    // ── Mock mode: bypass network entirely ──────────────
    if (isMockMode()) {
      return MockAPI.handleRequest(method, endpoint, body);
    }

    const token = getToken();
    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers['Authorization'] = 'Bearer ' + token;
    }

    const opts = { method, headers };
    if (body && (method === 'POST' || method === 'PUT')) {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(BASE_URL + endpoint, opts);

    // Token expired or invalid
    if (res.status === 401) {
      // Demo mode — don't redirect, just throw so pages can fall back to demo data
      if (isDemoMode()) {
        console.warn('[TSI API] 401 on', endpoint, '— demo mode, falling back');
        const err = new Error('Demo mode — no real API access');
        err.status = 401;
        throw err;
      }
      // Real token expired — redirect to login
      console.warn('[TSI API] 401 on', endpoint, '— token expired, redirecting');
      clearToken();
      window.location.href = 'login.html?expired=1';
      return;
    }

    const envelope = await res.json();

    // API wraps responses in { responseData: "JSON string", isEnType: false }
    let json;
    try {
      if (envelope.responseData && typeof envelope.responseData === 'string') {
        json = JSON.parse(envelope.responseData);
      } else if (envelope.statusCode !== undefined) {
        json = envelope;
      } else {
        json = envelope;
      }
    } catch (e) {
      throw new Error('Could not parse server response');
    }

    if (json.statusCode === 200) {
      const d = json.data;
      // Some paginated POST endpoints return { dataSource: [...], totalRecord: N }
      // instead of a plain array — unwrap it so callers always get an array.
      if (d && typeof d === 'object' && !Array.isArray(d) && Array.isArray(d.dataSource)) {
        return d.dataSource;
      }
      return d;
    }

    throw new Error(json.message || 'API request failed');
  }

  // ── Convenience Methods ───────────────────────────────
  function get(endpoint) {
    return request('GET', endpoint);
  }

  function post(endpoint, body) {
    return request('POST', endpoint, body);
  }

  function del(endpoint) {
    return request('DELETE', endpoint);
  }

  // ═══════════════════════════════════════════════════════
  //  Domain-Specific API Calls — ALL 49 Controllers
  //  Full coverage of BrightLogix .NET API (445 endpoints)
  // ═══════════════════════════════════════════════════════

  // ── Dashboard (1) ─────────────────────────────────────
  async function getDashboardScopes(filters) {
    const user = getUser();
    const defaults = {
      psRepairKeys: null, plUserKey: user?.lUserKey || null,
      plServiceLocationKey: filters?.plServiceLocationKey || 1,
      chkIncludeCogentix: false, chkIncludeTS: false, chkHotList: false,
      sRowFilter: null, instrumentTypeValue: 'F', diameterValue: 'all', inHouseValue: true
    };
    return post('/Dashboard/GetDashboardScopeDataList', { ...defaults, ...filters });
  }

  // ── DashBoardTask (6) ─────────────────────────────────
  async function getTasks(filters) { return post('/DashBoardTask/GetAllTaskList', filters); }
  async function addTask(data) { return post('/DashBoardTask/AddTask', data); }
  async function updateTask(data) { return post('/DashBoardTask/UpdateTasks', data); }
  async function deleteTask(taskKey) { return del('/DashBoardTask/DeleteTask?plTaskKey=' + taskKey); }
  async function getTaskStatuses(includeBlank, includeNotCompleted) { return get('/DashBoardTask/GetAllTaskStatus?pbIncludeBlank=' + (includeBlank||true) + '&pbIncludeNotCompleted=' + (includeNotCompleted||false)); }
  async function getTaskPriorities(includeBlank) { return get('/DashBoardTask/GetAllTaskPriorities?pbIncludeBlank=' + (includeBlank||true)); }

  // ── DashBoardTaskLoaner (4) ───────────────────────────
  async function addTaskLoaner(data) { return post('/DashBoardTaskLoaner/AddTaskLoaner', data); }
  async function updateTaskLoaner(data) { return post('/DashBoardTaskLoaner/UpdateTaskLoaner', data); }
  async function getTaskLoaners(taskKey, scopeTypeKey) { return get('/DashBoardTaskLoaner/GetAllTaskLoanerList?plTaskKey=' + taskKey + '&plTaskScopeTypeKey=' + (scopeTypeKey||0)); }
  async function deleteTaskLoaner(key) { return del('/DashBoardTaskLoaner/DeleteTaskLoaner?plTaskLoanerKey=' + key); }

  // ── DashboardTaskTypes (5) ────────────────────────────
  async function getTaskTypes() { return get('/DashboardTaskTypes/GetAllTaskTypeList'); }
  async function getTaskType() { return get('/DashboardTaskTypes/GetAllTaskType'); }

  // ── Client (7) ────────────────────────────────────────
  async function getAllClients(svcKey) { return get('/Client/GetAllClientList?plServiceLocationKey=' + (svcKey||1)); }
  async function getClientById(key) { return get('/Client/GetClientDetailsByClientId?plClientKey=' + key); }
  async function addClient(data) { return post('/Client/AddClient', data); }
  async function updateClient(data) { return post('/Client/UpdateClient', data); }
  async function deleteClient(key) { return del('/Client/DeleteClient?plClientKey=' + key); }
  async function getCityStateByZip(zip) { return get('/Client/GetCityStateUSA?zipCode=' + zip); }

  // ── Departments (8) ───────────────────────────────────
  async function getAllDepartments(svcKey) { return get('/Departments/GetAllDepartments?plServiceLocationKey=' + (svcKey||1)); }
  async function getDepartmentDetail(deptKey, clientKey) { return get('/Departments/GetDepartmentDetailsByDepartmentId?plDepartmentKey=' + deptKey + (clientKey ? '&plClientKey=' + clientKey : '')); }
  async function addDepartment(data) { return post('/Departments/AddDepartment', data); }
  async function updateDepartment(data) { return post('/Departments/UpdateDepartment', data); }
  async function deleteDepartment(key) { return del('/Departments/DeleteDepartment?plDepartmentKey=' + key); }

  // ── DepartmentReportingGroups (2) ─────────────────────
  async function getDepartmentGPOList(deptKey) { return get('/DepartmentReportingGroups/GetAllDepartmentGPOList?plDepartmentKey=' + deptKey); }

  // ── SubGroups (4) ─────────────────────────────────────
  async function getSubGroups(deptKey) { return get('/SubGroups/GetAllSubGroupsList?plDepartmentKey=' + deptKey); }
  async function getSubGroupsAvailable(deptKey) { return get('/SubGroups/GetAllSubGroupsAvailableList?plDepartmentKey=' + deptKey); }
  async function addDepartmentSubGroups(data) { return post('/SubGroups/AddDepartmentSubGroups', data); }
  async function deleteDepartmentSubGroups(key) { return del('/SubGroups/DeleteDepartmentSubGroups?plSubGroupKey=' + key); }

  // ── Contacts (4) ──────────────────────────────────────
  async function getContactsByClient(clientKey) { return get('/Contacts/GetContactsList?plContactKey=0&plClientKey=' + clientKey + '&plDepartmentKey=0&plDistributorKey=0'); }
  async function getContactsByDepartment(deptKey) { return get('/Contacts/GetAllContacts?plDepartmentKey=' + deptKey); }
  async function addContact(data) { return post('/Contacts/AddContacts', data); }
  async function updateContact(data) { return post('/Contacts/UpdateContacts', data); }

  // ── Scopes (14) — Device/instrument records ───────────
  async function getAllScopes(deptKey, isDead) { return get('/Scopes/GetAllScopes?plDepartmentKey=' + deptKey + (isDead ? '&psScopeIsDead=' + isDead : '')); }
  async function checkOpenRepairForScope(scopeKey) { return get('/Scopes/CheckOpenRepaireScope?plScopeKey=' + scopeKey); }
  async function addScope(data) { return post('/Scopes/AddScope', data); }
  async function deleteScope(scopeKey) { return del('/Scopes/DeleteScope?plScopeKey=' + scopeKey); }

  // ── ScopeType (6) — Department scope type assignments ─
  async function getScopeTypeNames(instrumentType) { return get('/ScopeType/GetscopeTypeNameList' + (instrumentType ? '?psInstrumentType=' + instrumentType : '')); }
  async function getDepartmentScopeTypes(deptKey) { return get('/ScopeType/GetDepartmentScopeTypesList?plDepartmentKey=' + deptKey); }
  async function getAvailableDepartmentScopeTypes(deptKey, desc) { return get('/ScopeType/GetAvailableDepartmentScopeTypesList?plDepartmentKey=' + deptKey + (desc ? '&psScopeTypeDesc=' + desc : '')); }
  async function addDepartmentScopeTypes(data) { return post('/ScopeType/AddDepartmentScopeTypes', data); }
  async function deleteDepartmentScopeTypes(key) { return del('/ScopeType/DeleteDepartmentScopeTypes?plScopeTypeKey=' + key); }
  async function deleteScopeTypes(key) { return del('/ScopeType/DeleteScopeTypes?plScopeTypeKey=' + key); }

  // ── ScopeModel (17) — Model/type master data ──────────
  async function getScopeModels(filters) { return post('/ScopeModel/GetAllScopeTypeList', filters); }
  async function addUpdateScopeType(data) { return post('/ScopeModel/AddUpdateScopeType', data); }
  async function getScopeTypeRepairItems(filters) { return post('/ScopeModel/GetScopeTypeRepairItem', filters); }

  // ── ModelMaxCharges (4) ───────────────────────────────
  async function getModelMaxCharges(deptKey) { return get('/ModelMaxCharges/GetAllModelMaxChargesList?plDepartmentKey=' + deptKey); }
  async function addModelMaxCharge(data) { return post('/ModelMaxCharges/AddModelMaxCharge', data); }
  async function updateModelMaxCharge(data) { return post('/ModelMaxCharges/UpdateModelMaxCharge', data); }
  async function deleteModelMaxCharge(scopeTypeKey, deptKey) { return del('/ModelMaxCharges/DeleteModelMaxCharge?plScopeTypeKey=' + scopeTypeKey + '&plDepartmentKey=' + deptKey); }

  // ── Repair (13) ──────────────────────────────────────
  async function getRepairList(svcKey, deptKey) { return get('/Repair/GetAllRepairs?plScopeKey=0&plDepartmentKey=' + (deptKey||0) + '&plServiceLocationKey=' + (svcKey||1)); }
  async function getRepairDetail(repairKey, svcKey) { return get('/Repair/GetAllrepairsBylRepairKey?plRepairKey=' + repairKey + '&plScopeKey=0&plDepartmentKey=0&plServiceLocationKey=' + (svcKey||1)); }
  async function getRepairReasons() { return get('/Repair/GetAllRepairReasons?plRepairReasonKey=0'); }
  async function getDeliveryMethods() { return get('/Repair/GetAllDeliveryMethods'); }
  async function getAllTechs() { return get('/Repair/GetAllTechs'); }
  async function getPatientSafetyLevels() { return get('/Repair/GetAllPatientSafetyLevels'); }
  // NOTE: AddRepair/UpdateRepair/DeleteRepair not yet in BrightLogix API (verified 2026-03-15).
  // These stubs are ready to work the moment MOL-Tech adds the endpoints.
  async function addRepair(data) { return post('/Repair/AddRepair', data); }
  async function updateRepair(data) { return post('/Repair/UpdateRepair', data); }
  async function deleteRepair(key) { return del('/Repair/DeleteRepair?plRepairKey=' + key); }

  // ── RepairItems (21) — Master catalog & pricing ───────
  async function getRepairItems(repairKey) { return post('/RepairItems/GetRepairItemsList', { plRepairKey: repairKey, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {} }); }
  async function getRepairItemsList(filters) { return post('/RepairItems/GetRepairItemsList', filters); }
  async function getRepairItemsCatalog(rigidOrFlexible) { return get('/RepairItems/GetAllRepairItems?psRigidOrFlexible=' + (rigidOrFlexible||'Flexible')); }
  async function getRepairItemDetail(key) { return get('/RepairItems/GetRepairItemsBylRepairItemKey?plRepairItemKey=' + key); }
  async function addRepairItem(data) { return post('/RepairItems/AddRepairItems', data); }
  async function updateRepairItem(data) { return post('/RepairItems/UpdateRepairItems', data); }
  async function deleteRepairItem(key) { return del('/RepairItems/DeleteRepairItems?plRepairItemKey=' + key); }
  async function getRepairLevels() { return get('/RepairItems/GetRepairLevels'); }
  async function getRepairStatuses() { return get('/RepairItems/GetRepairStatus'); }

  // ── Detail (8) — Repair line item transactions ────────
  async function getRepairDetailItems(repairKey) { return get('/Detail/GetAllRepairDetailsList?plRepairKey=' + repairKey); }
  // NOTE: AddRepairDetail/DeleteRepairDetail not yet in BrightLogix API (verified 2026-03-15).
  async function addRepairDetail(data) { return post('/Detail/AddRepairDetail', data); }

  // ── RepairInventory (3) ───────────────────────────────
  async function getRepairInventory(repairKey) { return get('/RepairInventory/GetAllRepairInventoryList?plRepairKey=' + repairKey); }
  // NOTE: Add/Delete not yet in BrightLogix API (verified 2026-03-15).
  async function addRepairInventory(data) { return post('/RepairInventory/AddRepairInventory', data); }

  // ── StatusTran (3) ────────────────────────────────────
  async function getRepairStatusHistory(repairKey) { return get('/StatusTran/GetAllRepairStatusesList?plRepairKey=' + repairKey); }
  // NOTE: Add/Update not yet in BrightLogix API (verified 2026-03-15).
  async function addRepairStatus(data) { return post('/StatusTran/AddRepairStatus', data); }

  // ── Inventory (48) ────────────────────────────────────
  async function getInventoryList(filters) { return post('/Inventory/GetAllInventoryList', { plInventoryKey: 0, pbIncludeInactive: false, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {}, ...filters }); }
  async function getInventorySizes(invKey, filters) { return post('/Inventory/GetAllInventorySizesList', { plInventoryKey: invKey, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {}, ...filters }); }
  async function addInventory(data) { return post('/Inventory/AddInventory', data); }

  // ── Supplier (11) ─────────────────────────────────────
  async function getSupplierById(key) { return get('/Supplier/GetSupplierBySupplierKey?plSupplierKey=' + key); }
  async function getSuppliers() { return get('/Supplier/GetAllSupplierList'); }
  async function addSupplier(data) { return post('/Supplier/AddSupplier', data); }
  async function updateSupplier(data) { return post('/Supplier/UpdateSupplier', data); }
  async function deleteSupplier(key) { return del('/Supplier/DeleteSupplier?plSupplierKey=' + key); }
  async function getSupplierRecentPOs(data) { return post('/Supplier/GetSupplierRecentPOsList', data); }
  async function getSuppliedItemAndSize(data) { return post('/Supplier/GetSuppliedItemAndSize', data); }
  async function getAvailableSuppliedItemAndSize(data) { return post('/Supplier/GetAvailableSuppliedItemAndSize', data); }

  // ── Acquisitions (3) ──────────────────────────────────
  async function getAcquisitionsSold(data) { return post('/Acquisitions/GetAcquisitionsSoldList', data); }
  async function getAcquisitionsInHouse(data) { return post('/Acquisitions/GetAcquisitionsInHouseList', data); }
  async function getAcquisitionsConsigned(data) { return post('/Acquisitions/GetAcquisitionsConsignedList', data); }

  // ── Product Sales (13) ────────────────────────────────
  async function searchProductSales(invoice, po, desc) { return get('/ProductSales/ProductSalesSearch?psInvoiceNumber=' + (invoice||'') + '&psPONumber=' + (po||'') + '&psDescription2=' + (desc||'')); }

  // ── Contract (101) ────────────────────────────────────
  async function getContractsList(data) { return post('/Contract/GetAllContractsList', data); }
  async function getContractById(key) { return get('/Contract/GetContractById?plContractKey=' + key); }
  async function addContract(data) { return post('/Contract/AddContract', data); }
  async function updateContract(data) { return post('/Contract/UpdateContract', data); }
  async function deleteContract(key) { return del('/Contract/DeleteContract?plContractKey=' + key); }
  async function getContractTypes(includeBlank) { return get('/Contract/GetAllContractType?pbIncludeBlank=' + (includeBlank||true)); }
  async function getContractServicePlanTerms(includeBlank) { return get('/Contract/GetAllContractServicePlanTerms?pbIncludeBlank=' + (includeBlank||true)); }
  async function getContractDepartments(key, contractKey, clientKey) { return get('/Contract/GetContractDepartments?plContractDepartmentKey=' + (key||0) + '&plContractKey=' + (contractKey||0) + '&plClientKey=' + (clientKey||0)); }
  async function getContractDepartmentsAvailable(contractKey) { return get('/Contract/GetContractDepartmentsAvailable?plContractKey=' + contractKey); }
  async function getContractScopes(data) { return post('/Contract/GetAllContractScopes', data); }
  async function getContractRepairsList(contractKey) { return get('/Contract/GetContractRepairsList?plContractKey=' + contractKey); }
  async function getContractAmendments(contractKey) { return get('/Contract/GetContractAmendmentsList?plContractKey=' + contractKey); }
  async function getContractCoverageCounts(contractKey) { return get('/Contract/GetAllContractCoverageCounts?plContractKey=' + contractKey); }
  async function getContractReportCard(contractKey) { return get('/Contract/GetContractReportCardDetails?plContractKey=' + contractKey); }
  async function getContractExpenseBreakdown(contractKey) { return get('/Contract/GetContractExpenseBreakdown?plContractKey=' + contractKey); }
  async function getContractInvoices(data) { return post('/Contract/GetAllContractInvoice', data); }
  async function getContractClients(includeInactive) { return get('/Contract/GetAllContractClient?pbIncludeInactive=' + (includeInactive||false)); }

  // ── PendingContract (23) ──────────────────────────────
  async function getPendingContracts(data) { return post('/PendingContract/GetPendingContractsList', data); }

  // ── Financials (19) ───────────────────────────────────
  async function getOutstandingInvoices(data) { return post('/Financials/GetOutstandingInvoicesList', data); }
  async function getGLAccounts() { return get('/Financials/GetAllGLAccounts'); }
  async function getClientsOnHold(data) { return post('/Financials/GetAllClientsOnHold', data); }
  async function clientUpdateOnHold(data) { return post('/Financials/clientUpdateOnHold', data); }
  async function getInvoicePayments(data) { return post('/Financials/GetAllInvoicePayments', data); }
  async function getDraftInvoices(data) { return post('/Financials/GetAllDraftInvoices', data); }
  async function deleteDraftInvoice(key) { return del('/Financials/DeleteDraftInvoice?plInvoiceKey=' + key); }

  // ── Documents (5) ─────────────────────────────────────
  async function getDocuments(ownerKey, catKey, catTypeKey) { let u = '/Documents/GetAllDocumentsList?plDocumentKey=0&plOwnerKey=' + ownerKey; if (catKey) u += '&plDocumentCategoryKey=' + catKey; if (catTypeKey) u += '&plDocumentCategoryTypeKey=' + catTypeKey; return get(u); }
  async function deleteDocument(key) { return del('/Documents/DeleteDocuments?plDocumentKey=' + key); }
  async function downloadDocument(keyOrName) { const param = typeof keyOrName === 'number' ? 'plDocumentKey=' + keyOrName : 'sDocumentFileName=' + encodeURIComponent(keyOrName); return get('/Documents/DownloadDocument?' + param); }

  // ── Flags (4) ─────────────────────────────────────────
  async function getFlagsByOwner(ownerKey, flagTypeKey) { return get('/Flag/GetFlagList?plOwnerKey=' + ownerKey + '&plFlagTypeKey=' + (flagTypeKey||0)); }
  async function addFlag(data) { return post('/Flag/AddFlag', data); }
  async function deleteFlag(key) { return del('/Flag/DeleteFlag?plFlagKey=' + key); }

  // ── Lookups / Reference ───────────────────────────────
  async function getAllSalesReps() { return get('/SalesRepNames/GetAllSalesRepNames'); }
  async function getAllPricingCategories(opts) { return get('/PricingCategory/GetAllPricingCategories' + (opts ? '?pbDefaultFirst=' + (opts.defaultFirst||false) + '&pbActiveOnly=' + (opts.activeOnly||false) : '')); }
  async function getAllPaymentTerms() { return get('/PaymentTerms/GetAllPaymentTerms'); }
  async function getAllCreditLimits() { return get('/CreditLimit/GetAllCreditLimits'); }
  async function getAllDistributors() { return get('/DistributorName/GetAllDistributorNames'); }
  async function getInstrumentTypes() { return get('/InstrumentType/GetInstrumentTypes'); }

  // ── UserManagement (8) ────────────────────────────────
  async function updateUser(data) { return post('/UserManagement/UpdateUser', data); }

  async function logout() {
    clearToken();
    window.location.href = 'login.html';
  }

  // ── UI Helpers (Topbar, Sidebar, Demo Mode) ───────────
  const UI = {
    init: function() {
      this.updateUserInfo();
      this.updateDemoBadge();
      this.setupNewOrderDropdown();
    },
    updateUserInfo: function() {
      const user = getUser();
      if (user) {
        const avatar = document.querySelector('.topbar-avatar');
        const welcome = document.querySelector('.topbar-welcome');
        if (avatar) avatar.textContent = (user.sFirstName?.[0] || '') + (user.sLastName?.[0] || '');
        if (welcome) welcome.innerHTML = 'Welcome back, <strong>' + (user.sFirstName || 'User') + '</strong>';
      }
    },
    updateDemoBadge: function(status) {
      const indicator = document.querySelector('.save-indicator') || document.getElementById('saveIndicator');
      if (!indicator) return;
      if (isMockMode()) {
        indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="10"/><path d="M8 12l2 2 4-4"/></svg> Mock Data';
        indicator.style.display = 'inline-flex';
        indicator.style.alignItems = 'center';
        indicator.style.color = '#93C5FD';
        indicator.style.fontSize = '11px';
        indicator.style.fontWeight = '600';
        return;
      }
      if (isDemoMode()) {
        indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg> Demo Data';
        indicator.style.display = 'inline-flex';
        indicator.style.alignItems = 'center';
        indicator.style.color = '#FDE68A';
        indicator.style.fontSize = '11px';
        indicator.style.fontWeight = '600';
      } else if (status === 'api') {
        indicator.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width:14px;height:14px;vertical-align:middle;margin-right:4px"><circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/></svg> Live Data';
        indicator.style.display = 'inline-flex';
        indicator.style.alignItems = 'center';
        indicator.style.color = '#A7F3D0';
        indicator.style.fontSize = '11px';
        indicator.style.fontWeight = '600';
      }
    },
    setupNewOrderDropdown: function() {
      document.addEventListener('click', function(e) {
        const menu = document.getElementById('newOrderMenu');
        if (menu && !e.target.closest('#newOrderWrap')) menu.classList.remove('open');
      });
    }
  };

  // ── DevelopmentList (13) — Dev todo tracker ───────────
  async function getDevTodoList(data) { return post('/DevelopmentList/GetDevelopmentTodoList', data); }
  async function addDevTodoItem(data) { return post('/DevelopmentList/AddDevelopmentTodoItem', data); }
  async function updateDevTodoStatus(data) { return post('/DevelopmentList/DevelopmentToDoUpdatedStatus', data); }
  async function getDevTodoDetails(id) { return get('/DevelopmentList/GetAllTodoDetails?plToDoID=' + id); }
  async function getDevTodoStatuses() { return get('/DevelopmentList/GetAllTodoStatuses'); }
  async function getDevTodoPriorities() { return get('/DevelopmentList/GetAllTodoPriorities'); }

  // ═══════════════════════════════════════════════════════
  //  Public Interface
  // ═══════════════════════════════════════════════════════
  return {
    // Auth & Core
    login, logout, isLoggedIn, requireAuth, getToken, getUser,
    get, post, del,
    UI,

    // Dashboard
    getDashboardScopes,

    // Tasks
    getTasks, addTask, updateTask, deleteTask,
    getTaskStatuses, getTaskPriorities,
    addTaskLoaner, updateTaskLoaner, getTaskLoaners, deleteTaskLoaner,
    getTaskTypes, getTaskType,

    // Clients
    getAllClients, getClientById, addClient, updateClient, deleteClient,
    getCityStateByZip,

    // Departments
    getAllDepartments, getDepartmentDetail, addDepartment, updateDepartment, deleteDepartment,
    getDepartmentGPOList,
    getSubGroups, getSubGroupsAvailable, addDepartmentSubGroups, deleteDepartmentSubGroups,

    // Contacts
    getContactsByClient, getContactsByDepartment, addContact, updateContact,

    // Scopes
    getAllScopes, checkOpenRepairForScope,
    addScope, deleteScope,

    // Scope Types
    getScopeTypeNames, getDepartmentScopeTypes, getAvailableDepartmentScopeTypes,
    addDepartmentScopeTypes, deleteDepartmentScopeTypes, deleteScopeTypes,

    // Scope Models
    getScopeModels, addUpdateScopeType,
    getScopeTypeRepairItems,

    // Model Max Charges
    getModelMaxCharges, addModelMaxCharge, updateModelMaxCharge, deleteModelMaxCharge,

    // Repairs
    getRepairList, getRepairDetail,
    getRepairReasons, getDeliveryMethods, getAllTechs,
    getPatientSafetyLevels,
    addRepair, updateRepair, deleteRepair,

    // Repair Items
    getRepairItems, getRepairItemsList, getRepairItemsCatalog, getRepairItemDetail,
    addRepairItem, updateRepairItem, deleteRepairItem,
    getRepairLevels, getRepairStatuses,

    // Repair Detail
    getRepairDetailItems,
    addRepairDetail,

    // Repair Inventory & Status
    getRepairInventory, addRepairInventory,
    getRepairStatusHistory, addRepairStatus,

    // Inventory
    getInventoryList, getInventorySizes,
    addInventory,

    // Suppliers
    getSupplierById, getSuppliers,
    addSupplier, updateSupplier, deleteSupplier,
    getSupplierRecentPOs,
    getSuppliedItemAndSize, getAvailableSuppliedItemAndSize,

    // Acquisitions
    getAcquisitionsSold, getAcquisitionsInHouse, getAcquisitionsConsigned,

    // Product Sales
    searchProductSales,

    // Contracts
    getContractsList, getContractById, addContract, updateContract, deleteContract,
    getContractTypes, getContractServicePlanTerms,
    getContractDepartments, getContractDepartmentsAvailable,
    getContractScopes,
    getContractRepairsList, getContractAmendments, getContractCoverageCounts,
    getContractReportCard, getContractExpenseBreakdown,
    getContractInvoices, getContractClients,

    // Pending Contracts
    getPendingContracts,

    // Financials
    getOutstandingInvoices,
    getGLAccounts,
    getClientsOnHold, clientUpdateOnHold,
    getInvoicePayments, getDraftInvoices, deleteDraftInvoice,

    // Documents
    getDocuments, deleteDocument, downloadDocument,

    // Flags
    getFlagsByOwner, addFlag, deleteFlag,

    // Lookups / Reference
    getAllSalesReps, getAllPricingCategories, getAllPaymentTerms,
    getAllCreditLimits, getAllDistributors,
    getInstrumentTypes,

    // User Management
    updateUser,

    // Dev Todo
    getDevTodoList, addDevTodoItem, updateDevTodoStatus, getDevTodoDetails,
    getDevTodoStatuses, getDevTodoPriorities,

    // Config
    BASE_URL,
    isDemoMode,
    isMockMode
  };
})();

// Close New Order dropdown when clicking outside it (runs on every page)
document.addEventListener('click', function(e) {
  var wrap = document.getElementById('newOrderWrap');
  var menu = document.getElementById('newOrderMenu');
  if (wrap && menu && !wrap.contains(e.target)) {
    menu.classList.remove('open');
  }
});
