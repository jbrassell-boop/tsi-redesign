// ═══════════════════════════════════════════════════════
//  flags.js — Flags + FlagTypes CRUD
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/Flag/GetFlagList — Flags filtered by owner and optionally type
router.get('/Flag/GetFlagList', async (req, res, next) => {
  try {
    const ownerKey = parseInt(req.query.lOwnerKey) || 0;
    const flagTypeKey = parseInt(req.query.lFlagTypeKey) || 0;
    const rows = await db.query(`
      SELECT f.lFlagKey, f.lFlagTypeKey, f.lOwnerKey, f.sFlag,
        f.bVisibleOnDI, f.bVisibleOnBlank,
        ISNULL(ft.sFlagType, '') AS sFlagType
      FROM tblFlags f
        LEFT JOIN tblFlagTypes ft ON ft.lFlagTypeKey = f.lFlagTypeKey
      WHERE f.lOwnerKey = @ownerKey
        AND (@flagTypeKey = 0 OR f.lFlagTypeKey = @flagTypeKey)
      ORDER BY ft.sFlagType, f.sFlag`, { ownerKey, flagTypeKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Flag/GetFlagTypes — All flag types
router.get('/Flag/GetFlagTypes', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lFlagTypeKey, sFlagType, bMultipleInstrumentTypes
      FROM tblFlagTypes ORDER BY sFlagType`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Flag/AddFlag — Insert new flag
router.post('/Flag/AddFlag', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.lOwnerKey || !b.lFlagTypeKey || !b.sFlag) {
      return res.status(400).json({ error: 'lOwnerKey, lFlagTypeKey, and sFlag required' });
    }
    const result = await db.query(`
      INSERT INTO tblFlags (lFlagTypeKey, lOwnerKey, sFlag, bVisibleOnDI, bVisibleOnBlank)
      VALUES (@flagTypeKey, @ownerKey, @flag, @visibleDI, @visibleBlank);
      SELECT SCOPE_IDENTITY() AS lFlagKey`,
      {
        flagTypeKey: b.lFlagTypeKey,
        ownerKey: b.lOwnerKey,
        flag: b.sFlag,
        visibleDI: b.bVisibleOnDI ? 1 : 0,
        visibleBlank: b.bVisibleOnBlank ? 1 : 0
      });
    const newKey = result[0] ? result[0].lFlagKey : 0;
    res.json({ lFlagKey: newKey, success: true });
  } catch (e) { next(e); }
});

// DELETE /api/Flag/DeleteFlag — Delete a flag
router.delete('/Flag/DeleteFlag', async (req, res, next) => {
  try {
    const flagKey = parseInt(req.query.lFlagKey) || 0;
    if (!flagKey) return res.status(400).json({ error: 'lFlagKey required' });
    await db.query('DELETE FROM tblFlags WHERE lFlagKey = @flagKey', { flagKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
