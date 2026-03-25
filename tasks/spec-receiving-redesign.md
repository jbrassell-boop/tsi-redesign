# Receiving Redesign — Hybrid Approach (Option E)

## Status: APPROVED by Joseph 2026-03-24

## Context
Current workflow: portal request → scope ships → arrives at TSI → open box → verify model/SN against paperwork → run SN in system → create WO → print 3 Zebra labels (tracking, packaging, scope bin) → print D&I → scope goes to incoming inspection. EOD batch barcode scan marks all as "Received" (separate app with scanner).

Portal data is a starting point, NOT source of truth. Customers frequently submit with small errors in model or SN. Physical scope in hand is always the truth.

Volume: ~18 incoming/day (North), ~10/day (South). Multiple scopes per customer common.

## Decisions Made
- **EOD barcode scan: ELIMINATED** — WO creation is the receiving event (real-time, timestamped). No need for separate scan step or separate app.
- **Batch receiving wizard: REPLACED** by this flow.
- **Portal data source: TSIPortal database** — client-facing portal where customers log in with email. Auto-feeds Expected Arrivals queue. No manual email re-entry.
- **Zebra labels: 3 per WO** — tracking label, incoming packaging, scope bin.

## Design: Two-Part Receiving

### Part 1: Expected Arrivals Queue
Portal submissions from TSIPortal DB auto-create **Pending Arrival** records:
- Customer name, contact info, email
- Model (customer-claimed)
- SN (customer-claimed)
- Customer-perceived problem / complaint
- PO# if provided
- Date submitted
- Status: `Pending`

This queue is visible on the dashboard and a dedicated "Receiving" screen. Shows all pending arrivals grouped by customer, sorted by date submitted (oldest first). Filterable by customer name, SN, model.

### Part 2: Intake Flow (box arrives)

**Step 1 — Match or Start Fresh**
Tech opens box, has paperwork in hand. Two paths:
- **Match to pending:** Search/browse the Expected Arrivals list. Can filter by customer name, partial SN, model. Pick the matching pending arrival → pre-fills the intake form with portal data.
- **No match / walk-in:** Start blank intake (existing WO wizard flow).

**Step 2 — Verify & Correct**
Pre-filled form from portal data, but ALL fields editable:
- Model: pre-filled from portal, dropdown to correct (highlight if changed)
- Serial #: pre-filled, editable. On blur → SN lookup to check history
- Department: may or may not be provided from portal
- Complaint: pre-filled from portal
- Contact / return address: pre-filled

If tech corrects model or SN, show a subtle indicator: "Customer submitted: GIF-Q180 → Corrected to: PCF-Q180AL" — creates an audit trail and helps identify customers who always get it wrong.

**Step 3 — Create WO (= Receiving)**
- WO created with corrected data — this IS the receiving event, timestamped in real-time
- Zebra prints 3 labels (tracking, incoming packaging, scope bin)
- D&I form prints
- Pending arrival status → `Received`
- Scope goes to incoming inspection rack

## Multiple Scopes Same Shipment
When a customer sends multiple scopes in one shipment:
- Multiple pending arrivals will exist for that customer
- Tech processes each one individually (open box, verify, match to correct pending arrival)
- The pending arrivals list filtered by customer shows all outstanding items
- Each gets its own WO, own labels, own D&I

## Edge Cases
- **Portal request but scope never arrives:** Pending arrivals age out. Dashboard flags "submitted 14+ days ago, never received" for follow-up with customer.
- **Scope arrives with no portal request:** Walk-in / direct ship. Start fresh intake, no matching step.
- **Customer sends wrong scope entirely:** Model and SN both don't match any pending. Tech can still receive it — starts fresh or corrects the pending arrival heavily.
- **Duplicate portal submissions:** Customer submits same scope twice. Need ability to dismiss/merge duplicate pending arrivals.

## Data Model
- **Source:** TSIPortal database (client-facing portal, customers log in with email)
- **PendingArrival entity** (or status on repair record):
  - customer info (name, contact, email, phone)
  - claimed model, claimed SN
  - complaint text
  - PO#
  - date submitted
  - source (portal, email, phone, walk-in)
  - status: pending | received | cancelled | expired
  - linked WO key (once received)
  - original vs corrected fields (audit trail)
  - service location key (North/South)

## UI Locations
- **Dashboard widget:** "Expected Arrivals" card showing count + oldest pending
- **Receiving screen:** Full list with search/filter, intake flow
- **Repairs list:** Received scopes show "Source: Portal" or "Source: Walk-in"

## What Gets Scrapped
- `js/batch-receiving.js` — replaced entirely by this flow
- EOD barcode scan workflow — no longer needed
- Manual email-to-system re-entry — portal DB feeds directly

## Alerts
- **Overdue Arrival:** If a pending arrival hasn't been received after 14 days, flag it on the dashboard. Could mean lost in transit — triggers follow-up with customer.
- **Auto-Expire:** Pending arrivals expire after 30 days with no action. Moved to "Expired" status, still searchable but off the active queue.

## Open Questions (All Resolved)
1. ~~EOD scan~~ → Eliminated. Real-time receiving.
2. ~~Portal emails~~ → Pull from TSIPortal DB directly.
3. ~~Auto-expire~~ → 30 days, moved to Expired status.
4. ~~Overdue notifications~~ → 14-day flag on dashboard for follow-up.
