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

// GET /Analytics/GetTATMatrix — Business-day TAT aggregated by repair level and time window
// Repair level joins via tblRepairRevenueAndExpenses.lRepairLevelKey (tblRepair has none)
// Business days = calendar days minus weekends and tblHolidays dates
router.get('/Analytics/GetTATMatrix', async (req, res, next) => {
  try {
    // Pull all completed repairs with level info from the revenue/expenses staging table
    // tblRepairRevenueAndExpenses has lRepairKey + lRepairLevelKey + tblRepairLevels.sRepairLevel
    const rows = await db.query(`
      SELECT
        r.lRepairKey,
        r.dtDateIn,
        r.dtDateOut,
        ISNULL(rl.sRepairLevel, 'Unknown') AS sRepairLevel,
        CAST(DATEDIFF(DAY, r.dtDateIn, r.dtDateOut) AS int) AS nCalendarDays
      FROM tblRepair r
        INNER JOIN tblRepairRevenueAndExpenses rre ON rre.lRepairKey = r.lRepairKey
        INNER JOIN tblRepairLevels rl ON rl.lRepairLevelKey = rre.lRepairLevelKey
      WHERE r.dtDateIn IS NOT NULL
        AND r.dtDateOut IS NOT NULL
        AND r.dtDateIn >= DATEADD(MONTH, -7, GETDATE())
      ORDER BY r.dtDateOut DESC`, {});

    // Load holidays once — used to subtract from business day calc
    const holidays = await db.query(`
      SELECT CAST(dtHoliday AS date) AS hDate FROM tblHolidays`, {});
    const holidaySet = new Set(holidays.map(h => {
      const d = new Date(h.hDate);
      return d.toISOString().substring(0, 10);
    }));

    // Count business days between two dates (inclusive start, exclusive end — like TAT)
    function businessDays(dtIn, dtOut) {
      const start = new Date(dtIn);
      const end = new Date(dtOut);
      let count = 0;
      const cur = new Date(start);
      while (cur < end) {
        const dow = cur.getDay(); // 0=Sun, 6=Sat
        const iso = cur.toISOString().substring(0, 10);
        if (dow !== 0 && dow !== 6 && !holidaySet.has(iso)) count++;
        cur.setDate(cur.getDate() + 1);
      }
      return count;
    }

    // Enrich rows with business-day TAT
    const enriched = rows.map(r => ({
      level: r.sRepairLevel,
      bizDays: businessDays(r.dtDateIn, r.dtDateOut),
      dtOut: new Date(r.dtDateOut)
    }));

    // Time window boundaries
    const now = new Date();
    const cmStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const l30Start = new Date(now); l30Start.setDate(l30Start.getDate() - 30);
    const l3mStart = new Date(now); l3mStart.setMonth(l3mStart.getMonth() - 3);
    const l6mStart = new Date(now); l6mStart.setMonth(l6mStart.getMonth() - 6);

    const WINDOWS = [
      { key: 'Current Month', start: cmStart },
      { key: 'Last 30 Days', start: l30Start },
      { key: 'Last 3 Months', start: l3mStart },
      { key: 'Last 6 Months', start: l6mStart }
    ];

    // Get distinct levels in display order
    const LEVEL_ORDER = ['Minor', 'Mid-Level', 'Major', 'VSI'];
    const levels = Array.from(new Set(enriched.map(r => r.level)));
    levels.sort((a, b) => {
      const ai = LEVEL_ORDER.indexOf(a); const bi = LEVEL_ORDER.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1; if (bi === -1) return -1;
      return ai - bi;
    });

    // Aggregate
    const matrix = levels.map(level => {
      const row = { level };
      WINDOWS.forEach(w => {
        const subset = enriched.filter(r => r.level === level && r.dtOut >= w.start);
        if (!subset.length) {
          row[w.key] = { avgTat: null, count: 0 };
        } else {
          const avg = subset.reduce((s, r) => s + r.bizDays, 0) / subset.length;
          row[w.key] = { avgTat: Math.round(avg * 10) / 10, count: subset.length };
        }
      });
      return row;
    });

    // Scope-type breakdown for the secondary table (all 6-month data, top 15 types by volume)
    const scopeRows = await db.query(`
      SELECT TOP 15
        ISNULL(st.sScopeTypeDesc, 'Unknown') AS sType,
        r.lRepairKey,
        r.dtDateIn,
        r.dtDateOut
      FROM tblRepair r
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
      WHERE r.dtDateIn IS NOT NULL
        AND r.dtDateOut IS NOT NULL
        AND r.dtDateIn >= DATEADD(MONTH, -7, GETDATE())
      ORDER BY sType`, {});

    // Group scope rows by type, compute biz days per row
    const scopeMap = {};
    scopeRows.forEach(r => {
      const type = r.sType;
      if (!scopeMap[type]) scopeMap[type] = [];
      scopeMap[type].push({
        bizDays: businessDays(r.dtDateIn, r.dtDateOut),
        dtOut: new Date(r.dtDateOut)
      });
    });

    const scopeTypes = Object.entries(scopeMap).map(([type, items]) => {
      const entry = { type, totalCount: items.length };
      const allAvg = items.reduce((s, r) => s + r.bizDays, 0) / items.length;
      entry.avgTat = Math.round(allAvg * 10) / 10;
      WINDOWS.forEach(w => {
        const subset = items.filter(r => r.dtOut >= w.start);
        if (!subset.length) {
          entry[w.key] = { avgTat: null, count: 0 };
        } else {
          const avg = subset.reduce((s, r) => s + r.bizDays, 0) / subset.length;
          entry[w.key] = { avgTat: Math.round(avg * 10) / 10, count: subset.length };
        }
      });
      return entry;
    }).sort((a, b) => b.totalCount - a.totalCount);

    res.json({
      success: true,
      data: {
        windows: WINDOWS.map(w => w.key),
        matrix,
        scopeTypes
      }
    });
  } catch (e) { next(e); }
});

module.exports = router;
