-- ═══════════════════════════════════════════════════════
--  06-techs-users.sql — Technicians + Users
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblTechnicians ON;
INSERT INTO tblTechnicians (lTechnicianKey, sTechInits, sTechName, bIsActive, lServiceLocationKey) VALUES
  (1, 'RJ', 'Robert Johnson',   1, 1),
  (2, 'KP', 'Kevin Park',       1, 1),
  (3, 'AM', 'Anthony Miller',   1, 1),
  (4, 'TW', 'Tyler Washington', 1, 2),
  (5, 'JR', 'Jason Rodriguez',  1, 2),
  (6, 'BL', 'Brandon Lee',      1, 2);
SET IDENTITY_INSERT tblTechnicians OFF;

SET IDENTITY_INSERT tblUsers ON;
INSERT INTO tblUsers (lUserKey, sUserName, sUserFullName, sEmailAddress, bActive, sSupervisor, sInitials, sISOManager, bCustomerService, bNashvilleAccess, dtCreateDate) VALUES
  (1, 'jbrassell', 'Joseph Brassell', 'jbrassell@totalscope.com', 1, 'Y', 'JB', 'Y', 1, 1, '2025-01-01'),
  (2, 'slopez',    'Steve Lopez',     'slopez@totalscope.com',    1, 'Y', 'SL', 'N', 1, 1, '2025-01-01'),
  (3, 'mtorres',   'Michael Torres',  'mtorres@totalscope.com',   1, 'N', 'MT', 'N', 1, 0, '2025-01-01'),
  (4, 'schen',     'Sarah Chen',      'schen@totalscope.com',     1, 'N', 'SC', 'N', 1, 0, '2025-01-15'),
  (5, 'dwilliams', 'David Williams',  'dwilliams@totalscope.com', 1, 'N', 'DW', 'N', 0, 1, '2025-02-01');
SET IDENTITY_INSERT tblUsers OFF;
