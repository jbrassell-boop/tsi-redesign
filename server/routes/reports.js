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
//  EndoCart Quote Approval Rate
//  GET /api/reports/endocart-approval?startDate=2025-01-01&endDate=2026-03-26
//  EndoCarts identified by WO prefix SK (South only — NK doesn't exist in data)
//  Repair → Department → Client join (no direct client FK on tblRepair)
// ───────────────────────────────────────────────────────
router.get('/reports/endocart-approval', async (req, res, next) => {
  try {
    const startDate = req.query.startDate || '2025-01-01';
    const endDate = req.query.endDate || null;

    // Overall approval rate
    const summary = await db.query(`
      SELECT
        COUNT(*)                                                    AS totalQuoted,
        SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1 ELSE 0 END)  AS approved,
        SUM(CASE WHEN r.dtAprRecvd IS NULL THEN 1 ELSE 0 END)      AS pending,
        CAST(SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))             AS approvalPct,
        AVG(CASE WHEN r.dtAprRecvd IS NOT NULL
          THEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) END)       AS avgDaysToApprove
      FROM tblRepair r
      WHERE LEFT(r.sWorkOrderNumber, 2) = 'SK'
        AND r.dtReqSent IS NOT NULL
        AND r.dtReqSent >= @startDate
        AND (@endDate IS NULL OR r.dtReqSent <= @endDate)
    `, { startDate, endDate });

    // By year
    const byYear = await db.query(`
      SELECT
        YEAR(r.dtReqSent)                                           AS quoteYear,
        COUNT(*)                                                    AS totalQuoted,
        SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1 ELSE 0 END)  AS approved,
        SUM(CASE WHEN r.dtAprRecvd IS NULL THEN 1 ELSE 0 END)      AS pending,
        CAST(SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))             AS approvalPct,
        AVG(CASE WHEN r.dtAprRecvd IS NOT NULL
          THEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd) END)       AS avgDaysToApprove
      FROM tblRepair r
      WHERE LEFT(r.sWorkOrderNumber, 2) = 'SK'
        AND r.dtReqSent IS NOT NULL
        AND r.dtReqSent >= @startDate
        AND (@endDate IS NULL OR r.dtReqSent <= @endDate)
      GROUP BY YEAR(r.dtReqSent)
      ORDER BY YEAR(r.dtReqSent) DESC
    `, { startDate, endDate });

    // By client (top 15)
    const byClient = await db.query(`
      SELECT TOP 15
        c.sClientName1                                              AS clientName,
        COUNT(*)                                                    AS totalQuoted,
        SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1 ELSE 0 END)  AS approved,
        SUM(CASE WHEN r.dtAprRecvd IS NULL THEN 1 ELSE 0 END)      AS pending,
        CAST(SUM(CASE WHEN r.dtAprRecvd IS NOT NULL THEN 1.0 ELSE 0 END)
          / NULLIF(COUNT(*), 0) * 100 AS DECIMAL(5,1))             AS approvalPct
      FROM tblRepair r
        LEFT JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
        LEFT JOIN tblClient c ON d.lClientKey = c.lClientKey
      WHERE LEFT(r.sWorkOrderNumber, 2) = 'SK'
        AND r.dtReqSent IS NOT NULL
        AND r.dtReqSent >= @startDate
        AND (@endDate IS NULL OR r.dtReqSent <= @endDate)
      GROUP BY c.sClientName1
      ORDER BY COUNT(*) DESC
    `, { startDate, endDate });

    res.json({ summary: summary[0] || {}, byYear, byClient });
  } catch (e) { next(e); }
});

module.exports = router;
