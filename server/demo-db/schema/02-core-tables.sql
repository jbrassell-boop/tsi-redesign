-- ═══════════════════════════════════════════════════════
--  02-core-tables.sql — Core entity tables (Tier 2)
--  Depend on Tier 1 lookups
-- ═══════════════════════════════════════════════════════

CREATE TABLE tblScopeType (
  lScopeTypeKey INT IDENTITY(1,1) PRIMARY KEY,
  sScopeTypeDesc NVARCHAR(200) NULL,
  sRigidOrFlexible NVARCHAR(1) NULL,
  lManufacturerKey INT NULL,
  lScopeTypeCatKey INT NULL,
  sAngUp NVARCHAR(10) NULL,
  sAngDown NVARCHAR(10) NULL,
  sAngLeft NVARCHAR(10) NULL,
  sAngRight NVARCHAR(10) NULL,
  nEpoxySizeProximal FLOAT NULL,
  nEpoxySizeDistal FLOAT NULL,
  bActive BIT NULL DEFAULT 1,
  sTypeID NVARCHAR(50) NULL,
  sNotes NVARCHAR(500) NULL,
  sInsertTubeDiameter NVARCHAR(20) NULL,
  sInsertTubeLength NVARCHAR(20) NULL,
  sForcepChannelSize NVARCHAR(20) NULL,
  bLargeDiameter BIT NULL DEFAULT 0,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblSalesRep (
  lSalesRepKey INT IDENTITY(1,1) PRIMARY KEY,
  sRepFirst NVARCHAR(50) NULL,
  sRepLast NVARCHAR(50) NULL,
  sRepInits NVARCHAR(10) NULL,
  sRepEMail NVARCHAR(200) NULL,
  sActiveFlag NVARCHAR(1) NULL DEFAULT 'Y'
);

CREATE TABLE tblClient (
  lClientKey INT IDENTITY(1,1) PRIMARY KEY,
  sClientName1 NVARCHAR(200) NULL,
  sClientName2 NVARCHAR(200) NULL,
  sMailAddr1 NVARCHAR(200) NULL,
  sMailAddr2 NVARCHAR(200) NULL,
  sMailCity NVARCHAR(100) NULL,
  sMailState NVARCHAR(50) NULL,
  sMailZip NVARCHAR(20) NULL,
  sShipAddr1 NVARCHAR(200) NULL,
  sShipAddr2 NVARCHAR(200) NULL,
  sShipCity NVARCHAR(100) NULL,
  sShipState NVARCHAR(50) NULL,
  sShipZip NVARCHAR(20) NULL,
  sBillAddr1 NVARCHAR(200) NULL,
  sBillAddr2 NVARCHAR(200) NULL,
  sBillCity NVARCHAR(100) NULL,
  sBillState NVARCHAR(50) NULL,
  sBillZip NVARCHAR(20) NULL,
  sPhoneVoice NVARCHAR(30) NULL,
  sPhoneFAX NVARCHAR(30) NULL,
  lSalesRepKey INT NULL,
  lPricingCategoryKey INT NULL,
  lPaymentTermsKey INT NULL,
  lCreditLimitKey INT NULL,
  lDistributorKey INT NULL,
  bActive BIT NULL DEFAULT 1,
  sBadDebtRisk NVARCHAR(1) NULL,
  sBadDebtComment NVARCHAR(500) NULL,
  bSkipTracking BIT NULL DEFAULT 0,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblDepartment (
  lDepartmentKey INT IDENTITY(1,1) PRIMARY KEY,
  sDepartmentName NVARCHAR(200) NULL,
  lClientKey INT NULL,
  lServiceLocationKey INT NULL,
  lSalesRepKey INT NULL,
  lPricingCategoryKey INT NULL,
  sShipName1 NVARCHAR(200) NULL,
  sShipName2 NVARCHAR(200) NULL,
  sShipAddr1 NVARCHAR(200) NULL,
  sShipAddr2 NVARCHAR(200) NULL,
  sShipCity NVARCHAR(100) NULL,
  sShipState NVARCHAR(50) NULL,
  sShipZip NVARCHAR(20) NULL,
  sBillName1 NVARCHAR(200) NULL,
  sBillName2 NVARCHAR(200) NULL,
  sBillAddr1 NVARCHAR(200) NULL,
  sBillAddr2 NVARCHAR(200) NULL,
  sBillCity NVARCHAR(100) NULL,
  sBillState NVARCHAR(50) NULL,
  sBillZip NVARCHAR(20) NULL,
  sContactPhoneVoice NVARCHAR(30) NULL,
  sContactPhoneFAX NVARCHAR(30) NULL,
  sContactEMail NVARCHAR(200) NULL,
  sGPID NVARCHAR(50) NULL,
  bActive BIT NULL DEFAULT 1,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblScope (
  lScopeKey INT IDENTITY(1,1) PRIMARY KEY,
  lScopeTypeKey INT NULL,
  lDepartmentKey INT NULL,
  sSerialNumber NVARCHAR(50) NULL,
  sScopeIsDead NVARCHAR(1) NULL,
  sRigidOrFlexible NVARCHAR(1) NULL,
  sUPC NVARCHAR(50) NULL,
  mComments NVARCHAR(MAX) NULL,
  lAcquisitionSupplierPOTranKey INT NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblTechnicians (
  lTechnicianKey INT IDENTITY(1,1) PRIMARY KEY,
  sTechInits NVARCHAR(10) NULL,
  sTechName NVARCHAR(100) NULL,
  bIsActive BIT NULL DEFAULT 1,
  lServiceLocationKey INT NULL
);

CREATE TABLE tblContacts (
  lContactKey INT IDENTITY(1,1) PRIMARY KEY,
  sContactLast NVARCHAR(100) NULL,
  sContactFirst NVARCHAR(100) NULL,
  sContactPhoneVoice NVARCHAR(30) NULL,
  sContactPhoneFAX NVARCHAR(30) NULL,
  sContactEMail NVARCHAR(200) NULL,
  bActive BIT NULL DEFAULT 1,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblContactTran (
  lContactTranKey INT IDENTITY(1,1) PRIMARY KEY,
  lContactKey INT NULL,
  lClientKey INT NULL,
  lDepartmentKey INT NULL,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblUsers (
  lUserKey INT IDENTITY(1,1) PRIMARY KEY,
  sUserName NVARCHAR(100) NULL,
  sUserFullName NVARCHAR(200) NULL,
  sEmailAddress NVARCHAR(200) NULL,
  bActive BIT NULL DEFAULT 1,
  sSupervisor NVARCHAR(1) NULL,
  sInitials NVARCHAR(10) NULL,
  sISOManager NVARCHAR(1) NULL,
  sMarginApproval NVARCHAR(1) NULL,
  bCustomerService BIT NULL DEFAULT 0,
  bNashvilleAccess BIT NULL DEFAULT 0,
  dtLastLogin DATETIME NULL,
  dtLastDate DATETIME NULL,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblSupplier (
  lSupplierKey INT IDENTITY(1,1) PRIMARY KEY,
  sSupplierName1 NVARCHAR(200) NULL,
  sSupplierName2 NVARCHAR(200) NULL,
  sMailAddr1 NVARCHAR(200) NULL,
  sMailAddr2 NVARCHAR(200) NULL,
  sMailCity NVARCHAR(100) NULL,
  sMailState NVARCHAR(50) NULL,
  sMailZip NVARCHAR(20) NULL,
  sShipAddr1 NVARCHAR(200) NULL,
  sShipAddr2 NVARCHAR(200) NULL,
  sShipCity NVARCHAR(100) NULL,
  sShipState NVARCHAR(50) NULL,
  sShipZip NVARCHAR(20) NULL,
  sBillAddr1 NVARCHAR(200) NULL,
  sBillAddr2 NVARCHAR(200) NULL,
  sBillCity NVARCHAR(100) NULL,
  sBillState NVARCHAR(50) NULL,
  sBillZip NVARCHAR(20) NULL,
  sPhoneVoice NVARCHAR(30) NULL,
  sPhoneFAX NVARCHAR(30) NULL,
  sContactEMail NVARCHAR(200) NULL,
  sBillEmail NVARCHAR(200) NULL,
  bActive BIT NULL DEFAULT 1,
  bAcquisitionSupplier BIT NULL DEFAULT 0,
  dblOrderMinimum FLOAT NULL,
  sGPID NVARCHAR(50) NULL,
  mComments NVARCHAR(MAX) NULL,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblRepairItem (
  lRepairItemKey INT IDENTITY(1,1) PRIMARY KEY,
  sItemDescription NVARCHAR(200) NULL,
  sTSICode NVARCHAR(50) NULL,
  sProductID NVARCHAR(50) NULL,
  sRigidOrFlexible NVARCHAR(1) NULL,
  sPartOrLabor NVARCHAR(10) NULL,
  sMajorRepair NVARCHAR(1) NULL,
  nUnitCost FLOAT NULL,
  bActive BIT NULL DEFAULT 1,
  dtCreateDate DATETIME NULL,
  dtLastUpdate DATETIME NULL
);

CREATE TABLE tblInventory (
  lInventoryKey INT IDENTITY(1,1) PRIMARY KEY,
  sItemDescription NVARCHAR(200) NULL,
  sRigidOrFlexible NVARCHAR(1) NULL,
  nLevelMinimum INT NULL DEFAULT 0,
  nLevelMaximum INT NULL DEFAULT 0,
  nLevelCurrent INT NULL DEFAULT 0,
  bActive BIT NULL DEFAULT 1,
  bAlwaysReOrder BIT NULL DEFAULT 0,
  bLargeDiameter BIT NULL DEFAULT 0,
  dtCreateDate DATETIME NULL
);

CREATE TABLE tblInventorySize (
  lInventorySizeKey INT IDENTITY(1,1) PRIMARY KEY,
  lInventoryKey INT NULL,
  sSizeDescription NVARCHAR(100) NULL,
  sRigidOrFlexible NVARCHAR(1) NULL,
  nLevelMinimum INT NULL DEFAULT 0,
  nLevelMaximum INT NULL DEFAULT 0,
  nLevelCurrent INT NULL DEFAULT 0,
  dblUnitCost FLOAT NULL DEFAULT 0,
  bActive BIT NULL DEFAULT 1,
  sBinNumber NVARCHAR(20) NULL,
  sStatus NVARCHAR(50) NULL
);
