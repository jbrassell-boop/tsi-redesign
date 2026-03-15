# WinScope Workflow → BrightLogix API Mapping

> Created: 2026-03-15
> Purpose: Map WinScope legacy workflows to known BrightLogix endpoints. Use this to plan repairs.html enhancements.

---

## 1. Repair Record CRUD

| Operation | Endpoint | api.js Function | Status |
|-----------|----------|-----------------|--------|
| Get list | `POST /Repair/GetAllRepairList` | `getRepairList()` | ✅ Working |
| Get by key | `GET /Repair/GetAllrepairsBylRepairKey?plRepairKey=N` | inferred | ⚠️ Unverified |
| Create | `POST /Repair/AddRepair` | `addRepair()` | ❓ Not confirmed in Swagger |
| Update | `POST /Repair/UpdateRepair` | `updateRepair()` | ❓ Not confirmed |
| Delete | `DELETE /Repair/DeleteRepair?plRepairKey=N` | `deleteRepair()` | ❓ Not confirmed |

**Key request fields** (Hungarian notation):
- `lScopeKey`, `lDepartmentKey` — asset & location
- `sComplaintDesc` — customer complaint (max 300 chars)
- `lRepairLevelKey` — Minor/Major/etc.
- `sWorkOrderNumber` — auto-generated (e.g., NR26074001)
- `dtDateIn` — auto-populated on create
- `lTechnicianKey`, `lTechnician2Key` — primary/secondary techs
- `lSalesRepKey`, `sPurchaseOrder`, `dblAmtShipping`
- `mComments`, `mCommentsHidden`, `mCommentsISO`, `mCommentsRework`, `mCommentsDisIns` — 5 comment fields
- `sAngInLeft/Right/Up/Down` — rigid scope incoming angulation specs
- `dtAprRecvd` — approval date (set to NULL to reset to quoting stage)

---

## 2. Line Items / Details Tab

| Operation | Endpoint | api.js Function | Status |
|-----------|----------|-----------------|--------|
| Get items | `GET /Detail/GetAllRepairDetailsList?plRepairKey=N` | `getRepairDetailsList()` | ✅ Working |
| Update amount | `POST /Detail/UpdateRepairItemTranAmount` | `updateRepairItemTranAmount()` | ✅ Working |
| Update comment | `POST /Detail/UpdateRepairItemTranComment` | `updateRepairItemTranComment()` | ✅ Working |
| Update approved | `POST /Detail/UpdateRepairItemTranApproved` | `updateRepairItemTranApproved()` | ✅ Working |
| Mark primary | `POST /Detail/UpdateRepairDetailPrimary` | `updateRepairDetailPrimary()` | ✅ Working |
| Add line item | `POST /Detail/AddRepairDetail` | unknown | ❓ Not confirmed |
| Delete line item | unknown | unknown | ❌ Not found |

**Key line item fields**:
- `lRepairItemTranKey` — PK
- `lRepairKey`, `lRepairItemKey` — FKs
- `sDescription` — repair code label
- `dblAmount` — cost
- `lTech1Key`, `lTech2Key` — per-item tech assignment
- `nPoints` — labor productivity units
- `sStatusCode` — `Y`=approved, `A`=amended, `U`=unapproved
- `bBlind` — ⚠️ internal only, must NOT appear on customer docs
- `bAmended` — flag for items added/changed post-quote
- `mComments` — free-text notes

---

## 3. Status Transitions & Workflow Stages

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Get status history | `GET /StatusTran/GetAllRepairStatusesList?plRepairKey=N` | ⚠️ Returns HTTP 500 (server bug) |
| Update status | `POST /StatusTran/UpdateRepairStatus` (inferred) | ❓ Not confirmed |

**WinScope stage → document trigger mapping**:

| Stage | Status Label | Print Trigger | Document(s) |
|-------|-------------|---------------|-------------|
| 1 | Received | Create repair | Disassemble Inspection |
| 2 | In Progress / Quoted | Enter line items | Requisition for Approval |
| 3 | Approved | Customer approves | Inspection Blank + Repair Inventory Pick List |
| 4 | QA Review | Nearing completion | Sign Off Sheet |
| 5 | Complete / Invoiced | Final sign-off | Final Invoice + Scope Return Verification + Final Inspection |

> In WinScope, **printing the document IS the state transition**. In the modern app, printing/generating a document should auto-advance the repair status.

---

## 4. Update Slips (Internal Change Notification)

**Status: ❌ No API endpoints found.**

Data model from WinScope spec:
```
requestDate, responsibleTech, reason (dropdown), items[]{updateReason, checkArea, comment, findings}
```

**Workaround options**:
1. Store as special `mComments` variant with a prefix tag (e.g., `[UPDATE_SLIP]`)
2. Create as a non-billable line item with `sStatusCode='U'` (update) + `mComments` for detail
3. Request dedicated endpoint from MOL-Tech

---

## 5. Amendments (Post-Quote Line Item Changes)

**Status: Partial.** Contract amendments exist (`/api/Contract/...`) but those are for service contracts, not repair line items.

**Repair-level amendment approach**:
- Add new line items via `POST /Detail/AddRepairDetail` with `bAmended=true`
- Existing items get `sStatusCode='A'` in the Details grid
- **Blind Logic**: Items added during amendment can be flagged `bBlind=true` — excluded from customer docs at render time

**Approval Date Reset** (after closing amendment):
- Prompt user: "Do you want to reset the Approval Date?"
- **Yes** → `UpdateRepair` with `dtAprRecvd=NULL` → workflow reverts to quoting
- **No** → No change, workflow continues

---

## 6. Defect Tracking (QA Failure Prevention)

**Status: ❌ No API endpoints found.**

Data model from WinScope spec:
```
defectId, dateLogged, reason, responsibleTech, failedTests[], comment, followUpNotes
```

**Workflow impact**: Defect **blocks invoicing/shipping** until resolved.

**Workaround options**:
1. Store as special status transaction with `mTranComments` for detail
2. Use a dedicated flag on the repair record (e.g., `bQAHold=true`)
3. Request dedicated endpoint from MOL-Tech

---

## 7. Documents (8 Types)

**CRUD endpoints confirmed**:
- `GET /Documents/GetAllDocumentsList?plOwnerKey=N` — list attachments
- `POST /Documents/AddDocuments` — upload
- `POST /Documents/UpdateDocuments` — replace
- `DELETE /Documents/DeleteDocuments?lDocumentKey=N` — remove
- `GET /Documents/DownloadDocument?lDocumentKey=N` — download blob

**Document type coverage**:

| Document | Audience | Includes Pricing | Generate Trigger | Print Template |
|----------|----------|-----------------|-----------------|----------------|
| Disassemble Inspection | Internal (Tech) | No | Intake | ❓ Unknown |
| Requisition for Approval | Customer | **Yes** | Quoting | ❓ Unknown |
| Inspection Blank | Internal (Tech) | No | Approved | ❓ Unknown |
| Repair Inventory Pick List | Internal (Inventory) | No | Approved | ❓ Unknown |
| Sign Off Sheet | Internal (QA) | No | QA Review | ❓ Unknown |
| Final Invoice | Customer / AP | **Yes** | Close-Out | ❓ Unknown |
| Scope Return Verification | Customer (packing) | **No** | Close-Out | ❓ Unknown |
| Final Inspection | Permanent record | No | Close-Out | ❓ Unknown |
| Update Slip | Internal (Ops/Mgmt) | No | Exception | ❓ Unknown |

> **Gap**: Print/generation templates not exposed via API. Likely server-side Crystal Reports or stored procedure calls. May need to build HTML print templates client-side.

---

## 8. Rigid Scope Inspection Data

**Stored directly on tblRepair** (via `UpdateRepair` endpoint):

| Phase | Fields |
|-------|--------|
| Disassemble (intake) | `sAngInLeft`, `sAngInRight`, `sAngInUp`, `sAngInDown`, `sBrokenFibersIn`, `mCommentsDisIns` |
| Inspection Blank (post-repair) | `sAngOutLeft`, `sAngOutRight`, `sAngOutUp`, `sAngOutDown`, `sBrokenFibersOut` |
| Pass/Fail Checkboxes | `sIns*PF` — ~40 columns (exact names not yet extracted from Swagger schema) |

> **Gap**: Need to extract full list of `sIns*PF` checkbox column names from Swagger schema response.

---

## 9. Repair Inventory Pick List (Parts Used)

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Get parts for repair | `GET /RepairInventory/GetAllRepairInventoryList?plRepairKey=N` | ✅ Confirmed |
| Add part to repair | `POST /RepairInventory/AddRepairInventory` (inferred) | ❓ Not confirmed |
| Remove part | `DELETE /RepairInventory/DeleteRepairInventory` (inferred) | ❓ Not confirmed |

**Key fields**: `lInventorySizeKey`, `sItemDescription`, `nQuantityUsed`, `dblCostPerUnit`, `lLotKey`, `dtDateUsed`

---

## 10. Technician Assignment

| Operation | Endpoint | Status |
|-----------|----------|--------|
| Get all techs | `GET /Repair/GetAllTechs` | ✅ Confirmed |
| Assign to repair | Embedded in `UpdateRepair` (`lTechnicianKey`) | ✅ Confirmed |
| Assign to line item | Embedded in line item update (`lTech1Key`) | ❓ Not confirmed |

---

## 11. TAT / Lead Time

| Field | Source | Notes |
|-------|--------|-------|
| `dtDateIn` | tblRepair | Auto-set on create |
| `dtDateOut` | tblRepair | Set on close-out |
| `nTurnAroundTime` | tblRepairItem | Per line item, in days |
| `dtExpDelDate` | tblRepair | Expected delivery (business) |
| `dtExpDelDateTSI` | tblRepair | Expected delivery (customer-facing) |
| SLA | Contract data | 5d default; contract-specific overrides |

TAT is **calculated client-side**: `today - dtDateIn`. No dedicated TAT endpoint.

---

## Summary of Gaps (Priority Order)

| Priority | Feature | Gap | Action |
|----------|---------|-----|--------|
| 🔴 High | Repair Add/Update/Delete | Endpoints not confirmed in Swagger | Verify with MOL-Tech or test directly |
| 🔴 High | Line Item Add/Delete | No endpoints found | Verify or request from MOL-Tech |
| 🔴 High | Status Update | Get exists but returns 500; Update path unknown | Fix server bug, find update endpoint |
| 🟡 Medium | Amendment workflow | Repair-level amendment unclear | Use Detail Add + bAmended flag as workaround |
| 🟡 Medium | Rigid scope checkboxes | 40+ sIns*PF field names unknown | Extract from Swagger schema |
| 🟡 Medium | Defect Tracking | No endpoints found | Workaround via status transaction |
| 🟡 Medium | Update Slips | No endpoints found | Workaround via comments |
| 🟢 Low | Document print templates | Server-side only | Build HTML print templates client-side |
| 🟢 Low | Repair Inventory Add/Delete | Not confirmed | Test or request from MOL-Tech |
