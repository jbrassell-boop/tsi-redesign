// ═══════════════════════════════════════════════════════
//  floor-meeting.js — North Floor Meeting data endpoints
//  Powers the Morning Briefing tab + PPTX generation
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// ── Shared SQL fragments ──────────────────────────────
// Location filter: 'north' (default) or 'south'
function locationFilter(loc) {
  return loc === 'south' ? "AND r.sWorkOrderNumber LIKE 'SR%'" : "AND r.sWorkOrderNumber LIKE 'NR%'";
}
const SKIP  = `AND NOT EXISTS (
  SELECT 1 FROM tblDepartment d2
    JOIN tblClient c2 ON d2.lClientKey = c2.lClientKey
  WHERE d2.lDepartmentKey = r.lDepartmentKey AND c2.bSkipTracking = 1
)`;

const SCOPE_JOIN = `
  JOIN tblScope s ON r.lScopeKey = s.lScopeKey
  JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
  LEFT JOIN tblScopeTypeCategories stc ON st.lScopeTypeCatKey = stc.lScopeTypeCategoryKey`;

const SCOPE_CASE = `CASE
  WHEN st.sRigidOrFlexible = 'F' AND ISNULL(stc.bLargeDiameter, 0) = 1 THEN 'LD Flex'
  WHEN st.sRigidOrFlexible = 'F' THEN 'SD Flex'
  WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
  WHEN st.sRigidOrFlexible = 'C' THEN 'Camera'
END`;

const PROD_CASE = `CASE
  WHEN st.sRigidOrFlexible = 'F' AND ISNULL(stc.bLargeDiameter, 0) = 1 THEN 'LD'
  WHEN st.sRigidOrFlexible = 'F' THEN 'SD'
  WHEN st.sRigidOrFlexible = 'R' THEN 'Rigid'
  WHEN st.sRigidOrFlexible = 'C' THEN 'Cameras'
END`;

const LEVEL_CASE = `CASE
  WHEN r.lRepairStatusID = 8  THEN 'Minor'
  WHEN r.lRepairStatusID = 11 THEN 'Mid'
  WHEN r.lRepairStatusID = 9  THEN 'Major'
  ELSE COALESCE(
    CASE
      WHEN rl.sRepairLevel = 'Minor'    THEN 'Minor'
      WHEN rl.sRepairLevel = 'Mid-Level' THEN 'Mid'
      WHEN rl.sRepairLevel = 'Major'     THEN 'Major'
    END, '-')
END`;

const IN_HOUSE = "r.lRepairStatusID NOT IN (4, 10, 12, 13, 16, 17, 19, 20, 21, 22)";

// Load weekly goals from config
const configPath = path.join(__dirname, '../../tasks/floor-meeting/config.json');
let weeklyGoals = {};
try { weeklyGoals = JSON.parse(fs.readFileSync(configPath, 'utf8')).weekly_goals || {}; } catch (e) {}

// Helper: get yesterday as YYYY-MM-DD string
function getYesterday(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  if (!dateStr) d.setDate(d.getDate() - 1);
  else d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
}

function getWeekAgo(dateStr) {
  const d = dateStr ? new Date(dateStr + 'T12:00:00') : new Date();
  d.setDate(d.getDate() - 7);
  return d.toISOString().split('T')[0];
}

// ───────────────────────────────────────────────────────
//  GET /api/floor-meeting/flow?date=YYYY-MM-DD
//  Overall Flow — Previous Work Day
// ───────────────────────────────────────────────────────
router.get('/floor-meeting/flow', async (req, res, next) => {
  try {
    const LOC = locationFilter(req.query.location);
    const meetingDate = req.query.date || new Date().toISOString().split('T')[0];
    const yesterday = getYesterday(meetingDate);

    const received = await db.query(`
      SELECT ${SCOPE_CASE} AS category, COUNT(*) AS cnt
      FROM tblRepair r ${SCOPE_JOIN}
      WHERE CAST(r.dtDateIn AS DATE) = @yesterday
        AND st.sRigidOrFlexible IN ('F','R','C') ${LOC} ${SKIP}
      GROUP BY st.sRigidOrFlexible, ISNULL(stc.bLargeDiameter, 0)
    `, { yesterday });

    const closed = await db.query(`
      SELECT ${SCOPE_CASE} AS category, COUNT(*) AS cnt
      FROM tblRepair r ${SCOPE_JOIN}
      WHERE CAST(r.dtDateOut AS DATE) = @yesterday
        AND ISNULL(r.sRepairClosed, 'N') = 'Y'
        AND st.sRigidOrFlexible IN ('F','R','C') ${LOC} ${SKIP}
      GROUP BY st.sRigidOrFlexible, ISNULL(stc.bLargeDiameter, 0)
    `, { yesterday });

    const missed = await db.query(`
      SELECT ${SCOPE_CASE} AS category, COUNT(*) AS cnt
      FROM tblRepair r ${SCOPE_JOIN}
      WHERE CAST(r.dtExpDelDateTSI AS DATE) = @yesterday
        AND ISNULL(r.sRepairClosed, 'N') <> 'Y'
        AND st.sRigidOrFlexible IN ('F','R','C') ${LOC} ${SKIP}
      GROUP BY st.sRigidOrFlexible, ISNULL(stc.bLargeDiameter, 0)
    `, { yesterday });

    const toMap = rows => Object.fromEntries(rows.map(r => [r.category, r.cnt]));
    const recvMap = toMap(received), closeMap = toMap(closed), missMap = toMap(missed);

    const categories = ['LD Flex', 'SD Flex', 'Rigid', 'Camera'];
    const rows = categories.map(cat => {
      const r = recvMap[cat] || 0, c = closeMap[cat] || 0, m = missMap[cat] || 0;
      return { type: cat, received: r, closed: c, missed: m, net: r - c };
    });

    res.json({ date: yesterday, rows });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  GET /api/floor-meeting/commitments?date=YYYY-MM-DD
//  Missed Commitments — Yesterday
// ───────────────────────────────────────────────────────
router.get('/floor-meeting/commitments', async (req, res, next) => {
  try {
    const LOC = locationFilter(req.query.location);
    const meetingDate = req.query.date || new Date().toISOString().split('T')[0];
    const yesterday = getYesterday(meetingDate);

    const defects = await db.queryOne(`
      SELECT COUNT(DISTINCT dt.lRepairKey) AS cnt
      FROM tblRepairDefectTracking dt
        JOIN tblRepair r ON dt.lRepairKey = r.lRepairKey
      WHERE CAST(r.dtDateIn AS DATE) = @yesterday ${LOC} ${SKIP}
    `, { yesterday });

    const loaners = await db.queryOne(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN lt.sDateOut IS NOT NULL AND lt.sDateOut <> '' THEN 1 ELSE 0 END) AS fulfilled
      FROM tblLoanerTran lt
        JOIN tblRepair r ON lt.lRepairKey = r.lRepairKey
      WHERE ISNULL(r.sRepairClosed, 'N') <> 'Y' ${LOC} ${SKIP}
    `, { yesterday });

    const delivery = await db.queryOne(`
      SELECT COUNT(*) AS total,
        SUM(CASE WHEN CAST(r.dtDateOut AS DATE) <= CAST(r.dtExpDelDateTSI AS DATE) THEN 1 ELSE 0 END) AS onTime
      FROM tblRepair r
      WHERE CAST(r.dtDateOut AS DATE) = @yesterday
        AND ISNULL(r.sRepairClosed, 'N') = 'Y'
        AND r.dtExpDelDateTSI IS NOT NULL ${LOC} ${SKIP}
    `, { yesterday });

    const loanerPct = loaners && loaners.total > 0 ? Math.round(100 * loaners.fulfilled / loaners.total) : 0;
    const deliveryPct = delivery && delivery.total > 0 ? Math.round(100 * delivery.onTime / delivery.total) : 100;

    const missedDetails = await db.query(`
      SELECT ${SCOPE_CASE} AS category, st.sScopeTypeDesc AS scopeType,
        s.sSerialNumber AS serialNumber, r.sWorkOrderNumber AS wo
      FROM tblRepair r ${SCOPE_JOIN}
      WHERE CAST(r.dtExpDelDateTSI AS DATE) = @yesterday
        AND ISNULL(r.sRepairClosed, 'N') <> 'Y'
        AND st.sRigidOrFlexible IN ('F','R','C') ${LOC} ${SKIP}
    `, { yesterday });

    res.json({
      date: yesterday,
      kpis: {
        defects: defects ? defects.cnt : 0,
        loanerPct,
        deliveryPct
      },
      missedDetails
    });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  GET /api/floor-meeting/production?date=YYYY-MM-DD
//  In-House Production Plan
// ───────────────────────────────────────────────────────
router.get('/floor-meeting/production', async (req, res, next) => {
  try {
    const LOC = locationFilter(req.query.location);
    const meetingDate = req.query.date || new Date().toISOString().split('T')[0];
    const yesterday = getYesterday(meetingDate);
    const weekAgo = getWeekAgo(meetingDate);

    const openData = await db.query(`
      SELECT ${PROD_CASE} AS scopeType, ${LEVEL_CASE} AS repairLevel,
        COUNT(*) AS woOpen,
        SUM(CASE WHEN ISNULL(r.lTechnicianKey, 0) > 0 THEN 1 ELSE 0 END) AS onBench
      FROM tblRepair r ${SCOPE_JOIN}
        LEFT JOIN tblRepairRevenueAndExpenses rre ON r.lRepairKey = rre.lRepairKey
        LEFT JOIN tblRepairLevels rl ON rre.lRepairLevelKey = rl.lRepairLevelKey
      WHERE ISNULL(r.sRepairClosed, 'N') <> 'Y'
        AND st.sRigidOrFlexible IN ('F','R','C')
        AND ${IN_HOUSE} ${LOC} ${SKIP}
      GROUP BY st.sRigidOrFlexible, ISNULL(stc.bLargeDiameter, 0), ${LEVEL_CASE}
    `);

    const weeklyOut = await db.query(`
      SELECT ${PROD_CASE} AS scopeType, ${LEVEL_CASE} AS repairLevel,
        COUNT(*) AS weeklyOut
      FROM tblRepair r ${SCOPE_JOIN}
        LEFT JOIN tblRepairRevenueAndExpenses rre ON r.lRepairKey = rre.lRepairKey
        LEFT JOIN tblRepairLevels rl ON rre.lRepairLevelKey = rl.lRepairLevelKey
      WHERE CAST(r.dtDateOut AS DATE) BETWEEN @weekAgo AND @yesterday
        AND ISNULL(r.sRepairClosed, 'N') = 'Y'
        AND st.sRigidOrFlexible IN ('F','R','C') ${LOC} ${SKIP}
      GROUP BY st.sRigidOrFlexible, ISNULL(stc.bLargeDiameter, 0), ${LEVEL_CASE}
    `, { weekAgo, yesterday });

    const openMap = {};
    openData.forEach(r => { openMap[r.scopeType + '|' + r.repairLevel] = r; });
    const weekMap = {};
    weeklyOut.forEach(r => { weekMap[r.scopeType + '|' + r.repairLevel] = r.weeklyOut; });

    const rowDefs = [
      { scopeType: 'LD', level: 'Minor', goalKey: 'LD_Minor' },
      { scopeType: 'LD', level: 'Mid',   goalKey: 'LD_Mid' },
      { scopeType: 'LD', level: 'Major', goalKey: 'LD_Major' },
      { scopeType: 'SD', level: 'Minor', goalKey: 'SD_Minor' },
      { scopeType: 'SD', level: 'Mid',   goalKey: 'SD_Mid' },
      { scopeType: 'SD', level: 'Major', goalKey: 'SD_Major' },
      { scopeType: 'Rigid',   level: '-', goalKey: 'Rigid' },
      { scopeType: 'Cameras', level: '-', goalKey: 'Cameras' },
    ];

    const rows = rowDefs.map(def => {
      const key = def.scopeType + '|' + def.level;
      const d = openMap[key] || {};
      const woOpen = d.woOpen || 0;
      const onBench = d.onBench || 0;
      const wkOut = weekMap[key] || 0;
      const goal = Math.round(weeklyGoals[def.goalKey] || 0);
      return {
        scopeType: def.scopeType, level: def.level,
        woOpen, onBench, weeklyOut: wkOut, goal, gap: goal - woOpen
      };
    });

    res.json({ rows, weeklyGoals });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  GET /api/floor-meeting/instruments
//  Instruments Plan
// ───────────────────────────────────────────────────────
router.get('/floor-meeting/instruments', async (req, res, next) => {
  try {
    const LOC = locationFilter(req.query.location);
    const data = await db.query(`
      SELECT
        CASE WHEN r.lRepairStatusID = 4 THEN 'Outsourced' ELSE 'In House' END AS channel,
        COUNT(*) AS woOpen,
        SUM(CASE WHEN CAST(r.dtExpDelDateTSI AS DATE) <= DATEADD(day, 1, CAST(GETDATE() AS DATE))
                 THEN 1 ELSE 0 END) AS expectedSoon,
        SUM(CASE WHEN r.lRepairStatusID = 6 THEN 1 ELSE 0 END) AS waitingQuotes
      FROM tblRepair r
        JOIN tblScope s ON r.lScopeKey = s.lScopeKey
        JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
      WHERE ISNULL(r.sRepairClosed, 'N') <> 'Y'
        AND (st.sRigidOrFlexible IN ('I','') OR st.sRigidOrFlexible IS NULL)
        ${LOC} ${SKIP}
      GROUP BY CASE WHEN r.lRepairStatusID = 4 THEN 'Outsourced' ELSE 'In House' END
    `);

    const map = {};
    data.forEach(r => { map[r.channel] = r; });
    const rows = ['In House', 'Outsourced', 'Van Service'].map(ch => {
      const d = map[ch] || {};
      return { channel: ch, woOpen: d.woOpen || 0, expectedSoon: d.expectedSoon || 0, waitingQuotes: d.waitingQuotes || 0 };
    });

    res.json({ rows });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  GET /api/floor-meeting/delays
//  Delay Tracking — More Info + Outsourced + More Time
// ───────────────────────────────────────────────────────
router.get('/floor-meeting/delays', async (req, res, next) => {
  try {
    const LOC = locationFilter(req.query.location);
    const rows = await db.query(`
      SELECT
        CASE
          WHEN r.lRepairStatusID = 19 THEN 'More info'
          WHEN r.lRepairStatusID = 4  THEN 'Outsourced'
          WHEN r.lRepairStatusID = 5  THEN 'More time'
        END AS category,
        c.sClientName1 AS clientName,
        d.sShipState AS shipState,
        r.sWorkOrderNumber AS wo,
        st.sScopeTypeDesc AS model,
        s.sSerialNumber AS sn,
        DATEDIFF(day, r.dtDateIn, GETDATE()) AS daysOpen
      FROM tblRepair r
        JOIN tblScope s ON r.lScopeKey = s.lScopeKey
        JOIN tblScopeType st ON s.lScopeTypeKey = st.lScopeTypeKey
        JOIN tblDepartment d ON r.lDepartmentKey = d.lDepartmentKey
        JOIN tblClient c ON d.lClientKey = c.lClientKey
      WHERE ISNULL(r.sRepairClosed, 'N') <> 'Y'
        AND r.lRepairStatusID IN (19, 4, 5)
        AND ISNULL(c.bSkipTracking, 0) = 0
        ${LOC}
      ORDER BY
        CASE r.lRepairStatusID WHEN 19 THEN 1 WHEN 5 THEN 2 WHEN 4 THEN 3 END,
        r.dtDateIn ASC
    `);

    // Fix duplicate state in customer name
    const cleaned = rows.map(r => {
      let customer = r.clientName || '';
      const state = r.shipState || '';
      if (state && !customer.trimEnd().endsWith('- ' + state)) {
        customer += ' - ' + state;
      }
      return { ...r, customer };
    });

    res.json({ rows: cleaned });
  } catch (e) { next(e); }
});

// ───────────────────────────────────────────────────────
//  POST /api/floor-meeting/generate-pptx
//  Generate PPTX via Python script
// ───────────────────────────────────────────────────────
router.post('/floor-meeting/generate-pptx', async (req, res, next) => {
  try {
    const date = req.body.date || new Date().toISOString().split('T')[0];
    const location = req.body.location || 'north';
    const scriptPath = path.join(__dirname, '../../tasks/floor-meeting/generate.py');

    const cmd = `python "${scriptPath}" --date ${date} --location ${location}`;
    const output = execSync(cmd, { encoding: 'utf8', timeout: 30000 });

    res.json({ success: true, output: output.trim(), date, location });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message, stderr: e.stderr || '' });
  }
});

module.exports = router;
