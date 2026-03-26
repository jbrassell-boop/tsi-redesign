# Technical Specification: Email & Notification System

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** Repair Status Workflow, Invoicing, Shipping, Loaner Management, Contract Management

---

## 1. Overview

The notification system has **three layers**: email queue (outbound customer/internal emails), toast notifications (in-app real-time feedback), and morning briefing alerts (operational attention items). Emails are triggered by workflow events and queued for delivery. Toasts are instant client-side feedback. Briefing alerts are computed on-the-fly from live data.

---

## 2. Schema — Core Tables

### 2.1 `EmailQueue` (Outbound Email Queue)

| Column | Type | Description |
|--------|------|-------------|
| `lEmailKey` | `int` (PK) | Email identifier |
| `sSubject` | `varchar(200)` | Email subject line |
| `sTo` | `varchar(200)` | Recipient email address |
| `sFrom` | `varchar(200)` | Sender (typically `service@totalscope.com`) |
| `dtQueued` | `datetime` | When email was queued |
| `sStatus` | `varchar(20)` | Status: `Sent`, `Pending`, `Failed` |
| `sType` | `varchar(50)` | Email type: `Estimate`, `Invoice`, `Notification`, `Follow-Up`, `Reminder` |

**Production Enhancement — add these fields:**

| Column | Type | Description |
|--------|------|-------------|
| `dtSent` | `datetime` | When actually sent (null if pending) |
| `dtFailed` | `datetime` | When delivery failed |
| `iRetryCount` | `int` | Number of retry attempts |
| `sErrorMessage` | `varchar(500)` | Delivery error details |
| `lRepairKey` | `int` (FK) | Related repair (if applicable) |
| `lClientKey` | `int` (FK) | Related client |
| `sBody` | `text` | Email body (HTML) |
| `lTemplateKey` | `int` (FK) | Template used |

### 2.2 `Emails` (Historical Archive)

| Column | Type | Description |
|--------|------|-------------|
| `lEmailKey` | `int` (PK) | Email record ID |
| Full email record | — | 1,000 seeded historical records |

### 2.3 `EmailTypes` (Type Lookup)

| Column | Type | Description |
|--------|------|-------------|
| `lEmailTypeKey` | `int` (PK) | Type identifier |
| `sEmailType` | `varchar(50)` | Type name |
| `bShowOnDash` | `bit` | Show in email dashboard filter? |

### 2.4 `EmailAttachments` (File Links)

| Column | Type | Description |
|--------|------|-------------|
| `lAttachmentKey` | `int` (PK) | Attachment ID |
| `lEmailKey` | `int` (FK → EmailQueue) | Parent email |
| `sFileName` | `varchar(200)` | File name |
| `sFilePath` | `varchar(500)` | File location |

### 2.5 `Contacts` (Recipients)

| Column | Type | Description |
|--------|------|-------------|
| `lContactKey` | `int` (PK) | Contact identifier |
| `sContactFirst` | `varchar(50)` | First name |
| `sContactLast` | `varchar(50)` | Last name |
| `sContactEMail` | `varchar(100)` | **Primary email for sending** |
| `sContactPhoneVoice` | `varchar(20)` | Phone |
| `bActive` | `bit` | Is contact active? |

### 2.6 `ContactTrans` (Contact-Entity Bridge)

| Column | Type | Description |
|--------|------|-------------|
| `lContactTranKey` | `int` (PK) | Transaction ID |
| `lContactKey` | `int` (FK → Contacts) | Which contact |
| `lClientKey` | `int` | Associated client (0 if not applicable) |
| `lDepartmentKey` | `int` | Associated department |
| `lContractKey` | `int` | Associated contract |
| `lSupplierKey` | `int` | Associated supplier |

**Note:** A single contact can be linked to multiple entities. Look up via `ContactTrans` to determine context.

---

## 3. Email Templates

### 3.1 Template Subjects (Currently Hardcoded)

| Template | Subject Pattern | Type |
|----------|----------------|------|
| Repair Estimate | "Repair Estimate — WO# {woNumber}" | Estimate |
| Quote Follow-Up | "Quote Follow-Up — {clientName}" | Follow-Up |
| Approval Request | "Approval Request — WO# {woNumber}" | Notification |
| Ship Notification | "Ship Notification — WO# {woNumber}, Tracking: {tracking}" | Notification |
| Invoice | "Invoice #{invoiceNumber} — {clientName}" | Invoice |
| Invoice Reminder | "Invoice Reminder — #{invoiceNumber}" | Reminder |
| Loaner Return Request | "Loaner Return Request — {scopeType}" | Reminder |
| Contract Renewal | "Contract Renewal — {contractName}" | Follow-Up |
| PO Confirmation | "PO Confirmation — {poNumber}" | Notification |

### 3.2 Recommended Template Table

```sql
CREATE TABLE EmailTemplates (
  lTemplateKey INT PRIMARY KEY,
  sTemplateName VARCHAR(50),
  sSubjectPattern VARCHAR(200),    -- with {placeholders}
  sBodyHTML TEXT,                   -- HTML body with {placeholders}
  sType VARCHAR(50),               -- maps to email type
  bActive BIT
)
```

**Placeholder tokens:** `{woNumber}`, `{clientName}`, `{tracking}`, `{invoiceNumber}`, `{scopeType}`, `{contractName}`, `{poNumber}`, `{contactName}`, `{repairTotal}`, `{shipDate}`

---

## 4. Email Triggers — When Emails Should Be Sent

| # | Trigger Event | Template | Recipient | When |
|---|--------------|----------|-----------|------|
| 1 | **Repair received** (dtDateIn set) | Repair Estimate | Client contact for department | Batch receiving confirm |
| 2 | **Requisition generated** (Phase 2→3) | Approval Request | Client contact + account rep | Form OM07-2 printed |
| 3 | **Repair shipped** (status → Shipped) | Ship Notification | Client contact for department | Ship confirm in dashboard |
| 4 | **Invoice generated** (status → Invoiced) | Invoice | Billing contact | Invoice creation |
| 5 | **Invoice overdue** (past due > 30 days) | Invoice Reminder | Billing contact | Scheduled/daily check |
| 6 | **Loaner overdue** (past due date) | Loaner Return Request | Department contact | Scheduled/daily check |
| 7 | **Contract expiring** (within 90 days) | Contract Renewal | Account rep + client contact | Scheduled/daily check |
| 8 | **Quote follow-up** (no response > 5 days) | Quote Follow-Up | Client contact | Scheduled/daily check |

### 4.1 Client Email Preference

`clients.bEmailNewRepairs` — if true, automatically queue repair estimate email on intake. If false, skip.

---

## 5. Email Dashboard

### 5.1 KPIs

| KPI | Calculation |
|-----|-------------|
| Total Emails | COUNT of all email queue records |
| Pending | COUNT WHERE sStatus = 'Pending' |
| Sent | COUNT WHERE sStatus = 'Sent' |
| Email Types | COUNT DISTINCT sType |

### 5.2 Table Columns

| Column | Source |
|--------|--------|
| Date | `dtQueued` |
| Type | `sType` |
| From | `sFrom` |
| To | `sTo` |
| Subject | `sSubject` |
| Status | `sStatus` (badge: Pending/Sent/Ignored) |

### 5.3 Filters

- **Status:** All | Pending | Sent | Ignored
- **Type:** Dropdown filtered by `bShowOnDash = true`
- **Search:** From, To, Subject, Type (case-insensitive contains)
- **Sort:** Clickable column headers

### 5.4 Actions

- Mark as Ignored (skip sending)
- Retry Failed (re-queue)
- View email content

---

## 6. Toast Notifications (In-App)

### 6.1 System

**Library:** `js/toast.js` (77 lines, self-contained)

**Methods:**
- `TSI.toast.success(title, message, duration)` — green checkmark
- `TSI.toast.error(title, message, duration)` — red X
- `TSI.toast.warn(title, message, duration)` — orange warning
- `TSI.toast.info(title, message, duration)` — blue info

**Config:**
- Max concurrent: 3 toasts
- Default duration: 5000ms (5 seconds)
- Container: `.toast-container` appended to `<body>`
- Stack: newest on top, older shift down

### 6.2 Toast Triggers Throughout System

| Event | Toast Type | Title | Message |
|-------|-----------|-------|---------|
| Repair status updated | success | "Status Updated" | "Repair advanced to {status}" |
| Repair status update failed | error | "Error" | "Failed to update status" |
| Repair flagged for quote | warn | "Flagged" | "Repair flagged for revised quote" |
| Scopes shipped | success | "Scopes Shipped" | "{count} scope(s) shipped to {customers} customer(s)" |
| Compact/comfort mode toggle | info | "Display" | "Compact mode" / "Comfortable mode" |
| Save successful | success | "Saved" | Context-specific |
| Save failed | error | "Error" | Context-specific |

### 6.3 Toast vs Email

- **Toast** = instant UI feedback for the current user only. Ephemeral.
- **Email** = persistent outbound communication to customers/contacts. Queued.
- They serve different purposes and are NOT interchangeable.

---

## 7. Morning Briefing Alerts (Needs Attention)

### 7.1 Computed Alerts

These are NOT stored in a table — they're calculated on-the-fly from live data:

| Alert | Source | Condition | Severity | Max Items |
|-------|--------|-----------|----------|-----------|
| **Aging Work Orders** | Repairs | `dtDateIn` set, no `dtDateOut`, age > 10 days | Danger (red) | — |
| **Overdue Loaners** | LoanerTrans | Due date passed, not returned | Warning (orange) | — |
| **Unresolved Flags** | Flags | `bResolved = false`, age > 3 days | Info (blue) | — |

**Total cap:** 15 items max across all types. Sorted: danger → warning → info, then by age descending.

### 7.2 Briefing Queue Cards

| Card | Source | Count |
|------|--------|-------|
| Tasks | tasks table | `tasks.length` |
| Emails | emailQueue table | `emailQueue.length` |
| Shipping | Ready-to-ship queue | `shippingQueue.length` |
| Inventory Low Stock | Inventory items | Count where `nLevelCurrent < nReorderPoint` |
| Flags | Flags table | `flags.length` |
| Invoices Outstanding | Invoices table | `invoices.length` |

### 7.3 Briefing KPIs

| KPI | Calculation |
|-----|-------------|
| Throughput | Repairs shipped this month |
| In-House | Repairs received but not shipped |
| On-Time % | Shipped within 10 business days / total shipped × 100 |
| Avg TAT | Average calendar days (dtDateOut - dtDateIn) for shipped repairs |

---

## 8. Collaboration Indicators

### 8.1 Current State

Every major record has `dtLastUpdate` and `lLastUpdateUser` fields. These are tracked but **not surfaced** as collaboration indicators.

### 8.2 Recommended Implementation

When a user opens a repair detail:
1. Check `dtLastUpdate` — if within last 15 minutes
2. Check `lLastUpdateUser` — if different from current user
3. Show indicator: "Last edited by {userName} {timeAgo}"

This prevents conflicting edits and gives awareness of recent activity.

---

## 9. API Endpoints

| Method | Endpoint | Purpose |
|--------|----------|---------|
| `GET` | `/Email/GetAllEmailList` | List all emails |
| `POST` | `/Email/GetAllEmailList` | Paginated email list |
| `GET` | `/Email/GetAllEmailTypes` | Email type lookup |
| `GET` | `/Email/GetEmailAttachments?plEmailKey=` | Attachments for an email |
| `GET` | `/Dashboard/GetEmailQueue` | Email queue for dashboard |
| `GET` | `/Dashboard/GetNeedsAttention` | Briefing alerts |

---

## 10. Open Questions

1. **SMTP integration:** What email service will the production system use? SMTP relay, SendGrid, SES?
2. **Retry policy:** How many times to retry failed emails? What interval? (Recommended: 3 retries at 5min/30min/2hr)
3. **Email opt-out:** Can contacts opt out of certain email types? Need an unsubscribe mechanism?
4. **Scheduled sends:** Should overdue invoice reminders and loaner return requests run on a schedule (daily cron) or be triggered manually?
5. **Email body storage:** Should the full HTML body be stored in the queue for audit, or generated at send time from template + data?
6. **Attachment generation:** Invoice PDFs, packing slips — generated at queue time or send time?
