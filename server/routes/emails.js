// ═══════════════════════════════════════════════════════
//  emails.js — Email log + queue endpoints
// ═══════════════════════════════════════════════════════
// tblEmails: lEmailKey, lEmailTypeKey, lOwnerKey, sFrom, sTo, sCC, sBCC, sSubject, dtCreateDate, dtSentDate
// tblEmailTypes: lEmailTypeKey, sEmailType, bShowOnDash, bAllowModify
// tblEmailAttachments: lEmailAttachmentKey, lEmailKey, sAttachmentFile
//
// Queue uses tblEmails directly: sFormType stored in sCC field as "FORM:<type>",
// pending emails have dtSentDate = NULL, sent = dtSentDate set.
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

// ── Email Queue (uses tblEmails with lEmailTypeKey=0 for queued/manual) ──

// POST /api/emails/queue — Queue an email from the repairs page
// Body: { lRepairKey, sFormType, sRecipientEmail, sSubject, sBody, sSenderName }
router.post('/emails/queue', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKey = parseInt(b.lRepairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'lRepairKey required' });
    if (!b.sRecipientEmail) return res.status(400).json({ success: false, error: 'sRecipientEmail required' });

    // Store form type in sCC as "FORM:<type>" for easy filtering
    const sCC = b.sFormType ? `FORM:${b.sFormType}` : '';

    const result = await db.query(`
      INSERT INTO tblEmails (
        lEmailTypeKey, lOwnerKey, sFrom, sTo, sCC,
        sSubject, sBody, dtCreateDate, bIgnore, bIsBodyHTML
      ) VALUES (
        0, @repairKey, @senderName, @recipientEmail, @sCC,
        @subject, @body, GETDATE(), 0, 1
      );
      SELECT SCOPE_IDENTITY() AS lEmailKey`,
      {
        repairKey,
        senderName: b.sSenderName || 'TSI',
        recipientEmail: b.sRecipientEmail,
        sCC,
        subject: b.sSubject || '',
        body: b.sBody || ''
      });

    const emailKey = result[0] ? result[0].lEmailKey : 0;
    res.json({ success: true, emailKey });
  } catch (e) { next(e); }
});

// GET /api/emails/queue — All queued (pending) emails for dashboard_emails.html
router.get('/emails/queue', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT TOP 500
        e.lEmailKey, e.lOwnerKey AS lRepairKey,
        e.sFrom AS sSenderName, e.sTo AS sRecipientEmail,
        e.sCC, e.sSubject, e.sBody, e.bIsBodyHTML,
        e.dtCreateDate, e.dtSentDate,
        CASE WHEN e.dtSentDate IS NULL THEN 'Pending' ELSE 'Sent' END AS sStatus,
        CASE WHEN e.sCC LIKE 'FORM:%' THEN SUBSTRING(e.sCC, 6, 50) ELSE '' END AS sFormType,
        ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber
      FROM tblEmails e
        LEFT JOIN tblRepair r ON r.lRepairKey = e.lOwnerKey
      WHERE e.lEmailTypeKey = 0
        AND e.bIgnore = 0
      ORDER BY e.dtCreateDate DESC`);
    res.json({ success: true, data: rows });
  } catch (e) { next(e); }
});

// POST /api/emails/queue/:key/send — Mark email as sent
router.post('/emails/queue/:key/send', async (req, res, next) => {
  try {
    const emailKey = parseInt(req.params.key) || 0;
    if (!emailKey) return res.status(400).json({ success: false, error: 'Email key required' });
    await db.query(`
      UPDATE tblEmails
      SET dtSentDate = GETDATE()
      WHERE lEmailKey = @emailKey
        AND lEmailTypeKey = 0`,
      { emailKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
