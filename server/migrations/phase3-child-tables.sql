-- ============================================================================
-- Nashville Repair Migration — Phase 3: Child Table Migration (Auto-generated)
-- Generated: 2026-04-01T23:07:59.487Z
-- ============================================================================

PRINT '=== PHASE 3: Nashville Child Table Migration ==='
PRINT 'Started: ' + CONVERT(VARCHAR, GETDATE(), 120)

-- 14 Nashville repair keys NOT imported (true WO duplicates)
PRINT 'Dupe/skipped repair keys: 14 (hardcoded in WHERE clauses)';
GO

-- ============================================================================
-- tblStatusTran (333,458 rows) | PK: lStatusTranKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblStatusTran (333,458 rows) ---'
GO

IF OBJECT_ID('_stage_tblStatusTran') IS NOT NULL DROP TABLE _stage_tblStatusTran;
SELECT * INTO _stage_tblStatusTran
FROM WinScopeNetNashville.dbo.tblStatusTran
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblStatusTran ADD _newPK BIGINT;
UPDATE _stage_tblStatusTran SET _newPK = CAST(lStatusTranKey AS BIGINT) + 20000000;
UPDATE _stage_tblStatusTran SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblStatusTran NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblStatusTran DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblStatusTran ON;
INSERT INTO WinScopeNet.dbo.tblStatusTran (lStatusTranKey, lStatusKey, lRepairKey, nOrdinalID, dtCompleteDate, lUserKey, mTranComments, nAutoCompleteID, sStatusDesc, lCreateUser, dtLastUpdate, lLastUpdateUser, lCreateSessionKey, dtCreateDate, bIsVoid, lVoidUserKey, dtVoidDate)
SELECT _newPK, lStatusKey, lRepairKey, nOrdinalID, dtCompleteDate, lUserKey, mTranComments, nAutoCompleteID, sStatusDesc, lCreateUser, dtLastUpdate, lLastUpdateUser, lCreateSessionKey, dtCreateDate, bIsVoid, lVoidUserKey, dtVoidDate FROM _stage_tblStatusTran;
SET IDENTITY_INSERT WinScopeNet.dbo.tblStatusTran OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblStatusTran ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblStatusTran CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblStatusTran;
PRINT 'tblStatusTran DONE'
GO

-- ============================================================================
-- tblRepairItemTran (155,678 rows) | PK: lRepairItemTranKey +200,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblRepairItemTran (155,678 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairItemTran') IS NOT NULL DROP TABLE _stage_tblRepairItemTran;
SELECT * INTO _stage_tblRepairItemTran
FROM WinScopeNetNashville.dbo.tblRepairItemTran
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblRepairItemTran ADD _newPK BIGINT;
UPDATE _stage_tblRepairItemTran SET _newPK = CAST(lRepairItemTranKey AS BIGINT) + 200000000;
UPDATE _stage_tblRepairItemTran SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stage_tblRepairItemTran s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;
UPDATE s SET s.lTechnician2Key = xt.north_key FROM _stage_tblRepairItemTran s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnician2Key WHERE s.lTechnician2Key > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairItemTran NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairItemTran DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairItemTran ON;
INSERT INTO WinScopeNet.dbo.tblRepairItemTran (lRepairItemTranKey, lRepairKey, lRepairItemKey, lTechnicianKey, lTechnician2Key, sApproved, dblRepairPrice, dblRepairPriceBase, sComments, sTransmitted, sFixType, sProblemID, sTranID, sInHsID, sInitials, sPrimaryRepair, sUAorNWT, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, dblAvgCostMaterial, dblAvgCostLabor, dblTrueValue, lAmendRepairCommentKey, lQuantity, nRepairPriceUnitCost)
SELECT _newPK, lRepairKey, lRepairItemKey, lTechnicianKey, lTechnician2Key, sApproved, dblRepairPrice, dblRepairPriceBase, sComments, sTransmitted, sFixType, sProblemID, sTranID, sInHsID, sInitials, sPrimaryRepair, sUAorNWT, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, dblAvgCostMaterial, dblAvgCostLabor, dblTrueValue, lAmendRepairCommentKey, lQuantity, nRepairPriceUnitCost FROM _stage_tblRepairItemTran;
SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairItemTran OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairItemTran ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairItemTran CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairItemTran;
PRINT 'tblRepairItemTran DONE'
GO

-- ============================================================================
-- tblRepairStatusLog (85,094 rows) | PK: lRepairStatusLogID +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblRepairStatusLog (85,094 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairStatusLog') IS NOT NULL DROP TABLE _stage_tblRepairStatusLog;
SELECT * INTO _stage_tblRepairStatusLog
FROM WinScopeNetNashville.dbo.tblRepairStatusLog
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblRepairStatusLog ADD _newPK BIGINT;
UPDATE _stage_tblRepairStatusLog SET _newPK = CAST(lRepairStatusLogID AS BIGINT) + 20000000;
UPDATE _stage_tblRepairStatusLog SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairStatusLog NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairStatusLog DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairStatusLog ON;
INSERT INTO WinScopeNet.dbo.tblRepairStatusLog (lRepairStatusLogID, lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate)
SELECT _newPK, lRepairKey, lRepairStatusID, sRepairStatus, ChangeDate FROM _stage_tblRepairStatusLog;
SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairStatusLog OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairStatusLog ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairStatusLog CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairStatusLog;
PRINT 'tblRepairStatusLog DONE'
GO

-- ============================================================================
-- tblShipExecInvoiceChargeRepairs (276,535 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblShipExecInvoiceChargeRepairs (276,535 rows) ---'
GO

IF OBJECT_ID('_stage_tblShipExecInvoiceChargeRepairs') IS NOT NULL DROP TABLE _stage_tblShipExecInvoiceChargeRepairs;
SELECT * INTO _stage_tblShipExecInvoiceChargeRepairs
FROM WinScopeNetNashville.dbo.tblShipExecInvoiceChargeRepairs
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblShipExecInvoiceChargeRepairs SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblShipExecInvoiceChargeRepairs NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblShipExecInvoiceChargeRepairs DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblShipExecInvoiceChargeRepairs (lShipExecInvoiceChargesKey, lRepairKey, nMultiplier)
SELECT lShipExecInvoiceChargesKey, lRepairKey, nMultiplier FROM _stage_tblShipExecInvoiceChargeRepairs;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblShipExecInvoiceChargeRepairs ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblShipExecInvoiceChargeRepairs CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblShipExecInvoiceChargeRepairs;
PRINT 'tblShipExecInvoiceChargeRepairs DONE'
GO

-- ============================================================================
-- tblShippingChargeRepairs (171,672 rows) | PK: lShippingChargeRepairKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblShippingChargeRepairs (171,672 rows) ---'
GO

IF OBJECT_ID('_stage_tblShippingChargeRepairs') IS NOT NULL DROP TABLE _stage_tblShippingChargeRepairs;
SELECT * INTO _stage_tblShippingChargeRepairs
FROM WinScopeNetNashville.dbo.tblShippingChargeRepairs
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblShippingChargeRepairs ADD _newPK BIGINT;
UPDATE _stage_tblShippingChargeRepairs SET _newPK = CAST(lShippingChargeRepairKey AS BIGINT) + 20000000;
UPDATE _stage_tblShippingChargeRepairs SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblShippingChargeRepairs NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblShippingChargeRepairs DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblShippingChargeRepairs ON;
INSERT INTO WinScopeNet.dbo.tblShippingChargeRepairs (lShippingChargeRepairKey, lShippingChargeKey, lRepairKey, nMultiplier, nRepairCharge)
SELECT _newPK, lShippingChargeKey, lRepairKey, nMultiplier, nRepairCharge FROM _stage_tblShippingChargeRepairs;
SET IDENTITY_INSERT WinScopeNet.dbo.tblShippingChargeRepairs OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblShippingChargeRepairs ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblShippingChargeRepairs CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblShippingChargeRepairs;
PRINT 'tblShippingChargeRepairs DONE'
GO

-- ============================================================================
-- tblPointsOps (47,263 rows) | PK: lPointsOpsKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblPointsOps (47,263 rows) ---'
GO

IF OBJECT_ID('_stage_tblPointsOps') IS NOT NULL DROP TABLE _stage_tblPointsOps;
SELECT * INTO _stage_tblPointsOps
FROM WinScopeNetNashville.dbo.tblPointsOps
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblPointsOps ADD _newPK BIGINT;
UPDATE _stage_tblPointsOps SET _newPK = CAST(lPointsOpsKey AS BIGINT) + 20000000;
UPDATE _stage_tblPointsOps SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblPointsOps NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblPointsOps DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblPointsOps ON;
INSERT INTO WinScopeNet.dbo.tblPointsOps (lPointsOpsKey, lUserKey, lRepairKey, sUserFullName, sWorkOrderNumber, sClientName1, sDepartmentName, sModel, sSerialNumber, dtInvoiceDate, ScopeInPoints, BlankInspectionPoints, FinalInspectionPoints, ReqApprovedPoints, InspectedByPoints, UpdateSlipPoints, PickupRequestPoints, BonusPool)
SELECT _newPK, lUserKey, lRepairKey, sUserFullName, sWorkOrderNumber, sClientName1, sDepartmentName, sModel, sSerialNumber, dtInvoiceDate, ScopeInPoints, BlankInspectionPoints, FinalInspectionPoints, ReqApprovedPoints, InspectedByPoints, UpdateSlipPoints, PickupRequestPoints, BonusPool FROM _stage_tblPointsOps;
SET IDENTITY_INSERT WinScopeNet.dbo.tblPointsOps OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblPointsOps ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblPointsOps CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblPointsOps;
PRINT 'tblPointsOps DONE'
GO

-- ============================================================================
-- tblTasks (40,120 rows) | PK: lTaskKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblTasks (40,120 rows) ---'
GO

IF OBJECT_ID('_stage_tblTasks') IS NOT NULL DROP TABLE _stage_tblTasks;
SELECT * INTO _stage_tblTasks
FROM WinScopeNetNashville.dbo.tblTasks
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblTasks ADD _newPK BIGINT;
UPDATE _stage_tblTasks SET _newPK = CAST(lTaskKey AS BIGINT) + 20000000;
UPDATE _stage_tblTasks SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblTasks s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblTasks NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblTasks DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblTasks ON;
INSERT INTO WinScopeNet.dbo.tblTasks (lTaskKey, lDepartmentKey, sTaskTitle, sCustomerMessage, dtTaskDate, lTaskPriorityKey, sTaskNotes, bFromPortal, lTaskTypeKey, lRepairKey, sWorkOrderNumber, sShipTrackingNumber)
SELECT _newPK, lDepartmentKey, sTaskTitle, sCustomerMessage, dtTaskDate, lTaskPriorityKey, sTaskNotes, bFromPortal, lTaskTypeKey, lRepairKey, sWorkOrderNumber, sShipTrackingNumber FROM _stage_tblTasks;
SET IDENTITY_INSERT WinScopeNet.dbo.tblTasks OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblTasks ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblTasks CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblTasks;
PRINT 'tblTasks DONE'
GO

-- ============================================================================
-- tblPointsTechs (37,625 rows) | PK: lPointsTechsKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblPointsTechs (37,625 rows) ---'
GO

IF OBJECT_ID('_stage_tblPointsTechs') IS NOT NULL DROP TABLE _stage_tblPointsTechs;
SELECT * INTO _stage_tblPointsTechs
FROM WinScopeNetNashville.dbo.tblPointsTechs
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblPointsTechs ADD _newPK BIGINT;
UPDATE _stage_tblPointsTechs SET _newPK = CAST(lPointsTechsKey AS BIGINT) + 20000000;
UPDATE _stage_tblPointsTechs SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stage_tblPointsTechs s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;
UPDATE _stage_tblPointsTechs SET lRepairItemTranKey = lRepairItemTranKey + 200000000 WHERE lRepairItemTranKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblPointsTechs NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblPointsTechs DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblPointsTechs ON;
INSERT INTO WinScopeNet.dbo.tblPointsTechs (lPointsTechsKey, lTechnicianKey, sTechName, lRepairKey, sWorkOrderNumber, sClientName1, sDepartmentName, DateOut, lRepairItemTranKey, RepairItem, MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, PointValue, BonusPool)
SELECT _newPK, lTechnicianKey, sTechName, lRepairKey, sWorkOrderNumber, sClientName1, sDepartmentName, DateOut, lRepairItemTranKey, RepairItem, MinorPoints, MidLevelPoints, MajorPoints, VSIPoints, DIPoints, FinalPoints, UpdateSlipPoints, PointValue, BonusPool FROM _stage_tblPointsTechs;
SET IDENTITY_INSERT WinScopeNet.dbo.tblPointsTechs OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblPointsTechs ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblPointsTechs CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblPointsTechs;
PRINT 'tblPointsTechs DONE'
GO

-- ============================================================================
-- tblInvoice (36,966 rows) | PK: lInvoiceKey +400,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblInvoice (36,966 rows) ---'
GO

IF OBJECT_ID('_stage_tblInvoice') IS NOT NULL DROP TABLE _stage_tblInvoice;
SELECT * INTO _stage_tblInvoice
FROM WinScopeNetNashville.dbo.tblInvoice
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblInvoice ADD _newPK BIGINT;
UPDATE _stage_tblInvoice SET _newPK = CAST(lInvoiceKey AS BIGINT) + 400000000;
UPDATE _stage_tblInvoice SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblInvoice s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblInvoice s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stage_tblInvoice s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;
UPDATE _stage_tblInvoice SET lFriendRepairKey = lFriendRepairKey + 20000000 WHERE lFriendRepairKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblInvoice NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblInvoice DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblInvoice ON;
INSERT INTO WinScopeNet.dbo.tblInvoice (lInvoiceKey, lRepairKey, lFriendRepairKey, lInstallmentKey, lCompanyKey, lClientKey, lDepartmentKey, lScopeKey, lDistributorKey, lSalesRepKey, lContractKey, lPaymentTermsKey, lPricingCategoryKey, lDeliveryMethodKey, lSalesTaxKey, sTranNumber, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, sScopeTypeDesc, sSerialNumber, dtDueDate, dblTranAmount, dblShippingAmt, sExported, bExportedVAOB10, bExportVAOB10Skip, dtDateExportVAOB10, sQualifyVA, sUnderContract, sDisplayItemDescription, sDisplayDiscountComment, sDisplayItemAmount, sInvoiceForm, sDisplayFooter, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, bExportedMemHermOB10, dtDateExportMemhermOB10, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sBillEmail, lBillType, bIsManual, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, sDisplayCustomerComplaint, sComplaintDesc, sBillCountry, sCompanyCountry, sShipCountry, lScopeSaleKey, SalesTaxFlag, bMarkAsPaid, bIsVoid, dtVoidDate, lUserID_Void, sTranNumberSuffix, bFinalized, dtGPProcessDate, dtBillMonth, sInvoiceStatus, dtFollowUp, CommissionPaid, sCoveragePeriod, bContractInvoicePerDepartment, bAvalaraTransactionCreated, lProductSaleKey, nTurnTime, nLeadTime, lSiteServiceKey)
SELECT _newPK, lRepairKey, lFriendRepairKey, lInstallmentKey, lCompanyKey, lClientKey, lDepartmentKey, lScopeKey, lDistributorKey, lSalesRepKey, lContractKey, lPaymentTermsKey, lPricingCategoryKey, lDeliveryMethodKey, lSalesTaxKey, sTranNumber, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, sScopeTypeDesc, sSerialNumber, dtDueDate, dblTranAmount, dblShippingAmt, sExported, bExportedVAOB10, bExportVAOB10Skip, dtDateExportVAOB10, sQualifyVA, sUnderContract, sDisplayItemDescription, sDisplayDiscountComment, sDisplayItemAmount, sInvoiceForm, sDisplayFooter, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, bExportedMemHermOB10, dtDateExportMemhermOB10, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sBillEmail, lBillType, bIsManual, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, sDisplayCustomerComplaint, sComplaintDesc, sBillCountry, sCompanyCountry, sShipCountry, lScopeSaleKey, SalesTaxFlag, bMarkAsPaid, bIsVoid, dtVoidDate, lUserID_Void, sTranNumberSuffix, bFinalized, dtGPProcessDate, dtBillMonth, sInvoiceStatus, dtFollowUp, CommissionPaid, sCoveragePeriod, bContractInvoicePerDepartment, bAvalaraTransactionCreated, lProductSaleKey, nTurnTime, nLeadTime, lSiteServiceKey FROM _stage_tblInvoice;
SET IDENTITY_INSERT WinScopeNet.dbo.tblInvoice OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblInvoice ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblInvoice CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblInvoice;
PRINT 'tblInvoice DONE'
GO

-- ============================================================================
-- tblBlankInspectionSignOffLog (30,942 rows) | PK: BlankInspectionSignOffID +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblBlankInspectionSignOffLog (30,942 rows) ---'
GO

IF OBJECT_ID('_stage_tblBlankInspectionSignOffLog') IS NOT NULL DROP TABLE _stage_tblBlankInspectionSignOffLog;
SELECT * INTO _stage_tblBlankInspectionSignOffLog
FROM WinScopeNetNashville.dbo.tblBlankInspectionSignOffLog
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblBlankInspectionSignOffLog ADD _newPK BIGINT;
UPDATE _stage_tblBlankInspectionSignOffLog SET _newPK = CAST(BlankInspectionSignOffID AS BIGINT) + 20000000;
UPDATE _stage_tblBlankInspectionSignOffLog SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblBlankInspectionSignOffLog NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblBlankInspectionSignOffLog DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblBlankInspectionSignOffLog ON;
INSERT INTO WinScopeNet.dbo.tblBlankInspectionSignOffLog (BlankInspectionSignOffID, lRepairKey, lUserKey, SignOffDate)
SELECT _newPK, lRepairKey, lUserKey, SignOffDate FROM _stage_tblBlankInspectionSignOffLog;
SET IDENTITY_INSERT WinScopeNet.dbo.tblBlankInspectionSignOffLog OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblBlankInspectionSignOffLog ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblBlankInspectionSignOffLog CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblBlankInspectionSignOffLog;
PRINT 'tblBlankInspectionSignOffLog DONE'
GO

-- ============================================================================
-- tblRepairRevenueAndExpensesContract (19,386 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblRepairRevenueAndExpensesContract (19,386 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairRevenueAndExpensesContract') IS NOT NULL DROP TABLE _stage_tblRepairRevenueAndExpensesContract;
SELECT * INTO _stage_tblRepairRevenueAndExpensesContract
FROM WinScopeNetNashville.dbo.tblRepairRevenueAndExpensesContract
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblRepairRevenueAndExpensesContract SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblRepairRevenueAndExpensesContract s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblRepairRevenueAndExpensesContract s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE _stage_tblRepairRevenueAndExpensesContract SET lInvoiceKey = lInvoiceKey + 400000000 WHERE lInvoiceKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpensesContract NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpensesContract DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblRepairRevenueAndExpensesContract (lInvoiceKey, lRepairKey, lScopeKey, sSerialNumber, sScopeTypeDesc, sWorkOrderNumber, bFlexible, dtDateIn, dtDateOut, sShipState, RepairAmount, OutsourceAmount, ShippingAmount, LaborAmount, InventoryAmount, GPOAmount, CommissionAmount, RevenueAmount, ShippingCount, lDepartmentKey, dtCalcDate, lScopeTypeKey, lRepairLevelKey, dtTranDate, lContractKey)
SELECT lInvoiceKey, lRepairKey, lScopeKey, sSerialNumber, sScopeTypeDesc, sWorkOrderNumber, bFlexible, dtDateIn, dtDateOut, sShipState, RepairAmount, OutsourceAmount, ShippingAmount, LaborAmount, InventoryAmount, GPOAmount, CommissionAmount, RevenueAmount, ShippingCount, lDepartmentKey, dtCalcDate, lScopeTypeKey, lRepairLevelKey, dtTranDate, lContractKey FROM _stage_tblRepairRevenueAndExpensesContract;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpensesContract ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpensesContract CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairRevenueAndExpensesContract;
PRINT 'tblRepairRevenueAndExpensesContract DONE'
GO

-- ============================================================================
-- tblTrackingNumbersInAudit (14,909 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblTrackingNumbersInAudit (14,909 rows) ---'
GO

IF OBJECT_ID('_stage_tblTrackingNumbersInAudit') IS NOT NULL DROP TABLE _stage_tblTrackingNumbersInAudit;
SELECT * INTO _stage_tblTrackingNumbersInAudit
FROM WinScopeNetNashville.dbo.tblTrackingNumbersInAudit
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblTrackingNumbersInAudit SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblTrackingNumbersInAudit NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblTrackingNumbersInAudit DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblTrackingNumbersInAudit (lRepairKey, sShipTrackingNumberIn, sShipTrackingNumberFedExIn)
SELECT lRepairKey, sShipTrackingNumberIn, sShipTrackingNumberFedExIn FROM _stage_tblTrackingNumbersInAudit;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblTrackingNumbersInAudit ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblTrackingNumbersInAudit CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblTrackingNumbersInAudit;
PRINT 'tblTrackingNumbersInAudit DONE'
GO

-- ============================================================================
-- tblDashScopesInSave (13,982 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblDashScopesInSave (13,982 rows) ---'
GO

IF OBJECT_ID('_stage_tblDashScopesInSave') IS NOT NULL DROP TABLE _stage_tblDashScopesInSave;
SELECT * INTO _stage_tblDashScopesInSave
FROM WinScopeNetNashville.dbo.tblDashScopesInSave
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblDashScopesInSave SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblDashScopesInSave s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblDashScopesInSave s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stage_tblDashScopesInSave s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblDashScopesInSave NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblDashScopesInSave DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblDashScopesInSave (SPID, lClientKey, lRepairKey, sClientName1, sDepartmentName, sSerialNumber, sScopeTypeDesc, lScopeKey, dtDateIn, dtAprRecvd, dtDateOut, dtExpDelDateFrom, dtExpDelDateTo, sWorkOrderNumber, sPurchaseOrder, nDaysSinceLastIn, sRigidOrFlexible, dtRepairStatusDate, AlertHours, lDepartmentKey, VendorKey, sRepairStatus, sManufacturer, Complaint, Approved, sResponsibleTech, ProgBarValue, ProgBarStatus, bHotList, Diameter, IsCogentix, CaseOrBox, sRackPosition, Note, lServiceLocationKey, lDatabaseKey, lSalesRepKey, NewCustomer, lRepairStatusID, IsCart)
SELECT SPID, lClientKey, lRepairKey, sClientName1, sDepartmentName, sSerialNumber, sScopeTypeDesc, lScopeKey, dtDateIn, dtAprRecvd, dtDateOut, dtExpDelDateFrom, dtExpDelDateTo, sWorkOrderNumber, sPurchaseOrder, nDaysSinceLastIn, sRigidOrFlexible, dtRepairStatusDate, AlertHours, lDepartmentKey, VendorKey, sRepairStatus, sManufacturer, Complaint, Approved, sResponsibleTech, ProgBarValue, ProgBarStatus, bHotList, Diameter, IsCogentix, CaseOrBox, sRackPosition, Note, lServiceLocationKey, lDatabaseKey, lSalesRepKey, NewCustomer, lRepairStatusID, IsCart FROM _stage_tblDashScopesInSave;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblDashScopesInSave ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblDashScopesInSave CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblDashScopesInSave;
PRINT 'tblDashScopesInSave DONE'
GO

-- ============================================================================
-- tblLoanerTran (5,361 rows) | PK: lLoanerTranKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblLoanerTran (5,361 rows) ---'
GO

IF OBJECT_ID('_stage_tblLoanerTran') IS NOT NULL DROP TABLE _stage_tblLoanerTran;
SELECT * INTO _stage_tblLoanerTran
FROM WinScopeNetNashville.dbo.tblLoanerTran
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblLoanerTran ADD _newPK BIGINT;
UPDATE _stage_tblLoanerTran SET _newPK = CAST(lLoanerTranKey AS BIGINT) + 20000000;
UPDATE _stage_tblLoanerTran SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblLoanerTran s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblLoanerTran s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stage_tblLoanerTran s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblLoanerTran NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblLoanerTran DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblLoanerTran ON;
INSERT INTO WinScopeNet.dbo.tblLoanerTran (lLoanerTranKey, lDepartmentKey, lScopeKey, lRepairKey, lSalesRepKey, lDeliveryMethodKey, lCompanyKey, sDateOut, sDateIn, lSessionID, lSessionKey, sRepairClosed, sPurchaseOrder, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sTrackingNumber, lContractKey, sDateInBackup)
SELECT _newPK, lDepartmentKey, lScopeKey, lRepairKey, lSalesRepKey, lDeliveryMethodKey, lCompanyKey, sDateOut, sDateIn, lSessionID, lSessionKey, sRepairClosed, sPurchaseOrder, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sTrackingNumber, lContractKey, sDateInBackup FROM _stage_tblLoanerTran;
SET IDENTITY_INSERT WinScopeNet.dbo.tblLoanerTran OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblLoanerTran ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblLoanerTran CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblLoanerTran;
PRINT 'tblLoanerTran DONE'
GO

-- ============================================================================
-- tblContractRepairsSaved (3,258 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblContractRepairsSaved (3,258 rows) ---'
GO

IF OBJECT_ID('_stage_tblContractRepairsSaved') IS NOT NULL DROP TABLE _stage_tblContractRepairsSaved;
SELECT * INTO _stage_tblContractRepairsSaved
FROM WinScopeNetNashville.dbo.tblContractRepairsSaved
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblContractRepairsSaved SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblContractRepairsSaved s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblContractRepairsSaved s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblContractRepairsSaved NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblContractRepairsSaved DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblContractRepairsSaved (lContractKey, lInvoiceKey, lRepairKey, lClientKey, lDepartmentKey, sClientName1, sDepartmentName, lScopeKey, sSerialNumber, sScopeTypeDesc, InstrumentType, sWorkOrderNumber, dtDateIn, dtTranDate, RepairLevel, ConsumptionAmount)
SELECT lContractKey, lInvoiceKey, lRepairKey, lClientKey, lDepartmentKey, sClientName1, sDepartmentName, lScopeKey, sSerialNumber, sScopeTypeDesc, InstrumentType, sWorkOrderNumber, dtDateIn, dtTranDate, RepairLevel, ConsumptionAmount FROM _stage_tblContractRepairsSaved;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblContractRepairsSaved ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblContractRepairsSaved CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblContractRepairsSaved;
PRINT 'tblContractRepairsSaved DONE'
GO

-- ============================================================================
-- tblRepairFailureCodes (3,348 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblRepairFailureCodes (3,348 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairFailureCodes') IS NOT NULL DROP TABLE _stage_tblRepairFailureCodes;
SELECT * INTO _stage_tblRepairFailureCodes
FROM WinScopeNetNashville.dbo.tblRepairFailureCodes
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblRepairFailureCodes SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairFailureCodes NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairFailureCodes DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblRepairFailureCodes (lRepairKey, lFailureCode, sComment)
SELECT lRepairKey, lFailureCode, sComment FROM _stage_tblRepairFailureCodes;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairFailureCodes ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairFailureCodes CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairFailureCodes;
PRINT 'tblRepairFailureCodes DONE'
GO

-- ============================================================================
-- tblAmendRepairComments (2,979 rows) | PK: lAmendRepairCommentKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblAmendRepairComments (2,979 rows) ---'
GO

IF OBJECT_ID('_stage_tblAmendRepairComments') IS NOT NULL DROP TABLE _stage_tblAmendRepairComments;
SELECT * INTO _stage_tblAmendRepairComments
FROM WinScopeNetNashville.dbo.tblAmendRepairComments
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblAmendRepairComments ADD _newPK BIGINT;
UPDATE _stage_tblAmendRepairComments SET _newPK = CAST(lAmendRepairCommentKey AS BIGINT) + 20000000;
UPDATE _stage_tblAmendRepairComments SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblAmendRepairComments NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblAmendRepairComments DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblAmendRepairComments ON;
INSERT INTO WinScopeNet.dbo.tblAmendRepairComments (lAmendRepairCommentKey, lRepairKey, lUserKey, lAmendRepairTypeKey, lAmendRepairReasonKey, sAmendRepairComment, lAmendmentNumber, dtAmendmentDate, bApprovalDateReset)
SELECT _newPK, lRepairKey, lUserKey, lAmendRepairTypeKey, lAmendRepairReasonKey, sAmendRepairComment, lAmendmentNumber, dtAmendmentDate, bApprovalDateReset FROM _stage_tblAmendRepairComments;
SET IDENTITY_INSERT WinScopeNet.dbo.tblAmendRepairComments OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblAmendRepairComments ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblAmendRepairComments CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblAmendRepairComments;
PRINT 'tblAmendRepairComments DONE'
GO

-- ============================================================================
-- tblRepairUpdateSlips (1,998 rows) | PK: lRepairUpdateSlipKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblRepairUpdateSlips (1,998 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairUpdateSlips') IS NOT NULL DROP TABLE _stage_tblRepairUpdateSlips;
SELECT * INTO _stage_tblRepairUpdateSlips
FROM WinScopeNetNashville.dbo.tblRepairUpdateSlips
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblRepairUpdateSlips ADD _newPK BIGINT;
UPDATE _stage_tblRepairUpdateSlips SET _newPK = CAST(lRepairUpdateSlipKey AS BIGINT) + 20000000;
UPDATE _stage_tblRepairUpdateSlips SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairUpdateSlips NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairUpdateSlips DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairUpdateSlips ON;
INSERT INTO WinScopeNet.dbo.tblRepairUpdateSlips (lRepairUpdateSlipKey, lRepairKey, dtUpdateRequestDate, lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey)
SELECT _newPK, lRepairKey, dtUpdateRequestDate, lResponsibleTech, lResponsibleTech2, lMainRepairUpdateSlipReasonKey FROM _stage_tblRepairUpdateSlips;
SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairUpdateSlips OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairUpdateSlips ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairUpdateSlips CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairUpdateSlips;
PRINT 'tblRepairUpdateSlips DONE'
GO

-- ============================================================================
-- tblInvoiceVoid (1,675 rows) | PK: lInvoiceKey +400,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblInvoiceVoid (1,675 rows) ---'
GO

IF OBJECT_ID('_stage_tblInvoiceVoid') IS NOT NULL DROP TABLE _stage_tblInvoiceVoid;
SELECT * INTO _stage_tblInvoiceVoid
FROM WinScopeNetNashville.dbo.tblInvoiceVoid
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblInvoiceVoid ADD _newPK BIGINT;
UPDATE _stage_tblInvoiceVoid SET _newPK = CAST(lInvoiceKey AS BIGINT) + 400000000;
UPDATE _stage_tblInvoiceVoid SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblInvoiceVoid s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblInvoiceVoid s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stage_tblInvoiceVoid s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;
UPDATE _stage_tblInvoiceVoid SET lFriendRepairKey = lFriendRepairKey + 20000000 WHERE lFriendRepairKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblInvoiceVoid NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblInvoiceVoid DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblInvoiceVoid ON;
INSERT INTO WinScopeNet.dbo.tblInvoiceVoid (lInvoiceKey, lRepairKey, lFriendRepairKey, lInstallmentKey, lCompanyKey, lClientKey, lDepartmentKey, lScopeKey, lDistributorKey, lSalesRepKey, lContractKey, lPaymentTermsKey, lPricingCategoryKey, lDeliveryMethodKey, lSalesTaxKey, sTranNumber, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, sScopeTypeDesc, sSerialNumber, dtDueDate, dblTranAmount, dblShippingAmt, sExported, bExportedVAOB10, bExportVAOB10Skip, dtDateExportVAOB10, sQualifyVA, sUnderContract, sDisplayItemDescription, sDisplayDiscountComment, sDisplayItemAmount, sInvoiceForm, sDisplayFooter, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, bExportedMemHermOB10, dtDateExportMemhermOB10, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sBillEmail, lBillType, bIsManual, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, sDisplayCustomerComplaint, sComplaintDesc, sBillCountry, sCompanyCountry, sShipCountry, lScopeSaleKey, SalesTaxFlag, bMarkAsPaid, bIsVoid, dtVoidDate, lUserID_Void, sTranNumberSuffix, bFinalized, dtGPProcessDate, dtBillMonth, sInvoiceStatus, dtFollowUp, CommissionPaid, sCoveragePeriod, bContractInvoicePerDepartment, bAvalaraTransactionCreated, lProductSaleKey, nTurnTime, nLeadTime, lSiteServiceKey)
SELECT _newPK, lRepairKey, lFriendRepairKey, lInstallmentKey, lCompanyKey, lClientKey, lDepartmentKey, lScopeKey, lDistributorKey, lSalesRepKey, lContractKey, lPaymentTermsKey, lPricingCategoryKey, lDeliveryMethodKey, lSalesTaxKey, sTranNumber, sCompanyName1, sCompanyName2, sCompanyAddr1, sCompanyAddr2, sCompanyCity, sCompanyState, sCompanyZip, sCompanyPhoneVoice, sCompanyPhoneFAX, sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip, sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip, dtTranDate, sDeliveryDesc, sTermsDesc, sPurchaseOrder, dtAprRecvd, sRepFirst, sRepLast, sScopeTypeDesc, sSerialNumber, dtDueDate, dblTranAmount, dblShippingAmt, sExported, bExportedVAOB10, bExportVAOB10Skip, dtDateExportVAOB10, sQualifyVA, sUnderContract, sDisplayItemDescription, sDisplayDiscountComment, sDisplayItemAmount, sInvoiceForm, sDisplayFooter, sPeachTaxCode, sJuris1Name, dblJuris1Pct, dblJuris1Amt, sJuris2Name, dblJuris2Pct, dblJuris2Amt, sJuris3Name, dblJuris3Pct, dblJuris3Amt, sDispProductID, bExportedMemHermOB10, dtDateExportMemhermOB10, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sBillEmail, lBillType, bIsManual, sCommentContract, sPreview, sShipTrackingNumber, sBillEmailName, sDisplayCustomerComplaint, sComplaintDesc, sBillCountry, sCompanyCountry, sShipCountry, lScopeSaleKey, SalesTaxFlag, bMarkAsPaid, bIsVoid, dtVoidDate, lUserID_Void, sTranNumberSuffix, bFinalized, dtGPProcessDate, dtBillMonth, sInvoiceStatus, dtFollowUp, CommissionPaid, sCoveragePeriod, bContractInvoicePerDepartment, bAvalaraTransactionCreated, lProductSaleKey, nTurnTime, nLeadTime, lSiteServiceKey FROM _stage_tblInvoiceVoid;
SET IDENTITY_INSERT WinScopeNet.dbo.tblInvoiceVoid OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblInvoiceVoid ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblInvoiceVoid CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblInvoiceVoid;
PRINT 'tblInvoiceVoid DONE'
GO

-- ============================================================================
-- tblRepairInspection (1,568 rows) | PK: lRepairInspectionKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblRepairInspection (1,568 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairInspection') IS NOT NULL DROP TABLE _stage_tblRepairInspection;
SELECT * INTO _stage_tblRepairInspection
FROM WinScopeNetNashville.dbo.tblRepairInspection
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblRepairInspection ADD _newPK BIGINT;
UPDATE _stage_tblRepairInspection SET _newPK = CAST(lRepairInspectionKey AS BIGINT) + 20000000;
UPDATE _stage_tblRepairInspection SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stage_tblRepairInspection s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;
UPDATE s SET s.lInspectorKey = xt.north_key FROM _stage_tblRepairInspection s JOIN _xwalk_Technician xt ON xt.south_key = s.lInspectorKey WHERE s.lInspectorKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairInspection NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairInspection DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairInspection ON;
INSERT INTO WinScopeNet.dbo.tblRepairInspection (lRepairInspectionKey, lRepairKey, lRepairInspectionType, bItemReceivedClean, lConnectors, bEyepieceColor, sEyepieceColor, bEyepieceCondition, bEyepieceConditionNicks, bEyepieceConditionScratches, bEyepieceConditionDirt, bEyepieceConditionOther, sEyepieceConditionOther, bEyepieceWindow, bEyepieceWindowChips, bEyepieceWindowScratches, bEyepieceWindowDirt, bEyepieceWindowLeaks, bEyepieceWindowOther, sEyepieceWindowOther, bEyepieceGlueSeal, bOcularLens, bOcularLensSpots, bOcularLensLoose, bOcularLensOther, sOcularLensOther, bIDBand, sIDBandColor, bBodyCondition, bBodyConditionNicks, bBodyConditionScratches, bBodyConditionDirt, bBodyConditionOther, sBodyConditionOther, bNoseconeCondition, bNoseconeConditionNicks, bNoseconeConditionScratches, bNoseconeConditionDirt, bNoseconeConditionOther, sNoseconeConditionOther, bGlueSealsIntact, bLightPostCondition, bLightPostConditionLoose, bLightPostConditionOther, sLightPostConditionOther, bModelAndLightPostInAlignment, bLightPostAndTipAngleInAlignment, bImageClearAndInFocus, bImageRoundAndClearToEdge, bImageFreeOfContamination, bImageFreeOfContaminationDirt, bImageFreeOfContaminationFluid, bImageFreeOfContaminationBrokenGlass, bImageLensSystemSecure, bColorOfLightTipAndPostAcceptable, bFibersIntactAndNotLoose, bFiberGlueIntactAndSealed, bTubingFinish, sTubingFinish, bInsertionTube, bInsertionTubeBent, bInsertionTubeDents, bInsertionTubeOther, sInsertionTubeOther, bInsertionTubeConnectionToBody, bInsertionTubeConnectionToBodyLoose, bInsertionTubeConnectionToBodyCracks, bInsertionTubeConnectionToBodyOther, sInsertionTubeConnectionToBodyOther, bInsertionTubeDamageToPlatingOrFinish, bInsertionTubeTip, bInsertionTubeTipBent, bInsertionTubeTipDents, bInsertionTubeTipNicks, bInsertionTubeTipOther, sInsertionTubeTipOther, bWindowIntactAndClear, bWindowIntactAndClearScratches, bWindowIntactAndClearChip, bWindowIntactAndClearCracks, bWindowIntactAndClearMissing, bWindowIntactAndClearOther, sWindowIntactAndClearOther, bNegativeLensIntactAndClear, bNegativeLensIntactAndClearScratches, bNegativeLensIntactAndClearChip, bNegativeLensIntactAndClearCracks, bNegativeLensIntactAndClearOther, sNegativeLensIntactAndClearOther, bObjectiveLensIntactAndSecure, bFreeOfDustDirtAndFluid, nInsertionTubeLength, nInsertionTubeDiameter, lDegreeKey, tMarkerPlateLocation, nDirectionOfView, nSquint, lFieldOfView, lResolutionGroup, lResolutionField, nImageSizeAndCenterRunOut, bImageSizeAndCenterRunOut, bLightFieldCoversImageField, sImageSizeAndCenterRunOut, bHotColdLeakTestPass, lTechnicianKey, bDegree, bMarkerPlateLocation, bDirectionOfView, bFieldOfView, bAutoclaveTestPass, lUserKey, lInspectorKey)
SELECT _newPK, lRepairKey, lRepairInspectionType, bItemReceivedClean, lConnectors, bEyepieceColor, sEyepieceColor, bEyepieceCondition, bEyepieceConditionNicks, bEyepieceConditionScratches, bEyepieceConditionDirt, bEyepieceConditionOther, sEyepieceConditionOther, bEyepieceWindow, bEyepieceWindowChips, bEyepieceWindowScratches, bEyepieceWindowDirt, bEyepieceWindowLeaks, bEyepieceWindowOther, sEyepieceWindowOther, bEyepieceGlueSeal, bOcularLens, bOcularLensSpots, bOcularLensLoose, bOcularLensOther, sOcularLensOther, bIDBand, sIDBandColor, bBodyCondition, bBodyConditionNicks, bBodyConditionScratches, bBodyConditionDirt, bBodyConditionOther, sBodyConditionOther, bNoseconeCondition, bNoseconeConditionNicks, bNoseconeConditionScratches, bNoseconeConditionDirt, bNoseconeConditionOther, sNoseconeConditionOther, bGlueSealsIntact, bLightPostCondition, bLightPostConditionLoose, bLightPostConditionOther, sLightPostConditionOther, bModelAndLightPostInAlignment, bLightPostAndTipAngleInAlignment, bImageClearAndInFocus, bImageRoundAndClearToEdge, bImageFreeOfContamination, bImageFreeOfContaminationDirt, bImageFreeOfContaminationFluid, bImageFreeOfContaminationBrokenGlass, bImageLensSystemSecure, bColorOfLightTipAndPostAcceptable, bFibersIntactAndNotLoose, bFiberGlueIntactAndSealed, bTubingFinish, sTubingFinish, bInsertionTube, bInsertionTubeBent, bInsertionTubeDents, bInsertionTubeOther, sInsertionTubeOther, bInsertionTubeConnectionToBody, bInsertionTubeConnectionToBodyLoose, bInsertionTubeConnectionToBodyCracks, bInsertionTubeConnectionToBodyOther, sInsertionTubeConnectionToBodyOther, bInsertionTubeDamageToPlatingOrFinish, bInsertionTubeTip, bInsertionTubeTipBent, bInsertionTubeTipDents, bInsertionTubeTipNicks, bInsertionTubeTipOther, sInsertionTubeTipOther, bWindowIntactAndClear, bWindowIntactAndClearScratches, bWindowIntactAndClearChip, bWindowIntactAndClearCracks, bWindowIntactAndClearMissing, bWindowIntactAndClearOther, sWindowIntactAndClearOther, bNegativeLensIntactAndClear, bNegativeLensIntactAndClearScratches, bNegativeLensIntactAndClearChip, bNegativeLensIntactAndClearCracks, bNegativeLensIntactAndClearOther, sNegativeLensIntactAndClearOther, bObjectiveLensIntactAndSecure, bFreeOfDustDirtAndFluid, nInsertionTubeLength, nInsertionTubeDiameter, lDegreeKey, tMarkerPlateLocation, nDirectionOfView, nSquint, lFieldOfView, lResolutionGroup, lResolutionField, nImageSizeAndCenterRunOut, bImageSizeAndCenterRunOut, bLightFieldCoversImageField, sImageSizeAndCenterRunOut, bHotColdLeakTestPass, lTechnicianKey, bDegree, bMarkerPlateLocation, bDirectionOfView, bFieldOfView, bAutoclaveTestPass, lUserKey, lInspectorKey FROM _stage_tblRepairInspection;
SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairInspection OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairInspection ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairInspection CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairInspection;
PRINT 'tblRepairInspection DONE'
GO

-- ============================================================================
-- tblRepairInstrumentModels (1,213 rows) | PK: lRepairInstrumentModelKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblRepairInstrumentModels (1,213 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairInstrumentModels') IS NOT NULL DROP TABLE _stage_tblRepairInstrumentModels;
SELECT * INTO _stage_tblRepairInstrumentModels
FROM WinScopeNetNashville.dbo.tblRepairInstrumentModels
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblRepairInstrumentModels ADD _newPK BIGINT;
UPDATE _stage_tblRepairInstrumentModels SET _newPK = CAST(lRepairInstrumentModelKey AS BIGINT) + 20000000;
UPDATE _stage_tblRepairInstrumentModels SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lTechnicianKey = xt.north_key FROM _stage_tblRepairInstrumentModels s JOIN _xwalk_Technician xt ON xt.south_key = s.lTechnicianKey WHERE s.lTechnicianKey > 0;
UPDATE s SET s.lVendorKey = xv.north_key FROM _stage_tblRepairInstrumentModels s JOIN _xwalk_Vendor xv ON xv.south_key = s.lVendorKey WHERE s.lVendorKey > 0;
UPDATE _stage_tblRepairInstrumentModels SET lOutsourcedRepairKey = lOutsourcedRepairKey + 20000000 WHERE lOutsourcedRepairKey > 0;
UPDATE _stage_tblRepairInstrumentModels SET lReplacedRepairKey = lReplacedRepairKey + 20000000 WHERE lReplacedRepairKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairInstrumentModels NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairInstrumentModels DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairInstrumentModels ON;
INSERT INTO WinScopeNet.dbo.tblRepairInstrumentModels (lRepairInstrumentModelKey, lRepairKey, lScopeTypeKey, lQuantity, sApproved, dblUnitCost, lTechnicianKey, bOutsourced, sSerialNumber, mComment, lSortOrder, sProductID, dblUnitCostBase, lManufacturerKey, lModelKey, lModelStatusKey, lOutsourcedRepairKey, lVendorKey, sRRO, lOutsourcedQuantity, bReplaced, lReplacedRepairKey, lReplacedQuantity)
SELECT _newPK, lRepairKey, lScopeTypeKey, lQuantity, sApproved, dblUnitCost, lTechnicianKey, bOutsourced, sSerialNumber, mComment, lSortOrder, sProductID, dblUnitCostBase, lManufacturerKey, lModelKey, lModelStatusKey, lOutsourcedRepairKey, lVendorKey, sRRO, lOutsourcedQuantity, bReplaced, lReplacedRepairKey, lReplacedQuantity FROM _stage_tblRepairInstrumentModels;
SET IDENTITY_INSERT WinScopeNet.dbo.tblRepairInstrumentModels OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairInstrumentModels ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairInstrumentModels CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairInstrumentModels;
PRINT 'tblRepairInstrumentModels DONE'
GO

-- ============================================================================
-- tblRepairRevenueAndExpenses (853 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblRepairRevenueAndExpenses (853 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairRevenueAndExpenses') IS NOT NULL DROP TABLE _stage_tblRepairRevenueAndExpenses;
SELECT * INTO _stage_tblRepairRevenueAndExpenses
FROM WinScopeNetNashville.dbo.tblRepairRevenueAndExpenses
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblRepairRevenueAndExpenses SET lRepairKey = lRepairKey + 20000000;
UPDATE s SET s.lDepartmentKey = xd.north_key FROM _stage_tblRepairRevenueAndExpenses s JOIN _xwalk_Department xd ON xd.south_key = s.lDepartmentKey WHERE s.lDepartmentKey > 0;
UPDATE s SET s.lScopeKey = xs.north_key FROM _stage_tblRepairRevenueAndExpenses s JOIN _xwalk_Scope xs ON xs.south_key = s.lScopeKey WHERE s.lScopeKey > 0;
UPDATE s SET s.lSalesRepKey = xr.north_key FROM _stage_tblRepairRevenueAndExpenses s JOIN _xwalk_SalesRep xr ON xr.south_key = s.lSalesRepKey WHERE s.lSalesRepKey > 0;
UPDATE _stage_tblRepairRevenueAndExpenses SET lInvoiceKey = lInvoiceKey + 400000000 WHERE lInvoiceKey > 0;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpenses NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpenses DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblRepairRevenueAndExpenses (lInvoiceKey, lRepairKey, lScopeKey, sSerialNumber, sScopeTypeDesc, sWorkOrderNumber, bFlexible, dtDateIn, dtDateOut, sShipState, RepairAmount, OutsourceAmount, ShippingAmount, LaborAmount, InventoryAmount, GPOAmount, CommissionAmount, RevenueAmount, ShippingCount, lDepartmentKey, dtCalcDate, lScopeTypeKey, lRepairLevelKey, dtTranDate, lSalesRepKey)
SELECT lInvoiceKey, lRepairKey, lScopeKey, sSerialNumber, sScopeTypeDesc, sWorkOrderNumber, bFlexible, dtDateIn, dtDateOut, sShipState, RepairAmount, OutsourceAmount, ShippingAmount, LaborAmount, InventoryAmount, GPOAmount, CommissionAmount, RevenueAmount, ShippingCount, lDepartmentKey, dtCalcDate, lScopeTypeKey, lRepairLevelKey, dtTranDate, lSalesRepKey FROM _stage_tblRepairRevenueAndExpenses;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpenses ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairRevenueAndExpenses CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairRevenueAndExpenses;
PRINT 'tblRepairRevenueAndExpenses DONE'
GO

-- ============================================================================
-- tblRepairDefectTracking (480 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblRepairDefectTracking (480 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairDefectTracking') IS NOT NULL DROP TABLE _stage_tblRepairDefectTracking;
SELECT * INTO _stage_tblRepairDefectTracking
FROM WinScopeNetNashville.dbo.tblRepairDefectTracking
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblRepairDefectTracking SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairDefectTracking NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairDefectTracking DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblRepairDefectTracking (lRepairKey, lDefectTrackingItemKey, sComment)
SELECT lRepairKey, lDefectTrackingItemKey, sComment FROM _stage_tblRepairDefectTracking;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairDefectTracking ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairDefectTracking CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairDefectTracking;
PRINT 'tblRepairDefectTracking DONE'
GO

-- ============================================================================
-- tblRepairDeleteAudit (194 rows) | No identity
-- ============================================================================
PRINT ''
PRINT '--- tblRepairDeleteAudit (194 rows) ---'
GO

IF OBJECT_ID('_stage_tblRepairDeleteAudit') IS NOT NULL DROP TABLE _stage_tblRepairDeleteAudit;
SELECT * INTO _stage_tblRepairDeleteAudit
FROM WinScopeNetNashville.dbo.tblRepairDeleteAudit
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

UPDATE _stage_tblRepairDeleteAudit SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblRepairDeleteAudit NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairDeleteAudit DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

INSERT INTO WinScopeNet.dbo.tblRepairDeleteAudit (lRepairKey, sWorkOrderNumber, lUserKey, dtDeleteDate)
SELECT lRepairKey, sWorkOrderNumber, lUserKey, dtDeleteDate FROM _stage_tblRepairDeleteAudit;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblRepairDeleteAudit ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblRepairDeleteAudit CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblRepairDeleteAudit;
PRINT 'tblRepairDeleteAudit DONE'
GO

-- ============================================================================
-- tblISOComplaint (92 rows) | PK: lISOComplaintKey +20,000,000
-- ============================================================================
PRINT ''
PRINT '--- tblISOComplaint (92 rows) ---'
GO

IF OBJECT_ID('_stage_tblISOComplaint') IS NOT NULL DROP TABLE _stage_tblISOComplaint;
SELECT * INTO _stage_tblISOComplaint
FROM WinScopeNetNashville.dbo.tblISOComplaint
WHERE lRepairKey NOT IN (510468,510549,510576,510972,510976,511247,511349,511356,511621,511724,511727,511908,511914,512208);
PRINT 'Staged: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

ALTER TABLE _stage_tblISOComplaint ADD _newPK BIGINT;
UPDATE _stage_tblISOComplaint SET _newPK = CAST(lISOComplaintKey AS BIGINT) + 20000000;
UPDATE _stage_tblISOComplaint SET lRepairKey = lRepairKey + 20000000;
PRINT 'Offsets and FK remaps applied'

ALTER TABLE WinScopeNet.dbo.tblISOComplaint NOCHECK CONSTRAINT ALL;
BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblISOComplaint DISABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;

SET IDENTITY_INSERT WinScopeNet.dbo.tblISOComplaint ON;
INSERT INTO WinScopeNet.dbo.tblISOComplaint (lISOComplaintKey, lRepairKey, dtDateReceived, lRecvdByUserKey, nRecvdByMethod, sRecvdByOther, mComplaint, lResponsibleMgrUserKey, dtDateAssigned, dtDateResponseDue, mInstructions, dtEvalDate, lEvalUserKey, mEvalResults, mEvalConclusion, lFnlDispQAUserKey, dtFnlDispDate, mFnlDispAction, sISOComplaint, sISONonConformance, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sImpactOnProduct, sVOE, dtVOE, lVOEUserKey)
SELECT _newPK, lRepairKey, dtDateReceived, lRecvdByUserKey, nRecvdByMethod, sRecvdByOther, mComplaint, lResponsibleMgrUserKey, dtDateAssigned, dtDateResponseDue, mInstructions, dtEvalDate, lEvalUserKey, mEvalResults, mEvalConclusion, lFnlDispQAUserKey, dtFnlDispDate, mFnlDispAction, sISOComplaint, sISONonConformance, dtLastUpdate, lLastUpdateUser, dtCreateDate, lCreateUser, lCreateSessionKey, sImpactOnProduct, sVOE, dtVOE, lVOEUserKey FROM _stage_tblISOComplaint;
SET IDENTITY_INSERT WinScopeNet.dbo.tblISOComplaint OFF;
PRINT 'Inserted: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

BEGIN TRY ALTER TABLE WinScopeNet.dbo.tblISOComplaint ENABLE TRIGGER ALL; END TRY BEGIN CATCH END CATCH;
ALTER TABLE WinScopeNet.dbo.tblISOComplaint CHECK CONSTRAINT ALL;
DROP TABLE _stage_tblISOComplaint;
PRINT 'tblISOComplaint DONE'
GO

-- ============================================================================
-- PHASE 4: Fix Inventory Transaction Repair Keys
-- ============================================================================
PRINT ''
PRINT '=== PHASE 4: Fix Inventory Transaction Repair Keys ==='

UPDATE WinScopeNet.dbo.tblInventoryTran
SET lRepairKey = lRepairKey + 20000000
WHERE lInventoryTranKey >= 1000000
  AND lRepairKey > 0
  AND lRepairKey < 20000000
  AND NOT EXISTS (SELECT 1 FROM WinScopeNet.dbo.tblRepair WHERE lRepairKey = WinScopeNet.dbo.tblInventoryTran.lRepairKey);
PRINT 'tblInventoryTran updated: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'

-- tblRepairInventory: no lRepairKey column (uses lRepairItemTranKey) — skip

-- tblLotNumberAdjustments
UPDATE WinScopeNet.dbo.tblLotNumberAdjustments
SET lRepairKey = lRepairKey + 20000000
WHERE lLotNumberAdjustmentKey >= 1000000
  AND lRepairKey > 0 AND lRepairKey < 20000000
  AND NOT EXISTS (SELECT 1 FROM WinScopeNet.dbo.tblRepair WHERE lRepairKey = WinScopeNet.dbo.tblLotNumberAdjustments.lRepairKey);
PRINT 'tblLotNumberAdjustments updated: ' + CAST(@@ROWCOUNT AS VARCHAR) + ' rows'
GO

PRINT 'PHASE 3+4 COMPLETE: ' + CONVERT(VARCHAR, GETDATE(), 120)