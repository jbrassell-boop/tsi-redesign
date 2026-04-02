// ═══════════════════════════════════════════════════════
//  loaners.js — Loaner instrument management
// ═══════════════════════════════════════════════════════
// tblLoanerTran: lLoanerTranKey, lDepartmentKey, lScopeKey, lRepairKey, lSalesRepKey,
//   lDeliveryMethodKey, sDateOut, sDateIn, sPurchaseOrder, sRepairClosed, lContractKey
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for loaner list ──
const LOANER_SELECT = `
  SELECT lt.lLoanerTranKey, lt.lDepartmentKey, lt.lScopeKey,
    lt.lRepairKey, lt.lSalesRepKey, lt.lDeliveryMethodKey,
    lt.sDateOut, lt.sDateIn, lt.sPurchaseOrder, lt.sRepairClosed,
    lt.lContractKey, lt.sTrackingNumber,
    ISNULL(s.sSerialNumber, '') AS sSerialNumber,
    ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
    ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(c.sClientName1, '') AS sClientName1,
    ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    ISNULL(dm.sDeliveryDesc, '') AS sDeliveryMethodDesc
  FROM tblLoanerTran lt
    LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
    LEFT JOIN tblDeliveryMethod dm ON dm.lDeliveryMethodKey = lt.lDeliveryMethodKey
`;

// GET /api/Loaner/GetAll — All loaners, optionally filtered by department
router.get('/Loaner/GetAll', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    const openOnly = req.query.openOnly === '1';
    const rows = await db.query(`${LOANER_SELECT}
      WHERE (@deptKey = 0 OR lt.lDepartmentKey = @deptKey)
        AND (@openOnly = 0 OR lt.sRepairClosed = '0' OR lt.sDateIn IS NULL OR lt.sDateIn = '')
      ORDER BY lt.lLoanerTranKey DESC`, { deptKey, openOnly: openOnly ? 1 : 0 });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Loaner/GetByRepair — Loaners for a specific repair
router.get('/Loaner/GetByRepair', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.lRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ error: 'lRepairKey required' });
    const rows = await db.query(`${LOANER_SELECT}
      WHERE lt.lRepairKey = @repairKey
      ORDER BY lt.lLoanerTranKey`, { repairKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Loaner/Add — Create loaner transaction
router.post('/Loaner/Add', async (req, res, next) => {
  try {
    const b = req.body || {};
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    const scopeKey = parseInt(b.lScopeKey) || 0;
    if (!deptKey || !scopeKey) {
      return res.status(400).json({ error: 'lDepartmentKey and lScopeKey required' });
    }
    const result = await db.query(`
      INSERT INTO tblLoanerTran (lDepartmentKey, lScopeKey, lRepairKey,
        lSalesRepKey, lDeliveryMethodKey, sDateOut, sDateIn,
        sPurchaseOrder, sRepairClosed, lContractKey, dtCreateDate)
      VALUES (@deptKey, @scopeKey, @repairKey,
        @repKey, @delivKey, @dateOut, @dateIn,
        @po, '0', @contractKey, GETDATE());
      SELECT SCOPE_IDENTITY() AS lLoanerTranKey`,
      {
        deptKey,
        scopeKey,
        repairKey: b.lRepairKey || null,
        repKey: b.lSalesRepKey || null,
        delivKey: b.lDeliveryMethodKey || null,
        dateOut: b.sDateOut || '',
        dateIn: b.sDateIn || '',
        po: b.sPurchaseOrder || '',
        contractKey: b.lContractKey || null
      });
    const newKey = result[0] ? result[0].lLoanerTranKey : 0;
    res.json({ lLoanerTranKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /api/Loaner/Update — Update loaner transaction
router.post('/Loaner/Update', async (req, res, next) => {
  try {
    const b = req.body || {};
    const loanerKey = b.lLoanerTranKey || 0;
    if (!loanerKey) return res.status(400).json({ error: 'lLoanerTranKey required' });
    await db.query(`
      UPDATE tblLoanerTran SET
        sDateOut = ISNULL(@dateOut, sDateOut),
        sDateIn = ISNULL(@dateIn, sDateIn),
        sPurchaseOrder = ISNULL(@po, sPurchaseOrder),
        sRepairClosed = ISNULL(@closed, sRepairClosed),
        sTrackingNumber = ISNULL(@tracking, sTrackingNumber),
        dtLastUpdate = GETDATE()
      WHERE lLoanerTranKey = @loanerKey`,
      {
        loanerKey,
        dateOut: b.sDateOut || null,
        dateIn: b.sDateIn || null,
        po: b.sPurchaseOrder || null,
        closed: b.sRepairClosed || null,
        tracking: b.sTrackingNumber || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/Loaner/GetRequests — Loaner requests with computed status
// Returns pending, approved, fulfilled, and declined requests within date range
router.get('/Loaner/GetRequests', async (req, res, next) => {
  try {
    const startDate = req.query.startDate || null;
    const endDate = req.query.endDate || null;
    const rows = await db.query(`
      SELECT lt.lLoanerTranKey, lt.lDepartmentKey, lt.lScopeKey,
        lt.lRepairKey, lt.lSalesRepKey,
        lt.sDateOut, lt.sDateIn, lt.sPurchaseOrder, lt.sRepairClosed,
        lt.dtCreateDate, lt.sTrackingNumber, lt.lContractKey,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
        CASE
          WHEN lt.sRepairClosed = '1' AND lt.lScopeKey = 0 THEN 'Declined'
          WHEN lt.lScopeKey > 0 AND (lt.sDateOut IS NOT NULL AND lt.sDateOut <> '') THEN 'Fulfilled'
          WHEN lt.lScopeKey > 0 THEN 'Approved'
          ELSE 'Pending'
        END AS sRequestStatus
      FROM tblLoanerTran lt
        LEFT JOIN tblScope s ON s.lScopeKey = lt.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = lt.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
        LEFT JOIN tblRepair r ON r.lRepairKey = lt.lRepairKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = lt.lSalesRepKey
      WHERE lt.dtCreateDate >= ISNULL(@startDate, DATEADD(DAY, -90, GETDATE()))
        AND lt.dtCreateDate <= ISNULL(@endDate, GETDATE())
      ORDER BY lt.lLoanerTranKey DESC`,
      { startDate, endDate });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// POST /api/Loaner/Request — Create a new loaner request (no scope assigned yet)
router.post('/Loaner/Request', async (req, res, next) => {
  try {
    const b = req.body || {};
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ success: false, error: 'lDepartmentKey required' });
    const result = await db.query(`
      INSERT INTO tblLoanerTran (lDepartmentKey, lScopeKey, lRepairKey,
        lSalesRepKey, lDeliveryMethodKey, sDateOut, sDateIn,
        sPurchaseOrder, sRepairClosed, lContractKey, dtCreateDate)
      VALUES (@deptKey, 0, @repairKey,
        @salesRepKey, @delivKey, '', '',
        @po, '0', @contractKey, GETDATE());
      SELECT SCOPE_IDENTITY() AS lLoanerTranKey`,
      {
        deptKey,
        repairKey: b.lRepairKey || null,
        salesRepKey: b.lSalesRepKey || null,
        delivKey: b.lDeliveryMethodKey || null,
        po: b.sPurchaseOrder || '',
        contractKey: b.lContractKey || null
      });
    const newKey = result[0] ? result[0].lLoanerTranKey : 0;
    res.json({ success: true, lLoanerTranKey: newKey });
  } catch (e) { next(e); }
});

// POST /api/Loaner/FulfillRequest — Assign a scope to an existing loaner request
router.post('/Loaner/FulfillRequest', async (req, res, next) => {
  try {
    const b = req.body || {};
    const loanerKey = parseInt(b.lLoanerTranKey) || 0;
    const scopeKey = parseInt(b.lScopeKey) || 0;
    if (!loanerKey || !scopeKey) {
      return res.status(400).json({ success: false, error: 'lLoanerTranKey and lScopeKey required' });
    }
    await db.query(`
      UPDATE tblLoanerTran SET
        lScopeKey = @scopeKey,
        sDateOut = ISNULL(@dateOut, sDateOut),
        sTrackingNumber = ISNULL(@tracking, sTrackingNumber),
        dtLastUpdate = GETDATE()
      WHERE lLoanerTranKey = @loanerKey`,
      {
        loanerKey,
        scopeKey,
        dateOut: b.sDateOut || null,
        tracking: b.sTrackingNumber || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/Loaner/DeclineRequest — Mark a pending request as declined
router.post('/Loaner/DeclineRequest', async (req, res, next) => {
  try {
    const b = req.body || {};
    const loanerKey = parseInt(b.lLoanerTranKey) || 0;
    if (!loanerKey) return res.status(400).json({ success: false, error: 'lLoanerTranKey required' });
    await db.query(`
      UPDATE tblLoanerTran SET
        sRepairClosed = '1',
        dtLastUpdate = GETDATE()
      WHERE lLoanerTranKey = @loanerKey AND lScopeKey = 0`,
      { loanerKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/Loaner/Delete — Soft-delete (mark closed) a loaner transaction
router.delete('/Loaner/Delete', async (req, res, next) => {
  try {
    const loanerKey = parseInt(req.query.lLoanerTranKey) || 0;
    if (!loanerKey) return res.status(400).json({ success: false, error: 'lLoanerTranKey required' });
    await db.query(`
      UPDATE tblLoanerTran SET sRepairClosed = '1', dtLastUpdate = GETDATE()
      WHERE lLoanerTranKey = @loanerKey`,
      { loanerKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/Loaner/GetAllList — Paginated loaner list with optional dept + open-only filter
router.post('/Loaner/GetAllList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const deptKey = parseInt(body.plDepartmentKey) || 0;
    const openOnly = body.openOnly ? 1 : 0;
    const result = await db.queryPage(`${LOANER_SELECT}
      WHERE (@deptKey = 0 OR lt.lDepartmentKey = @deptKey)
        AND (@openOnly = 0 OR lt.sRepairClosed = '0' OR lt.sDateIn IS NULL OR lt.sDateIn = '')`,
      'lt.lLoanerTranKey DESC', { deptKey, openOnly }, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
