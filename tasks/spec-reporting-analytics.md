# Technical Specification: Reporting & Analytics

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** All other specs (reporting aggregates data from every subsystem)

---

## 1. Overview

The analytics system spans **11 dashboard pages** and **4 analytics panels**. All dashboards share a common pattern: KPI stat strip at top, filterable/sortable data table in the body, and CSV/print export. The morning briefing aggregates operational alerts. The analytics hub provides TAT matrices, profitability breakdowns, and revenue analysis.

---

## 2. Dashboard Inventory

| # | Dashboard | File | Primary Purpose |
|---|-----------|------|----------------|
| 1 | Morning Briefing | `dashboard_briefing.html` | Operational overview + needs attention |
| 2 | Main Repairs | `dashboard.html` | Repair list with status filtering |
| 3 | Analytics Hub | `dashboard_analytics.html` | 4-panel metrics, TAT, profitability, revenue |
| 4 | Tasks | `dashboard_tasks.html` | Task queue management |
| 5 | Emails | `dashboard_emails.html` | Email queue management |
| 6 | Shipping | `dashboard_shipping.html` | Ready-to-ship + shipped today |
| 7 | Invoices | `dashboard_invoices.html` | Invoice generation + tracking |
| 8 | Purchase Orders | `dashboard_purchaseorders.html` | PO management |
| 9 | Inventory | `dashboard_inventory.html` | Low-stock alerts |
| 10 | Flags | `dashboard_flags.html` | Flag tracking by type |
| 11 | Tech Bench | `dashboard_techbench.html` | Technician repair queue |

---

## 3. Morning Briefing KPIs

| KPI | Calculation | Period |
|-----|-------------|--------|
| **Throughput** | COUNT repairs WHERE dtDateOut IS NOT NULL AND dtDateOut >= first of month | MTD |
| **In-House** | COUNT repairs WHERE dtDateIn IS NOT NULL AND dtDateOut IS NULL | Current |
| **On-Time %** | (COUNT WHERE bizDays(dtDateIn, dtDateOut) <= 10) / (COUNT shipped) × 100 | MTD |
| **Avg TAT** | AVG(dtDateOut - dtDateIn) in calendar days for shipped repairs | MTD |

**Business Days Calculation:** Excludes Saturday and Sunday. Does not account for holidays.

---

## 4. Analytics Hub — Panel 1: Metrics

### 4.1 Period Selector

Three views: **MTD** (Month-to-Date) | **QTD** (Quarter-to-Date) | **YTD** (Year-to-Date)

Switching periods reloads the data set.

### 4.2 Top KPIs

Same as briefing: In-House, Avg TAT, On-Time %, Throughput — scoped to selected period.

### 4.3 Top Scope Types by Volume

| Column | Description |
|--------|-------------|
| Rank | Position by repair count |
| Scope Type | Model name (e.g., "Olympus GIF-H190") |
| Repair Count | Number of repairs for this model |
| Avg TAT | Average turnaround days for this model |
| In Progress | Currently in-house count |
| Completed | Shipped count in period |

Searchable by scope type name.

---

## 5. Analytics Hub — Panel 2: Turn Around Times (TAT)

### 5.1 TAT by Repair Level Matrix

| Repair Level | Current Month | Last 30 Days | Last 3 Months | Last 6 Months |
|-------------|---------------|--------------|---------------|---------------|
| Minor | X.X days | X.X days | X.X days | X.X days |
| Mid-Level | X.X days | X.X days | X.X days | X.X days |
| Major | X.X days | X.X days | X.X days | X.X days |
| VSI | X.X days | X.X days | X.X days | X.X days |

### 5.2 TAT by Scope Type (Top 15)

| Scope Type | Overall Avg | Current Month | Last 30d | Last 3m | Last 6m | Total Count |
|-----------|-------------|---------------|----------|---------|---------|-------------|
| GIF-H180 | X.X | X.X | X.X | X.X | X.X | NNN |

### 5.3 Color Coding

| Class | Color | Meaning |
|-------|-------|---------|
| `.tat-green` | Green | Under SLA target |
| `.tat-amber` | Amber | Warning — approaching SLA |
| `.tat-red` | Red | Over SLA target |
| `.tat-na` | Gray | Insufficient data |

### 5.4 Source Filter

All | In-House | Outsourced — filters by whether repair was outsourced (status ID:4).

---

## 6. Analytics Hub — Panel 3: Profitability

### 6.1 Top KPIs

| KPI | Calculation |
|-----|-------------|
| Total Revenue | SUM of all invoice amounts |
| Total Expenses | SUM of outsource + shipping + labor + GPO + commission costs |
| Net Profit | Revenue - Expenses |
| Avg Margin % | (Net Profit / Revenue) × 100 |

### 6.2 Per-Repair Profitability Table

| Column | Source |
|--------|--------|
| WO# | `sWorkOrderNumber` |
| Scope Type | `sScopeTypeDesc` |
| Revenue | Invoice amount (`dblAmtRepair`) |
| Outsource Cost | Cost if outsourced |
| Shipping Cost | `dblAmtShipping` |
| Labor Cost | Tech hours × rate (if tracked) |
| GPO Cost | Group purchasing fee |
| Commission | Sales rep commission |
| Profit | Revenue - all costs |
| Margin % | (Profit / Revenue) × 100 |

### 6.3 Margin Color Coding

| Class | Range | Color |
|-------|-------|-------|
| `.margin-green` | > 15% | Green |
| `.margin-amber` | 5% – 15% | Amber |
| `.margin-red` | < 5% | Red |

### 6.4 Type Filter

All | Standard (FFS) | Contract (CAP/CPO/Shared Risk)

---

## 7. Analytics Hub — Panel 4: Revenue & Expense

### 7.1 View Toggle

**By State** | **By Sales Rep** — switches grouping dimension.

### 7.2 Table

| Column | Description |
|--------|-------------|
| State / Rep Name | Grouping dimension |
| Revenue | Total invoiced amount |
| Expenses | Total costs |
| Profit | Revenue - Expenses |
| Margin % | (Profit / Revenue) × 100 |
| Repair Count | Number of repairs |

Default sort: Revenue descending.

---

## 8. Contract Health Metrics

Displayed on the Contracts page (not a standalone dashboard):

### 8.1 Four Health Factors

| Factor | Calculation | Range | Good Direction |
|--------|-------------|-------|---------------|
| **Expense Multiplier** | Repair cost / baseline cost | 1.0x – 3.0x | Lower is better |
| **Avoidable Damage %** | Preventable repairs / total repairs | 0% – 100% | Lower is better |
| **Utilization** | Active devices / total contract devices | 0% – 100% | Higher is better |
| **Days to Expiry** | Contract end date - today | 0 – 1460+ days | Higher is better |

### 8.2 Overall Health Grade

Letter grade (A/B/C/D/F) based on composite score (0–100). CSS classes: `.health-grade-a` through `.health-grade-f`.

---

## 9. Dashboard-Specific KPIs

### Flags Dashboard

| KPI | Description |
|-----|-------------|
| Total Flags | All flags count |
| Client Flags | Count WHERE lFlagTypeKey = 1 |
| Scope Type Flags | Count WHERE lFlagTypeKey = 2 |
| Scope Flags | Count WHERE lFlagTypeKey = 3 |
| Repair Flags | Count WHERE lFlagTypeKey = 4 |

### Invoices Dashboard

| KPI | Description |
|-----|-------------|
| Ready to Invoice | Repairs not yet invoiced |
| Invoiced (Month) | Invoiced this month |
| Total Amount | Sum of invoice amounts |
| Avg Invoice | Total / count |

### Inventory Dashboard

| KPI | Description |
|-----|-------------|
| Total Items | All inventory items |
| Critical | Count WHERE level < minimum |
| Low | Count WHERE level < reorder point |
| OK | Count WHERE level >= reorder point |

---

## 10. Global Filters

| Filter | Scope | Persistence |
|--------|-------|-------------|
| **Service Location** | All dashboards | localStorage (session-persistent) |
| **Date Period** (MTD/QTD/YTD) | Analytics hub | Page session only |
| **Status Filter** | Per-dashboard | Page session only |
| **Search Text** | Per-dashboard | Page session only |
| **Sort Column/Direction** | Per-dashboard | Page session only |

**Note:** No saved searches or view presets exist. Filter state resets on page reload (except service location).

---

## 11. Export Capabilities

### 11.1 CSV Export

**Utility:** `js/export-utils.js` → `exportTableCSV(tableId, filename)`

- Reads table DOM rows
- Escapes commas (replaced with semicolons) and quotes
- Downloads as `{filename}-{date}.csv`
- Available on: Tasks, Repairs, Flags, and other list views

### 11.2 Print/PDF

- Browser native `window.print()` with print stylesheet
- Optimized for: Invoices, packing slips, repair lists
- Print media queries hide navigation, format tables

### 11.3 No Chart Library

Current implementation uses tables, KPI cards, stat strips, and CSS-based health bars. No Chart.js, D3, or other visualization library.

**Recommendation for developer:** Add Chart.js for trend lines (TAT over time, revenue by month) if visual charts are desired.

---

## 12. Search & Filtering Pattern

### 12.1 Standard Pattern (All Dashboards)

```javascript
// 1. Filter state variables
var _filterStatus = '';
var _searchTerm = '';
var _sortCol = 'date';
var _sortAsc = false;

// 2. Apply filters
function applyFilters() {
  _filtered = _allData.filter(row => {
    // Status filter
    if (_filterStatus && row.status !== _filterStatus) return false;
    // Search filter
    if (_searchTerm) {
      var hay = [row.field1, row.field2, ...].join(' ').toLowerCase();
      if (!hay.includes(_searchTerm.toLowerCase())) return false;
    }
    return true;
  });
  // Sort
  _filtered.sort((a, b) => { /* by _sortCol, _sortAsc */ });
  // Render
  renderTable();
  updateKPIs();
}
```

### 12.2 Searchable Fields by Page

| Page | Searchable Fields |
|------|-------------------|
| Repairs | WO#, client, dept, serial, status, notes |
| Clients | Client name, ID, contact, city, state |
| Flags | Flag text, type, location, instrument |
| Tasks | Description, owner, type |
| Emails | From, to, subject, type |
| Analytics - Metrics | Scope type name |
| Analytics - TAT | Scope type name |
| Analytics - Profit | WO#, scope type |
| Analytics - Revenue | State name or rep name |
| Tech Bench | WO#, serial, client, model, dept, tech name |

---

## 13. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/Dashboard/GetDashboardScopeDataList` | Main repair dashboard data |
| `GET` | `/Dashboard/GetRepairMetrics?period=` | Metrics panel data |
| `GET` | `/Dashboard/GetTATMetrics?period=` | TAT panel data |
| `GET` | `/Dashboard/GetProfitabilityMetrics?period=` | Profitability panel data |
| `GET` | `/Dashboard/GetRevenueMetrics?view=` | Revenue panel (by state or rep) |
| `GET` | `/Dashboard/GetNeedsAttention` | Briefing alerts |
| `GET` | `/Dashboard/GetEmailQueue` | Email queue |
| `GET` | `/Flag/GetAllFlags` | All flags |
| `POST` | `/DashBoardTask/GetAllTaskList` | All tasks |

---

## 14. Open Questions

1. **Scheduled reports:** Should any reports be auto-generated and emailed on a schedule (daily/weekly/monthly)?
2. **Data export format:** Is CSV sufficient, or do users need Excel (.xlsx) export with formatting?
3. **Chart visualizations:** Should trend charts be added (TAT over time, revenue by month, repair volume trend)?
4. **Custom date ranges:** Should analytics support arbitrary date range selection beyond MTD/QTD/YTD?
5. **Saved views/filters:** Should users be able to save filter presets (e.g., "My clients only", "Major repairs, North")?
6. **Business days vs calendar days:** TAT displayed as calendar days. Should business days be the standard? (Currently briefing uses business days for on-time %, but TAT average uses calendar days)
