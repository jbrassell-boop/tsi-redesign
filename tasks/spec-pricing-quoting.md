# Technical Specification: Pricing & Quoting

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Contract Management, Client/Department Hierarchy, Repair Status Workflow

---

## 1. Overview

Pricing in TSI is multi-layered. The final cost of a repair depends on the **pricing category** (assigned at client/department level), the **contract type** (if any), the **repair items** performed, the **parts consumed**, and the **max charge cap** for that specific scope model at that department. This spec defines every layer and how they interact.

---

## 2. Schema — Core Tables

### 2.1 `PricingCategories` (Pricing Tier Lookup)

| Column | Type | Description |
|--------|------|-------------|
| `lPricingCategoryKey` | `int` (PK) | Category identifier |
| `sPricingDescription` | `varchar(50)` | Display name |
| `bActive` | `bit` | Is this category currently available? |
| `bDefault` | `bit` | Default category for new clients |

**Seed Data (5 categories):**

| Key | Description | Default | Notes |
|-----|-------------|---------|-------|
| 1 | Standard | Yes | Default for new clients — fee-for-service base pricing |
| 2 | Premier | No | Negotiated premium tier — national accounts, high volume |
| 3 | GSA 2014 (Joint) | No | Government Services Administration schedule pricing |
| 4 | Government | No | CAP / Capitated government contracts |
| 5 | HPG | No | HealthTrust Purchasing Group — GPO pricing |

**Where it's assigned:**
- `clients.lPricingCategoryKey` — default for the client
- `departments.lPricingCategoryKey` — override at department level (department wins)
- `repairs.lPricingCategoryKey` — stamped on the repair at creation (snapshot)

**Business Rule:** Department pricing category overrides client pricing category. If department has no category set, inherit from client.

### 2.2 `RepairItems` (Repair Operations Catalog)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairItemKey` | `int` (PK) | Catalog item identifier |
| `sItemDescription` | `varchar(200)` | What this repair operation is |
| `sRigidOrFlexible` | `char(1)` | Scope type filter: F=Flexible, R=Rigid |
| `sPartOrLabor` | `char(1)` | Cost type: P=Part, L=Labor |
| `nTurnAroundTime` | `int` | Expected days for this operation |
| `nUnitCost` | `decimal(10,2)` | Base catalog cost |
| `bActive` | `bit` | Is this item currently available? |
| `lRepairLevelKey` | `int` (FK → RepairLevels) | Complexity tier this item belongs to |

**734 catalog items.** Examples:

| Key | Description | Type | Part/Labor | Cost | Level |
|-----|-------------|------|------------|------|-------|
| 1 | Distal Tip Replacement | F | Part | $85.00 | Mid-Level (2) |
| 3 | Insertion Tube Replacement | F | Part | $350.00 | Major (3) |
| 4 | CCD Chip Replacement | F | Part | $450.00 | Major (3) |
| 11 | Fluid Seal Kit | F | Part | $40.00 | Minor (1) |

**Filtering:** When adding items to a repair, filter catalog by:
- `sRigidOrFlexible` matching the scope type on the repair
- `bActive = true`
- Optionally by `lRepairLevelKey` matching the repair level

### 2.3 `RepairDetails` (Line Items on a Repair)

| Column | Type | Description |
|--------|------|-------------|
| `lRepairItemTranKey` | `int` (PK, identity) | Transaction ID |
| `lRepairKey` | `int` (FK → Repairs) | Parent repair |
| `lRepairItemKey` | `int` (FK → RepairItems) | Catalog reference |
| `sItemDescription` | `varchar(200)` | Description (copied from catalog, can be edited) |
| `nRepairPrice` | `decimal(10,2)` | Quoted/charged price for this line |
| `dblRepairPrice` | `decimal(10,2)` | Same as above (legacy dual field) |
| `sApproved` | `char(1)` | Approval state: Y=Approved, P=Pending, N=Not Approved |
| `bPrimary` | `bit` | Is this the primary repair operation? |
| `mComment` | `varchar(500)` | Optional notes (e.g., "Both up/down cables") |

**Business Rules:**
- `nRepairPrice` may differ from `nUnitCost` in the catalog — it's the actual quoted price
- `sApproved = 'Y'` items are included in the repair total
- `sApproved = 'P'` items are pending customer approval (part of the quote)
- `sApproved = 'N'` items were rejected and excluded from the total
- `bPrimary = true` marks the main repair; others are secondary/supporting

### 2.4 `ModelMaxCharges` (Cost Caps by Dept + Scope Model)

| Column | Type | Description |
|--------|------|-------------|
| `lModelMaxChargeKey` | `int` (PK) | Record identifier |
| `lDepartmentKey` | `int` (FK → Departments) | Which department |
| `lScopeTypeKey` | `int` (FK → ScopeTypes) | Which scope model |
| `sScopeTypeDesc` | `varchar(100)` | Model name (denormalized) |
| `mMaxCharge` | `money` | Maximum billable amount |

**27,703 records** — one per department + scope model combination.

**Example ranges:**
- Endoscopy models (GIF, CF, PCF): $2,100 – $5,000
- Urology models (CYF, URF): $1,400 – $3,400
- OR/Arthroscope models: $1,400 – $2,700

**Business Rule:** Max charge is per department per scope model — not per repair level. The same scope model can have different max charges at different departments based on their contract or negotiated rates.

---

## 3. Pricing Determination Flow

When a repair is created, the system determines pricing through this cascade:

```
Step 1: Identify Pricing Category
  └─ Does department have lPricingCategoryKey set?
      ├─ YES → Use department's pricing category
      └─ NO  → Use client's pricing category (default: Standard)

Step 2: Check Contract
  └─ Does this repair fall under an active contract?
      ├─ YES → Pricing is governed by contract terms
      │    ├─ CAP/Capitated → Fixed monthly fee, no per-repair billing
      │    ├─ Shared Risk → Base fee + cost sharing formula
      │    ├─ CPO → Fixed per-outcome pricing
      │    ├─ FFS under contract → Negotiated rates from pricing category
      │    └─ T&M → Time & materials at agreed rates
      └─ NO  → Fee-for-Service (FFS) using pricing category rates

Step 3: Look Up Max Charge
  └─ Query ModelMaxCharges WHERE lDepartmentKey AND lScopeTypeKey
      ├─ FOUND → Cap repair total at mMaxCharge
      └─ NOT FOUND → No cap (bill actual)

Step 4: Build Repair Total
  └─ Sum of all RepairDetails WHERE sApproved = 'Y'
      = dblAmtRepair (stored on Repairs table)

Step 5: Validate Against Cap
  └─ IF dblAmtRepair > mMaxCharge → Fire "Max Charge Exceeded" alert
```

### 3.1 Customer Type Display

The UI displays the customer type as a quick identifier:

```
IF lPricingCategoryKey = 4 (Government) → Display "CAP"
ELSE → Display "FFS"
```

This appears on:
- Repair header
- Requisition form (OM07-2) PDF export
- Dashboard repair cards

---

## 4. Quote / Requisition Workflow

### 4.1 Building a Quote

1. **Technician evaluates scope** during Phase 2 (Evaluation)
2. **Adds repair items** from the catalog to RepairDetails
   - Each item gets `sApproved = 'P'` (Pending) initially
   - Price set from `nUnitCost` or manually adjusted
3. **Generates Requisition form** (OM07-2)
   - PDF includes: serial number, scope model, customer type, all line items with prices
   - Total = sum of all pending/approved line items
4. **Sent to customer** for approval
5. **Customer approves/rejects** individual line items
   - Approved items → `sApproved = 'Y'`
   - Rejected items → `sApproved = 'N'`
6. **Repair total recalculated** from approved items only

### 4.2 Requisition Form Content (OM07-2)

| Section | Data Source |
|---------|-------------|
| Header | TSI company info, form number, date |
| Scope Info | Serial number, model, scope type |
| Customer Info | Client name, department, customer type (CAP/FFS) |
| Line Items | All RepairDetails for this repair |
| Each Line | Description, price, approval status, primary flag |
| Total | Sum of line item prices |
| Notes | Repair reason, comments |

### 4.3 Amendment to Quote (OM07-9)

When the repair scope changes after initial quote:

**Amendment Types:**
- Additional Findings
- Not Repairable
- Rework

**Amendment Reasons:**
- Failure found during repair
- Failure missed during D&I
- Failure missed during update
- Misquote by operations
- Result of another repair being performed
- Part failure during repair
- Failure found during final QC

**Data Captured:**
- Amendment type (dropdown)
- Amendment date
- Amendment reason (dropdown)
- Technician initials
- Comment (free text)

**Effect:** Sets `bFlaggedForRevisedQuote = true` on the repair. Does NOT auto-change line item prices — that's a manual update to RepairDetails.

---

## 5. Invoice Amount Calculation

### 5.1 Base Amount

```
dblAmtRepair = SUM(nRepairPrice) FROM RepairDetails
               WHERE lRepairKey = @repairKey
               AND sApproved = 'Y'
```

This value is **stored** on the Repairs record, not dynamically calculated at invoice time.

### 5.2 Tax

```
dblTax = dblAmtRepair * 0.07    (fixed 7% rate)
```

**Open Question:** Is tax rate always 7%? Should it vary by state/location? Currently hardcoded.

### 5.3 Shipping

```
dblAmtShipping = deliveryMethods[lDeliveryMethodKey].dblAmtShipping
```

Shipping cost comes from the carrier/method selected at ship time.

### 5.4 Total Invoice

```
dblTotal = dblAmtRepair + dblTax + dblAmtShipping
```

### 5.5 Max Charge Enforcement

```
IF dblAmtRepair > mMaxCharge:
  → Smart Alert: "Max Charge Exceeded" (WARNING, not blocking)
  → User can proceed — the alert is for awareness
  → May require customer communication / approval for overage
```

---

## 6. Contract Pricing Impact

| Contract Type | Pricing Behavior |
|---------------|-----------------|
| **CPO (Capitated Per Outcome)** | Fixed monthly fee covers all repairs. Individual repair costs tracked but not billed per-repair. |
| **Fuse (Full Service)** | Fixed monthly fee. All work included. |
| **Capitated Service (CAP)** | Fixed cost structure. Uses Government pricing category (key 4). |
| **Shared Risk** | Monthly base + cost sharing. Expense multiplier tracked (actual cost / contract revenue). |
| **Cart** | Cart-specific contract. Covers cart assembly/maintenance. |
| **Airway** | Airway scope specific contract. |
| **Rental** | Loaner/rental agreement. Not repair pricing. |
| **Time & Materials (T&M)** | Billed at agreed hourly rate + parts at cost. |

**Key Rule:** Even under contract, individual repair costs are still tracked in `dblAmtRepair` for profitability analysis. The contract just changes how/whether the customer is billed.

---

## 7. National Account Pricing

**Field:** `clients.bNationalAccount` (bit)

National accounts are multi-facility healthcare systems. Pricing impact:
- Typically assigned Premier (key 2) or HPG (key 5) pricing category
- Usually have contracts (Capitated, Shared Risk, CPO) rather than FFS
- Max charge caps may be negotiated across all departments in the system
- Same pricing terms apply to all departments under the national account

**Examples in system:** Duke University, Johns Hopkins, UPMC, MUSC, Nashville Gen Hospital

---

## 8. Pricing Category Override Pattern

```
┌──────────┐     ┌──────────────┐     ┌────────┐
│  Client   │ ──→ │  Department  │ ──→ │ Repair │
│  Cat: 1   │     │  Cat: 2      │     │ Cat: 2 │  ← Stamped at creation
│ (Standard)│     │  (Premier)   │     │        │     from department
└──────────┘     └──────────────┘     └────────┘

Department overrides Client.
Repair snapshots from Department (or Client if dept has none).
```

This is consistent with the override pattern in `spec-client-department.md` — department-level settings always win.

---

## 9. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/PricingCategory/GetAllPricingCategories?pbDefaultFirst=&pbActiveOnly=` | List pricing categories |
| `GET` | `/RepairItems/GetRepairItemsList?psSearchText=&plRepairLevelKey=&psRigidOrFlexible=` | Search repair item catalog |
| `POST` | `/RepairItems/AddRepairItems` | Add line item to repair |
| `POST` | `/RepairItems/UpdateRepairItems` | Update line item (price, approval) |
| `GET` | `/RepairItems/GetRepairItemsByRepairKey?plRepairKey=` | Get all line items for a repair |
| `GET` | `/ModelMaxCharge/GetByDeptAndScopeType?plDepartmentKey=&plScopeTypeKey=` | Look up max charge cap |
| `GET` | `/ModelMaxCharge/GetAllByDepartment?plDepartmentKey=` | All max charges for a department |

---

## 10. Open Questions

1. **Tax rate variability:** Is 7% always correct? Should it vary by ship-to state? PA vs TN tax rates differ.
2. **Pricing category on repair:** Should it be locked once the repair is created, or update if the department's category changes mid-repair?
3. **Max charge enforcement:** Currently a warning. Should it ever block invoice generation if exceeded without amendment?
4. **Multi-tier pricing:** Does `nUnitCost` on RepairItems vary by pricing category, or is it one base cost with category-level adjustments applied elsewhere?
5. **Discount logic:** Is there any volume discount, prompt-pay discount, or contract discount logic beyond the pricing category?
6. **Parts markup:** Are parts billed at cost (`nUnitCost`) or with markup? The `sPartOrLabor` field suggests they're tracked separately — is there a different margin for parts vs labor?
