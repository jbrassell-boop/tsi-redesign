/* ═══════════════════════════════════════════════════════════════════
   export-utils.js  —  Shared PDF & Excel export helpers for TSI
   Uses: jsPDF + jsPDF-AutoTable (PDF), SheetJS/xlsx (Excel)
   ═══════════════════════════════════════════════════════════════════ */
(function() {
'use strict';

// ── Constants ──────────────────────────────────────────────────────
const COMPANY = {
  name:    'Total Scope, Inc.',
  tagline: 'Endoscope Repair & Sales',
  addr1:   '17 Creek Parkway',
  city:    'Upper Chichester',
  state:   'PA',
  zip:     '19061',
  phone:   '800-471-2255',
  fax:     '800-448-2680',
  iso:     'ISO 13485:2016 Certified',
  fullAddr: '17 Creek Parkway, Upper Chichester, PA 19061'
};

const COLORS = {
  navy:      '#00257A',
  estAccent: '#9DABE2',
  steel:     '#5A6F8A',
  bg:        '#F0F4FA',
  border:    '#CCCCCC',
  altRow:    '#FAFBFD',
  black:     '#333333',
  white:     '#FFFFFF'
};

// 1pt = 1/72 inch. Letter = 612 x 792 pt
const PAGE = { w: 612, h: 792, margin: 36 };
const CONTENT_W = PAGE.w - PAGE.margin * 2; // 540
PAGE.contentW = CONTENT_W; // expose for external callers

// ── PDF Helpers ───────────────────────────────────────────────────

/** Create a pre-configured jsPDF instance (letter, pt units) */
function createPDF(opts) {
  const o = Object.assign({ orientation: 'portrait', format: 'letter', unit: 'pt' }, opts);
  const { jsPDF } = window.jspdf;
  return new jsPDF(o);
}

// ── Logo preloading ──────────────────────────────────────────────

let _logoDataUrl = null;
let _logoNaturalW = 1;
let _logoNaturalH = 1;

/** Pre-fetch logo image and cache as data URL. Call once at page load. Returns Promise. */
function preloadLogo(src) {
  return new Promise(function(resolve) {
    var img = new Image();
    img.onload = function() {
      _logoNaturalW = img.naturalWidth || 1;
      _logoNaturalH = img.naturalHeight || 1;
      var c = document.createElement('canvas');
      c.width = _logoNaturalW;
      c.height = _logoNaturalH;
      c.getContext('2d').drawImage(img, 0, 0);
      _logoDataUrl = c.toDataURL('image/jpeg', 0.95);
      resolve(_logoDataUrl);
    };
    img.onerror = function() { resolve(null); };
    img.src = src;
  });
}

/** Draw the logo. targetW is desired width in pt. Returns actual height drawn. */
function addLogoImage(doc, x, y, targetW) {
  if (!_logoDataUrl) return 0;
  var h = targetW * (_logoNaturalH / _logoNaturalW);
  doc.addImage(_logoDataUrl, 'JPEG', x, y, targetW, h);
  return h;
}

/** True if logo has been preloaded. */
function hasLogo() { return !!_logoDataUrl; }

/** Add TSI branded header block (navy band). Returns Y after header. */
function addTSIHeader(doc, formName, formNum) {
  const BAND_H = 72;
  const LOGO_W = 52;

  // Navy band full-width
  doc.setFillColor(COLORS.navy);
  doc.rect(0, 0, PAGE.w, BAND_H, 'F');

  // White logo left
  if (_logoDataUrl) {
    addLogoImage(doc, 18, (BAND_H - LOGO_W) / 2, LOGO_W);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(COLORS.white);
    doc.text(COMPANY.name, 18, BAND_H / 2 + 6);
  }

  // Form name right (white text)
  if (formName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(COLORS.white);
    doc.text(formName, PAGE.w - 18, 30, { align: 'right' });
    if (formNum && formNum !== '—') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor('#9DABE2');
      doc.text('Form ' + formNum, PAGE.w - 18, 46, { align: 'right' });
    }
  }

  return BAND_H + 14;
}

/** Add page footer with page number and ISO cert */
function addTSIFooter(doc) {
  const pages = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.setTextColor(COLORS.steel);
    // ISO cert left
    doc.text(COMPANY.iso, PAGE.margin, PAGE.h - 20);
    // Page number right
    doc.text('Page ' + i + ' of ' + pages, PAGE.w - PAGE.margin, PAGE.h - 20, { align: 'right' });
    // Company name center
    doc.text(COMPANY.name + '  |  ' + COMPANY.phone, PAGE.w / 2, PAGE.h - 20, { align: 'center' });
  }
}

/**
 * Add a 2-column key-value grid (like repair header fields).
 * pairs: [['Label','Value'], ...] — rendered as 2x4 or 2xN grid
 * Returns Y after grid.
 */
function addKeyValueGrid(doc, pairs, startY) {
  const m = PAGE.margin;
  const colW = CONTENT_W / 2;
  let y = startY;

  doc.setFontSize(9);
  for (let i = 0; i < pairs.length; i += 2) {
    // Left column
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.steel);
    doc.text(pairs[i][0] + ':', m, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(COLORS.black);
    doc.text(String(pairs[i][1] || '—'), m + 70, y);

    // Right column (if exists)
    if (i + 1 < pairs.length) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.steel);
      doc.text(pairs[i+1][0] + ':', m + colW, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.black);
      doc.text(String(pairs[i+1][1] || '—'), m + colW + 70, y);
    }
    y += 14;
  }
  return y + 4;
}

/** Add a section label (navy uppercase text with underline). Returns Y after. */
function addSectionLabel(doc, text, y) {
  const m = PAGE.margin;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(COLORS.navy);
  doc.text(text.toUpperCase(), m, y);
  y += 3;
  doc.setDrawColor(COLORS.navy);
  doc.setLineWidth(0.5);
  doc.line(m, y, PAGE.w - PAGE.margin, y);
  return y + 10;
}

/**
 * Add a styled autoTable. Returns Y after table.
 * headers: ['Col1','Col2',...]
 * rows: [['val','val',...], ...]
 * options: override autoTable options
 */
function addTable(doc, headers, rows, startY, options) {
  const o = Object.assign({
    startY: startY,
    margin: { left: PAGE.margin, right: PAGE.margin },
    styles: {
      font: 'helvetica',
      fontSize: 9,
      cellPadding: { top: 3, right: 5, bottom: 3, left: 5 },
      lineColor: [204, 204, 204],
      lineWidth: 0.5,
      textColor: COLORS.black
    },
    headStyles: {
      fillColor: COLORS.bg,
      textColor: COLORS.black,
      fontStyle: 'bold',
      fontSize: 8
    },
    alternateRowStyles: {
      fillColor: COLORS.altRow
    },
    head: [headers],
    body: rows
  }, options);

  doc.autoTable(o);
  return doc.lastAutoTable.finalY + 8;
}

/**
 * Add signature lines.
 * labels: ['Signature','Date','Printed Name']
 * Returns Y after block.
 */
function addSignatureBlock(doc, labels, y) {
  const m = PAGE.margin;
  const lineW = 180;

  // Check page overflow
  if (y + labels.length * 28 + 10 > PAGE.h - 40) {
    doc.addPage();
    y = PAGE.margin;
  }

  y += 10;
  doc.setDrawColor(COLORS.black);
  doc.setLineWidth(0.5);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.steel);

  labels.forEach(function(lbl) {
    doc.line(m, y, m + lineW, y);
    doc.text(lbl, m, y + 10);
    y += 28;
  });
  return y;
}

/**
 * Add checkbox rows (for accessories, inspection items).
 * items: [{ label:'Cap', checked:true }, ...]
 * cols: number of columns (default 3)
 * Returns Y after block.
 */
function addCheckboxRows(doc, items, y, cols) {
  cols = cols || 3;
  const m = PAGE.margin;
  const colW = CONTENT_W / cols;
  const boxSize = 7;

  doc.setFontSize(9);
  doc.setTextColor(COLORS.black);

  for (let i = 0; i < items.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = m + col * colW;
    const rowY = y + row * 16;

    // Check page overflow
    if (rowY > PAGE.h - 50) {
      doc.addPage();
      y = PAGE.margin - row * 16;
    }

    // Checkbox
    doc.setDrawColor(COLORS.border);
    doc.setLineWidth(0.5);
    doc.rect(x, rowY - boxSize + 1, boxSize, boxSize);
    if (items[i].checked) {
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(COLORS.navy);
      doc.text('✓', x + 1.5, rowY);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.black);
    }
    doc.text(items[i].label, x + boxSize + 4, rowY);
  }

  const totalRows = Math.ceil(items.length / cols);
  return y + totalRows * 16 + 6;
}

/**
 * Add Pass/Fail inspection grid.
 * categories: [{ name:'Image', items:[{ label:'Clarity', pass:true }, ...] }, ...]
 * Returns Y after grid.
 */
function addPassFailGrid(doc, categories, y) {
  categories.forEach(function(cat) {
    // Check page overflow
    if (y + 20 + cat.items.length * 14 > PAGE.h - 50) {
      doc.addPage();
      y = PAGE.margin;
    }

    // Category header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(COLORS.navy);
    doc.text(cat.name, PAGE.margin, y);
    y += 4;
    doc.setDrawColor(COLORS.bg);
    doc.setLineWidth(0.3);
    doc.line(PAGE.margin, y, PAGE.w - PAGE.margin, y);
    y += 10;

    // Items with P/F
    doc.setFontSize(8);
    cat.items.forEach(function(item) {
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(COLORS.black);
      doc.text(item.label, PAGE.margin + 10, y);

      // Pass indicator
      var px = PAGE.w - PAGE.margin - 60;
      if (item.pass === true) {
        doc.setTextColor('#2E7D32');
        doc.setFont('helvetica', 'bold');
        doc.text('PASS', px, y);
      } else if (item.pass === false) {
        doc.setTextColor('#C62828');
        doc.setFont('helvetica', 'bold');
        doc.text('FAIL', px, y);
      } else {
        doc.setTextColor(COLORS.steel);
        doc.text('—', px, y);
      }
      y += 13;
    });
    y += 4;
  });
  return y;
}

/**
 * Add a text paragraph (auto-wrapped).
 * Returns Y after text.
 */
function addParagraph(doc, text, y, opts) {
  opts = opts || {};
  var fontSize = opts.fontSize || 9;
  var maxWidth = opts.maxWidth || CONTENT_W;
  doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
  doc.setFontSize(fontSize);
  doc.setTextColor(opts.color || COLORS.black);

  var lines = doc.splitTextToSize(text || '(none)', maxWidth);

  // Check page overflow
  if (y + lines.length * (fontSize * 1.3) > PAGE.h - 40) {
    doc.addPage();
    y = PAGE.margin;
  }

  doc.text(lines, PAGE.margin + (opts.indent || 0), y);
  return y + lines.length * (fontSize * 1.3) + 6;
}

/**
 * Add an address block (label + structured address).
 * addr: { name, addr1, addr2, city, state, zip }
 * Returns Y after block.
 */
function addAddressBlock(doc, label, addr, x, y, maxW) {
  maxW = maxW || 170; // default column width to prevent overflow into adjacent columns
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.navy);
  doc.text(label, x, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.black);

  var lines = [];
  if (addr.name) lines.push(addr.name);
  if (addr.attn) lines.push('Attn: ' + addr.attn);
  if (addr.addr1) lines.push(addr.addr1);
  if (addr.addr2) lines.push(addr.addr2);
  var csz = [addr.city, addr.state].filter(Boolean).join(', ');
  if (addr.zip) csz += ' ' + addr.zip;
  if (csz.trim()) lines.push(csz);

  lines.forEach(function(ln) {
    // splitTextToSize wraps long lines within maxW to prevent column overflow
    var wrapped = doc.splitTextToSize(String(ln), maxW);
    wrapped.forEach(function(wl) {
      doc.text(wl, x, y);
      y += 10;
    });
  });
  return y + 4;
}

/** Trigger PDF download */
function savePDF(doc, filename) {
  addTSIFooter(doc);
  doc.save(filename);
}

/** Check if we need a new page, add one if so. Returns current Y. */
function checkPageBreak(doc, y, needed) {
  needed = needed || 40;
  if (y + needed > PAGE.h - 40) {
    doc.addPage();
    return PAGE.margin;
  }
  return y;
}


// ── Invoice Helpers ──────────────────────────────────────────────

/**
 * Invoice-specific header: company info left, "INVOICE" title + number right.
 * Returns Y after header divider.
 */
function addInvoiceHeader(doc, invoiceNum) {
  var m = PAGE.margin;
  var y = m;

  // Left: Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.navy);
  doc.text(COMPANY.name, m, y + 14);

  // Left: Tagline
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.steel);
  doc.text(COMPANY.tagline, m, y + 26);

  // Left: Address + phone
  doc.setFontSize(8);
  doc.text(COMPANY.addr1, m, y + 38);
  doc.text(COMPANY.city + ', ' + COMPANY.state + ' ' + COMPANY.zip, m, y + 48);
  doc.text('Phone: ' + COMPANY.phone + '  |  Fax: ' + COMPANY.fax, m, y + 58);

  // Right: INVOICE title
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(COLORS.navy);
  doc.text('INVOICE', PAGE.w - m, y + 14, { align: 'right' });

  // Right: Invoice number
  if (invoiceNum) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(COLORS.black);
    doc.text('Invoice #:  ' + invoiceNum, PAGE.w - m, y + 28, { align: 'right' });
  }

  // Divider
  y += 68;
  doc.setDrawColor(COLORS.navy);
  doc.setLineWidth(1.5);
  doc.line(m, y, PAGE.w - m, y);

  return y + 10;
}

/**
 * "PLEASE REMIT TO:" block with TSI Accounts Receivable address.
 * Returns Y after block.
 */
function addRemitToBlock(doc, y) {
  var m = PAGE.margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.steel);
  doc.text('PLEASE REMIT TO:', m, y);
  y += 11;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.black);
  doc.text('Accounts Receivable', m, y); y += 11;
  doc.text(COMPANY.name, m, y); y += 11;
  doc.text(COMPANY.addr1, m, y); y += 11;
  doc.text(COMPANY.city + ', ' + COMPANY.state + ' ' + COMPANY.zip, m, y); y += 11;

  return y + 4;
}

/**
 * Detail band: evenly-spaced key-value pairs on a shaded row.
 * pairs: [['Label','Value'], ...]
 * Returns Y after band.
 */
function addDetailBand(doc, pairs, y) {
  var m = PAGE.margin;
  var bandH = 18;
  var colW = CONTENT_W / pairs.length;

  // Shaded background
  doc.setFillColor(COLORS.bg);
  doc.rect(m, y - 2, CONTENT_W, bandH, 'F');

  // Border
  doc.setDrawColor(COLORS.border);
  doc.setLineWidth(0.3);
  doc.rect(m, y - 2, CONTENT_W, bandH, 'S');

  for (var i = 0; i < pairs.length; i++) {
    var x = m + i * colW + 4;
    // Label
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor(COLORS.steel);
    doc.text(String(pairs[i][0]).toUpperCase(), x, y + 4);
    // Value
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(COLORS.black);
    doc.text(String(pairs[i][1] || '—'), x, y + 13);
  }

  return y + bandH + 4;
}

/**
 * Right-aligned totals block with tax breakdown.
 * totals: { subtotal, shipping, taxes: [{name, pct, amt}], grandTotal }
 * Returns Y after block.
 */
function addTotalsBlock(doc, totals, y) {
  var rightX = PAGE.w - PAGE.margin;
  var labelX = rightX - 120;

  y = checkPageBreak(doc, y, 80);

  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.black);

  // Sub Total
  doc.text('SUB TOTAL', labelX, y);
  doc.text(fmtCurrency(totals.subtotal), rightX, y, { align: 'right' });
  y += 14;

  // Shipping
  doc.text('SHIPPING', labelX, y);
  doc.text(fmtCurrency(totals.shipping), rightX, y, { align: 'right' });
  y += 14;

  // Tax jurisdictions (always show, even $0.00)
  var taxes = totals.taxes || [];
  if (taxes.length === 0) {
    doc.text('TAX', labelX, y);
    doc.text(fmtCurrency(0), rightX, y, { align: 'right' });
    y += 14;
  } else {
    for (var i = 0; i < taxes.length; i++) {
      var t = taxes[i];
      if (t.amt || t.amt === 0) {
        var taxLabel = t.name ? ('TAX (' + t.name + ')') : 'TAX';
        doc.text(taxLabel, labelX, y);
        doc.text(fmtCurrency(t.amt), rightX, y, { align: 'right' });
        y += 14;
      }
    }
  }

  // Divider line above total
  doc.setDrawColor(COLORS.navy);
  doc.setLineWidth(0.8);
  doc.line(labelX, y - 4, rightX, y - 4);

  // Grand Total
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.setTextColor(COLORS.navy);
  doc.text('TOTAL', labelX, y + 6);
  doc.text(fmtCurrency(totals.grandTotal), rightX, y + 6, { align: 'right' });

  return y + 22;
}

/**
 * Diagonal VOID watermark across all pages.
 */
function addVoidWatermark(doc) {
  var pages = doc.internal.getNumberOfPages();
  for (var i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.saveGraphicsState();
    doc.setGState(new doc.GState({ opacity: 0.12 }));
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(120);
    doc.setTextColor('#C62828');
    // Rotate 45 degrees and center
    doc.text('VOID', PAGE.w / 2, PAGE.h / 2, {
      align: 'center',
      angle: 45
    });
    doc.restoreGraphicsState();
  }
}

/**
 * Build a complete invoice PDF from tblInvoice + tblInvoiceDetl records.
 * inv:     raw tblInvoice record
 * details: array of tblInvoiceDetl records
 * opts:    { repair, salesperson, shipVia, paymentTerms }
 */
function buildInvoicePdf(inv, details, opts) {
  opts = opts || {};
  var doc = createPDF();
  var invoiceNum = inv.sTranNumber || inv.sWorkOrderNumber || '';

  // ── Zone 1: Header ──
  var y = addInvoiceHeader(doc, invoiceNum);

  // ── Zone 2: Remit To ──
  y = addRemitToBlock(doc, y);

  // ── Zone 3: Dual Address Blocks ──
  var addrY = y;
  var billY = addAddressBlock(doc, 'BILL TO:', {
    name:  inv.sBillName1 || '',
    attn:  inv.sBillName2 || '',
    addr1: inv.sBillAddr1 || '',
    addr2: inv.sBillAddr2 || '',
    city:  inv.sBillCity  || '',
    state: inv.sBillState || '',
    zip:   inv.sBillZip   || ''
  }, PAGE.margin, addrY);

  var shipY = addAddressBlock(doc, 'SHIP TO:', {
    name:  inv.sShipName1 || '',
    attn:  inv.sShipName2 || '',
    addr1: inv.sShipAddr1 || '',
    addr2: inv.sShipAddr2 || '',
    city:  inv.sShipCity  || '',
    state: inv.sShipState || '',
    zip:   inv.sShipZip   || ''
  }, PAGE.margin + CONTENT_W / 2, addrY);

  y = Math.max(billY, shipY) + 4;

  // ── Zone 4: Detail Bands ──
  // Resolve display values
  var shipVia = opts.shipVia || inv.sDeliveryMethod || inv.sDeliveryDesc || '—';
  var terms = opts.paymentTerms || inv.sTermsDesc || 'Due Upon Receipt';
  var salesperson = opts.salesperson || '';
  if (!salesperson && inv.sRepFirst) {
    salesperson = ((inv.sRepFirst || '') + ' ' + (inv.sRepLast || '')).trim();
  }
  var custId = inv.lClientKey || '';
  var woNum = invoiceNum;
  if (opts.repair) {
    woNum = opts.repair.sWorkOrderNumber || woNum;
    if (!shipVia || shipVia === '—') shipVia = opts.repair.sDeliveryMethod || '—';
  }
  var poNum = inv.sPurchaseOrder || '—';
  if (poNum === '—' && inv.sUnderContract === 'Y') poNum = 'Contract';

  y = addDetailBand(doc, [
    ['Date', fmtDate(inv.dtTranDate)],
    ['Ship Via', shipVia],
    ['Terms', terms]
  ], y);

  y = addDetailBand(doc, [
    ['Purchase Order #', poNum],
    ['Approval Date', fmtDate(inv.dtAprRecvd)],
    ['Salesperson', salesperson],
    ['Cust. ID', String(custId)],
    ['W.O. #', woNum]
  ], y);

  // ── Zone 5: Line Items ──
  var showDesc = inv.sDisplayItemDescription !== 'N';
  var showAmt  = inv.sDisplayItemAmount !== 'N';

  var headers = ['Description'];
  if (showAmt) headers.push('Amount');

  var rows = [];
  if (details && details.length) {
    for (var i = 0; i < details.length; i++) {
      var d = details[i];
      var desc = showDesc ? (d.sItemDescription || '') : '';
      var row = [desc];
      if (showAmt) row.push(fmtCurrency(d.dblItemAmount));
      rows.push(row);
    }
  }

  // If no detail rows, build from repair items if available
  if (!rows.length && opts.repair) {
    var r = opts.repair;
    var desc2 = (r.sInstrumentModelNumber || r.sModelNumber || '') +
                (r.sSerialNumber ? '\nSerial # ' + r.sSerialNumber : '');
    rows.push([desc2, showAmt ? fmtCurrency(inv.dblTranAmount) : '']);
    if (!showAmt) rows[0].pop();
  }

  if (rows.length) {
    var colStyles = {};
    if (showAmt) {
      colStyles[headers.length - 1] = { halign: 'right', cellWidth: 80 };
    }
    y = addTable(doc, headers, rows, y, { columnStyles: colStyles });
  } else {
    y = addParagraph(doc, 'No billable items', y, { color: COLORS.steel });
  }

  // ── Tracking Number (if present) ──
  var tracking = inv.sShipTrackingNumber || (opts.repair && opts.repair.sShipTrackingNumber) || '';
  if (tracking) {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.black);
    doc.text('Tracking Number:', PAGE.margin, y);
    doc.setFont('helvetica', 'bold');
    doc.text(tracking, PAGE.margin + 85, y);
    y += 16;
  }

  // ── Customer Complaint (if flagged) ──
  if (inv.sDisplayCustomerComplaint === 'Y' && inv.sComplaintDesc) {
    y = checkPageBreak(doc, y, 30);
    y = addSectionLabel(doc, 'Customer Complaint', y);
    y = addParagraph(doc, inv.sComplaintDesc, y);
  }

  // ── Discount Comment (if flagged) ──
  if (inv.sDisplayDiscountComment === 'Y' && inv.sDiscountComment) {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(COLORS.steel);
    doc.text(inv.sDiscountComment, PAGE.margin, y);
    y += 14;
  }

  // ── "Thank you" ──
  y = checkPageBreak(doc, y, 20);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.black);
  doc.text('THANK YOU FOR YOUR BUSINESS.', PAGE.margin, y);
  y += 16;

  // ── Zone 6: Totals ──
  var taxAmt1 = parseFloat(inv.dblJuris1Amt) || 0;
  var taxAmt2 = parseFloat(inv.dblJuris2Amt) || 0;
  var taxAmt3 = parseFloat(inv.dblJuris3Amt) || 0;
  var taxes = [];
  // Always include at least one tax line
  if (inv.sJuris1Name || taxAmt1) taxes.push({ name: inv.sJuris1Name || '', pct: inv.dblJuris1Pct, amt: taxAmt1 });
  if (inv.sJuris2Name || taxAmt2) taxes.push({ name: inv.sJuris2Name || '', pct: inv.dblJuris2Pct, amt: taxAmt2 });
  if (inv.sJuris3Name || taxAmt3) taxes.push({ name: inv.sJuris3Name || '', pct: inv.dblJuris3Pct, amt: taxAmt3 });

  var subtotal = parseFloat(inv.dblTranAmount) || 0;
  var shipping = parseFloat(inv.dblShippingAmt) || 0;
  var totalTax = taxAmt1 + taxAmt2 + taxAmt3;

  y = addTotalsBlock(doc, {
    subtotal:   subtotal,
    shipping:   shipping,
    taxes:      taxes,
    grandTotal: subtotal + shipping + totalTax
  }, y);

  // ── Custom Footer (if flagged) ──
  if (inv.sDisplayFooter === 'Y' && inv.sFooterText) {
    y = checkPageBreak(doc, y, 20);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(COLORS.steel);
    doc.text(inv.sFooterText, PAGE.margin, y);
    y += 14;
  }

  // ── Zone 7: Footer + Company ──
  // Company address bottom-right
  y = checkPageBreak(doc, y, 30);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(COLORS.steel);
  var footRightX = PAGE.w - PAGE.margin;
  doc.text(COMPANY.name, footRightX, PAGE.h - 60, { align: 'right' });
  doc.text(COMPANY.addr1, footRightX, PAGE.h - 50, { align: 'right' });
  doc.text(COMPANY.city + ', ' + COMPANY.state + ' ' + COMPANY.zip, footRightX, PAGE.h - 40, { align: 'right' });

  // Contact info bottom-left
  doc.text(COMPANY.phone + '  |  484-490-2150', PAGE.margin, PAGE.h - 60);
  doc.text('www.totalscopeinc.com', PAGE.margin, PAGE.h - 50);
  doc.text('ar@totalscopeinc.com', PAGE.margin, PAGE.h - 40);

  // ISO line centered
  doc.setFontSize(7);
  doc.text('An ISO Certified Company meeting the Medical Device Standards of ISO 13485', PAGE.w / 2, PAGE.h - 28, { align: 'center' });

  // ── VOID watermark ──
  if (inv.bIsVoid) {
    addVoidWatermark(doc);
  }

  // Save (skip standard footer since we have custom invoice footer)
  doc.save('Invoice_' + (invoiceNum || 'draft') + '.pdf');
}


// ── Excel Helpers ─────────────────────────────────────────────────

/** Create a new XLSX workbook */
function createWorkbook() {
  if (typeof XLSX === 'undefined') {
    console.warn('SheetJS (XLSX) not loaded');
    return null;
  }
  return XLSX.utils.book_new();
}

/**
 * Add a styled sheet to a workbook.
 * headers: ['Col1','Col2',...]
 * rows: [['val','val',...], ...]
 * Returns the worksheet.
 */
function addSheet(wb, sheetName, headers, rows) {
  var data = [headers].concat(rows);
  var ws = XLSX.utils.aoa_to_sheet(data);

  // Auto column widths
  var colWidths = headers.map(function(h, i) {
    var max = String(h).length;
    rows.forEach(function(r) {
      var v = r[i] !== undefined && r[i] !== null ? String(r[i]) : '';
      if (v.length > max) max = v.length;
    });
    return { wch: Math.min(max + 2, 50) };
  });
  ws['!cols'] = colWidths;

  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  return ws;
}

/** Trigger Excel download */
function saveWorkbook(wb, filename) {
  if (!wb) return;
  XLSX.writeFile(wb, filename);
}

/**
 * Quick table-to-Excel export.
 * Reads headers and rows from a DOM <table> element.
 */
function tableToExcel(tableEl, sheetName, filename) {
  if (!tableEl) return;
  var headers = [];
  var rows = [];
  var ths = tableEl.querySelectorAll('thead th');
  ths.forEach(function(th) { headers.push(th.textContent.trim()); });
  tableEl.querySelectorAll('tbody tr').forEach(function(tr) {
    var row = [];
    tr.querySelectorAll('td').forEach(function(td) { row.push(td.textContent.trim()); });
    rows.push(row);
  });
  var wb = createWorkbook();
  if (!wb) return;
  addSheet(wb, sheetName || 'Sheet1', headers, rows);
  saveWorkbook(wb, filename);
}


// ── Utility ───────────────────────────────────────────────────────

/** Format date string to MM/DD/YYYY */
function fmtDate(d) {
  if (!d) return '—';
  var dt = new Date(d);
  if (isNaN(dt)) return String(d);
  return (dt.getMonth()+1) + '/' + dt.getDate() + '/' + dt.getFullYear();
}

/** Format currency */
function fmtCurrency(n) {
  if (n === null || n === undefined || n === '') return '$0.00';
  return '$' + Number(n).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}


// ── CSV Export ────────────────────────────────────────────────────

/** Export an HTML table to CSV and trigger download.
 *  @param {string} tableId — ID of the <table> or its parent wrapper
 *  @param {string} filename — download filename (without .csv)
 */
function tableToCSV(tableId, filename) {
  var el = document.getElementById(tableId);
  if (!el) { console.warn('[Export] Table not found:', tableId); return; }
  // If el is not a table, try to find one inside it
  var table = el.tagName === 'TABLE' ? el : el.querySelector('table');
  if (!table) { console.warn('[Export] No <table> inside:', tableId); return; }

  var csv = [];
  var rows = table.querySelectorAll('tr');
  for (var i = 0; i < rows.length; i++) {
    // Skip hidden group/separator rows
    if (rows[i].classList.contains('group-hidden')) continue;
    var cells = rows[i].querySelectorAll('th, td');
    var row = [];
    for (var j = 0; j < cells.length; j++) {
      // Skip action columns (buttons only, no text)
      var text = (cells[j].textContent || '').trim().replace(/[\r\n]+/g, ' ');
      row.push('"' + text.replace(/"/g, '""') + '"');
    }
    csv.push(row.join(','));
  }

  var blob = new Blob([csv.join('\n')], { type: 'text/csv;charset=utf-8;' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = (filename || 'export') + '.csv';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/** Convenience global — pages can call exportTableCSV(id, name) directly */
window.exportTableCSV = function(tableId, filename) { tableToCSV(tableId, filename); };

// ── Public API ────────────────────────────────────────────────────
window.TSIExport = {
  // Logo
  preloadLogo:      preloadLogo,
  addLogoImage:     addLogoImage,
  hasLogo:          hasLogo,
  // PDF
  createPDF:        createPDF,
  addTSIHeader:     addTSIHeader,
  addTSIFooter:     addTSIFooter,
  addKeyValueGrid:  addKeyValueGrid,
  addSectionLabel:  addSectionLabel,
  addTable:         addTable,
  addSignatureBlock: addSignatureBlock,
  addCheckboxRows:  addCheckboxRows,
  addPassFailGrid:  addPassFailGrid,
  addParagraph:     addParagraph,
  addAddressBlock:  addAddressBlock,
  savePDF:          savePDF,
  checkPageBreak:   checkPageBreak,
  // Invoice
  addInvoiceHeader: addInvoiceHeader,
  addRemitToBlock:  addRemitToBlock,
  addDetailBand:    addDetailBand,
  addTotalsBlock:   addTotalsBlock,
  addVoidWatermark: addVoidWatermark,
  buildInvoicePdf:  buildInvoicePdf,
  // Excel
  createWorkbook:   createWorkbook,
  addSheet:         addSheet,
  saveWorkbook:     saveWorkbook,
  tableToExcel:     tableToExcel,
  // CSV
  tableToCSV:       tableToCSV,
  // Util
  fmtDate:          fmtDate,
  fmtCurrency:      fmtCurrency,
  // Constants
  COMPANY:          COMPANY,
  COLORS:           COLORS,
  PAGE:             PAGE
};

})();
