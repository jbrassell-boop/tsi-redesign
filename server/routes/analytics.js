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

// GET /Analytics/GetMetrics — Repair metrics for Metrics tab
// period: MTD (default) | QTD | YTD
// Returns: KPI summary + scope type breakdown + revenue totals
router.get('/Analytics/GetMetrics', async (req, res, next) => {
  try {
    const period = (req.query.period || 'MTD').toUpperCase();
    let periodStart;
    if (period === 'YTD') {
      periodStart = `DATEFROMPARTS(YEAR(GETDATE()), 1, 1)`;
    } else if (period === 'QTD') {
      periodStart = `DATEADD(QUARTER, DATEDIFF(QUARTER, 0, GETDATE()), 0)`;
    } else {
      // MTD
      periodStart = `DATEFROMPARTS(YEAR(GETDATE()), MONTH(GETDATE()), 1)`;
    }

    // In-house count: repairs currently active (not shipped, not cancelled)
    // Shipped = statuses 10, 12, 13, 16, 17, 21 (shipping phase)
    // Received = intake statuses 1, 3
    // In repair = 4, 5, 6, 8, 9, 11, 14, 15, 18, 19, 20, 22
    const summary = await db.queryOne(`
      SELECT
        COUNT(CASE WHEN r.lRepairStatusID IN (1,3) THEN 1 END) AS nReceived,
        COUNT(CASE WHEN r.lRepairStatusID IN (4,5,6,8,9,11,14,15,18,19,20,22) THEN 1 END) AS nInRepair,
        COUNT(CASE WHEN r.lRepairStatusID IN (10,12,13,16,17,21) THEN 1 END) AS nScheduledShip,
        COUNT(*) AS nInHouse
      FROM tblRepair r
      WHERE r.dtDateOut IS NULL
        AND r.sRepairClosed <> '1'`, {});

    // Period metrics: repairs received in period
    const periodMetrics = await db.queryOne(`
      SELECT
        COUNT(*) AS nTotalInPeriod,
        COUNT(CASE WHEN r.dtDateOut IS NOT NULL THEN 1 END) AS nShipped,
        AVG(CASE
          WHEN r.dtDateOut IS NOT NULL
          THEN CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS float)
        END) AS dblAvgTat,
        COUNT(CASE
          WHEN r.dtDateOut IS NOT NULL
            AND DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) <= 10
          THEN 1
        END) AS nOnTime
      FROM tblRepair r
      WHERE r.dtDateIn >= ${periodStart}`, {});

    const shipped = periodMetrics.nShipped || 0;
    const onTime = periodMetrics.nOnTime || 0;
    const onTimePct = shipped > 0 ? Math.round((onTime / shipped) * 100) : 0;
    const avgTat = periodMetrics.dblAvgTat != null ? Math.round(periodMetrics.dblAvgTat) : null;

    // Revenue in period from GP staging
    const revenue = await db.queryOne(`
      SELECT
        COUNT(DISTINCT gp.lInvoiceKey) AS nInvoiceCount,
        SUM(gp.TotalAmountDue) AS dblRevenue
      FROM tblGP_InvoiceStaging gp
      WHERE gp.dtTranDate >= ${periodStart}
        AND gp.bProcessed = 1`, {});

    // Top scope types by repair volume in period
    const scopeTypes = await db.query(`
      SELECT TOP 20
        ISNULL(st.sScopeTypeDesc, 'Unknown') AS type,
        COUNT(*) AS count,
        AVG(CASE
          WHEN r.dtDateOut IS NOT NULL
          THEN CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS float)
        END) AS avgTat,
        COUNT(CASE WHEN r.dtDateOut IS NULL AND r.sRepairClosed <> '1' THEN 1 END) AS inProgress,
        COUNT(CASE WHEN r.dtDateOut IS NOT NULL THEN 1 END) AS completed
      FROM tblRepair r
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
      WHERE r.dtDateIn >= ${periodStart}
      GROUP BY ISNULL(st.sScopeTypeDesc, 'Unknown')
      ORDER BY count DESC`, {});

    res.json({
      period,
      inHouse: summary.nInHouse || 0,
      received: summary.nReceived || 0,
      inRepair: summary.nInRepair || 0,
      scheduledShip: summary.nScheduledShip || 0,
      totalInPeriod: periodMetrics.nTotalInPeriod || 0,
      throughput: shipped,
      avgTat: avgTat,
      onTimePct,
      revenue: revenue.dblRevenue || 0,
      invoiceCount: revenue.nInvoiceCount || 0,
      scopeTypes: scopeTypes.map(r => ({
        type: r.type,
        count: r.count,
        avgTat: r.avgTat != null ? Math.round(r.avgTat) : null,
        inProgress: r.inProgress,
        completed: r.completed
      }))
    });
  } catch (e) { next(e); }
});

module.exports = router;
