# Repairs Screen Stress Test Results
**Date:** 2026-03-28
**Tested by:** Automated Agent Team (load-agent, break-agent, audit-agent)

## Executive Summary

**Recommendation: CONDITIONAL PASS** — The repairs screen is a sophisticated flow-state cockpit that handles 60-75 concurrent repairs well. Design system compliance is strong (16/20 checklist items pass). UX is excellent at 1.6 avg clicks for common tasks with comprehensive keyboard shortcuts. However, **1 P1 bug, 12 P2 issues, and 7 P3 issues** must be triaged before production use. The P1 (silent data loss on navigate-away) and the P2 XSS/race-condition cluster are the primary concerns.

**Key Metrics:**
- Design System Checklist: **16/20 PASS**, 4 partial failures
- Hardcoded hex colors: **~40 instances** (mostly in estimate/workflow form styles)
- Bugs found: **1 P1, 12 P2, 7 P3, 3 P4**
- Volume capacity: 60-75 repairs (proven), ~200-300 ceiling before DOM jank
- UX click efficiency: 1.6 avg clicks for top 10 tasks (excellent)
- Keyboard shortcuts: 10+ shortcuts, full queue navigation via J/K
- Cross-screen deviations: 4 notable vs clients.html / product-sale.html

---

## 1. Bugs Found

### P1 — Critical (Must Fix Immediately)

| ID | Category | Description | File:Line | Impact |
|----|----------|-------------|-----------|--------|
| B-01 | State | **No `beforeunload` dirty-state warning.** No `window.onbeforeunload` handler exists. If `_dirty === true` and user navigates away or closes tab, all unsaved changes since last autosave are silently lost. localStorage persistence mitigates in demo mode, but live mode loses data. | repairs.html (missing) | Silent data loss |

### P2 — Functional Break (Should Fix Before Ship)

| ID | Category | Description | File:Line |
|----|----------|-------------|-----------|
| B-02 | Race | **`loadRepair()` has no concurrent-call guard.** Rapid-clicking queue rows fires multiple calls. No abort controller or loading key guard. Last response wins, but intermediate responses can corrupt `_currentRepair` or show/hide skeleton incorrectly. | repairs.html:5208 |
| B-03 | Race | **`autoSave()` + `loadRepair()` race condition.** `markDirty()` sets 1500ms autosave timer. If user clicks different queue row before timer fires, `autoSave()` fires with OLD `_currentRepair` key but reads form fields populated with NEW repair's data. Saves wrong data to wrong record. | repairs.html:6427-6449 |
| B-04 | XSS | **`renderRepairItems()` inserts item descriptions unescaped into innerHTML.** `item.sTSICode`, `item.sItemDescription`, `item.sDescription`, `item.sRepairItem`, `item.sComments` are all raw. A malicious description like `<img src=x onerror=alert(1)>` would execute. | repairs.html:5967-5968 |
| B-05 | XSS | **`populateLineItemsTab()` inserts item names/descriptions unescaped.** Same pattern as B-04 in the Line Items tab, including into `contenteditable` spans. | repairs.html:10240-10241 |
| B-06 | XSS | **`populateNotesTab()` inserts tech names and messages unescaped.** `e.sUserName` and `e.mTranComments` injected raw into innerHTML. `addTechNote()` escapes body text but tech name remains raw. | repairs.html:10279-10289 |
| B-07 | XSS | **`renderFlags()` inserts flag text unescaped into innerHTML.** `f.psFlag || f.sFlag || f.sFlagDescription` inserted raw into `.flag-chip` spans. | repairs.html:5312 |
| B-08 | XSS | **`populateFormDrawer()` inserts client/WO/serial/model unescaped.** Form drawer headers insert all fields raw via template literals. | repairs.html:4065-4068 |
| B-09 | State | **No dirty-state check when switching repairs.** Clicking a different queue row calls `loadRepair()` immediately with no "You have unsaved changes" prompt. Autosave timer may or may not have fired. | repairs.html:5208 |
| B-10 | Layout | **Zero responsive breakpoints.** No `@media` queries except `@media print`. At tablet width (768px), 300px fixed queue panel + detail panel squeezes content to ~468px. 3-column grids become unusable. | repairs.html (entire file) |
| B-11 | A11y | **Drawers do NOT trap focus.** No focus management on drawer open. Tab key cycles through elements behind the drawer. No initial focus set to first interactive element. | repairs.html:8983 |
| B-12 | A11y | **Tabs not keyboard-navigable.** Tab bar uses `<div class="tab">` with no `tabindex`, no `role="tab"`, no `aria-selected`. Only mouse clicks work. | repairs.html:1119-1129 |
| B-13 | Edge | **`contenteditable` complaint field accepts pasted rich HTML.** Pasted bold, images, etc. stored as-is. When read back for form drawers or PDF generation, could inject unexpected markup. | repairs.html:1276 |

### P3 — Visual / Polish

| ID | Category | Description | File:Line |
|----|----------|-------------|-----------|
| B-14 | State | **URL state not synced with selected repair.** Selecting a repair doesn't update URL hash/params. Browser back/forward has no effect. Refresh loses selection. | repairs.html (missing) |
| B-15 | State | **Multi-tab conflict — no optimistic locking.** Opening same repair in two tabs, both modify — last save wins silently. No version check. | repairs.html (missing) |
| B-16 | Race | **`loadItemCatalog()` has no debounce guard.** Rapid clicks on Flexible/Rigid segmented buttons fire duplicate API calls. | repairs.html:6274 |
| B-17 | A11y | **Zero ARIA attributes in entire file.** No `role=`, no `aria-` attributes in 10,500+ lines. Screen readers have no semantic understanding. | repairs.html (entire file) |
| B-18 | A11y | **'a' key advances status without confirmation.** Pressing 'a' while not editing immediately advances repair to next workflow stage — destructive, no undo, no confirmation. | repairs.html:10115 |
| B-19 | Validation | **No maxlength on most text inputs.** Complaint `contenteditable`, scope notes, and most `<input>` fields accept unlimited text. Only a few fields (`fBillState`) have limits. | repairs.html (various) |
| B-20 | Validation | **Financial fields accept non-numeric input.** `fMaxOverride`, `fOutCost`, `fShipCost`, `fDiscount` are plain text inputs (not `type="number"`). | repairs.html (various) |

### P4 — Info / Tech Debt

| ID | Category | Description | File:Line |
|----|----------|-------------|-----------|
| B-21 | CSS | **Drawer class override uses `top:0` and `right` animation** instead of shared `.drawer` from styles.css (`top:64px`, `transform:translateX(100%)`). Drawers cover topbar. | repairs.html:62 |
| B-22 | CSS | **Section-card border uses `var(--border)` instead of `var(--border-dk)`** per design system spec. | repairs.html:135 |
| B-23 | CSS | **`#newOrderMenu.open` CSS rule duplicated** in both styles.css:207 and repairs.html:10. | repairs.html:10 |

---

## 2. Performance Concerns

| Concern | Severity | Evidence | Impact |
|---------|----------|----------|--------|
| **innerHTML queue rebuild** | Medium | `renderQueue()` (line 9660) builds entire queue HTML via string concat + `innerHTML` on every filter/search/sort. At 75 repairs (~1,500 DOM nodes), causes full DOM teardown/rebuild. | Fine at 75 repairs. At 200+, noticeable jank. No virtual scrolling or DOM recycling. |
| **Repair list hard cap at 100** | Medium | `renderRepairList()` (line 8116) applies `.slice(0, 100)` — no "load more" or pagination UI. Repairs beyond 100 silently hidden. Queue panel renders ALL repairs. | Inconsistent behavior between queue and list. Live data with 500+ repairs loses visibility. |
| **Large inline `<style>` block** | Low | ~865 lines of CSS in `<style>` tag (lines 8-866). | Not cacheable like external CSS. Consider extracting to `repairs.css`. |
| **10+ drawers pre-rendered in DOM** | Low | QC, slips, amend, defects, NCP, addInv, fortyDay, techs, + 5 workflow form drawers always in DOM. | Adds ~2,000 DOM nodes. Acceptable for desktop app. |
| **O(n log n) gap computation** | Low | `_computeGap` (line 5451) filters + sorts `_repairListData` by serial number on every repair load. | Fine at 75, fine at 500, concern at 5,000+. |
| **localStorage on every field change** | Low | `persistRepairState()` called on every `markDirty()`. Synchronous JSON serialize + localStorage write. | Typical objects <10KB — acceptable. |

**Performance strengths:**
- Parallel loading of 13 lookup tables via `Promise.all` (line 9382)
- Debounced queue search at 150ms (line 9595)
- Pre-computed filter counts cached in `_queueFilterCounts` (line 10043)
- Loading skeleton shown during repair load (line 5214)
- Sub-tab data loaded in parallel via `Promise.all` (line 5244)

---

## 3. Design System Consistency

### Checklist Results: 16/20 PASS

| # | Check | Result | Details |
|---|-------|--------|---------|
| 1 | CSS variables only | **PARTIAL FAIL** | ~40 hardcoded hex colors. `#00257A` (18x in estimate form), `#9DABE2` (3x), `#BFDBFE` (5x badges), queue status badges (`#0369A1`, `#C2410C`, `#B45309`, `#15803D`, `#6D28D9`), plus misc in print/workflow code. |
| 2 | Drawer width | **PASS** | All drawers 600px. |
| 3 | Table headers | **PASS** | `var(--neutral-50)` bg, sticky, uppercase, sortable across all tables. |
| 4 | Table padding | **PASS** | TH: 5-10px vert, 8-14px horiz. TD: 4-10px vert, 8-14px horiz. Within spec. |
| 5 | Row alternation | **PASS** | `tr:nth-child(even)` uses `var(--row-alt)`. Hover uses `var(--primary-light)`. |
| 6 | Button variants | **PASS** | `.btn-navy`, `.btn-outline`, `.btn-danger` used correctly. |
| 7 | Badge colors | **PASS** | Semantic `.ss-*` classes used correctly throughout. |
| 8 | Tab active state | **PASS** | `color:var(--primary)`, 2px navy underline, weight 600, margin-bottom -1px. |
| 9 | Modal transitions | **PASS** | `opacity .2s` overlay + `translateY(15px)` body. |
| 10 | Backdrop | **PASS** | `rgba(var(--primary-rgb),.3)` + `blur(2px)`. QC uses rgba black variant — minor. |
| 11 | Form inputs | **PASS** | Standard `.inp` 40px height, `.field input` 30px compact variant. |
| 12 | Panel structure | **PASS** | `.section-card` + `.section-head` + `.section-body` used consistently. |
| 13 | Drawer section cards | **PARTIAL FAIL** | Border uses `var(--border)` instead of spec `var(--border-dk)`. |
| 14 | Toolbar pattern | **PASS** | Queue head has search + filters. Quick Actions bar follows primary-left. |
| 15 | Empty states | **PASS** | All tables/lists have proper empty states with text and icons. |
| 16 | Z-index layers | **PASS** | Follows scale: drawer 900, picker 1100, command 10000, popover 100. |
| 17 | Stat strip | **N/A** | Uses status strip (single-record) not stat strip (list view). Appropriate. |
| 18 | Overflow menu | **PARTIAL FAIL** | Delete button visible in both status strip AND quick actions bar. Spec says destructive actions in overflow `...` dropdown. |
| 19 | Section label typography | **PASS** | 9-10px, uppercase, 600-700 weight, muted, letter-spacing .04-.05em. |
| 20 | Scrollbar styling | **PASS** | 6px webkit scrollbars. `scrollbar-width:thin` on workflow bar. |

---

## 4. Cross-Screen Consistency

### Repairs vs Clients

| Aspect | repairs.html | clients.html | Deviation |
|--------|-------------|--------------|-----------|
| Drawer animation | `right:-620px` → `right:0` | `transform:translateX(100%)` → `translateX(0)` | **DEVIATION** |
| Tab bar bg | `var(--neutral-50)` (gray) | `var(--card)` (white) | **DEVIATION** |
| Destructive actions | Delete button visible in toolbar | Delete in overflow `...` dropdown | **DEVIATION** |
| Section card borders | `var(--border)` | `1.5px solid var(--border-dk)` | **DEVIATION** |

### Repairs vs Product Sale

| Aspect | repairs.html | product-sale.html | Deviation |
|--------|-------------|-------------------|-----------|
| Drawer header | Custom `.qc-drawer-head` | Shared `.drawer-head` + `.dh-sn`/`.dh-sub` | **DEVIATION** |
| Section card hover | No hover effects | `box-shadow + translateY(-1px)` on hover | **DEVIATION** |
| Toolbar | Custom `quick-actions` bar | Standard `.toolbar` class | **DEVIATION** |

---

## 5. UX Friction Points

### Click Counts for Top 10 Tasks

| Task | Clicks | Path | Grade |
|------|--------|------|-------|
| Find a specific repair | 1-2 | Queue search OR Ctrl+K command palette | A+ |
| View repair details | 1 | Click repair in queue | A+ |
| Change repair status | 1 | Click status badge → select new status | A+ |
| Add a line item | 2 | "+ Add Item" → select from picker | A |
| Add tech notes | 2 | Notes tab → type + "Add Note" | A |
| Create new work order | 3 | Work Orders → Create New → 4-step wizard | A |
| Print a form | 1 | Click workflow pill | A+ |
| Search by serial number | 1 | Type in queue search (searches SN) | A+ |
| Filter by status | 1 | Click queue filter chip | A+ |
| Export/print the queue | N/A | **No export button exists** | **F** |

**Average (excl. export): 1.6 clicks** — Excellent for a daily-use cockpit.

### Friction Points

1. **No queue export** — Missing CSV/print for repair list. Users cannot export the queue.
2. **Delete button duplicated** — Appears in status strip (line 1014) AND quick actions bar (line 1104).
3. **9 tabs could overwhelm** — Mitigated by `ctx-dimmed` pattern dimming less-used tabs.
4. **Dead `#repairListPanel`** — Original panel hidden via `display:none` (line 880), replaced by split-layout queue. HTML remains in DOM.
5. **Workflow bar always visible** — 9-pill bar shown on all tabs even when irrelevant (Notes, Images).
6. **No status transition validation** — Can advance from Received directly to Invoiced. No checks for required inspection completion, line items before quoting, PO before shipping, or approval before entering repair. Biggest functional gap.

---

## 6. Security

| Finding | Severity | Details |
|---------|----------|---------|
| XSS in detail panel rendering | **P2** | 5 separate functions insert user data unescaped into innerHTML (B-04 through B-08). Queue rendering properly uses `esc()` but detail panel does not follow the same pattern. |
| `contenteditable` accepts rich HTML | **P2** | Complaint field stores arbitrary HTML. If wired to real API, becomes stored XSS vector. |
| No SQL injection risk | None | All API calls through `api.js` use parameterized queries on Express server side. |
| No CSP compatibility | Info | Extensive inline `onclick` handlers + inline `<style>` block would conflict with Content Security Policy headers. Acceptable for internal app. |
| No input validation on numerics | **P3** | Financial fields accept non-numeric text. |

---

## 7. Accessibility

| Finding | Severity | Details |
|---------|----------|---------|
| Drawers don't trap focus | **P2** | Tab key reaches elements behind open drawer. No focus management on open/close. |
| Tabs not keyboard-navigable | **P2** | `<div class="tab">` elements have no `tabindex`, `role="tab"`, or `aria-selected`. |
| Zero ARIA attributes | **P3** | No `role` or `aria-*` in 10,500+ lines. Screen readers have no semantic understanding. |
| No `aria-label` on icon buttons | **P3** | Drawer close buttons use `&times;` with no aria-label. |
| 'a' key advances status without confirmation | **P3** | Destructive keyboard shortcut with no undo. Accidental keypress could advance status. |
| Missing `<label for="">` associations | **P3** | Form fields use `<label>` in wrapper but no `for` attribute linking to input `id`. |
| Keyboard navigation exists | **Good** | Queue rows navigable via J/K, Enter to select. Shortcuts: Q, A, P, I, L, X, B. |

---

## 8. Recommendations

### Must Fix Before Production (P1/P2)

| Priority | Fix | Effort |
|----------|-----|--------|
| **P1** | Add `window.onbeforeunload` handler when `_dirty === true` — prevent silent data loss | Small |
| **P2** | Add loading guard to `loadRepair()` — set `_loadingKey`, ignore if same key already loading, abort previous if different key | Small |
| **P2** | Fix autosave race — cancel autosave timer in `loadRepair()` before switching repairs, or flush save immediately | Small |
| **P2** | Apply `esc()` to all user data in `renderRepairItems()`, `populateLineItemsTab()`, `populateNotesTab()`, `renderFlags()`, `populateFormDrawer()` | Medium |
| **P2** | Add dirty-state check before `loadRepair()` — if `_dirty`, prompt or flush save first | Small |
| **P2** | Sanitize `contenteditable` complaint field — strip HTML on paste or on save | Small |

### Should Fix (P3)

| Priority | Fix | Effort |
|----------|-----|--------|
| **P3** | Add status transition validation — define prerequisite rules per stage | Medium |
| **P3** | Add confirmation to 'a' keyboard shortcut for advancing status | Small |
| **P3** | Add basic responsive breakpoints — collapse queue at 768px, stack grids | Medium |
| **P3** | Replace ~40 hardcoded hex colors with CSS custom properties | Medium |
| **P3** | Fix section-card border to `var(--border-dk)` | Small |
| **P3** | Fix drawer class override — align `top:64px` and use `transform` animation | Small |
| **P3** | Add `maxlength` to text inputs, `type="number"` to financial fields | Small |
| **P3** | Move delete button to overflow menu, remove duplicate | Small |
| **P3** | Add queue export/CSV button | Medium |

### Nice to Have (P4)

| Priority | Fix | Effort |
|----------|-----|--------|
| **P4** | Add focus trapping to drawers | Medium |
| **P4** | Add `tabindex` + `role="tab"` + `aria-selected` to tab bar | Small |
| **P4** | Add ARIA attributes throughout | Large |
| **P4** | Extract inline CSS to `repairs.css` | Small |
| **P4** | Remove dead `#repairListPanel` HTML | Small |
| **P4** | Add repair list pagination UI beyond 100 rows | Medium |
| **P4** | Sync URL state with selected repair | Small |
| **P4** | Use shared `.drawer-head` class instead of custom `.qc-drawer-head` | Small |
| **P4** | Align tab bar bg with other screens (`var(--card)` vs `var(--neutral-50)`) | Small |

---

## Appendix A: Architecture Summary

The repairs screen (`repairs.html`, ~10,200+ lines) is a **flow-state split-panel cockpit**:

- **Left Panel (Queue):** 300px collapsible, filter chips (8 statuses), search (debounced 150ms), sort (4 options), batch mode with checkboxes
- **Right Panel (Detail):** Status strip, 8-stage pipeline, quick actions bar, scope glance card, 9 tabs, 9 workflow pills
- **Drawers (10+):** QC, 40-Day, NCP, Defects, Slips, Amendments, Inventory, Techs, + workflow form drawers (all 600px)
- **NWO Modal:** 4-step wizard (Client → Department → Scope → Intake)
- **Data flow:** `initPage()` loads 13 lookup tables in parallel, then queue → first repair detail

**Mock data volume:** 75 repairs (59 repeat-offender + 16 non-repeat), ~270 line items, ~290 status history entries. Proven capacity: 60-75 concurrent repairs. Ceiling: ~200-300 before innerHTML queue rebuild becomes noticeable.

## Appendix B: Hardcoded Color Inventory

| Color | Count | Location | Suggested Token |
|-------|-------|----------|-----------------|
| `#00257A` | 18 | Estimate form CSS + JS | `--est-navy` |
| `#9DABE2` | 3 | Estimate header | `--est-accent-light` |
| `#BFDBFE` | 5 | Badge borders, queue row | Use existing token |
| `#0369A1` | 1 | `.qs-received` | `--qs-received` |
| `#C2410C` | 1 | `.qs-inspection` | `--qs-inspection` |
| `#B45309` | 2 | `.qs-approval` | `--qs-approval` |
| `#15803D` | 2 | `.qs-repair` | `--qs-repair` |
| `#6D28D9` | 1 | `.qs-shipping` | `--qs-shipping` |
| `#F0F9FF` | 1 | `.qs-received` bg | `--qs-received-bg` |
| `#FFF7ED` | 1 | `.qs-inspection` bg | `--qs-inspection-bg` |
| `#F5F3FF` | 1 | `.qs-shipping` bg | `--qs-shipping-bg` |
| `#BAE6FD` | 1 | `.qs-received` border | `--qs-received-border` |
| `#FED7AA` | 1 | `.qs-inspection` border | `--qs-inspection-border` |
| `#DDD6FE` | 1 | `.qs-shipping` border | `--qs-shipping-border` |
| `#F8F9FA` | 1 | NCP info block | Use `var(--neutral-50)` |
| `#8898AA` | 1 | Print styles | Use `var(--border-dk)` |
| `#E3EAF6` | 1 | Workflow card head (JS) | Use `var(--neutral-50)` |
| `#f0f4fa` | 2 | DI category bg, print | Use `var(--neutral-50)` |
| `#ccc` | 1 | Workflow card border (JS) | Use `var(--border)` |

## Appendix C: Search & Filter Capabilities

| Feature | Implementation | Gap |
|---------|---------------|-----|
| Queue search | Debounced 150ms, searches WO/client/serial/model | No date range filter |
| Repair list search | Debounced 200ms, adds PO number to search fields | Same gaps |
| Queue filter chips | All/Received/Inspection/Approval/In Repair/QC/Shipping/Overdue | No technician filter, no repair level filter |
| Preset filters | My Repairs/Overdue/Waiting PO/Ready to Ship | No saved custom filters |
| Sort | Age/Age desc/Client/Status | No sort by technician or repair level |
| Batch operations | Multi-select + bulk status update | Fully implemented |

## Appendix D: Files Reviewed

- `repairs.html` — Full page (~10,500 lines: 2700+ HTML, 865 inline CSS, ~7,000 JS)
- `styles.css` — Shared design system (562 lines)
- `js/repairs-mock-supplement.js` — Mock data generator (75 repairs)
- `js/api.js` — API abstraction layer
- `js/shell.js` — Shell injection (sidebar, topbar)
- `js/mock-db.js` — Mock database
- `clients.html` — Cross-screen comparison
- `product-sale.html` — Cross-screen comparison
