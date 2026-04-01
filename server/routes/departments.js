// ═══════════════════════════════════════════════════════
//  departments.js — Department CRUD + GPO routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for department list ──
// tblDepartment actual columns:
//   sContactPhoneVoice (not sPhoneVoice), sContactPhoneFAX (not sPhoneFAX),
//   sContactEMail (not sEMailAddress), sGPID (not GPOID), no GLN,
//   dtCreateDate (not dtDateCreated)
const DEPT_SELECT = `
  SELECT d.lDepartmentKey, d.sDepartmentName, d.lClientKey,
    d.lServiceLocationKey, d.lSalesRepKey, d.lPricingCategoryKey,
    d.sShipName1, d.sShipName2, d.sShipAddr1, d.sShipAddr2, d.sShipCity, d.sShipState, d.sShipZip,
    d.sBillName1, d.sBillName2, d.sBillAddr1, d.sBillAddr2, d.sBillCity, d.sBillState, d.sBillZip,
    d.sContactPhoneVoice AS sPhoneVoice, d.sContactPhoneFAX AS sPhoneFAX,
    d.sContactEMail AS sEMailAddress, d.sContactEMail AS sContactEmail,
    d.sGPID AS GPOID, d.bActive,
    d.mComments, d.dtCreateDate, d.dtLastUpdate,
    c.sClientName1,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    ISNULL(sl.sServiceLocation, '') AS sServiceLocationName,
    ISNULL(pc.sPricingDescription, '') AS sPricingCategory
  FROM tblDepartment d
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = d.lSalesRepKey
    LEFT JOIN tblServiceLocations sl ON sl.lServiceLocationKey = d.lServiceLocationKey
    LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = d.lPricingCategoryKey
`;

// GET /Departments/GetAllDepartments — List departments (filtered by service location)
router.get('/Departments/GetAllDepartments', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.plServiceLocationKey) || 0;
    const rows = await db.query(`${DEPT_SELECT}
      WHERE d.bActive = 1 AND (@svcKey = 0 OR d.lServiceLocationKey = @svcKey)
      ORDER BY d.sDepartmentName`, { svcKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Departments/GetDepartmentDetailsByDepartmentId — Single department
router.get('/Departments/GetDepartmentDetailsByDepartmentId', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    const row = await db.queryOne(`${DEPT_SELECT}
      WHERE d.lDepartmentKey = @deptKey`, { deptKey });
    res.json(row);
  } catch (e) { next(e); }
});

// POST /Departments/AddDepartment — Insert new department
// sPhoneVoice → sContactPhoneVoice, sPhoneFAX → sContactPhoneFAX,
// sEMailAddress → sContactEMail, GPOID → sGPID, no GLN, dtDateCreated → dtCreateDate
router.post('/Departments/AddDepartment', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblDepartment (sDepartmentName, lClientKey, lServiceLocationKey,
        lSalesRepKey, lPricingCategoryKey,
        sShipName1, sShipName2, sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip,
        sBillName1, sBillName2, sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip,
        sContactPhoneVoice, sContactPhoneFAX, sContactEMail,
        sGPID, bActive, dtCreateDate)
      VALUES (@name, @clientKey, @svcKey,
        @repKey, @pricingKey,
        @shipName1, @shipName2, @shipAddr1, @shipAddr2, @shipCity, @shipState, @shipZip,
        @billName1, @billName2, @billAddr1, @billAddr2, @billCity, @billState, @billZip,
        @phone, @fax, @email,
        @gpoid, 1, GETDATE());
      SELECT SCOPE_IDENTITY() AS lDepartmentKey`,
      {
        name: b.sDepartmentName || b.psDepartmentName || '',
        clientKey: b.lClientKey || b.plClientKey || 0,
        svcKey: b.lServiceLocationKey || b.plServiceLocationKey || 1,
        repKey: b.lSalesRepKey || b.plSalesRepKey || 0,
        pricingKey: b.lPricingCategoryKey || b.plPricingCategoryKey || 0,
        shipName1: b.sShipName1 || '',
        shipName2: b.sShipName2 || '',
        shipAddr1: b.sShipAddr1 || '',
        shipAddr2: b.sShipAddr2 || '',
        shipCity: b.sShipCity || '',
        shipState: b.sShipState || '',
        shipZip: b.sShipZip || '',
        billName1: b.sBillName1 || '',
        billName2: b.sBillName2 || '',
        billAddr1: b.sBillAddr1 || '',
        billAddr2: b.sBillAddr2 || '',
        billCity: b.sBillCity || '',
        billState: b.sBillState || '',
        billZip: b.sBillZip || '',
        phone: b.sPhoneVoice || b.sContactPhoneVoice || '',
        fax: b.sPhoneFAX || b.sContactPhoneFAX || '',
        email: b.sEMailAddress || b.sContactEMail || '',
        gpoid: b.GPOID || b.sGPID || ''
      });
    const newKey = result[0] ? result[0].lDepartmentKey : 0;
    res.json({ lDepartmentKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Departments/UpdateDepartment — Update department record
router.post('/Departments/UpdateDepartment', async (req, res, next) => {
  try {
    const b = req.body || {};
    const deptKey = b.lDepartmentKey || 0;
    if (!deptKey) return res.status(400).json({ error: 'Missing department key' });
    await db.query(`
      UPDATE tblDepartment SET
        sDepartmentName = ISNULL(@name, sDepartmentName),
        lClientKey = ISNULL(@clientKey, lClientKey),
        lServiceLocationKey = ISNULL(@svcKey, lServiceLocationKey),
        lSalesRepKey = ISNULL(@repKey, lSalesRepKey),
        lPricingCategoryKey = ISNULL(@pricingKey, lPricingCategoryKey),
        sShipName1 = ISNULL(@shipName1, sShipName1),
        sShipName2 = ISNULL(@shipName2, sShipName2),
        sShipAddr1 = ISNULL(@shipAddr1, sShipAddr1),
        sShipAddr2 = ISNULL(@shipAddr2, sShipAddr2),
        sShipCity = ISNULL(@shipCity, sShipCity),
        sShipState = ISNULL(@shipState, sShipState),
        sShipZip = ISNULL(@shipZip, sShipZip),
        sBillName1 = ISNULL(@billName1, sBillName1),
        sBillName2 = ISNULL(@billName2, sBillName2),
        sBillAddr1 = ISNULL(@billAddr1, sBillAddr1),
        sBillAddr2 = ISNULL(@billAddr2, sBillAddr2),
        sBillCity = ISNULL(@billCity, sBillCity),
        sBillState = ISNULL(@billState, sBillState),
        sBillZip = ISNULL(@billZip, sBillZip),
        sContactPhoneVoice = ISNULL(@phone, sContactPhoneVoice),
        sContactPhoneFAX = ISNULL(@fax, sContactPhoneFAX),
        sContactEMail = ISNULL(@email, sContactEMail),
        sGPID = ISNULL(@gpoid, sGPID),
        bActive = ISNULL(@active, bActive),
        dtLastUpdate = GETDATE()
      WHERE lDepartmentKey = @deptKey`,
      {
        deptKey,
        name: b.sDepartmentName || b.psDepartmentName || null,
        clientKey: b.lClientKey || b.plClientKey || null,
        svcKey: b.lServiceLocationKey || b.plServiceLocationKey || null,
        repKey: b.lSalesRepKey || b.plSalesRepKey || null,
        pricingKey: b.lPricingCategoryKey || b.plPricingCategoryKey || null,
        shipName1: b.sShipName1 || null,
        shipName2: b.sShipName2 || null,
        shipAddr1: b.sShipAddr1 || b.psAddress1 || null,
        shipAddr2: b.sShipAddr2 || b.psAddress2 || null,
        shipCity: b.sShipCity || b.psCity || null,
        shipState: b.sShipState || b.psState || null,
        shipZip: b.sShipZip || b.psZipCode || null,
        billName1: b.sBillName1 || null,
        billName2: b.sBillName2 || null,
        billAddr1: b.sBillAddr1 || b.psAddress1 || null,
        billAddr2: b.sBillAddr2 || b.psAddress2 || null,
        billCity: b.sBillCity || b.psCity || null,
        billState: b.sBillState || b.psState || null,
        billZip: b.sBillZip || b.psZipCode || null,
        phone: b.sPhoneVoice || b.sContactPhoneVoice || b.psPhoneNumber || null,
        fax: b.sPhoneFAX || b.sContactPhoneFAX || b.psFaxNumber || null,
        email: b.sEMailAddress || b.sContactEMail || null,
        gpoid: b.GPOID || b.sGPID || null,
        active: b.bActive != null ? b.bActive : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /Departments/DeleteDepartment — Delete department
router.delete('/Departments/DeleteDepartment', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ error: 'Missing department key' });
    await db.query('DELETE FROM tblDepartment WHERE lDepartmentKey = @deptKey', { deptKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /Departments/GetDepartmentKPIs — Open repairs, scopes, revenue, contract status
router.get('/Departments/GetDepartmentKPIs', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    if (!deptKey) return res.json({ openRepairs: 0, scopeCount: 0, revenueYTD: 0, contractStatus: 'None' });

    const row = await db.queryOne(`
      SELECT
        (SELECT COUNT(*) FROM tblRepair r
         LEFT JOIN tblInvoice inv ON inv.lRepairKey = r.lRepairKey
         WHERE r.lDepartmentKey = @deptKey AND inv.lRepairKey IS NULL) AS openRepairs,

        (SELECT COUNT(*) FROM tblScope WHERE lDepartmentKey = @deptKey) AS scopeCount,

        (SELECT ISNULL(SUM(gp.TotalAmountDue), 0)
         FROM tblGP_InvoiceStaging gp
         JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
         JOIN tblRepair r ON r.lRepairKey = inv.lRepairKey
         WHERE r.lDepartmentKey = @deptKey
           AND gp.dtTranDate >= DATEADD(YEAR, -1, GETDATE())) AS revenueYTD,

        (SELECT TOP 1
           CASE WHEN c.dtDateTermination >= GETDATE() THEN 'Active' ELSE 'Expired' END
         FROM tblContract c
         JOIN tblContractDepartments cd ON cd.lContractKey = c.lContractKey
         WHERE cd.lDepartmentKey = @deptKey
         ORDER BY c.dtDateTermination DESC) AS contractStatus
    `, { deptKey });

    res.json(row || { openRepairs: 0, scopeCount: 0, revenueYTD: 0, contractStatus: 'None' });
  } catch (e) { next(e); }
});

// GET /DepartmentReportingGroups/GetAllDepartmentGPOList — GPO associations for a department
// sGPID (not GPOID) on tblDepartment
router.get('/DepartmentReportingGroups/GetAllDepartmentGPOList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    const rows = await db.query(`
      SELECT d.lDepartmentKey, d.sGPID AS GPOID,
        g.lSystemCodesKey AS lDepartmentGPOKey,
        g.ContractIDNumber, g.dtStartDate, g.dtEndDate,
        g.RebatePercentage, g.sBillingFrequency, g.bInactive
      FROM tblDepartment d
        LEFT JOIN tblGPOs g ON g.ContractIDNumber = d.sGPID AND g.bInactive = 0
      WHERE d.lDepartmentKey = @deptKey AND d.sGPID IS NOT NULL AND d.sGPID <> ''
      ORDER BY g.dtStartDate DESC`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /Departments/GetAllDepartmentsList — Paginated department list with optional service location + client filter
router.post('/Departments/GetAllDepartmentsList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const svcKey = parseInt(body.plServiceLocationKey) || 0;
    const clientKey = parseInt(body.plClientKey) || 0;
    const result = await db.queryPage(`${DEPT_SELECT}
      WHERE d.bActive = 1
        AND (@svcKey = 0 OR d.lServiceLocationKey = @svcKey)
        AND (@clientKey = 0 OR d.lClientKey = @clientKey)`,
      'd.sDepartmentName', { svcKey, clientKey }, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
