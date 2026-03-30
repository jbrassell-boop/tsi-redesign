-- ═══════════════════════════════════════════════════════
--  03-clients.sql — Clients + Sales Reps
-- ═══════════════════════════════════════════════════════

-- Sales Reps
SET IDENTITY_INSERT tblSalesRep ON;
INSERT INTO tblSalesRep (lSalesRepKey, sRepFirst, sRepLast, sRepInits, sRepEMail, sActiveFlag) VALUES
  (1, 'Michael', 'Torres',   'MT', 'mtorres@totalscope.com',  'Y'),
  (2, 'Sarah',   'Chen',     'SC', 'schen@totalscope.com',    'Y'),
  (3, 'David',   'Williams', 'DW', 'dwilliams@totalscope.com','Y'),
  (4, 'Jennifer','Martinez', 'JM', 'jmartinez@totalscope.com','Y');
SET IDENTITY_INSERT tblSalesRep OFF;

-- Clients (7 North, 5 South)
SET IDENTITY_INSERT tblClient ON;
INSERT INTO tblClient (lClientKey, sClientName1, sClientName2, sMailAddr1, sMailCity, sMailState, sMailZip, sShipAddr1, sShipCity, sShipState, sShipZip, sBillAddr1, sBillCity, sBillState, sBillZip, sPhoneVoice, lSalesRepKey, lPricingCategoryKey, lPaymentTermsKey, lCreditLimitKey, bActive, dtCreateDate) VALUES
  -- North Region (PA/NJ/NY)
  (1, 'Penn Medicine - Chester County', NULL, '701 E Marshall St', 'West Chester', 'PA', '19380', '701 E Marshall St', 'West Chester', 'PA', '19380', '701 E Marshall St', 'West Chester', 'PA', '19380', '610-431-5000', 1, 1, 1, 4, 1, '2025-01-01'),
  (2, 'Thomas Jefferson University Hospital', NULL, '111 S 11th St', 'Philadelphia', 'PA', '19107', '111 S 11th St', 'Philadelphia', 'PA', '19107', '111 S 11th St', 'Philadelphia', 'PA', '19107', '215-955-6000', 1, 2, 1, 5, 1, '2025-01-01'),
  (3, 'Crozer Health System', NULL, '1 Medical Center Blvd', 'Upland', 'PA', '19013', '1 Medical Center Blvd', 'Upland', 'PA', '19013', '1 Medical Center Blvd', 'Upland', 'PA', '19013', '610-338-8000', 2, 1, 2, 3, 1, '2025-01-15'),
  (4, 'Main Line Health', NULL, '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', '130 S Bryn Mawr Ave', 'Bryn Mawr', 'PA', '19010', '484-337-3000', 2, 1, 1, 4, 1, '2025-02-01'),
  (5, 'Inspira Medical Center', NULL, '1505 W Sherman Ave', 'Vineland', 'NJ', '08360', '1505 W Sherman Ave', 'Vineland', 'NJ', '08360', '1505 W Sherman Ave', 'Vineland', 'NJ', '08360', '856-641-8000', 1, 3, 1, 3, 1, '2025-02-01'),
  (6, 'AtlantiCare Regional Medical', NULL, '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', '1925 Pacific Ave', 'Atlantic City', 'NJ', '08401', '609-345-4000', 2, 1, 2, 3, 1, '2025-02-15'),
  (7, 'Lehigh Valley Health Network', NULL, '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', '1200 S Cedar Crest Blvd', 'Allentown', 'PA', '18103', '610-402-8000', 1, 2, 1, 5, 1, '2025-03-01'),
  -- South Region (TN)
  (8, 'Vanderbilt University Medical Center', NULL, '1211 Medical Center Dr', 'Nashville', 'TN', '37232', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', '1211 Medical Center Dr', 'Nashville', 'TN', '37232', '615-322-5000', 3, 2, 1, 6, 1, '2025-01-01'),
  (9, 'TriStar Centennial Medical Center', NULL, '2300 Patterson St', 'Nashville', 'TN', '37203', '2300 Patterson St', 'Nashville', 'TN', '37203', '2300 Patterson St', 'Nashville', 'TN', '37203', '615-342-1000', 3, 1, 1, 4, 1, '2025-01-15'),
  (10, 'Saint Thomas Health', NULL, '4220 Harding Pike', 'Nashville', 'TN', '37205', '4220 Harding Pike', 'Nashville', 'TN', '37205', '4220 Harding Pike', 'Nashville', 'TN', '37205', '615-222-2111', 4, 1, 2, 3, 1, '2025-02-01'),
  (11, 'Williamson Medical Center', NULL, '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', '4321 Carothers Pkwy', 'Franklin', 'TN', '37067', '615-435-5000', 4, 1, 1, 3, 1, '2025-02-15'),
  (12, 'Maury Regional Medical Center', NULL, '1224 Trotwood Ave', 'Columbia', 'TN', '38401', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', '1224 Trotwood Ave', 'Columbia', 'TN', '38401', '931-381-1111', 3, 3, 1, 3, 1, '2025-03-01');
SET IDENTITY_INSERT tblClient OFF;
