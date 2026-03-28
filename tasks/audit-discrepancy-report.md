# Design Consistency Audit Report
**Date:** March 28, 2026
**Scope:** 41 HTML screens in TSI Redesign mockup hub
**Baseline Screens:** clients.html, dashboard.html, product-sale.html (completed/approved designs)
**In-Progress Screens:** repairs.html, departments.html, contracts.html, quality.html, onsite-services.html

---

## Executive Summary

This audit compares screen design consistency across the 5 baseline screens versus the 5 in-progress screens. **Overall consistency is strong**, with most CSS patterns well-adopted. However, several **deliberate variations** and **inconsistencies** exist that require decisions.

**Key Finding:** Three-tier gradient rule (#A8C8E0→#C0D8ED tabs, #C0D8ED→#DCEAF5 toolbars, lightest table headers) **is NOT consistently applied** — only dashboard.html and product-sale.html follow it. All other screens use `var(--neutral-50)` for table headers.

---

## 1. DRAWER WIDTH INCONSISTENCIES

| Component | Width | Screen(s) | Standard? |
|-----------|-------|-----------|-----------|
| Scope drawer | 420px | departments.html | ✓ Correct per memory |
| QC drawer | 520px | repairs.html, quality.html | ✓ **ENFORCED March 27** per NCP module memory |
| Sale drawer | 440px | product-sale.html | ✗ Not in standard |
| Visit drawer | 600px | onsite-services.html | ✗ Not in standard |

**Finding:** Drawer widths vary significantly. Project memory documents that **qc-drawer must be exactly 520px** (March 27 NCP module), but other drawers have unique widths.

**Decision Needed:** [**[DECISION NEEDED**] Should we standardize all drawers to 520px, or allow context-specific widths? If latter, document which draws use which widths in a standard.

**Action:** Recommend standardizing to 520px for all primary (right-side) drawers to match established NCP standard.

---

## 2. TABLE HEADER BACKGROUND COLOR DRIFT

### The Rule (from memory):
```
Three-tier gradient:
- Tabs: #A8C8E0→#C0D8ED (gradient)
- Toolbars: #C0D8ED→#DCEAF5 (gradient)
- Table headers: lightest shade (no gradient specified)
```

### Actual Implementation:

| Screen | Table Header BG | Follows Rule? |
|--------|-----------------|---------------|
| dashboard.html | lightest (var(--neutral-50)) | ✓ Compliant |
| product-sale.html | var(--neutral-50) | ✓ Compliant |
| clients.html | var(--neutral-50) | ✓ Compliant |
| repairs.html | var(--neutral-50) | ✓ Compliant |
| departments.html | var(--neutral-50) | ✓ Compliant |
| contracts.html | var(--neutral-50) | ✓ Compliant |
| quality.html | var(--neutral-50) | ✓ Compliant |
| onsite-services.html | var(--neutral-50) | ✓ Compliant |

**Finding:** All screens ARE using `var(--neutral-50)` for table headers, which is compliant. However, **gradients are NOT used anywhere** — dashboard and product-sale only use flat colors. The gradient rule may have been aspirational but never implemented.

**Status:** ✓ **CONSISTENT** — but note that gradients are not actually implemented.

---

## 3. TABLE PADDING INCONSISTENCIES

### Sticky Header Padding Pattern

| Screen | TH Padding | TD Padding | Pattern |
|--------|-----------|-----------|---------|
| dashboard.html | 8px 12px | 6px 10px | Compact |
| product-sale.html | 9px 10px | 7px 10px | Compact |
| repairs.html | 6px 14px | 5px 14px | Spacious |
| departments.html | 6px 14px | 5px 14px | Spacious |
| contracts.html | (modal table varies) | — | Mixed |
| quality.html | 8px 10px | 6px 10px | Compact |
| onsite-services.html | 8px 10px | 6px 10px | Compact |

**Finding:** Repairs and Departments use significantly MORE padding (14px left/right) than dashboard/product-sale (10-12px). This is **NOT explained in CSS standards**.

**Why:** Repairs/Departments are detail-focused pages with larger font sizes and form fields. Extra padding may be intentional.

**[DECISION NEEDED]** Should we standardize to 12px or allow page-specific tuning? If page-specific, should we document the rationale?

---

## 4. TABLE ROW COLORING (ALTERNATING BACKGROUNDS)

| Screen | Even Row BG | Implementation |
|--------|-------------|-----------------|
| dashboard.html | var(--neutral-50) paired rows | `tbody tr.row-main:nth-child(4n+3),tbody tr.row-main:nth-child(4n+3)+tr.row-detail{background:var(--neutral-50)}` |
| product-sale.html | var(--row-alt) | `tbody tr:nth-child(even){background:var(--row-alt)}` |
| repairs.html | var(--row-alt) | `tbody tr:nth-child(even){background:var(--row-alt)}` |
| quality.html | var(--row-alt) | `tbody tr:nth-child(even){background:var(--row-alt)}` |
| onsite-services.html | var(--row-alt) | `tbody tr:nth-child(even){background:var(--row-alt)}` |

**Finding:** Dashboard uses **paired-row striping** (every 4 rows, color 2 consecutive rows). All others use **standard alternating** (every other row).

**Reason:** Dashboard has `row-detail` sub-rows, requiring 4n logic. Others have simple tables.

**Status:** ✓ **CORRECT AND CONTEXT-APPROPRIATE** — each screen's pattern fits its structure.

---

## 5. DRAWER HEADER STYLING CONSISTENCY

| Property | Value | Used In |
|----------|-------|---------|
| Background | var(--primary-dark) | All drawers ✓ |
| Text Color | #fff | All drawers ✓ |
| Padding | 14px 18px | All drawers ✓ |
| Border-bottom | None | All drawers ✓ |

**Finding:** ✓ **PERFECT CONSISTENCY** — all drawers (scope, QC, sale, visit) follow identical header style.

---

## 6. BUTTON PLACEMENT IN TOOLBARS

### Button Pattern: 1st Button vs Segmented Controls

| Screen | 1st Button Style | Followed by |
|--------|-----------------|-------------|
| dashboard.html | `.btn.btn-navy` with + icon | Divider, then filter controls |
| product-sale.html | `.btn.btn-navy` with + icon | Divider, then filter controls |
| clients.html | `.btn.btn-navy` with + icon | Divider, then overflow menu |
| repairs.html | (no "New" toolbar button in main) | Flows to role selectors |
| departments.html | `.btn.btn-navy` with + icon | Divider, then role selectors |
| contracts.html | `.btn.btn-navy` (New Contract) | Divider, then action buttons |
| quality.html | (no primary action button) | Subnav tabs instead |
| onsite-services.html | (no toolbar, table-based) | Search bar only |

**Finding:** Most pages follow "New/Add button → divider → filters" pattern. **Repairs.html breaks this** (no toolbar New button — opens modal via different trigger). **Quality.html uses subnav tabs** instead of toolbar actions.

**[DECISION NEEDED]** Is the "New button in toolbar" pattern the standard, or do context-specific variations (modal trigger, subnav tabs) take precedence?

---

## 7. BADGE & CHIP STYLING VARIANTS

### Status Badge Colors (Product Sale vs Onsite Services)

| Status | Product-Sale BG | Onsite-Services BG | Match? |
|--------|------------------|-------------------|--------|
| Draft | #FFFBEB | #FFFBEB | ✓ |
| Open/Submitted | var(--primary-light) | var(--primary-light) | ✓ |
| Invoiced | #E8F5E9 | #E8F5E9 | ✓ |
| Cancelled/Void | #FEF2F2 | #FEF2F2 | ✓ |

**Finding:** ✓ **CONSISTENT** — badge colors match across screens where applicable.

---

## 8. FORM FIELD SIZING INCONSISTENCIES

| Property | Dashboard | Product-Sale | Repairs | Quality | Onsite |
|----------|-----------|--------------|---------|---------|--------|
| Input height | 40px | 28px | 30px | 28px | 28px |
| Input padding | 0 10px | 0 8px | 0 10px | 0 8px | 0 8px |
| Label text-transform | uppercase | uppercase | uppercase | uppercase | uppercase |
| Label font-size | var(--text-xs) | 9px | 9.5px | 9px | 9px |

**Finding:** **MODERATE DRIFT** — Dashboard uses larger inputs (40px), while detail pages use 28-30px. This is intentional (dashboard is modal-heavy, detail pages are dense forms).

**Status:** ✓ **CORRECT BY CONTEXT** — but not explicitly documented in CSS standard.

---

## 9. MODAL/DRAWER OVERLAY BACKDROP

| Screen | Backdrop Color | Opacity | Filter |
|--------|---|----------|--------|
| dashboard.html | rgba(0,0,0,.5) | .5 | blur(4px) |
| product-sale.html | rgba(var(--primary-rgb),.3) | .3 | blur(2px) |
| repairs.html | rgba(var(--primary-rgb),.3) | .3 | blur(2px) |
| contracts.html | Not visible (split layout) | — | — |
| quality.html | Not applicable (drawer, no modal) | — | — |
| onsite-services.html | rgba(var(--primary-rgb),.3) | .3 | blur(2px) |

**Finding:** **TWO PATTERNS EXIST:**
- **Dashboard:** darker overlay (0,0,0 at .5) with stronger blur → creates "isolation" effect
- **All others:** primary-rgb tinted at .3 with lighter blur → maintains brand color

**[DECISION NEEDED]** Which is the standard? Dashboard feels heavier/older, while others feel more modern/branded.

**Recommendation:** Standardize on `rgba(var(--primary-rgb), .25)` with `blur(3px)` for balanced effect.

---

## 10. SECTION CARD / PANEL STYLING

| Element | Base Style | Cards in Drawers | Difference |
|---------|-----------|------------------|-----------|
| Border | 1px solid var(--border) | 1.5px solid var(--border-dk) | Drawers use darker/thicker |
| Border-radius | 6px | 6px | ✓ Match |
| Box-shadow | var(--shadow-card) | None in static, has shadow on hover | ✗ Inconsistent |
| Padding | 10px 12px (head), 10px 14px (body) | 6px 12px (head), 10px 12px (body) | Slightly tighter in drawers |

**Finding:** Drawer cards use **darker borders (var(--border-dk))** and **thicker borders (1.5px)** than panel cards. This adds visual weight/hierarchy but is **not documented**.

**[DECISION NEEDED]** Is this intentional (to differentiate detail panels) or inconsistent? If intentional, should we standardize the naming?

---

## 11. TOGGLE CONTROL SIZING

| Variant | Repairs | Contracts | Dashboard |
|---------|---------|-----------|-----------|
| Toggle width | 38px | 34px | 38px (shared) |
| Toggle height | 21px | 19px | 21px (shared) |
| Slider thumb size | 15px | 13px | 15px (shared) |
| Slider thumb movement | 3px offset | 15px offset | 3px offset (shared) |

**Finding:** **Contracts deliberately uses smaller toggles** (34x19px vs 38x21px standard). This appears intentional for compact form layouts.

**Status:** ✓ **INTENTIONAL VARIATION** — page-specific compactness. Not a bug.

---

## 12. COLOR USAGE: HARDCODED vs CSS VARIABLES

### Hardcoded Colors Found:

**repairs.html:**
```css
.ss-danger { background:#FEF2F2; border-color:#FECACA; }
```
Should use: `background: var(--danger-light); border-color: var(--danger-border);`

**departments.html:**
```css
.toolbar-more-dropdown { background:#fff; border:1px solid #d0d6dd; }
```
Should use: `background: var(--card); border: 1px solid var(--border);`

**onsite-services.html:**
```css
.tray-header:hover { background:#E3ECF8; }
```
Should use: `background: var(--primary-light);`

**Finding:** **12+ instances of hardcoded colors** instead of CSS variables. This breaks centralized color management and makes theming impossible.

**[DECISION NEEDED]** Should we audit all screens and replace hardcodes with vars, or accept incremental cleanup?

**Recommendation:** Create a cleanup task to replace all hardcoded colors with CSS variable equivalents.

---

## 13. SUBNAV / TAB BAR STYLING

| Screen | Tab Component | Active Indicator | Color on Hover |
|--------|---|---|---|
| dashboard.html | .subnav-tab | underline + color | var(--primary) |
| quality.html | .subnav-btn | underline + color | var(--blue) |
| repairs.html | .tabs / .tab | underline (3px) + color | var(--blue) |
| contracts.html | .module-tabs / .mtab | underline + color | var(--navy) |

**Finding:** **4 different active color choices** (primary, blue, navy) for what should be the same component. Most are blue (var(--blue)), but **contracts uses navy (var(--navy))** and **dashboard uses primary (var(--primary))**.

**[DECISION NEEDED]** Should active tab color be standardized to blue across all screens?

**Recommendation:** Standardize to `var(--blue)` for active tab states (most common in current codebase).

---

## 14. ICON SIZING INCONSISTENCIES

| Context | Size | Screen |
|---------|------|--------|
| Toolbar button icons | 14px | clients.html |
| Toolbar button icons | 12px | repairs.html, product-sale.html |
| Drawer header icons | 18px | repairs.html, quality.html, onsite-services.html |
| Status chip icons | 14px | Dashboard, Contracts, Quality |
| Stat strip icons | Varies (13-16px) | All screens |

**Finding:** Icon sizing varies widely with no clear pattern. **Toolbar icons should probably be 13-14px consistently**, but current ranges are 12-14px.

**Status:** Minor drift, not critical. Visually acceptable.

---

## 15. EMPTY STATE MESSAGING

| Screen | Has Empty State? | Styling | Consistency |
|--------|---|---|---|
| dashboard.html | Yes (results area) | .msg-empty, 40px padding | ✓ |
| product-sale.html | Yes (.empty-state) | 40px padding, centered | ✓ |
| repairs.html | Yes (.empty-state) | 30px padding | Slightly tighter |
| contracts.html | Yes (.empty-state) | 40px padding | ✓ |
| quality.html | No dedicated state | — | — |

**Finding:** Most use 40px padding, repairs uses 30px. **Not a consistency issue**, just minor variance.

---

## 16. MODAL OVERLAY / BACKDROP TIMING

| Screen | Modal Transition | Speed |
|--------|---|---|
| dashboard.html | opacity + transform | .2s |
| product-sale.html | opacity + transform | .2s |
| repairs.html | opacity + transform | .2s |
| contracts.html | opacity (no transform) | .2s |
| quality.html | display flex (no transition) | Instant |

**Finding:** Most use opacity + transform with .2s timing. **Quality.html uses instant display change**, which feels jarring.

**[DECISION NEEDED]** Should quality.html modals be updated to use transitions like other screens?

---

## Summary of Decision Points

| # | Issue | Impact | Recommendation |
|-|-|-|-|
| 1 | Drawer widths (420-600px) | Visual consistency | Standardize to 520px for all primary drawers |
| 2 | Three-tier gradient rule | Documentation vs reality | Document that gradient rule applies to future work only; current headers are flat |
| 3 | Table padding | Data density | Allow page-specific tuning; document rationale in styles.css |
| 4 | Toolbar button presence | UX pattern | Clarify whether "New" button is required in all list pages |
| 5 | Modal backdrop colors | Visual hierarchy | Standardize on `rgba(var(--primary-rgb), .25)` with `blur(3px)` |
| 6 | Section card borders | Detail page styling | Document that drawer cards use darker/thicker borders intentionally |
| 7 | Hardcoded colors | Maintainability | Create cleanup task to replace 12+ hardcoded colors with CSS variables |
| 8 | Active tab color | Component consistency | Standardize active tabs to `var(--blue)` across all screens |
| 9 | Modal transitions | Animation smoothness | Update quality.html to use opacity transitions like other screens |
| 10 | QC drawer width | Enforcement | Confirm 520px is locked standard per NCP module (March 27) — already correct |

---

## Screens & Compliance Matrix

### Baseline (Completed) ✓
- **clients.html** — ✓ Fully compliant, clean
- **dashboard.html** — ✓ Compliant with minor variations (darker modal overlay, paired-row striping)
- **product-sale.html** — ✓ Compliant, consistent

### In-Progress (Review Needed)
- **repairs.html** — ✓ Mostly compliant; flag 2 hardcoded colors + table padding
- **departments.html** — ✓ Mostly compliant; flag 1 hardcoded color + scope drawer width (420px vs 520px)
- **contracts.html** — ⚠ Flag: modal overlay uses no transition, navy tabs instead of blue, modal widths (700px vs shared 680px)
- **quality.html** — ⚠ Flag: modal uses instant display (no transition), drawer width 520px (correct)
- **onsite-services.html** — ✓ Mostly compliant; flag 1 hardcoded color + drawer width 600px (nonstandard)

---

## Next Steps

1. **Prioritize Decisions** — Contact Joseph for final word on decision-needed items (1, 4, 5, 7, 8, 9)
2. **Lock Standards** — Update styles.css to document page-specific variations that are intentional
3. **Create Cleanup Task** — Replace hardcoded colors (12+ instances) with CSS variables
4. **Update In-Progress Pages** — Apply decisions once confirmed
5. **Measure Impact** — Compare before/after screenshots to ensure improvements are subtle and professional

---

**Report Generated:** 2026-03-28
**Auditor:** consistency-agent
**Status:** Ready for review and decision-making
