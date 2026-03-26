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

module.exports = router;
