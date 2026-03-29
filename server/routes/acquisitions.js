// ═══════════════════════════════════════════════════════
//  acquisitions.js — Acquisition instrument management
// ═══════════════════════════════════════════════════════
// tblAcquisitionSupplierPO: purchase orders for acquisition scopes
// tblAcquisitionSupplierPOTran: line items with scope type + serial info
// tblScope.lAcquisitionSupplierPOTranKey: links scope to its acquisition PO tran
// "Sold" = scope exists in tblScopeSale
// "In-house" = scope has lAcquisitionSupplierPOTranKey AND not sold AND sScopeIsDead != 'true'
// "Consigned" = scopes on acquisition POs that haven't been received/assigned yet (dtDateReceived IS NULL)
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for acquisition items ──
const ACQ_SELECT = `
  SELECT
    s.lScopeKey, s.sSerialNumber, s.sScopeIsDead, s.lDepartmentKey,
    s.lAcquisitionSupplierPOTranKey,
    ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
    ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
    ISNULL(m.sManufacturer, '') AS sManufacturerName,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(c.sClientName1, '') AS sClientName1,
    pot.nScopeCost, pot.dtDateReceived, pot.mComment,
    po.sSupplierPONumber, po.dtDateOfPO, po.lSupplierKey,
    ISNULL(sup.sSupplierName1, '') AS sSupplierName1
  FROM tblScope s
    LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
    LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
    LEFT JOIN tblAcquisitionSupplierPOTran pot
      ON pot.lAcquisitionSupplierPOTranKey = s.lAcquisitionSupplierPOTranKey
    LEFT JOIN tblAcquisitionSupplierPO po
      ON po.lAcquisitionSupplierPOKey = pot.lAcquisitionSupplierPOKey
    LEFT JOIN tblSupplier sup ON sup.lSupplierKey = po.lSupplierKey
  WHERE s.lAcquisitionSupplierPOTranKey IS NOT NULL
`;

// POST /api/Acquisitions/GetAcquisitionsSoldList — Acquisition scopes that have been sold
router.post('/Acquisitions/GetAcquisitionsSoldList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(`${ACQ_SELECT}
      AND s.lScopeKey IN (SELECT lScopeKey FROM tblScopeSale WHERE lScopeKey IS NOT NULL)`,
      's.lScopeKey DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/Acquisitions/GetAcquisitionsInHouseList — Acquisition scopes currently in-house
router.post('/Acquisitions/GetAcquisitionsInHouseList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(`${ACQ_SELECT}
      AND (s.sScopeIsDead IS NULL OR s.sScopeIsDead = 'false' OR s.sScopeIsDead = '0')
      AND s.lScopeKey NOT IN (SELECT lScopeKey FROM tblScopeSale WHERE lScopeKey IS NOT NULL)
      AND pot.dtDateReceived IS NOT NULL`,
      's.lScopeKey DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/Acquisitions/GetAcquisitionsConsignedList — Acquisition PO items not yet received
router.post('/Acquisitions/GetAcquisitionsConsignedList', async (req, res, next) => {
  try {
    const body = req.body || {};
    // Consigned = on a PO but not yet received into inventory (dtDateReceived IS NULL)
    const result = await db.queryPage(`
      SELECT pot.lAcquisitionSupplierPOTranKey, pot.lAcquisitionSupplierPOKey,
        pot.lScopeTypeKey, pot.sSerialNumber, pot.nScopeCost,
        pot.dtDateReceived, pot.mComment,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturerName,
        po.sSupplierPONumber, po.dtDateOfPO,
        ISNULL(sup.sSupplierName1, '') AS sSupplierName1
      FROM tblAcquisitionSupplierPOTran pot
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = pot.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblAcquisitionSupplierPO po
          ON po.lAcquisitionSupplierPOKey = pot.lAcquisitionSupplierPOKey
        LEFT JOIN tblSupplier sup ON sup.lSupplierKey = po.lSupplierKey
      WHERE pot.dtDateReceived IS NULL
        AND (po.bCancelled IS NULL OR po.bCancelled = 0)`,
      'pot.lAcquisitionSupplierPOTranKey DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

module.exports = router;
