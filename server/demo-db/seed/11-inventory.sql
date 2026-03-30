-- ═══════════════════════════════════════════════════════
--  11-inventory.sql — Inventory parts + sizes
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblInventory ON;
INSERT INTO tblInventory (lInventoryKey, sItemDescription, sRigidOrFlexible, nLevelMinimum, nLevelMaximum, nLevelCurrent, bActive, dtCreateDate) VALUES
  (1, 'Bending Rubber - Olympus',        'F', 5, 20, 12, 1, '2025-01-01'),
  (2, 'Angulation Wire Set - Universal',  'F', 3, 15, 8,  1, '2025-01-01'),
  (3, 'Fiber Bundle - Olympus GIF',       'F', 2, 10, 5,  1, '2025-01-01'),
  (4, 'Insertion Tube - Olympus CF',       'F', 1, 5,  3,  1, '2025-01-01'),
  (5, 'CCD Sensor - Olympus',             'F', 1, 3,  2,  1, '2025-01-01'),
  (6, 'Epoxy Kit - Proximal',             'F', 10, 50, 28, 1, '2025-01-01'),
  (7, 'Light Guide Cable',                'F', 3, 10, 7,  1, '2025-01-01'),
  (8, 'Tip Cover - Olympus GIF',          'F', 10, 30, 18, 1, '2025-01-01'),
  (9, 'Rod Lens - Karl Storz 4mm',        'R', 2, 8,  5,  1, '2025-01-01'),
  (10, 'Rod Lens - Karl Storz 10mm',      'R', 2, 8,  4,  1, '2025-01-01'),
  (11, 'Eyepiece Assembly - Universal',    'R', 2, 6,  3,  1, '2025-01-01'),
  (12, 'Camera CCD - Stryker 1288',       'C', 1, 3,  2,  1, '2025-01-01');
SET IDENTITY_INSERT tblInventory OFF;

SET IDENTITY_INSERT tblInventorySize ON;
INSERT INTO tblInventorySize (lInventorySizeKey, lInventoryKey, sSizeDescription, sRigidOrFlexible, nLevelMinimum, nLevelMaximum, nLevelCurrent, dblUnitCost, bActive, sBinNumber) VALUES
  (1, 1, '9.9mm OD',    'F', 2, 10, 5,  85.00,  1, 'A-101'),
  (2, 1, '11.5mm OD',   'F', 2, 10, 4,  95.00,  1, 'A-102'),
  (3, 1, '12.8mm OD',   'F', 1, 5,  3,  105.00, 1, 'A-103'),
  (4, 2, 'Standard Set', 'F', 3, 15, 8,  45.00,  1, 'A-201'),
  (5, 3, 'GIF-H190',    'F', 1, 5,  3,  320.00, 1, 'B-101'),
  (6, 3, 'GIF-HQ190',   'F', 1, 5,  2,  350.00, 1, 'B-102'),
  (7, 4, 'CF-HQ190L',   'F', 1, 3,  2,  480.00, 1, 'B-201'),
  (8, 4, 'PCF-H190DL',  'F', 0, 2,  1,  520.00, 1, 'B-202'),
  (9, 5, 'CCD-190',     'F', 1, 3,  2,  1800.00,1, 'C-101'),
  (10, 6, 'Standard Kit','F', 5, 25, 14, 22.00,  1, 'D-101'),
  (11, 6, 'Large Kit',   'F', 3, 15, 10, 28.00,  1, 'D-102'),
  (12, 7, '2.5m Length', 'F', 2, 8,  5,  125.00, 1, 'D-201'),
  (13, 8, 'GIF Standard','F', 5, 15, 10, 35.00,  1, 'D-301'),
  (14, 8, 'CF Standard', 'F', 5, 15, 8,  38.00,  1, 'D-302'),
  (15, 9, '4mm 30deg',   'R', 1, 4,  3,  280.00, 1, 'E-101'),
  (16, 9, '4mm 70deg',   'R', 1, 4,  2,  295.00, 1, 'E-102'),
  (17, 10, '10mm 0deg',  'R', 1, 4,  2,  310.00, 1, 'E-201'),
  (18, 10, '10mm 30deg', 'R', 1, 4,  2,  325.00, 1, 'E-202'),
  (19, 11, 'Standard',   'R', 1, 3,  2,  175.00, 1, 'E-301'),
  (20, 12, '1288 CCD',   'C', 1, 2,  1,  1400.00,1, 'F-101'),
  (21, 12, '1588 CCD',   'C', 0, 2,  1,  1650.00,1, 'F-102');
SET IDENTITY_INSERT tblInventorySize OFF;
