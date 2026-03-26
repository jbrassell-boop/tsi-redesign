# TSI REST API Contract

**Date:** 2026-03-25
**Author:** Joseph Brassell
**For:** Developer handoff — unified endpoint reference
**Base URL:** `http://localhost:4000/api`
**Source:** `server/routes/*.js` (8 route files, 64+ endpoints)

---

## Conventions

### Request Format
- **GET** endpoints use query parameters prefixed with `p` (e.g., `?plRepairKey=12345`)
- **POST** endpoints accept JSON body
- **DELETE** endpoints use query parameters

### Response Format

**Local mode** (Express → SQL Server): Raw JSON arrays or objects.

**Production mode** (BrightLogix API): Wrapped in envelope:
```json
{
  "responseData": "{\"key\": \"value\"}",  // JSON string, must be parsed
  "isEnType": false
}
```

The `api.js` layer handles envelope unwrapping transparently.

### Naming Convention (Hungarian Notation)
- `l` = integer/long (keys, FKs): `lRepairKey`, `lClientKey`
- `s` = string: `sClientName`, `sSerialNumber`
- `dbl` / `m` = decimal/money: `dblAmtTotal`, `mTranComments`
- `b` = boolean/bit: `bActive`, `bBER`
- `dt` = datetime: `dtCreateDate`, `dtLastUpdate`
- `n` = numeric count: `nQuantity`, `nUnitCost`
- `p` prefix on params = parameter: `plRepairKey`, `psDepartmentName`

### Pagination (POST endpoints)
```json
{
  "Pagination": {
    "PageNumber": 1,
    "PageSize": 50
  }
}
```
Response includes `totalRecord` count.

### Error Responses
```json
{
  "error": "Description of error"
}
```
HTTP 500 for server errors, 400 for bad requests.

---

## Health Check

| Method | Path | Response |
|--------|------|----------|
| GET | `/api/health` | `{ status: "ok", database: "connected" }` |

---

## 1. Lookups — Reference Data (17 endpoints)

All lookups are **GET** requests, return arrays, and are cached client-side.

| # | Method | Path | Params | Response Shape | Source Table |
|---|--------|------|--------|---------------|-------------|
| 1 | GET | `/RepairItems/GetRepairStatus` | — | `[{lRepairStatusID, sRepairStatus, nSortOrder}]` | tblRepairStatus |
| 2 | GET | `/RepairItems/GetRepairLevels` | — | `[{lRepairLevelKey, sRepairLevel, nDeliveryWindow}]` | tblRepairLevel |
| 3 | GET | `/Repair/GetAllTechs` | — | `[{lTechnicianKey, sTechnicianName, bActive, lServiceLocationKey}]` | tblTechnicians |
| 4 | GET | `/Repair/GetAllDeliveryMethods` | — | `[{lDeliveryMethodKey, sDeliveryMethod, dblShippingCost}]` | tblDeliveryMethod |
| 5 | GET | `/Repair/GetAllRepairReasons` | — | `[{lRepairReasonKey, sRepairReason, bActive}]` | tblRepairReason |
| 6 | GET | `/Repair/GetAllPatientSafetyLevels` | — | `[]` (empty — table doesn't exist) | — |
| 7 | GET | `/SalesRepNames/GetAllSalesRepNames` | — | `[{lSalesRepNameKey, sSalesRepName, bActive}]` | tblSalesRep |
| 8 | GET | `/PricingCategory/GetAllPricingCategories` | — | `[{lPricingCategoryKey, sPricingDescription, bActive}]` | tblPricingCategory |
| 9 | GET | `/PaymentTerms/GetAllPaymentTerms` | — | `[{lPaymentTermsKey, sTermsDesc, nDueDays}]` | tblPaymentTerms |
| 10 | GET | `/ServiceLocation/GetAllServiceLocation` | — | `[{lServiceLocationKey, sServiceLocation}]` | tblServiceLocation |
| 11 | GET | `/DistributorName/GetAllDistributorNames` | — | `[{lDistributorKey, sDistributorName, bActive}]` | tblDistributor |
| 12 | GET | `/Scopes/GetAllScopeType` | — | `[{lScopeTypeKey, sScopeTypeName, sManufacturerName, sRigidOrFlexible, sScopeTypeCategory}]` | tblScopeType + tblManufacturers |
| 13 | GET | `/ScopeType/GetscopeTypeNameList` | `psRigidOrFlexible` | Scope types filtered by Rigid/Flexible | tblScopeType |
| 14 | GET | `/CreditLimit/GetAllCreditLimits` | — | `[{lCreditLimitKey, sCreditLimit}]` | System codes view |
| 15 | GET | `/Contract/GetAllContractType` | — | `[{lContractTypeKey, sContractType}]` | tblContractTypes |
| 16 | GET | `/ParentGroups/GetAll` | — | Static: 7 parent groups (Camera, EndoCarts, Flexible, Instruments, Rigid, Product Sales, Site Service) | Hardcoded |
| 17 | GET | `/InstrumentGroups/GetAll` | — | Static: 17 instrument sub-groups (Arthroscopy, Bone, Clamps, etc.) | Hardcoded |

---

## 2. Repairs — WO CRUD + Dashboard (7 endpoints)

### List / Search

| # | Method | Path | Params | Response | Notes |
|---|--------|------|--------|----------|-------|
| 1 | GET | `/Repair/GetAllRepairs` | `plServiceLocationKey`, `plDepartmentKey?` | `[{repair objects}]` | Max 500 rows |
| 2 | GET | `/Repair/GetAllrepairsBylRepairKey` | `plRepairKey` | `[{single repair}]` | Returns array of 1 |
| 3 | POST | `/Repair/GetAllRepairList` | `{plServiceLocationKey, Pagination}` | `{dataSource: [...], totalRecord: N}` | Paginated |

**Repair object** (15-table JOIN): Includes repair fields + scope type + manufacturer + department + client name + technician + sales rep + delivery method + payment terms + pricing category + service location + repair reason + repair level + status.

**Key field aliases:**
- `lSalesRepNameKey` (aliased from `lSalesRepKey`)
- `sSalesRepName` (computed from `sRepFirst + ' ' + sRepLast`)
- `sRigidOrFlexible` (from `tblScopeType`, not on repair)
- `sClientName1` (from `tblClient` via `tblDepartment.lClientKey`)

### CRUD

| # | Method | Path | Body / Params | Response | Notes |
|---|--------|------|--------------|----------|-------|
| 4 | POST | `/Repair/AddRepair` | Full repair object | `{lRepairKey, success: true}` | Returns new PK |
| 5 | POST | `/Repair/UpdateRepair` | Partial repair fields | `{success: true}` | Only updates provided fields |
| 6 | DELETE | `/Repair/DeleteRepair` | `plRepairKey` | `{success: true}` | Cascades: deletes repair items + status trans |

### Dashboard

| # | Method | Path | Body | Response |
|---|--------|------|------|----------|
| 7 | POST | `/Dashboard/GetDashboardScopeDataList` | `{plServiceLocationKey, instrumentTypeValue}` | Repairs filtered by scope type category |

---

## 3. Repair Details — Line Items + Inventory (8 endpoints)

### Repair Line Items (tblRepairItemTran)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | GET | `/Detail/GetAllRepairDetailsList` | `plRepairKey` | `[{lRepairItemTranKey, lRepairItemKey, nUnitCost, sInitials, ...item catalog fields}]` |
| 2 | POST | `/Detail/AddRepairDetail` | `{plRepairKey, plRepairItemKey, pdblRepairPrice, ...}` | `{lRepairItemTranKey, success}` |
| 3 | DELETE | `/Detail/DeleteRepairDetail` | `plRepairItemTranKey` | `{success}` |

### Repair Item Catalog (tblRepairItem — 734 items)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 4 | GET | `/RepairItems/GetAllRepairItems` | `psRigidOrFlexible?` | `[{lRepairItemKey, sRepairItem, nUnitCost, bPartFlag, bMajorRepair, bActive}]` |
| 5 | GET | `/RepairItems/GetRepairItemsBylRepairItemKey` | `plRepairItemKey` | Single catalog item |
| 6 | POST | `/RepairItems/GetRepairItemsList` | `{plRepairKey}` OR `{Pagination}` | Repair's items or paginated catalog |

### Repair Inventory (Parts Used — tblRepairInventory)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 7 | GET | `/RepairInventory/GetAllRepairInventoryList` | `plRepairKey` | `[{lRepairInventoryKey, ...inventory fields}]` |
| 8 | POST | `/RepairInventory/AddRepairInventory` | `{plRepairItemTranKey, plScopeTypeRepairItemInventoryKey}` | `{lRepairInventoryKey, success}` |

---

## 4. Repair Status — Status History (2 endpoints)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | GET | `/StatusTran/GetAllRepairStatusesList` | `plRepairKey` | `[{lStatusTranKey, lStatusKey, sRepairStatus, mTranComments, sUserName, dtCreateDate}]` |
| 2 | POST | `/StatusTran/AddRepairStatus` | `{plRepairKey, plStatusKey, psTranComments, plUserKey}` | `{lStatusTranKey, success}` — also updates `tblRepair.lRepairStatusID` |

**Note:** `mTranComments` field (not `sTranComments`) — uses `nvarchar(max)` type.

---

## 5. Clients — Client + Contact CRUD (8 endpoints)

### Client CRUD

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | GET | `/Client/GetAllClientList` | — | `[{lClientKey, sClientName1, sSalesRepName, sPricingDescription, sTermsDesc, ...}]` |
| 2 | GET | `/Client/GetClientDetailsByClientId` | `plClientKey` | `{...client, contacts: [...], departments: [...]}` |
| 3 | POST | `/Client/AddClient` | Full client object | `{lClientKey, success}` |
| 4 | POST | `/Client/UpdateClient` | Partial fields | `{success}` |
| 5 | DELETE | `/Client/DeleteClient` | `plClientKey` | `{success}` |

**Client object fields:** Mail address (`sMailAddr1/2`, `sMailCity`, `sMailState`, `sMailZip`), ship address, bill address, phone (`sPhoneVoice`, `sPhoneFAX`), email (`sBillEmail`), sales rep, pricing category, payment terms, credit limit, distributor, GPO ID (`sGPID`).

### Contacts (via tblContactTran junction)

| # | Method | Path | Params | Response |
|---|--------|------|--------|----------|
| 6 | GET | `/Client/GetCityStateUSA` | `psZip` | `{sCity, sState}` — **returns empty** (no zip table) |
| 7 | GET | `/Contacts/GetContactsList` | `plClientKey` OR `plDepartmentKey` | `[{contact objects via tblContactTran}]` |
| 8 | GET | `/Contacts/GetAllContacts` | `plDepartmentKey?` | All contacts or filtered by dept |

**Important:** Contacts are linked via `tblContactTran` junction table (not direct FK on client or department).

---

## 6. Departments — CRUD + GPO (6 endpoints)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | GET | `/Departments/GetAllDepartments` | `plServiceLocationKey?` | `[{lDepartmentKey, sDepartmentName, sClientName1, lServiceLocationKey, ...}]` |
| 2 | GET | `/Departments/GetDepartmentDetailsByDepartmentId` | `plDepartmentKey` | Single department |
| 3 | POST | `/Departments/AddDepartment` | Full department object | `{lDepartmentKey, success}` |
| 4 | POST | `/Departments/UpdateDepartment` | Partial fields | `{success}` |
| 5 | DELETE | `/Departments/DeleteDepartment` | `plDepartmentKey` | `{success}` |
| 6 | GET | `/DepartmentReportingGroups/GetAllDepartmentGPOList` | `plDepartmentKey` | `[{GPO matches for dept's sGPID}]` |

**Key field mappings:**
- Contact phone: `sContactPhoneVoice` (not `sPhoneVoice`)
- Contact fax: `sContactPhoneFAX`
- Contact email: `sContactEMail`
- GPO ID: `sGPID` (not `GPOID`)
- Ship/bill names: `sShipName1`, `sShipName2`, `sBillName1`, `sBillName2`
- No `GLN` field exists

---

## 7. Scopes — CRUD + Department Scope Types (6 endpoints)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | GET | `/Scopes/GetAllScopes` | `plDepartmentKey`, `pbIsDead` or `psScopeIsDead` | `[{lScopeKey, sSerialNumber, sScopeTypeName, sManufacturerName, sScopeIsDead, ...}]` |
| 2 | GET | `/Scopes/GetScopeByScopeId` | `plScopeKey` | Single scope |
| 3 | POST | `/Scopes/AddScope` | `{lDepartmentKey, lScopeTypeKey, sSerialNumber, mComments}` | `{lScopeKey, success}` |
| 4 | DELETE | `/Scopes/DeleteScope` | `plScopeKey` | `{success}` |
| 5 | GET | `/Scopes/CheckOpenRepaireScope` | `plScopeKey` | `true/false` (has repair with status < 8) |
| 6 | GET | `/ScopeType/GetDepartmentScopeTypesList` | `plDepartmentKey` | `[{scope types assigned to dept via tblDepartmentScopeTypes}]` |

**Key notes:**
- Status field is `sScopeIsDead` (string: `'true'`/`'false'`, not boolean)
- Manufacturer table is `tblManufacturers` (plural)
- No `sAssetTag`, `sOEMSerialNumber`, or `dtDatePurchased` fields exist

---

## 8. Contracts — CRUD + Linked Entities (8 endpoints)

| # | Method | Path | Params / Body | Response |
|---|--------|------|--------------|----------|
| 1 | POST | `/Contract/GetAllContractsList` | `{Pagination}` | `{dataSource: [...], totalRecord: N}` |
| 2 | GET | `/Contract/GetContractById` | `plContractKey` | Single contract |
| 3 | POST | `/Contract/AddContract` | Full contract object | `{lContractKey, success}` |
| 4 | POST | `/Contract/UpdateContract` | Partial fields | `{success}` |
| 5 | DELETE | `/Contract/DeleteContract` | `plContractKey` | `{success}` — cascades to contract scopes + departments |
| 6 | GET | `/Contract/GetContractDepartmentsList` | `plContractKey` | `[{...tblContractDepartments + dept + client names}]` |
| 7 | GET | `/Contract/GetContractRepairsList` | `plContractKey` | `[{repairs under this contract + statuses + scope info}]` |
| 8 | POST | `/Contract/GetAllContractScopes` | `{plContractKey}` | `[{...tblContractScope + scope + type + manufacturer + dept}]` |

**Key field mappings:**
- Amount total: `dblAmtTotal` (not `dblAmtContract`)
- Amount invoiced: `dblAmtInvoiced` (not `dblAmtExpense`)
- Contract type: `sContractType` (from `tblContractTypes`, plural)
- Status is **computed**: `'Expired'` if termination < now, `'Pending'` if effective > now, else `'Active'`
- No `bActive` field on contracts

---

## 9. Known Field Mapping Gotchas

These are the most common traps when working with this API:

| Expected Field | Actual Field | Notes |
|---------------|-------------|-------|
| `lSalesRepKey` | `lSalesRepNameKey` | Aliased in Express routes |
| `sSalesRepName` | Computed | `sRepFirst + ' ' + sRepLast` |
| `tblManufacturer` | `tblManufacturers` | Plural |
| `tblContractType` | `tblContractTypes` | Plural |
| `tblUser` | `tblUsers` | Plural |
| `sPhoneVoice` (dept) | `sContactPhoneVoice` | Different prefix on department |
| `sTranComments` | `mTranComments` | `m` prefix = nvarchar(max) |
| `sRepairStatus` (on repair) | `lRepairStatusID` | Integer FK, not string |
| `bActive` (contract) | *doesn't exist* | Status is computed from dates |
| `sScopeIsDead` | String `'true'/'false'` | Not boolean |
| `sEMailAddress` (client) | `sBillEmail` | Different field name |
| Contact FK | `tblContactTran` | Junction table, not direct FK |
| `sPaymentTerms` | `sTermsDesc` | Display text field name |
| `sPricingCategory` | `sPricingDescription` | Display text field name |
| Patient safety levels | Empty array | Table doesn't exist |
| Zip → City/State | Empty | No lookup table |

---

## 10. Dual-Mode API Switching

The frontend `api.js` module supports three modes:

| Mode | Base URL | When |
|------|----------|------|
| **Production** | `https://totalscopetestapi.mol-tech.com/api` | Default |
| **Local** | `http://localhost:4000/api` | `?api=local` or `localStorage.tsi_api_mode = 'local'` |
| **Mock** | In-memory (`mock-db.js` + `mock-api.js`) | `?api=mock` or `localStorage.tsi_api_mode = 'mock'` |

**Switching:** Click the red "⚡ SQL SERVER MODE" banner to toggle back to production. Or: `localStorage.removeItem('tsi_api_mode')`.

**Response handling:** `api.js` automatically unwraps the BrightLogix envelope (`responseData` JSON string parsing) in production mode. Local mode returns raw JSON.

---

## 11. Endpoints Not Yet Built (From Specs)

These endpoints are defined in the spec documents but not yet implemented in Express:

| Domain | Endpoints Needed | Spec Reference |
|--------|-----------------|----------------|
| **Invoicing** | CRUD, credit holds, GP staging, AR aging | Spec 4 (spec-invoicing-credit.md) |
| **Shipping** | Ready-to-ship queue, batch shipping, packing slips, receiving | Spec 8 (spec-shipping-logistics.md) |
| **Loaners** | Pool, issuance, return tracking, demand analysis | Spec 5 (spec-loaner-management.md) |
| **Flags** | CRUD, smart alert triggers, morning briefing | Spec 8 (spec-flags-smart-alerts.md) |
| **Email** | Queue, templates, triggers, notifications | Spec 11 (spec-email-notifications.md) |
| **Instrument Items** | D&I entry, catalog search, QC records, batch ops | Spec 16 (spec-instrument-repair.md) |
| **Blanket POs** | CRUD, auto-population on WO, expiration | Spec 2 (spec-blanket-po.md) |
| **User/Auth** | Login, roles, permissions enforcement | Spec 3 (spec-user-security.md) |
| **Reporting** | KPI queries, dashboard data, analytics | Spec 13 (spec-reporting-analytics.md) |
| **Tech Bench** | Simplified view, urgency dots, quick actions | Spec 14 (spec-tech-bench.md) |

---

## 12. Database Connection

```javascript
// server/db.js
const config = {
  server: 'localhost',
  database: 'WinScopeNet',
  driver: 'msnodesqlv8',
  options: {
    trustedConnection: true,          // Windows Auth
    trustServerCertificate: true,     // Dev environment
    encrypt: false
  },
  pool: {
    max: 10,
    min: 2,
    idleTimeoutMillis: 30000
  }
};

// Fallback SQL login (if Windows Auth unavailable):
// user: 'tsi_dev', password: 'TsiDev2026!'
```

### Query Helpers
- `query(sql, params)` — parameterized query, returns `recordset`
- `queryPage(sql, countSql, params, pagination)` — paginated query with total count
