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

// POST /Contract/GetAllContractsList — Paginated contract list (active by default)
router.post('/Contract/GetAllContractsList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const showExpired = body.showExpired === true;
    const where = showExpired ? '' : ' WHERE con.dtDateTermination >= GETDATE()';
    const result = await db.queryPage(`${CONTRACT_SELECT}${where}`,
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
        contractNum: b.sContractNumber || b.psContractName || b.psContractNumber || '',
        clientKey: b.lClientKey || b.plClientKey || 0,
        typeKey: b.lContractTypeKey || b.plContractTypeKey || 0,
        repKey: b.lSalesRepKey || b.plSalesRepKey || 0,
        termsKey: b.lPaymentTermsKey || b.plPaymentTermsKey || 0,
        dateEff: b.dtDateEffective || b.pdtStartDate || null,
        dateTerm: b.dtDateTermination || b.pdtEndDate || null,
        amtContract: b.dblAmtContract || b.dblAmtTotal || 0,
        po: b.sPurchaseOrder || b.psPurchaseOrder || '',
        comments: b.mComments || b.pmContractNotes || ''
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
        contractNum: b.sContractNumber || b.psContractName || b.psContractNumber || null,
        clientKey: b.lClientKey || b.plClientKey || null,
        typeKey: b.lContractTypeKey || b.plContractTypeKey || null,
        repKey: b.lSalesRepKey || b.plSalesRepKey || null,
        termsKey: b.lPaymentTermsKey || b.plPaymentTermsKey || null,
        dateEff: b.dtDateEffective || b.pdtStartDate || null,
        dateTerm: b.dtDateTermination || b.pdtEndDate || null,
        amtContract: b.dblAmtContract != null ? b.dblAmtContract : (b.dblAmtTotal != null ? b.dblAmtTotal : null),
        po: b.sPurchaseOrder || b.psPurchaseOrder || null,
        comments: b.mComments || b.pmContractNotes || null
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

// GET /Contract/GetAllContractServicePlanTerms — Payment terms for contract service plans
router.get('/Contract/GetAllContractServicePlanTerms', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lPaymentTermsKey, sTermsDesc, nIncrementDays AS lDueDays
      FROM tblPaymentTerms ORDER BY sTermsDesc`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractDepartments — Departments on a contract
// Note: GetContractDepartmentsList already exists but uses different path pattern
router.get('/Contract/GetContractDepartments', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });
    const rows = await db.query(`
      SELECT cd.lContractDepartmentKey, cd.lContractKey, cd.lDepartmentKey,
        cd.dtContractDepartmentEffectiveDate, cd.dtContractDepartmentEndDate,
        cd.bNonBillable, cd.bCalcCostFromScopes, cd.sPONumber,
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

// GET /Contract/GetContractDepartmentsAvailable — Departments NOT on a contract for a client
router.get('/Contract/GetContractDepartmentsAvailable', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    const clientKey = parseInt(req.query.lClientKey) || 0;
    if (!contractKey || !clientKey) {
      return res.status(400).json({ error: 'lContractKey and lClientKey required' });
    }
    const rows = await db.query(`
      SELECT d.lDepartmentKey, d.sDepartmentName, d.lServiceLocationKey
      FROM tblDepartment d
      WHERE d.lClientKey = @clientKey
        AND d.lDepartmentKey NOT IN (
          SELECT lDepartmentKey FROM tblContractDepartments
          WHERE lContractKey = @contractKey
        )
      ORDER BY d.sDepartmentName`, { contractKey, clientKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractAmendmentsList — Amendments for a contract
router.get('/Contract/GetContractAmendmentsList', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });
    const rows = await db.query(`
      SELECT ca.lContractAmendmentKey, ca.lContractKey,
        ca.dtContractAmendmentDate, ca.lContractAmendmentStatusKey,
        ca.nPreviousInvoiceAmount, ca.nNewInvoiceAmount,
        ca.nPreviousContractTotal, ca.nNewContractTotal,
        ca.lRemainingMonths, ca.nNewRemainingBalance, ca.dtFirstBillDate,
        ISNULL(cas.sContractAmendmentStatus, '') AS sContractAmendmentStatus
      FROM tblContractAmendments ca
        LEFT JOIN tblContractAmendmentStatuses cas
          ON cas.lContractAmendmentStatusKey = ca.lContractAmendmentStatusKey
      WHERE ca.lContractKey = @contractKey
      ORDER BY ca.dtContractAmendmentDate DESC`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetAllContractCoverageCounts — Scope counts by instrument type
router.get('/Contract/GetAllContractCoverageCounts', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });
    const rows = await db.query(`
      SELECT
        ISNULL(st.sRigidOrFlexible, 'I') AS sRigidOrFlexible,
        COUNT(*) AS nCount
      FROM tblContractScope cs
        LEFT JOIN tblScope s ON s.lScopeKey = cs.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
      WHERE cs.lContractKey = @contractKey
      GROUP BY ISNULL(st.sRigidOrFlexible, 'I')`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractReportCardDetails — Performance stats for a contract
// Merges tblContractReportCard (pre-computed KPIs) with live repair stats
router.get('/Contract/GetContractReportCardDetails', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });

    // Live repair stats
    const repairStats = await db.queryOne(`
      SELECT
        COUNT(*) AS nTotalRepairs,
        SUM(CASE WHEN r.dtDateOut IS NOT NULL THEN 1 ELSE 0 END) AS nCompleted,
        AVG(CASE WHEN r.dtDateOut IS NOT NULL AND r.dtDateIn IS NOT NULL
          THEN DATEDIFF(day, r.dtDateIn, r.dtDateOut) ELSE NULL END) AS nAvgTATDays,
        SUM(r.dblAmtRepair) AS dblTotalCharges,
        MAX(r.dtDateIn) AS dtLastRepairIn
      FROM tblRepair r
      WHERE r.lContractKey = @contractKey`, { contractKey });

    // Pre-computed report card (alias n* → dbl* for client compatibility)
    const reportCard = await db.queryOne(`
      SELECT
        rc.nRevenue AS dblRevenue,
        rc.nConsumption AS dblConsumption,
        rc.nConsumption AS dblTotalConsumption,
        rc.nPercentTimeElapsed AS dblPercentTimeElapsed,
        rc.nPercentValueConsumedConsumption AS dblConsumptionIndex,
        rc.dtLastUpdateDate
      FROM tblContractReportCard rc
      WHERE rc.lContractKey = @contractKey`, { contractKey });

    // Contract header for annual value and expenses
    const header = await db.queryOne(`
      SELECT con.dblAmtTotal AS dblContractTotal,
        con.dblAmtTotal AS dblAnnualValue,
        con.dblAmtInvoiced AS dblExpenses,
        con.dblAmtInvoiced AS dblTotalExpenses,
        CASE WHEN con.dblAmtTotal > 0
          THEN ROUND((con.dblAmtTotal - ISNULL(con.dblAmtInvoiced, 0)) / con.dblAmtTotal * 100, 1)
          ELSE 0 END AS dblMargin,
        CASE WHEN con.dblAmtTotal > 0 AND rc2.nPercentTimeElapsed > 0
          THEN ROUND(con.dblAmtTotal * (rc2.nPercentTimeElapsed / 100.0), 2)
          ELSE 0 END AS dblBudgetAllocation,
        CASE WHEN con.dblAmtTotal > 0 AND rc2.nPercentTimeElapsed > 0
          THEN ROUND(ISNULL(con.dblAmtInvoiced, 0) / NULLIF(con.dblAmtTotal * (rc2.nPercentTimeElapsed / 100.0), 0), 3)
          ELSE 0 END AS dblExpenseIndex,
        CASE WHEN ISNULL(con.dblAmtInvoiced, 0) > 0
          THEN ROUND(ISNULL(con.dblAmtInvoiced, 0) / NULLIF(con.dblAmtTotal, 0) * 100, 1)
          ELSE 0 END AS dblEfficiency
      FROM tblContract con
        LEFT JOIN tblContractReportCard rc2 ON rc2.lContractKey = con.lContractKey
      WHERE con.lContractKey = @contractKey`, { contractKey });

    res.json(Object.assign({}, repairStats || {}, reportCard || {}, header || {}));
  } catch (e) { next(e); }
});

// GET /Contract/GetContractExpenseBreakdown — Repair item expense breakdown for contract
router.get('/Contract/GetContractExpenseBreakdown', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.query.lContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });
    const rows = await db.query(`
      SELECT
        ri.sItemDescription,
        ri.sPartOrLabor,
        COUNT(*) AS nUsageCount,
        SUM(rit.dblRepairPrice) AS dblTotalCost
      FROM tblRepairItemTran rit
        INNER JOIN tblRepair r ON r.lRepairKey = rit.lRepairKey
        LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
      WHERE r.lContractKey = @contractKey
      GROUP BY ri.sItemDescription, ri.sPartOrLabor
      ORDER BY dblTotalCost DESC`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /Contract/GetAllContractInvoice — Invoices linked to a contract (via repair)
router.post('/Contract/GetAllContractInvoice', async (req, res, next) => {
  try {
    const b = req.body || {};
    const contractKey = b.lContractKey || 0;
    if (!contractKey) return res.status(400).json({ error: 'lContractKey required' });
    const rows = await db.query(`
      SELECT TOP 200
        gp.GPInvoiceStagingID, gp.lInvoiceKey, gp.sTranNumber,
        gp.dtTranDate, gp.TotalAmountDue, gp.dblTranAmount,
        gp.bProcessed, gp.dtPostedDate,
        inv.lRepairKey, r.sWorkOrderNumber,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblGP_InvoiceStaging gp
        LEFT JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
        LEFT JOIN tblRepair r ON r.lRepairKey = inv.lRepairKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = inv.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE r.lContractKey = @contractKey
      ORDER BY gp.dtTranDate DESC`, { contractKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetAllContractInstallments — All scheduled installments across all contracts
router.get('/Contract/GetAllContractInstallments', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        ci.lInstallmentKey, ci.lContractKey, ci.dtDateDue, ci.dblAmount,
        ci.sInvoiceNumber, ci.sInvoiced, ci.mInvoiceComments,
        ci.dtCreateDate, ci.dtLastUpdate,
        con.sContractNumber,
        ISNULL(c.sClientName1, '') AS sClientName1,
        cit.sInstallmentType
      FROM tblContractInstallment ci
        LEFT JOIN tblContract con ON con.lContractKey = ci.lContractKey
        LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
        LEFT JOIN tblContractInstallmentTypes cit ON cit.lInstallmentTypeID = con.lInstallmentTypeID
      ORDER BY ci.dtDateDue DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetAllContractClient — Clients that have at least one active contract
router.get('/Contract/GetAllContractClient', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT DISTINCT c.lClientKey, c.sClientName1, c.sClientName2,
        c.sMailCity, c.sMailState, c.bActive
      FROM tblClient c
        INNER JOIN tblContract con ON con.lClientKey = c.lClientKey
      WHERE c.bActive = 1
      ORDER BY c.sClientName1`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contract/GetContractByDepartment/:deptKey — Active contract covering a specific department
// Used by repairs page for contract pricing lookup
// Contract is "active" when today is between dtDateEffective and dtDateTermination
router.get('/Contract/GetContractByDepartment/:deptKey', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.params.deptKey) || 0;
    if (!deptKey) return res.status(400).json({ success: false, error: 'deptKey required' });

    const rows = await db.query(`
      SELECT
        con.lContractKey, con.sContractNumber, con.lClientKey,
        con.lContractTypeKey, con.lSalesRepKey, con.lPaymentTermsKey,
        con.dtDateEffective, con.dtDateTermination,
        con.dblAmtTotal AS dblAmtContract,
        con.dblAmtInvoiced AS dblAmtExpense,
        con.nCountFlexible, con.nCountRigid, con.nCountCamera, con.nCountAll,
        con.lBillType, con.lBillDay, con.dtNextBillDate,
        con.sPurchaseOrder, con.mComments,
        ISNULL(c.sClientName1, '') AS sClientName1,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
        ISNULL(ct.sContractType, '') AS sContractTypeName,
        ISNULL(pt.sTermsDesc, '') AS sPaymentTerms,
        cd.lContractDepartmentKey, cd.dtContractDepartmentEffectiveDate,
        cd.dtContractDepartmentEndDate, cd.bNonBillable, cd.bCalcCostFromScopes,
        'Active' AS sContractStatus
      FROM tblContractDepartments cd
        INNER JOIN tblContract con ON con.lContractKey = cd.lContractKey
        LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = con.lSalesRepKey
        LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = con.lContractTypeKey
        LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = con.lPaymentTermsKey
      WHERE cd.lDepartmentKey = @deptKey
        AND con.dtDateEffective <= GETDATE()
        AND con.dtDateTermination >= GETDATE()
      ORDER BY con.dtDateTermination DESC`, { deptKey });

    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

module.exports = router;
