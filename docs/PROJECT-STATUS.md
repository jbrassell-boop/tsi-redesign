# TSI Portal Redesign — Project Status

**Last Updated:** March 9, 2026
**Repo:** github.com/jbrassell-boop/tsi-redesign
**Live:** lively-treacle-f88f15.netlify.app (auto-deploys from `main`)
**Stack:** Pure HTML/CSS/JS — no framework, single-file pages
**API:** BrightLogix .NET 8 at `totalscopetestapi.mol-tech.com/api`

---

## Architecture

### Frontend
- Each page is a standalone HTML file with inline CSS and JS
- No build step — files are served directly by Netlify
- `api.js` is a shared IIFE module included via `<script src="api.js">` on every page
- All pages share the same topbar (48px, navy→steel gradient, Total Scope logo), sidebar (208px), and CSS variable system

### API Layer (`api.js`)
- Global `API` object with auth, token management, and domain-specific methods
- JWT Bearer auth — token stored in `localStorage` as `tsi_token`
- User object stored as `tsi_user`
- Response envelope: `{responseData: "JSON string", isEnType: false}` → parsed to `{statusCode, data, message}`
- Hungarian notation: `p` prefix for request params, type prefixes for response fields (`s`=string, `l`=int, `b`=bool, `dbl`=double, `dt`=date)

### Auth Flow
1. User visits any page → auth guard checks `localStorage` for token
2. No token → redirect to `login.html`
3. Login calls `POST /Authentication/UserLogin` → stores JWT + user object
4. "Enter Demo Mode" button sets dummy token → pages fall back to hardcoded demo data
5. Sign Out clears localStorage → redirects to login

### Dual-Mode Data Pattern
Every API-wired page follows this pattern:
```javascript
async function initPage() {
  try {
    const data = await API.someEndpoint();
    if (data?.length > 0) {
      _liveMode = true; showDataBadge(true);
      populateFromApi(data);
      return;
    }
  } catch (e) { /* fallback */ }
  _liveMode = false; showDataBadge(false);
  loadDemoData(); // hardcoded sample data stays in the page
}
```

### Deployment
- Push to `main` → Netlify auto-deploys
- `netlify.toml` has proxy rule `/api/*` → BrightLogix API (backup for CORS, but API supports CORS natively)

---

## Pages — Complete Inventory

### Hub & Auth
| File | Description |
|------|-------------|
| `index.html` | Navigation hub — links to all pages, stat chips (13 built, 4 API, 9 demo) |
| `login.html` | Login form + "Enter Demo Mode" button |

### Wired to Live API (4 pages)
| File | API Endpoints | Key Features |
|------|--------------|--------------|
| `dashboard.html` | `POST /Dashboard/GetDashboardScopeDataList` | Stat chips, filterable table, repair search modal, create work order flow |
| `clients.html` | `GET/POST/DELETE /Client/*` | Full CRUD, 30+ field mapping, zip lookup, credit memos |
| `inventory.html` | `POST /Inventory/GetAllInventoryList`, `GetAllInventorySizesList` | Item list, sizes grid, stock health dots |
| `repairs.html` | `POST /Repair/GetAllRepairList` | Repair list, detail panel, dates/status/scope info |

### UI Complete — Demo Data Only (9 pages)
| File | Description |
|------|-------------|
| `dashboard_tasks.html` | Tasks tab — priority badges, assignees, due dates |
| `departments.html` | 9 tabs (Main, Addresses, Scopes, GPOs, Scope Types, Sub Groups, Contacts, Documents, Notes) |
| `scope-model.html` | Master-detail split: 240px model list grouped by manufacturer + 4-tab detail panel |
| `suppliers.html` | Supplier list with vendor type filters, master-detail with 4 tabs |
| `product-sale.html` | Dual-panel: accordion inventory picker (left) + order lines (right) |
| `financial.html` | Financial data tables (Outstanding Invoices, Drafts, Revenue Distribution) |
| `workspace.html` | User settings and preferences |
| `contracts.html` | Contract grid with type, PO, client, term date |
| `onsite-services.html` | Field technician visit tracking |

---

## API Endpoints Reference

### Authentication
- `POST /Authentication/UserLogin` — `{psEmailAddress, sPassword360}` → `{isAuthenticated, token, user}`

### Dashboard
- `POST /Dashboard/GetDashboardScopeDataList` — filters: `instrumentTypeValue`, `diameterValue`, `inHouseValue`, `plServiceLocationKey`

### Clients
- `GET /Client/GetAllClientList?plServiceLocationKey=N`
- `GET /Client/GetClientDetailsByClientId?plClientKey=N`
- `POST /Client/AddClient`, `POST /Client/UpdateClient`
- `DELETE /Client/DeleteClient?plClientKey=N`
- `GET /Client/GetCityStateUSA` — zip code → city/state lookup

### Inventory
- `POST /Inventory/GetAllInventoryList` — `{plInventoryKey, pbIncludeInactive, Pagination:{PageNumber,PageSize}, Filters:{}}`
- `POST /Inventory/GetAllInventorySizesList` — `{plInventoryKey, Pagination:{...}, Filters:{}}`
- `POST /Inventory/AddInventory`, `POST /Inventory/UpdateInventory`

### Repairs
- `POST /Repair/GetAllRepairList` — `{plUserKey, plServiceLocationKey}`
- Full repair API reference (30+ endpoints across 4 controllers) documented in research notes

### Supporting
- `POST /ScopeModel/GetAllManufacturersList`, `POST /ScopeModel/GetAllScopeTypeList`
- `GET /Supplier/GetAllSupplierList?plServiceLocationKey=N`
- `GET /Departments/GetAllDepartmentList?plClientKey=N`

### Service Locations
- Upper Chichester = key 1 (default)
- Nashville = key 2

---

## Design System

### CSS Variables (all pages)
```css
--navy: #00257A;   --blue: #2E74B5;   --red: #B71234;
--green: #16A34A;  --amber: #D97706;  --steel: #44697D;
--muted: #8896AA;  --label: #4A5568;  --text: #1A202C;
--border: #DDE3EE; --border-dk: #B8C8E0;
--bg: #E8EDF5;     --card: #FFFFFF;
--row-alt: #F2F5FB; --hover: #D8E6FF;
```

### Layout
- **Topbar:** 48px, `linear-gradient(120deg, var(--navy), var(--steel))`, `assets/logo-white.png` centered
- **Sidebar:** 208px fixed, white bg, SVG icons, active state: `#DDE6F5` bg + navy left border
- **Base font:** 12px Inter (ops tool, not customer-facing)
- **Panel headers:** `#E9EFF9` bg, navy text
- **Table headers:** `var(--navy)` bg, white text
- **Modals:** `overflow:hidden`, 12px border-radius, navy header

### UI Conventions
- Segmented buttons for filters (not checkboxes)
- Toggle sliders for boolean fields
- Status badges with color-coded dots
- Consistent button styles: `.btn-navy`, `.btn-outline`, `.btn-cancel`

---

## Key Files

| File | Purpose |
|------|---------|
| `api.js` | Shared API layer — auth, tokens, all endpoint methods |
| `login.html` | Authentication + demo mode entry |
| `netlify.toml` | Proxy config for API calls |
| `assets/logo-white.png` | White logo for dark topbar (from MOL-Tech production) |
| `assets/logo.png` | Dark logo for light backgrounds |
| `production-repo/` | Cloned MOL-Tech production codebase (React + .NET API) |
| `docs/DEVELOPER-MEMO-MODERNIZATION.md` | Modernization roadmap sent to MOL-Tech |
| `docs/DEVELOPER-ANALYSIS-SUMMARY.md` | Legacy system analysis for AI agents |
| `docs/TSI-Developer-Analysis-Report.html` | Full interactive analysis report |

---

## What's Next (Not Yet Started)

### Pages to wire to API
- departments.html, scope-model.html, suppliers.html, product-sale.html
- financial.html, workspace.html, contracts.html, onsite-services.html, dashboard_tasks.html

### Pages not yet built
- Scopes (scope list with serial/model search)
- Repair Items (catalog with category/item code)
- Instruments (non-scope medical device tracking)
- Acquisitions (scope acquisition workflow)
- Quality (QA and non-compliance)
- Reports/Extracts
- Administration (security, companies, distributors, pricing, staff)

---

*Auto-generated project status — updated March 9, 2026*
