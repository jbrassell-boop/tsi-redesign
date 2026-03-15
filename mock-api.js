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

  // Phase 4 route definitions will go here

  // ── Public API ────────────────────────────────────────
  return {
    handleRequest,
    route,  // Exposed so routes can be registered externally if needed
  };
})();
