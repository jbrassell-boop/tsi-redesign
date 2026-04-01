// ═══════════════════════════════════════════════════════
//  quality.js — ISO Complaint / Quality endpoints
// ═══════════════════════════════════════════════════════
// tblISOComplaint: lISOComplaintKey, lRepairKey, dtDateReceived, mComplaint,
//   lRecvdByUserKey, lResponsibleMgrUserKey, dtDateAssigned, dtDateResponseDue,
//   dtEvalDate, dtFnlDispDate, sISOComplaint, sISONonConformance
const express = require('express');
const router = express.Router();
const db = require('../db');

// Shared SELECT for ISO complaint list queries
const COMPLAINT_SELECT = `
  SELECT
    ic.lISOComplaintKey, ic.lRepairKey, ic.dtDateReceived,
    ic.lRecvdByUserKey, ic.nRecvdByMethod,
    ic.lResponsibleMgrUserKey, ic.dtDateAssigned, ic.dtDateResponseDue,
    ic.dtEvalDate, ic.lEvalUserKey,
    ic.dtFnlDispDate, ic.lFnlDispQAUserKey,
    ic.sISOComplaint, ic.sISONonConformance,
    ic.mComplaint,
    ic.dtLastUpdate,
    ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
    ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
    ISNULL(s.sSerialNumber, '') AS sSerialNumber,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(c.sClientName1, '') AS sClientName1
  FROM tblISOComplaint ic
    LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
    LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey`;

// Helper: default dateFrom to 2 years ago if not provided
function defaultDateFrom(val) {
  return val || new Date(Date.now() - 2 * 365.25 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

// POST /api/Quality/GetAll — All ISO complaints with pagination + date range
router.post('/Quality/GetAll', async (req, res, next) => {
  try {
    const body = req.body || {};
    const dateFrom = defaultDateFrom(body.dateFrom);
    const dateTo = body.dateTo || null;

    const params = { dateFrom };
    let where = ' WHERE ic.dtDateReceived >= @dateFrom';
    if (dateTo) { where += ' AND ic.dtDateReceived <= @dateTo'; params.dateTo = dateTo; }

    const result = await db.queryPage(
      `${COMPLAINT_SELECT}${where}`,
      'ic.dtDateReceived DESC',
      params,
      body.Pagination
    );
    res.json({ success: true, data: result.dataSource, totalRecord: result.totalRecord });
  } catch (e) { next(e); }
});

// GET /api/Quality/GetAll — legacy fallback (TOP 500, no pagination)
router.get('/Quality/GetAll', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        ic.lISOComplaintKey, ic.lRepairKey, ic.dtDateReceived,
        ic.lRecvdByUserKey, ic.nRecvdByMethod,
        ic.lResponsibleMgrUserKey, ic.dtDateAssigned, ic.dtDateResponseDue,
        ic.dtEvalDate, ic.lEvalUserKey,
        ic.dtFnlDispDate, ic.lFnlDispQAUserKey,
        ic.sISOComplaint, ic.sISONonConformance,
        ic.dtLastUpdate,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblISOComplaint ic
        LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      ORDER BY ic.dtDateReceived DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Quality/GetByKey — Single ISO complaint
router.get('/Quality/GetByKey', async (req, res, next) => {
  try {
    const key = parseInt(req.query.lISOComplaintKey) || 0;
    if (!key) return res.status(400).json({ error: 'lISOComplaintKey required' });
    const row = await db.queryOne(`
      SELECT ic.*,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblISOComplaint ic
        LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE ic.lISOComplaintKey = @key`, { key });
    res.json(row || null);
  } catch (e) { next(e); }
});

// POST /api/Quality/Add — Create new ISO complaint record
router.post('/Quality/Add', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = parseInt(b.lRepairKey) || 0;
    const result = await db.query(`
      INSERT INTO tblISOComplaint (
        lRepairKey, dtDateReceived, lRecvdByUserKey, nRecvdByMethod,
        mComplaint, lResponsibleMgrUserKey,
        dtDateAssigned, dtDateResponseDue,
        sISOComplaint, sISONonConformance,
        dtLastUpdate
      ) VALUES (
        @repairKey, @dtDateReceived, @recvdByUser, @recvdByMethod,
        @complaint, @mgrUser,
        @dateAssigned, @dateDue,
        @isoComplaint, @isoNonConformance,
        GETDATE()
      );
      SELECT SCOPE_IDENTITY() AS lISOComplaintKey`,
      {
        repairKey: repairKey || null,
        dtDateReceived: b.dtDateReceived || null,
        recvdByUser: b.lRecvdByUserKey || null,
        recvdByMethod: b.nRecvdByMethod || 0,
        complaint: b.mComplaint || '',
        mgrUser: b.lResponsibleMgrUserKey || null,
        dateAssigned: b.dtDateAssigned || null,
        dateDue: b.dtDateResponseDue || null,
        isoComplaint: b.sISOComplaint || '',
        isoNonConformance: b.sISONonConformance || ''
      });
    const newKey = result[0] ? result[0].lISOComplaintKey : 0;
    res.json({ success: true, lISOComplaintKey: newKey });
  } catch (e) { next(e); }
});

// POST /api/Quality/Update — Update existing ISO complaint
router.post('/Quality/Update', async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = parseInt(b.lISOComplaintKey) || 0;
    if (!key) return res.status(400).json({ success: false, error: 'lISOComplaintKey required' });
    await db.query(`
      UPDATE tblISOComplaint SET
        mComplaint              = ISNULL(@complaint, mComplaint),
        sISONonConformance      = ISNULL(@isoNonConformance, sISONonConformance),
        sISOComplaint           = ISNULL(@isoComplaint, sISOComplaint),
        lResponsibleMgrUserKey  = ISNULL(@mgrUser, lResponsibleMgrUserKey),
        dtDateAssigned          = ISNULL(@dateAssigned, dtDateAssigned),
        dtDateResponseDue       = ISNULL(@dateDue, dtDateResponseDue),
        dtEvalDate              = ISNULL(@evalDate, dtEvalDate),
        lEvalUserKey            = ISNULL(@evalUser, lEvalUserKey),
        dtFnlDispDate           = ISNULL(@fnlDate, dtFnlDispDate),
        lFnlDispQAUserKey       = ISNULL(@fnlUser, lFnlDispQAUserKey),
        dtLastUpdate            = GETDATE()
      WHERE lISOComplaintKey = @key`,
      {
        key,
        complaint: b.mComplaint || null,
        isoNonConformance: b.sISONonConformance || null,
        isoComplaint: b.sISOComplaint || null,
        mgrUser: b.lResponsibleMgrUserKey || null,
        dateAssigned: b.dtDateAssigned || null,
        dateDue: b.dtDateResponseDue || null,
        evalDate: b.dtEvalDate || null,
        evalUser: b.lEvalUserKey || null,
        fnlDate: b.dtFnlDispDate || null,
        fnlUser: b.lFnlDispQAUserKey || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/Quality/GetNCRs — Non-conformance records with pagination + date range
router.post('/Quality/GetNCRs', async (req, res, next) => {
  try {
    const body = req.body || {};
    const dateFrom = defaultDateFrom(body.dateFrom);
    const dateTo = body.dateTo || null;

    const params = { dateFrom };
    let where = ` WHERE ic.sISONonConformance IS NOT NULL AND ic.sISONonConformance <> ''
      AND ic.dtDateReceived >= @dateFrom`;
    if (dateTo) { where += ' AND ic.dtDateReceived <= @dateTo'; params.dateTo = dateTo; }

    const result = await db.queryPage(
      `${COMPLAINT_SELECT}${where}`,
      'ic.dtDateReceived DESC',
      params,
      body.Pagination
    );
    res.json({ success: true, data: result.dataSource, totalRecord: result.totalRecord });
  } catch (e) { next(e); }
});

// GET /api/Quality/GetNCRs — legacy fallback (TOP 500, no pagination)
router.get('/Quality/GetNCRs', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        ic.lISOComplaintKey, ic.lRepairKey, ic.dtDateReceived,
        ic.lRecvdByUserKey, ic.nRecvdByMethod,
        ic.lResponsibleMgrUserKey, ic.dtDateAssigned, ic.dtDateResponseDue,
        ic.dtEvalDate, ic.lEvalUserKey,
        ic.dtFnlDispDate, ic.lFnlDispQAUserKey,
        ic.sISOComplaint, ic.sISONonConformance,
        ic.mComplaint,
        ic.dtLastUpdate,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblISOComplaint ic
        LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE ic.sISONonConformance IS NOT NULL AND ic.sISONonConformance <> ''
      ORDER BY ic.dtDateReceived DESC`, {});
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// POST /api/Quality/GetCAPAs — CAPA records with pagination + date range
// CAPA = complaints with an assigned manager and response due date (corrective action workflow)
router.post('/Quality/GetCAPAs', async (req, res, next) => {
  try {
    const body = req.body || {};
    const dateFrom = defaultDateFrom(body.dateFrom);
    const dateTo = body.dateTo || null;

    const params = { dateFrom };
    let where = ` WHERE ic.lResponsibleMgrUserKey IS NOT NULL
      AND ic.lResponsibleMgrUserKey > 0
      AND ic.dtDateAssigned IS NOT NULL
      AND ic.dtDateReceived >= @dateFrom`;
    if (dateTo) { where += ' AND ic.dtDateReceived <= @dateTo'; params.dateTo = dateTo; }

    const result = await db.queryPage(
      `${COMPLAINT_SELECT}${where}`,
      'ic.dtDateResponseDue ASC',
      params,
      body.Pagination
    );
    res.json({ success: true, data: result.dataSource, totalRecord: result.totalRecord });
  } catch (e) { next(e); }
});

// GET /api/Quality/GetCAPAs — legacy fallback (TOP 500, no pagination)
router.get('/Quality/GetCAPAs', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        ic.lISOComplaintKey, ic.lRepairKey, ic.dtDateReceived,
        ic.lRecvdByUserKey, ic.nRecvdByMethod,
        ic.lResponsibleMgrUserKey, ic.dtDateAssigned, ic.dtDateResponseDue,
        ic.dtEvalDate, ic.lEvalUserKey,
        ic.dtFnlDispDate, ic.lFnlDispQAUserKey,
        ic.sISOComplaint, ic.sISONonConformance,
        ic.mComplaint,
        ic.dtLastUpdate,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblISOComplaint ic
        LEFT JOIN tblRepair r ON r.lRepairKey = ic.lRepairKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE ic.lResponsibleMgrUserKey IS NOT NULL
        AND ic.lResponsibleMgrUserKey > 0
        AND ic.dtDateAssigned IS NOT NULL
      ORDER BY ic.dtDateResponseDue ASC`, {});
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// POST /api/Quality/GetRework — Rework repairs with pagination + date range
// Uses derived table to find scopes with multiple repairs within the date window (avoids O(n^2) subquery)
router.post('/Quality/GetRework', async (req, res, next) => {
  try {
    const body = req.body || {};
    const dateFrom = defaultDateFrom(body.dateFrom);
    const dateTo = body.dateTo || null;

    const params = { dateFrom };
    let dateFilter = 'r.dtDateIn >= @dateFrom';
    if (dateTo) { dateFilter += ' AND r.dtDateIn <= @dateTo'; params.dateTo = dateTo; }

    // Use a derived table (not a CTE) so queryPage can wrap this as a subquery
    const sql = `
      SELECT
        r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
        r.lDepartmentKey,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1,
        LTRIM(RTRIM(ISNULL(tech.sRepFirst,'') + ' ' + ISNULL(tech.sRepLast,''))) AS sTechName
      FROM tblRepair r
        INNER JOIN (
          SELECT lScopeKey FROM tblRepair
          WHERE lScopeKey > 0 AND dtDateIn >= @dateFrom
          GROUP BY lScopeKey HAVING COUNT(*) > 1
        ) mrs ON mrs.lScopeKey = r.lScopeKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
        LEFT JOIN tblSalesRep tech ON tech.lSalesRepKey = r.lTechnicianKey
      WHERE ${dateFilter}`;

    const result = await db.queryPage(sql, 'r.lScopeKey, r.dtDateIn DESC', params, body.Pagination);
    res.json({ success: true, data: result.dataSource, totalRecord: result.totalRecord });
  } catch (e) { next(e); }
});

// GET /api/Quality/GetRework — legacy fallback (TOP 500, no pagination)
router.get('/Quality/GetRework', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
        r.lDepartmentKey,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1,
        LTRIM(RTRIM(ISNULL(tech.sRepFirst,'') + ' ' + ISNULL(tech.sRepLast,''))) AS sTechName
      FROM tblRepair r
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
        LEFT JOIN tblSalesRep tech ON tech.lSalesRepKey = r.lTechnicianKey
      WHERE r.lScopeKey IN (
        SELECT lScopeKey FROM tblRepair
        WHERE lScopeKey > 0
        GROUP BY lScopeKey HAVING COUNT(*) > 1
      )
      ORDER BY r.lScopeKey, r.dtDateIn DESC`, {});
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
