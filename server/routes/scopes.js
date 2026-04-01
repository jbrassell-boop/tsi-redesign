// ═══════════════════════════════════════════════════════
//  scopes.js — Scope CRUD + Department Scope Types routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for scope list (enriched with JOINs) ──
// tblScope actual columns: lScopeKey, lScopeTypeKey, lDepartmentKey, sSerialNumber,
//   sScopeIsDead, sRigidOrFlexible, sUPC, mComments, dtCreateDate, dtLastUpdate, ...
// NO: sAssetTag, sOEMSerialNumber, dtDatePurchased
// tblManufacturer → tblManufacturers (plural)
const SCOPE_SELECT = `
  SELECT s.lScopeKey, s.lDepartmentKey, s.lScopeTypeKey,
    s.sSerialNumber, s.sScopeIsDead,
    s.dtCreateDate, s.dtLastUpdate,
    s.mComments,
    ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
    ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
    st.lScopeTypeCatKey,
    st.lManufacturerKey,
    ISNULL(m.sManufacturer, '') AS sManufacturer,
    ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(c.sClientName1, '') AS sClientName1,
    ISNULL(ct.sContractNumber, '') AS sContractName,
    ct.dtDateTermination AS dtContractEnd
  FROM tblScope s
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
    LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
    LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblContractScope cs ON cs.lScopeKey = s.lScopeKey
    LEFT JOIN tblContract ct ON ct.lContractKey = cs.lContractKey
`;

// GET /Scopes/GetAllScopes — List scopes for a department
router.get('/Scopes/GetAllScopes', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    const isDead = req.query.pbIsDead || req.query.psScopeIsDead || null;
    const rows = await db.query(`${SCOPE_SELECT}
      WHERE (@deptKey = 0 OR s.lDepartmentKey = @deptKey)
        AND (@isDead IS NULL OR s.sScopeIsDead = @isDead)
      ORDER BY s.sSerialNumber`, { deptKey, isDead });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Scopes/GetScopeByScopeId — Single scope detail
router.get('/Scopes/GetScopeByScopeId', async (req, res, next) => {
  try {
    const scopeKey = parseInt(req.query.plScopeKey) || 0;
    const row = await db.queryOne(`${SCOPE_SELECT}
      WHERE s.lScopeKey = @scopeKey`, { scopeKey });
    res.json(row);
  } catch (e) { next(e); }
});

// POST /Scopes/AddScope — Insert new scope
// Removed non-existent: sAssetTag, sOEMSerialNumber; dtDateCreated → dtCreateDate
router.post('/Scopes/AddScope', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblScope (lDepartmentKey, lScopeTypeKey, sSerialNumber,
        sScopeIsDead, mComments, dtCreateDate)
      VALUES (@deptKey, @scopeTypeKey, @serial,
        'false', @comments, GETDATE());
      SELECT SCOPE_IDENTITY() AS lScopeKey`,
      {
        deptKey: b.lDepartmentKey || 0,
        scopeTypeKey: b.lScopeTypeKey || 0,
        serial: b.sSerialNumber || '',
        comments: b.mComments || ''
      });
    const newKey = result[0] ? result[0].lScopeKey : 0;
    res.json({ lScopeKey: newKey, success: true });
  } catch (e) { next(e); }
});

// DELETE /Scopes/DeleteScope — Delete scope
router.delete('/Scopes/DeleteScope', async (req, res, next) => {
  try {
    const scopeKey = parseInt(req.query.plScopeKey) || 0;
    if (!scopeKey) return res.status(400).json({ error: 'Missing scope key' });
    await db.query('DELETE FROM tblScope WHERE lScopeKey = @scopeKey', { scopeKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /Scopes/CheckOpenRepaireScope — Check if scope has open repair
router.get('/Scopes/CheckOpenRepaireScope', async (req, res, next) => {
  try {
    const scopeKey = parseInt(req.query.plScopeKey) || 0;
    const row = await db.queryOne(`
      SELECT COUNT(*) AS cnt FROM tblRepair
      WHERE lScopeKey = @scopeKey AND lRepairStatusID < 8`, { scopeKey });
    res.json((row && row.cnt > 0) ? true : false);
  } catch (e) { next(e); }
});

// GET /ScopeType/GetDepartmentScopeTypesList — Scope types assigned to a department
// tblManufacturer → tblManufacturers
router.get('/ScopeType/GetDepartmentScopeTypesList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    const rows = await db.query(`
      SELECT dst.lDepartmentScopeTypeKey, dst.lDepartmentKey, dst.lScopeTypeKey,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturer,
        ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory
      FROM tblDepartmentScopeTypes dst
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = dst.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
      WHERE dst.lDepartmentKey = @deptKey
      ORDER BY st.sScopeTypeDesc`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /ScopeType/GetAvailableDepartmentScopeTypesList — Scope types NOT yet in dept
router.get('/ScopeType/GetAvailableDepartmentScopeTypesList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ error: 'lDepartmentKey required' });
    const rows = await db.query(`
      SELECT st.lScopeTypeKey, st.sScopeTypeDesc, st.sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturerName,
        ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory
      FROM tblScopeType st
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
      WHERE st.bActive = 1
        AND st.lScopeTypeKey NOT IN (
          SELECT lScopeTypeKey FROM tblDepartmentScopeTypes WHERE lDepartmentKey = @deptKey
        )
      ORDER BY st.sScopeTypeDesc`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /ScopeType/AddDepartmentScopeTypes — Link scope type to department
router.post('/ScopeType/AddDepartmentScopeTypes', async (req, res, next) => {
  try {
    const b = req.body || {};
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    const scopeTypeKey = parseInt(b.lScopeTypeKey) || 0;
    if (!deptKey || !scopeTypeKey) {
      return res.status(400).json({ error: 'lDepartmentKey and lScopeTypeKey required' });
    }
    const result = await db.query(`
      INSERT INTO tblDepartmentScopeTypes (lDepartmentKey, lScopeTypeKey, sGLAcct)
      VALUES (@deptKey, @scopeTypeKey, @glAcct);
      SELECT SCOPE_IDENTITY() AS lDepartmentScopeTypeKey`,
      { deptKey, scopeTypeKey, glAcct: b.sGLAcct || null });
    const newKey = result[0] ? result[0].lDepartmentScopeTypeKey : 0;
    res.json({ lDepartmentScopeTypeKey: newKey, success: true });
  } catch (e) { next(e); }
});

// DELETE /ScopeType/DeleteDepartmentScopeTypes — Remove scope type from department
router.delete('/ScopeType/DeleteDepartmentScopeTypes', async (req, res, next) => {
  try {
    const deptScopeTypeKey = parseInt(req.query.lDepartmentScopeTypeKey) || 0;
    if (!deptScopeTypeKey) {
      return res.status(400).json({ error: 'lDepartmentScopeTypeKey required' });
    }
    await db.query(
      'DELETE FROM tblDepartmentScopeTypes WHERE lDepartmentScopeTypeKey = @key',
      { key: deptScopeTypeKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /Scopes/GetAllScopesList — Paginated scope list with optional dept + dead-status filter
router.post('/Scopes/GetAllScopesList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const deptKey = parseInt(body.plDepartmentKey) || 0;
    const isDead = body.psScopeIsDead || null;
    const result = await db.queryPage(`${SCOPE_SELECT}
      WHERE (@deptKey = 0 OR s.lDepartmentKey = @deptKey)
        AND (@isDead IS NULL OR s.sScopeIsDead = @isDead)`,
      's.sSerialNumber', { deptKey, isDead }, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
