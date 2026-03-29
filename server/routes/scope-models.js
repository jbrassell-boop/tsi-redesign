// ═══════════════════════════════════════════════════════
//  scope-models.js — ScopeType CRUD + repair item associations
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for scope type list ──
// tblScopeType: no lManufacturerKey directly at query level — join tblManufacturers
// tblScopeTypeCategories: lScopeTypeCategoryKey (not lScopeTypeCatKey in categories table)
// tblScopeType uses lScopeTypeCatKey (not lScopeTypeCategoryKey)
const SCOPE_TYPE_SELECT = `
  SELECT st.lScopeTypeKey, st.sScopeTypeDesc, st.sRigidOrFlexible,
    st.lManufacturerKey, st.lScopeTypeCatKey,
    st.sAngUp, st.sAngDown, st.sAngLeft, st.sAngRight,
    st.nEpoxySizeProximal, st.nEpoxySizeDistal,
    st.bActive, st.sTypeID, st.sNotes,
    st.sInsertTubeDiameter, st.sInsertTubeLength, st.sForcepChannelSize,
    ISNULL(m.sManufacturer, '') AS sManufacturerName,
    ISNULL(stc.sScopeTypeCategory, '') AS sScopeTypeCategory
  FROM tblScopeType st
    LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
    LEFT JOIN tblScopeTypeCategories stc ON stc.lScopeTypeCategoryKey = st.lScopeTypeCatKey
`;

// POST /api/ScopeModel/GetAllScopeTypeList — Paginated scope type list with filters
router.post('/ScopeModel/GetAllScopeTypeList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const filters = body.Filters || {};
    const scopesOnly = req.query.scopesOnly === '1' || body.scopesOnly;

    const params = {
      type: filters.sRigidOrFlexible || null,
      mfrKey: parseInt(filters.lManufacturerKey) || 0,
      search: filters.search ? `%${filters.search}%` : null,
      scopesOnly: scopesOnly ? 1 : 0
    };

    const baseQuery = `${SCOPE_TYPE_SELECT}
      WHERE st.bActive = 1
        AND (@type IS NULL OR st.sRigidOrFlexible = @type)
        AND (@mfrKey = 0 OR st.lManufacturerKey = @mfrKey)
        AND (@search IS NULL OR st.sScopeTypeDesc LIKE @search)
        AND (@scopesOnly = 0 OR st.sRigidOrFlexible IN ('R','F','C'))`;

    const result = await db.queryPage(baseQuery, 'st.sScopeTypeDesc', params, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/ScopeModel/AddUpdateScopeType — Upsert scope type
router.post('/ScopeModel/AddUpdateScopeType', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (b.lScopeTypeKey) {
      // UPDATE
      await db.query(`
        UPDATE tblScopeType SET
          sScopeTypeDesc = ISNULL(@desc, sScopeTypeDesc),
          sRigidOrFlexible = ISNULL(@type, sRigidOrFlexible),
          lManufacturerKey = ISNULL(@mfrKey, lManufacturerKey),
          lScopeTypeCatKey = ISNULL(@catKey, lScopeTypeCatKey),
          sAngUp = ISNULL(@angUp, sAngUp),
          sAngDown = ISNULL(@angDown, sAngDown),
          sAngLeft = ISNULL(@angLeft, sAngLeft),
          sAngRight = ISNULL(@angRight, sAngRight),
          sNotes = ISNULL(@notes, sNotes),
          bActive = ISNULL(@active, bActive),
          dtLastUpdate = GETDATE()
        WHERE lScopeTypeKey = @scopeTypeKey`,
        {
          scopeTypeKey: b.lScopeTypeKey,
          desc: b.sScopeTypeDesc || null,
          type: b.sRigidOrFlexible || null,
          mfrKey: b.lManufacturerKey || null,
          catKey: b.lScopeTypeCatKey || null,
          angUp: b.sAngUp || null,
          angDown: b.sAngDown || null,
          angLeft: b.sAngLeft || null,
          angRight: b.sAngRight || null,
          notes: b.sNotes || null,
          active: b.bActive != null ? b.bActive : null
        });
      res.json({ lScopeTypeKey: b.lScopeTypeKey, success: true });
    } else {
      // INSERT
      const result = await db.query(`
        INSERT INTO tblScopeType (sScopeTypeDesc, sRigidOrFlexible, lManufacturerKey,
          lScopeTypeCatKey, sAngUp, sAngDown, sAngLeft, sAngRight,
          sNotes, bActive, dtCreateDate)
        VALUES (@desc, @type, @mfrKey,
          @catKey, @angUp, @angDown, @angLeft, @angRight,
          @notes, 1, GETDATE());
        SELECT SCOPE_IDENTITY() AS lScopeTypeKey`,
        {
          desc: b.sScopeTypeDesc || '',
          type: b.sRigidOrFlexible || null,
          mfrKey: b.lManufacturerKey || null,
          catKey: b.lScopeTypeCatKey || null,
          angUp: b.sAngUp || null,
          angDown: b.sAngDown || null,
          angLeft: b.sAngLeft || null,
          angRight: b.sAngRight || null,
          notes: b.sNotes || null
        });
      const newKey = result[0] ? result[0].lScopeTypeKey : 0;
      res.json({ lScopeTypeKey: newKey, success: true });
    }
  } catch (e) { next(e); }
});

// POST /api/ScopeModel/GetScopeTypeRepairItem — Repair items associated with a scope type
// tblRepairItem has sRigidOrFlexible for filtering — no direct scope type junction found in schema
router.post('/ScopeModel/GetScopeTypeRepairItem', async (req, res, next) => {
  try {
    const b = req.body || {};
    const scopeTypeKey = parseInt(b.lScopeTypeKey) || 0;
    const rigidOrFlexible = b.sRigidOrFlexible || null;

    let typeFilter = rigidOrFlexible;
    // If scopeTypeKey provided but no type, look it up
    if (scopeTypeKey && !typeFilter) {
      const st = await db.queryOne(
        'SELECT sRigidOrFlexible FROM tblScopeType WHERE lScopeTypeKey = @k',
        { k: scopeTypeKey });
      if (st) typeFilter = st.sRigidOrFlexible;
    }

    const rows = await db.query(`
      SELECT lRepairItemKey, sItemDescription, sTSICode, sRigidOrFlexible,
        sPartOrLabor, sMajorRepair, nUnitCost AS dblRepairPrice, bActive
      FROM tblRepairItem
      WHERE bActive = 1
        AND (@type IS NULL OR sRigidOrFlexible = @type OR sRigidOrFlexible IS NULL)
      ORDER BY sItemDescription`, { type: typeFilter });
    res.json(rows);
  } catch (e) { next(e); }
});

// DELETE /api/ScopeType/DeleteScopeTypes — Delete scope type
router.delete('/ScopeType/DeleteScopeTypes', async (req, res, next) => {
  try {
    const scopeTypeKey = parseInt(req.query.lScopeTypeKey) || 0;
    if (!scopeTypeKey) return res.status(400).json({ error: 'lScopeTypeKey required' });
    await db.query('DELETE FROM tblScopeType WHERE lScopeTypeKey = @scopeTypeKey', { scopeTypeKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
