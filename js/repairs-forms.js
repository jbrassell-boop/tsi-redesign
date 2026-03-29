/* ═══ repairs-forms.js ═══
   Workflow form management, PDF generation, and form drawer population.
   Part of repairs.html modularization.
   Entry: openFormPreview(formId), generateFormPDF(formId)
*/
(function() {
'use strict';

const WORKFLOW_FORMS = [
  { id:'disassemble', name:'Disassemble & Inspection', shortName:'D&I', formNum:'OM05-1', phase:1, statuses:[1] },
  { id:'requisition', name:'Requisition for Approval', shortName:'Req', formNum:'OM07-2', phase:2, statuses:[2] },
  { id:'inspection',  name:'Blank Inspection', shortName:'Inspect', formNum:'OM07-3', phase:3, statuses:[3,4] },
  { id:'picklist',    name:'Repair Inventory Pick List', shortName:'Pick List', formNum:'OM07-6', phase:3, statuses:[3,4] },
  { id:'amendment',   name:'Amendment to Repair', shortName:'Amend', formNum:'OM07-9', phase:3, statuses:[3,4,5] },
  { id:'defect',      name:'Defect Tracking', shortName:'Defect', formNum:'OM07-8', phase:3, statuses:[3,4,5] },
  { id:'invoice',     name:'Final Invoice', shortName:'Invoice', formNum:'—', phase:4, statuses:[6,7] },
  { id:'packing',     name:'Scope Return Verification', shortName:'Packing', formNum:'—', phase:4, statuses:[6,7] },
  { id:'finalqc',     name:'Inspection Completed', shortName:'Final QC', formNum:'OM07-3', phase:4, statuses:[6,7] }
];
let _generatedForms = {};
let _wfToastTimer = null;

// ── Generic form drawer config — one entry per workflow form ──
const FORM_DRAWER_CONFIG = {
  disassemble: {
    title: 'Disassemble & Inspection — OM05-1',
    timestampId: 'wfDITimestamp',
    footer: [
      { label: 'Print Blank', cls: 'btn btn-outline', onclick: "printBlankDI()", title: 'Print a blank form for paper backup' },
      { type: 'spacer' },
      { label: 'Generate PDF', cls: 'btn btn-outline', onclick: "generateForm('disassemble')" },
      { label: '✓ Submit D&I', cls: 'btn', style: 'background:var(--success);color:#fff;font-weight:700', onclick: 'saveDIForm()' }
    ]
  },
  requisition: {
    title: 'Requisition for Approval — OM07-2',
    timestampId: 'wfReqTimestamp',
    footer: [
      { label: 'Print', cls: 'btn btn-outline', onclick: "printFormDocument('requisition')" },
      { label: 'Email to Customer', cls: 'btn btn-outline' },
      { label: 'Generate PDF', cls: 'btn btn-navy', onclick: "generateForm('requisition')" }
    ]
  },
  inspection: {
    title: 'Blank Inspection — OM07-3',
    timestampId: 'wfInspTimestamp',
    footer: [
      { label: 'Print', cls: 'btn btn-outline', onclick: "printFormDocument('inspection')" },
      { label: 'Email', cls: 'btn btn-outline' },
      { label: 'Generate PDF', cls: 'btn btn-navy', onclick: "generateForm('inspection')" }
    ]
  },
  picklist: {
    title: 'Repair Inventory Pick List — OM07-6',
    timestampId: 'wfPickTimestamp',
    footer: [
      { label: 'Print', cls: 'btn btn-outline', onclick: "printFormDocument('picklist')" },
      { label: 'Generate PDF', cls: 'btn btn-navy', onclick: "generateForm('picklist')" }
    ]
  },
  invoice: {
    title: 'Final Invoice',
    footer: [
      { label: 'Print & Generate', cls: 'btn btn-outline', onclick: "printFormDocument('invoice')" },
      { label: 'Email to AP', cls: 'btn btn-outline' },
      { label: 'Generate', cls: 'btn btn-navy', onclick: "generateForm('invoice')" }
    ]
  },
  packing: {
    title: 'Scope Return Verification (Packing Slip)',
    footer: [
      { label: 'Print & Generate', cls: 'btn btn-outline', onclick: "printFormDocument('packing')" },
      { label: 'Generate', cls: 'btn btn-navy', onclick: "generateForm('packing')" }
    ]
  },
  finalqc: {
    title: 'Inspection Completed (Final QC)',
    footer: [
      { label: 'Print & Generate', cls: 'btn btn-outline', onclick: "printFormDocument('finalqc')" },
      { label: 'Generate', cls: 'btn btn-navy', onclick: "generateForm('finalqc')" }
    ]
  }
};

function openFormDrawer(formId) {
  const cfg = FORM_DRAWER_CONFIG[formId];
  if (!cfg) return;

  // Set title
  document.getElementById('wfGenericTitle').textContent = cfg.title;

  // Timestamp: show and update if config has timestampId
  const tsEl = document.getElementById('wfGenericTimestamp');
  if (cfg.timestampId && _generatedForms[formId]) {
    tsEl.textContent = _generatedForms[formId];
    tsEl.style.display = '';
  } else {
    tsEl.textContent = '';
    tsEl.style.display = 'none';
  }

  // Build footer buttons
  const footer = document.getElementById('wfGenericFooter');
  footer.innerHTML = '';
  (cfg.footer || []).forEach(btn => {
    if (btn.type === 'spacer') {
      const sp = document.createElement('div');
      sp.style.flex = '1';
      footer.appendChild(sp);
    } else {
      const b = document.createElement('button');
      b.className = btn.cls || 'btn btn-outline';
      b.textContent = btn.label;
      if (btn.onclick) b.setAttribute('onclick', btn.onclick);
      if (btn.title) b.title = btn.title;
      if (btn.style) b.setAttribute('style', btn.style);
      footer.appendChild(b);
    }
  });

  // Populate body then open
  populateFormDrawer(formId);
  const drawer = document.getElementById('drawer-form-generic');
  if (drawer) {
    drawer.classList.add('open');
    drawer.scrollTop = 0;
  }
}

function getPhaseForStatus(statusId) {
  // Hardcoded from real tblRepairStatuses — sPhaseGroup is empty in DB
  var sid = Number(statusId);
  if (sid === 1 || sid === 3) return 1;                         // Intake: Waiting on Inspection, Drying Room
  if (sid === 5 || sid === 6 || sid === 19) return 2;           // Approval: Evaluation, Waiting for Approved, More Info
  if ([8,9,11,14,15,4,18,20,22].indexOf(sid) >= 0) return 3;   // In Repair: Minor/Major/Mid/Semi/Special/Outsourced/Parts Hold/Build/PO
  if ([21,10,12,13,16,17].indexOf(sid) >= 0) return 4;          // Shipping/Close: QC, Ship variants, Cart statuses
  return 1;
}

function updateWorkflowForms(statusId) {
  const currentPhase = getPhaseForStatus(statusId);
  WORKFLOW_FORMS.forEach(f => {
    const pill = document.getElementById('wf-' + f.id);
    if (!pill) return;
    pill.classList.remove('wf-locked', 'wf-available', 'wf-generated');
    if (_generatedForms[f.id]) {
      pill.classList.add('wf-generated');
      pill.title = f.name + ' — Generated ' + _generatedForms[f.id];
    } else if (f.phase <= currentPhase) {
      pill.classList.add('wf-available');
      pill.title = f.name + ' — Ready to generate';
    } else {
      pill.classList.add('wf-locked');
      pill.title = f.name + ' — Locked (status not reached)';
    }
  });
  // Hide Close phase entirely when all its pills are locked (phase 4 not reached)
  var closePhase = document.getElementById('wf-close-phase');
  var closeDivider = document.getElementById('wf-close-divider');
  if (closePhase && closeDivider) {
    var showClose = currentPhase >= 4;
    closePhase.style.display = showClose ? '' : 'none';
    closeDivider.style.display = showClose ? '' : 'none';
  }
}

function showWorkflowToast(message) {
  const toast = document.getElementById('wfToast');
  if (!toast) return;
  toast.textContent = message;
  toast.classList.add('show');
  if (_wfToastTimer) clearTimeout(_wfToastTimer);
  _wfToastTimer = setTimeout(() => toast.classList.remove('show'), 5000);
}

// ── Status map: document generation → status transition ──
const FORM_STATUS_MAP = {
  disassemble: 2,   // Received → Evaluation (D&I printed on intake)
  requisition: 3,   // Evaluation → Waiting for Approval
  inspection: 4,    // Waiting for Approval → In Repair
  picklist: null,    // No status change (same phase)
  amendment: null,   // Exception, no status change
  defect: null,      // Exception, no status change
  invoice: 6,        // Completed
  packing: 7,        // Shipped
  finalqc: null      // Same phase as invoice
};

async function generateForm(formId) {
  if (_generatedForms[formId]) return;

  // Block invoice generation if unresolved defects
  if (formId === 'invoice' && hasUnresolvedDefects()) {
    showWorkflowToast('Cannot generate invoice — unresolved QA defects');
    return;
  }

  const now = new Date();
  _generatedForms[formId] = now.toLocaleString();
  const form = WORKFLOW_FORMS.find(f => f.id === formId);

  // Advance status if mapped
  const targetStatus = FORM_STATUS_MAP[formId];
  if (targetStatus && _currentRepair) {
    _currentRepair.lRepairStatusID = targetStatus;
    setSelectVal_safe('hRepairStatus', targetStatus);
    updateWorkflowForms(targetStatus);

    // Try API status transition (non-blocking)
    if (_liveMode && _currentRepair.lRepairKey > 0) {
      try {
        await API.addRepairStatus({
          plRepairKey: _currentRepair.lRepairKey,
          plStatusKey: targetStatus,
          psTranComments: form.name + ' generated'
        });
      } catch(e) { console.warn('[TSI Repairs] Status transition not available:', e.message); }
      try {
        await API.updateRepair(buildRepairPayload());
      } catch(e) { console.warn('[TSI Repairs] UpdateRepair not available:', e.message); }
    }

    // Update status strip
    const statusName = getStatusName(targetStatus);
    const ssVal = document.querySelector('#ssStatus .ss-val');
    if (ssVal) ssVal.textContent = statusName || '—';
  } else {
    const statusId = _currentRepair ? (_currentRepair.lRepairStatusID || 1) : 1;
    updateWorkflowForms(statusId);
  }

  if (form) {
    showWorkflowToast(form.name + ' generated');
    addGeneratedFormDoc(form, now);
    try {
      generateFormPDF(formId);
    } catch(e) {
      console.error('[TSI] PDF generation error for', formId, e);
    }
    // Re-open the generic form drawer after generation (ensures it stays visible)
    const currentDrawer = document.getElementById('drawer-form-generic');
    if (currentDrawer) {
      requestAnimationFrame(() => currentDrawer.classList.add('open'));
    }
  }
}

function addGeneratedFormDoc(form, dt) {
  const tbody = document.getElementById('docBody');
  if (!tbody) return;
  const fileName = (form.formNum && form.formNum !== '—' ? form.formNum + '_' : '') + (_currentRepair ? _currentRepair.sWorkOrderNumber : 'WO') + '.pdf';
  const noDocsRow = tbody.querySelector('td[colspan]');
  if (noDocsRow) noDocsRow.parentElement.remove();
  const tr = document.createElement('tr');
  tr.innerHTML = '<td><span style="color:var(--navy);font-weight:600">\u{1F4C4}</span> ' + form.name + ' <span style="font-size:9px;color:var(--muted)">(' + fileName + ')</span></td>' +
    '<td>' + dt.toLocaleString() + '</td>' +
    '<td style="text-align:center"><button class="btn btn-outline" style="height:18px;font-size:8px;padding:0 6px" onclick="openFormPreview(\'' + form.id + '\')">View</button></td>' +
    '<td style="text-align:center"><span style="font-size:9px;color:var(--green);font-weight:600">Generated</span></td>';
  tbody.insertBefore(tr, tbody.firstChild);
}

// ═══════════════════════════════════════════════════════════════════
// PDF Form Generation — uses TSIExport helpers from export-utils.js
// ═══════════════════════════════════════════════════════════════════

/** Collect common form data from _currentRepair + lookups */
function collectFormData(r) {
  if (!r) r = {};
  const clientName = r.sShipName1 || r.sBillName1 || _clients.find(c => c.lClientKey == r.lClientKey)?.sClientName1 || '—';
  const deptName = r.sShipName2 || _departments.find(d => d.lDepartmentKey == r.lDepartmentKey)?.sDepartmentName || '—';
  const _rep = _salesReps.find(s => (s.lSalesRepNameKey || s.lSalesRepKey) == r.lSalesRepKey);
  const repName = _rep ? (_rep.sSalesRepName || [_rep.sRepFirst, _rep.sRepLast].filter(Boolean).join(' ') || '—') : '—';

  // Extract repair items from DOM table
  const items = (_repairItems || []).map(item => ({
    code: item.sTSICode || item.sRepairCode || '',
    desc: item.sItemDescription || item.sDescription || item.sRepairItem || '',
    uanwt: item.sUAorNWT || item.sUANWT || '',
    fixType: item.sFixType || item.sWNCA || '',
    approved: item.sApproved || '',
    amount: fmtMoney(item.dblRepairPrice || item.mAmount || item.dblAmount || 0),
    amountNum: parseFloat(item.dblRepairPrice || item.mAmount || item.dblAmount || 0),
    isBlind: item.bBlind === true || item.bBlind === 'Y',
    comments: item.sComments || ''
  }));

  return {
    r, clientName, deptName, repName, items,
    wo: r.sWorkOrderNumber || 'WO',
    serial: r.sSerialNumber || '—',
    model: r.sScopeTypeDesc || '—',
    dateIn: TSIExport.fmtDate(r.dtDateIn),
    rack: r.sRackPosition || 'N/A',
    type: r.sRigidOrFlexible || '—',
    complaint: r.sComplaintDesc || '(none)',
    visibleItems: items.filter(i => !i.isBlind),
    allItems: items
  };
}

/** Build PDF filename: FormNum_WO.pdf */
function pdfFileName(formId) {
  const form = WORKFLOW_FORMS.find(f => f.id === formId);
  const wo = _currentRepair ? _currentRepair.sWorkOrderNumber : 'WO';
  const prefix = (form && form.formNum && form.formNum !== '—') ? form.formNum + '_' : '';
  return prefix + wo + '.pdf';
}

/** Dispatch to the correct form builder */
function generateFormPDF(formId) {
  if (!window.TSIExport) { console.warn('TSIExport not loaded'); return; }
  const d = collectFormData(_currentRepair);
  try {
    switch (formId) {
      case 'disassemble': buildDIPdf(d); break;
      case 'requisition': buildRequisitionPdf(d); break;
      case 'inspection':  buildInspectionPdf(d); break;
      case 'picklist':    buildPickListPdf(d); break;
      case 'invoice':     buildInvoicePdf(d); break;
      case 'packing':     buildPackingPdf(d); break;
      case 'finalqc':     buildFinalQCPdf(d); break;
      case 'fortyDay':    buildFortyDayPdf(d); break;
      case 'defect':      buildDefectPdf(d); break;
      default: console.warn('No PDF builder for form:', formId);
    }
  } catch (e) {
    console.error('[TSI PDF] Error generating', formId, e);
    showWorkflowToast('PDF generation failed — see console');
  }
}

// ── D&I (Disassemble & Inspection) ──────────────────────────────
function buildDIPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const form = WORKFLOW_FORMS.find(f => f.id === 'disassemble');
  let y = E.addTSIHeader(doc, 'Disassemble & Inspection', form.formNum);

  y = E.addKeyValueGrid(doc, [
    ['Client', d.clientName], ['W.O. #', d.wo],
    ['Department', d.deptName], ['Serial #', d.serial],
    ['Model', d.model], ['Date In', d.dateIn],
    ['Rack #', d.rack], ['Type', d.type]
  ], y);

  // Customer type / pricing
  const r = d.r;
  doc.setFontSize(8); doc.setFont('helvetica','normal'); doc.setTextColor(E.COLORS.steel);
  doc.text('Customer Type: ' + (r.lPricingCategoryKey === 4 ? 'CAP' : 'FFS') + '    Scope Type: ' + d.model + '    Rack #: ' + d.rack, E.PAGE.margin, y);
  y += 14;

  y = E.addSectionLabel(doc, 'Customer Perceived Problems', y);
  y = E.addParagraph(doc, d.complaint, y);

  y = E.addSectionLabel(doc, 'Accessories Received', y);
  y = E.addCheckboxRows(doc, [
    { label: 'ETO Cap', checked: r.sIncludesCapYN === 'Y' },
    { label: 'A/W Button', checked: true },
    { label: 'Suction Button', checked: true },
    { label: 'Water Cap', checked: r.sIncludesWaterResCapYN === 'Y' },
    { label: 'Biopsy Valve', checked: false },
    { label: 'Light Post Adapter', checked: false }
  ], y, 3);

  y = E.addSectionLabel(doc, 'Items in Need of Repair', y);
  const itemRows = d.allItems.map(i => [i.code, i.desc]);
  if (itemRows.length) {
    y = E.addTable(doc, ['Item', 'Description / Finding'], itemRows, y);
  } else {
    y = E.addParagraph(doc, 'No items', y, { color: E.COLORS.steel });
  }

  y = E.addSectionLabel(doc, 'Comments', y);
  y = E.addParagraph(doc, r.mCommentsDisIns || '(none)', y);

  E.savePDF(doc, pdfFileName('disassemble'));
}

// ── Requisition for Approval ────────────────────────────────────
function buildRequisitionPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const form = WORKFLOW_FORMS.find(f => f.id === 'requisition');
  const r = d.r;
  const m = E.PAGE.margin;
  const rightX = E.PAGE.w - m;

  // ── Header: full-width navy band ──
  const BAND_H = 72;
  const LOGO_W = 52;
  doc.setFillColor(E.COLORS.navy);
  doc.rect(0, 0, E.PAGE.w, BAND_H, 'F');

  // White logo left (centered vertically in band)
  if (E.hasLogo()) {
    const logoH = E.addLogoImage(doc, 18, (BAND_H - LOGO_W) / 2, LOGO_W);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(E.COLORS.white);
    doc.text(E.COMPANY.name, 18, BAND_H / 2 + 6);
  }

  // Right side: form title in white, meta in light blue
  const reqDate = r.dtReqSent ? E.fmtDate(r.dtReqSent) : E.fmtDate(new Date());
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(E.COLORS.white);
  doc.text('Service Estimate', E.PAGE.w - 18, 30, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(E.COLORS.estAccent);
  doc.text('W.O. # ' + (r.sWorkOrderNumber || '—') + '   •   ' + reqDate, E.PAGE.w - 18, 46, { align: 'right' });

  if (form.formNum && form.formNum !== '—') {
    doc.setFontSize(8);
    doc.text('Form ' + form.formNum, E.PAGE.w - 18, 58, { align: 'right' });
  }

  let y = BAND_H + 14;

  // ── Bill To / Ship To / Equipment (3-column) ──
  const billDept = _departments.find(dept => dept.lDepartmentKey == r.lDepartmentKey) || {};
  const billName = billDept.sBillName1 || r.sShipName1 || d.clientName || '—';

  const addrY = y;
  const colW = Math.floor(E.PAGE.contentW / 3);  // ~180pt per column
  const col1 = m, col2 = m + colW, col3 = m + colW * 2;
  const addrMaxW = colW - 10;  // 10pt gutter

  // Bill To
  y = E.addAddressBlock(doc, 'BILL TO:', {
    name:  billName,
    attn:  billDept.sBillName2 || '',
    addr1: billDept.sBillAddr1 || billDept.sMailAddr1 || '',
    addr2: billDept.sBillAddr2 || '',
    city:  billDept.sBillCity  || billDept.sMailCity || '',
    state: billDept.sBillState || billDept.sMailState || '',
    zip:   billDept.sBillZip   || billDept.sMailZip || ''
  }, col1, addrY, addrMaxW);

  // Ship To
  const shipY = E.addAddressBlock(doc, 'SHIP TO:', {
    name:  r.sShipName1 || '—',
    attn:  r.sShipName2 || '',
    addr1: r.sShipAddr1 || '',
    addr2: r.sShipAddr2 || '',
    city:  r.sShipCity  || '',
    state: r.sShipState || '',
    zip:   r.sShipZip   || ''
  }, col2, addrY, addrMaxW);

  // Equipment info (right column)
  const eqX = col3;
  let eqY = addrY;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.setTextColor(E.COLORS.navy);
  doc.text('EQUIPMENT:', eqX, eqY);
  eqY += 12;

  const equipFields = [
    ['Mfr', r.sManufacturer || '—'],
    ['Model', r.sScopeTypeDesc || d.model || '—'],
    ['Serial #', r.sSerialNumber || '—'],
    ['P.O. #', r.sPurchaseOrder || r.sPONumber || '—'],
    ['Terms', (() => { const pt = _paymentTerms.find(x => x.lPaymentTermsKey == r.lPaymentTermsKey); return pt ? (pt.sPaymentTerms || pt.sTermsDesc) : 'Net 30'; })()]
  ];
  doc.setFontSize(8);
  equipFields.forEach(([lbl, val]) => {
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(E.COLORS.steel);
    doc.text(lbl, eqX, eqY);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(E.COLORS.black);
    doc.text(String(val), eqX + 48, eqY);
    eqY += 11;
  });

  y = Math.max(y, shipY, eqY) + 6;

  // ── Customer Reported Issue ──
  y = E.addSectionLabel(doc, 'Customer Reported Issue', y);
  y = E.addParagraph(doc, d.complaint || 'No complaint description provided.', y);

  // Diagnosis line (primary failure, repair level, damage assessment)
  const reason = _repairReasons.find(x => x.lRepairReasonKey == r.lRepairReasonKey);
  const level = _levels.find(x => x.lRepairLevelKey == r.lRepairLevelKey);
  const hasUA = d.visibleItems.some(i => i.uanwt === 'UA');
  const hasNWT = d.visibleItems.some(i => i.uanwt === 'N' || i.uanwt === 'NWT');
  if (reason || level || hasUA || hasNWT) {
    doc.setFontSize(8);
    let dx = m;
    if (reason) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(E.COLORS.steel);
      doc.text('Primary Failure:', dx, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(E.COLORS.black);
      doc.text(reason.sRepairReason, dx + 72, y);
      dx += 190;
    }
    if (level) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(E.COLORS.steel);
      doc.text('Classification:', dx, y);
      doc.setFont('helvetica', 'bold'); doc.setTextColor(E.COLORS.black);
      doc.text(level.sRepairLevel, dx + 65, y);
      dx += 160;
    }
    if (hasUA || hasNWT) {
      doc.setFont('helvetica', 'normal'); doc.setTextColor(E.COLORS.steel);
      doc.text('Damage:', dx, y);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(hasUA ? '#B91C1C' : '#166534');
      doc.text(hasUA ? 'Avoidable Damage' : 'Normal Wear & Tear', dx + 40, y);
    }
    y += 14;
  }

  // ── Scope of Repair table ──
  y = E.addSectionLabel(doc, 'Scope of Repair', y);

  // Scope type detection
  const scopeType = (r.sRigidOrFlexible || '').charAt(0).toUpperCase();
  const isFlexible = scopeType === 'F';
  const isRigid = scopeType === 'R' || scopeType === 'C';
  const isInstrument = scopeType === 'I' || !scopeType;
  const isContract = !!(r.lContractKey);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(E.COLORS.steel);
  doc.text('Based on our diagnostic inspection, we recommend the following repairs:', m, y);
  y += 12;

  // Contract banner
  if (isContract) {
    y = E.checkPageBreak(doc, y, 20);
    doc.setFillColor('#EFF6FF');
    doc.rect(m, y - 8, E.PAGE.contentW, 16, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor('#1D4ED8');
    doc.text('Covered Under Service Agreement', E.PAGE.w / 2, y + 1, { align: 'center' });
    y += 16;
  }

  // Filter: hide blind/internal items and discount adjustments — keep Diagnostic Inspection
  // Sort: Diagnostic Inspection first, rest alphabetical (matches HTML preview)
  const allItems = d.visibleItems
    .filter(i => !(i.code || '').startsWith('ZZ') && !(i.desc || '').includes('Discount Adjustment'));
  const diItems = allItems.filter(i => (i.desc || '').toLowerCase().includes('diagnostic inspection'));
  const otherItems = allItems.filter(i => !(i.desc || '').toLowerCase().includes('diagnostic inspection'))
    .sort((a, b) => (a.desc || '').localeCompare(b.desc || ''));
  const reqItems = [...diItems, ...otherItems];

  // Helper: parse currency amount from item
  const itemAmt = i => parseFloat((i.amount || '0').toString().replace(/[^0-9.-]/g, '')) || 0;
  const fmtCur = v => '$' + v.toFixed(2);

  if (isFlexible) {
    // Flexible: Repair / Description / Approved
    const rows = reqItems.map(i => {
      const name = (i.desc || '').replace(/^!+/, '').trim();
      const approved = i.approved === 'Y' ? 'Y' : i.approved === 'N' ? 'N' : '—';
      return [name, i.comments || '', approved];
    });
    y = E.addTable(doc, ['Repair', 'Description', 'Approved'], rows, y, {
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 200 },
        1: { fontSize: 7, fontStyle: 'italic', textColor: E.COLORS.steel },
        2: { halign: 'center', cellWidth: 55, fontSize: 8 }
      }
    });
    // Angulation specs
    if (r.sAngInUp || r.sAngInDown || r.sAngInRight || r.sAngInLeft) {
      y = E.checkPageBreak(doc, y, 30);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(E.COLORS.navy);
      doc.text('Angulation:', m, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(E.COLORS.black);
      doc.text('Up ' + (r.sAngInUp || 'N/A') + '\u00B0 / Down ' + (r.sAngInDown || 'N/A') + '\u00B0 / Right ' + (r.sAngInRight || 'N/A') + '\u00B0 / Left ' + (r.sAngInLeft || 'N/A') + '\u00B0', m + 55, y);
      y += 11;
      doc.setTextColor(E.COLORS.steel);
      doc.text('Should Be: Up 210\u00B0 / Down 180\u00B0 / Right 160\u00B0 / Left 160\u00B0', m + 55, y);
      y += 11;
    }
    // Broken fibers
    if (r.nBrokenFibers !== undefined && r.nBrokenFibers !== null) {
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(E.COLORS.navy);
      doc.text('Broken Fibers:', m, y);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(E.COLORS.black);
      doc.text(String(r.nBrokenFibers || 'N/A'), m + 70, y);
      y += 12;
    }
  } else if (isRigid) {
    // Rigid/Camera: Repair / Description / Cost / Approved — with !! and ! grouping
    const rows = reqItems.map(i => {
      const raw = (i.desc || '');
      const isPackage = raw.startsWith('!!');
      const isIncluded = raw.startsWith('!') && !raw.startsWith('!!');
      const name = raw.replace(/^!+/, '').trim();
      const displayName = isIncluded ? '    ' + name : name;
      const cost = isContract ? '$0.00' : isIncluded ? 'Included' : fmtCur(itemAmt(i));
      const approved = i.approved === 'Y' ? 'Y' : i.approved === 'N' ? 'N' : '—';
      return { cells: [displayName, i.comments || '', cost, approved], bold: isPackage };
    });
    const tableRows = rows.map(r => r.cells);
    y = E.addTable(doc, ['Repair', 'Description', 'Cost', 'Approved'], tableRows, y, {
      columnStyles: {
        0: { fontStyle: 'bold', cellWidth: 170 },
        1: { fontSize: 7, fontStyle: 'italic', textColor: E.COLORS.steel },
        2: { halign: 'right', cellWidth: 60 },
        3: { halign: 'center', cellWidth: 50, fontSize: 8 }
      }
    });
  } else {
    // Instrument (I or empty): Qty / Description / Rate / Amount / Approved
    const rows = reqItems.map(i => {
      const name = (i.desc || '').replace(/^!+/, '').trim();
      const qty = parseInt(i.qty) || 1;
      const amt = isContract ? 0 : itemAmt(i);
      const rate = qty > 0 ? amt / qty : amt;
      const approved = i.approved === 'Y' ? 'Y' : i.approved === 'N' ? 'N' : '—';
      return [String(qty), name, isContract ? '$0.00' : fmtCur(rate), isContract ? '$0.00' : fmtCur(amt), approved];
    });
    y = E.addTable(doc, ['Qty', 'Description', 'Rate', 'Amount', 'Approved'], rows, y, {
      columnStyles: {
        0: { halign: 'center', cellWidth: 35 },
        1: { fontStyle: 'bold', cellWidth: 170 },
        2: { halign: 'right', cellWidth: 60 },
        3: { halign: 'right', cellWidth: 60 },
        4: { halign: 'center', cellWidth: 50, fontSize: 8 }
      }
    });
  }

  // ── Totals ──
  const itemSum = reqItems.reduce((sum, i) => sum + (parseFloat((i.amount || '0').toString().replace(/[^0-9.-]/g, '')) || 0), 0);
  const subTotal = parseFloat(r.dblAmtRepair) || itemSum;
  const shipping = parseFloat(r.dblAmtShipping) || 0;
  const tax = parseFloat(r.dblAmtTax) || 0;
  const actualTotal = subTotal + shipping + tax;

  if (isContract) {
    y = E.addTotalsBlock(doc, {
      subtotal:   0,
      shipping:   0,
      taxes:      [{ name: '', amt: 0 }],
      grandTotal: 0
    }, y);
    // Show what it would have cost
    y = E.checkPageBreak(doc, y, 16);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'italic');
    doc.setTextColor(E.COLORS.steel);
    doc.text('Non-Contract Cost: ' + fmtCur(actualTotal), E.PAGE.w - m, y, { align: 'right' });
    y += 14;
  } else {
    y = E.addTotalsBlock(doc, {
      subtotal:   subTotal,
      shipping:   shipping,
      taxes:      [{ name: '', amt: tax }],
      grandTotal: actualTotal
    }, y);
  }

  // ── Disclaimer ──
  y = E.checkPageBreak(doc, y, 40);
  y = E.addParagraph(doc, 'This estimate is based on our initial inspection. As the scope is disassembled further, additional repair items may be identified that could require an adjustment to this estimate. We will contact you before proceeding with any work beyond the scope of this estimate.', y, { fontSize: 8, color: E.COLORS.steel });

  // ── Approval & Footer ──
  y = E.checkPageBreak(doc, y, 60);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(E.COLORS.black);
  doc.text('To approve, log in to your TSI Customer Portal or contact us:', m, y);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(E.COLORS.navy);
  doc.text('ops-tsi@totalscopeinc.com  •  800-471-2255', m, y + 12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(E.COLORS.steel);
  doc.text('Prepared by: ' + d.repName, m, y + 24);
  y += 38;

  // Signature lines
  y = E.addSignatureBlock(doc, [
    'Signature (optional)',
    'Date',
    'Printed Name / Title'
  ], y);

  E.savePDF(doc, pdfFileName('requisition'));
}

// ── Blank Inspection ────────────────────────────────────────────
function buildInspectionPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const form = WORKFLOW_FORMS.find(f => f.id === 'inspection');
  const r = d.r;
  let y = E.addTSIHeader(doc, 'Blank Inspection', form.formNum);

  y = E.addKeyValueGrid(doc, [
    ['Client', d.clientName], ['W.O. #', d.wo],
    ['Department', d.deptName], ['Serial #', d.serial],
    ['Model', d.model], ['Date In', d.dateIn],
    ['Rack #', d.rack], ['Type', d.type]
  ], y);

  y = E.addSectionLabel(doc, 'Complaint', y);
  y = E.addParagraph(doc, d.complaint, y);

  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(E.COLORS.black);
  doc.text('Customer Expected Delivery Date: ' + E.fmtDate(r.dtExpDelDate), E.PAGE.margin, y);
  y += 16;

  y = E.addSectionLabel(doc, 'Items Found to Be in Need of Repair', y);
  const foundRows = d.allItems.map(i => [i.desc, i.code]);
  if (foundRows.length) {
    y = E.addTable(doc, ['Repair Item', 'Reason / Finding'], foundRows, y);
  } else {
    y = E.addParagraph(doc, 'No items', y, { color: E.COLORS.steel });
  }

  y = E.addSectionLabel(doc, 'Items Approved and Repaired', y);
  const approvedRows = d.allItems.filter(i => i.approved === 'Y').map(i => [i.desc, '________']);
  if (approvedRows.length) {
    y = E.addTable(doc, ['Repair Item', 'Repaired By'], approvedRows, y, {
      columnStyles: { 1: { halign: 'center', cellWidth: 80 } }
    });
  } else {
    y = E.addParagraph(doc, 'No approved items', y, { color: E.COLORS.steel });
  }

  E.savePDF(doc, pdfFileName('inspection'));
}

// ── Pick List ───────────────────────────────────────────────────
function buildPickListPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const form = WORKFLOW_FORMS.find(f => f.id === 'picklist');
  let y = E.addTSIHeader(doc, 'Repair Inventory Pick List', form.formNum);

  y = E.addKeyValueGrid(doc, [
    ['Client', d.clientName], ['W.O. #', d.wo],
    ['Department', d.deptName], ['Serial #', d.serial],
    ['Model', d.model], ['Date In', d.dateIn],
    ['Rack #', d.rack], ['Type', d.type]
  ], y);

  // Pull inventory data from the pick list drawer DOM if populated
  const pickBody = document.getElementById('wfGenericBody');
  const invRows = [];
  if (pickBody) {
    const trs = pickBody.querySelectorAll('table.wf-items-table tbody tr');
    trs.forEach(tr => {
      const cells = tr.querySelectorAll('td');
      if (cells.length === 4) {
        invRows.push([
          cells[0]?.textContent?.trim() || '',
          cells[1]?.textContent?.trim() || '',
          cells[2]?.textContent?.trim() || '',
          cells[3]?.textContent?.trim() || ''
        ]);
      } else if (cells.length === 1) {
        // Group header row
        invRows.push([{ content: cells[0].textContent.trim(), colSpan: 4, styles: { fontStyle: 'bold', fillColor: E.COLORS.bg } }]);
      }
    });
  }

  y = E.addSectionLabel(doc, 'Inventory Items', y);
  if (invRows.length) {
    y = E.addTable(doc, ['Item', 'Size', 'Lot Number', 'Qty'], invRows, y, {
      columnStyles: { 3: { halign: 'center', cellWidth: 40 } }
    });
  } else {
    y = E.addParagraph(doc, 'No inventory items', y, { color: E.COLORS.steel });
  }

  E.savePDF(doc, pdfFileName('picklist'));
}

// ── Invoice ─────────────────────────────────────────────────────
async function buildInvoicePdf(d) {
  const r = d.r;

  // Fetch invoice from Express API
  let inv = null;
  let details = [];
  try {
    const invoices = await API.getInvoicesByRepair(r.lRepairKey) || [];
    inv = invoices[0] || null;
    if (inv) {
      details = await API.getInvoiceDetails(inv.lInvoiceKey) || [];
    }
  } catch(e) {
    console.warn('[repairs] Could not load invoice data:', e.message);
  }

  // Fall back: build a synthetic invoice record from repair data
  if (!inv) {
    inv = {
      sTranNumber:    r.sInvoiceNumber || r.sWorkOrderNumber || '',
      dtTranDate:     r.dtDateShipped || new Date(),
      dtDueDate:      null,
      dtAprRecvd:     r.dtApprovalDate || null,
      sPurchaseOrder: r.sPurchaseOrder || '',
      sUnderContract: r.sUnderContract || '',
      dblTranAmount:  parseFloat(r.mMaxCharge) || 0,
      dblShippingAmt: parseFloat(r.dblAmtShipping) || 0,
      dblJuris1Name: '', dblJuris1Pct: 0, dblJuris1Amt: 0,
      dblJuris2Name: '', dblJuris2Pct: 0, dblJuris2Amt: 0,
      dblJuris3Name: '', dblJuris3Pct: 0, dblJuris3Amt: 0,
      sBillName1: r.sBillName1 || '', sBillName2: r.sBillName2 || '',
      sBillAddr1: r.sBillAddr1 || '', sBillAddr2: r.sBillAddr2 || '',
      sBillCity:  r.sBillCity  || '', sBillState: r.sBillState || '', sBillZip: r.sBillZip || '',
      sShipName1: r.sShipName1 || '', sShipName2: r.sShipName2 || '',
      sShipAddr1: r.sShipAddr1 || '', sShipAddr2: r.sShipAddr2 || '',
      sShipCity:  r.sShipCity  || '', sShipState: r.sShipState || '', sShipZip: r.sShipZip || '',
      lClientKey: r.lClientKey || '',
      bIsVoid:    false
    };
    // Build detail rows from repair items
    details = d.visibleItems.map(i => ({
      sItemDescription: i.desc,
      dblItemAmount: parseFloat((i.amount || '').replace(/[^0-9.-]/g, '')) || 0
    }));
  }

  // Resolve salesperson name
  let salesperson = d.repName || '';
  if (!salesperson && _salesReps && _salesReps.length) {
    const rep = _salesReps.find(s => s.lSalesRepKey === (r.lSalesRepNameKey || r.lSalesRepKey));
    if (rep) salesperson = ((rep.sRepFirst || '') + ' ' + (rep.sRepLast || '')).trim();
  }

  TSIExport.buildInvoicePdf(inv, details, {
    repair:       r,
    salesperson:  salesperson,
    shipVia:      r.sDeliveryMethod || '',
    paymentTerms: ''
  });
}

// ── Packing Slip (Scope Return Verification) ────────────────────
function buildPackingPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const r = d.r;
  let y = E.addTSIHeader(doc, 'Scope Return Verification', '');

  // Ship-to address
  y = E.addAddressBlock(doc, 'Ship To', {
    name: r.sShipName1 || '',
    attn: r.sShipAttention || r.sShipName2 || '',
    addr1: r.sShipAddr1 || '',
    addr2: r.sShipAddr2 || '',
    city: r.sShipCity || '',
    state: r.sShipState || '',
    zip: r.sShipZip || ''
  }, E.PAGE.margin, y);

  y = E.addSectionLabel(doc, 'Scope Details', y);
  y = E.addKeyValueGrid(doc, [
    ['Model', d.model], ['Serial #', d.serial],
    ['Type', d.type], ['Work Order', d.wo]
  ], y);

  y = E.addSectionLabel(doc, 'Accessories Included', y);
  const acc = [];
  if (r.sIncludesCaseYN === 'Y') acc.push({ label: 'Case', checked: true });
  if (r.sIncludesCapYN === 'Y') acc.push({ label: 'Cap', checked: true });
  if (r.sIncludesWaterResCapYN === 'Y') acc.push({ label: 'Water Res Cap', checked: true });
  if (r.sIncludesVideoPlugYN === 'Y') acc.push({ label: 'Video Plug', checked: true });
  if (r.sIncludesMouthpieceYN === 'Y') acc.push({ label: 'Mouthpiece', checked: true });
  if (r.sIncludesAngleKnobYN === 'Y') acc.push({ label: 'Angle Knob', checked: true });
  if (acc.length) {
    y = E.addCheckboxRows(doc, acc, y, 3);
  } else {
    y = E.addParagraph(doc, 'No accessories listed', y, { color: E.COLORS.steel });
  }

  // Note
  y = E.checkPageBreak(doc, y, 30);
  y = E.addParagraph(doc, 'Note: This document does not include pricing information. For billing details refer to the Final Invoice.', y, { fontSize: 8, color: E.COLORS.steel });

  E.savePDF(doc, pdfFileName('packing'));
}

// ── Final QC (Inspection Completed) ─────────────────────────────
function buildFinalQCPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const form = WORKFLOW_FORMS.find(f => f.id === 'finalqc');
  const r = d.r;
  let y = E.addTSIHeader(doc, 'Final Inspection', form.formNum);

  y = E.addKeyValueGrid(doc, [
    ['Client', d.clientName], ['W.O. #', d.wo],
    ['Department', d.deptName], ['Serial #', d.serial],
    ['Model', d.model], ['Date In', d.dateIn],
    ['Rack #', d.rack], ['Type', d.type]
  ], y);

  // Pass/Fail inspection grid — 6 categories matching renderInspectionCategories
  const categories = [
    { name: 'IMAGE ACCEPTABLE', items: [
      { label: 'Image is Clear and In focus' },
      { label: 'Image is Round and clear to edge' },
      { label: 'Image is free of contamination' },
      { label: 'Image Lens system is secure' }
    ]},
    { name: 'EYEPIECE/OCULAR ACCEPTABLE', items: [
      { label: 'Eyepiece Color' },
      { label: 'Eyepiece condition' },
      { label: 'Eyepiece window' },
      { label: 'Eyepiece glue seal' },
      { label: 'Ocular Lens (Intact and Clean)' }
    ]},
    { name: 'TUBING ACCEPTABLE', items: [
      { label: 'Insertion Tube Connection to Body' },
      { label: 'Tubing Finish' },
      { label: 'Insertion Tube' },
      { label: 'Insertion Tube Damage to Plating' },
      { label: 'Insertion Tube Tip' }
    ]},
    { name: 'BODY/NOSECONE/LIGHT POST ACCEPTABLE', items: [
      { label: 'ID Band in tact and proper color' },
      { label: 'Body condition' },
      { label: 'Nosecone condition' },
      { label: 'Glue/Solder Seals Intact' },
      { label: 'Light Post condition' },
      { label: 'Model # Clear and Visible' },
      { label: 'Light Post and Tip Angle in Alignment' }
    ]},
    { name: 'OBJECTIVE/DISTAL END ACCEPTABLE', items: [
      { label: 'Window (Intact and Clear)' },
      { label: 'Negative Lens (Intact and Clear)' },
      { label: 'Objective System (Intact and secure)' },
      { label: 'Free of Dust, Dirt and Fluid' }
    ]},
    { name: 'LIGHT FIBERS ACCEPTABLE', items: [
      { label: 'Color of Light at tip and Post acceptable' },
      { label: 'Fibers Intact and not loose' },
      { label: 'Fiber Glue Intact and Sealed' }
    ]}
  ];
  y = E.addPassFailGrid(doc, categories, y);

  // Outgoing angulation
  y = E.checkPageBreak(doc, y, 50);
  y = E.addSectionLabel(doc, 'Outgoing Angulation', y);
  y = E.addKeyValueGrid(doc, [
    ['Up', r.sAngOutUp || '—'], ['Down', r.sAngOutDown || '—'],
    ['Right', r.sAngOutRight || '—'], ['Left', r.sAngOutLeft || '—']
  ], y);

  // Broken fibers / epoxy
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(E.COLORS.black);
  doc.text('Broken Fibers Out: ' + (r.sBrokenFibersOut || '—') + '    Epoxy Size: ' + (r.nOutgoingEpoxySize || '—') + '    Max Epoxy: ' + (r.sMaxEpoxy || '—'), E.PAGE.margin, y);
  y += 16;

  // Leak tester data
  y = E.addSectionLabel(doc, 'Leak Tester Data', y);
  y = E.addKeyValueGrid(doc, [
    ['Tester S/N', r.sLeakTesterSN || '—'], ['Version', r.sLeakTesterVersion || '—'],
    ['Date/Time', E.fmtDate(r.dtLeakTestDate)], ['Serial Number', d.serial],
    ['Run ID', r.sLeakRunID || '—'], ['Test Duration', r.sLeakDuration || '—'],
    ['Leak Result', r.sLeakResult || '—'], ['Fluid Result', r.sFluidResult || '—']
  ], y);

  // Scope includes
  y = E.addSectionLabel(doc, 'Scope Includes', y);
  y = E.addCheckboxRows(doc, [
    { label: 'ETO Cap', checked: r.sIncludesCapYN === 'Y' },
    { label: 'Air/Water Valve', checked: true },
    { label: 'Water Proof Cap', checked: r.sIncludesWaterResCapYN === 'Y' },
    { label: 'Case', checked: r.sIncludesCaseYN === 'Y' },
    { label: 'Rim Cap', checked: false },
    { label: 'Suction Valve', checked: true },
    { label: 'Light Post Adapter', checked: false },
    { label: 'Box', checked: false }
  ], y, 3);

  // QC Sign-off
  y = E.addSectionLabel(doc, 'Commercial Q.C. Sign-Off', y);
  doc.setFontSize(9); doc.setFont('helvetica','normal'); doc.setTextColor(E.COLORS.black);
  doc.text('Date of Commercial Q.C.: ' + E.fmtDate(new Date()), E.PAGE.margin, y); y += 13;
  doc.text('Scope has passed Final Inspection.', E.PAGE.margin, y); y += 16;

  y = E.addSignatureBlock(doc, [
    'QC Technician Initials',
    'Reviewer',
    'Inspected By',
    'Date'
  ], y);

  E.savePDF(doc, pdfFileName('finalqc'));
}

// ── 40-Day Warranty Evaluation (OM06-2) ─────────────────────────
function buildFortyDayPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  const r = d.r;
  let y = E.addTSIHeader(doc, 'Recent Repair — 40-Day Warranty Evaluation', 'OM06-2');

  // Repair identification grid
  y = E.addKeyValueGrid(doc, [
    ['Client',            d.clientName],           ['Department',  d.deptName],
    ['Model',             d.model],                ['Serial #',    d.serial],
    ['Current W.O. #',    d.wo],                   ['Date',        E.fmtDate(new Date())],
    ['Prior W.O. #',      document.getElementById('fd-priorWO')?.textContent?.trim() || '—'],
    ['Days Since Last In', document.getElementById('fd-daysSince')?.textContent?.trim() || '—']
  ], y);

  // Customer complaint
  y = E.addSectionLabel(doc, 'Customer Complaint', y);
  y = E.addParagraph(doc, d.complaint, y);

  // Section 1: Technician evaluation
  y = E.addSectionLabel(doc, 'Section 1 — Technician Evaluation', y);
  const causeVal = document.querySelector('input[name="fortyDayCause"]:checked')?.value || '';
  const causeLabel = causeVal === 'yes' ? 'Yes — result of improper care/handling by customer'
                   : causeVal === 'no'  ? 'No — not due to customer handling'
                   : causeVal === 'unknown' ? 'Cannot determine — further inspection needed'
                   : '(not selected)';

  y = E.addCheckboxRows(doc, [
    { label: 'Is the complaint a result of improper care or handling by the customer?', checked: false }
  ], y, 1);
  doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor(E.COLORS.navy);
  doc.text('Answer: ' + causeLabel, E.PAGE.margin + 8, y);
  y += 16;

  const techNotes = document.getElementById('fd-techNotes')?.value?.trim() || '';
  if (techNotes) {
    y = E.addKeyValueGrid(doc, [['Technician Notes', techNotes]], y);
  }

  // Section 2: Lab Manager failure codes
  y = E.checkPageBreak(doc, y, 80);
  y = E.addSectionLabel(doc, 'Section 2 — Lab Manager Failure Code Determination', y);

  const FAILURE_CODES = [
    { id: 'fc1', label: 'Result of improper care and handling', nc: false },
    { id: 'fc2', label: 'Part failure unrelated to previous repairs', nc: false },
    { id: 'fc3', label: 'Cosmetic issue unrelated to previous repairs', nc: false },
    { id: 'fc4', label: 'Improper repair technique (NONCONFORMANCE)', nc: true },
    { id: 'fc5', label: 'Failure during previous final inspection (NONCONFORMANCE)', nc: true },
    { id: 'fc6', label: 'Failure related to previous repairs', nc: false },
    { id: 'fc7', label: 'Unable to duplicate customer complaint', nc: false },
    { id: 'fc8', label: 'No repairs were performed previously', nc: false },
    { id: 'fc9', label: 'Other', nc: false }
  ];

  const codeItems = FAILURE_CODES.map((fc, i) => ({
    label: (i + 1) + '. ' + fc.label,
    checked: document.getElementById(fc.id)?.checked || false
  }));
  y = E.addCheckboxRows(doc, codeItems, y, 1);

  // NC alert if codes 4 or 5 checked
  const nc4 = document.getElementById('fc4')?.checked;
  const nc5 = document.getElementById('fc5')?.checked;
  if (nc4 || nc5) {
    y = E.checkPageBreak(doc, y, 24);
    doc.setFillColor('#FEE2E2'); doc.setDrawColor('#FECACA');
    doc.roundedRect(E.PAGE.margin, y, E.PAGE.contentW, 20, 3, 3, 'FD');
    doc.setFontSize(10); doc.setFont('helvetica', 'bold'); doc.setTextColor('#991B1B');
    doc.text('⚠  Nonconformance write-up required — failure code ' + [nc4 && '4', nc5 && '5'].filter(Boolean).join(' and ') + ' selected.', E.PAGE.margin + 8, y + 13);
    y += 28;
  }

  const labNotes = document.getElementById('fd-labNotes')?.value?.trim() || '';
  if (labNotes) {
    y = E.addKeyValueGrid(doc, [['Lab Manager Notes', labNotes]], y);
  }

  // Signature block
  const labMgrEl = document.getElementById('fd-labManager');
  const labMgrName = labMgrEl?.options[labMgrEl.selectedIndex]?.text || '';
  const evalDate = document.getElementById('fd-evalDate')?.value || '';
  y = E.checkPageBreak(doc, y, 60);
  y = E.addSignatureBlock(doc, [
    'Lab Manager: ' + (labMgrName || '________________'),
    'Date Evaluated: ' + (evalDate || '________________')
  ], y);

  E.savePDF(doc, pdfFileName('fortyDay'));
}

// ── Defect Tracking (OM07-8) ─────────────────────────────────────
function buildDefectPdf(d) {
  const E = TSIExport;
  const doc = E.createPDF();
  let y = E.addTSIHeader(doc, 'Defect Tracking', 'OM07-8');

  y = E.addKeyValueGrid(doc, [
    ['Client',     d.clientName], ['W.O. #',   d.wo],
    ['Department', d.deptName],   ['Serial #', d.serial],
    ['Model',      d.model],      ['Date',     E.fmtDate(new Date())]
  ], y);

  // Defect history from the table
  y = E.addSectionLabel(doc, 'Defect History', y);
  const rows = [];
  const trs = document.querySelectorAll('#defectsBody tr');
  trs.forEach(tr => {
    const cells = tr.querySelectorAll('td');
    if (cells.length >= 4) {
      rows.push([
        cells[0]?.textContent?.trim() || '',
        cells[1]?.textContent?.trim() || '',
        cells[2]?.textContent?.trim() || '',
        cells[3]?.textContent?.trim() || ''
      ]);
    }
  });

  if (rows.length && rows[0][0] !== '') {
    y = E.addTable(doc, ['Date / Time', 'Reason', 'Technician', 'Status'], rows, y);
  } else {
    y = E.addParagraph(doc, 'No defects recorded for this work order.', y, { color: E.COLORS.steel });
  }

  // Current defect entry (if partially filled)
  const defDate   = document.getElementById('defectDate')?.value || '';
  const defReason = document.getElementById('defectReason')?.value || '';
  const defTech   = document.getElementById('defectTech');
  const defTechName = defTech?.options[defTech.selectedIndex]?.text || '';
  const defNotes  = document.getElementById('defectNotes')?.value?.trim() || '';

  if (defDate || defReason || defNotes) {
    y = E.checkPageBreak(doc, y, 60);
    y = E.addSectionLabel(doc, 'Current Entry (Pending Log)', y);
    y = E.addKeyValueGrid(doc, [
      ['Date',      defDate],
      ['Reason',    defReason],
      ['Technician', defTechName]
    ], y);
  }

  // Failed tests
  const FAILED_TESTS = [
    { id: 'defLeakTest',        label: 'Leak Test' },
    { id: 'defControlButtons',  label: 'Control Buttons' },
    { id: 'defImage',           label: 'Image' },
    { id: 'defVideoFunctions',  label: 'Video Functions' },
    { id: 'defAngulation',      label: 'Angulation' },
    { id: 'defVariableFunction',label: 'Variable Function' },
    { id: 'defOther',           label: 'Other' }
  ];
  const failedTests = FAILED_TESTS.filter(t => document.getElementById(t.id)?.checked);
  if (failedTests.length) {
    y = E.checkPageBreak(doc, y, 40);
    y = E.addSectionLabel(doc, 'Failed Tests', y);
    y = E.addCheckboxRows(doc, failedTests.map(t => ({ label: t.label, checked: true })), y, 3);
  }

  if (defNotes) {
    y = E.addKeyValueGrid(doc, [['Follow-up Notes', defNotes]], y);
  }

  // Signature block
  y = E.checkPageBreak(doc, y, 60);
  y = E.addSignatureBlock(doc, [
    'Recording Tech: ________________',
    'QC Tech: ________________',
    'Date: ________________'
  ], y);

  E.savePDF(doc, pdfFileName('defect'));
}

function setSelectVal_safe(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

// ── Print document in new window ──
function printFormDocument(formId) {
  // Inspection form: route to the correct scope-type-specific HTML form
  if (formId === 'inspection') {
    const r = _currentRepair || {};
    const wo = r.sWorkOrderNumber || '';
    const scopeType = (r.sRigidOrFlexible || '').charAt(0).toUpperCase();
    let formFile;
    if (scopeType === 'R') {
      formFile = 'forms/form-om07-5-bi-rigid.html';
    } else if (scopeType === 'C') {
      formFile = 'forms/form-om07-4-bi-camera.html';
    } else {
      // Default to flexible (F or unknown)
      formFile = 'forms/form-om07-3-bi-flex.html';
    }
    window.open(formFile + (wo ? '?wo=' + encodeURIComponent(wo) : ''), '_blank');
    return;
  }
  const body = document.getElementById('wfGenericBody');
  if (!body) return;
  const r = _currentRepair || {};
  const form = WORKFLOW_FORMS.find(f => f.id === formId);
  const w = window.open('', '_blank', 'width=800,height=900');
  w.document.write('<html><head><title>' + (form ? form.name : formId) + ' — ' + (r.sWorkOrderNumber || '') + '</title>');
  // Build print CSS — includes both internal form styles and premium estimate styles
  const printCSS = `@page{size:letter;margin:0.4in}
body{font-family:Calibri,Helvetica,sans-serif;font-size:11px;padding:0;max-width:100%;margin:0;color:#1A202C}
table{border-collapse:collapse;width:100%;margin:6px 0}
td,th{border:1px solid #ccc;padding:4px 6px;text-align:left;font-size:10px}
th{background:var(--neutral-50);font-size:9px;text-transform:uppercase;font-weight:700;color:var(--text)}
/* Internal form styles */
.wf-card{border:1px solid #ccc;border-radius:4px;margin-bottom:6px;page-break-inside:avoid}
.wf-card-head{background:#E3EAF6;color:var(--est-navy);padding:5px 10px;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.4px;border-bottom:1px solid #ccc}
.wf-card-body{padding:8px 10px}
.wf-ro{background:#F7F9FC;border:1px solid #ddd;border-radius:3px;padding:3px 8px;font-size:10px}
.wf-form-header{display:grid;grid-template-columns:1fr 1fr;gap:4px;margin-bottom:8px;font-size:10px;padding:6px 8px;background:#f0f4fa;border-radius:4px}
.wf-fh-item b{color:var(--est-navy);font-size:8px;text-transform:uppercase}
.wf-check-grid{display:grid;grid-template-columns:1fr 1fr 1fr;gap:2px 10px;font-size:10px}
.wf-di-table{width:100%;border-collapse:collapse;font-size:10px}
.wf-di-table td{padding:3px 6px;border-bottom:1px solid #eee}
.wf-di-cat{background:#f0f4fa;font-weight:700;color:var(--est-navy);font-size:9px;text-transform:uppercase}
.wf-di-cat td{padding:5px 6px;border-bottom:1px solid #ccc}
.wf-di-input{width:50px;border:1px solid #bbb;border-radius:2px;padding:1px 3px;font-size:9px}
.wf-di-input.wide{width:80px}
.wf-textarea{width:100%;min-height:60px;border:1px solid #bbb;border-radius:3px;padding:4px 6px;font-size:10px;font-family:inherit;box-sizing:border-box}
.sig-line{border-bottom:1px solid #000;height:30px;margin-bottom:2px}
.sig-label{font-size:8px;color:#666}
/* Premium estimate styles */
.wf-est-header{background:var(--est-navy);color:#fff;padding:16px 24px;display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.wf-est-header img{height:56px;margin-right:12px}
.wf-est-header-left{display:flex;align-items:center}
.est-company{font-size:15px;font-weight:700;color:var(--est-navy)}
.est-tagline{font-size:8px;color:#5A6F8A;margin-top:1px}
.wf-est-header-right{text-align:right}
.est-title{font-size:18px;font-weight:300;letter-spacing:.3px;color:var(--est-navy)}
.est-meta{font-size:9px;color:#5A6F8A;margin-top:3px}
.wf-est-section{padding:14px 24px}
.wf-est-section+.wf-est-section{border-top:1px solid #C8D4E0}
.wf-est-label{font-size:8px;font-weight:700;color:#5A6F8A;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px}
.wf-est-addr{font-size:10px;line-height:1.6}
.wf-est-equip{border:1px solid #ccc;border-radius:4px;padding:10px 12px;background:#FAFBFD}
.wf-est-equip-row{display:flex;justify-content:space-between;font-size:10px;padding:2px 0}
.wf-est-equip-row b{color:#5A6F8A;font-size:8px;text-transform:uppercase}
.wf-est-complaint{background:var(--neutral-50);border-left:3px solid var(--est-navy);padding:10px 14px;font-size:10px;line-height:1.5}
.wf-est-complaint-label{font-size:8px;font-weight:700;color:var(--est-navy);text-transform:uppercase;letter-spacing:.4px;margin-bottom:3px}
.wf-est-repairs-tbl{width:100%;border-collapse:collapse;font-size:9px;border:1.5px solid #8898AA}
.wf-est-repairs-tbl th{background:var(--neutral-50);color:var(--est-navy);font-size:7px;font-weight:700;text-transform:uppercase;padding:5px 8px;text-align:left;border-bottom:2px solid #8898AA;border-right:1px solid var(--neutral-200)}
.wf-est-repairs-tbl th:last-child{border-right:none}
.wf-est-repairs-tbl td{padding:4px 8px;border-bottom:1px solid #C0C8D4;border-right:1px solid #E0E4EA}
.wf-est-repairs-tbl td:last-child{border-right:none}
.wf-est-repairs-tbl tr:nth-child(even) td{background:var(--row-alt)}
.wf-est-repairs-tbl b{font-size:9px;font-weight:600}
.est-tag{display:inline-block;font-size:6px;font-weight:700;padding:1px 4px;border-radius:6px}
.est-tag-ua{background:#FEF2F2;color:var(--danger)}
.est-tag-nw{background:var(--success-light);color:var(--success)}
.est-tag-pass{background:var(--success-light);color:var(--success)}
.est-tag-fail{background:#FEF2F2;color:var(--danger)}
.wf-est-ps3{border:2px solid var(--est-navy);border-radius:8px;padding:14px 18px;background:var(--neutral-50);page-break-inside:avoid}
.wf-est-ps3-scores{display:flex;align-items:center;justify-content:center;gap:20px;margin:8px 0}
.wf-est-ps3-score{text-align:center;padding:8px 16px;border-radius:6px;min-width:80px}
.wf-est-ps3-score .ps3-val{font-size:16px;font-weight:700}
.wf-est-ps3-score .ps3-lbl{font-size:7px;font-weight:600;text-transform:uppercase;color:#5A6F8A;margin-top:2px}
.wf-est-ps3-arrow{font-size:20px;color:var(--est-navy);font-weight:700}
.wf-est-totals{display:flex;justify-content:flex-end;padding:12px 24px}
.wf-est-totals-grid{display:grid;grid-template-columns:auto auto;gap:3px 16px;text-align:right;font-size:11px}
.est-total-label{color:#5A6F8A}
.est-total-val{font-weight:600}
.est-grand-label{color:var(--est-navy);font-weight:700;font-size:13px;padding-top:6px;border-top:2px solid var(--est-navy)}
.est-grand-val{color:var(--est-navy);font-weight:700;font-size:13px;padding-top:6px;border-top:2px solid var(--est-navy)}
.wf-est-callout{font-size:9px;color:#5A6F8A;line-height:1.5;padding:10px 14px;background:var(--neutral-50);border-left:3px solid var(--neutral-200);font-style:italic}
.wf-est-tech{display:grid;grid-template-columns:repeat(4,1fr) auto;font-size:10px;border:1px solid #ccc;border-radius:3px;overflow:hidden}
.wf-est-tech div{padding:4px 8px;border-right:1px solid #ccc}
.wf-est-tech div:last-child{border-right:none}
.est-th{background:var(--neutral-50);font-weight:700;color:var(--muted);font-size:8px;text-transform:uppercase}
.wf-est-auth{text-align:center;padding:16px 0}
.wf-est-auth-text{font-size:10px;line-height:1.5;max-width:500px;margin:0 auto 16px}
.wf-est-sig-grid{display:grid;grid-template-columns:1fr 1fr;gap:16px 28px;max-width:500px;margin:0 auto}
.wf-est-sig-line{border-bottom:1px solid #1A202C;height:28px;margin-bottom:3px}
.wf-est-sig-label{font-size:8px;color:#5A6F8A;font-weight:600;text-transform:uppercase}
.wf-est-contact{font-size:9px;color:#5A6F8A;margin-top:12px;padding-top:10px;border-top:1px solid #E8ECF2}
.wf-est-contact b{color:var(--primary-dark)}
.wf-est-iso{font-size:7px;color:#8896AA;margin-top:4px}
.wf-form-footer{font-size:7px;color:#999;text-align:right;margin-top:6px;padding-top:4px;border-top:1px solid #eee}
*{-webkit-print-color-adjust:exact!important;print-color-adjust:exact!important}
@media print{body{padding:0}.wf-est-item-approve{display:none}}`;
  w.document.write('<style>' + printCSS + '</style>');
  w.document.write('</head><body>');
  w.document.write(body.innerHTML);
  w.document.write('</body></html>');
  w.document.close();
  setTimeout(() => w.print(), 300);
}

function openFormPreview(formId) {
  const pill = document.getElementById('wf-' + formId);
  if (pill && pill.classList.contains('wf-locked')) {
    const name = pill.title.split(' — ')[0] || 'This step';
    showToast(name + ' is locked — status not yet reached');
    return;
  }
  closeDrawer();
  // Amendment & Defect pills open the existing operational drawers (no duplicates)
  if (formId === 'amendment') { openDrawer('amend'); return; }
  if (formId === 'defect') { openDrawer('defects'); return; }
  openFormDrawer(formId);
}

function tsiFormHeader(formName, formNum) {
  return `<div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:12px;border-bottom:2px solid var(--est-navy);padding-bottom:10px">
    <div style="display:flex;align-items:center;gap:12px">
      <img src="assets/logo-color.jpg" alt="Total Scope, Inc." style="height:48px">
      <div style="font-size:9px;color:#666;line-height:1.5">17 Creek Parkway | Upper Chichester, PA 19061<br/>Phone: (610) 485-1616 | Fax: (610) 485-0404</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:13px;font-weight:700;color:var(--est-navy)">${formName}</div>
      ${formNum && formNum !== '—' ? '<div style="font-size:9px;color:#666">Form #: ' + formNum + '</div>' : ''}
      <div style="font-size:8px;color:#999;margin-top:4px">An ISO 13485:2016 Certified Company</div>
    </div>
  </div>`;
}

function populateFormDrawer(formId) {
  const r = _currentRepair;
  if (!r) return;
  const clientName = r.sShipName1 || r.sBillName1 || _clients.find(c => c.lClientKey == r.lClientKey)?.sClientName1 || '—';
  const deptName = r.sShipName2 || _departments.find(d => d.lDepartmentKey == r.lDepartmentKey)?.sDepartmentName || '—';
  const _rep = _salesReps.find(s => (s.lSalesRepNameKey || s.lSalesRepKey) == r.lSalesRepKey);
  const repName = _rep ? (_rep.sSalesRepName || [_rep.sRepFirst, _rep.sRepLast].filter(Boolean).join(' ') || '—') : '—';

  const items = (_repairItems || []).map(item => ({
    code: item.sTSICode || item.sRepairCode || '',
    desc: item.sItemDescription || item.sDescription || item.sRepairItem || '',
    uanwt: item.sUAorNWT || item.sUANWT || '',
    fixType: item.sFixType || item.sWNCA || '',
    approved: item.sApproved || '',
    amount: fmtMoney(item.dblRepairPrice || item.mAmount || item.dblAmount || 0),
    amountNum: parseFloat(item.dblRepairPrice || item.mAmount || item.dblAmount || 0),
    isBlind: item.bBlind === true || item.bBlind === 'Y',
    comments: item.sComments || ''
  }));

  const headerHTML = `
    <div class="wf-form-header">
      <div class="wf-fh-item"><b>Client</b> ${esc(clientName)}</div>
      <div class="wf-fh-item"><b>W.O. #</b> ${esc(r.sWorkOrderNumber || '—')}</div>
      <div class="wf-fh-item"><b>Department</b> ${esc(deptName)}</div>
      <div class="wf-fh-item"><b>Serial #</b> ${esc(r.sSerialNumber || '—')}</div>
      <div class="wf-fh-item"><b>Model</b> ${esc(r.sScopeTypeDesc || '—')}</div>
      <div class="wf-fh-item"><b>Date</b> ${r.dtDateIn ? new Date(r.dtDateIn).toLocaleDateString() : '—'}</div>
      <div class="wf-fh-item"><b>Rack #</b> ${esc(r.sRackPosition || 'N/A')}</div>
      <div class="wf-fh-item"><b>Type</b> ${esc(r.sRigidOrFlexible || '—')}</div>
    </div>`;

  if (formId === 'disassemble') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    const techName = _techs.find(t => t.lTechnicianKey === r.lTechnicianKey)?.sTechnicianName || '';
    body.innerHTML = tsiFormHeader('Flexible Endoscope Diagnostic Report', form.formNum) + `
      <!-- SECTION 1: GENERAL INFORMATION -->
      <div class="wf-card">
        <div class="wf-card-head">1. General Information</div>
        <div class="wf-card-body">
          <div class="wf-form-header" style="grid-template-columns:1fr 1fr 1fr">
            <div class="wf-fh-item"><b>Customer</b> ${esc(clientName)}</div>
            <div class="wf-fh-item"><b>Work Order #</b> ${esc(r.sWorkOrderNumber || '—')}</div>
            <div class="wf-fh-item"><b>Inspected By</b> <input class="wf-di-input wide" value="${techName}"></div>
            <div class="wf-fh-item"><b>Date</b> ${r.dtDateIn ? new Date(r.dtDateIn).toLocaleDateString() : '—'}</div>
            <div class="wf-fh-item"><b>Scope Model</b> ${esc(r.sScopeTypeDesc || '—')}</div>
            <div class="wf-fh-item"><b>Rack #</b> ${esc(r.sRackPosition || 'N/A')}</div>
            <div class="wf-fh-item"><b>Customer Type</b> ${r.lPricingCategoryKey === 4 ? 'CAP' : 'FFS'}</div>
            <div class="wf-fh-item"><b>Serial #</b> ${esc(r.sSerialNumber || '—')}</div>
            <div class="wf-fh-item"><b>Package Type</b> ${esc(r.sRigidOrFlexible || '—')}</div>
          </div>
          <div style="margin-top:8px;font-size:10.5px"><b style="font-size:9px;color:var(--steel)">ACCESSORIES RECEIVED AT INTAKE:</b></div>
          <div style="margin-top:4px;display:flex;flex-wrap:wrap;gap:4px 12px;font-size:10.5px">
            ${[
              r.sIncludesCapYN==='Y' ? '✓ ETO Cap' : '',
              '✓ A/W Button',
              '✓ Suction Button',
              r.sIncludesWaterResCapYN==='Y' ? '✓ Water Cap' : '',
              r.sIncludesCaseYN==='Y' ? '✓ Carrying Case' : '',
              r.sIncludesVideoPlugYN==='Y' ? '✓ Video Plug' : '',
              r.sIncludesMouthpieceYN==='Y' ? '✓ Mouthpiece' : ''
            ].filter(Boolean).map(a => '<span style="background:var(--primary-light);color:var(--navy);padding:2px 8px;border-radius:9999px;font-size:9px;font-weight:600">' + a + '</span>').join('') || '<span style="color:var(--muted);font-size:10px">None recorded</span>'}
          </div>
        </div>
      </div>

      <!-- SECTION 2: ITEM CONDITION UPON RECEIPT -->
      <div class="wf-card">
        <div class="wf-card-head">2. Item Condition Upon Receipt</div>
        <div class="wf-card-body">
          <div style="font-size:10.5px;margin-bottom:6px">
            <b>External Condition:</b>
            <label style="margin:0 6px"><input type="radio" name="extCond" style="accent-color:var(--navy)"> Clean</label>
            <label><input type="radio" name="extCond" style="accent-color:var(--navy)"> Unclean</label>
            <span style="font-size:9.5px;color:var(--steel);margin-left:6px">(if unclean, follow OM-22 SOP)</span>
            — Cleaned By: <input class="wf-di-input wide">
          </div>
          <div style="font-size:10.5px;margin-bottom:6px">
            <b>Model &amp; SN# Confirmed:</b>
            <label style="margin-left:6px"><input type="checkbox" style="accent-color:var(--navy)"> Yes</label>
          </div>
          <div style="font-size:10.5px">
            <b>Customer Perceived Problem:</b>
            <div class="wf-ro" style="margin-top:4px">${r.sComplaintDesc || '—'}</div>
          </div>
        </div>
      </div>

      <!-- SECTIONS 3-4-5: rendered by function -->
      ${renderFlexDIChecklist()}

      <div class="wf-form-footer">Form #: ${form.formNum} — Revision Pending (01/2026)</div>
    `;
  } else if (formId === 'requisition') {
    const reqBody = document.getElementById('wfGenericBody');
    if (!reqBody) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    const reqItems = items;
    const shipping = parseFloat(r.dblAmtShipping) || 0;
    const tax = parseFloat(r.dblAmtTax) || 0;
    // Use dblAmtRepair if available (finalized), otherwise sum all items (estimate stage)
    const itemSum = items.reduce((sum, i) => sum + (parseFloat(i.amount?.replace(/[^0-9.-]/g,'')) || 0), 0);
    const subTotal = parseFloat(r.dblAmtRepair) || itemSum;
    const repairTotal = subTotal + shipping + tax;
    const reqDate = r.dtReqSent ? new Date(r.dtReqSent).toLocaleDateString() : new Date().toLocaleDateString();
    const fmt$ = v => '$' + v.toFixed(2);
    // Payment terms lookup
    const pt = _paymentTerms.find(x => x.lPaymentTermsKey == r.lPaymentTermsKey);
    const payTerms = pt ? (pt.sPaymentTerms || pt.sTermsDesc) : 'Net 30';

    // Scope type detection
    const scopeType = (r.sRigidOrFlexible || '').charAt(0).toUpperCase();
    const isFlexible = scopeType === 'F';
    const isRigid = scopeType === 'R' || scopeType === 'C';
    const isInstrument = scopeType === 'I' || !scopeType;
    const isContract = !!(r.lContractKey);

    // Filter: hide blind/internal items and discount adjustments — but keep Diagnostic Inspection
    // Diagnostic Inspection always first, rest sorted alphabetically
    const filteredItems = reqItems
      .filter(i => (!i.isBlind || (i.desc || '').toLowerCase().includes('diagnostic inspection')) && !(i.code || '').startsWith('ZZ') && !(i.desc || '').includes('Discount Adjustment'));
    const diItems = filteredItems.filter(i => (i.desc || '').toLowerCase().includes('diagnostic inspection'));
    const otherItems = filteredItems.filter(i => !(i.desc || '').toLowerCase().includes('diagnostic inspection')).sort((a, b) => (a.desc || '').localeCompare(b.desc || ''));
    const visibleItems = [...diItems, ...otherItems];

    // Helper: parse currency amount from item
    const itemAmt = i => parseFloat((i.amount || '0').toString().replace(/[^0-9.-]/g, '')) || 0;

    // Bill-to: resolve from department record (has sBillName1, sBillAddr1, etc.)
    const billDept = _departments.find(d => d.lDepartmentKey == r.lDepartmentKey) || {};
    const billName1 = billDept.sBillName1 || r.sShipName1 || clientName || '—';
    const billName2 = billDept.sBillName2 || '';
    const billAddr1 = billDept.sBillAddr1 || billDept.sMailAddr1 || '';
    const billAddr2 = billDept.sBillAddr2 || '';
    const billCity = billDept.sBillCity || billDept.sMailCity || '';
    const billState = billDept.sBillState || billDept.sMailState || '';
    const billZip = billDept.sBillZip || billDept.sMailZip || '';

    reqBody.innerHTML = `
      <!-- BRANDED HEADER BAND -->
      <div class="wf-est-header">
        <div class="wf-est-header-left">
          <img src="assets/logo-white.png" alt="Total Scope, Inc.">
        </div>
        <div class="wf-est-header-right">
          <div class="est-title">Service Estimate</div>
          <div class="est-meta">W.O. #${r.sWorkOrderNumber || '—'} &nbsp;&bull;&nbsp; ${reqDate}</div>
        </div>
      </div>

      <!-- CUSTOMER & EQUIPMENT -->
      <div class="wf-est-section">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 16px;align-items:stretch">
          <div class="wf-est-equip" style="justify-content:flex-start">
            <div class="wf-est-label" style="margin-bottom:4px">Bill To</div>
            <div class="wf-est-addr">
              ${billName1}<br/>
              ${billName2 ? billName2 + '<br/>' : ''}
              ${billAddr1 ? billAddr1 + '<br/>' : ''}
              ${billAddr2 ? billAddr2 + '<br/>' : ''}
              ${[billCity, billState].filter(Boolean).join(', ')} ${billZip}
            </div>
          </div>
          <div class="wf-est-equip" style="justify-content:flex-start">
            <div class="wf-est-label" style="margin-bottom:4px">Ship To</div>
            <div class="wf-est-addr">
              ${r.sShipName1 || '—'}<br/>
              ${r.sShipName2 ? r.sShipName2 + '<br/>' : ''}
              ${r.sShipAddr1 ? r.sShipAddr1 + '<br/>' : ''}
              ${r.sShipAddr2 ? r.sShipAddr2 + '<br/>' : ''}
              ${[r.sShipCity, r.sShipState].filter(Boolean).join(', ')} ${r.sShipZip || ''}
            </div>
          </div>
          <div>
            <div class="wf-est-equip">
              <div class="wf-est-equip-row"><b>Mfr</b><span>${r.sManufacturer || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Model</b><span>${r.sScopeTypeDesc || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Serial #</b><span>${r.sSerialNumber || '—'}</span></div>
              <div class="wf-est-equip-row"><b>P.O. #</b><span>${r.sPurchaseOrder || r.sPONumber || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Terms</b><span>${payTerms}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- CUSTOMER REPORTED ISSUE + DIAGNOSIS -->
      <div class="wf-est-section" style="padding-top:0">
        <div class="wf-est-complaint">
          <div class="wf-est-complaint-label">Customer Reported Issue</div>
          ${r.sComplaintDesc || 'No complaint description provided.'}
        </div>
        ${(() => {
          const reason = _repairReasons.find(x => x.lRepairReasonKey == r.lRepairReasonKey);
          const level = _levels.find(x => x.lRepairLevelKey == r.lRepairLevelKey);
          const hasUA = items.some(i => i.uanwt === 'UA');
          const hasNWT = items.some(i => i.uanwt === 'N' || i.uanwt === 'NWT');
          const damageClass = hasUA ? 'Avoidable Damage' : hasNWT ? 'Normal Wear & Tear' : '';
          if (!reason && !level && !damageClass) return '';
          return '<div style="display:flex;gap:20px;margin-top:10px;font-size:11px">' +
            (reason ? '<div><span class="wf-est-label" style="margin-bottom:2px;display:block">Primary Failure</span><span style="font-weight:600;color:#1A202C">' + reason.sRepairReason + '</span></div>' : '') +
            (level ? '<div><span class="wf-est-label" style="margin-bottom:2px;display:block">Repair Classification</span><span style="font-weight:600;color:#1A202C">' + level.sRepairLevel + '</span></div>' : '') +
            (damageClass ? '<div><span class="wf-est-label" style="margin-bottom:2px;display:block">Damage Assessment</span><span style="font-weight:600;color:' + (hasUA ? 'var(--danger)' : 'var(--success)') + '">' + damageClass + '</span></div>' : '') +
          '</div>';
        })()}
      </div>

      <!-- SCOPE OF REPAIR -->
      <div class="wf-est-section">
        <div class="wf-est-label" style="font-size:11px;color:var(--est-navy);margin-bottom:8px">Scope of Repair</div>
        <div style="font-size:10px;color:#5A6F8A;margin-bottom:10px">Based on our diagnostic inspection, we recommend the following repairs:</div>
        ${isContract ? '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:4px;padding:6px 12px;margin-bottom:10px;text-align:center;font-weight:700;color:#1D4ED8;font-size:11px">Covered Under Service Agreement</div>' : ''}
        ${(() => {
          if (isFlexible) {
            // Flexible: Repair / Description / Approved
            const tblRows = visibleItems.map(i => {
              const name = (i.desc || '').replace(/^!+/, '').trim();
              const approved = i.approved === 'Y' ? '\u2611 Y' : i.approved === 'N' ? '\u2610 N' : '\u2610';
              return '<tr><td><b>' + name + '</b></td><td style="font-size:9px;color:#5A6F8A;font-style:italic">' + (i.comments || '') + '</td><td style="text-align:center;font-size:10px">' + approved + '</td></tr>';
            }).join('') || '<tr><td colspan="3" style="color:#8896AA;text-align:center">No repair items identified</td></tr>';
            let html = '<table class="wf-est-repairs-tbl"><thead><tr><th>Repair</th><th>Description</th><th style="width:65px;text-align:center">Approved</th></tr></thead><tbody>' + tblRows + '</tbody></table>';
            // Angulation specs
            if (r.sAngInUp || r.sAngInDown || r.sAngInRight || r.sAngInLeft) {
              html += '<div style="margin-top:8px;font-size:10px;line-height:1.6">';
              html += '<div><b style="color:var(--est-navy)">Angulation:</b> Up ' + (r.sAngInUp || 'N/A') + '\u00B0 / Down ' + (r.sAngInDown || 'N/A') + '\u00B0 / Right ' + (r.sAngInRight || 'N/A') + '\u00B0 / Left ' + (r.sAngInLeft || 'N/A') + '\u00B0</div>';
              html += '<div style="color:#5A6F8A">Should Be: Up 210\u00B0 / Down 180\u00B0 / Right 160\u00B0 / Left 160\u00B0</div>';
              html += '</div>';
            }
            // Broken fibers
            if (r.nBrokenFibers !== undefined && r.nBrokenFibers !== null) {
              html += '<div style="margin-top:4px;font-size:10px"><b style="color:var(--est-navy)">Number of broken fibers:</b> ' + (r.nBrokenFibers || 'N/A') + '</div>';
            }
            return html;
          } else if (isRigid) {
            // Rigid/Camera: Repair / Description / Cost / Approved with !! and ! grouping
            const tblRows = visibleItems.map(i => {
              const raw = (i.desc || '');
              const isPkg = raw.startsWith('!!');
              const isInc = raw.startsWith('!') && !raw.startsWith('!!');
              const name = raw.replace(/^!+/, '').trim();
              const displayName = isInc ? '<span style="padding-left:16px">' + name + '</span>' : (isPkg ? '<b style="color:var(--est-navy)">' + name + '</b>' : '<b>' + name + '</b>');
              const cost = isContract ? '$0.00' : isInc ? '<span style="color:#5A6F8A;font-style:italic">Included</span>' : fmt$(itemAmt(i));
              const approved = i.approved === 'Y' ? '\u2611 Y' : i.approved === 'N' ? '\u2610 N' : '\u2610';
              const bgStyle = isPkg ? ' style="background:#F0F4FA"' : '';
              return '<tr' + bgStyle + '><td>' + displayName + '</td><td style="font-size:9px;color:#5A6F8A;font-style:italic">' + (i.comments || '') + '</td><td style="text-align:right;font-size:10px;white-space:nowrap">' + cost + '</td><td style="text-align:center;font-size:10px">' + approved + '</td></tr>';
            }).join('') || '<tr><td colspan="4" style="color:#8896AA;text-align:center">No repair items identified</td></tr>';
            return '<table class="wf-est-repairs-tbl"><thead><tr><th>Repair</th><th>Description</th><th style="width:70px;text-align:right">Cost</th><th style="width:65px;text-align:center">Approved</th></tr></thead><tbody>' + tblRows + '</tbody></table>';
          } else {
            // Instrument (I or empty): Qty / Description / Rate / Amount / Approved
            const tblRows = visibleItems.map(i => {
              const name = (i.desc || '').replace(/^!+/, '').trim();
              const qty = parseInt(i.qty) || 1;
              const amt = isContract ? 0 : itemAmt(i);
              const rate = qty > 0 ? amt / qty : amt;
              const approved = i.approved === 'Y' ? '\u2611 Y' : i.approved === 'N' ? '\u2610 N' : '\u2610';
              return '<tr><td style="text-align:center">' + qty + '</td><td><b>' + name + '</b></td><td style="text-align:right">' + (isContract ? '$0.00' : fmt$(rate)) + '</td><td style="text-align:right">' + (isContract ? '$0.00' : fmt$(amt)) + '</td><td style="text-align:center;font-size:10px">' + approved + '</td></tr>';
            }).join('') || '<tr><td colspan="5" style="color:#8896AA;text-align:center">No repair items identified</td></tr>';
            return '<table class="wf-est-repairs-tbl"><thead><tr><th style="width:40px;text-align:center">Qty</th><th>Description</th><th style="width:70px;text-align:right">Rate</th><th style="width:70px;text-align:right">Amount</th><th style="width:65px;text-align:center">Approved</th></tr></thead><tbody>' + tblRows + '</tbody></table>';
          }
        })()}
      </div>

      <!-- ESTIMATE TOTAL -->
      <div class="wf-est-section" style="border-top:1px solid #E8ECF2;padding-bottom:8px">
        <div style="display:flex;justify-content:space-between;align-items:flex-end">
          <div></div>
          <div style="text-align:right">
            <div class="wf-est-totals-grid" style="padding:0">
              ${isContract ? `
              <span class="est-total-label">Repair</span><span class="est-total-val">$0.00</span>
              <span class="est-total-label">Sales Tax</span><span class="est-total-val">$0.00</span>
              <span class="est-grand-label">Estimate Total</span><span class="est-grand-val">$0.00</span>
              <span class="est-total-label" style="font-style:italic;color:#5A6F8A">Non-Contract Cost</span><span class="est-total-val" style="font-style:italic;color:#5A6F8A">${fmt$(subTotal + shipping + tax)}</span>
              ` : `
              ${shipping > 0 ? '<span class="est-total-label">Repair</span><span class="est-total-val">' + fmt$(subTotal) + '</span>' : ''}
              ${shipping > 0 ? '<span class="est-total-label">Shipping</span><span class="est-total-val">' + fmt$(shipping) + '</span>' : ''}
              <span class="est-total-label">Sales Tax</span><span class="est-total-val">${fmt$(tax)}</span>
              <span class="est-grand-label">Estimate Total</span><span class="est-grand-val">${fmt$(subTotal + shipping + tax)}</span>
              `}
            </div>
          </div>
        </div>
      </div>

      <!-- TECHNICAL DETAILS (secondary) -->
      <!-- IMPORTANT NOTICE -->
      <div class="wf-est-section" style="padding-top:0">
        <div class="wf-est-callout">This estimate is based on our initial inspection. As the scope is disassembled further, additional repair items may be identified that could require an adjustment to this estimate. We will contact you before proceeding with any work beyond the scope of this estimate.</div>
      </div>

      <!-- APPROVAL & FOOTER -->
      <div class="wf-est-section" style="border-top:1px solid #D0D8E4;padding:14px 28px;text-align:center">
        <div style="font-size:10px;color:#1A202C;line-height:1.5;margin-bottom:8px">To approve, log in to your <b style="color:var(--est-navy)">TSI Customer Portal</b> or contact us: <b style="color:var(--est-navy)">ops-tsi@totalscopeinc.com</b> &bull; <b style="color:var(--est-navy)">800-471-2255</b> &nbsp; | &nbsp; Prepared by: <b>${repName}</b></div>
        <div style="display:flex;align-items:flex-end;gap:16px;margin-top:10px;border-top:1px dashed #D0D8E4;padding-top:8px">
          <div style="flex:2"><div style="border-bottom:1px solid #1A202C;height:18px"></div><div style="font-size:7px;color:#8896AA;margin-top:2px">SIGNATURE (optional)</div></div>
          <div style="flex:1"><div style="border-bottom:1px solid #1A202C;height:18px"></div><div style="font-size:7px;color:#8896AA;margin-top:2px">DATE</div></div>
          <div style="flex:2"><div style="border-bottom:1px solid #1A202C;height:18px"></div><div style="font-size:7px;color:#8896AA;margin-top:2px">PRINTED NAME / TITLE</div></div>
        </div>
        <div style="font-size:7px;color:#8896AA;margin-top:8px">Total Scope, Inc. &bull; 17 Creek Parkway, Upper Chichester, PA 19061 &bull; ISO 13485:2016 Certified &nbsp;&nbsp; Form #: ${form.formNum}</div>
      </div>
    `;
  } else if (formId === 'inspection') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    body.innerHTML = tsiFormHeader('Blank Inspection', form.formNum) + headerHTML + `
      <div style="font-size:10.5px;margin-bottom:6px"><b style="font-size:9px;color:var(--steel)">COMPLAINT:</b> ${r.sComplaintDesc || '—'}</div>
      <div style="font-size:10.5px;margin-bottom:8px;padding:4px 8px;background:#F0F4FA;border-radius:4px"><b>Customer Expected Delivery Date:</b> ${r.dtExpDelDate ? new Date(r.dtExpDelDate).toLocaleDateString() : 'N/A'}</div>
      <div class="wf-section-label">ITEMS FOUND TO BE IN NEED OF REPAIR</div>
      <table class="wf-items-table">
        <thead><tr><th>Repair Item</th><th style="width:200px">Reason / Finding</th></tr></thead>
        <tbody>${items.map(i => '<tr><td>' + i.desc + '</td><td style="font-size:10px;color:var(--steel)">' + (i.code ? i.code : '') + '</td></tr>').join('') || '<tr><td colspan="2" style="color:var(--muted)">No items</td></tr>'}</tbody>
      </table>
      <div class="wf-section-label">ITEMS APPROVED AND REPAIRED</div>
      <table class="wf-items-table">
        <thead><tr><th>Repair Item</th><th style="width:100px;text-align:center">Repaired By</th></tr></thead>
        <tbody>${items.filter(i => i.approved === 'Y').map(i => '<tr><td>' + i.desc + '</td><td style="text-align:center"><input style="width:40px;border:none;border-bottom:1px solid #333;text-align:center;font-size:11px;font-weight:700" value=""/></td></tr>').join('') || '<tr><td colspan="2" style="color:var(--muted)">No approved items</td></tr>'}</tbody>
      </table>
      <div class="wf-section-label">COMMENTS</div>
      <textarea rows="3" style="width:100%;font-size:10.5px;border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-family:inherit;resize:vertical"></textarea>
      <div style="font-size:8px;color:var(--muted);margin-top:8px;text-align:right">Form #: ${form.formNum} (02/2020)</div>
    `;
  } else if (formId === 'picklist') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    // Demo inventory data (would come from API in production)
    const invData = [
      { repairItem:'CCD Replacement (GIF-H190)', items:[{desc:'CCD Assembly',size:'GIF-H190 CCD',lot:'LOT-2026-0089',qty:1}] },
      { repairItem:'Bending Section — Distal End Rebuild', items:[{desc:'Bending Section Mesh',size:'9.8mm',lot:'LOT-2026-0112',qty:2},{desc:'Control Body O-Ring Kit',size:'Olympus Standard',lot:'LOT-2026-0091',qty:3}] },
      { repairItem:'Water Resistance Cap Replacement', items:[{desc:'Control Body O-Ring Kit',size:'Olympus Standard',lot:'LOT-2025-0847',qty:1}] },
      { repairItem:'Epoxy Application — Standard', items:[{desc:'Epoxy Resin',size:'3M DP125 Gray',lot:'LOT-2026-0034',qty:1},{desc:'Epoxy Resin',size:'Araldite 2014 50ml cartridge',lot:'LOT-2026-0035',qty:1}] },
      { repairItem:'Angulation Calibration & Adjustment', items:[{desc:'Angulation Wire Assembly',size:'GIF-H180/190 Up',lot:'LOT-2025-0723',qty:1}] },
    ];
    let invHTML = '';
    invData.forEach(group => {
      invHTML += '<tr><td colspan="4" style="font-weight:700;background:#F0F4FA;padding:6px 8px;font-size:11px">' + group.repairItem + '</td></tr>';
      group.items.forEach(inv => {
        invHTML += '<tr><td style="padding-left:20px">' + inv.desc + '</td><td>' + inv.size + '</td><td>' + inv.lot + '</td><td style="text-align:center">' + inv.qty + '</td></tr>';
      });
      invHTML += '<tr><td style="padding-left:20px;color:var(--muted);font-size:10px;font-style:italic">Additional Inventory</td><td><div style="border-bottom:1px solid var(--border-dk);height:16px"></div></td><td><div style="border-bottom:1px solid var(--border-dk);height:16px"></div></td><td><div style="border-bottom:1px solid var(--border-dk);height:16px"></div></td></tr>';
    });
    body.innerHTML = tsiFormHeader(form.name, form.formNum) + headerHTML + `
      <table class="wf-items-table">
        <thead><tr><th>Inventory Item</th><th style="width:140px">Inventory Size</th><th style="width:110px">Lot Number</th><th style="width:55px;text-align:center">Qty</th></tr></thead>
        <tbody>${invHTML}</tbody>
      </table>
      <div class="wf-section-label">ADDITIONAL REPAIR ITEMS</div>
      <textarea rows="3" style="width:100%;font-size:10.5px;border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-family:inherit;resize:vertical" placeholder="Additional items not listed above..."></textarea>
      <div style="font-size:8px;color:var(--muted);margin-top:8px;text-align:right">Form #: ${form.formNum} (05/2019)</div>
    `;
  } else if (formId === 'invoice') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    // Filter out blind items from customer-facing invoice
    const visibleItems = items.filter(i => !i.isBlind);
    const totalAmount = visibleItems.reduce((sum, i) => sum + (parseFloat(i.amount?.replace(/[^0-9.-]/g,'')) || 0), 0);
    const tax = parseFloat(r.dblAmtTax) || 0;
    const shipping = parseFloat(r.dblAmtShipping) || 0;
    const invDate = r.dtDateOut ? new Date(r.dtDateOut).toLocaleDateString() : new Date().toLocaleDateString();
    const pt = _paymentTerms.find(x => x.lPaymentTermsKey == r.lPaymentTermsKey);
    const payTerms = pt ? (pt.sPaymentTerms || pt.sTermsDesc) : 'Net 30';
    // Bill-to from department record
    const billDept = _departments.find(d => d.lDepartmentKey == r.lDepartmentKey) || {};
    const billName1 = billDept.sBillName1 || r.sShipName1 || clientName || '—';
    const billName2 = billDept.sBillName2 || '';
    const billAddr1 = billDept.sBillAddr1 || billDept.sMailAddr1 || '';
    const billAddr2 = billDept.sBillAddr2 || '';
    const billCity = billDept.sBillCity || billDept.sMailCity || '';
    const billState = billDept.sBillState || billDept.sMailState || '';
    const billZip = billDept.sBillZip || billDept.sMailZip || '';

    body.innerHTML = `
      <!-- BRANDED HEADER BAND -->
      <div class="wf-est-header">
        <div class="wf-est-header-left">
          <img src="assets/logo-white.png" alt="Total Scope, Inc.">
        </div>
        <div class="wf-est-header-right">
          <div class="est-title">Invoice</div>
          <div class="est-meta">W.O. #${r.sWorkOrderNumber || '—'} &nbsp;&bull;&nbsp; ${invDate}</div>
        </div>
      </div>

      <!-- BILL-TO / SHIP-TO / EQUIPMENT -->
      <div class="wf-est-section">
        <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px 16px;align-items:stretch">
          <div class="wf-est-equip" style="justify-content:flex-start">
            <div class="wf-est-label" style="margin-bottom:4px">Bill To</div>
            <div class="wf-est-addr">
              ${billName1}<br/>
              ${billName2 ? billName2 + '<br/>' : ''}
              ${billAddr1 ? billAddr1 + '<br/>' : ''}
              ${billAddr2 ? billAddr2 + '<br/>' : ''}
              ${[billCity, billState].filter(Boolean).join(', ')} ${billZip}
            </div>
          </div>
          <div class="wf-est-equip" style="justify-content:flex-start">
            <div class="wf-est-label" style="margin-bottom:4px">Ship To</div>
            <div class="wf-est-addr">
              ${r.sShipName1 || '—'}<br/>
              ${r.sShipName2 ? r.sShipName2 + '<br/>' : ''}
              ${r.sShipAddr1 ? r.sShipAddr1 + '<br/>' : ''}
              ${r.sShipAddr2 ? r.sShipAddr2 + '<br/>' : ''}
              ${[r.sShipCity, r.sShipState].filter(Boolean).join(', ')} ${r.sShipZip || ''}
            </div>
          </div>
          <div>
            <div class="wf-est-equip">
              <div class="wf-est-equip-row"><b>Invoice #</b><span>${r.sInvoiceNumber || 'Pending'}</span></div>
              <div class="wf-est-equip-row"><b>P.O. #</b><span>${r.sPurchaseOrder || r.sPONumber || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Model</b><span>${r.sScopeTypeDesc || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Serial #</b><span>${r.sSerialNumber || '—'}</span></div>
              <div class="wf-est-equip-row"><b>Terms</b><span>${payTerms}</span></div>
            </div>
          </div>
        </div>
      </div>

      <!-- LINE ITEMS -->
      <table class="wf-items-table">
        <thead><tr><th>Description</th><th style="width:70px;text-align:right">Amount</th></tr></thead>
        <tbody>${visibleItems.map(i => '<tr><td>' + i.desc + '</td><td style="text-align:right">' + i.amount + '</td></tr>').join('') || '<tr><td colspan="2" style="color:var(--muted);text-align:center">No billable items</td></tr>'}</tbody>
      </table>

      <!-- TOTALS -->
      <div style="display:flex;justify-content:flex-end;gap:16px;padding:6px 8px;background:#F0F4FA;border-radius:4px;font-size:11px;font-weight:600;margin-bottom:8px">
        <span>Sub Total: $${totalAmount.toFixed(2)}</span>
        <span>Shipping: $${shipping.toFixed(2)}</span>
        <span>Tax: $${tax.toFixed(2)}</span>
        <span style="color:var(--navy);font-size:12px">Total Due: $${(totalAmount + shipping + tax).toFixed(2)}</span>
      </div>
      <div style="font-size:8px;color:var(--muted);text-align:right">Form #: ${form.formNum}</div>
    `;
  } else if (formId === 'packing') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    body.innerHTML = tsiFormHeader(form.name, form.formNum) + headerHTML + `
      <div class="wf-section-label">SHIP TO</div>
      <div style="font-size:11px;margin-bottom:10px;padding:8px;background:#F0F4FA;border-radius:4px;line-height:1.6">
        ${r.sShipName1 || ''}<br/>
        ${r.sShipAttention ? 'Attn: ' + r.sShipAttention + '<br/>' : (r.sShipName2 ? r.sShipName2 + '<br/>' : '')}
        ${r.sShipAddr1 || ''}<br/>
        ${r.sShipAddr2 ? r.sShipAddr2 + '<br/>' : ''}
        ${r.sShipCity || ''}, ${r.sShipState || ''} ${r.sShipZip || ''}
      </div>
      <div class="wf-section-label">SCOPE DETAILS</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px;font-size:10.5px;margin-bottom:10px">
        <span><b>Model:</b> ${r.sScopeTypeDesc || '—'}</span>
        <span><b>Serial #:</b> ${r.sSerialNumber || '—'}</span>
        <span><b>Type:</b> ${r.sRigidOrFlexible || '—'}</span>
        <span><b>Work Order:</b> ${r.sWorkOrderNumber || '—'}</span>
      </div>
      <div class="wf-section-label">ACCESSORIES INCLUDED</div>
      <div style="display:flex;flex-wrap:wrap;gap:8px;font-size:10px;margin-bottom:10px">
        ${r.sIncludesCaseYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Case</span>' : ''}
        ${r.sIncludesCapYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Cap</span>' : ''}
        ${r.sIncludesWaterResCapYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Water Res Cap</span>' : ''}
        ${r.sIncludesVideoPlugYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Video Plug</span>' : ''}
        ${r.sIncludesMouthpieceYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Mouthpiece</span>' : ''}
        ${r.sIncludesAngleKnobYN === 'Y' ? '<span style="padding:2px 8px;background:#E8F5E9;border-radius:3px">Angle Knob</span>' : ''}
      </div>
      <div style="font-size:9px;color:var(--muted);font-style:italic;padding:6px 8px;background:#FFFBEB;border:1px solid #F0C040;border-radius:4px"><b>Note:</b> This document does not include pricing information. For billing details refer to the Final Invoice.</div>
    `;
  } else if (formId === 'finalqc') {
    const body = document.getElementById('wfGenericBody');
    if (!body) return;
    const form = WORKFLOW_FORMS.find(f => f.id === formId);
    const inspDate = r.dtFinalQCDate ? new Date(r.dtFinalQCDate).toLocaleDateString() : (r.dtDateOut ? new Date(r.dtDateOut).toLocaleDateString() : new Date().toLocaleDateString());
    const techName = _techs.find(t => t.lTechnicianKey == r.lTechnicianKey)?.sTechName || '—';
    const inspectorName = r.sFinalInspector || '—';

    // PS3 lookups
    const psIn = _safetyLevels.find(s => s.lPatientSafetyLevelKey == r.lPatientSafetyLevelKey);
    const psOut = _safetyLevels.find(s => s.lPatientSafetyLevelKey == r.lPatientSafetyLevelOutKey);
    const psInLabel = psIn ? (psIn.sPatientSafetyLevelDesc || psIn.sPatientSafetyLevel) : '—';
    const psOutLabel = psOut ? (psOut.sPatientSafetyLevelDesc || psOut.sPatientSafetyLevel) : '—';
    const psColor = (lvl) => {
      if (!lvl) return { bg: '#F7F9FC', fg: '#5A6F8A' };
      var desc = lvl.sPatientSafetyLevelDesc || lvl.sPatientSafetyLevel || '';
      if (desc.includes('PS1') || desc.includes('Level 1') || desc.includes('Low')) return { bg: '#F0FDF4', fg: '#166534' };
      if (desc.includes('PS2') || desc.includes('Level 2') || desc.includes('Moderate')) return { bg: '#FFFBEB', fg: '#92400E' };
      return { bg: '#FEF2F2', fg: 'var(--danger)' };
    };
    const psInC = psColor(psIn), psOutC = psColor(psOut);

    // Test result helper
    const pfBadge = (val) => {
      if (!val) return '<span style="color:#8896AA">—</span>';
      const pass = val === 'P' || val === 'PASS' || val === 'Pass';
      return pass ? '<span class="est-tag est-tag-pass">PASSED</span>' : '<span class="est-tag est-tag-fail">FAILED</span>';
    };

    // Build 11 test rows from outgoing P/F fields
    // Grouped test categories matching D&I structure but for outgoing verification
    const testCategories = [
      { name: 'Leak & Pressure Testing', scope: '3-part leak test (manual, wet submersion, electronic pressure decay), channel patency, fluid invasion assessment', items: [
        { test: 'Leak Test — Manual', result: r.sLeakResult === 'PASS' ? 'P' : r.sLeakResult === 'FAIL' ? 'F' : (r.sLeakResult || ''), detail: 'Visual/tactile inspection' },
        { test: 'Leak Test — Wet', result: r.sLeakResult === 'PASS' ? 'P' : r.sLeakResult === 'FAIL' ? 'F' : (r.sLeakResult || ''), detail: 'Submerged bubble detection' },
        { test: 'Leak Test — Electronic', result: r.sLeakResult === 'PASS' ? 'P' : r.sLeakResult === 'FAIL' ? 'F' : (r.sLeakResult || ''), detail: [r.sLeakTesterSN ? 'S/N: ' + r.sLeakTesterSN : '', r.sLeakDuration || '', r.sLeakRunID ? 'Run #' + r.sLeakRunID : ''].filter(Boolean).join(' · ') || 'Automated pressure decay' },
        { test: 'Fluid Invasion Check', result: r.sFluidResult === 'PASS' ? 'P' : r.sFluidResult === 'FAIL' ? 'F' : (r.sFluidResult || ''), detail: '' },
        { test: 'Auxiliary Water', result: r.sOutAuxWaterPF || '', detail: '' },
        { test: 'Air / Water System', result: r.sOutAirWaterPF || '', detail: '' },
        { test: 'Suction Channel', result: r.sOutSuctionPF || '', detail: '' },
        { test: 'Forcep/Biopsy Channel', result: r.sOutForcepPF || '', detail: '' },
      ]},
      { name: 'Image & Optics', scope: 'Image clarity, field of view, centration, light transmission, lens integrity, contamination check', items: [
        { test: 'Image Clarity & Focus', result: r.sOutImageClearPF || '', detail: '' },
        { test: 'Image Round to Edge', result: r.sOutImageRoundPF || '', detail: '' },
        { test: 'Free of Contamination', result: r.sOutImageContamPF || '', detail: '' },
        { test: 'Lens System Secure', result: r.sOutLensSecurePF || '', detail: '' },
        { test: 'Image Centration', result: r.sOutImageCentrationPF || r.sOutObjSystemPF || '', detail: '' },
        { test: 'Light Transmission', result: r.sOutLightColorPF || '', detail: r.sBrokenFibersOut ? 'Fibers Out: ' + r.sBrokenFibersOut + '%' : '' },
      ]},
      { name: 'Angulation & Mechanical', scope: 'Full-range angulation verification, external surface inspection, fog/moisture test', items: [
        { test: 'Angulation Range', result: r.sOutAngleAlignPF || '', detail: r.sAngOutUp || r.sAngOutDown ? 'Up ' + (r.sAngOutUp||'—') + '° · Down ' + (r.sAngOutDown||'—') + '° · Right ' + (r.sAngOutRight||'—') + '° · Left ' + (r.sAngOutLeft||'—') + '°' : '' },
        { test: 'Alcohol Wipe / External', result: r.sOutAlcoholPF || '', detail: '' },
        { test: 'Fog Test', result: r.sOutEyepieceWinPF || '', detail: '' },
      ]},
      { name: 'Adhesive & Epoxy', scope: 'Bending rubber jig measurement, adhesive bond integrity, epoxy seal verification', items: [
        { test: 'B.R. Jig Measurement', result: '', detail: (r.nOutgoingEpoxySize || r.sBRJigSize || '—') + (r.sMaxEpoxy ? ' (max: ' + r.sMaxEpoxy + 'mm)' : '') },
        { test: 'Fiber Glue Intact', result: r.sOutFiberGluePF || '', detail: '' },
      ]},
    ];

    // Repair items (same filter as estimate)
    const filteredItems = items
      .filter(i => (!i.isBlind || (i.desc || '').toLowerCase().includes('diagnostic inspection')) && !(i.code || '').startsWith('ZZ') && !(i.desc || '').includes('Discount Adjustment'));
    const diItems = filteredItems.filter(i => (i.desc || '').toLowerCase().includes('diagnostic inspection'));
    const otherItems = filteredItems.filter(i => !(i.desc || '').toLowerCase().includes('diagnostic inspection')).sort((a, b) => (a.desc || '').localeCompare(b.desc || ''));
    const visibleItems = [...diItems, ...otherItems];

    // Scope includes helper
    const inclChk = (val, label) => {
      const yes = val === 'Y' || val === 'Yes' || val === true;
      return '<span style="display:inline-flex;align-items:center;gap:3px;font-size:10px;padding:2px 8px;border-radius:3px;background:' + (yes ? '#F0FDF4' : '#F7F9FC') + ';color:' + (yes ? '#166534' : '#8896AA') + ';border:1px solid ' + (yes ? '#C6F0C6' : '#E8ECF2') + '">' + (yes ? '\u2713' : '\u2717') + ' ' + label + '</span>';
    };

    body.innerHTML = `
      <!-- HEADER -->
      <div class="wf-est-header" style="padding:14px 24px">
        <div class="wf-est-header-left"><img src="assets/logo-white.png" alt="Total Scope, Inc."></div>
        <div class="wf-est-header-right"><div class="est-title" style="font-size:17px">Final Inspection Report</div><div class="est-meta">W.O. #${r.sWorkOrderNumber || '—'} &bull; ${inspDate}</div></div>
      </div>

      <!-- CUSTOMER & EQUIPMENT + COMPLAINT (merged) -->
      <div class="wf-est-section" style="padding:12px 24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px 16px;font-size:10px;align-items:stretch">
          <div class="wf-est-equip" style="padding:10px 14px;justify-content:flex-start"><div class="wf-est-label" style="margin-bottom:4px">Ship To</div><div class="wf-est-addr" style="font-size:10px;line-height:1.5">${r.sShipName1 || '—'}${r.sShipName2 ? ', ' + r.sShipName2 : ''}${r.sShipAddr1 ? '<br/>' + r.sShipAddr1 : ''}${r.sShipCity ? '<br/>' + r.sShipCity + ', ' + (r.sShipState||'') + ' ' + (r.sShipZip||'') : ''}</div></div>
          <div class="wf-est-equip" style="padding:10px 14px;justify-content:flex-start"><div class="wf-est-label" style="margin-bottom:4px">Equipment</div><div class="wf-est-equip-row"><b>Mfr</b><span>${r.sManufacturer || '—'}</span></div><div class="wf-est-equip-row"><b>Model</b><span>${r.sScopeTypeDesc || '—'}</span></div><div class="wf-est-equip-row"><b>Serial #</b><span>${r.sSerialNumber || '—'}</span></div><div class="wf-est-equip-row"><b>P.O. #</b><span>${r.sPurchaseOrder || '—'}</span></div></div>
        </div>
        <div style="margin-top:8px;font-size:10px"><b style="color:#5A6F8A;font-size:8px;text-transform:uppercase">Complaint:</b> ${r.sComplaintDesc || '—'}</div>
      </div>

      <!-- TEST RESULTS — category summaries -->
      <div class="wf-est-section" style="padding:10px 24px">
        <div class="wf-est-label" style="font-size:10px;color:var(--est-navy);margin-bottom:6px">Final Inspection Test Results</div>
        <table class="wf-est-repairs-tbl" style="font-size:9px">
          <thead><tr><th>Test Category</th><th style="width:70px;text-align:center">Result</th><th>Scope of Testing</th></tr></thead>
          <tbody>${testCategories.map(cat => {
            const results = cat.items.map(t => t.result).filter(Boolean);
            const hasFail = results.some(r => r === 'F');
            const allPass = results.length > 0 && results.every(r => r === 'P');
            const catResult = hasFail ? 'F' : allPass ? 'P' : '';
            const details = cat.scope;
            return '<tr><td><b>' + cat.name + '</b> <span style="font-size:8px;color:#8896AA">(' + cat.items.length + ' tests)</span></td><td style="text-align:center">' + pfBadge(catResult) + '</td><td style="font-size:8px;color:#5A6F8A">' + (details || '') + '</td></tr>';
          }).join('')}</tbody>
        </table>
      </div>

      <!-- PS3 + SCOPE INCLUDES (merged on one row) -->
      <div class="wf-est-section" style="padding:6px 24px">
        <div style="display:grid;grid-template-columns:auto 1fr;gap:12px 24px;align-items:start">
          <div>
            <div class="wf-est-label" style="margin-bottom:4px">Patient Safety (PS3)</div>
            <div style="display:flex;align-items:center;gap:8px;font-size:11px">
              <span style="padding:2px 8px;border-radius:4px;font-weight:700;background:${psInC.bg};color:${psInC.fg};border:1px solid ${psInC.fg}40">${psInLabel}</span>
              <span style="color:#5A6F8A">&rarr;</span>
              <span style="padding:2px 8px;border-radius:4px;font-weight:700;background:${psOutC.bg};color:${psOutC.fg};border:1px solid ${psOutC.fg}40">${psOutLabel}</span>
            </div>
          </div>
          <div>
            <div class="wf-est-label" style="margin-bottom:4px">Scope Includes</div>
            <div style="display:flex;flex-wrap:wrap;gap:4px;font-size:10px;color:#1A202C">${[
              r.sIncludesCapYN === 'Y' ? 'ETO Cap' : '',
              r.sIncludesBioCapYN === 'Y' ? 'Bio Cap' : '',
              'A/W Valve', 'Suction Valve',
              r.sIncludesWaterResCapYN === 'Y' ? 'Water Proof Cap' : '',
              r.sIncludesLightPostAdapterYN === 'Y' ? 'Light Post Adapter' : ''
            ].filter(Boolean).join(' · ') || 'Standard accessories'}</div>
          </div>
        </div>
      </div>

      <!-- WORK PERFORMED -->
      <div class="wf-est-section" style="padding:8px 24px">
        <div class="wf-est-label" style="font-size:10px;color:var(--est-navy);margin-bottom:6px">Work Performed</div>
        <table class="wf-est-repairs-tbl" style="font-size:9px">
          <thead><tr><th>Repair</th><th style="width:70px;text-align:center">Assessment</th><th>Notes</th></tr></thead>
          <tbody>${visibleItems.map(i => {
            const name = (i.desc || '').replace(/^!+/, '').trim();
            const tag = i.uanwt === 'UA' ? '<span class="est-tag est-tag-ua">Avoidable</span>' : i.uanwt === 'N' || i.uanwt === 'NWT' ? '<span class="est-tag est-tag-nw">Normal Wear</span>' : '';
            return '<tr><td style="padding:3px 8px"><b>' + name + '</b></td><td style="text-align:center;padding:3px 4px">' + tag + '</td><td style="font-size:8px;color:#5A6F8A;font-style:italic;padding:3px 8px">' + (i.comments || '') + '</td></tr>';
          }).join('') || '<tr><td colspan="3" style="color:#8896AA;text-align:center">No repair items recorded</td></tr>'}</tbody>
        </table>
      </div>

      <!-- RECOMMENDATIONS -->
      <div class="wf-est-section" style="padding:6px 24px">
        <div style="display:flex;align-items:baseline;gap:8px;font-size:10px">
          <b style="color:var(--est-navy);font-size:8px;text-transform:uppercase;white-space:nowrap">Recommendations:</b>
          <input type="text" class="wf-di-input" style="width:100%;height:22px;font-size:9px" placeholder="Prevention recommendations..." value="${r.sFinalQCRecommendations || ''}">
        </div>
      </div>

      <!-- REPROCESSING + CERTIFICATION (compact) -->
      <div class="wf-est-section" style="padding:10px 24px;border-top:1px solid #D0D8E4">
        <div style="font-size:8px;color:#B91C1C;font-style:italic;margin-bottom:10px;padding:6px 10px;background:#FEF8F8;border-left:2px solid #B91C1C;border-radius:0 3px 3px 0">
          <b>Reprocessing Required:</b> This endoscope must be fully reprocessed per facility policies and manufacturer IFU before patient use. TSI does not perform HLD/sterilization.
        </div>
        <div style="text-align:center;margin-bottom:10px">
          <div style="font-size:13px;font-weight:700;color:var(--est-navy);letter-spacing:.3px">SCOPE HAS BEEN REPAIRED</div>
          <div style="font-size:9px;color:#1A202C;margin-top:2px">Passed final inspection and QC testing per TSI SOPs. Diagnostically <b>USABLE</b> — cleared for return to clinical service.</div>
        </div>
        <div style="display:flex;align-items:flex-end;gap:16px;margin-bottom:8px">
          <div style="flex:1"><div style="border-bottom:1px solid #1A202C;height:18px;font-size:10px;padding-bottom:1px">${techName}</div><div style="font-size:7px;color:#8896AA;margin-top:2px">TECHNICIAN</div></div>
          <div style="flex:1"><div style="border-bottom:1px solid #1A202C;height:18px;font-size:10px;padding-bottom:1px">${inspectorName}</div><div style="font-size:7px;color:#8896AA;margin-top:2px">INSPECTED BY</div></div>
          <div style="flex:1"><div style="border-bottom:1px solid #1A202C;height:18px;font-size:10px;padding-bottom:1px">${inspDate}</div><div style="font-size:7px;color:#8896AA;margin-top:2px">DATE</div></div>
          <div style="flex:1"><div style="border-bottom:1px solid #1A202C;height:18px"></div><div style="font-size:7px;color:#8896AA;margin-top:2px">AUTHORIZED</div></div>
        </div>
        <div style="text-align:center;font-size:8px;color:#8896AA">
          <b style="color:#5A6F8A">Total Scope, Inc.</b> &bull; 17 Creek Parkway, Upper Chichester, PA 19061 &bull; 800-471-2255 &bull; www.totalscopeinc.com<br/>
          ISO 13485 Certified &bull; Form #: ${form.formNum} (OM10-2)
        </div>
      </div>
    `;
  }
  // Amendment & Defect pills redirect to existing operational drawers
}


// ── Exports ──
window.WORKFLOW_FORMS = WORKFLOW_FORMS;
window.FORM_DRAWER_CONFIG = FORM_DRAWER_CONFIG;
window.FORM_STATUS_MAP = FORM_STATUS_MAP;
window.openFormDrawer = openFormDrawer;
window.getPhaseForStatus = getPhaseForStatus;
window.updateWorkflowForms = updateWorkflowForms;
window.showWorkflowToast = showWorkflowToast;
window.addGeneratedFormDoc = addGeneratedFormDoc;
window.collectFormData = collectFormData;
window.pdfFileName = pdfFileName;
window.generateFormPDF = generateFormPDF;
window.buildDIPdf = buildDIPdf;
window.buildRequisitionPdf = buildRequisitionPdf;
window.buildInspectionPdf = buildInspectionPdf;
window.buildPickListPdf = buildPickListPdf;
window.buildInvoicePdf = buildInvoicePdf;
window.buildPackingPdf = buildPackingPdf;
window.buildFinalQCPdf = buildFinalQCPdf;
window.buildFortyDayPdf = buildFortyDayPdf;
window.buildDefectPdf = buildDefectPdf;
window.setSelectVal_safe = setSelectVal_safe;
window.printFormDocument = printFormDocument;
window.openFormPreview = openFormPreview;
window.tsiFormHeader = tsiFormHeader;
window.populateFormDrawer = populateFormDrawer;
window.generateForm = generateForm;
})();
