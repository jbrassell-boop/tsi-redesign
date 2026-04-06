-- ═══════════════════════════════════════════════════════════════
--  step6-fix-svc-location-mismatch.sql
--  Fix S-prefix work orders incorrectly tagged as PA (location 1)
--  S-prefix WOs (SR, SI, SC, SK, SV) must be Nashville (location 2)
-- ═══════════════════════════════════════════════════════════════

PRINT '── Step 6: Fix service location mismatches ──';

-- Preview affected rows
PRINT '  Scanning for S-prefix WOs with lServiceLocationKey = 1...';
SELECT lRepairKey, sWorkOrderNumber, lServiceLocationKey
FROM tblRepair
WHERE sWorkOrderNumber LIKE 'S[RICKV]%'
  AND lServiceLocationKey = 1;
PRINT CONCAT('  Found ', @@ROWCOUNT, ' S-prefix repairs tagged as PA');

-- Fix: set S-prefix WOs to Nashville (2)
UPDATE tblRepair
SET lServiceLocationKey = 2
WHERE sWorkOrderNumber LIKE 'S[RICKV]%'
  AND lServiceLocationKey = 1;
PRINT CONCAT('  Updated ', @@ROWCOUNT, ' repairs → lServiceLocationKey = 2 (Nashville)');

-- Safety check: N-prefix WOs that are incorrectly tagged as Nashville
PRINT '';
PRINT '  Scanning for N-prefix WOs with lServiceLocationKey = 2...';
SELECT lRepairKey, sWorkOrderNumber, lServiceLocationKey
FROM tblRepair
WHERE sWorkOrderNumber LIKE 'N[RICKV]%'
  AND lServiceLocationKey = 2;
PRINT CONCAT('  Found ', @@ROWCOUNT, ' N-prefix repairs tagged as Nashville');

UPDATE tblRepair
SET lServiceLocationKey = 1
WHERE sWorkOrderNumber LIKE 'N[RICKV]%'
  AND lServiceLocationKey = 2;
PRINT CONCAT('  Updated ', @@ROWCOUNT, ' repairs → lServiceLocationKey = 1 (PA)');

-- Verification
PRINT '';
PRINT '── Verification ──';
SELECT
  CASE lServiceLocationKey WHEN 1 THEN 'NORTH (PA)' WHEN 2 THEN 'SOUTH (Nashville)' ELSE 'OTHER' END AS Location,
  COUNT(*) AS TotalRepairs
FROM tblRepair
GROUP BY lServiceLocationKey
ORDER BY lServiceLocationKey;

PRINT '  DONE';
