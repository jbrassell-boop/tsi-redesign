# Lessons Learned

## TSI Domain Knowledge
- **Instrument categories are FOUR, not three:** Flex (large diameter), Flex (small diameter), Rigid, and **Cameras**. Never exclude cameras from scope type lists, form variants, or instrument discussions.
- D&I form OM05-1 is specifically for large diameter flexible scopes. Other instrument types have their own form variants.
- `r.sRigidOrFlexible` on repair records can dispatch to the correct form variant.
- TSI does NOT decontaminate scopes, is NOT FDA registered, IS ISO 13485 certified.
- Hospitals are often NOT tax-exempt — always show tax on estimates.
- Repairs are package deals — customer approves the whole quote, not individual items.
- 3-part leak test: Manual, Wet (submersion), Electronic (pressure decay).
- Don't cite AAMI ST91 on customer documents — use it to inform design, not as a footer citation.

## Receiving Workflow (learned 2026-03-24)
- **Portal data is a starting point, NOT source of truth.** Customers frequently submit wrong model/SN. Physical scope in hand is always truth.
- **Receiving = WO creation.** No separate EOD barcode scan step needed. WO creation IS the receiving event with timestamp.
- **Zebra labels: 3 per WO** — one on tracking label, one on incoming packaging, one on scope bin.
- **Portal → Expected Arrivals queue.** TSIPortal DB auto-feeds pending arrivals. No manual email re-entry.
- **Receiving volume:** ~18/day North, ~10/day South. Multiple scopes per customer common.
- **14-day overdue flag, 30-day auto-expire** for pending arrivals not received.

## Instrument Repair Workflow (learned 2026-03-24)
- **OPS does intake** (customer, PO, count, complaint). They do NOT catalog individual instruments.
- **Tech gets the box + D&I form.** Tech inspects, writes findings on paper (OS code, mfr, model, serial, repairs needed). Hands D&I back to OPS.
- **OPS re-keys everything** from handwritten D&I into system → generates quote. This is the core inefficiency.
- **Customer input is basically useless.** They say "15 graspers" but it's 12 graspers, 2 scissors, and a nail nipper. Physical inspection is source of truth.
- **OS codes** are the pricing catalog for instruments (OS366 = Nail Nippers $30.80, etc.). Built for onsite; Joseph may regroup into category+level model (e.g., "Lap Instrument Level 3").
- **No more T### serial numbers** for instrument repairs. WO number is the only tracking ID needed.
- **Two-stage QC:** Tech QC (visual + functional P/F) then Commercial QC (visual P/F). Both must pass.
- **BER (Beyond Economical Repair)** items get OS090 code, $0 price, with reason documented.
- **Instrument repair quote is the #1 customer pain point** — 5-page paper form, circle Y/N per item. Future: digital approval portal.
- **repairItems table (734 records) is for SCOPES, not instruments.** Don't confuse them. OS codes live in scopeTypes as sItemCode.

## Data Field Pitfalls
- `_clients` lookup is sparse — use `r.sShipName1 || r.sBillName1` for client name.
- Sales rep: use `sRepFirst + sRepLast` (not `sSalesRepName` which doesn't exist on real data).
- Payment terms: field is `sTermsDesc` (not `sPaymentTerms`).
- Blind item detection: check `desc.startsWith('!')` — `data-blind` attribute doesn't exist on DOM rows.
- Angulation values can be literal string "N/A" (truthy) — check for real values, not just truthiness.

## CSS / UI Patterns
- When overriding base drawer styles, use a separate class entirely — don't fight specificity with `!important`.
- Print CSS in `printFormDocument` is a separate stylesheet — any new classes must be duplicated there.
- Use `print-color-adjust: exact` so backgrounds render on paper.
- Customer-facing forms must fit one page (~950px). Measure with `scrollHeight`.
- Don't use individual cards for repair items — use compact table rows (cards don't scale to 20+ items).
- Test in preview server before telling user to check.

## Form Design
- Customer-facing forms should feel like Olympus/Stryker service docs, not internal workflow forms.
- The estimate is a package deal — no per-item pricing, no per-item approval.
- Diagnostic Inspection shows on estimate (pinned first) but other blind items are hidden.
- Test results on Final Inspection: use category summaries with professional verbiage, not 19 individual rows.
- Print button should NOT trigger generateForm/PDF side effect — just print.

## Code Style: Alphabetical Lists
- **Rule:** All array/list literals containing string values (table names, field names, config keys) must be sorted alphabetically.
- **Why:** Joseph's preference for consistency and readability.
- **Scope:** Applies to SEED_ORDER arrays, table registration arrays, TABLE_LIMITS keys, KEEP_FIELDS sets, and any similar string collections.
