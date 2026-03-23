// ═══════════════════════════════════════════════════════
//  repair-status.js — Status transition history
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /StatusTran/GetAllRepairStatusesList — Status history for a repair
// tblStatusTran: mTranComments (not sTranComments)
// tblUser → tblUsers; has sUserName, sUserFullName
router.get('/StatusTran/GetAllRepairStatusesList', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.plRepairKey) || 0;
    const rows = await db.query(`
      SELECT st.lStatusTranKey, st.lRepairKey, st.lStatusKey,
        st.dtCompleteDate, st.mTranComments AS sTranComments,
        rs.sRepairStatus,
        ISNULL(u.sUserFullName, ISNULL(u.sUserName, '')) AS sUserName
      FROM tblStatusTran st
        LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = st.lStatusKey
        LEFT JOIN tblUsers u ON u.lUserKey = st.lUserKey
      WHERE st.lRepairKey = @repairKey
      ORDER BY st.dtCompleteDate`, { repairKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /StatusTran/AddRepairStatus — Add a status transition
// Column is mTranComments, not sTranComments
router.post('/StatusTran/AddRepairStatus', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblStatusTran (lRepairKey, lStatusKey, dtCompleteDate, mTranComments, lUserKey)
      VALUES (@repairKey, @statusKey, GETDATE(), @comments, @userKey);
      SELECT SCOPE_IDENTITY() AS lStatusTranKey`,
      {
        repairKey: b.plRepairKey || b.lRepairKey || 0,
        statusKey: b.plStatusKey || b.lStatusKey || 0,
        comments: b.psTranComments || b.sTranComments || '',
        userKey: b.plUserKey || b.lUserKey || 0
      });
    // Also update the repair record's status
    const repairKey = b.plRepairKey || b.lRepairKey || 0;
    const statusKey = b.plStatusKey || b.lStatusKey || 0;
    if (repairKey && statusKey) {
      await db.query('UPDATE tblRepair SET lRepairStatusID = @statusKey WHERE lRepairKey = @repairKey',
        { repairKey, statusKey });
    }
    res.json({ lStatusTranKey: result[0]?.lStatusTranKey || 0, success: true });
  } catch (e) { next(e); }
});

module.exports = router;
