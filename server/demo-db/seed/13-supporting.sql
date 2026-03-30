-- ═══════════════════════════════════════════════════════
--  13-supporting.sql — Flags, contacts, pricing details, loaners
-- ═══════════════════════════════════════════════════════

-- Contacts
SET IDENTITY_INSERT tblContacts ON;
INSERT INTO tblContacts (lContactKey, sContactLast, sContactFirst, sContactPhoneVoice, sContactEMail, bActive, dtCreateDate) VALUES
  (1, 'Anderson', 'Patricia', '610-431-5001', 'panderson@pennmed.edu', 1, '2025-01-15'),
  (2, 'Baker',    'Robert',   '215-955-6100', 'rbaker@jefferson.edu', 1, '2025-01-15'),
  (3, 'Clark',    'Maria',    '610-338-8100', 'mclark@crozer.org', 1, '2025-01-20'),
  (4, 'Davis',    'James',    '484-337-3100', 'jdavis@mainlinehealth.org', 1, '2025-02-01'),
  (5, 'Evans',    'Lisa',     '615-322-5100', 'levans@vumc.org', 1, '2025-01-15'),
  (6, 'Foster',   'William',  '615-342-1100', 'wfoster@tristar.com', 1, '2025-02-01'),
  (7, 'Garcia',   'Jennifer', '856-641-8100', 'jgarcia@inspira.org', 1, '2025-02-15'),
  (8, 'Hill',     'Thomas',   '615-222-2200', 'thill@sth.org', 1, '2025-02-15');
SET IDENTITY_INSERT tblContacts OFF;

-- Contact Junction (link contacts to clients)
SET IDENTITY_INSERT tblContactTran ON;
INSERT INTO tblContactTran (lContactTranKey, lContactKey, lClientKey, lDepartmentKey, dtCreateDate) VALUES
  (1, 1, 1, 1, '2025-01-15'),
  (2, 2, 2, 3, '2025-01-15'),
  (3, 3, 3, 6, '2025-01-20'),
  (4, 4, 4, 8, '2025-02-01'),
  (5, 5, 8, 15, '2025-01-15'),
  (6, 6, 9, 18, '2025-02-01'),
  (7, 7, 5, 10, '2025-02-15'),
  (8, 8, 10, 20, '2025-02-15');
SET IDENTITY_INSERT tblContactTran OFF;

-- Flags
SET IDENTITY_INSERT tblFlags ON;
INSERT INTO tblFlags (lFlagKey, lFlagTypeKey, lOwnerKey, sFlag, bVisibleOnDI) VALUES
  (1, 1, 2, 'VIP customer — expedite all repairs', 1),
  (2, 1, 8, 'Contract pricing applies — verify before quoting', 1),
  (3, 2, 10, 'Duodenoscope — requires enhanced reprocessing documentation', 1),
  (4, 4, 11, 'Customer requested loaner for this repair', 0),
  (5, 1, 5, 'Government/VA — special invoicing requirements', 1),
  (6, 3, 15, 'Vanderbilt GI — high volume department', 0);
SET IDENTITY_INSERT tblFlags OFF;

-- Loaner Transactions
SET IDENTITY_INSERT tblLoanerTran ON;
INSERT INTO tblLoanerTran (lLoanerTranKey, lDepartmentKey, lScopeKey, lRepairKey, lSalesRepKey, lDeliveryMethodKey, sDateOut, sDateIn, sRepairClosed, dtCreateDate) VALUES
  (1, 3, 7,  7,  1, 2, '2026-03-21', NULL, 'N', '2026-03-21'),
  (2, 8, 20, 12, 2, 1, '2026-03-18', NULL, 'N', '2026-03-18'),
  (3, 15, 36, 26, 3, 3, '2026-03-27', NULL, 'N', '2026-03-27');
SET IDENTITY_INSERT tblLoanerTran OFF;

-- Pricing Details (all 28 repair items × 3 pricing categories = 84 rows)
SET IDENTITY_INSERT tblPricingDetail ON;
INSERT INTO tblPricingDetail (lPricingDetailKey, lPricingCategoryKey, lRepairItemKey, dblRepairPrice, dtCreateDate) VALUES
  -- ── Standard pricing (category 1) ─────────────────────────────────────────
  -- Standard = nUnitCost (list price)
  (1,  1,  1,  450.00,   '2025-01-01'),  -- Bending Rubber Replacement
  (2,  1,  2,  380.00,   '2025-01-01'),  -- Angulation Wire Replacement
  (3,  1,  3,  850.00,   '2025-01-01'),  -- Fiber Bundle Replacement
  (4,  1,  4,  1200.00,  '2025-01-01'),  -- Insertion Tube Replacement
  (5,  1,  5,  3500.00,  '2025-01-01'),  -- CCD/Image Sensor Replacement
  (6,  1,  6,  275.00,   '2025-01-01'),  -- Epoxy Seal Repair
  (7,  1,  7,  350.00,   '2025-01-01'),  -- Light Guide Replacement
  (8,  1,  8,  225.00,   '2025-01-01'),  -- Air/Water Channel Repair
  (9,  1,  9,  150.00,   '2025-01-01'),  -- Suction Channel Cleaning
  (10, 1,  10, 180.00,   '2025-01-01'),  -- Tip Cover Replacement
  (11, 1,  11, 350.00,   '2025-01-01'),  -- Flexible Scope PM Service
  (12, 1,  12, 75.00,    '2025-01-01'),  -- Leak Test & Inspection
  (13, 1,  13, 250.00,   '2025-01-01'),  -- Lens Polish/Resurface
  (14, 1,  14, 650.00,   '2025-01-01'),  -- Rod Lens Replacement
  (15, 1,  15, 375.00,   '2025-01-01'),  -- Eyepiece Repair
  (16, 1,  16, 425.00,   '2025-01-01'),  -- Housing/Barrel Repair
  (17, 1,  17, 300.00,   '2025-01-01'),  -- Fiber Optic Cable Replacement
  (18, 1,  18, 225.00,   '2025-01-01'),  -- Rigid Scope PM Service
  (19, 1,  19, 2800.00,  '2025-01-01'),  -- Camera Head CCD Replacement
  (20, 1,  20, 450.00,   '2025-01-01'),  -- Camera Cable Repair
  (21, 1,  21, 275.00,   '2025-01-01'),  -- Camera Head PM Service
  (22, 1,  22, 45.00,    '2025-01-01'),  -- Instrument Sharpening
  (23, 1,  23, 85.00,    '2025-01-01'),  -- Instrument Tip Repair
  (24, 1,  24, 125.00,   '2025-01-01'),  -- Instrument Handle Repair
  (25, 1,  25, 65.00,    '2025-01-01'),  -- Instrument Insulation Repair
  (26, 1,  26, 45.00,    '2025-01-01'),  -- Shipping & Handling
  (27, 1,  27, 150.00,   '2025-01-01'),  -- Rush Processing Fee
  (28, 1,  28, 125.00,   '2025-01-01'),  -- Evaluation Fee (non-repair)
  -- ── Contract pricing (category 2) — ~15% off standard ─────────────────────
  (29, 2,  1,  382.50,   '2025-01-01'),  -- Bending Rubber Replacement
  (30, 2,  2,  323.00,   '2025-01-01'),  -- Angulation Wire Replacement
  (31, 2,  3,  722.50,   '2025-01-01'),  -- Fiber Bundle Replacement
  (32, 2,  4,  1020.00,  '2025-01-01'),  -- Insertion Tube Replacement
  (33, 2,  5,  2975.00,  '2025-01-01'),  -- CCD/Image Sensor Replacement
  (34, 2,  6,  233.75,   '2025-01-01'),  -- Epoxy Seal Repair
  (35, 2,  7,  297.50,   '2025-01-01'),  -- Light Guide Replacement
  (36, 2,  8,  191.25,   '2025-01-01'),  -- Air/Water Channel Repair
  (37, 2,  9,  127.50,   '2025-01-01'),  -- Suction Channel Cleaning
  (38, 2,  10, 153.00,   '2025-01-01'),  -- Tip Cover Replacement
  (39, 2,  11, 297.50,   '2025-01-01'),  -- Flexible Scope PM Service
  (40, 2,  12, 63.75,    '2025-01-01'),  -- Leak Test & Inspection
  (41, 2,  13, 212.50,   '2025-01-01'),  -- Lens Polish/Resurface
  (42, 2,  14, 552.50,   '2025-01-01'),  -- Rod Lens Replacement
  (43, 2,  15, 318.75,   '2025-01-01'),  -- Eyepiece Repair
  (44, 2,  16, 361.25,   '2025-01-01'),  -- Housing/Barrel Repair
  (45, 2,  17, 255.00,   '2025-01-01'),  -- Fiber Optic Cable Replacement
  (46, 2,  18, 191.25,   '2025-01-01'),  -- Rigid Scope PM Service
  (47, 2,  19, 2380.00,  '2025-01-01'),  -- Camera Head CCD Replacement
  (48, 2,  20, 382.50,   '2025-01-01'),  -- Camera Cable Repair
  (49, 2,  21, 233.75,   '2025-01-01'),  -- Camera Head PM Service
  (50, 2,  22, 38.25,    '2025-01-01'),  -- Instrument Sharpening
  (51, 2,  23, 72.25,    '2025-01-01'),  -- Instrument Tip Repair
  (52, 2,  24, 106.25,   '2025-01-01'),  -- Instrument Handle Repair
  (53, 2,  25, 55.25,    '2025-01-01'),  -- Instrument Insulation Repair
  (54, 2,  26, 45.00,    '2025-01-01'),  -- Shipping & Handling (no discount)
  (55, 2,  27, 127.50,   '2025-01-01'),  -- Rush Processing Fee
  (56, 2,  28, 106.25,   '2025-01-01'),  -- Evaluation Fee (non-repair)
  -- ── Government/VA pricing (category 3) — ~25% off standard ────────────────
  (57, 3,  1,  337.50,   '2025-01-01'),  -- Bending Rubber Replacement
  (58, 3,  2,  285.00,   '2025-01-01'),  -- Angulation Wire Replacement
  (59, 3,  3,  637.50,   '2025-01-01'),  -- Fiber Bundle Replacement
  (60, 3,  4,  900.00,   '2025-01-01'),  -- Insertion Tube Replacement
  (61, 3,  5,  2625.00,  '2025-01-01'),  -- CCD/Image Sensor Replacement
  (62, 3,  6,  206.25,   '2025-01-01'),  -- Epoxy Seal Repair
  (63, 3,  7,  262.50,   '2025-01-01'),  -- Light Guide Replacement
  (64, 3,  8,  168.75,   '2025-01-01'),  -- Air/Water Channel Repair
  (65, 3,  9,  112.50,   '2025-01-01'),  -- Suction Channel Cleaning
  (66, 3,  10, 135.00,   '2025-01-01'),  -- Tip Cover Replacement
  (67, 3,  11, 262.50,   '2025-01-01'),  -- Flexible Scope PM Service
  (68, 3,  12, 56.25,    '2025-01-01'),  -- Leak Test & Inspection
  (69, 3,  13, 187.50,   '2025-01-01'),  -- Lens Polish/Resurface
  (70, 3,  14, 487.50,   '2025-01-01'),  -- Rod Lens Replacement
  (71, 3,  15, 281.25,   '2025-01-01'),  -- Eyepiece Repair
  (72, 3,  16, 318.75,   '2025-01-01'),  -- Housing/Barrel Repair
  (73, 3,  17, 225.00,   '2025-01-01'),  -- Fiber Optic Cable Replacement
  (74, 3,  18, 168.75,   '2025-01-01'),  -- Rigid Scope PM Service
  (75, 3,  19, 2100.00,  '2025-01-01'),  -- Camera Head CCD Replacement
  (76, 3,  20, 337.50,   '2025-01-01'),  -- Camera Cable Repair
  (77, 3,  21, 206.25,   '2025-01-01'),  -- Camera Head PM Service
  (78, 3,  22, 33.75,    '2025-01-01'),  -- Instrument Sharpening
  (79, 3,  23, 63.75,    '2025-01-01'),  -- Instrument Tip Repair
  (80, 3,  24, 93.75,    '2025-01-01'),  -- Instrument Handle Repair
  (81, 3,  25, 48.75,    '2025-01-01'),  -- Instrument Insulation Repair
  (82, 3,  26, 45.00,    '2025-01-01'),  -- Shipping & Handling (no discount)
  (83, 3,  27, 112.50,   '2025-01-01'),  -- Rush Processing Fee
  (84, 3,  28, 93.75,    '2025-01-01');  -- Evaluation Fee (non-repair)
SET IDENTITY_INSERT tblPricingDetail OFF;

-- Sub Groups
SET IDENTITY_INSERT tblSubGroups ON;
INSERT INTO tblSubGroups (llSubGroupKey, sSubGroup) VALUES
  (1, 'Endoscopy'),
  (2, 'General Surgery'),
  (3, 'Orthopedics'),
  (4, 'Pulmonary'),
  (5, 'Urology');
SET IDENTITY_INSERT tblSubGroups OFF;
