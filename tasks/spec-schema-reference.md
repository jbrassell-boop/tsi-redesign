# WinScopeNet — Database Schema Reference

**Date:** 2026-03-25
**Source:** Live WinScopeNet SQL Server (Developer Edition, localhost)
**Purpose:** Exact column names and types for all key tables — developer reference for implementation

> **Naming convention:** `l` = int/long key, `s` = string, `dbl`/`m`/`n` = numeric/money, `b` = bit/boolean, `dt` = datetime

---

## tblRepair
190,219 rows | PK: lRepairKey

| Column | Type |
|--------|------|
| lRepairKey **PK** | int |
| lSessionID | int |
| lDepartmentKey | int |
| lScopeKey | int |
| lDistributorKey | int |
| lSalesRepKey | int |
| lDeliveryMethodKey | int |
| lPricingCategoryKey | int |
| lContractKey | int |
| lInspectorKey | int |
| lTechnicianKey | int |
| lTechnician2Key | int |
| lPaymentTermsKey | int |
| lVendorKey | int |
| lSalesTaxKey | int |
| lMktgCampaignKey | int |
| lMktgPackageKey | int |
| lMktgListCodeKey | int |
| lMktgListNameKey | int |
| lFriendRepairKey | int |
| sComplaintDesc | nvarchar(300) |
| sWorkOrderNumber | nvarchar(13) |
| sInvoiceNumber | nvarchar(15) |
| dtDateIn | datetime |
| dtDateOut | datetime |
| dtReqSent | datetime |
| dtAprRecvd | datetime |
| sExpDelDate | varchar(10) |
| dtExpDelDate | datetime |
| dtExpDelDateTSI | datetime |
| sBillName1 | varchar(40) |
| sBillName2 | varchar(40) |
| sBillAddr1 | nvarchar(40) |
| sBillAddr2 | nvarchar(40) |
| sBillCity | nvarchar(30) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sShipName1 | nvarchar(40) |
| sShipName2 | nvarchar(40) |
| sShipAddr1 | nvarchar(40) |
| sShipAddr2 | nvarchar(40) |
| sShipCity | nvarchar(30) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| dblAmtShipping | float |
| dblAmtRepair | float |
| dblAmtCommission | float |
| dblAmtReceivedPT | float |
| dtDateCommissionPaid | datetime |
| sAngInLeft | nvarchar(3) |
| sAngInRight | nvarchar(3) |
| sAngInUp | nvarchar(3) |
| sAngInDown | nvarchar(3) |
| sAngOutLeft | nvarchar(3) |
| sAngOutRight | nvarchar(3) |
| sAngOutUp | nvarchar(3) |
| sAngOutDown | nvarchar(3) |
| sBrokenFibersIn | nvarchar(3) |
| sBrokenFibersOut | nvarchar(3) |
| sConnectors | nvarchar(3) |
| sPurchaseOrder | nvarchar(50) |
| mComments | ntext |
| mCommentsHidden | ntext |
| sInsOpticsAngle | nvarchar(3) |
| sInsOpticsField | nvarchar(3) |
| sInsOpticsResolution | nvarchar(3) |
| sInsFiberAngle | nvarchar(3) |
| sInsFiberLightTrans | nvarchar(3) |
| sInsOpticsAnglePF | nvarchar(1) |
| sInsOpticsFieldPF | nvarchar(1) |
| sInsOpticsResolutionPF | nvarchar(1) |
| sInsFiberAnglePF | nvarchar(1) |
| sInsFiberLightTransPF | nvarchar(1) |
| sInsHotColdLeakPF | nvarchar(1) |
| sInsFocalDistancePF | nvarchar(1) |
| sInsVisionPF | nvarchar(1) |
| sInsInsertionTubePF | nvarchar(1) |
| sInsUniversalCordPF | nvarchar(1) |
| sInsLightGuideConnectorPF | nvarchar(1) |
| sInsDistalTipPF | nvarchar(1) |
| sInsEyePiecePF | nvarchar(1) |
| sInsLightFibersPF | nvarchar(1) |
| sInsLeakPF | nvarchar(1) |
| sInsFogPF | nvarchar(1) |
| sInsAirWaterPF | nvarchar(1) |
| sInsSuctionPF | nvarchar(1) |
| sInsImagePF | nvarchar(1) |
| sInsImageCentrationPF | nvarchar(1) |
| sInsAngulationPF | nvarchar(1) |
| sInsAlcoholWipePF | nvarchar(1) |
| sInsCamLensCleanedPF | nvarchar(1) |
| sInsCamFocusPF | nvarchar(1) |
| sInsCamWhiteBalancePF | nvarchar(1) |
| sInsCamControlButtonsPF | nvarchar(1) |
| sInsCamCableConnectorPF | nvarchar(1) |
| sInsCamVideoAppearancePF | nvarchar(1) |
| sInsCamSoakCapAssemblyPF | nvarchar(1) |
| sInsCamCablePF | nvarchar(1) |
| sInsCamEdgeCardProtectorPF | nvarchar(1) |
| sInsCoupLeakPF | nvarchar(1) |
| sInsCoupLensCleanedPF | nvarchar(1) |
| sInsCoupFocusPF | nvarchar(1) |
| sInsCoupFogPF | nvarchar(1) |
| sInsCoupFocusMechPF | nvarchar(1) |
| sInsCoupScopeRetainingMechPF | nvarchar(1) |
| sInsAuxWaterPF | nvarchar(1) |
| sInsForcepChannelPF | nvarchar(1) |
| sIncludesCameraYN | nvarchar(1) |
| sIncludesCamCouplerYN | nvarchar(1) |
| sIncludesCamSoakCapYN | nvarchar(1) |
| sIncludesCamEdgeCardProtYN | nvarchar(1) |
| sIncludesCO2CapYN | nvarchar(1) |
| sIncludesHoodYN | nvarchar(1) |
| sIncludesBioCapYN | nvarchar(1) |
| sIncludesETOCapYN | nvarchar(1) |
| sIncludesAirWaterValveYN | nvarchar(1) |
| sIncludesSuctionValveYN | nvarchar(1) |
| sIncludesWaterProofCapYN | nvarchar(1) |
| sIncludesBoxYN | nvarchar(1) |
| sIncludesCaseYN | nvarchar(1) |
| sInsFinalPF | nvarchar(1) |
| sInsScopeIsUsableYN | nvarchar(1) |
| sInsScopeIsRepairableYN | nvarchar(1) |
| dblAcuityRating | float |
| sInHsId | nvarchar(8) |
| sScopeID | nvarchar(5) |
| sRepID | nvarchar(4) |
| sShipID | nvarchar(3) |
| sInitTech | nvarchar(3) |
| sInitInsptr | nvarchar(3) |
| sContractNumber | nvarchar(5) |
| sRepairClosed | nvarchar(1) |
| sBillTo | nvarchar(1) |
| sLoanerRepair | nvarchar(1) |
| sRgdInsTube | nvarchar(20) |
| sRgdInsFiber | nvarchar(20) |
| sRgdInsEyeCup | nvarchar(20) |
| sRgdInsVision | nvarchar(20) |
| nDaysSinceLastIn | int |
| sDisplayItemDescription | nvarchar(1) |
| sDisplayItemAmount | nvarchar(1) |
| sFnlInsRepairTotal | nvarchar(1) |
| sRackPosition | nvarchar(10) |
| sApprName | nvarchar(30) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| sISOComplaint | nvarchar(1) |
| sISONonConformance | nvarchar(1) |
| mCommentsISO | ntext |
| nLengthIn | int |
| nLengthOut | int |
| nVideoAdjSetting | int |
| sReqAprTotalsOnly | nvarchar(1) |
| nCountConnectors | int |
| dblOutSourceCost | float |
| mCommentsRework | ntext |
| sReworkReqd | nvarchar(1) |
| bFirstRepair | bit |
| sPS3 | nvarchar(1) |
| sPS3Out | nvarchar(1) |
| sBRJigSize | nvarchar(5) |
| bLoanerRequested | bit |
| dtDateOrigInvcd | datetime |
| dtDateExportPeachTree | datetime |
| bExportVAOB10 | bit |
| bExportMemHermOB10 | bit |
| lCreateSessionKey | int |
| dblAmtCostLabor | float |
| dblAmtCostMaterial | float |
| dblMarginPctActual | float |
| dblMarginPctDefault | float |
| lMarginApprUserKey | int |
| dblMarginAdjustReqd | float |
| dblMarginAmtExpected | float |
| dtMarginApprDateTime | date |
| sNumOfUses | varchar(6) |
| sCumTime | nvarchar(6) |
| mCommentsDisIns | ntext |
| lRepairStatusID | smallint |
| lResponsibleTech | int |
| dtRepairStatusDate | datetime |
| dtExpDelDateFrom | date |
| dtExpDelDateTo | date |
| sShipTrackingNumber | nvarchar(50) |
| sShipAttention | nvarchar(50) |
| sShipPackageTypeKey | int |
| sShipWeight | int |
| dtShipDate | datetime |
| lReworkTech | int |
| lResultOfImproperCareByCustomer | int |
| sDisplayCustomerComplaint | nvarchar(1) |
| tMarkerPlate | time |
| sDirectionOfView | nvarchar(50) |
| nSquint | decimal(10,2) |
| lFieldOfView | int |
| sImageSizeAndCenterRunOut | nvarchar(100) |
| sResolutionGroup | int |
| sResolutionField | int |
| lIDRingKey | int |
| lDegreeKey | int |
| dtDeliveryDate | datetime |
| nIncomingEpoxySize | decimal(10,4) |
| sDICheckedInBy | nvarchar(50) |
| bFinalInspectionStarted | bit |
| sShipTrackingNumberFedEx | nvarchar(50) |
| bVendorShipFlag | bit |
| sShipTrackingNumberVendor | nvarchar(50) |
| lInstrumentCount | smallint |
| bOutsourced | bit |
| lParentRepairKey | int |
| bAddBlankInspectionStatus | bit |
| sBillCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| bByPassOnHold | bit |
| lByPassOnHoldUserKey | bit |
| dtByPassOnHoldDate | datetime |
| bTrackingNumberRequired | bit |
| dtDefectTrackingDate | datetime |
| dtDefectTrackingTime | datetime |
| sDefectReason | nvarchar(1) |
| sDefectFollowUpNotes | nvarchar(MAX) |
| sShipTrackingNumberIn | nvarchar(50) |
| dblShippingClientIn | decimal(10,2) |
| dblShippingClientOut | decimal(10,2) |
| blShippingVendorOut | decimal(10,2) |
| dblShippingVendorIn | decimal(10,2) |
| dblShippingAdjustments | decimal(10,2) |
| sShipTrackingNumberVendorIn | nvarchar(50) |
| dtCustomerSince | date |
| bNewCustomer | bit |
| bHotList | bit |
| nInventoryCost | decimal(10,2) |
| sShipTrackingNumberFedExIn | nvarchar(50) |
| sShipTrackingNumberVendorFedExIn | nvarchar(50) |
| lRepairVersion | int |
| lRepairReasonKey | int |
| dtDeliveryDateGuaranteed | datetime |
| sDeliveryServiceLevel | nvarchar(100) |
| dtCarrierDeliveryDateGuaranteed | date |
| sIncludesLightPostAdapterYN | nvarchar(1) |
| sPickupWasRequired | nvarchar(3) |
| sWasLoanerProduced | nvarchar(3) |
| lPackageTypeKey | int |
| sIsPackageReusable | nvarchar(3) |
| sFailureDuringCase | nvarchar(3) |
| sDashboardNote | nvarchar(MAX) |
| bDeliveryEmailSent | bit |
| lBillType | int |
| sBillEmail | nvarchar(500) |
| sBillEmailName | nvarchar(100) |
| lScopeKey_Loaner | int |
| nSalesTax | decimal(10,2) |
| sReviewedBy | nvarchar(50) |
| mMaxCharge | decimal(10,2) |
| lUserKey_MaxChargeOverride | int |
| bShipFromDistributor | bit |
| nAverageDailyUses | decimal(10,2) |
| bReplaced | bit |
| lTechnicianKey_DefectTracking | int |
| lServiceLocationKey | int |
| dtDeniedDate | date |
| sDenialReason | nvarchar(500) |
| sDeniedBy | nvarchar(100) |

---

## tblRepairItemTran
1,260,860 rows | No PK (clustered unique on lRepairItemTranKey)

| Column | Type |
|--------|------|
| lRepairItemTranKey | int |
| lRepairKey | int |
| lRepairItemKey | int |
| lTechnicianKey | int |
| lTechnician2Key | int |
| sApproved | nvarchar(1) |
| dblRepairPrice | float |
| dblRepairPriceBase | float |
| sComments | nvarchar(80) |
| sTransmitted | nvarchar(1) |
| sFixType | nvarchar(1) |
| sProblemID | nvarchar(5) |
| sTranID | nvarchar(8) |
| sInHsID | nvarchar(8) |
| sInitials | nvarchar(4) |
| sPrimaryRepair | nvarchar(1) |
| sUAorNWT | nvarchar(1) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| dblAvgCostMaterial | float |
| dblAvgCostLabor | float |
| dblTrueValue | float |
| lAmendRepairCommentKey | int |
| lQuantity | int |
| nRepairPriceUnitCost | decimal(10,2) |

---

## tblRepairInventory
255,512 rows | PK: lRepairInventoryKey

| Column | Type |
|--------|------|
| lRepairInventoryKey **PK** | int |
| lRepairItemTranKey | int |
| lScopeTypeRepairItemInventoryKey | int |

---

## tblRepairItem
2,048 rows | No PK (clustered unique on lRepairItemKey)

| Column | Type |
|--------|------|
| lRepairItemKey | int |
| sItemDescription | nvarchar(50) |
| nTurnAroundTime | int |
| sRigidOrFlexible | nvarchar(1) |
| sPartOrLabor | nvarchar(1) |
| sProblemID | nvarchar(5) |
| sInitsReqd | nvarchar(1) |
| dblHoursTech1 | float |
| dblHoursTech2 | float |
| dblHoursTech3 | float |
| sMajorRepair | nvarchar(1) |
| sProductID | nvarchar(6) |
| bActive | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| dblAvgCostMaterial | float |
| dblAvgCostLabor | float |
| bProfitItemPlus | bit |
| bProfitItemMinus | bit |
| lRepairStatusID | smallint |
| sProductID_HPG | nvarchar(10) |
| sProductID_Broadlane | nvarchar(10) |
| sProductID_Premier | nvarchar(10) |
| bOkayToSkip | bit |
| bIsAdjustment | bit |
| tMinutesTech1 | int |
| tMinutesTech2 | int |
| tMinutesTech3 | int |
| tMinutesTech1SmallDimater | int |
| tMinutesTech2SmallDimater | int |
| tMinutesTech3SmallDimater | int |
| nPoints | decimal(10,2) |
| nPointsSmall | decimal(10,2) |
| bSkipPickList | bit |
| sTSICode | nvarchar(50) |
| sProductID_Partner | nvarchar(50) |
| lRepairItemKey_OtherServer | int |
| sDiameterType | nvarchar(50) |
| bLocked | bit |
| nUnitCost | decimal(10,2) |
| sProductID_SurgicalSolutions | nvarchar(50) |

---

## tblRepairStatuses
20 rows | PK: lRepairStatusID

| Column | Type |
|--------|------|
| lRepairStatusID **PK** | smallint |
| sRepairStatus | nvarchar(50) |
| AlertHours | smallint |
| lRepairStatusSortOrder | tinyint |
| bIsReadOnly | bit |
| sAlertType | nvarchar(50) |

---

## tblInventory
393 rows | No PK (clustered unique on lInventoryKey)

| Column | Type |
|--------|------|
| lInventoryKey | int |
| sItemDescription | nvarchar(50) |
| nLevelMinimum | int |
| nLevelMaximum | int |
| nLevelCurrent | int |
| sRigidOrFlexible | nvarchar(1) |
| bNoCountAdjustment | bit |
| bNotUsedByRepair | bit |
| bAlwaysReOrder | bit |
| bActive | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| bLargeDiameter | bit |
| bSkipPickList | bit |

---

## tblInventorySize
18,194 rows | No PK (clustered unique on lInventorySizeKey)

| Column | Type |
|--------|------|
| lInventorySizeKey | int |
| lInventoryKey | int |
| sSizeDescription | nvarchar(200) |
| sRigidOrFlexible | nvarchar(1) |
| nLevelMinimum | int |
| nLevelMaximum | int |
| nLevelCurrent | int |
| dblUnitCost | float |
| bActive | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sBinNumber | nvarchar(50) |
| sStatus | nvarchar(50) |
| bScanRequired | bit |
| bLargeDiameter | bit |
| bAlwaysReorder | bit |
| dtNextReorderDate | date |
| bIncludeInWeeklyAudit | bit |
| sSizeDescription2 | nvarchar(300) |
| sSizeDescription3 | nvarchar(300) |

---

## tblInventoryTran
696,880 rows | No PK (clustered unique on lInventoryTranKey)

| Column | Type |
|--------|------|
| lInventoryTranKey | int |
| lInventorySizeKey | int |
| lSessionID | int |
| lRepairKey | int |
| lSupplierPOTranKey | int |
| nTranQuantity | int |
| dtTranDate | datetime |
| sLotNumber | nvarchar(50) |
| sPostedToCurrent | nvarchar(1) |
| sTranDescription | nvarchar(40) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| dtExpDate | datetime |
| sBinNumber | nvarchar(50) |
| sStorageLocation | nvarchar(50) |
| lUserKey | int |
| nQtyPerUnit | int |
| lRepairItemTranKey | int |

---

## tblSupplierPO
27,754 rows | No PK (clustered unique on lSupplierPOKey)

| Column | Type |
|--------|------|
| lSupplierPOKey | int |
| lSupplierKey | int |
| sSupplierPONumber | nvarchar(50) |
| lSessionID | int |
| dtDateOfPO | datetime |
| dblPOTotal | float |
| dblOrderMinimum | float |
| bCancelled | bit |
| bGenerated | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sEmailFlag | nvarchar(MAX) |
| sEmailAddress | nvarchar(400) |
| sEmailAddress2 | nvarchar(400) |
| dtEmailDateTime | datetime |
| lSupplierPOTypeKey | int |

---

## tblSupplierPOTran
54,867 rows | No PK (clustered unique on lSupplierPOTranKey)

| Column | Type |
|--------|------|
| lSupplierPOTranKey | int |
| lSupplierPOKey | int |
| lSessionID | int |
| lSupplierSizesKey | int |
| dblUnitCost | float |
| nOrderQuantity | int |
| nReceivedQuantity | int |
| dblItemCost | float |
| bActive | bit |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| lTechnicianKey | int |
| dtEstimatedDeliveryDate | datetime |
| bIntegratedWithGP | bit |

---

## tblClient
5,908 rows | PK: lClientKey

| Column | Type |
|--------|------|
| lClientKey **PK** | int |
| lSessionID | int |
| lSalesRepKey | int |
| lPricingCategoryKey | int |
| lPaymentTermsKey | int |
| lCustSourceKey | int |
| lTerritoryKey | int |
| lCreditLimitKey | int |
| lReportingGroupKey | int |
| lSalesTaxKey | int |
| sClientName1 | nvarchar(40) |
| sClientName2 | nvarchar(40) |
| sMailAddr1 | nvarchar(40) |
| sMailAddr2 | nvarchar(40) |
| sMailCity | nvarchar(30) |
| sMailState | nvarchar(10) |
| sMailZip | nvarchar(15) |
| sPhoneVoice | nvarchar(13) |
| sPhoneFAX | nvarchar(13) |
| dblDiscountPct | float |
| mComments | text |
| dtClientSince | datetime |
| sBillAddr1 | nvarchar(40) |
| sBillAddr2 | nvarchar(40) |
| sBillCity | nvarchar(30) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sShipAddr1 | nvarchar(40) |
| sShipAddr2 | nvarchar(40) |
| sShipCity | nvarchar(30) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| sClntTerms | nvarchar(35) |
| nPeachTreeDeptCtr | int |
| sPeachTreeCustID | nvarchar(20) |
| dtLastExport | datetime |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sBadDebtRisk | nvarchar(1) |
| sPORequired | nvarchar(1) |
| sOpenCreditMemo | nvarchar(1) |
| sUserFld1 | nvarchar(20) |
| sUserFld2 | nvarchar(20) |
| sUserFld3 | nvarchar(20) |
| sUserFld4 | nvarchar(20) |
| sBoardOfAdvisors | nvarchar(1) |
| sReferenceNum | nvarchar(15) |
| sReferenceNum2 | nvarchar(15) |
| sReferenceNum3 | nvarchar(15) |
| bUseAdjustmentPct | bit |
| dblAdjustmentPct | float |
| bCustomerVAOB10 | bit |
| bCustomerMemHermOB10 | bit |
| sBadDebtComment | nvarchar(MAX) |
| lDistributorKey | int |
| bBlindPS3 | bit |
| bRequisitionTotalsOnly | bit |
| sBillTo | nvarchar(50) |
| bBlindTotalsOnFinal | bit |
| bActive | bit |
| bEmailNewRepairs | bit |
| sBillCountry | nvarchar(50) |
| sMailCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| sGPID | nvarchar(15) |
| bNationalAccount | bit |
| bSkipTracking | bit |
| bNeverHold | bit |
| nPortalMonths | int |
| bShowAssociatedContractOnPortal | bit |
| lClientKeyLink | int |
| sGPIDSouth | nvarchar(50) |
| bSkipGPOCheck | bit |
| bCogentix | bit |

---

## tblDepartment
7,702 rows | PK: lDepartmentKey

| Column | Type |
|--------|------|
| lDepartmentKey **PK** | int |
| lSessionID | int |
| lClientKey | int |
| lSalesRepKey | int |
| lPricingCategoryKey | int |
| lTerritoryKey | int |
| lSalesTaxKey | int |
| lProfileCleaningKey | int |
| lProfileGermicideKey | int |
| lProfileManufacturerKey | int |
| lProfileCompetitionKey | int |
| lReportingGroupKey | int |
| sDepartmentName | nvarchar(40) |
| sShipName1 | nvarchar(40) |
| sShipName2 | nvarchar(40) |
| sShipAddr1 | nvarchar(40) |
| sShipAddr2 | nvarchar(40) |
| sShipCity | nvarchar(30) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| sBillName1 | varchar(40) |
| sBillName2 | varchar(40) |
| sBillAddr1 | nvarchar(40) |
| sBillAddr2 | nvarchar(40) |
| sBillCity | nvarchar(30) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sMailAddr1 | nvarchar(40) |
| sMailAddr2 | nvarchar(40) |
| sMailCity | nvarchar(30) |
| sMailState | nvarchar(10) |
| sMailZip | nvarchar(15) |
| sPeachTreeCustID | nvarchar(20) |
| sContactLast | nvarchar(50) |
| sContactFirst | nvarchar(50) |
| sContactPhoneVoice | nvarchar(13) |
| sContactPhoneFAX | nvarchar(13) |
| sContactEMail | nvarchar(100) |
| sClientID | nvarchar(5) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| dblShippingAmt | float |
| sDeptType | nvarchar(1) |
| dtCSTranDateTime | datetime |
| sCSQuality | nvarchar(1) |
| sCSTurnAround | nvarchar(1) |
| sCSQuickIn | nvarchar(1) |
| sCSEstimate | nvarchar(1) |
| sCSOverAll | nvarchar(1) |
| sDispProductID | nvarchar(1) |
| bCSUseUsAgain | bit |
| bDisplayUAorNWT | bit |
| mCSNotAgain | ntext |
| mAdditionalComments | ntext |
| lCSRepairKey | int |
| lProcedures | int |
| lBedSize | int |
| dtCustomerSince | datetime |
| dtActivatedDate | datetime |
| dtActivityLastDate | datetime |
| bActive | bit |
| bEnforceScopeTypeFiltering | bit |
| sBillEmail | nvarchar(500) |
| lBillType | int |
| sBillEmailName | nvarchar(100) |
| bExportedToPeachtree | bit |
| bDisplayItemDescription | bit |
| sBillCountry | nvarchar(50) |
| sMailCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| mComments | nvarchar(MAX) |
| NetSuiteID | nvarchar(50) |
| bIncludeConsumptionReportWithReq | bit |
| bTaxExempt | bit |
| lSalesTaxKeyBackup | int |
| bCustomerNeedsPickedScheduled | bit |
| sGPID | nvarchar(15) |
| lClientKey_NationalAccount | int |
| lLinkKeyToOtherDB | int |
| lSalesRepKey_CS | int |
| lAvalaraCustomerID | int |
| lAvalaraCustomerID_Sandbox | int |
| lServiceLocationKey | int |
| bPaysByCreditCard | bit |
| bIsLocked | bit |
| sGPIDSouth | nvarchar(50) |
| bTrackingNumberRequired | bit |
| sOptimalServiceLocation | nvarchar(50) |
| lShippingCarrierKey | int |
| bDVMSS | bit |
| lVanServicePricingListKey | int |
| bOnsiteService | bit |
| nOnsiteServiceCapitatedCost | decimal(10,2) |

---

## tblScope
97,736 rows | No PK (clustered unique on lScopeKey)

| Column | Type |
|--------|------|
| lScopeKey | int |
| lSessionID | int |
| lScopeTypeKey | int |
| lDepartmentKey | int |
| lContractKey | int |
| lTerritoryKey | int |
| lVendorKey | int |
| sSerialNumber | nvarchar(50) |
| sBillAddr1 | nvarchar(40) |
| sBillAddr2 | nvarchar(40) |
| sBillCity | nvarchar(30) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sShipName1 | nvarchar(40) |
| sShipName2 | nvarchar(40) |
| sShipAddr1 | nvarchar(40) |
| sShipAddr2 | nvarchar(40) |
| sShipCity | nvarchar(30) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| sRigidOrFlexible | nvarchar(1) |
| sUPC | nvarchar(20) |
| sLoanerRackPosition | varchar(10) |
| sClientID | nvarchar(5) |
| sScopeID | nvarchar(5) |
| sTypeID | nvarchar(5) |
| mComments | ntext |
| sEmplID | nvarchar(3) |
| sRepID | nvarchar(4) |
| sZeroValues | nvarchar(8) |
| sContractNumber | nvarchar(8) |
| sScopeIsDead | nvarchar(1) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateSessionKey | int |
| lCreateUser | int |
| lISOIncidentRepair | int |
| bOnSiteLoaner | bit |
| mCommentsDisIns | ntext |
| sBillCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| lAcquisitionSupplierPOTranKey | int |
| lDepartmentKey_PendingLoaner | int |
| sWorkOrderNumber_PendingLoaner | nvarchar(50) |
| sLocation | nvarchar(50) |

---

## tblScopeType
10,725 rows | No PK (clustered unique on lScopeTypeKey)

| Column | Type |
|--------|------|
| lScopeTypeKey | int |
| lSessionID | int |
| lScopeTypeCatKey | int |
| sScopeTypeDesc | nvarchar(200) |
| sAngLeft | nvarchar(3) |
| sAngRight | nvarchar(3) |
| sAngUp | nvarchar(3) |
| sAngDown | nvarchar(3) |
| sRigidOrFlexible | nvarchar(1) |
| sInspReqd | nvarchar(1) |
| sTypeID | nvarchar(5) |
| sAppliesAngUpDown | nvarchar(1) |
| sAppliesAngLeftRight | nvarchar(1) |
| sAppliesBrokenFibers | nvarchar(1) |
| nLengthSpec | int |
| nLengthAllowDev | int |
| sLengthSpec | nvarchar(8) |
| sInsertTubeLength | nvarchar(8) |
| sInsertTubeDiameter | nvarchar(8) |
| sForcepChannelSize | nvarchar(8) |
| sFieldOfView | nvarchar(8) |
| sDirectionOfView | nvarchar(8) |
| sDepthOfField | nvarchar(8) |
| bUnableToVerify | bit |
| sUnableToVerifyInits | nvarchar(4) |
| dtUnableToVerifyAsOf | datetime |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| nEpoxySizeProximal | decimal(10,4) |
| nEpoxySizeDistal | decimal(10,4) |
| lRank | int |
| bActive | bit |
| bDrawing | bit |
| sTubeSystem | nvarchar(50) |
| sLensSystem | nvarchar(50) |
| sDegree | nvarchar(50) |
| sIDBand | nvarchar(50) |
| bAutoclaveable | bit |
| lResolutionGroup | int |
| lResolutionField | int |
| nImageSize | decimal(10,2) |
| lSquint | int |
| lMarkerPlate | int |
| sEyeCupMount | nvarchar(50) |
| sNotes | nvarchar(MAX) |
| sDrawingFileName | nvarchar(100) |
| lManufacturerKey | int |
| lVideoImageKey | int |
| lScopeCategoryKey | int |
| mMaxCharge | money |
| sScopeTypeLongDesc | nvarchar(200) |
| DIKey | int |
| sGLAcct | nvarchar(50) |
| bForceOnPortal | bit |
| bSkipPortal | bit |
| sItemCode | nvarchar(50) |
| nContractCost | decimal(10,2) |
| lScopeTypeKeyLink | int |
| bCogentix | bit |

---

## tblContract
961 rows | No PK (clustered unique on lContractKey)

| Column | Type |
|--------|------|
| lContractKey | int |
| lSessionID | int |
| lSalesRepKey | int |
| lPaymentTermsKey | int |
| sContractName1 | nvarchar(100) |
| sContractName2 | nvarchar(100) |
| dtDateEffective | datetime |
| dtDateTermination | datetime |
| nInstallmentsTotal | int |
| nInstallmentsInvoiced | int |
| dblAmtTotal | float |
| dblAmtInvoiced | float |
| sContractBillName1 | nvarchar(100) |
| sContractBillName2 | nvarchar(100) |
| sContractAddr1 | nvarchar(40) |
| sContractAddr2 | nvarchar(40) |
| sContractCity | nvarchar(30) |
| sContractState | nvarchar(10) |
| sContractZip | nvarchar(15) |
| sContractPhoneVoice | nvarchar(13) |
| sContractPhoneFAX | nvarchar(13) |
| sContractNumber | nvarchar(20) |
| sContractID | nvarchar(5) |
| sPurchaseOrder | nvarchar(50) |
| mComments | ntext |
| nCountFlexible | int |
| nCountRigid | int |
| nCountInstrument | int |
| nCountCamera | int |
| nCountAll | int |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sGLAcct | nvarchar(10) |
| lInstallmentTypeID | tinyint |
| lBillDay | tinyint |
| dtNextBillDate | date |
| lClientKey | int |
| sNextInvoiceComment | nvarchar(4000) |
| sBillEmail | nvarchar(500) |
| lBillType | int |
| sBillEmailName | nvarchar(100) |
| lSalesTaxKey | int |
| sContractCountry | nvarchar(50) |
| bFuseContract | bit |
| dtOriginalTerminationDate | datetime |
| bSaveInvoiceComment | bit |
| sContractNameBackup | nvarchar(100) |
| lContractTypeKey | int |
| bServicePlan | bit |
| lServicePlanTermKey | int |
| bTaxExempt | bit |
| sContractShipName1 | nvarchar(100) |
| sContractShipName2 | nvarchar(100) |
| sContractShipAddr1 | nvarchar(100) |
| sContractShipAddr2 | nvarchar(100) |
| sContractShipCity | nvarchar(100) |
| sContractShipState | nvarchar(10) |
| sContractShipZip | nvarchar(15) |
| sContractShipPhone | nvarchar(13) |
| sContractShipFAX | nvarchar(13) |
| bShippingSameAsBilling | bit |
| lContractLengthInMonths | int |
| bShowShippingAddressOnInvoice | bit |
| bSharedRisk | bit |
| nSharedRiskPercentage | decimal(10,4) |
| dtSharedRiskStartDate | date |
| bManualSchedule | bit |
| dtEfficiencyRatingRed | date |
| bCostsPerDepartment | bit |
| lContractKey_Renewed | int |
| bUnlimitedProducts | bit |
| bShowConsumptionOnPortal | bit |
| bPOsPerDepartment | bit |

> **Note:** tblContractTran does not exist. Contract transactions are tracked via tblContractInstallment, tblContractScope, tblContractBillSchedule, and tblContractDepartments.

---

## tblInvoice
199,707 rows | PK: lInvoiceKey

> **Critical:** `dblTranAmount` is always 0 — invoices finalize to `tblGP_InvoiceStaging` then purge. Use `tblGP_InvoiceStaging.TotalAmountDue` for real amounts.

| Column | Type |
|--------|------|
| lInvoiceKey **PK** | int |
| lRepairKey | int |
| lFriendRepairKey | int |
| lInstallmentKey | int |
| lCompanyKey | int |
| lClientKey | int |
| lDepartmentKey | int |
| lScopeKey | int |
| lDistributorKey | int |
| lSalesRepKey | int |
| lContractKey | int |
| lPaymentTermsKey | int |
| lPricingCategoryKey | int |
| lDeliveryMethodKey | int |
| lSalesTaxKey | int |
| sTranNumber | nvarchar(13) |
| sCompanyName1 | nvarchar(40) |
| sCompanyName2 | nvarchar(40) |
| sCompanyAddr1 | nvarchar(40) |
| sCompanyAddr2 | nvarchar(40) |
| sCompanyCity | nvarchar(30) |
| sCompanyState | nvarchar(10) |
| sCompanyZip | nvarchar(15) |
| sCompanyPhoneVoice | nvarchar(13) |
| sCompanyPhoneFAX | nvarchar(13) |
| sBillName1 | nvarchar(100) |
| sBillName2 | nvarchar(100) |
| sBillAddr1 | nvarchar(100) |
| sBillAddr2 | nvarchar(100) |
| sBillCity | nvarchar(100) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sShipName1 | nvarchar(100) |
| sShipName2 | nvarchar(100) |
| sShipAddr1 | nvarchar(100) |
| sShipAddr2 | nvarchar(100) |
| sShipCity | nvarchar(100) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| dtTranDate | datetime |
| sDeliveryDesc | nvarchar(50) |
| sTermsDesc | nvarchar(20) |
| sPurchaseOrder | nvarchar(50) |
| dtAprRecvd | datetime |
| sRepFirst | nvarchar(20) |
| sRepLast | nvarchar(20) |
| sScopeTypeDesc | nvarchar(200) |
| sSerialNumber | nvarchar(50) |
| dtDueDate | datetime |
| dblTranAmount | float |
| dblShippingAmt | float |
| sExported | nvarchar(1) |
| bExportedVAOB10 | bit |
| bExportVAOB10Skip | bit |
| dtDateExportVAOB10 | datetime |
| sQualifyVA | nvarchar(1) |
| sUnderContract | nvarchar(1) |
| sDisplayItemDescription | nvarchar(1) |
| sDisplayDiscountComment | nvarchar(1) |
| sDisplayItemAmount | nvarchar(1) |
| sInvoiceForm | nvarchar(20) |
| sDisplayFooter | nvarchar(1) |
| sPeachTaxCode | nvarchar(8) |
| sJuris1Name | nvarchar(20) |
| dblJuris1Pct | float |
| dblJuris1Amt | float |
| sJuris2Name | nvarchar(20) |
| dblJuris2Pct | float |
| dblJuris2Amt | float |
| sJuris3Name | nvarchar(20) |
| dblJuris3Pct | float |
| dblJuris3Amt | float |
| sDispProductID | nvarchar(1) |
| bExportedMemHermOB10 | bit |
| dtDateExportMemhermOB10 | date |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sBillEmail | nvarchar(500) |
| lBillType | int |
| bIsManual | bit |
| sCommentContract | nvarchar(4000) |
| sPreview | nvarchar(1) |
| sShipTrackingNumber | nvarchar(50) |
| sBillEmailName | nvarchar(100) |
| sDisplayCustomerComplaint | nvarchar(1) |
| sComplaintDesc | nvarchar(300) |
| sBillCountry | nvarchar(50) |
| sCompanyCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| lScopeSaleKey | int |
| SalesTaxFlag | nvarchar(50) |
| bMarkAsPaid | bit |
| bIsVoid | bit |
| dtVoidDate | datetime |
| lUserID_Void | int |
| sTranNumberSuffix | int |
| bFinalized | bit |
| dtGPProcessDate | datetime |
| dtBillMonth | datetime |
| sInvoiceStatus | nvarchar(MAX) |
| dtFollowUp | date |
| CommissionPaid | decimal(10,2) |
| sCoveragePeriod | nvarchar(50) |
| bContractInvoicePerDepartment | bit |
| bAvalaraTransactionCreated | bit |
| lProductSaleKey | int |
| nTurnTime | decimal(10,4) |
| nLeadTime | decimal(10,4) |
| lSiteServiceKey | int |

---

## tblGP_InvoiceStaging
40,062 rows | PK: GPInvoiceStagingID

> **Use this for real invoice amounts**, not tblInvoice.

| Column | Type |
|--------|------|
| GPInvoiceStagingID **PK** | int |
| lInvoiceKey | int |
| sTranNumber | nvarchar(17) |
| dtTranDate | date |
| sBatchNumber | nvarchar(15) |
| GPID_Department | nvarchar(15) |
| TotalAmountDue | decimal(10,2) |
| dblTranAmount | decimal(10,2) |
| dblShippingAmount | decimal(10,2) |
| dblTaxAmount | decimal(10,2) |
| docDescription | nvarchar(30) |
| GPID_SalesRep | nvarchar(15) |
| sPurchaseOrder | nvarchar(50) |
| dtDueDate | date |
| oErrorState | int |
| oErrorString | nvarchar(255) |
| bProcessed | bit |
| sTranNumberNoSuffix | nvarchar(50) |
| GLAccount | nvarchar(50) |
| TaxScheduleID | nvarchar(50) |
| sGPID_Address | nvarchar(15) |
| PaymentTerms | nvarchar(50) |
| dtProcessDate | datetime |
| dtErrorDate | date |
| dtPostedDate | date |
| lUserKey | int |
| dtProcessDateFromWS | datetime |
| lDatabaseKey | int |

---

## tblSupplier
396 rows | No PK (clustered unique on lSupplierKey)

| Column | Type |
|--------|------|
| lSupplierKey | int |
| lSessionID | int |
| bActive | bit |
| sSupplierName1 | nvarchar(200) |
| sSupplierName2 | nvarchar(40) |
| sPeachTreeSupplierID | nvarchar(20) |
| mComments | ntext |
| sShipName1 | nvarchar(40) |
| sShipName2 | nvarchar(40) |
| sShipAddr1 | nvarchar(40) |
| sShipAddr2 | nvarchar(40) |
| sShipCity | nvarchar(30) |
| sShipState | nvarchar(10) |
| sShipZip | nvarchar(15) |
| sBillAddr1 | nvarchar(40) |
| sBillAddr2 | nvarchar(40) |
| sBillCity | nvarchar(30) |
| sBillState | nvarchar(10) |
| sBillZip | nvarchar(15) |
| sMailAddr1 | nvarchar(40) |
| sMailAddr2 | nvarchar(40) |
| sMailCity | nvarchar(30) |
| sMailState | nvarchar(10) |
| sMailZip | nvarchar(15) |
| sContactLast | nvarchar(20) |
| sContactFirst | nvarchar(20) |
| sPhoneVoice | nvarchar(13) |
| sPhoneFAX | nvarchar(13) |
| sContactEMail | nvarchar(100) |
| dblOrderMinimum | float |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| lBillType | int |
| sBillEmail | nvarchar(500) |
| sBillEmailName | nvarchar(100) |
| sBillEmail2 | nvarchar(500) |
| sBillCountry | nvarchar(50) |
| sMailCountry | nvarchar(50) |
| sShipCountry | nvarchar(50) |
| bAcquisitionSupplier | bit |
| sGPID | nvarchar(15) |
| bShowOnDashboard | bit |
| bBlindPOForGP | bit |
| lSupplierKeyLink | int |
| bCreatePartNumbers | bit |
| sPartNumberPrefix | nvarchar(10) |
| bShowVendorSKUOnPO | bit |
| bIncludePartNumberInPODescription | bit |
| sAdditionalPODescription | nvarchar(100) |
| nAdditionalPODescriptionCostPerUnit | decimal(10,2) |
| bUseVendorSKU | bit |
| lSupplierPOTypeKey | int |
| bAllowDuplicatePartNumbers | bit |

---

## tblSalesRep
268 rows | No PK (clustered unique on lSalesRepKey)

| Column | Type |
|--------|------|
| lSalesRepKey | int |
| lSessionID | int |
| lDistributorKey | int |
| sRepLast | nvarchar(20) |
| sRepFirst | nvarchar(20) |
| sRepInits | nvarchar(4) |
| sRepPhoneVoice | nvarchar(13) |
| sRepPhoneFAX | nvarchar(13) |
| sRepEMail | nvarchar(100) |
| sRepAddr1 | nvarchar(40) |
| sRepAddr2 | nvarchar(40) |
| sRepCity | nvarchar(30) |
| sRepState | nvarchar(10) |
| sRepZip | nvarchar(15) |
| dblDefltCommPctIn | float |
| dblDefltCommPctOut | float |
| sMemberID | nvarchar(4) |
| sRepID | nvarchar(4) |
| sPeachTreeRepID | nvarchar(20) |
| dtLastExport | datetime |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sActiveFlag | nvarchar(1) |
| sWeeklyReports | nvarchar(1) |
| sRepCountry | nvarchar(50) |
| sGPID | nvarchar(15) |
| bTrackingNumberRequired | bit |
| sADPPositionID | nvarchar(50) |
| bDailySalesRepEmail | bit |
| bSalesPerAccountReport_AllInvoicesForDepartment | bit |
| lSalesRepKeyLink | int |

---

## tblTechnicians
213 rows | No PK (clustered unique on lTechnicianKey)

| Column | Type |
|--------|------|
| lTechnicianKey | int |
| sTechInits | nvarchar(4) |
| sTechName | nvarchar(30) |
| TSEMEMPLID | nvarchar(3) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| sTechLevel | nvarchar(1) |
| dblHourlyRate | float |
| lCreateSessionKey | int |
| bIsActive | bit |
| lJobTypeKey | int |
| lUserKey | int |
| sADPPositionID | nvarchar(50) |
| sEmailAddress | nvarchar(100) |
| lTechnicianKeyLink | int |
| bOnsiteServiceTech | bit |
| sOnsiteServiceTruckNumber | nvarchar(50) |
| sCalendarColor | nvarchar(50) |
| lServiceLocationKey | int |
| sForeColor | bit |

---

## tblLoanerTran
13,558 rows | No PK (clustered unique on lLoanerTranKey)

> **Note:** No standalone tblLoaner table. Loaners tracked via tblLoanerTran + `bOnSiteLoaner` on tblScope + `bLoanerRequested`/`lScopeKey_Loaner` on tblRepair.

| Column | Type |
|--------|------|
| lLoanerTranKey | int |
| lDepartmentKey | int |
| lScopeKey | int |
| lRepairKey | int |
| lSalesRepKey | int |
| lDeliveryMethodKey | int |
| lCompanyKey | int |
| sDateOut | nvarchar(14) |
| sDateIn | nvarchar(14) |
| lSessionID | int |
| lSessionKey | int |
| sRepairClosed | nvarchar(1) |
| sPurchaseOrder | nvarchar(50) |
| dtLastUpdate | datetime |
| lLastUpdateUser | int |
| dtCreateDate | datetime |
| lCreateUser | int |
| lCreateSessionKey | int |
| sTrackingNumber | nvarchar(50) |
| lContractKey | int |
| sDateInBackup | nvarchar(50) |

---

## tblSiteServices
16 rows | PK: lSiteServiceKey

| Column | Type |
|--------|------|
| lSiteServiceKey **PK** | int |
| lClientKey | int |
| lDepartmentKey | int |
| lTechnicianKey | int |
| lSalesRepKey | int |
| lVanServicePricingListKey | int |
| sPurchaseOrder | nvarchar(50) |
| sWorkOrderNumber | nvarchar(50) |
| dtOnsiteDate | date |
| dtDateSubmitted | date |
| sTruckNumber | nvarchar(50) |
| nCapitatedCost | decimal(10,2) |
| lTrayCount | int |
| lTotalInstruments | int |
| lRepairCount | int |
| lSendToTSICount | int |
| lBeyondEconomicalRepair | int |
| nTotalCostPreCap | decimal(10,2) |
| nInvoiceAmount | decimal(10,2) |
| sAddressLine1 | nvarchar(200) |
| sAddressLine2 | nvarchar(200) |
| sCity | nvarchar(200) |
| sState | nvarchar(10) |
| sZipCode | nvarchar(50) |
| lServiceLocationKey | int |
| dtInvoiceDate | date |
| dtVoidDate | date |
| lVoidUserKey | int |
| nTaxAmount | decimal(10,2) |
| sBillName1 | nvarchar(200) |
| sBillName2 | nvarchar(200) |
| sBillAddressLine1 | nvarchar(200) |
| sBillAddressLine2 | nvarchar(200) |
| sBillCity | nvarchar(200) |
| sBillState | nvarchar(50) |
| sBillZipCode | nvarchar(50) |
| sBillCountry | nvarchar(50) |
| lBillType | int |
| sBillEmail | nvarchar(500) |
| sBillEmailName | nvarchar(200) |
| sShipName1 | nvarchar(200) |
| sShipName2 | nvarchar(200) |
| sShipCountry | nvarchar(500) |
| sNotes | nvarchar(MAX) |
| dtStartDate | datetime |
| dtEndDate | datetime |
| lInspected | int |

---

## tblSiteServicesCalendar
115 rows | PK: lCalendarEventKey

| Column | Type |
|--------|------|
| lCalendarEventKey **PK** | int |
| lClientKey | int |
| lDepartmentKey | int |
| lTechnicianKey | int |
| dtStartDate | datetime |
| dtEndDate | datetime |
| ColorCss | nvarchar(50) |

---

## tblSiteServiceTrays
68 rows | PK: lSiteServiceTrayKey

| Column | Type |
|--------|------|
| lSiteServiceTrayKey **PK** | int |
| lSiteServiceKey | int |
| lTrayNumber | int |
| lInstrumentsCount | int |
| lRepairedCount | int |
| lSentToTSICount | int |
| lBeyondEconomicalRepairCount | int |
| sTrayName | nvarchar(100) |
| lReplacedCount | int |
| lInspected | int |
| lDepartmentSiteServiceTrayNameKey | int |

---

## tblSiteServiceTrayDetails
273 rows | PK: lSiteServiceTrayDetailKey

| Column | Type |
|--------|------|
| lSiteServiceTrayDetailKey **PK** | int |
| lSiteServiceTrayKey | int |
| lVanServiceRepairItemKey | int |
| lQuantity | int |
| nUnitCost | decimal(10,2) |
| nTotalCost | decimal(10,2) |
| lReplacementQuantity | int |
| lSentToTSI | int |
| lBER | int |
| lInspected | int |
| lTotalInstruments | int |

---

## tblSiteServiceTrayInsert
642 rows | No PK

| Column | Type |
|--------|------|
| lUserKey | int |
| lSiteServiceKey | int |
| lVanServiceRepairItemKey | int |
| lQuantity | int |
| lSentToTSI | int |
| lBER | int |
| lReplacementQuantity | int |
| lInspected | int |
| lTotalInstruments | int |

---

## Full Schema Source

Complete schema for all 441 tables: `C:\tmp\legacy-schemas\table-schemas.md` (364KB)
Full extraction manifest: `C:\tmp\legacy-schemas\MANIFEST.md`
