# Finance Profit And Report Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Seed deterministic ad spend and expose real Profit & Cost and Financial Report screens.

**Architecture:** Finance snapshots remain the order-item profit source. A backend daily-profit aggregation joins snapshot totals with AdsSpendDaily by the report dimensions; React pages consume only API DTOs through TanStack Query hooks.

**Tech Stack:** Node.js, Express, MongoDB/Mongoose, React 19, MUI 9, Tailwind, TanStack Query.

## Global Constraints

- Keep source Order and OrderItem documents unchanged.
- Store money in integer minor units and ratios in basis points.
- Keep data grouped by currency; never sum currencies in the client.
- Reuse existing `/portal/finance/summary` and `/portal/reports` routes and permissions.
- Do not change `src/components/operations/OperationsTable.jsx` or sidebar files.
- No new dependencies or chart library.

---

### Task 1: Backend Snapshot And Daily Profit Contract

**Files:**

- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\finance\validators\financeSnapshot.validator.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\finance\repositories\financeSnapshot.repository.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\report\routes\index.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\report\controllers\report.controller.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\report\services\report.service.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\modules\report\dtos\report.dto.js`
- Test: `C:\lng_system\lng-web-be-v1\lng-web-be\src\test\report\report.service.test.js`

- [ ] Add a failing test for daily profit rows that contain `adSpendAmount`, `netProfitAmount`, and `netMarginBps` without cross-currency totals.
- [ ] Add `salesChannelCode` and `marketplaceCode` to snapshot list validation.
- [ ] Add the scoped daily profit report endpoint and DTO. It must return one row per date/shop/channel/marketplace/currency and preserve an ad-less finance row as zero ad spend.
- [ ] Run the focused backend test suite.

### Task 2: Deterministic Ads Demo Seed

**Files:**

- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\scripts\seedFinanceDemo.js`
- Modify: `C:\lng_system\lng-web-be-v1\lng-web-be\src\scripts\seedFinanceDemo.test.js`

- [ ] Add a failing test asserting deterministic, positive AdsSpendDaily fields and the correct BPS calculations.
- [ ] Upsert daily campaign rows keyed by shop/channel/marketplace/date/campaign for the existing finance-demo order scope.
- [ ] Ensure a normal seed run neither changes source orders nor existing snapshots/ads rows.
- [ ] Run the seed, then verify daily profit aggregation has ad spend and net profit rows.

### Task 3: Finance And Report API Hooks

**Files:**

- Create: `src/features/finance/api/finance.keys.js`
- Create: `src/features/finance/api/finance.queries.js`
- Create: `src/features/reports/api/reports.keys.js`
- Create: `src/features/reports/api/reports.queries.js`
- Modify: `src/services/endpoints.js`
- Test: `src/features/finance/api/finance.queries.test.js`
- Test: `src/features/reports/api/reports.queries.test.js`

- [ ] Add failing tests for API response unwrapping and query keys including filters.
- [ ] Add `FINANCE.SNAPSHOTS` and report query hooks with `keepPreviousData` for filter changes.
- [ ] Add the daily-profit endpoint constant.
- [ ] Run the focused frontend tests.

### Task 4: Operational Screens

**Files:**

- Modify: `src/features/finance/pages/FinancePage.jsx`
- Modify: `src/features/reports/pages/ReportsPage.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`
- Test: `src/features/finance/pages/financePageComposition.test.js`
- Test: `src/features/reports/pages/reportsPageComposition.test.js`

- [ ] Add failing composition tests for the filter/table/tabs contract.
- [ ] Replace API workflow placeholders with dense read-only screens using actual query hooks.
- [ ] Display currency-specific KPIs, load/error/empty states, and missing-cost signals.
- [ ] Run `npm run lint` and `npm run build` in the frontend repository.
