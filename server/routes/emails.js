// ═══════════════════════════════════════════════════════
//  emails.js — Email log endpoints
// ═══════════════════════════════════════════════════════
// tblEmails: lEmailKey, lEmailTypeKey, lOwnerKey, sFrom, sTo, sCC, sBCC, sSubject, dtCreateDate, dtSentDate
// tblEmailTypes: lEmailTypeKey, sEmailType, bShowOnDash, bAllowModify
// tblEmailAttachments: lEmailAttachmentKey, lEmailKey, sAttachmentFile
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/Email/GetAll — Emails for an owner (repair, client, etc.), TOP 200
router.get('/Email/GetAll', async (req, res, next) => {
  try {
    const ownerKey = parseInt(req.query.lOwnerKey) || 0;
    const emailTypeKey = parseInt(req.query.lEmailTypeKey) || 0;
    const params = { ownerKey, emailTypeKey };
    const rows = await db.query(`
      SELECT TOP 200
        e.lEmailKey, e.lEmailTypeKey, e.lOwnerKey,
        e.sFrom, e.sTo, e.sCC, e.sSubject,
        e.dtCreateDate, e.dtSentDate, e.bIsBodyHTML,
        ISNULL(et.sEmailType, '') AS sEmailType
      FROM tblEmails e
        LEFT JOIN tblEmailTypes et ON et.lEmailTypeKey = e.lEmailTypeKey
      WHERE (@ownerKey = 0 OR e.lOwnerKey = @ownerKey)
        AND (@emailTypeKey = 0 OR e.lEmailTypeKey = @emailTypeKey)
        AND e.bIgnore = 0
      ORDER BY e.dtCreateDate DESC`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Email/GetTypes — All email types
router.get('/Email/GetTypes', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lEmailTypeKey, sEmailType, bShowOnDash, bAllowModify
      FROM tblEmailTypes ORDER BY sEmailType`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Email/GetAttachments — Attachments for an email
router.get('/Email/GetAttachments', async (req, res, next) => {
  try {
    const emailKey = parseInt(req.query.lEmailKey) || 0;
    if (!emailKey) return res.status(400).json({ error: 'lEmailKey required' });
    const rows = await db.query(`
      SELECT lEmailAttachmentKey, lEmailKey, sAttachmentFile
      FROM tblEmailAttachments
      WHERE lEmailKey = @emailKey
      ORDER BY lEmailAttachmentKey`, { emailKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
