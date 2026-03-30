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
      FROM tblTechnicians WHERE bIsActive = 1 ORDER BY sTechName`);
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

// Patient Safety Levels — no dedicated table in WinScopeNet DB.
// Return static list matching BrightLogix API convention.
router.get('/Repair/GetAllPatientSafetyLevels', (req, res) => {
  res.json([
    { id: 1, name: 'Level 1' },
    { id: 2, name: 'Level 2' },
    { id: 3, name: 'Level 3' }
  ]);
});

// Sales Reps
// Actual columns: lSalesRepKey, sRepFirst, sRepLast, sRepInits, sRepEMail, sActiveFlag, ...
router.get('/SalesRepNames/GetAllSalesRepNames', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lSalesRepKey, lSalesRepKey AS lSalesRepNameKey,
             sRepFirst, sRepLast, sRepInits, sRepEMail, sActiveFlag,
             LTRIM(RTRIM(ISNULL(sRepFirst,'') + ' ' + ISNULL(sRepLast,''))) AS sSalesRepName
      FROM tblSalesRep WHERE sActiveFlag = 'Y' ORDER BY sRepLast, sRepFirst`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Pricing Categories
// Actual columns: lPricingCategoryKey, sPricingDescription, bActive, ...
router.get('/PricingCategory/GetAllPricingCategories', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lPricingCategoryKey, sPricingDescription, bActive
      FROM tblPricingCategory WHERE bActive = 1 ORDER BY sPricingDescription`);
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
      WHERE (st.bActive = 1 OR st.bActive IS NULL)
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
      WHERE (bActive = 1 OR bActive IS NULL) AND (@type IS NULL OR sRigidOrFlexible = @type)
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

// Parent Groups (static — no SQL table, derived from sInstrumentType)
router.get('/ParentGroups/GetAll', (req, res) => {
  res.json([
    {key:1,code:'CAM',name:'Camera & Video',sortOrder:1,badge:'C'},
    {key:2,code:'CART',name:'EndoCarts',sortOrder:2,badge:'E'},
    {key:3,code:'FLEX',name:'Flexible Endoscopes',sortOrder:3,badge:'F'},
    {key:4,code:'INST',name:'Instruments',sortOrder:4,badge:'I'},
    {key:5,code:'RIGID',name:'Rigid Scopes',sortOrder:5,badge:'R'},
    {key:6,code:'SALE',name:'Product Sales',sortOrder:6,badge:'S'},
    {key:7,code:'SITE',name:'Site Service',sortOrder:7,badge:'V'}
  ]);
});

// Instrument Types (distinct sRigidOrFlexible values from tblScopeType)
router.get('/InstrumentType/GetInstrumentTypes', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT DISTINCT sRigidOrFlexible AS type
      FROM tblScopeType
      WHERE (bActive = 1 OR bActive IS NULL) AND sRigidOrFlexible IS NOT NULL
      ORDER BY sRigidOrFlexible`);
    // Map to labeled objects
    const labelMap = { R: 'Rigid', F: 'Flexible', C: 'Camera', I: 'Instrument' };
    const result = rows
      .filter(r => r.type && labelMap[r.type])
      .map(r => ({
        type: r.type,
        label: labelMap[r.type] || r.type,
        sInstrumentType: r.type,
        sInstrumentTypeKey: r.type,
        sDescription: labelMap[r.type] || r.type
      }));
    res.json(result);
  } catch (e) { next(e); }
});

// All Technicians (full list including inactive — for admin use)
router.get('/Technicians/GetAllTechnicians', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lTechnicianKey, sTechInits, sTechName, bIsActive, lServiceLocationKey
      FROM tblTechnicians ORDER BY sTechName`);
    res.json(rows);
  } catch (e) { next(e); }
});

// Instrument Groups (static — sub-groups within INST parent)
router.get('/InstrumentGroups/GetAll', (req, res) => {
  res.json([
    {key:1,code:'ARTH',name:'Arthroscopy',parentCode:'INST',sortOrder:1},
    {key:2,code:'BONE',name:'Bone & Orthopedic',parentCode:'INST',sortOrder:2},
    {key:3,code:'CLMP',name:'Clamps & Hemostats',parentCode:'INST',sortOrder:3},
    {key:4,code:'CNTR',name:'Containers & Trays',parentCode:'INST',sortOrder:4},
    {key:5,code:'CURE',name:'Curettes & Elevators',parentCode:'INST',sortOrder:5},
    {key:6,code:'DENT',name:'Dental',parentCode:'INST',sortOrder:6},
    {key:7,code:'ELEC',name:'Electrosurgical',parentCode:'INST',sortOrder:7},
    {key:8,code:'FORC',name:'Forceps & Graspers',parentCode:'INST',sortOrder:8},
    {key:9,code:'LAP',name:'Laparoscopic',parentCode:'INST',sortOrder:9},
    {key:10,code:'MICR',name:'Microsurgical',parentCode:'INST',sortOrder:10},
    {key:11,code:'NEED',name:'Needle Holders & Drivers',parentCode:'INST',sortOrder:11},
    {key:12,code:'OPHT',name:'Ophthalmic',parentCode:'INST',sortOrder:12},
    {key:13,code:'PWR',name:'Power Tools',parentCode:'INST',sortOrder:13},
    {key:14,code:'RETR',name:'Retractors & Speculums',parentCode:'INST',sortOrder:14},
    {key:15,code:'RONG',name:'Rongeurs & Punches',parentCode:'INST',sortOrder:15},
    {key:16,code:'SCIS',name:'Scissors',parentCode:'INST',sortOrder:16},
    {key:17,code:'SPEC',name:'Specialty & Misc',parentCode:'INST',sortOrder:17}
  ]);
});

module.exports = router;
