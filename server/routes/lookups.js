// ═══════════════════════════════════════════════════════
//  lookups.js — Reference data endpoints (dropdowns, statuses, etc.)
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// Repair Statuses
// Actual columns: lRepairStatusID, sRepairStatus, AlertHours, lRepairStatusSortOrder, bIsReadOnly, sAlertType
router.get('/RepairItems/GetRepairStatus', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lRepairStatusID, sRepairStatus, lRepairStatusSortOrder, bIsReadOnly
      FROM tblRepairStatuses ORDER BY lRepairStatusSortOrder`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Repair Levels
// Actual columns: lRepairLevelKey, sRepairLevel, lDeliveryFromDateInDays
router.get('/RepairItems/GetRepairLevels', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lRepairLevelKey, sRepairLevel, lDeliveryFromDateInDays
      FROM tblRepairLevels ORDER BY lRepairLevelKey`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Technicians
// Actual columns include: lTechnicianKey, sTechInits, sTechName, bIsActive, lServiceLocationKey, ...
router.get('/Repair/GetAllTechs', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lTechnicianKey, sTechInits, sTechName, bIsActive, lServiceLocationKey
      FROM tblTechnicians ORDER BY sTechName`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Delivery Methods
// Actual columns: lDeliveryMethodKey, sDeliveryDesc, dblAmtShipping, nDaysRequired, sShipID, sDefaultYN, ...
// NO bActive column
router.get('/Repair/GetAllDeliveryMethods', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lDeliveryMethodKey, sDeliveryDesc, sDeliveryDesc AS sDeliveryMethodDesc,
             dblAmtShipping
      FROM tblDeliveryMethod ORDER BY sDeliveryDesc`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Repair Reasons
// Actual columns: lRepairReasonKey, sRepairReason, bActive, lRepairReasonCategoryKey
router.get('/Repair/GetAllRepairReasons', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lRepairReasonKey, sRepairReason, sRepairReason AS sRepairReasonDesc, bActive
      FROM tblRepairReasons ORDER BY sRepairReason`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Patient Safety Levels — NO dedicated table exists in DB.
// Return empty array to prevent frontend errors.
router.get('/Repair/GetAllPatientSafetyLevels', async (req, res, next) => {
  try {
    res.json([]);
  } catch (e) { next(e); }
});

// Sales Reps
// Actual columns: lSalesRepKey, sRepFirst, sRepLast, sRepInits, sRepEMail, sActiveFlag, ...
router.get('/SalesRepNames/GetAllSalesRepNames', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lSalesRepKey, lSalesRepKey AS lSalesRepNameKey,
             sRepFirst, sRepLast, sRepInits, sRepEMail, sActiveFlag,
             LTRIM(RTRIM(ISNULL(sRepFirst,'') + ' ' + ISNULL(sRepLast,''))) AS sSalesRepName
      FROM tblSalesRep ORDER BY sRepLast, sRepFirst`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Pricing Categories
// Actual columns: lPricingCategoryKey, sPricingDescription, bActive, ...
router.get('/PricingCategory/GetAllPricingCategories', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lPricingCategoryKey, sPricingDescription, bActive
      FROM tblPricingCategory ORDER BY sPricingDescription`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Payment Terms
// Actual columns: lPaymentTermsKey, sTermsDesc, nIncrementDays, sDefaultYN, ...
// NO bActive, NO lDueDays
router.get('/PaymentTerms/GetAllPaymentTerms', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lPaymentTermsKey, sTermsDesc, nIncrementDays AS lDueDays
      FROM tblPaymentTerms ORDER BY sTermsDesc`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Service Locations
// Actual columns: lServiceLocationKey, sServiceLocation, sTransNumberPrefix, bUsed
router.get('/ServiceLocation/GetAllServiceLocation', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lServiceLocationKey, sServiceLocation, sServiceLocation AS sServiceLocationName
      FROM tblServiceLocations ORDER BY lServiceLocationKey`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Distributors
// Actual columns: lDistributorKey, sDistName1, bActive, ...
router.get('/DistributorName/GetAllDistributorNames', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lDistributorKey, sDistName1
      FROM tblDistributor WHERE bActive = 1 ORDER BY sDistName1`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Scope Types (full catalog)
// tblManufacturer → tblManufacturers (plural); tblScopeTypeCategories has lScopeTypeCategoryKey
router.get('/Scopes/GetAllScopeType', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT st.lScopeTypeKey, st.sScopeTypeDesc, st.sRigidOrFlexible,
             st.lScopeTypeCatKey, st.lManufacturerKey,
             st.sAngUp, st.sAngDown, st.sAngLeft, st.sAngRight,
             m.sManufacturer AS sManufacturerName,
             ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory
      FROM tblScopeType st
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
      WHERE st.bActive = 1
      ORDER BY st.sScopeTypeDesc`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Scope Type Names (by instrument type filter)
router.get('/ScopeType/GetscopeTypeNameList', async (req, res, next) => {
  try {
    const type = req.query.psInstrumentType || null;
    const rows = await db.query(`
      SELECT lScopeTypeKey, sScopeTypeDesc, sRigidOrFlexible
      FROM tblScopeType
      WHERE bActive = 1 AND (@type IS NULL OR sRigidOrFlexible = @type)
      ORDER BY sScopeTypeDesc`, { type });
    res.json(rows);
  } catch (e) { next(e); }
});

// Credit Limits — stored in vwSysCodesCreditLimit (system codes view)
// Columns: lSystemCodesHdrKey, sGroupName, sHeaderText, lSystemCodesKey, sItemText, nOrdinal, ...
router.get('/CreditLimit/GetAllCreditLimits', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lSystemCodesKey AS lCreditLimitKey,
             sItemText AS sCreditLimitDesc,
             CAST(REPLACE(sItemText, ',', '') AS DECIMAL(18,2)) AS dblCreditLimitAmount
      FROM vwSysCodesCreditLimit ORDER BY nOrdinal`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Contract Types
// Table is tblContractTypes (plural), columns: lContractTypeKey, sContractType (not sContractTypeName)
router.get('/Contract/GetAllContractType', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lContractTypeKey, sContractType AS sContractTypeName
      FROM tblContractTypes ORDER BY sContractType`);
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
