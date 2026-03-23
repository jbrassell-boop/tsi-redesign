// ═══════════════════════════════════════════════════════
//  repairs.js — Repair CRUD + Dashboard scope data
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for repair list/detail (JOIN) ──
// Fixed columns vs actual DB schema:
//   tblRepair: NO lRepairLevelKey, lClientKey, lPatientSafetyLevelKey, sRigidOrFlexible, dblAmtTax, sIncludesCapYN, sIncludesWaterResCapYN
//   tblClient: NO sShipName1, sBillName1 (shipping/billing names are on tblDepartment)
//   tblManufacturer → tblManufacturers (plural)
//   tblPatientSafetyLevel → does not exist
//   Client is reached via department: d.lClientKey
//   Rigid/Flexible comes from scope type: st.sRigidOrFlexible
const REPAIR_SELECT = `
  SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
    r.dtShipDate, r.dtReqSent, r.dtAprRecvd, r.dtExpDelDate,
    r.lRepairStatusID, r.lDepartmentKey, r.lScopeKey,
    r.lTechnicianKey, r.lSalesRepKey, r.lContractKey,
    r.lDeliveryMethodKey, r.lPricingCategoryKey, r.lPaymentTermsKey,
    r.lRepairReasonKey,
    r.sComplaintDesc, r.sPurchaseOrder,
    r.dblAmtRepair, r.dblAmtShipping,
    r.bLoanerRequested, r.bOutsourced,
    r.lServiceLocationKey, r.sRackPosition,
    r.sShipTrackingNumber, r.sApprName,
    r.sAngInUp, r.sAngInDown, r.sAngInRight, r.sAngInLeft,
    r.sAngOutUp, r.sAngOutDown, r.sAngOutRight, r.sAngOutLeft,
    r.sBrokenFibersIn, r.sBrokenFibersOut,
    r.mComments, r.mCommentsISO, r.mCommentsDisIns,
    -- Enrichment JOINs
    rs.sRepairStatus,
    s.sSerialNumber,
    st.sScopeTypeDesc, st.lScopeTypeCatKey,
    st.sRigidOrFlexible,
    st.sAngUp AS sAngSpecUp, st.sAngDown AS sAngSpecDown,
    st.sAngLeft AS sAngSpecLeft, st.sAngRight AS sAngSpecRight,
    ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
    ISNULL(m.sManufacturer, '') AS sManufacturer,
    c.sClientName1,
    c.sShipAddr1, c.sShipAddr2, c.sShipCity, c.sShipState, c.sShipZip,
    c.sBillAddr1, c.sBillAddr2, c.sBillCity, c.sBillState, c.sBillZip,
    d.sDepartmentName,
    d.sShipName1 AS sShipName1, d.sBillName1 AS sBillName1,
    d.sShipName2 AS sDeptShipName,
    t.sTechName,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    dm.sDeliveryDesc AS sDeliveryMethodDesc,
    pt.sTermsDesc AS sPaymentTerms,
    pc.sPricingDescription,
    sl.sServiceLocation AS sServiceLocationName,
    rr.sRepairReason AS sRepairReasonDesc,
    rl.sRepairLevel
  FROM tblRepair r
    LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
    LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
    LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
    LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblTechnicians t ON t.lTechnicianKey = r.lTechnicianKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = r.lSalesRepKey
    LEFT JOIN tblDeliveryMethod dm ON dm.lDeliveryMethodKey = r.lDeliveryMethodKey
    LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = r.lPaymentTermsKey
    LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = r.lPricingCategoryKey
    LEFT JOIN tblServiceLocations sl ON sl.lServiceLocationKey = r.lServiceLocationKey
    LEFT JOIN tblRepairReasons rr ON rr.lRepairReasonKey = r.lRepairReasonKey
    LEFT JOIN tblRepairLevels rl ON rl.lRepairLevelKey = r.lRepairStatusID
`;

// GET /Repair/GetAllRepairs — List repairs (filtered)
router.get('/Repair/GetAllRepairs', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.plServiceLocationKey) || 0;
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    const rows = await db.query(`${REPAIR_SELECT}
      WHERE (@svcKey = 0 OR r.lServiceLocationKey = @svcKey)
        AND (@deptKey = 0 OR r.lDepartmentKey = @deptKey)
      ORDER BY r.dtDateIn DESC
      OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY`, { svcKey, deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Repair/GetAllrepairsBylRepairKey — Single repair detail
router.get('/Repair/GetAllrepairsBylRepairKey', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.plRepairKey) || 0;
    const row = await db.queryOne(`${REPAIR_SELECT}
      WHERE r.lRepairKey = @repairKey`, { repairKey });
    res.json(row ? [row] : []);
  } catch (e) { next(e); }
});

// POST /Repair/GetAllRepairList — Paginated repair list
router.post('/Repair/GetAllRepairList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const svcKey = parseInt(body.plServiceLocationKey) || 0;
    const result = await db.queryPage(`${REPAIR_SELECT}
      WHERE (@svcKey = 0 OR r.lServiceLocationKey = @svcKey)`,
      'r.dtDateIn DESC', { svcKey }, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /Repair/AddRepair — Create new repair
// tblRepair has no: lRepairLevelKey, sRigidOrFlexible, lRepairReasonKey exists
router.post('/Repair/AddRepair', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblRepair (lDepartmentKey, lScopeKey, sWorkOrderNumber, dtDateIn,
        lRepairStatusID, lServiceLocationKey, sComplaintDesc, lSalesRepKey,
        lPricingCategoryKey, lPaymentTermsKey, lRepairReasonKey)
      VALUES (@deptKey, @scopeKey, @wo, GETDATE(),
        1, @svcKey, @complaint, @repKey,
        @pricingKey, @termsKey, @reasonKey);
      SELECT SCOPE_IDENTITY() AS lRepairKey`,
      {
        deptKey: b.plDepartmentKey || b.lDepartmentKey || 0,
        scopeKey: b.plScopeKey || b.lScopeKey || 0,
        wo: b.psWorkOrderNumber || b.sWorkOrderNumber || '',
        svcKey: b.plServiceLocationKey || b.lServiceLocationKey || 1,
        complaint: b.psComplaintDesc || b.sComplaintDesc || '',
        repKey: b.plSalesRepKey || b.lSalesRepKey || 0,
        pricingKey: b.plPricingCategoryKey || b.lPricingCategoryKey || 0,
        termsKey: b.plPaymentTermsKey || b.lPaymentTermsKey || 0,
        reasonKey: b.plRepairReasonKey || b.lRepairReasonKey || 0
      });
    const newKey = result[0] ? result[0].lRepairKey : 0;
    res.json({ lRepairKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Repair/UpdateRepair — Update repair record
// Removed lRepairLevelKey (doesn't exist on tblRepair)
router.post('/Repair/UpdateRepair', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = b.plRepairKey || b.lRepairKey || 0;
    if (!repairKey) return res.status(400).json({ error: 'Missing repair key' });
    await db.query(`
      UPDATE tblRepair SET
        lRepairStatusID = ISNULL(@statusId, lRepairStatusID),
        lTechnicianKey = ISNULL(@techKey, lTechnicianKey),
        lDeliveryMethodKey = ISNULL(@delivKey, lDeliveryMethodKey),
        sPurchaseOrder = ISNULL(@po, sPurchaseOrder),
        sRackPosition = ISNULL(@rack, sRackPosition),
        sComplaintDesc = ISNULL(@complaint, sComplaintDesc),
        sAngInUp = ISNULL(@angU, sAngInUp),
        sAngInDown = ISNULL(@angD, sAngInDown),
        sAngInRight = ISNULL(@angR, sAngInRight),
        sAngInLeft = ISNULL(@angL, sAngInLeft),
        mComments = ISNULL(@notes, mComments),
        mCommentsDisIns = ISNULL(@diNotes, mCommentsDisIns),
        dtLastUpdate = GETDATE()
      WHERE lRepairKey = @repairKey`,
      {
        repairKey,
        statusId: b.plRepairStatusID || b.lRepairStatusID || null,
        techKey: b.plTechnicianKey || b.lTechnicianKey || null,
        delivKey: b.plDeliveryMethodKey || b.lDeliveryMethodKey || null,
        po: b.psPurchaseOrder || b.sPurchaseOrder || null,
        rack: b.psRackPosition || b.sRackPosition || null,
        complaint: b.psComplaintDesc || b.sComplaintDesc || null,
        angU: b.psAngInUp || b.sAngInUp || null,
        angD: b.psAngInDown || b.sAngInDown || null,
        angR: b.psAngInRight || b.sAngInRight || null,
        angL: b.psAngInLeft || b.sAngInLeft || null,
        notes: b.psMComments || b.mComments || null,
        diNotes: b.psMCommentsDisIns || b.mCommentsDisIns || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /Repair/DeleteRepair — Delete repair and related records
router.delete('/Repair/DeleteRepair', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.plRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ error: 'Missing repair key' });
    await db.query('DELETE FROM tblRepairItemTran WHERE lRepairKey = @repairKey', { repairKey });
    await db.query('DELETE FROM tblStatusTran WHERE lRepairKey = @repairKey', { repairKey });
    await db.query('DELETE FROM tblRepair WHERE lRepairKey = @repairKey', { repairKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /Dashboard/GetDashboardScopeDataList — Dashboard repair list
// sRigidOrFlexible comes from scope type (st.), not repair (r.)
router.post('/Dashboard/GetDashboardScopeDataList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const svcKey = parseInt(body.plServiceLocationKey) || 0;
    const type = body.instrumentTypeValue || 'all';
    let typeFilter = '';
    if (type === 'Flexible' || type === 'F') typeFilter = "AND st.sRigidOrFlexible = 'F'";
    else if (type === 'Rigid' || type === 'R') typeFilter = "AND st.sRigidOrFlexible = 'R'";

    const rows = await db.query(`${REPAIR_SELECT}
      WHERE (@svcKey = 0 OR r.lServiceLocationKey = @svcKey)
        ${typeFilter}
      ORDER BY r.dtDateIn DESC`, { svcKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
