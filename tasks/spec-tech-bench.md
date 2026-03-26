# Technical Specification: Tech Bench Dashboard

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Status Workflow, User & Security Management

---

## 1. Overview

The Tech Bench is a **technician-facing scanning interface** for managing active repairs. It displays a simplified 5-status workflow (vs the full 20 granular statuses) and provides two quick actions: advance status and flag for revised quote. It is NOT a full editing interface — technicians click through to the repair detail page for deep work.

---

## 2. Layout

```
┌──────────────────────────────────────────────────┐
│  Stat Strip: [Assigned] [In Repair] [On Hold] [Completed Today] │
├──────────────────────────────────────────────────┤
│  Toolbar: [All|Received|Evaluation|In Repair|Complete]  │
│           [Tech Dropdown ▼]  [Search: ___________]       │
├──────────────────────────────────────────────────┤
│  Table:                                                    │
│  ● WO#     Serial#   Model   Customer/Tech  Days Status  Actions │
│  ● NR241.. T054      GIF180  Melbourne/Rob  12   In Rep  [Complete→] [⚠] │
│  ● NR241.. K092      CF190   Duke/Denis     5    Eval    [In Repair→] [⚠] │
├──────────────────────────────────────────────────┤
│  Footer: X repairs shown                                   │
└──────────────────────────────────────────────────┘
```

---

## 3. Simplified 5-Status Model

The tech bench collapses 20 granular statuses into 5 using regex pattern matching:

| Simplified | Regex Pattern | Matches These Granular Statuses |
|-----------|---------------|--------------------------------|
| **Received** | `/received\|waiting/i` | Waiting on Inspection (ID:1) |
| **Evaluation** | `/evaluation\|inspection\|approved/i` | Additional Evaluation (ID:5), Waiting for Approved (ID:6), More Info Needed (ID:19) |
| **In Repair** | `/in repair\|drying\|steriliz/i` | Minor/Mid/Major (ID:8,11,9), Drying Room (ID:3), Semi Rigid (ID:14), Special Rigid (ID:15), Cart statuses (ID:16,17,20,22), Parts Hold (ID:18), Outsourced (ID:4) |
| **Complete** | `/complete\|ready/i` | QC - Waiting Approval (ID:21), Scheduled to Ship (ID:10,12,13) |
| **Shipped** | (not displayed) | Shipped, Invoiced |

### Status Progression

```
Received → Evaluation → In Repair → Complete → Shipped
```

The advance button shows the NEXT status in sequence. Clicking it updates both:
- `sRepairStatusDesc` → next simplified status
- `lRepairStatusID` → mapped ID (1→2→3→4→5)

---

## 4. KPIs

| ID | Label | Calculation |
|----|-------|-------------|
| `kpiAssigned` | Assigned | Count of all visible repairs (respects tech filter) |
| `kpiInRepair` | In Repair | Count WHERE simplified status = "In Repair" |
| `kpiOnHold` | On Hold | Count WHERE status matches `/on hold/i` |
| `kpiCompletedToday` | Completed Today | Count WHERE status = Complete/Ready AND dtDateOut starts with today's date |

KPIs update whenever filters change or status advances happen.

---

## 5. Table Columns

| # | Column | Width | Content | Notes |
|---|--------|-------|---------|-------|
| 1 | Urgency Dot | 40px | Color circle | Green ≤5d, Amber 6-10d, Red >10d |
| 2 | WO# | 90px | `sWorkOrderNumber` | Monospace, bold navy |
| 3 | Serial# | 110px | `sSerialNumber` | Monospace |
| 4 | Model | Auto | `sScopeTypeDesc` | |
| 5 | Customer + Tech | Auto | `sClientName1` + `_getTech(r)` as sub-line | Customer bold, tech name small gray |
| 6 | Days | 70px | Calendar days in-house | Bold, color-coded (red >10, amber >5) |
| 7 | Status | 90px | Badge with color class | Status-specific colors |
| 8 | Actions | 160px | Advance button + Flag button | Right-aligned |

### Urgency Dot Colors

| Days In-House | Color | Hex |
|--------------|-------|-----|
| ≤ 5 | Green | #16A34A |
| 6 – 10 | Amber | #F59E0B |
| > 10 | Red | #DC2626 |

### Status Badge Colors

| Status | Background | Text Color |
|--------|-----------|------------|
| Received | Light blue | Navy |
| Evaluation | Light yellow | Brown |
| In Repair | Light purple | Purple |
| Complete | Light green | Green |
| Shipped | Light teal | Teal |

---

## 6. Quick Actions

### 6.1 Advance Status Button

- Text: "{NextStatus} →" (e.g., "In Repair →", "Complete →")
- Only shows if there IS a next status
- On click:
  1. Call `API.updateRepair({ lRepairKey, sRepairStatusDesc: nextStatus, lRepairStatusID: statusId })`
  2. If advancing to Complete: also set `dtDateOut = today`
  3. Update in-memory array
  4. Re-render table + KPIs
  5. Toast: "Status Updated — Repair advanced to {nextStatus}"

### 6.2 Flag for Revised Quote Button

- Text: "⚠ Flag" (or "⚠ Flagged" if already flagged)
- If flagged: yellow background (`.flag-btn.flagged`)
- On click:
  1. Call `API.flagForRevisedQuote(repairKey)`
  2. Set `bFlaggedForRevisedQuote = true` in memory
  3. Re-render button state
  4. Toast: "Flagged — Repair flagged for revised quote"

### 6.3 Row Click-Through

- Entire row is clickable (cursor: pointer)
- Click navigates to: `repairs?wo={sWorkOrderNumber}`
- Button clicks do NOT trigger navigation (event.target.closest('button') check)

---

## 7. Technician Filtering

### 7.1 Dropdown

- Default: "All Technicians" (shows all repairs)
- Populated at page load from unique technicians in the repair data
- Sorted alphabetically by name

### 7.2 Tech Matching Logic

```javascript
// Matches by either key or name (handles mock vs live data)
var matchKey = String(r.lTechnicianKey || '') === techKey;
var matchName = _getTech(r) === techKey;
return matchKey || matchName;
```

### 7.3 Field Priority

```javascript
function _getTech(r) {
  return r.ResponsibleTech || r.sTechName || '';
}
```

---

## 8. Search

- **Input:** Text field, real-time (oninput)
- **Searched fields:** WO#, Serial#, Client Name, Scope Type, Department, Tech Name
- **Method:** Case-insensitive string contains across concatenated fields
- **Combines with:** Status filter AND tech filter (AND logic)

---

## 9. Sorting

- Default: Days descending (oldest first = most urgent on top)
- Clickable column headers toggle sort
- First click: ascending. Second click: descending. Different column: reset to ascending.
- Numeric sort for Days column. String sort for all others.

---

## 10. Data Loading

### 10.1 Initial Load

```javascript
// 1. Get service location from localStorage
var svcKey = localStorage.getItem('tsi_svcLocation') || '1';

// 2. Fetch repairs
var repData = await API.getDashboardScopes({ plServiceLocationKey: svcKey, inHouseValue: true });
// Fallback: API.getDashboardRepairs(svcKey)

// 3. Filter to active only (exclude shipped, invoiced, cancelled, draft invoice)
_repairs = repData.filter(r => {
  var st = _getStatus(r).toLowerCase();
  return st !== 'shipped' && st !== 'invoiced' && st !== 'cancelled' && st !== 'draft invoice';
});
```

### 10.2 No Auto-Refresh

The tech bench does NOT poll or auto-refresh. Manual page reload (F5) to get latest data. Status advance actions update in-memory only.

---

## 11. Days In-House Calculation

```javascript
function _getDays(r) {
  // Priority 1: Pre-calculated field from API
  var d = parseInt(r.nTurnAroundTime) || parseInt(r.nDaysSinceLastIn);
  if (d) return d;

  // Priority 2: Calculate from dtDateIn
  var din = r.dtDateIn || r.DateIn;
  if (!din) return 0;
  var d = new Date(din);
  if (isNaN(d)) return 0;
  return Math.floor((Date.now() - d) / 86400000);
}
```

---

## 12. API Endpoints Used

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `POST` | `/Dashboard/GetDashboardScopeDataList` | Primary data load |
| `GET` | `/Repair/GetAllRepairs` | Fallback data load |
| `POST` | `/Repair/UpdateRepair` | Status advance |
| `POST` | `/Repair/FlagForRevisedQuote` | Flag repair |

---

## 13. What's NOT on the Tech Bench

- **No rack position display** — available in data but not rendered
- **No timer/time tracking** — no start/stop clock per repair
- **No inline editing** — must click through to full detail
- **No batch operations** — single-repair actions only
- **No loaner info** — not surfaced on tech bench
- **No financial data** — no costs, prices, or invoice info

---

## 14. Open Questions

1. **Auto-refresh:** Should the bench poll for updates every N minutes? Techs may leave it open all day.
2. **Multi-select:** Should techs be able to batch-advance multiple repairs at once? (e.g., mark 5 as "Complete" after finishing a bench run)
3. **Time tracking:** Should there be a start/stop timer per repair for labor tracking? Would feed into profitability analytics.
4. **Rack position:** Should rack position be displayed and editable from the bench? Would help techs locate scopes physically.
5. **Notification on assignment:** Should a tech get a toast/alert when a new repair is assigned to them?
6. **Tech-locked view:** Should techs be forced to see only their own repairs (no "All Technicians" option), or is the current flexible approach preferred?
