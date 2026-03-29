// ═══════════════════════════════════════════════════════
//  supplier-pos.js — Supplier Purchase Order endpoints
//  Tables: tblSupplierPO, tblSupplierPOTran, tblSupplierPOTypes
//          tblSupplier, tblSupplierSizes, tblInventorySize
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /SupplierPO/GetAll — All supplier POs with supplier name
router.get('/SupplierPO/GetAll', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        po.lSupplierPOKey,
        po.lSupplierKey,
        po.sSupplierPONumber,
        po.dtDateOfPO,
        po.dblPOTotal,
        po.dblOrderMinimum,
        po.bCancelled,
        po.bGenerated,
        po.lSupplierPOTypeKey,
        po.sEmailAddress,
        po.dtLastUpdate,
        ISNULL(s.sSupplierName1, '') AS sSupplierName1,
        ISNULL(s.bActive, 0) AS bSupplierActive,
        ISNULL(pt.sSupplierPOType, '') AS sSupplierPOType
      FROM tblSupplierPO po
        LEFT JOIN tblSupplier s ON s.lSupplierKey = po.lSupplierKey
        LEFT JOIN tblSupplierPOTypes pt ON pt.lSupplierPOTypeKey = po.lSupplierPOTypeKey
      WHERE po.bCancelled = 0
      ORDER BY po.dtDateOfPO DESC`, {});
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /SupplierPO/GetTransactions/:poKey — Line items for a PO
// tblSupplierPOTran links to tblSupplierSizes which links to tblInventorySize
router.get('/SupplierPO/GetTransactions/:poKey', async (req, res, next) => {
  try {
    const poKey = parseInt(req.params.poKey) || 0;
    if (!poKey) return res.status(400).json({ error: 'Missing PO key' });

    const rows = await db.query(`
      SELECT
        t.lSupplierPOTranKey,
        t.lSupplierPOKey,
        t.lSupplierSizesKey,
        t.dblUnitCost,
        t.nOrderQuantity,
        t.nReceivedQuantity,
        t.dblItemCost,
        t.bActive,
        t.dtEstimatedDeliveryDate,
        t.bIntegratedWithGP,
        t.dtCreateDate,
        ISNULL(ss.sSupplierPartNo, '') AS sSupplierPartNo,
        ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
        ISNULL(isz.sBinNumber, '') AS sBinNumber,
        ISNULL(isz.nLevelCurrent, 0) AS nLevelCurrent,
        ISNULL(isz.nLevelMinimum, 0) AS nLevelMinimum
      FROM tblSupplierPOTran t
        LEFT JOIN tblSupplierSizes ss ON ss.lSupplierSizesKey = t.lSupplierSizesKey
        LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
      WHERE t.lSupplierPOKey = @poKey AND t.bActive = 1
      ORDER BY t.lSupplierPOTranKey`, { poKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /SupplierPO/GetTypes — PO type lookup
router.get('/SupplierPO/GetTypes', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lSupplierPOTypeKey, sSupplierPOType
      FROM tblSupplierPOTypes
      ORDER BY sSupplierPOType`, {});
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
