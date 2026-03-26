# Technical Specification: Loaner Management

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Workflow, Scope/Equipment Management, Shipping

---

## 1. Overview

When a customer sends a scope in for repair, they may need a **loaner scope** to use while theirs is being fixed. The loaner system manages:
- **Pool inventory** — which scopes are designated loaners, their rack positions, availability
- **Issuance** — linking a loaner to a repair, tracking shipment out
- **Return tracking** — expected return date, overdue detection, actual return
- **Demand analysis** — scope needs vs. pool availability, fill rate metrics

---

## 2. Schema — Core Tables

### 2.1 `LoanerTrans` (Loaner Transactions)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lLoanerTranKey` | `int` (PK, identity) | No | Unique transaction ID |
| `lDepartmentKey` | `int` (FK → Departments) | No | Department receiving the loaner |
| `lScopeKey` | `int` (FK → Scopes) | No | Which loaner scope is being sent |
| `lRepairKey` | `int` (FK → Repairs) | No | Which repair triggered the loaner need |
| `lSalesRepKey` | `int` (FK → SalesReps) | Yes | Sales rep handling the loan |
| `lDeliveryMethodKey` | `int` | Yes | Delivery method (3 = standard) |
| `lCompanyKey` | `int` | Yes | Company (usually 2 = TSI) |
| `lContractKey` | `int` (FK → Contracts) | Yes | Contract covering this loaner (0 if none) |
| `sDateOut` | `varchar(14)` | Yes | Date shipped out (format: `YYYYMMDDhhmmss`) |
| `sDateIn` | `varchar(14)` | Yes | Date returned (format: `YYYYMMDDhhmmss`) |
| `dtLoanerOut` | `datetime` | Yes | Parsed date out (for display/calculation) |
| `dtExpectedReturn` | `datetime` | Yes | When loaner should come back |
| `dtActualReturn` | `datetime` | Yes | When loaner actually returned |
| `sRepairClosed` | `char(1)` | Yes | `Y` if repair completed before loaner returned, `N` otherwise |
| `sPurchaseOrder` | `varchar(50)` | Yes | PO type: "Contract", "TBD", "On-site" |
| `sTrackingNumber` | `varchar(50)` | Yes | Shipping tracking number |
| `sStatus` | `varchar(20)` | Yes | Current status (see §3) |

**Audit Fields:**
| Column | Type | Description |
|--------|------|-------------|
| `lCreateUser` | `int` | Who created |
| `dtCreateDate` | `datetime` | When created |
| `lLastUpdateUser` | `int` | Who modified |
| `lCreateSessionKey` | `int` | Session tracking |
| `lSessionID` / `lSessionKey` | `int` | Session tracking |

### 2.2 Scope Fields (Loaner Pool)

These fields on the `Scopes` table identify loaner scopes:

| Column | Type | Description |
|--------|------|-------------|
| `pbLoaner` / `bLoaner` | `bit` | Flagged as a loaner scope |
| `pbOnSiteLoaner` / `bOnSiteLoaner` | `bit` | On-site loaner at customer facility |
| `psLoanerRackPosition` | `varchar(10)` | Physical rack position (e.g., "A-1", "B-5") |
| `sLoanerStatus` | `varchar(20)` | Current loaner status |
| `sLocation` / `psLocationCode` | `varchar(20)` | Physical location code |
| `sClientName` / `sClientName1` | `varchar(100)` | If assigned: currently loaned to this client |
| `sDepartmentName` | `varchar(100)` | If assigned: currently at this department |

**Loaner identification query:**
```sql
SELECT * FROM Scopes
WHERE pbOnSiteLoaner = 1
   OR bOnSiteLoaner = 1
   OR pbLoaner = 1
   OR bLoaner = 1
   OR psLoanerRackPosition IS NOT NULL
```

---

## 3. Loaner Statuses & Lifecycle

### Status Computation

```javascript
function computeStatus(r) {
  if (r.sStatus === 'Declined') return 'Declined';     // Terminal
  if (r.sStatus === 'Unable')   return 'Unable';        // Terminal
  if (r.sStatus === 'Returned' || r.dtActualReturn) return 'Returned';  // Final
  if (r.sStatus === 'Reserved') return 'Reserved';      // Pending
  if (r.dtExpectedReturn && now > new Date(r.dtExpectedReturn)) return 'Overdue';
  return 'Out';  // Active loan
}
```

### Lifecycle Flow

```
Booking (Flag Location 6)
  ↓
Reserved (request accepted, scope identified)
  ↓
Out (sDateOut populated, shipped to customer)
  ↓
  ├── In Transit Back (tracking number, still "Out" until sDateIn)
  ↓
  ├── Overdue (dtExpectedReturn passed, no sDateIn)
  ↓
Returned (sDateIn populated)

Exception paths:
  Declined (request denied — terminal)
  Unable (scope not available — terminal)
```

### Status Badges

| Status | Badge Color | Display |
|--------|------------|---------|
| Out | Blue | Active loan |
| Returned | Green | Successfully returned |
| Overdue | Red | Past expected return date |
| Reserved | Gray | Pending issuance |
| Declined | Amber | Request denied |
| Unable | Amber | Scope unavailable |

---

## 4. Loaner-to-Repair Relationship

**Type: Many-to-One**
- A repair may need multiple loaners (different scope types)
- Each `LoanerTrans` record has exactly ONE `lRepairKey`
- A repair may have 0 or more loaner transactions

**Connection:**
- `LoanerTrans.lRepairKey` → `Repairs.lRepairKey`
- When repair ships (`dtDateOut` set), check if loaner should trigger return request

**Repair Closed Flag:**
- `sRepairClosed = 'Y'` — repair was completed/shipped BEFORE loaner returned
- `sRepairClosed = 'N'` — loaner returned before repair completed
- This tracks whether the customer got their scope back before returning the loaner

---

## 5. Days Out Calculation & Alerts

### Days Out
```javascript
function daysOut(r) {
  if (!r.dtLoanerOut) return null;
  const start = new Date(r.dtLoanerOut);
  const end = r.dtActualReturn ? new Date(r.dtActualReturn) : new Date();
  return Math.max(0, Math.floor((end - start) / 86400000));
}
```

### Days Chip Coloring
| Condition | Color | CSS Class |
|-----------|-------|-----------|
| < 14 days AND not overdue | Green | `days-ok` |
| 14+ days AND not overdue | Amber | `days-warn` |
| Overdue (past expected return) | Red | `days-over` |

### Morning Briefing Alert
```
Overdue loaners surface in GET /Dashboard/GetNeedsAttention:
  - Filter: dtDueDate exists, dtReturnDate empty, dtDueDate < today
  - Severity: warning
  - Label: "Loaner overdue {X}d"
  - Links to loaners page
```

---

## 6. Loaner Booking Trigger

**Flag Location 6 = "Booking Loaner"** in the flags system.

### Trigger Points:
1. Work order intake — checkbox "needs loaner"
2. Repairs UI — loaner request button
3. Flag created with `lFlagLocationKey = 6`

### Fulfillment Flow:
1. Flag created → appears in OPS flag queue
2. OPS identifies available loaner scope from pool
3. Creates `LoanerTrans` record (status: Reserved → Out)
4. If no suitable loaner available: Declined/Unable

---

## 7. Loaner Pool — Availability Tracking

### Availability Logic
```
Available = scope has NO client/department assignment (unassigned, in rack)
Assigned  = scope has sClientName or sDepartmentName populated (currently on loan)

poolQty   = total loaner scopes of a given model type
assigned  = count with client/dept assigned
available = poolQty - assigned
```

### Rack Position
- Field: `psLoanerRackPosition` (e.g., "A-1", "B-5")
- Physical inventory management — where the loaner sits when available
- Displayed as styled chip in UI

---

## 8. Scope Needs Analysis (Demand vs. Supply)

The "Scope Needs" tab computes demand/supply metrics per scope model:

| Metric | Calculation |
|--------|-------------|
| **Requests** | Count of all loaner requests for this model |
| **Fulfilled** | Count with status = Out or Returned |
| **Declined** | Count with status = Declined or Unable |
| **Pool Qty** | Total loaner scopes of this model in inventory |
| **Available** | Pool - currently assigned |
| **Gap** | Requests - Pool (negative = surplus) |

### Recommendations
| Condition | Recommendation |
|-----------|---------------|
| Pool = 0 AND Requests > 0 | **Acquire** — no loaners of this model, demand exists |
| Gap > 0 OR Declined > 0 | **Consider** — insufficient pool or unfulfilled requests |
| Available >= Gap | **Adequate** — pool meets demand |

---

## 9. UI — Loaner Management Page (loaners.html)

### KPI Stat Strip
- **Total** — all loaner records
- **Out** — currently issued
- **Overdue** — past due, not returned
- **Returned** — successfully returned
- **Declined** — requests denied
- **Fill Rate** — (Fulfilled / Total) × 100%

### Sub-Tabs

**1. Task Loaners** (default view)
- All loaner requests tied to work orders
- Columns: WO#, Scope Type, Serial#, Qty, Client, Dept, Rack, Location, Tracking#, Status, Days Out, Actions
- Status filter: All, Out, Overdue, Returned, Declined
- "Log Loaner" button to add new
- Pagination: 50 per page

**2. Active Loaners** (pool inventory)
- All loaner-flagged scopes
- Columns: Serial#, Scope Type, Rack, Location, Assigned To (Client), Assigned To (Dept), Status
- Status: Out (assigned) or Available (in rack)

**3. Scope Needs** (demand analysis)
- Grouped by scope model
- Columns: Model, Requests, Fulfilled, Declined, Pool Qty, Available, Gap, Recommendation

**4. Requests** (future/planned)
- Status workflow: Pending → Approved → Fulfilled/Denied
- Columns: Request#, Client, Dept, Scope Type, Requested Date, Needed By, Status, Assigned Loaner
- Date range + status filter

### Add/Edit Drawer
| Field | Required | Notes |
|-------|----------|-------|
| Work Order # | Yes | Links to repair |
| Quantity | Yes | Min 1 |
| Scope Type / Model | Yes | Dropdown from loaner pool |
| Serial Number | Auto | Populated from scope selection |
| Rack Position | Auto | Populated from scope selection |
| Status | Yes | Dropdown: Out, Returned, Reserved |
| Tracking # | No | UPS/FedEx or manual |

### Detail Drawer (read-only)
- **Task Info:** WO#, Client, Dept, Sales Rep, Location
- **Loaner Scope:** Type, Serial, Qty, Rack Position
- **Loan Status:** Status, Date Out, Expected Return, Actual Return, Days Out, Tracking#

---

## 10. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/DashBoardTaskLoaner/GetAllTaskLoanerList` | GET | Task loaners with filters |
| `/DashBoardTaskLoaner/AddTaskLoaner` | POST | Create loaner record |
| `/DashBoardTaskLoaner/UpdateTaskLoaner` | POST | Update loaner record |
| `/DashBoardTaskLoaner/DeleteTaskLoaner` | DELETE | Remove loaner record |
| `/LoanerTrans/GetAllLoanerTransList` | GET/POST | Loaner transactions (paginated) |
| `/Scopes/GetAllScopes?plDepartmentKey=0` | GET | All scopes (filter to loaner-flagged) |
| `/Dashboard/GetNeedsAttention` | GET | Includes overdue loaners in alerts |

---

## 11. Integration with Repair Workflow

| Repair Event | Loaner Impact |
|-------------|---------------|
| Repair created (`dtDateIn` set) | If loaner issued: set `sDateOut` on loaner trans |
| Repair shipped (`dtDateOut` set) | Set `sRepairClosed = 'Y'`, trigger loaner return request |
| Repair status → Shipped | Check if loaners outstanding, alert if not yet returned |

---

## 12. Lost / Damaged Loaners

### Current State
No explicit "Lost" or "Damaged" status exists in the current schema.

### Recommended Implementation

Add these values to the status enum:
- `Lost` — customer cannot locate the loaner
- `Damaged` — loaner returned in non-functional condition

Additional fields needed:
| Column | Type | Description |
|--------|------|-------------|
| `sLossReason` | `varchar(200)` | Why loaner is lost/damaged |
| `dtLossReportedDate` | `datetime` | When loss/damage was reported |
| `dblReplacementCost` | `decimal(10,2)` | Cost to replace the loaner |
| `bBilled` | `bit` | Whether customer was billed for loss/damage |

### Business Rule
When a loaner is marked Lost or Damaged:
1. Remove from available pool
2. Create a billing event for replacement cost (if applicable)
3. Flag on the customer/department record
4. Update `sLoanerStatus` on the scope record

---

## 13. Date Format Note

The `sDateOut` and `sDateIn` fields use a **string format**: `YYYYMMDDhhmmss` (e.g., "20240723082829" = July 23, 2024 at 08:28:29).

The developer should:
- Parse these to `datetime` for calculations
- Consider migrating to proper `datetime` columns in a future schema update
- The UI uses `dtLoanerOut`, `dtExpectedReturn`, `dtActualReturn` as proper datetime fields — these may be computed from the string fields or stored separately

---

## 14. Open Questions

1. **Loaner charges** — does the customer get billed for loaner usage? If so, is it per-day or flat fee? How does it appear on the invoice?
2. **On-site loaners** — `pbOnSiteLoaner` suggests some loaners live permanently at customer sites. How does the lifecycle differ from shipped loaners?
3. **Loaner contracts** — `lContractKey` on loaner trans suggests some loaners are covered under contract. How does contract coverage affect loaner billing?
4. **Auto-return trigger** — when a repair ships, should the system automatically email the customer requesting loaner return? Or is this manual?
5. **Multiple loaners per repair** — if a department sends 3 scopes and needs 3 loaners, is it 3 separate loaner trans records or 1 record with quantity > 1?
