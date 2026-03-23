// ═══════════════════════════════════════════════════════
//  contracts.js — Contract CRUD + related lists routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for contract list (enriched with JOINs) ──
// tblContract actual columns:
//   dblAmtTotal (not dblAmtContract), dblAmtInvoiced (not dblAmtExpense),
//   no bActive, dtCreateDate (not dtDateCreated)
// tblContractType → tblContractTypes, sContractType (not sContractTypeName)
const CONTRACT_SELECT = `
  SELECT con.lContractKey, con.sContractNumber, con.lClientKey,
    con.lContractTypeKey, con.lSalesRepKey, con.lPaymentTermsKey,
    con.dtDateEffective, con.dtDateTermination,
    con.dblAmtTotal AS dblAmtContract, con.dblAmtInvoiced AS dblAmtExpense,
    con.sPurchaseOrder, con.mComments,
    con.dtCreateDate, con.dtLastUpdate,
    ISNULL(c.sClientName1, '') AS sClientName1,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    sr.lSalesRepKey AS lSalesRepNameKey,
    ISNULL(ct.sContractType, '') AS sContractTypeName,
    ISNULL(pt.sTermsDesc, '') AS sPaymentTerms,
    CASE
      WHEN con.dtDateTermination < GETDATE() THEN 'Expired'
      WHEN con.dtDateEffective > GETDATE() THEN 'Pending'
      ELSE 'Active'
    END AS sContractStatus
  FROM tblContract con
    LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = con.lSalesRepKey
    LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = con.lContractTypeKey
    LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = con.lPaymentTermsKey
`;

// POST /Contract/GetAllContractsList — Paginated contract list
router.post('/Contract/GetAllContractsList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(CONTRACT_SELECT,
      'con.dtDateTermination DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractById — Single contract detail
router.get('/Contract/GetContractById', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.plContractKey) || 0;
    const row = await db.queryOne(`${CONTRACT_SELECT}
      WHERE con.lContractKey = @contractKey`, { contractKey });
    res.json(row);
  } catch (e) { next(e); }
});

// POST /Contract/AddContract — Insert new contract
// dblAmtContract → dblAmtTotal, dblAmtExpense not used, no bActive, dtDateCreated → dtCreateDate
router.post('/Contract/AddContract', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblContract (sContractNumber, lClientKey, lContractTypeKey,
        lSalesRepKey, lPaymentTermsKey,
        dtDateEffective, dtDateTermination,
        dblAmtTotal,
        sPurchaseOrder, mComments, dtCreateDate)
      VALUES (@contractNum, @clientKey, @typeKey,
        @repKey, @termsKey,
        @dateEff, @dateTerm,
        @amtContract,
        @po, @comments, GETDATE());
      SELECT SCOPE_IDENTITY() AS lContractKey`,
      {
        contractNum: b.sContractNumber || '',
        clientKey: b.lClientKey || 0,
        typeKey: b.lContractTypeKey || 0,
        repKey: b.lSalesRepKey || 0,
        termsKey: b.lPaymentTermsKey || 0,
        dateEff: b.dtDateEffective || null,
        dateTerm: b.dtDateTermination || null,
        amtContract: b.dblAmtContract || b.dblAmtTotal || 0,
        po: b.sPurchaseOrder || '',
        comments: b.mComments || ''
      });
    const newKey = result[0] ? result[0].lContractKey : 0;
    res.json({ lContractKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Contract/UpdateContract — Update contract record
// dblAmtContract → dblAmtTotal, no bActive
router.post('/Contract/UpdateContract', async (req, res, next) => {
  try {
    const b = req.body || {};
    const contractKey = b.lContractKey || 0;
    if (!contractKey) return res.status(400).json({ error: 'Missing contract key' });
    await db.query(`
      UPDATE tblContract SET
        sContractNumber = ISNULL(@contractNum, sContractNumber),
        lClientKey = ISNULL(@clientKey, lClientKey),
        lContractTypeKey = ISNULL(@typeKey, lContractTypeKey),
        lSalesRepKey = ISNULL(@repKey, lSalesRepKey),
        lPaymentTermsKey = ISNULL(@termsKey, lPaymentTermsKey),
        dtDateEffective = ISNULL(@dateEff, dtDateEffective),
        dtDateTermination = ISNULL(@dateTerm, dtDateTermination),
        dblAmtTotal = ISNULL(@amtContract, dblAmtTotal),
        sPurchaseOrder = ISNULL(@po, sPurchaseOrder),
        mComments = ISNULL(@comments, mComments),
        dtLastUpdate = GETDATE()
      WHERE lContractKey = @contractKey`,
      {
        contractKey,
        contractNum: b.sContractNumber || null,
        clientKey: b.lClientKey || null,
        typeKey: b.lContractTypeKey || null,
        repKey: b.lSalesRepKey || null,
        termsKey: b.lPaymentTermsKey || null,
        dateEff: b.dtDateEffective || null,
        dateTerm: b.dtDateTermination || null,
        amtContract: b.dblAmtContract != null ? b.dblAmtContract : (b.dblAmtTotal != null ? b.dblAmtTotal : null),
        po: b.sPurchaseOrder || null,
        comments: b.mComments || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /Contract/DeleteContract — Delete contract and related records
router.delete('/Contract/DeleteContract', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.plContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'Missing contract key' });
    await db.query('DELETE FROM tblContractScope WHERE lContractKey = @contractKey', { contractKey });
    await db.query('DELETE FROM tblContractDepartments WHERE lContractKey = @contractKey', { contractKey });
    await db.query('DELETE FROM tblContract WHERE lContractKey = @contractKey', { contractKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /Contract/GetContractDepartmentsList — Departments on a contract
router.get('/Contract/GetContractDepartmentsList', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.plContractKey) || 0;
    const rows = await db.query(`
      SELECT cd.lContractDepartmentKey, cd.lContractKey, cd.lDepartmentKey,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblContractDepartments cd
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = cd.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE cd.lContractKey = @contractKey
      ORDER BY d.sDepartmentName`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractRepairsList — Repairs under this contract
router.get('/Contract/GetContractRepairsList', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.plContractKey) || 0;
    const rows = await db.query(`
      SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut,
        r.lRepairStatusID, r.lDepartmentKey, r.lScopeKey,
        r.dblAmtRepair, r.sComplaintDesc,
        ISNULL(rs.sRepairStatus, '') AS sRepairStatus,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName
      FROM tblRepair r
        LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
      WHERE r.lContractKey = @contractKey
      ORDER BY r.dtDateIn DESC`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /Contract/GetAllContractScopes — Scopes under contract
// tblContractScope: NO lDepartmentKey, NO lScopeTypeKey
// Scope type comes from scope → scope type chain
router.post('/Contract/GetAllContractScopes', async (req, res, next) => {
  try {
    const body = req.body || {};
    const contractKey = body.plContractKey || 0;
    const rows = await db.query(`
      SELECT cs.lContractScopeKey, cs.lContractKey, cs.lScopeKey,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturer,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        s.lDepartmentKey, s.lScopeTypeKey
      FROM tblContractScope cs
        LEFT JOIN tblScope s ON s.lScopeKey = cs.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
      WHERE cs.lContractKey = @contractKey
      ORDER BY d.sDepartmentName, st.sScopeTypeDesc`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
