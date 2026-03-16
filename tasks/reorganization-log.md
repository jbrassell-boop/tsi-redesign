# UI Reorganization Proposal — March 2026

**Status: PROPOSED — pending discussion with Steve**

## Principle
**Put the tool where the work happens.** Reports and features that are contextual to a specific domain page should live on that page, not buried in a monolithic Reports dropdown (the old WinScope pattern).

## Proposed Changes

### Reports/Extracts Page (reports.html)
**Before:** 86 reports across 9 categories
**After:** ~60 reports across 6 categories (Repair, Financial, Sales, GPO, Inventory, Operations)

Reports removed from centralized page and moved to domain pages:

| Report | Moved To | Rationale |
|---|---|---|
| 7 Quality Reports (Non-Conformance, PO Receipts, Inspection Sign Off, Missing Docs, Defect Tracking, Repairs Within 40 Days, Repair Amendments) | quality.html → "Reports" tab | Quality team manages QC data on Quality page — reports should be right there |
| Client Report Card | clients.html → "Report Card" tab | Contextual to the client being viewed |
| New Customers | clients.html → toolbar filter | It's a client list view filtered by onboard date |
| Loaner Requests | loaners.html → "Requests" tab | Loaner data belongs with the Loaners page |
| Loaners by Date Range | loaners.html → "Requests" tab | Same — loaner reporting next to loaner management |
| Department Audit | departments.html → toolbar action | Department data export belongs on Departments page |
| Department Contacts | departments.html → toolbar action | Already has a Contacts tab — this is the extract |
| At Risk Departments | financial.html → "At Risk" tab | Profitability/risk analysis is financial |
| Trending Workflow & Expenses | financial.html → "Trending" tab | Expense trending is financial analysis |
| 4 Contract Reports (Expiration, Value, SLA, Utilization) | contracts.html → "Reports" tab | Contracts page already has Report Card + Expense Trending tabs |
| Client Sales Summary | clients.html → accessible from Report Card | Revenue by client/dept is client-contextual |

### Administration Page (administration.html)
**Before:** 21 tabs
**After:** 19 tabs

| Change | Detail |
|---|---|
| Bonus Pools tab removed | Folded into Staff & Users tab as a sub-section |
| Sales Tax Config tab removed | Folded into System Settings tab as a section |

### Domain Pages Enhanced
| Page | What Was Added |
|---|---|
| quality.html | "Reports" tab with 7 quality report cards |
| clients.html | "Report Card" tab with client performance report generator |
| loaners.html | "Requests" tab with loaner request tracking + date range report |
| departments.html | Export actions for Dept Audit and Dept Contacts |
| financial.html | "At Risk" tab + "Trending" tab |
| contracts.html | "Reports" tab with 4 contract report cards |
