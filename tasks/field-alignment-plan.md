# Field Name Alignment: Mock-DB → Legacy WinScopeNet

## Key Findings from Schema Comparison

### Tables that match well (field names already correct):
- tblRepair — core fields match (lRepairKey, lDepartmentKey, lScopeKey, sWorkOrderNumber, dtDateIn, dtDateOut, etc.)
- tblClient — core fields match (lClientKey, sClientName1, sMailAddr1, etc.)
- tblDepartment — core fields match (lDepartmentKey, sDepartmentName, sShipName1, etc.)
- tblScope — core fields match (lScopeKey, sSerialNumber, lScopeTypeKey, etc.)
- tblScopeType — core fields match (lScopeTypeKey, sScopeTypeDesc, sRigidOrFlexible)
- tblContract — core fields match (lContractKey, sContractName1, dtDateEffective, etc.)
- tblInventory — fields match (lInventoryKey, sItemDescription, nLevelCurrent, etc.)
- tblRepairItemTran — fields match (lRepairItemTranKey, lRepairKey, dblRepairPrice, etc.)

### Gaps & Mismatches Found:

#### 1. Service Locations
- **Legacy:** `sServiceLocation` (not sServiceLocationName)
- **Mock:** `sServiceLocationName`
- **Legacy:** `sTransNumberPrefix` (WO prefix per location)
- **Mock:** missing this field

#### 2. Contacts
- **Legacy:** table is `tblContacts` (plural), has `sContactPhoneVoice` + `sContactPhoneFAX`
- **Mock:** uses `sContactPhoneNumber` + `sContactFaxNumber` (simplified)
- **Legacy:** has `bBillingContact`, `bCartQuote`, `bInventorySale`, `bUseForReqEmail`
- **Mock:** missing these role flags

#### 3. Suppliers
- **Legacy:** `sSupplierName1` + `sSupplierName2` (two name fields)
- **Mock:** uses `sSupplierName` (single)
- **Legacy:** has `bAcquisitionSupplier`, `bShowOnDashboard`, etc.
- **Mock:** uses `bPartsVendor`, `bRepairVendor`, etc. (invented flags)

#### 4. Sales Reps
- **Legacy:** `sRepFirst` + `sRepLast` (not sFirstName/sLastName)
- **Mock:** uses `sFirstName`, `sLastName` (wrong prefix)
- **Legacy:** has `sRepEMail`, `sRepPhoneVoice`, `sRepAddr1`, etc.

#### 5. Technicians
- **Legacy:** `bIsActive` (not bActive), `sTechInits`, `sTechLevel`, `lServiceLocationKey`
- **Mock:** uses `bActive`

#### 6. Users
- **Legacy:** `sUserFullName`, `sUserName`, `sUserPassword`, `sInitials`
- **Mock:** uses `sFirstName`, `sLastName`, `sUserName`

#### 7. StatusTran
- **Legacy:** `lStatusKey`, `nOrdinalID`, `dtCompleteDate`, `sStatusDesc`, `mTranComments`, `bIsVoid`
- **Mock:** uses `sDescription`, `dtDateTime`, `sUserName`, `sComments`, `sVoided`

#### 8. Invoice
- **Legacy:** `sTranNumber` (not sInvoiceNumber), `dblTranAmount`, `dtTranDate`
- **Mock:** uses `sInvoiceNumber`, `dblAmount`, `dtIssuedDate`

#### 9. Flags
- **Legacy:** `lFlagTypeKey`, `bVisibleOnBlank`, `bVisibleOnDI`
- **Mock:** uses `sFlagType`, `sStatus`, `mComment`

#### 10. Repair
- **Legacy:** 265 columns. Key mismatches:
  - `dtExpDelDate` — we use `EstDelDate`
  - `nDaysSinceLastIn` — we use `DaysLastIn`
  - Missing: `lRepairReasonKey`, `dblAmtCostLabor`, `dblAmtCostMaterial`, `dblMarginPctActual`

#### 11. Contract
- **Legacy:** has `bSharedRisk`, `nSharedRiskPercentage`, `bServicePlan`, `lContractKey_Renewed`
- **Mock:** missing these business-critical flags

## Plan

### Phase 1: Critical Renames (fields the UI actively uses)
- [ ] StatusTran: sDescription→sStatusDesc, dtDateTime→dtCompleteDate, sComments→mTranComments, sVoided→bIsVoid
- [ ] Invoice: sInvoiceNumber→sTranNumber, dblAmount→dblTranAmount, dtIssuedDate→dtTranDate
- [ ] ServiceLocation: sServiceLocationName→sServiceLocation
- [ ] SalesRep: sFirstName→sRepFirst, sLastName→sRepLast
- [ ] Repair: EstDelDate→dtExpDelDate, DaysLastIn→nDaysSinceLastIn
- [ ] Contacts: sContactPhoneNumber→sContactPhoneVoice, sContactFaxNumber→sContactPhoneFAX
- [ ] Supplier: sSupplierName→sSupplierName1

### Phase 2: Add Missing Fields (business-critical)
- [ ] tblRepair: lRepairReasonKey, dblAmtCostLabor, dblAmtCostMaterial, dblMarginPctActual
- [ ] tblContract: bSharedRisk, nSharedRiskPercentage, lContractKey_Renewed, bServicePlan
- [ ] tblDepartment: bOnsiteService, bTaxExempt
- [ ] tblServiceLocations: sTransNumberPrefix

### Phase 3: Update all HTML/JS references
- [ ] Grep for every renamed field across all .html and .js files
- [ ] Update mock-db.js seed data
- [ ] Update mock-api.js response mappings
- [ ] Update api.js field normalizers
- [ ] Test every page loads without console errors
