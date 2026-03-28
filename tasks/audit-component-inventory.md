# TSI Redesign — Component Inventory Audit

**Date:** March 28, 2026
**Scope:** Complete survey of all component patterns across 40+ HTML screens
**Organization:** By component type, with usage matrix across screens

---

## Design Tokens & CSS Variables

### Color Palette
- **Primary:** `--primary: #2E75B6` (navy blue)
- **Primary Dark:** `#1B3A5C`
- **Primary Light:** `#E8F0FE`
- **Danger:** `--danger: #B71234` (red)
- **Success:** `--success: #16A34A` (green)
- **Warning:** `--warning: #F59E0B` (amber)
- **Sidebar:** `--sidebar: #1E293B` (dark slate)
- **Topbar:** `--topbar: #1E293B` (matches sidebar)
- **Neutral 50–900:** `#F9FAFB` → `#111827` (background to text)

### Spacing Scale
- `--sp-1: 4px, --sp-2: 8px, --sp-3: 12px, --sp-4: 16px, --sp-5: 20px, --sp-6: 24px, --sp-8: 32px, --sp-10: 40px, --sp-12: 48px`

### Typography
- **Font Family:** `Inter` (sans-serif)
- **Sizes:** `--text-xs: 12px, --text-sm: 13px, --text-base: 14px, --text-lg: 15px, --text-xl: 18px, --text-2xl: 24px`

### Shadows & Elevation
- `--shadow-card: 0 1px 3px rgba(0,0,0,0.08)`
- `--shadow-dropdown: 0 4px 12px rgba(0,0,0,0.12)`
- `--shadow-modal: 0 8px 24px rgba(0,0,0,0.16)`

### Z-Index Scale
- `--z-dropdown: 100, --z-sticky: 200, --z-drawer: 400, --z-overlay: 500, --z-modal: 900, --z-toast: 1000, --z-cmd: 1100`

---

## Shell Components (Global Layout)

### Sidebar Navigation
**Selector:** `.sidebar`
**Properties:**
- Width: 240px (collapsed: 56px)
- Dark slate background: `#1E293B`
- Flex column layout
- Border-right: 1px solid `#151f2e`
- Overflow-y: auto
- Transition: width 0.2s ease

**Child Elements:**
- `.sidebar-brand`: Logo + text, padding 16px, border-bottom
  - `.brand-logo`: 34px circle, primary color, centered SVG (18x18)
  - `.brand-text .t1`: 13px bold white
  - `.brand-text .t2`: 10px muted text
  - `.sidebar-toggle`: Icon button, top-right (collapse/expand)
- `.nav-group`: Flex column, flex:1
  - `.nav-section-label`: 10px uppercase, tiny, opacity 0.35
  - `.nav-item`: 8px v-padding, 16px h-padding, flex row, 10px gap
    - Hover: bg `--sidebar-lt`, text to white
    - Active: bg rgba(primary, 0.15), text `--primary-light`, border-left 3px primary
    - SVG: 16x16, opacity 0.6 (active: 1)
- `.sidebar-footer`: 10px text, centered copyright

**Collapsed State (data-density: compact or width: 56px):**
- Text hidden
- Icons centered
- Border-bottom on active instead of left
- Section dividers at 20px width

**Screens Using:** All 40+ pages (injected by shell.js)

---

### Topbar (Header)

**Selector:** `.topbar`
**Properties:**
- Height: 64px
- Dark slate: `--topbar: #1E293B`
- Flex row, center vertically
- Padding: 0 24px
- Border-bottom: 1px solid `--topbar-border: #334155`
- Box-shadow: 0 2px 12px rgba(0,0,0,0.18)
- Flex: space-between

**Child Elements:**
- `.topbar-left`: Flex row, gap 10px
  - Logo image (height: 48px)
- `.topbar-right`: Flex row, gap 10px, right-aligned
  - `.save-indicator`: 11px text, gap 6px, pulsing animation, rgba bg
  - `.svc-select`: Height 32px, border-radius 6px, dark bg, white text
  - `.topbar-avatar`: 32x32, rounded 8px, circle with initials
  - `.topbar-welcome`: 13px text, strong username
  - Sign Out button: 11px, outlined

**Orders Dropdown Button (btn-orders):**
- 14px icon + text "Work Orders" + chevron
- onclick toggles `#newOrderMenu.open`
- Dropdown items: 6 menu options (Receive, Find/Open, Repair, Instrument, Product, Endocart)
- Each with icon + title + subtitle

**Data Badge:** Right side, shows API mode indicator (SQL SERVER or local)

**Density Toggle:** Icon button showing compact/expanded state

**Service Location Selector:** Dropdown (`#svcLocation`) with Upper Chichester / Nashville

**Screens Using:** All pages (injected by shell.js)

---

## Navigation Patterns

### Dashboard Sub-Navigation (Subnav Tabs)

**Selector:** `.subnav`
**Properties:**
- Flex row, gap 0, height auto
- Padding: 0 14px
- Background: `--neutral-50`
- Border-bottom: 1px solid `--neutral-200`
- Overflow-x: auto (horizontal scroll)

**Tab Pattern (`.subnav-tab`):**
- Padding: 10px 14px
- Font: 13px, weight 500
- Color: `--neutral-500` (inactive), `--primary` (active)
- Border-bottom: 2px solid transparent (active: primary color)
- Cursor: pointer
- Transition: all 150ms

**Tab Badge (`.tab-badge`):**
- Position: absolute, top 4px, right 2px
- Background: `--danger` (red)
- Color: white
- Font: 9px bold
- Padding: 1px 5px
- Border-radius: 8px

**Tabs Defined (shell.js):**
1. Morning Briefing → `dashboard_briefing.html`
2. Scopes → `dashboard.html`
3. Tasks → `dashboard_tasks.html` (badge: taskTabBadge)
4. Emails → `dashboard_emails.html`
5. Shipping Status → `dashboard_shipping.html`
6. Inventory → `dashboard_inventory.html`
7. Purchase Orders → `dashboard_purchaseorders.html`
8. Invoices → `dashboard_invoices.html`
9. Flags → `dashboard_flags.html` (badge: flagTabBadge)
10. Analytics → `dashboard_analytics.html`
11. Tech Bench → `dashboard_techbench.html`

**Screens Using:** All dashboard_*.html pages

---

## Data Display Components

### Tables

#### Standard Table Structure
**Markup:**
```html
<table>
  <thead>
    <tr>
      <th>Column 1</th>
      <th>Column 2</th>
    </tr>
  </thead>
  <tbody>
    <tr><td>Data</td></tr>
  </tbody>
</table>
```

**Selector:** `table`
**Properties:**
- Width: 100%
- Border-collapse: collapse
- Min-width varies by page (1100px on dashboard)

**Header (th):**
- Background: `--neutral-50`
- Color: `--neutral-500`
- Font: 11px (dashboard) to 13px (repairs), weight 600
- Padding: 10px 12px
- Text-align: left
- White-space: nowrap
- Border-bottom: 1px solid `--neutral-200`
- Border-right: 1px solid `--neutral-100` (except last)
- Text-transform: uppercase
- Letter-spacing: 0.04em
- Position: sticky, top 0, z-index 2
- Cursor: pointer (for sort)
- Hover: background `--neutral-100`

**Body (td):**
- Padding: 10px 12px (varies: 6px 10px on dense tables)
- Font: 13–14px
- Border-bottom: 1px solid `--neutral-200`
- Vertical-align: middle
- Color: `--neutral-900`

**Row Hover:**
- tbody tr:hover → background `--primary-light`
- Cursor: pointer
- Exception: `.readonly-tbl` no hover effect

**Row Alternation:**
- tbody tr:nth-child(even) → background `--row-alt` (`--neutral-50`)

**Paired Rows (Dashboard):**
- `.row-main` + `.row-detail` (2-row pairs)
- Pairs alternate background (4n+1 vs 4n+3)
- Detail rows have smaller font (10px), reduced padding, italic labels

**Sort Indicators:**
- th .sort element, opacity 0.4
- th.sorted .sort → opacity 1
- th.sorted.asc .sort::after → "▲"
- th.sorted.desc .sort::after → "▼"

**Special Row Classes:**
- `.urgent` → border-left: 3px solid `--danger`
- `.attention` → border-left: 3px solid `--warning`
- `.selected-row` → background `#C8D8F0`, outline 2px `--blue`

**Screens Using:** dashboard.html, repairs.html, loaners.html, inventory.html, contracts.html, clients.html, departments.html, onsite-services.html

---

#### Table Wrapper & Cards

**Selector:** `.tbl-card`
**Properties:**
- Background: white
- Border: 1px solid `--neutral-200`
- Border-radius: 8px
- Overflow: hidden
- Box-shadow: `--shadow-card`

**Header (`.tbl-card-head`):**
- Background: `--neutral-50`
- Padding: 11px 20px
- Display: flex, space-between
- Border-bottom: 1px solid `--neutral-200`

**Title (`.tbl-card-title`):**
- Font: 13px, weight 600
- Color: `--neutral-900`

**Table Wrapper (`.table-wrap`):**
- Flex: 1
- Overflow: auto
- Position: relative

**Screens Using:** All report tables, Repairs items table, Loaners table, Inventory PO table

---

### Badges & Status Pills

#### Active/Inactive Badges
- `.b-active`: bg `#F0FDF4`, color `--success`, border `#BBF7D0`
- `.b-inactive`: bg `--neutral-100`, color `--neutral-500`, border `--neutral-200`

**Properties:**
- Display: inline-flex
- Padding: 2px 8px
- Border-radius: var(--radius-pill) (9999px)
- Font: 11px bold
- White-space: nowrap

#### Danger/Warning/Info Badges
- `.ss-danger`: bg `#FEF2F2`, border `#FECACA`, color `--red`
- `.ss-warn`: bg `#FFFBEB`, border `#FDE68A`, color amber
- `.ss-active`: bg `#F0FDF4`, border `#BBF7D0`, color `--green`
- `.ss-neutral`: bg `#F8FAFF`, border `--border`
- `.ss-info`: bg `#EFF6FF`, border `#BFDBFE`, color `--blue`

**Screens Using:** Status strips across all detail pages

---

### Tabs

#### Tab Bar (Standard)
**Selector:** `.tab-bar`
**Properties:**
- Display: flex
- Padding: 0 14px
- Background: `--card` (white)
- Border-bottom: 1px solid `--neutral-200`
- Margin-top: 0

**Individual Tab (`.tab`):**
- Padding: 8px 18px
- Font: 13px (sm), weight 500
- Color: `--neutral-500` (inactive), `--primary` (active)
- Cursor: pointer
- Border-bottom: 2px solid transparent (active: primary)
- Margin-bottom: -1px (to overlap with border-bottom)
- Transition: all 150ms
- User-select: none
- Hover: color `--primary`

**Tab Count Badge (`.tab-count`):**
- Display: inline-flex
- Background: `--navy`
- Color: white
- Font: 9px bold
- Padding: 1px 5px
- Border-radius: 8px
- Margin-left: 4px

#### Tab Content
**Selector:** `.tab-content`
**Properties:**
- Padding: 12px 20px
- Display: none (hidden by default)
- Flex-direction: column (when shown)

**Active Content (`.tab-content.show`):**
- Display: flex
- Gap: 14px
- Align-items: stretch

**Block Layout (`.tab-content.show-block`):**
- Display: block
- Padding: 12px 20px

**Screens Using:** Clients (7 tabs), Contracts (3 tabs), Repairs (8 tabs), Loaners (3 tabs), Departments (custom), Inventory (custom)

---

## Input Components

### Basic Input Field

**Selector:** `.inp`
**Properties:**
- Height: 40px
- Border: 1px solid `--neutral-200`
- Border-radius: 6px (var(--radius-md))
- Padding: 0 10px
- Font-size: 13px (var(--text-sm))
- Font-family: inherit
- Color: `--text` (`--neutral-900`)
- Background: white
- Outline: none
- Width: 100%
- Transition: border-color 150ms

**Focus State:**
- Border-color: `--primary`
- Box-shadow: 0 0 0 3px rgba(primary, 0.1)

**Read-Only (`.inp.ro`):**
- Background: `--neutral-50`
- Color: `--neutral-500`
- Cursor: default

**Small Variant (`.inp-sm`):**
- Height: 28px
- Font-size: 12px (var(--text-xs))
- Padding: 0 8px

#### Input Sizes by Page
- Dashboard search: 220px width, 32px height
- Repairs inline: 110px width, 26px height
- Inventory: 220px width, 30px height

#### Textarea
**Properties:**
- Height: 72px
- Padding: 6px 10px
- Resize: none
- Line-height: 1.5

#### Select
**Selector:** `select.inp`
**Properties:**
- Cursor: pointer
- Height: 40px
- Line-height: 40px
- Appearance: none (custom dropdown)
- Background-image: chevron down SVG (gray)
- Background-repeat: no-repeat
- Background-position: right 10px center
- Padding-right: 28px

**Screens Using:** All detail pages, filters, multi-select dropdowns

---

### Form Groups & Field Layouts

#### Field Container (`.ff` = form-field)
**Properties:**
- Display: flex
- Flex-direction: column
- Gap: 2px

**Label (within .ff label):**
- Font-size: 9.5–11px
- Font-weight: 600
- Color: `--neutral-500` (muted)
- Text-transform: uppercase
- Letter-spacing: 0.04em
- Margin-bottom: 2px

#### Required Marker (`.req`)
- Color: `--danger` (red)

#### Form Grid (`.fg`)
**Properties:**
- Display: grid
- Gap: 8px 12px

**Grid Templates:**
- `.g2`: grid-template-columns: 1fr 1fr
- `.g3`: grid-template-columns: 1fr 1fr 1fr
- `.g4`: grid-template-columns: 1fr 1fr 1fr 1fr

**Span Classes:**
- `.span2`: grid-column: span 2
- `.span3`: grid-column: span 3
- `.span4`: grid-column: span 4

#### Two-Column Layout
- `.col-left`: flex:1, min-width:0
- `.col-right`: width:310px, flex-shrink:0
- Gap: 8px

**Screens Using:** Clients detail (col-left/col-right), Repairs detail (full width), Contracts detail (custom split)

---

### Panels (Card Containers)

**Selector:** `.panel`
**Properties:**
- Border-radius: 8px (var(--radius-lg))
- Overflow: hidden
- Border: 1px solid `--neutral-200`
- Box-shadow: `--shadow-card`
- Display: flex
- Flex-direction: column

**Header (`.panel-head`):**
- Background: `--neutral-50`
- Padding: 6px 12px
- Font-size: 11px
- Font-weight: 600
- Text-transform: uppercase
- Letter-spacing: 0.6px
- Color: `--neutral-500`
- Border-bottom: 1px solid `--neutral-200`

**Body (`.panel-body`):**
- Background: white
- Padding: 14px 16px
- Flex: 1

**Screens Using:** All detail pages (Clients, Repairs, Contracts, etc.)

---

## Buttons

### Button Base (`.btn`)

**Selector:** `.btn`
**Properties:**
- Display: inline-flex
- Align-items: center
- Gap: 6px
- Height: 40px
- Padding: 0 16px
- Border-radius: 6px (var(--radius-md))
- Font-size: 13px (var(--text-sm))
- Cursor: pointer
- Border: none
- Font-family: inherit
- Font-weight: 500
- Transition: all 150ms

**Variants:**
- `.btn-navy`: bg `--primary`, color white, font-weight 600
  - Hover: bg `--primary-dark`
- `.btn-outline`: bg white, border 1px `--neutral-200`, color `--neutral-700`
  - Hover: bg `--neutral-50`, border `--primary`, color `--primary`
- `.btn-danger`: bg `#FEF2F2`, border 1px `#FECACA`, color `--danger`
  - Hover: bg `#FEE2E2`
- `.btn-green`: bg `#F0FDF4`, border `#BBF7D0`, color `--success`

### Small Button (`.btn-sm`)
- Height: 32px
- Padding: 0 12px
- Font-size: 12px (var(--text-xs))

### Icon Button (`.btn-icon`)
**Properties:**
- Width: 40px (= height)
- Height: 40px
- Padding: 0
- Border-radius: 6px
- Display: flex (center content)
- Cursor: pointer

**.btn-icon.btn-sm:**
- Width: 32px
- Height: 32px

### Toolbar Buttons (`.tb-btn`)
- Height: 32px
- Padding: 0 10px
- Border: 1px solid `--neutral-200`
- Border-radius: 6px
- Font-size: 11px
- Background: white
- Color: `--neutral-700`
- Flex: row, center, gap 3px
- Hover: bg `--neutral-50`, border `--primary`, color `--primary`

### Delete Button (`.del-btn`)
- Background: `#FEF2F2`
- Border: 1px solid `#FECACA`
- Color: `--danger`
- Border-radius: 4–6px
- Padding: 2–3px 8–10px
- Font-size: 10–11px
- Cursor: pointer
- Hover: bg `#FEE2E2` or `#FCA5A5`

### Edit Button (`.edit-btn`)
- Background: `--primary-light`
- Border: 1px solid `#BFDBFE`
- Color: `--primary`
- Border-radius: 6px
- Padding: 3px 10px
- Font-size: 11px
- Cursor: pointer

**Screens Using:** All pages with toolbars, modals, drawers

---

## Status & KPI Components

### Status Strip (`.status-strip`)

**Selector:** `.status-strip`
**Properties:**
- Display: flex
- Align-items: center
- Gap: 6px
- Padding: 6px 20px
- Background: white
- Border-bottom: 1px solid `--border`
- Overflow-x: auto
- Flex-shrink: 0

**Chip (`.ss-chip`):**
- Display: inline-flex
- Gap: 5px
- Padding: 3px 10px
- Border-radius: 6px
- Font-size: 11px
- Font-weight: 600
- White-space: nowrap
- Border: 1px solid `--border`

**Label & Value:**
- `.ss-label`: 9.5px, weight 500, uppercase, muted
- `.ss-val`: text color, no transform

**Badge Classes:** `.ss-active`, `.ss-warn`, `.ss-neutral`, `.ss-info`, `.ss-danger`

**Screens Using:** Repairs, Clients, Departments, Loaners, Inventory, Contracts

---

### Stat Strip (`.stat-strip`)

**Selector:** `.stat-strip`
**Properties:**
- Display: flex
- Align-items: stretch
- Background: white
- Border-bottom: 1px solid `--neutral-200`
- Flex-shrink: 0

**Chip (`.stat-chip`):**
- Display: flex
- Gap: 8px
- Padding: 8px 12px
- Border-right: 1px solid `--neutral-200`
- Min-width: 0 (for text truncation)
- Last-child: border-right none

**Icon (`.s-icon`):**
- Width: 24px, height 24px (stat-chip: 28px)
- Border-radius: 6px
- Display: flex, center
- Font-size: 13px
- Flex-shrink: 0

**Color Classes (`.s-navy`, `.s-red`, `.s-green`, `.s-amber`, `.s-blue`, `.s-purple`, `.s-muted`)**

**Data (`.s-data`):**
- Min-width: 0 (overflow hidden)

**Value (`.s-val`):**
- Font-size: 16px
- Font-weight: 800
- Letter-spacing: -0.3px
- Line-height: 1.1
- White-space: nowrap
- Overflow: hidden, text-overflow: ellipsis

**Label (`.s-lbl`):**
- Font-size: 12px (var(--text-xs))
- Color: `--neutral-500`
- Text-transform: uppercase
- Letter-spacing: 0.2px

**Interactive (Contracts, Loaners, Inventory):**
- Cursor: pointer
- Hover: background `--bg`
- Active: outline 2.5px solid `--navy`, outline-offset -2px, bg `--primary-light`

**Screens Using:** dashboard.html, clients.html, repairs.html, contracts.html, loaners.html, inventory.html

---

## Drawer & Modal Components

### Drawer (Right-Slide Panel)

**Selector:** `.drawer` or `.qc-drawer` or `.scope-drawer`

#### QC Drawer (Inspection)
**Selector:** `.qc-drawer`
**Properties:**
- Position: fixed
- Top: 0, right: -540px (off-screen)
- Width: 520px
- Height: 100vh
- Background: white
- Z-index: `--z-modal` (400)
- Box-shadow: none (on .open: -4px 0 24px rgba(primary, 0.15))
- Transition: right 0.25s ease
- Display: flex, flex-direction: column

**Open State (`.qc-drawer.open`):**
- Right: 0 !important
- Box-shadow applied

**Header (`.qc-drawer-head`):**
- Display: flex, center, space-between
- Padding: 10px 16px
- Background: `--primary-dark`
- Color: white
- Flex-shrink: 0

**Body (`.qc-drawer-body`):**
- Flex: 1
- Overflow-y: auto
- Padding: 12px 16px

**Backdrop (`.qc-backdrop`):**
- Position: fixed, inset: 0
- Background: rgba(0,0,0,0.25)
- Z-index: `--z-modal`
- Display: none (show on .open)

#### Scope Drawer (Departments)
**Selector:** `.scope-drawer`
**Properties:**
- Position: fixed
- Right: -420px (off-screen) / 0 (open)
- Top: 64px, bottom: 0
- Width: 420px
- Background: white
- Border-left: 1.5px solid `--border-dk`
- Box-shadow: `--shadow-modal`
- Z-index: `--z-dropdown`
- Transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)
- Display: flex, flex-direction: column

**Header (`.dh`):**
- Padding: 14px 18px
- Background: `--primary-dark`
- Color: white
- Display: flex, space-between
- Flex-shrink: 0

**Body (`.d-body`):**
- Flex: 1
- Overflow-y: auto
- Padding: 16px 18px
- Gap: 14px

**Footer (`.d-foot`):**
- Padding: 10px 18px
- Border-top: 1.5px solid `--border-dk`
- Background: `#F8FAFF`
- Display: flex, justify-end
- Flex-shrink: 0

#### Generic Drawer (Loaners)
**Selector:** `.drawer`
**Properties:**
- Position: fixed, top 0, right 0
- Width: 440px
- Height: 100vh
- Background: white
- Z-index: `--z-dropdown`
- Transform: translateX(100%) → translateX(0) on .open
- Transition: transform 0.25s ease
- Display: flex, flex-direction: column
- Box-shadow: -8px 0 30px rgba(0,0,0,0.15) (on .open)

**Header (`.drawer-header`):**
- Padding: 14px 20px
- Border-bottom: 1px solid `--border`
- Background: `--primary-dark`
- Flex-shrink: 0
- h3: 14px bold white

**Close Button (`.drawer-close`):**
- Height: 28px, padding 0 10px
- Border: 1px solid rgba(255,255,255,0.4)
- Color: white
- Border-radius: 6px
- Cursor: pointer
- Hover: bg rgba(255,255,255,0.15)

**Body (`.drawer-body`):**
- Flex: 1
- Overflow-y: auto
- Padding: 16px 20px
- Gap: 14px

**Footer (`.drawer-footer`):**
- Display: flex, justify-end
- Gap: 8px
- Padding: 12px 20px
- Border-top: 1px solid `--border`
- Flex-shrink: 0

**Screens Using:** QC (repairs.html), Scope editor (departments.html), Loaner detail (loaners.html)

---

### Modal (Full Overlay)

**Selector:** `.modal-overlay` and `.modal`

**Overlay (`.modal-overlay`):**
- Position: fixed, inset: 0
- Background: rgba(0,0,0,0.5)
- Z-index: `--z-cmd` (1100)
- Display: flex, center
- Opacity: 0, pointer-events: none
- Transition: opacity 0.2s
- Backdrop-filter: blur(4px)

**Open State (`.modal-overlay.open`):**
- Opacity: 1, pointer-events: all

**Modal (`.modal`):**
- Background: white
- Border-radius: 12px (var(--radius-xl))
- Width: 1050px (varies: 540px–880px)
- Max-width: 98vw
- Box-shadow: `--shadow-modal`
- Overflow: hidden
- Transform: translateY(15px) → translateY(0) on open
- Transition: transform 0.2s
- Display: flex, flex-direction: column
- Max-height: 90vh

**Header (`.modal-header`):**
- Padding: 16px 24px
- Border-bottom: 1px solid `--neutral-200`
- Display: flex, space-between, center
- Background: `--primary`
- Flex-shrink: 0
- Border-radius: 12px 12px 0 0

**Header h2:**
- Font-size: 15px (var(--text-lg))
- Color: white
- Font-weight: 600

**Close Button (`.modal-close`):**
- Background: rgba(255,255,255,0.15)
- Border: none
- Color: rgba(255,255,255,0.8)
- Cursor: pointer
- Padding: 4px
- Border-radius: 4px
- Transition: all 150ms
- Hover: bg rgba(255,255,255,0.25), color white

**Body (`.modal-body`):**
- Display: flex, flex-direction: column
- Flex: 1
- Overflow: hidden

**Search Area (`.modal-search-area`):**
- Padding: 24px 32px
- Border-bottom: 1px solid `--neutral-200`
- Background: white
- Display: flex, gap 40px, justify-center
- Flex-shrink: 0

**Results Area (`.modal-results-area`):**
- Flex: 1
- Overflow: auto
- Background: white
- Padding: 24px 32px

**Footer (`.modal-footer`):**
- Padding: 16px 24px
- Border-top: 1px solid `--neutral-200`
- Background: white
- Display: flex, space-between, center
- Flex-shrink: 0
- Border-radius: 0 0 12px 12px
- Gap: 12px

**Screens Using:** Global search, Client picker, Repair creation, Scope selection

---

## Specialized Patterns

### Pass/Fail Inspection Grid

**Selector:** `.pf-grid` (repairs.html)

**Properties:**
- Display: grid
- Grid-template-columns: 1fr 34px 1fr 34px
- Gap: 0

**Category Row (`.pf-cat`):**
- Font: 7.5px bold uppercase
- Color: `--steel` (`#1B3A5C`)
- Padding: 2px 6px
- Background: `--neutral-50`
- Line-height: 1.2
- Grid-column: 1 / -1

**Cell (`.pf-cell`):**
- Height: 20px
- Display: flex, center
- Border-bottom: 1px solid `#f0f2f5`
- Cursor: pointer
- Transition: background 0.08s

**Label Cell (`.pf-cell.pf-label`):**
- Padding: 0 6px
- Font: 10px, color text
- White-space: nowrap, overflow hidden, ellipsis
- Line-height: 1

**Button Cell (`.pf-cell.pf-btn-cell`):**
- Justify-content: center
- Border-right: 1px solid `#eee`

**Hover:** background `--neutral-50`

**Pass Cell (`.pf-cell.pf-cell-pass`):** background `#F0FDF4`
**Fail Cell (`.pf-cell.pf-cell-fail`):** background `#FEF2F2`

**Button (`.pf-btn`):**
- Width: 28px, height: 16px
- Border: 1px solid `--border-dk`
- Border-radius: 4px
- Font: 8px bold uppercase
- Cursor: pointer
- Background: white
- Color: `--muted`
- Padding: 0
- Line-height: 1
- Font-family: inherit
- Transition: all 0.08s

**States:**
- Hover: border `--navy`
- Pass (`.pf-pass`): bg `#16A34A`, color white, border `#16A34A`
- Fail (`.pf-fail`): bg `#DC2626`, color white, border `#DC2626`

**Toolbar (`.pf-toolbar`):**
- Display: flex, center, gap 8px
- Padding: 4px 8px
- Background: `--neutral-50`
- Border-bottom: 1px solid `--border`

**Buttons:**
- `.pf-all-pass`: bg `#16A34A`, color white, hover `#15803D`
- `.pf-clear-all`: bg white, border `--border`, color `--muted`, hover bg `#f8f8f8`
- `.pf-counter`: font 10px bold navy, margin-left auto

**Screens Using:** repairs.html (inspection tabs), onsite-services.html

---

### Reference Strip (Repairs Detail)

**Selector:** `.ref-strip`

**Properties:**
- Display: flex, column
- Gap: 0
- Padding: 0
- Background: `--neutral-50`
- Border: 1px solid `--border`
- Border-radius: 6px
- Margin-bottom: 8px
- Overflow: hidden

**Group (`.ref-group`):**
- Display: flex, wrap
- Gap: 6px 0
- Padding: 8px 16px
- Border-top: 1px solid `--border` (except first)

**Label (`.ref-group-label`):**
- Font: 8px bold, color muted, uppercase
- Width: 52px
- Flex-shrink: 0
- Padding: 0
- Margin-right: 14px

**Item (`.ref-item`):**
- Display: inline-flex, center
- Gap: 6px
- Font: 12.5px
- Color: `--label`
- White-space: nowrap
- Margin-right: 24px
- **b:** 10px uppercase, weight 700, color steel
- **`.ref-val`:** 13px bold navy

**Inline Input (`.ref-input`):**
- Height: 26px
- Border: 1px solid `--border-dk`
- Border-radius: 4px
- Padding: 0 8px
- Font: 12px
- Color: text
- Background: white
- Outline: none
- Width: 110px
- Focus: border `--navy`, box-shadow 0 0 0 2px rgba(primary, 0.15)

**Screens Using:** repairs.html (detail cockpit)

---

### Segmented Control (`.seg-bar` + `.seg-btn`)

**Selector:** `.seg-bar`

**Properties:**
- Display: inline-flex
- Border: 1px solid `--border-dk`
- Border-radius: 4px
- Overflow: hidden
- Margin-bottom: 6px

**Button (`.seg-btn`):**
- Padding: 4px 14px
- Font: 10.5px
- Border-right: 1px solid `--border-dk`
- Cursor: pointer
- Background: white (active: navy, color white)
- Border: none (outline removed)

**Last Button:** border-right none

**Screens Using:** repairs.html (Internal/External toggle), departments.html (service location)

---

### Toggle Switch

**Selector:** `.toggle-row` + `.toggle-label` + `.toggle`

**Properties:**
- `.toggle`: width 34px, height 19px, cursor pointer
- `.toggle-slider`: border-radius 10px, background `--primary`, position relative
- `.toggle-slider::before`: width 13px, height 13px, border-radius 50%, bg white, absolute left 3px
- Input:checked + `.toggle-slider::before`: transform translateX(15px)

**Label (`.toggle-label`):**
- Font: 11px
- Gap: 8px (flex row)
- Margin-bottom: 6px

**Screens Using:** Contracts (toggle options), Inventory (toggle switches)

---

### Action Bar (Repairs)

**Selector:** `.action-bar`

**Properties:**
- Display: flex, wrap
- Gap: 20px
- Padding: 8px 14px
- Background: `--neutral-50`
- Border: 1px solid `--border-dk`
- Border-radius: 4px
- Box-shadow: `--shadow-card`

**Group (`.action-group`):**
- Display: flex, column
- Gap: 1px

**Label (`.lbl`):**
- Font: 9px bold uppercase, muted, letter-spacing 0.04em

**Value (`.val`):**
- Font: 13px bold navy
- Classes: `.val.green` (green), `.val.red` (red)

**Screens Using:** repairs.html (detail bottom bar)

---

### Split Layout (Master-Detail)

#### Contracts Split
**Left Panel (`.list-panel`):**
- Width: 320px
- Flex-shrink: 0
- Border-right: 1px solid `--border`
- Background: white
- Display: flex, column
- Overflow: hidden
- Transition: width 0.2s ease

**Collapsed:** width 0, border-right none

**Header (`.list-head`):**
- Background: `--neutral-50`
- Padding: 6px 12px
- Font: 10px bold uppercase, navy
- Border-bottom: 1px solid `--border`
- Display: flex, space-between
- Gap: auto

**Search (`.list-search`):**
- Padding: 6px 10px
- Border-bottom: 1px solid `--border`

**Input (`.inp-search`):**
- Width: 100%
- Height: 28px
- Border: 1.5px solid `--border-dk`
- Border-radius: 4px
- Padding: 0 10px 0 28px (search icon)
- Font: 11px
- Outline: none
- Background: search icon no-repeat 8px center
- Focus: border `--navy`, box-shadow 0 0 0 3px rgba(primary, 0.08)

**Scroll Area (`.list-scroll`):**
- Flex: 1
- Overflow-y: auto

**List Item (`.list-item`):**
- Padding: 10px 12px
- Border-bottom: 1px solid `--border`
- Cursor: pointer
- Transition: background 0.1s
- Hover: background `--primary-light`

**Selected (`.list-item.selected`):**
- Background: `--primary-light`
- Border-left: 2px solid navy
- Padding-left: 10px

**Item Details:**
- `.li-top`: display flex, space-between, margin-bottom 2px
- `.li-name`: 12px bold navy
- `.li-badge`: 9.5px bold, padding 1px 7px, border-radius 8px
- `.li-meta`: 10.5px muted, display flex, gap 12px

**Footer (`.list-footer`):**
- Padding: 4px 12px
- Border-top: 1px solid `--border`
- Background: `--neutral-50`
- Display: flex, space-between
- Font: 10px muted
- Flex-shrink: 0

**Expand Button (`.list-expand-btn`):**
- Display: none (shown when list collapsed)
- Position: absolute, left 0, top 50%, transform translateY(-50%)
- Z-index: 10
- Width: 20px, height: 48px
- Background: navy
- Color: white
- Border: none
- Border-radius: 0 6px 6px 0
- Cursor: pointer
- Box-shadow: 2px 0 8px rgba(0,0,0,0.12)

**Collapse Button (`.list-collapse-btn`):**
- Width: 20px, height: 20px
- Border-radius: 4px
- Border: 1px solid `--border-dk`
- Background: white
- Cursor: pointer
- Display: flex, center
- Color: navy
- Font: 11px
- Hover: bg navy, color white, border navy

#### Detail Panel (Right)
**Selector:** `.detail-panel`

**Properties:**
- Flex: 1
- Overflow-y: auto
- Background: `--neutral-100`
- Display: flex, column

**Header (`.detail-header`):**
- Padding: 10px 16px
- Border-bottom: 1px solid `--border`
- Background: white
- Display: flex, space-between, center
- Flex-shrink: 0

**Left (`.dh-left`):**
- Display: flex, center, gap 10px

**h2:** 14px bold navy

**ID Badge (`.dh-id`):**
- Background: `--bg`
- Border: 1px solid `--border`
- Border-radius: 6px
- Padding: 2px 10px
- Font: 11px bold steel

**Status Badge (`.dh-status`):**
- Display: inline-flex
- Padding: 3px 12px
- Border-radius: 12px
- Font: 11px bold

**Screens Using:** contracts.html, inventory.html (split layouts)

---

### Shuttle / Transfer List

**Selector:** `.shuttle` or `.transfer`

**Grid (Two-Column):**
- Display: grid / flex
- Grid-template-columns: 1fr 1fr
- Gap: 14px (grid) or 8px (flex)

**Panel (`.shuttle-panel` / `.transfer-box`):**
- Background: white
- Border: 1px solid `--border`
- Border-radius: 8px
- Overflow: hidden
- Display: flex, column
- Box-shadow: `--shadow-card`

**Header (`.shuttle-head` / `.transfer-head`):**
- Background: `--neutral-50`
- Padding: 7px 12px
- Font: 11.5px bold navy
- Border-bottom: 1px solid `--border`
- Display: flex, space-between

**Search (`.shuttle-search`):**
- Padding: 6px 12px
- Border-bottom: 1px solid `--border`

**Body (`.shuttle-body` / `.transfer-list`):**
- Flex: 1
- Overflow-y: auto
- Max-height: 340px (shuttle) / 200px (transfer)

**Row (`.shuttle-row` / `.transfer-item`):**
- Display: flex, space-between (shuttle) / center (transfer)
- Padding: 5–7px 12px
- Border-bottom: 1px solid `--border`
- Font: 12px (shuttle) / 11.5px (transfer)
- Color: text
- Cursor: pointer
- Transition: background 0.1s
- Nth-child(even): background `--row-alt`
- Hover: background `--primary-light`
- Selected (`.sel`): background `--primary-light`, font-weight 600

**Add/Remove Buttons:**
- `.shuttle-add`: 24px, border `#BFDBFE`, bg `--primary-light`, color blue
- `.shuttle-remove`: 24px, border `#FECACA`, bg `#FEF2F2`, color red
- Transfer arrows: 28x28px, border `--border-dk`, bg white, navy text, hover: bg navy, color white

**Screens Using:** Contracts scopes (shuttle), Inventory transfer between sizes

---

### Two-Column Form Layout

**Selector:** `.two-col` / `.col-l` + `.col-r`

**Properties:**
- Display: flex
- Gap: 10px
- Align-items: flex-start

**Columns:**
- Flex: 1
- Min-width: 0 (allow shrink)
- Display: flex, flex-direction column
- Gap: 10px

**Screens Using:** Contracts (scopes/pricing), Inventory (split form)

---

### Breadcrumb (Legacy)

**Selector:** `.breadcrumb`

**Status:** Hidden (display:none) on most pages; used in older implementations

---

## Empty States

**Selector:** `.empty-state`

**Properties:**
- Text-align: center
- Padding: 30–40px 16–20px
- Color: `--muted`
- Font-size: 12–13px
- Font-style: italic (optional)

**SVG (optional):**
- Width: 28–36px
- Height: 28–36px
- Opacity: 0.2–0.25
- Margin-bottom: 6–8px

**Screens Using:** All list/table pages (Contracts, Loaners, Inventory, etc.)

---

## Typography & Text Utilities

### Heading Sizes
- h1: 24px (--text-2xl)
- h2: 18px (--text-xl)
- h3: 15px (--text-lg)
- Standard text: 14px (--text-base)
- Small text: 13px (--text-sm)
- Extra small: 12px (--text-xs)

### Text Transforms
- `.uppercase`: text-transform uppercase
- `.lowercase`: text-transform lowercase
- `.capitalize`: text-transform capitalize

### Truncation
- Single line: `white-space: nowrap; overflow: hidden; text-overflow: ellipsis`
- Multi-line: limit line-clamp value

---

## Color Utilities by Context

### Semantic Text Colors
- `.text-navy` / `.s-navy`: `--navy` (`--primary`)
- `.text-red` / `.s-red`: `--red` (`--danger`)
- `.text-green` / `.s-green`: `--success`
- `.text-amber` / `.s-amber`: `--warning`
- `.text-blue` / `.s-blue`: `--primary`
- `.text-muted`: `--muted` (`--neutral-500`)
- `.text-label`: `--label` (`--neutral-700`)
- `.text-steel`: `--steel` (`--primary-dark`)

### Background Colors
- `.bg`: `--bg` (`--neutral-50`)
- `.card`: `--card` (white)
- `.row-alt`: `--row-alt` (`--neutral-50`)
- `.row-hover`: `--row-hover` (`--primary-light`)

### Border Colors
- `.border`: `--border` (`--neutral-200`)
- `.border-dk`: `--border-dk` (`#B8C8E0`)

---

## Responsive & Density Modes

### Compact Mode
**Trigger:** `localStorage.setItem('tsi_density', 'compact')` or `data-density="compact"`

**Changes:**
- Sidebar collapses to 56px
- Row padding reduces
- Font sizes decrease by 1–2px
- Spacing tightens (--sp-2 in place of --sp-3)

### Scrollbar Styling
```css
::-webkit-scrollbar {
  height: 6px;
  width: 6px;
}
```

Horizontal scrollbars on dashboard, contracts, loaners table headers

---

## Page-Specific Overrides

### Dashboard (dashboard.html)
- Page-body: flex column, overflow hidden
- Stat-strip: full-width clickable KPIs
- Table: 2-row pairs (row-main + row-detail)
- Subnav: 11 dashboard tabs

### Repairs (repairs.html)
- Detail-only layout (no list panel)
- Tabs: 8 content tabs
- QC drawer: 520px right-side inspection form
- Flags bar: warning background, inline flag chips
- P/F grid: 4-column inspection items

### Clients (clients.html)
- 7 tabs: Main, Addresses, Departments, Flags, Contacts, Report Card, Activity
- Col-left / col-right split
- Status strip: 8 KPI chips
- Stat-chip: Active color override to green

### Contracts (contracts.html)
- Split layout: 320px list + detail
- Module tabs: 2–3 contract modules (CSA, Pending, etc.)
- Transfer widgets: Scope list shuttles
- Modal width: 700–860px

### Loaners (loaners.html)
- Subnav: 3 tabs (Loaners, Requests, Scope Needs)
- Table: Loaner status badges + days-out chips
- Drawer: 440px detail editor
- Badge variants: `.badge-out`, `.badge-overdue`, `.badge-reserved`, `.badge-loaner`

### Inventory (inventory.html)
- Split layout: 260px left (master list) + detail right
- Item header bar: inline edits + toggles
- Sizes split: grid left + detail panel right
- Modal width: 780px
- Tab content: flex layout (split mode)

### Departments (departments.html)
- Scope drawer: 420px editor on right
- Shuttle layout: bilateral scope/facility lists
- Dual-panel checkout forms
- Scope history modal: 700px with table

---

## Data Attributes & Conventions

### Data Density
- `data-density="compact"` on body for compact mode
- Affects sidebar collapse, row heights, spacing

### Data Badge
- Topbar badge showing "SQL SERVER MODE" (red) or "Local API" (green)
- Click to toggle between modes (toggles API mode)

### Save Status
- `class="save-ready"` / `.save-unsaved` / `.save-saving` / `.save-saved`
- Icon + text indicator in topbar or toolbar

### Selection States
- `.selected`: outline + highlight color
- `.selected-row`: highlighted table row
- `.selected-size`: highlighted inventory size row

---

## Summary: Component Hierarchy

```
SHELL
├── Sidebar (240px, dark)
│   ├── Brand logo + text
│   ├── Nav groups (section labels + items)
│   └── Footer copyright
├── Main
│   ├── Topbar (64px, dark)
│   │   ├── Logo (left)
│   │   ├── Orders dropdown menu
│   │   ├── Save indicator
│   │   ├── Density toggle
│   │   ├── Service location select
│   │   ├── Avatar + welcome
│   │   └── Sign out button
│   └── Page body
│       ├── [Dashboard subnav (tabs)] — dashboard pages only
│       ├── Toolbar (filters, search, actions)
│       ├── [Status strip] — KPI chips, optional
│       ├── [Stat strip] — clickable metrics, optional
│       ├── [Tab bar] — main content tabs, optional
│       ├── Main content
│       │   ├── [Split layout — list + detail]
│       │   ├── [Panels — cards with form fields]
│       │   ├── [Tables — data display]
│       │   ├── [Forms — fieldsets + inputs]
│       │   └── [Modals / Drawers — overlays]
│       ├── [Action bar] — context actions, optional
│       └── [Table footer] — pagination, optional
```

---

## File References

**CSS:** `styles.css` (13KB minified)
**Shell:** `shell.js` (12KB, injected on every page)
**Screens Documented:** 33 pages (clients, repairs, contracts, loaners, inventory, departments, dashboard_*, etc.)
**Total Component Types:** 50+ patterns
**Design System:** Enterprise SaaS, navy-primary palette, Inter typography, 8px base grid

