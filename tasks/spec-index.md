# TSI Redesign — Technical Specifications Index

**Date:** 2026-03-24
**Purpose:** Developer handoff — complete system specifications beyond UI
**Author:** Joseph Brassell

---

## How To Use These Specs

These documents describe **what the system does, why, and how** at the database, business rule, and API level. They go deeper than the UI prototype to give your developer everything needed to implement in the live repository.

Each spec covers:
- Schema (tables, columns, types, constraints, FKs)
- Business rules & validation logic
- API endpoints & payloads
- Downstream impacts (what changes when X happens)
- Edge cases
- Known gaps & open questions

---

## Specification Documents

| # | Spec | File | Status | Description |
|---|------|------|--------|-------------|
| 1 | **Repair Status Workflow** | `spec-repair-status-workflow.md` | ✅ Complete | 20 granular statuses, 6 lifecycle phases, 4 operational phases, form-triggered transitions, hold/release, milestone dates, TAT, 40-day return detection, downstream impacts |
| 2 | **Blanket Purchase Orders** | `spec-blanket-po.md` | ✅ Complete | NEW FEATURE — department-level standing POs with date ranges, auto-population on WO creation, expiration handling, traceability |
| 3 | **Contract Management** | `spec-contract-management.md` | ✅ Complete | 6 contract types, department/scope coverage, pricing impact (CAP vs FFS), health scoring (expense multiplier, avoidable damage, utilization), renewal workflow, amendments |
| 4 | **Invoicing & Credit Holds** | `spec-invoicing-credit.md` | ✅ Complete | Invoice generation, lifecycle (draft→finalized→paid), credit holds (client & WO level), bypass mechanism, AR aging, tax calculation, Great Plains integration, credit memos |
| 5 | **Loaner Management** | `spec-loaner-management.md` | ✅ Complete | Loaner pool, issuance lifecycle, overdue detection, demand/supply analysis (Scope Needs), return tracking, days-out calculation, morning briefing alerts |
| 6 | **Inventory & Parts** | `spec-inventory-parts.md` | ✅ Complete | Parts catalog, size variants, repair inventory (parts used), pick list (OM07-6), low stock alerts, cost roll-up, BOM/assembly, quantity tracking gaps |
| 7 | **Client/Department Hierarchy** | `spec-client-department.md` | ✅ Complete | 3-level hierarchy (Client→Department→Scope), override pattern (dept overrides client), regional partitioning, national accounts, credit memos |
| 8 | **Flags & Smart Alerts** | `spec-flags-smart-alerts.md` | ✅ Complete | 4 flag types, 6 display locations, ownership model, 10 smart alert rules with exact trigger conditions and messages, morning briefing |
| 9 | **Pricing & Quoting** | `spec-pricing-quoting.md` | ✅ Complete | 5 pricing categories, max charge caps (27K records by dept+model), repair item catalog (734 items), quote/requisition workflow, amendment process, invoice calculation, contract pricing impact |
| 10 | **Shipping & Logistics** | `spec-shipping-logistics.md` | ✅ Complete | Ready-to-ship queue, batch shipping with customer grouping, 10 carrier/delivery methods, packing slips, inbound receiving wizard, hold checks at ship time, loaner return triggers, hot list priority |
| 11 | **User & Security Management** | `spec-user-security.md` | ✅ Complete | Users/Employees/Technicians/SalesReps entity relationships, 5 security groups (Admin→Viewer), permission matrix (NOT YET ENFORCED), authentication flow, technician assignment, sales rep hierarchy, audit trail |
| 12 | **Email & Notifications** | `spec-email-notifications.md` | ✅ Complete | Email queue (Pending/Sent/Failed), 9 email templates, 8 trigger events, toast notification system, morning briefing alerts, contact management (polymorphic via ContactTrans), collaboration indicators |
| 13 | **Reporting & Analytics** | `spec-reporting-analytics.md` | ✅ Complete | 11 dashboard pages, 4 analytics panels (Metrics/TAT/Profitability/Revenue), contract health scoring (4 factors + letter grade), CSV/print export, filter pattern, KPI calculations |
| 14 | **Tech Bench Dashboard** | `spec-tech-bench.md` | ✅ Complete | Simplified 5-status model (regex mapping from 20 statuses), urgency dots, 4 KPIs, advance status + flag quick actions, technician filtering, days-in-house calculation, click-through to detail |
| 15 | **Search & Filtering** | `spec-search-filtering.md` | ✅ Complete | Standard client-side filter pattern, searchable fields by page, sort toggle, service location global filter, empty state handling, performance thresholds, server-side pagination recommendation |
| 16 | **Instrument Repair Workflow** | `spec-instrument-repair.md` | ✅ Complete | Surgical instrument WO system: OPS intake, tech D&I entry screen (no paper), OS code pricing catalog, two-stage QC (Tech + Commercial), BER handling, future category+level pricing model, customer approval portal roadmap |
| 17 | **Receiving Redesign** | `spec-receiving-redesign.md` | ✅ Approved | Hybrid Option E: Expected Arrivals queue from TSIPortal DB, two-part intake flow (match vs walk-in), WO creation = receiving event (EOD scan eliminated), 3 Zebra labels, 14-day overdue flag, 30-day auto-expire |
| — | **Database Schema Reference** | `spec-schema-reference.md` | ✅ Reference | Exact column names and types for all key tables: tblRepair (270 cols), tblClient, tblDepartment, tblScope, tblScopeType, tblContract, tblInvoice, tblGP_InvoiceStaging, tblRepairItem, tblInventory*, tblSupplier, tblSalesRep, tblTechnicians, tblLoanerTran, tblSiteServices* |

---

## Cross-Cutting Concerns

### Entity Relationships
```
Client (1) ──→ (N) Department (1) ──→ (N) Scope
                     │                       │
                     ├── Contract (M:N via contractDepartments)
                     ├── Blanket PO (1:N, only 1 active)
                     ├── Pricing Category
                     └── Sales Rep (override)
                                             │
                                             ├── Repair (1:N)
                                             │     ├── Status (1 of 20)
                                             │     ├── Repair Items / Parts
                                             │     ├── Invoice
                                             │     ├── Flags
                                             │     └── Loaner Trans
                                             └── Contract Scope (M:N)
```

### Regional Partitioning
- Every list query filters by `lServiceLocationKey` (1=North PA, 2=South TN)
- WO numbers prefixed N or S
- Inventory may have separate pools per location

### Audit Trail
- Every table has `lLastUpdateUser`, `dtLastUpdate`
- Status changes logged to `StatusTrans`
- Flag changes should log (currently a gap)

### Naming Convention
- `l` prefix = integer/long (keys, FKs)
- `s` prefix = string
- `dbl` / `m` prefix = decimal/money
- `b` prefix = boolean/bit
- `dt` prefix = datetime
- `n` prefix = numeric count
- `p` prefix on API params = parameter (e.g., `plRepairKey`, `psDepartmentName`)

---

## Priority Order for Implementation

### Phase 1: Foundation
1. **User & Security Management** — authentication, roles (enforce permissions early)
2. **Client/Department Hierarchy** — entities everything references
3. **Repair Status Workflow** — core workflow everything builds on

### Phase 2: Core Operations
4. **Pricing & Quoting** — pricing categories, catalog, quote workflow
5. **Contract Management** — pricing determination, health scoring
6. **Inventory & Parts** — parts consumption during repair
7. **Invoicing & Credit Holds** — financial closure

### Phase 3: Supporting Workflows
8. **Shipping & Logistics** — outbound/inbound, batch shipping
9. **Loaner Management** — parallel workflow to repairs
10. **Flags & Smart Alerts** — operational intelligence layer
11. **Email & Notifications** — outbound communication, triggers

### Phase 4: Dashboards & UX
12. **Tech Bench Dashboard** — technician-facing view
13. **Reporting & Analytics** — dashboards, KPIs, export
14. **Search & Filtering** — performance, server-side pagination
15. **Blanket POs** — new feature, after core is stable

---

## Spec Status

17 specifications total. **All 17 complete.** Each spec includes schema, business rules, API endpoints, downstream impacts, edge cases, and open questions.

**Developer Handoff Documents:**
- `tech-stack-decision.md` — Framework, database, ORM, auth, hosting decisions
- `api-contract.md` — Unified REST endpoint reference (64+ endpoints across 8 route files)

**Open Questions:** `spec-open-questions.md` consolidates all 66 open questions across specs (10 critical, 30 important, 26 nice-to-have). Joseph must answer the 10 critical questions before development starts.
