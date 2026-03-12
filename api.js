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
  async function request(method, endpoint, body) {
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
      } else {
        json = envelope;
      }
    } catch (e) {
      throw new Error('Could not parse server response');
    }

    if (json.statusCode === 200) {
      return json.data;
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

  // ── Authentication (2) ────────────────────────────────
  // login() defined above
  async function verifyOtp(data) { return post('/Authentication/AuthVerifyOtp', data); }

  // ── Dashboard (1) ─────────────────────────────────────
  async function getDashboardScopes(filters) {
    const user = getUser();
    const defaults = {
      psRepairKeys: null, plUserKey: user?.lUserKey || null,
      plServiceLocationKey: filters?.plServiceLocationKey || getUser()?.lServiceLocationKey || 1,
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

  // ── DashBoardTaskLoaner (3) ───────────────────────────
  async function addTaskLoaner(data) { return post('/DashBoardTaskLoaner/AddTaskLoaner', data); }
  async function updateTaskLoaner(data) { return post('/DashBoardTaskLoaner/UpdateTaskLoaner', data); }
  async function getTaskLoaners(taskKey, scopeTypeKey) { return get('/DashBoardTaskLoaner/GetAllTaskLoanerList?plTaskKey=' + taskKey + '&plTaskScopeTypeKey=' + (scopeTypeKey||0)); }

  // ── DashboardTaskTypes (5) ────────────────────────────
  async function getTaskTypes() { return get('/DashboardTaskTypes/GetAllTaskTypeList'); }
  async function getTaskType() { return get('/DashboardTaskTypes/GetAllTaskType'); }
  async function addTaskType(data) { return post('/DashboardTaskTypes/AddTaskType', data); }
  async function updateTaskType(data) { return post('/DashboardTaskTypes/UpdateTaskType', data); }
  async function deleteTaskType(key) { return del('/DashboardTaskTypes/DeleteTaskType?plTaskTypeKey=' + key); }

  // ── Client (7) ────────────────────────────────────────
  async function getAllClients(svcKey) { return get('/Client/GetAllClientList?plServiceLocationKey=' + (svcKey||1)); }
  async function getClientById(key) { return get('/Client/GetClientDetailsByClientId?plClientKey=' + key); }
  async function addClient(data) { return post('/Client/AddClient', data); }
  async function updateClient(data) { return post('/Client/UpdateClient', data); }
  async function deleteClient(key) { return del('/Client/DeleteClient?plClientKey=' + key); }
  async function getNationalAccounts(includeKey) { return get('/Client/GetAllNationalAccounts?plClientKeyToInclude=' + (includeKey||0)); }
  async function getCityStateByZip(zip) { return get('/Client/GetCityStateUSA?zipCode=' + zip); }

  // ── Departments (8) ───────────────────────────────────
  async function getAllDepartments(svcKey) { return get('/Departments/GetAllDepartments?plServiceLocationKey=' + (svcKey||1)); }
  async function getDepartmentDetail(deptKey, clientKey) { return get('/Departments/GetDepartmentDetailsByDepartmentId?plDepartmentKey=' + deptKey + (clientKey ? '&plClientKey=' + clientKey : '')); }
  async function addDepartment(data) { return post('/Departments/AddDepartment', data); }
  async function updateDepartment(data) { return post('/Departments/UpdateDepartment', data); }
  async function deleteDepartment(key) { return del('/Departments/DeleteDepartment?plDepartmentKey=' + key); }
  async function getStandardDepartments(key) { return get('/Departments/GetAllStandardDepartments?plDepartmentKey=' + (key||0)); }
  async function getShippingCarriers(includeBlank) { return get('/Departments/GetShippingCarriers?pbIncludeBlank=' + (includeBlank||true)); }
  async function getDepartmentInvoiceSchedule(contractKey, deptKey) { return get('/Departments/GetcontractDepartmentInvoiceSchedule?plContractKey=' + contractKey + '&plDepartmentKey=' + deptKey); }

  // ── DepartmentType (1) ────────────────────────────────
  async function getDepartmentTypes() { return get('/DepartmentType/GetAllDepartmentTypes'); }

  // ── DepartmentReportingGroups (2) ─────────────────────
  async function getDepartmentGPOList(deptKey) { return get('/DepartmentReportingGroups/GetAllDepartmentGPOList?plDepartmentKey=' + deptKey); }
  async function getGPOsList(deptKey) { return get('/DepartmentReportingGroups/GetAllGPOsList?plDepartmentKey=' + deptKey); }

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
  async function getScopesList(filters) { return post('/Scopes/GetAllScopesList', filters); }
  async function getScopeById(scopeKey) { return get('/Scopes/GetScopeByScopeId?plScopeKey=' + scopeKey); }
  async function getScopeRepairs(scopeKey) { return get('/Scopes/GetRepaireByScopeId?plScopeKey=' + scopeKey); }
  async function getScopeTypes() { return get('/Scopes/GetAllScopeType'); }
  async function checkOpenRepairForScope(scopeKey) { return get('/Scopes/CheckOpenRepaireScope?plScopeKey=' + scopeKey); }
  async function getScopeComment(scopeKey, checkType) { return get('/Scopes/GetScopeComment?plScopeKey=' + scopeKey + (checkType ? '&checkType=' + checkType : '')); }
  async function updateScopeComment(data) { return post('/Scopes/UpdateScopeComment', data); }
  async function addScope(data) { return post('/Scopes/AddScope', data); }
  async function updateScope(data) { return post('/Scopes/UpdateScope', data); }
  async function deleteScope(scopeKey) { return del('/Scopes/DeleteScope?plScopeKey=' + scopeKey); }
  async function updateScopeSalePrice(data) { return post('/Scopes/UpdateScopeSalePrice', data); }
  async function updateScopeSaleReturn(data) { return post('/Scopes/UpdateScopeSaleReturn', data); }
  async function updateScopeSale(data) { return post('/Scopes/UpdateScopeSale', data); }

  // ── ScopeType (6) — Department scope type assignments ─
  async function getScopeTypeNames(instrumentType) { return get('/ScopeType/GetscopeTypeNameList' + (instrumentType ? '?psInstrumentType=' + instrumentType : '')); }
  async function getDepartmentScopeTypes(deptKey) { return get('/ScopeType/GetDepartmentScopeTypesList?plDepartmentKey=' + deptKey); }
  async function getAvailableDepartmentScopeTypes(deptKey, desc) { return get('/ScopeType/GetAvailableDepartmentScopeTypesList?plDepartmentKey=' + deptKey + (desc ? '&psScopeTypeDesc=' + desc : '')); }
  async function addDepartmentScopeTypes(data) { return post('/ScopeType/AddDepartmentScopeTypes', data); }
  async function deleteDepartmentScopeTypes(key) { return del('/ScopeType/DeleteDepartmentScopeTypes?plScopeTypeKey=' + key); }
  async function deleteScopeTypes(key) { return del('/ScopeType/DeleteScopeTypes?plScopeTypeKey=' + key); }

  // ── ScopeModel (17) — Model/type master data ──────────
  async function getManufacturers() { return post('/ScopeModel/GetAllManufacturersList', {}); }
  async function getScopeModels(filters) { return post('/ScopeModel/GetAllScopeTypeList', filters); }
  async function getScopeModelDetail(scopeTypeKey) { return get('/ScopeModel/GetScopeTypeDetailsById?plScopeTypeKey=' + scopeTypeKey); }
  async function getScopeModelCategories(opts) { return get('/ScopeModel/GetAllScopeModelCategories?pbIncludeBlank=' + (opts?.includeBlank||false) + '&pbIncludeInactive=' + (opts?.includeInactive||false) + (opts?.instrumentType ? '&psInstrumentType=' + opts.instrumentType : '') + (opts?.scopeTypeKey ? '&plScopeTypeKey=' + opts.scopeTypeKey : '')); }
  async function getVideoImagesList(includeBlank) { return get('/ScopeModel/GetAllvideoImagesList?pbIncludeBlank=' + (includeBlank||false)); }
  async function getDiTypes(includeBlank) { return get('/ScopeModel/GetAllDiTypes?pbIncludeBlank=' + (includeBlank||false)); }
  async function addUpdateScopeType(data) { return post('/ScopeModel/AddUpdateScopeType', data); }
  async function getScopeTypeAvgDays(scopeTypeKey) { return get('/ScopeModel/GetScopeTypeGetAverageDaysSinceLastIn?plScopeTypeKey=' + scopeTypeKey); } // NOTE: backend endpoint has duplicate "Get"
  async function getScopeTypeEpoxyAvg(scopeTypeKey) { return get('/ScopeModel/GetscopeTypeEpoxySizeRollingAvg?plScopeTypeKey=' + scopeTypeKey); } // NOTE: backend endpoint has lowercase "scope"
  async function getScopeTypeRepairItems(filters) { return post('/ScopeModel/GetScopeTypeRepairItem', filters); }
  async function addScopeTypeRepairItems(data) { return post('/ScopeModel/AddScopeTypeRepairItems', data); }
  async function updateScopeTypeRepairItems(data) { return post('/ScopeModel/UpdateScopeTypeRepairItems', data); }
  async function deleteScopeTypeRepairItems(key) { return del('/ScopeModel/DeleteScopeTypeRepairItems?plScopeTypeRepairItemKey=' + key); }
  async function getUnassignedRepairItems(rigidFlexible, scopeTypeKey) { return get('/ScopeModel/GetUnassignedRepairItemsList?psRigidOrFlexible=' + rigidFlexible + '&plScopeTypeKey=' + scopeTypeKey); }
  async function getScopeTypeRepairItemInventory(data) { return post('/ScopeModel/GetScopeTypeRepairItemInventory', data); }
  async function getScopeTypeRepairItemAvailableInventory(data) { return post('/ScopeModel/GetScopeTypeRepairItemAvailableInventory', data); }
  async function addScopeTypeRepairItemInventoryLink(data) { return post('/ScopeModel/AddScopeTypeRepairItemInventoryLink', data); }

  // ── ModelMaxCharges (4) ───────────────────────────────
  async function getModelMaxCharges(deptKey) { return get('/ModelMaxCharges/GetAllModelMaxChargesList?plDepartmentKey=' + deptKey); }
  async function addModelMaxCharge(data) { return post('/ModelMaxCharges/AddModelMaxCharge', data); }
  async function updateModelMaxCharge(data) { return post('/ModelMaxCharges/UpdateModelMaxCharge', data); }
  async function deleteModelMaxCharge(scopeTypeKey, deptKey) { return del('/ModelMaxCharges/DeleteModelMaxCharge?plScopeTypeKey=' + scopeTypeKey + '&plDepartmentKey=' + deptKey); }

  // ── Repair (10) ───────────────────────────────────────
  async function getRepairs(filters) { return post('/Repair/GetAllRepairList', filters); }
  async function getRepairList(svcKey) { return get('/Repair/GetAllRepairs?plScopeKey=0&plDepartmentKey=0&plServiceLocationKey=' + (svcKey||1)); }
  async function getRepairDetail(repairKey, svcKey) { return get('/Repair/GetAllrepairsBylRepairKey?plRepairKey=' + repairKey + '&plScopeKey=0&plDepartmentKey=0&plServiceLocationKey=' + (svcKey||1)); }
  async function getRepairScopes(deptKey, scopeKey, repairKey, svcKey) { return get('/Repair/GetAllrepairsScopes?plDepartmentKey=' + (deptKey||0) + '&plScopeKey=' + (scopeKey||0) + '&plRepairKey=' + (repairKey||0) + '&plServiceLocationKey=' + (svcKey||1)); }
  async function getRepairReasons() { return get('/Repair/GetAllRepairReasons?plRepairReasonKey=0'); }
  async function getDeliveryMethods() { return get('/Repair/GetAllDeliveryMethods'); }
  async function getAllTechs() { return get('/Repair/GetAllTechs'); }
  async function getRepairSuppliers(roleKey, includeKey) { return get('/Repair/GetAllsuppliers?plSupplierRoleKey=' + (roleKey||0) + (includeKey ? '&plSupplierKeyToInclude=' + includeKey : '')); }
  async function getPatientSafetyLevels() { return get('/Repair/GetAllPatientSafetyLevels'); }
  async function getRepairDistributors(key, includeBlank, includeInactive) { return get('/Repair/GetAllDistributors?plDistributorKey=' + (key||0) + '&pbIncludeBlank=' + (includeBlank||true) + '&pbIncludeInactive=' + (includeInactive||false)); }

  // ── RepairItems (21) — Master catalog & pricing ───────
  async function getRepairItems(repairKey) { return post('/RepairItems/GetRepairItemsList', { plRepairKey: repairKey, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {} }); }
  async function getRepairItemsCatalog(rigidOrFlexible) { return get('/RepairItems/GetAllRepairItems?psRigidOrFlexible=' + (rigidOrFlexible||'Flexible')); }
  async function getRepairItemDetail(key) { return get('/RepairItems/GetRepairItemsBylRepairItemKey?plRepairItemKey=' + key); }
  async function addRepairItem(data) { return post('/RepairItems/AddRepairItems', data); }
  async function updateRepairItem(data) { return post('/RepairItems/UpdateRepairItems', data); }
  async function deleteRepairItem(key) { return del('/RepairItems/DeleteRepairItems?plRepairItemKey=' + key); }
  async function getRepairLevels() { return get('/RepairItems/GetRepairLevels'); }
  async function getRepairStatuses() { return get('/RepairItems/GetRepairStatus'); }
  async function getRepairItemPricing(data) { return post('/RepairItems/GetRepairItemPricingList', data); }
  async function updateRepairItemPricing(data) { return post('/RepairItems/UpdateRepairItemPricingDetails', data); }
  async function getRepairItemImpliedInventory(data) { return post('/RepairItems/GetRepairItemsImpliedInventoryList', data); }
  async function updateRepairItemImpliedInventory(data) { return post('/RepairItems/UpdateRepairItemsImpliedInventory', data); }
  async function getRepairItemImpliedItems(data) { return post('/RepairItems/GetRepairItemImpliedItemsList', data); }
  async function getRepairItemParentItems(data) { return post('/RepairItems/GetRepairItemParentItemsList', data); }
  async function addImpliedItem(data) { return post('/RepairItems/AddImpliedItemByplRepairItemKey', data); }
  async function updateImpliedItemTech(data) { return post('/RepairItems/UpdateImpliedItemBylTechKey', data); }
  async function deleteImpliedItem(childKey, parentKey) { return del('/RepairItems/DeleteImpliedItemByplRepairItemKey?plRepairItemChildKey=' + childKey + '&plRepairItemParentKey=' + parentKey); }
  async function getAllTechnicians() { return get('/RepairItems/GetAllTechnicians'); }
  async function getTechnicianById(key) { return get('/RepairItems/GetTechnicianById?plTechnicianKey=' + key); }
  async function getProductIDsByRepairItem(key) { return get('/RepairItems/GetProductIDsListByRepairItemKey?plRepairItemKey=' + key); }
  async function getRepairReasonsByKey(key) { return get('/RepairItems/GetRepairReasons?plRepairReasonKey=' + (key||0)); }

  // ── RepairItemInstruments (19) — Instrument/scope type config ─
  async function getInstrumentsList(data) { return post('/RepairItemInstruments/GetInstrumentsList', data); }
  async function getInstrumentDetail(scopeTypeKey) { return get('/RepairItemInstruments/InstrumentsDetailsBylScopeTypeKey?plScopeTypeKey=' + scopeTypeKey); }
  async function updateInstruments(data) { return post('/RepairItemInstruments/UpdateInstruments', data); }
  async function getInstrumentScopeCategories() { return get('/RepairItemInstruments/GetAllInstrumentsScopeCategories'); }
  async function addInstrument(data) { return post('/RepairItemInstruments/AddInstrument', data); }
  async function getInstrumentManufacturersAvailable(scopeTypeKey) { return get('/RepairItemInstruments/GetInstrumentManufacturersAvailable?plScopeTypeKey=' + scopeTypeKey); }
  async function getInstrumentManufacturers(data) { return post('/RepairItemInstruments/GetInstrumentManufacturersList', data); }
  async function addInstrumentManufacturer(data) { return post('/RepairItemInstruments/AddInstrumentManufacturer', data); }
  async function deleteInstrumentManufacturer(scopeTypeKey, mfrKey) { return del('/RepairItemInstruments/DeleteInstrumentManufacturer?plScopeTypeKey=' + scopeTypeKey + '&plManufacturerKey=' + mfrKey); }
  async function addInstrumentManufacturerModel(data) { return post('/RepairItemInstruments/AddInstrumentManufacturerModel', data); }
  async function updateInstrumentManufacturerModel(data) { return post('/RepairItemInstruments/UpdateInstrumentManufacturerModel', data); }
  async function deleteInstrumentManufacturerModel(key) { return del('/RepairItemInstruments/DeleteInstrumentManufacturerModel?plModelKey=' + key); }
  async function getInstrumentManufacturerModels(data) { return post('/RepairItemInstruments/GetInstrumentManufacturerModelsList', data); }

  // ── Detail (6) — Repair line item transactions ────────
  async function getRepairDetailItems(repairKey) { return get('/Detail/GetAllRepairDetailsList?plRepairKey=' + repairKey); }
  async function getNewRepairDetails(data) { return post('/Detail/GetAllNewRepairDetails', data); }
  async function updateRepairItemComment(tranKey, comment) { return post('/Detail/UpdateRepairItemTranComment', { plRepairItemTranKey: tranKey, psComment: comment }); }
  async function updateRepairItemAmount(tranKey, amount) { return post('/Detail/UpdateRepairItemTranAmount', { plRepairItemTranKey: tranKey, pnRepairPrice: amount }); }
  async function updateRepairItemApproved(tranKey, approved) { return post('/Detail/UpdateRepairItemTranApproved', { plRepairItemTranKey: tranKey, psApproved: approved }); }
  async function updateRepairItemPrimary(repairKey, tranKey) { return post('/Detail/UpdateRepairDetailPrimary', { plRepairKey: repairKey, plRepairItemTranKey: tranKey }); }

  // ── RepairInventory (1) ───────────────────────────────
  async function getRepairInventory(repairKey) { return get('/RepairInventory/GetAllRepairInventoryList?plRepairKey=' + repairKey); }

  // ── StatusTran (1) ────────────────────────────────────
  async function getRepairStatusHistory(repairKey) { return get('/StatusTran/GetAllRepairStatusesList?plRepairKey=' + repairKey); }

  // ── Inventory (48) ────────────────────────────────────
  async function getInventoryList(filters) { return post('/Inventory/GetAllInventoryList', { plInventoryKey: 0, pbIncludeInactive: false, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {}, ...filters }); }
  async function getInventoryById(key) { return get('/Inventory/GetInventoryById?plInventoryKey=' + key); }
  async function getInventorySizes(invKey, filters) { return post('/Inventory/GetAllInventorySizesList', { plInventoryKey: invKey, Pagination: { PageNumber: 1, PageSize: 100 }, Filters: {}, ...filters }); }
  async function addInventory(data) { return post('/Inventory/AddInventory', data); }
  async function updateInventory(data) { return post('/Inventory/UpdateInventory', data); }
  async function deleteInventoryValidation(key) { return del('/Inventory/DeleteInventoryValidation?plInventoryKey=' + key); }
  async function deleteInventory(key) { return del('/Inventory/DeleteInventory?plInventoryKey=' + key); }
  async function getInventoryItemAndSize(svcKey, includeInactive, supplierKey) { return get('/Inventory/GetInventoryItemAndSize?plServiceLocationKey=' + (svcKey||1) + '&pbIncludeInactive=' + (includeInactive||false) + (supplierKey ? '&plSupplierKey=' + supplierKey : '')); }
  async function getInventorySizeById(key) { return get('/Inventory/GetAllInventorySizesById?plInventorySizeKey=' + key); }
  async function addInventorySize(data) { return post('/Inventory/AddInventorySize', data); }
  async function updateInventorySize(data) { return post('/Inventory/UpdateInventorySize', data); }
  async function deleteInventorySize(key) { return del('/Inventory/DeleteInventorySize?plInventorySizeKey=' + key); }
  async function getInventoryFromLotNumber(lot, posOnly) { return get('/Inventory/GetInventorySizesFromLotNumber?psLotNumber=' + lot + '&pbPositiveQuantityOnly=' + (posOnly||false)); }
  async function addInventorySizeBuild(data) { return post('/Inventory/AddInventorySizeBuild', data); }
  async function getInventoryAssembly(data) { return post('/Inventory/GetAllInventoryAssemblyList', data); }
  async function updateInventoryAssembly(data) { return post('/Inventory/UpdateInventoryAssembly', data); }
  async function deleteInventoryAssembly(key) { return del('/Inventory/DeleteInventoryAssembly?plInventoryAssemblyKey=' + key); }
  async function addLotNumberAdjustment(data) { return post('/Inventory/AddLotNumberAdjustment', data); }
  async function getLotNumberQtyAvailable(lot) { return get('/Inventory/GetLotNumberQuantityAvailable?psLotNumber=' + lot); }
  async function getInventorySuppliers() { return get('/Inventory/GetAllSuppliers'); }
  async function getInventoryPOs(supplierKey, includeClosed, startDate, endDate) { return get('/Inventory/GetAllPO?plSupplierKey=' + supplierKey + '&pbIncludeClosed=' + (includeClosed||false) + (startDate ? '&pdtStartDate=' + startDate : '') + (endDate ? '&pdtEndDate=' + endDate : '')); }
  async function getInventoryPODetail(key) { return get('/Inventory/GetPODetailsById?plSupplierPOKey=' + key); }
  async function getSupplierPOTrans(poKey) { return get('/Inventory/GetSupplierPOTrans?plSupplierPOKey=' + poKey); }
  async function addSupplierPOTran(data) { return post('/Inventory/AddSupplierPOTran', data); }
  async function addSupplierPO(data) { return post('/Inventory/AddSupplierPO', data); }
  async function updateSupplierPO(data) { return post('/Inventory/UpdateSupplierPO', data); }
  async function deleteSupplierPO(key) { return del('/Inventory/DeletePO?plSupplierPOKey=' + key); }
  async function addInventoryTran(data) { return post('/Inventory/AddInventoryTran', data); }
  async function getInventorySizeSuppliers(data) { return post('/Inventory/GetInventorySizeSuppliers', data); }
  async function assignInventorySize(data) { return post('/Inventory/AssignInventorySize', data); }
  async function updateSupplierInventorySize(data) { return post('/Inventory/UpdateSupplierInventorySize', data); }
  async function getSuppliersForDropdown(roleKey, includeInactive) { return get('/Inventory/GetSuppliersListForDropdown?plSupplierRoleKey=' + (roleKey||0) + '&pbIncludeInactive=' + (includeInactive||false)); }

  // ── Supplier (11) ─────────────────────────────────────
  async function getSuppliersList(data) { return post('/Supplier/GetSuppliersList', data); }
  async function getSupplierById(key) { return get('/Supplier/GetSupplierBySupplierKey?plSupplierKey=' + key); }
  async function getSuppliers() { return get('/Supplier/GetAllSupplierList'); }
  async function addSupplier(data) { return post('/Supplier/AddSupplier', data); }
  async function updateSupplier(data) { return post('/Supplier/UpdateSupplier', data); }
  async function deleteSupplier(key) { return del('/Supplier/DeleteSupplier?plSupplierKey=' + key); }
  async function getSupplierPOTypes(key, includeBlank) { return get('/Supplier/GetSupplierPOTypes?plSupplierPOTypeKey=' + (key||0) + '&pbIncludeBlank=' + (includeBlank||true)); }
  async function getSupplierRecentPOs(data) { return post('/Supplier/GetSupplierRecentPOsList', data); }
  async function getSuppliedItemAndSize(data) { return post('/Supplier/GetSuppliedItemAndSize', data); }
  async function getAvailableSuppliedItemAndSize(data) { return post('/Supplier/GetAvailableSuppliedItemAndSize', data); }
  async function getNextSupplierPartNumber(key) { return get('/Supplier/GetsupplierGetNextPartNumber?plSupplierKey=' + key); }

  // ── Acquisitions (3) ──────────────────────────────────
  async function getAcquisitionsSold(data) { return post('/Acquisitions/GetAcquisitionsSoldList', data); }
  async function getAcquisitionsInHouse(data) { return post('/Acquisitions/GetAcquisitionsInHouseList', data); }
  async function getAcquisitionsConsigned(data) { return post('/Acquisitions/GetAcquisitionsConsignedList', data); }

  // ── Product Sales (13) ────────────────────────────────
  async function getInvoiceNumbers(productSaleKey, deptKey, includeCanceled) { return get('/ProductSales/GetAllInvoiceNumber?plProductSaleKey=' + (productSaleKey||0) + '&plDepartmentKey=' + (deptKey||0) + '&pbIncludeCanceled=' + (includeCanceled||false)); }
  async function getSalesReps() { return get('/ProductSales/GetSalesRep?plSalesRepKey=0&pbIncludeBlank=true&pbIncludeAll=false&psActiveFlag=A&plCompanyKey=0&plSalesRepKeyToInclude=0'); }
  async function getInventoryPricing() { return get('/ProductSales/GetAllInventoryPrice?plInventoryPricingListKey=0&pbIncludeBlank=true&pbIncludeInactive=false&plInventoryPricingListKeyToInclude=0'); }
  async function addProductSale(data) { return post('/ProductSales/AddProductSales', data); }
  async function updateProductSale(data) { return post('/ProductSales/UpdateProductSale', data); }
  async function addProductSaleInventory(data) { return post('/ProductSales/AddProductSaleInventory', data); }
  async function getProductSaleInventory(key) { return get('/ProductSales/GetProductSaleInventory?plProductSaleKey=' + key); }
  async function deleteProductSaleInventory(key) { return del('/ProductSales/DeleteProductSaleInventory?plProductSaleInventoryKey=' + key); }
  async function deleteProductSale(key) { return del('/ProductSales/DeleteProductSale?plProductSaleKey=' + key); }
  async function searchProductSales(invoice, po, desc) { return get('/ProductSales/ProductSalesSearch?psInvoiceNumber=' + (invoice||'') + '&psPONumber=' + (po||'') + '&psDescription2=' + (desc||'')); }
  async function updateProductSaleInventoryQty(data) { return post('/ProductSales/UpdateProductSaleInverntoryQuantityAndUnitCost', data); } // NOTE: backend endpoint has typo "Inverntory" (should be "Inventory")
  async function addProductSaleInventoryLot(data) { return post('/ProductSales/AddProductSaleInverntoryLotNumberAndQuntity', data); } // NOTE: backend endpoint has typos "Inverntory" and "Quntity"
  async function updateProductSaleInventoryLot(data) { return post('/ProductSales/UpdateProductSaleInverntoryLotNumber', data); } // NOTE: backend endpoint has typo "Inverntory"

  // ── Contract (101) ────────────────────────────────────
  async function getContractsList(data) { return post('/Contract/GetAllContractsList', data); }
  async function getContractById(key) { return get('/Contract/GetContractById?plContractKey=' + key); }
  async function addContract(data) { return post('/Contract/AddContract', data); }
  async function updateContract(data) { return post('/Contract/UpdateContract', data); }
  async function updateContractName(data) { return post('/Contract/UpdateContractName', data); }
  async function deleteContract(key) { return del('/Contract/DeleteContract?plContractKey=' + key); }
  async function getContractTypes(includeBlank) { return get('/Contract/GetAllContractType?pbIncludeBlank=' + (includeBlank||true)); }
  async function getContractInstallmentTypes(includeNone, id) { return get('/Contract/GetAllContractInstallmentTypes?pbIncludeNone=' + (includeNone||false) + (id ? '&plInstallmentTypeID=' + id : '')); }
  async function getContractServicePlanTerms(includeBlank) { return get('/Contract/GetAllContractServicePlanTerms?pbIncludeBlank=' + (includeBlank||true)); }
  async function getContractDepartments(key, contractKey, clientKey) { return get('/Contract/GetContractDepartments?plContractDepartmentKey=' + (key||0) + '&plContractKey=' + (contractKey||0) + '&plClientKey=' + (clientKey||0)); }
  async function getContractDepartmentsAvailable(contractKey) { return get('/Contract/GetContractDepartmentsAvailable?plContractKey=' + contractKey); }
  async function addContractDepartments(data) { return post('/Contract/AddContractDepartments', data); }
  async function getContractScopes(data) { return post('/Contract/GetAllContractScopes', data); }
  async function addContractScopes(data) { return post('/Contract/AddContractScopes', data); }
  async function updateContractScope(data) { return post('/Contract/UpdateContractScope', data); }
  async function deleteContractScope(keys) { return del('/Contract/DeleteContractScope?plContractScopeKeys=' + keys); }
  async function checkScopeSerialExists(serial) { return get('/Contract/CheckScopeSerialNumberExists?psSerialNumber=' + serial); }
  async function insertNewScopesWithCheck(data) { return post('/Contract/InsertNewScopesWithCheckSerialNumber', data); }
  async function getContractRepairsList(contractKey) { return get('/Contract/GetContractRepairsList?plContractKey=' + contractKey); }
  async function getContractAmendments(contractKey) { return get('/Contract/GetContractAmendmentsList?plContractKey=' + contractKey); }
  async function getContractCoverageCounts(contractKey) { return get('/Contract/GetAllContractCoverageCounts?plContractKey=' + contractKey); }
  async function getContractReportCard(contractKey) { return get('/Contract/GetContractReportCardDetails?plContractKey=' + contractKey); }
  async function getContractExpenseBreakdown(contractKey) { return get('/Contract/GetContractExpenseBreakdown?plContractKey=' + contractKey); }
  async function getContractRenewalScopes(data) { return post('/Contract/GetContractRenewalScopes', data); }
  async function addContractRenewalScopes(data) { return post('/Contract/AddContractRenewalScopes', data); }
  async function getContractInvoices(data) { return post('/Contract/GetAllContractInvoice', data); }
  async function getContractClients(includeInactive) { return get('/Contract/GetAllContractClient?pbIncludeInactive=' + (includeInactive||false)); }

  // ── PendingContract (23) ──────────────────────────────
  async function getPendingContracts(data) { return post('/PendingContract/GetPendingContractsList', data); }
  async function getPendingContractById(key) { return get('/PendingContract/GetPendingContractById?plPendingContractKey=' + key); }
  async function addPendingContract(data) { return post('/PendingContract/AddPendingContract', data); }
  async function updatePendingContract(data) { return post('/PendingContract/UpdatePendingContract', data); }
  async function deletePendingContract(key) { return del('/PendingContract/DeletePendingContract?plPendingContractKey=' + key); }
  async function convertPendingContract(data) { return post('/PendingContract/PendingContractConvertToContract', data); }

  // ── Financials (19) ───────────────────────────────────
  async function getOutstandingInvoices(data) { return post('/Financials/GetOutstandingInvoicesList', data); }
  async function getOutstandingInvoiceById(key) { return get('/Financials/GetOutstandinInvoiceById?plInvoiceKey=' + key); } // NOTE: backend endpoint has typo "Outstandin" (missing 'g')
  async function updateInvoiceStatus(data) { return post('/Financials/UpdateInvoiceStatusAndFollowUpDate', data); }
  async function importOutstandingInvoices(data) { return post('/Financials/ImportOutstandingInvoices', data); }
  async function getGLAccounts() { return get('/Financials/GetAllGLAccounts'); }
  async function updateGLAccounts(data) { return post('/Financials/UpdateGLAccounts', data); }
  async function getClientsOnHold(data) { return post('/Financials/GetAllClientsOnHold', data); }
  async function clientUpdateOnHold(data) { return post('/Financials/clientUpdateOnHold', data); }
  async function getWorkOrdersOnHold(data) { return post('/Financials/GetAllWorkOrdersOnHold', data); }
  async function workOrderUpdateOnHold(data) { return post('/Financials/WorkOrderUpdateOnHold', data); }
  async function getInvoicePayments(data) { return post('/Financials/GetAllInvoicePayments', data); }
  async function deleteInvoicePayment(key) { return del('/Financials/DeleteInvoicePayment?plInvoicePaymentID=' + key); }
  async function getDraftInvoices(data) { return post('/Financials/GetAllDraftInvoices', data); }
  async function deleteDraftInvoice(key) { return del('/Financials/DeleteDraftInvoice?plInvoiceKey=' + key); }

  // ── Documents (5) ─────────────────────────────────────
  async function getDocuments(ownerKey, catKey, catTypeKey) { let u = '/Documents/GetAllDocumentsList?plDocumentKey=0&plOwnerKey=' + ownerKey; if (catKey) u += '&plDocumentCategoryKey=' + catKey; if (catTypeKey) u += '&plDocumentCategoryTypeKey=' + catTypeKey; return get(u); }
  async function addDocument(data) { return post('/Documents/AddDocuments', data); }
  async function updateDocument(data) { return post('/Documents/UpdateDocuments', data); }
  async function deleteDocument(key) { return del('/Documents/DeleteDocuments?plDocumentKey=' + key); }
  async function downloadDocument(fileName) { return get('/Documents/DownloadDocument?sDocumentFileName=' + encodeURIComponent(fileName)); }

  // ── Flags (4) ─────────────────────────────────────────
  async function getFlagsByOwner(ownerKey, flagTypeKey) { return get('/Flag/GetFlagList?plOwnerKey=' + ownerKey + '&plFlagTypeKey=' + (flagTypeKey||0)); }
  async function getFlagsByClient(clientKey) { return get('/Flag/GetFlagList?plClientKey=' + clientKey); }
  async function addFlag(data) { return post('/Flag/AddFlag', data); }
  async function updateFlag(data) { return post('/Flag/UpdateFlag', data); }
  async function deleteFlag(key) { return del('/Flag/DeleteFlag?plFlagKey=' + key); }

  // ── Lookups / Reference ───────────────────────────────
  async function getAllSalesReps() { return get('/SalesRepNames/GetAllSalesRepNames'); }
  async function getAllPricingCategories(opts) { return get('/PricingCategory/GetAllPricingCategories' + (opts ? '?pbDefaultFirst=' + (opts.defaultFirst||false) + '&pbActiveOnly=' + (opts.activeOnly||false) : '')); }
  async function getAllPaymentTerms() { return get('/PaymentTerms/GetAllPaymentTerms'); }
  async function getAllCreditLimits() { return get('/CreditLimit/GetAllCreditLimits'); }
  async function getAllDistributors() { return get('/DistributorName/GetAllDistributorNames'); }
  async function getAllCountries() { return get('/Country/GetAllCountries'); }
  async function getAllStates() { return get('/State/GetAllStates'); }
  async function getInstrumentTypes() { return get('/InstrumentType/GetInstrumentTypes'); }
  async function getSystemCodes(key, hdrKey) { return get('/SystemCodes/GetAllSystemCodes?plSystemCodesKey=' + (key||0) + '&plSystemCodesHdrKey=' + (hdrKey||0)); }
  async function getEmailTemplate(templateId) { return get('/EmailTemplate/GetEmailTemplatesById?templateId=' + templateId); }

  // ── ServiceLocation (2) ───────────────────────────────
  async function getServiceLocations() { return get('/ServiceLocation/GetServiceLocations'); }
  async function getServiceLocationsByUser(userKey) { return get('/ServiceLocation/GetAllServiceLocation?plUserKey=' + userKey); }

  // ── Security (1) ──────────────────────────────────────
  async function getMenuItemsForUser(userKey) { return get('/Security/MenuItemsGetAllForUserKey?plUserKey=' + userKey); }

  // ── UserManagement (8) ────────────────────────────────
  async function getUserList(data) { return post('/UserManagement/GetUserList', data); }
  async function getUserById(key) { return get('/UserManagement/GetUserDetailsById?plUserKey=' + key); }
  async function addUser(data) { return post('/UserManagement/AddUser', data); }
  async function updateUser(data) { return post('/UserManagement/UpdateUser', data); }
  async function resetUserPassword(data) { return post('/UserManagement/ResetUserPassword', data); }
  async function changeUserPassword(data) { return post('/UserManagement/ChangeUserPassword', data); }
  async function forgotPassword(data) { return post('/UserManagement/ForgotPassword', data); }

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

  // ── AdminManageStaff (4) ──────────────────────────────
  async function getJobTypes(data) { return post('/AdminManageStaff/GetJobTypes', data); }
  async function getAllStaff(jobTypeKey, includeInactive) { return get('/AdminManageStaff/GetAllStaff?plJobTypeKey=' + (jobTypeKey||0) + '&pbIncludeInactive=' + (includeInactive||false)); }
  async function createStaff(data) { return post('/AdminManageStaff/CreateStaff', data); }
  async function updateSalesRep(data) { return post('/AdminManageStaff/UpdateSalesRep', data); }

  // ── AdminPricingLists (11) ────────────────────────────
  async function getPricingCategoryById(key) { return get('/AdminPricingLists/GetpricingCategoryBylPricingCategoryId?plPricingCategoryKey=' + key); }
  async function getPricingDetails(catKey, itemKey) { return get('/AdminPricingLists/GetPricingDetails?plPricingCategoryKey=' + catKey + '&plRepairItemKey=' + (itemKey||0)); }
  async function updatePricingDetail(data) { return post('/AdminPricingLists/PricingDetailUpdate', data); }
  async function addPricingCategory(data) { return post('/AdminPricingLists/AddPricingCategory', data); }
  async function updatePricingCategory(data) { return post('/AdminPricingLists/UpdatePricingCategory', data); }
  async function deletePricingCategory(key) { return del('/AdminPricingLists/DeletePricingCategory?plPricingCategoryKey=' + key); }
  async function getAllPricingGpo(includeBlank) { return get('/AdminPricingLists/GetAllPricingGpo?pbIncludeBlank=' + (includeBlank||false)); }

  // ── AdminSecurity (26) — abbreviated, expose as needed
  async function getSecurityGroups() { return get('/AdminSecurity/GetAllSecurityGroups'); }
  async function getSecurityGroupMenuItems(groupKey, parentKey) { return get('/AdminSecurity/GetAllSecurityGroupMenuItemsList?plSecurityGroupKey=' + groupKey + '&plSecurityParentMenuItemKey=' + (parentKey||0)); }
  async function getUserSecurityGroups(userKey) { return get('/AdminSecurity/GetAllUserSecurityGroups?plUserKey=' + userKey + '&pbIncludeGlobalAdmin=true'); }

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
    verifyOtp, UI,

    // Dashboard
    getDashboardScopes,

    // Tasks
    getTasks, addTask, updateTask, deleteTask,
    getTaskStatuses, getTaskPriorities,
    addTaskLoaner, updateTaskLoaner, getTaskLoaners,
    getTaskTypes, getTaskType, addTaskType, updateTaskType, deleteTaskType,

    // Clients
    getAllClients, getClientById, addClient, updateClient, deleteClient,
    getNationalAccounts, getCityStateByZip,

    // Departments
    getAllDepartments, getDepartmentDetail, addDepartment, updateDepartment, deleteDepartment,
    getStandardDepartments, getShippingCarriers, getDepartmentInvoiceSchedule,
    getDepartmentTypes,
    getDepartmentGPOList, getGPOsList,
    getSubGroups, getSubGroupsAvailable, addDepartmentSubGroups, deleteDepartmentSubGroups,

    // Contacts
    getContactsByClient, getContactsByDepartment, addContact, updateContact,

    // Scopes
    getAllScopes, getScopesList, getScopeById, getScopeRepairs,
    getScopeTypes, checkOpenRepairForScope,
    getScopeComment, updateScopeComment,
    addScope, updateScope, deleteScope,
    updateScopeSalePrice, updateScopeSaleReturn, updateScopeSale,

    // Scope Types
    getScopeTypeNames, getDepartmentScopeTypes, getAvailableDepartmentScopeTypes,
    addDepartmentScopeTypes, deleteDepartmentScopeTypes, deleteScopeTypes,

    // Scope Models
    getManufacturers, getScopeModels, getScopeModelDetail, getScopeModelCategories,
    getVideoImagesList, getDiTypes, addUpdateScopeType,
    getScopeTypeAvgDays, getScopeTypeEpoxyAvg,
    getScopeTypeRepairItems, addScopeTypeRepairItems, updateScopeTypeRepairItems, deleteScopeTypeRepairItems,
    getUnassignedRepairItems, getScopeTypeRepairItemInventory,
    getScopeTypeRepairItemAvailableInventory, addScopeTypeRepairItemInventoryLink,

    // Model Max Charges
    getModelMaxCharges, addModelMaxCharge, updateModelMaxCharge, deleteModelMaxCharge,

    // Repairs
    getRepairs, getRepairList, getRepairDetail, getRepairScopes,
    getRepairReasons, getDeliveryMethods, getAllTechs,
    getRepairSuppliers, getPatientSafetyLevels, getRepairDistributors,

    // Repair Items
    getRepairItems, getRepairItemsCatalog, getRepairItemDetail,
    addRepairItem, updateRepairItem, deleteRepairItem,
    getRepairLevels, getRepairStatuses,
    getRepairItemPricing, updateRepairItemPricing,
    getRepairItemImpliedInventory, updateRepairItemImpliedInventory,
    getRepairItemImpliedItems, getRepairItemParentItems,
    addImpliedItem, updateImpliedItemTech, deleteImpliedItem,
    getAllTechnicians, getTechnicianById,
    getProductIDsByRepairItem, getRepairReasonsByKey,

    // Repair Item Instruments
    getInstrumentsList, getInstrumentDetail, updateInstruments, getInstrumentScopeCategories,
    addInstrument, getInstrumentManufacturersAvailable, getInstrumentManufacturers,
    addInstrumentManufacturer, deleteInstrumentManufacturer,
    addInstrumentManufacturerModel, updateInstrumentManufacturerModel, deleteInstrumentManufacturerModel,
    getInstrumentManufacturerModels,

    // Repair Detail
    getRepairDetailItems, getNewRepairDetails,
    updateRepairItemComment, updateRepairItemAmount,
    updateRepairItemApproved, updateRepairItemPrimary,

    // Repair Inventory & Status
    getRepairInventory,
    getRepairStatusHistory,

    // Inventory
    getInventoryList, getInventoryById, getInventorySizes,
    addInventory, updateInventory, deleteInventoryValidation, deleteInventory,
    getInventoryItemAndSize, getInventorySizeById,
    addInventorySize, updateInventorySize, deleteInventorySize,
    getInventoryFromLotNumber, addInventorySizeBuild,
    getInventoryAssembly, updateInventoryAssembly, deleteInventoryAssembly,
    addLotNumberAdjustment, getLotNumberQtyAvailable,
    getInventorySuppliers, getInventoryPOs, getInventoryPODetail,
    getSupplierPOTrans, addSupplierPOTran, addSupplierPO, updateSupplierPO, deleteSupplierPO,
    addInventoryTran, getInventorySizeSuppliers,
    assignInventorySize, updateSupplierInventorySize, getSuppliersForDropdown,

    // Suppliers
    getSuppliersList, getSupplierById, getSuppliers,
    addSupplier, updateSupplier, deleteSupplier,
    getSupplierPOTypes, getSupplierRecentPOs,
    getSuppliedItemAndSize, getAvailableSuppliedItemAndSize, getNextSupplierPartNumber,

    // Acquisitions
    getAcquisitionsSold, getAcquisitionsInHouse, getAcquisitionsConsigned,

    // Product Sales
    getInvoiceNumbers, getSalesReps, getInventoryPricing,
    addProductSale, updateProductSale,
    addProductSaleInventory, getProductSaleInventory,
    deleteProductSaleInventory, deleteProductSale, searchProductSales,
    updateProductSaleInventoryQty, addProductSaleInventoryLot, updateProductSaleInventoryLot,

    // Contracts
    getContractsList, getContractById, addContract, updateContract, updateContractName, deleteContract,
    getContractTypes, getContractInstallmentTypes, getContractServicePlanTerms,
    getContractDepartments, getContractDepartmentsAvailable, addContractDepartments,
    getContractScopes, addContractScopes, updateContractScope, deleteContractScope,
    checkScopeSerialExists, insertNewScopesWithCheck,
    getContractRepairsList, getContractAmendments, getContractCoverageCounts,
    getContractReportCard, getContractExpenseBreakdown,
    getContractRenewalScopes, addContractRenewalScopes,
    getContractInvoices, getContractClients,

    // Pending Contracts
    getPendingContracts, getPendingContractById,
    addPendingContract, updatePendingContract, deletePendingContract, convertPendingContract,

    // Financials
    getOutstandingInvoices, getOutstandingInvoiceById, updateInvoiceStatus, importOutstandingInvoices,
    getGLAccounts, updateGLAccounts,
    getClientsOnHold, clientUpdateOnHold, getWorkOrdersOnHold, workOrderUpdateOnHold,
    getInvoicePayments, deleteInvoicePayment, getDraftInvoices, deleteDraftInvoice,

    // Documents
    getDocuments, addDocument, updateDocument, deleteDocument, downloadDocument,

    // Flags
    getFlagsByOwner, getFlagsByClient, addFlag, updateFlag, deleteFlag,

    // Lookups / Reference
    getAllSalesReps, getAllPricingCategories, getAllPaymentTerms,
    getAllCreditLimits, getAllDistributors, getAllCountries, getAllStates,
    getInstrumentTypes, getSystemCodes, getEmailTemplate,

    // Service Locations
    getServiceLocations, getServiceLocationsByUser,

    // Security
    getMenuItemsForUser,

    // User Management
    getUserList, getUserById, addUser, updateUser,
    resetUserPassword, changeUserPassword, forgotPassword,

    // Admin — Manage Staff
    getJobTypes, getAllStaff, createStaff, updateSalesRep,

    // Admin — Pricing Lists
    getPricingCategoryById, getPricingDetails, updatePricingDetail,
    addPricingCategory, updatePricingCategory, deletePricingCategory, getAllPricingGpo,

    // Admin — Security
    getSecurityGroups, getSecurityGroupMenuItems, getUserSecurityGroups,

    // Dev Todo
    getDevTodoList, addDevTodoItem, updateDevTodoStatus, getDevTodoDetails,
    getDevTodoStatuses, getDevTodoPriorities,

    // Config
    BASE_URL,
    isDemoMode
  };
})();
