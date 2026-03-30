// ═══════════════════════════════════════════════════════
//  product-sales.js — Product Sales management
// ═══════════════════════════════════════════════════════
// tblProductSales: lProductSaleKey, lClientKey, lDepartmentKey, lSalesRepKey,
//   sInvoiceNumber, dtOrderDate, dtInvoiceDate, nTotalAmount, sPurchaseOrder
// tblProductSalesInventory: line items for a sale
// tblProductSaleInvoiceDetail: invoice-level line items
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/ProductSales/ProductSalesSearch — Search product sales
router.get('/ProductSales/ProductSalesSearch', async (req, res, next) => {
  try {
    const invoice = req.query.psInvoiceNumber || null;
    const po = req.query.psPONumber || null;
    const desc = req.query.psDescription2 || null;
    const params = {
      invoice: invoice ? `%${invoice}%` : null,
      po: po ? `%${po}%` : null,
      desc: desc ? `%${desc}%` : null
    };
    const rows = await db.query(`
      SELECT TOP 200
        ps.lProductSaleKey, ps.lClientKey, ps.lDepartmentKey, ps.lSalesRepKey,
        ps.sInvoiceNumber, ps.dtOrderDate, ps.dtInvoiceDate,
        ps.nTotalAmount, ps.nQuoteAmount, ps.nShippingAmount, ps.nTaxAmount,
        ps.sPurchaseOrder, ps.dtCanceledDate, ps.dtApprovalDate,
        ISNULL(c.sClientName1, '') AS sClientName1,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName
      FROM tblProductSales ps
        LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
      WHERE (@invoice IS NULL OR ps.sInvoiceNumber LIKE @invoice)
        AND (@po IS NULL OR ps.sPurchaseOrder LIKE @po)
        AND (@desc IS NULL OR ps.sNote LIKE @desc)
      ORDER BY ps.dtOrderDate DESC`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /api/ProductSales/GetDetails — Sale + inventory + invoice detail
router.get('/ProductSales/GetDetails', async (req, res, next) => {
  try {
    const saleKey = parseInt(req.query.lProductSaleKey) || 0;
    if (!saleKey) return res.status(400).json({ error: 'lProductSaleKey required' });

    const sale = await db.queryOne(`
      SELECT ps.*,
        ISNULL(c.sClientName1, '') AS sClientName1,
        ISNULL(d.sDepartmentName, '') AS sDepartmentName,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName
      FROM tblProductSales ps
        LEFT JOIN tblClient c ON c.lClientKey = ps.lClientKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = ps.lDepartmentKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = ps.lSalesRepKey
      WHERE ps.lProductSaleKey = @saleKey`, { saleKey });

    if (!sale) return res.status(404).json({ error: 'Product sale not found' });

    const inventoryItems = await db.query(`
      SELECT psi.lProductSaleInventoryKey, psi.lProductSaleKey,
        psi.lInventorySizeKey, psi.lQuantity, psi.nUnitCost, psi.nTotalCost, psi.sLotNumber,
        ISNULL(isz.sSizeDescription, '') AS sSizeDescription,
        ISNULL(inv.sItemDescription, '') AS sItemDescription
      FROM tblProductSalesInventory psi
        LEFT JOIN tblInventorySize isz ON isz.lInventorySizeKey = psi.lInventorySizeKey
        LEFT JOIN tblInventory inv ON inv.lInventoryKey = isz.lInventoryKey
      WHERE psi.lProductSaleKey = @saleKey
      ORDER BY inv.sItemDescription, isz.sSizeDescription`, { saleKey });

    const invoiceDetails = await db.query(`
      SELECT pid.lInvoiceKey, pid.lProductSalesKey, pid.lInventoryKey, pid.lInventorySizeKey,
        pid.sItemDescription, pid.sSizeDescription, pid.lQty, pid.nUnitCost, pid.nTotalCost,
        pid.sComment, pid.sLotNumber
      FROM tblProductSaleInvoiceDetail pid
      WHERE pid.lProductSalesKey = @saleKey
      ORDER BY pid.sItemDescription`, { saleKey });

    res.json({ sale, inventoryItems, invoiceDetails });
  } catch (e) { next(e); }
});

module.exports = router;
