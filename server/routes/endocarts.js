// ═══════════════════════════════════════════════════════
//  endocarts.js — EndoCart quote CRUD + line items
//  EndoCarts use tblRepair filtered by NK% / SK% WO prefixes
//  NK = North, SK = South (same as repair WO prefix system)
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// Derive service location from WO prefix: S-prefix → Nashville (2), N-prefix → PA (1)
function svcKeyFromWO(wo) {
  if (typeof wo === 'string' && /^S[RICKV]/i.test(wo)) return 2;
  return 1;
}

// ── Shared SELECT for EndoCart list/detail ──
// Simplified vs REPAIR_SELECT — carts have no scope/tech/contract/angles
const CART_SELECT = `
  SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
    r.lRepairStatusID, r.sPurchaseOrder, r.sComplaintDesc,
    r.dblAmtRepair, r.dblAmtShipping,
    r.lDepartmentKey, r.lSalesRepKey, r.lServiceLocationKey,
    r.dtLastUpdate,
    ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(d.sShipName1, ISNULL(d.sBillName1, '')) AS sClientName,
    d.sShipAddr1, d.sShipCity, d.sShipState, d.sShipZip,
    d.sBillAddr1, d.sBillCity, d.sBillState, d.sBillZip,
    ISNULL(LTRIM(RTRIM(ISNULL(sr.sRepFirst, '') + ' ' + ISNULL(sr.sRepLast, ''))), '') AS sSalesRepName
  FROM tblRepair r
    LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = r.lSalesRepKey
  WHERE (r.sWorkOrderNumber LIKE 'NK%' OR r.sWorkOrderNumber LIKE 'SK%')
`;

// GET /EndoCart/GetAll — List EndoCart quotes
router.get('/EndoCart/GetAll', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.plServiceLocationKey) || 0;
    const rows = await db.query(`${CART_SELECT}
      AND (@svcKey = 0 OR r.lServiceLocationKey = @svcKey)
      ORDER BY r.dtDateIn DESC
      OFFSET 0 ROWS FETCH NEXT 500 ROWS ONLY`, { svcKey });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// GET /EndoCart/GetByKey/:key — Single EndoCart detail
router.get('/EndoCart/GetByKey/:key', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.params.key) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    const row = await db.queryOne(`${CART_SELECT}
      AND r.lRepairKey = @repairKey`, { repairKey });
    res.json({ success: true, data: row || null });
  } catch (e) { next(e); }
});

// POST /EndoCart/Add — Create new EndoCart quote
// lScopeKey = 0 (no scope associated), lRepairStatusID = 1 (Received)
router.post('/EndoCart/Add', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblRepair (
        lDepartmentKey, lScopeKey, sWorkOrderNumber, dtDateIn,
        lRepairStatusID, lServiceLocationKey, sComplaintDesc, lSalesRepKey
      )
      VALUES (
        @deptKey, 0, @wo, ISNULL(@dateIn, GETDATE()),
        1, @svcKey, @complaint, @salesRepKey
      );
      SELECT SCOPE_IDENTITY() AS lRepairKey`,
      {
        deptKey:     parseInt(b.lDepartmentKey) || 0,
        wo:          b.sWorkOrderNumber || '',
        dateIn:      b.dtDateIn ? new Date(b.dtDateIn) : null,
        svcKey:      parseInt(b.lServiceLocationKey) || svcKeyFromWO(b.sWorkOrderNumber),
        complaint:   b.sComplaintDesc || '',
        salesRepKey: parseInt(b.lSalesRepKey) || 0
      });
    const newKey = result[0] ? result[0].lRepairKey : 0;
    res.json({ success: true, lRepairKey: newKey, sWorkOrderNumber: b.sWorkOrderNumber || '' });
  } catch (e) { next(e); }
});

// POST /EndoCart/Update — Update EndoCart quote fields
router.post('/EndoCart/Update', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = parseInt(b.lRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    await db.query(`
      UPDATE tblRepair SET
        lRepairStatusID  = ISNULL(@statusId, lRepairStatusID),
        dtDateIn         = ISNULL(@dateIn, dtDateIn),
        dtDateOut        = ISNULL(@dateOut, dtDateOut),
        sPurchaseOrder   = ISNULL(@po, sPurchaseOrder),
        sComplaintDesc   = ISNULL(@complaint, sComplaintDesc),
        dblAmtRepair     = ISNULL(@amtRepair, dblAmtRepair),
        dblAmtShipping   = ISNULL(@amtShipping, dblAmtShipping),
        lSalesRepKey     = ISNULL(@salesRepKey, lSalesRepKey),
        dtLastUpdate     = GETDATE()
      WHERE lRepairKey = @repairKey
        AND (sWorkOrderNumber LIKE 'NK%' OR sWorkOrderNumber LIKE 'SK%')`,
      {
        repairKey,
        statusId:   b.lRepairStatusID   != null ? parseInt(b.lRepairStatusID)   : null,
        dateIn:     b.dtDateIn           ? new Date(b.dtDateIn)                  : null,
        dateOut:    b.dtDateOut          ? new Date(b.dtDateOut)                 : null,
        po:         b.sPurchaseOrder     != null ? b.sPurchaseOrder              : null,
        complaint:  b.sComplaintDesc     != null ? b.sComplaintDesc              : null,
        amtRepair:  b.dblAmtRepair       != null ? parseFloat(b.dblAmtRepair)    : null,
        amtShipping:b.dblAmtShipping     != null ? parseFloat(b.dblAmtShipping)  : null,
        salesRepKey:b.lSalesRepKey       != null ? parseInt(b.lSalesRepKey)      : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /EndoCart/Delete — Cascade delete EndoCart and related records
router.delete('/EndoCart/Delete', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.query.lRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    await db.query('DELETE FROM tblRepairItemTran WHERE lRepairKey = @repairKey', { repairKey });
    await db.query('DELETE FROM tblStatusTran     WHERE lRepairKey = @repairKey', { repairKey });
    await db.query(`DELETE FROM tblRepair WHERE lRepairKey = @repairKey
      AND (sWorkOrderNumber LIKE 'NK%' OR sWorkOrderNumber LIKE 'SK%')`, { repairKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Line Items ──────────────────────────────────────────

// GET /EndoCart/GetItems/:repairKey — List line items for a cart quote
router.get('/EndoCart/GetItems/:repairKey', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.params.repairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    const rows = await db.query(`
      SELECT rit.lRepairItemTranKey, rit.lRepairItemKey, rit.dblRepairPrice,
        rit.sComments, rit.sInitials, rit.sApproved,
        ISNULL(ri.sItemDescription, '') AS sItemDescription,
        ISNULL(ri.nUnitCost, 0)         AS nCatalogPrice,
        ISNULL(ri.sProductID, '')       AS sProductID
      FROM tblRepairItemTran rit
        LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
      WHERE rit.lRepairKey = @repairKey
      ORDER BY rit.lRepairItemTranKey`,
      { repairKey });
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// POST /EndoCart/AddItem — Add single line item to cart quote
router.post('/EndoCart/AddItem', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = parseInt(b.lRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    const result = await db.query(`
      INSERT INTO tblRepairItemTran (lRepairKey, lRepairItemKey, dblRepairPrice, sComments, sApproved)
      VALUES (@repairKey, @itemKey, @price, @comments, 'N');
      SELECT SCOPE_IDENTITY() AS lRepairItemTranKey`,
      {
        repairKey,
        itemKey:  parseInt(b.lRepairItemKey) || 0,
        price:    parseFloat(b.dblRepairPrice) || 0,
        comments: b.sComments || ''
      });
    const newKey = result[0] ? result[0].lRepairItemTranKey : 0;
    res.json({ success: true, lRepairItemTranKey: newKey });
  } catch (e) { next(e); }
});

// POST /EndoCart/UpdateItem — Update a single line item
router.post('/EndoCart/UpdateItem', async (req, res, next) => {
  try {
    const b = req.body || {};
    const tranKey = parseInt(b.lRepairItemTranKey) || 0;
    if (!tranKey) return res.status(400).json({ success: false, error: 'Missing item tran key' });
    await db.query(`
      UPDATE tblRepairItemTran SET
        dblRepairPrice = ISNULL(@price, dblRepairPrice),
        sComments      = ISNULL(@comments, sComments),
        sApproved      = ISNULL(@approved, sApproved)
      WHERE lRepairItemTranKey = @tranKey`,
      {
        tranKey,
        price:    b.dblRepairPrice != null ? parseFloat(b.dblRepairPrice) : null,
        comments: b.sComments      != null ? b.sComments                  : null,
        approved: b.sApproved      != null ? b.sApproved                  : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /EndoCart/DeleteItem — Remove a single line item
router.delete('/EndoCart/DeleteItem', async (req, res, next) => {
  try {
    const tranKey = parseInt(req.query.lRepairItemTranKey) || 0;
    if (!tranKey) return res.status(400).json({ success: false, error: 'Missing item tran key' });
    await db.query('DELETE FROM tblRepairItemTran WHERE lRepairItemTranKey = @tranKey', { tranKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /EndoCart/BulkAddItems — Insert multiple line items in one call
router.post('/EndoCart/BulkAddItems', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = parseInt(b.lRepairKey) || 0;
    const items = Array.isArray(b.items) ? b.items : [];
    if (!repairKey) return res.status(400).json({ success: false, error: 'Missing repair key' });
    if (!items.length) return res.json({ success: true, count: 0 });

    let count = 0;
    for (const item of items) {
      await db.query(`
        INSERT INTO tblRepairItemTran (lRepairKey, lRepairItemKey, dblRepairPrice, sComments, sApproved)
        VALUES (@repairKey, @itemKey, @price, @comments, 'N')`,
        {
          repairKey,
          itemKey:  parseInt(item.lRepairItemKey) || 0,
          price:    parseFloat(item.dblRepairPrice) || 0,
          comments: item.sComments || ''
        });
      count++;
    }
    res.json({ success: true, count });
  } catch (e) { next(e); }
});

module.exports = router;
