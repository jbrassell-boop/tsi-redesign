# Technical Specification: User & Security Management

**Date:** 2026-03-24
**Author:** Joseph Brassell
**Status:** Draft
**For:** Developer handoff — full implementation spec
**Dependencies:** All other specs (security gates every workflow)

---

## 1. Overview

Users, employees, technicians, and sales reps are **separate but linked entities**. A user account (login) can optionally link to an employee record, which can optionally link to a technician record. Sales reps are a separate entity linked directly to the user. Security groups define role-based permissions but are **not yet enforced** — this spec defines both current state and what SHOULD be enforced.

---

## 2. Schema — Core Tables

### 2.1 `Users` (Login Accounts)

| Column | Type | Description |
|--------|------|-------------|
| `lUserKey` | `int` (PK) | User identifier |
| `sUserName` | `varchar(50)` | Login username |
| `sFirstName` | `varchar(50)` | First name |
| `sLastName` | `varchar(50)` | Last name |
| `sUserFullName` | `varchar(100)` | Full display name |
| `sEmailAddress` | `varchar(100)` | Email |
| `bActive` | `bit` | Is account active? |
| `bIsAdmin` | `bit` | Legacy admin flag (use lSecurityGroupKey instead) |
| `lEmployeeKey` | `int` (FK → Employees) | Link to employee record (nullable) |
| `lSalesRepKey` | `int` (FK → SalesReps) | Link to sales rep record (nullable) |
| `lSecurityGroupKey` | `int` (FK → SecurityGroups) | Role/permission group |
| `dtLastLogin` | `datetime` | Last login timestamp |

### 2.2 `SecurityGroups` (Role Definitions)

| Key | Group Name | Description |
|-----|-----------|-------------|
| 1 | Administrator | Full system access including user management and configuration |
| 2 | Manager | Department-level oversight, reports, and approval authority |
| 3 | Technician | Repair workflow, scope intake, and work order management |
| 4 | Sales Representative | Client management, quotes, contracts, and sales reports |
| 5 | Viewer | Read-only access to dashboards and reports |

### 2.3 `Employees` (Internal Staff)

| Column | Type | Description |
|--------|------|-------------|
| `lEmployeeKey` | `int` (PK) | Employee identifier |
| `sEmployeeFirst` | `varchar(50)` | First name |
| `sEmployeeLast` | `varchar(50)` | Last name |
| `sEmployeeEMail` | `varchar(100)` | Email |
| `lTechnicianKey` | `int` (FK → Technicians) | Link to tech record (if applicable) |
| `bIsTechnician` | `bit` | Is this employee a technician? |

### 2.4 `Technicians` (Repair Workforce)

| Column | Type | Description |
|--------|------|-------------|
| `lTechnicianKey` | `int` (PK) | Tech identifier |
| `sTechName` | `varchar(100)` | Display name |
| `sTechInits` | `varchar(5)` | Initials (for forms) |
| `bIsActive` | `bit` | Is tech currently active? |
| `lServiceLocationKey` | `int` (FK → ServiceLocations) | Assigned facility (1=North, 2=South) |
| `lJobTypeKey` | `int` | Job classification |
| `sTechLevel` | `varchar(5)` | Skill level (1, 2, 3) |
| `dblHourlyRate` | `decimal(10,2)` | Billing rate |
| `lUserKey` | `int` (FK → Users) | Link to user account (0 if no login) |
| `sEmailAddress` | `varchar(100)` | Tech email |
| `bOnsiteServiceTech` | `bit` | Is onsite van tech? |

### 2.5 `SalesReps` (Account Managers)

| Column | Type | Description |
|--------|------|-------------|
| `lSalesRepKey` | `int` (PK) | Rep identifier |
| `sSalesRepName` | `varchar(100)` | Display name |
| `sRepFirst` | `varchar(50)` | First name |
| `sRepLast` | `varchar(50)` | Last name |
| `sRepEMail` | `varchar(100)` | Email |
| `sRepPhoneVoice` | `varchar(20)` | Phone |
| `dblDefltCommPctIn` | `decimal(5,2)` | Default commission % (inbound) |
| `dblDefltCommPctOut` | `decimal(5,2)` | Default commission % (outbound) |
| `bActiveFlag` | `char(1)` | Active (Y/N) |
| `lSalesRepNameKey` | `int` | Name dedup key |

---

## 3. Entity Relationships

```
User (login account)
  ├── lEmployeeKey → Employee
  │                    └── lTechnicianKey → Technician
  │                                          └── lServiceLocationKey → Location
  ├── lSalesRepKey → SalesRep
  └── lSecurityGroupKey → SecurityGroup (role)
```

**Key patterns:**
- A user can be an employee OR a sales rep (or neither for admin-only accounts)
- An employee can be a technician (but not all employees are)
- Technicians have a facility location; sales reps do not (they're mobile)
- A technician can exist without a user account (`lUserKey = 0`)

---

## 4. Authentication Flow

### 4.1 Login

```
POST /Authentication/UserLogin
Body: { sUserName, sPassword }
Response: { success, token, user: { lUserKey, sFirstName, sLastName, lSecurityGroupKey, ... } }
```

On success:
- Store token in `localStorage['tsi_token']`
- Store user object in `localStorage['tsi_user']`

### 4.2 Session Check

```javascript
API.isLoggedIn() → checks if tsi_token exists in localStorage
API.getUser()    → parses tsi_user from localStorage
```

### 4.3 Logout

```javascript
API.logout() → clears tsi_token, tsi_user → redirects to login.html
```

### 4.4 Service Location Selection

- Dropdown in topbar: "Upper Chichester" (1) or "Nashville" (2)
- Stored in `localStorage['tsi_svcLocation']`
- **Not restricted by user** — any user can view any location
- All API calls append `plServiceLocationKey` parameter

---

## 5. Permission Model (RECOMMENDED — Not Yet Enforced)

### 5.1 Action Permissions by Security Group

| Action | Admin (1) | Manager (2) | Tech (3) | Sales (4) | Viewer (5) |
|--------|-----------|-------------|----------|-----------|------------|
| View repairs | Yes | Yes | Yes | Yes | Yes |
| Edit repair details | Yes | Yes | Yes | No | No |
| Change repair status | Yes | Yes | Yes | No | No |
| Generate invoice | Yes | Yes | No | No | No |
| Ship repairs | Yes | Yes | No | No | No |
| Bypass hold | Yes | Yes | No | No | No |
| Create/edit clients | Yes | Yes | No | Yes | No |
| Create/edit contracts | Yes | Yes | No | Yes | No |
| Manage flags | Yes | Yes | Yes | Yes | No |
| View reports/analytics | Yes | Yes | Yes | Yes | Yes |
| Manage users | Yes | No | No | No | No |
| System configuration | Yes | No | No | No | No |
| Manage inventory | Yes | Yes | Yes | No | No |
| Approve amendments | Yes | Yes | No | No | No |

### 5.2 Where to Enforce

**API Level (backend):**
- Every API endpoint should check `lSecurityGroupKey` from the authenticated user
- Return 403 if insufficient permissions
- This is the authoritative check — client-side is just UX

**UI Level (frontend):**
- Hide/disable buttons and menu items based on role
- Show appropriate dashboards (tech bench for techs, analytics for managers)
- Don't show edit controls to viewers

### 5.3 Current State

**None of this is enforced.** All authenticated users can do everything. The security groups table exists, users have `lSecurityGroupKey` assigned, but no code checks it before allowing actions.

**Developer action needed:** Implement middleware/guard on API endpoints and conditional UI rendering based on security group.

---

## 6. Role-Specific Views

### 6.1 Technician (Group 3)

**Primary view:** Tech Bench Dashboard
- Sees repairs assigned to them (filtered by `lTechnicianKey`)
- Can advance status through simplified 5-step workflow
- Can flag repairs for revised quotes
- Click through to full repair detail for editing

**Should NOT be able to:**
- Generate invoices
- Ship repairs
- Bypass holds
- Manage clients or contracts

### 6.2 Sales Representative (Group 4)

**Primary view:** Client/Department management
- Sees clients and departments assigned to them (`lSalesRepKey`)
- Can manage contracts, quotes, pricing
- Can view repair status but not edit repair details

**Should NOT be able to:**
- Edit repair details
- Change repair status
- Generate invoices
- Ship repairs

### 6.3 Manager (Group 2)

**Primary view:** Analytics, Morning Briefing
- Full operational visibility
- Approval authority (amendments, hold bypasses)
- Report access

### 6.4 Viewer (Group 5)

**Primary view:** Dashboards (read-only)
- Can view all dashboards and reports
- Cannot edit, create, delete, or modify anything

---

## 7. Technician Assignment on Repairs

### 7.1 Primary Assignment

- `repairs.lTechnicianKey` — primary technician
- Set via dropdown on repair detail header
- Tech bench filters by this field

### 7.2 Multi-Tech Assignment

Repair details support two technicians per line item:
- Tech 1 (primary on this item)
- Tech 2 (assisting)

Plus specialized assignments:
- `defectTech` — technician who identified a defect
- `qcTechnician` — QC inspector
- `qcInspectedBy` — final QC sign-off

### 7.3 Rack Assignment

- `sRackPosition` on repair — physical bench location
- Auto-assignment via `wizAutoAssignRack()` — assigns lowest available rack number
- Displayed on repair detail, not on tech bench

---

## 8. Sales Rep Assignment

### 8.1 Hierarchy

```
Client.lSalesRepKey       → default rep for the entire client
Department.lSalesRepKey   → override rep for this department
Department.lSalesRepKey_CS → customer service rep (separate role)
Repair.lSalesRepKey       → stamped from department at repair creation
```

**Override pattern:** Department rep overrides client rep (consistent with all other department-level overrides).

### 8.2 Commission Tracking

- `dblDefltCommPctIn` — default inbound commission %
- `dblDefltCommPctOut` — default outbound commission %
- Commission calculated in profitability analytics

---

## 9. Audit Trail

### 9.1 Standard Fields (on most tables)

| Field | Purpose |
|-------|---------|
| `lCreateUser` / `Created_UserKey` | Who created the record |
| `lLastUpdateUser` / `Updated_UserKey` | Who last modified |
| `dtLastUpdate` | When last modified |
| `lCreateSessionKey` | Session ID at creation |

### 9.2 Specific Audit Points

| Action | Tracked By |
|--------|-----------|
| Status change | `StatusTrans` table (old/new status, user, timestamp) |
| Hold bypass | `fByPassOnHold` + bypass user/timestamp on repair |
| Flag creation | `lOwnerKey` on flags |
| Login | `dtLastLogin` on users |

---

## 10. Open Questions

1. **Location restriction:** Should technicians be restricted to only see their assigned location's data? Currently any user can switch locations freely.
2. **Soft vs hard permissions:** Should permission violations show a "you don't have access" message, or should the UI simply not render the options? (Recommended: hide from UI + block at API level)
3. **Multiple roles:** Can a user belong to multiple security groups? Current schema is single `lSecurityGroupKey`. If multi-role needed, switch to a bridge table.
4. **Sales rep data isolation:** Should sales reps only see their own clients/departments, or all clients with their rep highlighted?
5. **Password policy:** Any requirements (length, complexity, expiration) for the production system?
6. **SSO/LDAP:** Will the production system use Active Directory or external auth, or keep internal authentication?
