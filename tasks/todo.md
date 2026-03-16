# Audit Fix Plan — Work Packages

Full audit saved to: `tasks/audit-full-report.md`

---

## WP-1: Dashboard Sub-Tabs ✅
*Audit finding was incorrect — all 8 sub-tabs already had unique content (added in commit 95fce7c)*

- [x] **1a.** Fix Tasks drawer — renamed "Close" → "Save Task" + added Cancel button
- [x] **1b–1i.** All 8 sub-tabs verified: Loaners, Emails, Shipping, Inventory, Acquisitions, Metrics, TAT, Flags — each has unique toolbar, headers, data
- [x] **1j.** Searches sub-tab verified — loads within Dashboard correctly (has own Search ID/Client/Model table)

---

## WP-2: Dashboard Scopes Tab Fixes ✅

- [x] **2a.** WO links now navigate to `repairs.html?wo=...`
- [x] **2b.** Export button wired — downloads CSV of filtered scopes
- [x] **2c.** Print button wired — triggers `window.print()`
- [x] **2d.** Tech Sheets button was already functional
- [x] **2e.** KPI strip now updates dynamically from `calcStats()` on data load and location switch
- [x] **2f.** Added "All" TYPE filter chip
- [x] **2g.** Fixed badge overflow with `max-width:100%;overflow:hidden;text-overflow:ellipsis`

---

## WP-3: Suppliers Module ✅

- [x] **3a.** Added vendor role booleans (`bPartsVendor`, `bRepairVendor`, `bAcquisitionVendor`, `bCartsVendor`) to mock-db.js seed data — suppliers now pass filter logic
- [x] **3b.** KPI counts will now match list data

---

## WP-4: Financial Module ✅

- [x] **4a.** Filters now reset on tab switch (search, status, client all cleared)
- [x] **4b.** Clients on Hold tab benefits from same filter reset fix
- [x] **4c.** KPI chips now load drafts/hold/payments counts via parallel API calls instead of showing "—"

---

## WP-5: Navigation & Sidebar ✅

- [x] **5a.** Sidebar Departments link verified working (active-page detection is correct)
- [x] **5b.** Sidebar Product Sale link verified working
- [x] **5c.** Hub return: sidebar brand + topbar logo now clickable → index.html
- [x] **5d.** All sidebar links audited — all 22 items correctly wired

---

## WP-6: Repairs Status Badge ✅

- [x] **6a.** Status dropdown now calls `updateStatusBadge()` → syncs `#ssStatus .ss-val` with selected status name

---

## WP-7: Minor Polish ✅

- [x] **7a.** Departments: `loadScopes()` now updates `ss-scopes` stat chip with actual scope count
- [x] **7b.** Acquisitions: Added 5-chip KPI stat-strip (In-House, Consigned, Sold, In-House Value, Sold Revenue) with `updateAcqKPIs()`
- [x] **7c.** Login Page link kept (login.html exists and works)
- [x] **7d.** Removed "Internal Design Review" text from hub header

---

## Files Modified
- `shell.js` — logo/brand click → index.html
- `mock-db.js` — supplier seed data with vendor role booleans
- `repairs.html` — status badge sync on dropdown change
- `financial.html` — filter reset on tab switch, KPI chips load from all APIs
- `dashboard.html` — WO links, Export CSV, Print, KPI updates, All type filter, badge overflow
- `dashboard_tasks.html` — Save Task button + Cancel
- `departments.html` — scope count stat chip update
- `acquisitions.html` — KPI stat-strip added
- `index.html` — removed Internal Design Review link

---

## Previously Completed
- [x] Repairs ref-strip restructured into 3 grouped rows (Order, Scope, Timing)
- [x] Stat-strip CSS centralized in styles.css with responsive wrapping
- [x] Inventory UX audit Sprint 1+2 (I-1 through I-15)
- [x] Departments UX audit (D-1 through D-7)
- [x] Clients UX audit (C-1 through C-5)
