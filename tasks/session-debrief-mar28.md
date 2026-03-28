# Session Debrief — March 28, 2026

## What We Built

### 1. Design System — Fully Locked
All 11 design decisions are now written into CLAUDE.md under `## Design System` and are the law.

| # | Decision | Ruling |
|---|----------|--------|
| 1 | Drawer width | 600px universal — no exceptions |
| 2 | Table cell padding | 12px horizontal everywhere |
| 3 | New button | `.btn-navy` "New [Thing]" top-left on every page with create capability |
| 4 | Modal/drawer backdrop | `rgba(var(--primary-rgb),.3)` + `blur(2px)` |
| 5 | Active tab color | `var(--primary)` — not `--blue`, not `--navy`, not hex |
| 6 | Section card borders | `1px solid var(--border-dk)` everywhere |
| 7 | Segmented buttons | Fully rounded pills (`var(--radius-pill)`) |
| 8 | Left panel collapse | Collapsible with navy expand toggle — all master-detail |
| 9 | Section headers | Always panel-style (`.panel-head` pattern) — no inline borderless labels |
| 10 | Hardcoded colors | Dedicated cleanup pass — all 12+ instances in repairs/departments/onsite |
| 11 | Quality modal transitions | Update `quality.html` to `opacity 0.2s` + `translateY(15px)→0` |

CLAUDE.md also has: full design tokens, complete component inventory, 20-item consistency checklist.

---

### 2. CSS Global Pass — Applied to styles.css
Six structural rules applied globally:
- `.drawer` width → 600px
- `th`/`td` padding → 12px horizontal
- Modal/drawer backdrop → primary-rgb + blur
- `.tab.active` → `var(--primary)`
- `.section-card` border → `1px solid var(--border-dk)`
- `.seg-group` border-radius → `var(--radius-pill)`

---

### 3. Drawer Width Fixes — 8 Missed Pages
The CSS pass only fixed `.drawer`. Eight pages used custom class names and needed manual fixes:

| File | Class | Was | Now |
|------|-------|-----|-----|
| administration.html | `.admin-drawer` | 480px | 600px |
| dashboard_invoices.html | `.inv-drawer` | 440px | 600px |
| endocarts.html | `.cart-drawer` | 440px | 600px |
| outsource-validation.html | `.detail-drawer` | 440px | 600px |
| product-sale.html | `.sale-drawer` | 440px | 600px |
| scope-model.html | `.model-drawer` | 440px | 600px |
| workspace.html | `.picker-panel` | 320px | 600px |
| repairs.html | `.qc-drawer` (inline) | 640px | 600px |

**Rule 9 added to CLAUDE.md**: After any global CSS change, always grep all HTML for inline styles and custom class overrides that bypass the global rule.

**Tech debt logged (Rule 11)**: Migrate all custom drawer class names to `.drawer` in a single dedicated pass.

---

### 4. All 19 TSI Controlled Document Forms — Built
All forms are in `forms/`. Every form has:
- Consistent print theme (TSI branding, `@media print`)
- `?wo=WO_NUMBER` URL param pre-fill
- Dual-mode API wiring via `isLocalMode()` → localhost:4000 or BrightLogix
- No `?wo` = blank printable template, no errors

#### Customer-Facing (one-pager goal)
| File | Form # | Description |
|------|--------|-------------|
| form-om07-2-requisition.html | OM07-2 | Quote/approval — customer circles Y/N per item, signs |
| form-om10-1-final-rigid.html | OM10-1 | Final inspection — rigid (outgoing, customer copy) |
| form-om10-2-final-flex.html | OM10-2 | Final inspection — flexible (outgoing, customer copy) |
| form-om10-3-final-camera.html | OM10-3 | Final inspection — camera (outgoing, customer copy) |
| form-om14-1-return-verification.html | OM14-1 | Packing slip / scope return verification |
| form-om03-2-repair-request.html | OM03-2 | Repair request form (intake, customer-facing) |
| form-om17-1-loaner.html | OM17-1 | Loaner agreement (2-page by design, $200/day late fee) |
| form-invoice.html | — | Invoice (#10 window envelope layout) |

#### Internal / Multi-Page OK
| File | Form # | Description |
|------|--------|-------------|
| form-om05-3-di-rigid.html | OM05-3 | D&I Rigid — 33 P/F + defect checkboxes (Nicks/Scratches/Dirt/etc.) |
| form-om05-2-di-camera.html | OM05-2 | D&I Camera — 10 Y/N/NA + 4 coupler items |
| form-om06-2-40day.html | OM06-2 | 40-Day warranty — 9 failure codes, NCP callout for codes 4/5 |
| form-om07-3-bi-flex.html | OM07-3 | Blank inspection — flexible (3-page tech sign-off) |
| form-om07-4-bi-camera.html | OM07-4 | Blank inspection — camera |
| form-om07-5-bi-rigid.html | OM07-5 | Blank inspection — rigid |
| form-om07-6-picklist.html | OM07-6 | Inventory pick list (parts pull sheet) |
| form-om07-8-defect.html | OM07-8 | Defect tracking |
| form-om07-9-amendment.html | OM07-9 | Amendment to repair |
| form-om15-2-update-slip.html | OM15-2 | Update slip — INTERNAL USE ONLY header |
| form-om23-1-ncp.html | OM23-1 | Non-conforming product |

---

### 5. Design Audit Artifacts
- `tasks/audit-component-inventory.md` — Full component catalog across 41 screens
- `tasks/audit-discrepancy-report.md` — 9 actionable inconsistencies found
- `tasks/audit-patterns.md` — 10 repeatable design patterns documented

---

### 6. New CLAUDE.md Rules (7–11)
| # | Rule | Summary |
|---|------|---------|
| 7 | Auto-Spawn Team | Use 3-agent (structure + data + consistency) pattern for new screens |
| 8 | Agent Heartbeat | Check agent inboxes every ~3 min; respawn if dark for 3+ min |
| 9 | Global CSS Fix Verification | After any global CSS change, grep all HTML for per-page overrides |
| 10 | Form Data Wiring Standard | All forms use `?wo=` param, `isLocalMode()`, API endpoints |
| 11 | Drawer Class Naming | New drawers use `.drawer` class; custom-class drawers are tech debt |

---

## What's Pending for Next Session

### HIGH — Feature Work
1. **Wire Print buttons in repair detail drawer** — repairs.html drawer should launch the correct pre-filled form based on scope type (Rigid → om07-5, Flex → om07-3, Camera → om07-4) with `?wo=` param
2. **Hardcoded color cleanup pass** (Decision 10) — grep all `*.html` for hardcoded `#hex` colors in repairs, departments, onsite-services — replace with CSS variables

### MEDIUM — Polish
3. **quality.html modal transitions** (Decision 11) — update to `opacity 0.2s` + `translateY(15px)→0` standard
4. **Drawer class migration** (Rule 11 tech debt) — migrate `.sale-drawer`, `.cart-drawer`, `.admin-drawer`, etc. to use `.drawer` base class + modifier

### LOW — Deferred
5. **HTML structural pass verification** — confirm New buttons, section headers, and left panel collapse were fully QA'd against all 41 screens
6. **forms/ hub page** — add a `forms/index.html` listing all 19 forms for easy access from repair detail

---

## Team / Agent Notes

### What Worked
- **4-parallel audit agents** at session start — fastest way to get a comprehensive audit baseline
- **QA agent with file-read verification** — qa-lead reading files directly instead of trusting ui-lead's claims caught the departments.html repeat issue
- **Checkpoint batching (max 3 items)** — reduced agent dark time significantly compared to one-big-task prompts

### What Burned Time
- Agents going dark mid-task on large batches (5+ files) — fixed with Rule 8 heartbeat + respawn pattern
- CSS global pass missing custom-class overrides — found manually but added Rule 9 to prevent repeat
- `real-data-seed.json` (500MB) ended up staged in a commit — had to reset and recommit; file is already in `.gitignore` but was picked up by `git add -A` because it was modified

---

## Commit Reference
- **2ce4804** — Main session work (design system, 19 forms, CSS pass, drawer fixes)
- **Pushed to:** https://github.com/jbrassell-boop/tsi-redesign.git `main`
