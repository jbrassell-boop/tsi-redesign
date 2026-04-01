# Data Volume Audit — 30 Years of Production Data
**Date:** April 1, 2026
**Scope:** Full frontend + backend audit for patterns that break with massive datasets

---

## Executive Summary

With 30 years of accumulated data in WinScopeNet, several patterns across the app will degrade or break. The departments Scopes tab chip overflow (now fixed) was the first visible symptom. This audit found **21 critical**, **19 major**, and several minor issues across frontend and backend.

---

## CRITICAL — Will visibly break or timeout

### Backend (SQL queries without limits/date filtering)

| # | File | Endpoint | Issue |
|---|------|----------|-------|
| C1 | `routes/quality.js` | GET /Quality/GetAll, GetNCRs, GetCAPAs | TOP 500, no date filtering on 30yr complaint data, 5-table JOIN |
| C2 | `routes/quality.js` | GET /Quality/GetRework | O(n^2) subquery — scans ALL repairs to find duplicates, no date filter |
| C3 | `routes/invoices.js` | GET /Invoice/GetAllInvoices | TOP 500, no date filtering, 6-table JOIN on 30yr invoice staging |
| C4 | `routes/invoices.js` | GET /Invoice/GetReadyToInvoice | 5-table JOIN, no pagination, LEFT JOIN exclusion anti-pattern |
| C5 | `routes/pending-contracts.js` | GET /GetPendingContractsList | NO pagination at all, returns ALL pending contracts |
| C6 | `routes/emails.js` | GET /Email/GetAll | TOP 200 but no date filtering on 30yr email history |

### Frontend — Unbounded table rendering (no pagination)

| # | File | Function/Area | Issue |
|---|------|---------------|-------|
| C7 | `departments.html` | `buildModelDistStrip()` | Chip overflow with hundreds of scope types — **FIXED** |
| C8 | `dashboard_emails.html` | `tbody.innerHTML = filtered.map()` | Renders ALL emails, no pagination |
| C9 | `dashboard_flags.html` | `tbody.innerHTML = filtered.map()` | Renders ALL flags, no pagination |
| C10 | `dashboard_tasks.html` | `tbody.innerHTML = filtered.map()` | Renders ALL tasks, no pagination |
| C11 | `dashboard_invoices.html` | `tbody.innerHTML = _filtered.map()` | Renders ALL invoices, no pagination |
| C12 | `dashboard_inventory.html` | `tbody.innerHTML = items.map()` | Renders ALL inventory items, no pagination |
| C13 | `development-list.html` | `tbody.innerHTML = FILTERED.map()` | Renders ALL dev list items, no pagination |
| C14 | `loaners.html` | Active loaners table | Renders ALL active loaner scopes, no pagination |
| C15 | `loaners.html` | Analysis table | Renders ALL analysis records, no pagination |
| C16 | `loaners.html` | Requests table | Renders ALL loaner requests, no pagination |

### Frontend — Unbounded API calls

| # | File | API Call | Issue |
|---|------|----------|-------|
| C17 | `contracts.html` | `fetch('/Scopes/GetAllScopeType')` | Loads ALL scope types into memory |
| C18 | `onsite-services.html` | `API.getAllClients()` | Loads ALL clients into dropdown |
| C19 | `dashboard_invoices.html` | `API.getAllInvoices()` | Loads ALL invoices into memory |

### Frontend — Unbounded dropdown population

| # | File | Function/Area | Issue |
|---|------|---------------|-------|
| C20 | `product-sale.html` | `loadQuote()` / `prepareModals()` | Populates client/dept/rep dropdowns with ALL records |
| C21 | `administration.html` | Sales rep reassign | Populates fromSel/toSel dropdowns with ALL reps |

---

## MAJOR — Severe degradation but functional

### Backend

| # | File | Endpoint | Issue |
|---|------|----------|-------|
| M1 | `routes/loaners.js` | GET /GetAllLoaners | No pagination, no date filter |
| M2 | `routes/departments.js` | GET /GetAllDepartments | No pagination mechanism |
| M3 | `routes/clients.js` | GET /GetAllClientList | No pagination, returns all clients |
| M4 | `routes/scopes.js` | GET /Scopes/GetAllScopes | No pagination, 5-table JOIN |
| M5 | `routes/portal.js` | GET /api/portal/contracts | Separate COUNT query (N+1 pattern) |

### Frontend — Unbounded sub-tables in contracts.html

| # | File | Table | Issue |
|---|------|-------|-------|
| M6 | `contracts.html` | Contract notes | `contractNotes.map()` renders ALL, no pagination |
| M7 | `contracts.html` | Contract commissions | `contractCommissions.map()` renders ALL, no pagination |
| M8 | `contracts.html` | Contract scopes | `scopes.map()` renders ALL, no pagination |
| M9 | `contracts.html` | Contract repairs | `repairs.map()` renders ALL, no pagination |
| M10 | `contracts.html` | Contract amendments | `amendments.map()` renders ALL, no pagination |
| M11 | `contracts.html` | Contract invoices | `invoices.map()` renders ALL, no pagination |
| M12 | `contracts.html` | Contract items | `items.map()` renders ALL, no pagination |
| M13 | `contracts.html` | Contract documents | `docs.map()` renders ALL, no pagination |
| M14 | `contracts.html` | Scope timeline | `list.map()` renders ALL timeline items, no pagination |

### Frontend — Shuttle panels / dropdowns

| # | File | Function/Area | Issue |
|---|------|---------------|-------|
| M15 | `clients.html` | Master client list | Caps at 200 rows but loads all into DOM |
| M16 | `clients.html` | Flags/contacts tables | Renders per-client flags and contacts without pagination |
| M17 | `departments.html` | Scope type shuttles | Renders ALL available scope types (DOM bloat despite scroll) |
| M18 | `departments.html` | Sub group shuttles | Renders ALL sub groups (DOM bloat despite scroll) |
| M19 | `loaners.html` | Scope type selector | Appends all loaner scope types without limit |

### Frontend — Dropdowns needing typeahead

| # | File | Dropdowns | Issue |
|---|------|-----------|-------|
| M20 | `contracts.html` | Departments, scope types, clients, sales reps | `.map()` populates ALL into selects |
| M21 | `financial.html` | Client dropdown | `clients.map()` populates all clients |
| M22 | `scope-model.html` | Manufacturers, categories | `.map()` populates all into selects |
| M23 | `repairs.html` | Instrument types, statuses | `.map()` populates all into selects |
| M24 | `dashboard_emails.html` | Email type dropdown | Populates all email types |

---

## Well-Implemented (No Changes Needed)

These pages already have proper pagination:

| Page | Rows/Page | Notes |
|------|-----------|-------|
| `dashboard.html` | 15 | Supports "All" option |
| `scope-model.html` | 25 | Paginated |
| `product-sale.html` | 25 | Paginated table (dropdowns still need work) |
| `onsite-services.html` | 25 | Paginated |
| `dashboard_analytics.html` | 50 | Multiple tables, all paginated |
| `quality.html` | 50 | 4 tables, all paginated |
| `financial.html` | 50 | Paginated |
| `suppliers.html` | 20/50/100 | Configurable |
| `inventory.html` | 20/50/100 | Configurable |
| `outsource-validation.html` | paginated | displayRecords pattern |
| `contracts.js` (backend) | db.queryPage() | Proper pagination |
| `acquisitions.js` (backend) | db.queryPage() | Proper pagination |
| `scope-models.js` (backend) | db.queryPage() | Proper pagination |
| `repairs.html` | search `.slice(0,50)` | Search results capped at 50 |
| `loaners.html` | Task tab | Uses `applyPagination()` |

---

## Fix Priorities

### Phase 1 — Backend query guardrails (prevent timeouts)
1. Add date-range params to quality.js endpoints (default last 2 years)
2. Add date-range params to invoices.js GetAllInvoices
3. Add pagination to pending-contracts.js
4. Add pagination to loaners.js, departments.js, clients.js, scopes.js
5. Fix rework query O(n^2) subquery pattern
6. Add date-range to emails.js

### Phase 2 — Frontend table pagination (prevent DOM explosion)
1. ~~departments.html chip strip~~ **DONE**
2. Add pagination to dashboard sub-pages: emails, flags, tasks, invoices, inventory
3. Add pagination to development-list.html
4. Add pagination to loaners.html active/analysis/requests tables
5. Add pagination to all contracts.html sub-tables (9 tables)
6. Add pagination to clients.html flags/contacts tables

### Phase 3 — Dropdown / select overflow
1. Convert large dropdowns to searchable typeahead: clients, departments, reps, scope types
2. Affects: product-sale, administration, contracts, financial, scope-model, onsite-services, repairs
3. Add search + max-height to shuttle panels in departments.html

### Phase 4 — Standardization
1. Establish `db.queryPage()` as standard for all list endpoints
2. All time-series queries default to 2-year lookback unless user specifies
3. All dropdowns with 50+ potential options use typeahead pattern
4. innerHTML += in loops → build string first, assign once (O(n) vs O(n^2))
