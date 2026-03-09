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
    return localStorage.getItem('tsi_token');
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

      // Check authentication result
      if (d.isAuthenticated && d.token) {
        setToken(d.token);
        if (d.user) setUser(d.user);
        console.log('[TSI Auth] Token stored, length:', d.token.length);
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
      console.warn('[TSI API] 401 on', endpoint, '— token may be expired');
      const err = new Error('Session expired');
      err.status = 401;
      throw err;
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
  //  Domain-Specific API Calls
  //  Add methods here as we wire up each page
  // ═══════════════════════════════════════════════════════

  // ── Dashboard ─────────────────────────────────────────
  async function getDashboardScopes(filters) {
    // Get user from session to pass userKey
    const user = getUser();
    const defaults = {
      psRepairKeys: null,
      plUserKey: user?.lUserKey || null,
      plServiceLocationKey: filters?.plServiceLocationKey || 1,
      chkIncludeCogentix: false,
      chkIncludeTS: false,
      chkHotList: false,
      sRowFilter: null,
      instrumentTypeValue: 'F',
      diameterValue: 'all',
      inHouseValue: true
    };
    const payload = { ...defaults, ...filters };
    console.log('[TSI] Dashboard API request:', payload);
    return post('/Dashboard/GetDashboardScopeDataList', payload);
  }

  // ── Clients ───────────────────────────────────────────
  async function getAllClients(serviceLocationKey) {
    return get('/Client/GetAllClientList?plServiceLocationKey=' + (serviceLocationKey || 1));
  }

  async function getClientById(clientKey) {
    return get('/Client/GetClientDetailsByClientId?plClientKey=' + clientKey);
  }

  async function addClient(data) {
    return post('/Client/AddClient', data);
  }

  async function updateClient(data) {
    return post('/Client/UpdateClient', data);
  }

  async function deleteClient(clientKey) {
    return del('/Client/DeleteClient?plClientKey=' + clientKey);
  }

  // ── Inventory ─────────────────────────────────────────
  async function getInventoryList(filters) {
    const defaults = {
      plInventoryKey: 0,
      pbIncludeInactive: false,
      Pagination: { PageNumber: 1, PageSize: 100 },
      Filters: {}
    };
    return post('/Inventory/GetAllInventoryList', { ...defaults, ...filters });
  }

  async function getInventoryById(inventoryKey) {
    return get('/Inventory/GetInventoryById?plInventoryKey=' + inventoryKey);
  }

  async function getInventorySizes(inventoryKey, filters) {
    const defaults = {
      plInventoryKey: inventoryKey,
      Pagination: { PageNumber: 1, PageSize: 100 },
      Filters: {}
    };
    return post('/Inventory/GetAllInventorySizesList', { ...defaults, ...filters });
  }

  async function addInventory(data) {
    return post('/Inventory/AddInventory', data);
  }

  async function updateInventory(data) {
    return post('/Inventory/UpdateInventory', data);
  }

  // ── Departments ───────────────────────────────────────
  async function getDepartments(clientKey) {
    return get('/Departments/GetAllDepartmentList?plClientKey=' + clientKey);
  }

  // ── Repairs ───────────────────────────────────────────
  async function getRepairs(filters) {
    return post('/Repair/GetAllRepairList', filters);
  }

  // ── Scope Models ──────────────────────────────────────
  async function getManufacturers() {
    return post('/ScopeModel/GetAllManufacturersList', {});
  }

  async function getScopeModels(filters) {
    return post('/ScopeModel/GetAllScopeTypeList', filters);
  }

  // ── Suppliers ─────────────────────────────────────────
  async function getSuppliers(serviceLocationKey) {
    return get('/Supplier/GetAllSupplierList?plServiceLocationKey=' + (serviceLocationKey || 1));
  }

  // ═══════════════════════════════════════════════════════
  //  Public Interface
  // ═══════════════════════════════════════════════════════
  return {
    // Auth
    login,
    logout,
    isLoggedIn,
    requireAuth,
    getToken,
    getUser,

    // Core
    get,
    post,
    del,

    // Dashboard
    getDashboardScopes,

    // Clients
    getAllClients,
    getClientById,
    addClient,
    updateClient,
    deleteClient,

    // Inventory
    getInventoryList,
    getInventoryById,
    getInventorySizes,
    addInventory,
    updateInventory,

    // Departments
    getDepartments,

    // Repairs
    getRepairs,

    // Scope Models
    getManufacturers,
    getScopeModels,

    // Suppliers
    getSuppliers,

    // Config
    BASE_URL
  };
})();
