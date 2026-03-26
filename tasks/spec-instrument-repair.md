# Technical Specification: Instrument Repair Workflow

**Date:** 2026-03-25
**Author:** Joseph Brassell
**Status:** Complete
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Status Workflow (Spec 1), Pricing & Quoting (Spec 4), Inventory & Parts (Spec 6), Shipping & Logistics (Spec 8)

---

## 1. Overview

Surgical instrument repair is a distinct workflow from endoscope (rigid/flexible) repair. Instead of a single high-value scope, a single WO contains **many individual instruments** (10–60+ items). The workflow involves OPS intake, technician inspection (D&I), item-level pricing from an OS code catalog, two-stage QC, and customer approval before repair.

### Current State (Paper-Based)
1. **OPS** creates WO with customer, department, PO#, complaint, claimed count
2. **Tech** opens the box, inspects every instrument, writes findings on paper D&I form (Form #OM05-4)
3. **OPS** re-keys handwritten D&I into system, generates 5-page paper quote
4. **Customer** circles Y/N per item on paper quote, signs, returns via fax/mail
5. **Tech** repairs approved items, initials each on BI form
6. **Tech QC** verifies count, visual + functional inspection (P/F)
7. **Commercial QC** second pass: count + visual inspection (P/F)
8. **OPS** ships and invoices

### Key Insight
Tech never touches the system today. OPS re-keys everything. This is the core inefficiency the cloud system eliminates.

### Customer Input Is Unreliable
Customer says "15 graspers." Tech opens box — it's 12 graspers, 2 scissors, and a nail nipper. Physical inspection is the source of truth. The system tracks both **claimed count** (from customer) and **actual count** (from tech D&I).

---

## 2. Schema — Core Tables

### 2.1 `InstrumentItems` (Per-Item on a WO)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lInstrumentItemKey` | `int` (PK, identity) | No | Unique item ID |
| `lRepairKey` | `int` (FK → Repairs) | No | Parent work order |
| `sInstrCode` | `varchar(20)` | No | OS code (e.g., "OS366") or future category code |
| `sProductCategory` | `varchar(100)` | Yes | Resolved category name from catalog |
| `sDescription` | `varchar(255)` | Yes | Resolved description from catalog |
| `sManufacturer` | `varchar(100)` | Yes | gSource, V. Mueller, Storz, Miltex, Generic, etc. |
| `sModel` | `varchar(100)` | Yes | Model number |
| `sSerialNumber` | `varchar(50)` | Yes | Serial or "N/A" for instruments without serials |
| `nQuantity` | `int` | No | Usually 1; 2+ for identical items (same model, no serial) |
| `sRepairsNeeded` | `varchar(255)` | Yes | Multi-value: Sharpen, Clean, Reset, Adjust, Replace |
| `sRRO` | `varchar(10)` | Yes | Designation: Repair / Replace / Other |
| `sFindings` | `text` | Yes | Free text — damage notes, BER reason |
| `bBER` | `bit` | No | Beyond Economical Repair flag (default 0) |
| `nRate` | `decimal(10,2)` | Yes | Per-unit price from code/category lookup |
| `nAmount` | `decimal(10,2)` | Yes | Computed: qty × rate ($0.00 if BER) |
| `sItemStatus` | `varchar(20)` | No | See §3 for statuses |
| `sTechInitials` | `varchar(10)` | Yes | Who repaired this item |
| `nRepairLevel` | `int` | Yes | 1/2/3 — future use for category+level pricing |
| `bOutsource` | `bit` | No | Outsource flag (default 0) |
| `sOutsourceVendor` | `varchar(100)` | Yes | Vendor name if outsourced |
| `nOutsourceCost` | `decimal(10,2)` | Yes | Cost if outsourced |
| `bCustomerApproved` | `bit` | Yes | null=pending, 1=approved, 0=rejected |
| `dtApprovedDate` | `datetime` | Yes | When customer approved/rejected |
| `nSortOrder` | `int` | Yes | Display order within WO |

**Audit Fields:** `lCreateUser`, `dtCreateDate`, `lLastUpdateUser`, `dtLastUpdate`

### 2.2 `QCRecords` (Per WO, Per QC Stage)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lQCKey` | `int` (PK, identity) | No | Unique QC record ID |
| `lRepairKey` | `int` (FK → Repairs) | No | Parent work order |
| `sQCType` | `varchar(15)` | No | `'Tech'` or `'Commercial'` |
| `nTotalCount` | `int` | No | Verified instrument count |
| `sVisualInspection` | `char(1)` | No | `'P'` or `'F'` |
| `sFunctionalInspection` | `char(1)` | Yes | `'P'` or `'F'` — Tech QC only, null for Commercial |
| `sInspectedBy` | `varchar(50)` | No | Inspector name |
| `dtInspectionDate` | `datetime` | No | When inspection occurred |
| `sNotes` | `text` | Yes | Rework notes if failed |

**Audit Fields:** `lCreateUser`, `dtCreateDate`

### 2.3 `InstrumentPricingCatalog` (Flexible for Both Models)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `sCode` | `varchar(20)` (PK) | No | OS code (e.g., "OS366") or future "NAIL-L2" |
| `sDescription` | `varchar(255)` | No | "Nail Nippers - Sharpen/Repair" |
| `sCategory` | `varchar(100)` | No | Category name: "Nail Nippers" |
| `sInstrumentGroup` | `varchar(50)` | Yes | One of 17 instrument groups (Arthroscopy, Bone, etc.) |
| `nRepairLevel` | `int` | Yes | null for OS codes; 1/2/3 for category+level model |
| `nBaseRate` | `decimal(10,2)` | No | Base price ($30.80) |
| `bActive` | `bit` | No | Active flag |
| `bPartFlag` | `bit` | No | Part (vs labor) flag |
| `bMajorRepair` | `bit` | No | Major repair flag |

### 2.4 Legacy Table Mapping

The legacy system uses different tables for instrument repair items:

| Cloud Table | Legacy Table | Notes |
|-------------|-------------|-------|
| `InstrumentItems` | `tblRepairItemTran` | Junction: repair × catalog item. Uses `sInitials`, `nUnitCost` |
| `InstrumentPricingCatalog` | `tblRepairItem` | 734 items. Has `nUnitCost`, `bPartFlag`, `bMajorRepair` |
| `QCRecords` | *No equivalent* | QC is paper-only today |

**Legacy field mappings:**
- `tblRepairItemTran.sInitials` → `InstrumentItems.sTechInitials`
- `tblRepairItemTran.nUnitCost` → `InstrumentItems.nRate`
- `tblRepairItem.nUnitCost` → `InstrumentPricingCatalog.nBaseRate`
- `tblRepairItem.sRepairItem` → `InstrumentPricingCatalog.sDescription`

---

## 3. Item Statuses & Lifecycle

### Per-Item Status Flow
```
Received → In Progress → Complete
                ↓
           Outsourced → Complete
                ↓
          QC Rejected → In Progress (rework)
```

| Status | Meaning | Set By |
|--------|---------|--------|
| `Received` | Item entered during D&I, awaiting customer approval or repair | Tech/OPS |
| `In Progress` | Actively being repaired | Tech |
| `Outsourced` | Sent to external vendor | OPS |
| `Complete` | Repair finished, awaiting QC | Tech |
| `QC Rejected` | Failed QC, needs rework | QC Inspector |

### WO-Level Status Integration

Instrument WOs follow the standard 20-status repair workflow (Spec 1) with these specific transitions:

| WO Status | Trigger |
|-----------|---------|
| `Received/Logged In` | WO created at intake |
| `Pending Evaluation` | Tech begins D&I |
| `Quoted/Pending Approval` | D&I complete, quote generated |
| `In Progress` | Customer approves (any items) |
| `Complete` | All approved items Complete + both QC gates pass |
| `Ready to Ship` | QC passed, packed |

---

## 4. Business Rules

### 4.1 OPS Intake
- WO type determined by parent group = "Instruments" (vs Rigid/Flexible/Camera)
- Customer claimed count stored on WO as reference only — not binding
- Clean/unclean toggle: if unclean, system flags OM-22 decontamination protocol required before tech handles

### 4.2 Tech D&I Entry (Core New Feature)
- Tech opens WO on tablet/workstation at bench
- Header auto-populated: customer name, complaint, claimed count
- **Add items flow:**
  1. Search catalog by name or code ("nail nipper" → OS366 → $30.80)
  2. Select manufacturer from known dropdown (gSource, V. Mueller, Storz, Miltex, Generic, Other)
  3. Enter model number (free text)
  4. Enter serial number (free text, or "N/A" button for instruments without serials)
  5. Select repairs needed (multi-select: Sharpen, Clean, Reset, Adjust, Replace)
  6. Select R/R/O designation
  7. Enter findings notes (free text — damage description, BER justification)
  8. Toggle BER if Beyond Economical Repair
  9. Enter quantity (default 1; use 2+ for identical items without serials)
- **Quick-add:** After saving an item, cursor returns to catalog search for rapid entry
- **Running count:** Display "14 of 15 claimed instruments entered" (actual vs claimed)
- Items auto-group by category on screen
- When D&I is complete → OPS reviews (but does NOT re-enter)

### 4.3 BER Handling
- When `bBER = 1`:
  - `nRate` and `nAmount` set to `$0.00`
  - Item status remains `Received` (no repair performed)
  - `sFindings` should contain BER justification
  - Item appears on quote with $0.00 and "Beyond Economical Repair" note
  - BER items are NOT eligible for customer approval — they are informational
  - BER count tracked separately in WO summary

### 4.4 Pricing Rules
- **Current model (OS codes):** Direct code lookup → price. One code per instrument type + repair action.
- **Future model (Category + Level):** Category × repair level (1/2/3) = price from matrix.
- **Abstraction strategy:** Item record stores the resolved code AND price. Changing the pricing model doesn't break existing WOs.
- Contract pricing: If department is under a capitated contract, instrument repair pricing follows the contract cap schedule (see Spec 3, §4.2).
- Max charge caps: `tblMaxCharge` records (27K entries by dept + model) may override catalog pricing.

### 4.5 Two-Stage QC

**Gate 1 — Tech QC:**
- Verify total instrument count matches actual count
- Visual Inspection: Pass/Fail (all items)
- Functional Inspection: Pass/Fail (all items)
- Inspector name + date recorded
- If Fail → flag specific items for rework with reason

**Gate 2 — Commercial QC:**
- Verify total instrument count (second independent count)
- Visual Inspection: Pass/Fail
- Inspector name + date recorded
- If Fail → flag specific items for rework with reason

**Both gates must pass** before WO advances to "Complete." A failed gate sets rejected items back to `In Progress` for rework.

### 4.6 Customer Approval
- After D&I complete, OPS generates quote (grouped by category)
- Customer receives quote with per-item approve/reject
- Partial approval supported — only approved items proceed to repair
- Rejected items remain at `Received` status, excluded from invoice total
- BER items are informational (shown but not approvable)
- **Future:** Digital approval portal replaces paper (System 3, §7)

### 4.7 Batch Operations
- Select multiple items of same category → mark all as a single status
- Select multiple items → assign same tech
- "Mark All Complete" for bulk completion after batch repairs

### 4.8 Outsource Tracking (Per Item)
- Any item can be flagged `bOutsource = 1`
- Must record: vendor name, outsource cost
- Margin calculation: `nRate - nOutsourceCost`
- Outsourced items follow the same QC gates on return

---

## 5. API Endpoints

### 5.1 Instrument Items

| Method | Endpoint | Query/Body | Response |
|--------|----------|-----------|----------|
| GET | `/InstrumentItems/GetByRepairKey` | `plRepairKey` | Array of items for this WO |
| POST | `/InstrumentItems/Add` | `{lRepairKey, sInstrCode, sManufacturer, sModel, sSerialNumber, nQuantity, sRepairsNeeded, sRRO, sFindings, bBER, nRate, nAmount}` | `{lInstrumentItemKey, success}` |
| POST | `/InstrumentItems/Update` | `{lInstrumentItemKey, ...fields}` | `{success}` |
| DELETE | `/InstrumentItems/Delete` | `plInstrumentItemKey` | `{success}` |
| POST | `/InstrumentItems/BatchUpdateStatus` | `{itemKeys: [int], sItemStatus, sTechInitials?}` | `{success, updatedCount}` |

### 5.2 Pricing Catalog

| Method | Endpoint | Query/Body | Response |
|--------|----------|-----------|----------|
| GET | `/InstrumentCatalog/Search` | `psQuery` (name or code), `psGroup?` | Array of matching catalog items |
| GET | `/InstrumentCatalog/GetAll` | `psGroup?`, `pbActive?` | Full catalog (or filtered by group) |
| GET | `/InstrumentCatalog/GetByCode` | `psCode` | Single catalog item |

### 5.3 QC Records

| Method | Endpoint | Query/Body | Response |
|--------|----------|-----------|----------|
| GET | `/QC/GetByRepairKey` | `plRepairKey` | Array of QC records (0–2) for this WO |
| POST | `/QC/Add` | `{lRepairKey, sQCType, nTotalCount, sVisualInspection, sFunctionalInspection?, sInspectedBy}` | `{lQCKey, success}` |

### 5.4 Existing Endpoints (Already Built)

These endpoints in `server/routes/repair-details.js` already handle instrument items via the legacy schema:

| Method | Endpoint | Notes |
|--------|----------|-------|
| GET | `/Detail/GetAllRepairDetailsList` | Returns `tblRepairItemTran` rows joined to `tblRepairItem` catalog |
| POST | `/Detail/AddRepairDetail` | Inserts into `tblRepairItemTran` |
| DELETE | `/Detail/DeleteRepairDetail` | Deletes from `tblRepairItemTran` |
| GET | `/RepairItems/GetAllRepairItems` | Returns catalog items (734 active) |

**Migration path:** Extend the existing `repair-details.js` endpoints with instrument-specific fields (manufacturer, model, serial, BER, QC) rather than creating a parallel route file. The `tblRepairItemTran` table can be extended with the new columns.

---

## 6. Downstream Impacts

| Event | Impact |
|-------|--------|
| **D&I complete** | WO advances to "Quoted/Pending Approval"; quote PDF generates |
| **Customer approves items** | Approved items → "In Progress"; WO → "In Progress" |
| **All items Complete** | WO eligible for QC gates |
| **Both QC pass** | WO → "Complete" → ready for shipping |
| **QC fails** | Rejected items → "In Progress" (rework); WO stays at current status |
| **BER flagged** | Item excluded from invoice total; count tracked for reporting |
| **Item outsourced** | Item status → "Outsourced"; cost tracked for margin calculation |
| **Invoice generated** | Only `bCustomerApproved = 1` and `bBER = 0` items included |

---

## 7. Future: Customer Approval Portal (System 3)

**Not building in Phase 1** — but the data model supports it from day one.

Digital replacement for the 5-page paper quote:
- Unique link per WO sent to customer contact email
- Mobile-friendly item list grouped by category
- Approve/Reject toggle per item (or "Approve All" button)
- BER items clearly flagged with explanation (not approvable)
- Partial approval supported
- E-signature capture
- Instant submission → OPS notification
- Customer portal record in `tblTSIPortalCustomer` (existing table)

**Data model ready:** `bCustomerApproved` + `dtApprovedDate` fields on `InstrumentItems` table support this without schema changes.

---

## 8. Future: Category + Level Pricing (System 2)

**Current model (OS codes):** Works today. 734 codes, one per instrument type + repair action.

**Future model (Joseph is designing groupings):**
- Categories: Lap Instruments, ENT, General Scissors, Nail Nippers, Forceps, Osteotomes, etc.
- Levels: 1 (minor/sharpen), 2 (mid/clean+reset), 3 (major/full repair)
- Price matrix: Category × Level = price

**Abstraction strategy:**
- `InstrumentPricingCatalog` supports both models via `nRepairLevel` (null for OS codes, 1/2/3 for category model)
- Item record stores the resolved code AND the resolved price at time of quote
- Switching pricing models doesn't break existing WOs — historical prices frozen on the item record

---

## 9. Edge Cases

| Scenario | Handling |
|----------|----------|
| **Claimed count ≠ actual count** | Display discrepancy: "Customer claimed 15, tech found 14." Not a blocker. |
| **All items BER** | WO can still be completed — invoice total = $0.00, status advances normally |
| **Partial customer approval** | Only approved items repaired. Rejected items stay at Received, excluded from invoice. |
| **QC count mismatch** | QC inspector's count vs D&I count flagged. Requires investigation before QC can pass. |
| **Item added after quote sent** | Requires revised quote. System tracks quote version (amendment). See Spec 4, §6. |
| **Outsource + BER** | If vendor determines BER after outsource, toggle BER flag and update findings. Outsource cost still recorded for reporting. |
| **Zero-quantity items** | Not allowed — minimum quantity is 1. Remove item instead. |
| **Duplicate serial numbers** | Allowed across different WOs (instrument may return for repair). Unique within a single WO. |
| **Unclean instruments** | OM-22 decontamination protocol required. System displays warning banner until clean toggle set. |

---

## 10. Open Items (For Joseph)

1. **Category/level groupings** — Joseph is actively designing these. System will support both models via `nRepairLevel`. No blocker for initial build.
2. **Tech access method** — Tablets at bench? Shared workstation? Barcode scanning? Affects D&I screen UX but not data model. (See tablet tech workflow roadmap — Q4 2026.)
3. **Photo capture** — Adding damage photos per item during D&I? Requires file storage strategy. Defer to Phase 2.
4. **Inventory/parts tracking per item** — Legacy BI form has "Inventory Used" column. How detailed does parts consumption need to be per instrument item? Current `tblRepairInventory` junction table exists but may need instrument-level linking.

---

## 11. Legacy Forms Reference

| Form | Number | Revision | Purpose |
|------|--------|----------|---------|
| Damage & Inspection (D&I) | OM05-4 | 09/2023 | Tech writes findings per instrument |
| Blank Inspection | OM07-2 | 09/2016 | QC pass/fail checklist |
| Quote/Requisition | OM07-6 | 12/2020 | Customer-facing price list for approval |
| 40-Day Warranty | OM06-2 | 09/2023 | Return within 40 days of prior repair |

**Sample WO:** NR25044011, VA Medical Center Amarillo, 20 instruments, $379.12 total

---

## 12. What Exists Today (UI)

Built in `js/instrument-repairs-tab.js`:
- Cockpit-style list + detail view ✓
- Items tab with item code, mfr, model, serial, description, amount ✓
- Status workflow (Received → In Progress → Complete → Invoiced) ✓
- Outsource tracking per item ✓
- Financials tab ✓
- New order wizard (client → dept → create) ✓

**What Needs to Be Built/Changed:**
1. **D&I entry screen** — tech-facing item entry flow (the big new feature)
2. **OS code / pricing catalog search** — type-ahead lookup that auto-fills description + price
3. **QC workflow gates** — Tech QC + Commercial QC as system-enforced steps
4. **BER handling** — flag, $0 pricing, reason tracking, quote exclusion
5. **Batch item operations** — select multiple → change status, assign tech
6. **Item grouping by category** — visual grouping in items tab and on quote PDF
7. **Customer approval fields** — approved/rejected per item (data model ready for future portal)
8. **Claimed vs actual count** — OPS enters claim, tech enters actual, system shows discrepancy
