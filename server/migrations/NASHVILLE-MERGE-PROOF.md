# Nashville Repair Migration — Proof of Execution

**Date:** April 1, 2026
**Environment:** VPOPS (localhost), SQL Server 2025
**Databases:** WinScopeNet (North) + WinScopeNetNashville (South)
**Both databases restored from March 13, 2026 backups before this run.**

---

## What This Migration Does

Moves all Nashville (South) repair history into the North database so the cloud app shows complete 5-year repair history for all customers — North and South.

## Execution Summary

| Step | What | Rows | Time |
|------|------|------|------|
| Phase 1 | Build crosswalk tables (dept, tech, sales rep, scope) | 9,623 mappings | 31s |
| Phase 2 | Import 27,065 Nashville repairs with FK remapping | 27,065 | 30s |
| Phase 3 | Migrate 25 child tables (status, billing, invoices, etc.) | ~1.25M | 90s |
| Step 4 | Migrate InventorySizeBuild recipes | 34,171 | 2s |
| Step 5 | Fix stored procedures referencing Nashville | 186 procs | 18s |
| Step 6 | Fix triggers referencing Nashville linked server | 3 triggers | 1s |
| **Total** | | **~1.28M rows** | **~3 min** |

## How To Run

### Prerequisites
- Both databases restored to pre-merge backups
- Node.js installed with mssql/msnodesqlv8 in the project

### Commands (3 steps)
```bash
cd C:/Projects/tsi-redesign

# Step 1: Phase 1 + 2 (crosswalks + repair import)
node server/migrations/nashville-repair-migrate.js phase1
node server/migrations/nashville-repair-migrate.js phase2

# Step 2: Phase 3 + Steps 4-6 (child tables, recipes, triggers, procs)
sqlcmd -S localhost -d WinScopeNet -E -i server/migrations/nashville-merge-full.sql -o server/migrations/merge-run-report.txt

# Step 3: Verify
node server/migrations/nashville-repair-migrate.js phase5
```

## Verification Results (from clean run)

### Repairs Imported
- **27,065 of 27,079** Nashville repairs imported (14 true duplicates skipped — same WO in both DBs)
- All repairs tagged with `lServiceLocationKey = 2` (South)
- PK offset: +20,000,000 (Nashville max was 10M)

### FK Integrity — ALL PASS
| Check | Orphans |
|-------|---------|
| lDepartmentKey → tblDepartment | 0 |
| lScopeKey → tblScope | 0 |
| lTechnicianKey → tblTechnicians | 0 |
| lSalesRepKey → tblSalesRep | 0 |
| lDistributorKey → tblDistributor | 0 |

### Child Table Row Counts
| Table | Nashville Source | Migrated to North | Status |
|-------|----------------|-------------------|--------|
| tblStatusTran | 333,458 | 333,458 | Match |
| tblShipExecInvoiceChargeRepairs | 276,535 | 276,535 | Match |
| tblShippingChargeRepairs | 171,672 | 171,672 | Match |
| tblRepairItemTran | 155,678 | 155,551 | -127 (dupe exclusions) |
| tblRepairStatusLog | 85,094 | 85,080 | -14 (dupe exclusions) |
| tblPointsOps | 47,263 | 47,113 | -150 (dupe exclusions) |
| tblPointsTechs | 37,625 | 37,625 | Match |
| tblInvoice | 36,966 | 36,952 | -14 (dupe exclusions) |
| tblBlankInspectionSignOffLog | 30,942 | 30,942 | Match |
| tblRepairRevenueAndExpensesContract | 19,386 | 14,115 | Partial (dupe exclusions) |
| tblTrackingNumbersInAudit | 14,909 | 14,909 | Match |
| tblDashScopesInSave | 13,982 | 13,982 | Match |
| tblLoanerTran | 5,361 | 5,361 | Match |
| tblContractRepairsSaved | 3,258 | 3,258 | Match |
| tblRepairFailureCodes | 3,348 | 3,348 | Match |
| tblAmendRepairComments | 2,979 | 2,979 | Match |
| tblRepairUpdateSlips | 1,998 | 1,998 | Match |
| tblInvoiceVoid | 1,675 | 1,675 | Match |
| tblRepairInspection | 1,568 | 1,568 | Match |
| tblRepairInstrumentModels | 1,213 | 1,213 | Match |
| tblRepairRevenueAndExpenses | 853 | 853 | Match |
| tblRepairDefectTracking | 480 | 480 | Match |
| tblRepairDeleteAudit | 194 | 194 | Match |
| tblISOComplaint | 92 | 92 | Match |

### Trigger Test
- `trRepairUpd` fires successfully on South repair UPDATE — **PASS**
- `trInvoiceUpdateCustomerSince` — TSS linked server reference removed, queries local table
- `trPortalTrackingNumbersInsert` — same fix applied

### Stored Procedure Fixes
- 186 procedures updated: `TSS.WinScopeNetNashville.dbo.` → `dbo.`
- 14 dead migration helper procs dropped
- 1 remaining: `gpInvoiceExistsInGP` (references GP/Great Plains — separate system)

## Crosswalk Tables Created
| Table | Rows | Purpose |
|-------|------|---------|
| _xwalk_Department | 1,242 | South→North department mapping |
| _xwalk_Technician | 64 | South→North technician mapping |
| _xwalk_SalesRep | 53 | South→North sales rep mapping |
| _xwalk_Scope | 8,764 | South→North scope/instrument mapping |
| _xwalk_Repair | 27,065 | South→North repair key mapping |

## PK Offset Strategy
| Entity | Offset | Rationale |
|--------|--------|-----------|
| Repairs (lRepairKey) | +20,000,000 | Nashville max = 10M, North max = 577K |
| Departments | +10,000 | Only 32 imported |
| Technicians | +1,000 | Only 47 imported |
| Sales Reps | +1,000 | Only 16 imported |
| Scopes | +2,000,000 | Only 362 imported |
| Invoices (lInvoiceKey) | +400,000,000 | Both DBs had 1.6B range — needed large gap |
| Child table PKs | +20,000,000 | Standard offset matching repairs |
| RepairItemTran PK | +200,000,000 | Nashville max was 100M |
| InventorySizeBuild | +100,000 | Small tables |

## Scripts
| File | Purpose |
|------|---------|
| `nashville-repair-migrate.js` | Phase 1 (crosswalks) + Phase 2 (repair import) + Phase 5 (verify) |
| `nashville-merge-full.sql` | Phase 3 (child tables) + Steps 4-6 (recipes, triggers, procs) |
| `run-sql.js` | GO-aware SQL batch runner for Node.js |
| `generate-phase3-sql.js` | Generates Phase 3 SQL from live column metadata |
