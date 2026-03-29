// ═══════════════════════════════════════════════════════
//  sub-groups.js — SubGroups CRUD + Department junction
// ═══════════════════════════════════════════════════════
// tblSubGroups: llSubGroupKey (note: double-l), sSubGroup
// tblDepartmentSubGroups: lDepartmentKey, lSubGroupKey (composite PK, no surrogate)
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/SubGroups/GetAllSubGroupsList — SubGroups assigned to a department
router.get('/SubGroups/GetAllSubGroupsList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ error: 'lDepartmentKey required' });
    const rows = await db.query(`
      SELECT sg.llSubGroupKey, sg.sSubGroup,
        dsg.lDepartmentKey
      FROM tblDepartmentSubGroups dsg
        INNER JOIN tblSubGroups sg ON sg.llSubGroupKey = dsg.lSubGroupKey
      WHERE dsg.lDepartmentKey = @deptKey
      ORDER BY sg.sSubGroup`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/SubGroups/GetAllSubGroupsAvailableList — SubGroups NOT assigned to a department
router.get('/SubGroups/GetAllSubGroupsAvailableList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ error: 'lDepartmentKey required' });
    const rows = await db.query(`
      SELECT sg.llSubGroupKey, sg.sSubGroup
      FROM tblSubGroups sg
      WHERE sg.llSubGroupKey NOT IN (
        SELECT lSubGroupKey FROM tblDepartmentSubGroups
        WHERE lDepartmentKey = @deptKey
      )
      ORDER BY sg.sSubGroup`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/SubGroups/AddDepartmentSubGroups — Link a subgroup to a department
router.post('/SubGroups/AddDepartmentSubGroups', async (req, res, next) => {
  try {
    const b = req.body || {};
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    const subGroupKey = parseInt(b.lSubGroupKey || b.llSubGroupKey) || 0;
    if (!deptKey || !subGroupKey) {
      return res.status(400).json({ error: 'lDepartmentKey and lSubGroupKey required' });
    }
    // tblDepartmentSubGroups has composite PK (lDepartmentKey, lSubGroupKey) — check first
    const existing = await db.queryOne(
      'SELECT 1 AS found FROM tblDepartmentSubGroups WHERE lDepartmentKey = @deptKey AND lSubGroupKey = @sgKey',
      { deptKey, sgKey: subGroupKey });
    if (existing) return res.json({ success: true, alreadyExists: true });

    await db.query(
      'INSERT INTO tblDepartmentSubGroups (lDepartmentKey, lSubGroupKey) VALUES (@deptKey, @sgKey)',
      { deptKey, sgKey: subGroupKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/SubGroups/DeleteDepartmentSubGroups — Remove subgroup from department
router.delete('/SubGroups/DeleteDepartmentSubGroups', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    const subGroupKey = parseInt(req.query.lSubGroupKey || req.query.llSubGroupKey) || 0;
    if (!deptKey || !subGroupKey) {
      return res.status(400).json({ error: 'lDepartmentKey and lSubGroupKey required' });
    }
    await db.query(
      'DELETE FROM tblDepartmentSubGroups WHERE lDepartmentKey = @deptKey AND lSubGroupKey = @sgKey',
      { deptKey, sgKey: subGroupKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
