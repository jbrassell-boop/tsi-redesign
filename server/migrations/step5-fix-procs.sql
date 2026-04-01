-- Step 5: Fix all stored procedures referencing TSS.WinScopeNetNashville
-- Strategy: REPLACE 'TSS.WinScopeNetNashville.dbo.' with 'dbo.' in proc definitions
-- This is safe because all Nashville data is now merged into WinScopeNet.
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/step5-fix-procs.sql

PRINT '=== Step 5: Fix Cross-DB Stored Procedures ==='
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- Step 5a: Drop migration helper procs (no longer needed)
PRINT ''
PRINT '--- Dropping migration helper procs ---'

DECLARE @dropSQL NVARCHAR(MAX) = '';
SELECT @dropSQL = @dropSQL + 'DROP PROCEDURE ' + name + '; '
FROM sys.procedures
WHERE name LIKE 'move%FromSouthToNorth%'
  AND OBJECT_DEFINITION(object_id) LIKE '%TSS.%WinScopeNetNashville%';
IF LEN(@dropSQL) > 0
BEGIN
  EXEC sp_executesql @dropSQL;
  PRINT 'Migration procs dropped'
END
ELSE
  PRINT 'No migration procs to drop'
GO

-- Step 5b: Bulk-fix all remaining procs with TSS references
-- Replace TSS.WinScopeNetNashville.dbo. → dbo. (data is local now)
-- Also replace WinScopeNetNashville.dbo. → dbo. (non-linked-server variant)
PRINT ''
PRINT '--- Bulk-fixing TSS references in stored procedures ---'

DECLARE @procName NVARCHAR(256);
DECLARE @procDef NVARCHAR(MAX);
DECLARE @fixed INT = 0;
DECLARE @failed INT = 0;

DECLARE proc_cursor CURSOR FOR
  SELECT name FROM sys.procedures
  WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%WinscopeNetNashville%'
     OR OBJECT_DEFINITION(object_id) LIKE '%TSS.%WinScopeNetNashville%'
  ORDER BY name;

OPEN proc_cursor;
FETCH NEXT FROM proc_cursor INTO @procName;

WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @procDef = OBJECT_DEFINITION(OBJECT_ID(@procName));

    -- Replace all variants of the cross-DB reference
    SET @procDef = REPLACE(@procDef, 'TSS.WinscopeNetNashville.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'TSS.WinScopeNetNashville.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'TSS.winscopenetnashville.dbo.', 'dbo.');

    -- Change CREATE to ALTER
    SET @procDef = REPLACE(@procDef, 'CREATE PROCEDURE', 'ALTER PROCEDURE');
    SET @procDef = REPLACE(@procDef, 'CREATE PROC ', 'ALTER PROC ');
    SET @procDef = REPLACE(@procDef, 'CREATE   PROCEDURE', 'ALTER   PROCEDURE');

    EXEC sp_executesql @procDef;
    SET @fixed = @fixed + 1;
  END TRY
  BEGIN CATCH
    PRINT 'FAILED: ' + @procName + ' — ' + ERROR_MESSAGE();
    SET @failed = @failed + 1;
  END CATCH

  FETCH NEXT FROM proc_cursor INTO @procName;
END

CLOSE proc_cursor;
DEALLOCATE proc_cursor;

PRINT ''
PRINT 'Fixed: ' + CAST(@fixed AS VARCHAR) + ' procs'
PRINT 'Failed: ' + CAST(@failed AS VARCHAR) + ' procs'
GO

-- Step 5c: Also fix procs with WinScopeNetNashville.dbo. (without TSS prefix)
PRINT ''
PRINT '--- Fixing non-TSS Nashville references ---'

DECLARE @procName2 NVARCHAR(256);
DECLARE @procDef2 NVARCHAR(MAX);
DECLARE @fixed2 INT = 0;

DECLARE proc_cursor2 CURSOR FOR
  SELECT name FROM sys.procedures
  WHERE OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%'
     OR OBJECT_DEFINITION(object_id) LIKE '%WinscopeNetNashville.dbo.%'
  ORDER BY name;

OPEN proc_cursor2;
FETCH NEXT FROM proc_cursor2 INTO @procName2;

WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @procDef2 = OBJECT_DEFINITION(OBJECT_ID(@procName2));

    SET @procDef2 = REPLACE(@procDef2, 'WinScopeNetNashville.dbo.', 'dbo.');
    SET @procDef2 = REPLACE(@procDef2, 'WinscopeNetNashville.dbo.', 'dbo.');
    SET @procDef2 = REPLACE(@procDef2, 'winscopenetnashville.dbo.', 'dbo.');

    SET @procDef2 = REPLACE(@procDef2, 'CREATE PROCEDURE', 'ALTER PROCEDURE');
    SET @procDef2 = REPLACE(@procDef2, 'CREATE PROC ', 'ALTER PROC ');
    SET @procDef2 = REPLACE(@procDef2, 'CREATE   PROCEDURE', 'ALTER   PROCEDURE');

    EXEC sp_executesql @procDef2;
    SET @fixed2 = @fixed2 + 1;
  END TRY
  BEGIN CATCH
    PRINT 'FAILED: ' + @procName2 + ' — ' + ERROR_MESSAGE();
  END CATCH

  FETCH NEXT FROM proc_cursor2 INTO @procName2;
END

CLOSE proc_cursor2;
DEALLOCATE proc_cursor2;

PRINT 'Fixed: ' + CAST(@fixed2 AS VARCHAR) + ' additional procs'
GO

-- Verify: count remaining Nashville references
PRINT ''
PRINT '--- Verification ---'
SELECT COUNT(*) as remaining_tss_refs FROM sys.procedures
WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%WinScopeNetNashville%';
SELECT COUNT(*) as remaining_nashville_refs FROM sys.procedures
WHERE OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%';
GO

PRINT 'Step 5 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
