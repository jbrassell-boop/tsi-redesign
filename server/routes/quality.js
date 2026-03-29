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

module.exports = router;
