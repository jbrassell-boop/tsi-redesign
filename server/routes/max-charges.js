// ═══════════════════════════════════════════════════════
//  max-charges.js — Department max charges per scope model
// ═══════════════════════════════════════════════════════
// tblScopeTypeDepartmentMaxCharges: lScopeTypeKey, lDepartmentKey, nMaxCharge (composite PK)
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/ModelMaxCharges/GetAllModelMaxChargesList — Max charges for a department
router.get('/ModelMaxCharges/GetAllModelMaxChargesList', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    if (!deptKey) return res.status(400).json({ error: 'lDepartmentKey required' });
    const rows = await db.query(`
      SELECT mc.lScopeTypeKey, mc.lDepartmentKey, mc.nMaxCharge,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturerName
      FROM tblScopeTypeDepartmentMaxCharges mc
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = mc.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
      WHERE mc.lDepartmentKey = @deptKey
      ORDER BY st.sScopeTypeDesc`, { deptKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/ModelMaxCharges/AddModelMaxCharge — Insert max charge record
router.post('/ModelMaxCharges/AddModelMaxCharge', async (req, res, next) => {
  try {
    const b = req.body || {};
    const scopeTypeKey = parseInt(b.lScopeTypeKey) || 0;
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    const maxCharge = parseFloat(b.nMaxCharge) || 0;
    if (!scopeTypeKey || !deptKey) {
      return res.status(400).json({ error: 'lScopeTypeKey and lDepartmentKey required' });
    }
    await db.query(`
      INSERT INTO tblScopeTypeDepartmentMaxCharges (lScopeTypeKey, lDepartmentKey, nMaxCharge)
      VALUES (@scopeTypeKey, @deptKey, @maxCharge)`,
      { scopeTypeKey, deptKey, maxCharge });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/ModelMaxCharges/UpdateModelMaxCharge — Update max charge
router.post('/ModelMaxCharges/UpdateModelMaxCharge', async (req, res, next) => {
  try {
    const b = req.body || {};
    const scopeTypeKey = parseInt(b.lScopeTypeKey) || 0;
    const deptKey = parseInt(b.lDepartmentKey) || 0;
    const maxCharge = parseFloat(b.nMaxCharge);
    if (!scopeTypeKey || !deptKey || isNaN(maxCharge)) {
      return res.status(400).json({ error: 'lScopeTypeKey, lDepartmentKey, and nMaxCharge required' });
    }
    await db.query(`
      UPDATE tblScopeTypeDepartmentMaxCharges
      SET nMaxCharge = @maxCharge
      WHERE lScopeTypeKey = @scopeTypeKey AND lDepartmentKey = @deptKey`,
      { scopeTypeKey, deptKey, maxCharge });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/ModelMaxCharges/DeleteModelMaxCharge — Delete max charge record
router.delete('/ModelMaxCharges/DeleteModelMaxCharge', async (req, res, next) => {
  try {
    const scopeTypeKey = parseInt(req.query.lScopeTypeKey) || 0;
    const deptKey = parseInt(req.query.lDepartmentKey) || 0;
    if (!scopeTypeKey || !deptKey) {
      return res.status(400).json({ error: 'lScopeTypeKey and lDepartmentKey required' });
    }
    await db.query(`
      DELETE FROM tblScopeTypeDepartmentMaxCharges
      WHERE lScopeTypeKey = @scopeTypeKey AND lDepartmentKey = @deptKey`,
      { scopeTypeKey, deptKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
