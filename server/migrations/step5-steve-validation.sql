-- ============================================================================
-- STEVE'S COMPREHENSIVE VALIDATION SCRIPT
-- WinScopeNet Database Migration — Post-Migration Tests
--
-- Server: 10.0.0.15\Goldmine (production) or localhost (dev)
-- Database: WinScopeNet
-- Purpose: Every FAIL query returns results ONLY if something is wrong.
--          No results = PASS. Sections marked [INFO] return data for review.
--
-- Run: SQLCMD -S localhost -d WinScopeNet -E -C -i server/migrations/steve-validation-tests.sql -o server/migrations/steve-test-results.txt
-- ============================================================================

SET NOCOUNT ON;
PRINT '================================================================'
PRINT 'STEVE''S COMPREHENSIVE VALIDATION'
PRINT 'Run: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT 'Server: ' + @@SERVERNAME + '  Database: ' + DB_NAME()
PRINT '================================================================'
GO

-- ============================================================================
-- 1. CROSSWALK INTEGRITY (Migration Mapping Tables)
-- ============================================================================
PRINT ''
PRINT '--- 1A. [INFO] Crosswalk Summary ---'
SELECT '_xwalk_Repair' AS Xwalk, COUNT(*) AS Rows,
       SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END) AS NullNorthKeys
FROM _xwalk_Repair
UNION ALL
SELECT '_xwalk_Scope', COUNT(*), SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_Scope
UNION ALL
SELECT '_xwalk_Inventory', COUNT(*), SUM(CASE WHEN NorthKey IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_Inventory
UNION ALL
SELECT '_xwalk_InventorySize', COUNT(*), SUM(CASE WHEN NorthSizeKey IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_InventorySize
UNION ALL
SELECT '_xwalk_Department', COUNT(*), SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_Department
UNION ALL
SELECT '_xwalk_Technician', COUNT(*), SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_Technician
UNION ALL
SELECT '_xwalk_SalesRep', COUNT(*), SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_SalesRep
UNION ALL
SELECT '_xwalk_Vendor', COUNT(*), SUM(CASE WHEN north_key IS NULL THEN 1 ELSE 0 END)
FROM _xwalk_Vendor;
GO

PRINT ''
PRINT '--- 1B. [INFO] Crosswalk Match Types ---'
SELECT '_xwalk_Repair' AS Xwalk, 'N/A' AS match_type, COUNT(*) AS Cnt FROM _xwalk_Repair
UNION ALL
SELECT '_xwalk_Scope', match_type, COUNT(*) FROM _xwalk_Scope GROUP BY match_type
UNION ALL
SELECT '_xwalk_Inventory', MatchType, COUNT(*) FROM _xwalk_Inventory GROUP BY MatchType
UNION ALL
SELECT '_xwalk_InventorySize', MatchType, COUNT(*) FROM _xwalk_InventorySize GROUP BY MatchType
UNION ALL
SELECT '_xwalk_Department', match_type, COUNT(*) FROM _xwalk_Department GROUP BY match_type
UNION ALL
SELECT '_xwalk_Technician', match_type, COUNT(*) FROM _xwalk_Technician GROUP BY match_type
UNION ALL
SELECT '_xwalk_SalesRep', match_type, COUNT(*) FROM _xwalk_SalesRep GROUP BY match_type
UNION ALL
SELECT '_xwalk_Vendor', match_type, COUNT(*) FROM _xwalk_Vendor GROUP BY match_type
ORDER BY Xwalk, match_type;
GO

PRINT ''
PRINT '--- 1C. Migrated Repairs Not in tblRepair ---'
SELECT xw.south_key, xw.north_key, xw.sWorkOrderNumber
FROM _xwalk_Repair xw
LEFT JOIN tblRepair r ON xw.north_key = r.lRepairKey
WHERE r.lRepairKey IS NULL AND xw.north_key IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: 0 orphaned repair crosswalk entries'
ELSE PRINT '  FAIL: orphaned repair crosswalk entries found'
GO

PRINT ''
PRINT '--- 1D. Migrated Scopes Not in tblScope ---'
SELECT xw.south_key, xw.north_key, xw.south_serial
FROM _xwalk_Scope xw
LEFT JOIN tblScope s ON xw.north_key = s.lScopeKey
WHERE s.lScopeKey IS NULL AND xw.north_key IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: 0 orphaned scope crosswalk entries'
ELSE PRINT '  FAIL: orphaned scope crosswalk entries found'
GO

-- ============================================================================
-- 2. HISTORICAL REPAIR DATA INTEGRITY
-- ============================================================================
PRINT ''
PRINT '--- 2A. [INFO] Repair Counts by Service Location ---'
SELECT
    sl.lServiceLocationKey,
    sl.sServiceLocation,
    sl.sTransNumberPrefix,
    COUNT(r.lRepairKey) AS TotalRepairs,
    MIN(r.dtDateIn) AS EarliestRepair,
    MAX(r.dtDateIn) AS LatestRepair
FROM tblServiceLocations sl
LEFT JOIN tblRepair r ON r.lServiceLocationKey = sl.lServiceLocationKey
GROUP BY sl.lServiceLocationKey, sl.sServiceLocation, sl.sTransNumberPrefix
ORDER BY sl.lServiceLocationKey;
GO

PRINT ''
PRINT '--- 2B. Repairs with NULL Service Location ---'
SELECT lRepairKey, sWorkOrderNumber, dtDateIn, lServiceLocationKey
FROM tblRepair
WHERE lServiceLocationKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all repairs have lServiceLocationKey'
ELSE PRINT '  FAIL: repairs with NULL lServiceLocationKey'
GO

PRINT ''
PRINT '--- 2C. Duplicate Work Order Numbers ---'
SELECT sWorkOrderNumber, COUNT(*) AS Dupes
FROM tblRepair
WHERE sWorkOrderNumber IS NOT NULL
GROUP BY sWorkOrderNumber
HAVING COUNT(*) > 1;
IF @@ROWCOUNT = 0 PRINT '  PASS: no duplicate WO numbers'
ELSE PRINT '  FAIL: duplicate WO numbers found'
GO

PRINT ''
PRINT '--- 2D. Migrated Repairs Missing Critical Fields ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.lDepartmentKey, r.lScopeKey
FROM tblRepair r
INNER JOIN _xwalk_Repair xw ON r.lRepairKey = xw.north_key
WHERE r.dtDateIn IS NULL
   OR r.lDepartmentKey IS NULL
   OR r.lScopeKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all migrated repairs have critical fields'
ELSE PRINT '  FAIL: migrated repairs missing dtDateIn/lDepartmentKey/lScopeKey'
GO

PRINT ''
PRINT '--- 2E. Orphaned Repair Item Transactions ---'
SELECT rit.lRepairItemTranKey, rit.lRepairKey
FROM tblRepairItemTran rit
LEFT JOIN tblRepair r ON rit.lRepairKey = r.lRepairKey
WHERE r.lRepairKey IS NULL AND rit.lRepairKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: no orphaned RepairItemTran'
ELSE PRINT '  FAIL: orphaned RepairItemTran rows found'
GO

PRINT ''
PRINT '--- 2F. Orphaned Status Transactions ---'
SELECT st.lStatusTranKey, st.lRepairKey
FROM tblStatusTran st
LEFT JOIN tblRepair r ON st.lRepairKey = r.lRepairKey
WHERE r.lRepairKey IS NULL AND st.lRepairKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: no orphaned StatusTran'
ELSE PRINT '  FAIL: orphaned StatusTran rows found'
GO

PRINT ''
PRINT '--- 2G. Orphaned Invoices ---'
SELECT i.lInvoiceKey, i.lRepairKey, i.sTranNumber
FROM tblInvoice i
LEFT JOIN tblRepair r ON i.lRepairKey = r.lRepairKey
WHERE r.lRepairKey IS NULL AND i.lRepairKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: no orphaned Invoices'
ELSE PRINT '  FAIL: orphaned Invoice rows found'
GO

PRINT ''
PRINT '--- 2H. Orphaned Invoice Detail Lines ---'
SELECT id.lInvoiceDetlKey, id.lInvoiceKey
FROM tblInvoiceDetl id
LEFT JOIN tblInvoice i ON id.lInvoiceKey = i.lInvoiceKey
WHERE i.lInvoiceKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: no orphaned InvoiceDetl'
ELSE PRINT '  FAIL: orphaned InvoiceDetl rows found'
GO

-- ============================================================================
-- 3. INVENTORY — NORTH/SOUTH STOCK
-- ============================================================================
PRINT ''
PRINT '--- 3A. [INFO] Inventory Level Distribution ---'
SELECT
    COUNT(*) AS TotalSizeRecords,
    SUM(CASE WHEN bActive = 1 THEN 1 ELSE 0 END) AS ActiveRecords,
    SUM(ISNULL(nLevelCurrent, 0)) AS TotalNorthOnHand,
    SUM(ISNULL(nLevelCurrentSouth, 0)) AS TotalSouthOnHand,
    SUM(ISNULL(nLevelMinimum, 0)) AS TotalNorthMin,
    SUM(ISNULL(nLevelMinimumSouth, 0)) AS TotalSouthMin,
    SUM(ISNULL(nLevelMaximum, 0)) AS TotalNorthMax,
    SUM(ISNULL(nLevelMaximumSouth, 0)) AS TotalSouthMax
FROM tblInventorySize;
GO

PRINT ''
PRINT '--- 3B. Negative Inventory North ---'
SELECT isz.lInventorySizeKey, inv.sItemDescription, isz.sSizeDescription, isz.nLevelCurrent
FROM tblInventorySize isz
JOIN tblInventory inv ON isz.lInventoryKey = inv.lInventoryKey
WHERE isz.nLevelCurrent < 0;
IF @@ROWCOUNT = 0 PRINT '  PASS: no negative North stock'
ELSE PRINT '  FAIL: negative North stock found'
GO

PRINT ''
PRINT '--- 3C. Negative Inventory South ---'
SELECT isz.lInventorySizeKey, inv.sItemDescription, isz.sSizeDescription, isz.nLevelCurrentSouth
FROM tblInventorySize isz
JOIN tblInventory inv ON isz.lInventoryKey = inv.lInventoryKey
WHERE isz.nLevelCurrentSouth < 0;
IF @@ROWCOUNT = 0 PRINT '  PASS: no negative South stock'
ELSE PRINT '  FAIL: negative South stock found'
GO

PRINT ''
PRINT '--- 3D. Orphaned InventorySize Records ---'
SELECT isz.lInventorySizeKey, isz.lInventoryKey, isz.sSizeDescription
FROM tblInventorySize isz
LEFT JOIN tblInventory inv ON isz.lInventoryKey = inv.lInventoryKey
WHERE inv.lInventoryKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: no orphaned InventorySize'
ELSE PRINT '  FAIL: orphaned InventorySize rows found'
GO

PRINT ''
PRINT '--- 3E. Crosswalk Inventory Mapped Items Missing ---'
SELECT xw.SouthKey, xw.NorthKey, xw.SouthDesc
FROM _xwalk_Inventory xw
LEFT JOIN tblInventory inv ON xw.NorthKey = inv.lInventoryKey
WHERE inv.lInventoryKey IS NULL AND xw.NorthKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all xwalk Inventory items exist in North'
ELSE PRINT '  FAIL: xwalk Inventory items missing from tblInventory'
GO

PRINT ''
PRINT '--- 3F. Crosswalk InventorySize Mapped Items Missing ---'
SELECT xw.SouthSizeKey, xw.NorthSizeKey, xw.sSupplierPartNo
FROM _xwalk_InventorySize xw
LEFT JOIN tblInventorySize isz ON xw.NorthSizeKey = isz.lInventorySizeKey
WHERE isz.lInventorySizeKey IS NULL AND xw.NorthSizeKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all xwalk InventorySize items exist in North'
ELSE PRINT '  FAIL: xwalk InventorySize items missing from tblInventorySize'
GO

PRINT ''
PRINT '--- 3G. SupplierSizes Crosswalk Mapped Items Missing ---'
SELECT xw.SouthKey, xw.NorthKey, xw.sSupplierPartNo
FROM _xwalk_SupplierSizes xw
LEFT JOIN tblSupplierSizes ss ON xw.NorthKey = ss.lSupplierSizesKey
WHERE ss.lSupplierSizesKey IS NULL AND xw.NorthKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all xwalk SupplierSizes items exist in North'
ELSE PRINT '  FAIL: xwalk SupplierSizes items missing from tblSupplierSizes'
GO

-- ============================================================================
-- 4. LOT NUMBER SYSTEM
-- ============================================================================
PRINT ''
PRINT '--- 4A. [INFO] Lot Number Summary ---'
SELECT
    COUNT(*) AS TotalLotItems,
    SUM(CASE WHEN sLotNumber IS NULL OR sLotNumber = '' THEN 1 ELSE 0 END) AS BlankLots,
    COUNT(DISTINCT sLotNumber) AS UniqueLots,
    SUM(CASE WHEN lInventoryTranKey_Used IS NULL THEN 1 ELSE 0 END) AS UnusedItems,
    SUM(CASE WHEN lInventoryTranKey_Used IS NOT NULL THEN 1 ELSE 0 END) AS UsedItems
FROM tblInventoryItems;
GO

PRINT ''
PRINT '--- 4B. Inventory Items Not Linked to Valid InventorySize ---'
SELECT ii.lInventoryItemKey, ii.lInventorySizeKey, ii.sLotNumber
FROM tblInventoryItems ii
LEFT JOIN tblInventorySize isz ON ii.lInventorySizeKey = isz.lInventorySizeKey
WHERE isz.lInventorySizeKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all InventoryItems linked to valid InventorySize'
ELSE PRINT '  FAIL: InventoryItems with invalid lInventorySizeKey'
GO

PRINT ''
PRINT '--- 4C. Inventory Items Missing Receiving Transaction ---'
SELECT ii.lInventoryItemKey, ii.lInventorySizeKey, ii.sLotNumber, ii.lInventoryTranKey_Received
FROM tblInventoryItems ii
LEFT JOIN tblInventoryTran it ON ii.lInventoryTranKey_Received = it.lInventoryTranKey
WHERE it.lInventoryTranKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all InventoryItems have valid receiving tran'
ELSE PRINT '  FAIL: InventoryItems with missing receiving transaction'
GO

PRINT ''
PRINT '--- 4D. Lot Number Adjustments Invalid InventorySize ---'
SELECT la.lLotNumberAdjustmentKey, la.lInventorySizeKey, la.sLotNumber
FROM tblLotNumberAdjustments la
LEFT JOIN tblInventorySize isz ON la.lInventorySizeKey = isz.lInventorySizeKey
WHERE isz.lInventorySizeKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all LotNumberAdjustments linked to valid InventorySize'
ELSE PRINT '  FAIL: LotNumberAdjustments with invalid lInventorySizeKey'
GO

PRINT ''
PRINT '--- 4E. Inventory Transactions Invalid InventorySize ---'
SELECT it.lInventoryTranKey, it.lInventorySizeKey, it.sLotNumber, it.dtTranDate
FROM tblInventoryTran it
LEFT JOIN tblInventorySize isz ON it.lInventorySizeKey = isz.lInventorySizeKey
WHERE isz.lInventorySizeKey IS NULL AND it.lInventorySizeKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: all InventoryTran linked to valid InventorySize'
ELSE PRINT '  FAIL: InventoryTran with invalid lInventorySizeKey'
GO

PRINT ''
PRINT '--- 4F. [INFO] Scan-Required Parts with Blank Lot Numbers (Recent) ---'
SELECT it.lInventoryTranKey, it.lInventorySizeKey, it.dtTranDate
FROM tblInventoryTran it
JOIN tblInventorySize isz ON it.lInventorySizeKey = isz.lInventorySizeKey
WHERE isz.bScanRequired = 1
  AND (it.sLotNumber IS NULL OR it.sLotNumber = '')
  AND it.dtTranDate >= '2025-01-01';
GO

-- ============================================================================
-- 5. REFERENTIAL INTEGRITY — CORE RELATIONSHIPS
-- ============================================================================
PRINT ''
PRINT '--- 5A. Repairs -> Departments ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.lDepartmentKey
FROM tblRepair r
LEFT JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
WHERE d.lDepartmentKey IS NULL AND r.lDepartmentKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Repair->Department FK intact'
ELSE PRINT '  FAIL: orphaned Repair->Department references'
GO

PRINT ''
PRINT '--- 5B. Repairs -> Scopes ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.lScopeKey
FROM tblRepair r
LEFT JOIN tblScope s ON r.lScopeKey = s.lScopeKey
WHERE s.lScopeKey IS NULL AND r.lScopeKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Repair->Scope FK intact'
ELSE PRINT '  FAIL: orphaned Repair->Scope references'
GO

PRINT ''
PRINT '--- 5C. Repairs -> Technicians ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.lTechnicianKey
FROM tblRepair r
LEFT JOIN tblTechnicians t ON r.lTechnicianKey = t.lTechnicianKey
WHERE t.lTechnicianKey IS NULL AND r.lTechnicianKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Repair->Technician FK intact'
ELSE PRINT '  FAIL: orphaned Repair->Technician references'
GO

PRINT ''
PRINT '--- 5D. Repairs -> Sales Reps ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.lSalesRepKey
FROM tblRepair r
LEFT JOIN tblSalesRep sr ON r.lSalesRepKey = sr.lSalesRepKey
WHERE sr.lSalesRepKey IS NULL AND r.lSalesRepKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Repair->SalesRep FK intact'
ELSE PRINT '  FAIL: orphaned Repair->SalesRep references'
GO

PRINT ''
PRINT '--- 5E. Repairs -> Contracts ---'
SELECT r.lRepairKey, r.sWorkOrderNumber, r.lContractKey
FROM tblRepair r
LEFT JOIN tblContract c ON r.lContractKey = c.lContractKey
WHERE c.lContractKey IS NULL AND r.lContractKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Repair->Contract FK intact'
ELSE PRINT '  FAIL: orphaned Repair->Contract references'
GO

PRINT ''
PRINT '--- 5F. Departments -> Clients ---'
SELECT d.lDepartmentKey, d.sDepartmentName, d.lClientKey
FROM tblDepartment d
LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
WHERE c.lClientKey IS NULL AND d.lClientKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Department->Client FK intact'
ELSE PRINT '  FAIL: orphaned Department->Client references'
GO

PRINT ''
PRINT '--- 5G. Scopes -> ScopeTypes ---'
SELECT s.lScopeKey, s.sSerialNumber, s.lScopeTypeKey
FROM tblScope s
LEFT JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
WHERE st.lScopeTypeKey IS NULL AND s.lScopeTypeKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: Scope->ScopeType FK intact'
ELSE PRINT '  FAIL: orphaned Scope->ScopeType references'
GO

PRINT ''
PRINT '--- 5H. Contract Scopes -> Scopes ---'
SELECT cs.lContractScopeKey, cs.lContractKey, cs.lScopeKey
FROM tblContractScope cs
LEFT JOIN tblScope s ON cs.lScopeKey = s.lScopeKey
WHERE s.lScopeKey IS NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: ContractScope->Scope FK intact'
ELSE PRINT '  FAIL: orphaned ContractScope->Scope references'
GO

PRINT ''
PRINT '--- 5I. Supplier PO Transactions -> SupplierSizes ---'
SELECT spt.lSupplierPOTranKey, spt.lSupplierSizesKey
FROM tblSupplierPOTran spt
LEFT JOIN tblSupplierSizes ss ON spt.lSupplierSizesKey = ss.lSupplierSizesKey
WHERE ss.lSupplierSizesKey IS NULL AND spt.lSupplierSizesKey IS NOT NULL;
IF @@ROWCOUNT = 0 PRINT '  PASS: SupplierPOTran->SupplierSizes FK intact'
ELSE PRINT '  FAIL: orphaned SupplierPOTran->SupplierSizes references'
GO

-- ============================================================================
-- 6. STORED PROCEDURES & DATABASE OBJECTS
-- ============================================================================
PRINT ''
PRINT '--- 6A. Confirm Critical SP Exists ---'
SELECT name FROM sys.objects
WHERE type = 'P' AND name = 'onsiteServiceRemoveInvoiceDate';
IF @@ROWCOUNT = 0 PRINT '  FAIL: onsiteServiceRemoveInvoiceDate SP missing'
ELSE PRINT '  PASS: onsiteServiceRemoveInvoiceDate exists'
GO

PRINT ''
PRINT '--- 6B. [INFO] Stored Procedure Count ---'
SELECT COUNT(*) AS TotalSPs FROM sys.objects WHERE type = 'P';
GO

PRINT ''
PRINT '--- 6C. SP Recompile Check (broken = prints) ---'
DECLARE @sp NVARCHAR(500);
DECLARE sp_cursor CURSOR FOR
    SELECT QUOTENAME(SCHEMA_NAME(schema_id)) + '.' + QUOTENAME(name)
    FROM sys.procedures;
OPEN sp_cursor;
FETCH NEXT FROM sp_cursor INTO @sp;
WHILE @@FETCH_STATUS = 0
BEGIN
    BEGIN TRY
        EXEC sp_recompile @sp;
    END TRY
    BEGIN CATCH
        PRINT '  BROKEN: ' + @sp + ' - ' + ERROR_MESSAGE();
    END CATCH
    FETCH NEXT FROM sp_cursor INTO @sp;
END
CLOSE sp_cursor;
DEALLOCATE sp_cursor;
PRINT '  SP recompile scan complete'
GO

-- ============================================================================
-- 7. USER & PERMISSION VALIDATION
-- ============================================================================
PRINT ''
PRINT '--- 7A. [INFO] Active Users with Nashville Access ---'
SELECT lUserKey, sUserName, sUserFullName, bNorthUser, bNashvilleAccess, bActive
FROM tblUsers
WHERE bActive = 1
ORDER BY bNorthUser, sUserFullName;
GO

PRINT ''
PRINT '--- 7B. Active Users with No Security Group ---'
SELECT u.lUserKey, u.sUserName, u.sUserFullName
FROM tblUsers u
LEFT JOIN tblUserSecurityGroup usg ON u.lUserKey = usg.lUserKey
WHERE usg.lUserKey IS NULL AND u.bActive = 1;
IF @@ROWCOUNT = 0 PRINT '  PASS: all active users have security groups'
ELSE PRINT '  REVIEW: active users without security groups'
GO

-- ============================================================================
-- 8. GP INTEGRATION HEALTH
-- ============================================================================
PRINT ''
PRINT '--- 8A. [INFO] GP Invoice Staging Status ---'
SELECT
    COUNT(*) AS TotalStaged,
    SUM(CASE WHEN bProcessed = 0 THEN 1 ELSE 0 END) AS Unprocessed,
    SUM(CASE WHEN oErrorState IS NOT NULL AND oErrorState <> 0 THEN 1 ELSE 0 END) AS Errors
FROM tblGP_InvoiceStaging;
GO

PRINT ''
PRINT '--- 8B. [INFO] Recent GP Integration Errors ---'
SELECT TOP 20 GPIntegrationErrorID, GPIntegrationRoutine, lOwnerKey, sOwnerType,
       oErrorState, LEFT(oErrorString, 200) AS ErrorSnippet
FROM tblGPIntegrationErrors
ORDER BY GPIntegrationErrorID DESC;
GO

PRINT ''
PRINT '--- 8C. [INFO] Active Departments with No GP ID ---'
SELECT d.lDepartmentKey, c.sClientName1, d.sDepartmentName, d.sGPID, d.sGPIDSouth
FROM tblDepartment d
JOIN tblClient c ON d.lClientKey = c.lClientKey
WHERE d.bActive = 1
  AND (d.sGPID IS NULL OR d.sGPID = '')
  AND (d.sGPIDSouth IS NULL OR d.sGPIDSouth = '');
GO

-- ============================================================================
-- 9. INDEX & CONSTRAINT HEALTH
-- ============================================================================
PRINT ''
PRINT '--- 9A. Disabled Indexes ---'
SELECT OBJECT_NAME(object_id) AS TableName, name AS IndexName, type_desc
FROM sys.indexes WHERE is_disabled = 1;
IF @@ROWCOUNT = 0 PRINT '  PASS: no disabled indexes'
ELSE PRINT '  FAIL: disabled indexes found'
GO

PRINT ''
PRINT '--- 9B. Disabled/Untrusted Constraints ---'
SELECT OBJECT_NAME(parent_object_id) AS TableName, name AS ConstraintName,
       type_desc, is_disabled, is_not_trusted
FROM sys.check_constraints WHERE is_disabled = 1 OR is_not_trusted = 1
UNION ALL
SELECT OBJECT_NAME(parent_object_id), name, type_desc, is_disabled, is_not_trusted
FROM sys.foreign_keys WHERE is_disabled = 1 OR is_not_trusted = 1;
IF @@ROWCOUNT = 0 PRINT '  PASS: no disabled/untrusted constraints'
ELSE PRINT '  REVIEW: disabled or untrusted constraints found'
GO

-- Note: 9C (REBUILD ALL INDEXES) is destructive and should only run
-- after all validation passes, before go-live. Skipping in automated test.
-- To run manually: EXEC sp_MSforeachtable 'ALTER INDEX ALL ON ? REBUILD';

-- ============================================================================
-- SUMMARY
-- ============================================================================
PRINT ''
PRINT '================================================================'
PRINT 'COMPREHENSIVE VALIDATION COMPLETE'
PRINT 'Finished: ' + CONVERT(VARCHAR, GETDATE(), 120)
PRINT ''
PRINT 'PASS/FAIL CHECKLIST (0 rows = PASS):'
PRINT '  1C  Migrated Repairs Not in tblRepair'
PRINT '  1D  Migrated Scopes Not in tblScope'
PRINT '  2B  Repairs with NULL lServiceLocationKey'
PRINT '  2C  Duplicate sWorkOrderNumber'
PRINT '  2D  Migrated Repairs Missing Critical Fields'
PRINT '  2E  Orphaned tblRepairItemTran'
PRINT '  2F  Orphaned tblStatusTran'
PRINT '  2G  Orphaned tblInvoice'
PRINT '  2H  Orphaned tblInvoiceDetl'
PRINT '  3B  Negative nLevelCurrent (North)'
PRINT '  3C  Negative nLevelCurrentSouth'
PRINT '  3D  Orphaned tblInventorySize'
PRINT '  3E  Crosswalk Inventory Missing'
PRINT '  3F  Crosswalk InventorySize Missing'
PRINT '  3G  Crosswalk SupplierSizes Missing'
PRINT '  4B  tblInventoryItems -> Invalid InventorySize'
PRINT '  4C  tblInventoryItems -> Missing Receiving Tran'
PRINT '  4D  tblLotNumberAdjustments -> Invalid Size'
PRINT '  4E  tblInventoryTran -> Invalid InventorySize'
PRINT '  5A  Repairs -> Departments'
PRINT '  5B  Repairs -> Scopes'
PRINT '  5C  Repairs -> Technicians'
PRINT '  5D  Repairs -> Sales Reps'
PRINT '  5E  Repairs -> Contracts'
PRINT '  5F  Departments -> Clients'
PRINT '  5G  Scopes -> ScopeTypes'
PRINT '  5H  ContractScopes -> Scopes'
PRINT '  5I  SupplierPOTran -> SupplierSizes'
PRINT '  6A  onsiteServiceRemoveInvoiceDate SP'
PRINT '  7B  Active Users No Security Group'
PRINT '  9A  Disabled Indexes'
PRINT '  9B  Disabled/Untrusted Constraints'
PRINT '================================================================'
