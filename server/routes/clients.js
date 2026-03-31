// ═══════════════════════════════════════════════════════
//  clients.js — Client + Contact CRUD routes
// ═══════════════════════════════════════════════════════
const express = require('express');
const router = express.Router();
const db = require('../db');

// ── Shared SELECT for client list (enriched with JOINs) ──
// tblClient actual columns (relevant):
//   lClientKey, sClientName1, sClientName2,
//   sMailAddr1/2, sMailCity/State/Zip, sPhoneVoice, sPhoneFAX,
//   sBillAddr1/2, sBillCity/State/Zip, sShipAddr1/2, sShipCity/State/Zip,
//   lSalesRepKey, lPricingCategoryKey, lPaymentTermsKey, lCreditLimitKey, lDistributorKey,
//   bActive, mComments, dtCreateDate, dtLastUpdate
// NO: sShipName1, sBillName1, sEMailAddress, sBillEmail, bTaxExempt, sTaxExemptID, lServiceLocationKey, dtDateCreated
const CLIENT_SELECT = `
  SELECT c.lClientKey, c.sClientName1, c.sClientName2,
    c.sMailAddr1, c.sMailAddr2, c.sMailCity, c.sMailState, c.sMailZip,
    c.sShipAddr1, c.sShipAddr2, c.sShipCity, c.sShipState, c.sShipZip,
    c.sBillAddr1, c.sBillAddr2, c.sBillCity, c.sBillState, c.sBillZip,
    c.sPhoneVoice, c.sPhoneFAX,
    c.lSalesRepKey, c.lPricingCategoryKey, c.lPaymentTermsKey,
    c.lCreditLimitKey, c.lDistributorKey,
    c.bActive,
    c.mComments, c.dtCreateDate, c.dtLastUpdate,
    c.dtClientSince, c.lPortalMonths,
    c.sPORequired, c.bNeverHold, c.bSkipTracking, c.bEmailNewRepairs, c.sBadDebtRisk,
    c.sReferenceNum, c.sReferenceNum2, c.sClntTerms,
    c.lSalesTaxKey, c.lReportingGroupKey,
    c.sGPID, c.sGPIDSouth, c.sPeachTreeCustID,
    c.dblAdjustmentPct,
    LTRIM(RTRIM(ISNULL(sr.sRepFirst,'') + ' ' + ISNULL(sr.sRepLast,''))) AS sSalesRepName,
    sr.lSalesRepKey AS lSalesRepNameKey,
    ISNULL(pc.sPricingDescription, '') AS sPricingDescription,
    ISNULL(pc.sPricingDescription, '') AS sPricingCategory,
    ISNULL(pt.sTermsDesc, '') AS sPaymentTerms,
    ISNULL(dist.sDistName1, '') AS sDistName1
  FROM tblClient c
    LEFT JOIN tblSalesRep sr ON sr.lSalesRepKey = c.lSalesRepKey
    LEFT JOIN tblPricingCategory pc ON pc.lPricingCategoryKey = c.lPricingCategoryKey
    LEFT JOIN tblPaymentTerms pt ON pt.lPaymentTermsKey = c.lPaymentTermsKey
    LEFT JOIN tblDistributor dist ON dist.lDistributorKey = c.lDistributorKey
`;

// GET /Client/GetAllClientList — List all clients
router.get('/Client/GetAllClientList', async (req, res, next) => {
  try {
    const rows = await db.query(`${CLIENT_SELECT}
      WHERE c.bActive = 1
      ORDER BY c.sClientName1`);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Client/GetClientDetailsByClientId — Single client with contacts + departments
router.get('/Client/GetClientDetailsByClientId', async (req, res, next) => {
  try {
    const clientKey = parseInt(req.query.plClientKey) || 0;
    const client = await db.queryOne(`${CLIENT_SELECT}
      WHERE c.lClientKey = @clientKey`, { clientKey });
    if (!client) return res.json(null);
    // Attach contacts via tblContactTran (tblContacts has no lClientKey directly)
    client.contacts = await db.query(`
      SELECT con.lContactKey, con.sContactLast, con.sContactFirst,
        con.sContactPhoneVoice, con.sContactPhoneFAX, con.sContactEMail, con.bActive
      FROM tblContacts con
        INNER JOIN tblContactTran ct ON ct.lContactKey = con.lContactKey
      WHERE ct.lClientKey = @clientKey
      ORDER BY con.sContactLast, con.sContactFirst`, { clientKey });
    client.departments = await db.query(`
      SELECT lDepartmentKey, sDepartmentName, lServiceLocationKey
      FROM tblDepartment WHERE lClientKey = @clientKey
      ORDER BY sDepartmentName`, { clientKey });
    res.json(client);
  } catch (e) { next(e); }
});

// GET /Client/GetClientKPIs — Revenue, open repairs, scope count, avg TAT for a client
router.get('/Client/GetClientKPIs', async (req, res, next) => {
  try {
    const clientKey = parseInt(req.query.plClientKey) || 0;
    if (!clientKey) return res.json({ revenueYTD: 0, openRepairs: 0, scopeCount: 0, avgTAT: 0 });

    const row = await db.queryOne(`
      SELECT
        (SELECT ISNULL(SUM(gp.TotalAmountDue), 0)
         FROM tblGP_InvoiceStaging gp
         JOIN tblInvoice inv ON inv.lInvoiceKey = gp.lInvoiceKey
         JOIN tblRepair r ON r.lRepairKey = inv.lRepairKey
         JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
         WHERE d.lClientKey = @clientKey
           AND gp.dtTranDate >= DATEADD(YEAR, -1, GETDATE())) AS revenueYTD,

        (SELECT COUNT(*)
         FROM tblRepair r
         JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
         LEFT JOIN tblInvoice inv ON inv.lRepairKey = r.lRepairKey
         WHERE d.lClientKey = @clientKey AND inv.lRepairKey IS NULL) AS openRepairs,

        (SELECT COUNT(*)
         FROM tblScope s
         JOIN tblDepartment d ON d.lDepartmentKey = s.lDepartmentKey
         WHERE d.lClientKey = @clientKey) AS scopeCount,

        (SELECT AVG(DATEDIFF(DAY, r.dtDateIn, r.dtShipDate))
         FROM tblRepair r
         JOIN tblDepartment d ON d.lDepartmentKey = r.lDepartmentKey
         WHERE d.lClientKey = @clientKey
           AND r.dtShipDate IS NOT NULL
           AND r.dtDateIn >= DATEADD(YEAR, -1, GETDATE())) AS avgTAT
    `, { clientKey });

    res.json(row || { revenueYTD: 0, openRepairs: 0, scopeCount: 0, avgTAT: 0 });
  } catch (e) { next(e); }
});

// POST /Client/AddClient — Insert new client
// Removed non-existent columns: sShipName1, sBillName1, sEMailAddress, lServiceLocationKey
// dtDateCreated → dtCreateDate
router.post('/Client/AddClient', async (req, res, next) => {
  try {
    const b = req.body || {};
    const result = await db.query(`
      INSERT INTO tblClient (sClientName1, sClientName2,
        sMailAddr1, sMailAddr2, sMailCity, sMailState, sMailZip,
        sShipAddr1, sShipAddr2, sShipCity, sShipState, sShipZip,
        sBillAddr1, sBillAddr2, sBillCity, sBillState, sBillZip,
        sPhoneVoice, sPhoneFAX,
        lSalesRepKey, lPricingCategoryKey, lPaymentTermsKey,
        lCreditLimitKey, lDistributorKey,
        bActive, dtCreateDate)
      VALUES (@name1, @name2,
        @mailAddr1, @mailAddr2, @mailCity, @mailState, @mailZip,
        @shipAddr1, @shipAddr2, @shipCity, @shipState, @shipZip,
        @billAddr1, @billAddr2, @billCity, @billState, @billZip,
        @phone, @fax,
        @repKey, @pricingKey, @termsKey,
        @creditKey, @distKey,
        1, GETDATE());
      SELECT SCOPE_IDENTITY() AS lClientKey`,
      {
        name1: b.sClientName1 || b.psClientName1 || '',
        name2: b.sClientName2 || b.psClientName2 || '',
        mailAddr1: b.sMailAddr1 || b.sShipAddr1 || b.psAddress1 || '',
        mailAddr2: b.sMailAddr2 || b.sShipAddr2 || b.psAddress2 || '',
        mailCity: b.sMailCity || b.sShipCity || b.psCity || '',
        mailState: b.sMailState || b.sShipState || b.psState || '',
        mailZip: b.sMailZip || b.sShipZip || b.psZipCode || '',
        shipAddr1: b.sShipAddr1 || b.psAddress1 || '',
        shipAddr2: b.sShipAddr2 || b.psAddress2 || '',
        shipCity: b.sShipCity || b.psCity || '',
        shipState: b.sShipState || b.psState || '',
        shipZip: b.sShipZip || b.psZipCode || '',
        billAddr1: b.sBillAddr1 || b.psAddress1 || '',
        billAddr2: b.sBillAddr2 || b.psAddress2 || '',
        billCity: b.sBillCity || b.psCity || '',
        billState: b.sBillState || b.psState || '',
        billZip: b.sBillZip || b.psZipCode || '',
        phone: b.sPhoneVoice || b.psPhoneNumber || '',
        fax: b.sPhoneFAX || b.psFaxNumber || '',
        repKey: b.lSalesRepKey || b.plSalesRepKey || 0,
        pricingKey: b.lPricingCategoryKey || b.plPricingCategoryKey || 0,
        termsKey: b.lPaymentTermsKey || b.plPaymentTermsKey || 0,
        creditKey: b.lCreditLimitKey || b.plCreditLimitKey || 0,
        distKey: b.lDistributorKey || b.plDistributorKey || 0
      });
    const newKey = result[0] ? result[0].lClientKey : 0;
    res.json({ lClientKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Client/UpdateClient — Update client record
// Removed non-existent columns: sShipName1, sBillName1, sEMailAddress, lServiceLocationKey
router.post('/Client/UpdateClient', async (req, res, next) => {
  try {
    const b = req.body || {};
    const clientKey = b.lClientKey || 0;
    if (!clientKey) return res.status(400).json({ error: 'Missing client key' });
    await db.query(`
      UPDATE tblClient SET
        sClientName1 = ISNULL(@name1, sClientName1),
        sClientName2 = ISNULL(@name2, sClientName2),
        sMailAddr1 = ISNULL(@mailAddr1, sMailAddr1),
        sMailAddr2 = ISNULL(@mailAddr2, sMailAddr2),
        sMailCity = ISNULL(@mailCity, sMailCity),
        sMailState = ISNULL(@mailState, sMailState),
        sMailZip = ISNULL(@mailZip, sMailZip),
        sShipAddr1 = ISNULL(@shipAddr1, sShipAddr1),
        sShipAddr2 = ISNULL(@shipAddr2, sShipAddr2),
        sShipCity = ISNULL(@shipCity, sShipCity),
        sShipState = ISNULL(@shipState, sShipState),
        sShipZip = ISNULL(@shipZip, sShipZip),
        sBillAddr1 = ISNULL(@billAddr1, sBillAddr1),
        sBillAddr2 = ISNULL(@billAddr2, sBillAddr2),
        sBillCity = ISNULL(@billCity, sBillCity),
        sBillState = ISNULL(@billState, sBillState),
        sBillZip = ISNULL(@billZip, sBillZip),
        sPhoneVoice = ISNULL(@phone, sPhoneVoice),
        sPhoneFAX = ISNULL(@fax, sPhoneFAX),
        lSalesRepKey = ISNULL(@repKey, lSalesRepKey),
        lPricingCategoryKey = ISNULL(@pricingKey, lPricingCategoryKey),
        lPaymentTermsKey = ISNULL(@termsKey, lPaymentTermsKey),
        lCreditLimitKey = ISNULL(@creditKey, lCreditLimitKey),
        lDistributorKey = ISNULL(@distKey, lDistributorKey),
        bActive = ISNULL(@active, bActive),
        dtClientSince = ISNULL(@clientSince, dtClientSince),
        lPortalMonths = ISNULL(@portalMonths, lPortalMonths),
        sPORequired = ISNULL(@poRequired, sPORequired),
        bNeverHold = ISNULL(@neverHold, bNeverHold),
        bSkipTracking = ISNULL(@skipTracking, bSkipTracking),
        bEmailNewRepairs = ISNULL(@emailNewRepairs, bEmailNewRepairs),
        sBadDebtRisk = ISNULL(@badDebtRisk, sBadDebtRisk),
        sReferenceNum = ISNULL(@ref1, sReferenceNum),
        sReferenceNum2 = ISNULL(@ref2, sReferenceNum2),
        sClntTerms = ISNULL(@clntTerms, sClntTerms),
        lSalesTaxKey = ISNULL(@salesTaxKey, lSalesTaxKey),
        lReportingGroupKey = ISNULL(@reportingGroupKey, lReportingGroupKey),
        sGPID = ISNULL(@gpid, sGPID),
        sGPIDSouth = ISNULL(@gpidSouth, sGPIDSouth),
        sPeachTreeCustID = ISNULL(@peachtree, sPeachTreeCustID),
        dblAdjustmentPct = ISNULL(@adjPct, dblAdjustmentPct),
        dtLastUpdate = GETDATE()
      WHERE lClientKey = @clientKey`,
      {
        clientKey,
        name1: b.sClientName1 || b.psClientName1 || null,
        name2: b.sClientName2 || b.psClientName2 || null,
        mailAddr1: b.sMailAddr1 || b.sShipAddr1 || b.psAddress1 || null,
        mailAddr2: b.sMailAddr2 || b.psAddress2 || null,
        mailCity: b.sMailCity || b.sShipCity || b.psCity || null,
        mailState: b.sMailState || b.psState || null,
        mailZip: b.sMailZip || b.psZipCode || null,
        shipAddr1: b.sShipAddr1 || b.psAddress1 || null,
        shipAddr2: b.sShipAddr2 || b.psAddress2 || null,
        shipCity: b.sShipCity || b.psCity || null,
        shipState: b.sShipState || b.psState || null,
        shipZip: b.sShipZip || b.psZipCode || null,
        billAddr1: b.sBillAddr1 || b.psAddress1 || null,
        billAddr2: b.sBillAddr2 || b.psAddress2 || null,
        billCity: b.sBillCity || b.psCity || null,
        billState: b.sBillState || b.psState || null,
        billZip: b.sBillZip || b.psZipCode || null,
        phone: b.sPhoneVoice || b.psPhoneNumber || null,
        fax: b.sPhoneFAX || b.psFaxNumber || null,
        repKey: b.lSalesRepKey || b.plSalesRepKey || null,
        pricingKey: b.lPricingCategoryKey || b.plPricingCategoryKey || null,
        termsKey: b.lPaymentTermsKey || b.plPaymentTermsKey || null,
        creditKey: b.lCreditLimitKey || b.plCreditLimitKey || null,
        distKey: b.lDistributorKey || b.plDistributorKey || null,
        active: b.bActive != null ? b.bActive : null,
        clientSince: b.dtClientSince || b.pdtClientSince || null,
        portalMonths: b.lPortalMonths != null ? b.lPortalMonths : (b.plPortalMonths != null ? b.plPortalMonths : null),
        poRequired: b.sPORequired || b.psPORequired || null,
        neverHold: b.bNeverHold != null ? b.bNeverHold : (b.pbNeverHold != null ? b.pbNeverHold : null),
        skipTracking: b.bSkipTracking != null ? b.bSkipTracking : (b.pbSkipTracking != null ? b.pbSkipTracking : null),
        emailNewRepairs: b.bEmailNewRepairs != null ? b.bEmailNewRepairs : (b.pbEmailNewRepairs != null ? b.pbEmailNewRepairs : null),
        badDebtRisk: b.sBadDebtRisk || b.psBadDebtRisk || null,
        ref1: b.sReferenceNum || b.psReferenceNum || null,
        ref2: b.sReferenceNum2 || b.psReferenceNum2 || null,
        clntTerms: b.sClntTerms || b.psClntTerms || null,
        salesTaxKey: b.lSalesTaxKey != null ? b.lSalesTaxKey : (b.plSalesTaxKey != null ? b.plSalesTaxKey : null),
        reportingGroupKey: b.lReportingGroupKey != null ? b.lReportingGroupKey : (b.plReportingGroupKey != null ? b.plReportingGroupKey : null),
        gpid: b.sGPID || b.psGPID || null,
        gpidSouth: b.sGPIDSouth || b.psGPIDSouth || null,
        peachtree: b.sPeachTreeCustID || b.psPeachTreeCustID || null,
        adjPct: b.dblAdjustmentPct != null ? b.dblAdjustmentPct : (b.pdblAdjustmentPct != null ? b.pdblAdjustmentPct : null)
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// DELETE /Client/DeleteClient — Delete client
router.delete('/Client/DeleteClient', async (req, res, next) => {
  try {
    const clientKey = parseInt(req.query.plClientKey) || 0;
    if (!clientKey) return res.status(400).json({ error: 'Missing client key' });
    await db.query('DELETE FROM tblClient WHERE lClientKey = @clientKey', { clientKey });
    res.json({ success: true });
  } catch (e) { next(e); }
});

// GET /Client/GetCityStateUSA — Zip code lookup
// tblZipCode does not exist. tblSalesTaxByZip exists but is for tax, not city/state.
// Return empty result to prevent errors.
router.get('/Client/GetCityStateUSA', async (req, res, next) => {
  try {
    const zip = req.query.psZip || '';
    if (!zip) return res.json({ sCity: '', sState: '' });
    res.json({ sCity: '', sState: '' });
  } catch (e) { next(e); }
});

// GET /Contacts/GetContactsList — Contacts for a client or department
// tblContacts has no lClientKey/lDepartmentKey; linked via tblContactTran
router.get('/Contacts/GetContactsList', async (req, res, next) => {
  try {
    const clientKey = parseInt(req.query.plClientKey) || 0;
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    let where = '1=0';
    const params = {};
    if (clientKey) { where = 'ct.lClientKey = @clientKey'; params.clientKey = clientKey; }
    else if (deptKey) { where = 'ct.lDepartmentKey = @deptKey'; params.deptKey = deptKey; }
    const rows = await db.query(`
      SELECT con.* FROM tblContacts con
        INNER JOIN tblContactTran ct ON ct.lContactKey = con.lContactKey
      WHERE ${where}
      ORDER BY con.sContactLast, con.sContactFirst`, params);
    res.json(rows);
  } catch (e) { next(e); }
});

// GET /Contacts/GetAllContacts — All contacts for a department (or all)
router.get('/Contacts/GetAllContacts', async (req, res, next) => {
  try {
    const deptKey = parseInt(req.query.plDepartmentKey) || 0;
    if (deptKey) {
      const rows = await db.query(`
        SELECT con.* FROM tblContacts con
          INNER JOIN tblContactTran ct ON ct.lContactKey = con.lContactKey
        WHERE ct.lDepartmentKey = @deptKey
        ORDER BY con.sContactLast, con.sContactFirst`, { deptKey });
      return res.json(rows);
    }
    const rows = await db.query(`
      SELECT * FROM tblContacts
      ORDER BY sContactLast, sContactFirst`);
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /Contacts/AddContacts — Insert new contact + junction record
// tblContacts has no lClientKey/lDepartmentKey directly; linked via tblContactTran
router.post('/Contacts/AddContacts', async (req, res, next) => {
  try {
    const b = req.body || {};
    if (!b.sContactLast && !b.sContactFirst) {
      return res.status(400).json({ error: 'sContactFirst or sContactLast required' });
    }
    // Insert contact record
    const result = await db.query(`
      INSERT INTO tblContacts (sContactLast, sContactFirst,
        sContactPhoneVoice, sContactPhoneFAX, sContactEMail, bActive, dtCreateDate)
      VALUES (@last, @first, @phone, @fax, @email, 1, GETDATE());
      SELECT SCOPE_IDENTITY() AS lContactKey`,
      {
        last: b.sContactLast || '',
        first: b.sContactFirst || '',
        phone: b.sContactPhoneVoice || b.sContactPhone || '',
        fax: b.sContactPhoneFAX || b.sContactFax || '',
        email: b.sContactEMail || b.sContactEmail || ''
      });
    const newKey = result[0] ? result[0].lContactKey : 0;
    if (!newKey) return res.status(500).json({ error: 'Insert failed' });

    // Insert junction record linking contact to client or department
    const junctionParams = {
      contactKey: newKey,
      clientKey: b.lClientKey || null,
      deptKey: b.lDepartmentKey || null
    };
    await db.query(`
      INSERT INTO tblContactTran (lContactKey, lClientKey, lDepartmentKey, dtCreateDate)
      VALUES (@contactKey, @clientKey, @deptKey, GETDATE())`, junctionParams);

    res.json({ lContactKey: newKey, success: true });
  } catch (e) { next(e); }
});

// POST /Contacts/UpdateContacts — Update contact record
router.post('/Contacts/UpdateContacts', async (req, res, next) => {
  try {
    const b = req.body || {};
    const contactKey = b.lContactKey || 0;
    if (!contactKey) return res.status(400).json({ error: 'lContactKey required' });
    await db.query(`
      UPDATE tblContacts SET
        sContactLast = ISNULL(@last, sContactLast),
        sContactFirst = ISNULL(@first, sContactFirst),
        sContactPhoneVoice = ISNULL(@phone, sContactPhoneVoice),
        sContactPhoneFAX = ISNULL(@fax, sContactPhoneFAX),
        sContactEMail = ISNULL(@email, sContactEMail),
        bActive = ISNULL(@active, bActive),
        dtLastUpdate = GETDATE()
      WHERE lContactKey = @contactKey`,
      {
        contactKey,
        last: b.sContactLast || null,
        first: b.sContactFirst || null,
        phone: b.sContactPhoneVoice || b.sContactPhone || null,
        fax: b.sContactPhoneFAX || b.sContactFax || null,
        email: b.sContactEMail || b.sContactEmail || null,
        active: b.bActive != null ? b.bActive : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
