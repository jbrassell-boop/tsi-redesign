// ═══════════════════════════════════════════════════════
//  reports.js — Custom reporting endpoints
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ───────────────────────────────────────────────────────
//  FFS Quote Approval Time by Scope Type
//  GET /api/reports/ffs-approval-time?startDate=2025-01-01&endDate=2026-03-26
// ───────────────────────────────────────────────────────
router.get('/reports/ffs-approval-time', async (req, res, next) => {
  try {
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || null;

    const rows = await db.query(`
      SELECT
        CASE s.sRigidOrFlexible
          WHEN 'R' THEN 'Rigid'
          WHEN 'F' THEN 'Flexible'
          WHEN 'C' THEN 'Camera'
          ELSE 'Unknown'
        END                                                AS scopeType,
        COUNT(*)                                           AS totalQuotes,
        AVG(DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd))     AS avgDaysToApprove,
        MIN(DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd))     AS minDays,
        MAX(DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd))     AS maxDays,
        -- Percentile buckets
        SUM(CASE WHEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) <= 3  THEN 1 ELSE 0 END) AS within3Days,
        SUM(CASE WHEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) <= 7  THEN 1 ELSE 0 END) AS within7Days,
        SUM(CASE WHEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) <= 14 THEN 1 ELSE 0 END) AS within14Days,
        SUM(CASE WHEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) > 14  THEN 1 ELSE 0 END) AS over14Days
      FROM tblRepair r
        LEFT JOIN tblScope s ON r.lScopeKey = s.lScopeKey
      WHERE r.lContractKey = 0
        AND r.dtReqSent IS NOT NULL
        AND r.dtAprRecvd IS NOT NULL
        AND r.dtReqSent >= @startDate
        AND (@endDate IS NULL OR r.dtReqSent <= @endDate)
      GROUP BY s.sRigidOrFlexible
      ORDER BY AVG(DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd)) DESC
    `, { startDate, endDate });

    // Also get the still-pending quotes (sent but not yet approved)
    const pending = await db.query(`
      SELECT
        CASE s.sRigidOrFlexible
          WHEN 'R' THEN 'Rigid'
          WHEN 'F' THEN 'Flexible'
          WHEN 'C' THEN 'Camera'
          ELSE 'Unknown'
        END                                                AS scopeType,
        COUNT(*)                                           AS pendingCount,
        AVG(DATEDIFF(DAY, r.dtReqSent, GETDATE()))        AS avgDaysWaiting,
        MIN(DATEDIFF(DAY, r.dtReqSent, GETDATE()))        AS minDaysWaiting,
        MAX(DATEDIFF(DAY, r.dtReqSent, GETDATE()))        AS maxDaysWaiting
      FROM tblRepair r
        LEFT JOIN tblScope s ON r.lScopeKey = s.lScopeKey
      WHERE r.lContractKey = 0
        AND r.dtReqSent IS NOT NULL
        AND r.dtAprRecvd IS NULL
        AND r.dtReqSent >= @startDate
        AND (@endDate IS NULL OR r.dtReqSent <= @endDate)
      GROUP BY s.sRigidOrFlexible
      ORDER BY AVG(DATEDIFF(DAY, r.dtReqSent, GETDATE())) DESC
    `, { startDate, endDate });

    res.json({ approved: rows, pending });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  EndoCart Quote Conversion Rate
//  GET /api/reports/endocart-approval?startDate=2025-01-01&endDate=2026-03-26
//  Uses vwQuoteOutcome view for clean Approved/Denied/Expired/Pending status
//  EndoCarts identified by WO prefix SK (South — NK doesn't exist in data)
// ───────────────────────────────────────────────────────
router.get('/reports/endocart-approval', async (req, res, next) => {
  try {
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || null;

    // Overall conversion rate
    const summary = await db.query(`
      SELECT
        COUNT(*)                                                            AS totalQuotes,
        SUM(CASE WHEN sQuoteOutcome = 'Approved' THEN 1 ELSE 0 END)        AS approved,
        SUM(CASE WHEN sQuoteOutcome = 'Denied'   THEN 1 ELSE 0 END)        AS denied,
        SUM(CASE WHEN sQuoteOutcome = 'Expired'  THEN 1 ELSE 0 END)        AS expired,
        SUM(CASE WHEN sQuoteOutcome = 'Pending'  THEN 1 ELSE 0 END)        AS pending,
        CAST(SUM(CASE WHEN sQuoteOutcome = 'Approved' THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))                     AS conversionPct,
        AVG(CASE WHEN sQuoteOutcome = 'Approved' THEN nDaysToApprove END)   AS avgDaysToApprove
      FROM vwQuoteOutcome
      WHERE LEFT(sWorkOrderNumber, 2) = 'SK'
        AND dtDateIn >= @startDate
        AND (@endDate IS NULL OR dtDateIn <= @endDate)
    `, { startDate, endDate });

    // By year
    const byYear = await db.query(`
      SELECT
        YEAR(dtDateIn)                                                      AS year,
        COUNT(*)                                                            AS totalQuotes,
        SUM(CASE WHEN sQuoteOutcome = 'Approved' THEN 1 ELSE 0 END)        AS approved,
        SUM(CASE WHEN sQuoteOutcome = 'Denied'   THEN 1 ELSE 0 END)        AS denied,
        SUM(CASE WHEN sQuoteOutcome = 'Expired'  THEN 1 ELSE 0 END)        AS expired,
        SUM(CASE WHEN sQuoteOutcome = 'Pending'  THEN 1 ELSE 0 END)        AS pending,
        CAST(SUM(CASE WHEN sQuoteOutcome = 'Approved' THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))                     AS conversionPct,
        AVG(CASE WHEN sQuoteOutcome = 'Approved' THEN nDaysToApprove END)   AS avgDaysToApprove
      FROM vwQuoteOutcome
      WHERE LEFT(sWorkOrderNumber, 2) = 'SK'
        AND dtDateIn >= @startDate
        AND (@endDate IS NULL OR dtDateIn <= @endDate)
      GROUP BY YEAR(dtDateIn)
      ORDER BY YEAR(dtDateIn) DESC
    `, { startDate, endDate });

    // By client (top 15)
    const byClient = await db.query(`
      SELECT TOP 15
        c.sClientName1                                                      AS clientName,
        COUNT(*)                                                            AS totalQuotes,
        SUM(CASE WHEN v.sQuoteOutcome = 'Approved' THEN 1 ELSE 0 END)      AS approved,
        SUM(CASE WHEN v.sQuoteOutcome = 'Denied'   THEN 1 ELSE 0 END)      AS denied,
        SUM(CASE WHEN v.sQuoteOutcome = 'Expired'  THEN 1 ELSE 0 END)      AS expired,
        CAST(SUM(CASE WHEN v.sQuoteOutcome = 'Approved' THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))                     AS conversionPct
      FROM vwQuoteOutcome v
        LEFT JOIN tblDepartment d ON v.lDepartmentKey = d.lDepartmentKey
        LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
      WHERE LEFT(v.sWorkOrderNumber, 2) = 'SK'
        AND v.dtDateIn >= @startDate
        AND (@endDate IS NULL OR v.dtDateIn <= @endDate)
      GROUP BY c.sClientName1
      ORDER BY COUNT(*) DESC
    `, { startDate, endDate });

    res.json({ summary: summary[0] || {}, byYear, byClient });
  } catch (e) { next(e); }
});

module.exports = router;
