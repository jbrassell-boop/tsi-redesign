-- ═══════════════════════════════════════════════════════
--  01-lookup-tables.sql — Reference/lookup tables (Tier 1)
--  No foreign keys — seed these first
-- ═══════════════════════════════════════════════════════

CREATE TABLE tblServiceLocations (
  lServiceLocationKey INT IDENTITY(1,1) PRIMARY KEY,
  sServiceLocation NVARCHAR(100) NULL,
  sTransNumberPrefix NVARCHAR(10) NULL,
  bUsed BIT NULL DEFAULT 1
);

CREATE TABLE tblRepairStatuses (
  lRepairStatusID SMALLINT PRIMARY KEY,
  sRepairStatus NVARCHAR(100) NULL,
  lRepairStatusSortOrder INT NULL,
  bIsReadOnly BIT NULL DEFAULT 0,
  AlertHours INT NULL,
  sAlertType NVARCHAR(50) NULL
);

CREATE TABLE tblRepairLevels (
  lRepairLevelKey INT IDENTITY(1,1) PRIMARY KEY,
  sRepairLevel NVARCHAR(50) NULL,
  lDeliveryFromDateInDays INT NULL
);

CREATE TABLE tblDeliveryMethod (
  lDeliveryMethodKey INT IDENTITY(1,1) PRIMARY KEY,
  sDeliveryDesc NVARCHAR(100) NULL,
  dblAmtShipping FLOAT NULL DEFAULT 0,
  nDaysRequired INT NULL,
  sShipID NVARCHAR(50) NULL,
  sDefaultYN NVARCHAR(1) NULL
);

CREATE TABLE tblRepairReasons (
  lRepairReasonKey INT IDENTITY(1,1) PRIMARY KEY,
  sRepairReason NVARCHAR(200) NULL,
  bActive BIT NULL DEFAULT 1,
  lRepairReasonCategoryKey INT NULL
);

CREATE TABLE tblPaymentTerms (
  lPaymentTermsKey INT IDENTITY(1,1) PRIMARY KEY,
  sTermsDesc NVARCHAR(100) NULL,
  nIncrementDays INT NULL,
  sDefaultYN NVARCHAR(1) NULL
);

CREATE TABLE tblPricingCategory (
  lPricingCategoryKey INT IDENTITY(1,1) PRIMARY KEY,
  sPricingDescription NVARCHAR(100) NULL,
  bActive BIT NULL DEFAULT 1,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblManufacturers (
  lManufacturerKey INT IDENTITY(1,1) PRIMARY KEY,
  sManufacturer NVARCHAR(100) NULL
);

CREATE TABLE tblScopeTypeCategories (
  lScopeTypeCategoryKey INT IDENTITY(1,1) PRIMARY KEY,
  sScopeTypeCategory NVARCHAR(100) NULL
);

CREATE TABLE tblContractTypes (
  lContractTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sContractType NVARCHAR(100) NULL
);

CREATE TABLE tblContractAmendmentStatuses (
  lContractAmendmentStatusKey INT IDENTITY(1,1) PRIMARY KEY,
  sContractAmendmentStatus NVARCHAR(100) NULL
);

CREATE TABLE tblDistributor (
  lDistributorKey INT IDENTITY(1,1) PRIMARY KEY,
  sDistName1 NVARCHAR(200) NULL,
  bActive BIT NULL DEFAULT 1
);

CREATE TABLE tblFlagTypes (
  lFlagTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sFlagType NVARCHAR(100) NULL,
  bMultipleInstrumentTypes BIT NULL DEFAULT 0
);

CREATE TABLE tblSupplierPOTypes (
  lSupplierPOTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sSupplierPOType NVARCHAR(100) NULL
);

CREATE TABLE tblDocumentCategory (
  lDocumentCategoryKey INT IDENTITY(1,1) PRIMARY KEY,
  sDocumentCategory NVARCHAR(100) NULL
);

CREATE TABLE tblDocumentCategoryType (
  lDocumentCategoryTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  lDocumentCategoryKey INT NULL,
  sDocumentCategoryType NVARCHAR(100) NULL
);

CREATE TABLE tblEmailTypes (
  lEmailTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sEmailType NVARCHAR(100) NULL,
  bShowOnDash BIT NULL DEFAULT 0,
  bAllowModify BIT NULL DEFAULT 0
);

CREATE TABLE tblTaskStatuses (
  TaskStatusKey INT IDENTITY(1,1) PRIMARY KEY,
  TaskStatus NVARCHAR(100) NULL
);

CREATE TABLE tblTaskTypes (
  lTaskTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sTaskType NVARCHAR(100) NULL
);

CREATE TABLE tblTaskPriorities (
  lTaskPriorityKey INT IDENTITY(1,1) PRIMARY KEY,
  sTaskPriority NVARCHAR(100) NULL
);

-- Status workflow table (distinct from tblRepairStatuses)
CREATE TABLE tblStatus (
  lStatusKey INT IDENTITY(1,1) PRIMARY KEY,
  sStatusDesc NVARCHAR(100) NULL,
  lSortOrder INT NULL
);

-- System codes for credit limits (backing for vwSysCodesCreditLimit)
CREATE TABLE tblSystemCodes (
  lSystemCodesKey INT IDENTITY(1,1) PRIMARY KEY,
  lSystemCodesHdrKey INT NULL,
  sGroupName NVARCHAR(100) NULL,
  sHeaderText NVARCHAR(100) NULL,
  sItemText NVARCHAR(100) NULL,
  nOrdinal INT NULL
);
