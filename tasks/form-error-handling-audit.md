# Form & Error Handling Audit
**Date:** 2026-03-28
**Scope:** All 34 root `.html` files + 19 `forms/` printable forms
**Purpose:** Map every form/form-like pattern to its error handling quality

---

## Legend

| Error Handling Type | Meaning |
|---|---|
| **Inline FF-Error** | `.ff-error` or `.field-error` DOM elements shown/hidden by JS — highest quality |
| **Toast/TSI.toast** | `showToast()` or `TSI.toast.error()` call — good, visible to user |
| **Save-Status Widget** | Named status indicator in UI (e.g. save-error, save-saved CSS classes) |
| **alert()** | Native browser `alert()` — functional but disruptive, not styled |
| **console.error/warn only** | No user-facing feedback on failure — raw throw or silent swallow |
| **Silent swallow** | `.catch(function(){})` — failure is completely invisible |
| **N/A** | Read-only or display-only, no user submission |

---

## Root Pages — Interactive Forms

| File | Form / Action | Fields | Error Handling Type | User Feedback? | Autosave? | Notes |
|---|---|---|---|---|---|---|
| `login.html` | Login form | Email, Password | Inline `.error-msg` element + `console.error` on network fail | Yes — styled error div shows message | No — explicit submit | Only `<form>` tag with `onsubmit` in the project. Network errors show "Could not reach the server." message in UI. |
| `repairs.html` | NWO Wizard (3-step) | Client, Dept, Confirm | `showToast()` for step validation; `TSI.toast.error()` for required fields | Yes | No — explicit Next/Submit | On step validation failure: "Please select a [X] before continuing". |
| `repairs.html` | Repair Detail (main tab) | Client, WO date, serial, scope, tech, complaint, etc. | `showToast()` for field-level guards; `console.warn` on API failures | Partial — toasts shown for some guards, API failures silently logged | Yes — 1500ms debounce `autoSave()` | `autoSave()` uses `try/catch`; failure shows `console.warn` only, no user alert. Ctrl+S triggers save. |
| `repairs.html` | D&I / Inspection form | P/F checkboxes, date, tech | `showToast()` or `TSI.toast.success()` on save | Yes — toast on success | No — explicit Save button | Fail path: `console.warn` only if API not available. |
| `repairs.html` | NCP drawer | Failure reason (required) | `showToast('Reason for Non-Conformance is required')` | Yes | No | Required-field guard returns early. |
| `repairs.html` | Update Slip form | Request date, tech, reason, comment, findings | `saveSlipField()` on each `onchange`/`oninput` | No user feedback on save failure — `console.warn` only | Yes — per-field save on change | Silent fail on API error. |
| `repairs.html` | Amendment form | Repair item select, reason | `showToast()` for empty-select guards | Yes | No | |
| `repairs.html` | Defect log | Reason, failed tests | `showToast()` for empty guards | Yes | No | |
| `repairs.html` | Delete WO | Confirm click | `showToast('Delete failed — API not available')` | Yes | No | |
| `clients.html` | Add Client drawer | Name (req), Address, Zip, City, State + initial dept fields | `.ff-error` elements in HTML + `TSI.toast.error('Required Fields')` + `showToast(field + ' is required.', 'error')` | Yes — inline errors + toast | No — explicit Save | Best-in-class pattern. `.ff-error` divs shown by JS validation. Focus moved to first invalid field. |
| `clients.html` | Edit Client (autosave) | All client fields | `showToast(field + ' is required.', 'error')` on validation fail; `console.error` on API fail | Partial — validation toast shown, API failure not shown to user | Yes — 1500ms debounce | `autoSave()` catch block logs only: `console.error('[TSI Clients] Save failed:', e)`. |
| `clients.html` | Add/Edit Contact drawer | First name, Last name, etc. | `showToast('First and last name required', 'error')` + `showToast('Save failed: '+e.message, 'error')` | Yes — both validation and API error shown | No — explicit Save | Good pattern: API failure message surfaced via toast. |
| `clients.html` | Add Flag | Flag text | `showToast('Flag message is required.', 'error')` | Yes | No | |
| `clients.html` | Credit Memo | Amount, description | `showToast('Enter a valid amount.', 'error')` + `showToast('Reason is required.', 'error')` | Yes | No | |
| `clients.html` | Delete Client | Confirm inline | `showToast('Delete failed: '+e.message, 'error')` | Yes | No | |
| `departments.html` | Edit Department (main form) | Name, address, sales rep, pricing, type, etc. | `.ff-error` HTML elements + `TSI.toast.error('Required Fields')` + `console.error('[Dept] Save failed:', e.message)` | Partial — validation shown inline, API save failure only logged | Yes — autosave wired to all form fields | Save API failure not surfaced to user. |
| `departments.html` | Add Department drawer | Client (req), Dept name, type, etc. | `alert('Please select a client first.')` + `alert('Could not create department: '+e.message)` | Yes — alert dialogs | No — explicit Create | Uses `alert()` not toast. API failure shown via alert. |
| `departments.html` | Add Scope | Model (req), serial (req) | `alert('Please select a model.')` / `alert('Please enter a serial number.')` | Yes — alert dialogs | No | |
| `departments.html` | Add GPO | GPO select (req) | `alert('Please select a GPO.')` | Yes — alert | No | |
| `departments.html` | Add Max Charge | Instrument type (req) | `alert('Please select an instrument type.')` | Yes — alert | No | |
| `departments.html` | Add Contact | Name fields | `console.error('[Dept] Save contact failed:')` | No user feedback on failure | No | Silent fail on contact save API error. |
| `departments.html` | Delete Department | Typed name confirm | `alert('Please type the department name to confirm deletion.')` + `alert('Could not delete department: '+e.message)` | Yes — alert | No | |
| `departments.html` | Delete Contact | Inline confirm | `console.error('[Dept] Delete contact:', err.message); alert('Could not delete contact.')` | Yes — alert on API failure | No | |
| `contracts.html` | Edit Contract detail | Name (req), type, client, start/end date, monthly fee, etc. | `.ff-error` HTML elements + `TSI.toast.error('Required Fields')` + `showToast('Save failed: '+err.message, true)` | Yes — inline errors + toast | No — explicit Save | Good pattern: both validation inline errors and API failure shown. |
| `contracts.html` | New Contract drawer | Name (req), type, client, sales rep, dates | `.ff-error` HTML elements + `showToast('Contract name is required', true)` + `showToast('Create failed: '+err.message, true)` | Yes | No — explicit Create | |
| `contracts.html` | Add Scope (pending) | Serial number, scope lookup | `status.textContent = 'Serial number is required.'` (inline text node) | Yes — inline text | No | Uses a plain text element, not `.ff-error`. |
| `contracts.html` | Delete Contract | Double-click confirm | `showToast('Delete failed: '+err.message, true)` | Yes | No | |
| `suppliers.html` | Edit Supplier | Name (req), address fields | `alert('Supplier name is required')` + `alert('Save failed: '+e.message)` | Yes — alerts | No — explicit Save | Uses `alert()` not toast. |
| `suppliers.html` | Add Supplier | Name (req), fields | `alert('Supplier name is required')` + `alert('Add failed: '+e.message)` | Yes — alerts | No | |
| `suppliers.html` | Delete Supplier | Inline confirm | `alert('Delete failed: '+e.message)` | Yes — alert | No | |
| `suppliers.html` | Delete Document | Inline confirm | `showToast('Delete failed: '+e.message, true)` | Yes — toast | No | Inconsistent: supplier CRUD uses alerts, document delete uses toast. |
| `loaners.html` | Add/Edit Loaner drawer | WO (req), Qty (req), Scope type (req), Status, Tracking | `.field.invalid` CSS class + `.field-error` spans shown/hidden | Yes — inline field errors | No — explicit Save | Save API failure silently swallowed: `catch` only logs `console.warn`, then closes drawer anyway. |
| `scope-model.html` | Add Model | Name (req), instrument type (req), manufacturer (req) | `alert('Model name is required.')` / `alert('Instrument type is required.')` / `alert('Manufacturer is required.')` | Yes — alerts | No — explicit Add | |
| `scope-model.html` | Toggle model active | Checkbox | `.catch(e => { /* demo */ })` | No | On-change | Silent swallow on API failure. |
| `scope-model.html` | Delete model | Inline confirm | `.catch(e => { /* demo */ })` | No | No | Silent swallow on API failure. |
| `instruments.html` | (read-only catalog) | None — display only | N/A | N/A | N/A | No user-submitted forms. Auth try/catch only. |
| `inventory.html` | Add inventory item modal | Part description, category, etc. | No visible validation or error handling in inline script | No | No | Modal closes on button click. All logic likely deferred (no form submit handler found in inline script). |
| `inventory.html` | PO management | PO fields | No error handling in inline JS | No | No | Confirmation modal uses `classList.remove('open')` only. |
| `acquisitions.html` | (display only) | None — read-only tables | `console.warn` on API load failures | No user feedback | N/A | Three tabs each wrap API call in try/catch logging to console only. |
| `endocarts.html` | New EndoCart | Client (req), Dept (req), Model (req), Sales rep (req) | `alert('Please select a client.')` etc. | Yes — alerts | No | |
| `product-sale.html` | New Sale | Client (req), Dept (req), Sales rep (req) | `alert('Please select a client.')` etc. | Yes — alerts | No | |
| `product-sale.html` | Edit Sale | Sale fields | `alert('No sale selected.')` guard | Yes — alert | No | |
| `administration.html` | System settings | Config values | `alert('Error: '+e.message)` on catch | Yes — alert | No | |
| `administration.html` | Sales rep reassign | From/to rep | `alert('Reassigned N accounts...')` success message | Yes — alert (success AND feedback) | No | |
| `financial.html` | Invoice actions | Delete, release hold | `console.warn('Delete failed:')` / `console.warn('Release failed:')` | No user feedback on failure | No | API failures silently swallowed for user. |
| `financial.html` | Create Invoice | — | `alert('Create Invoice: ...')` informational only | N/A — alert is informational, no form | No | |
| `reports.html` | Report run | Date range pickers, report type | `showToast('Report generating...')` on submit | Yes — toast | No | Minimal JS. No error path needed (opens download). |
| `quality.html` | Report generation | Filter selects | `showToast('Report generated', 'info')` | Yes — toast | No | Generates report on button click. |
| `repair-items.html` | Edit repair item detail | Description (req), prices, active toggle | `.save-error` CSS class on `ri_saveStatus` element; text set to 'Description required' / 'Save failed' | Yes — named save-status widget in detail footer | No — explicit Save button | Handled in `js/repair-items-tab.js`. Best pattern for explicit-save pages. |
| `outsource-validation.html` | (display only) | None — validation table | API load wrapped in try/catch; no save forms | N/A | N/A | |
| `onsite-services.html` | New Visit form | Client (req), Dept (req), Tech (req), Date (req) | `alert('Please fill in all required fields.')` | Yes — alert | No | |
| `onsite-services.html` | Add Tray | Tray name (req), template select | `alert('Enter a tray name.')` / `alert('Select a template first.')` / `alert('A Repair Bin already exists...')` | Yes — alerts | No | |
| `onsite-services.html` | Document upload | — | `alert('Upload not available in demo mode')` | N/A — demo stub | N/A | |
| `workspace.html` | Widget layout | Drag/resize widgets | `try/catch` on render; silently shows `—` placeholder on error | No user feedback on widget error | Yes — localStorage prefs saved on change | |
| `dashboard.html` | QE (quick entry) | WO search, status update | `alert('No approved work orders to extract.')` + `alert('No data to export.')` | Yes — alerts | No | |
| `dashboard_briefing.html` | PPTX generate | Location picker | `showToast('Error: '+data.error)` + `showToast('Failed: '+e.message)` | Yes — toasts for both API error and network failure | No | Good: both error paths surface to user. |
| `dashboard_flags.html` | (display only) | Filters only | `console.error('Failed to load flags:', e)` | No | N/A | |
| `dashboard_analytics.html` | (display only) | Date/filter selects | `console.error('Metrics/TAT/profitability/revenue load failed:', e)` | No | N/A | Four separate data load failures all console-only. |
| `dashboard_invoices.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_shipping.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_techbench.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_tasks.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_inventory.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_purchaseorders.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `dashboard_emails.html` | (display only) | Filter selects | No error handling found | N/A | N/A | |
| `development-list.html` | (utility page) | Filter/search inputs | No form submission | N/A | N/A | |
| `index.html` | (nav hub) | None | N/A | N/A | N/A | |

---

## forms/ Directory — Printable Forms

All 19 forms follow a uniform pattern: they are **print-only templates** that pre-fill from the `?wo=WO_NUMBER` URL param. They contain no user-editable form submissions — the API call is read-only.

| File | Form Purpose | Fields | Error Handling Type | User Feedback? | Notes |
|---|---|---|---|---|---|
| `form-invoice.html` | Invoice (envelope-friendly) | Client, WO, line items | `.catch(function(){})` on two fetch calls | No — silent swallow | Two fetches: `/api/repairs/:wo` + `/api/repair-details/:wo`. Both failures invisible. Blank template rendered if `?wo` absent. |
| `form-om03-2-repair-request.html` | Repair Request Form | Client, dept, scope, complaint | `.catch(function(){})` | No — silent swallow | Standard pattern across all forms. |
| `form-om05-2-di-camera.html` | D&I Camera inspection | P/F checklist, camera coupler | `.catch(function(){})` | No — silent swallow | |
| `form-om05-3-di-rigid.html` | D&I Rigid inspection (33 P/F) | P/F items, tech sign-off | `.catch(function(){})` | No — silent swallow | |
| `form-om06-2-40day.html` | 40-Day warranty form | 9 failure codes, repair details | `.catch(function(){})` | No — silent swallow | |
| `form-om07-2-requisition.html` | Requisition / parts request | Part list, costs, approval | `.catch(function(){})` on two fetches | No — silent swallow | Two fetches: repair + repair-details. |
| `form-om07-3-bi-flex.html` | Post-repair flex inspection (3-page) | 15 P/F items, tech sign-off | `.catch(function(){})` | No — silent swallow | |
| `form-om07-4-bi-camera.html` | Post-repair camera inspection | Camera-specific items | `.catch(function(){})` | No — silent swallow | |
| `form-om07-5-bi-rigid.html` | Post-repair rigid inspection | 33 P/F items | `.catch(function(){})` | No — silent swallow | |
| `form-om07-6-picklist.html` | Inventory pick list | Part numbers, bins, quantities | `.catch(function(){})` | No — silent swallow | |
| `form-om07-8-defect.html` | Defect tracking form | Defect codes, description | `.catch(function(){})` | No — silent swallow | |
| `form-om07-9-amendment.html` | Amendment to repair | Amended items, costs | `.catch(function(){})` | No — silent swallow | |
| `form-om10-1-final-rigid.html` | Final inspection — rigid (customer-facing) | Inspection results | `.catch(function(){})` | No — silent swallow | |
| `form-om10-2-final-flex.html` | Final inspection — flex (customer-facing) | Inspection results | `.catch(function(){})` | No — silent swallow | |
| `form-om10-3-final-camera.html` | Final inspection — camera (customer-facing) | Camera results | `.catch(function(){})` | No — silent swallow | |
| `form-om14-1-return-verification.html` | Packing slip / scope return verification | Scope list, shipping info | `.catch(function(){})` | No — silent swallow | |
| `form-om15-2-update-slip.html` | Internal update slip | Reason, findings, tech | `.catch(function(){})` | No — silent swallow | |
| `form-om17-1-loaner.html` | Loaner agreement ($200/day fee) | Loaner details, signature | `.catch(function(){})` | No — silent swallow | |
| `form-om23-1-ncp.html` | Non-conforming product (NCP) | Failure codes, disposition | `.catch(function(){})` | No — silent swallow | |

> All `forms/` files share the same silent-swallow pattern. This is acceptable for read-only print templates where a blank form is the correct fallback when `?wo` is absent or the API call fails. No user data is submitted.

---

## Summary: Error Handling Quality Tiers

### Tier 1 — Inline field errors + toast (best pattern)
- `login.html` — inline `.error-msg` element
- `clients.html` — `.ff-error` divs + `TSI.toast.error` + focus management
- `contracts.html` — `.ff-error` divs + `showToast` on API failure
- `departments.html` (validation only) — `.ff-error` divs; API save failure not shown
- `repair-items.html` — named save-status widget (save-error/save-saved CSS states)
- `loaners.html` — `.field.invalid` + `.field-error` spans (validation); API failure silently swallowed

### Tier 2 — Toast only (good visibility, no inline markers)
- `repairs.html` — `showToast()` and `TSI.toast.error()` for validation + most guards
- `dashboard_briefing.html` — both error paths toast to user
- `reports.html`, `quality.html` — toast on action
- `suppliers.html` (doc delete only) — toast; CRUD uses alerts

### Tier 3 — alert() dialogs (functional but not styled)
- `departments.html` (create/delete actions)
- `suppliers.html` (CRUD)
- `scope-model.html`
- `endocarts.html`
- `product-sale.html`
- `onsite-services.html`
- `administration.html`
- `dashboard.html`

### Tier 4 — console.error/warn only (no user feedback on failure)
- `repairs.html` autosave — failure logged, not shown
- `clients.html` autosave — failure logged, not shown
- `departments.html` save, contact save, export helpers — API failures logged only
- `loaners.html` save — `.catch` closes drawer and reloads without alerting user
- `financial.html` delete/release — `console.warn` only
- `dashboard_analytics.html` — four data-load failures console only
- `dashboard_flags.html`, `acquisitions.html` — load failures console only
- `scope-model.html` toggle/delete — `.catch(e => { /* demo */ })` completely silent

### Tier 5 — Silent swallow (completely invisible failures)
- All 19 `forms/` printable templates — `.catch(function(){})` on API pre-fill calls
- `scope-model.html` toggle active, delete model
- `repairs.html` sub-tab load — `.catch(function() {})` on detail sub-calls

---

## Issues to Address

| Priority | Issue | Files Affected |
|---|---|---|
| High | Autosave failures not surfaced to user | `repairs.html`, `clients.html`, `departments.html` |
| High | Loaners save swallows failure and closes drawer silently | `loaners.html` |
| High | `departments.html` contact-save API failure invisible | `departments.html` |
| Medium | `financial.html` delete/release failures not shown | `financial.html` |
| Medium | `scope-model.html` toggle/delete completely silent | `scope-model.html` |
| Medium | Inconsistent feedback pattern: alerts vs toasts mixed in same file | `suppliers.html`, `departments.html` |
| Low | All read-only dashboard tabs: data-load failures console-only (no "Failed to load" state in UI) | All `dashboard_*.html` display pages |
| Low | `forms/` silent swallow acceptable for print templates but could show a "Could not pre-fill" banner | All `forms/` files |
