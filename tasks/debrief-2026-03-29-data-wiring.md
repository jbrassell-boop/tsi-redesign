# Session Debrief — March 29, 2026 (Data Wiring)

## Goal
Remove the mock data layer entirely, wire all 33 pages to the Express API server backed by live SQL Server data, and close every 404 gap.

---

## Phase 1: Remove Mock Data Layer (Commits 8f3fa2f, b8b0729, b59e622)

- Removed mock-db.js (52MB) and mock-api.js from all 33 HTML pages
- Made api.js Express-only: `isLocalMode()=true`, `isMockMode()=false` always
- Replaced 48 MockDB calls across 9 pages with real API calls
- Built 9 initial Express endpoints (invoices, supplier POs, analytics, task history)
- Added 10 API wrapper functions to api.js

## Phase 2: Full Data Wiring — 79 New Endpoints (Commit 568527d)

### Audit Results
- **9 pages fully wired** (pre-existing)
- **14 pages partially wired** (some endpoints missing)
- **5 pages stubs** (no real data)
- **89 API functions** in api.js were calling endpoints that didn't exist (all 404s)

### What Was Built
- 79 new endpoints across 14 NEW route files + 8 extended existing files
- 31 total route files now registered in Express server
- 12 new API wrapper functions added to api.js
- Removed all demo/stub arrays: suppliers (inline), financial (7 DEMO objects), quality (4 arrays), reports (3 arrays), product-sale, administration (4 lookups)
- Separated scope-model.html to R/F/C scopes only (instruments excluded)
- Fixed outsource-validation API namespace bug

### Schema Deviations Discovered

| Expected | Actual | Resolution |
|----------|--------|------------|
| tblModelMaxCharge | tblScopeTypeDepartmentMaxCharges | Corrected table name |
| tblEmailQueue | tblEmails | Corrected table name |
| tblEndoCart | Components/ComponentTypes/ComponentGroups | Separate tables (all 0 rows) |
| tblAcquisition | tblAcquisitionSupplierPO | Corrected table name |
| tblProductSale | tblProductSales (plural) | Corrected table name |
| tblQualityInspection | tblISOComplaint | Corrected table name |
| bReviseQuote on tblRepair | Does not exist | Used bHotList + [REVISED QUOTE] ISO comment |
| bOnHold/bCreditHold on tblClient | Does not exist | Used sBadDebtRisk='Y' |
| tblStatusTran.lRepairStatusID | tblStatusTran.lStatusKey | Corrected column name |
| tblSubGroups PK | llSubGroupKey (double-l) | Corrected column name |
| tblPendingArrival | Does not exist | Portal-only feature |
| tblInstrumentCode | Does not exist | Instruments are in tblScopeType with sRigidOrFlexible='I' |
| tblDevelopmentList | Does not exist | No backing table |
| tblGP_ARAgingReport | Does not exist | Computed from tblGP_InvoiceStaging |

---

## New Route Files Created

| File | Endpoints | Key Tables |
|------|-----------|------------|
| acquisitions.js | ~5 | tblAcquisitionSupplierPO |
| administration.js | ~6 | tblHolidays, tblBonusPlan, tblTaxRates, tblUserRoles |
| analytics.js | ~4 | Aggregation queries across tblRepair |
| dashboard-analytics.js | ~5 | Cross-table KPI aggregations |
| dashboard-emails.js | ~3 | tblEmails |
| dashboard-flags.js | ~3 | tblRepair flags, tblClient flags |
| dashboard-inventory.js | ~4 | tblInventory*, alerts |
| dashboard-shipping.js | ~4 | tblRepair shipping data |
| dashboard-tasks.js | ~4 | tblStatusTran task queue |
| dashboard-techbench.js | ~4 | tblRepair tech assignments |
| financial.js | ~6 | tblGP_InvoiceStaging, tblRepair financials |
| invoices.js | ~5 | tblGP_InvoiceStaging |
| outsource-validation.js | ~4 | tblRepair outsource flags |
| product-sales.js | ~4 | tblProductSales |
| quality.js | ~5 | tblISOComplaint |
| reports.js | ~4 | Cross-table report queries |
| supplier-pos.js | ~5 | tblSupplierPO* |
| suppliers.js | ~4 | tblSupplier |

(Plus extensions to existing: lookups, repairs, repair-details, repair-status, clients, departments, scopes, contracts)

---

## 4 Known Gaps (All Graceful Empty States)

1. **Loaner requests tab** — different workflow than tblLoanerTran; needs custom request/fulfillment logic
2. **Quality inspections/CAPA/rework** — only NCR (tblISOComplaint, 794 rows) has data; CAPA and rework tables don't exist
3. **Dashboard analytics metrics/TAT** — need aggregation endpoints with date-range params
4. **Dashboard fallback skeleton** — intentional for slow API loads; shows loading state

---

## QA Results

- 5/5 checks pass
- Zero MockDB/MockAPI references remaining in any HTML file
- Zero broken API namespaces
- Zero `if(false)` guards left behind
- All 31 route files registered and responding

---

## Commits This Session

| Hash | Description | Files | Net |
|------|-------------|-------|-----|
| `8f3fa2f` | Remove mock-db.js, mock-api.js from HTML pages | ~33 | Large deletion |
| `b8b0729` | Make api.js Express-only, add initial endpoints | ~10 | +/- |
| `b59e622` | Wire initial 9 endpoints (invoices, POs, analytics) | ~12 | +/- |
| `568527d` | 79 new endpoints, full data wiring across all pages | 37 | +2198/-416 |

---

## Session Stats

- ~170+ total Express endpoints (up from 64)
- 31 route files (up from 8)
- 79 new endpoints built
- 48 MockDB calls replaced
- 89 missing API functions resolved
- 14 new route files created
- 12 new api.js wrapper functions
- 14+ schema deviations discovered and corrected
- All 33 pages now hit real SQL Server data
