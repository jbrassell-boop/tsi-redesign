# Inventory Merge Plan: Nashville → WinScopeNet

**Date:** 2026-03-18
**Status:** Analysis complete — awaiting Joseph/Steve review
**Quantity Strategy:** Option B confirmed — separate North/South region tracking
**Scope:** Merge all inventory-related tables from WinScopeNetNashville into WinScopeNet

---

## Executive Summary

Everything else between the two databases has been linked — inventory is the last piece. The good news: **a lot of the groundwork is already done.** The `aaaMappedSuppliers` table (201 rows) and `lSupplierKeyLink` on every supplier record already cross-reference North↔South suppliers. Supplier part numbers (`sSupplierPartNo`) give us an 8,929-record overlap to link inventory sizes.

The bad news: **all primary key ranges overlap completely**, so every South record needs re-keying before import. And there are ~2,900 description mismatches to reconcile where the same part number has different names in each DB.

### By the Numbers

| Metric | North (WinScopeNet) | South (Nashville) | Overlap | South-Only (to import) |
|--------|--------------------|--------------------|---------|----------------------|
| Suppliers | 396 | 299 | 246 | 54 |
| Inventory Categories | 393 | 221 | 171 | 48 |
| Inventory Sizes (parts) | 18,194 | 11,213 | ~8,929 (by part#) | ~2,913 |
| Supplier Part Catalog | 20,405 | 12,508 | 8,929 | 2,913 |
| Transactions | 696,880 | 280,188 | — | 280,188 (all) |
| Purchase Orders | 27,754 | 6,387 | — | 6,387 (all) |
| PO Line Items | 54,867 | 16,908 | — | 16,908 (all) |
| Lot Adjustments | 23,077 | 70,147 | — | 70,147 (all) |
| Repair Inventory Links | 255,512 | 236,921 | — | 236,921 (all) |

**Total South records to migrate: ~650,000+ across all tables**

---

## 1. What Already Exists (Migration Artifacts)

### aaaMappedSuppliers (201 rows in WinScopeNet)
Maps `lSupplierKey` (North) → `lSupplierKeySouth` (South). Examples:

| North Key | North Name | South Key | South Name |
|-----------|-----------|-----------|-----------|
| 2 | 1-800-ENDOSCOPE | 2 | 1-800-ENDOSCOPE |
| 3 | Acton Technologies | 1037 | Acton Technologies Inc |
| 4 | Advanced Power Group Corp. | 150 | Advance Power Group |
| 95 | Advanced Power Group Corp. | 4 | Advanced Power |
| 76 | Allied Wire & Cable | 76 | Allied Wire & Cable |

**Note:** Some keys match (2=2, 76=76), others diverge significantly (3→1037, 95→4).

### lSupplierKeyLink (on tblSupplier)
Every supplier in both databases already has a `lSupplierKeyLink` field pointing to its counterpart. This is the **production cross-reference** — the `aaaMappedSuppliers` table is the staging copy.

### What this means
Suppliers are already mapped. We don't need to figure out which North supplier = which South supplier. **That work is done.** The inventory merge builds on top of this.

---

## 2. The Linking Strategy

### Layer 1: Suppliers (already done)
`aaaMappedSuppliers` + `lSupplierKeyLink` → 201 pairs mapped.
54 South-only suppliers need new keys and import.

### Layer 2: Inventory Categories (tblInventory)
Match by `sItemDescription` (case-insensitive trim). 171 match, 48 South-only need import.

**Rule: North name wins.** Where descriptions match, use the North `lInventoryKey`. South categories that don't exist in North get new keys (offset from 10,000+).

### Layer 3: Inventory Sizes (tblInventorySize) — THE CORE CHALLENGE
This is where the real work is. **Linking via `sSupplierPartNo` in `tblSupplierSizes`:**

```
South tblSupplierSizes.sSupplierPartNo
  → match → North tblSupplierSizes.sSupplierPartNo
    → North tblInventorySize.lInventorySizeKey
```

**Three buckets:**

| Bucket | Count | Action |
|--------|-------|--------|
| **Matched** (same part# in both) | 8,929 | Map South size → North size key. Add South qty as separate location. |
| **South-Only** (part# only in South) | 2,913 | Import with new keys (offset 100,000+). |
| **North-Only** (part# only in North) | 7,435 | No action needed — already in target DB. |

### Layer 4: Transaction History
All 280K South transactions get new keys (offset 1,000,000+) with their `lInventorySizeKey` remapped to the merged key.

---

## 3. Sample: What the Merge Looks Like

### 3a. Matched Parts — Same Part Number, Both Databases

Here's what the merged view looks like for parts that exist in both:

| Part # | North Description (WINS) | North Qty | North Bin | South Qty | South Bin | Merged Total | Cost (North) |
|--------|-------------------------|-----------|-----------|-----------|-----------|-------------|-------------|
| 328070 | GIF Q160 | 3 | — | 0 | — | 3 | $522.50 |
| 328180 | PCF 160AL | 9 | — | 6 | — | 15 | $540.00 |
| 381298L | CF H180AL | 9 | — | 111 | RACK | 120 | $1,100.00 |
| 381307L | PCF H180AL | 3 | — | 72 | RACK | 75 | $1,100.00 |
| ACH278444 | 2.78 x 4.44 | 37 | — | 25 | — | 62 | $37.98 |
| ACH3400400 | 3.40 x 4.00 F=15.00 | 36 | — | 10 | — | 46 | $24.35 |

**Key decisions per matched part:**
- **Description**: North wins (per your instruction)
- **Quantity**: Track separately as North/South OR sum into one — see Section 5
- **Unit Cost**: North wins (South cost retained in audit trail)
- **Bin/Location**: Keep both — these are physical locations

### 3b. South-Only Parts — Need Import

These ~2,913 parts only exist in Nashville and need new keys:

| Part # | Supplier | Description | Category | Qty | New Size Key |
|--------|----------|-------------|----------|-----|-------------|
| ACH370400-IR | EDC Parts | 3.70 X 4.00 | Achromat | 9 | 100,001 |
| ACH495260-R | EDC Parts | 4.95 X 2.60 | Achromat | 40 | 100,002 |
| ACH6000400 | EDC Parts | 6.0 X 4.0 F=11.5 | Achromat | 15 | 100,003 |
| 80-0220-00 | Innovative Endoscopy | 2.70 X 3.53 mm Achromat | Achromat | 2 | 100,004 |

South-only parts keep their South descriptions (nothing in North to default to).

### 3c. Description Conflicts — Need Review

These are the tricky ones. Same part number, different names. **North wins by default**, but some need human review:

| Part # | North Description | South Description | Concern |
|--------|------------------|-------------------|---------|
| 004712 | IT BF P30 | IT BF P30/P10/20D | South is more specific |
| 056768 | Araldite 2011 50ml SxS | Araldite 2011 | North is more specific |
| 06180167 | DC GIF 2TH180 | GIF 2TH180 | North has prefix |
| 111107 | FC 3.7 (White Teflon) | FUSE 3.7mm BX Channel | **Completely different** — possible wrong mapping |
| 1/500 | Bridge lock - 500 | Optic lock | **Different part?** |

**Recommendation:** Export all ~2,900 mismatches to a spreadsheet for Steve/team to review. Flag the ones where descriptions are completely different (possible bad part# match) vs. minor formatting differences.

---

## 4. Primary Key Re-Keying Plan

All South PK ranges overlap with North. Here's the offset plan:

| Table | North Max Key | South Key Range | Offset Start | Formula |
|-------|-------------|-----------------|-------------|---------|
| tblInventory | 5,054 | 51–5,006 | **10,000** | SouthKey + 10,000 |
| tblInventorySize | 22,717 | 177–18,700 | **100,000** | SouthKey + 100,000 |
| tblSupplier | 1,240 | 1–1,142 | **10,000** | SouthKey + 10,000 |
| tblSupplierSizes | 22,787 | 39–18,787 | **100,000** | SouthKey + 100,000 |
| tblInventoryTran | 715,438 | 1–296,449 | **1,000,000** | SouthKey + 1,000,000 |
| tblSupplierPO | 28,296 | 1–? | **100,000** | SouthKey + 100,000 |
| tblSupplierPOTran | 58,366 | 1–? | **100,000** | SouthKey + 100,000 |
| tblLotNumberAdjustments | ? | 1–? | **100,000** | SouthKey + 100,000 |

**But wait — matched records DON'T get re-keyed.** They get mapped to the existing North key:
- Matched suppliers → use North `lSupplierKey` (from `aaaMappedSuppliers`)
- Matched inventory categories → use North `lInventoryKey` (by description match)
- Matched inventory sizes → use North `lInventorySizeKey` (by part# match)

**Only South-only records get the offset.**

---

## 5. The North/South Quantity Question

### Option A: Merge quantities into one number
- Simple. `nLevelCurrent = NorthQty + SouthQty`
- Loses visibility into which location has what
- Works if everything ships from one warehouse post-merge

### Option B: Add a location/region column ← RECOMMENDED
- Add `sRegion` (nvarchar 10) column to `tblInventorySize`: "North", "South", or "Both"
- Keep separate rows for North and South stock levels
- For matched parts: North row keeps its key, South row gets new key with `sRegion = 'South'`
- Dashboard can show: Total = 120, North = 9, South = 111

### Option C: Separate stock tracking table
- New table `tblInventorySizeStock` with `lInventorySizeKey`, `sLocation`, `nLevelCurrent`, `nLevelMin`, `nLevelMax`
- Most flexible but biggest schema change
- Best for future multi-location support

**My recommendation:** Option B for now. It's the smallest change that preserves North/South visibility. Option C is better long-term if you plan to add more locations.

---

## 6. FK Cascade — What Needs Remapping

When a South `lInventorySizeKey` gets mapped to a North key (matched) or offset (South-only), these tables all need updating:

| Table | FK Column | South Rows | Impact |
|-------|-----------|-----------|--------|
| tblInventoryTran | lInventorySizeKey | 280,188 | Every transaction |
| tblRepairInventory | (via tblScopeTypeRepairItemInventoryItems) | 236,921 | Every repair link |
| tblLotNumberAdjustments | lInventorySizeKey | 70,147 | Every lot adjustment |
| tblInventorySizeBuildItems | lInventorySizeKey | 31,346 | Every build component |
| tblScopeTypeRepairItemInventoryItems | lInventorySizeKey | 15,985 | Every scope-type BOM entry |
| tblSupplierSizes | lInventorySizeKey | 12,508 | Every supplier catalog entry |
| tblSupplierPOTran | lSupplierSizesKey | 16,908 | Every PO line item |
| tblInventoryUsage | lInventorySizeKey | 885 | Scope-type mappings |
| tblManualInventoryAudit | lInventorySizeKey | 2,576 | Audit entries |
| tblInventorySizeBuild | lInventorySizeKey | 2,825 | Build headers |
| tblInventoryAssembly | lInventorySizeKey_Parent | 294 | Assembly BOMs |
| tblLotNumberLock | lInventorySizeKey | 2,684 | Concurrency locks |

**Total: ~670,000+ rows need FK remapping across 12+ tables**

Similarly for `lSupplierKey`:

| Table | FK Column | South Rows |
|-------|-----------|-----------|
| tblSupplierSizes | lSupplierKey | 12,508 |
| tblSupplierPO | lSupplierKey | 6,387 |
| tblSupplierRoles | lSupplierKey | 352 |
| tblAcquisitionSupplierPO | lSupplierKey | 143 |
| tblInventoryNextSupplier | lSupplierKey | 2 |

---

## 7. Transaction History Context

| Year | North Transactions | South Transactions | Combined |
|------|-------------------|-------------------|----------|
| 2026 (YTD) | 5,703 | 1,294 | 6,997 |
| 2025 | 31,400 | 6,682 | 38,082 |
| 2024 | 38,367 | 22,922 | 61,289 |
| 2023 | 37,387 | 45,779 | 83,166 |
| 2022 | 33,886 | 57,175 | 91,061 |
| 2021 | 34,796 | 55,058 | 89,854 |
| 2020 | 36,995 | 50,610 | 87,605 |
| 2019 | 34,687 | 35,209 | 69,896 |
| 2018 | 34,232 | 5,006 | 39,238 |

South activity drops sharply in 2025–2026 — consistent with the migration winding down. North goes back to 2001. South starts in 2017.

---

## 8. Merge Execution Order

If/when you're ready to execute, this is the sequence:

### Phase 1: Build the Crosswalk Tables
1. **Supplier crosswalk** — already exists (`aaaMappedSuppliers`). Verify it's complete (201 of 246 overlapping = ~45 gaps to fill).
2. **Inventory category crosswalk** — build from description match. 171 matches → map South key to North key. 48 South-only → assign offset keys.
3. **Inventory size crosswalk** — build from supplier part# match. 8,929 matches → map South key to North key. 2,913 South-only → assign offset keys.
4. **Export description conflicts** — ~2,900 rows to spreadsheet for human review.

### Phase 2: Import South-Only Master Records
5. Import 54 South-only suppliers (offset keys)
6. Import 48 South-only inventory categories (offset keys)
7. Import ~2,913 South-only inventory sizes (offset keys)
8. Import South-only supplier-size catalog entries (offset keys)

### Phase 3: Import Transaction History
9. Import South inventory transactions (280K rows, remapped keys)
10. Import South POs and PO line items (23K rows, remapped keys)
11. Import South lot adjustments (70K rows, remapped keys)
12. Import South repair-inventory links (237K rows, remapped keys)
13. Import South build records (34K rows, remapped keys)

### Phase 4: Add Region Tracking
14. Add `sRegion` column to `tblInventorySize` (default 'North' for existing)
15. Mark imported South sizes as 'South'
16. For matched parts — update stock levels or create South location rows

### Phase 5: Verify & Clean Up
17. Verify FK integrity — every remapped key resolves
18. Run inventory balance reconciliation — spot-check 50 matched parts
19. Archive `aaaMappedSuppliers` and South-reference tables
20. Update application code for region-aware queries

---

## 9. Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|-----------|
| Wrong part# match (same # = different part) | HIGH | Export conflicts for human review before merge |
| Broken FK after re-key | HIGH | Build crosswalk first, validate in staging |
| Duplicate suppliers post-merge | MEDIUM | De-dup pass using name similarity + mapping table |
| Quantity double-counting | MEDIUM | Option B (region column) prevents this |
| Lost transaction history | LOW | All transactions imported with new keys, audit trail preserved |
| Application code breaks | MEDIUM | Search for hardcoded key values in VB.NET code |

---

## 10. Immediate Next Steps

1. **Review this plan** — especially the quantity tracking decision (Option A/B/C)
2. **Review description conflicts** — I can export the ~2,900 mismatches to Excel for Steve
3. **Verify supplier mapping completeness** — 201 mapped but 246 overlap; ~45 may be unmapped
4. **Decide on region tracking** — do you want North/South visibility post-merge?
5. **Pick a staging environment** — run the merge on a copy first, never on production

---

## Appendix: South-Only Inventory Categories (all 48)

These are the categories that exist in Nashville but NOT in WinScopeNet. They need to be imported:

| Key | Description | Active | Type |
|-----|------------|--------|------|
| 511 | Adhesives | Yes | F |
| 514 | ANGULATION COIL PIPE FITTINGS | Yes | F |
| 230 | ANGULATION COLLAR | No | F |
| 480 | AUX WATER CHANNEL | Yes | F |
| 531 | BENDING SECTION KITS | Yes | F |
| 542 | Bending Section Sub Assembly | Yes | F |
| 551 | Body Insert | Yes | R |
| 498 | Control Wire | Yes | F |
| 5002 | Endocart Monitor Parts | Yes | A |
| 497 | EndoCart Parts | Yes | A |
| 574 | Endocart Tools | Yes | A |
| 567 | Endocart Wheels | Yes | A |
| 391 | Flex Scope Assemblies | Yes | F |
| 491 | Fuse Panel Repair | Yes | U |
| 527 | FUSE PARTS | Yes | U |
| 570 | Insertion Tube Sub-Assembly | Yes | F |
| 563 | Instrument Handles | Yes | F |
| 564 | Instrument Misc | Yes | I |
| 528 | Instrument Repair | Yes | I |
| 515 | Lab Supplies | Yes | L |

(Remaining 28 not shown — full list available on request)

---

## 11. Supplier Mapping — Deep Dive (Updated 2026-03-18)

### Mapping Status Summary

| Category | Count | Status |
|----------|-------|--------|
| In `aaaMappedSuppliers` (explicit mapping) | 201 | Done |
| ...names match | 161 | Clean |
| ...names differ (abbreviations, typos) | 40 | Done — intentional variants |
| Name-matched but NOT in mapping table | ~80 distinct | Most have `lSupplierKeyLink` — just missing from staging table |
| Truly unlinked (no link, no mapping) | ~11 | Need manual mapping |
| South-only (no match at all) | 21 | Need import |
| ...of those, active | 2 | MTM Medical LLC, Randolph & Parks |
| ...of those, inactive | 19 | Low priority |

### The 40 Name Variants in aaaMappedSuppliers
These are correctly mapped — just different naming between offices:

| North Name | South Name |
|-----------|-----------|
| Acton Technologies | Acton Technologies Inc |
| Advanced Power Group Corp. | Advance Power Group |
| Amazon | Amazon Business |
| Arizona Sealing Devices | Arizona Sealing |
| Boston Scientific | BSCI |
| Digi-Key | Digi-Key Electronics |
| German Quality Instruments | GQI Inc. |
| Gulf Medical Fiberoptics | Gulf Fiberoptics |
| Olympus America | Olympus America Inc |
| Schott | Schott North America |
| Total Scope Inc. | Total Scope - North |
| Total Scope South | Total Scope - South |
| (+ 28 more) | |

### The ~11 Truly Unlinked Suppliers
These have name matches across databases but NO cross-reference in either `aaaMappedSuppliers` or `lSupplierKeyLink`:

| North Key | North Name | South Key | Action Needed |
|-----------|-----------|-----------|--------------|
| 114 | Advanced Endoscopy Inc. | 114 | Add to mapping (same key) |
| 1048 | Ebay | 161 | Add to mapping |
| 179 | International Medical Equipment | 163 | Add to mapping |
| 1002 | Light Source & Video Repair | 110 | Add to mapping |
| 140 | Llojenn Inc. | 125 | Add to mapping |
| 1041 | MDI Repairs | 130 | Add to mapping |
| 102 | Medifix Inc. | 102 | Add to mapping (same key) |
| 1089 | Perigee Direct | 1131 | Add to mapping |
| 44 | Towne Technologies | 44 | Add to mapping (same key) |
| 1049/156 | Townsend Surgical | 134 | Two North keys — pick active one (156) |
| 1016 | TSI | 51 | Add to mapping |

### The 21 South-Only Suppliers (no match anywhere)

| South Key | Name | Active | Parts | POs | Priority |
|-----------|------|--------|-------|-----|----------|
| 1126 | MTM Medical, LLC | **Yes** | 0 | 0 | **Review** — active but empty |
| 1115 | Randolph & Parks | **Yes** | 1 | 5 | **Review** — active with POs |
| 158 | BSCI | No | 877 | 201 | **Already mapped** as Boston Scientific→BSCI |
| 154 | Cybernet Manufacturing, Inc. | No | 7 | 2 | Typo variant of key 151 |
| 151 | Cybernet Manufactureing, Inc. | No | 3 | 2 | Typo variant of key 154 |
| 1033 | Endo Imaging Solutions, LLC | No | 3 | 4 | Import if needed |
| 149 | Endo-Log Inc. | No | 5 | 5 | Import if needed |
| 1030 | Machining Services, Inc. | No | 10 | 6 | Import if needed |
| 1040 | SkyGeek.com | No | 4 | 11 | Import if needed |
| 1038 | Academy Sports | No | 3 | 4 | Low priority |
| 3 | Acton | No | 1 | 0 | Likely old version of Acton Technologies |
| (+ 10 more inactive with ≤3 parts each) | | | | | |

---

## 12. Description Conflicts — Full Export (Updated 2026-03-18)

**Exported to: `C:\tmp\description-conflicts.csv`**

| Metric | Count |
|--------|-------|
| Total description mismatches | **5,432** |
| ...with category ALSO different | **4,397 (81%)** |
| ...description-only mismatch | 1,035 (19%) |

**Higher than initial estimate** because generic part numbers like "NA" create many-to-many cross-matches. Steve should:
1. Filter out rows where Part Number = "NA" first (these need manual matching by description, not part#)
2. Focus on the 4,397 category mismatches — highest risk of wrong mapping
3. Use the "Steve Decision" column to mark: **North** (keep North name), **South** (use South name), or **New** (write new name)

### Conflict Severity Tiers

| Tier | Description | Example | Action |
|------|------------|---------|--------|
| **Minor** | Same part, formatting difference | "GIF Q160" vs "GIF-Q160" | Auto-resolve → North wins |
| **Medium** | Same part, abbreviation difference | "DC GIF 2TH180" vs "GIF 2TH180" | North wins, verify |
| **Critical** | Possibly different parts | "FC 3.7 (White Teflon)" vs "FUSE 3.7mm BX Channel" | **Steve must review** |

---

## 13. Confirmed Strategy: Region-Based Quantity Tracking

Joseph confirmed **Option B** — separate North/South visibility.

### Schema Change
```sql
ALTER TABLE tblInventorySize ADD sRegion NVARCHAR(10) DEFAULT 'North';
```

### How It Works

**For matched parts (8,929):**
- North row stays as-is with `sRegion = 'North'`
- South row imported with new key, `sRegion = 'South'`, same `lInventoryKey` category
- Both rows share the same supplier part number linkage

**For South-only parts (2,913):**
- Imported with new offset key, `sRegion = 'South'`

**For North-only parts (7,435):**
- No change, `sRegion = 'North'` (default)

### Dashboard View Example

| Part # | Description | North Qty | South Qty | Total | North Bin | South Bin |
|--------|-----------|-----------|-----------|-------|-----------|-----------|
| 381298L | CF H180AL | 9 | 111 | 120 | — | RACK |
| 381307L | PCF H180AL | 3 | 72 | 75 | — | RACK |
| ACH278444 | 2.78 x 4.44 | 37 | 25 | 62 | — | — |

Query pattern:
```sql
SELECT
    sSupplierPartNo,
    sSizeDescription,
    SUM(CASE WHEN sRegion = 'North' THEN nLevelCurrent ELSE 0 END) AS NorthQty,
    SUM(CASE WHEN sRegion = 'South' THEN nLevelCurrent ELSE 0 END) AS SouthQty,
    SUM(nLevelCurrent) AS TotalQty
FROM tblInventorySize sz
JOIN tblSupplierSizes ss ON sz.lInventorySizeKey = ss.lInventorySizeKey
GROUP BY sSupplierPartNo, sSizeDescription
```
