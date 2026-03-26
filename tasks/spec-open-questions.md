# Consolidated Open Questions — All Specs

**Date:** 2026-03-24
**Purpose:** All open questions from the 15 spec docs, organized for review before developer handoff.
**Action needed:** Joseph answers each question. Answers get fed back to the developer with the specs.

---

## 🔴 Critical — Blocks Architecture Decisions ✅ ALL ANSWERED 2026-03-25

These questions change the database design, API structure, or core workflow logic. **Answer before development starts.**

### Security & Permissions
> **From: User & Security Management (Spec 11)**
> 1. Should technicians be restricted to only see their assigned location's data? Currently any user can switch locations freely.
> ✅ **ANSWER:** Techs do not have access to the cloud app — operations team only. All ops users can freely switch between North and South locations. Service location filter is a UI preference, not a security boundary.

> 2. Soft vs hard permissions: Should permission violations show a "you don't have access" message, or hide the UI entirely? *(Recommended: hide from UI + block at API).*
> ✅ **ANSWER:** Hide entirely. Restricted menu items and features do not render for unauthorized roles.

> 3. Can a user belong to multiple security groups? Current schema is single `lSecurityGroupKey`. If multi-role needed, requires a bridge table.
> ✅ **ANSWER:** Single role per user. No bridge table needed. Current schema is correct.

> 4. Will the production system use Active Directory / SSO, or keep internal authentication?
> ✅ **ANSWER:** Internal authentication — username/password in the app's own database. No AD/SSO.

> **From: Repair Status Workflow (Spec 1)**
> 5. Should manual status changes be restricted by security group? (e.g., only QC can set "Quality Check", only finance can set "Invoiced") — Currently unrestricted.
> ✅ **ANSWER:** Open — any ops user can change any status. No role restrictions on status transitions.

### Financial / Tax
> **From: Invoicing & Credit Holds (Spec 4)**
> 6. Tax rate — 7% is hardcoded. Should it vary by ship-to state? PA vs TN have different rates. Is multi-jurisdiction needed?
> ✅ **ANSWER:** TSI uses **Avalara** for tax calculation, integrated with WinScope. The new app must integrate with Avalara's API. Do not build custom tax logic or hardcode rates — Avalara owns all tax calculation.

> **From: Pricing & Quoting (Spec 9)**
> 7. Parts markup: Are parts billed at cost (`nUnitCost`) or with markup? Is there a different margin for parts vs labor?
> ✅ **ANSWER:** Parts used in repair are not resaleable and are not billed as line items to the customer. Parts cost is internal to TSI's cost of service only.

> 8. Discount logic: Is there volume discount, prompt-pay discount, or contract discount logic beyond pricing categories?
> ✅ **ANSWER:** Two additional discount mechanisms: (1) **Discount %** — set at client or department level, auto-transfers to the work order. (2) **Model CAP** — negotiated per-model price caps at the department level (27K records in tblMaxCharge). Both flow through to invoice calculation.

### Data Scale & Performance
> **From: Search & Filtering (Spec 15)**
> 9. Server-side search: With 11K+ repair records, should the developer build server-side search/pagination from the start, or is client-side acceptable for the expected user count?
> ✅ **ANSWER:** Client-side first is acceptable. Maximum ~12 concurrent users. Revisit server-side pagination if performance degrades post-launch.

### TAT Calculation
> **From: Repair Status Workflow (Spec 1) + Reporting (Spec 13)**
> 10. Business days vs calendar days for TAT? Current implementation mixes both. Pick one standard.
> ✅ **ANSWER:** **Business days.** TAT excludes weekends and holidays. Holiday calendar is managed in the Admin menu. All TAT calculations and SLA comparisons use business days consistently.

---

## 🟡 Important — Affects Feature Behavior ✅ ALL ANSWERED 2026-03-25

These questions define how features work but don't block the foundation from being built.

### Repair Workflow
> **From: Repair Status Workflow (Spec 1)**
> 11. Outsourced repair return: When a supplier returns a repaired scope, does it go back to "Waiting on Inspection" for incoming QC, or skip to a later status?
> ✅ **ANSWER:** Returns to QC / outgoing inspection status — not incoming. TSI verifies vendor work before shipping back to the customer.

> 12. Batch status change: Should there be a whitelist of statuses allowed for batch changes? (e.g., never batch-change to "Shipped")
> ✅ **ANSWER:** Status changes are primarily **event-driven** — triggered by system actions (form prints, invoicing, shipping), not manual updates. Example: invoicing auto-advances status to Shipped. Minimize manual status touching. Batch manual status change is low priority. Developer must map every status transition to its triggering event.

> 13. Cart-specific statuses (ID:16,17,20,22): Are these only for endocart repairs (`sRigidOrFlexible = 'C'`)? Should the system enforce that?
> ✅ **ANSWER:** EndoCart is currently misclassified as "Flexible." **EndoCart must be split out as its own instrument type** (not Rigid, not Flexible). Cart-specific statuses then scope exclusively to EndoCart repairs. This is a schema decision required from day one.

### Shipping
> **From: Shipping & Logistics (Spec 10)**
> 14. Invoice before ship? Should shipment require an invoice first? Currently no enforcement.
> ✅ **ANSWER:** Ship before invoice is the correct workflow. TSI generates UPS label first (via **UPS WorldShip API integration**), tracking number returns to the system, then invoice is generated so tracking info appears on it. No enforcement blocking ship before invoice. UPS WorldShip integration is a required integration.

> 15. Scheduled ship statuses (10, 12, 13): Should these be implemented for advance ship planning, or are they legacy/unused?
> ✅ **ANSWER:** Active and customer-facing — these statuses display on the client portal to show ETA and "shipping soon/now" status. Must be fully implemented.

> 16. Return shipping (RMA): Is there an RMA number system needed? Currently just a tracking number on inbound.
> ✅ **ANSWER:** Tracking number only. No RMA number system — customers ship in and TSI matches on arrival.

> 17. International shipping: Any international customers? Customs/export documentation needed?
> ✅ **ANSWER:** Domestic US only. No international shipping needed.

### Contracts
> **From: Contract Management (Spec 3)**
> 18. Shared Risk percentages: Where is the split ratio stored? (e.g., "TSI absorbs 30%, client pays 70%")
> ✅ **ANSWER:** Now called **Performance** (not "Shared Risk"). Metric is consumption-based — what the client would have paid FFS vs. contracted value. Threshold is **125% of contract value** (expense multiplier > 1.25). No stored split ratio — it's a calculated comparison. Update all spec language: "Shared Risk" → "Performance."

> 19. Service plan terms: What are the actual plan tiers (`lServicePlanTermKey`) and what do they include?
> ✅ **ANSWER:** Exactly **two contract tiers**: (1) **Performance** — 125% coverage limit, fee-for-service above limit, unused coverage → credits (60% cap, 24-month expiry), consumption alerts at 50/75/100/110%. (2) **Preferred** — all-inclusive, no cap, one flat fee covers everything, priority scheduling, no consumption tracking. `lTermMonths` is contract duration in months (12/24/36) — not a tier. Templates: `TSI_CSA_Performance_Template_v8_3.docx` and `TSI_CSA_Preferred_Template_v8_3.docx`.

> 20. Portal consumption visibility: `bShowConsumptionOnPortal` — is the client portal a future feature or existing?
> ✅ **ANSWER:** Client portal exists today in TSIPortal. Must be carried forward. `bShowConsumptionOnPortal` is active for Performance contract customers.

> 21. Commission calculation: How are commissions calculated and when are they paid?
> ✅ **ANSWER:** Tiered % of **collected revenue** (not invoiced), paid **quarterly**. Structure: Base Rate (flat %) + Bonus Tier 1/2/3 (escalating % at revenue thresholds). Rates are date-ranged (historical preserved). Rate Overrides per rep and Contract Overrides per contract are both supported. Already tracked in WinScope — must replicate in cloud app.

> 22. Affiliate contracts: How do affiliates share or inherit contract coverage?
> ✅ **ANSWER:** Flat assignment via **price lists** — create one HCA price list, assign all departments to it, they all get that pricing. **Sub Groups** add a grouping indicator field that enables filtering/reporting by sub-group (e.g., HCA West vs HCA East) without separate contracts.

### Loaners
> **From: Loaner Management (Spec 5)**
> 23. Loaner charges: Does the customer get billed for loaner usage? Per-day or flat fee? How does it appear on invoice?
> ✅ **ANSWER:** Situational — standard loaners during repair = free. Extended loaners beyond a threshold may be charged. TSI also does **scope rentals** as a separate billable arrangement. System needs billable loaner/rental support with per-day or flat-fee rate field and a free vs. billable flag.

> 24. On-site loaners (`pbOnSiteLoaner`): How does the lifecycle differ from shipped loaners?
> ✅ **ANSWER:** OSLs live permanently at the facility. They are TSI-owned assets included as part of a contract agreement — listed in contract terms. System needs to: (1) flag scopes as OSL, (2) link to the contract they're included under, (3) track as TSI-owned assets at a customer location. Historically a system gap.

> 25. Loaner contracts: How does contract coverage affect loaner billing?
> ✅ **ANSWER:** Loaner usage counts against contract consumption (Performance) when included. Billing only in rare cases of clear user abuse for non-included loaners — exception-based, not routine. System needs a manual "bill this loaner" flag for edge cases.

> 26. Auto-return trigger: When a repair ships, should the system auto-email requesting loaner return?
> ✅ **ANSWER:** Yes — implement auto-email loaner return reminder when repair ships. Sales reps and customers already see loaner status on the portal but an automated reminder on shipment is a welcome addition.

> 27. Multiple loaners per repair: Is it separate loaner trans records or quantity > 1?
> ✅ **ANSWER:** Mixed — separate loaner transaction per scope for different models (each WO gets its own linked record); quantity field when multiple of the same model are sent together.

### Inventory
> **From: Inventory & Parts (Spec 6)**
> 28. When does quantity decrement? At pick time, repair completion, or invoice? This is the critical missing piece.
> ✅ **ANSWER:** At **closeout/invoicing** — when parts are entered into WinScope at repair closeout, they are immediately deducted from stock.

> 29. Lot tracking: Is FIFO/LIFO required? Any expiration dates on parts?
> ✅ **ANSWER:** Lot numbers tracked — yes. Expiration dates — epoxies only (existing legacy expiration report must be carried forward). Cost method — average cost sufficient. No FIFO/LIFO required.

> 30. Inventory receiving: Is there a PO/receiving workflow for incoming stock?
> ✅ **ANSWER:** Yes — formal PO → receive → stock workflow. Parts received against a PO number. Full receiving workflow required in cloud app.

> 31. North/South consolidation: When is the regional inventory merge happening?
> ✅ **ANSWER:** Merge must happen before the cloud app goes live. Developer builds for a single unified inventory pool — no regional inventory separation needed.

> 32. Cost method: Average cost, FIFO cost, or standard cost for material cost roll-up?
> ✅ **ANSWER:** Average cost sufficient. (See Q29.)

### Pricing
> **From: Pricing & Quoting (Spec 9)**
> 33. Pricing category lock: Should it be locked once the repair is created, or update if the department's category changes mid-repair?
> ✅ **ANSWER:** Stays live/current during repair lifecycle. **Locks at invoice** — once a WO is invoiced, pricing snapshot is frozen. No retroactive changes to consumption or invoice totals after invoicing.

> 34. Max charge enforcement: Currently a warning. Should it ever block invoice generation if exceeded without amendment?
> ✅ **ANSWER:** Warning + **Max Charge Override** at the WO level. When a repair exceeds the model CAP, show alert but allow override with explicit entry. No hard block on invoice generation — the override field is the documented approval mechanism.

> 35. Multi-tier pricing: Does `nUnitCost` vary by pricing category, or is it one base cost with adjustments elsewhere?
> ✅ **ANSWER:** Pricing is determined by the **pricing list assigned to the WO**. Different pricing lists = different prices for the same repair item. `nUnitCost` is TSI's internal cost; customer-facing price comes from the pricing list on the WO.

### Email
> **From: Email & Notifications (Spec 12)**
> 36. SMTP integration: What email service? SMTP relay, SendGrid, SES?
> ✅ **ANSWER:** Microsoft Exchange / Office 365 SMTP relay.

> 37. Retry policy: How many times to retry failed emails? *(Recommended: 3 retries at 5min/30min/2hr)*
> ✅ **ANSWER:** Legacy `tblEmails` has no retry logic — fire-and-forget only (`dtSentDate` + `bIgnore`). Build retry from scratch in cloud app: 3 retries at 5 min → 30 min → 2 hr, then mark Failed. New schema needs `nRetryCount`, `dtLastAttempt`, `sStatus` (Pending/Sent/Failed).

> 38. Email opt-out: Can contacts opt out of certain email types?
> ✅ **ANSWER:** Yes — per-type opt-out. Contacts can opt out of specific email categories independently. Schema needs opt-out preference table linked to contacts by email type.

> 39. Scheduled sends: Should overdue reminders run on a cron schedule or be triggered manually?
> ✅ **ANSWER:** Manual trigger for now — matches current behavior. Cron/scheduled sends are a Phase 2 enhancement.

> 40. Email body storage: Store full HTML in queue for audit, or generate at send time?
> ✅ **ANSWER:** Store full HTML at queue time — matches legacy behavior (`sBody`/`imgEmail`/`bIsBodyHTML` in `tblEmails`). Correct for regulated medical device environment — audit trail shows exactly what was sent.

---

## 🟢 Nice-to-Have — UX & Polish ✅ ALL ANSWERED 2026-03-25

These questions affect user experience but can be deferred or decided during development.

### Invoicing Gaps
> **From: Invoicing & Credit Holds (Spec 4)**
> 41. Hold audit trail: No logging of when holds are placed/released or by whom — should this be added?
> ✅ **ANSWER:** Yes — log all hold activity with timestamp and user (placed/released).

> 42. Bypass logging: `bByPassOnHold` override reason not tracked — add who/when/why?
> ✅ **ANSWER:** Yes — user must enter a reason when bypassing a credit hold. Full who/when/why audit trail required.

> 43. Discount justification: Should there be a field for why a discount was applied?
> ✅ **ANSWER:** Yes — required field. Cannot apply a discount without entering a justification.

> 44. Hold release triggers: Should holds auto-release when payment clears AR below limit?
> ✅ **ANSWER:** Yes — auto-release on payment confirmation. When payment clears (triggered by payment received notification), system automatically removes hold and enables shipping. Needs a payment event trigger feeding into hold release logic.

### Flags & Alerts
> **From: Flags & Smart Alerts (Spec 8)**
> 45. No create UI for flags: Should there be a form to create new flags from the dashboard?
> ✅ **ANSWER:** Yes — all flags are manual in the current system. A flag creation form is required. Smart alerts are separate from manually created flags.

> 46. No resolve UI: `bResolved` exists but no button — add resolve functionality?
> ✅ **ANSWER:** Yes — resolve button required. Flags stay in history, marked resolved with timestamp and user. Full flag audit trail preserved.

> 47. Alert persistence: Dismissals are session-only. Should dismissed alerts stay dismissed?
> ✅ **ANSWER:** Session only — alerts reset on each login. Staff sees active alerts every day until resolved.

> 48. Hardcoded thresholds: Should 40 days, 180 days, 20% damage rate, etc. be configurable?
> ✅ **ANSWER:** Yes — configurable from admin settings. Requires a **Goals/Thresholds table** in the schema to store configurable business rule values. Also serves as foundation for future KPI goal-setting per client or system-wide.

### Tech Bench
> **From: Tech Bench Dashboard (Spec 14)**
> 49–52. All Tech Bench questions deferred.
> ✅ **ANSWER:** Techs do not have system access yet. Entire Tech Bench section deferred until tech-facing rollout is planned.

### Reporting
> **From: Reporting & Analytics (Spec 13)**
> 53. Scheduled reports: Auto-generate and email reports on a schedule?
> ✅ **ANSWER:** Yes — reports can be configured to auto-generate and email on a schedule. Ties into the email queue system.

> 54. Export format: Is CSV sufficient, or need formatted Excel (.xlsx)?
> ✅ **ANSWER:** Formatted .xlsx — styled headers, totals rows, professional output. Not raw CSV.

> 55. Chart visualizations: Add trend charts (TAT over time, revenue by month)?
> ✅ **ANSWER:** No charts — data tables only. Users can chart in Excel from the .xlsx export.

> 56. Custom date ranges: Support arbitrary date range selection beyond MTD/QTD/YTD?
> ✅ **ANSWER:** Default to a date range (e.g., MTD or last 30 days), with full custom start/end date override available.

> 57. Saved filter presets: Let users save filter combos?
> ✅ **ANSWER:** No — filters reset each session.

### Search
> **From: Search & Filtering (Spec 15)**
> 58. Saved searches: Should users be able to save filter presets?
> ✅ **ANSWER:** No saved searches.

> 59. Advanced search: Field-specific operators (equals, contains, greater than, date range)?
> ✅ **ANSWER:** Yes — advanced search with field-specific operators (equals, contains, greater than, date range) required.

> 60. URL state: Encode filter state in URL for bookmarking/sharing?
> ✅ **ANSWER:** No — filters are in-memory only.

> 61. Global search: Single search bar across repairs, clients, departments, scopes?
> ✅ **ANSWER:** Already handled by Work Orders search in the top banner. No additional global search needed.

### Shipping Details
> **From: Shipping & Logistics (Spec 10)**
> 62. Tracking number validation: Validate format against carrier (FedEx = 12-15 digits, UPS = 1Z...)?
> ✅ **ANSWER:** Yes — validate format by carrier at entry (UPS = starts with 1Z, FedEx = 12–15 digits).

> 63. Shipping cost override: Can shipping cost differ from delivery method's default?
> ✅ **ANSWER:** Two-stage shipping cost — default rate captured at WO creation, then **actual cost loaded when UPS/FedEx bills drop**. System needs both a default/estimated cost field and an actual cost field updated during carrier bill reconciliation. This is a billing reconciliation workflow, not a simple override.

> 64. South facility address: Nashville facility address not fully defined — need complete address for packing slips.
> ✅ **ANSWER:** Total Scope, Inc. / 601 Grassmere Park Ste 2 / Nashville, TN 37211

### User Security Details
> **From: User & Security Management (Spec 11)**
> 65. Sales rep data isolation: Should reps only see their own clients, or all clients with their rep highlighted?
> ✅ **ANSWER:** Sales reps do not have system access — deferred entirely. No rep-specific data isolation needed.

> 66. Password policy: Length, complexity, expiration requirements?
> ✅ **ANSWER:** Simple — reasonable minimum length, no forced expiration, no complex character requirements.
> 66. Password policy: Length, complexity, expiration requirements?

---

## Summary

| Priority | Count | Status |
|----------|-------|--------|
| 🔴 Critical | 10 | ✅ All answered 2026-03-25 |
| 🟡 Important | 30 | ✅ All answered 2026-03-25 |
| 🟢 Nice-to-Have | 26 | ✅ All answered 2026-03-25 |
| **Total** | **66** | ✅ Complete — ready for developer handoff |

---

## Key New Discoveries (2026-03-25 Session)

These items were not in the original specs and must be communicated to the developer:

| Discovery | Impact |
|---|---|
| **Avalara** tax integration | Required third-party API — no custom tax logic |
| **UPS WorldShip API** | Label generation + tracking number callback |
| **EndoCart = own instrument type** | Schema change — not Rigid or Flexible |
| **Status changes are event-driven** | Developer maps triggers to system actions, not a manual picker |
| **Two contract tiers only** | Performance + Preferred (templates exist as docx) |
| **Commission on collected revenue, quarterly** | Needs payment tracking, not just invoiced |
| **Inventory merge before go-live** | Single unified pool, no regional split needed |
| **Pricing locks at invoice** | Not at WO creation |
| **Email retry built from scratch** | Legacy has none — add nRetryCount, dtLastAttempt, sStatus |
| **Per-type email opt-out** | Opt-out preference table needed linked to contacts |
| **Goals/Thresholds table needed** | For configurable alert thresholds + future KPI goals |
| **Shipping = two-stage cost** | Default at creation, actual loaded from carrier bills |
| **Auto-release holds on payment** | Payment event trigger → hold release → enable shipping |
| **Techs + Sales Reps have no system access** | Tech Bench and rep isolation deferred entirely |
| **Nashville address** | 601 Grassmere Park Ste 2, Nashville, TN 37211 |

---

## How To Use This Document

Hand this doc + the 17 specs to the developer. All 66 questions are answered. Developer can start Phase 1 immediately.
