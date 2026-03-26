# Technical Specification: Client/Department Hierarchy

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Contracts, Pricing, Invoicing, Scopes

---

## 1. Overview

TSI's data model follows a **three-level hierarchy**:

```
Client (Hospital/Organization)
  └── Department (GI Lab, OR, Purchasing)
        └── Scope (Individual instrument — serial number)
```

**Key principle:** The **department** carries the operational weight. Pricing, contracts, billing addresses, shipping, POs, and scope ownership all resolve at the department level. The client is the organizational parent, but most business logic keys off the department.

---

## 2. Relationship Structure

| Relationship | Type | Description |
|-------------|------|-------------|
| Client → Department | 1:Many | Every department has exactly one parent client |
| Department → Scope | 1:Many | Every scope belongs to exactly one department |
| Department → Contract | Many:Many | Via `contractDepartments` junction table |
| Client → SalesRep | N:1 | Primary rep assigned to client |
| Department → SalesRep | N:1 | Can override client's rep |
| Department → PricingCategory | N:1 | Can differ from client pricing |

---

## 3. Schema — Clients

### `tblClient`

**Identity:**
| Column | Type | Description |
|--------|------|-------------|
| `lClientKey` | `int` (PK) | Unique client ID |
| `sClientName1` | `varchar(100)` | Primary name (e.g., "Thomas Jefferson Univ. Hosp.") |
| `sClientName2` | `varchar(100)` | Secondary name / AP contact |
| `sClientID` | `varchar(20)` | Legacy client ID (e.g., "00005") |
| `sGPID` | `varchar(20)` | Great Plains ID (primary region) |
| `sGPIDSouth` | `varchar(20)` | Great Plains ID (South region) |

**National Account:**
| Column | Type | Description |
|--------|------|-------------|
| `bNationalAccount` | `bit` | Multi-region/multi-location flag |
| `lClientKey_NationalAccount` | `int` | FK to parent national account (if subsidiary) |

**Addresses (3 sets):**
- **Mail:** `sMailAddr1/2, sMailCity, sMailState, sMailZip, sMailCountry`
- **Bill:** `sBillAddr1/2, sBillCity, sBillState, sBillZip`
- **Ship:** `sShipAddr1/2, sShipCity, sShipState, sShipZip`

**Business Config:**
| Column | Type | Description |
|--------|------|-------------|
| `lSalesRepKey` | `int` (FK) | Primary sales rep |
| `lPricingCategoryKey` | `int` (FK) | Default pricing tier |
| `lPaymentTermsKey` | `int` (FK) | Payment terms |
| `lCreditLimitKey` | `int` (FK) | Credit limit |
| `lDistributorKey` | `int` (FK) | House account / distributor |
| `lServiceLocationKey` | `int` (FK) | Default service region (1=North, 2=South) |

**Billing Flags:**
| Column | Type | Description |
|--------|------|-------------|
| `sPORequired` | `bit` | POs required for this customer |
| `bPaysByCreditCard` | `bit` | Credit card payment |
| `bTaxExempt` | `bit` | Tax exempt |
| `sBadDebtRisk` | `char(1)` | Y/N bad debt risk |
| `bNeverHold` | `bit` | Never place credit holds |

**Portal:**
| Column | Type | Description |
|--------|------|-------------|
| `nPortalMonths` | `int` | Months of history visible on portal (e.g., 24) |
| `bShowAssociatedContractOnPortal` | `bit` | Show contract on portal |

**Status:**
| Column | Type | Description |
|--------|------|-------------|
| `bActive` | `bit` | Active client |
| `dtClientSince` | `datetime` | Customer since date |

---

## 4. Schema — Departments

### `tblDepartment`

**Identity:**
| Column | Type | Description |
|--------|------|-------------|
| `lDepartmentKey` | `int` (PK) | Unique department ID |
| `lClientKey` | `int` (FK → Clients) | **Parent client** |
| `sDepartmentName` | `varchar(100)` | Department name (e.g., "Endoscopy", "Purchasing") |
| `sClientName1` | `varchar(100)` | Denormalized parent client name |

**Address Overrides (can differ from client):**
- **Ship:** `sShipAddr1/2, sShipCity, sShipState, sShipZip`
- **Bill:** `sBillName1/2, sBillAddr1/2, sBillCity, sBillState, sBillZip`
- **Mail:** `sMailAddr1/2, sMailCity, sMailState, sMailZip`

**Contact:**
| Column | Type | Description |
|--------|------|-------------|
| `sContactFirst` | `varchar(50)` | Primary contact first name |
| `sContactLast` | `varchar(50)` | Primary contact last name |
| `sContactPhoneVoice` | `varchar(20)` | Phone |
| `sBillEmail` | `varchar(100)` | Invoice delivery email |

**Business Config (can override client):**
| Column | Type | Description |
|--------|------|-------------|
| `lSalesRepKey` | `int` (FK) | Can differ from client rep |
| `lPricingCategoryKey` | `int` (FK) | Can differ from client pricing |
| `lServiceLocationKey` | `int` (FK) | Service region |
| `lSalesTaxKey` | `int` (FK) | Tax jurisdiction |
| `lTerritoryKey` | `int` | Territory assignment |
| `lReportingGroupKey` | `int` | GPO / reporting group |

**Operational:**
| Column | Type | Description |
|--------|------|-------------|
| `sDeptType` | `char(1)` | Department type code |
| `bActive` | `bit` | Active flag |
| `bEnforceScopeTypeFiltering` | `bit` | Restrict scope types to allowed list |
| `lShippingCarrierKey` | `int` | Default carrier |
| `lBillType` | `int` | Invoice format (1=standard, 2=detail) |
| `bTaxExempt` | `bit` | Tax exempt override |
| `bTrackingNumberRequired` | `bit` | Require tracking on shipments |
| `bDisplayItemDescription` | `bit` | Show item descriptions on invoices |
| `lProcedures` | `int` | Monthly procedures count (metric) |
| `lBedSize` | `int` | Hospital bed count |

**Scope Management Profiles:**
| Column | Type | Description |
|--------|------|-------------|
| `lProfileCleaningKey` | `int` | Default cleaning profile |
| `lProfileGermicideKey` | `int` | Default germicide profile |
| `lProfileManufacturerKey` | `int` | Default manufacturer profile |
| `lProfileCompetitionKey` | `int` | Competition tracking |

---

## 5. Schema — Scopes (Equipment)

### `tblScope`

| Column | Type | Description |
|--------|------|-------------|
| `lScopeKey` | `int` (PK) | Unique instrument ID |
| `sSerialNumber` | `varchar(50)` | Manufacturer serial number |
| `lDepartmentKey` | `int` (FK → Departments) | **Owner department** |
| `lScopeTypeKey` | `int` (FK → ScopeTypes) | Model/type |
| `sScopeTypeDesc` | `varchar(100)` | Model description (e.g., "GIFH190") |
| `sManufacturer` | `varchar(50)` | OEM (e.g., "Olympus") |
| `sScopeTypeCategory` | `varchar(50)` | Functional category (e.g., "Gastroscope") |
| `sRigidOrFlexible` | `char(1)` | F=Flexible, R=Rigid, C=Cart |
| `sLocation` | `varchar(20)` | Physical location (NORTH/SOUTH) |
| `sScopeIsDead` | `char(1)` | Y/N — retired/destroyed |
| `lContractKey` | `int` (FK → Contracts) | Service contract (0 if none) |
| `bOnSiteLoaner` | `bit` | On-site loaner flag |

---

## 6. Override Pattern

Departments can **override** several client-level settings:

| Setting | Client Field | Department Field | Precedence |
|---------|-------------|-----------------|------------|
| Sales Rep | `lSalesRepKey` | `lSalesRepKey` | Department wins if set |
| Pricing | `lPricingCategoryKey` | `lPricingCategoryKey` | Department wins if set |
| Tax | `lSalesTaxKey` | `lSalesTaxKey` | Department wins if set |
| Bill Address | `sBillAddr1...` | `sBillAddr1...` | Department wins if set |
| Ship Address | `sShipAddr1...` | `sShipAddr1...` | Department wins if set |
| Tax Exempt | `bTaxExempt` | `bTaxExempt` | Department wins if set |

**Rule:** When creating a work order or invoice, always resolve from the **department** first, fall back to **client** if the department field is null/empty.

---

## 7. Credit Memos (Client-Level)

### Structure
```json
{
  "id": "CM-2026-001",
  "date": "2026-03-24",
  "amount": 1500.00,
  "remaining": 1200.50,
  "reason": "Overage credit / Volume adjustment",
  "status": "Open | Applied",
  "applications": [
    { "invoiceId": "INV-2026-0123", "appliedAmount": 299.50, "date": "2026-03-20" }
  ]
}
```

Credit memos are **client-scoped** — they apply across all departments. Total available credit displays as a badge on the client record.

---

## 8. Regional Partitioning

| Region | Service Location Key | GP ID Field | Prefix |
|--------|---------------------|-------------|--------|
| North | 1 | `sGPID` | `N` |
| South | 2 | `sGPIDSouth` | `S` |

All list endpoints accept `plServiceLocationKey` to filter by region. The `_region` computed field ("North" / "South") is used for UI display.

---

## 9. API Endpoints

### Clients
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Client/GetAllClientList` | GET | Filtered by service location |
| `/Client/GetClientDetailsByClientId` | GET | Single client + contacts + departments |
| `/Client/AddClient` | POST | Create |
| `/Client/UpdateClient` | POST | Update |
| `/Client/DeleteClient` | DELETE | Delete |
| `/Client/GetCityStateUSA` | GET | Zip → city/state lookup |

### Departments
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Departments/GetAllDepartments` | GET | Filtered by service location |
| `/Departments/GetDepartmentDetailsByDepartmentId` | GET | Single department |
| `/Departments/AddDepartment` | POST | Create |
| `/Departments/UpdateDepartment` | POST | Update |
| `/Departments/DeleteDepartment` | DELETE | Delete |

### Scopes
| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Scopes/GetAllScopes` | GET | By department, filter dead/alive |
| `/Scopes/GetScopeByScopeId` | GET | Single scope |
| `/Scopes/AddScope` | POST | Create |
| `/Scopes/DeleteScope` | DELETE | Delete |

---

## 10. UI Structure

### clients.html Tabs
1. **Main** — Core info, addresses, billing, terms, credit
2. **Addresses** — Mail, bill, ship (overridable per dept)
3. **Departments** — Table of all departments
4. **Flags** — Client-level flags
5. **Contacts** — Client contacts
6. **Report Card** — Performance metrics
7. **Activity** — Audit log

### departments.html Tabs
1. **Main** — Name, parent client, contact, billing
2. **Addresses** — Override addresses
3. **Scopes** — All scopes in department (click for detail drawer)
4. **GPO's** — Reporting groups
5. **Scope Types** — Allowed scope types (transfer list)
6. **Sub Groups** — Sub-group assignments
7. **Contacts** — Department contacts
8. **Documents** — Linked docs
9. **Model Max Charges** — Charge limits by scope type

---

## 11. Key Design Decisions for Developer

1. **Department is king** — resolve pricing, rep, tax, addresses from department first, client second
2. **Denormalization is intentional** — `sClientName1`, `sSalesRepName`, `sPricingCategory` are stored on department for query performance
3. **Regional filtering** — every list query uses `plServiceLocationKey`; never show North data to South users
4. **National accounts** — `bNationalAccount` + `lClientKey_NationalAccount` enables multi-site clients
5. **Audit everything** — `lLastUpdateUser`, `dtLastUpdate` on every CUD operation
