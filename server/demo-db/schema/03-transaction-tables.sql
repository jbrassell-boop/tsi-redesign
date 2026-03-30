-- ═══════════════════════════════════════════════════════
--  03-transaction-tables.sql — Transaction tables (Tier 3)
--  Depend on Tier 2 entity tables
-- ═══════════════════════════════════════════════════════

CREATE TABLE tblContract (
  lContractKey INT IDENTITY(1,1) PRIMARY KEY,
  sContractNumber NVARCHAR(50) NULL,
  sContractName1 NVARCHAR(200) NULL,
  lClientKey INT NULL,
  lContractTypeKey INT NULL,
  lSalesRepKey INT NULL,
  lPaymentTermsKey INT NULL,
  dtDateEffective DATETIME NULL,
  dtDateTermination DATETIME NULL,
  dblAmtTotal FLOAT NULL DEFAULT 0,
  dblAmtInvoiced FLOAT NULL DEFAULT 0,
  nCountFlexible INT NULL DEFAULT 0,
  nCountRigid INT NULL DEFAULT 0,
  nCountCamera INT NULL DEFAULT 0,
  nCountAll INT NULL DEFAULT 0,
  lBillType INT NULL,
  lBillDay INT NULL,
  dtNextBillDate DATETIME NULL,
  sPurchaseOrder NVARCHAR(50) NULL,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblContractDepartments (
  lContractDepartmentKey INT IDENTITY(1,1) PRIMARY KEY,
  lContractKey INT NULL,
  lDepartmentKey INT NULL,
  dtContractDepartmentEffectiveDate DATETIME NULL,
  dtContractDepartmentEndDate DATETIME NULL,
  bNonBillable BIT NULL DEFAULT 0,
  bCalcCostFromScopes BIT NULL DEFAULT 0,
  sPONumber NVARCHAR(50) NULL
);

CREATE TABLE tblContractScope (
  lContractScopeKey INT IDENTITY(1,1) PRIMARY KEY,
  lContractKey INT NULL,
  lScopeKey INT NULL
);

CREATE TABLE tblContractAmendments (
  lContractAmendmentKey INT IDENTITY(1,1) PRIMARY KEY,
  lContractKey INT NULL,
  dtContractAmendmentDate DATETIME NULL,
  lContractAmendmentStatusKey INT NULL,
  nPreviousInvoiceAmount FLOAT NULL,
  nNewInvoiceAmount FLOAT NULL,
  nPreviousContractTotal FLOAT NULL,
  nNewContractTotal FLOAT NULL,
  lRemainingMonths INT NULL,
  nNewRemainingBalance FLOAT NULL,
  dtFirstBillDate DATETIME NULL
);

CREATE TABLE tblRepair (
  lRepairKey INT IDENTITY(1,1) PRIMARY KEY,
  sWorkOrderNumber NVARCHAR(13) NULL,
  dtDateIn DATETIME NULL,
  dtDateOut DATETIME NULL,
  dtShipDate DATETIME NULL,
  dtReqSent DATETIME NULL,
  dtAprRecvd DATETIME NULL,
  dtExpDelDate DATETIME NULL,
  dtExpDelDateTSI DATETIME NULL,
  lRepairStatusID SMALLINT NULL,
  lDepartmentKey INT NULL,
  lScopeKey INT NULL,
  lTechnicianKey INT NULL,
  lSalesRepKey INT NULL,
  lContractKey INT NULL,
  lDeliveryMethodKey INT NULL,
  lPricingCategoryKey INT NULL,
  lPaymentTermsKey INT NULL,
  lRepairReasonKey INT NULL,
  lServiceLocationKey INT NULL,
  sComplaintDesc NVARCHAR(300) NULL,
  sPurchaseOrder NVARCHAR(50) NULL,
  sRackPosition NVARCHAR(20) NULL,
  sApprName NVARCHAR(100) NULL,
  dblAmtRepair FLOAT NULL DEFAULT 0,
  dblAmtShipping FLOAT NULL DEFAULT 0,
  dblAmtCommission FLOAT NULL DEFAULT 0,
  dblAmtCostLabor FLOAT NULL DEFAULT 0,
  dblAmtCostMaterial FLOAT NULL DEFAULT 0,
  dblMarginPctActual FLOAT NULL,
  dblMarginPctDefault FLOAT NULL,
  dblAcuityRating FLOAT NULL,
  bLoanerRequested BIT NULL DEFAULT 0,
  bOutsourced BIT NULL DEFAULT 0,
  bHotList BIT NULL DEFAULT 0,
  bReplaced BIT NULL DEFAULT 0,
  sRepairClosed NVARCHAR(1) NULL,
  sScopeIsDead NVARCHAR(1) NULL,
  sShipTrackingNumber NVARCHAR(50) NULL,
  sShipTrackingNumberFedEx NVARCHAR(50) NULL,
  sShipTrackingNumberVendor NVARCHAR(50) NULL,
  sShipTrackingNumberIn NVARCHAR(50) NULL,
  dtDeliveryDate DATETIME NULL,
  dtDeliveryDateGuaranteed DATETIME NULL,
  dtCarrierDeliveryDateGuaranteed DATETIME NULL,
  sAngInUp NVARCHAR(10) NULL,
  sAngInDown NVARCHAR(10) NULL,
  sAngInRight NVARCHAR(10) NULL,
  sAngInLeft NVARCHAR(10) NULL,
  sAngOutUp NVARCHAR(10) NULL,
  sAngOutDown NVARCHAR(10) NULL,
  sAngOutRight NVARCHAR(10) NULL,
  sAngOutLeft NVARCHAR(10) NULL,
  sBrokenFibersIn NVARCHAR(20) NULL,
  sBrokenFibersOut NVARCHAR(20) NULL,
  sInsFinalPF NVARCHAR(1) NULL,
  sInsScopeIsUsableYN NVARCHAR(1) NULL,
  sInsScopeIsRepairableYN NVARCHAR(1) NULL,
  sISOComplaint NVARCHAR(1) NULL,
  sISONonConformance NVARCHAR(1) NULL,
  mComments NVARCHAR(MAX) NULL,
  mCommentsISO NVARCHAR(MAX) NULL,
  mCommentsDisIns NVARCHAR(MAX) NULL,
  mCommentsHidden NVARCHAR(MAX) NULL,
  mCommentsRework NVARCHAR(MAX) NULL,
  lAcquisitionSupplierPOTranKey INT NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblRepairItemTran (
  lRepairItemTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL,
  lRepairItemKey INT NULL,
  lTechnicianKey INT NULL,
  lTechnician2Key INT NULL,
  sApproved NVARCHAR(1) NULL DEFAULT 'N',
  dblRepairPrice FLOAT NULL DEFAULT 0,
  dblRepairPriceBase FLOAT NULL DEFAULT 0,
  sComments NVARCHAR(80) NULL,
  sTransmitted NVARCHAR(1) NULL,
  sFixType NVARCHAR(20) NULL,
  sProblemID NVARCHAR(20) NULL,
  sTranID NVARCHAR(20) NULL,
  sInHsID NVARCHAR(20) NULL,
  sInitials NVARCHAR(10) NULL,
  sPrimaryRepair NVARCHAR(1) NULL,
  sUAorNWT NVARCHAR(10) NULL,
  lQuantity INT NULL DEFAULT 1
);

CREATE TABLE tblStatusTran (
  lStatusTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL,
  lStatusKey INT NULL,
  sStatusDesc NVARCHAR(200) NULL,
  dtCompleteDate DATETIME NULL,
  dtCreateDate DATETIME NULL,
  mTranComments NVARCHAR(MAX) NULL,
  lUserKey INT NULL
);

CREATE TABLE tblInvoice (
  lInvoiceKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL,
  lClientKey INT NULL,
  lDepartmentKey INT NULL,
  lSalesRepKey INT NULL,
  lContractKey INT NULL,
  sTranNumber NVARCHAR(50) NULL
);

CREATE TABLE tblGP_InvoiceStaging (
  GPInvoiceStagingID INT IDENTITY(1,1) PRIMARY KEY,
  lInvoiceKey INT NULL,
  sTranNumber NVARCHAR(50) NULL,
  dtTranDate DATETIME NULL,
  TotalAmountDue FLOAT NULL DEFAULT 0,
  dblTranAmount FLOAT NULL DEFAULT 0,
  dblShippingAmount FLOAT NULL DEFAULT 0,
  dblTaxAmount FLOAT NULL DEFAULT 0,
  docDescription NVARCHAR(200) NULL,
  sPurchaseOrder NVARCHAR(50) NULL,
  dtDueDate DATETIME NULL,
  bProcessed BIT NULL DEFAULT 0,
  dtPostedDate DATETIME NULL,
  sBatchNumber NVARCHAR(50) NULL,
  lDatabaseKey INT NULL,
  GLAccount NVARCHAR(50) NULL,
  PaymentTerms NVARCHAR(50) NULL
);

CREATE TABLE tblLoanerTran (
  lLoanerTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lDepartmentKey INT NULL,
  lScopeKey INT NULL,
  lRepairKey INT NULL,
  lSalesRepKey INT NULL,
  lDeliveryMethodKey INT NULL,
  sDateOut NVARCHAR(20) NULL,
  sDateIn NVARCHAR(20) NULL,
  sPurchaseOrder NVARCHAR(50) NULL,
  sRepairClosed NVARCHAR(1) NULL,
  lContractKey INT NULL,
  sTrackingNumber NVARCHAR(50) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblSupplierPO (
  lSupplierPOKey INT IDENTITY(1,1) PRIMARY KEY,
  lSupplierKey INT NULL,
  sSupplierPONumber NVARCHAR(50) NULL,
  dtDateOfPO DATETIME NULL,
  dblPOTotal FLOAT NULL DEFAULT 0,
  dblOrderMinimum FLOAT NULL DEFAULT 0,
  bCancelled BIT NULL DEFAULT 0,
  bGenerated BIT NULL DEFAULT 0,
  lSupplierPOTypeKey INT NULL,
  sEmailAddress NVARCHAR(200) NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblSupplierPOTran (
  lSupplierPOTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lSupplierPOKey INT NULL,
  lSupplierSizesKey INT NULL,
  dblUnitCost FLOAT NULL DEFAULT 0,
  nOrderQuantity INT NULL DEFAULT 0,
  nReceivedQuantity INT NULL DEFAULT 0,
  dblItemCost FLOAT NULL DEFAULT 0,
  bActive BIT NULL DEFAULT 1,
  dtEstimatedDeliveryDate DATETIME NULL,
  bIntegratedWithGP BIT NULL DEFAULT 0,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblSupplierSizes (
  lSupplierSizesKey INT IDENTITY(1,1) PRIMARY KEY,
  lSupplierKey INT NULL,
  lInventorySizeKey INT NULL,
  sSupplierPartNo NVARCHAR(50) NULL,
  dblUnitCost FLOAT NULL DEFAULT 0,
  bActive BIT NULL DEFAULT 1
);

CREATE TABLE tblInventoryTran (
  lInventoryTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lInventorySizeKey INT NULL,
  nQuantity INT NULL DEFAULT 0,
  sTranType NVARCHAR(20) NULL,
  sComments NVARCHAR(200) NULL,
  lUserKey INT NULL,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblDepartmentScopeTypes (
  lDepartmentScopeTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  lDepartmentKey INT NULL,
  lScopeTypeKey INT NULL,
  sGLAcct NVARCHAR(50) NULL
);

CREATE TABLE tblPricingDetail (
  lPricingDetailKey INT IDENTITY(1,1) PRIMARY KEY,
  lPricingCategoryKey INT NULL,
  lRepairItemKey INT NULL,
  dblRepairPrice FLOAT NULL DEFAULT 0,
  sProblemID NVARCHAR(20) NULL,
  dtLastUpdate DATETIME NULL,
  dtCreateDate DATETIME NULL
);
