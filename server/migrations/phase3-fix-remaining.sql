-- Fix 6 remaining child tables — Nashville Repair Migration
-- Uses dynamic SQL for column lists to avoid column name guessing
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/phase3-fix-remaining.sql

PRINT '=== Fixing 6 remaining child tables ==='
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- 1. tblAmendRepairComments (2,979 rows)
-- Identity: lAmendRepairCommentKey
-- Actual cols: lAmendRepairCommentKey, lRepairKey, lUserKey, lAmendRepairTypeKey,
--   lAmendRepairReasonKey, sAmendRepairComment, lAmendmentNumber, dtAmendmentDate, bApprovalDateReset
-- ============================================================================
PRINT ''
PRINT '--- tblAmendRepairComments ---'

ALTER TABLE tblAmendRepairComments NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblAmendRepairComments DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblAmendRepairComments WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg1') IS NOT NULL DROP TABLE _stg1;
SELECT * INTO _stg1 FROM WinScopeNetNashville.dbo.tblAmendRepairComments
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg1 ADD _nk INT;
UPDATE _stg1 SET _nk = lAmendRepairCommentKey + 20000000;
UPDATE _stg1 SET lRepairKey = lRepairKey + 20000000;

SET IDENTITY_INSERT tblAmendRepairComments ON;
INSERT INTO tblAmendRepairComments (lAmendRepairCommentKey, lRepairKey, lUserKey, lAmendRepairTypeKey,
  lAmendRepairReasonKey, sAmendRepairComment, lAmendmentNumber, dtAmendmentDate, bApprovalDateReset)
SELECT _nk, lRepairKey, lUserKey, lAmendRepairTypeKey,
  lAmendRepairReasonKey, sAmendRepairComment, lAmendmentNumber, dtAmendmentDate, bApprovalDateReset
FROM _stg1;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)
SET IDENTITY_INSERT tblAmendRepairComments OFF;

BEGIN TRY ALTER TABLE tblAmendRepairComments ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblAmendRepairComments CHECK CONSTRAINT ALL;
DROP TABLE _stg1;
PRINT 'tblAmendRepairComments DONE'
GO

-- ============================================================================
-- 2. tblRepairUpdateSlips (1,998 rows)
-- Identity: lRepairUpdateSlipKey
-- Actual cols: lRepairUpdateSlipKey, lRepairKey, dtUpdateRequestDate,
--   lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey
-- ============================================================================
PRINT ''
PRINT '--- tblRepairUpdateSlips ---'

ALTER TABLE tblRepairUpdateSlips NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblRepairUpdateSlips DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblRepairUpdateSlips WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg2') IS NOT NULL DROP TABLE _stg2;
SELECT * INTO _stg2 FROM WinScopeNetNashville.dbo.tblRepairUpdateSlips
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg2 ADD _nk INT;
UPDATE _stg2 SET _nk = lRepairUpdateSlipKey + 20000000;
UPDATE _stg2 SET lRepairKey = lRepairKey + 20000000;
-- Remap tech FKs
UPDATE s SET s.lResponsibleTech = xt.north_key FROM _stg2 s JOIN _xwalk_Technician xt ON xt.south_key = s.lResponsibleTech WHERE s.lResponsibleTech > 0;
UPDATE s SET s.lResponsibleTech2 = xt.north_key FROM _stg2 s JOIN _xwalk_Technician xt ON xt.south_key = s.lResponsibleTech2 WHERE s.lResponsibleTech2 > 0;

SET IDENTITY_INSERT tblRepairUpdateSlips ON;
INSERT INTO tblRepairUpdateSlips (lRepairUpdateSlipKey, lRepairKey, dtUpdateRequestDate,
  lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey)
SELECT _nk, lRepairKey, dtUpdateRequestDate,
  lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey
FROM _stg2;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)
SET IDENTITY_INSERT tblRepairUpdateSlips OFF;

BEGIN TRY ALTER TABLE tblRepairUpdateSlips ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblRepairUpdateSlips CHECK CONSTRAINT ALL;
DROP TABLE _stg2;
PRINT 'tblRepairUpdateSlips DONE'
GO

-- ============================================================================
-- 3. tblRepairInspection (1,568 rows)
-- Identity: lRepairInspectionKey. ~100 columns.
-- Use dynamic SQL to build INSERT from common columns.
-- ============================================================================
PRINT ''
PRINT '--- tblRepairInspection ---'

ALTER TABLE tblRepairInspection NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblRepairInspection DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblRepairInspection WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg3') IS NOT NULL DROP TABLE _stg3;
SELECT * INTO _stg3 FROM WinScopeNetNashville.dbo.tblRepairInspection
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg3 ADD _nk INT;
UPDATE _stg3 SET _nk = lRepairInspectionKey + 20000000;
UPDATE _stg3 SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stg3 s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;
UPDATE s SET s.lInspectorKey = xt.north_key FROM _stg3 s JOIN _xwalk_Technician xt ON xt.south_key = s.lInspectorKey WHERE s.lInspectorKey > 0;

-- Dynamic SQL: build column list from common columns (excluding identity + _nk)
DECLARE @cols NVARCHAR(MAX), @sql NVARCHAR(MAX);
SELECT @cols = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg3') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblRepairInspection'
  AND c1.COLUMN_NAME != 'lRepairInspectionKey';

SET @sql = 'SET IDENTITY_INSERT tblRepairInspection ON; ' +
  'INSERT INTO tblRepairInspection (lRepairInspectionKey, ' + @cols + ') ' +
  'SELECT _nk, ' + @cols + ' FROM _stg3; ' +
  'SET IDENTITY_INSERT tblRepairInspection OFF;';
EXEC sp_executesql @sql;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)

BEGIN TRY ALTER TABLE tblRepairInspection ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblRepairInspection CHECK CONSTRAINT ALL;
DROP TABLE _stg3;
PRINT 'tblRepairInspection DONE'
GO

-- ============================================================================
-- 4. tblLoanerTran (5,361 rows)
-- Identity: lLoanerTranKey. Has dept/scope/salesrep FKs.
-- ============================================================================
PRINT ''
PRINT '--- tblLoanerTran ---'

ALTER TABLE tblLoanerTran NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblLoanerTran DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblLoanerTran WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg4') IS NOT NULL DROP TABLE _stg4;
SELECT * INTO _stg4 FROM WinScopeNetNashville.dbo.tblLoanerTran
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg4 ADD _nk INT;
UPDATE _stg4 SET _nk = lLoanerTranKey + 20000000;
UPDATE _stg4 SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stg4 s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stg4 s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stg4 s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;

-- Dynamic SQL for column list
DECLARE @cols4 NVARCHAR(MAX), @sql4 NVARCHAR(MAX);
SELECT @cols4 = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg4') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblLoanerTran'
  AND c1.COLUMN_NAME != 'lLoanerTranKey';

SET @sql4 = 'SET IDENTITY_INSERT tblLoanerTran ON; ' +
  'INSERT INTO tblLoanerTran (lLoanerTranKey, ' + @cols4 + ') ' +
  'SELECT _nk, ' + @cols4 + ' FROM _stg4; ' +
  'SET IDENTITY_INSERT tblLoanerTran OFF;';
EXEC sp_executesql @sql4;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)

BEGIN TRY ALTER TABLE tblLoanerTran ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblLoanerTran CHECK CONSTRAINT ALL;
DROP TABLE _stg4;
PRINT 'tblLoanerTran DONE'
GO

-- ============================================================================
-- 5. tblContractRepairsSaved (3,258 rows)
-- No identity. PK = lInvoiceKey. Needs +400M invoice offset.
-- ============================================================================
PRINT ''
PRINT '--- tblContractRepairsSaved ---'

ALTER TABLE tblContractRepairsSaved NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblContractRepairsSaved DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblContractRepairsSaved WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg5') IS NOT NULL DROP TABLE _stg5;
SELECT * INTO _stg5 FROM WinScopeNetNashville.dbo.tblContractRepairsSaved
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

UPDATE _stg5 SET lRepairKey = lRepairKey + 20000000;
UPDATE _stg5 SET lInvoiceKey = lInvoiceKey + 400000000 WHERE lInvoiceKey > 0;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stg5 s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stg5 s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;

-- Dynamic SQL
DECLARE @cols5 NVARCHAR(MAX), @sql5 NVARCHAR(MAX);
SELECT @cols5 = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg5') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblContractRepairsSaved';

SET @sql5 = 'INSERT INTO tblContractRepairsSaved (' + @cols5 + ') SELECT ' + @cols5 + ' FROM _stg5;';
EXEC sp_executesql @sql5;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)

BEGIN TRY ALTER TABLE tblContractRepairsSaved ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblContractRepairsSaved CHECK CONSTRAINT ALL;
DROP TABLE _stg5;
PRINT 'tblContractRepairsSaved DONE'
GO

-- ============================================================================
-- 6. tblInvoiceVoid (1,675 rows)
-- No identity. No PK. ~112 columns (same as tblInvoice).
-- Needs dept/scope/salesrep/invoice FK remaps.
-- ============================================================================
PRINT ''
PRINT '--- tblInvoiceVoid ---'

ALTER TABLE tblInvoiceVoid NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE tblInvoiceVoid DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
DELETE FROM tblInvoiceVoid WHERE lRepairKey >= 20000000;
PRINT 'Cleaned: ' + CAST(@@ROWCOUNT AS VARCHAR)

IF OBJECT_ID('_stg6') IS NOT NULL DROP TABLE _stg6;
SELECT * INTO _stg6 FROM WinScopeNetNashville.dbo.tblInvoiceVoid
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

UPDATE _stg6 SET lRepairKey = lRepairKey + 20000000;
UPDATE _stg6 SET lInvoiceKey = lInvoiceKey + 400000000 WHERE lInvoiceKey > 0;
UPDATE _stg6 SET lFriendRepairKey = lFriendRepairKey + 20000000 WHERE lFriendRepairKey > 0;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stg6 s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stg6 s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stg6 s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;

-- Dynamic SQL for common columns
DECLARE @cols6 NVARCHAR(MAX), @sql6 NVARCHAR(MAX);
SELECT @cols6 = STRING_AGG(c1.COLUMN_NAME, ', ') FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg6') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInvoiceVoid';

SET @sql6 = 'INSERT INTO tblInvoiceVoid (' + @cols6 + ') SELECT ' + @cols6 + ' FROM _stg6;';
EXEC sp_executesql @sql6;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR)

BEGIN TRY ALTER TABLE tblInvoiceVoid ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE tblInvoiceVoid CHECK CONSTRAINT ALL;
DROP TABLE _stg6;
PRINT 'tblInvoiceVoid DONE'
GO

PRINT ''
PRINT '=== All 6 tables fixed: ' + CONVERT(VARCHAR, GETDATE(), 120) + ' ==='
