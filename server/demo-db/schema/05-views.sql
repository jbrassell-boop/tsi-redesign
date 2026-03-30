-- ═══════════════════════════════════════════════════════
--  05-views.sql — Views referenced by routes
-- ═══════════════════════════════════════════════════════

-- Credit limits view (backed by tblSystemCodes)
CREATE VIEW vwSysCodesCreditLimit AS
SELECT lSystemCodesKey, sItemText, nOrdinal
FROM tblSystemCodes
WHERE sGroupName = 'CreditLimit';
GO

-- Quote outcome view (used by reports.js for EndoCart conversion rates)
-- Derives approval status from repair dates
CREATE VIEW vwQuoteOutcome AS
SELECT
  r.lRepairKey,
  r.sWorkOrderNumber,
  r.dtDateIn,
  r.lDepartmentKey,
  CASE
    WHEN r.dtAprRecvd IS NOT NULL THEN 'Approved'
    WHEN r.dtDateOut IS NOT NULL AND r.dtAprRecvd IS NULL THEN 'Denied'
    WHEN r.dtReqSent IS NOT NULL AND r.dtAprRecvd IS NULL
         AND DATEDIFF(DAY, r.dtReqSent, GETDATE()) > 30 THEN 'Expired'
    WHEN r.dtReqSent IS NOT NULL AND r.dtAprRecvd IS NULL THEN 'Pending'
    ELSE 'Unknown'
  END AS sQuoteOutcome,
  CASE
    WHEN r.dtReqSent IS NOT NULL AND r.dtAprRecvd IS NOT NULL
    THEN DATEDIFF(DAY, r.dtReqSent, r.dtAprRecvd)
    ELSE NULL
  END AS nDaysToApprove
FROM tblRepair r;
