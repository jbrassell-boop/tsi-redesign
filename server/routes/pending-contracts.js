// ═══════════════════════════════════════════════════════
//  pending-contracts.js — Pending contract (proposal) routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

const PENDING_SELECT = `
  SELECT
    pc.lPendingContractKey,
    pc.sPendingContractName1,
    pc.sStatus,
    pc.lTermMonths,
    pc.dtCreationDate,
    pc.lClientKey,
    pc.lContractTypeKey,
    pc.lSalesRepKey,
    pc.lPendingContractAgreementTemplateKey,
    pc.sPendingContractBillName1, pc.sPendingContractBillName2,
    pc.sPendingContractAddr1, pc.sPendingContractAddr2,
    pc.sPendingContractCity, pc.sPendingContractState, pc.sPendingContractZip,
    pc.sPendingContractPhoneVoice,
    ISNULL(c.sClientName1,'') AS sClientName1,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    ISNULL(ct.sContractType,'') AS sContractTypeName,
    (SELECT COUNT(*) FROM tblPendingContractScope pcs
      WHERE pcs.lPendingContractKey = pc.lPendingContractKey) AS scopeCount,
    (SELECT ISNULL(SUM(pcs.nCost),0) FROM tblPendingContractScope pcs
      WHERE pcs.lPendingContractKey = pc.lPendingContractKey) AS dblAmtTotal
  FROM tblPendingContract pc
    LEFT JOIN tblClient c ON c.lClientKey = pc.lClientKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = pc.lSalesRepKey
    LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = pc.lContractTypeKey
  WHERE pc.Delete_Datetime IS NULL
`;

// POST /PendingContract/GetAllPendingContracts
router.post('/PendingContract/GetAllPendingContracts', async (req, res, next) => {
  try {
    const rows = await db.query(`${PENDING_SELECT} ORDER BY pc.dtCreationDate DESC`);
    res.json({ list: rows, total: rows.length });
  } catch (e) { next(e); }
});

// GET /PendingContract/GetPendingContractById
router.get('/PendingContract/GetPendingContractById', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingContractKey) || 0;
    const row = await db.queryOne(`${PENDING_SELECT} AND pc.lPendingContractKey = @key`, { key });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// GET /PendingContract/GetPendingContractScopes
router.get('/PendingContract/GetPendingContractScopes', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingContractKey) || 0;
    const rows = await db.query(`
      SELECT
        pcs.lPendingContractScopeKey,
        pcs.lPendingContractKey,
        pcs.lScopeKey,
        pcs.lScopeTypeKey,
        pcs.nCost,
        pcs.nUnitCost,
        pcs.lQuantity,
        pcs.lClientKey,
        pcs.lDepartmentKey,
        ISNULL(s.sSerialNumber,'') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
        ISNULL(m.sManufacturer,'') AS sManufacturer,
        ISNULL(d.sDepartmentName,'') AS sDepartmentName,
        ISNULL(c.sClientName1,'') AS sClientName1
      FROM tblPendingContractScope pcs
        LEFT JOIN tblScope s ON s.lScopeKey = pcs.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = ISNULL(pcs.lScopeTypeKey, s.lScopeTypeKey)
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = ISNULL(pcs.lDepartmentKey, s.lDepartmentKey)
        LEFT JOIN tblClient c ON c.lClientKey = ISNULL(pcs.lClientKey, d.lClientKey)
      WHERE pcs.lPendingContractKey = @key
      ORDER BY d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber`,
      { key }
    );
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
