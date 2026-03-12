# Repairs Banner Cockpit Cleanup

## Problem
The ref-strip is a single flat strip cramming 18+ fields into one wrapping line. On the user's wide screen it looks like a cluttered mess — fields mash together with inconsistent spacing. This is NOT a cockpit pattern; it's a dump of fields.

## Current Structure (top→bottom)
1. **Toolbar** — Client/Dept/Repair selectors, Copy, Delete, Save (OK — keep)
2. **Status strip** — ss-chips for Status/Rep/Tech/Level/Carrier/Scopes/Contract (OK — keep)
3. **Tabs** — Scope In, Details, Outgoing, Expense, Comments, Inventory, Status, Documents
4. **ref-strip** — 18 fields in ONE wrapping flex row (WO, Date, Client, Dept, PO, Rack, Status, Mfr, Category, Model, SN#, Cap/FFS, Days Last, 40d, TAT, Lead Time, Date In, Date Out, Req Sent, Approval) — **THIS IS THE PROBLEM**
5. **Complaint strip** — amber bar with contenteditable (OK — keep as-is)
6. **Flags bar** — flag chips (OK — keep)
7. **Assessment row** — Reason/Level/PS Level + Angulation inputs + action buttons

## Plan: Restructure ref-strip into grouped rows

Split the 18 fields into **two logical rows** inside the ref-strip, with visual group separators:

### Row 1: Identity & Scope Info (read-only context)
`WO` | `Client` | `Dept` | `Mfr` | `Category` | `Model` | `SN#` (with history badge) | `Cap/FFS`

### Row 2: Dates & Tracking (mix of read-only and editable)
`Date In` | `Date Out` | `PO` | `Rack` | `Status` | `Req Sent` | `Approval` | `Days Last` | `40d` | `TAT` | `Lead Time`

Each row uses the same `.ref-strip` styling but groups are separated by thin vertical dividers. This keeps the cockpit feel — dense but organized.

### Changes
- [ ] Restructure ref-strip HTML into 2 rows with grouped items
- [ ] Add `.ref-divider` CSS for vertical group separators
- [ ] Keep all existing IDs and event handlers intact
- [ ] No JS changes needed — just HTML/CSS restructuring
