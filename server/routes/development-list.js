// ═══════════════════════════════════════════════════════
//  development-list.js — Internal development todo tracker
//  tblDevelopmentToDo + lookup tables
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /DevelopmentList/GetDevelopmentTodoList — List all dev todo items
router.post('/DevelopmentList/GetDevelopmentTodoList', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT t.lToDoID, t.sTitle, t.sDescription, t.lPriority, t.lStatusKey,
        t.sAssignedTo, t.dtDueDate, t.dtCreateDate, t.dtLastUpdate,
        ISNULL(ts.sTodoStatus, '') AS sStatus,
        ISNULL(tp.sTodoPriority, '') AS sPriority
      FROM tblDevelopmentToDo t
        LEFT JOIN tblTodoStatuses ts ON ts.lTodoStatusKey = t.lStatusKey
        LEFT JOIN tblTodoPriorities tp ON tp.lTodoPriorityKey = t.lPriority
      ORDER BY t.lPriority DESC, t.dtDueDate`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /DevelopmentList/AddDevelopmentTodoItem — Create todo
router.post('/DevelopmentList/AddDevelopmentTodoItem', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblDevelopmentToDo (sTitle, sDescription, lPriority, lStatusKey,
        sAssignedTo, dtDueDate, dtCreateDate)
      VALUES (@title, @desc, @priority, 1, @assigned, @dueDate, GETDATE());
      SELECT SCOPE_IDENTITY() AS lToDoID`,
      {
        title: b.sTitle || '',
        desc: b.sDescription || '',
        priority: b.lPriority || 2,
        assigned: b.sAssignedTo || '',
        dueDate: b.dtDueDate || null
      });
    const newKey = result[0] ? result[0].lToDoID : 0;
    res.json({ lToDoID: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /DevelopmentList/DevelopmentToDoUpdatedStatus — Update status
router.post('/DevelopmentList/DevelopmentToDoUpdatedStatus', async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.lToDoID || b.plToDoID || 0;
    if (!id) return res.status(400).json({ error: 'lToDoID required' });
    await db.query(`
      UPDATE tblDevelopmentToDo SET
        lStatusKey = ISNULL(@statusKey, lStatusKey),
        sTitle = ISNULL(@title, sTitle),
        sDescription = ISNULL(@desc, sDescription),
        lPriority = ISNULL(@priority, lPriority),
        sAssignedTo = ISNULL(@assigned, sAssignedTo),
        dtDueDate = ISNULL(@dueDate, dtDueDate),
        dtLastUpdate = GETDATE()
      WHERE lToDoID = @id`,
      {
        id,
        statusKey: b.lStatusKey || null,
        title: b.sTitle || null,
        desc: b.sDescription || null,
        priority: b.lPriority || null,
        assigned: b.sAssignedTo || null,
        dueDate: b.dtDueDate || null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /DevelopmentList/GetAllTodoDetails — Single item detail
router.get('/DevelopmentList/GetAllTodoDetails', async (req, res, next) => {
  try {
    const id = parseInt(req.query.plToDoID) || 0;
    if (!id) return res.status(400).json({ error: 'plToDoID required' });
    const row = await db.queryOne(`
      SELECT t.*, ISNULL(ts.sTodoStatus, '') AS sStatus,
        ISNULL(tp.sTodoPriority, '') AS sPriority
      FROM tblDevelopmentToDo t
        LEFT JOIN tblTodoStatuses ts ON ts.lTodoStatusKey = t.lStatusKey
        LEFT JOIN tblTodoPriorities tp ON tp.lTodoPriorityKey = t.lPriority
      WHERE t.lToDoID = @id`, { id });
    res.json(row);
  } catch (e) { next(e); }
});

// GET /DevelopmentList/GetAllTodoStatuses — Status dropdown
router.get('/DevelopmentList/GetAllTodoStatuses', async (req, res, next) => {
  try {
    const rows = await db.query('SELECT lTodoStatusKey, sTodoStatus FROM tblTodoStatuses ORDER BY lTodoStatusKey');
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /DevelopmentList/GetAllTodoPriorities — Priority dropdown
router.get('/DevelopmentList/GetAllTodoPriorities', async (req, res, next) => {
  try {
    const rows = await db.query('SELECT lTodoPriorityKey, sTodoPriority FROM tblTodoPriorities ORDER BY lTodoPriorityKey');
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
