-- ═══════════════════════════════════════════════════════
--  12-suppliers-pos.sql — Suppliers + POs
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblSupplier ON;
INSERT INTO tblSupplier (lSupplierKey, sSupplierName1, sMailAddr1, sMailCity, sMailState, sMailZip, sPhoneVoice, sContactEMail, bActive, bAcquisitionSupplier, dblOrderMinimum, dtCreateDate) VALUES
  (1, 'Olympus America Inc',   '3500 Corporate Pkwy', 'Center Valley', 'PA', '18034', '800-848-9024', 'parts@olympus.com', 1, 1, 500.00, '2025-01-01'),
  (2, 'Karl Storz Endoscopy',  '2151 E Grand Ave',    'El Segundo',    'CA', '90245', '800-421-0837', 'orders@karlstorz.com', 1, 1, 250.00, '2025-01-01'),
  (3, 'Stryker Endoscopy',     '5900 Optical Ct',     'San Jose',      'CA', '95138', '800-253-3210', 'parts@stryker.com', 1, 0, 300.00, '2025-01-01'),
  (4, 'Machida Endoscope',     '40 Boroline Rd',      'Allendale',     'NJ', '07401', '201-934-3510', 'sales@machida.com', 1, 0, 200.00, '2025-01-15'),
  (5, 'Medical Optics Inc',    '1425 Lake Cook Rd',    'Deerfield',     'IL', '60015', '847-945-5100', 'orders@medicaloptics.com', 1, 0, 150.00, '2025-02-01');
SET IDENTITY_INSERT tblSupplier OFF;

-- Supplier sizes (link suppliers to inventory sizes with their pricing)
SET IDENTITY_INSERT tblSupplierSizes ON;
INSERT INTO tblSupplierSizes (lSupplierSizesKey, lSupplierKey, lInventorySizeKey, sSupplierPartNo, dblUnitCost, bActive) VALUES
  (1, 1, 1,  'OLY-BR-99',   65.00, 1),
  (2, 1, 2,  'OLY-BR-115',  75.00, 1),
  (3, 1, 5,  'OLY-FB-H190', 240.00, 1),
  (4, 1, 9,  'OLY-CCD-190', 1350.00, 1),
  (5, 1, 13, 'OLY-TC-GIF',  25.00, 1),
  (6, 2, 15, 'KS-RL-4-30',  210.00, 1),
  (7, 2, 16, 'KS-RL-4-70',  225.00, 1),
  (8, 2, 17, 'KS-RL-10-0',  240.00, 1),
  (9, 2, 18, 'KS-RL-10-30', 255.00, 1),
  (10, 3, 20, 'STR-CCD-1288', 1050.00, 1),
  (11, 3, 21, 'STR-CCD-1588', 1250.00, 1);
SET IDENTITY_INSERT tblSupplierSizes OFF;

-- Purchase Orders
SET IDENTITY_INSERT tblSupplierPO ON;
INSERT INTO tblSupplierPO (lSupplierPOKey, lSupplierKey, sSupplierPONumber, dtDateOfPO, dblPOTotal, bCancelled, bGenerated, lSupplierPOTypeKey, dtLastUpdate) VALUES
  (1, 1, 'PO-OLY-2026-001', '2026-02-15', 1870.00, 0, 1, 1, '2026-02-15'),
  (2, 2, 'PO-KS-2026-001',  '2026-03-01', 1560.00, 0, 1, 1, '2026-03-01'),
  (3, 3, 'PO-STR-2026-001', '2026-03-10', 2300.00, 0, 0, 1, '2026-03-10');
SET IDENTITY_INSERT tblSupplierPO OFF;

-- PO Line Items
SET IDENTITY_INSERT tblSupplierPOTran ON;
INSERT INTO tblSupplierPOTran (lSupplierPOTranKey, lSupplierPOKey, lSupplierSizesKey, dblUnitCost, nOrderQuantity, nReceivedQuantity, dblItemCost, bActive, dtCreateDate) VALUES
  (1, 1, 1,  65.00,  10, 10, 650.00, 1, '2026-02-15'),
  (2, 1, 3,  240.00, 3,  2,  720.00, 1, '2026-02-15'),
  (3, 1, 5,  25.00,  20, 20, 500.00, 1, '2026-02-15'),
  (4, 2, 6,  210.00, 3,  3,  630.00, 1, '2026-03-01'),
  (5, 2, 7,  225.00, 2,  2,  450.00, 1, '2026-03-01'),
  (6, 2, 8,  240.00, 2,  0,  480.00, 1, '2026-03-01'),
  (7, 3, 10, 1050.00,1,  1,  1050.00,1, '2026-03-10'),
  (8, 3, 11, 1250.00,1,  0,  1250.00,1, '2026-03-10');
SET IDENTITY_INSERT tblSupplierPOTran OFF;
