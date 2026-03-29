// ═══════════════════════════════════════════════════════
//  documents.js — Document management endpoints
// ═══════════════════════════════════════════════════════
// tblDocument: lDocumentKey, lDocumentCategoryTypeKey, lOwnerKey, sDocumentName, sDocumentFileName, dtDocumentDate
// tblDocumentCategoryType: lDocumentCategoryTypeKey, lDocumentCategoryKey, sDocumentCategoryType
// tblDocumentCategory: lDocumentCategoryKey, sDocumentCategory
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/Documents/GetAllDocumentsList — Filtered document list
router.get('/Documents/GetAllDocumentsList', async (req, res, next) => {
  try {
    const ownerKey = parseInt(req.query.lOwnerKey) || 0;
    const catKey = parseInt(req.query.lDocumentCategoryKey) || 0;
    const catTypeKey = parseInt(req.query.lDocumentCategoryTypeKey) || 0;
    const rows = await db.query(`
      SELECT d.lDocumentKey, d.lDocumentCategoryTypeKey, d.lOwnerKey,
        d.sDocumentName, d.sDocumentFileName, d.dtDocumentDate,
        d.lDocTypeCount,
        ISNULL(dct.sDocumentCategoryType, '') AS sDocumentCategoryType,
        ISNULL(dc.sDocumentCategory, '') AS sDocumentCategory,
        dct.lDocumentCategoryKey
      FROM tblDocument d
        LEFT JOIN tblDocumentCategoryType dct
          ON dct.lDocumentCategoryTypeKey = d.lDocumentCategoryTypeKey
        LEFT JOIN tblDocumentCategory dc
          ON dc.lDocumentCategoryKey = dct.lDocumentCategoryKey
      WHERE (@ownerKey = 0 OR d.lOwnerKey = @ownerKey)
        AND (@catKey = 0 OR dct.lDocumentCategoryKey = @catKey)
        AND (@catTypeKey = 0 OR d.lDocumentCategoryTypeKey = @catTypeKey)
      ORDER BY d.dtDocumentDate DESC`, { ownerKey, catKey, catTypeKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/Documents/GetDocumentCategories — All document categories
router.get('/Documents/GetDocumentCategories', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT dc.lDocumentCategoryKey, dc.sDocumentCategory,
        dct.lDocumentCategoryTypeKey, dct.sDocumentCategoryType
      FROM tblDocumentCategory dc
        LEFT JOIN tblDocumentCategoryType dct
          ON dct.lDocumentCategoryKey = dc.lDocumentCategoryKey
      ORDER BY dc.sDocumentCategory, dct.sDocumentCategoryType`);
    res.json(rows);
  } catch (e) { next(e); }
});

// DELETE /api/Documents/DeleteDocuments — Delete a document record
router.delete('/Documents/DeleteDocuments', async (req, res, next) => {
  try {
    const docKey = parseInt(req.query.lDocumentKey) || 0;
    if (!docKey) return res.status(400).json({ error: 'lDocumentKey required' });
    await db.query('DELETE FROM tblDocument WHERE lDocumentKey = @docKey', { docKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /api/Documents/DownloadDocument — Return document filename/path info
// Actual file serving is outside scope; return metadata for client to use
router.get('/Documents/DownloadDocument', async (req, res, next) => {
  try {
    const docKey = parseInt(req.query.key || req.query.lDocumentKey) || 0;
    if (!docKey) return res.status(400).json({ error: 'Document key required' });
    const row = await db.queryOne(`
      SELECT lDocumentKey, sDocumentName, sDocumentFileName, dtDocumentDate,
        lDocumentCategoryTypeKey
      FROM tblDocument WHERE lDocumentKey = @docKey`, { docKey });
    if (!row) return res.status(404).json({ error: 'Document not found' });
    res.json(row);
  } catch (e) { next(e); }
});

module.exports = router;
