// ═══════════════════════════════════════════════════════
//  analytics.js — Profitability and analytics queries
//  Revenue source: tblGP_InvoiceStaging (tblInvoice always empty)
//  Cost source: tblRepairItemTran.dblRepairPrice (labor/parts)
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /Analytics/GetProfitability — Monthly revenue by sales rep
// Joins GP staging (revenue) to tblInvoice to tblRepair to tblSalesRep
router.get('/Analytics/GetProfitability', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT
        YEAR(gp.dtTranDate) AS nYear,
        MONTH(gp.dtTranDate) AS nMonth,
        CAST(YEAR(gp.dtTranDate) AS nvarchar(4)) + '-' + RIGHT('0' + CAST(MONTH(gp.dtTranDate) AS nvarchar(2)), 2) AS sMonth,
        inv.lSalesRepKey,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
        COUNT(DISTINCT gp.lInvoiceKey) AS nInvoiceCount,
        SUM(gp.dblTranAmount) AS dblRevenue,
        SUM(ISNULL(gp.dblShippingAmount, 0)) AS dblShipping,
        SUM(gp.TotalAmountDue) AS dblTotalBilled
      FROM tblGP_InvoiceStaging gp
        INNER JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = inv.lSalesRepKey
      WHERE gp.dtTranDate >= DATEADD(YEAR, -2, GETDATE())
        AND gp.bProcessed = 1
      GROUP BY
        YEAR(gp.dtTranDate),
        MONTH(gp.dtTranDate),
        inv.lSalesRepKey,
        sr.sRepFirst,
        sr.sRepLast
      ORDER BY nYear DESC, nMonth DESC, dblRevenue DESC`, {});
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Analytics/GetContractProfitability — Contract expense ratio analysis
// Revenue = contract dblAmtTotal / term length; Expense = sum of repair charges under contract
router.get('/Analytics/GetContractProfitability', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT
        con.lContractKey,
        con.sContractName1,
        con.lClientKey,
        ISNULL(c.sClientName1, '') AS sClientName1,
        con.dtDateEffective,
        con.dtDateTermination,
        con.dblAmtTotal AS dblContractValue,
        con.dblAmtInvoiced,
        COUNT(r.lRepairKey) AS nRepairCount,
        SUM(ISNULL(r.dblAmtRepair, 0)) AS dblTotalRepairCharges,
        SUM(ISNULL(r.dblAmtShipping, 0)) AS dblTotalShipping,
        CASE
          WHEN con.dblAmtTotal > 0
          THEN CAST(SUM(ISNULL(r.dblAmtRepair, 0)) / con.dblAmtTotal AS decimal(10,4))
          ELSE NULL
        END AS dblExpenseRatio
      FROM tblContract con
        LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
        LEFT JOIN tblRepair r ON r.lContractKey = con.lContractKey
      WHERE con.dtDateTermination >= DATEADD(YEAR, -2, GETDATE())
      GROUP BY
        con.lContractKey,
        con.sContractName1,
        con.lClientKey,
        c.sClientName1,
        con.dtDateEffective,
        con.dtDateTermination,
        con.dblAmtTotal,
        con.dblAmtInvoiced
      ORDER BY dblExpenseRatio DESC`, {});
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
