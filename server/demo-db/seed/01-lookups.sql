-- ═══════════════════════════════════════════════════════
--  01-lookups.sql — Reference/lookup seed data
-- ═══════════════════════════════════════════════════════

-- Service Locations
SET IDENTITY_INSERT tblServiceLocations ON;
INSERT INTO tblServiceLocations (lServiceLocationKey, sServiceLocation, sTransNumberPrefix, bUsed) VALUES
  (1, 'North - Upper Chichester, PA', 'N', 1),
  (2, 'South - Nashville, TN', 'S', 1);
SET IDENTITY_INSERT tblServiceLocations OFF;

-- Repair Statuses (IDs match route logic: 8=Shipped, 10/12/13=ready-to-ship)
INSERT INTO tblRepairStatuses (lRepairStatusID, sRepairStatus, lRepairStatusSortOrder, bIsReadOnly) VALUES
  (1, 'Scope In / Receiving', 1, 0),
  (2, 'Scope Out / Ready to Invoice', 2, 0),
  (3, 'Waiting on Inspection', 3, 0),
  (4, 'Awaiting Approval', 4, 0),
  (5, 'Approved - Ready for Repair', 5, 0),
  (6, 'In Repair Process', 6, 0),
  (7, 'QC / Final Inspection', 7, 0),
  (8, 'Shipped', 8, 1),
  (9, 'Invoiced / Closed', 9, 1),
  (10, 'Scheduled to Ship', 10, 0),
  (11, 'In the Drying Room', 11, 0),
  (12, 'Ship Tomorrow', 12, 0),
  (13, 'Shipping Today', 13, 0),
  (14, 'Outsourced', 14, 0),
  (15, 'On Hold - Pending PO', 15, 0),
  (16, 'On Hold - Customer Request', 16, 0),
  (17, 'Cancelled', 17, 1),
  (18, 'Batch Shipped', 18, 1);

-- Repair Levels
SET IDENTITY_INSERT tblRepairLevels ON;
INSERT INTO tblRepairLevels (lRepairLevelKey, sRepairLevel, lDeliveryFromDateInDays) VALUES
  (1, 'Minor', 5),
  (2, 'Mid', 10),
  (3, 'Major', 15),
  (4, 'VSI', 20);
SET IDENTITY_INSERT tblRepairLevels OFF;

-- Delivery Methods
SET IDENTITY_INSERT tblDeliveryMethod ON;
INSERT INTO tblDeliveryMethod (lDeliveryMethodKey, sDeliveryDesc, dblAmtShipping) VALUES
  (1, 'UPS Ground', 25.00),
  (2, 'UPS 2nd Day', 45.00),
  (3, 'UPS Next Day', 65.00),
  (4, 'FedEx Ground', 28.00),
  (5, 'FedEx Express', 55.00),
  (6, 'Customer Pickup', 0.00),
  (7, 'TSI Delivery', 0.00);
SET IDENTITY_INSERT tblDeliveryMethod OFF;

-- Payment Terms
SET IDENTITY_INSERT tblPaymentTerms ON;
INSERT INTO tblPaymentTerms (lPaymentTermsKey, sTermsDesc, nIncrementDays) VALUES
  (1, 'Net 30', 30),
  (2, 'Net 45', 45),
  (3, 'Net 60', 60),
  (4, 'Due on Receipt', 0),
  (5, 'Prepaid', 0);
SET IDENTITY_INSERT tblPaymentTerms OFF;

-- Pricing Categories
SET IDENTITY_INSERT tblPricingCategory ON;
INSERT INTO tblPricingCategory (lPricingCategoryKey, sPricingDescription, bActive) VALUES
  (1, 'Standard', 1),
  (2, 'Contract', 1),
  (3, 'Government/VA', 1),
  (4, 'GPO Pricing', 1),
  (5, 'Preferred Customer', 1);
SET IDENTITY_INSERT tblPricingCategory OFF;

-- Manufacturers
SET IDENTITY_INSERT tblManufacturers ON;
INSERT INTO tblManufacturers (lManufacturerKey, sManufacturer) VALUES
  (1, 'Olympus'),
  (2, 'Pentax'),
  (3, 'Fujifilm'),
  (4, 'Karl Storz'),
  (5, 'Stryker'),
  (6, 'Smith & Nephew'),
  (7, 'Arthrex'),
  (8, 'ConMed');
SET IDENTITY_INSERT tblManufacturers OFF;

-- Scope Type Categories
SET IDENTITY_INSERT tblScopeTypeCategories ON;
INSERT INTO tblScopeTypeCategories (lScopeTypeCategoryKey, sScopeTypeCategory) VALUES
  (1, 'Gastroscope'),
  (2, 'Colonoscope'),
  (3, 'Duodenoscope'),
  (4, 'Bronchoscope'),
  (5, 'Arthroscope'),
  (6, 'Laparoscope'),
  (7, 'Cystoscope'),
  (8, 'Camera Head'),
  (9, 'Light Source'),
  (10, 'Processor');
SET IDENTITY_INSERT tblScopeTypeCategories OFF;

-- Contract Types
SET IDENTITY_INSERT tblContractTypes ON;
INSERT INTO tblContractTypes (lContractTypeKey, sContractType) VALUES
  (1, 'Capitated'),
  (2, 'Shared Risk'),
  (3, 'PSA'),
  (4, 'Fuse'),
  (5, 'Airway'),
  (6, 'Rental');
SET IDENTITY_INSERT tblContractTypes OFF;

-- Contract Amendment Statuses
SET IDENTITY_INSERT tblContractAmendmentStatuses ON;
INSERT INTO tblContractAmendmentStatuses (lContractAmendmentStatusKey, sContractAmendmentStatus) VALUES
  (1, 'Pending'),
  (2, 'Approved'),
  (3, 'Rejected'),
  (4, 'Applied');
SET IDENTITY_INSERT tblContractAmendmentStatuses OFF;

-- Distributors
SET IDENTITY_INSERT tblDistributor ON;
INSERT INTO tblDistributor (lDistributorKey, sDistName1, bActive) VALUES
  (1, 'Medline Industries', 1),
  (2, 'Owens & Minor', 1),
  (3, 'Cardinal Health', 1),
  (4, 'McKesson Medical', 1);
SET IDENTITY_INSERT tblDistributor OFF;

-- Repair Reasons
SET IDENTITY_INSERT tblRepairReasons ON;
INSERT INTO tblRepairReasons (lRepairReasonKey, sRepairReason, bActive) VALUES
  (1, 'Air/Water System', 1),
  (2, 'Angulation', 1),
  (3, 'Bending Section', 1),
  (4, 'CCD/Image Sensor', 1),
  (5, 'Cracked Housing', 1),
  (6, 'Fiber Optic Bundle', 1),
  (7, 'Fluid Invasion', 1),
  (8, 'Insertion Tube', 1),
  (9, 'Light Guide', 1),
  (10, 'Preventive Maintenance', 1),
  (11, 'Suction Channel', 1),
  (12, 'Tip Damage', 1),
  (13, 'Other', 1);
SET IDENTITY_INSERT tblRepairReasons OFF;

-- Flag Types
SET IDENTITY_INSERT tblFlagTypes ON;
INSERT INTO tblFlagTypes (lFlagTypeKey, sFlagType) VALUES
  (1, 'Client Alert'),
  (2, 'Scope Alert'),
  (3, 'Department Alert'),
  (4, 'Repair Note');
SET IDENTITY_INSERT tblFlagTypes OFF;

-- Supplier PO Types
SET IDENTITY_INSERT tblSupplierPOTypes ON;
INSERT INTO tblSupplierPOTypes (lSupplierPOTypeKey, sSupplierPOType) VALUES
  (1, 'Standard'),
  (2, 'Blanket'),
  (3, 'Emergency');
SET IDENTITY_INSERT tblSupplierPOTypes OFF;

-- Document Categories
SET IDENTITY_INSERT tblDocumentCategory ON;
INSERT INTO tblDocumentCategory (lDocumentCategoryKey, sDocumentCategory) VALUES
  (1, 'Repair Documents'),
  (2, 'Client Documents'),
  (3, 'Contract Documents');
SET IDENTITY_INSERT tblDocumentCategory OFF;

SET IDENTITY_INSERT tblDocumentCategoryType ON;
INSERT INTO tblDocumentCategoryType (lDocumentCategoryTypeKey, lDocumentCategoryKey, sDocumentCategoryType) VALUES
  (1, 1, 'Inspection Report'),
  (2, 1, 'Quote'),
  (3, 1, 'Invoice'),
  (4, 2, 'Agreement'),
  (5, 3, 'CSA');
SET IDENTITY_INSERT tblDocumentCategoryType OFF;

-- Email Types
SET IDENTITY_INSERT tblEmailTypes ON;
INSERT INTO tblEmailTypes (lEmailTypeKey, sEmailType, bShowOnDash) VALUES
  (1, 'Quote Sent', 1),
  (2, 'Approval Received', 1),
  (3, 'Shipping Notification', 1),
  (4, 'Invoice', 0),
  (5, 'General', 0);
SET IDENTITY_INSERT tblEmailTypes OFF;

-- Task Statuses
SET IDENTITY_INSERT tblTaskStatuses ON;
INSERT INTO tblTaskStatuses (TaskStatusKey, TaskStatus) VALUES
  (1, 'Open'),
  (2, 'In Progress'),
  (3, 'Completed'),
  (4, 'Cancelled');
SET IDENTITY_INSERT tblTaskStatuses OFF;

-- Task Types
SET IDENTITY_INSERT tblTaskTypes ON;
INSERT INTO tblTaskTypes (lTaskTypeKey, sTaskType) VALUES
  (1, 'Follow Up'),
  (2, 'Approval'),
  (3, 'Inspection'),
  (4, 'Shipping');
SET IDENTITY_INSERT tblTaskTypes OFF;

-- Task Priorities
SET IDENTITY_INSERT tblTaskPriorities ON;
INSERT INTO tblTaskPriorities (lTaskPriorityKey, sTaskPriority) VALUES
  (1, 'Low'),
  (2, 'Normal'),
  (3, 'High'),
  (4, 'Critical');
SET IDENTITY_INSERT tblTaskPriorities OFF;

-- Workflow Statuses (tblStatus — distinct from tblRepairStatuses)
SET IDENTITY_INSERT tblStatus ON;
INSERT INTO tblStatus (lStatusKey, sStatusDesc, lSortOrder) VALUES
  (1, 'In Proc D&I', 1),
  (2, 'Scope In', 2),
  (3, 'Evaluation', 3),
  (4, 'Quote Sent', 4),
  (5, 'Quote Approved', 5),
  (6, 'In Repair', 6),
  (7, 'QC Check', 7),
  (8, 'Ready to Ship', 8),
  (9, 'Shipped', 9),
  (10, 'Invoiced', 10),
  (18, 'Batch Shipped', 18);
SET IDENTITY_INSERT tblStatus OFF;

-- System Codes (credit limits for vwSysCodesCreditLimit)
SET IDENTITY_INSERT tblSystemCodes ON;
INSERT INTO tblSystemCodes (lSystemCodesKey, sGroupName, sHeaderText, sItemText, nOrdinal) VALUES
  (1, 'CreditLimit', 'Credit Limit', '5,000', 1),
  (2, 'CreditLimit', 'Credit Limit', '10,000', 2),
  (3, 'CreditLimit', 'Credit Limit', '25,000', 3),
  (4, 'CreditLimit', 'Credit Limit', '50,000', 4),
  (5, 'CreditLimit', 'Credit Limit', '100,000', 5),
  (6, 'CreditLimit', 'Credit Limit', '250,000', 6);
SET IDENTITY_INSERT tblSystemCodes OFF;
