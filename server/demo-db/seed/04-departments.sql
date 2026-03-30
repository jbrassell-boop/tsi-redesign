-- ═══════════════════════════════════════════════════════
--  04-departments.sql — Departments (2-3 per client)
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblDepartment ON;
INSERT INTO tblDepartment (lDepartmentKey, sDepartmentName, lClientKey, lServiceLocationKey, lSalesRepKey, lPricingCategoryKey, sShipName1, sShipAddr1, sShipCity, sShipState, sShipZip, sBillName1, sBillAddr1, sBillCity, sBillState, sBillZip, bActive, dtCreateDate) VALUES
  -- Penn Medicine Chester County (client 1, North)
  (1, 'GI Lab',           1, 1, 1, 1, 'Penn Medicine - Chester County', '701 E Marshall St', 'West Chester', 'PA', '19380', 'Penn Medicine - Chester County', '701 E Marshall St', 'West Chester', 'PA', '19380', 1, '2025-01-01'),
  (2, 'Surgery',          1, 1, 1, 1, 'Penn Medicine - Chester County', '701 E Marshall St', 'West Chester', 'PA', '19380', 'Penn Medicine - Chester County', '701 E Marshall St', 'West Chester', 'PA', '19380', 1, '2025-01-01'),
  -- Jefferson (client 2, North)
  (3, 'Endoscopy Suite',  2, 1, 1, 2, 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 1, '2025-01-01'),
  (4, 'OR - Main',        2, 1, 1, 2, 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 1, '2025-01-01'),
  (5, 'Pulmonary Lab',    2, 1, 1, 2, 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 'Thomas Jefferson University Hospital', '111 S 11th St', 'Philadelphia', 'PA', '19107', 1, '2025-01-15'),
  -- Crozer (client 3, North)
  (6, 'GI Lab',           3, 1, 2, 1, 'Crozer Health System', '1 Medical Center Blvd', 'Upland', 'PA', '19013', 'Crozer Health System', '1 Medical Center Blvd', 'Upland', 'PA', '19013', 1, '2025-01-15'),
  (7, 'Surgery',          3, 1, 2, 1, 'Crozer Health System', '1 Medical Center Blvd', 'Upland', 'PA', '19013', 'Crozer Health System', '1 Medical Center Blvd', 'Upland', 'PA', '19013', 1, '2025-01-15'),
  -- Main Line Health (client 4, North)
  (8, 'Endoscopy',        4, 1, 2, 1, 'Main Line Health', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', 'Main Line Health', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', 1, '2025-02-01'),
  (9, 'OR - Bryn Mawr',   4, 1, 2, 1, 'Main Line Health', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', 'Main Line Health', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', 1, '2025-02-01'),
  -- Inspira (client 5, North)
  (10, 'GI Endoscopy',    5, 1, 1, 3, 'Inspira Medical Center', '1505 W Sherman Ave', 'Vineland', 'NJ', '08360', 'Inspira Medical Center', '1505 W Sherman Ave', 'Vineland', 'NJ', '08360', 1, '2025-02-01'),
  -- AtlantiCare (client 6, North)
  (11, 'Endoscopy Suite',  6, 1, 2, 1, 'AtlantiCare Regional Medical', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', 'AtlantiCare Regional Medical', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', 1, '2025-02-15'),
  (12, 'Surgery',          6, 1, 2, 1, 'AtlantiCare Regional Medical', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', 'AtlantiCare Regional Medical', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', 1, '2025-02-15'),
  -- Lehigh Valley (client 7, North)
  (13, 'GI Lab',           7, 1, 1, 2, 'Lehigh Valley Health Network', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', 'Lehigh Valley Health Network', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', 1, '2025-03-01'),
  (14, 'Thoracic Surgery', 7, 1, 1, 2, 'Lehigh Valley Health Network', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', 'Lehigh Valley Health Network', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', 1, '2025-03-01'),
  -- Vanderbilt (client 8, South)
  (15, 'GI Lab',           8, 2, 3, 2, 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 1, '2025-01-01'),
  (16, 'OR - Main',        8, 2, 3, 2, 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 1, '2025-01-01'),
  (17, 'Pulmonary',        8, 2, 3, 2, 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 'Vanderbilt University Medical Center', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', 1, '2025-01-15'),
  -- TriStar (client 9, South)
  (18, 'Endoscopy',        9, 2, 3, 1, 'TriStar Centennial Medical Center', '2300 Patterson St', 'Nashville', 'TN', '37203', 'TriStar Centennial Medical Center', '2300 Patterson St', 'Nashville', 'TN', '37203', 1, '2025-01-15'),
  (19, 'Surgery',          9, 2, 3, 1, 'TriStar Centennial Medical Center', '2300 Patterson St', 'Nashville', 'TN', '37203', 'TriStar Centennial Medical Center', '2300 Patterson St', 'Nashville', 'TN', '37203', 1, '2025-01-15'),
  -- Saint Thomas (client 10, South)
  (20, 'GI Lab',          10, 2, 4, 1, 'Saint Thomas Health', '4220 Harding Pike', 'Nashville', 'TN', '37205', 'Saint Thomas Health', '4220 Harding Pike', 'Nashville', 'TN', '37205', 1, '2025-02-01'),
  (21, 'OR',              10, 2, 4, 1, 'Saint Thomas Health', '4220 Harding Pike', 'Nashville', 'TN', '37205', 'Saint Thomas Health', '4220 Harding Pike', 'Nashville', 'TN', '37205', 1, '2025-02-01'),
  -- Williamson (client 11, South)
  (22, 'Endoscopy',       11, 2, 4, 1, 'Williamson Medical Center', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', 'Williamson Medical Center', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', 1, '2025-02-15'),
  (23, 'Surgery',         11, 2, 4, 1, 'Williamson Medical Center', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', 'Williamson Medical Center', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', 1, '2025-02-15'),
  -- Maury Regional (client 12, South)
  (24, 'GI Lab',          12, 2, 3, 3, 'Maury Regional Medical Center', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', 'Maury Regional Medical Center', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', 1, '2025-03-01'),
  (25, 'Surgery',         12, 2, 3, 3, 'Maury Regional Medical Center', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', 'Maury Regional Medical Center', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', 1, '2025-03-01');
SET IDENTITY_INSERT tblDepartment OFF;
