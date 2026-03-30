-- ═══════════════════════════════════════════════════════
--  08-repair-details.sql — Repair item catalog + line items
-- ═══════════════════════════════════════════════════════

-- Repair Item Catalog (repair codes)
SET IDENTITY_INSERT tblRepairItem ON;
INSERT INTO tblRepairItem (lRepairItemKey, sItemDescription, sTSICode, sRigidOrFlexible, sPartOrLabor, sMajorRepair, nUnitCost, bActive) VALUES
  -- Flexible items
  (1,  'Bending Rubber Replacement',       'FL-001', 'F', 'Part',  'Y', 450.00, 1),
  (2,  'Angulation Wire Replacement',       'FL-002', 'F', 'Part',  'Y', 380.00, 1),
  (3,  'Fiber Bundle Replacement',          'FL-003', 'F', 'Part',  'Y', 850.00, 1),
  (4,  'Insertion Tube Replacement',        'FL-004', 'F', 'Part',  'Y', 1200.00, 1),
  (5,  'CCD/Image Sensor Replacement',      'FL-005', 'F', 'Part',  'Y', 3500.00, 1),
  (6,  'Epoxy Seal Repair',                'FL-006', 'F', 'Part',  'N', 275.00, 1),
  (7,  'Light Guide Replacement',           'FL-007', 'F', 'Part',  'N', 350.00, 1),
  (8,  'Air/Water Channel Repair',          'FL-008', 'F', 'Part',  'N', 225.00, 1),
  (9,  'Suction Channel Cleaning',          'FL-009', 'F', 'Labor', 'N', 150.00, 1),
  (10, 'Tip Cover Replacement',             'FL-010', 'F', 'Part',  'N', 180.00, 1),
  (11, 'Flexible Scope PM Service',         'FL-PM',  'F', 'Labor', 'N', 350.00, 1),
  (12, 'Leak Test & Inspection',            'FL-LT',  'F', 'Labor', 'N', 75.00, 1),
  -- Rigid items
  (13, 'Lens Polish/Resurface',             'RG-001', 'R', 'Labor', 'N', 250.00, 1),
  (14, 'Rod Lens Replacement',              'RG-002', 'R', 'Part',  'Y', 650.00, 1),
  (15, 'Eyepiece Repair',                   'RG-003', 'R', 'Part',  'N', 375.00, 1),
  (16, 'Housing/Barrel Repair',             'RG-004', 'R', 'Part',  'N', 425.00, 1),
  (17, 'Fiber Optic Cable Replacement',     'RG-005', 'R', 'Part',  'N', 300.00, 1),
  (18, 'Rigid Scope PM Service',            'RG-PM',  'R', 'Labor', 'N', 225.00, 1),
  -- Camera items
  (19, 'Camera Head CCD Replacement',       'CM-001', 'C', 'Part',  'Y', 2800.00, 1),
  (20, 'Camera Cable Repair',               'CM-002', 'C', 'Part',  'N', 450.00, 1),
  (21, 'Camera Head PM Service',            'CM-PM',  'C', 'Labor', 'N', 275.00, 1),
  -- Instrument items (sRigidOrFlexible = 'I')
  (22, 'Instrument Sharpening',             'IN-001', 'I', 'Labor', 'N', 45.00, 1),
  (23, 'Instrument Tip Repair',             'IN-002', 'I', 'Part',  'N', 85.00, 1),
  (24, 'Instrument Handle Repair',          'IN-003', 'I', 'Part',  'N', 125.00, 1),
  (25, 'Instrument Insulation Repair',      'IN-004', 'I', 'Part',  'N', 65.00, 1),
  -- General
  (26, 'Shipping & Handling',               'GN-SH',  NULL, 'Part',  'N', 45.00, 1),
  (27, 'Rush Processing Fee',               'GN-RSH', NULL, 'Labor', 'N', 150.00, 1),
  (28, 'Evaluation Fee (non-repair)',        'GN-EVL', NULL, 'Labor', 'N', 125.00, 1);
SET IDENTITY_INSERT tblRepairItem OFF;

-- Repair Line Items (2-5 per repair for active repairs)
SET IDENTITY_INSERT tblRepairItemTran ON;
INSERT INTO tblRepairItemTran (lRepairItemTranKey, lRepairKey, lRepairItemKey, lTechnicianKey, sApproved, dblRepairPrice, sComments, sInitials) VALUES
  -- NR250006 (repair 6) — fiber bundle
  (1, 6, 3, 1, 'Y', 850.00, 'Fiber bundle damaged - 15% loss', 'RJ'),
  (2, 6, 12, 1, 'Y', 75.00, 'Leak test pass', 'RJ'),
  -- NR250007 (repair 7) — tip + angulation
  (3, 7, 10, 1, 'Y', 180.00, 'Tip cover cracked', 'RJ'),
  (4, 7, 2, 1, 'Y', 380.00, 'Angulation wire stretched', 'RJ'),
  (5, 7, 11, 1, 'Y', 350.00, 'PM included', 'RJ'),
  -- NR250010 (repair 10) — full angulation rebuild
  (6, 10, 1, 1, 'N', 450.00, 'Bending rubber deteriorated', 'RJ'),
  (7, 10, 2, 1, 'N', 380.00, 'Both angulation wires need replacement', 'RJ'),
  (8, 10, 6, 1, 'N', 275.00, 'Epoxy rebuild', 'RJ'),
  (9, 10, 11, 1, 'N', 350.00, 'PM service', 'RJ'),
  -- NR250011 (repair 11) — CCD replacement
  (10, 11, 5, 2, 'N', 3500.00, 'CCD sensor dead', 'KP'),
  (11, 11, 12, 2, 'N', 75.00, 'Leak test', 'KP'),
  -- NR250013 (repair 13) — bending section
  (12, 13, 1, 2, 'Y', 450.00, 'Approved', 'KP'),
  (13, 13, 2, 2, 'Y', 380.00, 'Approved', 'KP'),
  (14, 13, 6, 2, 'Y', 275.00, 'Approved', 'KP'),
  -- NR250014 (repair 14) — arthroscope lens
  (15, 14, 13, 1, 'Y', 250.00, 'Lens polish', 'RJ'),
  (16, 14, 14, 1, 'Y', 650.00, 'Rod lens cracked', 'RJ'),
  -- NR250017 (repair 17) — fluid invasion
  (17, 17, 6, 1, 'Y', 275.00, 'Epoxy seal repair', 'RJ'),
  (18, 17, 8, 1, 'Y', 225.00, 'A/W channel repair', 'RJ'),
  (19, 17, 9, 1, 'Y', 150.00, 'Suction clean', 'RJ'),
  (20, 17, 11, 1, 'Y', 350.00, 'PM service', 'RJ'),
  -- NR250020 (repair 20) — duodenoscope rebuild
  (21, 20, 1, 1, 'Y', 450.00, NULL, 'RJ'),
  (22, 20, 2, 1, 'Y', 380.00, NULL, 'RJ'),
  (23, 20, 4, 1, 'Y', 1200.00, 'Full insertion tube', 'RJ'),
  (24, 20, 6, 1, 'Y', 275.00, NULL, 'RJ'),
  (25, 20, 11, 1, 'Y', 350.00, NULL, 'RJ'),
  -- NR250022 (repair 22) — fiber bundle shipped
  (26, 22, 3, 1, 'Y', 850.00, 'Fiber bundle replaced', 'RJ'),
  (27, 22, 12, 1, 'Y', 75.00, 'Leak test pass', 'RJ'),
  -- NR250025 (repair 25) — camera shipped
  (28, 25, 19, 1, 'Y', 2800.00, 'CCD replaced', 'RJ'),
  (29, 25, 21, 1, 'Y', 275.00, 'PM included', 'RJ'),
  -- South repairs
  (30, 28, 3, 4, 'Y', 900.00, 'Fiber assessment', 'TW'),
  (31, 29, 10, 5, 'Y', 180.00, 'Tip cover', 'JR'),
  (32, 29, 11, 5, 'Y', 350.00, 'PM service', 'JR'),
  (33, 32, 1, 4, 'Y', 450.00, 'Bending rubber', 'TW'),
  (34, 32, 2, 4, 'Y', 380.00, 'Angulation wires', 'TW'),
  (35, 35, 13, 4, 'Y', 250.00, 'Lens polish', 'TW'),
  (36, 35, 18, 4, 'Y', 225.00, 'PM service', 'TW'),
  (37, 37, 1, 4, 'Y', 450.00, 'Bending rubber', 'TW'),
  (38, 37, 11, 4, 'Y', 350.00, 'PM included', 'TW'),
  (39, 39, 8, 6, 'Y', 225.00, 'A/W repair', 'BL'),
  (40, 39, 9, 6, 'Y', 150.00, 'Suction clean', 'BL'),
  (41, 39, 11, 6, 'Y', 350.00, 'PM service', 'BL');
SET IDENTITY_INSERT tblRepairItemTran OFF;

-- Status transition records for completed repairs
SET IDENTITY_INSERT tblStatusTran ON;
INSERT INTO tblStatusTran (lStatusTranKey, lRepairKey, lStatusKey, sStatusDesc, dtCompleteDate, dtCreateDate, lUserKey) VALUES
  -- NR250025 (repair 25) — full North lifecycle, shipped
  (1,  25, 1, 'Scope In',       '2026-02-10', '2026-02-10', 1),
  (2,  25, 3, 'Evaluation',     '2026-02-12', '2026-02-12', 1),
  (3,  25, 5, 'Quote Approved', '2026-02-15', '2026-02-15', 1),
  (4,  25, 6, 'In Repair',      '2026-02-18', '2026-02-18', 1),
  (5,  25, 7, 'QC Check',       '2026-02-27', '2026-02-27', 1),
  (6,  25, 8, 'Shipped',        '2026-03-02', '2026-03-02', 1),
  -- SR250012 (repair 37) — South lifecycle, shipped
  (7,  37, 1, 'Scope In',       '2026-02-05', '2026-02-05', 5),
  (8,  37, 3, 'Evaluation',     '2026-02-07', '2026-02-07', 5),
  (9,  37, 5, 'Quote Approved', '2026-02-09', '2026-02-09', 5),
  (10, 37, 6, 'In Repair',      '2026-02-10', '2026-02-10', 5),
  (11, 37, 7, 'QC Check',       '2026-02-24', '2026-02-24', 5),
  (12, 37, 8, 'Shipped',        '2026-02-26', '2026-02-26', 5),
  -- SR250013 (repair 38) — South shipped
  (13, 38, 1, 'Scope In',       '2026-02-08', '2026-02-08', 5),
  (14, 38, 3, 'Evaluation',     '2026-02-10', '2026-02-10', 5),
  (15, 38, 5, 'Quote Approved', '2026-02-13', '2026-02-13', 5),
  (16, 38, 6, 'In Repair',      '2026-02-15', '2026-02-15', 5),
  (17, 38, 7, 'QC Check',       '2026-02-26', '2026-02-26', 5),
  (18, 38, 8, 'Shipped',        '2026-03-01', '2026-03-01', 5),
  -- SR250014 (repair 39) — South invoiced/closed
  (19, 39, 1, 'Scope In',       '2026-01-15', '2026-01-15', 5),
  (20, 39, 3, 'Evaluation',     '2026-01-17', '2026-01-17', 5),
  (21, 39, 5, 'Quote Approved', '2026-01-20', '2026-01-20', 5),
  (22, 39, 6, 'In Repair',      '2026-01-23', '2026-01-23', 5),
  (23, 39, 7, 'QC Check',       '2026-02-08', '2026-02-08', 5),
  (24, 39, 8, 'Shipped',        '2026-02-11', '2026-02-11', 5),
  (25, 39, 9, 'Invoiced',       '2026-02-15', '2026-02-15', 5),
  -- SR250015 (repair 40) — South invoiced/closed
  (26, 40, 1, 'Scope In',       '2026-01-20', '2026-01-20', 5),
  (27, 40, 3, 'Evaluation',     '2026-01-22', '2026-01-22', 5),
  (28, 40, 5, 'Quote Approved', '2026-01-26', '2026-01-26', 5),
  (29, 40, 6, 'In Repair',      '2026-01-28', '2026-01-28', 5),
  (30, 40, 7, 'QC Check',       '2026-02-12', '2026-02-12', 5),
  (31, 40, 8, 'Shipped',        '2026-02-16', '2026-02-16', 5),
  (32, 40, 9, 'Invoiced',       '2026-02-20', '2026-02-20', 5),
  -- NR250022 (repair 22) — partial transitions, scheduled to ship
  (33, 22, 1, 'Scope In',       '2026-02-20', '2026-02-20', 1),
  (34, 22, 3, 'Evaluation',     '2026-02-22', '2026-02-22', 1),
  (35, 22, 5, 'Quote Approved', '2026-02-26', '2026-02-26', 1),
  (36, 22, 6, 'In Repair',      '2026-03-01', '2026-03-01', 1),
  (37, 22, 7, 'QC Check',       '2026-03-13', '2026-03-13', 1),
  (38, 22, 10, 'Scheduled to Ship', '2026-03-15', '2026-03-15', 1),
  -- NR250023 (repair 23) — partial transitions, scheduled to ship
  (39, 23, 1, 'Scope In',       '2026-02-22', '2026-02-22', 1),
  (40, 23, 3, 'Evaluation',     '2026-02-25', '2026-02-25', 1),
  (41, 23, 5, 'Quote Approved', '2026-03-01', '2026-03-01', 1),
  (42, 23, 6, 'In Repair',      '2026-03-03', '2026-03-03', 1),
  (43, 23, 10, 'Scheduled to Ship', '2026-03-16', '2026-03-16', 1),
  -- NR250024 (repair 24) — partial transitions, scheduled to ship
  (44, 24, 1, 'Scope In',       '2026-02-25', '2026-02-25', 1),
  (45, 24, 3, 'Evaluation',     '2026-02-27', '2026-02-27', 1),
  (46, 24, 5, 'Quote Approved', '2026-03-05', '2026-03-05', 1),
  (47, 24, 6, 'In Repair',      '2026-03-08', '2026-03-08', 1),
  (48, 24, 12, 'Ready to Pack',  '2026-03-18', '2026-03-18', 1),
  -- SR250010 (repair 35) — partial transitions, scheduled to ship
  (49, 35, 1, 'Scope In',       '2026-02-18', '2026-02-18', 5),
  (50, 35, 3, 'Evaluation',     '2026-02-20', '2026-02-20', 5),
  (51, 35, 5, 'Quote Approved', '2026-02-24', '2026-02-24', 5),
  (52, 35, 6, 'In Repair',      '2026-02-26', '2026-02-26', 5),
  (53, 35, 10, 'Scheduled to Ship', '2026-03-12', '2026-03-12', 5),
  -- SR250011 (repair 36) — partial transitions, scheduled to ship
  (54, 36, 1, 'Scope In',       '2026-02-20', '2026-02-20', 5),
  (55, 36, 3, 'Evaluation',     '2026-02-23', '2026-02-23', 5),
  (56, 36, 5, 'Quote Approved', '2026-02-27', '2026-02-27', 5),
  (57, 36, 6, 'In Repair',      '2026-03-01', '2026-03-01', 5),
  (58, 36, 12, 'Ready to Pack',  '2026-03-14', '2026-03-14', 5);
SET IDENTITY_INSERT tblStatusTran OFF;
