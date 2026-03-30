-- ═══════════════════════════════════════════════════════
--  04-support-tables.sql — Support/peripheral tables (Tier 4)
-- ═══════════════════════════════════════════════════════

CREATE TABLE tblFlags (
  lFlagKey INT IDENTITY(1,1) PRIMARY KEY,
  lFlagTypeKey INT NULL,
  lOwnerKey INT NULL,
  sFlag NVARCHAR(500) NULL,
  bVisibleOnDI BIT NULL DEFAULT 0,
  bVisibleOnBlank BIT NULL DEFAULT 0
);

CREATE TABLE tblTasks (
  lTaskKey INT IDENTITY(1,1) PRIMARY KEY,
  lTaskTypeKey INT NULL,
  lTaskStatusKey INT NULL,
  lTaskPriorityKey INT NULL,
  lOwnerKey INT NULL,
  lAssignedToUserKey INT NULL,
  sTaskDescription NVARCHAR(500) NULL,
  dtDueDate DATETIME NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL,
  lCreatedByUserKey INT NULL
);

CREATE TABLE tblTaskStatusHistory (
  lTaskStatusHistoryKey INT IDENTITY(1,1) PRIMARY KEY,
  lTaskKey INT NULL,
  dtTaskStatusDate DATETIME NULL,
  lTaskStatusKey INT NULL,
  lUserKey INT NULL
);

CREATE TABLE tblDocument (
  lDocumentKey INT IDENTITY(1,1) PRIMARY KEY,
  lDocumentCategoryTypeKey INT NULL,
  lOwnerKey INT NULL,
  sDocumentName NVARCHAR(200) NULL,
  sDocumentFileName NVARCHAR(200) NULL,
  dtDocumentDate DATETIME NULL,
  lDocTypeCount INT NULL DEFAULT 0
);

CREATE TABLE tblEmails (
  lEmailKey INT IDENTITY(1,1) PRIMARY KEY,
  lEmailTypeKey INT NULL,
  lOwnerKey INT NULL,
  sFrom NVARCHAR(200) NULL,
  sTo NVARCHAR(500) NULL,
  sCC NVARCHAR(500) NULL,
  sBCC NVARCHAR(500) NULL,
  sSubject NVARCHAR(500) NULL,
  sBody NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL,
  dtSentDate DATETIME NULL,
  bIgnore BIT NULL DEFAULT 0,
  bIsBodyHTML BIT NULL DEFAULT 0
);

CREATE TABLE tblEmailAttachments (
  lEmailAttachmentKey INT IDENTITY(1,1) PRIMARY KEY,
  lEmailKey INT NULL,
  sAttachmentFile NVARCHAR(500) NULL
);

CREATE TABLE tblISOComplaint (
  lISOComplaintKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL,
  dtDateReceived DATETIME NULL,
  mComplaint NVARCHAR(MAX) NULL,
  lRecvdByUserKey INT NULL,
  nRecvdByMethod INT NULL,
  lResponsibleMgrUserKey INT NULL,
  dtDateAssigned DATETIME NULL,
  dtDateResponseDue DATETIME NULL,
  dtEvalDate DATETIME NULL,
  lEvalUserKey INT NULL,
  dtFnlDispDate DATETIME NULL,
  lFnlDispQAUserKey INT NULL,
  sISOComplaint NVARCHAR(1) NULL,
  sISONonConformance NVARCHAR(1) NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblRepairInventory (
  lRepairInventoryKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairItemTranKey INT NULL,
  lScopeTypeRepairItemInventoryKey INT NULL
);

CREATE TABLE tblRepairDefectTracking (
  lRepairDefectTrackingKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL
);

CREATE TABLE tblRepairRevenueAndExpenses (
  lRepairRevenueAndExpensesKey INT IDENTITY(1,1) PRIMARY KEY,
  lRepairKey INT NULL,
  lRepairLevelKey INT NULL
);

CREATE TABLE tblPendingContract (
  lPendingContractKey INT IDENTITY(1,1) PRIMARY KEY,
  sPendingContractName1 NVARCHAR(200) NULL,
  sStatus NVARCHAR(50) NULL,
  lTermMonths INT NULL,
  dtCreationDate DATETIME NULL,
  lClientKey INT NULL,
  lContractTypeKey INT NULL,
  lSalesRepKey INT NULL,
  lPendingContractAgreementTemplateKey INT NULL,
  sPendingContractBillName1 NVARCHAR(200) NULL,
  sPendingContractBillName2 NVARCHAR(200) NULL,
  sPendingContractAddr1 NVARCHAR(200) NULL,
  sPendingContractAddr2 NVARCHAR(200) NULL,
  sPendingContractCity NVARCHAR(100) NULL,
  sPendingContractState NVARCHAR(50) NULL,
  sPendingContractZip NVARCHAR(20) NULL,
  sPendingContractPhoneVoice NVARCHAR(30) NULL,
  Delete_Datetime DATETIME NULL
);

CREATE TABLE tblPendingContractScope (
  lPendingContractScopeKey INT IDENTITY(1,1) PRIMARY KEY,
  lPendingContractKey INT NULL,
  lScopeKey INT NULL,
  lScopeTypeKey INT NULL,
  nCost FLOAT NULL DEFAULT 0,
  nUnitCost FLOAT NULL DEFAULT 0,
  lQuantity INT NULL DEFAULT 1,
  lClientKey INT NULL,
  lDepartmentKey INT NULL
);

CREATE TABLE tblGPOs (
  lSystemCodesKey INT IDENTITY(1,1) PRIMARY KEY,
  ContractIDNumber NVARCHAR(50) NULL,
  dtStartDate DATETIME NULL,
  dtEndDate DATETIME NULL,
  RebatePercentage FLOAT NULL,
  sBillingFrequency NVARCHAR(50) NULL,
  bInactive BIT NULL DEFAULT 0
);

CREATE TABLE tblDepartmentSubGroups (
  lDepartmentKey INT NOT NULL,
  lSubGroupKey INT NOT NULL
);

CREATE TABLE tblSubGroups (
  llSubGroupKey INT IDENTITY(1,1) PRIMARY KEY,
  sSubGroup NVARCHAR(100) NULL
);

CREATE TABLE tblProductSales (
  lProductSaleKey INT IDENTITY(1,1) PRIMARY KEY,
  lClientKey INT NULL,
  lDepartmentKey INT NULL,
  lSalesRepKey INT NULL,
  sInvoiceNumber NVARCHAR(50) NULL,
  dtOrderDate DATETIME NULL,
  dtInvoiceDate DATETIME NULL,
  nTotalAmount FLOAT NULL DEFAULT 0,
  nQuoteAmount FLOAT NULL DEFAULT 0,
  nShippingAmount FLOAT NULL DEFAULT 0,
  nTaxAmount FLOAT NULL DEFAULT 0,
  sPurchaseOrder NVARCHAR(50) NULL,
  dtCanceledDate DATETIME NULL,
  dtApprovalDate DATETIME NULL,
  sNote NVARCHAR(MAX) NULL
);

CREATE TABLE tblProductSalesInventory (
  lProductSaleInventoryKey INT IDENTITY(1,1) PRIMARY KEY,
  lProductSaleKey INT NULL,
  lInventorySizeKey INT NULL,
  lQuantity INT NULL DEFAULT 1,
  nUnitCost FLOAT NULL DEFAULT 0,
  nTotalCost FLOAT NULL DEFAULT 0,
  sLotNumber NVARCHAR(50) NULL
);

CREATE TABLE tblProductSaleInvoiceDetail (
  lProductSaleInvoiceDetailKey INT IDENTITY(1,1) PRIMARY KEY,
  lInvoiceKey INT NULL,
  lProductSalesKey INT NULL,
  lInventoryKey INT NULL,
  lInventorySizeKey INT NULL,
  sItemDescription NVARCHAR(200) NULL,
  sSizeDescription NVARCHAR(100) NULL,
  lQty INT NULL DEFAULT 1,
  nUnitCost FLOAT NULL DEFAULT 0,
  nTotalCost FLOAT NULL DEFAULT 0,
  sComment NVARCHAR(200) NULL,
  sLotNumber NVARCHAR(50) NULL
);

CREATE TABLE tblAcquisitionSupplierPO (
  lAcquisitionSupplierPOKey INT IDENTITY(1,1) PRIMARY KEY,
  lSupplierKey INT NULL,
  sSupplierPONumber NVARCHAR(50) NULL,
  dtDateOfPO DATETIME NULL,
  bCancelled BIT NULL DEFAULT 0
);

CREATE TABLE tblAcquisitionSupplierPOTran (
  lAcquisitionSupplierPOTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lAcquisitionSupplierPOKey INT NULL,
  lScopeTypeKey INT NULL,
  sSerialNumber NVARCHAR(50) NULL,
  nScopeCost FLOAT NULL DEFAULT 0,
  dtDateReceived DATETIME NULL,
  mComment NVARCHAR(MAX) NULL
);

CREATE TABLE tblScopeSale (
  lScopeSaleKey INT IDENTITY(1,1) PRIMARY KEY,
  lScopeKey INT NULL
);

CREATE TABLE tblScopeTypeDepartmentMaxCharges (
  lScopeTypeKey INT NOT NULL,
  lDepartmentKey INT NOT NULL,
  nMaxCharge FLOAT NULL DEFAULT 0
);

CREATE TABLE tblScopeTypeContractCostsImport (
  lScopeTypeContractCostsImportKey INT IDENTITY(1,1) PRIMARY KEY,
  lScopeTypeKey INT NULL,
  nContractCost FLOAT NULL DEFAULT 0
);

-- Site services (onsite van)
CREATE TABLE tblSiteServices (
  lSiteServiceKey INT IDENTITY(1,1) PRIMARY KEY,
  lDepartmentKey INT NULL,
  lTechnicianKey INT NULL,
  dtServiceDate DATETIME NULL,
  sStatus NVARCHAR(50) NULL,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblSiteServicesCalendar (
  lSiteServicesCalendarKey INT IDENTITY(1,1) PRIMARY KEY,
  lSiteServiceKey INT NULL,
  dtCalendarDate DATETIME NULL
);

CREATE TABLE tblSiteServiceTrays (
  lSiteServiceTrayKey INT IDENTITY(1,1) PRIMARY KEY,
  lSiteServiceKey INT NULL,
  sTrayName NVARCHAR(100) NULL,
  nInstrumentCount INT NULL DEFAULT 0
);

-- ── New tables for missing route support ──

-- Task Loaners (DashBoardTaskLoaner module)
CREATE TABLE tblTaskLoaner (
  lTaskLoanerKey INT IDENTITY(1,1) PRIMARY KEY,
  sTaskNumber NVARCHAR(50) NULL,
  lScopeTypeKey INT NULL,
  lQuantity INT NULL DEFAULT 1,
  sStatus NVARCHAR(50) NULL DEFAULT 'Requested',
  sLoanerTrackingNumber NVARCHAR(50) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

-- Pending Arrivals (expected incoming scopes)
CREATE TABLE tblPendingArrival (
  lPendingArrivalKey INT IDENTITY(1,1) PRIMARY KEY,
  lScopeTypeKey INT NULL,
  lDepartmentKey INT NULL,
  lServiceLocationKey INT NULL,
  sSerialNumber NVARCHAR(50) NULL,
  sStatus NVARCHAR(50) NULL DEFAULT 'pending',
  sPurchaseOrder NVARCHAR(50) NULL,
  dtExpectedDate DATETIME NULL,
  dtReceivedDate DATETIME NULL,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL
);

-- Development Todo List (internal dev tracker)
CREATE TABLE tblDevelopmentToDo (
  lToDoID INT IDENTITY(1,1) PRIMARY KEY,
  sTitle NVARCHAR(200) NULL,
  sDescription NVARCHAR(MAX) NULL,
  lPriority INT NULL DEFAULT 2,
  lStatusKey INT NULL DEFAULT 1,
  sAssignedTo NVARCHAR(100) NULL,
  dtDueDate DATETIME NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

-- Todo Status lookup
CREATE TABLE tblTodoStatuses (
  lTodoStatusKey INT IDENTITY(1,1) PRIMARY KEY,
  sTodoStatus NVARCHAR(50) NULL
);

-- Todo Priority lookup
CREATE TABLE tblTodoPriorities (
  lTodoPriorityKey INT IDENTITY(1,1) PRIMARY KEY,
  sTodoPriority NVARCHAR(50) NULL
);
