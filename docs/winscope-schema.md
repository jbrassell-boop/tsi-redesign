# WinScope Database Schema Reference

Extracted from `C:/Projects/Total-Scope-Inc/API/DB/TotalScope.Db/Tables/`
905 SQL files, 400 real tables. Key tables documented below.

---

## Entity Hierarchy
```
tblClient -> tblDepartment -> tblScope -> tblRepair
                                       -> tblStatusTran (audit trail)
                                       -> tblRepairDetail (line items)

tblScopeType  <- tblScope (instrument model lookup)
tblContract   <- tblScope + tblRepair (service agreement)
tblRepairItem <- tblRepairDetail (parts/labor catalog)
tblSystemCodes -> all dropdowns (sGroupName + sItemText pattern)
```

---

## tblClient

| Column | Type | Notes |
|--------|------|-------|
| lClientKey | INT | PK |
| sClientName1 | NVARCHAR(40) | Primary name — our UI uses `sClientName` (verify API) |
| sClientName2 | NVARCHAR(40) | Secondary name line |
| sMailAddr1/2 | NVARCHAR(40) | Mailing address |
| sMailCity/State/Zip | NVARCHAR | |
| sPhoneNumber | NVARCHAR(13) | |
| sFaxNumber | NVARCHAR(13) | |
| lSalesRepKey | INT | FK |
| lPricingCategoryKey | INT | FK |
| lTerritoryKey | INT | FK |
| dblDiscountPct | FLOAT | |
| mComments | TEXT | |
| dtClientSince | DATETIME | |
| bActive | BIT | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblDepartment

| Column | Type | Notes |
|--------|------|-------|
| lDepartmentKey | INT | PK |
| lClientKey | INT | FK -> tblClient |
| sDepartmentName | NVARCHAR(40) | matches our UI |
| sShipName1/2, sShipAddr1/2, sShipCity/State/Zip | NVARCHAR | |
| sBillName1/2, sBillAddr1/2, sBillCity/State/Zip | NVARCHAR | |
| sMailAddr1/2, sMailCity/State/Zip | NVARCHAR | |
| sContactLast/First | NVARCHAR(50) | |
| sContactPhoneNumber/FaxNumber | NVARCHAR(13) | |
| sContactEMail | NVARCHAR(100) | |
| lSalesRepKey | INT | |
| lReportingGroupKey | INT | |
| lServiceLocationKey | INT | Upper Chichester=1, Nashville=2 |
| bActive | BIT | |
| bTracking | BIT | renamed from bTrackingNumberRequired |
| bTaxExempt | BIT | |
| bAcquisitionsDepartment | BIT | |
| GPOID | NVARCHAR(50) | GPO contract ID |
| GLN | NVARCHAR(50) | Global Location Number |
| nDiscountPercentage/nMarkupPercentage | DECIMAL(10,2) | |
| dtCustomerSince/dtActivatedDate/dtActivityLastDate | DATETIME | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblScope

| Column | Type | Notes |
|--------|------|-------|
| lScopeKey | INT | PK |
| lScopeTypeKey | INT | FK -> tblScopeType |
| lDepartmentKey | INT | FK -> tblDepartment |
| lContractKey | INT | FK -> tblContract |
| sSerialNumber | NVARCHAR(50) | matches our UI |
| sRigidOrFlexible | NVARCHAR(1) | F/R/C/I |
| sUPC | NVARCHAR(20) | |
| sLoanerRackPosition | VARCHAR(10) | |
| sBillAddr1/2, sBillCity/State/Zip | NVARCHAR | Scope-level billing |
| sShipName1/2, sShipAddr1/2, sShipCity/State/Zip | NVARCHAR | |
| mComments | NTEXT | |
| mCommentsDisIns | NTEXT | Dis/Ins comments |
| sScopeIsDead | NVARCHAR(1) | Retired scope flag |
| bOnSiteLoaner | BIT | |
| lDepartmentKey_PendingLoaner | INT | Loaner tracking |
| sWorkOrderNumber_PendingLoaner | NVARCHAR(50) | |
| sLocation | NVARCHAR(50) | |
| lAcquisitionSupplierPOTranKey | INT | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblScopeType

| Column | Type | Notes |
|--------|------|-------|
| lScopeTypeKey | INT | PK |
| sScopeTypeDesc | NVARCHAR(200) | Model description |
| sScopeTypeLongDesc | NVARCHAR(200) | |
| sRigidOrFlexible | NVARCHAR(1) | F/R/C/I |
| sAngLeft/Right/Up/Down | NVARCHAR(3) | Angulation specs |
| sInsertTubeLength/Diameter | NVARCHAR(8) | |
| sForcepChannelSize | NVARCHAR(8) | |
| sFieldOfView/DirectionOfView/DepthOfField | NVARCHAR(8) | Optical specs |
| mMaxCharge | MONEY | Contract max charge |
| nContractCost | DECIMAL(10,2) | |
| lManufacturerKey | INT | |
| lScopeCategoryKey | INT | |
| bActive | BIT | |
| bAutoclaveable | BIT | |
| bForceOnPortal/bSkipPortal | BIT | Portal visibility |
| sItemCode/sGLAcct | NVARCHAR(50) | Accounting |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblRepair (~270 columns)

| Column | Type | Notes |
|--------|------|-------|
| lRepairKey | INT | PK |
| lDepartmentKey | INT | FK -> tblDepartment (direct, no scope join needed) |
| lScopeKey | INT | FK -> tblScope |
| lContractKey | INT | FK -> tblContract |
| lTechnicianKey / lTechnician2Key | INT | FK -> tblEmployee |
| lInspectorKey | INT | |
| lSalesRepKey | INT | |
| sWorkOrderNumber | NVARCHAR(13) | |
| sInvoiceNumber | NVARCHAR(15) | |
| sComplaintDesc | NVARCHAR(300) | |
| dtDateIn / dtDateOut | DATETIME | |
| dtReqSent / dtAprRecvd | DATETIME | Quote sent/received |
| dtExpDelDate / dtExpDelDateTSI | DATETIME | Expected delivery |
| sBillName1/2, sBillAddr1/2, sBillCity/State/Zip | | Bill-to address |
| sShipName1/2, sShipAddr1/2, sShipCity/State/Zip | | Ship-to address |
| dblAmtRepair | FLOAT | |
| dblAmtShipping | FLOAT | |
| dblAmtCommission | FLOAT | |
| dblAmtCostLabor / dblAmtCostMaterial | FLOAT | Cost tracking |
| dblMarginPctActual / dblMarginPctDefault | FLOAT | |
| sAngInLeft/Right/Up/Down | NVARCHAR(3) | Incoming angulation readings |
| sAngOutLeft/Right/Up/Down | NVARCHAR(3) | Outgoing angulation readings |
| sBrokenFibersIn/Out | NVARCHAR(3) | |
| sIns*PF columns (~40) | NVARCHAR(1) | Pass/Fail inspection flags |
| mComments | NTEXT | |
| mCommentsHidden | NTEXT | Internal notes |
| mCommentsISO | NTEXT | |
| mCommentsRework | NTEXT | |
| mCommentsDisIns | NTEXT | |
| lRepairStatusID | SMALLINT | Current status |
| sRepairClosed | NVARCHAR(1) | |
| bFirstRepair | BIT | First time this scope repaired |
| bLoanerRequested | BIT | |
| lScopeKey_Loaner | INT | Loaner scope assigned |
| sDashboardNote | NVARCHAR(MAX) | |
| sPurchaseOrder | NVARCHAR(50) | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblContract

| Column | Type | Notes |
|--------|------|-------|
| lContractKey | INT | PK |
| lClientKey | INT | FK -> tblClient |
| sContractName1/2 | NVARCHAR(100) | |
| sContractNumber | NVARCHAR(20) | |
| dtDateEffective / dtDateTermination | DATETIME | |
| dtOriginalTerminationDate | DATETIME | |
| lContractLengthInMonths | INT | |
| dblAmtTotal / dblAmtInvoiced | FLOAT | |
| nInstallmentsTotal / nInstallmentsInvoiced | INT | |
| nCountFlexible/Rigid/Instrument/Camera/All | INT | Scope counts by type |
| lContractTypeKey | INT | |
| bServicePlan | BIT | |
| bSharedRisk | BIT | |
| nSharedRiskPercentage | DECIMAL(10,4) | |
| dtSharedRiskStartDate | DATE | |
| bCostsPerDepartment | BIT | |
| lContractKey_Renewed | INT | Links to renewal contract |
| sPurchaseOrder | NVARCHAR(50) | |
| mComments | NTEXT | |
| sGLAcct | NVARCHAR(10) | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblRepairItem

| Column | Type | Notes |
|--------|------|-------|
| lRepairItemKey | INT | PK |
| sItemDescription | NVARCHAR(50) | |
| sRigidOrFlexible | NVARCHAR(1) | F/R |
| sPartOrLabor | NVARCHAR(1) | P/L |
| nTurnAroundTime | INT | Days |
| dblHoursTech1/2/3 | FLOAT | Labor hours |
| tMinutesTech1/2/3 | INT | |
| tMinutesTech1/2/3SmallDiameter | INT | Small diameter variant |
| nPoints / nPointsSmall | DECIMAL(10,2) | Productivity points |
| nUnitCost | DECIMAL(10,2) | |
| dblAvgCostMaterial / dblAvgCostLabor | FLOAT | |
| lRepairLevelKey | INT | |
| sTSICode | NVARCHAR(50) | TSI internal code |
| sProductID_HPG/Broadlane/Premier/Partner/SurgicalSolutions | NVARCHAR | GPO product IDs |
| bActive / bIsAdjustment / bOkayToSkip / bLocked | BIT | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblStatusTran

| Column | Type | Notes |
|--------|------|-------|
| lStatusTranKey | INT | PK |
| lRepairKey | INT | FK -> tblRepair |
| lStatusKey | INT | Status code |
| sStatusDesc | NVARCHAR(20) | Status label |
| nOrdinalID | INT | Workflow order |
| dtCompleteDate | DATETIME | When status was set |
| lUserKey | INT | Who set it |
| mTranComments | NTEXT | Notes |
| bIsVoid | BIT | Voided entry |
| lVoidUserKey | INT | Who voided |
| dtVoidDate | DATETIME | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblInventory

| Column | Type | Notes |
|--------|------|-------|
| lInventoryKey | INT | PK |
| sItemDescription | NVARCHAR(50) | |
| sRigidOrFlexible | NVARCHAR(1) | |
| nLevelMinimum / nLevelMaximum / nLevelCurrent | INT | Stock levels |
| bActive / bNoCountAdjustment / bAlwaysReOrder | BIT | |
| bLargeDiameter / bSkipPickList | BIT | |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblEmployee

| Column | Type | Notes |
|--------|------|-------|
| lEmployeeKey | INT | PK |
| sEmployeeLast / sEmployeeFirst | NVARCHAR(20) | |
| sEmployeePhoneNumber / FaxNumber | NVARCHAR(13) | |
| sEmployeeEMail | NVARCHAR(100) | |
| bInclCCProdSR / bInclSRSmry | BIT | Report inclusion flags |
| bInclBroadlane / bInclNovation / bInclHPG | BIT | GPO report flags |
| Created/Updated/Deleted_UserKey + _datetime | | Soft delete audit |

---

## tblSystemCodes (master dropdown lookup)

| Column | Type | Notes |
|--------|------|-------|
| lSystemCodesKey | INT | PK |
| lSystemCodesHdrKey | INT | FK -> tblSystemCodesHdr |
| sGroupName | NVARCHAR(15) | Category identifier |
| sItemText | NVARCHAR(30) | Display text |
| lItemKey | INT | Integer value |
| cItemChar | CHAR(1) | Char value |
| nOrdinal | INT | Sort order |
| lValueInteger01/02/03 | INT | Extra values |
| sValueString01/02/03 | VARCHAR(20) | Extra string values |
| nValueDecimal01 | DECIMAL(10,4) | |

---

## API Field Mapping Notes

| Our UI Assumes | Real DB Column | Status |
|----------------|---------------|--------|
| sClientName | sClientName1 | verify API mapping |
| sDepartmentName | sDepartmentName | OK |
| sSerialNumber | sSerialNumber | OK |
| dtDateIn / dtDateOut | dtDateIn / dtDateOut | OK |
| sWorkOrderNumber | sWorkOrderNumber | OK |
| mComments (5 variants) | mComments + 4 variants | OK |
| lRepairStatusID | lRepairStatusID | OK |
| bSharedRisk | bSharedRisk | OK |
| nCountFlexible etc. | nCountFlexible etc. | OK |

## Notable Findings
- tblRepair has ~270 columns including full angulation inspection data
- All tables use soft-delete pattern (Deleted_UserKey + Deleted_datetime)
- tblSystemCodes drives all dropdown lookups (sGroupName = category, sItemText = label)
- tblStatusTran has bIsVoid — may explain why status endpoint returns 500 (stored proc issue)
- tblContract has lContractKey_Renewed for tracking renewal chains
- tblRepairItem has GPO product IDs for all major GPOs (Broadlane, HPG, Premier, etc.)
- tblRepairItem has productivity point tracking (nPoints, nPointsSmall) for tech performance
