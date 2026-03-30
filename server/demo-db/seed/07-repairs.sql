-- ═══════════════════════════════════════════════════════
--  07-repairs.sql — 40 repairs (NR250001-NR250025, SR250001-SR250015)
-- ═══════════════════════════════════════════════════════

SET IDENTITY_INSERT tblRepair ON;
INSERT INTO tblRepair (lRepairKey, sWorkOrderNumber, dtDateIn, dtDateOut, dtShipDate, lRepairStatusID, lDepartmentKey, lScopeKey, lTechnicianKey, lSalesRepKey, lContractKey, lDeliveryMethodKey, lPricingCategoryKey, lPaymentTermsKey, lRepairReasonKey, lServiceLocationKey, sComplaintDesc, sPurchaseOrder, dblAmtRepair, dblAmtShipping, bHotList, mComments) VALUES
  -- NORTH REGION (25 repairs)
  -- Status 1: Scope In (5)
  (1,  'NR250001', '2026-03-25', NULL, NULL, 1, 1, 1,  NULL, 1, NULL, 1, 1, 1, 7,  1, 'Fluid invasion detected during reprocessing', 'PO-2026-0401', 0, 0, 0, NULL),
  (2,  'NR250002', '2026-03-26', NULL, NULL, 1, 3, 7,  NULL, 1, NULL, 2, 2, 1, 2,  1, 'Angulation not reaching full range up/down', 'PO-2026-0402', 0, 0, 0, NULL),
  (3,  'NR250003', '2026-03-27', NULL, NULL, 1, 6, 16, NULL, 2, NULL, 1, 1, 2, 8,  1, 'Insertion tube kink near bending section', NULL, 0, 0, 0, NULL),
  (4,  'NR250004', '2026-03-28', NULL, NULL, 1, 8, 20, NULL, 2, NULL, 3, 1, 1, 1,  1, 'Image quality degraded, possible CCD issue', 'PO-2026-0405', 0, 0, 1, 'Hot list - customer needs ASAP'),
  (5,  'NR250005', '2026-03-29', NULL, NULL, 1, 10,25, NULL, 1, NULL, 1, 3, 1, 11, 1, 'Suction channel blocked', NULL, 0, 0, 0, NULL),
  -- Status 3: Evaluation (4)
  (6,  'NR250006', '2026-03-20', NULL, NULL, 3, 1, 2,  1, 1, NULL, 1, 1, 1, 6,  1, 'Fiber optic bundle dark spots', 'PO-2026-0301', 925.00, 0, 0, 'D&I complete - fiber damage confirmed'),
  (7,  'NR250007', '2026-03-21', NULL, NULL, 3, 3, 8,  1, 1, NULL, 2, 2, 1, 12, 1, 'Tip cover loose, angulation stiff', 'PO-2026-0302', 910.00, 0, 0, NULL),
  (8,  'NR250008', '2026-03-22', NULL, NULL, 3, 4, 11, 2, 2, NULL, 1, 1, 1, 3,  1, 'Bending rubber cracked, light guide dim', NULL, 975.00, 0, 0, NULL),
  (9,  'NR250009', '2026-03-23', NULL, NULL, 3, 11,27, 3, 2, NULL, 1, 1, 2, 9,  1, 'Light guide connector damaged', 'PO-2026-0305', 450.00, 0, 0, NULL),
  -- Status 4: Awaiting Approval (3)
  (10, 'NR250010', '2026-03-15', NULL, NULL, 4, 1, 3,  1, 1, NULL, 1, 1, 1, 2,  1, 'Full angulation rebuild needed', 'PO-2026-0201', 1455.00, 45.00, 0, 'Quote sent 03/17 — awaiting customer approval'),
  (11, 'NR250011', '2026-03-16', NULL, NULL, 4, 6, 17, 2, 2, NULL, 3, 1, 1, 4,  1, 'CCD replacement required', 'PO-2026-0202', 3575.00, 65.00, 1, 'High priority — CCD failure'),
  (12, 'NR250012', '2026-03-17', NULL, NULL, 4, 8, 21, 3, 2, NULL, 1, 1, 1, 7,  1, 'Major fluid invasion, epoxy rebuild', NULL, 3200.00, 45.00, 0, NULL),
  -- Status 5: Approved (4)
  (13, 'NR250013', '2026-03-10', NULL, NULL, 5, 3, 9,  2, 1, NULL, 2, 2, 1, 3,  1, 'Bending section replacement approved', 'PO-2026-0103', 1105.00, 45.00, 0, 'Approved 03/14'),
  (14, 'NR250014', '2026-03-11', NULL, NULL, 5, 4, 12, 1, 1, NULL, 1, 1, 1, 2,  1, 'Arthroscope lens replacement', 'PO-2026-0104', 900.00, 25.00, 0, NULL),
  (15, 'NR250015', '2026-03-12', NULL, NULL, 5, 10,26, 3, 1, NULL, 4, 3, 1, 8,  1, 'Colonoscope insertion tube', 'PO-2026-0105', 2100.00, 55.00, 0, NULL),
  (16, 'NR250016', '2026-03-13', NULL, NULL, 5, 13,31, 1, 1, NULL, 1, 2, 1, 1,  1, 'Preventive maintenance service', NULL, 650.00, 25.00, 0, NULL),
  -- Status 6: In Repair (3)
  (17, 'NR250017', '2026-03-05', NULL, NULL, 6, 1, 1,  1, 1, NULL, 1, 1, 1, 7,  1, 'Fluid invasion repair in progress', 'PO-2026-0050', 1000.00, 45.00, 0, 'Parts on order'),
  (18, 'NR250018', '2026-03-06', NULL, NULL, 6, 4, 13, 2, 1, NULL, 2, 1, 1, 5,  1, 'Housing crack repair', 'PO-2026-0051', 875.00, 25.00, 0, NULL),
  (19, 'NR250019', '2026-03-07', NULL, NULL, 6, 7, 18, 3, 2, NULL, 1, 1, 1, 2,  1, 'Angulation cable replacement', NULL, 1450.00, 45.00, 0, NULL),
  -- Status 7: QC (2)
  (20, 'NR250020', '2026-02-28', NULL, NULL, 7, 3, 10, 1, 1, NULL, 3, 2, 1, 10, 1, 'QC inspection — duodenoscope rebuild', 'PO-2026-0020', 2655.00, 65.00, 0, 'Repair complete, final QC check'),
  (21, 'NR250021', '2026-03-01', NULL, NULL, 7, 9, 23, 2, 2, NULL, 1, 1, 1, 10, 1, 'Preventive maintenance QC', 'PO-2026-0021', 750.00, 25.00, 0, NULL),
  -- Status 10: Scheduled to Ship (3)
  (22, 'NR250022', '2026-02-20', '2026-03-15', NULL, 10, 1, 2,  1, 1, NULL, 1, 1, 1, 6,  1, 'Fiber bundle replaced — ready to ship', 'PO-2026-0010', 925.00, 45.00, 0, NULL),
  (23, 'NR250023', '2026-02-22', '2026-03-16', NULL, 10, 6, 16, 2, 2, NULL, 3, 1, 2, 8,  1, 'Insertion tube replaced', 'PO-2026-0011', 2400.00, 65.00, 0, NULL),
  (24, 'NR250024', '2026-02-25', '2026-03-18', NULL, 12, 13,32, 3, 1, NULL, 2, 2, 1, 3,  1, 'Colonoscope ready ship tomorrow', 'PO-2026-0012', 1650.00, 45.00, 0, NULL),
  -- Status 8: Shipped (completed)
  (25, 'NR250025', '2026-02-10', '2026-03-01', '2026-03-02', 8, 4, 14, 1, 1, NULL, 2, 1, 1, 4, 1, 'Camera head CCD replaced', 'PO-2026-0001', 3075.00, 55.00, 0, 'Shipped UPS 2nd Day 1Z999AA10123456784'),

  -- SOUTH REGION (15 repairs)
  -- Status 1: Scope In (2)
  (26, 'SR250001', '2026-03-26', NULL, NULL, 1, 15,36, NULL, 3, NULL, 1, 2, 1, 7,  2, 'Possible fluid invasion after cleaning', 'PO-S-0401', 0, 0, 0, NULL),
  (27, 'SR250002', '2026-03-28', NULL, NULL, 1, 18,44, NULL, 3, NULL, 2, 1, 1, 2,  2, 'Left angulation not responding', NULL, 0, 0, 0, NULL),
  -- Status 3: Evaluation (2)
  (28, 'SR250003', '2026-03-20', NULL, NULL, 3, 15,37, 4, 3, NULL, 1, 2, 1, 6,  2, 'Fiber bundle assessment', 'PO-S-0301', 900.00, 0, 0, NULL),
  (29, 'SR250004', '2026-03-22', NULL, NULL, 3, 20,50, 5, 4, NULL, 1, 1, 2, 12, 2, 'Tip cover damage assessment', 'PO-S-0302', 530.00, 0, 0, NULL),
  -- Status 5: Approved (2)
  (30, 'SR250005', '2026-03-12', NULL, NULL, 5, 16,40, 4, 3, NULL, 1, 1, 1, 5,  2, 'Laparoscope lens polish approved', 'PO-S-0201', 750.00, 25.00, 0, NULL),
  (31, 'SR250006', '2026-03-14', NULL, NULL, 5, 22,54, 5, 4, NULL, 2, 1, 1, 3,  2, 'Bending section approved', 'PO-S-0202', 1900.00, 45.00, 0, NULL),
  -- Status 6: In Repair (2)
  (32, 'SR250007', '2026-03-05', NULL, NULL, 6, 15,38, 4, 3, NULL, 1, 2, 1, 2,  2, 'Colonoscope angulation rebuild', 'PO-S-0101', 830.00, 45.00, 0, NULL),
  (33, 'SR250008', '2026-03-08', NULL, NULL, 6, 19,47, 5, 3, NULL, 3, 1, 1, 8,  2, 'Rigid scope repair — lens assembly', 'PO-S-0102', 1100.00, 25.00, 0, NULL),
  -- Status 7: QC (1)
  (34, 'SR250009', '2026-02-28', NULL, NULL, 7, 17,43, 6, 3, NULL, 1, 2, 1, 10, 2, 'Bronchoscope PM complete, QC check', 'PO-S-0020', 550.00, 25.00, 0, NULL),
  -- Status 10/12: Ready to Ship (2)
  (35, 'SR250010', '2026-02-18', '2026-03-12', NULL, 10, 16,41, 4, 3, NULL, 2, 1, 1, 2, 2, 'Arthroscope repair complete', 'PO-S-0010', 475.00, 45.00, 0, NULL),
  (36, 'SR250011', '2026-02-20', '2026-03-14', NULL, 12, 20,51, 5, 4, NULL, 1, 1, 2, 3, 2, 'Colonoscope bending section done', 'PO-S-0011', 1850.00, 45.00, 0, NULL),
  -- Status 8: Shipped (2)
  (37, 'SR250012', '2026-02-05', '2026-02-25', '2026-02-26', 8, 18,45, 4, 3, NULL, 3, 1, 1, 3, 2, 'Colonoscope bending rubber replaced', 'PO-S-0001', 800.00, 55.00, 0, NULL),
  (38, 'SR250013', '2026-02-08', '2026-02-28', '2026-03-01', 8, 21,52, 5, 4, NULL, 1, 1, 1, 5, 2, 'Laparoscope housing repair', 'PO-S-0002', 925.00, 25.00, 0, NULL),
  -- Status 9: Invoiced/Closed (2)
  (39, 'SR250014', '2026-01-15', '2026-02-10', '2026-02-11', 9, 24,58, 6, 3, NULL, 2, 3, 1, 1, 2, 'Gastroscope air/water system repair', 'PO-S-VA01', 725.00, 45.00, 0, NULL),
  (40, 'SR250015', '2026-01-20', '2026-02-15', '2026-02-16', 9, 22,55, 4, 4, NULL, 1, 1, 1, 3, 2, 'Colonoscope PM service', 'PO-S-0003', 750.00, 25.00, 0, NULL),

  -- ADDITIONAL REPAIRS (keys 41-55) covering unused statuses
  -- Status 2: Scope Out / Ready to Invoice (North)
  (41, 'NR250026', '2026-03-01', '2026-03-20', NULL, 2, 3, 9,  1, 1, NULL, 2, 2, 1, 3,  1, 'Bending section repaired — ready to invoice', 'PO-2026-0060', 0, 45.00, 0, NULL),
  (42, 'NR250027', '2026-03-03', '2026-03-21', NULL, 2, 8, 22, 2, 2, NULL, 1, 1, 1, 11, 1, 'PM service complete — awaiting invoice', 'PO-2026-0061', 0, 25.00, 0, NULL),
  -- Status 11: In the Drying Room (North)
  (43, 'NR250028', '2026-03-22', NULL, NULL, 11, 1, 4,  1, 1, NULL, 1, 1, 1, 7,  1, 'Scope in drying room post cleaning', 'PO-2026-0070', 0, 0, 0, NULL),
  (44, 'NR250029', '2026-03-23', NULL, NULL, 11, 6, 19, 2, 2, NULL, 1, 1, 2, 2,  1, 'Post-repair drying cycle', NULL, 0, 0, 0, NULL),
  -- Status 13: Shipping Today (North)
  (45, 'NR250030', '2026-03-05', '2026-03-27', NULL, 13, 4, 14, 1, 1, NULL, 1, 1, 1, 4,  1, 'Packaging complete — carrier pickup today', 'PO-2026-0080', 0, 25.00, 0, NULL),
  (46, 'NR250031', '2026-03-08', '2026-03-28', NULL, 13, 10,26, 3, 1, NULL, 4, 3, 1, 8,  1, 'Scope packed, label printed', 'PO-2026-0081', 0, 55.00, 0, NULL),
  -- Status 14: Outsourced (North)
  (47, 'NR250032', '2026-03-10', NULL, NULL, 14, 3, 10, 1, 1, NULL, 2, 2, 1, 5,  1, 'Sent to Olympus for CCD board replacement', 'PO-2026-0090', 0, 0, 0, 'Outsourced to OEM — ETA 2 weeks'),
  (48, 'NR250033', '2026-03-12', NULL, NULL, 14, 9, 24, 2, 2, NULL, 1, 1, 2, 9,  1, 'Outsourced for specialized cable repair', NULL, 0, 0, 0, NULL),
  -- Status 15: On Hold - Pending PO (North + South)
  (49, 'NR250034', '2026-03-15', NULL, NULL, 15, 7, 18, 3, 2, NULL, 1, 1, 1, 4,  1, 'Approval pending — customer needs PO issued', 'PO-PENDING', 0, 0, 0, 'Called 03/18, 03/22 — no response'),
  (50, 'SR250016', '2026-03-17', NULL, NULL, 15, 16,41, 4, 3, NULL, 2, 1, 1, 2,  2, 'Waiting on hospital purchase order', 'PO-PEND-S', 0, 0, 0, NULL),
  -- Status 16: On Hold - Customer Request (North + South)
  (51, 'NR250035', '2026-03-18', NULL, NULL, 16, 1, 2,  1, 1, NULL, 1, 1, 1, 6,  1, 'Customer requested hold pending lease decision', NULL, 0, 0, 0, 'Per Patricia Anderson 03/18'),
  (52, 'SR250017', '2026-03-19', NULL, NULL, 16, 20,51, 5, 4, NULL, 1, 1, 2, 3,  2, 'Customer on hold — waiting on budget approval', NULL, 0, 0, 0, NULL),
  -- Status 2: Scope Out / Ready to Invoice (South)
  (53, 'SR250018', '2026-03-02', '2026-03-22', NULL, 2, 17,43, 6, 3, NULL, 1, 2, 1, 10, 2, 'Bronchoscope PM complete — ready to invoice', 'PO-S-0060', 0, 25.00, 0, NULL),
  -- Status 11: In the Drying Room (South)
  (54, 'SR250019', '2026-03-24', NULL, NULL, 11, 24,58, 4, 3, NULL, 1, 1, 1, 7,  2, 'Scope drying after cleaning protocol', 'PO-S-0070', 0, 0, 0, NULL),
  -- Status 13: Shipping Today (South)
  (55, 'SR250020', '2026-03-06', '2026-03-28', NULL, 13, 18,45, 4, 3, NULL, 3, 1, 1, 3,  2, 'Label printed — FedEx pickup scheduled', 'PO-S-0080', 0, 55.00, 0, NULL);
SET IDENTITY_INSERT tblRepair OFF;
