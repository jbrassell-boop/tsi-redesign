-- Migration: Create tblPendingArrival for tracking expected scope arrivals
-- This table is referenced by server/routes/pending-arrivals.js
-- Run against WinScopeNet database

IF NOT EXISTS (SELECT * FROM INFORMATION_SCHEMA.TABLES WHERE TABLE_NAME = 'tblPendingArrival')
BEGIN
  CREATE TABLE tblPendingArrival (
    lPendingArrivalKey INT IDENTITY(1,1) PRIMARY KEY,
    lScopeTypeKey INT NULL,
    lDepartmentKey INT NULL,
    lServiceLocationKey INT NULL DEFAULT 1,
    sSerialNumber NVARCHAR(50) NULL,
    sStatus NVARCHAR(20) NOT NULL DEFAULT 'pending',
    sPurchaseOrder NVARCHAR(50) NULL,
    dtExpectedDate DATETIME NULL,
    dtReceivedDate DATETIME NULL,
    mComments NVARCHAR(MAX) NULL,
    dtCreateDate DATETIME NOT NULL DEFAULT GETDATE()
  );

  CREATE NONCLUSTERED INDEX IX_PendingArrival_Status
    ON tblPendingArrival (sStatus) INCLUDE (dtExpectedDate);

  CREATE NONCLUSTERED INDEX IX_PendingArrival_Dept
    ON tblPendingArrival (lDepartmentKey);
END
