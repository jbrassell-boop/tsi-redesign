-- ============================================================================
-- NASHVILLE INVENTORY MERGE — Steps 3A-3G
-- Total Scope Inc. — WinScopeNetNashville → WinScopeNet
--
-- Migrates inventory parts, supplier data, and transaction history
-- Prerequisites: Both databases at pre-merge state
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/nashville-inventory-merge.sql -o server/migrations/inventory-merge-report.txt
-- ============================================================================

PRINT '================================================================'
PRINT 'NASHVILLE INVENTORY MERGE — Steps 3A-3G'
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT '================================================================'
GO

-- ============================================================================
-- STEP 3A: Add South stock columns to tblInventorySize
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3A: Add South stock columns'

IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tblInventorySize' AND COLUMN_NAME='nLevelCurrentSouth')
  ALTER TABLE tblInventorySize ADD nLevelCurrentSouth INT NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tblInventorySize' AND COLUMN_NAME='nLevelMinimumSouth')
  ALTER TABLE tblInventorySize ADD nLevelMinimumSouth INT NULL;
IF NOT EXISTS (SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME='tblInventorySize' AND COLUMN_NAME='nLevelMaximumSouth')
  ALTER TABLE tblInventorySize ADD nLevelMaximumSouth INT NULL;
PRINT '  Columns added (or already exist)'
PRINT '  STEP 3A COMPLETE'
GO

-- ============================================================================
-- STEP 3B: Build crosswalk tables
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3B: Build crosswalk tables'
GO

-- _xwalk_InventorySize: match by sSupplierPartNo via tblSupplierSizes
IF OBJECT_ID('_xwalk_InventorySize') IS NOT NULL DROP TABLE _xwalk_InventorySize;

SELECT
  ss.lInventorySizeKey AS SouthSizeKey,
  ns.lInventorySizeKey AS NorthSizeKey,
  ss_sup.sSupplierPartNo,
  CAST('MATCHED' AS VARCHAR(20)) AS MatchType
INTO _xwalk_InventorySize
FROM WinScopeNetNashville.dbo.tblInventorySize ss
JOIN WinScopeNetNashville.dbo.tblSupplierSizes ss_sup ON ss_sup.lInventorySizeKey = ss.lInventorySizeKey
JOIN tblSupplierSizes ns_sup ON RTRIM(ns_sup.sSupplierPartNo) = RTRIM(ss_sup.sSupplierPartNo)
JOIN tblInventorySize ns ON ns.lInventorySizeKey = ns_sup.lInventorySizeKey
WHERE LEN(RTRIM(ISNULL(ss_sup.sSupplierPartNo,''))) >= 3
  AND ss_sup.sSupplierPartNo NOT IN ('0000', 'N/A', 'NA');

-- Deduplicate (some part numbers match multiple sizes)
;WITH dupes AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY SouthSizeKey ORDER BY NorthSizeKey) as rn
  FROM _xwalk_InventorySize
)
DELETE FROM dupes WHERE rn > 1;
DECLARE @cnt1 INT = (SELECT COUNT(*) FROM _xwalk_InventorySize);
PRINT '  _xwalk_InventorySize matched: ' + CAST(@cnt1 AS VARCHAR)

-- Fix: widen MatchType column — SELECT INTO with CAST('MATCHED' AS VARCHAR(20))
-- produces VARCHAR(7) from the literal length, not the CAST target
ALTER TABLE _xwalk_InventorySize ALTER COLUMN MatchType VARCHAR(20) NOT NULL;

-- Add South-only parts (no match in North)
INSERT INTO _xwalk_InventorySize (SouthSizeKey, NorthSizeKey, sSupplierPartNo, MatchType)
SELECT ss.lInventorySizeKey, ss.lInventorySizeKey + 100000, '', 'SOUTH_ONLY'
FROM WinScopeNetNashville.dbo.tblInventorySize ss
WHERE ss.lInventorySizeKey NOT IN (SELECT SouthSizeKey FROM _xwalk_InventorySize);
PRINT '  _xwalk_InventorySize south-only: ' + CAST(@@ROWCOUNT AS VARCHAR)
DECLARE @cnt2 INT = (SELECT COUNT(*) FROM _xwalk_InventorySize);
PRINT '  _xwalk_InventorySize total: ' + CAST(@cnt2 AS VARCHAR)
GO

-- _xwalk_Inventory: match categories by name
IF OBJECT_ID('_xwalk_Inventory') IS NOT NULL DROP TABLE _xwalk_Inventory;

SELECT
  si.lInventoryKey AS SouthKey,
  ni.lInventoryKey AS NorthKey,
  CAST(si.sItemDescription AS NVARCHAR(200)) AS SouthDesc,
  CAST('MATCHED' AS VARCHAR(20)) AS MatchType
INTO _xwalk_Inventory
FROM WinScopeNetNashville.dbo.tblInventory si
JOIN tblInventory ni ON RTRIM(ni.sItemDescription) = RTRIM(si.sItemDescription);

-- Deduplicate
;WITH dupes AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY SouthKey ORDER BY NorthKey) as rn
  FROM _xwalk_Inventory
)
DELETE FROM dupes WHERE rn > 1;
DECLARE @cnt3 INT = (SELECT COUNT(*) FROM _xwalk_Inventory);
PRINT '  _xwalk_Inventory matched: ' + CAST(@cnt3 AS VARCHAR)

-- Fix: widen MatchType — same SELECT INTO literal-width bug
ALTER TABLE _xwalk_Inventory ALTER COLUMN MatchType VARCHAR(20) NOT NULL;

-- South-only categories
INSERT INTO _xwalk_Inventory (SouthKey, NorthKey, SouthDesc, MatchType)
SELECT si.lInventoryKey, si.lInventoryKey + 10000, si.sItemDescription, 'SOUTH_ONLY'
FROM WinScopeNetNashville.dbo.tblInventory si
WHERE si.lInventoryKey NOT IN (SELECT SouthKey FROM _xwalk_Inventory);
PRINT '  _xwalk_Inventory south-only: ' + CAST(@@ROWCOUNT AS VARCHAR)
GO

-- _xwalk_SupplierSizes
IF OBJECT_ID('_xwalk_SupplierSizes') IS NOT NULL DROP TABLE _xwalk_SupplierSizes;

SELECT
  ss.lSupplierSizesKey AS SouthKey,
  ns.lSupplierSizesKey AS NorthKey,
  ss.sSupplierPartNo,
  CAST('MATCHED' AS VARCHAR(20)) AS MatchType
INTO _xwalk_SupplierSizes
FROM WinScopeNetNashville.dbo.tblSupplierSizes ss
JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = ss.lInventorySizeKey
JOIN tblSupplierSizes ns ON RTRIM(ns.sSupplierPartNo) = RTRIM(ss.sSupplierPartNo)
  AND ns.lInventorySizeKey = xw.NorthSizeKey
WHERE LEN(RTRIM(ISNULL(ss.sSupplierPartNo,''))) >= 3
  AND ss.sSupplierPartNo NOT IN ('0000', 'N/A', 'NA');

;WITH dupes AS (
  SELECT *, ROW_NUMBER() OVER (PARTITION BY SouthKey ORDER BY NorthKey) as rn
  FROM _xwalk_SupplierSizes
)
DELETE FROM dupes WHERE rn > 1;
DECLARE @cnt4 INT = (SELECT COUNT(*) FROM _xwalk_SupplierSizes);
PRINT '  _xwalk_SupplierSizes matched: ' + CAST(@cnt4 AS VARCHAR)

-- Fix: widen MatchType — same SELECT INTO literal-width bug
ALTER TABLE _xwalk_SupplierSizes ALTER COLUMN MatchType VARCHAR(20) NOT NULL;

INSERT INTO _xwalk_SupplierSizes (SouthKey, NorthKey, sSupplierPartNo, MatchType)
SELECT ss.lSupplierSizesKey, ss.lSupplierSizesKey + 100000, ISNULL(ss.sSupplierPartNo, ''), 'SOUTH_ONLY'
FROM WinScopeNetNashville.dbo.tblSupplierSizes ss
WHERE ss.lSupplierSizesKey NOT IN (SELECT SouthKey FROM _xwalk_SupplierSizes);
PRINT '  _xwalk_SupplierSizes south-only: ' + CAST(@@ROWCOUNT AS VARCHAR)

PRINT '  STEP 3B COMPLETE'
GO

-- ============================================================================
-- STEP 3C: Copy South stock levels to matched North rows
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3C: Copy South stock levels'

UPDATE ns SET
  ns.nLevelCurrentSouth = ss.nLevelCurrent,
  ns.nLevelMinimumSouth = ss.nLevelMinimum,
  ns.nLevelMaximumSouth = ss.nLevelMaximum
FROM tblInventorySize ns
JOIN _xwalk_InventorySize xw ON xw.NorthSizeKey = ns.lInventorySizeKey AND xw.MatchType = 'MATCHED'
JOIN WinScopeNetNashville.dbo.tblInventorySize ss ON ss.lInventorySizeKey = xw.SouthSizeKey;
PRINT '  Stock levels copied: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' parts'
PRINT '  STEP 3C COMPLETE'
GO

-- ============================================================================
-- STEP 3D: Import South-only parts (tblInventorySize)
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3D: Import South-only parts'

IF OBJECT_ID('_stg_InvSize') IS NOT NULL DROP TABLE _stg_InvSize;
SELECT * INTO _stg_InvSize FROM WinScopeNetNashville.dbo.tblInventorySize
WHERE lInventorySizeKey NOT IN (SELECT SouthSizeKey FROM _xwalk_InventorySize WHERE MatchType = 'MATCHED');
ALTER TABLE _stg_InvSize ADD _nk INT;
GO
UPDATE _stg_InvSize SET _nk = lInventorySizeKey + 100000;
-- Remap category FK
UPDATE s SET s.lInventoryKey = xw.NorthKey
FROM _stg_InvSize s JOIN _xwalk_Inventory xw ON xw.SouthKey = s.lInventoryKey;

DECLARE @sizeCols NVARCHAR(MAX);
SELECT @sizeCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_InvSize') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventorySize' AND c1.COLUMN_NAME != 'lInventorySizeKey';
DECLARE @sizeSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblInventorySize ON; INSERT INTO tblInventorySize (lInventorySizeKey, ' + @sizeCols + ') SELECT _nk, ' + @sizeCols + ' FROM _stg_InvSize; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblInventorySize OFF;';
DECLARE @sizeRC INT;
EXEC sp_executesql @sizeSql, N'@rc INT OUTPUT', @sizeRC OUTPUT;
PRINT '  South-only parts imported: ' + CAST(@sizeRC AS VARCHAR)
DROP TABLE _stg_InvSize;
PRINT '  STEP 3D COMPLETE'
GO

-- ============================================================================
-- STEP 3E: Link South suppliers to North
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3E: Link South suppliers'

-- Match suppliers by name and set lSupplierKeyLink
UPDATE ss SET ss.lSupplierKeyLink = ns.lSupplierKey
FROM WinScopeNetNashville.dbo.tblSupplier ss
JOIN tblSupplier ns ON RTRIM(LTRIM(ns.sSupplierName1)) = RTRIM(LTRIM(ss.sSupplierName1))
WHERE ISNULL(ss.lSupplierKeyLink, 0) = 0;
PRINT '  Suppliers linked by name: ' + CAST(@@ROWCOUNT AS VARCHAR)

-- Verify all linked
DECLARE @unlinked INT = (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblSupplier WHERE ISNULL(lSupplierKeyLink, 0) = 0);
PRINT '  Unlinked suppliers remaining: ' + CAST(@unlinked AS VARCHAR)
PRINT '  STEP 3E COMPLETE'
GO

-- ============================================================================
-- STEP 3F: Import South-only categories (tblInventory)
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3F: Import South-only categories'

IF OBJECT_ID('_stg_Inv') IS NOT NULL DROP TABLE _stg_Inv;
SELECT * INTO _stg_Inv FROM WinScopeNetNashville.dbo.tblInventory
WHERE lInventoryKey NOT IN (SELECT SouthKey FROM _xwalk_Inventory WHERE MatchType = 'MATCHED');
ALTER TABLE _stg_Inv ADD _nk INT;
GO
UPDATE _stg_Inv SET _nk = lInventoryKey + 10000;

DECLARE @invCols NVARCHAR(MAX);
SELECT @invCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_Inv') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventory' AND c1.COLUMN_NAME != 'lInventoryKey';
DECLARE @invSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblInventory ON; INSERT INTO tblInventory (lInventoryKey, ' + @invCols + ') SELECT _nk, ' + @invCols + ' FROM _stg_Inv; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblInventory OFF;';
DECLARE @invRC INT;
EXEC sp_executesql @invSql, N'@rc INT OUTPUT', @invRC OUTPUT;
PRINT '  South-only categories imported: ' + CAST(@invRC AS VARCHAR)
DROP TABLE _stg_Inv;
PRINT '  STEP 3F COMPLETE'
GO

-- ============================================================================
-- STEP 3G: Migrate ALL transaction history (680K+ rows)
-- ============================================================================
PRINT ''
PRINT '>>> STEP 3G: Migrate transaction history'
PRINT '    Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- 3G-1: tblSupplierPO (6,387 rows, +1M offset)
PRINT '  --- tblSupplierPO ---'
IF OBJECT_ID('_stg_SPO') IS NOT NULL DROP TABLE _stg_SPO;
SELECT * INTO _stg_SPO FROM WinScopeNetNashville.dbo.tblSupplierPO;
ALTER TABLE _stg_SPO ADD _nk INT;
GO
UPDATE _stg_SPO SET _nk = lSupplierPOKey + 1000000;
-- Remap supplier FK via lSupplierKeyLink
UPDATE s SET s.lSupplierKey = ss.lSupplierKeyLink
FROM _stg_SPO s
JOIN WinScopeNetNashville.dbo.tblSupplier ss ON ss.lSupplierKey = s.lSupplierKey
WHERE ISNULL(ss.lSupplierKeyLink, 0) > 0;

DECLARE @spoCols NVARCHAR(MAX);
SELECT @spoCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_SPO') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblSupplierPO' AND c1.COLUMN_NAME != 'lSupplierPOKey';
DECLARE @spoSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblSupplierPO ON; INSERT INTO tblSupplierPO (lSupplierPOKey, ' + @spoCols + ') SELECT _nk, ' + @spoCols + ' FROM _stg_SPO; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblSupplierPO OFF;';
DECLARE @spoRC INT;
EXEC sp_executesql @spoSql, N'@rc INT OUTPUT', @spoRC OUTPUT;
PRINT '  tblSupplierPO: ' + CAST(@spoRC AS VARCHAR)
DROP TABLE _stg_SPO;
GO

-- 3G-2: tblSupplierSizes (South-only, 3,347 rows, +100K offset)
PRINT '  --- tblSupplierSizes (South-only) ---'
IF OBJECT_ID('_stg_SS') IS NOT NULL DROP TABLE _stg_SS;
SELECT * INTO _stg_SS FROM WinScopeNetNashville.dbo.tblSupplierSizes
WHERE lSupplierSizesKey NOT IN (SELECT SouthKey FROM _xwalk_SupplierSizes WHERE MatchType = 'MATCHED');
ALTER TABLE _stg_SS ADD _nk INT;
GO
UPDATE _stg_SS SET _nk = lSupplierSizesKey + 100000;
UPDATE s SET s.lSupplierKey = ss.lSupplierKeyLink
FROM _stg_SS s JOIN WinScopeNetNashville.dbo.tblSupplier ss ON ss.lSupplierKey = s.lSupplierKey
WHERE ISNULL(ss.lSupplierKeyLink, 0) > 0;
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey
FROM _stg_SS s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey;

DECLARE @ssCols NVARCHAR(MAX);
SELECT @ssCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_SS') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblSupplierSizes' AND c1.COLUMN_NAME != 'lSupplierSizesKey';
DECLARE @ssSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblSupplierSizes ON; INSERT INTO tblSupplierSizes (lSupplierSizesKey, ' + @ssCols + ') SELECT _nk, ' + @ssCols + ' FROM _stg_SS; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblSupplierSizes OFF;';
DECLARE @ssRC INT;
EXEC sp_executesql @ssSql, N'@rc INT OUTPUT', @ssRC OUTPUT;
PRINT '  tblSupplierSizes: ' + CAST(@ssRC AS VARCHAR)
DROP TABLE _stg_SS;
GO

-- 3G-3: tblSupplierPOTran (16,908 rows, +1M offset)
PRINT '  --- tblSupplierPOTran ---'
IF OBJECT_ID('_stg_SPOT') IS NOT NULL DROP TABLE _stg_SPOT;
SELECT * INTO _stg_SPOT FROM WinScopeNetNashville.dbo.tblSupplierPOTran;
ALTER TABLE _stg_SPOT ADD _nk INT;
GO
UPDATE _stg_SPOT SET _nk = lSupplierPOTranKey + 1000000;
UPDATE _stg_SPOT SET lSupplierPOKey = lSupplierPOKey + 1000000;
UPDATE s SET s.lSupplierSizesKey = xw.NorthKey
FROM _stg_SPOT s JOIN _xwalk_SupplierSizes xw ON xw.SouthKey = s.lSupplierSizesKey;

DECLARE @spotCols NVARCHAR(MAX);
SELECT @spotCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_SPOT') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblSupplierPOTran' AND c1.COLUMN_NAME != 'lSupplierPOTranKey';
DECLARE @spotSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblSupplierPOTran ON; INSERT INTO tblSupplierPOTran (lSupplierPOTranKey, ' + @spotCols + ') SELECT _nk, ' + @spotCols + ' FROM _stg_SPOT; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblSupplierPOTran OFF;';
DECLARE @spotRC INT;
EXEC sp_executesql @spotSql, N'@rc INT OUTPUT', @spotRC OUTPUT;
PRINT '  tblSupplierPOTran: ' + CAST(@spotRC AS VARCHAR)
DROP TABLE _stg_SPOT;
GO

-- 3G-4: tblInventoryTran (280,188 rows, +1M offset, batched)
PRINT '  --- tblInventoryTran ---'
IF OBJECT_ID('_stg_IT') IS NOT NULL DROP TABLE _stg_IT;
SELECT * INTO _stg_IT FROM WinScopeNetNashville.dbo.tblInventoryTran;
ALTER TABLE _stg_IT ADD _nk INT;
GO
UPDATE _stg_IT SET _nk = lInventoryTranKey + 1000000;
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey
FROM _stg_IT s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey;
UPDATE _stg_IT SET lSupplierPOTranKey = lSupplierPOTranKey + 1000000 WHERE lSupplierPOTranKey > 0;
UPDATE _stg_IT SET sLotNumber = 'S-' + sLotNumber WHERE ISNULL(sLotNumber, '') != '';

DECLARE @itCols NVARCHAR(MAX);
SELECT @itCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_IT') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventoryTran' AND c1.COLUMN_NAME != 'lInventoryTranKey';
DECLARE @itSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblInventoryTran ON; INSERT INTO tblInventoryTran (lInventoryTranKey, ' + @itCols + ') SELECT _nk, ' + @itCols + ' FROM _stg_IT; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblInventoryTran OFF;';
DECLARE @itRC INT;
EXEC sp_executesql @itSql, N'@rc INT OUTPUT', @itRC OUTPUT;
PRINT '  tblInventoryTran: ' + CAST(@itRC AS VARCHAR)
DROP TABLE _stg_IT;
GO

-- 3G-5: tblLotNumberAdjustments (70,147 rows, +1M offset)
PRINT '  --- tblLotNumberAdjustments ---'
IF OBJECT_ID('_stg_LNA') IS NOT NULL DROP TABLE _stg_LNA;
SELECT * INTO _stg_LNA FROM WinScopeNetNashville.dbo.tblLotNumberAdjustments;
ALTER TABLE _stg_LNA ADD _nk INT;
GO
UPDATE _stg_LNA SET _nk = lLotNumberAdjustmentKey + 1000000;
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey
FROM _stg_LNA s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey;
UPDATE _stg_LNA SET sLotNumber = 'S-' + sLotNumber WHERE ISNULL(sLotNumber, '') != '';

DECLARE @lnaCols NVARCHAR(MAX);
SELECT @lnaCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_LNA') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblLotNumberAdjustments' AND c1.COLUMN_NAME != 'lLotNumberAdjustmentKey';
DECLARE @lnaSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblLotNumberAdjustments ON; INSERT INTO tblLotNumberAdjustments (lLotNumberAdjustmentKey, ' + @lnaCols + ') SELECT _nk, ' + @lnaCols + ' FROM _stg_LNA; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblLotNumberAdjustments OFF;';
DECLARE @lnaRC INT;
EXEC sp_executesql @lnaSql, N'@rc INT OUTPUT', @lnaRC OUTPUT;
PRINT '  tblLotNumberAdjustments: ' + CAST(@lnaRC AS VARCHAR)
DROP TABLE _stg_LNA;
GO

-- 3G-6: tblRepairInventory (236,921 rows, +1M PK offset, 3-col junction table)
PRINT '  --- tblRepairInventory ---'
IF OBJECT_ID('_stg_RI') IS NOT NULL DROP TABLE _stg_RI;
SELECT * INTO _stg_RI FROM WinScopeNetNashville.dbo.tblRepairInventory;
ALTER TABLE _stg_RI ADD _nk INT;
GO
UPDATE _stg_RI SET _nk = lRepairInventoryKey + 1000000;

DECLARE @riCols NVARCHAR(MAX);
SELECT @riCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_RI') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblRepairInventory' AND c1.COLUMN_NAME != 'lRepairInventoryKey';
DECLARE @riSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblRepairInventory ON; INSERT INTO tblRepairInventory (lRepairInventoryKey, ' + @riCols + ') SELECT _nk, ' + @riCols + ' FROM _stg_RI; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblRepairInventory OFF;';
DECLARE @riRC INT;
EXEC sp_executesql @riSql, N'@rc INT OUTPUT', @riRC OUTPUT;
PRINT '  tblRepairInventory: ' + CAST(@riRC AS VARCHAR)
DROP TABLE _stg_RI;
GO

-- 3G-7: tblRepairLotNumberAdjustments (64,172 rows, +1M offset)
PRINT '  --- tblRepairLotNumberAdjustments ---'
IF OBJECT_ID('_stg_RLNA') IS NOT NULL DROP TABLE _stg_RLNA;
SELECT * INTO _stg_RLNA FROM WinScopeNetNashville.dbo.tblRepairLotNumberAdjustments;
ALTER TABLE _stg_RLNA ADD _nk INT;
GO
UPDATE _stg_RLNA SET _nk = lInventoryAdjustmentKey + 1000000;
UPDATE _stg_RLNA SET lLotNumberAdjustmentKey = lLotNumberAdjustmentKey + 1000000 WHERE lLotNumberAdjustmentKey > 0;
UPDATE _stg_RLNA SET lSupplierPOTranKey = lSupplierPOTranKey + 1000000 WHERE lSupplierPOTranKey > 0;

DECLARE @rlnaCols NVARCHAR(MAX);
SELECT @rlnaCols = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_RLNA') c2 ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblRepairLotNumberAdjustments' AND c1.COLUMN_NAME != 'lInventoryAdjustmentKey';
DECLARE @rlnaSql NVARCHAR(MAX) = 'SET IDENTITY_INSERT tblRepairLotNumberAdjustments ON; INSERT INTO tblRepairLotNumberAdjustments (lInventoryAdjustmentKey, ' + @rlnaCols + ') SELECT _nk, ' + @rlnaCols + ' FROM _stg_RLNA; SET @rc = @@ROWCOUNT; SET IDENTITY_INSERT tblRepairLotNumberAdjustments OFF;';
DECLARE @rlnaRC INT;
EXEC sp_executesql @rlnaSql, N'@rc INT OUTPUT', @rlnaRC OUTPUT;
PRINT '  tblRepairLotNumberAdjustments: ' + CAST(@rlnaRC AS VARCHAR)
DROP TABLE _stg_RLNA;
GO

-- 3G-8: tblLotNumberLock (2,684 rows, text PK, S- prefix)
PRINT '  --- tblLotNumberLock ---'
INSERT INTO tblLotNumberLock (sLotNumber, lUserKey, lSessionID)
SELECT 'S-' + sl.sLotNumber, sl.lUserKey, sl.lSessionID
FROM WinScopeNetNashville.dbo.tblLotNumberLock sl
WHERE NOT EXISTS (SELECT 1 FROM tblLotNumberLock WHERE sLotNumber = 'S-' + sl.sLotNumber);
PRINT '  tblLotNumberLock: ' + CAST(@@ROWCOUNT AS VARCHAR)
GO

PRINT ''
PRINT '  STEP 3G COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- VERIFICATION
-- ============================================================================
PRINT ''
PRINT '>>> VERIFICATION'
SELECT '_xwalk_InventorySize' as tbl, COUNT(*) as cnt FROM _xwalk_InventorySize UNION ALL
SELECT '_xwalk_Inventory', COUNT(*) FROM _xwalk_Inventory UNION ALL
SELECT '_xwalk_SupplierSizes', COUNT(*) FROM _xwalk_SupplierSizes;

PRINT ''
PRINT '  --- Row Counts ---'
SELECT 'tblSupplierPO' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblSupplierPO) as south, (SELECT COUNT(*) FROM tblSupplierPO WHERE lSupplierPOKey >= 1000000) as north;
SELECT 'tblSupplierSizes(new)' as tbl, 0 as south, (SELECT COUNT(*) FROM tblSupplierSizes WHERE lSupplierSizesKey >= 100000) as north;
SELECT 'tblSupplierPOTran' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblSupplierPOTran) as south, (SELECT COUNT(*) FROM tblSupplierPOTran WHERE lSupplierPOTranKey >= 1000000) as north;
SELECT 'tblInventoryTran' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblInventoryTran) as south, (SELECT COUNT(*) FROM tblInventoryTran WHERE lInventoryTranKey >= 1000000) as north;
SELECT 'tblLotNumberAdjustments' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblLotNumberAdjustments) as south, (SELECT COUNT(*) FROM tblLotNumberAdjustments WHERE lLotNumberAdjustmentKey >= 1000000) as north;
SELECT 'tblRepairInventory' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblRepairInventory) as south, (SELECT COUNT(*) FROM tblRepairInventory WHERE lRepairInventoryKey >= 1000000) as north;
SELECT 'tblRepairLotNumberAdjustments' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblRepairLotNumberAdjustments) as south, (SELECT COUNT(*) FROM tblRepairLotNumberAdjustments WHERE lInventoryAdjustmentKey >= 1000000) as north;
SELECT 'tblLotNumberLock' as tbl, (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblLotNumberLock) as south, (SELECT COUNT(*) FROM tblLotNumberLock WHERE sLotNumber LIKE 'S-%') as north;
GO

PRINT ''
PRINT '================================================================'
PRINT 'NASHVILLE INVENTORY MERGE COMPLETE'
PRINT 'Finished: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT '================================================================'
