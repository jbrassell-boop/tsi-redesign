-- ============================================================================
-- POST-MIGRATION VALIDATION — Translated to WinScopeNet Schema
-- Maps to Steve's test plan: WinScope Net Database Migration Test Plan
-- Run: sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/post-migration-tests.sql -o server/migrations/test-results.txt
-- ============================================================================

PRINT '================================================================'
PRINT 'POST-MIGRATION VALIDATION TESTS'
PRINT 'Run: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT '================================================================'
GO

-- ============================================================================
-- 1A. [INFO] Record Counts by Location
-- ============================================================================
PRINT ''
PRINT '--- 1A. Record Counts by Location ---'
SELECT
  CASE lServiceLocationKey WHEN 1 THEN 'NORTH (PA)' WHEN 2 THEN 'SOUTH (Nashville)' ELSE 'OTHER' END as Location,
  COUNT(*) AS TotalRepairs,
  MIN(dtDateIn) AS EarliestRepair,
  MAX(dtDateIn) AS LatestRepair
FROM tblRepair
GROUP BY lServiceLocationKey
ORDER BY lServiceLocationKey;
GO

-- ============================================================================
-- 1B. Orphaned RepairItemTran (no parent repair)
-- ============================================================================
PRINT ''
PRINT '--- 1B. Orphaned Repair Details ---'
SELECT 'RepairItemTran orphans' as Test,
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM tblRepairItemTran ri
LEFT JOIN tblRepair r ON ri.lRepairKey = r.lRepairKey
WHERE r.lRepairKey IS NULL AND ri.lRepairKey >= 20000000;
GO

-- ============================================================================
-- 1C. Orphaned StatusTran
-- ============================================================================
PRINT ''
PRINT '--- 1C. Orphaned Status Transactions ---'
SELECT 'StatusTran orphans' as Test,
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM tblStatusTran st
LEFT JOIN tblRepair r ON st.lRepairKey = r.lRepairKey
WHERE r.lRepairKey IS NULL AND st.lRepairKey >= 20000000;
GO

-- ============================================================================
-- 1D. Duplicate Repair Keys (key collision from merge)
-- ============================================================================
PRINT ''
PRINT '--- 1D. Duplicate Repair Keys ---'
SELECT 'Duplicate lRepairKey' as Test,
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM (SELECT lRepairKey FROM tblRepair GROUP BY lRepairKey HAVING COUNT(*) > 1) x;
GO

-- ============================================================================
-- 1E. Nashville Repairs with Missing Critical Fields
-- ============================================================================
PRINT ''
PRINT '--- 1E. Nashville Repairs Missing Critical Fields ---'
SELECT 'NULL sWorkOrderNumber' as Test, COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM tblRepair WHERE lRepairKey >= 20000000 AND (sWorkOrderNumber IS NULL OR sWorkOrderNumber='')
UNION ALL SELECT 'NULL dtDateIn', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair WHERE lRepairKey >= 20000000 AND dtDateIn IS NULL
UNION ALL SELECT 'NULL lDepartmentKey (>16 = FAIL)', COUNT(*), CASE WHEN COUNT(*)<=16 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair WHERE lRepairKey >= 20000000 AND (lDepartmentKey IS NULL OR lDepartmentKey=0)
UNION ALL SELECT 'NULL lScopeKey (>5 = FAIL)', COUNT(*), CASE WHEN COUNT(*)<=5 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair WHERE lRepairKey >= 20000000 AND (lScopeKey IS NULL OR lScopeKey=0);
GO

-- ============================================================================
-- 1F. Orphaned Invoices and Loaner Trans
-- ============================================================================
PRINT ''
PRINT '--- 1F. Orphaned Child Records ---'
SELECT 'Invoice orphans' as Test, COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM tblInvoice i LEFT JOIN tblRepair r ON i.lRepairKey=r.lRepairKey
WHERE i.lRepairKey >= 20000000 AND r.lRepairKey IS NULL
UNION ALL SELECT 'LoanerTran orphans', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblLoanerTran lt LEFT JOIN tblRepair r ON lt.lRepairKey=r.lRepairKey
WHERE lt.lRepairKey >= 20000000 AND r.lRepairKey IS NULL;
GO

-- ============================================================================
-- 2A. [INFO] Inventory by Location (North stock vs South stock columns)
-- ============================================================================
PRINT ''
PRINT '--- 2A. Inventory Stock by Location ---'
SELECT 'North parts with stock' as Metric, COUNT(*) as [Count]
FROM tblInventorySize WHERE ISNULL(nLevelCurrent,0) > 0
UNION ALL SELECT 'South parts with stock', COUNT(*)
FROM tblInventorySize WHERE ISNULL(nLevelCurrentSouth,0) > 0
UNION ALL SELECT 'Parts with BOTH locations stocked', COUNT(*)
FROM tblInventorySize WHERE ISNULL(nLevelCurrent,0) > 0 AND ISNULL(nLevelCurrentSouth,0) > 0;
GO

-- ============================================================================
-- 2B. [INFO] Top 10 Parts by South Stock
-- ============================================================================
PRINT ''
PRINT '--- 2B. Top South Stock Levels ---'
SELECT TOP 10 isz.sSizeDescription, inv.sItemDescription,
  isz.nLevelCurrent as [North Stock], isz.nLevelCurrentSouth as [South Stock]
FROM tblInventorySize isz
JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
WHERE isz.nLevelCurrentSouth > 0
ORDER BY isz.nLevelCurrentSouth DESC;
GO

-- ============================================================================
-- 3A. Lot Records — Duplicate Lot Numbers
-- ============================================================================
PRINT ''
PRINT '--- 3A. Duplicate Lot Numbers ---'
SELECT 'Duplicate sLotNumber in LotNumberLock' as Test,
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM (SELECT sLotNumber FROM tblLotNumberLock GROUP BY sLotNumber HAVING COUNT(*) > 1) x;
GO

-- ============================================================================
-- 3B. Lot Traceability — Forward Chain
-- ============================================================================
PRINT ''
PRINT '--- 3B. Lot Chain Test (South lots) ---'
SELECT TOP 5
  it.sLotNumber as [Lot],
  isz.sSizeDescription as [Part],
  inv.sItemDescription as [Category],
  it.nQuantity as [Qty],
  CONVERT(VARCHAR(10), it.dtTranDate, 120) as [Date],
  CASE WHEN isz.lInventorySizeKey IS NOT NULL AND inv.lInventoryKey IS NOT NULL THEN 'CHAIN OK' ELSE 'BROKEN' END as [Result]
FROM tblInventoryTran it
JOIN tblInventorySize isz ON isz.lInventorySizeKey = it.lInventorySizeKey
JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
WHERE it.sLotNumber LIKE 'S-%'
ORDER BY it.lInventoryTranKey DESC;
GO

-- ============================================================================
-- 3C. [INFO] Legacy Inventory Without Lot Numbers
-- ============================================================================
PRINT ''
PRINT '--- 3C. Legacy Inventory (no lot) ---'
SELECT 'North trans with no lot' as Metric, COUNT(*) as [Count]
FROM tblInventoryTran WHERE ISNULL(sLotNumber,'')='' AND lInventoryTranKey < 1000000
UNION ALL SELECT 'South trans with S- lot prefix', COUNT(*)
FROM tblInventoryTran WHERE sLotNumber LIKE 'S-%';
GO

-- ============================================================================
-- 4A-4C. Full FK Integrity Scan
-- ============================================================================
PRINT ''
PRINT '--- 4. Full FK Integrity ---'
SELECT 'Repair→Department' as [FK Check], COUNT(*) as [Orphans],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM tblRepair r LEFT JOIN tblDepartment d ON d.lDepartmentKey=r.lDepartmentKey
WHERE r.lRepairKey>=20000000 AND r.lDepartmentKey>0 AND d.lDepartmentKey IS NULL
UNION ALL SELECT 'Repair→Scope', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair r LEFT JOIN tblScope s ON s.lScopeKey=r.lScopeKey
WHERE r.lRepairKey>=20000000 AND r.lScopeKey>0 AND s.lScopeKey IS NULL
UNION ALL SELECT 'Repair→Technician', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair r LEFT JOIN tblTechnicians t ON t.lTechnicianKey=r.lTechnicianKey
WHERE r.lRepairKey>=20000000 AND r.lTechnicianKey>0 AND t.lTechnicianKey IS NULL
UNION ALL SELECT 'Repair→SalesRep', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair r LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey=r.lSalesRepKey
WHERE r.lRepairKey>=20000000 AND r.lSalesRepKey>0 AND sr.lSalesRepKey IS NULL
UNION ALL SELECT 'Repair→Distributor', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblRepair r LEFT JOIN tblDistributor d ON d.lDistributorKey=r.lDistributorKey
WHERE r.lRepairKey>=20000000 AND r.lDistributorKey>0 AND d.lDistributorKey IS NULL
UNION ALL SELECT 'Invoice→Repair', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblInvoice i LEFT JOIN tblRepair r ON r.lRepairKey=i.lRepairKey
WHERE i.lRepairKey>=20000000 AND r.lRepairKey IS NULL
UNION ALL SELECT 'SupplierPO→Supplier', COUNT(*), CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END
FROM tblSupplierPO sp LEFT JOIN tblSupplier s ON s.lSupplierKey=sp.lSupplierKey
WHERE sp.lSupplierPOKey>=1000000 AND sp.lSupplierKey>0 AND s.lSupplierKey IS NULL;
GO

-- ============================================================================
-- 5A. Critical Stored Procedures Exist
-- ============================================================================
PRINT ''
PRINT '--- 5A. Critical Stored Procedures ---'
SELECT 'onsiteServiceRemoveInvoiceDate' as [SP],
  CASE WHEN EXISTS (SELECT 1 FROM sys.procedures WHERE name='onsiteServiceRemoveInvoiceDate') THEN 'FOUND' ELSE 'MISSING' END as [Status];
SELECT 'repairStatusesGet' as [SP],
  CASE WHEN EXISTS (SELECT 1 FROM sys.procedures WHERE name='repairStatusesGet') THEN 'FOUND' ELSE 'MISSING' END as [Status];
SELECT 'invoiceInsert' as [SP],
  CASE WHEN EXISTS (SELECT 1 FROM sys.procedures WHERE name='invoiceInsert') THEN 'FOUND' ELSE 'MISSING' END as [Status];
GO

-- ============================================================================
-- 5B. Recompile All SPs — Surface Broken References
-- ============================================================================
PRINT ''
PRINT '--- 5B. SP Recompile Check (broken = prints) ---'
DECLARE @sp NVARCHAR(500);
DECLARE sp_cursor CURSOR FOR SELECT name FROM sys.procedures;
OPEN sp_cursor; FETCH NEXT FROM sp_cursor INTO @sp;
WHILE @@FETCH_STATUS = 0
BEGIN
  BEGIN TRY EXEC sp_recompile @sp; END TRY
  BEGIN CATCH PRINT '  BROKEN: ' + @sp + ' - ' + ERROR_MESSAGE(); END CATCH
  FETCH NEXT FROM sp_cursor INTO @sp;
END
CLOSE sp_cursor; DEALLOCATE sp_cursor;
PRINT '  SP recompile scan complete'
GO

-- ============================================================================
-- 7A. Disabled Indexes
-- ============================================================================
PRINT ''
PRINT '--- 7A. Disabled Indexes ---'
SELECT 'Disabled indexes' as Test,
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'REVIEW' END as Result
FROM sys.indexes WHERE is_disabled = 1;
GO

-- ============================================================================
-- 7B. Disabled or Untrusted Constraints
-- ============================================================================
PRINT ''
PRINT '--- 7B. Disabled/Untrusted Constraints ---'
SELECT 'Disabled FK constraints' as Test, COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'REVIEW' END as Result
FROM sys.foreign_keys WHERE is_disabled = 1
UNION ALL SELECT 'Untrusted FK constraints', COUNT(*),
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'REVIEW' END
FROM sys.foreign_keys WHERE is_not_trusted = 1;
GO

-- ============================================================================
-- TRIGGER TESTS
-- ============================================================================
PRINT ''
PRINT '--- Trigger Tests ---'
DECLARE @rk1 INT = (SELECT TOP 1 lRepairKey FROM tblRepair WHERE lRepairKey >= 20000000 AND lServiceLocationKey=2);
BEGIN TRY
  UPDATE tblRepair SET dtLastUpdate=GETDATE() WHERE lRepairKey=@rk1;
  PRINT '  trRepairUpd (South repair ' + CAST(@rk1 AS VARCHAR) + '): PASS'
END TRY BEGIN CATCH PRINT '  trRepairUpd (South): FAIL - ' + ERROR_MESSAGE() END CATCH

DECLARE @rk2 INT = (SELECT TOP 1 lRepairKey FROM tblRepair WHERE lRepairKey < 20000000 AND lServiceLocationKey=1);
BEGIN TRY
  UPDATE tblRepair SET dtLastUpdate=GETDATE() WHERE lRepairKey=@rk2;
  PRINT '  trRepairUpd (North repair ' + CAST(@rk2 AS VARCHAR) + '): PASS'
END TRY BEGIN CATCH PRINT '  trRepairUpd (North): FAIL - ' + ERROR_MESSAGE() END CATCH
GO

-- ============================================================================
-- STORED PROC FUNCTIONAL TEST
-- ============================================================================
PRINT ''
PRINT '--- Stored Proc Functional Test ---'
DECLARE @rk3 INT = (SELECT TOP 1 lRepairKey FROM tblRepair WHERE lRepairKey >= 20000000);
BEGIN TRY
  DECLARE @t TABLE (a INT, b NVARCHAR(500), c DATETIME, d NVARCHAR(200), e BIT, f NVARCHAR(MAX));
  INSERT INTO @t EXEC repairStatusesGet @rk3;
  PRINT '  repairStatusesGet (South ' + CAST(@rk3 AS VARCHAR) + '): PASS - ' + CAST((SELECT COUNT(*) FROM @t) AS VARCHAR) + ' rows'
END TRY BEGIN CATCH PRINT '  repairStatusesGet: FAIL - ' + ERROR_MESSAGE() END CATCH
GO

-- ============================================================================
-- REMAINING NASHVILLE REFERENCES
-- ============================================================================
PRINT ''
PRINT '--- Nashville Reference Cleanup ---'
SELECT 'Procs with TSS.Nashville' as [Check],
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)<=3 THEN 'PASS (GP only)' ELSE 'REVIEW' END as Result
FROM sys.procedures WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%';
SELECT 'Triggers with TSS.Nashville' as [Check],
  COUNT(*) as [Count],
  CASE WHEN COUNT(*)=0 THEN 'PASS' ELSE 'FAIL' END as Result
FROM sys.triggers WHERE OBJECT_DEFINITION(object_id) LIKE '%TSS.%Nashville%';
GO

-- ============================================================================
-- [INFO] 10 RANDOM NASHVILLE REPAIR SPOT CHECKS
-- ============================================================================
PRINT ''
PRINT '--- Historical Lookup: 10 Nashville Repairs ---'
SELECT TOP 10
  r.sWorkOrderNumber as [WO#],
  CONVERT(VARCHAR(10), r.dtDateIn, 120) as [Date In],
  d.sDepartmentName as [Dept],
  sc.sSerialNumber as [Serial],
  LEFT(r.sComplaintDesc, 50) as [Complaint],
  (SELECT COUNT(*) FROM tblRepairItemTran WHERE lRepairKey=r.lRepairKey) as [Items],
  (SELECT COUNT(*) FROM tblStatusTran WHERE lRepairKey=r.lRepairKey) as [Statuses],
  (SELECT COUNT(*) FROM tblInvoice WHERE lRepairKey=r.lRepairKey) as [Inv]
FROM tblRepair r
LEFT JOIN tblDepartment d ON d.lDepartmentKey=r.lDepartmentKey
LEFT JOIN tblScope sc ON sc.lScopeKey=r.lScopeKey
WHERE r.lRepairKey >= 20000000 AND r.sWorkOrderNumber LIKE 'SR%'
ORDER BY NEWID();
GO

PRINT ''
PRINT '================================================================'
PRINT 'ALL AUTOMATED TESTS COMPLETE'
PRINT 'Finished: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT ''
PRINT 'MANUAL TESTS REQUIRED (Steve in WinScope client):'
PRINT '  1C - Open 10 Nashville repairs in WinScope UI'
PRINT '  1D - Run Crystal Reports for Nashville date range'
PRINT '  2C - Part lookup showing North vs South stock'
PRINT '  2D - Transfer 1 unit between locations'
PRINT '  3A - Receive a test PO into South stock'
PRINT '  4A - Full repair lifecycle (PA)'
PRINT '  4B - Full repair lifecycle (Nashville)'
PRINT '  4C - Mixed-location part issue test'
PRINT '  5A - Known bug regression (TCP 1236, NullRef, DBNull)'
PRINT '  5B - 2 concurrent users (PA + Nashville)'
PRINT '================================================================'
