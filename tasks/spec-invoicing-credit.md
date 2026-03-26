# Technical Specification: Invoicing & Credit Holds

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Workflow, Contract Management, Great Plains Integration

---

## 1. Overview

The invoicing system handles:
- **Invoice generation** — creating invoices from completed repairs
- **Invoice formatting** — line items, display rules, blind items, tax
- **Payment tracking** — recording payments against invoices
- **Credit holds** — blocking shipment when customers are past due
- **AR aging** — tracking how overdue invoices are
- **Great Plains sync** — enriching invoice data with GP accounting system

---

## 2. Schema — Core Tables

### 2.1 `Invoices` (Invoice Master)

**Identity & Keys:**
| Column | Type | Description |
|--------|------|-------------|
| `lInvoiceKey` | `int` (PK, identity) | Unique invoice ID |
| `lRepairKey` | `int` (FK → Repairs) | Which repair this invoices |
| `lClientKey` | `int` (FK → Clients) | Customer |
| `lDepartmentKey` | `int` (FK → Departments) | Department |
| `lSalesRepKey` | `int` (FK → SalesReps) | Account rep |
| `lContractKey` | `int` (FK → Contracts) | Contract (0 if FFS) |
| `lPaymentTermsKey` | `int` (FK → PaymentTerms) | Payment terms |

**Numbers & Tracking:**
| Column | Type | Description |
|--------|------|-------------|
| `sTranNumber` | `varchar(20)` | Invoice number (e.g., "NR25213028") |
| `sInvoiceNumber` | `varchar(20)` | GP invoice number |
| `sWorkOrderNumber` | `varchar(20)` | Work order reference |
| `sShipTrackingNumber` | `varchar(50)` | Shipping tracking |
| `sShipTrackingNumberVendor` | `varchar(50)` | Vendor tracking reference |
| `sPurchaseOrder` | `varchar(50)` | PO number (or "Contract") |

**Financial:**
| Column | Type | Description |
|--------|------|-------------|
| `dblTranAmount` | `decimal(10,2)` | Invoice subtotal |
| `dblTaxAmount` | `decimal(10,2)` | Sales tax |
| `dblDiscount` | `decimal(10,2)` | Invoice-level discount |
| `dblShippingAmt` | `decimal(10,2)` | Shipping cost |
| `dblJuris1Amt/Pct/Name` | `decimal/varchar` | Multi-jurisdiction tax (defined, not currently used) |
| `dblJuris2Amt/Pct/Name` | `decimal/varchar` | Multi-jurisdiction tax (defined, not currently used) |
| `dblJuris3Amt/Pct/Name` | `decimal/varchar` | Multi-jurisdiction tax (defined, not currently used) |

**Dates:**
| Column | Type | Description |
|--------|------|-------------|
| `dtTranDate` | `datetime` | Invoice issue date |
| `dtDueDate` | `datetime` | Payment due date (issue date + payment terms days) |
| `dtAprRecvd` | `datetime` | Customer approval received date |

**Addresses (Bill-To and Ship-To):**
| Column | Type | Description |
|--------|------|-------------|
| `sBillName1/2` | `varchar` | Bill-to name / attention |
| `sBillAddr1/2, sBillCity, sBillState, sBillZip` | `varchar` | Bill-to address |
| `sShipName1/2` | `varchar` | Ship-to name / attention |
| `sShipAddr1/2, sShipCity, sShipState, sShipZip` | `varchar` | Ship-to address |

**Display Flags:**
| Column | Type | Description |
|--------|------|-------------|
| `sDisplayItemDescription` | `char(1)` | `Y`/`N` — show line item descriptions on invoice |
| `sDisplayItemAmount` | `char(1)` | `Y`/`N` — show line item amounts on invoice |
| `sDisplayCustomerComplaint` | `char(1)` | `Y`/`N` — show complaint text on invoice |
| `sUnderContract` | `char(1)` | `Y`/`N` — is this a contract invoice |
| `bIsVoid` | `bit` | Invoice has been voided |

**Status:**
| Column | Type | Description |
|--------|------|-------------|
| `bFinalized` | `bit` | Locked for billing (cannot be edited) |
| `bPaid` | `bit` | Fully paid |

**Other:**
| Column | Type | Description |
|--------|------|-------------|
| `sDeliveryDesc` | `varchar(50)` | Shipping method (e.g., "United Parcel Service") |
| `sTermsDesc` | `varchar(20)` | Payment terms display (e.g., "Net 90") |
| `sRepFirst, sRepLast` | `varchar` | Sales rep name (denormalized) |
| `sClientName1` | `varchar` | Client name (denormalized) |

---

### 2.2 `InvoicePayments`

| Column | Type | Description |
|--------|------|-------------|
| `lInvoicePaymentID` | `int` (PK, identity) | Payment record ID |
| `lInvoiceKey` | `int` (FK → Invoices) | Which invoice this pays |
| `nInvoicePayment` | `decimal(10,2)` | Payment amount |
| `dtPaymentDate` | `date` | Date payment received |
| `lInvoicePaymentFileID` | `int` | Batch import file ID |
| `CustomerID` | `varchar(20)` | GL account / customer ID |
| `CustomerName` | `varchar(100)` | Customer name |
| `TransactionNumberGP` | `varchar(30)` | Great Plains transaction number |

---

### 2.3 Repair Financial Fields

These fields live on the `Repairs` table and feed into invoicing:

| Column | Type | Description |
|--------|------|-------------|
| `dblAmtRepair` | `decimal(10,2)` | Revenue / sale amount |
| `dblAmtCostLabor` | `decimal(10,2)` | Labor cost |
| `dblAmtCostMaterial` | `decimal(10,2)` | Material cost |
| `dblAmtShipping` | `decimal(10,2)` | Shipping cost |
| `dblAmtCommission` | `decimal(10,2)` | Commission amount |
| `dblOutSourceCost` | `decimal(10,2)` | Outsourced repair cost |
| `dblAmtTax` | `decimal(10,2)` | Sales tax |
| `mMaxCharge` | `decimal(10,2)` | Customer's max charge cap (read-only in UI) |
| `lPaymentTermsKey` | `int` | Payment terms FK |
| `bByPassOnHold` | `bit` | Override credit hold (fByPassOnHold in UI) |
| `sInvoiceNumber` | `varchar(20)` | Generated invoice number |

---

### 2.4 `ModelMaxCharges` (Max Charge Lookup)

| Column | Type | Description |
|--------|------|-------------|
| `lScopeTypeKey` | `int` | Scope type |
| `lDepartmentKey` | `int` | Department |
| `mMaxCharge` | `decimal(10,2)` | Maximum charge for this scope type at this department |

**Logic:** When a repair is created, lookup `mMaxCharge` by scope type + department. This is the ceiling for non-contract repairs.

---

## 3. Invoice Generation

### 3.1 Trigger

Invoice generation happens when:
- Repair status reaches Phase 4 (Closure)
- "Invoice" form is generated from workflow pills
- Batch invoice generation via API

### 3.2 Single Invoice (Form-Triggered)

From repair workflow Phase 4, clicking "Generate Invoice":
1. Validate repair is in completed/shipped status
2. Build invoice from repair data (see mapping in §3.4)
3. Set `bFinalized = false` (draft)
4. Update repair: `sInvoiceNumber = generated number`
5. Update repair status: `lRepairStatusID → Invoiced`

### 3.3 Batch Invoice Generation

```
POST /Invoice/GenerateInvoices
Body: { repairKeys: [array of repair IDs] }
```

Process:
1. Filter to shipped repairs without existing `sInvoiceNumber`
2. For each repair:
   - Generate invoice number: `INV-{YYYY}-{4-digit sequence}`
   - Create invoice record
   - Amount = `repair.dblAmtRepair` (or 0)
   - Tax = amount × 0.07 (7% — currently hardcoded)
   - Total = amount × 1.07
3. Update each repair's `sInvoiceNumber`
4. Set all as `bFinalized = false`, `bPaid = false`

### 3.4 Repair → Invoice Field Mapping

| Repair Field | Invoice Field | Logic |
|-------------|---------------|-------|
| `lRepairKey` | `lRepairKey` | Direct FK |
| `lClientKey` | `lClientKey` | Direct |
| `lDepartmentKey` | `lDepartmentKey` | Direct |
| `dblAmtRepair` | `dblTranAmount` | Revenue amount |
| `dblAmtShipping` | `dblShippingAmt` | Direct |
| `dblAmtTax` | `dblTaxAmount` | Direct |
| `lPaymentTermsKey` | `lPaymentTermsKey` | Direct |
| `sWorkOrderNumber` | `sTranNumber` | WO as invoice reference |
| `sPONumber` | `sPurchaseOrder` | Direct (or "Contract" if under contract) |
| Bill-to address | `sBill*` fields | From department/client billing setup |
| Ship-to address | `sShip*` fields | From department/client shipping setup |

---

## 4. Invoice PDF Generation

### Function: `buildInvoicePdf(inv, details, opts)`

### Sections:
1. **Header** — invoice number, TSI logo
2. **Remit-to** — TSI payment address
3. **Bill-to** — customer billing address
4. **Ship-to** — customer shipping address
5. **Detail band** — Date, Ship Via, Terms, PO, Approval Date, Salesperson, Customer ID, WO#
6. **Line items table** — Description + Amount (respects display flags)
7. **Tracking number** (if present)
8. **Customer complaint** (if `sDisplayCustomerComplaint = 'Y'`)
9. **Totals** — Subtotal, Tax, Discount, Total Due

### Display Rules:
- `sDisplayItemDescription = 'N'` → hide descriptions (show "Repair Services" only)
- `sDisplayItemAmount = 'N'` → hide per-line amounts (show total only)
- **Blind items** (`isBlind = true`) → NEVER shown on customer-facing invoice
- `sDisplayCustomerComplaint = 'Y'` → show complaint text

---

## 5. Invoice Lifecycle

```
Draft (bFinalized=false)
  → Can be edited, deleted
  → DELETE /Financials/DeleteDraftInvoice

Finalized (bFinalized=true)
  → Locked, synced to GP
  → Cannot be deleted (only voided)

Partial Paid
  → Some payments applied, balance remaining

Paid (bPaid=true)
  → Fully settled

Voided (bIsVoid=true)
  → Cancelled, removed from AR
```

---

## 6. Credit Hold System

### 6.1 Hold Tables

**`ClientsOnHold`** — blocks ALL repairs for a customer:
| Column | Type | Description |
|--------|------|-------------|
| `lClientOnHoldKey` | `int` (PK) | Record ID |
| `lClientKey` | `int` (FK) | Customer |
| `sReason` | `varchar(200)` | Why on hold |
| `dtOnHoldDate` | `datetime` | When hold placed |
| `lHoldByUserKey` | `int` (FK) | Who placed it |

**`WorkOrdersOnHold`** — blocks a specific repair:
| Column | Type | Description |
|--------|------|-------------|
| `lWOOnHoldKey` | `int` (PK) | Record ID |
| `lRepairKey` | `int` (FK) | Which repair |
| `sReason` | `varchar(200)` | Why on hold |
| `dtHoldDate` | `datetime` | When hold placed |
| `lHoldByUserKey` | `int` (FK) | Who placed it |

### 6.2 Hold Triggers

| Trigger | Hold Type | Effect |
|---------|-----------|--------|
| Outstanding AR exceeds credit limit | Client Hold | Blocks all WOs for that client |
| Invoices aged > 60 days overdue | Client Hold | Blocks all WOs |
| Manual administrative action | Client or WO Hold | Per-case basis |

### 6.3 Hold Check — When Does It Gate?

The hold check fires at **shipment time**:
```
1. Check ClientsOnHold WHERE lClientKey = @repair.lClientKey
   → If found AND repair.bByPassOnHold = false → BLOCK shipment

2. Check WorkOrdersOnHold WHERE lRepairKey = @repair.lRepairKey
   → If found AND repair.bByPassOnHold = false → BLOCK shipment
```

### 6.4 Bypass Mechanism

- Checkbox `fByPassOnHold` on repair's Financials tab
- When checked: allows shipment despite active hold
- **Does NOT remove the hold** — hold remains, bypass is per-repair
- Should log: who bypassed, when, why (currently a gap — see §12)

### 6.5 Hold Release

- Payment application reduces AR balance below credit limit → auto-release
- Credit limit increase → auto-release
- Manual release via `/Financials/clientUpdateOnHold` endpoint

---

## 7. Financials Tab (Repair Detail)

### Revenue Section
- Sale Amount = `dblAmtRepair`
- Tax = `dblAmtTax`
- Invoice Total = revenue + tax

### Expenses Section
- Outsource = `dblOutSourceCost`
- Shipping = `dblAmtShipping`
- Labor = `dblAmtCostLabor`
- Inventory = calculated from parts cost
- GPO = calculated
- Commission = `dblAmtCommission`
- Total Expenses = sum of all

### Margins Section
- Margin % = `(Revenue - Expenses) / Revenue × 100`
- Contract Margin = 0.0% (for contract repairs)
- Margin Adj Required / Expected / Actual / Default / Approval fields

### Max Charge Display
- `mMaxCharge` displayed as read-only
- Source: `ModelMaxCharges` table lookup by scope type + department
- Smart alert if `dblAmtRepair > mMaxCharge`

---

## 8. AR Aging

### Calculation
```
agingDays = MAX(0, ROUND((TODAY - dtDueDate) / 86400000))
```

### Buckets & Color Coding
| Days Overdue | Bucket | Color |
|-------------|--------|-------|
| 0-30 | Current | Green |
| 31-60 | 30+ Days | Yellow |
| 61+ | Overdue | Red |

### Dashboard KPI
- Average Aging = sum of aging days / count of unpaid invoices

---

## 9. Tax Calculation

### Current Implementation
- **Simple:** Tax = Amount × 0.07 (7% hardcoded)
- Stored on repair: `dblAmtTax`
- Displayed on Financials tab and invoice PDF

### Future: Multi-Jurisdiction (Fields Defined, Not Active)
- `dblJuris1Amt`, `dblJuris1Pct`, `dblJuris1Name`
- `dblJuris2Amt`, `dblJuris2Pct`, `dblJuris2Name`
- `dblJuris3Amt`, `dblJuris3Pct`, `dblJuris3Name`
- Developer should preserve these fields for future jurisdiction-based tax

### Tax Exemption
- Contract flag `bTaxExempt` → skip tax calculation for contract invoices

---

## 10. Credit Memos

### Structure (on Client record)
```json
{
  "id": "CM-{YYYY}-{NNN}",
  "date": "2026-01-15",
  "amount": 500.00,
  "remaining": 250.00,
  "reason": "Warranty rework - original repair defective",
  "status": "Open | Applied",
  "applications": []
}
```

### Operations
- Create credit memo (tied to client)
- Apply credit memo to invoice (reduces amount due)
- View/track remaining balance

---

## 11. Great Plains Integration

### GP Invoice Staging Table
- Links via `lInvoiceKey`
- Fields: `TotalAmountDue`, `dblTaxAmount`, `GLAccount`, `PaymentTerms`, `sTranNumber`, `dtDueDate`

### Enrichment Logic
`GetOutstandingInvoicesList` performs a merge:
- GP data **overrides** local data where GP values exist
- Ensures financial dashboard shows GP-authoritative amounts

---

## 12. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Financials/GetOutstandingInvoicesList` | POST | All invoices enriched with GP staging data |
| `/Financials/GetAllGLAccounts` | GET | GL account list |
| `/Financials/GetAllClientsOnHold` | POST | Clients currently on credit hold |
| `/Financials/clientUpdateOnHold` | POST | Place/release client hold |
| `/Financials/GetAllInvoicePayments` | POST | Payment records |
| `/Financials/GetAllDraftInvoices` | POST | Draft (unfinalized) invoices |
| `/Financials/DeleteDraftInvoice` | DELETE | Remove draft invoice |
| `/Invoice/GenerateInvoices` | POST | Batch invoice generation |
| `/Invoice/GetAllInvoices` | GET | All invoices |
| `/Repair/UpdateRepair` | POST | Update financial fields on repair |

---

## 13. Outstanding Invoices Dashboard (financial.html)

### Grid Columns
1. Invoice # (`sTranNumber` or `sInvoiceNumber`)
2. Client (`sClientName1`)
3. Amount (`dblTranAmount`)
4. Tax (`dblTaxAmount`)
5. Discount (`dblDiscount`)
6. Terms (`sPaymentTerms`)
7. GL Account (`sGLAccountNumber`)
8. Issued (`dtTranDate`)
9. Due Date (`dtDueDate`)
10. Aging (calculated days)
11. Status (derived from aging)

### Features
- Search/filter
- Sortable columns
- Export to CSV

---

## 14. Known Gaps

1. **Hold audit trail** — no logging of when holds are placed/released or by whom
2. **Bypass logging** — `bByPassOnHold` override reason not tracked (who/when/why)
3. **Discount justification** — no field for why a discount was applied
4. **Credit memo application history** — not tracked in detail
5. **Margin approval audit** — who approved margin adjustments, when
6. **Multi-jurisdiction tax** — fields defined but not wired up
7. **Hold release triggers** — no automated release when payment clears AR below limit
8. **Payment allocation** — no per-invoice payment application tracking (payments are bulk)
9. **Tax rate** — hardcoded 7%, should be configurable or pulled from tax jurisdiction
