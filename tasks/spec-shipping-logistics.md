# Technical Specification: Shipping & Logistics

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Status Workflow, Loaner Management, Invoicing & Credit Holds

---

## 1. Overview

Shipping covers both **inbound** (receiving scopes from customers) and **outbound** (returning repaired scopes). The system manages a ready-to-ship queue, carrier selection, batch shipping with per-customer grouping, packing slip generation, and tracking number capture. All filtered by service location (North PA / South TN).

---

## 2. Schema — Core Tables

### 2.1 `DeliveryMethods` (Carrier Lookup)

| Column | Type | Description |
|--------|------|-------------|
| `lDeliveryMethodKey` | `int` (PK) | Carrier/method identifier |
| `sDeliveryDesc` | `varchar(50)` | Display name |
| `dblAmtShipping` | `decimal(10,2)` | Standard shipping cost |
| `sShipID` | `varchar(10)` | Legacy carrier code |
| `sDefaultYN` | `char(1)` | Default selection (Y/N) |

**Seed Data:**

| Key | Description | Cost | Default |
|-----|-------------|------|---------|
| 1 | FedEx Standard | $62.50 | N |
| 2 | FedEx Overnite | $73.50 | N |
| 3 | United Parcel Service (UPS) | $250.00 | **Y** |
| 4 | P.P.D | $100.00 | N |
| 5 | FedEx Saturday | $80.00 | N |
| 6 | P/FEDEX/D | $162.50 | N |
| 7 | P/FEDEX | $86.75 | N |
| 8 | FEDEX/D | $86.75 | N |
| 16 | UPS/D | $25.00 | N |
| 17 | DHL Express | $200.00 | N |

### 2.2 Shipping Fields on `Repairs`

| Column | Type | Description |
|--------|------|-------------|
| `sShipTrackingNumber` | `varchar(50)` | Carrier tracking number |
| `dtShipDate` | `datetime` | Date scopes shipped (user-entered) |
| `dtDateOut` | `datetime` | System ship date (set same as dtShipDate) |
| `lDeliveryMethodKey` | `int` (FK → DeliveryMethods) | Carrier/method used |
| `dblAmtShipping` | `decimal(10,2)` | Shipping cost charged |
| `bHotList` | `bit` | Priority flag — expedite shipping |

### 2.3 `ServiceLocations`

| Column | Type | Description |
|--------|------|-------------|
| `lServiceLocationKey` | `int` (PK) | Location identifier |
| `sServiceLocation` | `varchar(20)` | Short name (North, South) |
| `sTransNumberPrefix` | `char(1)` | WO# prefix (N, S) |
| `sServiceLocationName` | `varchar(50)` | Full name |
| `bUsed` | `bit` | Is this location active? |

**Data:**

| Key | Name | Prefix | Facility |
|-----|------|--------|----------|
| 1 | North | N | Upper Chichester, PA 19061 |
| 2 | South | S | Nashville, TN |

---

## 3. Outbound Shipping — Ready-to-Ship Queue

### 3.1 Queue Criteria

A repair appears in the ready-to-ship queue when ALL of these are true:

```
1. sRepairStatusDesc IN ('Complete', 'Ready', 'QC Passed')
2. sShipTrackingNumber IS NULL (not yet shipped)
3. lServiceLocationKey = @currentUserLocation (filtered by facility)
```

### 3.2 Queue Display

| Column | Source | Notes |
|--------|--------|-------|
| WO# | `sWorkOrderNumber` | |
| Serial# | `sSerialNumber` | |
| Customer | `sClientName1` | |
| Department | `sDepartmentName` | |
| Model | `sScopeTypeDesc` | |
| Days Since Complete | `TODAY - (dtDateCompleted or dtDateOut or dtDateIn)` | Calendar days |

**Sorting:** Grouped by customer name. Each customer group gets a visual color band for easy identification.

**Color Bands:** Cycle through: blue, green, amber, purple, rose, cyan, orange, indigo — one per unique customer in the queue.

### 3.3 KPIs (Shipping Dashboard Header)

| KPI | Calculation |
|-----|-------------|
| **Ready** | COUNT of repairs in queue |
| **Shipped Today** | COUNT WHERE dtShipDate = TODAY |
| **Total Charges** | SUM(dblAmtShipping) for shipped-today items |

---

## 4. Ship Confirmation Flow

### 4.1 Selection

- User selects one or more repairs from the ready-to-ship queue via checkboxes
- Clicks "Ship Selected" to open the ship modal

### 4.2 Grouping

Selected repairs are **automatically grouped by customer** (`lClientKey`):

```
Selected: [WO-001 (Hospital A), WO-002 (Hospital A), WO-003 (Hospital B)]

Groups:
  Hospital A: [WO-001, WO-002]   ← one box, one tracking#
  Hospital B: [WO-003]           ← separate box, separate tracking#
```

### 4.3 Per-Group Data Entry

For each customer group, the user enters:

| Field | Type | Default | Required |
|-------|------|---------|----------|
| Carrier | Dropdown (FedEx, UPS, DHL, Hand Delivery) | — | Yes |
| Tracking # | Free text | — | Yes |
| Ship Date | Date picker | Today | Yes |

### 4.4 Carrier Mapping

The simplified UI dropdown maps to `lDeliveryMethodKey`:

```
FedEx         → lDeliveryMethodKey: 1
UPS           → lDeliveryMethodKey: 2  (note: seed default is key 3)
DHL           → lDeliveryMethodKey: 3
Hand Delivery → lDeliveryMethodKey: 4
```

**Open Question:** The mapping in the current UI (1/2/3/4) doesn't match the seed data keys exactly (FedEx Standard=1, FedEx Overnite=2, UPS=3). Developer should align these or use the full delivery method dropdown instead of simplified carriers.

### 4.5 Confirm & Ship

On confirmation, for each repair in the batch:

```sql
UPDATE Repairs SET
  sShipTrackingNumber = @trackingNumber,
  dtShipDate = @shipDate,
  dtDateOut = @shipDate,
  sRepairStatusDesc = 'Shipped',
  lRepairStatusID = 5,        -- Shipped status
  lDeliveryMethodKey = @carrierKey
WHERE lRepairKey = @repairKey
```

**Also:**
- Write `StatusTrans` record (old status → Shipped)
- Check for loaner return triggers (see Section 8)

### 4.6 Batch Ship API

**Primary:** `POST /Repair/BatchShip`

```json
{
  "items": [
    {
      "lRepairKey": 4751,
      "sShipTrackingNumber": "1Z0A7V920156984637",
      "dtShipDate": "2026-03-24",
      "lDeliveryMethodKey": 1
    }
  ]
}
```

**Response:** `{ "success": true, "count": 3 }`

**Fallback:** If BatchShip fails, update each repair individually via `POST /Repair/UpdateRepair`.

---

## 5. Packing Slip Generation

### 5.1 When Generated

- **Before ship confirm:** User can print a group packing slip while reviewing
- **After ship confirm:** User can reprint from the "Shipped Today" tab

### 5.2 Packing Slip Content

```
╔══════════════════════════════════════╗
║  Total Scope Inc. — Packing Slip    ║
╠══════════════════════════════════════╣
║  Ship To: {clientName}              ║
║  Tracking: {trackingNumber}         ║
║  Date: {shipDate}                   ║
║  Items: {scopeCount} scope(s)       ║
╠══════════════════════════════════════╣
║  WO#    │ Serial#  │ Model  │ Dept  ║
║  ───────┼──────────┼────────┼────── ║
║  N-0123 │ SN12345  │ GIF180 │ GI    ║
║  N-0124 │ SN12346  │ CF190  │ GI    ║
╚══════════════════════════════════════╝
```

### 5.3 Ship-From Address

Determined by `lServiceLocationKey`:

| Location | Address |
|----------|---------|
| North (1) | Total Scope Inc., 17 Creek Parkway, Upper Chichester, PA 19061 |
| South (2) | Total Scope Inc., Nashville, TN (address TBD) |

---

## 6. Inbound Receiving — Batch Receiving Wizard

### 6.1 Three-Step Wizard

**Step 1: Shipment Info**
| Field | Type | Required |
|-------|------|----------|
| Tracking Number | Free text | Yes |
| Customer | Dropdown (search) | Yes |
| Department | Dropdown (filtered by customer) | Yes |

**Step 2: Add Scopes**
For each scope in the incoming shipment:
| Field | Type | Required |
|-------|------|----------|
| Serial Number | Text | Yes |
| Scope Type / Model | Dropdown | Yes |
| Condition Notes | Multi-select (pass/fail flags) | Yes |

User can add multiple scopes. "Add Another" button for each additional scope.

**Step 3: Confirm & Receive**
- Review all scopes in the shipment
- "Receive All" button — validates at least one condition flag per scope

### 6.2 On Receive Confirm

For each scope in the batch:

```sql
INSERT INTO Repairs (
  lScopeKey, sSerialNumber, lClientKey, lDepartmentKey,
  lServiceLocationKey, lRepairStatusID, sRepairStatusDesc,
  dtDateIn, sShipTrackingNumber, sPONumber, sPOSource
) VALUES (
  @scopeKey, @serial, @clientKey, @deptKey,
  @currentUserLocation, 1, 'Received',
  GETDATE(), @inboundTrackingNumber,
  @blanketPO,  -- Auto-populated if active (see Blanket PO spec)
  @poSource    -- 'Blanket' if auto, NULL if not
)
```

**Also:**
- Generate `sWorkOrderNumber` with location prefix (N or S)
- Check for 40-day return (same serial repaired within 40 days)
- Check for active loaner (set loaner `sDateOut` if applicable)

---

## 7. Hold Checks at Ship Time

Before confirming shipment, the system should check:

```
1. ClientsOnHold — Is this client on hold?
   → IF YES AND fByPassOnHold = false → BLOCK with warning
   → IF YES AND fByPassOnHold = true  → Allow (bypass logged)

2. WorkOrdersOnHold — Is this specific WO on hold?
   → IF YES AND fByPassOnHold = false → BLOCK with warning
   → IF YES AND fByPassOnHold = true  → Allow (bypass logged)

3. Invoice Status — Should the repair be invoiced before shipping?
   → This is a business decision (see Open Questions)
```

---

## 8. Loaner Return Trigger

When a repair ships (`dtDateOut` is set):

```
1. Query LoanerTrans WHERE lRepairKey = @repairKey AND sRepairClosed = 'N'
2. IF found:
   → Set sRepairClosed = 'Y'
   → Loaner is now expected back from customer
   → Start overdue clock (if loaner not returned within expected days)
```

The loaner `sDateIn` (return date) is set separately when the loaner physically arrives back at TSI — not at repair ship time.

---

## 9. Hot List / Priority Shipping

### 9.1 What It Means

`bHotList = true` on a repair means the customer or account rep has requested expedited handling. This affects:

- **Visual indicator** in the ready-to-ship queue (warning badge)
- **Smart alert** on the repair detail: "Hot List — this repair is flagged as priority"
- **Sort priority** — Hot list items should sort to the top of the queue

### 9.2 Who Sets It

- Operations team can set `bHotList` on any repair
- Typically driven by customer request or account rep escalation
- No automatic trigger — always manual

### 9.3 Current Gap

Hot list sorting is **not yet implemented** in the shipping dashboard queue. Developer should add sort: `bHotList DESC, customerName ASC` to put priority items at the top.

---

## 10. Shipping Statuses (Granular)

The repair status workflow has multiple shipping-related statuses:

| ID | Status | Purpose | Currently Implemented? |
|----|--------|---------|----------------------|
| 10 | Scheduled to Ship | Queued for future ship date | Defined in schema, not in shipping UI |
| 12 | Scheduled to Ship Tomorrow | Tomorrow's queue | Defined in schema, not in shipping UI |
| 13 | Shipping Today or Tomorrow | Imminent departure | Defined in schema, not in shipping UI |

**Current behavior:** Repairs go straight from "Complete" → "Shipped" via the shipping dashboard. The intermediate scheduling statuses (10, 12, 13) exist in the status catalog but aren't used in the shipping workflow yet.

**Recommendation:** These could be used for ship-date planning — e.g., a Friday afternoon queue review to schedule Monday shipments. Developer should implement if the operations team wants advance shipping planning.

---

## 11. Service Location Routing

### 11.1 How Location Determines Origin

Every department is assigned a `lServiceLocationKey`. When a repair is created for that department, it inherits the location. Shipping always originates from the repair's assigned location.

```
Department (GI Lab) → lServiceLocationKey: 1 (North)
  → Repair created → lServiceLocationKey: 1
  → Ships from: Upper Chichester, PA
```

### 11.2 Cross-Location Rule

Departments are tied to locations. A North department's repairs process at the North facility. **No cross-shipping** — you can't have a North repair ship from the South facility.

### 11.3 Dashboard Filtering

The shipping dashboard filters by the logged-in user's location:
- North user sees only North repairs
- South user sees only South repairs
- No "all locations" view in shipping (each facility manages its own queue)

---

## 12. Shipped Today View

After items are shipped, they appear in the "Shipped Today" tab:

| Column | Source |
|--------|--------|
| WO# | `sWorkOrderNumber` |
| Serial# | `sSerialNumber` |
| Customer | `sClientName1` |
| Department | `sDepartmentName` |
| Tracking# | `sShipTrackingNumber` |
| Carrier | Derived from `lDeliveryMethodKey` |
| Ship Date | `dtShipDate` |
| Charges | `dblAmtShipping` |

**Actions per row:**
- **Print Packing Slip** — reprint for this single repair
- **View Detail** — open repair in detail view

---

## 13. Notifications on Ship

When a repair is shipped, the following should be triggered:

| Notification | Recipient | Content |
|-------------|-----------|---------|
| Ship confirmation email | Customer contact | WO#, tracking number, carrier, expected delivery |
| Loaner return reminder | Customer contact (if loaner active) | "Your loaner is due back" |
| Internal notification | Account rep | Customer X shipped, tracking Y |

**Current state:** Email notifications are defined in the email queue system but not fully wired to the shipping confirm action. Developer should trigger these on BatchShip/UpdateRepair status → Shipped.

---

## 14. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/Repair/GetReadyToShip?plServiceLocationKey=` | Ready-to-ship queue |
| `POST` | `/Repair/BatchShip` | Ship multiple repairs at once |
| `POST` | `/Repair/UpdateRepair` | Ship single repair (fallback) |
| `GET` | `/DeliveryMethod/GetAllDeliveryMethods` | List carriers |
| `GET` | `/Repair/GetDashboardRepairs?plServiceLocationKey=` | All repairs for dashboard |

---

## 15. Open Questions

1. **Invoice before ship?** Should the system require an invoice to be generated before allowing shipment? Currently no enforcement — repairs can ship without being invoiced.
2. **Tracking number validation:** Should tracking numbers be validated against carrier format (FedEx = 12-15 digits, UPS = 1Z...)? Currently free text.
3. **Shipping cost override:** Can the shipping cost differ from the delivery method's `dblAmtShipping`? e.g., negotiated rates, multi-scope discount?
4. **South facility address:** The Nashville facility address isn't fully defined in the system. Need complete address for packing slips and labels.
5. **Scheduled ship statuses (10, 12, 13):** Should these be implemented for advance ship planning, or are they legacy/unused?
6. **Return shipping (RMA):** When a customer sends a scope back, is there an RMA number system? Currently the inbound tracking number is captured but no formal RMA.
7. **International shipping:** Any international customers? DHL Express suggests yes — are there customs/export documentation needs?
