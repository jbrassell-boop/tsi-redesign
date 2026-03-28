# Design Pattern Audit — BrightLogix Mockup Hub

## Overview
This document extracts 10 repeatable design patterns from the TSI BrightLogix redesign. Each pattern includes the implementation rule, HTML/CSS structure, and known exceptions.

---

## 1. Left Panel / Right Detail Split (Master-Detail Layout)

**Rule:** When displaying a list of items on the left and detailed editing/view on the right, use a fixed-width left panel (260px–320px) and a flexible right panel that scales with viewport.

**Usage:** Inventory master-detail, Instrument catalog, any dual-pane grid+form layout.

**HTML Structure:**
```html
<div class="split-layout">
  <!-- LEFT PANEL (fixed width) -->
  <div class="split-left">
    <div class="split-left-head">Category</div>
    <div class="split-left-search">
      <input class="search-inp" placeholder="Search..."/>
    </div>
    <div class="split-left-list">
      <div class="item-row selected">Item 1</div>
      <div class="item-row">Item 2</div>
    </div>
    <div class="split-left-footer">Page 1 / 10</div>
  </div>

  <!-- RIGHT PANEL (flex) -->
  <div class="split-right">
    <div class="item-header-bar">Detail fields...</div>
    <div class="form-body">Form content...</div>
  </div>
</div>
```

**CSS Structure:**
```css
.split-layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.split-left {
  width: 260px;
  flex-shrink: 0;
  background: var(--card);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.split-right {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
  display: flex;
  flex-direction: column;
  padding: 8px 12px;
  gap: 6px;
}

.item-row {
  padding: 3px 8px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  color: var(--text);
  transition: all 0.1s;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.item-row.selected {
  background: #FEF3C7;
  font-weight: 600;
  border-left: 2px solid var(--amber);
}

.item-row:hover {
  background: var(--primary-light);
}
```

**Selection Highlight:** Active item gets a 2px left border + amber highlight with bold text.

**Border Styling:** Vertical divider is 1px solid `var(--border)` (neutral-200).

**[DECISION NEEDED]** Confirm whether left panel should support collapse/expand on smaller viewports.

---

## 2. Tab Structure (Tab Bar + Tab Content)

**Rule:** Tabs are implemented with a `.tab-bar` container and individual `.tab` buttons. Active state triggered by `.active` class on the tab, with corresponding `.tab-content` visibility managed via `.show` or display logic.

**Usage:** Clients, Departments, Contracts, Repairs — multi-faceted record editors.

**HTML Structure:**
```html
<!-- TAB BAR -->
<div class="tab-bar">
  <div class="tab active" onclick="showTab('main', this)">Main</div>
  <div class="tab" onclick="showTab('addresses', this)">Addresses</div>
  <div class="tab" onclick="showTab('departments', this)">Departments</div>
</div>

<!-- TAB CONTENT (hidden by default) -->
<div id="tab-main" class="tab-content show">
  <!-- Content for Main tab -->
</div>
<div id="tab-addresses" class="tab-content">
  <!-- Content for Addresses tab -->
</div>
```

**CSS Structure:**
```css
.tab-bar {
  display: flex;
  padding: 0 14px;
  background: var(--card);
  border-bottom: 1px solid var(--neutral-200);
  margin-top: 0;
}

.tab {
  padding: 8px 18px;
  font-size: var(--text-sm);
  font-weight: 500;
  color: var(--neutral-500);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all var(--ease);
  user-select: none;
}

.tab.active {
  color: var(--navy);
  border-bottom-color: var(--navy);
  font-weight: 600;
}

.tab-content {
  padding: 12px 20px;
  display: none;
}

.tab-content.show {
  display: block;
}

.tab-content.show-block {
  display: block;
  padding: 14px 20px;
  overflow-y: auto;
  flex: 1;
}
```

**Active State Styling:**
- Underline: 2px solid navy, positioned at margin-bottom -1px to overlap the bar border.
- Text color changes to navy, font-weight increases to 600.
- No background fill — only bottom border.

**Nested Content Below Tab Bar:** Immediate child of page body, content padded with 12–20px.

---

## 3. Search / Filter Bar (Toolbar)

**Rule:** Search and filter controls sit in a `.toolbar` row below the topbar. Layout: left-to-right with flexbox, includes primary action buttons (top-left), divider, filter inputs, and always a search input (right-justified).

**Usage:** Repairs, Quality, Inventory, Clients — any page with filterable tables.

**HTML Structure:**
```html
<div class="toolbar">
  <!-- LEFT: Primary action button -->
  <div class="toolbar-group">
    <button class="btn btn-navy" onclick="openAddModal()">
      <svg>...</svg>
      New
    </button>
  </div>

  <!-- Divider -->
  <div class="divider"></div>

  <!-- CENTER: Filter controls -->
  <span class="filter-label">Result</span>
  <div class="seg-group">
    <button class="seg-btn active">All</button>
    <button class="seg-btn">Pass</button>
    <button class="seg-btn">Fail</button>
  </div>

  <div class="filter-sep"></div>

  <!-- Date range -->
  <input type="date" class="date-input" placeholder="From"/>
  <span style="font-size:10px;color:var(--muted)">to</span>
  <input type="date" class="date-input" placeholder="To"/>

  <!-- RIGHT: Search (margin-left: auto) -->
  <input class="search-input" id="search" placeholder="Search..." style="margin-left:auto"/>

  <!-- Export button -->
  <button class="btn btn-outline btn-sm" onclick="export()">
    <svg>...</svg>
    Export
  </button>
</div>
```

**CSS Structure:**
```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 16px;
  background: var(--card);
  border-bottom: 1px solid var(--neutral-200);
  flex-wrap: wrap;
}

.toolbar-group {
  display: flex;
  gap: 5px;
}

.divider {
  width: 1px;
  height: 24px;
  background: var(--neutral-200);
  margin: 0 4px;
}

.filter-label {
  font-size: 10px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  white-space: nowrap;
  letter-spacing: 0.04em;
}

.seg-group {
  display: flex;
  gap: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.seg-btn {
  padding: 5px 12px;
  font-size: 11px;
  font-weight: 500;
  color: var(--text);
  background: #fff;
  border: none;
  border-right: 1px solid var(--border);
  cursor: pointer;
  transition: all 0.1s;
}

.seg-btn:last-child {
  border-right: none;
}

.seg-btn.active {
  background: var(--primary-light);
  color: var(--navy);
  font-weight: 600;
}

.search-input {
  height: 30px;
  width: 200px;
  border: 1.5px solid var(--border-dk);
  border-radius: 6px;
  padding: 0 10px 0 30px;
  font-size: 11px;
  font-family: inherit;
  outline: none;
  background: var(--card) url("data:image/svg+xml,%3Csvg...%3E") no-repeat 10px center;
  transition: border-color 0.15s;
}

.search-input:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.08);
}

.date-input {
  height: 30px;
  border: 1.5px solid var(--border-dk);
  border-radius: 6px;
  padding: 0 8px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text);
  background: var(--card);
  outline: none;
  cursor: pointer;
  width: 120px;
}

.date-input:focus {
  border-color: var(--navy);
}

.filter-sep {
  width: 1px;
  height: 22px;
  background: var(--border-dk);
  flex-shrink: 0;
}
```

**Right-Justification Pattern:** `margin-left: auto` on the search input or export button pushes remaining controls to the right.

**[DECISION NEEDED]** Whether segmented buttons should use border-radius or be fully rounded pills.

---

## 4. Form Field Layout (Label + Input)

**Rule:** Form fields stack vertically: label on top, input below. Labels are small caps, navy color, 9–10px font-weight 700. Inputs are full-width, 40px height (standard), with 10px padding. Required fields marked with red asterisk.

**Usage:** Client/Department/Contract editing, all modal forms, drawer forms.

**HTML Structure:**
```html
<!-- Single column -->
<div class="ff">
  <label>Client Name <span class="req">*</span></label>
  <input class="inp" placeholder="Enter name..."/>
</div>

<!-- Two-column grid -->
<div class="fg g2">
  <div class="ff">
    <label>First Name</label>
    <input class="inp"/>
  </div>
  <div class="ff">
    <label>Last Name</label>
    <input class="inp"/>
  </div>
</div>

<!-- Grouped panel -->
<div class="panel">
  <div class="panel-head">Contact Information</div>
  <div class="panel-body">
    <div class="fg g2">
      <div class="ff">
        <label>Phone</label>
        <input class="inp"/>
      </div>
      <div class="ff">
        <label>Email</label>
        <input class="inp"/>
      </div>
    </div>
  </div>
</div>
```

**CSS Structure:**
```css
.ff {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ff label {
  font-size: 12px;
  font-weight: 600;
  color: var(--label);
  text-transform: none;
  margin-bottom: 2px;
}

.req {
  color: var(--red);
}

.inp {
  height: 40px;
  border: 1px solid var(--neutral-200);
  border-radius: var(--radius-md);
  padding: 0 10px;
  font-size: var(--text-sm);
  font-family: inherit;
  color: var(--text);
  background: #fff;
  outline: none;
  width: 100%;
  transition: border-color var(--ease);
}

.inp:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 3px rgba(var(--primary-rgb), 0.08);
}

.inp-sm {
  height: 28px;
  font-size: var(--text-xs);
  padding: 0 8px;
}

.fg {
  display: grid;
  gap: 8px 12px;
}

.g2 {
  grid-template-columns: 1fr 1fr;
}

.g3 {
  grid-template-columns: 1fr 1fr 1fr;
}

.span2 {
  grid-column: span 2;
}

.panel {
  border-radius: var(--radius-lg);
  overflow: hidden;
  border: 1px solid var(--neutral-200);
  box-shadow: var(--shadow-card);
  display: flex;
  flex-direction: column;
}

.panel-head {
  background: var(--neutral-50);
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--neutral-500);
  border-bottom: 1px solid var(--neutral-200);
}

.panel-body {
  background: #fff;
  padding: 14px 16px;
  flex: 1;
}
```

**Grid System:** `.fg` + `.g2` / `.g3` for column counts. Gap: 8px vertical, 12px horizontal.

**Grouped Sections:** Use `.panel` wrapper with `.panel-head` (section title, uppercase) and `.panel-body` (content).

**[DECISION NEEDED]** Whether `col-left` (full width) and `col-right` (310px sidebar) should be standardized or are page-specific.

---

## 5. Action Button Positioning

**Rule:** Primary actions (New, Save, Submit) are in the toolbar top-left or bottom-right. Destructive actions (Delete, Deactivate) are in an overflow menu (`...` button) with red icon/text. Safe actions and overflow menus use the three-dot button.

**Usage:** Clients, Departments, Contracts, Repairs, Quality — everywhere there's a toolbar.

**HTML Structure:**
```html
<!-- Toolbar with primary button -->
<div class="toolbar">
  <button class="btn btn-navy" onclick="openAddClientModal()">
    <svg>...</svg>
    New
  </button>

  <!-- Overflow menu -->
  <div class="toolbar-more" style="position:relative">
    <button class="btn btn-outline" onclick="toggleMenu()">⋯</button>
    <div class="toolbar-more-dropdown" style="display:none;position:absolute;...">
      <button onclick="deactivateClient()" style="color:#b8860b">
        <svg>...</svg>
        Deactivate Client
      </button>
      <div style="height:1px;background:#e8eaed;margin:4px 12px"></div>
      <button onclick="deleteClient()" style="color:#c53030">
        <svg>...</svg>
        Delete Client
      </button>
    </div>
  </div>
</div>

<!-- Bottom action bar (modals/drawers) -->
<div class="modal-footer">
  <button class="btn btn-outline" onclick="closeModal()">Cancel</button>
  <button class="btn btn-navy" onclick="save()">Save</button>
</div>
```

**CSS Structure:**
```css
.btn-navy {
  background: var(--primary);
  color: #fff;
  font-weight: 600;
}

.btn-navy:hover {
  background: var(--primary-dark);
}

.btn-outline {
  background: #fff;
  border: 1px solid var(--neutral-200);
  color: var(--neutral-700);
}

.btn-outline:hover {
  background: var(--neutral-50);
  border-color: var(--neutral-300);
}

.btn-danger {
  background: #FEF2F2;
  border: 1px solid #FECACA;
  color: var(--danger);
}

.toolbar-more-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  margin-top: 4px;
  background: #fff;
  border: 1px solid #d0d6dd;
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
  z-index: 9999;
  min-width: 200px;
  padding: 6px 0;
  font-size: 13px;
}

.toolbar-more-dropdown button {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  padding: 8px 16px;
  border: none;
  background: none;
  cursor: pointer;
  font-size: 13px;
  text-align: left;
  font-family: inherit;
  transition: background 0.1s;
}

.toolbar-more-dropdown button:hover {
  background: #f0f2f5;
}

.toolbar-more-dropdown button[style*="color:#c53030"]:hover {
  background: #fef2f2;
}

.modal-footer {
  padding: 12px 20px;
  border-top: 1px solid var(--neutral-200);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}
```

**Primary Action:** Top-left `.btn-navy` with icon + label.

**Destructive Actions:** In overflow dropdown, red color (#c53030), grouped at bottom with separator.

**Modal Footers:** Right-aligned buttons, Cancel (outline) then primary action (navy).

---

## 6. Drawer Pattern (Slide-Out Side Panel)

**Rule:** Drawers slide in from the right, fixed 520–600px wide. Header has navy background with title + close button (white ×). Body scrolls independently. Optional footer with action buttons. Activated via class `.open` and `transform: translateX(0)`.

**Usage:** Quality Control inspection detail, Instrument catalog quote, Repairs detail panel, Onsite Services forms.

**HTML Structure:**
```html
<!-- Drawer overlay (click to close) -->
<div class="drawer-overlay" id="overlay" onclick="closeDrawer()"></div>

<!-- Drawer panel -->
<div class="drawer" id="qc_drawer">
  <!-- Header: navy background, icon/title, close button -->
  <div class="drawer-head">
    <div class="dh-info">
      <div class="dh-sn">OM23-1</div>
      <div class="dh-sub">Non-Conforming Product Incident</div>
    </div>
    <button class="drawer-close" onclick="closeDrawer()">✕</button>
  </div>

  <!-- Optional: Drawer tabs -->
  <div class="drawer-tabs">
    <button class="drawer-tab active" onclick="switchTab('form')">Form</button>
    <button class="drawer-tab" onclick="switchTab('history')">History</button>
  </div>

  <!-- Body: scrollable content -->
  <div class="drawer-body">
    <div class="section-card">
      <div class="section-head">Incident Details</div>
      <div class="section-body">
        <div class="field">
          <label>Failure Code</label>
          <select class="inp">
            <option>Code 4 - Contamination</option>
            <option>Code 5 - Damage</option>
          </select>
        </div>
      </div>
    </div>
  </div>

  <!-- Optional: Footer with action buttons -->
  <div class="drawer-footer">
    <button class="btn btn-outline btn-sm">Close</button>
    <button class="btn btn-navy btn-sm">Save</button>
  </div>
</div>
```

**CSS Structure:**
```css
.drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  z-index: var(--z-dropdown);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.2s;
}

.drawer-overlay.open {
  opacity: 1;
  pointer-events: auto;
}

.drawer {
  position: fixed;
  right: 0;
  top: 64px;
  bottom: 0;
  width: 520px;
  background: var(--card);
  border-left: 1.5px solid var(--border-dk);
  z-index: var(--z-drawer);
  transform: translateX(100%);
  transition: transform 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.drawer.open {
  transform: translateX(0);
  box-shadow: var(--shadow-dropdown);
}

.drawer-head {
  padding: 14px 18px;
  background: var(--primary-dark);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
}

.dh-info {
  min-width: 0;
}

.dh-sn {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: -0.2px;
}

.dh-sub {
  font-size: 10.5px;
  opacity: 0.75;
  margin-top: 1px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.drawer-close {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.25);
  color: #fff;
  width: 28px;
  height: 28px;
  border-radius: var(--radius-md);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  transition: background 0.1s;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  font-size: 18px;
}

.drawer-close:hover {
  background: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.drawer-tabs {
  display: flex;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
  flex-shrink: 0;
  padding: 0 14px;
}

.drawer-tab {
  padding: 8px 16px;
  font-size: 11.5px;
  font-weight: 500;
  color: var(--neutral-500);
  cursor: pointer;
  border: none;
  background: transparent;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
  transition: all 0.15s;
  white-space: nowrap;
}

.drawer-tab.active {
  color: var(--navy);
  border-bottom-color: var(--navy);
  font-weight: 600;
}

.drawer-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.section-card {
  background: var(--card);
  border: 1.5px solid var(--border-dk);
  border-radius: 6px;
  overflow: hidden;
  transition: box-shadow 0.15s, transform 0.15s;
  flex-shrink: 0;
}

.section-card:hover {
  box-shadow: 0 4px 12px rgba(var(--primary-rgb), 0.08);
  transform: translateY(-1px);
}

.section-head {
  background: var(--neutral-50);
  padding: 6px 12px;
  font-size: 9.5px;
  font-weight: 700;
  color: var(--navy);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.section-body {
  padding: 10px 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.field label {
  font-size: 9px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.field input,
.field select,
.field textarea {
  height: 28px;
  border: 1.5px solid var(--border-dk);
  border-radius: 4px;
  padding: 0 8px;
  font-size: 11px;
  font-family: inherit;
  color: var(--text);
  background: var(--card);
  outline: none;
  transition: border-color 0.15s;
  width: 100%;
  box-sizing: border-box;
}

.field textarea {
  height: 60px;
  padding: 6px 8px;
  resize: none;
}

.field input:focus,
.field select:focus {
  border-color: var(--navy);
  box-shadow: 0 0 0 2px rgba(var(--primary-rgb), 0.08);
}

.drawer-footer {
  padding: 10px 18px;
  border-top: 1.5px solid var(--border-dk);
  background: var(--neutral-50);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  flex-shrink: 0;
  gap: 8px;
}
```

**Width:** 520px is standard (confirmed in QC module); Instrument Repair uses 600px.

**Header:** Navy background, white text, title (15px, 800 weight), subtitle (10.5px, 75% opacity), close button at right (white background, 28px square).

**Close Behavior:** Clicking overlay or close button removes `.open` class, triggering slide-out animation.

**[DECISION NEEDED]** Whether overlay blur is consistent or page-specific.

---

## 7. Status Badge Pattern

**Rule:** Semantic status badges use fixed color schemes: green for active/pass, red for fail/error, amber for warning/conditional, blue for info. All badges use pill shape (border-radius: 12px), small font (10.5–11.5px), and 1px border matching fill color.

**Usage:** Status indicators in toolbars, tables, stat strips, client/dept status.

**HTML Structure:**
```html
<!-- Active badge -->
<span class="badge b-active">Active</span>

<!-- Inactive badge -->
<span class="badge b-inactive">Inactive</span>

<!-- Status pill (pass/fail/conditional) -->
<span class="badge" style="background:#F0FDF4;border:1px solid #BBF7D0;color:var(--green)">Pass</span>

<!-- Tab count badge -->
<span class="tab-badge">5</span>
```

**CSS Structure:**
```css
.badge {
  display: inline-flex;
  padding: 2px 8px;
  border-radius: var(--radius-pill);
  font-size: var(--text-xs);
  font-weight: 600;
  border: 1px solid;
}

.b-active {
  background: #F0FDF4;
  color: var(--success);
  border-color: #BBF7D0;
}

.b-inactive {
  background: var(--neutral-100);
  color: var(--neutral-500);
  border-color: var(--neutral-200);
}

.b-pass {
  background: #F0FDF4;
  border-color: #BBF7D0;
  color: var(--green);
}

.b-fail {
  background: #FEF2F2;
  border-color: #FECACA;
  color: var(--red);
}

.b-conditional {
  background: #FFFBEB;
  border-color: #FDE68A;
  color: #92400E;
}

.tab-badge {
  display: inline-flex;
  background: var(--navy);
  color: #fff;
  font-size: 9px;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: var(--radius-lg);
  margin-left: 4px;
}
```

**Color Mapping:**
- **Green:** Active, Pass, Success — #F0FDF4 bg, #BBF7D0 border, `var(--green)` text
- **Red:** Fail, Error, Danger — #FEF2F2 bg, #FECACA border, #c53030 text
- **Amber:** Warning, Conditional — #FFFBEB bg, #FDE68A border, #92400E text
- **Blue:** Info, Draft — #EFF6FF bg, #BFDBFE border, `var(--blue)` text
- **Gray:** Inactive, Neutral — neutral-100 bg, neutral-200 border, neutral-500 text

**Pill Shape:** `border-radius: 12px` (not fully rounded, just softened corners).

**Inline vs Block:** All badges are inline-flex by default.

---

## 8. Data Table Pattern (Toolbar + Table + Footer)

**Rule:** Tables follow a consistent structure: header row (sticky, uppercase labels, sortable), body rows (alternating backgrounds, hover state), footer with record count + pagination.

**Usage:** Repairs, Quality Inspections, Inventory, Contracts, Clients — any data grid.

**HTML Structure:**
```html
<div class="toolbar">
  <!-- Filter controls -->
</div>

<div class="table-wrap">
  <table>
    <thead>
      <tr>
        <th style="width:80px">WO# <span class="sort"></span></th>
        <th>Client <span class="sort"></span></th>
        <th>Status <span class="sort"></span></th>
      </tr>
    </thead>
    <tbody>
      <tr onclick="selectRow(this)">
        <td>NR-24001</td>
        <td>88th Medical Group</td>
        <td><span class="badge b-active">In Progress</span></td>
      </tr>
      <tr>
        <td>NR-24002</td>
        <td>Metro Hospital</td>
        <td><span class="badge b-inactive">Closed</span></td>
      </tr>
    </tbody>
  </table>
</div>

<div class="table-footer">
  <div class="record-info">24 records</div>
  <div class="pagination">
    <button class="pg-btn">&lt;</button>
    <button class="pg-btn active">1</button>
    <button class="pg-btn">2</button>
    <button class="pg-btn">&gt;</button>
  </div>
</div>
```

**CSS Structure:**
```css
.table-wrap {
  flex: 1;
  overflow: auto;
  background: var(--card);
}

.table-wrap table {
  width: 100%;
  border-collapse: collapse;
  table-layout: fixed;
}

.table-wrap thead th {
  background: var(--neutral-50);
  color: var(--neutral-500);
  font-weight: 700;
  padding: 8px 10px;
  text-align: left;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  position: sticky;
  top: 0;
  z-index: 2;
  cursor: pointer;
  white-space: nowrap;
  border-right: 1px solid rgba(180, 200, 220, 0.3);
  border-bottom: 1px solid var(--neutral-200);
  user-select: none;
  transition: background 0.1s;
}

.table-wrap thead th:hover {
  background: var(--neutral-100);
}

.table-wrap thead th:last-child {
  border-right: none;
}

.table-wrap thead th .sort {
  font-size: 9px;
  opacity: 0.5;
  margin-left: 3px;
}

.table-wrap thead th.sorted .sort {
  opacity: 1;
}

.table-wrap thead th.sorted.asc .sort::after {
  content: '\25B2';
}

.table-wrap thead th.sorted.desc .sort::after {
  content: '\25BC';
}

.table-wrap tbody td {
  padding: 6px 10px;
  font-size: 11.5px;
  border-bottom: 1px solid var(--border);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.table-wrap tbody tr:nth-child(even) {
  background: var(--row-alt);
}

.table-wrap tbody tr:hover {
  background: var(--primary-light);
  cursor: pointer;
}

.table-wrap tbody tr.selected {
  background: #BFDBFE;
}

.table-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 16px;
  background: var(--neutral-50);
  border-top: 1.5px solid var(--border-dk);
  flex-shrink: 0;
  font-size: 11px;
  color: var(--muted);
}

.record-info {
  font-weight: 500;
}

.pagination {
  display: flex;
  gap: 3px;
  align-items: center;
}

.pg-btn {
  height: 26px;
  min-width: 26px;
  padding: 0 6px;
  border: 1px solid var(--border-dk);
  border-radius: 4px;
  background: var(--card);
  font-size: 11px;
  color: var(--label);
  cursor: pointer;
  font-family: inherit;
  transition: all 0.1s;
}

.pg-btn:hover {
  background: var(--bg);
  border-color: var(--navy);
}

.pg-btn.active {
  background: var(--navy);
  color: #fff;
  border-color: var(--navy);
  font-weight: 600;
}

.pg-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
```

**Header Styling:** Sticky row, uppercase, 8px padding, light gray background, sortable columns.

**Row Alternation:** Even rows use `var(--row-alt)` (slightly darker than white).

**Hover State:** Row background changes to light blue (`var(--primary-light)`).

**Selection:** Row with `.selected` class gets light blue background (#BFDBFE).

**Pagination:** Compact buttons (26px height, right-aligned in footer), active page highlighted navy.

---

## 9. Section Header Pattern (Page Sections)

**Rule:** Major page sections use an H2-style heading with uppercase, small font, letter-spacing. Section dividers are 1px border-top + padding. No background fill on the header row itself.

**Usage:** Dashboard panels, Quality report cards, Inventory sub-sections.

**HTML Structure:**
```html
<!-- Section divider with title -->
<div style="font-size:10px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Invoice Display</div>

<!-- Or as a panel head -->
<div class="panel-head">Client Information</div>

<!-- Or as a section divider with border-top -->
<div style="border-top:1px solid var(--border);padding-top:7px;margin-top:4px">
  <div style="font-size:9.5px;font-weight:700;color:var(--muted);text-transform:uppercase;letter-spacing:.5px;margin-bottom:5px">Service Locations</div>
</div>
```

**CSS Structure:**
```css
.panel-head {
  background: var(--neutral-50);
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  color: var(--neutral-500);
  border-bottom: 1px solid var(--neutral-200);
}

/* Generic section header */
.section-label {
  font-size: 9.5px;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 5px;
}
```

**Typography:**
- Font size: 9.5–11px, weight 600–700
- Color: `var(--muted)` (neutral-500)
- Text transform: uppercase
- Letter spacing: 0.4–0.6em
- Margin below: 5–6px

**Divider Pattern:** Border-top 1px on parent container, section label below.

**[DECISION NEEDED]** Whether section headers should always have background or be borderless.

---

## 10. Stat Strip / KPI Strip (Status Metrics Row)

**Rule:** Stat strips display key metrics horizontally in a single row, each metric in a `.stat-chip` container with icon (colored), label (uppercase, small), and value (large, bold). Background is white, border-bottom is 1px solid. Used on all data-heavy pages (Quality, Inventory, Repairs).

**Usage:** Top-of-page metrics: Total Repairs, Pass Rate, Failures, TAT, Inventory levels, etc.

**HTML Structure:**
```html
<div class="stat-strip">
  <!-- Chip 1: Pass Rate -->
  <div class="stat-chip" id="kpiPass" onclick="chipFilter('Pass')">
    <div class="s-icon si-green">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2" style="width:14px;height:14px">
        <polyline points="20 6 9 17 4 12"></polyline>
      </svg>
    </div>
    <div class="s-data">
      <div class="s-val s-green">94.2%</div>
      <div class="s-lbl">Pass Rate</div>
    </div>
  </div>

  <!-- Chip 2: Total Inspections -->
  <div class="stat-chip" id="kpiTotal">
    <div class="s-icon si-navy">
      <svg viewBox="0 0 24 24" fill="none" stroke="var(--navy)" stroke-width="2" style="width:14px;height:14px">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
      </svg>
    </div>
    <div class="s-data">
      <div class="s-val s-navy">847</div>
      <div class="s-lbl">Total Inspections</div>
    </div>
  </div>

  <!-- Spacer to right-align final metric -->
  <div style="flex:1;flex-shrink:1"></div>

  <!-- Chip N: Cost of Poor Quality (read-only) -->
  <div class="stat-chip" style="cursor:default" title="Cost of Poor Quality">
    <div class="s-icon si-amber">
      <svg>...</svg>
    </div>
    <div class="s-data">
      <div class="s-val" style="color:#C2410C" id="kpiCOPQ">$3,840</div>
      <div class="s-lbl">COPQ</div>
    </div>
  </div>
</div>
```

**CSS Structure:**
```css
.stat-strip {
  display: flex;
  align-items: stretch;
  background: #fff;
  border-bottom: 1px solid var(--neutral-200);
  flex-shrink: 0;
}

.stat-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-right: 1px solid var(--neutral-200);
  min-width: 0;
  flex: 1;
  cursor: pointer;
  transition: background 0.12s, outline-color 0.12s;
  position: relative;
}

.stat-chip:hover {
  background: var(--bg);
}

.stat-chip:last-child {
  border-right: none;
}

.stat-chip.active-chip {
  outline: 2.5px solid var(--navy);
  outline-offset: -2px;
  background: var(--primary-light);
}

.s-icon {
  width: 24px;
  height: 24px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  flex-shrink: 0;
}

.s-icon.si-green {
  color: var(--green);
  background: #F0FDF4;
}

.s-icon.si-blue {
  color: var(--blue);
  background: #EFF6FF;
}

.s-icon.si-navy {
  color: var(--navy);
  background: #F0F2F5;
}

.s-icon.si-amber {
  color: #C2410C;
  background: #FFF7ED;
}

.s-icon.si-red {
  color: var(--red);
  background: #FEF2F2;
}

.s-data {
  min-width: 0;
  overflow: hidden;
}

.s-val {
  font-size: 16px;
  font-weight: 800;
  letter-spacing: -0.3px;
  line-height: 1.1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.s-lbl {
  font-size: var(--text-xs);
  color: var(--neutral-500);
  text-transform: uppercase;
  letter-spacing: 0.2px;
}

.s-val.s-green {
  color: var(--green);
}

.s-val.s-red {
  color: var(--red);
}

.s-val.s-blue {
  color: var(--blue);
}

.s-val.s-navy {
  color: var(--navy);
}

.s-val.s-amber {
  color: var(--amber);
}

.s-val.s-muted {
  color: var(--muted);
}
```

**Icon Colors:** Each semantic type (green, red, blue, navy, amber) has a matching icon color + light background.

**Metric Values:** Large bold text (16px, 800 weight), color-coded to semantic type.

**Labels:** Uppercase, small (9px), muted gray.

**Active State:** `.active-chip` adds a 2.5px navy outline with -2px offset, plus light blue background.

**Clickable:** Most chips are clickable to filter table below; read-only chips have `style="cursor:default"`.

**Spacer:** `<div style="flex:1;flex-shrink:1"></div>` pushes final metric (like COPQ) to the right.

**Alignment:** Chips stretch vertically to fill strip height; icon + label + value vertically centered within each chip.

---

## Summary

All 10 patterns enforce a consistent visual language:
- **Colors:** Navy primary, green for success, red for error, amber for warning.
- **Spacing:** 8px gaps, 12px padding, consistent margin structure.
- **Typography:** 9–16px sans-serif (Inter), uppercase labels, letter-spacing for section headers.
- **Components:** Buttons, inputs, badges, tables follow a single design system.
- **Interactions:** Hover states on interactive elements, active states for selection, smooth transitions (0.1–0.25s).

Use these rules to ensure consistency across all new pages and features in the BrightLogix redesign.

**Last Updated:** March 28, 2026
