// ═══════════════════════════════════════════════════════
//  financials.js — Invoice, payment, and client hold endpoints
// ═══════════════════════════════════════════════════════
// NOTE: tblInvoice is always empty. tblGP_InvoiceStaging holds all revenue.
// tblClient has no bOnHold — uses sBadDebtRisk ('Y'=bad debt risk, treat as on-hold)
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared invoice SELECT ──
const INVOICE_SELECT = `
  SELECT gp.GPInvoiceStagingID, gp.lInvoiceKey, gp.sTranNumber,
    gp.dtTranDate, gp.TotalAmountDue, gp.dblTranAmount,
    gp.dblShippingAmount, gp.dblTaxAmount, gp.docDescription,
    gp.sPurchaseOrder, gp.dtDueDate, gp.bProcessed,
    gp.dtPostedDate, gp.sBatchNumber, gp.lDatabaseKey,
    gp.GLAccount, gp.PaymentTerms,
    inv.lRepairKey, inv.lClientKey, inv.lDepartmentKey, inv.lSalesRepKey, inv.lContractKey,
    ISNULL(c.sClientName1, '') AS sClientName1,
    ISNULL(d.sDepartmentName, '') AS sDepartmentName,
    ISNULL(r.sWorkOrderNumber, '') AS sWorkOrderNumber,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName
  FROM tblGP_InvoiceStaging gp
    LEFT JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
    LEFT JOIN tblRepair r ON r.lRepairKey = inv.lRepairKey
    LEFT JOIN tblDepartment d ON d.lDepartmentKey = inv.lDepartmentKey
    LEFT JOIN tblClient c ON c.lClientKey = inv.lClientKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = inv.lSalesRepKey
`;

// POST /api/Financials/GetOutstandingInvoicesList — Unprocessed or outstanding invoices
router.post('/Financials/GetOutstandingInvoicesList', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(
      `${INVOICE_SELECT} WHERE gp.bProcessed = 0 OR gp.TotalAmountDue > 0`,
      'gp.dtTranDate DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// GET /api/Financials/GetAllGLAccounts — Distinct GL accounts from invoices
router.get('/Financials/GetAllGLAccounts', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT DISTINCT GLAccount, sBatchNumber
      FROM tblGP_InvoiceStaging
      WHERE GLAccount IS NOT NULL
      ORDER BY GLAccount`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Financials/GetAllClientsOnHold — Clients with bad debt risk flag
// tblClient has no bOnHold; sBadDebtRisk = 'Y' is the closest equivalent
router.post('/Financials/GetAllClientsOnHold', async (req, res, next) => {
  try {
    const rows = await db.query(`
      SELECT lClientKey, sClientName1, sClientName2, sBadDebtRisk, sBadDebtComment,
        sPhoneVoice, sMailCity, sMailState, bActive
      FROM tblClient
      WHERE sBadDebtRisk = 'Y' AND bActive = 1
      ORDER BY sClientName1`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/Financials/clientUpdateOnHold — Toggle bad debt risk on a client
router.post('/Financials/clientUpdateOnHold', async (req, res, next) => {
  try {
    const b = req.body || {};
    const clientKey = b.lClientKey || 0;
    if (!clientKey) return res.status(400).json({ error: 'lClientKey required' });
    // bOnHold maps to sBadDebtRisk: true = 'Y', false = 'N'
    const flag = b.bOnHold ? 'Y' : 'N';
    await db.query(
      `UPDATE tblClient SET sBadDebtRisk = @flag, dtLastUpdate = GETDATE() WHERE lClientKey = @clientKey`,
      { flag, clientKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /api/Financials/GetAllInvoicePayments — Processed invoice payments
router.post('/Financials/GetAllInvoicePayments', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(
      `${INVOICE_SELECT} WHERE gp.bProcessed = 1`,
      'gp.dtTranDate DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// POST /api/Financials/GetAllDraftInvoices — Unprocessed invoices (draft/pending)
router.post('/Financials/GetAllDraftInvoices', async (req, res, next) => {
  try {
    const body = req.body || {};
    const result = await db.queryPage(
      `${INVOICE_SELECT} WHERE gp.bProcessed = 0`,
      'gp.dtTranDate DESC', {}, body.Pagination);
    res.json(result);
  } catch (e) { next(e); }
});

// DELETE /api/Financials/DeleteDraftInvoice — Delete an unprocessed invoice
router.delete('/Financials/DeleteDraftInvoice', async (req, res, next) => {
  try {
    const key = parseInt(req.query.key || req.query.GPInvoiceStagingID) || 0;
    if (!key) return res.status(400).json({ error: 'GPInvoiceStagingID required' });
    const row = await db.queryOne(
      'SELECT bProcessed FROM tblGP_InvoiceStaging WHERE GPInvoiceStagingID = @key', { key });
    if (!row) return res.status(404).json({ error: 'Invoice not found' });
    if (row.bProcessed) return res.status(400).json({ error: 'Cannot delete a processed invoice' });
    await db.query('DELETE FROM tblGP_InvoiceStaging WHERE GPInvoiceStagingID = @key', { key });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
