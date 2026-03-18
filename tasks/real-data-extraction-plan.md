# Real Data Extraction Plan
## Replace mock-db.js seed data with real WinScopeNet data (Feb 13 – Mar 13, 2026)

### Goal
Extract 30 days of real transactional data from the legacy WinScopeNet database and replace the hand-crafted mock seed data in `mock-db.js`. This validates field alignment, gives real KPI numbers, and makes demos authentic.

### Service Location Mapping
| Legacy Key | Legacy Name | Prefix | App Toggle | App Name |
|---|---|---|---|---|
| 1 | North | N | lServiceLocationKey=1 | Upper Chichester |
| 2 | South | S | lServiceLocationKey=2 | Nashville |

All departments carry `lServiceLocationKey` from the legacy DB. The site toggle filters on this.

---

### Phase 1: Extract Reference/Lookup Data (all active, not date-filtered)
These are small master tables loaded in full.

| # | Legacy Table | Mock Table | Est. Records | Notes |
|---|---|---|---|---|
| 1 | tblServiceLocations | serviceLocations | 2 | North + South only (skip Florida) |
| 2 | tblManufacturers | manufacturers | 482 | All — sManufacturer, sRigidOrFlexible |
| 3 | tblScopeCategories | scopeCategories | 386 | Full catalog |
| 4 | tblScopeTypeCategories | scopeTypeCategories | 72 | Category groupings |
| 5 | tblRepairStatus | repairStatuses | ~10 | Status lookup |
| 6 | tblRepairReason | repairReasons | ~10-20 | Reason codes |
| 7 | tblRepairLevel | repairLevels | ~4 | Level 1-4 |
| 8 | tblDeliveryMethod | deliveryMethods | ~4 | Ship methods |
| 9 | tblPaymentTerms | paymentTerms | ~4-6 | Net 30, etc. |
| 10 | tblSalesRep | salesReps | ~268 | Load active only |
| 11 | states | states | 50 | Keep existing — no legacy table needed |

### Phase 2: Extract Core Business Entities (filtered by 30-day repair window)
Only load entities that appear in repairs between 2/13 and 3/13.

| # | Legacy Table | Mock Table | Est. Records | Filter |
|---|---|---|---|---|
| 12 | tblScopeType | scopeTypes | ~174 | Only models referenced by repairs in window |
| 13 | tblClient | clients | ~215 | Only clients with repairs in window |
| 14 | tblDepartment | departments | ~232 | Only depts with repairs in window; carry lServiceLocationKey |
| 15 | tblContact | contacts | TBD | Contacts for the ~215 clients |
| 16 | tblScope | scopes | ~635 | Only scopes repaired in window |
| 17 | tblContract | contracts | ~87 | Active contracts (not date-filtered — needed for contract lookups) |

### Phase 3: Extract Transactional Data (date-filtered: 2/13 – 3/13)

| # | Legacy Table | Mock Table | Est. Records | Filter |
|---|---|---|---|---|
| 18 | tblRepair | repairs | 682 | dtDateIn in window; includes NR, SR, SK, NS |
| 19 | tblRepairItemTran | repairDetails | 5,424 | Joined to repairs in window |
| 20 | tblStatusTran | statusTrans | 7,841 | Joined to repairs in window |
| 21 | tblRepairInventory | repairInventory | ~1,900 | Joined to repairs in window |
| 22 | tblInvoice | invoices | 400 | Joined to repairs in window |
| 23 | tblInvoicePayments | invoicePayments | ~21 | Joined to invoices in window |
| 24 | tblProductSales | productSales | 33 | NI orders, dtOrderDate in window |
| 25 | tblProductSalesInventory | productSaleItems | 71 | Joined to product sales in window |
| 26 | tblSupplierPO | supplierPOs | 117 | dtDateOfPO in window |
| 27 | tblSupplierPOTran | supplierPOTrans | 302 | Joined to POs in window |
| 28 | tblInventoryTran | inventoryTrans | ~2,200 | dtTranDate in window |
| 29 | tblSupplier | suppliers | ~282 | Active suppliers (full, not date-filtered) |
| 30 | tblInventory | inventory | ~200-300 | Only items referenced by inventory trans in window |
| 31 | tblInventorySize | inventorySizes | ~500-1000 | Only sizes referenced by inventory trans in window |

### Phase 4: Extract from Nashville DB (same date window)
Nashville (WinScopeNetNashville) has separate data but same schema. Small volumes (9 repairs).
SR work orders are already in the main WinScopeNet tblRepair (259 SR repairs found), so Nashville DB may be redundant for repairs.

**Decision needed:** Are SR repairs stored in WinScopeNet or WinScopeNetNashville? If WinScopeNet has them all, we skip Nashville entirely for this extraction.

### Phase 5: Transform & Load into mock-db.js

**Strategy:**
1. Write a Node.js extraction script (`tasks/extract-real-data.js`) that:
   - Connects to localhost\SQLEXPRESS via `mssql` npm package
   - Runs all queries above
   - Maps legacy column names to mock-db field names
   - Outputs JSON seed arrays
2. Replace the Phase 1-5 seed blocks in mock-db.js with extracted data
3. Keep the MockDB infrastructure (CRUD ops, API layer, _keyFields, nextKey, etc.)
4. Keep the PRNG generators for tables we DON'T extract (dashboard queues, quality data, financial trending, etc.)
5. Remove generators for tables we DO extract (repairs, product sales)

**Field mapping notes:**
- Legacy uses plural table names (tblManufacturers), mock uses singular (manufacturers) — handled in extraction
- Legacy `sServiceLocation` = "North"/"South" → mock `sServiceLocationName` = "Upper Chichester"/"Nashville"
- Key fields (`lRepairKey`, `lClientKey`, etc.) keep their real legacy values
- Denormalized fields (`sClientName1`, `sDepartmentName`, etc.) extracted via JOINs

### Phase 6: Verify
- [ ] Every page loads without JS errors
- [ ] Site toggle correctly filters North vs South data
- [ ] Repair counts match query expectations
- [ ] KPI numbers are reasonable
- [ ] Scope Models tab shows 174 real models
- [ ] Product sales show NI orders
- [ ] Supplier POs show real PO numbers

---

### Volume Summary
| Category | Records |
|---|---|
| Reference/lookup | ~1,300 |
| Core entities | ~1,350 |
| Transactional | ~18,400 |
| **Total** | **~21,000** |

Browser-safe. Current mock-db handles ~1,770 records; 21K is 12x but still trivial for in-memory JS.

### Risks
1. **File size** — mock-db.js will grow from ~383KB to maybe 2-3MB. Still fine for dev.
2. **NULL handling** — real data has NULLs our mock never did. Need to handle gracefully in UI.
3. **Edge cases** — repairs with no invoice, scopes with no type, departments with no contact, etc.
4. **Sensitive data** — real client names, financials. Internal dev only — acceptable per user.
