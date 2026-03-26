// ═══════════════════════════════════════════════════════
//  pending-contracts.js — Pending contract (proposal) routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

const PENDING_SELECT = `
  SELECT
    pc.lPendingContractKey,
    pc.sPendingContractName1,
    pc.sStatus,
    pc.lTermMonths,
    pc.dtCreationDate,
    pc.lClientKey,
    pc.lContractTypeKey,
    pc.lSalesRepKey,
    pc.lPendingContractAgreementTemplateKey,
    pc.sPendingContractBillName1, pc.sPendingContractBillName2,
    pc.sPendingContractAddr1, pc.sPendingContractAddr2,
    pc.sPendingContractCity, pc.sPendingContractState, pc.sPendingContractZip,
    pc.sPendingContractPhoneVoice,
    ISNULL(c.sClientName1,'') AS sClientName1,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    ISNULL(ct.sContractType,'') AS sContractTypeName,
    (SELECT COUNT(*) FROM tblPendingContractScope pcs
      WHERE pcs.lPendingContractKey = pc.lPendingContractKey) AS scopeCount,
    (SELECT ISNULL(SUM(pcs.nCost),0) FROM tblPendingContractScope pcs
      WHERE pcs.lPendingContractKey = pc.lPendingContractKey) AS dblAmtTotal
  FROM tblPendingContract pc
    LEFT JOIN tblClient c ON c.lClientKey = pc.lClientKey
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = pc.lSalesRepKey
    LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = pc.lContractTypeKey
  WHERE pc.Delete_Datetime IS NULL
`;

// POST /PendingContract/GetAllPendingContracts
router.post('/PendingContract/GetAllPendingContracts', async (req, res, next) => {
  try {
    const rows = await db.query(`${PENDING_SELECT} ORDER BY pc.dtCreationDate DESC`);
    res.json({ list: rows, total: rows.length });
  } catch (e) { next(e); }
});

// GET /PendingContract/GetPendingContractById
router.get('/PendingContract/GetPendingContractById', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingContractKey) || 0;
    const row = await db.queryOne(`${PENDING_SELECT} AND pc.lPendingContractKey = @key`, { key });
    if (!row) return res.status(404).json({ error: 'Not found' });
    res.json(row);
  } catch (e) { next(e); }
});

// GET /PendingContract/GetPendingContractScopes
router.get('/PendingContract/GetPendingContractScopes', async (req, res, next) => {
  try {
    const key = parseInt(req.query.plPendingContractKey) || 0;
    const rows = await db.query(`
      SELECT
        pcs.lPendingContractScopeKey,
        pcs.lPendingContractKey,
        pcs.lScopeKey,
        pcs.lScopeTypeKey,
        pcs.nCost,
        pcs.nUnitCost,
        pcs.lQuantity,
        pcs.lClientKey,
        pcs.lDepartmentKey,
        ISNULL(s.sSerialNumber,'') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
        ISNULL(m.sManufacturer,'') AS sManufacturer,
        ISNULL(d.sDepartmentName,'') AS sDepartmentName,
        ISNULL(c.sClientName1,'') AS sClientName1
      FROM tblPendingContractScope pcs
        LEFT JOIN tblScope s ON s.lScopeKey = pcs.lScopeKey
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = ISNULL(pcs.lScopeTypeKey, s.lScopeTypeKey)
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = ISNULL(pcs.lDepartmentKey, s.lDepartmentKey)
        LEFT JOIN tblClient c ON c.lClientKey = ISNULL(pcs.lClientKey, d.lClientKey)
      WHERE pcs.lPendingContractKey = @key
      ORDER BY d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber`,
      { key }
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /PendingContract/GetAvailableScopesForProposal
// Returns all scopes under the client that are NOT already on this proposal
router.get('/PendingContract/GetAvailableScopesForProposal', async (req, res, next) => {
  try {
    const pendingKey = parseInt(req.query.plPendingContractKey) || 0;
    if (!pendingKey) return res.status(400).json({ error: 'plPendingContractKey required' });

    // Get the client key from the pending contract
    const pc = await db.queryOne(
      'SELECT lClientKey FROM tblPendingContract WHERE lPendingContractKey = @k AND Delete_Datetime IS NULL',
      { k: pendingKey }
    );
    if (!pc) return res.status(404).json({ error: 'Proposal not found' });

    const rows = await db.query(`
      SELECT
        s.lScopeKey,
        ISNULL(s.sSerialNumber,'') AS sSerialNumber,
        ISNULL(st.sScopeTypeDesc,'') AS sScopeTypeDesc,
        ISNULL(m.sManufacturer,'') AS sManufacturer,
        ISNULL(d.sDepartmentName,'') AS sDepartmentName,
        d.lDepartmentKey,
        s.lScopeTypeKey,
        ISNULL(ci.nContractCost, 0) AS nContractCost
      FROM tblScope s
        LEFT JOIN tblScopeType st ON st.lScopeTypeKey = s.lScopeTypeKey
        LEFT JOIN tblManufacturers m ON m.lManufacturerKey = st.lManufacturerKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
        LEFT JOIN tblScopeTypeContractCostsImport ci ON ci.lScopeTypeKey = s.lScopeTypeKey
      WHERE d.lClientKey = @clientKey
        AND s.lScopeKey NOT IN (
          SELECT lScopeKey FROM tblPendingContractScope
          WHERE lPendingContractKey = @pendingKey AND lScopeKey IS NOT NULL
        )
      ORDER BY d.sDepartmentName, st.sScopeTypeDesc, s.sSerialNumber`,
      { clientKey: pc.lClientKey, pendingKey }
    );
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /PendingContract/AddScopesToProposal
// Body: { lPendingContractKey, scopes: [{ lScopeKey, lScopeTypeKey, lDepartmentKey, lClientKey, nCost }] }
router.post('/PendingContract/AddScopesToProposal', async (req, res, next) => {
  try {
    const { lPendingContractKey, scopes } = req.body || {};
    if (!lPendingContractKey || !Array.isArray(scopes) || !scopes.length) {
      return res.status(400).json({ error: 'lPendingContractKey and scopes[] required' });
    }
    for (const s of scopes) {
      await db.query(`
        INSERT INTO tblPendingContractScope (
          lPendingContractKey, lScopeKey, lScopeTypeKey,
          nCost, nUnitCost, lQuantity,
          lClientKey, lDepartmentKey
        ) VALUES (
          @pendingKey, @scopeKey, @scopeTypeKey,
          @cost, @cost, 1,
          @clientKey, @deptKey
        )`,
        {
          pendingKey: parseInt(lPendingContractKey),
          scopeKey: s.lScopeKey || null,
          scopeTypeKey: s.lScopeTypeKey || null,
          cost: parseFloat(s.nCost) || 0,
          clientKey: s.lClientKey || null,
          deptKey: s.lDepartmentKey || null
        }
      );
    }
    res.json({ added: scopes.length, success: true });
  } catch (e) { next(e); }
});

// DELETE /PendingContract/RemoveScopeFromProposal
router.delete('/PendingContract/RemoveScopeFromProposal', async (req, res, next) => {
  try {
    const key = parseInt(req.query.lPendingContractScopeKey) || 0;
    if (!key) return res.status(400).json({ error: 'lPendingContractScopeKey required' });
    await db.query('DELETE FROM tblPendingContractScope WHERE lPendingContractScopeKey = @k', { k: key });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// POST /PendingContract/UpdateScopeCost
router.post('/PendingContract/UpdateScopeCost', async (req, res, next) => {
  try {
    const { lPendingContractScopeKey, nCost } = req.body || {};
    if (!lPendingContractScopeKey) return res.status(400).json({ error: 'lPendingContractScopeKey required' });
    const cost = parseFloat(nCost) || 0;
    await db.query(
      'UPDATE tblPendingContractScope SET nCost = @cost, nUnitCost = @cost WHERE lPendingContractScopeKey = @k',
      { cost, k: parseInt(lPendingContractScopeKey) }
    );
    res.json({ success: true, nCost: cost });
  } catch (e) { next(e); }
});

// POST /PendingContract/CreatePendingContract — New empty proposal
router.post('/PendingContract/CreatePendingContract', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.lClientKey) return res.status(400).json({ error: 'lClientKey required' });

    // Auto-fill billing address from client if not provided
    let billName1 = b.sPendingContractBillName1;
    let addr1 = b.sPendingContractAddr1;
    let city = b.sPendingContractCity;
    let state = b.sPendingContractState;
    let zip = b.sPendingContractZip;
    let phone = b.sPendingContractPhoneVoice;

    if (!addr1) {
      const client = await db.queryOne(`
        SELECT sClientName1, sMailAddr1, sMailCity, sMailState, sMailZip, sPhoneVoice
        FROM tblClient WHERE lClientKey = @k`, { k: parseInt(b.lClientKey) });
      if (client) {
        billName1 = billName1 || client.sClientName1;
        addr1 = client.sMailAddr1 || '';
        city = client.sMailCity || '';
        state = client.sMailState || '';
        zip = client.sMailZip || '';
        phone = phone || client.sPhoneVoice || '';
      }
    }

    // Build proposal name if not provided
    const proposalName = b.sPendingContractName1 || '';

    const result = await db.query(`
      INSERT INTO tblPendingContract (
        sPendingContractName1, sStatus, lTermMonths, dtCreationDate,
        lClientKey, lContractTypeKey, lSalesRepKey,
        lPendingContractAgreementTemplateKey,
        sPendingContractBillName1, sPendingContractBillName2,
        sPendingContractAddr1, sPendingContractAddr2,
        sPendingContractCity, sPendingContractState, sPendingContractZip,
        sPendingContractPhoneVoice
      ) VALUES (
        @name, 'Pending', @termMonths, GETDATE(),
        @clientKey, @typeKey, @repKey,
        5,
        @billName1, @billName2,
        @addr1, @addr2,
        @city, @state, @zip,
        @phone
      );
      SELECT SCOPE_IDENTITY() AS lPendingContractKey`,
      {
        name: proposalName,
        termMonths: parseInt(b.lTermMonths) || 12,
        clientKey: parseInt(b.lClientKey),
        typeKey: parseInt(b.lContractTypeKey) || null,
        repKey: parseInt(b.lSalesRepKey) || null,
        billName1: billName1 || '',
        billName2: b.sPendingContractBillName2 || '',
        addr1: addr1 || '',
        addr2: b.sPendingContractAddr2 || '',
        city: city || '',
        state: state || '',
        zip: zip || '',
        phone: phone || ''
      }
    );
    const newKey = result[0] ? parseInt(result[0].lPendingContractKey) : 0;
    res.json({ lPendingContractKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Contract/InitializeRenewal — Copy active contract into a new pending proposal
router.post('/Contract/InitializeRenewal', async (req, res, next) => {
  try {
    const contractKey = parseInt(req.body.plContractKey) || 0;
    if (!contractKey) return res.status(400).json({ error: 'plContractKey required' });

    // Load current contract
    const con = await db.queryOne(`
      SELECT con.lContractKey, con.lClientKey, con.lContractTypeKey, con.lSalesRepKey,
        con.dtDateEffective, con.dtDateTermination, con.dblAmtTotal, con.lPaymentTermsKey,
        con.sContractBillName1, con.sContractBillName2,
        con.sContractAddr1, con.sContractAddr2,
        con.sContractCity, con.sContractState, con.sContractZip,
        con.sContractPhoneVoice, con.sBillEmail,
        ISNULL(c.sClientName1,'') AS sClientName1,
        ISNULL(ct.sContractType,'') AS sContractTypeName
      FROM tblContract con
        LEFT JOIN tblClient c ON c.lClientKey = con.lClientKey
        LEFT JOIN tblContractTypes ct ON ct.lContractTypeKey = con.lContractTypeKey
      WHERE con.lContractKey = @k`, { k: contractKey });

    if (!con) return res.status(404).json({ error: 'Contract not found' });

    // Compute renewal term from existing contract dates
    const effDate = con.dtDateEffective ? new Date(con.dtDateEffective) : new Date();
    const termDate = con.dtDateTermination ? new Date(con.dtDateTermination) : new Date();
    const termMonths = Math.round(
      (termDate.getFullYear() - effDate.getFullYear()) * 12 +
      (termDate.getMonth() - effDate.getMonth())
    ) || 12;

    // Format today for proposal name
    const now = new Date();
    const dateStr = `${String(now.getMonth()+1).padStart(2,'0')}/${String(now.getDate()).padStart(2,'0')}/${now.getFullYear()}`;
    const proposalName = `Renewal Proposal: ${con.sClientName1} - ${con.sContractTypeName} ${dateStr}`;

    // Create pending contract header
    const result = await db.query(`
      INSERT INTO tblPendingContract (
        sPendingContractName1, sStatus, lTermMonths, dtCreationDate,
        lClientKey, lContractTypeKey, lSalesRepKey,
        lPendingContractAgreementTemplateKey,
        sPendingContractBillName1, sPendingContractBillName2,
        sPendingContractAddr1, sPendingContractAddr2,
        sPendingContractCity, sPendingContractState, sPendingContractZip,
        sPendingContractPhoneVoice
      ) VALUES (
        @name, 'Pending', @termMonths, GETDATE(),
        @clientKey, @typeKey, @repKey,
        5,
        @billName1, @billName2,
        @addr1, @addr2,
        @city, @state, @zip,
        @phone
      );
      SELECT SCOPE_IDENTITY() AS lPendingContractKey`,
      {
        name: proposalName,
        termMonths,
        clientKey: con.lClientKey,
        typeKey: con.lContractTypeKey,
        repKey: con.lSalesRepKey,
        billName1: con.sContractBillName1 || con.sClientName1,
        billName2: con.sContractBillName2 || '',
        addr1: con.sContractAddr1 || '',
        addr2: con.sContractAddr2 || '',
        city: con.sContractCity || '',
        state: con.sContractState || '',
        zip: con.sContractZip || '',
        phone: con.sContractPhoneVoice || ''
      }
    );
    const pendingKey = parseInt(result[0].lPendingContractKey);

    // Copy scopes from tblContractScope — distribute existing contract total evenly
    const scopes = await db.query(`
      SELECT cs.lScopeKey, s.lScopeTypeKey, s.lDepartmentKey,
        d.lClientKey AS scopeClientKey
      FROM tblContractScope cs
        LEFT JOIN tblScope s ON s.lScopeKey = cs.lScopeKey
        LEFT JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
      WHERE cs.lContractKey = @k`, { k: contractKey });

    const annualTotal = parseFloat(con.dblAmtTotal) || 0;
    const perScopeCost = scopes.length > 0
      ? Math.round((annualTotal / scopes.length) * 100) / 100
      : 0;

    for (const s of scopes) {
      await db.query(`
        INSERT INTO tblPendingContractScope (
          lPendingContractKey, lScopeKey, lScopeTypeKey,
          nCost, nUnitCost, lQuantity,
          lClientKey, lDepartmentKey
        ) VALUES (
          @pendingKey, @scopeKey, @scopeTypeKey,
          @cost, @cost, 1,
          @clientKey, @deptKey
        )`,
        {
          pendingKey,
          scopeKey: s.lScopeKey,
          scopeTypeKey: s.lScopeTypeKey || null,
          cost: perScopeCost,
          clientKey: s.scopeClientKey || con.lClientKey,
          deptKey: s.lDepartmentKey || null
        }
      );
    }

    res.json({ lPendingContractKey: pendingKey, scopeCount: scopes.length, success: true });
  } catch (e) { next(e); }
});

module.exports = router;
