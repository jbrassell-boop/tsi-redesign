# Technical Specification: Inventory & Parts Management

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Workflow, Scope Types, Invoicing

---

## 1. Overview

The inventory system tracks **parts and materials** consumed during scope repairs. It manages:
- **Parts catalog** — master list of repair items (labor + parts codes)
- **Inventory items** — physical stock with quantity tracking, min/max levels
- **Inventory sizes** — size/model variants of each inventory item with individual stock levels
- **Repair inventory** — which parts were used on which repair (junction table)
- **Pick list** — form OM07-6 showing technician what to pull from stock
- **Low stock alerts** — reorder point detection

---

## 2. Schema — Core Tables

### 2.1 `tblInventory` (Parts Master)

| Column | Type | Description |
|--------|------|-------------|
| `lInventoryKey` | `int` (PK) | Unique item ID |
| `sItemDescription` | `varchar(50)` | Part name (e.g., "CCD Assembly", "Bending Section Mesh") |
| `sRigidOrFlexible` | `char(1)` | Scope type: F/R |
| `nLevelMinimum` | `int` | Reorder threshold |
| `nLevelMaximum` | `int` | Max stock level |
| `nLevelCurrent` | `int` | Aggregate current quantity (sum of all sizes) |
| `bActive` | `bit` | Active flag |
| `bNoCountAdjustment` | `bit` | Skip physical count audits |
| `bAlwaysReOrder` | `bit` | Always reorder regardless of stock level |
| `bLargeDiameter` | `bit` | Large diameter scope handling |
| `bSkipPickList` | `bit` | Exclude from OM07-6 pick list |

### 2.2 `tblInventorySizes` (Size Variants)

| Column | Type | Description |
|--------|------|-------------|
| `lInventorySizeKey` | `int` (PK) | Unique size variant ID |
| `lInventoryKey` | `int` (FK → Inventory) | Parent item |
| `sSizeDescription` | `varchar(200)` | Size/variant name (e.g., "GIF-H190 CCD", "9.8mm") |
| `sSizeDescription2` | `varchar(200)` | Internal part number |
| `sSizeDescription3` | `varchar(200)` | Extended notes |
| `sRigidOrFlexible` | `char(1)` | Scope type |
| `nLevelCurrent` | `int` | Current stock level |
| `nLevelMinimum` | `int` | Min threshold |
| `nLevelMaximum` | `int` | Max threshold |
| `nReorderPoint` | `int` | Reorder trigger level |
| `dblUnitCost` | `decimal(10,2)` | Cost per unit |
| `bActive` | `bit` | Active/inactive |
| `bAlwaysReorder` | `bit` | Always reorder |
| `bScanRequired` | `bit` | Barcode scan required on use |
| `bLargeDiameter` | `bit` | Large diameter flag |
| `bIncludeInWeeklyAudit` | `bit` | Include in weekly audit count |
| `sStatus` | `varchar(50)` | Status text |

### 2.3 `tblRepairInventory` (Parts Used on Repair)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairInventoryKey` | `int` (PK) | Record ID |
| `lRepairItemTranKey` | `int` (FK) | Links to repair item transaction |
| `lScopeTypeRepairItemInventoryKey` | `int` (FK) | Links to scope-type BOM entry |

### 2.4 `tblRepairItem` (Repair Code Catalog — 734 items)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairItemKey` | `int` (PK) | Unique code |
| `sItemDescription` | `varchar(50)` | Description |
| `sRigidOrFlexible` | `char(1)` | F/R |
| `sPartOrLabor` | `char(1)` | `P` = part, `L` = labor |
| `nUnitCost` | `decimal(10,2)` | Cost per unit |
| `dblAvgCostMaterial` | `decimal(10,2)` | Avg material cost |
| `dblAvgCostLabor` | `decimal(10,2)` | Avg labor cost |
| `nPoints` / `nPointsSmall` | `decimal(10,2)` | Productivity points |
| `sTSICode` | `varchar(50)` | Internal TSI code |
| `bActive` | `bit` | Active flag |

### 2.5 `tblRepairItemTran` (Repair Line Items)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairItemTranKey` | `int` (PK) | Transaction ID |
| `lRepairKey` | `int` (FK → Repairs) | Parent repair |
| `lRepairItemKey` | `int` (FK → RepairItems) | Catalog item |
| `sItemDescription` | `varchar(200)` | Description |
| `sTSICode` | `varchar(50)` | TSI code |
| Quantity, cost fields | Various | Line item financials |

---

## 3. Inventory Status Computation

```javascript
function computeStatus(item) {
  const cur = item.nLevelCurrent || 0;
  const min = item.nLevelMinimum || 0;
  if (min > 0 && cur < min) return 'Critical';   // Red
  if (min > 0 && cur < min * 1.2) return 'Low';  // Yellow
  return 'OK';                                     // Green
}
```

---

## 4. Low Stock Detection

```javascript
// Fires when: current stock < reorder point
lowStock = inventorySizes.filter(s =>
  (s.nLevelCurrent || 0) < (s.nReorderPoint || 0)
  && (s.nReorderPoint || 0) > 0
);
```

Surfaces in morning briefing dashboard as a queue card: "Inventory Low Stock: {count}"

---

## 5. Parts → Repair Cost Roll-Up

When parts are used on a repair, costs accumulate:

```javascript
// From Financials tab
const labor    = parseFloat(d.dblAmtCostLabor) || 0;     // sPartOrLabor = 'L'
const material = parseFloat(d.dblAmtCostMaterial) || 0;   // sPartOrLabor = 'P'
const shipping = parseFloat(d.dblAmtShipping) || 0;
const commission = parseFloat(d.dblAmtCommission) || 0;
const outsource = parseFloat(d.dblOutSourceCost) || 0;

const totalExpense = labor + material + shipping + commission + outsource;
const revenue = parseFloat(d.dblAmtRepair) || 0;
const margin = revenue - totalExpense;
const marginPct = revenue > 0 ? (margin / revenue * 100) : 0;
```

---

## 6. Pick List (Form OM07-6)

| Field | Description |
|-------|-------------|
| Phase | 3 (In Repair) |
| Statuses | 3, 4 |
| Status Change | None (informational form) |

**Columns:** Part Name, Size/Variant, Lot Number, Qty

**Purpose:** Shows technician which parts to pull from stock for this repair. Generated from `repair.repairInventory` array.

---

## 7. Quantity Tracking Workflow

### Current Flow
1. Technician selects repair item from catalog
2. Creates `tblRepairItemTran` record (cost/labor entry)
3. If part: creates `tblRepairInventory` linking to scope-type BOM
4. UI shows part in pick list + inventory tab
5. `sPosted = 'Y'` when repair completes

### Known Gap: Quantity Decrement

```javascript
// In repairs.html
postInventory() {
  console.log('[TSI] Post inventory — not yet wired');
}
```

**Developer must implement:**
- When to decrement: at pick time? at repair completion? at invoice?
- Lot number tracking (FIFO/LIFO)
- Reorder trigger when stock hits minimum
- `nLevelCurrent` update on both `tblInventory` and `tblInventorySizes`

---

## 8. BOM (Bill of Materials) / Assembly

### `tblInventoryAssembly`
- Manages kit/assembly components
- `lInventorySizeKey_Parent` → parent assembly
- Used for bulk picks (e.g., "scope repair kit" = 5 subcomponents)

### `tblScopeTypeRepairItemInventoryItems`
- BOM mapping: which inventory sizes are used in which repair items for which scope types
- 15,985 rows in production
- Critical for pick list generation and cost estimation

---

## 9. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Inventory/GetAllInventoryList` | POST | All inventory items (paginated) |
| `/Inventory/GetAllInventorySizesList` | POST | Sizes for one item (paginated) |
| `/Inventory/AddInventory` | POST | Create new inventory item |
| `/Inventory/GetAllInventorySizesById` | GET | Single size detail |
| `/Inventory/AddInventorySize` | POST | Create new size variant |
| `/Inventory/UpdateInventorySize` | POST | Update size record |
| `/Inventory/DeleteInventorySize` | DELETE | Remove size variant |
| `/Inventory/GetDemandForecast` | GET | Demand forecast data |
| `/RepairInventory/GetAllRepairInventoryList` | GET | Parts used on a repair |
| `/RepairInventory/AddRepairInventory` | POST | Add part to repair |

---

## 10. Inventory Dashboard (dashboard_inventory.html)

### KPI Strip
- Total items
- Critical count (red)
- Low count (yellow)
- OK count (green)

### Filtering
- By status: Critical, Low, OK
- By type: Flexible, Rigid
- By search term

### Regional Note
North and South locations may have separate inventory pools. See `tasks/inventory-merge-plan.md` for the consolidation strategy — this is a significant future effort (280K+ transactions to remap).

---

## 11. Open Questions

1. **When does quantity decrement?** At pick time, repair completion, or invoice? This is the critical missing piece.
2. **Lot tracking** — is FIFO/LIFO required? Are there expiration dates on parts?
3. **Inventory receiving** — is there a purchase order / receiving workflow for incoming stock?
4. **North/South consolidation** — when is the regional inventory merge happening? Schema implications for `tblInventorySizeStock` per location.
5. **Cost method** — average cost, FIFO cost, or standard cost for material cost roll-up?
