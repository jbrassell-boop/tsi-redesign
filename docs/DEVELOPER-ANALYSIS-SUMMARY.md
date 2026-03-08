# TSI Developer Analysis Report — Summary for AI Agents
> Source: `docs/TSI-Developer-Analysis-Report.html` (full interactive report)
> Analysis Date: March 8, 2026
> App: totalscopetestweb.mol-tech.com / API: totalscopetestapi.mol-tech.com

## 1. Architecture
- React CRA + React Router v6 + Bootstrap 5.3 (CDN) + React-Select + PrimeReact + react-datepicker
- Iconify runtime CDN for some icons (external dependency risk)
- Session-based auth, email+password login

## 2. Routes
### Dashboard (11 tabs)
`/Dashboard/Scopes`, `/Dashboard/Tasks`, `/Dashboard/Loaners`, `/Dashboard/Emails`, `/Dashboard/ShippingStatus`, `/Dashboard/Inventory`, `/Dashboard/Acquisitions`, `/Dashboard/Searches`, `/Dashboard/RepairMetrics`, `/Dashboard/TurnAroundTimes`, `/Dashboard/Flags`

### Feature Pages (20 routes)
`/MyWorkspace`, `/Clients`, `/Departments`, `/Repairs`, `/Inventory`, `/Suppliers`, `/Scopes`, `/ScopeModel`, `/RepairItems`, `/Instruments`, `/Contracts`, `/Acquisitions`, `/Carts`, `/Loaners`, `/OnsiteServices`, `/ProductSale`, `/Quality`, `/Financial`, `/Reports`, `/Administration`

## 3. Dashboard — Scopes Tab
- 202 rows, no pagination, no sorting, no virtualization
- 11 columns: Date In, Client, Department, Work Order, Scope Type, Serial#, Days Last In, Date Approved, Est Del Date, Repair Status, (scrollable)
- Filters: Scope Type (Flexible/Rigid/Instrument/Camera/Carts/Fuse), Size (Large/Small/All), Location (In House/Outsourced)
- Checkboxes: Include Cogentix, Include Total Scope, Hot List
- Status distribution: Major(96), Mid Level(41), Waiting Approval(31), Inspection(24), Minor(5), Eval(3), Drying(2)

## 4. Dashboard — Tasks Tab
- Search Criteria accordion: Status(8), Priority(4), Type(8), From/To dates
- 12 rows, 10 columns: Client, Dept, Type, Title, Date, Status, Priority, Requested Models, Notes, Action
- Add/Edit Task: right-side slide panel (~50% viewport), 9 fields + Loaners Requested sub-table

### Task Form Fields
Client, Status (8 opts), Department (filtered by Client), Type (8 opts), Title (auto-gen "Dept - Type"), Priority (4 opts), Task Date, Customer Message (textarea), Task Notes (textarea)

### Task Status Options
Not Started, In Process, Request Fulfilled, Closed Duplicate, Customer Scope Sent, Unable to Fulfill, Request Declined, Not Completed

### Task Type Options
Loaner Request, Loaner Wait List, Miscellaneous, No Loaner - expedite, Pick Up Request, Repair Approved, Requisition, Starter Kit Request

### Task Priority Options
Urgent, High, Normal, Low

## 5. Scope Model — Common Header
- Radio toggle: Flexible / Rigid / Camera (switches form mode)
- Scope Model dropdown (React-Select): 1,264 items (Flexible), unvirtualized
- Copy + Save toolbar buttons, Include Inactive checkbox
- Header fields: Description, Inspection Required, Model Category (37 opts), Active, GL Account, D&I Override (BROKEN)

### Model Category Options (37)
Angioscope through Ureteroscope (includes junk: "New Cat", "test", "TBD")

## 6. Scope Model — Flexible/Camera Specs
Camera mode is identical to Flexible.

| Field | Type | Notes |
|-------|------|-------|
| Manufacturer | React-Select + gear | 20 options |
| Video Image | React-Select + gear | 9 options (includes junk "a") |
| Avg Days Since Last In | react-datepicker | BUG: should be number input |
| Est. Expense Multiplier | text | |
| Contract Cost | PrimeReact InputNumber | currency $ |
| Maximum Charge | PrimeReact InputNumber | currency $ |
| Force On Portal | checkbox | |
| Skip Portal | checkbox | |
| Angulation Up/Down | checkbox | |
| Angulation Left/Right | checkbox | |
| Broken | checkbox | |
| Insertion Tube Length | text | e.g. "1030mm" |
| Unable To Verify | checkbox | |
| Insertion Tube Diameter (OD) | text | e.g. "9.2 mm" |
| By | text | adjacent to diameter |
| Forcep Channel Size (ID) | text | e.g. "2.8 mm" |
| As | date | adjacent to forcep |
| Field of View | text | e.g. "140" |
| Direction of View | text | |

### Flags Panel (right side)
Columns: Instrument Type / Service Location / Flag / Action
Add Flag panel: Instrument Type checkboxes, Locations checkboxes, Visible On D&I, Visible On Blank Inspection, Flag textarea

### Gear Button Modals
- Manufacturer: shows Manufacturer / Instrument Type / Scope Type Count
- Video Image: shows Video Image / Scope Type Count

## 7. Scope Model — Rigid Specs (unique fields)
| Field | Type | Notes |
|-------|------|-------|
| Manufacturer | React-Select + gear | same 20 opts |
| Scope Category | React-Select + gear | 321 options |
| Avg Days Since Last In | text input | correct in Rigid |
| Est. Expense Multiplier | text | |
| Contract Cost | PrimeReact InputNumber | |
| Maximum Charge | PrimeReact InputNumber | |
| Force On Portal | checkbox | |
| Skip Portal | checkbox | |
| Rank | text | sort priority |
| Insertion Tube Diameter | text | |
| Image Size & Center Run Out | masked text | "__" |
| Drawing | React-Select | Yes/No |
| Insertion Tube Length | text | |
| Field of View | text | |
| Tube System | React-Select | 2 Tube / 3 Tube |
| ID Band | text | |
| Squint | text | |
| Lens System | React-Select | Rod Lens / Acromat / Image Bundle |
| Autoclaveable | React-Select | Yes / No |
| Direction of View | text | |
| Degree | React-Select | 0 / 5 / 12 / 30 / 45 / 70 |
| Resolution Group | text | |
| Marker Plate | React-Select | 6 / 9 / 12 |
| Resolution Field | text | |
| Eye Cup Mount | React-Select | Black/Blue/Red/Green/C-Mount/Cartridge |

### Rigid-only sections
- Notes textarea
- Drawing file uploader (BUG: .xlsx only)
- Extract + Import buttons (Import modal BROKEN)

## 8. Scope Model — Sub-Tabs
### Repair Items Tab
Columns: Item Description, L3 Time, L3 Warning, L2 Time, L2 Warning, L1 Time, L1 Warning, Action (delete only)
Add modal: Repair Item dropdown (481 opts), 3 levels × (Completion Time + Warning Time)

### Inventory Tab
Split panel: left = repair items list, right = inventory detail for selected item (master-detail)

## 9. Modal/Panel Patterns
| Feature | Right-Side Panel | Centered Dialog |
|---------|-----------------|-----------------|
| CSS class | .right-model-section | .center-model-section |
| Width | ~50% viewport | ~500-600px |
| Backdrop | None | Dark overlay |
| Used for | Add/Edit Task, Add Flag | Add Repair Item, Gear modals, Import/Export |

## 10. Bug Registry (12 confirmed)
| # | Severity | Page | Issue |
|---|----------|------|-------|
| 1 | Medium | Dashboard/Scopes | Radio IDs are "undefined-*", label click broken |
| 2 | High | Dashboard/Scopes | 202 rows, no pagination/virtualization |
| 3 | High | Dashboard/Scopes | No column sorting |
| 4 | Medium | Dashboard/Tasks | Title auto-overwrites manual edits |
| 5 | Critical | ScopeModel | No list/browse view |
| 6 | Critical | ScopeModel | D&I Override dropdown empty/broken |
| 7 | High | ScopeModel/Flexible | Avg Days uses datepicker (should be number) |
| 8 | Medium | ScopeModel/Rigid | Drawing uploader accepts .xlsx only |
| 9 | Critical | ScopeModel | Import/Export modal "No options" |
| 10 | Medium | ScopeModel | 1,264 items unvirtualized dropdown |
| 11 | Medium | ScopeModel | Repair Items not editable (delete+recreate only) |
| 12 | High | ScopeModel | Video Image has test data "a" |

## 11. Redesign Priority
- **P0 Fix Bugs:** D&I Override, Import/Export, Avg Days datepicker, radio IDs, file uploader
- **P1 Core UX:** Add list view to ScopeModel, pagination, column sorting, bookmarkable URLs
- **P2 Performance:** Virtualize dropdowns, server-side pagination
- **P3 Architecture:** Unify component library, remove CDN deps, typed API schema, clean test data
- **P4 Design System:** Standardize modal/panel patterns, reusable table, consistent forms
