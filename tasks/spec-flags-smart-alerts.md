# Technical Specification: Flag System & Smart Alerts

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Workflow, Client/Department, Contracts

---

## 1. Overview

Two complementary systems surface actionable information:

- **Flags** — Pre-configured instructions tied to clients, scope types, scopes, or repairs. "When you see this client, remember X." Persistent data, created by users.
- **Smart Alerts** — Real-time computed warnings based on data conditions. "This repair cost exceeds the max charge." Evaluated on page load, not stored.

---

## PART 1: FLAG SYSTEM

---

## 2. Schema — Flag Tables

### 2.1 `Flags`

| Column | Type | Description |
|--------|------|-------------|
| `lFlagKey` | `int` (PK) | Unique flag ID |
| `lFlagTypeKey` | `int` (FK → FlagTypes) | 1=Client, 2=ScopeType, 3=Scope, 4=Repair |
| `lOwnerKey` | `int` | Entity key — meaning depends on type |
| `sFlag` | `varchar(500)` | Flag text / instruction |
| `sFlagDesc` | `varchar(500)` | Alternative description |
| `psFlag` | `varchar(500)` | Alias for flag text |
| `bVisibleOnDI` | `bit` | Legacy: show on D&I form |
| `bVisibleOnBlank` | `bit` | Legacy: show on requisition form |
| `bResolved` | `bit` | Whether flag has been addressed |
| `dtCreated` | `datetime` | When flag was created |

### 2.2 `FlagTypes` (4 types)

| Key | Type | `lOwnerKey` Means | Description |
|-----|------|-------------------|-------------|
| 1 | Client | `lClientKey` | Global for all work from that client |
| 2 | Scope Type | Scope type model ID | Triggers when that model appears |
| 3 | Scope | `lScopeKey` | Specific instrument |
| 4 | Repair | `lRepairKey` | Specific work order |

**`bMultipleInstrumentTypes`:** True for Client flags (can span F/R/C/I), false for others.

### 2.3 `FlagLocations` (6 display trigger points)

| Key | Location | When It Triggers |
|-----|----------|-----------------|
| 1 | Requisition | Intake form opened |
| 2 | Upon Approval | Quote approved, before repair starts |
| 3 | Invoice Generated | Invoice created, compliance check |
| 4 | D&I | Disassembly & Inspection form |
| 5 | Repair Label | Printed label at workbench |
| 6 | Booking Loaner | Loaner assigned to repair |

### 2.4 `FlagLocationsUsed` (Junction — Many:Many)

| Column | Type | Description |
|--------|------|-------------|
| `lFlagKey` | `int` (FK → Flags) | Which flag |
| `lFlagLocationKey` | `int` (FK → FlagLocations) | Which display point |

A single flag can display at multiple locations.

**Fallback logic:** If no `flagLocationsUsed` records exist for a flag, fall back to legacy boolean fields:
- `bVisibleOnDI` → "D&I" location
- `bVisibleOnBlank` → "Req" location

### 2.5 `FlagInstrumentTypes` (Junction — Many:Many)

| Column | Type | Description |
|--------|------|-------------|
| `lFlagKey` | `int` (FK → Flags) | Which flag |
| `sRigidOrFlexible` | `char(1)` | F=Flexible, R=Rigid, C=Camera, I=Insufflator |

Filters which instrument types a flag applies to.

---

## 3. Flag Ownership Model

When a repair is loaded, the system should query flags across ALL applicable owner levels:

```
1. Client flags:     WHERE lFlagTypeKey = 1 AND lOwnerKey = repair.lClientKey
2. Scope Type flags: WHERE lFlagTypeKey = 2 AND lOwnerKey = repair.lScopeTypeKey
3. Scope flags:      WHERE lFlagTypeKey = 3 AND lOwnerKey = repair.lScopeKey
4. Repair flags:     WHERE lFlagTypeKey = 4 AND lOwnerKey = repair.lRepairKey
```

**Current gap:** `repairs.html` only queries by `repairKey`, missing client/scope/scope-type context flags. Developer should implement multi-level flag loading.

---

## 4. Flag Lifecycle

1. **Created** — user or system creates flag with `bResolved = false`
2. **Displayed** — surfaces at appropriate workflow locations
3. **Unresolved > 3 days** — appears in morning briefing (`GetNeedsAttention`)
4. **Resolved** — `bResolved = true` (UI for this is incomplete — see gaps)
5. **Dismissed** — removed from DOM in current session (not persisted)

---

## 5. Flag UI

### Repair Detail — Flags Bar
```html
<div class="flags-bar" id="flagsBar">
  <span class="flag-chip">Customer Requests foam boxes</span>
  <span class="flag-chip">Standard Rigid: $650.00</span>
</div>
```

- Amber warning box with pill badges
- Hides if no flags exist
- Display-only (no create/resolve in current UI)
- Field fallback order: `psFlag` → `sFlag` → `sFlagDescription` → "Flag"

### Dashboard Flags Page (dashboard_flags.html)
- KPI strip: Total, by type (Client/ScopeType/Scope/Repair)
- Filter by type, search by text
- Table: Flag Text, Type (badge), Owner (resolved name), Locations (pills), Instrument Types
- Loads 5 endpoints in parallel (flags, types, locations, locationsUsed, instrumentTypes)

---

## 6. Flag API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/Flag/GetFlagList` | GET | Flags by owner + type |
| `/Flag/GetAllFlags` | GET | All flags system-wide |
| `/Flag/GetAllFlagTypes` | GET | 4 flag type definitions |
| `/Flag/GetAllFlagLocations` | GET | 6 location definitions |
| `/Flag/GetAllFlagLocationsUsed` | GET | Junction: which flags show where |
| `/Flag/GetAllFlagInstrumentTypes` | GET | Junction: instrument type filters |
| `/Flag/GetFlagsByType` | GET | Flags filtered by type |
| `/Flag/AddFlag` | POST | Create new flag |
| `/Flag/DeleteFlag` | DELETE | Remove flag |

---

## PART 2: SMART ALERTS

---

## 7. Architecture

Smart Alerts is a standalone JavaScript module (`js/smart-alerts.js`) that:
1. Takes a **context** ("repair", "client", "contract", "department") and **data object**
2. Evaluates business rules against the data
3. Returns an array of alert objects
4. Renders alerts to a DOM container with dismiss buttons

```javascript
// Usage
const alerts = SmartAlerts.evaluate('repair', repairData);
SmartAlerts.render('#alertsContainer', alerts);
```

---

## 8. Alert Types

| Type | Icon | Color | Use |
|------|------|-------|-----|
| `warning` | Triangle with `!` | Red/orange | Financial/compliance issues |
| `info` | Circle with `i` | Blue | Positive info (contract coverage) |
| `opportunity` | Star | Gold | Growth/revenue opportunity |

---

## 9. All 10 Alert Rules

### Repair Context (4 alerts)

**1. 40-Day Return**
- **Trigger:** Same scope repaired within 40 days of prior repair
- **Logic:** Find most recent prior repair for same `lScopeKey`, compare `dtDateOut` to current `dtDateIn`
- **Message:** "40-Day Return — this scope was last repaired {gap} days ago (WO# {priorWO})"
- **Type:** warning

**2. Max Charge Exceeded**
- **Trigger:** `dblAmtRepair > mMaxCharge` and `mMaxCharge > 0`
- **Message:** "Max Charge Exceeded — repair cost {cost} exceeds {max} cap"
- **Type:** warning

**3. Contract Coverage**
- **Trigger:** Client has active contract
- **Message (has contract):** "Contract Coverage — active agreement {type} through {date}"
- **Message (no contract):** "No Contract — this client has no active service agreement"
- **Type:** info / opportunity

**4. Hot List**
- **Trigger:** `bHotList = true`
- **Message:** "Hot List — this repair is flagged as priority"
- **Type:** warning

### Client Context (2 alerts)

**5. No Contract Growth Opportunity**
- **Trigger:** Client has no active contracts
- **Message:** "Growth Opportunity — client has no active service agreement (only 9.9% of active clients are under contract)"
- **Type:** opportunity

**6. Inactive Client**
- **Trigger:** No repairs received in > 180 days across all departments
- **Message:** "Inactive Client — no repairs received in over 6 months"
- **Type:** warning

### Contract Context (3 alerts)

**7. Expense Multiplier**
- **Trigger:** Total repair costs / contract revenue > 1.0
- **Message:** "Expense Multiplier {ratio}x — this contract is losing money"
- **Type:** warning

**8. Expiring Soon**
- **Trigger:** Contract ends within 30 days, no renewal pending
- **Message:** "Expiring in {days} days — no renewal pending"
- **Type:** warning

**9. Avoidable Damage Rate**
- **Trigger:** Damage repairs > 20% of total repairs for contract
- **Message:** "Avoidable Damage Rate {pct}% — consider training recommendation"
- **Type:** info

### Department Context (1 alert)

**10. Inactive Department**
- **Trigger:** No repairs received in > 180 days
- **Message:** "Inactive Department — no repairs received in over 6 months"
- **Type:** warning

---

## 10. Morning Briefing (GetNeedsAttention)

`GET /Dashboard/GetNeedsAttention` returns up to 20 items combining:

| Type | Source | Condition | Severity |
|------|--------|-----------|----------|
| `aging` | Repairs | WO open > 10 days, no status change | danger |
| `loaner` | LoanerTrans | Past due date, not returned | warning |
| `flag` | Flags | Unresolved > 3 days | info |

---

## 11. Alert Rendering & Dismissal

```html
<div class="alert-item alert-warning">
  [SVG icon]
  <span class="alert-msg">Max Charge Exceeded — repair cost $2,500 exceeds $1,995 cap</span>
  <button class="alert-dismiss" title="Dismiss">×</button>
</div>
```

- Dismiss removes from DOM only — **not persisted** to backend
- Container hides when all alerts dismissed
- No backend storage of alert state

---

## 12. Known Gaps

### Flags
1. **No create UI** — flags are pre-seeded, no form to create new flags from dashboard
2. **No resolve UI** — `bResolved` field exists but no button to mark resolved
3. **Multi-level flag loading** — repairs.html only queries by repair key, missing client/scope/scope-type flags
4. **Location assignment UI** — no UI to manage which flags display at which locations
5. **Instrument type filtering** — junction table exists but not used in current flag display

### Smart Alerts
6. **No persistence** — dismissals are session-only; alerts reappear on page reload
7. **No real-time** — alerts evaluated only on page load, not updated live
8. **No unified alert center** — flags and smart alerts are separate systems
9. **Hardcoded thresholds** — 40 days, 180 days, 20% damage rate, 9.9% contract rate are all hardcoded
