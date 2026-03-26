# Tech Stack Decision Document

**Date:** 2026-03-25
**Author:** Joseph Brassell
**For:** Developer handoff — technology choices and rationale

---

## 1. Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│  Browser (SPA)                                      │
│  Vanilla JS → [migrate to framework TBD]            │
│  Static HTML + CSS Design Tokens                    │
│  api.js dual-mode switching                         │
└──────────────┬──────────────────────────────────────┘
               │ REST (JSON)
┌──────────────▼──────────────────────────────────────┐
│  Express.js 5.x  (port 4000)                        │
│  8 route modules, 64 endpoints                      │
│  Parameterized SQL, field aliasing                  │
│  Connection pool (mssql + msnodesqlv8)              │
└──────────────┬──────────────────────────────────────┘
               │ TDS (Tabular Data Stream)
┌──────────────▼──────────────────────────────────────┐
│  SQL Server 2025 Developer Edition                  │
│  WinScopeNet (16GB, 441 tables, 2M+ records)       │
│  Windows Auth (Trusted_Connection)                  │
│  1,692 stored procs, 38 triggers, 163 functions     │
└─────────────────────────────────────────────────────┘
```

---

## 2. Current Stack (What's Already Built)

| Layer | Technology | Version | Notes |
|-------|-----------|---------|-------|
| **Frontend** | Vanilla JS + HTML5 | — | 33 pages, centralized CSS design tokens |
| **Styling** | CSS3 custom properties | — | 561-line design system in `styles.css` |
| **Backend** | Express.js | 5.2.1 | 8 route modules, 64 parameterized SQL endpoints |
| **DB Driver** | mssql + msnodesqlv8 | 12.2.0 / 5.1.5 | Windows Auth, connection pooling |
| **Database** | SQL Server 2025 | Developer Edition | WinScopeNet: 441 tables, 16GB |
| **Excel Export** | xlsx | 0.18.5 | Server-side spreadsheet generation |
| **CORS** | cors | 2.8.6 | Cross-origin for dev mode |
| **Hosting** | Netlify (frontend) | — | CORS proxy to BrightLogix API |
| **Auth** | Token-based (localStorage) | — | No SSO; internal username/password |
| **Dev Server** | `npx serve -l 3000 .` | — | Static files locally |

### What's NOT in the stack (deliberately)
- No frontend framework (React/Vue/Angular)
- No TypeScript
- No ORM (raw parameterized SQL)
- No build tooling (Webpack/Vite/Rollup)
- No WebSockets
- No test framework
- No CI/CD pipeline

---

## 3. Decisions Needed From Developer

### 3.1 Frontend Framework

**Context:** 33 pages built in vanilla JS. They work but are hard to maintain — manual DOM manipulation, no component reuse, no state management.

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **React + Next.js** | Largest ecosystem, hiring pool, SSR support | Heaviest bundle, steeper migration |
| **Vue 3 + Nuxt** | Gentler learning curve, good for migrating from vanilla | Smaller ecosystem than React |
| **Svelte + SvelteKit** | Smallest bundle, fastest runtime, closest to vanilla JS | Smallest hiring pool |
| **Stay vanilla** | No migration cost, already works | Maintenance burden grows with features |

**Recommendation:** Developer's choice. The existing vanilla JS serves as a working prototype. The spec documents (17 files) describe behavior, not implementation. Any framework can implement them.

**Constraint:** Whichever framework is chosen, it must support:
- Client-side filtering + sorting (most pages filter in-browser)
- Drawer/panel pattern (detail views slide in from right)
- Tab navigation within pages
- Autosave with debounce (1.5s pattern on clients/departments)
- Dual-mode API switching (local SQL Server vs production BrightLogix)

### 3.2 Database: SQL Server vs PostgreSQL

**Context:** The legacy system runs on SQL Server 2008. We restored to SQL Server 2025 Developer Edition locally. All 64 endpoints use parameterized T-SQL.

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **Keep SQL Server** | Zero migration cost, existing procs/triggers/functions work, Windows Auth | Licensing cost in production ($$$), Windows-only hosting |
| **Migrate to PostgreSQL** | Free, runs anywhere, better cloud hosting options | Migration effort: 441 tables, 1,692 procs, 38 triggers, 163 functions, Hungarian notation everywhere |
| **Azure SQL** | Managed SQL Server, compatible with existing schema | Microsoft lock-in, cost |

**Current state of the legacy DB:**
- 441 tables (full schemas extracted to `C:\tmp\legacy-schemas\table-schemas.md`)
- 1,692 stored procedures (full source in `C:\tmp\legacy-schemas\stored-procs-*.md`)
- 38 triggers (business rules: 40-day warranty, GPO matching, bill-to override, max charges, commission calc)
- 163 functions (key generation via `fnDatabaseKey()`: North=1, South=2, Florida=3)
- Hungarian notation throughout: `l`=int, `s`=string, `dbl`=decimal, `b`=bool, `dt`=datetime
- Two regional databases merged into one (Nashville → WinScopeNet)

**Recommendation:** Start on SQL Server (everything works today). Plan PostgreSQL migration as a Phase 2 effort if licensing is a blocker. The 64 Express endpoints abstract the SQL — switching DB drivers is isolated to `server/db.js`.

**If migrating to PostgreSQL:**
- Schema conversion: pgLoader or manual DDL translation
- Stored procs → server-side JS functions or pg/plsql
- Triggers → PostgreSQL triggers (similar syntax, different dialect)
- `fnDatabaseKey()` → application-level key generation
- Hungarian notation can stay (it's just naming convention)
- Test against the full 2.4M record dataset

### 3.3 ORM vs Raw SQL

**Context:** All 64 endpoints use raw parameterized SQL with manual field aliasing. Queries are hand-tuned, some with 15-table JOINs.

**Options:**

| Option | Pros | Cons |
|--------|------|------|
| **Raw SQL (current)** | Full control, optimized queries, no abstraction leaks | Manual field mapping, no migration tooling |
| **Knex.js** | Query builder, migration support, DB-agnostic | Still writing SQL-like code, limited ORM features |
| **Prisma** | Type-safe, auto-generated client, migration tooling | Schema-first (would need to reverse-engineer 441 tables), heavy |
| **Drizzle** | Lightweight, TypeScript-native, migration support | Newer, smaller community |

**Recommendation:** Knex.js if the developer wants migration tooling and DB portability. Raw SQL if staying on SQL Server permanently. Prisma is overkill for this schema size without TypeScript.

### 3.4 Authentication

**Current:** Internal username/password stored in `tblUsers`. Token stored in localStorage. `API.requireAuth()` guard on every page.

**Decision needed:**
- Keep simple token auth (sufficient for <15 users)?
- Add JWT with refresh tokens?
- Add SSO/SAML for hospital system integration?

**Context:** TSI has ~12 internal users. No external users access the system directly (the customer portal is separate). Simple token auth is likely sufficient for launch.

### 3.5 Hosting & Deployment

**Current:** Netlify (frontend static files) + local Windows machine (Express + SQL Server).

**Production options:**

| Option | Frontend | Backend | Database |
|--------|----------|---------|----------|
| **Windows VPS** | IIS or nginx | Express as Windows service | SQL Server on same box |
| **Azure** | Azure Static Web Apps | Azure App Service | Azure SQL |
| **AWS** | S3 + CloudFront | EC2 or ECS | RDS SQL Server or PostgreSQL |
| **Linux VPS + PG** | nginx | Express via PM2 | PostgreSQL |

**Constraint:** If staying on SQL Server, hosting must be Windows or Azure. PostgreSQL migration unlocks Linux hosting.

---

## 4. What's Already Documented

The developer has access to:

| Resource | Location | Contents |
|----------|----------|----------|
| **17 Spec Documents** | `tasks/spec-*.md` | Schema, business rules, API contracts, edge cases |
| **Spec Index** | `tasks/spec-index.md` | Master index with implementation phases |
| **Schema Reference** | `tasks/spec-schema-reference.md` | Exact column names/types for all key tables |
| **Open Questions** | `tasks/spec-open-questions.md` | 66 questions, all answered |
| **Full Legacy Schemas** | `C:\tmp\legacy-schemas\` | 441 tables, 1,692 procs, 163 functions, 38 triggers (8.4MB) |
| **Express Server** | `server/` | Working 64-endpoint API against live SQL Server |
| **Mock Data** | `mock-db.js` (41MB) | 82,800 records for offline development |
| **Real Data Seed** | `tasks/real-data-seed.json` (500MB) | 2.4M records from production |
| **API Contract** | `tasks/api-contract.md` | Unified REST endpoint reference |
| **UI Prototype** | 33 HTML pages | Working prototype with real data |

---

## 5. Integration Points

| System | Integration | Status |
|--------|------------|--------|
| **BrightLogix API** | Production REST API (endoscope repairs) | Working — response envelope handling in api.js |
| **UPS WorldShip** | Shipping label generation + tracking | Not built — needs API key + integration |
| **Avalara** | Multi-jurisdiction tax calculation | Not built — replaces manual tax tables |
| **Great Plains (GP)** | Invoice finalization → `tblGP_InvoiceStaging` | Legacy process — needs cloud equivalent |
| **Crystal Reports** | PDF report generation | Being replaced — cloud reports in specs |
| **TSI Portal** | Customer-facing portal (read-only) | Separate database (`TSIPortal`), future redesign |
| **Active Directory** | NOT used | Internal auth only |

---

## 6. Performance Expectations

| Metric | Target | Notes |
|--------|--------|-------|
| **Concurrent users** | 12–15 | TSI internal staff only |
| **Database size** | 16GB (current), growing ~2GB/year | 190K repairs over 20 years |
| **Page load** | <2s with data | Client-side filtering acceptable at this scale |
| **Search** | Client-side for <5K rows, server-side for scopes (60K) | Pagination via OFFSET/FETCH already built |
| **Autosave** | 1.5s debounce, visual feedback | Pattern established on clients/departments pages |

---

## 7. Development Environment Setup

```bash
# Prerequisites
- Node.js 20+
- SQL Server 2025 Developer Edition (or SQL Server 2019+)
- WinScopeNet database restored (16GB backup available)

# Clone and install
git clone <repo>
cd tsi-redesign
npm install

# Start Express API server (port 4000)
npm run server

# Start frontend dev server (port 3000)
npx serve -l 3000 .

# Switch to local SQL Server mode in browser
# Add ?api=local to any page URL, or:
localStorage.setItem('tsi_api_mode', 'local')

# SQL Server connection (server/db.js)
# Windows Auth: Trusted_Connection=yes
# Or SQL login: tsi_dev / TsiDev2026!
# Database: WinScopeNet
# ODBC Driver 18
```

**Visual indicator:** When in local SQL Server mode, a red "⚡ SQL SERVER MODE" banner appears at the top of every page.

---

## 8. Summary of Decisions

| Decision | Current Choice | Flexibility |
|----------|---------------|-------------|
| Frontend framework | Vanilla JS (prototype) | Developer picks framework for production |
| Backend framework | Express.js 5.x | Solid — keep unless strong reason to change |
| Database | SQL Server 2025 | Keep for launch; PostgreSQL migration possible later |
| ORM | Raw parameterized SQL | Developer can add Knex.js for migrations |
| Auth | Simple token (localStorage) | JWT upgrade straightforward if needed |
| Hosting | TBD | Depends on DB choice (SQL Server = Windows/Azure) |
| Testing | Manual (no framework) | Developer should add Jest/Vitest |
| CI/CD | None | Developer should add GitHub Actions |
| TypeScript | Not used | Developer can add incrementally |
