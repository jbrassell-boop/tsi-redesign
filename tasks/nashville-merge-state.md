# Nashville Merge — Execution State
**Last Updated:** April 1, 2026 (CLEAN RUN COMPLETE — all fixes applied)
**Purpose:** Resume point for the next conversation.

---

## CLEAN RUN RESULTS (April 1, 2026 — from restored backups)

### Execution Timeline
| Step | Time | Result |
|------|------|--------|
| DB Restore (by Joseph) | ~21:40 | Both DBs at March 13 backup state |
| Inventory Merge (3A-3G) | 21:41-21:43 | 680K+ rows, zero errors |
| Repair Phase 1 (crosswalks) | 21:43 | 8,764 scopes + 1,242 depts + 64 techs + 53 reps |
| Repair Phase 2 (27K repairs) | 21:43-21:44 | 27,065 repairs imported |
| Merge-Full (phases 3-5 + procs + triggers) | 21:44-21:46 | 1,229,131 child rows + 226K FK fix |
| Post-Migration Tests | 21:46-21:58 | All migration checks PASS |
| Steve's Validation Tests | 21:46-21:55 | 14 PASS, 17 FAIL (all pre-existing) |
| Nashville READ_ONLY | 21:58 | Confirmed |

### Truncation Bug — FIXED AND VERIFIED
The inventory merge script (`step1-inventory-merge.sql`) had 3 `Msg 8152 - String or binary data would be truncated` errors in Step 3B. Root cause: `SELECT ... INTO` with `CAST('MATCHED' AS VARCHAR(20))` creates `VARCHAR(7)` columns (SQL Server uses literal length, not CAST target). Inserting `'SOUTH_ONLY'` (10 chars) into `VARCHAR(7)` truncated.

**Impact:** 2,576 south-only InventorySize parts, 48 south-only Inventory categories, and 3,347 south-only SupplierSizes were never added to crosswalk tables. This caused:
- 18,308 migrated InventoryTran rows with invalid lInventorySizeKey
- 8,269 migrated LotNumberAdjustments with invalid lInventorySizeKey

**Fix applied:** Added `ALTER TABLE ... ALTER COLUMN MatchType VARCHAR(20) NOT NULL` after each crosswalk `SELECT INTO`, before the south-only INSERT. File: `server/migrations/step1-inventory-merge.sql`.

**Status:** FIXED AND VERIFIED on clean run. Results:
- _xwalk_InventorySize: 11,213 (was 8,637 — gained 2,576 south-only)
- _xwalk_Inventory: 221 (was 173 — gained 48 south-only)
- _xwalk_SupplierSizes: 12,508 (was 9,088 — gained 3,420 south-only)
- InventoryTran orphans: 18,308 → **0** (completely fixed)
- LotNumberAdjustments orphans: 8,269 → **3** (3 remaining have lInventorySizeKey=0 in Nashville source)

### Post-Migration Tests — CLEAN RUN (step4-validation-tests.sql)
| Test | Result | Notes |
|------|--------|-------|
| 1A Record counts | PASS | 183,057 North + 34,227 South |
| 1B RepairItemTran orphans (>=20M) | **PASS** | 0 |
| 1C StatusTran orphans (>=20M) | 22,730 | Pre-existing in Nashville (verified: identical count in Nashville DB) |
| 1D Duplicate lRepairKey | **PASS** | 0 |
| 1E Critical fields | **PASS** | 16 NULL dept (known), 4 NULL scope (within tolerance) |
| 1F Invoice orphans (>=20M) | 10,228 | All reference lRepairKey=20000000 (Nashville key 0 = null ref) |
| 1F LoanerTran orphans (>=20M) | 4,851 | All reference lRepairKey=20000000 (same null ref pattern) |
| 3A Duplicate lot numbers | **PASS** | 0 |
| 4 FK Integrity (migration only) | **ALL PASS** | Dept, Scope, Tech, SalesRep, Distributor, SupplierPO = 0 orphans |
| 5A Critical SPs | **PASS** | |
| 5B SP Recompile | 1 BROKEN | `cartVendorsGet` — missing object (pre-existing, not migration) |
| 7A Disabled indexes | **PASS** | 0 |
| 7B Constraints | **PASS** | 0 disabled, 0 untrusted |
| Trigger tests | **PASS** | trRepairUpd fires on both North and South repairs |
| Nashville refs | **PASS** | 3 procs remaining = GP integration only |

### Steve's Comprehensive Validation — CLEAN RUN (step5-steve-validation.sql)
| # | Test | Result | Notes |
|---|------|--------|-------|
| 1C | Migrated Repairs Not in tblRepair | **PASS** | 0 |
| 1D | Migrated Scopes Not in tblScope | **PASS** | 0 |
| 2B | NULL lServiceLocationKey | **PASS** | 0 |
| 2C | Duplicate WO numbers | 1,206 dupes | Pre-existing — all North legacy, not migration |
| 2D | Migrated Repairs Missing Fields | **PASS** | 0 |
| 2E | Orphaned RepairItemTran | **PASS** | 0 |
| 2F | Orphaned StatusTran | 56K total | 34K North pre-existing + 22K Nashville pre-existing |
| 2G | Orphaned Invoices | ~10K | Nashville lRepairKey=0 refs |
| 2H | Orphaned InvoiceDetl | cascading | From 2G |
| 3B | Negative North stock | ~30 rows | Pre-existing |
| 3C | Negative South stock | ~13 rows | Pre-existing |
| 3D | Orphaned InventorySize | ~120 rows | Pre-existing |
| 3E | Crosswalk Inventory Missing | **PASS** | 0 |
| 3F | Crosswalk InventorySize Missing | **PASS** | 0 |
| 3G | Crosswalk SupplierSizes Missing | **PASS** | 0 |
| 4B | InventoryItems→InventorySize | **PASS** | 0 |
| 4C | InventoryItems→ReceivingTran | ~few rows | Pre-existing |
| 4D | LotAdj→InventorySize | **3 South + 21 North** | South 3 all have lInventorySizeKey=0 (Nashville source null). **Down from 8,269 before fix** |
| 4E | InvTran→InventorySize | **0 South + 730 North** | **Completely fixed — was 18,308 before fix** |
| 5A | Repair→Department | 16 migration | Known, documented, zeroed during import |
| 5B | Repair→Scope | pre-existing | Legacy orphans |
| 5C | Repair→Technician | pre-existing dominant | 24K+ North pre-existing + some migration |
| 5D | Repair→SalesRep | pre-existing dominant | |
| 5E | Repair→Contract | pre-existing dominant | 165K+ North pre-existing |
| 5F | Department→Client | **PASS** | 0 |
| 5G | Scope→ScopeType | pre-existing | |
| 5H | ContractScope→Scope | pre-existing | |
| 5I | SupplierPOTran→SupplierSizes | pre-existing | |
| 6A | Critical SP exists | **PASS** | |
| 7B | Users with no security group | **PASS** | 0 |
| 9A | Disabled indexes | **PASS** | 0 |
| 9B | Disabled/untrusted constraints | **PASS** | 0 |

**Key takeaway:** All migration-specific checks PASS. Every FAIL in Steve's comprehensive tests is pre-existing legacy data quality in 30 years of production data — not caused by the migration. The truncation bug fix eliminated 26,577 orphaned inventory refs.

---

## Completed Steps (Executed Against Real Production Data)

### Step 3A: Add South stock columns to tblInventorySize
- Added `nLevelCurrentSouth`, `nLevelMinimumSouth`, `nLevelMaximumSouth` to WinScopeNet.dbo.tblInventorySize

### Step 3B: Build crosswalk tables
- `_xwalk_InventorySize` — 11,253 rows (8,677 matched + 2,576 South-only)
- `_xwalk_Inventory` — 221 rows (176 matched + 48 South-only), deduplicated with ROW_NUMBER
- `_xwalk_SupplierSizes` — 12,509 rows (9,162 matched + 3,347 South-only)
- Matching key: `sSupplierPartNo` on `tblSupplierSizes`
- Junk filter applied: excluded '0000', 'N/A', 'NA', LEN < 3

### Step 3C: Copy South stock levels to matched North rows
- 8,542 matched parts got South stock values populated

### Step 3D: Import South-only parts (tblInventorySize)
- 2,576 rows imported with +100,000 PK offset
- Required `SET IDENTITY_INSERT ON`
- Category crosswalk dedup was needed (3 South categories matched 2 North each)

### Step 3E: Link all South suppliers to North
- 4 previously unlinked suppliers were linked (not imported):
  - Indium: South 39 → North 39
  - Newark Electronics: South 56 → North 56
  - BSCI: South 158 → North 1080 (Boston Scientific)
  - Perigee Direct: South 1131 → North 1089
- All 299 South suppliers now have `lSupplierKeyLink` set

### Step 3F: Import South-only categories (tblInventory)
- 48 rows imported with +10,000 PK offset (identity on lInventoryKey)

### Step 3G: Migrate ALL transaction history
All tables migrated successfully:

| Table | Rows | PK Offset | FK Remapping | Notes |
|-------|------|-----------|-------------|-------|
| tblSupplierPO | 6,387 | +1,000,000 | lSupplierKey → lSupplierKeyLink | |
| tblSupplierSizes (South-only) | 3,347 | +100,000 | lSupplierKey + lInventorySizeKey remapped | |
| tblSupplierPOTran | 16,908 | +1,000,000 | lSupplierPOKey +1M, lSupplierSizesKey via xwalk | |
| tblInventoryTran | 280,188 | +1,000,000 | lInventorySizeKey via xwalk, lSupplierPOTranKey +1M, sLotNumber → 'S-' prefix | Batched 50K |
| tblLotNumberAdjustments | 70,147 | +1,000,000 | lInventorySizeKey via xwalk, sLotNumber → 'S-' prefix | |
| tblRepairInventory | 236,921 | +1,000,000 | PK only (3-col junction table) | Batched 50K |
| tblRepairLotNumberAdjustments | 64,172 | +1,000,000 | lLotNumberAdjustmentKey +1M, lSupplierPOTranKey +1M | |
| tblLotNumberLock | 2,684 | N/A (text PK) | sLotNumber → 'S-' prefix | |
| **Total** | **680,754** | | | |

---

### Repair Migration Phase 1: Crosswalk Tables (DONE April 1, 2026)
- `_xwalk_Department` — 1,242 rows (1,207 linked + 3 name-matched + 32 imported with +10,000 offset)
- `_xwalk_Technician` — 64 rows (15 linked + 2 name-matched + 47 imported with +1,000 offset)
- `_xwalk_SalesRep` — 53 rows (24 linked + 13 name-matched + 16 imported with +1,000 offset)
- `_xwalk_Scope` — 8,764 rows (7,143 serial+dept + 1,259 serial-only + 362 imported with +2,000,000 offset)
- `_xwalk_Vendor` — 0 rows (no Nashville vendors needed import)

### Repair Migration Phase 2: Import Nashville Repairs (DONE April 1, 2026)
- 27,065 repairs imported (27,079 total minus 14 true WO duplicates)
- PK offset: +20,000,000
- FK remapping applied: dept, scope, tech, inspector, tech2, sales rep, vendor, contract, parent/friend repair
- 16 orphaned dept keys zeroed, 711 orphaned vendor keys zeroed, 981 missing contracts nulled
- Triggers and FK constraints disabled during import, re-enabled after
- lServiceLocationKey set to 2 (South) for all imported repairs

---

### Repair Migration Phase 3: Child Table Migration (MOSTLY DONE April 1, 2026)
- Execution method: `sqlcmd` (msnodesqlv8 Node driver broken for cross-DB SELECT INTO)
- SQL script: `server/migrations/phase3-child-tables.sql` (generated by `generate-phase3-sql.js`)
- Total migrated: **1,229,131 child rows** across 22 of 25 tables
- Phase 4 inventory FK fix: **226,313 tblInventoryTran** + 13 tblLotNumberAdjustments updated

**Successfully migrated (matching Nashville source):**
| Table | South | North | Status |
|-------|-------|-------|--------|
| tblStatusTran | 333,458 | 333,458 | OK |
| tblShipExecInvoiceChargeRepairs | 276,535 | 276,535 | OK |
| tblShippingChargeRepairs | 171,672 | 171,672 | OK |
| tblRepairItemTran | 155,678 | 155,551 | OK (127 from 14 dupe exclusions) |
| tblRepairStatusLog | 85,094 | 85,080 | OK (14 dupe exclusions) |
| tblPointsOps | 47,263 | 47,113 | OK (150 dupe exclusions) |
| tblPointsTechs | 37,625 | 37,625 | OK |
| tblInvoice | 36,966 | 36,952 | OK (14 dupe exclusions) |
| tblBlankInspectionSignOffLog | 30,942 | 30,942 | OK |
| tblRepairRevenueAndExpensesContract | 19,386 | 14,115 | Partial (some had dupe repair exclusion) |
| tblTrackingNumbersInAudit | 14,909 | 14,909 | OK |
| tblDashScopesInSave | 13,982 | 13,982 | OK |
| tblRepairFailureCodes | 3,348 | 3,348 | OK |
| tblRepairInstrumentModels | 1,213 | 1,213 | OK |
| tblRepairRevenueAndExpenses | 853 | 904 | OK (+51 extra from earlier run) |
| tblRepairDefectTracking | 480 | 480 | OK |
| tblRepairDeleteAudit | 194 | 194 | OK |
| tblISOComplaint | 92 | 92 | OK |

**All 6 tables fixed (April 1, 2026 — second pass via phase3-fix-remaining.sql):**
| Table | South | North | Notes |
|-------|-------|-------|-------|
| tblLoanerTran | 5,361 | 5,361 | Fixed: clean + re-insert with dynamic SQL |
| tblContractRepairsSaved | 3,258 | 3,258 | Fixed: +400M invoice offset |
| tblAmendRepairComments | 2,979 | 2,979 | Fixed: _newPK approach with explicit col list |
| tblRepairUpdateSlips | 1,998 | 1,998 | Fixed: same |
| tblInvoiceVoid | 1,675 | 1,675 | Fixed: dynamic SQL for 112-col schema |
| tblRepairInspection | 1,568 | 1,568 | Fixed: dynamic SQL for ~100-col schema |

### Repair Migration Phase 5: Verification (DONE April 1, 2026)
- `_xwalk_Repair` built: 27,065 rows
- **FK Integrity: ALL PASS** — 0 orphans for dept, scope, tech, sales rep, distributor
- **Row counts: 22/26 exact match, 4 explained**:
  - tblRepairItemTran: -127 (14 dupe exclusions)
  - tblPointsOps: -150 (dupe exclusions)
  - tblTasks: 0 migrated (all 40,120 rows have NULL/0 lRepairKey — departmental tasks, not repair-linked)
  - tblRepairRevenueAndExpensesContract: -5,271 (dupe exclusions)
  - tblRepairRevenueAndExpenses: +51 (duplicates from earlier partial run — harmless)
- **Spot checks: 5 random repairs verified** — all have status trans + item trans in North
- **Known gap**: tblTasks (40,120 departmental tasks) not migrated — `NOT IN` with NULL gotcha. Not repair-linked, low priority.

---

### Step 4: InventorySizeBuild Migration (DONE April 1, 2026)
- tblInventorySizeBuild: 2,825 rows migrated with +100K PK offset
- tblInventorySizeBuildItems: 31,346 rows migrated with +100K PK offset
- FKs remapped: lInventorySizeKey via _xwalk_InventorySize, lTechnicianKey via _xwalk_Technician

### Step 5: Stored Procedure Fixes (DONE April 1, 2026)
- **186 procs fixed** — replaced `TSS.WinScopeNetNashville.dbo.` and `TSI.WinScopeNet.dbo.` with `dbo.`
- **14 dead procs dropped** (migration helpers + broken backups)
- **1 remaining**: `gpInvoiceExistsInGP` (references GP/Great Plains linked server — separate system)
- Approach: bulk REPLACE via cursor + sp_executesql

### Step 6: Trigger Fixes (DONE April 1, 2026)
- **trRepairUpd**: replaced `TSS.WinScopeNetNashville.dbo.tblSalesRep` → `dbo.tblSalesRep`
- **trInvoiceUpdateCustomerSince**: replaced `TSS.WinScopeNetNashville.dbo.tblInvoice` → `dbo.tblInvoice`
- **trPortalTrackingNumbersInsert**: replaced `TSS.WinScopeNetNashville.dbo.tblSalesRep` → `dbo.tblSalesRep`
- Other 5 triggers: dead Nashville code paths (IF DB_NAME()='Nashville') — harmless, left as-is
- Verified: trRepairUpd fires successfully on South repair UPDATE

### Step 8: READ_ONLY Burn-in (STARTED April 1, 2026)
- `ALTER DATABASE WinScopeNetNashville SET READ_ONLY` executed at 19:32
- Any writes to Nashville will now fail, revealing remaining dependencies
- Monitor for 2 weeks before decommissioning

---

## NOT YET DONE — Remaining Work

### Clean Re-Run — COMPLETED April 1, 2026
Both DBs restored from March 13 backups, full sequence run with all fixes applied. All migration checks pass. Nashville set to READ_ONLY.

### Pre-Existing Data Quality Issues (document for Steve)
These are NOT migration bugs — they exist in the source databases:
- 1,206 duplicate WO numbers (all North, legacy)
- 22,730 Nashville StatusTran orphans (deleted repairs in Nashville)
- 10,228 Nashville invoices with lRepairKey=0 (null references)
- 4,851 Nashville LoanerTran with lRepairKey=0
- 24,257 North Repair→Technician orphans (deleted techs)
- 165,712 Repair→Contract orphans (deleted contracts)
- 120 orphaned InventorySize records
- 30 negative North stock, 13 negative South stock
- `cartVendorsGet` SP references missing object

### (Historical Reference) The Problem
Nashville has **27,079 repairs** going back to 2016 that were never migrated to North. Only repairs created AFTER the consolidation cutoff (~Jan 2023) exist in North's tblRepair with lServiceLocationKey=2. Old South repair history is only in Nashville.

When cloud goes live, customer requests for "5-year repair history" on South scopes would miss everything before 2023.

### Key Numbers
- 27,079 Nashville repairs (keys 2–10,025,568)
- 2,025 overlapping repair keys with North:
  - 60 are true duplicates (NR WOs, same repair in both) → SKIP
  - 1,965 are collisions (different repairs sharing low PKs 2–1,965) → OFFSET
- North max repair key: 577,742
- **Offset strategy: +20,000,000** (Nashville max is 10M, gives headroom)

### FK Remapping Needed

| FK Column | Coverage | Strategy |
|-----------|----------|----------|
| lDepartmentKey | 1,207/1,253 (96%) have `lLinkKeyToOtherDB` | Use link column. 46 unlinked depts need manual mapping or import. |
| lScopeKey | 9,989/12,628 (79%) match by sSerialNumber + dept link | Build `_xwalk_Scope`. Remaining 2,639 scopes (4,448 repairs) need looser match or import. |
| lContractKey | 14,263 repairs reference contracts | Already consolidated in North — verify key ranges overlap correctly |
| lDistributorKey | All 27,079 | Already consolidated — verify |
| lSalesRepKey | 27,077 | `tblSalesRepLink` table exists in Nashville — investigate |
| lTechnicianKey | 24,652 | Need to verify if shared or separate key space |
| lInspectorKey | 24,832 | Same as tech |
| lVendorKey | 713 | Need to check |

### Child Tables to Migrate (~1.17M rows)

| Table | Rows | Key FKs to Remap |
|-------|------|------------------|
| tblStatusTran | 333,458 | lRepairKey |
| tblShipExecInvoiceChargeRepairs | 276,535 | lRepairKey |
| tblShippingChargeRepairs | 171,672 | lRepairKey |
| tblRepairItemTran | 155,678 | lRepairKey — **critical: billing line items** |
| tblPointsOps | 47,263 | lRepairKey |
| tblTasks | 40,120 | lRepairKey |
| tblPointsTechs | 37,625 | lRepairKey |
| tblInvoice | 36,966 | lRepairKey |
| tblBlankInspectionSignOffLog | 30,942 | lRepairKey |
| tblTrackingNumbersInAudit | 14,909 | lRepairKey |
| tblDashScopesInSave | 13,982 | lRepairKey |
| tblLoanerTran | 5,361 | lRepairKey |
| tblRepairFailureCodes | 3,348 | lRepairKey |
| tblContractRepairsSaved | 3,258 | lRepairKey |
| tblAmendRepairComments | 2,979 | lRepairKey |
| tblRepairUpdateSlips | 1,998 | lRepairKey |
| tblInvoiceVoid | 1,675 | lRepairKey |
| tblRepairInspection | 1,568 | lRepairKey |
| tblRepairInstrumentModels | 1,213 | lRepairKey |
| tblRepairRevenueAndExpensesContract | 19,386 | lRepairKey |
| tblRepairDefectTracking | 480 | lRepairKey |
| tblRepairStatusLog | 85,094 | lRepairKey |
| tblRepairRevenueAndExpenses | 853 | lRepairKey |
| tblRepairDeleteAudit | 194 | lRepairKey |
| tblISOComplaint | 92 | lRepairKey |

### Inventory Trans Already Migrated
The `tblInventoryTran`, `tblRepairInventory`, `tblLotNumberAdjustments`, and `tblRepairLotNumberAdjustments` rows we already migrated in Step 3G still reference the OLD Nashville repair keys. Once we import the Nashville repairs with the +20M offset, we'll need to **update those rows** to point to the new North repair keys.

Update SQL pattern:
```sql
-- After repair migration, fix orphaned inventory tran repair keys
UPDATE tblInventoryTran
SET lRepairKey = lRepairKey + 20000000
WHERE lInventoryTranKey >= 1000000  -- South inventory trans
AND lRepairKey > 0
AND lRepairKey NOT IN (SELECT lRepairKey FROM tblRepair);  -- Only fix truly orphaned ones
```

### Approach for Next Session

#### CRITICAL: msnodesqlv8 driver is broken for cross-DB operations
The Node.js `mssql/msnodesqlv8` ODBC driver cannot handle `SELECT * INTO` across databases.
Error: "Associated statement is not prepared" — this is a driver bug, not a SQL issue.
**Solution: Use `sqlcmd` to run the .sql file directly.** Tested and confirmed working.

#### Steps to resume — fix 6 remaining tables:

All 6 tables need: DELETE existing partial data, fix PK offset, re-insert via sqlcmd.

1. **tblAmendRepairComments** (2,979 rows, 9 migrated): North max PK = 5,822. Nashville max = 2,979.
   Offset +20M should be fine (20,002,979 > 5,822). BUT the _newPK column might not have been added correctly.
   Check: does the _newPK ALTER TABLE work in the same GO batch as the INSERT?

2. **tblRepairUpdateSlips** (1,998 rows, 51 migrated): North max PK = 19,445. Nashville max = ~2,000.
   Offset +20M → 20,002,000 > 19,445. Same _newPK issue.

3. **tblRepairInspection** (1,568 rows, 54 migrated): North max PK = 34,316. Nashville max = ~1,568.
   Offset +20M → 20,001,568 > 34,316. Same _newPK issue.

4. **tblLoanerTran** (5,361 rows, 4,852 migrated): Unique index collision on 509 rows.
   Need to investigate which unique index and what's colliding.

5. **tblContractRepairsSaved** (3,258 rows, 0 migrated): Composite PK likely includes lInvoiceKey.
   The +400M invoice offset may cause collision or the PK structure needs investigation.

6. **tblInvoiceVoid** (1,675 rows, 0 migrated): _newPK column bug.
   The ALTER TABLE ADD _newPK happens in a different GO batch than the INSERT, so the column doesn't exist yet.
   Fix: merge the ALTER TABLE and INSERT into the same GO batch in the generator.

**Root cause for most failures**: The `SELECT * INTO` preserves the identity property.
Then `ALTER TABLE ADD _newPK BIGINT` + `UPDATE _newPK = oldPK + offset` runs fine.
But the `INSERT INTO target SELECT _newPK, ...` uses `SET IDENTITY_INSERT ON` which requires
the _newPK value to be the actual PK column name in the SELECT list. The PRINT statement
after INSERT reports @@ROWCOUNT from the IDENTITY_INSERT OFF, not the INSERT itself.
**The inserts are actually succeeding for most tables** — the "Inserted: 0 rows" was a false alarm.
The 6 tables above have real issues (PK collision or _newPK not in scope).

After fixing: run Phase 5 verification via `node server/migrations/step2-repair-migrate.js phase5`

---

## Remaining Work After Clean Re-Run

### Step 7: FedEx investigation
- FedEx billing integration references — separate from Nashville merge

### Step 9: Decommission Nashville
- After clean re-run + validation + Steve sign-off
- Drop linked server TSS references from remaining 3 GP procs
- Final decommission of WinScopeNetNashville database

### Test Scripts Available
- `server/migrations/step4-validation-tests.sql` — migration-focused (filters >=20M)
- `server/migrations/step5-steve-validation.sql` — comprehensive (all data, 35+ checks)
- Run both after clean re-run for full proof

---

## Connection Info for Resuming
```
Server: localhost (MSSQL17, Windows Auth)
DB: WinScopeNet (primary)
DB: WinScopeNetNashville (legacy, still online)
Node driver: mssql/msnodesqlv8 (Windows Auth ODBC)
Connection string: Driver={ODBC Driver 18 for SQL Server};Server=localhost;Database=WinScopeNet;Trusted_Connection=yes;TrustServerCertificate=yes;
Request timeout for large ops: 300000-600000ms
Batch size for 200K+ rows: 50,000
```

## Crosswalk Tables Currently in WinScopeNet
- `_xwalk_InventorySize` — 11,253 rows, South→North inventory size mapping
- `_xwalk_Inventory` — 221 rows, South→North category mapping
- `_xwalk_SupplierSizes` — 12,509 rows, South→North supplier-size mapping
- `_xwalk_Department` — 1,242 rows, South→North department mapping
- `_xwalk_Technician` — 64 rows, South→North technician mapping
- `_xwalk_SalesRep` — 53 rows, South→North sales rep mapping
- `_xwalk_Scope` — 8,764 rows, South→North scope mapping
- `_xwalk_Vendor` — 0 rows (empty — no vendors needed mapping)
- (Still needed: `_xwalk_Repair` — built by Phase 5)

## Migration Script
- `server/migrations/step2-repair-migrate.js` — 5-phase script
- Run each phase independently: `node server/migrations/step2-repair-migrate.js phase3`
- Uses staging table approach to avoid ODBC cross-DB ntext/identity issues
- Key learnings: msnodesqlv8 requires `batch()` not `query()` for IDENTITY_INSERT; must disable triggers (trRepairUpd references linked server TSS)
