// ═══════════════════════════════════════════════════════
//  tasks.js — Task management + status history
//  Tables: tblTasks, tblTaskStatusHistory, tblTaskStatuses,
//          tblTaskPriorities, tblTaskTypes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /Tasks/GetStatusHistory/:taskKey — Status change history for a task
router.get('/Tasks/GetStatusHistory/:taskKey', async (req, res, next) => {
  try {
    const taskKey = parseInt(req.params.taskKey) || 0;
    if (!taskKey) return res.status(400).json({ error: 'Missing task key' });

    const rows = await db.query(`
      SELECT
        h.lTaskStatusHistoryKey,
        h.lTaskKey,
        h.dtTaskStatusDate,
        h.lTaskStatusKey,
        h.lUserKey,
        ISNULL(ts.TaskStatus, '') AS sTaskStatus,
        ISNULL(u.sUserFullName, ISNULL(u.sUserName, '')) AS sUserName
      FROM tblTaskStatusHistory h
        LEFT JOIN tblTaskStatuses ts ON ts.TaskStatusKey = h.lTaskStatusKey
        LEFT JOIN tblUsers u ON u.lUserKey = h.lUserKey
      WHERE h.lTaskKey = @taskKey
      ORDER BY h.dtTaskStatusDate`, { taskKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
