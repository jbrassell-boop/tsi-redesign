# Technical Specification: Contract Management

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Client/Department Hierarchy, Pricing System, Invoicing, Repair Workflow

---

## 1. Overview

Contracts (Customer Service Agreements / CSAs) define the commercial relationship between TSI and a customer. A contract determines:
- **What's covered** — which scopes/departments are under the agreement
- **How it's priced** — capitated (fixed fee), shared risk (split cost), fee-for-service, etc.
- **How it's billed** — monthly, quarterly, payment terms, billing contact
- **Performance tracking** — expense multiplier, avoidable damage rate, utilization

Contracts are **client-level** but coverage applies **per-department** and **per-scope**.

---

## 2. Schema — Primary Tables

### 2.1 `tblContract` (Contract Master)

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lContractKey` | `int` (PK, identity) | No | Unique contract identifier |
| `sContractNumber` | `varchar(20)` | No | Human-readable contract number (e.g., "111883") |
| `sContractName1` | `varchar(200)` | No | Display name (e.g., "Lompoc Valley Medical Center - Capitated Service") |
| `lClientKey` | `int` (FK → Clients) | No | Which customer owns this contract |
| `lContractTypeKey` | `int` (FK → ContractTypes) | No | Contract type (1-7) |
| `lSalesRepKey` | `int` (FK → SalesReps) | Yes | Account manager |
| `lPaymentTermsKey` | `int` (FK → PaymentTerms) | No | Invoice payment terms |
| `dtDateEffective` | `datetime` | No | Contract start date |
| `dtDateTermination` | `datetime` | No | Contract end date |
| `dblAmtTotal` | `decimal(12,2)` | Yes | Total contract value across entire term |
| `dblAmtInvoiced` | `decimal(12,2)` | Yes | Amount invoiced to date (spend-down tracking) |
| `sPurchaseOrder` | `varchar(50)` | Yes | Contract-level PO number |

**Billing Address Fields:**
| Column | Type | Description |
|--------|------|-------------|
| `sContractBillName1` | `varchar(100)` | Billing name / department |
| `sContractBillName2` | `varchar(100)` | Billing attention line |
| `sContractAddr1` | `varchar(100)` | Street address |
| `sContractCity` | `varchar(50)` | City |
| `sContractState` | `varchar(2)` | State |
| `sContractZip` | `varchar(10)` | Zip code |
| `sContractPhoneVoice` | `varchar(20)` | Phone |
| `sBillEmail` | `varchar(100)` | Invoice email recipient |
| `sContractBillEmailName` | `varchar(100)` | Invoice email display name |

**Billing Configuration:**
| Column | Type | Description |
|--------|------|-------------|
| `lBillDay` | `int` | Day of month invoices are issued (1-31) |
| `lBillType` | `int` | Billing frequency (1=Monthly, etc.) |
| `lInstallmentTypeID` | `int` | Payment structure type |
| `lSalesTaxKey` | `int` (FK) | Tax jurisdiction |

**Boolean Configuration Flags:**
| Column | Description |
|--------|-------------|
| `bFuseContract` | Fuse bundled service program |
| `bServicePlan` | Extended service coverage |
| `bTaxExempt` | No sales tax on invoices |
| `bSharedRisk` | Shared risk cost model active |
| `bManualSchedule` | Non-standard invoice schedule |
| `bCostsPerDepartment` | Track costs granularly by department |
| `bUnlimitedProducts` | No cap on number of scopes covered |
| `bShowConsumptionOnPortal` | Client can see usage on portal |
| `bPOsPerDepartment` | PO required per department (ties into Blanket PO spec) |
| `bAutoRenew` | Auto-renewal enabled |
| `bSendRenewalReminder` | Send alerts before expiration |
| `bShowShippingAddressOnInvoice` | Invoice format option |
| `bSaveInvoiceComment` | Persist invoice notes |
| `bShippingSameAsBilling` | Ship-to = bill-to |

**Audit Fields:**
| Column | Type | Description |
|--------|------|-------------|
| `dtCreateDate` | `datetime` | Record created |
| `dtLastUpdate` | `datetime` | Last modified |
| `lLastUpdateUser` | `int` | Who modified |
| `mComments` | `text` | Admin notes |

**Computed Fields (API adds, not stored):**
- `sContractStatus`: `Active` | `Expired` | `Pending` — derived from dates vs. today
- `sContractTypeName`: Display name from ContractTypes table
- `sPaymentTerms`: Display name from PaymentTerms table
- `sClientName1`: Client name (joined)
- `sSalesRepName`: Rep name (joined)

---

### 2.2 `tblContractTypes`

| Key | Type Name | Description |
|-----|-----------|-------------|
| 1 | CPO | Capital Purchase Order — fixed asset purchasing |
| 2 | Fuse | Fuse bundled service program |
| 3 | Capitated Service | Fixed monthly fee, all repairs covered (no per-repair charges) |
| 4 | Airway | Specialized airway equipment contract |
| 5 | Rental | Equipment rental agreement |
| 7 | Shared Risk | Base fee + per-repair charges; TSI & client share expense risk |

**Note:** ID 6 is missing — likely deprecated. Developer should preserve the gap.

---

### 2.3 `tblContractDepartments` (Coverage by Department)

| Column | Type | Description |
|--------|------|-------------|
| `lContractDepartmentKey` | `int` (PK) | Record ID |
| `lContractKey` | `int` (FK → Contracts) | Parent contract |
| `lDepartmentKey` | `int` (FK → Departments) | Which department is covered |
| `dtContractDepartmentEffectiveDate` | `datetime` | Department joins contract on this date |
| `dtContractDepartmentEndDate` | `datetime` | Department leaves contract on this date |
| `bNonBillable` | `bit` | Is this department non-billable? |
| `bCalcCostFromScopes` | `bit` | Calculate costs from scope pricing? |

**Key Design:** Contracts are CLIENT-level, but coverage applies PER-DEPARTMENT with independent date ranges. A single contract can cover 5 departments, each entering/exiting coverage at different times.

---

### 2.4 `tblContractScope` (Coverage by Scope)

| Column | Type | Description |
|--------|------|-------------|
| `lContractScopeKey` | `int` (PK) | Record ID |
| `lContractKey` | `int` (FK → Contracts) | Parent contract |
| `lScopeKey` | `int` (FK → Scopes) | Which scope is covered |
| `dtScopeAdded` | `datetime` | When scope was added to contract |
| `dtScopeRemoved` | `datetime` | When scope was removed from contract |

---

## 3. Coverage Determination Logic

When a repair comes in, determine if it's covered by a contract:

```
1. Get repair's lDepartmentKey and lScopeKey
2. Get department's parent lClientKey
3. Query active contracts for that client:
   SELECT c.lContractKey FROM tblContract c
   WHERE c.lClientKey = @clientKey
   AND c.dtDateEffective <= GETDATE()
   AND c.dtDateTermination >= GETDATE()

4. For each active contract, check department coverage:
   SELECT 1 FROM tblContractDepartments cd
   WHERE cd.lContractKey = @contractKey
   AND cd.lDepartmentKey = @deptKey
   AND cd.dtContractDepartmentEffectiveDate <= GETDATE()
   AND (cd.dtContractDepartmentEndDate IS NULL OR cd.dtContractDepartmentEndDate >= GETDATE())

5. For each active contract, check scope coverage:
   SELECT 1 FROM tblContractScope cs
   WHERE cs.lContractKey = @contractKey
   AND cs.lScopeKey = @scopeKey
   AND cs.dtScopeAdded <= GETDATE()
   AND (cs.dtScopeRemoved IS NULL OR cs.dtScopeRemoved >= GETDATE())

6. IF department covered AND scope covered:
     → repair.lContractKey = @contractKey
     → repair.sUnderContract = 'Y'
     → Pricing = contract pricing (capitated/shared risk)
   ELSE:
     → repair.lContractKey = 0
     → repair.sUnderContract = 'N'
     → Pricing = FFS (fee-for-service)
```

---

## 4. Pricing Impact

### 4.1 Pricing Categories

| Key | Category | Use |
|-----|----------|-----|
| 4 | Manufacturer (CAP) | Capitated/contract pricing |
| 1-3, 5+ | Various FFS | Fee-for-service, non-contract |

### 4.2 How Contract Type Affects Pricing

| Contract Type | Pricing Behavior |
|--------------|-----------------|
| **Capitated Service** | Fixed monthly fee covers ALL repairs. Per-repair charge = $0 on invoice. Only monthly installment invoiced. |
| **Shared Risk** | Base monthly fee + per-repair charges. TSI and client split costs above/below thresholds. |
| **CPO** | Fixed purchase price for equipment. Not a service contract. |
| **Fuse** | Bundled service — specific pricing per Fuse program terms |
| **Rental** | Rental fee per scope per period |
| **Airway** | Specialized pricing for airway equipment |

### 4.3 CAP vs. FFS Determination (UI)

```javascript
// From repairs.html — new work order wizard
isCap = (department.lPricingCategoryKey === 4 && department.lContractKey > 0);
display = isCap ? 'Contract' : 'FFS';
```

---

## 5. Contract Health Scoring

### Endpoint: `GET /Contract/GetContractHealth?plContractKey={key}`

### Formula (0-100 score)

```
score = (expenseMultiplier_score × 0.4)
      + (avoidableDamage_score × 0.2)
      + (utilization_score × 0.2)
      + (daysToExpiry_score × 0.2)
```

### Grading

| Score | Grade |
|-------|-------|
| 70-100 | A |
| 40-69 | B |
| 20-39 | C |
| 0-19 | F |

### Factor 1: Expense Multiplier (40% weight)

```
expMult = totalRepairCosts / totalContractRevenue
score = 100 × (1 - MIN(expMult, 2) / 2)
```

- `< 1.0` = profitable (TSI is making money)
- `> 1.0` = losing money (TSI spending more on repairs than collecting)
- Smart Alert fires when > 1.0

### Factor 2: Avoidable Damage Rate (20% weight)

```
avoidableCount = repairs WHERE sRepairReason LIKE '%damage%'
score = 100 × (1 - avoidableCount / totalRepairs)
```

### Factor 3: Utilization (20% weight)

```
utilRate = MIN(repairCount / (scopeCount × 2), 1)
score = utilRate × 100
```

### Factor 4: Days to Expiry (20% weight)

| Days Remaining | Score |
|---------------|-------|
| > 90 days | 100 |
| 30-90 days | 70 |
| 0-30 days | 30 |
| Expired | 0 |

---

## 6. Contract Status Computation

```sql
IF dtDateTermination < GETDATE() THEN 'Expired'
ELSE IF dtDateEffective > GETDATE() THEN 'Pending'
ELSE 'Active'
```

This is computed on read, not stored.

---

## 7. Renewal Workflow

### Fields
- `bAutoRenew` — auto-renew flag
- `bSendRenewalReminder` — send alerts before expiry

### Renewal Process (from contracts.html)
1. **Initialize Renewal** — copies scopes from current contract to renewal draft
2. **Create Renewal Doc** — generates renewal documentation
3. **Finalize Renewal** — commits the new contract, old one expires

### Renewal Alerts
- 90 days before expiration: "Renewal reminder — {days} days until expiration"
- 30 days before expiration: escalated warning
- On expiration: "Contract expired — renewal pending"

---

## 8. Amendments

### Structure
Each amendment tracks:
- `sAmendmentNumber` (e.g., "AMD-001")
- `dtAmendmentDate`
- `sAmendmentType`
- Associated scopes being added/removed

### Amendment Operations
- Add new scopes to existing contract
- Remove scopes from contract
- Modify department coverage dates
- Track amendment effective dates

### Endpoint
`GET /Contract/GetContractAmendmentsList?plContractKey={key}`

---

## 9. Smart Alerts Integration

| Alert | Condition | Type |
|-------|-----------|------|
| **Active Contract** | Department has active contract, not expired | Info |
| **No Contract** | Department has no active agreement | Opportunity — "only 9.9% of active clients are under contract" |
| **Contract Expired** | `dtDateTermination < TODAY` | Danger |
| **Expense Multiplier > 1.0** | TSI spending more than collecting | Warning |
| **Renewal Reminder** | Within 90 days of expiration | Warning |

---

## 10. API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Contract/GetAllContractsList` | POST | Paginated contract list with computed status |
| `/Contract/GetContractById` | GET | Single contract with all fields |
| `/Contract/AddContract` | POST | Create new contract |
| `/Contract/UpdateContract` | POST | Update contract (selective fields) |
| `/Contract/DeleteContract` | DELETE | Remove contract + related scopes + departments |
| `/Contract/GetAllContractType` | GET | List all 6 contract types |
| `/Contract/GetAllContractServicePlanTerms` | GET | Service plan options |
| `/Contract/GetContractDepartments` | GET | Departments assigned to contract |
| `/Contract/GetContractDepartmentsAvailable` | GET | Departments NOT yet assigned |
| `/Contract/GetAllContractScopes` | POST | All scopes under contract |
| `/Contract/GetContractRepairsList` | GET | All repairs linked to contract |
| `/Contract/GetContractAmendmentsList` | GET | Amendment history |
| `/Contract/GetAllContractCoverageCounts` | GET | Scope counts by type (flexible, rigid, camera, instrument) |
| `/Contract/GetContractReportCardDetails` | GET | Performance metrics |
| `/Contract/GetContractExpenseBreakdown` | GET | Cost distribution |
| `/Contract/GetAllContractInvoice` | POST | Paginated invoices for contract |
| `/Contract/GetAllContractClient` | GET | Clients with contracts |
| `/Contract/GetContractHealth` | GET | Health score with 4 factors |

---

## 11. UI — Contract Detail Tabs

| Tab | Contents |
|-----|----------|
| **Specifications** | Name, type, client, rep, dates, values, all boolean flags |
| **Address** | Bill-to and ship-to blocks |
| **Departments** | Transfer list: assigned vs. available, per-dept config (date ranges, non-billable flag) |
| **Scopes** | Covered equipment: serial#, model, manufacturer, coverage dates |
| **Repairs** | All repairs under contract with status, level, cost |
| **Notes** | Admin comments history |
| **Amendments** | Amendment records and affected scopes |
| **Renewal** | Initialize/create docs/finalize renewal workflow |
| **Invoices** | Paginated invoices with amounts |
| **Affiliates** | Multi-location/entity affiliations |
| **Documents** | Amendment PDFs, contract docs |
| **Expense Trending** | Cost trend visualization |
| **Report Card** | Performance metrics display |
| **Commission Rates** | Sales rep commission tiers |
| **Activity** | Audit log of all changes |

---

## 12. Relationship Diagram

```
tblContract (CLIENT-level)
  ├── lClientKey → tblClient
  ├── lContractTypeKey → tblContractTypes (1 of 6)
  ├── lSalesRepKey → tblSalesRep
  ├── lPaymentTermsKey → tblPaymentTerms
  ├── lSalesTaxKey → tblSalesTax
  │
  ├── tblContractDepartments (many) ← per-department coverage windows
  │     └── lDepartmentKey → tblDepartment
  │
  ├── tblContractScope (many) ← per-scope coverage
  │     └── lScopeKey → tblScope
  │
  ├── tblRepair (many) ← repairs billed under this contract
  │     └── lContractKey → tblContract (0 if FFS)
  │
  └── contractInvoices (many) ← invoices generated
```

---

## 13. Payment Terms Reference

| Key | Terms | Days |
|-----|-------|------|
| 1 | Net 15 | 15 |
| 2 | Net 30 | 30 |
| 3 | Net 45 | 45 |
| 4 | Net 60 | 60 |
| 5 | Net 90 | 90 |
| 8 | Net Due | Variable |
| 9 | Due Upon Receipt | 0 |

---

## 14. Reporting

| Report | Category |
|--------|----------|
| Contract Expiration Schedule | Contract Reports |
| Contract Value Summary | Contract Reports |
| SLA Compliance | Contract Reports |
| Contract Utilization | Contract Reports |
| Client Sales Summary (Contract vs. FFS split) | Client Reports |

### Dashboard Analytics
- Revenue split: Contract vs. Standard (FFS)
- Expense analysis: Contract expense multiplier trending
- Profitability: Contract margin by type
- Filters: by contract type, client, department

---

## 15. Open Questions

1. **Shared Risk percentages** — where is the split ratio stored? (e.g., "TSI absorbs 30%, client pays 70%"). Is it a field on the contract or calculated from invoices?
2. **Service plan terms** — `lServicePlanTermKey` references a terms table. What are the actual plan tiers and what do they include?
3. **Portal consumption visibility** — `bShowConsumptionOnPortal` implies a client portal. Is this a future feature or existing?
4. **Commission calculation** — Commission Rates tab exists. How are commissions calculated and when are they paid?
5. **Affiliate contracts** — how do affiliates share or inherit contract coverage?
