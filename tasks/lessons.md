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
