# WinScope Legacy Workflow, Document Generation & Data Schema Specification

> Source: Gemini-compiled spec from WinScope legacy system analysis (2026-03-15)
> Purpose: Reference for migrating WinScope workflows into the TSI redesign

---

## 1. Core Data Entities & Fields

The primary entity is the **Repair Record (Work Order)**.

### System-Generated / Auto-Populated
- **Date In**: Current date at creation
- **Work Order #**: Alphanumeric ID (e.g., `NR26074001`)
- **Turn Around Time & Lead Time**: Calculated based on parts/complexity

### User-Entered / Editable Core Fields
- **Serial Number**: Inherited from the asset search
- **Complaint**: Free-text issue reported by the customer
- **Rack #**: Physical location in the lab
- **Repair Level**: Dropdown (e.g., Minor, Major)
- **Repair Reason**: Dropdown (e.g., Unable to Duplicate Issue)
- **Sales Rep, Distributor, Delivery Method, Shipping Amount, P.O. #**
- **Scope Categorization**: Prompted at creation (e.g., Scope Type: Rigid, Scope Category: Arthroscope)

### The Details Tab (Line Items)
Financial and operational core of the repair. Contains predefined repair codes (parts/labor) with costs.

| Field | Description |
|-------|-------------|
| Description | Repair code label |
| U/N/A/R/A | Status flags: Unapproved, Approved, Amended, etc. |
| Amount | Cost |
| Tech 1 / Tech 2 | Assigned technicians |
| Points | Labor units |
| Comments | Free-text notes |

---

## 2. Primary Workflow ("Happy Path") & Document Triggers

> In the legacy system, **printing a physical document acts as the state-machine trigger** to move a scope between departments. In the modern app, these print events should map to automated status updates and digital notifications.

| Stage | Trigger | Document | Purpose & Routing |
|-------|---------|----------|-------------------|
| 1. Intake | Create new Repair Record → Print menu | **Disassemble Inspection** | Routing sheet handed to tech to evaluate scope and log condition |
| 2. Quoting | Tech returns eval; user enters line items → Print menu | **Requisition for Approval** | Formal quote emailed to customer for authorization. Shows line items, costs, taxes |
| 3. Approved | Customer approves quote → Print | **Inspection Blank** | Handed to tech as blank worksheet to perform approved repairs and record final specs |
| 3. Approved | Alongside Inspection Blank | **Repair Inventory Pick List** | Routed to inventory dept — which components/lots to pull for the tech |
| 4. QA Review | Scope nears completion | **Sign Off Sheet** | Internal QA doc comparing "Items Found Broken" vs "Items Approved & Repaired." Requires tech signature |
| 5. Close-Out | Tech assigned to completed items; final inspection passed | **Final Invoice** | Official billing document sent to Accounts Payable |
| 5. Close-Out | Auto-generates during invoicing | **Scope Return Verification** | Packing slip placed in box with returned scope. **Omits pricing** |
| 5. Close-Out | Final workflow completion | **Final Inspection** | Clean finalized record of exact repairs for the asset's permanent history |

> **Rigid Endoscope Note**: Physical forms (Disassemble and Inspection Blank) are digitized at end of workflow via dedicated UI buttons to permanently store checkbox data in the database.

---

## 3. Exception Handling & Secondary Workflows

### A. Update Slip Workflow (Internal Communication)

- **Trigger**: User clicks "Update Slips" on the Details tab
- **Purpose**: Tech discovers new issue mid-repair and needs to alert ops/management without generating a customer quote
- **Data Captured**:
  - Request Date
  - Responsible Tech
  - Reason (e.g., Additional Findings)
  - Component findings (e.g., "Image", "Lights") with free-text comments
- **Document Trigger**: Highlight entry → Print → generates **UPDATE SLIP**
- **Validation**: Comments and Findings required before printing is allowed

### B. Amendment Workflow & Blind Logic

- **Trigger**: User clicks "Amend Repair" on the Details tab
- **Purpose**: Add or alter repair line items after initial quote was sent (e.g., misquoted, or a part broke during repair)

#### The "Blind" Logic (Critical UI/UX Requirement)
- When adding new line items via amendment, user can flag items as **"Blind"**
- **Rule**: Blind items MUST NOT appear on customer-facing documents (Requisition for Approval, Final Invoice)
- Blind items are strictly for internal cost tracking (e.g., lab eating cost of a mistake)

#### Approval Date Reset
After closing an amendment, system prompts: *"Do you want to reset the Approval Date?"*
- **Yes**: Reverts workflow to quoting stage so new Requisition for Approval can be sent
- **No**: Keeps workflow moving (amendment doesn't require new customer sign-off)

- **UI Indicator**: Amended line items display **"A"** in status column of Details grid

### C. Defect Tracking (QA Failure)

- **Trigger**: User clicks "Defect Tracking" on the Details tab
- **Purpose**: Logs failures during final outgoing quality inspection. **Prevents invoicing/shipping**
- **Data Captured**:
  - Date/Time
  - Reason (e.g., Unrelated to previous repair)
  - Technician responsible
  - Checklist of failed tests (e.g., Leak Test, Image)
  - Follow-up notes (e.g., "resealed lens")

---

## 4. JSON Data Schema

```json
{
  "workOrder": {
    "workOrderId": "NR26074001",
    "dateIn": "2026-03-15T09:54:00Z",
    "status": "In Progress",
    "customer": {
      "clientId": "C-123",
      "clientName": "Testing Client",
      "department": "Endoscopy"
    },
    "asset": {
      "serialNumber": "123456",
      "scopeType": "Rigid",
      "scopeCategory": "Arthroscope",
      "model": "0502-404-030"
    },
    "logistics": {
      "rackNumber": "N/A",
      "deliveryMethod": "United Parcel Service",
      "poNumber": null
    },
    "repairDetails": {
      "complaint": "testing",
      "repairLevel": "Minor",
      "repairReason": "Unable to Duplicate Issue",
      "turnAroundTimeDays": 2,
      "leadTimeDays": 5,
      "maxCharge": 215000.00,
      "lineItems": [
        {
          "itemId": "L-001",
          "description": "!! Specialty Rigid Repair I",
          "statusCode": "Y",
          "amount": 0.00,
          "tech1": "Doug Petrock",
          "tech2": null,
          "points": 1.00,
          "isBlind": false,
          "isAmended": false
        },
        {
          "itemId": "L-002",
          "description": "Control Switch Housing Replacement",
          "statusCode": "A",
          "amount": 150.00,
          "tech1": null,
          "tech2": null,
          "points": 0.50,
          "isBlind": true,
          "isAmended": true
        }
      ]
    },
    "exceptions": {
      "updateSlips": [
        {
          "slipId": "US-001",
          "requestDate": "2026-03-15T10:51:00Z",
          "reason": "Additional Findings",
          "responsibleTech": 0,
          "items": [
            {
              "updateReason": "Image",
              "checkArea": "Air/Water Channel",
              "comment": "drops",
              "findings": "distal"
            }
          ]
        }
      ],
      "amendments": [
        {
          "amendmentId": "AM-001",
          "type": "Additional Findings",
          "reason": "Failure missed during update",
          "resetApprovalDate": false,
          "relatedLineItemIds": ["L-002"]
        }
      ],
      "defects": [
        {
          "defectId": "DF-001",
          "dateLogged": "2026-03-15T10:54:57Z",
          "reason": "Unrelated to previous repairs",
          "responsibleTech": "Ed Robbins",
          "failedTests": ["Leak Test"],
          "comment": "failed leak test",
          "followUpNotes": "reseal lens"
        }
      ]
    },
    "rigidScopeData": {
      "disassembleInspection": {
        "objectiveDistalEndAcceptable": true,
        "lightFibersAcceptable": false,
        "specifications": {
          "degree": "30",
          "directionOfView": "Forward"
        }
      },
      "blankInspection": {
        "objectiveDistalEndAcceptable": true,
        "lightFibersAcceptable": true
      }
    }
  }
}
```

---

## 5. Document Types Summary

| Document | Audience | Includes Pricing | Stage |
|----------|----------|-----------------|-------|
| Disassemble Inspection | Internal (Tech) | No | Intake |
| Requisition for Approval | Customer | Yes | Quoting |
| Inspection Blank | Internal (Tech) | No | Approved |
| Repair Inventory Pick List | Internal (Inventory) | No | Approved |
| Sign Off Sheet | Internal (QA) | No | QA Review |
| Final Invoice | Customer / AP | Yes | Close-Out |
| Scope Return Verification | Customer (packing slip) | **No** | Close-Out |
| Final Inspection | Permanent record | No | Close-Out |
| Update Slip | Internal (Ops/Mgmt) | No | Exception |
