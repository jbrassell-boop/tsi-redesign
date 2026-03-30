-- ═══════════════════════════════════════════════════════
--  10-invoices.sql — Invoices (tblInvoice + tblGP_InvoiceStaging)
-- ═══════════════════════════════════════════════════════

-- Invoice metadata (links repairs to GP staging)
SET IDENTITY_INSERT tblInvoice ON;
INSERT INTO tblInvoice (lInvoiceKey, lRepairKey, lClientKey, lDepartmentKey, lSalesRepKey, lContractKey, sTranNumber) VALUES
  (1, 25, 2, 4, 1, NULL, 'INV-2026-0001'),
  (2, 37, 9, 18, 3, 6,   'INV-2026-0002'),
  (3, 38, 10, 21, 4, 7,  'INV-2026-0003'),
  (4, 39, 12, 24, 3, 8,  'INV-2026-0004'),
  (5, 40, 11, 22, 4, NULL,'INV-2026-0005'),
  -- Contract monthly invoices
  (6, NULL, 2, 3, 1, 1,  'INV-C-2026-001'),
  (7, NULL, 2, 3, 1, 1,  'INV-C-2026-002'),
  (8, NULL, 2, 3, 1, 1,  'INV-C-2026-003'),
  (9, NULL, 8, 15, 3, 5, 'INV-C-2026-004'),
  (10, NULL, 8, 15, 3, 5,'INV-C-2026-005'),
  (11, NULL, 8, 15, 3, 5,'INV-C-2026-006'),
  (12, NULL, 9, 18, 3, 6,'INV-C-2026-007'),
  (13, NULL, 9, 18, 3, 6,'INV-C-2026-008'),
  (14, NULL, 4, 8, 2, 2, 'INV-C-2026-009'),
  (15, NULL, 4, 8, 2, 2, 'INV-C-2026-010');
SET IDENTITY_INSERT tblInvoice OFF;

-- GP Invoice Staging (actual revenue data)
SET IDENTITY_INSERT tblGP_InvoiceStaging ON;
INSERT INTO tblGP_InvoiceStaging (GPInvoiceStagingID, lInvoiceKey, sTranNumber, dtTranDate, TotalAmountDue, dblTranAmount, dblShippingAmount, bProcessed, dtPostedDate, lDatabaseKey) VALUES
  -- Repair invoices
  (1, 1, 'INV-2026-0001', '2026-03-05', 3855.00, 3800.00, 55.00, 1, '2026-03-06', 1),
  (2, 2, 'INV-2026-0002', '2026-03-01', 1655.00, 1600.00, 55.00, 1, '2026-03-02', 2),
  (3, 3, 'INV-2026-0003', '2026-03-05', 950.00, 925.00, 25.00, 1, '2026-03-06', 2),
  (4, 4, 'INV-2026-0004', '2026-02-15', 1245.00, 1200.00, 45.00, 1, '2026-02-16', 2),
  (5, 5, 'INV-2026-0005', '2026-02-20', 775.00, 750.00, 25.00, 1, '2026-02-21', 2),
  -- Contract monthly invoices (processed)
  (6,  6, 'INV-C-2026-001', '2026-01-01', 4000.00, 4000.00, 0, 1, '2026-01-02', 1),
  (7,  7, 'INV-C-2026-002', '2026-02-01', 4000.00, 4000.00, 0, 1, '2026-02-02', 1),
  (8,  8, 'INV-C-2026-003', '2026-03-01', 4000.00, 4000.00, 0, 1, '2026-03-02', 1),
  (9,  9, 'INV-C-2026-004', '2026-01-01', 6000.00, 6000.00, 0, 1, '2026-01-02', 2),
  (10, 10,'INV-C-2026-005', '2026-02-01', 6000.00, 6000.00, 0, 1, '2026-02-02', 2),
  (11, 11,'INV-C-2026-006', '2026-03-01', 6000.00, 6000.00, 0, 1, '2026-03-02', 2),
  -- Pending invoices (not yet processed)
  (12, 12,'INV-C-2026-007', '2026-01-01', 2500.00, 2500.00, 0, 0, NULL, 2),
  (13, 13,'INV-C-2026-008', '2026-02-01', 2500.00, 2500.00, 0, 0, NULL, 2),
  (14, 14,'INV-C-2026-009', '2026-01-01', 3000.00, 3000.00, 0, 0, NULL, 1),
  (15, 15,'INV-C-2026-010', '2026-02-01', 3000.00, 3000.00, 0, 0, NULL, 1);
SET IDENTITY_INSERT tblGP_InvoiceStaging OFF;
