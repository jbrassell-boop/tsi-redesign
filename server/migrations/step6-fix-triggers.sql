-- Step 6: Fix triggers referencing Nashville/TSS linked server
-- Only 3 triggers have actual cross-DB queries (TSS.WinScopeNetNashville)
-- The other 5 just have IF DB_NAME()='WinScopeNetNashville' dead code — harmless
-- Run via: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/step6-fix-triggers.sql

PRINT '=== Step 6: Fix Nashville Triggers ==='
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)
GO

-- ============================================================================
-- Fix 1: trRepairUpd — line 203 queries TSS.WinScopeNetNashville.dbo.tblSalesRep
-- Change to: query local tblSalesRep (sales reps are now merged)
-- ============================================================================
PRINT ''
PRINT '--- Fixing trRepairUpd ---'

-- The trigger is 324 lines. We only need to change line 203.
-- Strategy: read the trigger definition, replace the TSS reference, ALTER TRIGGER

DECLARE @def1 NVARCHAR(MAX);
SET @def1 = OBJECT_DEFINITION(OBJECT_ID('trRepairUpd'));

-- Replace cross-DB query with local query
SET @def1 = REPLACE(@def1,
  'Select @SalesRepEmail = sr.sRepEMail From TSS.WinscopeNetNashville.dbo.tblSalesRep sr Where sr.lSalesRepKey = @lSalesRepKey',
  'Select @SalesRepEmail = sr.sRepEMail From dbo.tblSalesRep sr Where sr.lSalesRepKey = @lSalesRepKey');

-- Also fix the profile name check — Nashville profile no longer needed
-- Line 216-217: If @DBName = 'WinScopeNetNashville' Set @ProfileName = 'TSS Profile'
-- Change to: If @lRepairServiceLocationKey = 2 Set @ProfileName = 'TSS Profile'
SET @def1 = REPLACE(@def1,
  'If @DBName = ''WinScopeNetNashville''',
  'If @lRepairServiceLocationKey = 2');

-- Change CREATE TRIGGER to ALTER TRIGGER
SET @def1 = REPLACE(@def1, 'CREATE TRIGGER', 'ALTER TRIGGER');

EXEC sp_executesql @def1;
PRINT 'trRepairUpd fixed'
GO

-- ============================================================================
-- Fix 2: trInvoiceUpdateCustomerSince — queries TSS.WinScopeNetNashville.dbo.tblInvoice
-- Change to: query local tblInvoice (invoices are now merged)
-- ============================================================================
PRINT ''
PRINT '--- Fixing trInvoiceUpdateCustomerSince ---'

DECLARE @def2 NVARCHAR(MAX);
SET @def2 = OBJECT_DEFINITION(OBJECT_ID('trInvoiceUpdateCustomerSince'));

-- Replace cross-DB invoice query with local query
-- Old: From TSS.WinscopeNetNashville.dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink
-- New: From dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink
SET @def2 = REPLACE(@def2,
  'From TSS.WinscopeNetNashville.dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink',
  'From dbo.tblInvoice Where lDepartmentKey = @lDeptKeyLink');

SET @def2 = REPLACE(@def2, 'CREATE TRIGGER', 'ALTER TRIGGER');

EXEC sp_executesql @def2;
PRINT 'trInvoiceUpdateCustomerSince fixed'
GO

-- ============================================================================
-- Fix 3: trPortalTrackingNumbersInsert — queries TSS.WinScopeNetNashville.dbo.tblSalesRep
-- Change to: query local tblSalesRep
-- ============================================================================
PRINT ''
PRINT '--- Fixing trPortalTrackingNumbersInsert ---'

DECLARE @def3 NVARCHAR(MAX);
SET @def3 = OBJECT_DEFINITION(OBJECT_ID('trPortalTrackingNumbersInsert'));

-- Replace cross-DB sales rep query
SET @def3 = REPLACE(@def3,
  'From TSS.WinscopeNetNashville.dbo.tblSalesRep sr',
  'From dbo.tblSalesRep sr');

-- Also update the DB name check to use service location
SET @def3 = REPLACE(@def3,
  'If UPPER(@DBName)=''WINSCOPENETNASHVILLE''',
  'If 1=0 -- Nashville DB check disabled post-merge');

SET @def3 = REPLACE(@def3, 'CREATE TRIGGER', 'ALTER TRIGGER');

EXEC sp_executesql @def3;
PRINT 'trPortalTrackingNumbersInsert fixed'
GO

-- ============================================================================
-- Verify: test trRepairUpd by checking it doesn't error on a South repair
-- ============================================================================
PRINT ''
PRINT '--- Verification: test trigger on South repair ---'

-- Find a migrated South repair
DECLARE @testKey INT;
SELECT TOP 1 @testKey = lRepairKey FROM tblRepair WHERE lRepairKey >= 20000000 AND lServiceLocationKey = 2;

IF @testKey IS NOT NULL
BEGIN
  PRINT 'Testing trRepairUpd with South repair key: ' + CAST(@testKey AS VARCHAR)
  -- Do a harmless UPDATE that fires the trigger
  BEGIN TRY
    UPDATE tblRepair SET dtLastUpdate = GETDATE() WHERE lRepairKey = @testKey;
    PRINT 'trRepairUpd: PASS (no error on South repair update)'
  END TRY
  BEGIN CATCH
    PRINT 'trRepairUpd: FAIL — ' + ERROR_MESSAGE()
  END CATCH
END
ELSE
  PRINT 'No South repair found for testing'
GO

PRINT ''
PRINT 'Step 6 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)
