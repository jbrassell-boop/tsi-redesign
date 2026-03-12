# TSI Redesign — Claude Code Session Notes

This file is read automatically by Claude Code on startup. Use it to pass context between sessions (web vs laptop).

## Session Log

### 2026-03-12 — Bug Fixes, Test Framework, Outsource Validation Page

**What was done:**
1. **Bug audit** — Found and documented 12+ bugs across the codebase
2. **Test framework** — Set up vitest + jsdom (`npm test` to run). 14 tests in `tests/bugs.test.js`
3. **Fixed 10 bugs:**
   - Dashboard: 9 dead subnav links (now linked or disabled)
   - Dashboard: loaners stat now uses `bLoanerOut` field instead of client name regex
   - api.js: service location no longer hardcoded to 1 — cascades filter > user pref > fallback
   - api.js: removed redundant JSON parse branches in login() and request()
   - api.js: documented 5 backend endpoint typos with inline NOTE comments
   - financial.html: fixed `border-bottom:1 solid` -> `1px solid`
4. **New page: `outsource-validation.html`** — Tracks outsourced repairs, validates profitability
   - KPI cards: Total Outsourced, Vendor Cost, Revenue, Net Margin
   - Repair table with WO#, Client, Scope Model, Vendor, dates, costs, margin %
   - **Model Frequency panel** — identifies which scope models to bring in-house
   - **Vendor Performance panel** — compares vendors by cost/job, turnaround, margin
   - Color-coded margins, CSV export, sortable columns, filters

**Known remaining bugs (not yet fixed):**
- inventory.html: `showPOContent()` references 6 missing element IDs
- repairs.html: `copyShipFromClient()` and `copyBillFromShip()` are empty stubs
- dashboard_tasks.html: `task.models.split(',')` can crash if models is null
- scope-model.html: D&I Override dropdown empty, file uploader only accepts .xlsx, Import/Export modal broken
- 5 backend API endpoint typos (Inverntory, Quntity, Outstandin, etc.) — documented but can't fix frontend-side

**KPI opportunities identified (not yet built):**
- TAT/SLA metrics on dashboard (API exists: `GetScopeTypeGetAverageDaysSinceLastIn`)
- Contract burn rate / utilization (API exists: `GetContractReportCardDetails`)
- Revenue KPIs on dashboard (Revenue MTD, per tech)
- Aging/DSO on financial page
- First-pass yield / rework rate
- Inventory health (days of supply, stockout rate)

---

## Project Quick Reference

- **Tech stack:** Vanilla HTML/CSS/JS, no framework, shared `api.js` + `styles.css`
- **Backend:** .NET 8 API at `totalscopetestapi.mol-tech.com/api`
- **Deployment:** Netlify (auto-deploy from main)
- **Test command:** `npm test` (vitest)
- **Pages:** 22 HTML files, 4 wired to live API, rest use demo data fallback
- **Auth:** JWT Bearer token in localStorage (`tsi_token`)
