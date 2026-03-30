// ═══════════════════════════════════════════════════════
//  pending-arrivals.js — Expected arrivals (dashboard)
//  tblPendingArrival tracks scopes expected to arrive
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

const PA_SELECT = `
  SELECT pa.lPendingArrivalKey, pa.lScopeTypeKey, pa.lDepartmentKey,
    pa.lServiceLocationKey, pa.sSerialNumber, pa.sStatus,
    pa.sPurchaseOrder, pa.dtExpectedDate, pa.dtReceivedDate,
    pa.mComments, pa.dtCreateDate,
    ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
    ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
    ISNULL(m.sManufacturer, '') AS sManufacturer,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(c.sClientName1, '') AS sClientName1
  FROM tblPendingArrival pa
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = pa.lScopeTypeKey
    LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = pa.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
`;

// GET /PendingArrival/GetAllPendingArrivals — List pending arrivals
router.get('/PendingArrival/GetAllPendingArrivals', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.plServiceLocationKey) || 0;
    const status = req.query.psStatus || '';
    const rows = await db.query(`${PA_SELECT}
      WHERE (@svcKey = 0 OR pa.lServiceLocationKey = @svcKey)
        AND (@status = '' OR pa.sStatus = @status)
      ORDER BY pa.dtExpectedDate`, { svcKey, status });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /PendingArrival/GetPendingArrivalByKey — Single record
router.get('/PendingArrival/GetPendingArrivalByKey', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingArrivalKey) || 0;
    if (!key) return res.status(400).json({ error: 'plPendingArrivalKey required' });
    const row = await db.queryOne(`${PA_SELECT}
      WHERE pa.lPendingArrivalKey = @key`, { key });
    res.json(row);
  } catch (e) { next(e); }
});

// POST /PendingArrival/AddPendingArrival — Create
router.post('/PendingArrival/AddPendingArrival', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblPendingArrival (lScopeTypeKey, lDepartmentKey, lServiceLocationKey,
        sSerialNumber, sStatus, sPurchaseOrder, dtExpectedDate, mComments, dtCreateDate)
      VALUES (@scopeTypeKey, @deptKey, @svcKey,
        @serial, 'pending', @po, @expDate, @comments, GETDATE());
      SELECT SCOPE_IDENTITY() AS lPendingArrivalKey`,
      {
        scopeTypeKey: b.lScopeTypeKey || 0,
        deptKey: b.lDepartmentKey || 0,
        svcKey: b.lServiceLocationKey || 1,
        serial: b.sSerialNumber || '',
        po: b.sPurchaseOrder || '',
        expDate: b.dtExpectedDate || null,
        comments: b.mComments || ''
      });
    const newKey = result[0] ? result[0].lPendingArrivalKey : 0;
    res.json({ lPendingArrivalKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /PendingArrival/UpdatePendingArrival — Update
router.post('/PendingArrival/UpdatePendingArrival', async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = b.lPendingArrivalKey || 0;
    if (!key) return res.status(400).json({ error: 'lPendingArrivalKey required' });
    await db.query(`
      UPDATE tblPendingArrival SET
        sStatus = ISNULL(@status, sStatus),
        sPurchaseOrder = ISNULL(@po, sPurchaseOrder),
        dtExpectedDate = ISNULL(@expDate, dtExpectedDate),
        mComments = ISNULL(@comments, mComments)
      WHERE lPendingArrivalKey = @key`,
      {
        key,
        status: b.sStatus || null,
        po: b.sPurchaseOrder || null,
        expDate: b.dtExpectedDate || null,
        comments: b.mComments || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /PendingArrival/DeletePendingArrival — Delete
router.delete('/PendingArrival/DeletePendingArrival', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingArrivalKey) || 0;
    if (!key) return res.status(400).json({ error: 'plPendingArrivalKey required' });
    await db.query('DELETE FROM tblPendingArrival WHERE lPendingArrivalKey = @key', { key });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /PendingArrival/ReceiveArrival — Mark as received, optionally create scope
router.post('/PendingArrival/ReceiveArrival', async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = b.lPendingArrivalKey || 0;
    if (!key) return res.status(400).json({ error: 'lPendingArrivalKey required' });
    await db.query(`
      UPDATE tblPendingArrival SET sStatus = 'received', dtReceivedDate = GETDATE()
      WHERE lPendingArrivalKey = @key`, { key });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
