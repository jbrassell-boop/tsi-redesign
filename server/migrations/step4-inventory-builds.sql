-- Step 4: Migrate InventorySizeBuild (recipe) tables from Nashville
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/step4-inventory-builds.sql

PRINT '=== Step 4: InventorySizeBuild Migration ==='
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- tblInventorySizeBuild (2,825 South rows)
-- Identity: lInventorySizeBuildKey, Offset: +100,000
-- FKs: lInventorySizeKey → _xwalk_InventorySize, lTechnicianKey → _xwalk_Technician
-- ============================================================================
PRINT ''
PRINT '--- tblInventorySizeBuild ---'

IF OBJECT_ID('_stg_Build') IS NOT NULL DROP TABLE _stg_Build;
SELECT * INTO _stg_Build FROM WinScopeNetNashville.dbo.tblInventorySizeBuild;
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg_Build ADD _nk INT;
UPDATE _stg_Build SET _nk = lInventorySizeBuildKey + 100000;

-- Remap FKs
UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey
FROM _stg_Build s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey
WHERE s.lInventorySizeKey > 0;

UPDATE s SET s.lTechnicianKey = xt.north_key
FROM _stg_Build s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey
WHERE s.lTechnicianKey > 0;

-- Zero out unmatched techs
UPDATE _stg_Build SET lTechnicianKey = 0
WHERE lTechnicianKey > 0
  AND NOT EXISTS (SELECT 1 FROM tblTechnicians WHERE lTechnicianKey = _stg_Build.lTechnicianKey);
PRINT 'FKs remapped, unmatched techs zeroed: ' + CAST(@@ROWCOUNT AS VARCHAR)

-- Dynamic INSERT
DECLARE @cols1 NVARCHAR(MAX), @sql1 NVARCHAR(MAX);
SELECT @cols1 = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_Build') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventorySizeBuild'
  AND c1.COLUMN_NAME != 'lInventorySizeBuildKey';

SET @sql1 = 'SET IDENTITY_INSERT tblInventorySizeBuild ON; ' +
  'INSERT INTO tblInventorySizeBuild (lInventorySizeBuildKey, ' + @cols1 + ') ' +
  'SELECT _nk, ' + @cols1 + ' FROM _stg_Build; ' +
  'SET IDENTITY_INSERT tblInventorySizeBuild OFF;';
EXEC sp_executesql @sql1;
PRINT 'Inserted builds: ' + CAST(@@ROWCOUNT AS VARCHAR)

DROP TABLE _stg_Build;
PRINT 'tblInventorySizeBuild DONE'
GO

-- ============================================================================
-- tblInventorySizeBuildItems (31,346 South rows)
-- Identity: lInventorySizeBuildItemKey, Offset: +100,000
-- FKs: lInventorySizeBuildKey → offset +100,000, lInventorySizeKey → _xwalk_InventorySize
-- ============================================================================
PRINT ''
PRINT '--- tblInventorySizeBuildItems ---'

IF OBJECT_ID('_stg_Items') IS NOT NULL DROP TABLE _stg_Items;
SELECT * INTO _stg_Items FROM WinScopeNetNashville.dbo.tblInventorySizeBuildItems;
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR)

ALTER TABLE _stg_Items ADD _nk INT;
UPDATE _stg_Items SET _nk = lInventorySizeBuildItemKey + 100000;

-- Remap FKs
UPDATE _stg_Items SET lInventorySizeBuildKey = lInventorySizeBuildKey + 100000;

UPDATE s SET s.lInventorySizeKey = xw.NorthSizeKey
FROM _stg_Items s JOIN _xwalk_InventorySize xw ON xw.SouthSizeKey = s.lInventorySizeKey
WHERE s.lInventorySizeKey > 0;

PRINT 'FKs remapped'

-- Dynamic INSERT
DECLARE @cols2 NVARCHAR(MAX), @sql2 NVARCHAR(MAX);
SELECT @cols2 = STRING_AGG(c1.COLUMN_NAME, ', ')
FROM INFORMATION_SCHEMA.COLUMNS c1
JOIN (SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_NAME = '_stg_Items') c2
  ON c2.COLUMN_NAME = c1.COLUMN_NAME
WHERE c1.TABLE_NAME = 'tblInventorySizeBuildItems'
  AND c1.COLUMN_NAME != 'lInventorySizeBuildItemKey';

SET @sql2 = 'SET IDENTITY_INSERT tblInventorySizeBuildItems ON; ' +
  'INSERT INTO tblInventorySizeBuildItems (lInventorySizeBuildItemKey, ' + @cols2 + ') ' +
  'SELECT _nk, ' + @cols2 + ' FROM _stg_Items; ' +
  'SET IDENTITY_INSERT tblInventorySizeBuildItems OFF;';
EXEC sp_executesql @sql2;
PRINT 'Inserted items: ' + CAST(@@ROWCOUNT AS VARCHAR)

DROP TABLE _stg_Items;
PRINT 'tblInventorySizeBuildItems DONE'
GO

-- Verify
PRINT ''
PRINT '--- Verification ---'
SELECT 'tblInventorySizeBuild' as tbl,
  (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblInventorySizeBuild) as south,
  (SELECT COUNT(*) FROM tblInventorySizeBuild WHERE lInventorySizeBuildKey >= 100000) as north_migrated;
SELECT 'tblInventorySizeBuildItems' as tbl,
  (SELECT COUNT(*) FROM WinScopeNetNashville.dbo.tblInventorySizeBuildItems) as south,
  (SELECT COUNT(*) FROM tblInventorySizeBuildItems WHERE lInventorySizeBuildItemKey >= 100000) as north_migrated;
GO

PRINT 'Step 4 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
