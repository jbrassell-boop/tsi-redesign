# TSI Redesign Component Library

Plain JavaScript components — no framework, no build step. Every component:
- Uses **existing CSS classes** from `styles.css` only
- Exposes a consistent API: `render()` (implicit at mount), `update()`, `destroy()`, `getState()`
- Is a factory function that returns a public API object

---

## Usage

```html
<script type="module">
  import { DataTable, StatusBadge } from './components/index.js';

  const table = DataTable(document.getElementById('tableContainer'), {
    columns: [{ key: 'name', label: 'Name' }],
    rows: [{ name: 'Acme Corp' }],
  });
</script>
```

All components can also be imported individually:
```js
import { DataTable } from './components/DataTable.js';
```

---

## Components

### DataTable

Sortable, paginated table with sticky headers, alternating rows, row selection, and right-click context menu support.

```js
import { DataTable } from './components/DataTable.js';

const table = DataTable(container, {
  columns: [
    { key: 'invoiceNum', label: 'Invoice #', width: '100px' },
    { key: 'clientName', label: 'Client', width: '22%' },
    { key: 'status', label: 'Status', width: '90px',
      render: (val) => StatusBadge.html(val, StatusBadge.variantFor(val)) },
    { key: 'total', label: 'Total', width: '100px', align: 'right',
      render: (val) => `$${Number(val).toFixed(2)}` },
  ],
  rows: [],
  pageSize: 25,
  selectable: true,
  onRowClick: (row, idx, e) => openDrawer(row),
  onContextMenu: (row, idx, e) => ctxMenu.show(e.clientX, e.clientY),
  onSort: (key, dir) => console.log(key, dir),
});

// Update data
table.setRows(newRows);

// Navigate
table.goToPage(2);
table.clearSelection();

// Inspect
const { sortKey, currentPage, totalRows } = table.getState();
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `columns` | Array | `[]` | Column definitions: `{key, label, width?, align?, render?}` |
| `rows` | Array | `[]` | Data rows (plain objects) |
| `pageSize` | number | `25` | Rows per page. `0` = all |
| `pageSizeOptions` | number[] | `[15,25,50,0]` | Page size choices |
| `selectable` | boolean | `false` | Enable row selection |
| `showFooter` | boolean | `true` | Show record count + pagination |
| `emptyTitle` | string | `'No records found'` | Empty state heading |
| `emptyMessage` | string | `''` | Empty state subtitle |
| `onRowClick` | Function | — | `(row, index, event)` |
| `onRowDblClick` | Function | — | `(row, index, event)` |
| `onContextMenu` | Function | — | `(row, index, event)` |
| `onSort` | Function | — | `(key, direction)` |
| `onPageChange` | Function | — | `(page, pageSize)` |

---

### TabBar

Tab navigation strip with active state, optional badge counts, and content panel switching.

```js
import { TabBar } from './components/TabBar.js';

const tabs = TabBar(container, {
  tabs: [
    { id: 'main', label: 'Main' },
    { id: 'addresses', label: 'Addresses' },
    { id: 'contacts', label: 'Contacts', badge: 4 },
  ],
  activeTab: 'main',
  onTabChange: (id, cfg) => console.log('switched to', id),
});

// Content panels expected in DOM: id="tab-main", id="tab-addresses", etc.
// Or pass contentEl directly in the tab config.

tabs.activate('addresses');
tabs.setBadge('contacts', 5);
```

**Options:**

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `tabs` | Array | `[]` | `{id, label, badge?, contentEl?}` |
| `activeTab` | string | first tab | Initially active tab id |
| `blockContent` | boolean | `false` | Use `show-block` instead of `show` |
| `onTabChange` | Function | — | `(id, tabConfig)` |

---

### Toolbar

Action bar: primary button → divider → filters → search input (right-aligned).

```js
import { Toolbar } from './components/Toolbar.js';

const toolbar = Toolbar(container, {
  primaryAction: {
    label: 'New Sale',
    icon: '<svg .../>',
    onClick: () => openAddModal(),
  },
  overflowActions: [
    { label: 'Deactivate', icon: '...', onClick: confirmDeactivate },
    { separator: true },
    { label: 'Delete', danger: true, icon: '...', onClick: confirmDelete },
  ],
  segments: [{
    id: 'segStatus',
    label: 'Status',
    value: '',
    options: [
      { label: 'All', value: '' },
      { label: 'Open', value: 'Open' },
      { label: 'Draft', value: 'Draft' },
    ],
    onChange: (val) => { filters.status = val; runPipeline(); },
  }],
  selects: [{
    id: 'filterRep',
    placeholder: 'All Sales Reps',
    options: reps.map(r => ({ value: r.id, label: r.name })),
    onChange: (val) => { filters.rep = val; runPipeline(); },
  }],
  search: {
    id: 'searchInput',
    placeholder: 'Search invoice#, client...',
    debounce: 300,
    onSearch: (val) => { filters.search = val; runPipeline(); },
  },
});
```

---

### FormField

Labeled form field wrapper supporting all input types.

```js
import { FormField } from './components/FormField.js';

const field = FormField(container, {
  id: 'ci-name',
  label: 'Client Name',
  required: true,
  value: 'Acme Corp',
  onChange: (val) => markDirty(),
});

field.getValue();       // → 'Acme Corp'
field.setValue('...');
field.setError('Required');
field.clearError();
```

**Supported types:** `text`, `email`, `tel`, `number`, `date`, `select`, `textarea`, `toggle`

For `select` type, pass `options: [{value, label}]`.

---

### FormGrid

CSS grid container for form fields.

```js
import { FormGrid } from './components/FormGrid.js';

const grid = FormGrid(container, {
  cols: 2,
  gap: '8px 12px',
  fields: [
    { el: nameFieldEl, span: 2 },
    { el: cityFieldEl },
    { el: stateFieldEl },
  ],
});
```

**Column classes:** `cols: 2` → `.g2`, `3` → `.g3`, `4` → `.g4`
**Span classes:** `span: 2` → `.span2`, `span: 3` → `.span3`

---

### StatusBadge

Semantic inline badge. Includes convenience static methods for use in DataTable render functions.

```js
import { StatusBadge } from './components/StatusBadge.js';

// Component (mounts into DOM)
const badge = StatusBadge(container, { text: 'Active', variant: 'active' });
badge.setText('Inactive');
badge.setVariant('inactive');

// HTML string (for use in DataTable render functions)
StatusBadge.html('Open', 'open');           // → '<span class="badge b-open">Open</span>'

// Normalize an API status string to a variant
StatusBadge.variantFor('Quote Sent');       // → 'quoted'
StatusBadge.variantFor('invoiced');         // → 'invoiced'
```

**Variants:** `active`, `inactive`, `pass`, `fail`, `conditional`, `info`, `danger`, `warn`, `success`, `neutral`, `draft`, `open`, `invoiced`, `cancelled`, `quoted`

---

### StatStrip

Horizontal KPI chip row. Chips are clickable to filter data below.

```js
import { StatStrip } from './components/StatStrip.js';

const strip = StatStrip(container, {
  chips: [
    { id: 'total', value: '0', label: 'Total Orders', iconColor: 'navy', valueColor: 'navy',
      icon: '<svg .../>',  clickable: true },
    { id: 'open', value: '0', label: 'Open', iconColor: 'blue', valueColor: 'blue' },
    { id: 'invoiced', value: '0', label: 'Invoiced', iconColor: 'green', valueColor: 'green' },
  ],
  onChipClick: (id, cfg, activeId) => {
    filters.status = activeId === 'invoiced' ? 'Invoiced' : '';
    runPipeline();
  },
});

// Update KPI values after data loads
strip.setValues({ total: 42, open: 15, invoiced: 27 });
strip.setActive('open');
```

**Icon color classes (`iconColor`):** `green`, `blue`, `navy`, `amber`, `red`, `purple`
**Value color classes (`valueColor`):** `green`, `blue`, `navy`, `amber`, `red`, `purple`, `muted`

---

### Drawer

Standard 600px slide-out right panel.

```js
import { Drawer } from './components/Drawer.js';

const drawer = Drawer(document.body, {
  id: 'saleDrawer',
  title: 'SI-10001',
  subtitle: 'Acme Corp — Open',
  tabs: [
    { id: 'overview', label: 'Overview', content: overviewEl },
    { id: 'items', label: 'Line Items', content: itemsEl },
    { id: 'docs', label: 'Documents', content: docsEl },
  ],
  footer: `<button class="btn btn-navy btn-sm">Save Changes</button>`,
  onClose: () => clearSelection(),
});

drawer.open();
drawer.close();
drawer.setHeader('SI-10002', 'Nashville General — Draft');
drawer.switchTab('items');
```

**Width presets:** Standard `600px`. Override with `width: '520px'` for QC drawers per spec.

---

### Modal

Overlay dialog with animated transitions.

```js
import { Modal } from './components/Modal.js';

const modal = Modal(document.body, {
  id: 'addClientModal',
  title: 'New Client',
  size: 'md',       // sm=420px, md=620px, lg=780px
  body: formEl,
  actions: [
    { label: 'Cancel', variant: 'cancel', onClick: () => {} },
    { label: 'Create Client', variant: 'save', onClick: () => saveClient() },
  ],
  onClose: () => resetForm(),
});

modal.open();
modal.setBody(newContent);
modal.setTitle('Edit Client');
```

---

### SearchInput

Search bar with icon, debounce, and clear button.

```js
import { SearchInput } from './components/SearchInput.js';

const search = SearchInput(container, {
  id: 'searchInput',
  placeholder: 'Search clients...',
  debounce: 300,
  onSearch: (val) => { filters.q = val; runPipeline(); },
});

search.getValue();
search.setValue('test');
search.clear();
```

---

### SegmentedControl

Pill-shaped mutually exclusive button group.

```js
import { SegmentedControl } from './components/SegmentedControl.js';

const seg = SegmentedControl(container, {
  id: 'segStatus',
  value: '',
  options: [
    { label: 'All', value: '' },
    { label: 'Draft', value: 'Draft' },
    { label: 'Open', value: 'Open' },
    { label: 'Invoiced', value: 'Invoiced' },
  ],
  onChange: (val) => { filters.status = val; runPipeline(); },
});

seg.getValue();     // → current value
seg.setValue('Open');
```

---

### Pagination

Page navigation with records-per-page selector. Standalone — use when DataTable's built-in footer isn't suitable.

```js
import { Pagination } from './components/Pagination.js';

const pg = Pagination(container, {
  total: 0,
  page: 1,
  pageSize: 25,
  onChange: ({ page, pageSize }) => {
    currentPage = page;
    currentPageSize = pageSize;
    renderTable();
  },
});

pg.setTotal(143);
pg.goToPage(3);
const { page, pageSize } = pg.getState();
```

---

### ContextMenu

Right-click floating menu. One instance per page, repositioned on each show.

```js
import { ContextMenu } from './components/ContextMenu.js';

const ctxMenu = ContextMenu(document.body, {
  id: 'ctxMenu',
  items: [
    { label: 'View Details', icon: '<svg .../>', onClick: () => openDrawer(ctxRow) },
    { label: 'Edit Sale', icon: '<svg .../>', onClick: () => editRow(ctxRow) },
    { separator: true },
    { label: 'Delete', danger: true, icon: '<svg .../>', onClick: () => deleteRow(ctxRow) },
  ],
});

// Trigger from DataTable onContextMenu
onContextMenu: (row, idx, e) => {
  ctxRow = row;
  ctxMenu.show(e.clientX, e.clientY);
}
```

---

### EmptyState

Centered no-data placeholder.

```js
import { EmptyState } from './components/EmptyState.js';

EmptyState(container, {
  title: 'No sales found',
  message: 'Try adjusting your filters or date range.',
  actionLabel: 'New Sale',
  onAction: () => openAddModal(),
});
```

---

### Panel

Card container with a header and body.

```js
import { Panel } from './components/Panel.js';

const panel = Panel(container, {
  title: 'Client Information',
  body: formGridEl,
});

panel.getBody().appendChild(extraField);
panel.setTitle('Billing Address');
```

---

## Design System Alignment

All components use only tokens and classes already defined in `styles.css`:

| Token | Value |
|-------|-------|
| `--primary` | `#2E75B6` |
| `--primary-dark` | `#1B3A5C` — drawer/modal headers |
| `--neutral-50` | `#F9FAFB` — table headers, panel heads |
| `--neutral-200` | — borders, dividers |
| `--border-dk` | `#B8C8E0` — inputs, drawer borders |
| `--radius-pill` | `9999px` — seg controls, badges |

Drawer standard width: **600px** (QC/NCP use 520px — pass `width: '520px'`).
Modal animation: `opacity 0.2s` overlay + `translateY(15px)→0` on modal box.
