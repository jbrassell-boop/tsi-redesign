-- Step 5 Round 2: Fix procs that also reference TSI linked server
-- These have both TSS.Nashville and TSI.WinScopeNet references
-- Replace TSI.WinScopeNet.dbo. → dbo. as well
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/step5-fix-procs-round2.sql

PRINT '=== Step 5 Round 2: Fix remaining TSI/TSS linked server references ==='
GO

DECLARE @procName NVARCHAR(256);
DECLARE @procDef NVARCHAR(MAX);
DECLARE @fixed INT = 0;
DECLARE @failed INT = 0;

DECLARE proc_cursor CURSOR FOR
  SELECT name FROM sys.procedures
  WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%'
     OR OBJECT_DEFINITION(object_id) LIKE '%TSI.%WinScopeNet%'
     OR OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%'
  ORDER BY name;

OPEN proc_cursor;
FETCH NEXT FROM proc_cursor INTO @procName;

WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY
    SET @procDef = OBJECT_DEFINITION(OBJECT_ID(@procName));

    -- Replace ALL linked server + cross-DB references with local
    SET @procDef = REPLACE(@procDef, 'TSS.WinscopeNetNashville.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'TSS.WinScopeNetNashville.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'TSI.WinScopeNet.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'TSI.WinscopeNet.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'WinScopeNetNashville.dbo.', 'dbo.');
    SET @procDef = REPLACE(@procDef, 'WinscopeNetNashville.dbo.', 'dbo.');
    -- Also handle GP linked server in gpInvoiceExistsInGP if present
    -- (skip GP refs — those are a different system)

    -- Change CREATE to ALTER
    SET @procDef = REPLACE(@procDef, 'CREATE PROCEDURE', 'ALTER PROCEDURE');
    SET @procDef = REPLACE(@procDef, 'CREATE PROC ', 'ALTER PROC ');
    SET @procDef = REPLACE(@procDef, 'CREATE   PROCEDURE', 'ALTER   PROCEDURE');

    EXEC sp_executesql @procDef;
    SET @fixed = @fixed + 1;
  END TRY
  BEGIN CATCH
    PRINT 'FAILED: ' + @procName + ' — ' + LEFT(ERROR_MESSAGE(), 150);
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

-- Verify
SELECT COUNT(*) as remaining_tss FROM sys.procedures WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%';
SELECT COUNT(*) as remaining_tsi FROM sys.procedures WHERE OBJECT_DEFINITION(object_id) LIKE '%TSI.%WinScopeNet.dbo%';
SELECT COUNT(*) as remaining_nash FROM sys.procedures WHERE OBJECT_DEFINITION(object_id) LIKE '%WinScopeNetNashville.dbo.%';
GO

PRINT 'Step 5 Round 2 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
