# TSI Platform — Developer Memo: Modernization Roadmap

**From:** Joe Brassell, Total Scope Inc.
**To:** MOL-Tech Development Team
**Date:** March 9, 2026
**Re:** Current state assessment & incremental modernization plan

---

## Purpose

We've completed a full audit of the current production codebase. This memo outlines what's working, what's not, and a phased plan to modernize without breaking what's already shipping. The goal is simple: **stay productive now, don't build a dinosaur.**

---

## Part 1: What You're Doing Well

Credit where it's due — these patterns are solid and we want to keep them:

| Pattern | Why It Works |
|---|---|
| **Config-driven forms (FormCreator)** | Reduces boilerplate, enforces consistency, makes new pages fast to build |
| **Config-driven grids (molgrid)** | Same — column configs are easy to maintain and extend |
| **RTK Query for API layer** | Built-in caching, loading states, mutations — the right tool for the job |
| **Feature-based folder structure** | Each domain is self-contained under `pages/[feature]/` — easy to navigate |
| **Permission system (security keys)** | Route-level and action-level gating is the correct approach for this kind of app |
| **Toolbar button configs** | Declarative action buttons keep page components clean |

These patterns should survive any modernization effort. They're the foundation.

---

## Part 2: What's Creating Risk

These aren't opinions — these are concrete technical risks that will cost time and money if not addressed.

### CRITICAL: Create React App (CRA) Is End-of-Life

- CRA's last release was **April 2022**. It is officially unmaintained.
- No security patches. No dependency updates. No bug fixes.
- The React team themselves recommend migrating away from CRA.
- **Risk:** A dependency vulnerability with no upstream fix could block a production deploy or fail a compliance audit.

### HIGH: No TypeScript

- Every form config, grid config, API response, and component prop is untyped.
- A typo in a `dataField` string silently breaks at runtime — no compiler catches it.
- New developers have no way to know what shape data should be without reading every file.
- **Risk:** Slower onboarding, more runtime bugs, harder refactors.

### HIGH: 4 Overlapping UI Libraries

The app currently loads **all of these** for UI components:

1. `react-bootstrap` (Bootstrap 5)
2. `primereact` (PrimeReact)
3. `@moltech/molui` (proprietary)
4. Custom components in `src/components/ui/`

Each has its own styling approach, component API, and behavior. This means:
- Larger bundle size (users download 4 UI frameworks)
- Inconsistent look and feel across pages
- Developers must know 4 different APIs
- **Risk:** Every new page is a guessing game — "which button component do I use?"

### MEDIUM: Styling Has No Single Source of Truth

- SCSS files with BEM naming
- Bootstrap utility classes
- CSS custom properties (`--themeColor`)
- Inline styles in JSX
- PrimeReact theme overrides

All five approaches are used, sometimes on the same page. This makes visual consistency hard to maintain and theming nearly impossible.

### MEDIUM: SweetAlert2 for Confirmations

- SweetAlert2 is a 40KB library for something that could be a simple modal component.
- It doesn't follow React patterns (imperative API, not declarative).
- It's a dependency you don't control for a critical UX flow (delete confirmations, save warnings).

### LOW: Cookie-Based Auth + localStorage Nav

- Works, but fragile. No visible token refresh pattern.
- Navigation menu in localStorage means a stale cache can show wrong menu items.
- Not a fire, but worth cleaning up when auth is touched.

---

## Part 3: The Plan — Incremental, Non-Breaking, No Rewrites

We are **not** proposing a rewrite. We are proposing targeted upgrades that can be done one at a time, in parallel with feature work, without breaking anything that's currently shipping.

### Phase 1: Swap CRA for Vite (1-2 days)

**What:** Replace `react-scripts` with `vite` as the build tool.

**Why:** Get off the dead platform. Vite is faster (10-20x build speed), actively maintained, and supports the exact same React code.

**Impact on existing code:** Near zero. Same `.js` files, same React, same folder structure. You change the build config, not the application code.

**Steps:**
1. `npm uninstall react-scripts`
2. `npm install vite @vitejs/plugin-react --save-dev`
3. Add `vite.config.js` (10 lines)
4. Move `public/index.html` to root and update script tag
5. Update `package.json` scripts (`start` → `vite`, `build` → `vite build`)
6. Test, deploy

**Risk:** Low. This is a well-documented migration with thousands of production examples.

**Developer retraining required:** None. They still write the same React code.

---

### Phase 2: Add TypeScript Incrementally (Ongoing)

**What:** Enable TypeScript in the project. Convert files from `.js` to `.tsx` one at a time.

**Why:** Catch bugs at compile time. Make configs self-documenting. Faster onboarding for new developers.

**Impact on existing code:** None. TypeScript is opt-in per file. A `.js` file sitting next to a `.tsx` file works fine.

**Steps:**
1. Add `tsconfig.json` with `allowJs: true` (existing JS files keep working)
2. `npm install typescript @types/react @types/react-dom --save-dev`
3. New files are written in `.tsx`
4. Existing files are converted opportunistically (when you're already editing them)

**Priority conversion targets:**
- Form field configs (type the field definitions)
- Grid configs (type the column definitions)
- API service responses (type what the backend returns)
- Shared components (type the props)

**Risk:** None if `allowJs: true` is set. You cannot break existing code.

**Developer retraining required:** Minimal. TypeScript is a superset of JavaScript — all existing JS is valid TS. The learning curve is gradual and the compiler teaches you as you go.

---

### Phase 3: Consolidate UI Libraries (Phased, Per-Page)

**What:** Pick one primary UI framework and migrate toward it. Stop mixing 4 libraries.

**Recommended direction:** Keep `primereact` as the primary component library (it's the most capable and actively maintained of the four). Use `@moltech/molui` only for the custom grid if it provides value PrimeReact's DataTable doesn't.

**Steps:**
1. Audit which components come from which library
2. Create a mapping: "for buttons use X, for modals use Y, for inputs use Z"
3. New pages use only the chosen library
4. Existing pages are migrated when they're being updated anyway

**Risk:** Low per-page. Each page is self-contained so migration is isolated.

**Developer retraining required:** Less than current state — they'll learn ONE library instead of four.

---

### Phase 4: Standardize Styling (Phased, Per-Page)

**What:** Pick one styling approach. We recommend SCSS modules with CSS custom properties.

**Steps:**
1. Define a canonical set of CSS variables (colors, spacing, typography)
2. New pages use only SCSS modules + CSS variables
3. Existing pages are cleaned up when touched
4. Remove inline styles and competing utility class approaches over time

---

## Phase Summary

| Phase | Effort | Risk | Disruption | When |
|---|---|---|---|---|
| 1. CRA → Vite | 1-2 days | Low | None | Now |
| 2. Add TypeScript | Ongoing | None | None | Start now, convert gradually |
| 3. Consolidate UI libs | Per-page | Low | Low | With each page update |
| 4. Standardize styling | Per-page | Low | Low | With each page update |

**Total time spent "just modernizing":** 1-2 days upfront (Vite swap). Everything else happens incrementally alongside feature work.

**Total time spent if we do nothing:** Increasing tech debt payments on every feature, eventual forced migration when CRA breaks, and a codebase new developers can't ramp up on.

---

## Part 4: Immediate Next Steps

1. **MOL-Tech:** Confirm the Vite migration can be scheduled (Phase 1). This unblocks everything else.
2. **MOL-Tech:** Share API documentation or Swagger/OpenAPI specs so we can type the API layer correctly.
3. **TSI (us):** We will deliver new/updated page components in your current stack (JS, your folder structure, your patterns) so they drop in cleanly.
4. **TSI (us):** New components we deliver will include TypeScript type definitions alongside them — ready for when you enable TS.
5. **Both:** Agree on a single UI component library going forward so new pages are consistent.

---

## The Bottom Line

We're not asking anyone to learn a new language or rewrite the app. We're asking for:
- **1-2 days** to swap a dead build tool for a living one
- **A checkbox in tsconfig** that lets us start writing safer code
- **A decision** on which UI library is the standard going forward

Everything else is incremental. No big bang. No months-long migration. Just stop building on top of things that are already end-of-life.

---

*Prepared by Total Scope Inc. — Platform Architecture Review*
