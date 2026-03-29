// ═══════════════════════════════════════════════════════
//  inventory.js — Inventory item + size management
// ═══════════════════════════════════════════════════════
// tblInventory: lInventoryKey, sItemDescription, nLevelMin/Max/Current, sRigidOrFlexible, bActive
// tblInventorySize: lInventorySizeKey, lInventoryKey, sSizeDescription, sRigidOrFlexible, nLevel*, dblUnitCost, bActive
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /api/Inventory/GetAllInventoryList — Paginated inventory list with filters
router.post('/Inventory/GetAllInventoryList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const filters = body.Filters || {};
    const params = {
      type: filters.sRigidOrFlexible || null,
      search: filters.search ? `%${filters.search}%` : null,
      activeOnly: filters.bActive !== false ? 1 : 0
    };
    const result = await db.queryPage(`
      SELECT inv.lInventoryKey, inv.sItemDescription, inv.sRigidOrFlexible,
        inv.nLevelMinimum, inv.nLevelMaximum, inv.nLevelCurrent,
        inv.bActive, inv.bAlwaysReOrder, inv.bLargeDiameter,
        (SELECT COUNT(*) FROM tblInventorySize isz
          WHERE isz.lInventoryKey = inv.lInventoryKey AND isz.bActive = 1) AS nSizeCount
      FROM tblInventory inv
      WHERE (@activeOnly = 0 OR inv.bActive = 1)
        AND (@type IS NULL OR inv.sRigidOrFlexible = @type)
        AND (@search IS NULL OR inv.sItemDescription LIKE @search)`,
      'inv.sItemDescription', params, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/Inventory/GetAllInventorySizesList — Sizes for an inventory item
router.post('/Inventory/GetAllInventorySizesList', async (req, res, next) => {
  try {
    const b = req.body || {};
    const inventoryKey = parseInt(b.lInventoryKey) || 0;
    if (!inventoryKey) return res.status(400).json({ error: 'lInventoryKey required' });
    const rows = await db.query(`
      SELECT lInventorySizeKey, lInventoryKey, sSizeDescription,
        sRigidOrFlexible, nLevelMinimum, nLevelMaximum, nLevelCurrent,
        dblUnitCost, bActive, sBinNumber, sStatus
      FROM tblInventorySize
      WHERE lInventoryKey = @inventoryKey
      ORDER BY sSizeDescription`, { inventoryKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Inventory/AddInventory — Insert new inventory item
router.post('/Inventory/AddInventory', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.sItemDescription) return res.status(400).json({ error: 'sItemDescription required' });
    const result = await db.query(`
      INSERT INTO tblInventory (sItemDescription, sRigidOrFlexible,
        nLevelMinimum, nLevelMaximum, nLevelCurrent, bActive, dtCreateDate)
      VALUES (@desc, @type, @min, @max, @current, 1, GETDATE());
      SELECT SCOPE_IDENTITY() AS lInventoryKey`,
      {
        desc: b.sItemDescription,
        type: b.sRigidOrFlexible || null,
        min: parseInt(b.nLevelMinimum) || 0,
        max: parseInt(b.nLevelMaximum) || 0,
        current: parseInt(b.nLevelCurrent) || 0
      });
    const newKey = result[0] ? result[0].lInventoryKey : 0;
    res.json({ lInventoryKey: newKey, success: true });
  } catch (e) { next(e); }
});

module.exports = router;
