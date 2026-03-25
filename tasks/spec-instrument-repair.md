# Instrument Repair — System Redesign Spec

## Date: 2026-03-24
## Status: DRAFT — capturing decisions from Joseph conversation

---

## Actual Workflow (corrected from conversation)

### Who does what:
1. **OPS (front desk)** — creates WO: customer, department, PO#, complaint, claimed instrument count. That's it. They do NOT catalog individual instruments.
2. **Tech** — gets the box + blank D&I form. Opens box, inspects every instrument, writes findings on paper (OS code, manufacturer, model, serial, repairs needed). Hands D&I form back to OPS.
3. **OPS** — reads handwritten D&I, enters all items into the system, generates quote.
4. **Customer** — receives 5-page paper quote, circles Y/N per item, signs, returns.
5. **Tech** — repairs approved items, initials each one on the BI form.
6. **Tech QC** — verifies count, visual inspection (P/F), functional inspection (P/F).
7. **Commercial QC** — second pass: count, visual (P/F).
8. **OPS** — ships, invoices.

### Key insight: Tech never touches the system.
The tech writes on paper. OPS re-keys everything. This is the core inefficiency.

### Customer's input is basically useless.
Customer says "15 graspers." Tech opens box — it's 12 graspers, 2 scissors, and a nail nipper. The physical inspection is the source of truth.

---

## Three Systems to Build

### System 1: Instrument Repair WO (base system improvements)

**OPS Intake (already mostly exists):**
- Customer + department
- PO number
- Complaint (usually "Sharpen/Repair")
- Customer claimed count (free text, just for reference)
- Clean/unclean check

**Tech D&I Screen (NEW — replaces paper form):**
Goal: Tech enters items directly into the system. No paper, no re-entry by OPS.

- WO pulls up on tablet/screen at bench
- Header auto-populated from WO (customer, complaint, claimed count)
- Clean/unclean toggle (if unclean → flag OM-22 protocol)
- **Add items flow:**
  - Pick code (search by name or code — "nail nipper" → OS366 → $30.80)
  - Enter manufacturer (dropdown of known: gSource, V. Mueller, Storz, Miltex, Generic, etc.)
  - Enter model number
  - Enter serial number (or "N/A" button for instruments without serials)
  - Repairs needed (multi-select: Sharpen, Clean, Reset, Adjust, Replace)
  - R/R/O designation (Repair / Replace / Other)
  - Findings notes (free text for BER reasons, damage description)
  - BER toggle — if flagged, sets $0.00, adds "Beyond Economical Repair" status
  - QTY field — for identical items (2x same nail nipper model, no serial)
- Items auto-group by category on screen
- Running count: "14 of 15 claimed instruments entered"
- Quick-add: after adding one item, cursor goes right back to code picker for next
- When done → items are in the system. OPS just reviews, doesn't re-enter.

**Repair Tracking (per item):**
- Each item has its own status: Received → In Progress → Complete
- "Repaired By" field per item (tech initials/name)
- Batch operations: select multiple items of same type → mark all Complete
- Outsource tracking per item (vendor, cost, margin)

**Two-Stage QC:**
- **Tech QC gate:** Verify total count, Visual Inspection (P/F), Functional Inspection (P/F), Inspector name, date
- **Commercial QC gate:** Verify total count, Visual Inspection (P/F), Inspector name, date
- Both must pass before WO can advance to "Complete"
- If QC fails → items flagged for rework with reason

### System 2: Pricing Model (future-ready)

**Current: OS codes** — granular, one code per instrument type + repair action. Works today.

**Future: Category + Level** — Joseph is considering regrouping:
- Categories: Lap Instruments, ENT, General Scissors, Nail Nippers, Forceps, Osteotomes, etc.
- Levels: 1 (minor/sharpen), 2 (mid/clean+reset), 3 (major/full repair)
- Price matrix: category × level = price

**Build strategy:** Abstract the pricing lookup so it works with either model.
- Today: code lookup table (OS366 → "Nail Nippers - Sharpen/Repair" → $30.80)
- Tomorrow: category + level matrix (Nail Nippers × Level 2 → $30.80)
- The item record stores both: the code/category AND the resolved price
- Switching pricing models doesn't break existing WOs

### System 3: Customer Approval Portal (future — after base is solid)

Digital replacement for the 5-page paper quote:
- Unique link per WO sent to customer
- Clean, mobile-friendly item list grouped by category
- Approve/Reject toggle per item (or "Approve All")
- BER items clearly flagged with explanation
- Partial approval supported
- E-signature
- Instant submission → OPS gets notification
- No paper, no fax, no scanning

**Not building this yet** — Joseph wants the base system right first. But the data model should support it from day one.

---

## Data Model Considerations

### Instrument Repair Item (per item on a WO)
```
- lInstrumentItemKey (PK)
- lRepairKey (FK to WO)
- sInstrCode (OS code or future category code)
- sProductCategory (resolved category name)
- sManufacturer
- sModel
- sSerialNumber (can be "N/A")
- nQuantity (usually 1, sometimes 2+ for identical items)
- sRepairsNeeded (multi-value: Sharpen, Clean, Reset, etc.)
- sRRO (Repair / Replace / Other)
- sFindings (free text — damage notes, BER reason)
- bBER (Beyond Economical Repair flag)
- nRate (per-unit price from code/category lookup)
- nAmount (qty × rate, $0 if BER)
- sItemStatus (Received, In Progress, Outsourced, Complete, QC Rejected)
- sTechInitials (who repaired it)
- nRepairLevel (1/2/3 — future use for category+level pricing)
- bOutsource (flag)
- sOutsourceVendor
- nOutsourceCost
- bCustomerApproved (null=pending, true=approved, false=rejected)
- dtApprovedDate
```

### QC Record (per WO, per QC stage)
```
- lQCKey (PK)
- lRepairKey (FK)
- sQCType ('Tech' or 'Commercial')
- nTotalCount (verified count)
- sVisualInspection ('P' or 'F')
- sFunctionalInspection ('P' or 'F') — Tech QC only
- sInspectedBy
- dtInspectionDate
- sNotes
```

### Pricing Catalog (flexible for both models)
```
- sCode (OS366, or future "NAIL-L2")
- sDescription ("Nail Nippers - Sharpen/Repair")
- sCategory ("Nail Nippers")
- nRepairLevel (null for OS codes, 1/2/3 for category model)
- nBaseRate ($30.80)
- bActive
```

---

## What Exists Today (js/instrument-repairs-tab.js)
- Cockpit-style list + detail view ✓
- Items tab with item code, mfr, model, serial, description, amount ✓
- Status workflow (Received → In Progress → Complete → Invoiced) ✓
- Outsource tracking per item ✓
- Financials tab ✓
- New order wizard (client → dept → create) ✓

## What Needs to Be Built/Changed
1. **D&I entry screen** — tech-facing item entry flow (the big new piece)
2. **OS code / pricing catalog** — searchable lookup that auto-fills description + price
3. **QC workflow gates** — Tech QC + Commercial QC as system steps
4. **BER handling** — flag, $0 pricing, reason tracking
5. **Batch item operations** — select multiple → mark status, assign tech
6. **Item grouping by category** — visual grouping in items tab and on quote
7. **Customer approval data fields** — approved/rejected per item (for future portal)
8. **Claimed vs actual count** — OPS enters customer's claim, tech enters actual, system shows discrepancy

## Open Items (for Joseph to decide)
1. **New category/level groupings** — Joseph working on this. System will support both models.
2. **Tech access to system** — do techs get tablets? Shared workstation at bench? Or does someone else enter for them?
3. **Photo capture** — worth adding damage photos per item during D&I?
4. **Inventory/parts tracking** — the BI has an "Inventory Used" column. How detailed does parts tracking need to be per item?

---

## Legacy Forms Reference
- D&I form: Form #OM05-4 (09/2023)
- Blank Inspection: Form #OM07-2 (09/2016)
- Quote/Requisition: Form #OM07-6 (12/2020)
- Sample WO: NR25044011, VA Medical Center Amarillo, 20 instruments, $379.12 total
