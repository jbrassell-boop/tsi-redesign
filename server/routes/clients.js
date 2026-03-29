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
        name1: b.sClientName1 || '',
        name2: b.sClientName2 || '',
        mailAddr1: b.sMailAddr1 || b.sShipAddr1 || '',
        mailAddr2: b.sMailAddr2 || b.sShipAddr2 || '',
        mailCity: b.sMailCity || b.sShipCity || '',
        mailState: b.sMailState || b.sShipState || '',
        mailZip: b.sMailZip || b.sShipZip || '',
        shipAddr1: b.sShipAddr1 || '',
        shipAddr2: b.sShipAddr2 || '',
        shipCity: b.sShipCity || '',
        shipState: b.sShipState || '',
        shipZip: b.sShipZip || '',
        billAddr1: b.sBillAddr1 || '',
        billAddr2: b.sBillAddr2 || '',
        billCity: b.sBillCity || '',
        billState: b.sBillState || '',
        billZip: b.sBillZip || '',
        phone: b.sPhoneVoice || '',
        fax: b.sPhoneFAX || '',
        repKey: b.lSalesRepKey || 0,
        pricingKey: b.lPricingCategoryKey || 0,
        termsKey: b.lPaymentTermsKey || 0,
        creditKey: b.lCreditLimitKey || 0,
        distKey: b.lDistributorKey || 0
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
        dtLastUpdate = GETDATE()
      WHERE lClientKey = @clientKey`,
      {
        clientKey,
        name1: b.sClientName1 || null,
        name2: b.sClientName2 || null,
        mailAddr1: b.sMailAddr1 || null,
        mailAddr2: b.sMailAddr2 || null,
        mailCity: b.sMailCity || null,
        mailState: b.sMailState || null,
        mailZip: b.sMailZip || null,
        shipAddr1: b.sShipAddr1 || null,
        shipAddr2: b.sShipAddr2 || null,
        shipCity: b.sShipCity || null,
        shipState: b.sShipState || null,
        shipZip: b.sShipZip || null,
        billAddr1: b.sBillAddr1 || null,
        billAddr2: b.sBillAddr2 || null,
        billCity: b.sBillCity || null,
        billState: b.sBillState || null,
        billZip: b.sBillZip || null,
        phone: b.sPhoneVoice || null,
        fax: b.sPhoneFAX || null,
        repKey: b.lSalesRepKey || null,
        pricingKey: b.lPricingCategoryKey || null,
        termsKey: b.lPaymentTermsKey || null,
        creditKey: b.lCreditLimitKey || null,
        distKey: b.lDistributorKey || null,
        active: b.bActive != null ? b.bActive : null
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
