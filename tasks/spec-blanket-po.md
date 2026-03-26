# Technical Specification: Blanket Purchase Orders

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Department Management, Repair Intake, Invoicing

---

## 1. Overview

A **Blanket PO** is a standing purchase order number that a customer department uses for a defined time period. Instead of providing a new PO for every work order, the department says "use PO# 12345 for all repairs from Jan 1 through Dec 31."

**Current process:** A flag is created to notify OPS to manually update the PO on each work order. This is repetitive, error-prone, and creates unnecessary work.

**New process:** Store the Blanket PO at the **department level** with a date range. Auto-populate it on new work orders when the date is within range. No flag, no OPS intervention.

---

## 2. Why Department Level

In TSI's hierarchy, the **department** carries the weight:
- A hospital (client) has multiple departments (GI Lab, OR, Pulmonology)
- Each department has its own PO process, budget, and purchasing authority
- Different departments at the same hospital can have completely different PO numbers
- Contracts are client-level but coverage is per-department — POs follow the same pattern

---

## 3. Schema — New Table

### `BlanketPOs`

| Column | Type | Nullable | Description |
|--------|------|----------|-------------|
| `lBlanketPOKey` | `int` (PK, identity) | No | Unique identifier |
| `lDepartmentKey` | `int` (FK → Departments) | No | Which department this PO belongs to |
| `sPONumber` | `varchar(50)` | No | The blanket purchase order number |
| `dtStartDate` | `date` | No | First day the PO is valid |
| `dtEndDate` | `date` | No | Last day the PO is valid |
| `sStatus` | `varchar(20)` | No | `Active`, `Expired`, `Upcoming` |
| `sNotes` | `varchar(500)` | Yes | Free-text notes (reason, contact, etc.) |
| `lCreatedByUserKey` | `int` (FK → Users) | No | Who created the record |
| `dtCreatedAt` | `datetime` | No | When the record was created |
| `lLastUpdateUserKey` | `int` (FK → Users) | Yes | Who last modified |
| `dtLastUpdate` | `datetime` | Yes | When last modified |

### Constraints

```sql
-- Only one Active blanket PO per department at a time
CREATE UNIQUE INDEX UX_BlanketPO_ActivePerDept
  ON BlanketPOs (lDepartmentKey)
  WHERE sStatus = 'Active';

-- FK to departments
ALTER TABLE BlanketPOs
  ADD CONSTRAINT FK_BlanketPO_Department
  FOREIGN KEY (lDepartmentKey) REFERENCES Departments(lDepartmentKey);

-- End date must be after start date
ALTER TABLE BlanketPOs
  ADD CONSTRAINT CK_BlanketPO_DateRange
  CHECK (dtEndDate > dtStartDate);
```

---

## 4. Status Rules

| Status | Condition | Auto-Set? |
|--------|-----------|-----------|
| `Upcoming` | `dtStartDate > TODAY` | Yes — on insert if start date is future |
| `Active` | `dtStartDate <= TODAY AND dtEndDate >= TODAY` | Yes — computed or scheduled job |
| `Expired` | `dtEndDate < TODAY` | Yes — computed or scheduled job |

**Implementation options:**
1. **Computed on read:** Don't store `sStatus` — derive it from dates every time. Simplest but requires calculation on every query.
2. **Stored + scheduled job:** Store `sStatus` and run a daily job to transition `Upcoming → Active` and `Active → Expired`. More efficient for queries.
3. **Stored + trigger on read:** Store it, but recompute when the department is loaded. Good middle ground.

**Recommendation:** Option 2 — stored with a daily job. The developer can implement a SQL Agent job or application-level scheduler that runs daily:

```sql
-- Daily status update
UPDATE BlanketPOs SET sStatus = 'Active'
  WHERE sStatus = 'Upcoming' AND dtStartDate <= GETDATE();

UPDATE BlanketPOs SET sStatus = 'Expired'
  WHERE sStatus = 'Active' AND dtEndDate < GETDATE();
```

---

## 5. Auto-Population Logic

### On Work Order Creation

When a new repair/work order is created (via intake form, batch receiving, or API):

```
1. Get the repair's lDepartmentKey
2. Query: SELECT sPONumber FROM BlanketPOs
          WHERE lDepartmentKey = @deptKey
          AND sStatus = 'Active'
          (should return 0 or 1 row due to unique constraint)
3. IF found:
     → Set repair.sPONumber = blanketPO.sPONumber
     → Set repair.sPOSource = 'Blanket'
4. IF not found:
     → Leave repair.sPONumber blank
     → Leave repair.sPOSource = NULL
```

### PO Source Tracking

Add a new field to the `Repairs` table:

| Column | Type | Description |
|--------|------|-------------|
| `sPOSource` | `varchar(20)` | How the PO was applied: `Blanket` (auto), `Manual` (user entered), NULL (none) |

This lets you distinguish:
- **Blanket** — auto-populated from department's active Blanket PO
- **Manual** — user typed in a one-off PO number
- **NULL** — no PO on the work order

---

## 6. Expiration Handling

### When a Blanket PO Expires

- **Stop auto-populating:** New work orders for that department will have no PO
- **Don't retroactively change:** Work orders created while the PO was active keep their PO number
- **Surface a warning:** When creating a WO for a department with no active Blanket PO but an expired one exists:
  - Alert: "Blanket PO {number} expired on {date} — new PO# needed"
  - Type: Warning (not blocking)

### Expiring Soon Alert

When a Blanket PO is within **30 days** of expiration:
- Alert: "Blanket PO {number} expires on {date} — {X} days remaining"
- Surface this on the department detail view and on work order creation
- Type: Info
- Purpose: Give the account rep time to get a renewal PO from the customer

---

## 7. History & Traceability

### Full Audit Trail

The `BlanketPOs` table keeps all records — expired POs are never deleted, just marked `Expired`. This gives you:

- Complete history: "Department X used PO 12345 from Jan–Dec 2025, then PO 67890 from Jan–Dec 2026"
- Finance can trace any invoice back to which Blanket PO was active when the work was performed
- No gaps — the `sPOSource = 'Blanket'` on the work order + the date range on the Blanket PO record = full audit

### Tracing a Work Order's PO

To answer "why does WO# 12345 have PO# 67890?":

```sql
SELECT r.sWorkOrderNumber, r.sPONumber, r.sPOSource, r.dtDateIn,
       bp.sPONumber AS BlanketPONumber, bp.dtStartDate, bp.dtEndDate
FROM Repairs r
LEFT JOIN BlanketPOs bp
  ON bp.lDepartmentKey = r.lDepartmentKey
  AND r.dtDateIn BETWEEN bp.dtStartDate AND bp.dtEndDate
WHERE r.sWorkOrderNumber = 'N12345'
```

---

## 8. Edge Cases

### Multiple Active Blanket POs

**Prevented by design.** The unique index on `(lDepartmentKey) WHERE sStatus = 'Active'` enforces only one active Blanket PO per department at any time.

If a department needs a new Blanket PO before the current one expires:
1. Expire the current one manually (set `dtEndDate = TODAY`)
2. Create the new one with `dtStartDate = TOMORROW` or `TODAY`

### Overlapping Date Ranges

**Validation on insert/update:**

```sql
-- Before inserting/updating a BlanketPO, check for overlaps:
IF EXISTS (
  SELECT 1 FROM BlanketPOs
  WHERE lDepartmentKey = @deptKey
  AND lBlanketPOKey != @currentKey  -- exclude self on update
  AND dtStartDate <= @newEndDate
  AND dtEndDate >= @newStartDate
)
  RAISERROR('Date range overlaps with existing Blanket PO', 16, 1);
```

### Mid-Period PO Changes

If a customer changes their Blanket PO number mid-period:
1. Expire the current PO (set `dtEndDate = TODAY`)
2. Create new PO with `dtStartDate = TOMORROW`, new number
3. Existing work orders keep the old PO — new ones get the new PO

### Manual Override

A user can always manually enter a different PO on a specific work order. When they do:
- `sPOSource` changes from `Blanket` to `Manual`
- The Blanket PO isn't affected — it's a per-WO override

---

## 9. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/BlanketPO/GetByDepartment?plDepartmentKey={key}` | Get all Blanket POs for a department (history) |
| `GET` | `/BlanketPO/GetActive?plDepartmentKey={key}` | Get current active Blanket PO (0 or 1 result) |
| `POST` | `/BlanketPO/Add` | Create new Blanket PO |
| `POST` | `/BlanketPO/Update` | Update existing (change dates, notes, expire early) |
| `DELETE` | `/BlanketPO/Delete?plBlanketPOKey={key}` | Remove (admin only — prefer expiring over deleting) |

### Request/Response for Add

```json
// POST /BlanketPO/Add
{
  "plDepartmentKey": 42,
  "psPONumber": "PO-2026-00123",
  "pdtStartDate": "2026-01-01",
  "pdtEndDate": "2026-12-31",
  "psNotes": "Annual blanket PO from purchasing dept"
}

// Response
{
  "success": true,
  "data": {
    "lBlanketPOKey": 1,
    "lDepartmentKey": 42,
    "sPONumber": "PO-2026-00123",
    "dtStartDate": "2026-01-01",
    "dtEndDate": "2026-12-31",
    "sStatus": "Active",
    "sNotes": "Annual blanket PO from purchasing dept"
  }
}
```

---

## 10. UI Touchpoints

### Department Detail View

- **New section or tab:** "Blanket POs"
- Shows current active PO (if any) prominently
- Table of all historical POs: PO#, Start, End, Status, Created By, Notes
- "Add New Blanket PO" button
- Inline edit for notes, early expiration

### Work Order Creation (Intake / Batch Receiving)

- After selecting department, check for active Blanket PO
- If found: auto-fill PO# field, show green chip "Blanket PO"
- If not found but expired exists: show warning "Blanket PO expired — needs new PO"
- PO# field remains editable for manual override

### Repair Detail Header

- PO# field shows the value
- Small badge next to PO#: "Blanket" (blue) or "Manual" (gray)
- Clicking badge shows which Blanket PO record it came from (date range, etc.)

### Smart Alerts

- "Blanket PO expiring in X days" — on department load and WO creation
- "Blanket PO expired" — on WO creation when no active PO exists

---

## 11. Reporting

| Report | Query |
|--------|-------|
| **Departments with Expiring POs** | `WHERE sStatus = 'Active' AND dtEndDate BETWEEN TODAY AND TODAY+30` |
| **Departments with No Active PO** | `LEFT JOIN BlanketPOs ... WHERE bp.lBlanketPOKey IS NULL OR bp.sStatus != 'Active'` |
| **PO Usage History** | `JOIN Repairs ON sPOSource = 'Blanket' GROUP BY sPONumber` |
| **WOs Missing PO** | `WHERE sPONumber IS NULL OR sPONumber = ''` |

---

## 12. Migration

For existing work orders that were manually updated with Blanket PO numbers:
- No migration needed — they stay as-is with `sPOSource = NULL` (legacy)
- Going forward, new WOs will have `sPOSource = 'Blanket'` or `'Manual'`
- The `sPOSource` field should default to NULL for all existing records
