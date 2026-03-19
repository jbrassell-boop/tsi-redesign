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
  navy:    '#00257A',
  steel:   '#5A6F8A',
  bg:      '#F0F4FA',
  border:  '#CCCCCC',
  altRow:  '#FAFBFD',
  black:   '#333333',
  white:   '#FFFFFF'
};

// 1pt = 1/72 inch. Letter = 612 x 792 pt
const PAGE = { w: 612, h: 792, margin: 36 };
const CONTENT_W = PAGE.w - PAGE.margin * 2; // 540

// ── PDF Helpers ───────────────────────────────────────────────────

/** Create a pre-configured jsPDF instance (letter, pt units) */
function createPDF(opts) {
  const o = Object.assign({ orientation: 'portrait', format: 'letter', unit: 'pt' }, opts);
  const { jsPDF } = window.jspdf;
  return new jsPDF(o);
}

/** Add TSI branded header block. Returns Y after header. */
function addTSIHeader(doc, formName, formNum) {
  const m = PAGE.margin;
  let y = m;

  // Company name
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(COLORS.navy);
  doc.text(COMPANY.name, m, y + 14);

  // Tagline + address
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(COLORS.steel);
  doc.text(COMPANY.tagline, m, y + 26);
  doc.text(COMPANY.fullAddr + '  |  ' + COMPANY.phone, m, y + 36);

  // Form name (right-aligned)
  if (formName) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(COLORS.navy);
    doc.text(formName, PAGE.w - m, y + 14, { align: 'right' });
    if (formNum && formNum !== '—') {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(8);
      doc.setTextColor(COLORS.steel);
      doc.text('Form ' + formNum, PAGE.w - m, y + 26, { align: 'right' });
    }
  }

  // Divider line
  y += 44;
  doc.setDrawColor(COLORS.navy);
  doc.setLineWidth(1.5);
  doc.line(m, y, PAGE.w - m, y);

  return y + 12;
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
function addAddressBlock(doc, label, addr, x, y) {
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(COLORS.navy);
  doc.text(label, x, y);
  y += 12;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
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
    doc.text(ln, x, y);
    y += 11;
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


// ── Public API ────────────────────────────────────────────────────
window.TSIExport = {
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
  // Excel
  createWorkbook:   createWorkbook,
  addSheet:         addSheet,
  saveWorkbook:     saveWorkbook,
  tableToExcel:     tableToExcel,
  // Util
  fmtDate:          fmtDate,
  fmtCurrency:      fmtCurrency,
  // Constants
  COMPANY:          COMPANY,
  COLORS:           COLORS,
  PAGE:             PAGE
};

})();
