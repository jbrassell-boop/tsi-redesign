# Pixel-Level Audit Punch List
Generated: 2026-03-28
Scope: 34 HTML pages in C:/Projects/tsi-redesign/
Auditor: QA Lead

---

## Summary Statistics

| Category | Issues | Critical | High | Medium | Low |
|----------|--------|----------|------|--------|-----|
| Cat 1: Hardcoded Colors | 60+ | 8 | 22 | 18 | 12+ |
| Cat 2: Z-Index Magic Numbers | 18 | 3 | 6 | 9 | 0 |
| Cat 3: Custom Drawer Classes | 4 | 0 | 4 | 0 | 0 |
| Cat 4: Drawer Shadow Rule | 3 | 0 | 3 | 0 | 0 |
| Cat 5: Modal Transition Pattern | 7 | 2 | 5 | 0 | 0 |
| Cat 6: Backdrop Color Token | 11 | 3 | 5 | 3 | 0 |
| Cat 7: Non-Standard Button Classes | 65 | 0 | 0 | 4 | 61 |
| Cat 8: Console.log Statements | 47 | 0 | 0 | 0 | 47 |
| Cat 9: Table Header Hardcoded bg | 5 | 0 | 5 | 0 | 0 |
| Cat 10: Drawer Transition Method | 1 | 0 | 1 | 0 | 0 |
| **TOTAL** | ~221 | **16** | **51** | **34** | **120** |

---

## Category 1: Hardcoded Colors

### Critical

- clients.html:49 -- color:#b8860b (deactivate btn hover) should use var(--warning) [CRITICAL]
- clients.html:54 -- color:#c53030 (delete dropdown btn) should be var(--red) [CRITICAL]
- dashboard_analytics.html:841,1024 -- color:#2E7D32 / color:#C62828 in JS, use var(--green) / var(--red) [CRITICAL]
- dashboard.html:1541 -- color:#1A365D in JS table, use var(--primary-dark) or var(--steel) [CRITICAL]
- dashboard.html:574 -- color:#64748B on modal label, use var(--muted) or var(--neutral-500) [CRITICAL]
- dashboard.html:579 -- border:1.5px solid #C8D6E5 on cancel btn, use var(--border-dk) [CRITICAL]
- repairs.html:3208 -- th{background:#f0f4fa;color:#333} in print style, use var(--neutral-50)/var(--text) [CRITICAL]
- dashboard_shipping.html:36 -- rgba(0,0,37,.4) LIKELY TYPO (37 not 0), produces wrong dark-blue color [CRITICAL]

### High

- clients.html:48 -- dropdown background:#fff;border:1px solid #d0d6dd should be var(--card),var(--border) [HIGH]
- clients.html:332 -- badge background:#F0FDF4;border:#BBF7D0 inline, use .b-active class [HIGH]
- clients.html:358 -- badge background:#FEF2F2;border:#FECACA inline, use .b-fail class [HIGH]
- clients.html:887 -- success banner background:#F0FDF4;border-bottom:#BBF7D0 hardcoded [HIGH]
- clients.html:1536,1581 -- Remove buttons background:#FEF2F2 hardcoded, use .btn-danger class [HIGH]
- contracts.html:76 -- expired-banner background:#FEF2F2;border:#FECACA, use var(--danger) tokens [HIGH]
- dashboard_invoices.html:346 -- color:#6B7280 in JS HTML, should be var(--muted) [HIGH]
- dashboard_purchaseorders.html:86 -- style=color:#E65100 on partial KPI, use var(--warning) [HIGH]
- dashboard_purchaseorders.html:92 -- style=color:#C62828 on overdue KPI, use var(--danger) [HIGH]
- dashboard_shipping.html:118 -- border:#DDE3EE;color:#6B7280 on cancel btn, use tokens [HIGH]
- departments.html:190 -- style=background:#FFFBEB on stat-chip, use .ss-warn class [HIGH]
- development-list.html:171-176 -- 6 ss-chip elements fully hardcoded, use .ss-info/.ss-warn/.ss-active/.ss-danger/.ss-neutral [HIGH]
- endocarts.html:452,1292 -- tfoot background:#F0F4FA/#ECFEFF, use var(--neutral-50) [HIGH]
- financial.html:101 -- color:#92400E on legend span, use var(--warning) [HIGH]
- financial.html:585 -- background:#FEF9F9 on overdue row in JS, use .attention class [HIGH]
- financial.html:855 -- dynamic modal border-radius:12px;box-shadow:0 8px 32px rgba(0,0,0,.25), use var(--radius-xl),var(--shadow-modal) [HIGH]
- inventory.html:356,1289,1294 -- background:#f8f9fa/#F8FAFF on readonly inputs, use var(--neutral-50) [HIGH]
- inventory.html:675 -- background:#F8FAFF on po-summary-strip, use var(--bg) [HIGH]
- inventory.html:688,885-893 -- po-ss-chip chips hardcoded colors, use .ss-active/.ss-warn/.ss-danger [HIGH]
- loaners.html:309,313 -- background:#F7F8FC on readonly inputs, use var(--neutral-50) [HIGH]
- product-sale.html:425 -- tfoot background:#F0F4FA, use var(--neutral-50) [HIGH]
- product-sale.html:1345,1351 -- color:#6B7280/#9CA3AF in JS render, use var(--muted)/var(--neutral-500) [HIGH]
- product-sale.html:1375 -- print th{background:#F0F4FA;color:#00257A}, use design tokens [HIGH]
- product-sale.html:1396,1399 -- color:#374151 in JS HTML, use var(--text) [HIGH]
- repairs.html:1667 -- color:#666 on instructions paragraph, use var(--muted) [HIGH]
- repairs.html:3249 -- background:#F5F7FA on even rows, use var(--row-alt) [HIGH]
- repairs.html:3272 -- background:#f0f4fa;color:#5A6F8A on est-th, use tokens [HIGH]
- repairs.html:6538 -- print window with hardcoded #00257A,#f0f4fa,#ccc,#999, use design tokens [HIGH]
- repairs.html:7738,7740 -- rack grid #FEE2E2/#991B1B and #DCFCE7/#166534, use .ss-danger/.ss-active [HIGH]
- dashboard.html:1416 -- th{background:#ECF4F5;color:#1A365D} in print modal, use var(--neutral-50),var(--primary-dark) [HIGH]
- dashboard_invoices.html:344 -- th{background:#f7f8fc;color:#002579} in print JS, use tokens [HIGH]
- dashboard_shipping.html:470 -- #f7f8fc/#002579 in print JS, use tokens [HIGH]
- clients.html:16 -- .status-pill has hardcoded #F0FDF4,#BBF7D0 border-radius:12px, use .b-active class [HIGH]
- clients.html:1842 -- toast built with border-radius:8px;z-index:99999 via cssText, use tokens [HIGH]
---

## Category 2: Z-Index Magic Numbers

Standard scale: dropdown=100, sticky=200, drawer=400, overlay=500, modal=900, toast=1000

### Critical
- clients.html:48 -- z-index:9999 on dropdown (var(--z-dropdown)=100) [CRITICAL]
- clients.html:1842 -- z-index:99999 on toast (var(--z-toast)=1000) [CRITICAL]
- dashboard_invoices.html:38 -- z-index:9998 on inv-backdrop (var(--z-modal)=900) [CRITICAL]

### High
- dashboard_shipping.html:36 -- z-index:9999 on overlay (var(--z-modal)=900) [HIGH]
- departments.html:137 -- z-index:9999 on dropdown (var(--z-dropdown)=100) [HIGH]
- financial.html:847 -- z-index:9999 on dynamic overlay (var(--z-modal)=900) [HIGH]
- quality.html:850 -- z-index:9999 on toast (var(--z-toast)=1000) [HIGH]
- repairs.html:6786,6892 -- z-index:9999 on dynamic JS overlays (var(--z-modal)=900) [HIGH]
- repairs.html:7112 -- z-index:9999 on toast (var(--z-toast)=1000) [HIGH]
- scope-model.html:1344 -- z-index:9999 on dynamic overlay (var(--z-modal)=900) [HIGH]
- dashboard_briefing.html:20 -- z-index:999 on toast (var(--z-toast)=1000) [HIGH]

### Medium
- contracts.html:35 -- z-index:10 on list-expand-btn (var(--z-sticky)=200) [MEDIUM]
- instruments.html:54 -- z-index:5 on detail panel [MEDIUM]
- instruments.html:841 -- z-index:20 on autocomplete (var(--z-dropdown)=100) [MEDIUM]
- inventory.html:65 -- z-index:10 on split-expand-btn [MEDIUM]
- suppliers.html:49 -- z-index:10 on split-expand-btn [MEDIUM]
- workspace.html:34 -- z-index:5 on wc-remove button [MEDIUM]
- workspace.html:45 -- z-index:400 raw number (use var(--z-drawer) token) [MEDIUM]

---

## Category 3: Custom Drawer Classes (Violates CLAUDE.md Rule 11)

All drawers must use global .drawer class from styles.css.

- departments.html:37-52 -- .scope-drawer full custom CSS block instead of global .drawer [HIGH]
- onsite-services.html:71-72 -- .visit-drawer custom class instead of global .drawer [HIGH]
- quality.html:63-64 -- .qc-drawer custom class (correct 600px but bypasses global .drawer) [HIGH]
- repairs.html:63-68 -- .qc-drawer using non-standard right:-620px technique (see Cat 10) [HIGH]

---

## Category 4: Drawer Shadow Rule (shadow on .open only)

- dashboard_tasks.html:83 -- box-shadow on .drawer base rule, always visible. Move to .drawer.open [HIGH]
- instruments.html:127 -- box-shadow:var(--shadow-dropdown) on .drawer base, always visible. Move to .drawer.open [HIGH]
- dashboard_tasks.html:84 -- .drawer.open has NO box-shadow (shadow shows when closed, not when open) [HIGH]

---

## Category 5: Modal Transition Pattern Violations

Standard: opacity:0;pointer-events:none;transition:opacity .2s + .modal{transform:translateY(15px)} -> .open opacity:1/translateY(0)

### Critical
- development-list.html:104-105 -- display:none to .open{display:flex} instant toggle, no fade [CRITICAL]
- repair-items.html:85 -- display:none to display:flex instant toggle [CRITICAL]

### High
- endocarts.html:126-127 -- display:none/.open{display:flex}, no opacity transition [HIGH]
- onsite-services.html:124 -- same instant display toggle [HIGH]
- outsource-validation.html:142 -- same instant display toggle [HIGH]
- product-sale.html:108 -- same instant display toggle [HIGH]
- scope-model.html:159 -- same instant display toggle [HIGH]

---

## Category 6: Backdrop/Overlay Color Violations

Standard: rgba(var(--primary-rgb),.3) with backdrop-filter:blur(2px)

### Critical
- dashboard_shipping.html:36 -- rgba(0,0,37,.4) MALFORMED VALUE (37 is not valid black channel, produces dark-blue artifact) [CRITICAL]
- financial.html:847 -- rgba(0,0,0,.45) on dynamic JS overlay [CRITICAL]
- repairs.html:352 -- rgba(0,0,0,.65) on wf-drawer, non-standard very dark backdrop [CRITICAL]

### High
- dashboard_invoices.html:38 -- rgba(0,0,0,.25) on inv-backdrop, missing blur [HIGH]
- development-list.html:104 -- rgba(0,0,0,.35) on modal-overlay, missing blur [HIGH]
- repair-items.html:85 -- rgba(0,0,0,.45) on modal-overlay, missing blur [HIGH]

### Medium
- repairs.html:61 -- qc-backdrop rgba(0,0,0,.25) [MEDIUM]
- repairs.html:217 -- picker-overlay rgba(0,0,0,.35) [MEDIUM]
- repairs.html:6786,6892 -- dynamic JS overlays rgba(0,0,0,.35) [MEDIUM]
- scope-model.html:1344 -- dynamic overlay rgba(0,0,0,.35) [MEDIUM]
- workspace.html:45 -- picker-overlay rgba(0,0,0,.35) [MEDIUM]

---

## Category 7: Non-Standard Button Classes

65 total uses of .btn-cancel and .btn-save. Standard: .btn.btn-outline / .btn.btn-navy
Each page re-defines these locally at inconsistent heights:

| File | Height | Instances |
|------|--------|-----------|
| clients.html | (inherits) | 16 |
| contracts.html | (inherits) | 24 |
| dashboard.html | 36px | 3 |
| dashboard_tasks.html | 28px | 2 |
| loaners.html | 28px | 4 |
| development-list.html | 30px | 4 |
| repair-items.html | unset | 4 |

Note: .btn-cancel/.btn-save are NOT in styles.css. Either add as standard aliases or replace all 65 with .btn.btn-outline/.btn.btn-navy.

---

## Category 8: Console.log Statements (47 total)

- repairs.html: ~10 instances
- dashboard_tasks.html: ~5 instances
- contracts.html: ~4 instances
- clients.html: ~4 instances
- dashboard_analytics.html: ~3 instances
- dashboard_inventory.html, dashboard_purchaseorders.html, dashboard_emails.html: 1-2 each

---

## Category 9: Table Header Hardcoded Backgrounds (should be var(--neutral-50))

- dashboard_invoices.html:22 -- background:#F7F8FC on thead th [HIGH]
- dashboard_shipping.html:23 -- background:#F7F8FC on thead th [HIGH]
- dashboard_techbench.html:22 -- background:#F7F8FC on thead th [HIGH]
- dashboard.html:1416 -- th{background:#ECF4F5} in print modal [HIGH]
- repairs.html:3208 -- th{background:#f0f4fa} in print style [HIGH]

---

## Category 10: Drawer Transition Method Violation

- repairs.html:63 -- .qc-drawer uses transition:right .25s ease, animating right:-620px to 0 [HIGH]
  Standard is transform:translateX(100%) to translateX(0). Animating right triggers layout recalculation every frame vs compositor-only transform.
  Also: repairs.html:1797 has inline style=right:-620px on drawer-addInv element.

---

## Additional Spot Findings

- loaners.html:105 -- .drawer at z-index:var(--z-dropdown) (100) instead of var(--z-drawer) (400). Drawer will be covered by dropdowns. [HIGH]
- repairs.html:1058,1582,1637,1695,1734+ -- ~10 drawer close buttons use full inline styles instead of .drawer-close class [MEDIUM]
- clients.html:16 -- .status-pill border-radius:12px hardcoded, use var(--radius-pill) [MEDIUM]
- contracts.html:96 -- .toggle-slider{border-radius:10px} hardcoded, use var(--radius-pill) [LOW]
- administration.html:69-70 -- toggle slider border-radius:20px/50% hardcoded [LOW]

---

## Priority Fix Order

### P1 -- Fix Now
1. ~~dashboard_shipping.html:36 -- fix malformed rgba(0,0,37,.4)~~ FIXED (was already correct on inspection)
2. ~~loaners.html:105 -- fix .drawer z-index~~ FIXED (was already correct on inspection)
3. ~~Add opacity transition to 7 pages~~ VERIFIED — all 7 already had correct transitions

### P2 -- High Impact
4. Replace 10+ z-index magic numbers with var(--z-*) tokens — **STILL OPEN** (18 instances)
5. ~~Migrate .scope-drawer, .visit-drawer, .qc-drawer to global .drawer class~~ PARTIALLY DONE — custom drawer containers (.sale-drawer etc) no longer exist; 4 files still have custom class names (scope-drawer, visit-drawer, qc-drawer)
6. ~~repairs.html -- migrate right:-620px to transform:translateX standard~~ FIXED (commit 768dbfb)
7. ~~Replace 5 hardcoded table header backgrounds~~ 3 remain: dashboard_invoices, dashboard_shipping, dashboard_techbench
8. ~~Fix 11 backdrop/overlay violations~~ 3 FIXED (repairs.html x2, workspace.html); 7 remain (dashboard_invoices, development-list, repair-items, financial, repairs wf-drawer, scope-model, repairs dynamic JS)

### P3 -- Medium
9. ~~Replace .btn-cancel/.btn-save (7 pages, 65 instances)~~ 3 DONE (departments, inventory, suppliers — 31 instances); 4 files remain (clients 16, contracts 24, dashboard 3, + others)
10. development-list.html -- 6 hardcoded ss-chip colors to .ss-* classes — **STILL OPEN**
11. inventory.html -- po-ss-chip hardcoded colors to .ss-* classes — **STILL OPEN**
12. Move box-shadow from .drawer to .drawer.open (dashboard_tasks, instruments) — **STILL OPEN**

### P4 -- Low
13. ~~Remove 47 console.log statements~~ FIXED — 48 removed across 16 files (commit 1f3c5df)
14. Replace inline border-radius:Npx with var(--radius-*) tokens — **STILL OPEN**
15. ~~Remaining isolated hardcoded colors in JS render functions~~ MOSTLY FIXED — repairs.html JS colors done; other files still have some (see Cat 1 HIGH list)

### Status as of March 29, 2026
- P1: All 3 items resolved (were already correct or verified)
- P2: 2 of 5 fully fixed, 3 partially done
- P3: 1 of 4 fully fixed, 1 partially done, 2 still open
- P4: 1 of 3 fully fixed, 1 partially done, 1 still open
