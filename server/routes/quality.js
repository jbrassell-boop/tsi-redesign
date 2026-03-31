// ═══════════════════════════════════════════════════════
//  quality.js — ISO Complaint / Quality endpoints
// ═══════════════════════════════════════════════════════
// tblISOComplaint: lISOComplaintKey, lRepairKey, dtDateReceived, mComplaint,
//   lRecvdByUserKey, lResponsibleMgrUserKey, dtDateAssigned, dtDateResponseDue,
//   dtEvalDate, dtFnlDispDate, sISOComplaint, sISONonConformance
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/Quality/GetAll — All ISO complaints with repair/client info
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

// GET /api/Quality/GetNCRs — ISO complaints flagged as non-conformance (sISONonConformance set)
// Uses same safe column set as GetAll (TSI_Demo may lack some WinScopeNet columns)
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

// GET /api/Quality/GetCAPAs — Complaints where corrective action has been assigned
// CAPA = complaints with an assigned manager and response due date (corrective action workflow)
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

// GET /api/Quality/GetRework — Repairs where same scope was repaired within 40 days
// Identifies rework by finding scopes with multiple repairs in close succession
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
