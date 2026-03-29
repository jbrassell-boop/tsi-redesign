# Department Navigation Audit
Date: 2026-03-28
Scope: Client -> Department -> Scopes navigation flow

---

## Section 1: Client to Department Navigation

### Finding 1.1 - Hardcoded demo rows remain in departments-tbody (P2)
File: clients.html:470-479
Both static <tr> rows in #departments-tbody use hardcoded key (clientKey=3502) and no &dept= param.
The dynamic renderDepartments() function at line 1695 correctly emits ?clientKey=...&dept=... for both params.
These static rows are fallback/demo HTML that never get cleared if live API populates tbody before init.
Recommended fix: Remove the two static <tr> rows at lines 470-479. Rely entirely on renderDepartments().

### Finding 1.2 - Departments tab header CTA link missing clientKey param (P2)
File: clients.html:459
The "Managed from the Departments module" link href is plain departments.html with no ?clientKey= param.
User clicking this link lands on departments.html with wrong client loaded (defaults to first in dropdown).
Recommended fix: Make the link dynamic. Set href to departments.html?clientKey=<current key> on client load.

### Finding 1.3 - No clients.html?clientKey=KEY deep-link support (P3)
File: clients.html init block (lines 2520-2558)
No URLSearchParams call exists anywhere in clients.html. External deep-links to a specific client not supported.
The departments.html breadcrumb back-link cannot pre-select the originating client on return.
Recommended fix: On init, read URLSearchParams.get('clientKey') and call selectClientByKey(paramClient) if present.

---

## Section 2: Department to Scopes Navigation

### Finding 2.1 - Scopes table rows have no onclick - BROKEN (P1)
File: departments.html:1558-1566 (loadScopes) and departments.html:484-500 (static rows)
Static demo rows in #tbodyScopes show serial numbers as blue/underlined/cursor-pointer but no onclick handler.
The dynamic loadScopes() function also builds <tr> elements and never attaches an onclick.
Clicking a serial number does nothing. No drawer opens, no scope detail navigated.
Recommended fix: In loadScopes(), add tr.style.cursor = 'pointer' and
tr.onclick = () => openScopeDetail(s.lScopeKey). Implement openScopeDetail() to open drawer or navigate
to scope-model.html?scope=KEY.

### Finding 2.2 - No scope detail view exists from departments (P2)
File: departments.html - no scope detail drawer or navigation found
Add Scope button (openScopeDrawer()) creates new scopes. No affordance to view or edit an existing scope record.
scope-model.html exists in the sidebar nav but departments.html never links to it with a scope key param.
Recommended fix: Add a View action per scope row. Either a detail drawer or navigation to scope-model.html?scope=KEY.

---

## Section 3: Sidebar Navigation Consistency

### Finding 3.1 - Sidebar correctly highlights Departments on departments.html (PASS)
File: shell.js:40-49
currentPage() extracts filename and matches to n.href. departments.html -> nav item Departments (shell.js:16).

### Finding 3.2 - Sidebar correctly highlights Clients on clients.html (PASS)
File: shell.js:15
Same mechanism. clients.html matches nav item Clients. Correct.

### Finding 3.3 - Sidebar updates on page navigation (PASS by design)
Each page navigation triggers a full page load and shell.js re-injection. Active state determined at load time.

---

## Section 4: URL Param Support

### Finding 4.1 - departments.html?clientKey=KEY&dept=DEPTKEY fully works (PASS)
File: departments.html:2589-2619
Both clientKey and dept params are read via URLSearchParams. loadDepartments(clientKey, deptKey) correctly
selects the client dropdown and auto-selects the specific department. SessionStorage fallback handles
the live/demo mode boundary (lines 2599-2608). Correct.

### Finding 4.2 - clients.html?clientKey=KEY not supported (P3)
File: clients.html init block
No URL param handling exists. See Finding 1.3.

---

## Section 5: Breadcrumb / Back Navigation

### Finding 5.1 - Breadcrumb violates CLAUDE.md no-breadcrumbs rule (P2)
File: departments.html:236, 258, 1312-1316, 2640-2657
A #breadcrumb element is rendered and populated via updateBreadcrumb() showing
Departments > Client Name > Department Name. CLAUDE.md states: No breadcrumbs - sidebar shows location.
This is a design standards violation.
Recommended fix: Remove <div class="breadcrumb" id="breadcrumb"> elements at lines 236 and 258.
Remove updateBreadcrumb() call at line 1312. Remove updateBreadcrumb() function at lines 2640-2657.

### Finding 5.2 - No back-to-client affordance after breadcrumb removal (P3)
If breadcrumb is removed per Finding 5.1, no remaining affordance exists to navigate back to the client record.
Recommended fix: Add a small Open in Clients icon-link to clients.html?clientKey=<val> in the toolbar,
next to the Client dropdown.

---

## Section 6: Design Consistency Check

### Finding 6.1 - Redundant dual navigation paradigm (P3)
File: departments.html:115-127 (toolbar dropdowns) and departments.html:238-252 (left panel)
departments.html has both a left-panel department list (like contracts.html split-layout) AND toolbar
Client/Department dropdowns. Both navigate departments. Duplication creates confusion and maintenance overhead.
Recommended fix: Remove toolbar Client/Dept dropdowns and use the left-panel list as sole navigation,
aligning with the contracts.html split-layout pattern.

### Finding 6.2 - Tab active state: PASS
File: departments.html:260-274
Uses global .tab class with showDeptTab(). 2px underline, navy color, 600 weight active state from styles.css.

### Finding 6.3 - Stat strip: PASS
File: departments.html:205-228
Uses .stat-strip / .stat-chip / .s-icon / .s-val / .s-lbl with semantic icon color classes. Standard pattern.

### Finding 6.4 - Drawer width correct, but local re-declaration is tech debt (PASS with note)
File: departments.html:37
Page-scoped .drawer override sets width:600px and z-index:var(--z-drawer) (400). The global styles.css:253
incorrectly uses z-index:var(--z-dropdown) (100) for .drawer - the local override corrects this.
Width 600px matches the standard.
Note: The local .drawer block redundantly re-declares the full drawer structure. Per CLAUDE.md rule 11,
remove this local block (relying on the global class) except for the z-index fix until styles.css is corrected.

### Finding 6.5 - Button placement: PASS
File: departments.html:129
New Department .btn-navy is top-left in the toolbar. Consistent.

### Finding 6.6 - Section header classes inconsistent with clients.html (P2)
File: departments.html:56-57 (local <style>) vs clients.html (global styles.css)
departments.html uses page-local .tbl-head / .tbl-title classes for table section headers.
clients.html uses the global .tbl-card-head / .tbl-card-title classes from styles.css.
Cannot be globally themed.
Recommended fix: Replace .tbl-head and .tbl-title in departments.html with .tbl-card-head and .tbl-card-title.
Remove the local style definitions at lines 56-57.

---

## Priority Summary

| Priority       | Count | Findings                                                                        |
|----------------|-------|---------------------------------------------------------------------------------|
| P1 - Broken    |   1   | 2.1: Scope row clicks dead - no onclick, nothing happens                        |
| P2 - Inconsistent |  5 | 1.1: Hardcoded dept rows; 1.2: CTA link no clientKey; 2.2: No scope detail; 5.1: Breadcrumb violates rule; 6.6: Local .tbl-head vs global .tbl-card-head |
| P3 - Missing   |   3   | 1.3: No clients.html deep-link; 5.2: No back-to-client affordance; 6.1: Dual nav paradigm |

Total: 9 findings (1 P1, 5 P2, 3 P3)
