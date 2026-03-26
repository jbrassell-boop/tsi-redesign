# Technical Specification: Repair Status Workflow & Lifecycle

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Pricing System, Contract Management, Invoicing, Loaner Management, Quality Control

---

## 1. Overview

The repair workflow is the **backbone of the entire system**. Every repair (work order) follows a lifecycle from intake through shipment and invoicing. This spec defines the status state machine, phase gating, form generation triggers, hold/release logic, milestone tracking, and all downstream impacts when a repair changes status.

---

## 2. Schema — Core Tables

### 2.1 `Repairs` (Primary Record)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lRepairKey` | `int` (PK, identity) | No | Unique repair identifier |
| `sWorkOrderNumber` | `varchar(20)` | No | Human-readable WO# (format: `N##########` or `S##########`) |
| `lScopeKey` | `int` (FK → Scopes) | No | Which scope/instrument |
| `sSerialNumber` | `varchar(50)` | No | Instrument serial number (denormalized for search) |
| `lClientKey` | `int` (FK → Clients) | No | Customer |
| `lDepartmentKey` | `int` (FK → Departments) | No | Customer department |
| `lServiceLocationKey` | `int` (FK → ServiceLocations) | No | TSI facility: 1=North (PA), 2=South (TN) |
| `lRepairStatusID` | `int` (FK → RepairStatuses) | No | Current granular status (1–22) |
| `sRepairStatusDesc` | `varchar(50)` | No | Simplified phase: Received, Evaluation, In Repair, Complete, Invoiced, Shipped |
| `lRepairLevelKey` | `int` (FK → RepairLevels) | Yes | Complexity: 1=Minor, 2=Mid, 3=Major, 4=VSI |
| `sRigidOrFlexible` | `char(1)` | Yes | Scope type: R=Rigid, F=Flexible, I=Instrument, C=Cart |
| `dblAmtRepair` | `decimal(10,2)` | Yes | Total repair cost (labor + parts) |
| `mMaxCharge` | `decimal(10,2)` | Yes | Customer's cost cap for this repair |
| `lContractKey` | `int` (FK → Contracts) | Yes | Service agreement covering this repair |
| `lTechnicianKey` | `int` (FK → Employees) | Yes | Assigned technician |
| `sRepairReason` | `varchar(200)` | Yes | Why repair was needed |
| `sPONumber` | `varchar(50)` | Yes | Purchase order number |
| `sPOSource` | `varchar(20)` | Yes | How PO was applied: `Blanket`, `Manual`, NULL (see Blanket PO spec) |
| `bHotList` | `bit` | No | Priority flag — affects shipping queue sort |
| `bFlaggedForRevisedQuote` | `bit` | No | Amendment/scope change needed |
| `fByPassOnHold` | `bit` | No | Override hold to allow shipment |
| `dtDateIn` | `datetime` | No | Received date — starts TAT clock |
| `dtDateOut` | `datetime` | Yes | Shipped date — ends TAT clock |
| `dtFinalQCDate` | `datetime` | Yes | QC sign-off date |
| `dtInvoiceDate` | `datetime` | Yes | Invoice generation date |
| `dtLastUpdate` | `datetime` | Yes | Last edit timestamp |
| `lLastUpdateUserKey` | `int` (FK → Users) | Yes | Who last edited |

### 2.2 `RepairStatuses` (Status Catalog)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairStatusID` | `int` (PK) | Status identifier |
| `sRepairStatus` | `varchar(100)` | Display name |
| `lAlertHours` | `int` | Hours before status triggers an alert (SLA timer) |
| `lSortOrder` | `int` | Display ordering |
| `bIsReadOnly` | `bit` | If true, repair fields locked in this status |
| `sAlertType` | `varchar(50)` | When to fire alert (On New Repair, On Repair Item Assignment, On Approval, etc.) |

### 2.3 `StatusTrans` (Audit Log)

| Column | Type | Description |
|--------|------|-------------|
| `lStatusTranKey` | `int` (PK, identity) | Transaction identifier |
| `lRepairKey` | `int` (FK → Repairs) | Which repair |
| `lOldStatusID` | `int` | Previous status |
| `lNewStatusID` | `int` | New status |
| `lUserKey` | `int` (FK → Users) | Who changed it |
| `dtTransDate` | `datetime` | When it changed |
| `sNotes` | `varchar(500)` | Optional notes on reason for change |

**Rule:** Every status change MUST create a StatusTrans record. No exceptions.

### 2.4 `RepairDetails` (Line Items on a Repair)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairItemTranKey` | `int` (PK, identity) | Line item transaction ID |
| `lRepairKey` | `int` (FK → Repairs) | Parent repair |
| `lRepairItemKey` | `int` (FK → RepairItems) | Which catalog item |
| `sDescription` | `varchar(200)` | Line item description |
| `dblAmount` | `decimal(10,2)` | Cost |
| `lQuantity` | `int` | Quantity |

### 2.5 `RepairInventory` (Parts Used)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairInventoryKey` | `int` (PK, identity) | Record ID |
| `lRepairKey` | `int` (FK → Repairs) | Parent repair |
| `lInventoryKey` | `int` (FK → Inventory) | Which part |
| `lQuantity` | `int` | Quantity used |
| `dblCost` | `decimal(10,2)` | Cost at time of use |

### 2.6 Hold Tables

**`ClientsOnHold`** — blocks ALL repairs for a customer:

| Column | Type | Description |
|--------|------|-------------|
| `lClientOnHoldKey` | `int` (PK) | Record ID |
| `lClientKey` | `int` (FK → Clients) | Which customer |
| `sReason` | `varchar(200)` | Why on hold (credit limit, past due, etc.) |
| `dtHoldDate` | `datetime` | When hold was placed |
| `lHoldByUserKey` | `int` (FK → Users) | Who placed the hold |

**`WorkOrdersOnHold`** — blocks a specific repair:

| Column | Type | Description |
|--------|------|-------------|
| `lWOOnHoldKey` | `int` (PK) | Record ID |
| `lRepairKey` | `int` (FK → Repairs) | Which repair |
| `sReason` | `varchar(200)` | Why on hold |
| `dtHoldDate` | `datetime` | When hold was placed |
| `lHoldByUserKey` | `int` (FK → Users) | Who placed the hold |

---

## 3. Status Catalog — All 20 Statuses

| ID | Status Name | Alert Hours | Read-Only | Alert Trigger | Phase |
|----|-------------|-------------|-----------|---------------|-------|
| 1 | Waiting on Inspection | 6 | Yes | On New Repair | Received |
| 3 | In the Drying Room | 72 | No | On Repair Item Assignment | In Repair |
| 4 | Outsourced | 48 | No | On Repair Item Assignment | In Repair |
| 5 | Additional Evaluation Time Needed | 24 | No | On Repair Item Assignment | Evaluation |
| 6 | Waiting for Approved | 120 | Yes | — | Evaluation |
| 8 | In Repair Process - Minor Repair | 36 | No | On Approval | In Repair |
| 9 | In Repair Process - Major Repair | 120 | No | On Approval | In Repair |
| 10 | Scheduled to Ship | 8 | Yes | — | Complete |
| 11 | In Repair Process - Mid Level Repair | 72 | No | On Approval | In Repair |
| 12 | Scheduled to Ship Tomorrow | 36 | Yes | — | Complete |
| 13 | Shipping Today or Tomorrow | 40 | Yes | — | Complete |
| 14 | Semi Rigid Repair | 180 | No | On Approval | In Repair |
| 15 | Special Rigid - under 4mm | 160 | No | On Approval | In Repair |
| 16 | Cart Approved - waiting on build status | 60 | No | On Approval | In Repair |
| 17 | Cart approved - waiting on parts | 120 | No | On Approval | In Repair |
| 18 | Parts Hold | 48 | No | — | In Repair |
| 19 | More Info Needed | 48 | No | On Repair Item Assignment | Evaluation |
| 20 | Build - In Process | 40 | No | — | In Repair |
| 21 | QC - Waiting Customer Approval | 48 | No | — | Complete |
| 22 | PO Received - Awaiting build | 48 | No | On Approval | In Repair |

---

## 4. Simplified Status Phases (Tech Bench View)

The 20 granular statuses collapse into **6 lifecycle phases** stored in `sRepairStatusDesc`:

```
┌──────────┐    ┌────────────┐    ┌───────────┐    ┌──────────┐    ┌──────────┐    ┌─────────┐
│ Received │ →  │ Evaluation │ →  │ In Repair │ →  │ Complete │ →  │ Invoiced │ →  │ Shipped │
└──────────┘    └────────────┘    └───────────┘    └──────────┘    └──────────┘    └─────────┘
```

### Phase Mapping Rules

| Simplified Phase | Granular Statuses (by name match) |
|-----------------|-----------------------------------|
| **Received** | Waiting on Inspection (ID:1), and default for any unmapped |
| **Evaluation** | Additional Evaluation Time Needed (ID:5), Waiting for Approved (ID:6), More Info Needed (ID:19) |
| **In Repair** | In Repair Process - Minor/Mid/Major (ID:8,11,9), In the Drying Room (ID:3), Semi Rigid (ID:14), Special Rigid (ID:15), Cart statuses (ID:16,17,20,22), Outsourced (ID:4), Parts Hold (ID:18) |
| **Complete** | Quality Check, Draft Invoice, Scheduled to Ship (ID:10,12,13), QC - Waiting Customer Approval (ID:21) |
| **Invoiced** | Invoiced |
| **Shipped** | Shipped |

**Implementation:** When `lRepairStatusID` changes, derive `sRepairStatusDesc` from this mapping. Store both — the granular ID for operations, the simplified desc for dashboards and reporting.

---

## 5. Workflow Phases & Form Generation

The repair lifecycle is divided into **4 operational phases**. Each phase unlocks specific forms and restricts others.

### Phase 1: Intake (Status ID = 1)

**Available Forms:**
| Form ID | Name | Form Number | Status Change |
|---------|------|-------------|---------------|
| `disassemble` | Disassemble & Inspection (D&I) | OM05-1 | → Status 2 (Evaluation) |

**What Happens:**
- Scope arrives, logged as "Waiting on Inspection"
- D&I form captures initial damage assessment, corrosion, alignment, functional tests
- Accessories captured as read-only pills from intake data
- Printing D&I form auto-transitions status to Evaluation (Phase 2)
- `dtDateIn` is set at this point

**Recommended Tabs:** Scope In, Inspections

### Phase 2: Evaluation (Status IDs 2–5, 6, 19)

**Available Forms:**
| Form ID | Name | Form Number | Status Change |
|---------|------|-------------|---------------|
| `requisition` | Requisition | OM07-2 | → Status 3 (In Repair) |

**What Happens:**
- Technician evaluates damage, determines repair level (Minor/Mid/Major)
- Generates approval request / customer quote
- May enter "More Info Needed" (ID:19) or "Additional Evaluation Time" (ID:5)
- "Waiting for Approved" (ID:6) = awaiting customer/ops sign-off
- Generating requisition auto-transitions to In Repair (Phase 3)

### Phase 3: Repair (Status IDs 3, 4, 8, 9, 11, 14–18, 20, 22)

**Available Forms:**
| Form ID | Name | Form Number | Status Change |
|---------|------|-------------|---------------|
| `inspection` | Blank Inspection | OM07-3 | → Status 4 (next repair stage) |
| `picklist` | Repair Inventory Pick List | OM07-6 | None |
| `amendment` | Amendment to Repair | OM07-9 | None |
| `defect` | Defect Tracking | OM07-8 | None |

**What Happens:**
- Actual repair work performed
- Parts pulled from inventory (RepairInventory records created)
- Repair line items added (RepairDetails records)
- `dblAmtRepair` accumulates
- Status routes by repair level: Minor (ID:8), Mid (ID:11), Major (ID:9)
- Scope-type variants: Semi Rigid (ID:14), Special Rigid (ID:15)
- Cart-specific: waiting on build (ID:16), waiting on parts (ID:17), build in process (ID:20)
- Exception paths: Parts Hold (ID:18), Outsourced (ID:4)

**Recommended Tabs:** Details (repair items, parts)

### Phase 4: Closure (Status IDs ≥ "Complete" phase)

**Available Forms:**
| Form ID | Name | Form Number | Status Change |
|---------|------|-------------|---------------|
| `finalqc` | Final QC Inspection | OM07-3 | None |
| `invoice` | Final Invoice | — | → Status 6 (Invoiced) |
| `packing` | Scope Return Verification | — | → Status 7 (Shipped) |

**What Happens:**
- Quality check performed, `dtFinalQCDate` set
- Invoice generated, `dtInvoiceDate` set
- Packing/shipping, `dtDateOut` set
- TAT clock stops

**Recommended Tabs:** Financials, Inspections

---

## 6. Form-Triggered Status Transitions

When a form is generated/printed, the system auto-advances the status:

```
FORM_STATUS_MAP = {
  disassemble:  2,     // D&I form       → Evaluation
  requisition:  3,     // Requisition     → In Repair
  inspection:   4,     // Inspection      → Next repair stage
  picklist:     null,  // Pick List       → No change
  amendment:    null,  // Amendment       → No change (exception path)
  defect:       null,  // Defect Track    → No change (QA hold)
  invoice:      6,     // Invoice         → Invoiced
  packing:      7      // Packing/Ship    → Shipped
}
```

**Rules:**
- If `FORM_STATUS_MAP[formId]` is not null → update `lRepairStatusID` and derive `sRepairStatusDesc`
- Always log to `StatusTrans`
- Forms with null = informational/exception documents that don't advance the workflow

---

## 7. Direct Status Changes (Manual)

Users can manually change `lRepairStatusID` via dropdown on the repair detail header. This is intentional — not every repair follows the exact form-driven path.

**Validation on manual status change:**
1. Log the transition to `StatusTrans` (old → new, user, timestamp)
2. Derive `sRepairStatusDesc` from the new granular status
3. If new status has `bIsReadOnly = true`, lock editing on the repair detail
4. Fire any alerts based on `sAlertType` for the new status

**No hard blocks on manual transitions.** The system is permissive — operators need flexibility. The audit trail in `StatusTrans` provides accountability.

---

## 8. Tech Bench — Simplified Status Changes

The tech bench (technician-facing dashboard) uses a **5-step simplified model**:

```
Received → Evaluation → In Repair → Complete → Shipped
```

| Simplified Status | Maps to Granular ID |
|-------------------|---------------------|
| Received | 1 |
| Evaluation | 2 |
| In Repair | 3 |
| Complete | 4 |
| Shipped | 5 |

**Note:** These IDs (1–5) are the simplified phase IDs for the tech bench quick-toggle, not the full granular status IDs. When a tech clicks "In Repair" on the bench, the system sets `sRepairStatusDesc = 'In Repair'` and `lRepairStatusID` to the appropriate granular status (which may need to be inferred from repair level or scope type).

---

## 9. Hold/Release Logic

### 9.1 Hold Types

| Hold | Scope | Trigger | Effect |
|------|-------|---------|--------|
| **Client Hold** | All repairs for client | Credit limit exceeded, past-due invoices | Blocks shipment of all WOs for that client |
| **Work Order Hold** | Single repair | Parts unavailable, customer approval pending, QC fail | Blocks shipment of that WO only |
| **Parts Hold** (Status ID:18) | Single repair | Needed parts not in stock | Explicit status — repair cannot advance until parts arrive |
| **Approval Hold** (Status ID:6) | Single repair | Awaiting customer sign-off on quote | Explicit status — repair cannot start until approved |
| **More Info Hold** (Status ID:19) | Single repair | Missing data from customer | Explicit status — blocks assessment |

### 9.2 Hold Check — When Does It Gate?

The hold check fires at **shipment time** (Phase 4 → Shipped):

```
1. Check ClientsOnHold WHERE lClientKey = @repair.lClientKey
   → If found AND fByPassOnHold = false → BLOCK shipment

2. Check WorkOrdersOnHold WHERE lRepairKey = @repair.lRepairKey
   → If found AND fByPassOnHold = false → BLOCK shipment
```

### 9.3 Bypass Mechanism

- `fByPassOnHold` checkbox on the repair's Financials tab
- When checked, records:
  - Who bypassed (user key)
  - When bypassed (timestamp)
- Allows shipment despite active hold
- **Does not remove the hold** — the hold remains, the bypass is a per-repair override

---

## 10. Milestone Dates & Turnaround Time (TAT)

### 10.1 Key Dates

| Date Field | Set When | Cleared When | Purpose |
|------------|----------|--------------|---------|
| `dtDateIn` | Repair created / scope received | Never | TAT start, 40-day warranty reference |
| `dtDateOut` | Status → Shipped | Never (once set) | TAT end, triggers loaner return clock |
| `dtFinalQCDate` | QC inspection completed | Never | QC milestone |
| `dtInvoiceDate` | Invoice generated | Never | Financial closure milestone |
| `dtLastUpdate` | Any edit to repair | Overwritten on next edit | Collaboration indicator |

### 10.2 TAT Calculation

```
IF dtDateOut IS NOT NULL:
  TAT = dtDateOut - dtDateIn (in calendar days)
ELSE:
  TAT = TODAY - dtDateIn (open/in-progress)
```

Display as `Xd` (e.g., "5d").

### 10.3 TAT Targets by Repair Level

| Repair Level | Key | Target Days |
|-------------|-----|-------------|
| Minor | 1 | 1 day |
| Mid-Level | 2 | 3 days |
| Major | 3 | 5 days |
| VSI | 4 | 1 day |

TAT exceeding target should surface an alert. This is informational (not blocking).

### 10.4 SLA Alert Hours

Each granular status has an `lAlertHours` value. If a repair sits in a status longer than `lAlertHours`, fire an alert. Examples:
- Waiting on Inspection: 6 hours (get it assessed fast)
- In Repair - Minor: 36 hours
- In Repair - Major: 120 hours (5 days)
- Semi Rigid: 180 hours (7.5 days)

---

## 11. 40-Day Return Detection

### 11.1 Logic

When a repair is created or opened:

```
1. Query repairs WHERE sSerialNumber = @current.sSerialNumber
   AND lRepairKey != @current.lRepairKey
   AND dtDateOut IS NOT NULL
   ORDER BY dtDateOut DESC
   LIMIT 1

2. IF found:
   gap = @current.dtDateIn - @priorRepair.dtDateOut
   IF gap <= 40 days:
     → Fire "40-Day Return" alert
     → Include: prior WO#, gap in days, prior repair date
```

### 11.2 Why This Matters

A scope returning within 40 days of a prior repair may indicate:
- Incomplete prior repair
- Recurring issue with the scope
- Warranty claim potential
- Quality concern to investigate

This is a **warning alert**, not a workflow block. The repair proceeds, but it's flagged for awareness.

---

## 12. Smart Alerts Integration

When a repair is loaded, evaluate these conditions and surface alerts:

| Alert | Condition | Type | Blocking? |
|-------|-----------|------|-----------|
| **40-Day Return** | Same serial repaired within 40 days | Warning | No |
| **Max Charge Exceeded** | `dblAmtRepair > mMaxCharge` | Warning | No |
| **Contract Coverage** | `lContractKey IS NOT NULL` and contract is active | Info | No |
| **No Contract (Opportunity)** | `lContractKey IS NULL` and department has no active contract | Opportunity | No |
| **Client On Hold** | Client exists in `ClientsOnHold` | Warning | Yes (blocks ship) |
| **Hot List** | `bHotList = true` | Warning | No |

---

## 13. Downstream Impacts of Status Changes

### 13.1 Inventory

- When parts added to `RepairInventory`: decrement `Inventory.lQuantity`
- When parts removed from repair: increment `Inventory.lQuantity`
- Parts cost rolls up into `dblAmtRepair`

### 13.2 Loaners

- When repair is **received** (`dtDateIn` set): if a loaner was issued for this scope/department, set loaner `sDateOut`
- When repair is **shipped** (`dtDateOut` set): set loaner `sDateIn` (return expected), mark `sRepairClosed = 'Y'`

### 13.3 Flags

Flag creation is tied to workflow phases via `FlagLocations`:

| Flag Location ID | Trigger Point | Description |
|-----------------|---------------|-------------|
| 1 | Requisition generated | Phase 2 → 3 transition |
| 2 | Approval received | Phase approval action |
| 3 | Invoice generated | Phase 4 financial closure |
| 4 | D&I completed | Phase 1 → 2 transition |
| 5 | Repair label printed | Phase 3 labeling |
| 6 | Loaner booked | Loaner return tracking |

### 13.4 Status Audit (StatusTrans)

Every status change, regardless of source (form, manual, tech bench, batch), MUST write to `StatusTrans`:
- `lRepairKey`
- `lOldStatusID` (before)
- `lNewStatusID` (after)
- `lUserKey` (who)
- `dtTransDate` (when)

### 13.5 Email Notifications

| Trigger | Email | Recipient |
|---------|-------|-----------|
| Repair created (dtDateIn) | Repair estimate / intake confirmation | Customer contact |
| Requisition generated | Approval request | Customer contact, account rep |
| Status → Shipped | Ship notification with tracking | Customer contact |
| Invoice generated | Invoice PDF | Billing contact |

---

## 14. Service Location Routing

| Location | Key | Facility | WO# Prefix |
|----------|-----|----------|-------------|
| North | 1 | Upper Chichester, PA | `N` |
| South | 2 | Nashville, TN | `S` |

**Impact on workflow:**
- `lServiceLocationKey` determines which facility processes the repair
- Search/filter: North location only sees `N` prefixed WOs, South only sees `S`
- Ready-to-Ship queue filtered by location
- Shipping labels use location-specific return address

---

## 15. Read-Only Rules by Status

When a status has `bIsReadOnly = true`, the repair detail fields are **locked** (display only, no editing).

**Read-Only statuses:**
- Waiting on Inspection (ID:1) — intake snapshot, don't modify before D&I
- Waiting for Approved (ID:6) — locked while awaiting approval
- Scheduled to Ship (ID:10) — locked for shipping
- Scheduled to Ship Tomorrow (ID:12) — locked
- Shipping Today or Tomorrow (ID:13) — locked

**Editable statuses:** All others — technicians need to update repair details, parts, costs while work is in progress.

---

## 16. Exception Paths

### 16.1 Amendment to Repair (Form OM07-9)

- Available during Phase 3 (In Repair)
- **Does not change status** — this is a documentation-only form
- Use case: additional damage found during repair that wasn't in original D&I
- Sets `bFlaggedForRevisedQuote = true` on the repair
- May require re-approval from customer if cost increases

### 16.2 Defect Tracking (Form OM07-8)

- Available during Phase 3 (In Repair)
- **Does not change status** — QA exception tracking
- Use case: defect found during or after repair (quality issue)
- Triggers QA review workflow (separate from main repair status)
- Can result in rework or rejection

### 16.3 Outsourced Repairs (Status ID:4)

- Repair sent to third-party supplier
- Transitions to `Outsourced` status
- Triggers Supplier PO creation (see Supplier Management spec)
- TAT clock continues (customer doesn't care who does the work)
- When supplier returns repaired scope → resume normal workflow at Quality Check

---

## 17. Batch Operations

### 17.1 Batch Receiving (js/batch-receiving.js)

3-step wizard for receiving multiple scopes from a single shipment:

1. **Step 1:** Capture tracking number, select customer/department
2. **Step 2:** Enter scope serials and types for each scope in shipment
3. **Step 3:** Capture condition per scope (multiple choice assessment)

**On confirm:**
- Create one repair record per scope
- Set `lRepairStatusID = 1` (Waiting on Inspection) for all
- Set `dtDateIn = NOW` for all
- Set `lServiceLocationKey` based on logged-in user's facility
- Auto-populate `sPONumber` from Blanket PO if active (see Blanket PO spec)

### 17.2 Batch Status Change (js/batch-ops.js)

- Multi-select checkboxes on repair list
- Floating action bar appears with "Change Status" and "Export" options
- **Currently placeholder** — developer should implement:
  - Modal with status dropdown
  - Apply selected status to all checked repairs
  - Write `StatusTrans` record for each
  - Validate: don't allow batch change to a status that requires form generation

---

## 18. Tab Recommendations by Status

The UI should highlight/recommend relevant tabs based on current workflow phase:

| Status Phase | Recommended Tabs | Reason |
|-------------|-----------------|--------|
| Received (ID:1) | Scope In, Inspections | Capture intake data, run D&I |
| Evaluation (ID:5,6,19) | Scope In, Inspections | Review assessment |
| In Repair (ID:3,4,8,9,11,14-18,20,22) | Details | Add repair items, parts |
| Complete (ID:10,12,13,21) | Inspections | Final QC |
| Invoiced | Financials | Review invoice, payments |
| Shipped | Financials | Confirm closure |

---

## 19. Reporting Queries

| Report | Query Logic |
|--------|-------------|
| **Open Repairs by Status** | GROUP BY sRepairStatusDesc WHERE dtDateOut IS NULL |
| **TAT by Repair Level** | AVG(dtDateOut - dtDateIn) GROUP BY lRepairLevelKey |
| **SLA Violations** | Repairs where time-in-status > lAlertHours |
| **40-Day Returns** | Repairs where same serial had prior repair within 40 days |
| **Repairs on Hold** | JOIN ClientsOnHold + WorkOrdersOnHold |
| **Status Transition History** | StatusTrans for a given lRepairKey, ordered by dtTransDate |
| **Throughput by Location** | COUNT by lServiceLocationKey, grouped by week/month |

---

## 20. Open Questions

1. **Should manual status changes be restricted?** Currently any user can change to any status. Should certain transitions require specific security groups (e.g., only QC team can set "Quality Check", only finance can set "Invoiced")?
2. **Outsourced repair return:** When a supplier returns a repaired scope, does it go back to "Waiting on Inspection" for incoming QC, or skip to a later status?
3. **Batch status change:** Should there be a whitelist of statuses allowed for batch changes? (e.g., never batch-change to "Shipped" — that should require packing verification per item)
4. **Cart-specific statuses (ID:16,17,20,22):** Are these only for endocart repairs (`sRigidOrFlexible = 'C'`)? Should the system enforce that?
5. **TAT calculation:** Should it be business days or calendar days? Current implementation is calendar days.
6. **Status ID gaps:** IDs jump from 1 to 3 (no ID:2), 6 to 8 (no ID:7). Are these reserved for future use or deprecated statuses? Developer should preserve the gaps — don't renumber.
