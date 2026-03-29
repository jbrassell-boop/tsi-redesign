// ═══════════════════════════════════════════════════════
//  users.js — User management endpoints
// ═══════════════════════════════════════════════════════
// tblUsers: lUserKey, sUserName, sUserFullName, sEmailAddress, bActive,
//   sSupervisor, sInitials, sISOManager, sMarginApproval, dtLastLogin
const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/UserManagement/GetAll — All users
router.get('/UserManagement/GetAll', async (req, res, next) => {
  try {
    const includeInactive = req.query.includeInactive === '1';
    const rows = await db.query(`
      SELECT lUserKey, sUserName, sUserFullName, sEmailAddress,
        bActive, sSupervisor, sInitials, sISOManager,
        sMarginApproval, dtLastLogin, dtCreateDate,
        bCustomerService, bNashvilleAccess
      FROM tblUsers
      WHERE (@all = 1 OR bActive = 1)
      ORDER BY sUserFullName`, { all: includeInactive ? 1 : 0 });
    res.json(rows);
  } catch (e) { next(e); }
});

// POST /api/UserManagement/UpdateUser — Update user record
router.post('/UserManagement/UpdateUser', async (req, res, next) => {
  try {
    const b = req.body || {};
    const userKey = b.lUserKey || 0;
    if (!userKey) return res.status(400).json({ error: 'lUserKey required' });
    await db.query(`
      UPDATE tblUsers SET
        sUserFullName = ISNULL(@fullName, sUserFullName),
        sEmailAddress = ISNULL(@email, sEmailAddress),
        bActive = ISNULL(@active, bActive),
        sSupervisor = ISNULL(@supervisor, sSupervisor),
        sInitials = ISNULL(@initials, sInitials),
        sMarginApproval = ISNULL(@marginApproval, sMarginApproval),
        bCustomerService = ISNULL(@custService, bCustomerService),
        bNashvilleAccess = ISNULL(@nashAccess, bNashvilleAccess),
        dtLastDate = GETDATE()
      WHERE lUserKey = @userKey`,
      {
        userKey,
        fullName: b.sUserFullName || null,
        email: b.sEmailAddress || null,
        active: b.bActive != null ? b.bActive : null,
        supervisor: b.sSupervisor || null,
        initials: b.sInitials || null,
        marginApproval: b.sMarginApproval || null,
        custService: b.bCustomerService != null ? b.bCustomerService : null,
        nashAccess: b.bNashvilleAccess != null ? b.bNashvilleAccess : null
      });
    res.json({ success: true });
  } catch (e) { next(e); }
});

module.exports = router;
