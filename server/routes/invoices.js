// ═══════════════════════════════════════════════════════
//  invoices.js — Invoice endpoints (tblGP_InvoiceStaging)
//  NOTE: tblInvoice holds metadata; tblGP_InvoiceStaging holds revenue.
//        They are linked: gp.lInvoiceKey = inv.lInvoiceKey = inv.lRepairKey chain.
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /Invoice/GetAllInvoices — All invoices from GP staging joined to repair/client/dept
router.get('/Invoice/GetAllInvoices', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.svcKey) || 0;
    const rows = await db.query(`
      SELECT TOP 500
        gp.GPInvoiceStagingID,
        gp.lInvoiceKey,
        gp.sTranNumber,
        gp.dtTranDate,
        gp.TotalAmountDue,
        gp.dblTranAmount,
        gp.dblShippingAmount,
        gp.dblTaxAmount,
        gp.docDescription,
        gp.sPurchaseOrder,
        gp.dtDueDate,
        gp.bProcessed,
        gp.dtPostedDate,
        gp.lDatabaseKey,
        inv.lRepairKey,
        inv.lClientKey,
        inv.lDepartmentKey,
        inv.lSalesRepKey,
        inv.lContractKey,
        inv.sTranNumber AS sWOTranNumber,
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
      WHERE (@svcKey = 0 OR gp.lDatabaseKey = @svcKey)
      ORDER BY gp.dtTranDate DESC`, { svcKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Invoice/GetInvoiceDetails/:key — Invoice line items via repair detail transactions
router.get('/Invoice/GetInvoiceDetails/:key', async (req, res, next) => {
  try {
    const invoiceKey = parseInt(req.params.key) || 0;
    if (!invoiceKey) return res.status(400).json({ error: 'Missing invoice key' });

    // Get the invoice header
    const invoice = await db.queryOne(`
      SELECT gp.*, inv.lRepairKey, inv.lClientKey, inv.lDepartmentKey
      FROM tblGP_InvoiceStaging gp
        LEFT JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
      WHERE gp.lInvoiceKey = @invoiceKey`, { invoiceKey });

    if (!invoice) return res.json({ invoice: null, lineItems: [] });

    // Get line items from repair transactions if we have a repair key
    let lineItems = [];
    if (invoice.lRepairKey) {
      lineItems = await db.query(`
        SELECT
          rit.lRepairItemTranKey,
          rit.lRepairItemKey,
          rit.dblRepairPrice,
          rit.sApproved,
          rit.sPrimaryRepair,
          rit.sUAorNWT,
          rit.lQuantity,
          rit.sComments,
          ISNULL(ri.sItemDescription, '') AS sItemDescription,
          ISNULL(ri.sPartOrLabor, '') AS sPartOrLabor
        FROM tblRepairItemTran rit
          LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
        WHERE rit.lRepairKey = @repairKey
        ORDER BY rit.sPrimaryRepair DESC, ri.sItemDescription`, { repairKey: invoice.lRepairKey });
    }

    res.json({ invoice, lineItems });
  } catch (e) { next(e); }
});

// GET /Invoice/GetInvoicesByRepair/:repairKey — Invoices linked to a specific repair
router.get('/Invoice/GetInvoicesByRepair/:repairKey', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.params.repairKey) || 0;
    if (!repairKey) return res.status(400).json({ error: 'Missing repair key' });

    const rows = await db.query(`
      SELECT
        gp.GPInvoiceStagingID,
        gp.lInvoiceKey,
        gp.sTranNumber,
        gp.dtTranDate,
        gp.TotalAmountDue,
        gp.dblTranAmount,
        gp.dblShippingAmount,
        gp.dblTaxAmount,
        gp.bProcessed,
        gp.dtPostedDate
      FROM tblGP_InvoiceStaging gp
        INNER JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
      WHERE inv.lRepairKey = @repairKey
      ORDER BY gp.dtTranDate DESC`, { repairKey });
    res.json(rows);
  } catch (e) { next(e); }
});

module.exports = router;
