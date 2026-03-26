# Technical Specification: Search & Filtering

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** All entity specs (search touches every data table)

---

## 1. Overview

Search and filtering follows a **consistent client-side pattern** across all pages. Data is loaded from the API, then filtered/sorted/searched entirely in JavaScript. There are no server-side search endpoints — all filtering happens in the browser. This spec documents the pattern so the developer can replicate it consistently.

---

## 2. Standard Filter Pattern

Every list page follows this architecture:

```javascript
// === STATE ===
var _allData = [];        // Full dataset from API
var _filtered = [];       // After filters applied
var _filterStatus = '';   // Active status filter
var _searchTerm = '';     // Active search text
var _sortCol = 'date';    // Current sort column
var _sortAsc = false;     // Sort direction

// === FLOW ===
// 1. Page load → fetch data → _allData = response
// 2. User changes filter/search → applyFilters()
// 3. applyFilters() → filter _allData → sort → _filtered
// 4. renderTable() → generate HTML rows from _filtered
// 5. updateKPIs() → recalculate counts from _filtered
```

### 2.1 Filter Application

```javascript
function applyFilters() {
  _filtered = _allData.filter(row => {
    // 1. Status filter (exact match)
    if (_filterStatus && row.status !== _filterStatus) return false;

    // 2. Search filter (contains, case-insensitive)
    if (_searchTerm) {
      var hay = [row.field1, row.field2, row.field3]
        .join(' ').toLowerCase();
      if (!hay.includes(_searchTerm.toLowerCase())) return false;
    }

    // 3. Additional filters (type, date range, etc.)
    // ...

    return true;
  });

  // Sort
  _filtered.sort((a, b) => {
    var va = a[_sortCol], vb = b[_sortCol];
    var cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb));
    return _sortAsc ? cmp : -cmp;
  });

  renderTable();
  updateKPIs();
  updateFooter();  // "X records shown"
}
```

### 2.2 Search Input

All pages use the same search input pattern:

```html
<input type="text" class="search-input" id="pageSearch"
       placeholder="Search..." oninput="applyFilters()">
```

- Real-time filtering (fires on every keystroke)
- Case-insensitive
- Searches across concatenated fields (not individual field matching)
- No debounce currently (may want to add for large datasets)

### 2.3 Sort Toggle

Column headers are clickable:

```javascript
thead.addEventListener('click', function(e) {
  var col = e.target.dataset.col;
  if (!col) return;
  if (_sortCol === col) {
    _sortAsc = !_sortAsc;  // Toggle direction
  } else {
    _sortCol = col;
    _sortAsc = true;       // New column, start ascending
  }
  applyFilters();
});
```

Sort indicators (▲/▼) shown on active column.

---

## 3. Searchable Fields by Page

| Page | Searchable Fields | Status Filters | Additional Filters |
|------|-------------------|----------------|-------------------|
| **Repairs (dashboard)** | WO#, client, dept, serial, status, notes | Received, Evaluation, In Repair, Complete, Shipped | Service location, Hot List |
| **Clients** | Client name, ID, contact, city, state | Active/Inactive | National account |
| **Departments** | Dept name, client name | Active/Inactive | Service location |
| **Contracts** | Contract name, client, type | Active/Expired/Pending | Contract type, expiry |
| **Tech Bench** | WO#, serial, client, model, dept, tech name | Received, Evaluation, In Repair, Complete | Technician |
| **Flags** | Flag text, type, location, instrument | All, Client, Scope Type, Scope, Repair | Flag type |
| **Emails** | From, to, subject, type | All, Pending, Sent, Ignored | Email type |
| **Invoices** | Invoice#, WO#, client, amount | Ready, Invoiced, All | Status |
| **Shipping** | WO#, serial, client, dept, model | Ready, Shipped Today, All | — |
| **Inventory** | Item name | Critical, Low, OK | Stock status |
| **Tasks** | Description, owner, type | — | — |
| **Analytics - Metrics** | Scope type name | — | Period (MTD/QTD/YTD) |
| **Analytics - TAT** | Scope type name | — | Source (All/In-House/Outsourced) |
| **Analytics - Profit** | WO#, scope type | — | Type (All/Standard/Contract) |
| **Analytics - Revenue** | State or rep name | — | View (By State/By Rep) |

---

## 4. Repairs Search (Main Dashboard)

The main repairs dashboard has the most complex filtering:

### 4.1 Status Segmented Buttons

```
[All] [Received] [Evaluation] [In Repair] [Complete] [Shipped]
```

Click toggles filter. "All" clears the filter.

### 4.2 Additional Filters

| Filter | Type | Effect |
|--------|------|--------|
| Service Location | Topbar dropdown | Sent to API as `plServiceLocationKey` |
| Hot List | Checkbox | `r.bHotList === true` |
| Search | Text input | Across WO#, client, dept, serial, status, notes |

### 4.3 Sort Defaults

- Default sort: `dtDateIn` descending (newest first)
- Sortable columns: WO#, Client, Dept, Serial, Status, Date In, Date Out, Days

---

## 5. Client/Department Search

### 5.1 Client Search

```
GET /Client/GetAllClientList?plServiceLocationKey={svcKey}
```

All clients loaded at once, filtered client-side.

**Searchable:** Client name, client ID, contact name, city, state
**Filters:** Active/Inactive, National Account flag

### 5.2 Department Search (within a client)

```
GET /Department/GetDepartmentsByClientKey?plClientKey={clientKey}
```

Departments loaded per-client, filtered client-side.

---

## 6. Repair Item Catalog Search

The repair items catalog (734 items) has server-side filtering:

```
GET /RepairItems/GetRepairItemsList?psSearchText={term}&plRepairLevelKey={level}&psRigidOrFlexible={type}
```

| Parameter | Purpose |
|-----------|---------|
| `psSearchText` | Search item description |
| `plRepairLevelKey` | Filter by repair level (1/2/3/4) |
| `psRigidOrFlexible` | Filter by scope type (F/R) |

This is one of the few **server-side** search implementations.

---

## 7. Service Location Global Filter

The service location dropdown in the topbar is a **global filter** that affects every page:

```javascript
// Stored in localStorage
localStorage.setItem('tsi_svcLocation', selectedKey);

// Read by every API call
var svcKey = localStorage.getItem('tsi_svcLocation') || '1';
API.getRepairList(svcKey, ...);
API.getDashboardRepairs(svcKey);
// etc.
```

**Persists across page navigations** (localStorage). Does NOT reset on filter changes within a page.

---

## 8. Filter State Persistence

| What Persists | Storage | Scope |
|--------------|---------|-------|
| Service Location | localStorage | Across sessions |
| Search text | Page variable | Current page only, lost on navigate |
| Status filter | Page variable | Current page only |
| Sort column/direction | Page variable | Current page only |
| Technician filter (bench) | Page variable | Current page only |

**No saved searches or view presets** currently exist.

---

## 9. Empty State Handling

When no results match the current filters:

```html
<tr>
  <td colspan="8" style="text-align:center; color:#999; padding:40px;">
    No results match the current filters
  </td>
</tr>
```

Footer shows: "0 records shown"

---

## 10. Performance Considerations

### 10.1 Current Approach

- All data loaded in one API call
- All filtering/sorting in client-side JavaScript
- No pagination (all rows rendered)
- No virtual scrolling

### 10.2 Scale Thresholds

| Data Size | Current Approach | Recommendation |
|-----------|-----------------|----------------|
| < 500 rows | Client-side OK | Current approach works |
| 500 – 2,000 rows | Client-side possible | Add debounce on search (300ms) |
| 2,000 – 10,000 rows | Performance degrades | Add server-side pagination |
| > 10,000 rows | Not feasible | Server-side search + pagination + virtual scroll |

TSI currently has ~11,590 repairs. For the main repairs list, **server-side pagination should be implemented** for production.

### 10.3 Recommended Pagination API

```
POST /Repair/Search
Body: {
  plServiceLocationKey: 1,
  psSearchText: "NR241",
  psStatus: "In Repair",
  psSortCol: "dtDateIn",
  psSortDir: "DESC",
  piPageSize: 50,
  piPageNumber: 1
}
Response: {
  data: [...],
  totalCount: 11590,
  pageCount: 232,
  currentPage: 1
}
```

---

## 11. Open Questions

1. **Server-side search:** Should the developer implement server-side search/pagination for repairs (11K+ records), or is client-side sufficient for the expected concurrent user count?
2. **Saved searches:** Should users be able to save filter presets? (e.g., "My North clients, Major repairs only")
3. **Search debounce:** Should a 200-300ms debounce be added to search inputs for large datasets?
4. **Advanced search:** Should there be an "Advanced Search" mode with field-specific operators (equals, contains, greater than, date range)?
5. **URL state:** Should filter state be encoded in the URL (query params) so users can bookmark/share filtered views?
6. **Global search:** Should there be a single search bar that searches across repairs, clients, departments, and scopes simultaneously?
