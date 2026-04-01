// ═══════════════════════════════════════════════════════
//  development-list.js — Internal development todo tracker
//  tblToDoList + tblToDoStatuses (real WinScopeNet schema)
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// POST /DevelopmentList/GetDevelopmentTodoList — List all dev todo items
router.post('/DevelopmentList/GetDevelopmentTodoList', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT t.ToDoID, t.ToDoTitle, t.ToDoItem, t.ToDoStatusID,
        t.ToDoRequestDate, t.ToDoCompletionDate, t.ToDoSortOrder,
        t.UserKey, t.lRequestedDeliveryYear, t.lRequestedDeliveryQuarter,
        ISNULL(ts.ToDoStatus, '') AS sStatus
      FROM tblToDoList t
        LEFT JOIN tblToDoStatuses ts ON ts.ToDoStatusID = t.ToDoStatusID
      ORDER BY t.ToDoSortOrder, t.ToDoRequestDate DESC`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /DevelopmentList/AddDevelopmentTodoItem — Create todo
router.post('/DevelopmentList/AddDevelopmentTodoItem', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblToDoList (ToDoTitle, ToDoItem, ToDoStatusID,
        ToDoRequestDate, UserKey, lRequestedDeliveryYear, lRequestedDeliveryQuarter)
      VALUES (@title, @item, 1, GETDATE(), @userKey, @year, @quarter);
      SELECT SCOPE_IDENTITY() AS ToDoID`,
      {
        title: b.sTitle || b.ToDoTitle || '',
        item: b.sDescription || b.ToDoItem || '',
        userKey: b.UserKey || 0,
        year: b.lRequestedDeliveryYear || new Date().getFullYear(),
        quarter: b.lRequestedDeliveryQuarter || Math.ceil((new Date().getMonth() + 1) / 3)
      });
    const newKey = result[0] ? result[0].ToDoID : 0;
    res.json({ ToDoID: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /DevelopmentList/DevelopmentToDoUpdatedStatus — Update status
router.post('/DevelopmentList/DevelopmentToDoUpdatedStatus', async (req, res, next) => {
  try {
    const b = req.body || {};
    const id = b.ToDoID || b.lToDoID || b.plToDoID || 0;
    if (!id) return res.status(400).json({ error: 'ToDoID required' });
    await db.query(`
      UPDATE tblToDoList SET
        ToDoStatusID = ISNULL(@statusID, ToDoStatusID),
        ToDoTitle = ISNULL(@title, ToDoTitle),
        ToDoItem = ISNULL(@item, ToDoItem),
        ToDoSortOrder = ISNULL(@sortOrder, ToDoSortOrder),
        ToDoCompletionDate = CASE WHEN @statusID IS NOT NULL AND @statusID = 3
          THEN GETDATE() ELSE ToDoCompletionDate END
      WHERE ToDoID = @id`,
      {
        id,
        statusID: b.ToDoStatusID || b.lStatusKey || null,
        title: b.ToDoTitle || b.sTitle || null,
        item: b.ToDoItem || b.sDescription || null,
        sortOrder: b.ToDoSortOrder || null
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
      SELECT t.*, ISNULL(ts.ToDoStatus, '') AS sStatus
      FROM tblToDoList t
        LEFT JOIN tblToDoStatuses ts ON ts.ToDoStatusID = t.ToDoStatusID
      WHERE t.ToDoID = @id`, { id });
    res.json(row);
  } catch (e) { next(e); }
});

// GET /DevelopmentList/GetAllTodoStatuses — Status dropdown
router.get('/DevelopmentList/GetAllTodoStatuses', async (req, res, next) => {
  try {
    const rows = await db.query('SELECT ToDoStatusID, ToDoStatus FROM tblToDoStatuses ORDER BY ToDoStatusSortOrder');
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
