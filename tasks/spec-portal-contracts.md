# Portal Contracts Feature — Steve Handoff Spec

**Date:** 2026-03-30
**Author:** Joseph Brassell
**For:** Steve (BrightLogix developer)
**Status:** Design complete — mockup live at `portal-contracts.html`

---

## 1. Overview

The **Contracts** nav item in the TSI Sales Rep Portal currently has no `href` and displays nothing when clicked. This spec describes what it should do.

The Contracts section gives sales reps and facility (client) portal users a read-only view of their active service agreements — what's covered, what's been repaired under the contract, and how the contract is performing.

**Two user types see this page:**
- **Sales Reps** — see all contracts where `lSalesRepKey = [logged-in rep key]`
- **Facility/Client Users** — see all contracts where `lClientKey = [logged-in client key]`

Same UI for both. The filter applied depends on the portal session context.

---

## 2. Database Tables Required

All data lives in **WinScopeNet** (not TSIPortal).

| Table | Purpose |
|-------|---------|
| `tblContract` | Contract master — dates, value, PO, type, billing |
| `tblContractTypes` | Contract type names (Capitated, PSA, Fuse, Shared Risk, Airway, Rental) |
| `tblContractDepartments` | Departments covered under a contract |
| `tblContractScope` | Scopes (instruments) under a contract |
| `tblClient` | Client name |
| `tblSalesRep` | Rep name |
| `tblPaymentTerms` | Invoice payment terms |
| `tblRepair` | Repairs linked to a contract via `lContractKey` |
| `tblRepairStatuses` | Repair status labels |
| `tblScope` | Scope serial number |
| `tblScopeType` | Scope type description + `sRigidOrFlexible` (R/F/C/I) |
| `tblDepartment` | Department name |

---

## 3. Page Layout

The Contracts page is a **two-panel split view** replacing the main content area when the user clicks "Contracts" in the left nav.

```
┌──────────────────────────┬────────────────────────────────────────┐
│  LEFT PANEL (380px)      │  RIGHT PANEL (flex)                    │
│                          │                                        │
│  [Page title]            │  [Empty state until row clicked]       │
│  [Status filters]        │                                        │
│  [KPI strip - 4 chips]   │  — or —                                │
│  [Contracts table]       │                                        │
│                          │  Section 1: Contract Information       │
│  12 contracts listed     │  Section 2: Coverage (Depts + Scopes)  │
│  Click row → detail      │  Section 3: Repair Consumption         │
└──────────────────────────┴────────────────────────────────────────┘
```

---

## 4. Left Panel — Contract List

### 4a. KPI Strip (4 chips, non-clickable)

Computed server-side from the filtered contract set:

| Chip | Value | Color |
|------|-------|-------|
| Active | Count of active contracts | Blue |
| Monthly Revenue | Sum of (total value ÷ term months) for active contracts | Green |
| Expiring ≤90 Days | Count of active contracts with termination ≤90 days from today | Amber |
| Scopes Covered | COUNT of rows in tblContractScope for matching contracts | Navy |

### 4b. Status Filter Buttons
- All / Active / Expiring / Expired
- **Status logic (date-based, not a column):**
  - `Active` = today between `dtDateEffective` and `dtDateTermination`
  - `Expiring` = Active AND `dtDateTermination <= DATEADD(day, 90, GETDATE())`
  - `Expired` = `dtDateTermination < GETDATE()`
  - `Pending` = `dtDateEffective > GETDATE()`

### 4c. Search
Client-side filter on client name or contract number.

### 4d. Contract Table Columns

| Column | Source | Notes |
|--------|--------|-------|
| Contract # | `sContractNumber` | |
| Client | `tblClient.sClientName1` | JOIN on `lClientKey` |
| Type | `tblContractTypes.sContractType` | JOIN on `lContractTypeKey` |
| Status | Computed (see above) | Color-coded badge |
| Expires | `dtDateTermination` | MM/DD/YYYY |
| Monthly Fee | `dblAmtTotal ÷ DATEDIFF(month, dtDateEffective, dtDateTermination)` | Compute in SQL or app layer |

---

## 5. Right Panel — Contract Detail

Loads when a contract row is clicked. Three sections:

### Section 1 — Contract Information

Display fields:

| Label | Source |
|-------|--------|
| Contract # | `sContractNumber` |
| Contract Name | `sContractName1` (or client name if blank) |
| Type | `tblContractTypes.sContractType` |
| Status | Computed badge |
| Effective Date | `dtDateEffective` |
| Termination Date | `dtDateTermination` |
| Monthly Fee | Computed (total ÷ months) |
| Total Value | `dblAmtTotal` |
| PO Number | `sPurchaseOrder` |
| Payment Terms | `tblPaymentTerms.sTermsDesc` |
| Sales Rep | `tblSalesRep.sRepFirst + ' ' + sRepLast` |
| Billing Email | `sBillEmail` |

### Section 2 — Department & Scope Coverage

**Scope summary pills** (counts from `tblContractScope` → `tblScopeType`):
- `sRigidOrFlexible = 'F'` → Flexible count
- `sRigidOrFlexible = 'R'` → Rigid count
- `sRigidOrFlexible = 'C'` → Camera count
- `IS NULL or 'I'` → Instrument count

**Department table** (from `tblContractDepartments`):

| Column | Source |
|--------|--------|
| Department | `tblDepartment.sDepartmentName` |
| Effective | `dtContractDepartmentEffectiveDate` |
| End Date | `dtContractDepartmentEndDate` |
| PO # | `sPONumber` |

### Section 3 — Repair Consumption

Summary line: "X repairs · $Y total charges"

Repair table (from `tblRepair WHERE lContractKey = ?`, ORDER BY `dtDateIn DESC`, LIMIT 100):

| Column | Source |
|--------|--------|
| Date In | `dtDateIn` |
| Work Order | `sWorkOrderNumber` |
| Department | `tblDepartment.sDepartmentName` |
| Scope | `tblScopeType.sScopeTypeDesc` |
| Repair | `sComplaintDesc` (truncated) |
| Charges | `dblAmtRepair` |
| Status | `tblRepairStatuses.sRepairStatus` |

---

## 6. API / SQL Queries Needed

### Query 1 — Contract List (filtered)
```sql
SELECT con.lContractKey, con.sContractNumber, con.lClientKey,
  con.lContractTypeKey, con.lSalesRepKey, con.lPaymentTermsKey,
  con.dtDateEffective, con.dtDateTermination,
  con.dblAmtTotal,
  con.sPurchaseOrder,
  ISNULL(c.sClientName1, '') AS sClientName1,
  LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
  ISNULL(ct.sContractType, '') AS sContractTypeName,
  ISNULL(pt.sTermsDesc, '') AS sPaymentTerms,
  CASE
    WHEN con.dtDateTermination < GETDATE() THEN 'Expired'
    WHEN con.dtDateEffective > GETDATE() THEN 'Pending'
    ELSE 'Active'
  END AS sContractStatus
FROM tblContract con
  LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
  LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = con.lSalesRepKey
  LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = con.lContractTypeKey
  LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = con.lPaymentTermsKey
WHERE con.lSalesRepKey = @salesRepKey    -- OR con.lClientKey = @clientKey
ORDER BY con.dtDateTermination DESC
```

### Query 2 — Scope Coverage Counts
```sql
SELECT ISNULL(st.sRigidOrFlexible, 'I') AS sRigidOrFlexible, COUNT(*) AS nCount
FROM tblContractScope cs
  LEFT JOIN tblScope s ON s.lScopeKey = cs.lScopeKey
  LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
WHERE cs.lContractKey = @contractKey
GROUP BY ISNULL(st.sRigidOrFlexible, 'I')
```

### Query 3 — Department Coverage
```sql
SELECT cd.lContractDepartmentKey, cd.lDepartmentKey,
  cd.dtContractDepartmentEffectiveDate, cd.dtContractDepartmentEndDate,
  cd.sPONumber, cd.bNonBillable,
  ISNULL(d.sDepartmentName, '') AS sDepartmentName
FROM tblContractDepartments cd
  LEFT JOIN tblDepartment d ON d.lDepartmentKey = cd.lDepartmentKey
WHERE cd.lContractKey = @contractKey
ORDER BY d.sDepartmentName
```

### Query 4 — Repair Consumption
```sql
SELECT TOP 100
  r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
  r.dblAmtRepair, r.sComplaintDesc,
  ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
  ISNULL(s.sSerialNumber, '') AS sSerialNumber,
  ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
  ISNULL(d.sDepartmentName, '') AS sDepartmentName
FROM tblRepair r
  LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
  LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
  LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
  LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
WHERE r.lContractKey = @contractKey
ORDER BY r.dtDateIn DESC
```

---

## 7. BrightLogix Implementation Notes

**Auth context:** The portal session already knows the logged-in user's `intSalesRepKey` and `intClientKey` (from TSIPortal.dbo.Users). Use these to filter the contract query — never expose all contracts to a portal user.

**Cross-database:** WinScopeNet data is on the main SQL Server. The portal queries it today (e.g., `contractRepairsGet` stored proc). Same pattern applies here.

**Existing stored procs to reuse or reference:**
- `contractsGet` — basic contract fetch by department
- `contractRepairsGet` — repairs under a contract
- `contractReportCardGet` — performance KPIs

**Monthly fee computation:** BrightLogix can compute this in SQL:
```sql
dblAmtTotal / NULLIF(DATEDIFF(month, dtDateEffective, dtDateTermination), 0) AS dblMonthlyFee
```

**No editing:** This is a read-only view. No save, edit, or create buttons. Portal users cannot modify contract data.

---

## 8. Visual Design Reference

See `portal-contracts.html` (in this repo, runnable via `npx serve`) for the full visual mockup built against the live SQL database.

**Key visual specs** (matching existing portal chrome):
- Sidebar: white bg, `box-shadow: rgb(53,67,109) 0px 0px 15px -8px`
- Active nav item: `linear-gradient(90deg, rgb(17,60,139), rgb(87,118,227))`
- Header bar: same gradient, 70px height, `border-bottom: 1px solid rgb(182,200,201)`
- Table headers: `background: rgb(143,169,217)`, white bold text
- Even rows: `background: rgb(223,232,237)`
- Status badges: Active=green (`#d4edda`/`#155724`), Expired=red, Expiring=amber, Pending=grey

---

## 9. Out of Scope (Future Enhancements)

- Invoice history tab (invoices issued against the contract)
- Amendment history
- Consumption vs. budget chart (expense trending)
- Portal notification when contract is expiring (email alert)
- Client ability to submit renewal request through portal
