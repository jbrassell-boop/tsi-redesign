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

module.exports = router;
