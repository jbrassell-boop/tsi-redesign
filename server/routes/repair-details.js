// ═══════════════════════════════════════════════════════
//  repair-details.js — Repair line items, item catalog, inventory
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /Detail/GetAllRepairDetailsList — Line items for a repair
// tblRepairItemTran actual columns: lRepairItemTranKey, lRepairKey, lRepairItemKey,
//   lTechnicianKey, lTechnician2Key, sApproved, dblRepairPrice, dblRepairPriceBase,
//   sComments, sTransmitted, sFixType, sProblemID, sTranID, sInHsID, sInitials,
//   sPrimaryRepair, sUAorNWT, ...
// NO: sRepairedBy, sTechInits, sTech2Inits, bAmended
// tblRepairItem: NO dblRepairPrice (has nUnitCost), NO sInstrumentType
router.get('/Detail/GetAllRepairDetailsList', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.plRepairKey) || 0;
    const rows = await db.query(`
      SELECT rit.lRepairItemTranKey, rit.lRepairKey, rit.lRepairItemKey,
        rit.dblRepairPrice, rit.sApproved, rit.sFixType, rit.sFixType AS sWNCA,
        rit.sUAorNWT, rit.sUAorNWT AS sUANWT,
        rit.sPrimaryRepair, rit.sInitials,
        rit.lTechnicianKey, rit.lTechnician2Key,
        rit.sComments,
        ri.sItemDescription, ri.sTSICode, ri.sRigidOrFlexible,
        ri.sPartOrLabor, ri.sMajorRepair
      FROM tblRepairItemTran rit
        LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
      WHERE rit.lRepairKey = @repairKey
      ORDER BY rit.lRepairItemTranKey`, { repairKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /Detail/AddRepairDetail — Add a line item to a repair
// Auto-lookups tier price if dblRepairPrice is 0 or missing
router.post('/Detail/AddRepairDetail', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = b.plRepairKey || b.lRepairKey || 0;
    const itemKey = b.plRepairItemKey || b.lRepairItemKey || 0;
    let price = parseFloat(b.pdblRepairPrice || b.dblRepairPrice) || 0;

    // Server-side price fallback: if no price provided, lookup from repair's pricing tier
    if (!price && repairKey && itemKey) {
      const tierPrice = await db.queryOne(`
        SELECT pd.dblRepairPrice
        FROM tblPricingDetail pd
          JOIN tblRepair r ON r.lPricingCategoryKey = pd.lPricingCategoryKey
        WHERE r.lRepairKey = @repairKey AND pd.lRepairItemKey = @itemKey
          AND pd.dblRepairPrice > 0`, { repairKey, itemKey });
      if (tierPrice) price = tierPrice.dblRepairPrice;
    }

    const result = await db.query(`
      INSERT INTO tblRepairItemTran (lRepairKey, lRepairItemKey, dblRepairPrice,
        sApproved, sFixType, sUAorNWT, sInitials, sComments, sPrimaryRepair)
      VALUES (@repairKey, @itemKey, @price,
        @approved, @fixType, @uanwt, @inits, @comments, @primary);
      SELECT SCOPE_IDENTITY() AS lRepairItemTranKey`,
      {
        repairKey,
        itemKey,
        price,
        approved: b.psApproved || b.sApproved || 'N',
        fixType: b.psFixType || b.sFixType || '',
        uanwt: b.psUAorNWT || b.sUAorNWT || '',
        inits: b.psTechInits || b.sTechInits || b.sInitials || '',
        comments: b.psComments || b.sComments || '',
        primary: b.psPrimaryRepair || b.sPrimaryRepair || ''
      });
    const newKey = result[0] ? result[0].lRepairItemTranKey : 0;
    res.json({ lRepairItemTranKey: newKey, success: true, dblRepairPrice: price });
  } catch (e) { next(e); }
});

// DELETE /Detail/DeleteRepairDetail — Remove a line item
router.delete('/Detail/DeleteRepairDetail', async (req, res, next) => {
  try {
    const tranKey = parseInt(req.query.plRepairItemTranKey) || 0;
    await db.query('DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey', { tranKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /RepairItems/GetAllRepairItems — Item catalog (for picker)
// tblRepairItem: NO dblRepairPrice (has nUnitCost), NO sInstrumentType
router.get('/RepairItems/GetAllRepairItems', async (req, res, next) => {
  try {
    const flex = req.query.psRigidOrFlexible || null;
    const rows = await db.query(`
      SELECT lRepairItemKey, sItemDescription, sTSICode, sRigidOrFlexible,
        sPartOrLabor, sMajorRepair, nUnitCost AS dblRepairPrice, bActive
      FROM tblRepairItem
      WHERE bActive = 1 AND (@flex IS NULL OR sRigidOrFlexible = @flex)
      ORDER BY sItemDescription`, { flex });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /RepairItems/GetRepairItemsBylRepairItemKey — Single catalog item
router.get('/RepairItems/GetRepairItemsBylRepairItemKey', async (req, res, next) => {
  try {
    const itemKey = parseInt(req.query.plRepairItemKey) || 0;
    const row = await db.queryOne(`SELECT * FROM tblRepairItem WHERE lRepairItemKey = @itemKey`, { itemKey });
    res.json(row || {});
  } catch (e) { next(e); }
});

// POST /RepairItems/GetRepairItemsList — Paginated item list
router.post('/RepairItems/GetRepairItemsList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const repairKey = parseInt(body.plRepairKey) || 0;
    if (repairKey) {
      const rows = await db.query(`
        SELECT rit.*, ri.sItemDescription, ri.sTSICode
        FROM tblRepairItemTran rit
          LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
        WHERE rit.lRepairKey = @repairKey
        ORDER BY rit.lRepairItemTranKey`, { repairKey });
      return res.json(rows);
    }
    const result = await db.queryPage(`
      SELECT lRepairItemKey, sItemDescription, sTSICode, sRigidOrFlexible, nUnitCost AS dblRepairPrice, bActive
      FROM tblRepairItem WHERE bActive = 1`,
      'sItemDescription', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// GET /RepairInventory/GetAllRepairInventoryList — Parts used on a repair
// tblRepairInventoryTran does NOT exist. Actual table is tblRepairInventory with columns:
//   lRepairInventoryKey, lRepairItemTranKey, lScopeTypeRepairItemInventoryKey
// This is a junction table linking repair item transactions to inventory mappings.
// Return empty array for now — the real inventory usage is tracked differently.
router.get('/RepairInventory/GetAllRepairInventoryList', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.plRepairKey) || 0;
    const rows = await db.query(`
      SELECT ri.lRepairInventoryKey, ri.lRepairItemTranKey,
        ri.lScopeTypeRepairItemInventoryKey
      FROM tblRepairInventory ri
        INNER JOIN tblRepairItemTran rit ON rit.lRepairItemTranKey = ri.lRepairItemTranKey
      WHERE rit.lRepairKey = @repairKey
      ORDER BY ri.lRepairInventoryKey`, { repairKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /RepairInventory/AddRepairInventory — Add inventory usage
// tblRepairInventory only has 3 columns, so this needs different params
router.post('/RepairInventory/AddRepairInventory', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblRepairInventory (lRepairItemTranKey, lScopeTypeRepairItemInventoryKey)
      VALUES (@ritKey, @sriKey);
      SELECT SCOPE_IDENTITY() AS lRepairInventoryKey`,
      {
        ritKey: b.plRepairItemTranKey || b.lRepairItemTranKey || 0,
        sriKey: b.plScopeTypeRepairItemInventoryKey || b.lScopeTypeRepairItemInventoryKey || 0
      });
    res.json({ lRepairInventoryKey: result[0]?.lRepairInventoryKey || 0, success: true });
  } catch (e) { next(e); }
});

// POST /RepairItems/AddRepairItems — Add repair catalog item
router.post('/RepairItems/AddRepairItems', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.sItemDescription) return res.status(400).json({ error: 'sItemDescription required' });
    const result = await db.query(`
      INSERT INTO tblRepairItem (sItemDescription, sRigidOrFlexible,
        sPartOrLabor, sMajorRepair, nUnitCost, bActive, dtCreateDate)
      VALUES (@desc, @type, @partOrLabor, @major, @cost, 1, GETDATE());
      SELECT SCOPE_IDENTITY() AS lRepairItemKey`,
      {
        desc: b.sItemDescription,
        type: b.sRigidOrFlexible || null,
        partOrLabor: b.sPartOrLabor || 'L',
        major: b.sMajorRepair || 'N',
        cost: parseFloat(b.nUnitCost || b.dblRepairPrice) || 0
      });
    const newKey = result[0] ? result[0].lRepairItemKey : 0;
    res.json({ lRepairItemKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /RepairItems/UpdateRepairItems — Update repair catalog item
router.post('/RepairItems/UpdateRepairItems', async (req, res, next) => {
  try {
    const b = req.body || {};
    const itemKey = b.lRepairItemKey || 0;
    if (!itemKey) return res.status(400).json({ error: 'lRepairItemKey required' });
    await db.query(`
      UPDATE tblRepairItem SET
        sItemDescription = ISNULL(@desc, sItemDescription),
        sRigidOrFlexible = ISNULL(@type, sRigidOrFlexible),
        sPartOrLabor = ISNULL(@partOrLabor, sPartOrLabor),
        sMajorRepair = ISNULL(@major, sMajorRepair),
        nUnitCost = ISNULL(@cost, nUnitCost),
        bActive = ISNULL(@active, bActive),
        dtLastUpdate = GETDATE()
      WHERE lRepairItemKey = @itemKey`,
      {
        itemKey,
        desc: b.sItemDescription || null,
        type: b.sRigidOrFlexible || null,
        partOrLabor: b.sPartOrLabor || null,
        major: b.sMajorRepair || null,
        cost: b.nUnitCost != null ? parseFloat(b.nUnitCost) : (b.dblRepairPrice != null ? parseFloat(b.dblRepairPrice) : null),
        active: b.bActive != null ? b.bActive : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /RepairItems/DeleteRepairItems — Delete repair catalog item
router.delete('/RepairItems/DeleteRepairItems', async (req, res, next) => {
  try {
    const itemKey = parseInt(req.query.lRepairItemKey) || 0;
    if (!itemKey) return res.status(400).json({ error: 'lRepairItemKey required' });
    await db.query('DELETE FROM tblRepairItem WHERE lRepairItemKey = @itemKey', { itemKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
