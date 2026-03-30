// ═══════════════════════════════════════════════════════
//  suppliers.js — Supplier CRUD + PO history + inventory sizes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for supplier list ──
// tblSupplier: no sSupplierAddr1/2 — addresses are sMailAddr1/2, sShipAddr1/2, sBillAddr1/2
// sEmailAddress does not exist — use sContactEMail or sBillEmail
const SUPPLIER_SELECT = `
  SELECT s.lSupplierKey, s.sSupplierName1, s.sSupplierName2,
    s.sMailAddr1, s.sMailAddr2, s.sMailCity, s.sMailState, s.sMailZip,
    s.sMailCity AS sCity, s.sMailState AS sState,
    s.sShipAddr1, s.sShipAddr2, s.sShipCity, s.sShipState, s.sShipZip,
    s.sBillAddr1, s.sBillAddr2, s.sBillCity, s.sBillState, s.sBillZip,
    s.sPhoneVoice, s.sPhoneFAX, s.sContactEMail AS sEmailAddress,
    s.sBillEmail, s.bActive, s.bAcquisitionSupplier,
    s.bAcquisitionSupplier AS bAcquisitionVendor,
    s.dtCreateDate, s.dtLastUpdate, s.mComments
  FROM tblSupplier s
`;

// GET /api/Supplier/GetAllSupplierList — All active suppliers
router.get('/Supplier/GetAllSupplierList', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1';
    const rows = await db.query(`${SUPPLIER_SELECT}
      WHERE (@all = 1 OR s.bActive = 1)
      ORDER BY s.sSupplierName1`, { all: includeInactive ? 1 : 0 });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Supplier/GetSupplierBySupplierKey — Single supplier detail
router.get('/Supplier/GetSupplierBySupplierKey', async (req, res, next) => {
  try {
    const supplierKey = parseInt(req.query.lSupplierKey) || 0;
    if (!supplierKey) return res.status(400).json({ error: 'lSupplierKey required' });
    const row = await db.queryOne(`${SUPPLIER_SELECT}
      WHERE s.lSupplierKey = @supplierKey`, { supplierKey });
    res.json(row || null);
  } catch (e) { next(e); }
});

// POST /api/Supplier/AddSupplier — Insert new supplier
router.post('/Supplier/AddSupplier', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblSupplier (sSupplierName1, sSupplierName2,
        sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip,
        sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip,
        sPhoneVoice, sPhoneFAX, sContactEMail, bActive, bAcquisitionSupplier,
        dtCreateDate)
      VALUES (@name1, @name2,
        @mailAddr1, @mailAddr2, @mailCity, @mailState, @mailZip,
        @shipAddr1, @shipAddr2, @shipCity, @shipState, @shipZip,
        @phone, @fax, @email, 1, @isAcq,
        GETDATE());
      SELECT SCOPE_IDENTITY() AS lSupplierKey`,
      {
        name1: b.sSupplierName1 || '',
        name2: b.sSupplierName2 || '',
        mailAddr1: b.sMailAddr1 || '',
        mailAddr2: b.sMailAddr2 || '',
        mailCity: b.sMailCity || '',
        mailState: b.sMailState || '',
        mailZip: b.sMailZip || '',
        shipAddr1: b.sShipAddr1 || '',
        shipAddr2: b.sShipAddr2 || '',
        shipCity: b.sShipCity || '',
        shipState: b.sShipState || '',
        shipZip: b.sShipZip || '',
        phone: b.sPhoneVoice || '',
        fax: b.sPhoneFAX || '',
        email: b.sContactEMail || b.sEmailAddress || '',
        isAcq: b.bAcquisitionSupplier ? 1 : 0
      });
    const newKey = result[0] ? result[0].lSupplierKey : 0;
    res.json({ lSupplierKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /api/Supplier/UpdateSupplier — Update supplier record
router.post('/Supplier/UpdateSupplier', async (req, res, next) => {
  try {
    const b = req.body || {};
    const supplierKey = b.lSupplierKey || 0;
    if (!supplierKey) return res.status(400).json({ error: 'Missing lSupplierKey' });
    await db.query(`
      UPDATE tblSupplier SET
        sSupplierName1 = ISNULL(@name1, sSupplierName1),
        sSupplierName2 = ISNULL(@name2, sSupplierName2),
        sMailAddr1 = ISNULL(@mailAddr1, sMailAddr1),
        sMailAddr2 = ISNULL(@mailAddr2, sMailAddr2),
        sMailCity = ISNULL(@mailCity, sMailCity),
        sMailState = ISNULL(@mailState, sMailState),
        sMailZip = ISNULL(@mailZip, sMailZip),
        sShipAddr1 = ISNULL(@shipAddr1, sShipAddr1),
        sShipAddr2 = ISNULL(@shipAddr2, sShipAddr2),
        sShipCity = ISNULL(@shipCity, sShipCity),
        sShipState = ISNULL(@shipState, sShipState),
        sShipZip = ISNULL(@shipZip, sShipZip),
        sPhoneVoice = ISNULL(@phone, sPhoneVoice),
        sPhoneFAX = ISNULL(@fax, sPhoneFAX),
        sContactEMail = ISNULL(@email, sContactEMail),
        bActive = ISNULL(@active, bActive),
        bAcquisitionSupplier = ISNULL(@isAcq, bAcquisitionSupplier),
        dtLastUpdate = GETDATE()
      WHERE lSupplierKey = @supplierKey`,
      {
        supplierKey,
        name1: b.sSupplierName1 || null,
        name2: b.sSupplierName2 || null,
        mailAddr1: b.sMailAddr1 || null,
        mailAddr2: b.sMailAddr2 || null,
        mailCity: b.sMailCity || null,
        mailState: b.sMailState || null,
        mailZip: b.sMailZip || null,
        shipAddr1: b.sShipAddr1 || null,
        shipAddr2: b.sShipAddr2 || null,
        shipCity: b.sShipCity || null,
        shipState: b.sShipState || null,
        shipZip: b.sShipZip || null,
        phone: b.sPhoneVoice || null,
        fax: b.sPhoneFAX || null,
        email: b.sContactEMail || b.sEmailAddress || null,
        active: b.bActive != null ? b.bActive : null,
        isAcq: b.bAcquisitionSupplier != null ? b.bAcquisitionSupplier : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /api/Supplier/DeleteSupplier — Delete supplier
router.delete('/Supplier/DeleteSupplier', async (req, res, next) => {
  try {
    const supplierKey = parseInt(req.query.lSupplierKey) || 0;
    if (!supplierKey) return res.status(400).json({ error: 'lSupplierKey required' });
    await db.query('DELETE FROM tblSupplier WHERE lSupplierKey = @supplierKey', { supplierKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/Supplier/GetSupplierRecentPOsList — Recent POs for a supplier
// tblSupplierPO: lSupplierPOKey, lSupplierKey, dblPOTotal, dtDateOfPO, sSupplierPONumber, bCancelled, lSupplierPOTypeKey
router.post('/Supplier/GetSupplierRecentPOsList', async (req, res, next) => {
  try {
    const supplierKey = parseInt(req.body.lSupplierKey) || 0;
    if (!supplierKey) return res.status(400).json({ error: 'lSupplierKey required' });
    const rows = await db.query(`
      SELECT TOP 50
        po.lSupplierPOKey, po.lSupplierKey, po.sSupplierPONumber,
        po.dblPOTotal, po.dtDateOfPO, po.bCancelled, po.lSupplierPOTypeKey,
        ISNULL(pt.sSupplierPOType, '') AS sSupplierPOType
      FROM tblSupplierPO po
        LEFT JOIN tblSupplierPOTypes pt ON pt.lSupplierPOTypeKey = po.lSupplierPOTypeKey
      WHERE po.lSupplierKey = @supplierKey
      ORDER BY po.dtDateOfPO DESC`, { supplierKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Supplier/GetSuppliedItemAndSize — Items/sizes this supplier supplies
// tblSupplierSizes: lSupplierSizesKey, lSupplierKey, lInventorySizeKey, sSupplierPartNo, dblUnitCost, bActive
router.post('/Supplier/GetSuppliedItemAndSize', async (req, res, next) => {
  try {
    const supplierKey = parseInt(req.body.lSupplierKey) || 0;
    if (!supplierKey) return res.status(400).json({ error: 'lSupplierKey required' });
    const rows = await db.query(`
      SELECT ss.lSupplierSizesKey, ss.lSupplierKey, ss.lInventorySizeKey,
        ss.sSupplierPartNo, ss.dblUnitCost, ss.bActive,
        ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
        ISNULL(isz.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(inv.sItemDescription, '') AS sItemDescription,
        inv.lInventoryKey
      FROM tblSupplierSizes ss
        LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = ss.lInventorySizeKey
        LEFT JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
      WHERE ss.lSupplierKey = @supplierKey
      ORDER BY inv.sItemDescription, isz.sSizeDescription`, { supplierKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Supplier/GetAvailableSuppliedItemAndSize — Inventory sizes NOT yet assigned to this supplier
router.post('/Supplier/GetAvailableSuppliedItemAndSize', async (req, res, next) => {
  try {
    const supplierKey = parseInt(req.body.lSupplierKey) || 0;
    if (!supplierKey) return res.status(400).json({ error: 'lSupplierKey required' });
    const rows = await db.query(`
      SELECT isz.lInventorySizeKey, isz.sSizeDescription, isz.sRigidOrFlexible,
        isz.dblUnitCost, isz.bActive,
        ISNULL(inv.sItemDescription, '') AS sItemDescription,
        inv.lInventoryKey
      FROM tblInventorySize isz
        LEFT JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
      WHERE isz.bActive = 1
        AND isz.lInventorySizeKey NOT IN (
          SELECT lInventorySizeKey FROM tblSupplierSizes
          WHERE lSupplierKey = @supplierKey
        )
      ORDER BY inv.sItemDescription, isz.sSizeDescription`, { supplierKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
