# Inventory Data Validation — Developer Reference

**From:** Joe Brassell, Total Scope Inc.
**To:** MOL-Tech / BrightLogix Development
**Date:** March 9, 2026
**Re:** Inventory data pulled from both service locations — please validate against live API

---

## Overview

We pulled the full inventory dataset from both service locations (Upper Chichester + Nashville) via the API and combined them into flat files for validation. These files contain **every inventory item and every size record** as of the pull date.

**Goal:** Confirm the live API returns matching data. If counts or field values differ, let us know what changed.

---

## Data Files (attached)

| File | Records | Description |
|------|---------|-------------|
| `inventory_items.csv` | 614 items | Parent inventory items (both locations) |
| `inventory_sizes.csv` | 28,996 sizes | All size/variant records linked to items |

### Breakdown by Location

| Location | Items | Description |
|----------|-------|-------------|
| North (Upper Chichester, key=1) | 386 | Primary facility |
| South (Nashville, key=2) | 228 | Secondary facility |

---

## Items File: `inventory_items.csv`

### Columns
| Column | API Field | Type | Description |
|--------|-----------|------|-------------|
| `id` | (sequential) | int | Row number |
| `legacy_key` | `lInventoryKey` | int | Primary key in database |
| `location` | `plServiceLocationKey` | string | "North" (key=1) or "South" (key=2) |
| `item_description` | `sItemDescription` | string | Inventory item name |
| `count_adjustment` | `bCountAdjustment` | bool | Count adjustment enabled |
| `used_by_repair` | `bUsedByRepair` | bool | Used in repair process |
| `active` | `bActive` | bool | Active/Inactive status |

### API Endpoint Used
```
POST /api/Inventory/GetAllInventoryList
{
  "plInventoryKey": 0,
  "pbIncludeInactive": true,
  "Pagination": { "PageNumber": 1, "PageSize": 1000 },
  "Filters": {}
}
```
Called twice — once with `plServiceLocationKey: 1` (North), once with `plServiceLocationKey: 2` (South).

### Sample Data
```
legacy_key  location  item_description              active
578         North     !! IT ASSEMBLY (LD)           True
391         North     !! IT ASSEMBLY (SD)           True
239         North     ACHROMAT                      True
293         North     ADAPTER                       True
78          North     AIR WATER NOZZLES             True
...
25          South     AIR WATER NOZZLES             True
59          South     ANGULATION CABLES             True
```

---

## Sizes File: `inventory_sizes.csv`

### Columns
| Column | API Field | Type | Description |
|--------|-----------|------|-------------|
| `id` | (sequential) | int | Row number |
| `parent_id` | (FK to items) | int | Links to parent item row |
| `legacy_size_key` | `lInventorySizeKey` | int | Primary key |
| `location` | — | string | "North" or "South" |
| `item_description` | `sItemDescription` | string | Parent item name |
| `instrument_type` | `sInstrumentType` | string | Category (Flexible, Rigid, etc.) |
| `diameter` | `sDiameter` | string | Size diameter |
| `size_description` | `sSizeDescription` | string | Primary size description |
| `size_description_2` | `sSizeDescription2` | string | Secondary description |
| `size_description_3` | `sSizeDescription3` | string | Tertiary description |
| `bin_number` | `sBinNumber` | string | Warehouse bin location |
| `minimum_level` | `nLevelMinimum` | int | Min stock level |
| `reorder_level` | `nLevelReorder` | int | Reorder trigger level |
| `current_level` | `nLevelCurrent` | int | Current on-hand quantity |
| `unit_cost` | `dblUnitCost` | decimal | Cost per unit |
| `status` | `sStatus` | string | Active/Inactive |
| `scan_required` | `bScanRequired` | bool | Barcode scan required |
| `always_reorder` | `bAlwaysReorder` | bool | Auto-reorder flag |
| `part_value` | `dblPartValue` | decimal | Total value (qty × cost) |
| `ranking` | `sRanking` | string | Usage ranking |
| `supplier_common` | `sSupplierCommon` | string | Most common supplier |
| `part_number_common` | `sPartNumberCommon` | string | Common supplier part # |
| `supplier_recent` | `sSupplierRecent` | string | Most recent supplier |
| `part_number_recent` | `sPartNumberRecent` | string | Recent supplier part # |
| `last_date_received` | `dtLastDateReceived` | date | Last receipt date |

### API Endpoint Used
```
POST /api/Inventory/GetAllInventorySizesList
{
  "plInventoryKey": <item_key>,
  "Pagination": { "PageNumber": 1, "PageSize": 1000 },
  "Filters": {}
}
```
Called per-item to get all sizes for each inventory item.

### Sample Data
```
legacy_size_key  item_description  size_description                          bin_number      current_level  unit_cost
6303             BORESCOPE         1.6MM Repair/Exchange                                     1              1990.00
3590             BOXES             Camera box w/ foam insert                 SHIPPING AREA   6394           10.50
5567             BOXES             Case - Total Scope                        Shipping Area   4404           9.95
948              BOXES             Large diameter - foam insert needed       SHIPPING AREA   3110           9.00
```

---

## Validation Checklist

Please confirm the following against the live database:

- [ ] **Item count**: 386 items for North (ServiceLocationKey=1), 228 for South (ServiceLocationKey=2)
- [ ] **Size count**: ~28,996 total size records across both locations
- [ ] **Field mapping**: Column names above match what the API returns (Hungarian notation field names)
- [ ] **Pagination**: Does `GetAllInventoryList` support `PageSize: 1000` or is there a max?
- [ ] **Location filtering**: Is `plServiceLocationKey` a parameter on the inventory endpoints, or is location determined by the user's session?
- [ ] **Inactive items**: When `pbIncludeInactive: true`, do we get all items regardless of `bActive` status?
- [ ] **Cross-location query**: Is there an API call to get inventory across BOTH locations in one request, or must we call per-location?

---

## Answers from TSI (Joe Brassell)

1. **`lInventoryKey` is NOT unique across locations.** North's database has a 20-year head start. When South (Nashville) was created, keys started at 1 again. The same key value can exist in both databases pointing to completely different items. **Service location context is always required when querying inventory.**

2. **Sizes are separate per location.** Each location maintains its own size records, bin numbers, and stock levels. This is necessary for inventory audits — South can't reconcile its physical counts if North's products are mixed in. Same item name may appear in both locations, but each has independent size records.

3. **Stock levels (`nLevelCurrent`) are real-time** but need to be audited. The values reflect actual on-hand quantities as tracked by the system, but physical audits are needed to verify accuracy.

4. **Part value is always `qty × cost`** — `dblPartValue = nLevelCurrent × dblUnitCost`. No exceptions.

### Key Implication for Development

**Every inventory API call must include `plServiceLocationKey`.** Without it, you cannot determine which location's data you're working with. The frontend uses a service location dropdown (Upper Chichester = 1, Nashville = 2) and must pass this value on every inventory request.

---

*Prepared by Total Scope Inc. — Data Validation Review*
