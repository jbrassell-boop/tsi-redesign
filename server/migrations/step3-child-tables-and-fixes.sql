-- ============================================================================
-- NASHVILLE MERGE — COMPLETE MIGRATION RUNBOOK v2
-- Total Scope Inc. — WinScopeNetNashville → WinScopeNet
--
-- Prerequisites: Both databases restored to pre-merge backups
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/nashville-merge-full.sql -o server/migrations/merge-run-report.txt
-- Expected time: ~5-10 minutes
-- ============================================================================

PRINT '================================================================'
PRINT 'NASHVILLE MERGE — FULL MIGRATION v2'
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT 'Server: ' + @@SERVERNAME + '  Database: ' + DB_NAME()
PRINT '================================================================'
GO

-- ============================================================================
-- PHASE 1: BUILD CROSSWALK TABLES
-- Uses Node.js script (proven reliable) then continues with sqlcmd
-- ============================================================================
PRINT ''
PRINT '>>> PHASE 1: BUILD CROSSWALK TABLES'
PRINT '    (Run via Node.js — see nashville-repair-migrate.js phase1)'
PRINT '    SKIPPING — will be run separately before this script'
GO

-- ============================================================================
-- PHASE 2: IMPORT NASHVILLE REPAIRS
-- Uses Node.js staging approach (proven reliable)
-- ============================================================================
PRINT ''
PRINT '>>> PHASE 2: IMPORT NASHVILLE REPAIRS'
PRINT '    (Run via Node.js — see nashville-repair-migrate.js phase2)'
PRINT '    SKIPPING — will be run separately before this script'
GO

-- ============================================================================
-- PHASE 3: MIGRATE CHILD TABLES
-- Each table: SELECT * INTO staging → UPDATE offsets → dynamic INSERT
-- ============================================================================
PRINT ''
PRINT '>>> PHASE 3: MIGRATE CHILD TABLES'
PRINT '    Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- 14 Nashville repair keys we did NOT import (true WO duplicates)
-- These are computed after Phase 2 runs: Nashville repairs where lRepairKey+20M NOT in North
IF OBJECT_ID('_dupeKeys') IS NOT NULL DROP TABLE _dupeKeys;
SELECT sr.lRepairKey INTO _dupeKeys
FROM WinScopeNetNashville.dbo.tblRepair sr
WHERE NOT EXISTS (SELECT 1 FROM tblRepair nr WHERE nr.lRepairKey = sr.lRepairKey + 20000000);
PRINT '  Skipped repair keys: ' + CAST(@@ROWCOUNT AS VARCHAR)
GO

-- ============================================================================
-- Helper proc: migrate one child table via staging
-- Fixed: ALTER TABLE and UPDATE in separate EXEC calls
-- ============================================================================
IF OBJECT_ID('_migrateChild') IS NOT NULL DROP PROCEDURE _migrateChild;
GO
CREATE PROCEDURE _migrateChild
  @tblName NVARCHAR(128),
  @pkCol NVARCHAR(128) = NULL,
  @pkOffset BIGINT = 20000000,
  @extraUpdates NVARCHAR(MAX) = ''
AS
BEGIN
  SET NOCOUNT ON;
  DECLARE @stg NVARCHAR(128) = '_stg_' + @tblName;
  DECLARE @sql NVARCHAR(MAX);

  -- Drop staging if exists
  SET @sql = 'IF OBJECT_ID(''' + @stg + ''') IS NOT NULL DROP TABLE ' + @stg;
  EXEC sp_executesql @sql;

  -- Stage from Nashville (exclude skipped repairs)
  SET @sql = 'SELECT * INTO ' + @stg + ' FROM WinScopeNetNashville.dbo.' + @tblName +
    ' WHERE lRepairKey NOT IN (SELECT lRepairKey FROM _dupeKeys)';
  EXEC sp_executesql @sql;
  PRINT '  ' + @tblName + ' staged: ' + CAST(@@ROWCOUNT AS VARCHAR);

  -- Add _nk column for identity tables (SEPARATE exec from UPDATE)
  IF @pkCol IS NOT NULL
  BEGIN
    SET @sql = 'ALTER TABLE ' + @stg + ' ADD _nk BIGINT';
    EXEC sp_executesql @sql;
    SET @sql = 'UPDATE ' + @stg + ' SET _nk = CAST(' + @pkCol + ' AS BIGINT) + ' + CAST(@pkOffset AS VARCHAR);
    EXEC sp_executesql @sql;
  END

  -- Repair key offset
  SET @sql = 'UPDATE ' + @stg + ' SET lRepairKey = lRepairKey + 20000000';
  EXEC sp_executesql @sql;

  -- Extra FK remaps
  IF LEN(@extraUpdates) > 0
  BEGIN
    SET @sql = REPLACE(@extraUpdates, '{stg}', @stg);
    EXEC sp_executesql @sql;
  END

  -- Disable constraints/triggers
  SET @sql = 'ALTER TABLE ' + @tblName + ' NOCHECK CONSTRAINT ALL';
  EXEC sp_executesql @sql;
  BEGIN TRY
    SET @sql = 'ALTER TABLE ' + @tblName + ' DISABLE TRIGGER ALL';
    EXEC sp_executesql @sql;
  END TRY BEGIN CATCH END CATCH;

  -- Build column list dynamically
  DECLARE @cols NVARCHAR(MAX);
  SELECT @cols = STRING_AGG(c1.COLUMN_NAME, ', ')
  FROM INFORMATION_SCHEMA.COLUMNS c1
  JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = @stg) c2
    ON c2.COLUMN_NAME = c1.COLUMN_NAME
  WHERE c1.TABLE_NAME = @tblName
    AND c1.COLUMN_NAME != ISNULL(@pkCol, '___none___');

  -- INSERT (capture @@ROWCOUNT before IDENTITY_INSERT OFF resets it)
  DECLARE @rc INT = 0;
  IF @pkCol IS NOT NULL
  BEGIN
    SET @sql = 'SET IDENTITY_INSERT ' + @tblName + ' ON; ' +
      'INSERT INTO ' + @tblName + ' (' + @pkCol + ', ' + @cols + ') ' +
      'SELECT _nk, ' + @cols + ' FROM ' + @stg + '; ' +
      'SET @rc = @@ROWCOUNT; ' +
      'SET IDENTITY_INSERT ' + @tblName + ' OFF;';
    EXEC sp_executesql @sql, N'@rc INT OUTPUT', @rc OUTPUT;
  END
  ELSE
  BEGIN
    SET @sql = 'INSERT INTO ' + @tblName + ' (' + @cols + ') SELECT ' + @cols + ' FROM ' + @stg + ';';
    EXEC sp_executesql @sql;
    SET @rc = @@ROWCOUNT;
  END
  PRINT '  ' + @tblName + ' inserted: ' + CAST(@rc AS VARCHAR);

  -- Re-enable
  BEGIN TRY
    SET @sql = 'ALTER TABLE ' + @tblName + ' ENABLE TRIGGER ALL';
    EXEC sp_executesql @sql;
  END TRY BEGIN CATCH END CATCH;
  SET @sql = 'ALTER TABLE ' + @tblName + ' CHECK CONSTRAINT ALL';
  EXEC sp_executesql @sql;

  -- Cleanup
  SET @sql = 'DROP TABLE ' + @stg;
  EXEC sp_executesql @sql;
END
GO

-- Run all 25 child tables
EXEC _migrateChild 'tblStatusTran', 'lStatusTranKey', 20000000;
GO
EXEC _migrateChild 'tblRepairItemTran', 'lRepairItemTranKey', 200000000,
  'UPDATE s SET s.lTechnicianKey=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lTechnicianKey WHERE s.lTechnicianKey>0; UPDATE s SET s.lTechnician2Key=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lTechnician2Key WHERE s.lTechnician2Key>0;';
GO
EXEC _migrateChild 'tblRepairStatusLog', 'lRepairStatusLogID', 20000000;
GO
EXEC _migrateChild 'tblShipExecInvoiceChargeRepairs', NULL, 0;
GO
EXEC _migrateChild 'tblShippingChargeRepairs', 'lShippingChargeRepairKey', 20000000;
GO
EXEC _migrateChild 'tblPointsOps', 'lPointsOpsKey', 20000000;
GO
EXEC _migrateChild 'tblTasks', 'lTaskKey', 20000000,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0;';
GO
EXEC _migrateChild 'tblPointsTechs', 'lPointsTechsKey', 20000000,
  'UPDATE s SET s.lTechnicianKey=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lTechnicianKey WHERE s.lTechnicianKey>0; UPDATE {stg} SET lRepairItemTranKey=lRepairItemTranKey+200000000 WHERE lRepairItemTranKey>0;';
GO
EXEC _migrateChild 'tblInvoice', 'lInvoiceKey', 400000000,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE s SET s.lSalesRepKey=xr.north_key FROM {stg} s JOIN _xwalk_SalesRep xr ON xr.south_key=s.lSalesRepKey WHERE s.lSalesRepKey>0; UPDATE {stg} SET lFriendRepairKey=lFriendRepairKey+20000000 WHERE lFriendRepairKey>0;';
GO
EXEC _migrateChild 'tblBlankInspectionSignOffLog', 'BlankInspectionSignOffID', 20000000;
GO
EXEC _migrateChild 'tblRepairRevenueAndExpensesContract', NULL, 0,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE {stg} SET lInvoiceKey=lInvoiceKey+400000000 WHERE lInvoiceKey>0;';
GO
EXEC _migrateChild 'tblTrackingNumbersInAudit', NULL, 0;
GO
EXEC _migrateChild 'tblDashScopesInSave', NULL, 0,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE s SET s.lSalesRepKey=xr.north_key FROM {stg} s JOIN _xwalk_SalesRep xr ON xr.south_key=s.lSalesRepKey WHERE s.lSalesRepKey>0;';
GO
EXEC _migrateChild 'tblLoanerTran', 'lLoanerTranKey', 20000000,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE s SET s.lSalesRepKey=xr.north_key FROM {stg} s JOIN _xwalk_SalesRep xr ON xr.south_key=s.lSalesRepKey WHERE s.lSalesRepKey>0;';
GO
EXEC _migrateChild 'tblContractRepairsSaved', NULL, 0,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE {stg} SET lInvoiceKey=lInvoiceKey+400000000 WHERE lInvoiceKey>0;';
GO
EXEC _migrateChild 'tblRepairFailureCodes', NULL, 0;
GO
EXEC _migrateChild 'tblAmendRepairComments', 'lAmendRepairCommentKey', 20000000;
GO
EXEC _migrateChild 'tblRepairUpdateSlips', 'lRepairUpdateSlipKey', 20000000,
  'UPDATE s SET s.lResponsibleTech=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lResponsibleTech WHERE s.lResponsibleTech>0;';
GO
EXEC _migrateChild 'tblInvoiceVoid', NULL, 0,
  'UPDATE {stg} SET lInvoiceKey=lInvoiceKey+400000000 WHERE lInvoiceKey>0; UPDATE {stg} SET lFriendRepairKey=lFriendRepairKey+20000000 WHERE lFriendRepairKey>0; UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE s SET s.lSalesRepKey=xr.north_key FROM {stg} s JOIN _xwalk_SalesRep xr ON xr.south_key=s.lSalesRepKey WHERE s.lSalesRepKey>0;';
GO
EXEC _migrateChild 'tblRepairInspection', 'lRepairInspectionKey', 20000000,
  'UPDATE s SET s.lTechnicianKey=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lTechnicianKey WHERE s.lTechnicianKey>0; UPDATE s SET s.lInspectorKey=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lInspectorKey WHERE s.lInspectorKey>0;';
GO
EXEC _migrateChild 'tblRepairInstrumentModels', 'lRepairInstrumentModelKey', 20000000,
  'UPDATE s SET s.lTechnicianKey=xt.north_key FROM {stg} s JOIN _xwalk_Technician xt ON xt.south_key=s.lTechnicianKey WHERE s.lTechnicianKey>0; UPDATE s SET s.lVendorKey=xv.north_key FROM {stg} s JOIN _xwalk_Vendor xv ON xv.south_key=s.lVendorKey WHERE s.lVendorKey>0; UPDATE {stg} SET lOutsourcedRepairKey=lOutsourcedRepairKey+20000000 WHERE lOutsourcedRepairKey>0; UPDATE {stg} SET lReplacedRepairKey=lReplacedRepairKey+20000000 WHERE lReplacedRepairKey>0;';
GO
EXEC _migrateChild 'tblRepairRevenueAndExpenses', NULL, 0,
  'UPDATE s SET s.lDepartmentKey=xd.north_key FROM {stg} s JOIN _xwalk_Department xd ON xd.south_key=s.lDepartmentKey WHERE s.lDepartmentKey>0; UPDATE s SET s.lScopeKey=xs.north_key FROM {stg} s JOIN _xwalk_Scope xs ON xs.south_key=s.lScopeKey WHERE s.lScopeKey>0; UPDATE s SET s.lSalesRepKey=xr.north_key FROM {stg} s JOIN _xwalk_SalesRep xr ON xr.south_key=s.lSalesRepKey WHERE s.lSalesRepKey>0; UPDATE {stg} SET lInvoiceKey=lInvoiceKey+400000000 WHERE lInvoiceKey>0;';
GO
EXEC _migrateChild 'tblRepairDefectTracking', NULL, 0;
GO
EXEC _migrateChild 'tblRepairDeleteAudit', NULL, 0;
GO
EXEC _migrateChild 'tblISOComplaint', 'lISOComplaintKey', 20000000;
GO

-- Cleanup
DROP PROCEDURE _migrateChild;
DROP TABLE _dupeKeys;
PRINT ''
PRINT '  PHASE 3 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- PHASE 4: FIX INVENTORY TRANSACTION REPAIR KEYS
-- ============================================================================
PRINT ''
PRINT '>>> PHASE 4: FIX INVENTORY REPAIR KEYS'
UPDATE tblInventoryTran SET lRepairKey = lRepairKey + 20000000
WHERE lInventoryTranKey >= 1000000 AND lRepairKey > 0 AND lRepairKey < 20000000
  AND NOT EXISTS (SELECT 1 FROM tblRepair WHERE lRepairKey = tblInventoryTran.lRepairKey);
PRINT '  tblInventoryTran: ' + CAST(@@ROWCOUNT AS VARCHAR)
UPDATE tblLotNumberAdjustments SET lRepairKey = lRepairKey + 20000000
WHERE lLotNumberAdjustmentKey >= 1000000 AND lRepairKey > 0 AND lRepairKey < 20000000
  AND NOT EXISTS (SELECT 1 FROM tblRepair WHERE lRepairKey = tblLotNumberAdjustments.lRepairKey);
PRINT '  tblLotNumberAdjustments: ' + CAST(@@ROWCOUNT AS VARCHAR)
PRINT '  PHASE 4 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- STEP 4: INVENTORYSIZEBUILD (RECIPES)
-- ============================================================================
PRINT ''
PRINT '>>> STEP 4: INVENTORYSIZEBUILD'

IF OBJECT_ID('_stg_Build') IS NOT NULL DROP TABLE _stg_Build;
SELECT * INTO _stg_Build FROM WinScopeNetNashville.dbo.tblInventorySizeBuild;
ALTER TABLE _stg_Build ADD _nk INT;
GO
UPDATE _stg_Build SET _nk = lInventorySizeBuildKey + 100000;
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey FROM _stg_Build s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey WHERE s.lInventorySizeKey > 0;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stg_Build s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;

DECLARE @bc NVARCHAR(MAX);
SELECT @bc = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_Build') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventorySizeBuild' AND c1.COLUMN_NAME != 'lInventorySizeBuildKey';
DECLARE @bs NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblInventorySizeBuild ON; INSERT INTO tblInventorySizeBuild (lInventorySizeBuildKey, ' + @bc + ') SELECT _nk, ' + @bc + ' FROM _stg_Build; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblInventorySizeBuild OFF;';
DECLARE @bsRC INT;
EXEC sp_executesql @bs, N'@rc INT OUTPUT', @bsRC OUTPUT;
PRINT '  tblInventorySizeBuild: ' + CAST(@bsRC AS VARCHAR)
DROP TABLE _stg_Build;
GO

IF OBJECT_ID('_stg_Items') IS NOT NULL DROP TABLE _stg_Items;
SELECT * INTO _stg_Items FROM WinScopeNetNashville.dbo.tblInventorySizeBuildItems;
ALTER TABLE _stg_Items ADD _nk INT;
GO
UPDATE _stg_Items SET _nk = lInventorySizeBuildItemKey + 100000;
UPDATE _stg_Items SET lInventorySizeBuildKey = lInventorySizeBuildKey + 100000;
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey FROM _stg_Items s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey WHERE s.lInventorySizeKey > 0;

DECLARE @ic NVARCHAR(MAX);
SELECT @ic = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_Items') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventorySizeBuildItems' AND c1.COLUMN_NAME != 'lInventorySizeBuildItemKey';
DECLARE @is NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblInventorySizeBuildItems ON; INSERT INTO tblInventorySizeBuildItems (lInventorySizeBuildItemKey, ' + @ic + ') SELECT _nk, ' + @ic + ' FROM _stg_Items; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblInventorySizeBuildItems OFF;';
DECLARE @isRC INT;
EXEC sp_executesql @is, N'@rc INT OUTPUT', @isRC OUTPUT;
PRINT '  tblInventorySizeBuildItems: ' + CAST(@isRC AS VARCHAR)
DROP TABLE _stg_Items;
PRINT '  STEP 4 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- STEP 6: FIX TRIGGERS
-- ============================================================================
PRINT ''
PRINT '>>> STEP 6: FIX TRIGGERS'
DECLARE @td NVARCHAR(MAX);
SET @td = OBJECT_DEFINITION(OBJECT_ID('trRepairUpd'));
SET @td = REPLACE(@td, 'Select @SalesRepEmail = sr.sRepEMail From TSS.WinscopeNetNashville.dbo.tblSalesRep sr Where sr.lSalesRepKey = @lSalesRepKey',
  'Select @SalesRepEmail = sr.sRepEMail From dbo.tblSalesRep sr Where sr.lSalesRepKey = @lSalesRepKey');
SET @td = REPLACE(@td, 'If @DBName = ''WinScopeNetNashville''', 'If @lRepairServiceLocationKey = 2');
SET @td = REPLACE(@td, 'CREATE TRIGGER', 'ALTER TRIGGER');
EXEC sp_executesql @td;
PRINT '  trRepairUpd fixed'

SET @td = OBJECT_DEFINITION(OBJECT_ID('trInvoiceUpdateCustomerSince'));
SET @td = REPLACE(@td, 'From TSS.WinscopeNetNashville.dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink',
  'From dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink');
SET @td = REPLACE(@td, 'CREATE TRIGGER', 'ALTER TRIGGER');
EXEC sp_executesql @td;
PRINT '  trInvoiceUpdateCustomerSince fixed'

SET @td = OBJECT_DEFINITION(OBJECT_ID('trPortalTrackingNumbersInsert'));
SET @td = REPLACE(@td, 'From TSS.WinscopeNetNashville.dbo.tblSalesRep sr', 'From dbo.tblSalesRep sr');
SET @td = REPLACE(@td, 'If UPPER(@DBName)=''WINSCOPENETNASHVILLE''', 'If 1=0 -- Nashville check disabled post-merge');
SET @td = REPLACE(@td, 'CREATE TRIGGER', 'ALTER TRIGGER');
EXEC sp_executesql @td;
PRINT '  trPortalTrackingNumbersInsert fixed'
PRINT '  STEP 6 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- STEP 5: FIX STORED PROCEDURES (bulk replace)
-- ============================================================================
PRINT ''
PRINT '>>> STEP 5: FIX STORED PROCEDURES'
DECLARE @pN NVARCHAR(256), @pD NVARCHAR(MAX), @pF INT=0, @pE INT=0;
DECLARE pc CURSOR FOR
  SELECT name FROM sys.procedures
  WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%'
     OR OBJECT_DEFINITION(object_id) LIKE '%TSI.%WinScopeNet.dbo%'
     OR OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%'
  ORDER BY name;
OPEN pc; FETCH NEXT FROM pc INTO @pN;
WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @pD = OBJECT_DEFINITION(OBJECT_ID(@pN));
    SET @pD = REPLACE(@pD, 'TSS.WinscopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSS.WinScopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSI.WinScopeNet.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSI.WinscopeNet.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'WinScopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'CREATE PROCEDURE', 'ALTER PROCEDURE');
    SET @pD = REPLACE(@pD, 'CREATE PROC ', 'ALTER PROC ');
    SET @pD = REPLACE(@pD, 'CREATE   PROCEDURE', 'ALTER   PROCEDURE');
    EXEC sp_executesql @pD;
    SET @pF = @pF + 1;
  END TRY
  BEGIN CATCH SET @pE = @pE + 1; END CATCH
  FETCH NEXT FROM pc INTO @pN;
END
CLOSE pc; DEALLOCATE pc;
-- Run a second pass to catch procs that had both TSS+TSI refs
DECLARE pc2 CURSOR FOR
  SELECT name FROM sys.procedures
  WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%'
     OR OBJECT_DEFINITION(object_id) LIKE '%TSI.%WinScopeNet.dbo%'
     OR OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%'
  ORDER BY name;
OPEN pc2; FETCH NEXT FROM pc2 INTO @pN;
WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @pD = OBJECT_DEFINITION(OBJECT_ID(@pN));
    SET @pD = REPLACE(@pD, 'TSS.WinscopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSS.WinScopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSI.WinScopeNet.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'TSI.WinscopeNet.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'WinScopeNetNashville.dbo.', 'dbo.');
    SET @pD = REPLACE(@pD, 'CREATE PROCEDURE', 'ALTER PROCEDURE');
    SET @pD = REPLACE(@pD, 'CREATE PROC ', 'ALTER PROC ');
    SET @pD = REPLACE(@pD, 'CREATE   PROCEDURE', 'ALTER   PROCEDURE');
    EXEC sp_executesql @pD;
    SET @pF = @pF + 1;
  END TRY
  BEGIN CATCH SET @pE = @pE + 1; END CATCH
  FETCH NEXT FROM pc2 INTO @pN;
END
CLOSE pc2; DEALLOCATE pc2;
PRINT '  Procs fixed: ' + CAST(@pF AS VARCHAR) + ', remaining: ' + CAST(@pE AS VARCHAR)
PRINT '  STEP 5 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- VERIFICATION
-- ============================================================================
PRINT ''
PRINT '>>> VERIFICATION'

IF OBJECT_ID('_xwalk_Repair') IS NOT NULL DROP TABLE _xwalk_Repair;
SELECT lRepairKey - 20000000 AS south_key, lRepairKey AS north_key, sWorkOrderNumber
INTO _xwalk_Repair FROM tblRepair WHERE lRepairKey >= 20000000;
PRINT '  _xwalk_Repair: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

PRINT ''
PRINT '  --- Row Counts ---'
SELECT 'tblRepair' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblRepair) as south, (SELECT COUNT(*) FROM tblRepair WHERE lRepairKey >= 20000000) as north;
SELECT 'tblStatusTran' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblStatusTran) as south, (SELECT COUNT(*) FROM tblStatusTran WHERE lRepairKey >= 20000000) as north;
SELECT 'tblRepairItemTran' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblRepairItemTran) as south, (SELECT COUNT(*) FROM tblRepairItemTran WHERE lRepairKey >= 20000000) as north;
SELECT 'tblInvoice' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblInvoice) as south, (SELECT COUNT(*) FROM tblInvoice WHERE lRepairKey >= 20000000) as north;
SELECT 'tblShipExecInvoiceChargeRepairs' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblShipExecInvoiceChargeRepairs) as south, (SELECT COUNT(*) FROM tblShipExecInvoiceChargeRepairs WHERE lRepairKey >= 20000000) as north;
SELECT 'tblShippingChargeRepairs' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblShippingChargeRepairs) as south, (SELECT COUNT(*) FROM tblShippingChargeRepairs WHERE lRepairKey >= 20000000) as north;

PRINT ''
PRINT '  --- FK Integrity ---'
SELECT 'Dept orphans' as chk, COUNT(*) as cnt FROM tblRepair r LEFT JOIN tblDepartment d ON d.lDepartmentKey=r.lDepartmentKey WHERE r.lRepairKey>=20000000 AND r.lDepartmentKey>0 AND d.lDepartmentKey IS NULL;
SELECT 'Scope orphans' as chk, COUNT(*) as cnt FROM tblRepair r LEFT JOIN tblScope s ON s.lScopeKey=r.lScopeKey WHERE r.lRepairKey>=20000000 AND r.lScopeKey>0 AND s.lScopeKey IS NULL;
SELECT 'Tech orphans' as chk, COUNT(*) as cnt FROM tblRepair r LEFT JOIN tblTechnicians t ON t.lTechnicianKey=r.lTechnicianKey WHERE r.lRepairKey>=20000000 AND r.lTechnicianKey>0 AND t.lTechnicianKey IS NULL;

PRINT ''
PRINT '  --- Trigger Test ---'
DECLARE @tk2 INT = (SELECT TOP 1 lRepairKey FROM tblRepair WHERE lRepairKey >= 20000000);
BEGIN TRY
  UPDATE tblRepair SET dtLastUpdate = GETDATE() WHERE lRepairKey = @tk2;
  PRINT '  trRepairUpd on South repair: PASS'
END TRY
BEGIN CATCH
  PRINT '  trRepairUpd on South repair: FAIL — ' + ERROR_MESSAGE()
END CATCH

PRINT ''
PRINT '  --- Remaining Nashville References ---'
SELECT COUNT(*) as remaining_procs FROM sys.procedures
WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%'
   OR OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%';
GO

PRINT ''
PRINT '================================================================'
PRINT 'NASHVILLE MERGE COMPLETE'
PRINT 'Finished: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT '================================================================'
