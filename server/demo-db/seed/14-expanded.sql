-- ═══════════════════════════════════════════════════════
--  14-expanded.sql — Tasks, loaner tracking, pending arrivals, dev to-do
-- ═══════════════════════════════════════════════════════

-- ── Lookup: To-Do Statuses ────────────────────────────────────────────────────
SET IDENTITY_INSERT tblTodoStatuses ON;
INSERT INTO tblTodoStatuses (lTodoStatusKey, sTodoStatus) VALUES
  (1, 'Open'),
  (2, 'InProgress'),
  (3, 'Done'),
  (4, 'Deferred');
SET IDENTITY_INSERT tblTodoStatuses OFF;

-- ── Lookup: To-Do Priorities ─────────────────────────────────────────────────
SET IDENTITY_INSERT tblTodoPriorities ON;
INSERT INTO tblTodoPriorities (lTodoPriorityKey, sTodoPriority) VALUES
  (1, 'Low'),
  (2, 'Medium'),
  (3, 'High'),
  (4, 'Critical');
SET IDENTITY_INSERT tblTodoPriorities OFF;

-- ── tblTasks (10 tasks across types, statuses, priorities) ───────────────────
-- lTaskTypeKey:     1=Repair Follow-Up, 2=Call Back, 3=Quote Review, 4=Loaner Return, 5=QC Hold
-- lTaskStatusKey:   1=Open, 2=In Progress, 3=Complete, 4=Cancelled
-- lTaskPriorityKey: 1=Low, 2=Normal, 3=High, 4=Urgent
SET IDENTITY_INSERT tblTasks ON;
INSERT INTO tblTasks (lTaskKey, lTaskTypeKey, lTaskStatusKey, lTaskPriorityKey, lOwnerKey, lAssignedToUserKey, sTaskDescription, dtDueDate, dtCreateDate, dtLastUpdate, lCreatedByUserKey) VALUES
  (1,  1, 2, 3, 11, 1, 'Follow up on NR250010 approval — customer not responding to quote', '2026-03-31', '2026-03-19', '2026-03-22', 1),
  (2,  2, 1, 4, 12, 1, 'Call Jefferson purchasing re: PO-2026-0202 for CCD repair',         '2026-04-01', '2026-03-20', '2026-03-20', 1),
  (3,  3, 2, 3, 17, 2, 'Review and approve NR250011 quote before sending to customer',      '2026-03-30', '2026-03-18', '2026-03-25', 2),
  (4,  4, 1, 2, 7,  1, 'Loaner scope due back from Jefferson Endoscopy — contact dept',     '2026-04-02', '2026-03-21', '2026-03-21', 1),
  (5,  5, 2, 4, 10, 2, 'QC hold NR250020 — duodenoscope needs secondary sign-off',         '2026-03-29', '2026-02-28', '2026-03-05', 2),
  (6,  1, 1, 2, 26, 3, 'Follow up SR250005 — approved but no ship date set',                '2026-04-03', '2026-03-22', '2026-03-22', 3),
  (7,  2, 3, 1, 51, 5, 'Confirm Vanderbilt contract renewal interest for 2027',             '2026-04-10', '2026-03-15', '2026-03-28', 3),
  (8,  1, 1, 3, 21, 4, 'Outsourced scope NR250032 — check ETA from Olympus',               '2026-04-05', '2026-03-12', '2026-03-12', 1),
  (9,  3, 4, 1, 9,  2, 'Quote expired on NR250024 — cancelled per customer, close out',    '2026-03-28', '2026-03-20', '2026-03-28', 2),
  (10, 2, 2, 2, 18, 4, 'Call TriStar re: SC260002 invoice — payment 30 days outstanding',  '2026-03-31', '2026-03-01', '2026-03-26', 3);
SET IDENTITY_INSERT tblTasks OFF;

-- ── tblTaskStatusHistory ──────────────────────────────────────────────────────
SET IDENTITY_INSERT tblTaskStatusHistory ON;
INSERT INTO tblTaskStatusHistory (lTaskStatusHistoryKey, lTaskKey, dtTaskStatusDate, lTaskStatusKey, lUserKey) VALUES
  (1, 3, '2026-03-18', 1, 2),
  (2, 3, '2026-03-25', 2, 2),
  (3, 7, '2026-03-15', 1, 3),
  (4, 7, '2026-03-28', 3, 3),
  (5, 9, '2026-03-20', 1, 2),
  (6, 9, '2026-03-28', 4, 2);
SET IDENTITY_INSERT tblTaskStatusHistory OFF;

-- ── tblTaskLoaner (5 loaner tracking records) ─────────────────────────────────
SET IDENTITY_INSERT tblTaskLoaner ON;
INSERT INTO tblTaskLoaner (lTaskLoanerKey, sTaskNumber, lScopeTypeKey, lQuantity, sStatus, sLoanerTrackingNumber, dtCreateDate, dtLastUpdate) VALUES
  (1, 'TL-2026-001', 1,  1, 'Out',       '1Z999AA10123456790', '2026-03-21', '2026-03-21'),
  (2, 'TL-2026-002', 3,  1, 'Out',       '1Z999AA10123456791', '2026-03-18', '2026-03-18'),
  (3, 'TL-2026-003', 11, 2, 'Requested', NULL,                 '2026-03-27', '2026-03-27'),
  (4, 'TL-2026-004', 5,  1, 'Returned',  '1Z999AA10123456792', '2026-03-10', '2026-03-24'),
  (5, 'TL-2026-005', 2,  1, 'Out',       '1Z999AA10123456793', '2026-03-25', '2026-03-25');
SET IDENTITY_INSERT tblTaskLoaner OFF;

-- ── tblPendingArrival (8 rows) ────────────────────────────────────────────────
-- sStatus values: pending / received / cancelled
SET IDENTITY_INSERT tblPendingArrival ON;
INSERT INTO tblPendingArrival (lPendingArrivalKey, lScopeTypeKey, lDepartmentKey, lServiceLocationKey, sSerialNumber, sStatus, sPurchaseOrder, dtExpectedDate, dtReceivedDate, mComments, dtCreateDate) VALUES
  (1, 1,  1,  1, NULL,      'pending',   'PO-ARR-001', '2026-04-05', NULL,         'New Olympus gastroscope for Penn Medicine GI',          '2026-03-20'),
  (2, 3,  3,  1, NULL,      'pending',   'PO-ARR-002', '2026-04-10', NULL,         'Replacement colonoscope for Jefferson Endoscopy',        '2026-03-22'),
  (3, 11, 16, 2, NULL,      'pending',   'PO-ARR-003', '2026-04-08', NULL,         'New laparoscope for Vanderbilt OR',                      '2026-03-25'),
  (4, 17, 4,  1, 'STR-9301','received',  'PO-ARR-004', '2026-03-20', '2026-03-22', 'Stryker 1288 camera head received — Jefferson OR',      '2026-03-10'),
  (5, 2,  15, 2, NULL,      'pending',   'PO-ARR-005', '2026-04-12', NULL,         'Gastroscope for Vanderbilt GI Lab',                      '2026-03-27'),
  (6, 4,  8,  1, '2802101', 'received',  'PO-ARR-006', '2026-03-20', '2026-03-21', 'Colonoscope received — Main Line Endoscopy',             '2026-03-10'),
  (7, 13, 19, 2, NULL,      'cancelled', 'PO-ARR-007', '2026-03-28', NULL,         'Cancelled — TriStar OR switched to rental program',      '2026-03-05'),
  (8, 6,  5,  1, NULL,      'pending',   'PO-ARR-008', '2026-04-15', NULL,         'Bronchoscope for Jefferson Pulmonary — back-order item', '2026-03-25');
SET IDENTITY_INSERT tblPendingArrival OFF;

-- ── tblDevelopmentToDo (10 rows) ──────────────────────────────────────────────
-- lPriority: 1=Low, 2=Medium, 3=High, 4=Critical  |  lStatusKey: 1=Open, 2=InProgress, 3=Done, 4=Deferred
SET IDENTITY_INSERT tblDevelopmentToDo ON;
INSERT INTO tblDevelopmentToDo (lToDoID, sTitle, sDescription, lPriority, lStatusKey, sAssignedTo, dtDueDate, dtCreateDate, dtLastUpdate) VALUES
  (1,  'Wire dashboard KPIs to SQL',
       'Replace hardcoded KPI values on dashboard.html with live Express endpoints for TAT, open WOs, shipped MTD, and revenue MTD.',
       4, 2, 'backend-lead', '2026-04-05', '2026-03-25', '2026-03-28'),

  (2,  'Add NWO wizard step 3 confirmation screen',
       'New Work Order wizard currently skips the confirmation step. Build step 3 UI with scope summary and Submit button wired to POST /api/repairs.',
       3, 2, 'ui-lead',     '2026-04-07', '2026-03-20', '2026-03-27'),

  (3,  'Repair details tab — parts ordering sub-panel',
       'Add parts ordering UI to repair details drawer so techs can link PO line items to a repair directly from the repairs page.',
       2, 1, 'backend-lead', '2026-04-15', '2026-03-22', '2026-03-22'),

  (4,  'Contract renewal automation',
       'Build scheduled job or manual trigger to generate renewal proposals 90 days before contract termination date. Seed tblPendingContract automatically.',
       3, 1, 'backend-lead', '2026-04-20', '2026-03-15', '2026-03-15'),

  (5,  'QA pass — instruments.html data wiring',
       'instruments.html still uses placeholder data. Wire all 5 tabs to Express endpoints. QA agent to verify field mapping after.',
       3, 2, 'qa-lead',     '2026-04-03', '2026-03-28', '2026-03-29'),

  (6,  'Implement FedEx Ship API label generation',
       'FedEx Ship API credentials are validated. Build POST /api/shipping/label endpoint that accepts repair key and returns base64 label PDF.',
       2, 1, 'backend-lead', '2026-05-01', '2026-03-26', '2026-03-26'),

  (7,  'Floor meeting PPTX — add South region support',
       'PPTX generator currently only pulls North region data. Add lServiceLocationKey=2 branch and South-specific KPI slide.',
       2, 3, 'backend-lead', '2026-03-28', '2026-03-20', '2026-03-28'),

  (8,  'Replace placeholder data in loaners.html',
       'loaners.html still references mock-db.js data. Wire to /api/loaners endpoints and verify fill-rate KPI calculation matches spec.',
       3, 1, 'ui-lead',     '2026-04-08', '2026-03-29', '2026-03-29'),

  (9,  'Onsite services — invoice generation endpoint',
       'POST /api/onsite/:id/invoice is stubbed but not implemented. Wire to tblGP_InvoiceStaging insert pattern matching existing invoice routes.',
       2, 4, 'backend-lead', '2026-05-15', '2026-03-10', '2026-03-20'),

  (10, 'Design token audit — remaining hardcoded hex in forms/',
       'forms/ directory still has several hardcoded hex colors (#1B3A5C, #2E75B6). Run grep audit and replace with var(--primary-dark) / var(--primary).',
       1, 1, 'ui-lead',     '2026-04-30', '2026-03-28', '2026-03-28');
SET IDENTITY_INSERT tblDevelopmentToDo OFF;
