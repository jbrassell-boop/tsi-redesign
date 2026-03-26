// ═══════════════════════════════════════════════════════
//  generate-csa.js — Generate filled CSA Word document
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');
const FILL_SCRIPT = path.join(__dirname, '..', 'scripts', 'fill-csa.py');

// POST /Contract/GenerateCSA
// Body: { plContractKey, sContractType ("Performance"|"Preferred"), sQuoteDate }
router.post('/Contract/GenerateCSA', async (req, res, next) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'tsi-csa-'));
  try {
    const { plContractKey, sContractType, sQuoteDate } = req.body || {};
    if (!plContractKey) return res.status(400).json({ error: 'Missing plContractKey' });

    const contractType = (sContractType || 'Performance').trim();
    if (!['Performance', 'Preferred'].includes(contractType)) {
      return res.status(400).json({ error: 'sContractType must be Performance or Preferred' });
    }

    // ── 1. Query contract master ───────────────────────────────────────
    const contract = await db.queryOne(`
      SELECT
        con.lContractKey, con.sContractNumber,
        con.dtDateEffective, con.dtDateTermination,
        con.dblAmtTotal,
        con.sContractBillName1, con.sContractBillName2,
        con.sContractAddr1, con.sContractCity, con.sContractState, con.sContractZip,
        con.sContractPhoneVoice, con.sBillEmail,
        ISNULL(c.sClientName1,'') AS sClientName1,
        LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName
      FROM tblContract con
        LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
        LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = con.lSalesRepKey
      WHERE con.lContractKey = @contractKey`,
      { contractKey: parseInt(plContractKey) }
    );

    if (!contract) return res.status(404).json({ error: 'Contract not found' });

    // ── 2. Query scopes ────────────────────────────────────────────────
    const scopes = await db.query(`
      SELECT
        ISNULL(c.sClientName1,'') AS facility,
        ISNULL(d.sDepartmentName,'') AS department,
        ISNULL(st.sScopeTypeDesc,'') AS model,
        ISNULL(s.sSerialNumber,'') AS serial
      FROM tblContractScope cs
        LEFT JOIN tblScope s ON s.lScopeKey = cs.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
        LEFT JOIN tblClient c ON c.lClientKey = d.lClientKey
      WHERE cs.lContractKey = @contractKey
      ORDER BY d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber`,
      { contractKey: parseInt(plContractKey) }
    );

    // ── 3. Compute dates & financials ──────────────────────────────────
    const effDate = contract.dtDateEffective ? new Date(contract.dtDateEffective) : new Date();
    const termDate = contract.dtDateTermination ? new Date(contract.dtDateTermination) : new Date();

    const monthNames = ['January','February','March','April','May','June',
                        'July','August','September','October','November','December'];
    const startMonth = monthNames[effDate.getMonth()];
    const startDay = String(effDate.getDate());
    const startYear = String(effDate.getFullYear());

    // Term in whole months
    const termMonths = Math.round(
      (termDate.getFullYear() - effDate.getFullYear()) * 12 +
      (termDate.getMonth() - effDate.getMonth())
    ) || 12;

    const annualAmt = parseFloat(contract.dblAmtTotal) || 0;
    const monthlyAmt = termMonths > 0 ? annualAmt / termMonths : annualAmt / 12;
    const coverageLimit = annualAmt * 1.25;

    const fmt = (n) => '$' + n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    // Quote date + expiry
    let quoteDateObj = sQuoteDate ? new Date(sQuoteDate) : new Date();
    if (isNaN(quoteDateObj)) quoteDateObj = new Date();
    const quoteExpObj = new Date(quoteDateObj);
    quoteExpObj.setDate(quoteExpObj.getDate() + 90);

    const fmtDate = (d) => `${String(d.getMonth()+1).padStart(2,'0')}/${String(d.getDate()).padStart(2,'0')}/${d.getFullYear()}`;

    // ── 4. Build address lines ─────────────────────────────────────────
    const billName1 = contract.sContractBillName1 || contract.sClientName1 || '';
    const addr1 = contract.sContractAddr1 || '';
    const cityStateZip = [
      contract.sContractCity,
      contract.sContractState,
      contract.sContractZip
    ].filter(Boolean).join(', ');

    // Short form for cover page
    const clientAddressShort = [addr1, cityStateZip].filter(Boolean).join(', ');

    const data = {
      contractNumber:    contract.sContractNumber || '',
      clientName:        contract.sClientName1 || '',
      clientAddressShort,
      addressLine1:      billName1,
      addressLine2:      addr1,
      addressLine3:      cityStateZip,
      clientPhone:       contract.sContractPhoneVoice || '',
      clientEmail:       contract.sBillEmail || '',
      salesRep:          contract.sSalesRepName || '',
      termMonths:        String(termMonths),
      startMonth,
      startDay,
      startYear,
      totalAnnual:       fmt(annualAmt),
      totalMonthly:      fmt(monthlyAmt),
      coverageLimit:     fmt(coverageLimit),
      quoteDate:         fmtDate(quoteDateObj),
      quoteExpDate:      fmtDate(quoteExpObj),
      scopes:            scopes || [],
    };

    // ── 5. Write data JSON to temp file ────────────────────────────────
    const dataPath = path.join(tmp, 'data.json');
    const outPath = path.join(tmp, 'output.docx');
    const templateFile = contractType === 'Preferred'
      ? 'CSA_Preferred_Template.docx'
      : 'CSA_Performance_Template.docx';
    const templatePath = path.join(TEMPLATES_DIR, templateFile);

    fs.writeFileSync(dataPath, JSON.stringify(data, null, 2), 'utf8');

    // ── 6. Run Python fill script ──────────────────────────────────────
    execSync(`python "${FILL_SCRIPT}" "${templatePath}" "${dataPath}" "${outPath}"`, {
      timeout: 30000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    if (!fs.existsSync(outPath)) {
      return res.status(500).json({ error: 'Document generation failed' });
    }

    // ── 7. Stream .docx back ───────────────────────────────────────────
    const safeName = (contract.sClientName1 || 'Client').replace(/[^a-zA-Z0-9\s-]/g, '').trim().replace(/\s+/g, '_');
    const filename = `TSI_CSA_${contractType}_${safeName}.docx`;

    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    const docxBuffer = fs.readFileSync(outPath);
    res.send(docxBuffer);

  } catch (e) {
    next(e);
  } finally {
    // Clean up temp dir
    try { fs.rmSync(tmp, { recursive: true, force: true }); } catch (_) {}
  }
});

module.exports = router;
