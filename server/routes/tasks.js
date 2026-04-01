// ═══════════════════════════════════════════════════════
//  tasks.js — Task management (real WinScopeNet schema)
//  Tables: tblTasks, tblTaskStatusHistory, tblTaskStatuses,
//          tblTaskPriorities, tblTaskTypes, tblTaskLoaners
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── DashBoardTask CRUD ──────────────────────────────────

// POST /DashBoardTask/GetAllTaskList — List tasks (filtered)
router.post('/DashBoardTask/GetAllTaskList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const svcKey = parseInt(body.plServiceLocationKey) || 0;
    const rows = await db.query(`
      SELECT t.lTaskKey, t.lDepartmentKey, t.sTaskTitle, t.sCustomerMessage,
        t.dtTaskDate, t.lTaskPriorityKey, t.sTaskNotes,
        t.bFromPortal, t.lTaskTypeKey, t.lRepairKey,
        t.sWorkOrderNumber, t.sShipTrackingNumber,
        ISNULL(tp.sTaskPriority, '') AS sTaskPriority,
        ISNULL(tt.sTaskType, '') AS sTaskType,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName1
      FROM tblTasks t
        LEFT JOIN tblTaskPriorities tp ON tp.lTaskPriorityKey = t.lTaskPriorityKey
        LEFT JOIN tblTaskTypes tt ON tt.lTaskTypeKey = t.lTaskTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = t.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      ORDER BY t.dtTaskDate DESC`, {});
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /DashBoardTask/AddTask — Create task
router.post('/DashBoardTask/AddTask', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblTasks (lDepartmentKey, sTaskTitle, sCustomerMessage,
        dtTaskDate, lTaskPriorityKey, sTaskNotes, bFromPortal,
        lTaskTypeKey, lRepairKey, sWorkOrderNumber, sShipTrackingNumber)
      VALUES (@deptKey, @title, @message,
        ISNULL(@taskDate, GETDATE()), @priorityKey, @notes, @fromPortal,
        @typeKey, @repairKey, @wo, @tracking);
      SELECT SCOPE_IDENTITY() AS lTaskKey`,
      {
        deptKey: b.lDepartmentKey || 0,
        title: b.sTaskTitle || b.sTaskDescription || '',
        message: b.sCustomerMessage || '',
        taskDate: b.dtTaskDate || b.dtDueDate || null,
        priorityKey: b.lTaskPriorityKey || 2,
        notes: b.sTaskNotes || '',
        fromPortal: b.bFromPortal || false,
        typeKey: b.lTaskTypeKey || 1,
        repairKey: b.lRepairKey || null,
        wo: b.sWorkOrderNumber || '',
        tracking: b.sShipTrackingNumber || ''
      });
    const newKey = result[0] ? result[0].lTaskKey : 0;
    res.json({ lTaskKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /DashBoardTask/UpdateTasks — Update task
router.post('/DashBoardTask/UpdateTasks', async (req, res, next) => {
  try {
    const b = req.body || {};
    const taskKey = b.lTaskKey || b.plTaskKey || 0;
    if (!taskKey) return res.status(400).json({ error: 'lTaskKey required' });
    await db.query(`
      UPDATE tblTasks SET
        sTaskTitle = ISNULL(@title, sTaskTitle),
        sCustomerMessage = ISNULL(@message, sCustomerMessage),
        dtTaskDate = ISNULL(@taskDate, dtTaskDate),
        lTaskPriorityKey = ISNULL(@priorityKey, lTaskPriorityKey),
        sTaskNotes = ISNULL(@notes, sTaskNotes),
        lTaskTypeKey = ISNULL(@typeKey, lTaskTypeKey),
        sWorkOrderNumber = ISNULL(@wo, sWorkOrderNumber),
        sShipTrackingNumber = ISNULL(@tracking, sShipTrackingNumber)
      WHERE lTaskKey = @taskKey`,
      {
        taskKey,
        title: b.sTaskTitle || b.sTaskDescription || null,
        message: b.sCustomerMessage || null,
        taskDate: b.dtTaskDate || b.dtDueDate || null,
        priorityKey: b.lTaskPriorityKey || null,
        notes: b.sTaskNotes || null,
        typeKey: b.lTaskTypeKey || null,
        wo: b.sWorkOrderNumber || null,
        tracking: b.sShipTrackingNumber || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /DashBoardTask/DeleteTask — Delete task
router.delete('/DashBoardTask/DeleteTask', async (req, res, next) => {
  try {
    const taskKey = parseInt(req.query.plTaskKey) || 0;
    if (!taskKey) return res.status(400).json({ error: 'plTaskKey required' });
    await db.query('DELETE FROM tblTaskStatusHistory WHERE lTaskKey = @taskKey', { taskKey });
    await db.query('DELETE FROM tblTasks WHERE lTaskKey = @taskKey', { taskKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /DashBoardTask/GetAllTaskStatus — Task status dropdown
router.get('/DashBoardTask/GetAllTaskStatus', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TaskStatusKey, TaskStatus FROM tblTaskStatuses ORDER BY TaskStatusKey`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /DashBoardTask/GetAllTaskPriorities — Task priority dropdown
router.get('/DashBoardTask/GetAllTaskPriorities', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lTaskPriorityKey, sTaskPriority FROM tblTaskPriorities ORDER BY lTaskPriorityKey`);
    res.json(rows);
  } catch (e) { next(e); }
});

// ── DashBoardTaskLoaner CRUD ────────────────────────────

// GET /DashBoardTaskLoaner/GetAllTaskLoanerList — List task loaners
// tblTaskLoaners: lTaskScopeTypeKey PK, lTaskKey, lScopeTypeKey, lQuantity
// Join tblTasks for work order number and department; tblDepartment + tblClient for names
router.get('/DashBoardTaskLoaner/GetAllTaskLoanerList', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        tl.lTaskScopeTypeKey AS lTaskLoanerKey,
        tl.lTaskKey,
        tl.lScopeTypeKey,
        tl.lQuantity,
        t.lDepartmentKey,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        ISNULL(st.sRigidOrFlexible, '') AS sRigidOrFlexible,
        ISNULL(m.sManufacturer, '') AS sManufacturer,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(c.sClientName1, '') AS sClientName
      FROM tblTaskLoaners tl
        LEFT JOIN tblTasks t ON t.lTaskKey = tl.lTaskKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = tl.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = t.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      ORDER BY tl.lTaskScopeTypeKey DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /DashBoardTaskLoaner/AddTaskLoaner — Add task loaner
router.post('/DashBoardTaskLoaner/AddTaskLoaner', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblTaskLoaners (lTaskKey, lScopeTypeKey, lQuantity)
      VALUES (@taskKey, @scopeTypeKey, @qty);
      SELECT SCOPE_IDENTITY() AS lTaskLoanerKey`,
      {
        taskKey: b.lTaskKey || 0,
        scopeTypeKey: b.lScopeTypeKey || 0,
        qty: b.lQuantity || 1
      });
    const newKey = result[0] ? result[0].lTaskLoanerKey : 0;
    res.json({ lTaskLoanerKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /DashBoardTaskLoaner/UpdateTaskLoaner — Update task loaner
router.post('/DashBoardTaskLoaner/UpdateTaskLoaner', async (req, res, next) => {
  try {
    const b = req.body || {};
    const key = b.lTaskLoanerKey || 0;
    if (!key) return res.status(400).json({ error: 'lTaskLoanerKey required' });
    await db.query(`
      UPDATE tblTaskLoaners SET
        lScopeTypeKey = ISNULL(@scopeTypeKey, lScopeTypeKey),
        lQuantity = ISNULL(@qty, lQuantity)
      WHERE lTaskScopeTypeKey = @key`,
      {
        key,
        scopeTypeKey: b.lScopeTypeKey || null,
        qty: b.lQuantity || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /DashBoardTaskLoaner/DeleteTaskLoaner — Delete task loaner
router.delete('/DashBoardTaskLoaner/DeleteTaskLoaner', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plTaskLoanerKey) || 0;
    if (!key) return res.status(400).json({ error: 'plTaskLoanerKey required' });
    await db.query('DELETE FROM tblTaskLoaners WHERE lTaskScopeTypeKey = @key', { key });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// ── Task Status History ─────────────────────────────────

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
