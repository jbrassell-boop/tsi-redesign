// ═══════════════════════════════════════════════════════
//  pricing.js — Pricing details, tier lookups, validation
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

const BASE_SELECT = `
  SELECT pd.lPricingDetailKey, pd.lPricingCategoryKey, pd.lRepairItemKey,
    pd.dblRepairPrice, pd.sProblemID,
    ri.sItemDescription, ri.sRigidOrFlexible, ri.nUnitCost,
    ri.sTSICode, ri.sPartOrLabor,
    pc.sPricingDescription
  FROM tblPricingDetail pd
    JOIN tblRepairItem ri ON ri.lRepairItemKey = pd.lRepairItemKey
    JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = pd.lPricingCategoryKey
  WHERE ri.bActive = 1 AND pd.dblRepairPrice > 0`;

// GET /details — All pricing rows for active repair items
// Optional filters: ?type=F|R|C|I  ?categoryKey=80
router.get('/details', async (req, res, next) => {
  try {
    const type = req.query.type || null;
    const catKey = parseInt(req.query.categoryKey) || null;
    let sql = BASE_SELECT;
    if (type) sql += ` AND ri.sRigidOrFlexible = @type`;
    if (catKey) sql += ` AND pd.lPricingCategoryKey = @catKey`;
    sql += ` ORDER BY ri.sItemDescription, pc.sPricingDescription`;
    const rows = await db.query(sql, { type, catKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /details/:repairItemKey — All tier prices for one repair item
router.get('/details/:repairItemKey', async (req, res, next) => {
  try {
    const itemKey = parseInt(req.params.repairItemKey) || 0;
    const rows = await db.query(
      BASE_SELECT + ` AND pd.lRepairItemKey = @itemKey ORDER BY pc.sPricingDescription`,
      { itemKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /by-category/:categoryKey — All active item prices for a tier
router.get('/by-category/:categoryKey', async (req, res, next) => {
  try {
    const catKey = parseInt(req.params.categoryKey) || 0;
    const rows = await db.query(
      BASE_SELECT + ` AND pd.lPricingCategoryKey = @catKey ORDER BY ri.sItemDescription`,
      { catKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /validate — Check expected price for item + tier
// ?repairItemKey=86&pricingCategoryKey=59
router.get('/validate', async (req, res, next) => {
  try {
    const itemKey = parseInt(req.query.repairItemKey) || 0;
    const catKey = parseInt(req.query.pricingCategoryKey) || 0;
    if (!itemKey || !catKey) {
      return res.status(400).json({ error: 'repairItemKey and pricingCategoryKey required' });
    }
    const row = await db.queryOne(`
      SELECT pd.dblRepairPrice AS expected,
        pc.sPricingDescription AS tier,
        ri.sItemDescription AS item,
        ri.sRigidOrFlexible AS repairType,
        ri.nUnitCost AS unitCost
      FROM tblPricingDetail pd
        JOIN tblRepairItem ri ON ri.lRepairItemKey = pd.lRepairItemKey
        JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = pd.lPricingCategoryKey
      WHERE pd.lRepairItemKey = @itemKey AND pd.lPricingCategoryKey = @catKey`,
      { itemKey, catKey });
    if (!row) {
      return res.status(404).json({ error: 'No pricing found for this item/tier combination' });
    }
    res.json(row);
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
//  CRUD — Pricing Categories
// ═══════════════════════════════════════════════════════

// GET /categories — All pricing categories with item count + client count
router.get('/categories', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT pc.lPricingCategoryKey, pc.sPricingDescription, pc.bActive,
        (SELECT COUNT(*) FROM tblPricingDetail pd
           JOIN tblRepairItem ri ON ri.lRepairItemKey = pd.lRepairItemKey
         WHERE pd.lPricingCategoryKey = pc.lPricingCategoryKey
           AND ri.bActive = 1 AND pd.dblRepairPrice > 0) AS itemCount,
        (SELECT COUNT(*) FROM tblClient c
         WHERE c.lPricingCategoryKey = pc.lPricingCategoryKey
           AND c.bActive = 1) AS clientCount,
        (SELECT MAX(pd2.dtLastUpdate) FROM tblPricingDetail pd2
         WHERE pd2.lPricingCategoryKey = pc.lPricingCategoryKey) AS dtLastUpdate
      FROM tblPricingCategory pc
      ORDER BY pc.sPricingDescription`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /categories — Add new pricing category
router.post('/categories', async (req, res, next) => {
  try {
    const name = (req.body.sPricingDescription || '').trim();
    if (!name) return res.status(400).json({ error: 'sPricingDescription required' });
    const result = await db.query(`
      INSERT INTO tblPricingCategory (sPricingDescription, bActive)
      VALUES (@name, 1);
      SELECT SCOPE_IDENTITY() AS lPricingCategoryKey`, { name });
    res.json({ lPricingCategoryKey: result[0]?.lPricingCategoryKey, success: true });
  } catch (e) { next(e); }
});

// PUT /categories/:key — Update category name/active status
router.put('/categories/:key', async (req, res, next) => {
  try {
    const key = parseInt(req.params.key) || 0;
    const b = req.body || {};
    await db.query(`
      UPDATE tblPricingCategory SET
        sPricingDescription = ISNULL(@name, sPricingDescription),
        bActive = ISNULL(@active, bActive)
      WHERE lPricingCategoryKey = @key`,
      { key, name: b.sPricingDescription || null, active: b.bActive != null ? b.bActive : null });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ═══════════════════════════════════════════════════════
//  CRUD — Pricing Detail (individual item prices)
// ═══════════════════════════════════════════════════════

// PUT /detail — Update or insert a single item price for a tier
router.put('/detail', async (req, res, next) => {
  try {
    const b = req.body || {};
    const catKey = parseInt(b.lPricingCategoryKey) || 0;
    const itemKey = parseInt(b.lRepairItemKey) || 0;
    const price = parseFloat(b.dblRepairPrice) || 0;
    if (!catKey || !itemKey) return res.status(400).json({ error: 'lPricingCategoryKey and lRepairItemKey required' });
    // Try update first, insert if no row exists
    const result = await db.query(`
      IF EXISTS (SELECT 1 FROM tblPricingDetail WHERE lPricingCategoryKey=@catKey AND lRepairItemKey=@itemKey)
        UPDATE tblPricingDetail SET dblRepairPrice=@price, dtLastUpdate=GETDATE()
        WHERE lPricingCategoryKey=@catKey AND lRepairItemKey=@itemKey
      ELSE
        INSERT INTO tblPricingDetail (lPricingCategoryKey, lRepairItemKey, dblRepairPrice, dtCreateDate)
        VALUES (@catKey, @itemKey, @price, GETDATE())`,
      { catKey, itemKey, price });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /import — Bulk import prices for a category
// Body: { lPricingCategoryKey, items: [{lRepairItemKey, dblRepairPrice}, ...] }
router.post('/import', async (req, res, next) => {
  try {
    const b = req.body || {};
    const catKey = parseInt(b.lPricingCategoryKey) || 0;
    const items = b.items || [];
    if (!catKey || !items.length) return res.status(400).json({ error: 'lPricingCategoryKey and items[] required' });
    let updated = 0, inserted = 0;
    for (const item of items) {
      const itemKey = parseInt(item.lRepairItemKey) || 0;
      const price = parseFloat(item.dblRepairPrice) || 0;
      if (!itemKey) continue;
      const exists = await db.queryOne(
        'SELECT 1 AS x FROM tblPricingDetail WHERE lPricingCategoryKey=@catKey AND lRepairItemKey=@itemKey',
        { catKey, itemKey });
      if (exists) {
        await db.query('UPDATE tblPricingDetail SET dblRepairPrice=@price, dtLastUpdate=GETDATE() WHERE lPricingCategoryKey=@catKey AND lRepairItemKey=@itemKey',
          { catKey, itemKey, price });
        updated++;
      } else {
        await db.query('INSERT INTO tblPricingDetail (lPricingCategoryKey, lRepairItemKey, dblRepairPrice, dtCreateDate) VALUES (@catKey, @itemKey, @price, GETDATE())',
          { catKey, itemKey, price });
        inserted++;
      }
    }
    res.json({ success: true, updated, inserted, total: items.length });
  } catch (e) { next(e); }
});

module.exports = router;
