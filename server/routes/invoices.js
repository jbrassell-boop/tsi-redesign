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

// GET /Invoice/GetReadyToInvoice — Repairs that are shipped but not yet invoiced
// Shipped = status 8 in tblRepair (lRepairStatusID values map to tblRepairStatuses)
// "Scope Out (Invoice)" is status 2 in tblRepairStatuses
router.get('/Invoice/GetReadyToInvoice', async (req, res, next) => {
  try {
    const svcKey = parseInt(req.query.svcKey || req.query.plServiceLocationKey) || 0;
    const rows = await db.query(`
      SELECT r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtShipDate,
        r.lRepairStatusID, r.lDepartmentKey, r.lScopeKey,
        r.dblAmtRepair, r.dblAmtShipping, r.lServiceLocationKey,
        rs.sRepairStatus,
        ISNULL(s.sSerialNumber,'') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
        ISNULL(d.sDepartmentName,'') AS sDepartmentName,
        ISNULL(c.sClientName1,'') AS sClientName1
      FROM tblRepair r
        LEFT JOIN tblRepairStatuses rs ON rs.lRepairStatusID = r.lRepairStatusID
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
        LEFT JOIN tblInvoice inv2 ON inv2.lRepairKey = r.lRepairKey
      WHERE r.lRepairStatusID = 8
        AND inv2.lRepairKey IS NULL
        AND (@svcKey = 0 OR r.lServiceLocationKey = @svcKey)
      ORDER BY r.dtShipDate`, { svcKey });
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Invoice/GetInvoiceByRepairKey/:repairKey — Invoice header + line items for a repair (PDF build)
// Combines tblGP_InvoiceStaging + tblInvoice header + tblRepairItemTran line items
router.get('/Invoice/GetInvoiceByRepairKey/:repairKey', async (req, res, next) => {
  try {
    const repairKey = parseInt(req.params.repairKey) || 0;
    if (!repairKey) return res.status(400).json({ success: false, error: 'repairKey required' });

    // Get repair + client/dept details for invoice header
    const repair = await db.queryOne(`
      SELECT
        r.lRepairKey, r.sWorkOrderNumber, r.dtDateIn, r.dtDateOut, r.dtShipDate,
        r.dblAmtRepair, r.dblAmtShipping, r.lServiceLocationKey,
        r.lContractKey, r.lSalesRepKey, r.sPurchaseOrder,
        r.sComplaintDesc, r.lScopeKey,
        ISNULL(c.sClientName1, '') AS sClientName1,
        ISNULL(c.sMailAddr1, '') AS sBillAddr1,
        ISNULL(c.sMailAddr2, '') AS sBillAddr2,
        ISNULL(c.sMailCity, '') AS sBillCity,
        ISNULL(c.sMailState, '') AS sBillState,
        ISNULL(c.sMailZip, '') AS sBillZip,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        ISNULL(d.sShipName1, '') AS sShipName1,
        ISNULL(d.sShipAddr1, '') AS sShipAddr1,
        ISNULL(d.sShipCity, '') AS sShipCity,
        ISNULL(d.sShipState, '') AS sShipState,
        ISNULL(d.sShipZip, '') AS sShipZip,
        ISNULL(s.sSerialNumber, '') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc, '') AS sScopeTypeDesc,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName
      FROM tblRepair r
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
        LEFT JOIN tblScope s ON s.lScopeKey = r.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = r.lSalesRepKey
      WHERE r.lRepairKey = @repairKey`, { repairKey });

    if (!repair) return res.status(404).json({ success: false, error: 'Repair not found' });

    // Get GP invoice staging record if exists
    const invoice = await db.queryOne(`
      SELECT gp.GPInvoiceStagingID, gp.lInvoiceKey, gp.sTranNumber,
        gp.dtTranDate, gp.TotalAmountDue, gp.dblTranAmount,
        gp.dblShippingAmount, gp.dblTaxAmount, gp.sPurchaseOrder,
        gp.bProcessed, gp.dtPostedDate
      FROM tblGP_InvoiceStaging gp
        INNER JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
      WHERE inv.lRepairKey = @repairKey
      ORDER BY gp.dtTranDate DESC`, { repairKey });

    // Get approved line items
    const lineItems = await db.query(`
      SELECT
        rit.lRepairItemTranKey, rit.lRepairItemKey,
        rit.dblRepairPrice, rit.sApproved, rit.sPrimaryRepair,
        rit.sUAorNWT, rit.lQuantity, rit.sComments,
        ISNULL(ri.sItemDescription, '') AS sItemDescription,
        ISNULL(ri.sPartOrLabor, '') AS sPartOrLabor
      FROM tblRepairItemTran rit
        LEFT JOIN tblRepairItem ri ON ri.lRepairItemKey = rit.lRepairItemKey
      WHERE rit.lRepairKey = @repairKey
        AND rit.sApproved = 'Y'
      ORDER BY rit.sPrimaryRepair DESC, ri.sItemDescription`, { repairKey });

    res.json({ success: true, data: { repair, invoice: invoice || null, lineItems } });
  } catch (e) { next(e); }
});

// POST /Invoice/GenerateInvoices — Create invoice staging records for repair keys
// Inserts into tblGP_InvoiceStaging for each repair
router.post('/Invoice/GenerateInvoices', async (req, res, next) => {
  try {
    const b = req.body || {};
    const repairKeys = Array.isArray(b.repairKeys) ? b.repairKeys : [];
    if (!repairKeys.length) return res.status(400).json({ error: 'repairKeys[] required' });

    let generated = 0;
    for (const key of repairKeys) {
      const repairKey = parseInt(key) || 0;
      if (!repairKey) continue;

      // Get repair details needed for invoice staging
      const repair = await db.queryOne(`
        SELECT r.lRepairKey, r.sWorkOrderNumber, r.dblAmtRepair, r.dblAmtShipping,
          r.lServiceLocationKey, r.lSalesRepKey, r.lDepartmentKey,
          d.lClientKey, d.sShipName1
        FROM tblRepair r
          LEFT JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
        WHERE r.lRepairKey = @repairKey`, { repairKey });

      if (!repair) continue;

      const total = parseFloat(repair.dblAmtRepair || 0) + parseFloat(repair.dblAmtShipping || 0);
      const tranNumber = repair.sWorkOrderNumber || String(repairKey);
      const dbKey = repair.lServiceLocationKey || 1;

      await db.query(`
        INSERT INTO tblGP_InvoiceStaging (
          lInvoiceKey, sTranNumber, dtTranDate, sBatchNumber,
          TotalAmountDue, dblTranAmount, dblShippingAmount,
          bProcessed, lDatabaseKey
        ) VALUES (
          @repairKey, @tranNumber, GETDATE(), 'TSI-BATCH',
          @total, @amount, @shipping,
          0, @dbKey
        )`,
        {
          repairKey,
          tranNumber,
          total,
          amount: parseFloat(repair.dblAmtRepair || 0),
          shipping: parseFloat(repair.dblAmtShipping || 0),
          dbKey
        });
      generated++;
    }
    res.json({ generated, success: true });
  } catch (e) { next(e); }
});

module.exports = router;
