# UI Audit — April 1, 2026

## CRITICAL (Fix First)
1. **Product Sale: All "undefined"** — `product-sale.html` — API field mapping mismatch
2. **Loaners: Infinite loading** — `loaners.html` — API call fails silently
3. **Analytics TAT tab freezes browser** — `dashboard_analytics.html` — infinite loop in chart render
4. **Analytics "nulld" display** — `dashboard_analytics.html` — null + "d" concat
5. **Login page security error** — `login.html` — entire page broken

## MAJOR (Fix Second)
6. **Contracts: Form fields don't populate** — `contracts.html` — info strip loads but form binding broken
7. **Quality: 847 in chips, 0 in table** — `quality.html` — stat/table data disconnect
8. **Financial: No records despite active chips** — `financial.html` — same disconnect pattern
9. **Dashboard TAT/SLA "0d / Sd"** — `dashboard.html` — broken calc or label
10. **Header badge inconsistency** — Global — 3 different badge styles
11. **Dashboard Inventory 0 items** — `dashboard_inventory.html` — not querying same data as Inventory module
12. **Suppliers default record empty form** — `suppliers.html` — auto-select doesn't populate

## MINOR (Fix Third)
13. **Tech Bench DAYS hardcoded 85** — `dashboard_techbench.html`
14. **Dashboard Tasks: 0 records** — `dashboard_tasks.html` — needs demo data
15. **Footer inconsistency** — Global — 3 different footer treatments
