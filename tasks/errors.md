# Mock Database — Error & Issue Log

Track issues encountered during mock database migration. Updated at each phase.

---

## Phase 1: Scaffold
No issues.

## Phase 2: Core Entities
No issues.

## Phase 3: Repairs & Financial
No issues.

## Phase 4: Mock API Router
- Routes registered: 300 (some routes registered 4x due to duplicate page loads; functionally correct)
- Empty array fallback for unmatched GET routes is fine for now

## Phase 5: Wire Into api.js
- Login mock intercept needed special handling (separate from request() flow)
- Demo badge now shows 3 states: "Mock Data" (blue), "Demo Data" (yellow), "Live Data" (green)
- Service location filter working: Upper Chichester shows 4 of 8 repairs

## Phase 6: Verify
- Dashboard: OK — 4 repairs loaded, KPIs calculated, zero network calls
- Clients: OK — 5 clients loaded, detail view works, contacts/flags load
- No JS errors on either page
- Inline demo data still present in pages but unused (mock layer intercepts before fallback)
