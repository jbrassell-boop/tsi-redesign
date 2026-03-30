-- ═══════════════════════════════════════════════════════
--  09-contracts.sql — Contracts + departments + scopes
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblContract ON;
INSERT INTO tblContract (lContractKey, sContractNumber, sContractName1, lClientKey, lContractTypeKey, lSalesRepKey, lPaymentTermsKey, dtDateEffective, dtDateTermination, dblAmtTotal, dblAmtInvoiced, nCountFlexible, nCountRigid, nCountCamera, nCountAll, lBillType, lBillDay, sPurchaseOrder, dtCreateDate) VALUES
  (1, 'NC260001', 'Jefferson Capitated 2026',    2, 1, 1, 1, '2026-01-01', '2026-12-31', 48000.00, 12000.00, 4, 3, 1, 8, 1, 1, 'JEF-CAP-2026', '2025-12-15'),
  (2, 'NC260002', 'Main Line Shared Risk',       4, 2, 2, 1, '2026-01-01', '2026-12-31', 36000.00, 9000.00, 3, 2, 0, 5, 1, 1, 'MLH-SR-2026', '2025-12-15'),
  (3, 'NC260003', 'Inspira PSA',                 5, 3, 1, 1, '2026-01-01', '2027-06-30', 24000.00, 4000.00, 2, 0, 0, 2, 1, 15, NULL, '2025-12-20'),
  (4, 'NC260004', 'Lehigh Valley Capitated',     7, 1, 1, 1, '2026-03-01', '2027-02-28', 60000.00, 0, 4, 1, 0, 5, 1, 1, 'LVH-CAP-2026', '2026-02-15'),
  (5, 'SC260001', 'Vanderbilt Capitated 2026',   8, 1, 3, 1, '2026-01-01', '2026-12-31', 72000.00, 18000.00, 4, 2, 1, 7, 1, 1, 'VU-CAP-2026', '2025-12-10'),
  (6, 'SC260002', 'TriStar Shared Risk',         9, 2, 3, 1, '2026-01-01', '2026-12-31', 30000.00, 7500.00, 3, 2, 1, 6, 1, 1, 'TS-SR-2026', '2025-12-15'),
  (7, 'SC260003', 'Saint Thomas PSA',           10, 3, 4, 2, '2026-02-01', '2027-01-31', 18000.00, 3000.00, 2, 2, 0, 4, 1, 1, 'STH-PSA-2026', '2026-01-20'),
  (8,  'SC260004', 'Maury Regional Fuse',        12, 4, 3, 1, '2026-03-01', '2027-02-28', 15000.00, 0,       2, 1, 0, 3, 1, 1, NULL,           '2026-02-20'),
  (9,  'NC260005', 'AtlantiCare Airway Program', 6,  5, 2, 2, '2026-04-01', '2027-03-31', 22000.00, 0,       0, 0, 0, 0, 1, 1, 'ATC-AIR-2026', '2026-03-10'),
  (10, 'SC260005', 'Williamson Rental Agreement',11, 6, 4, 1, '2026-04-01', '2027-03-31', 9600.00,  0,       2, 0, 0, 2, 1, 1, NULL,           '2026-03-15');
SET IDENTITY_INSERT tblContract OFF;

-- Contract Departments
SET IDENTITY_INSERT tblContractDepartments ON;
INSERT INTO tblContractDepartments (lContractDepartmentKey, lContractKey, lDepartmentKey, dtContractDepartmentEffectiveDate, dtContractDepartmentEndDate, bNonBillable, bCalcCostFromScopes) VALUES
  (1, 1, 3, '2026-01-01', '2026-12-31', 0, 1),
  (2, 1, 4, '2026-01-01', '2026-12-31', 0, 1),
  (3, 1, 5, '2026-01-01', '2026-12-31', 0, 0),
  (4, 2, 8, '2026-01-01', '2026-12-31', 0, 1),
  (5, 2, 9, '2026-01-01', '2026-12-31', 0, 1),
  (6, 3, 10, '2026-01-01', '2027-06-30', 0, 0),
  (7, 4, 13, '2026-03-01', '2027-02-28', 0, 1),
  (8, 4, 14, '2026-03-01', '2027-02-28', 0, 1),
  (9, 5, 15, '2026-01-01', '2026-12-31', 0, 1),
  (10, 5, 16, '2026-01-01', '2026-12-31', 0, 1),
  (11, 5, 17, '2026-01-01', '2026-12-31', 0, 0),
  (12, 6, 18, '2026-01-01', '2026-12-31', 0, 1),
  (13, 6, 19, '2026-01-01', '2026-12-31', 0, 1),
  (14, 7, 20, '2026-02-01', '2027-01-31', 0, 1),
  (15, 7, 21, '2026-02-01', '2027-01-31', 0, 1),
  (16, 8,  24, '2026-03-01', '2027-02-28', 0, 0),
  (17, 8,  25, '2026-03-01', '2027-02-28', 0, 0),
  (18, 9,  11, '2026-04-01', '2027-03-31', 0, 0),
  (19, 9,  12, '2026-04-01', '2027-03-31', 0, 0),
  (20, 10, 22, '2026-04-01', '2027-03-31', 0, 0),
  (21, 10, 23, '2026-04-01', '2027-03-31', 0, 0);
SET IDENTITY_INSERT tblContractDepartments OFF;

-- Contract Scopes (link scopes to contracts)
SET IDENTITY_INSERT tblContractScope ON;
INSERT INTO tblContractScope (lContractScopeKey, lContractKey, lScopeKey) VALUES
  -- Jefferson (contract 1) — scopes 7-15
  (1, 1, 7), (2, 1, 8), (3, 1, 9), (4, 1, 10), (5, 1, 11), (6, 1, 12), (7, 1, 13), (8, 1, 14), (9, 1, 15),
  -- Main Line (contract 2) — scopes 20-24
  (10, 2, 20), (11, 2, 21), (12, 2, 22), (13, 2, 23), (14, 2, 24),
  -- Inspira (contract 3) — scopes 25-26
  (15, 3, 25), (16, 3, 26),
  -- Lehigh Valley (contract 4) — scopes 31-35
  (17, 4, 31), (18, 4, 32), (19, 4, 33), (20, 4, 34), (21, 4, 35),
  -- Vanderbilt (contract 5) — scopes 36-43
  (22, 5, 36), (23, 5, 37), (24, 5, 38), (25, 5, 39), (26, 5, 40), (27, 5, 41), (28, 5, 42), (29, 5, 43),
  -- TriStar (contract 6) — scopes 44-49
  (30, 6, 44), (31, 6, 45), (32, 6, 46), (33, 6, 47), (34, 6, 48), (35, 6, 49),
  -- Saint Thomas (contract 7) — scopes 50-53
  (36, 7, 50), (37, 7, 51), (38, 7, 52), (39, 7, 53),
  -- Maury Regional (contract 8) — scopes 58-60
  (40, 8, 58), (41, 8, 59), (42, 8, 60),
  -- AtlantiCare Airway (contract 9) — scopes 27-30
  (43, 9, 27), (44, 9, 28), (45, 9, 29), (46, 9, 30),
  -- Williamson Rental (contract 10) — scopes 54-57
  (47, 10, 54), (48, 10, 55), (49, 10, 56), (50, 10, 57);
SET IDENTITY_INSERT tblContractScope OFF;
