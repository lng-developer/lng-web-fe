# Commercial Operations Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Replace the Portal home queue screen with a permission-aware commercial dashboard backed by real finance, buyer, vendor, and operations data.

**Architecture:** Reuse the existing Reports endpoints for daily profit, vendor performance, and operations overview. Add one PII-safe buyer aggregate to the Report module because the current API has no buyer cohort data. The FE composes those queries in the existing Home feature and derives visual values without local sample data.

**Tech Stack:** Express, Mongoose aggregation, Jest, React, TanStack Query, MUI, existing Operations UI and SVG report charts.

## Global Constraints

- Keep permissions backend-driven with `REPORTS:READ`; do not use role names.
- All money stays in integer minor units until formatted in the FE.
- Buyer output must be aggregate-only; never expose buyer name, email, phone, or external buyer ID.
- Reuse existing report endpoints and chart components; do not add dependencies.

---

### Task 1: Add PII-safe buyer insights report

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\order\repositories\order.repository.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\order\public.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\routes\index.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\controllers\report.controller.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\services\report.service.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\dtos\report.dto.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\services\report.service.test.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\routes\index.test.js`

- [ ] Add `summarizeBuyerInsights(query)` to the order repository. It groups only orders with `buyer.externalBuyerId`, scopes by shop/channel/marketplace/date, and returns aggregate counts: known buyers, new buyers, returning buyers, repeat buyers, orders with no stable buyer identity, and total orders.
- [ ] Export it from `order/public.js`.
- [ ] Add `GET /api/reports/buyers/insights`, protected by `REPORTS:READ`, and map the aggregate into numeric DTO fields only.
- [ ] Add service and route tests for global and shop-scoped reads, including proof that the DTO has no buyer identity fields.

### Task 2: Expose the report contract to the FE

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\services\endpoints.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\reports\api\reports.keys.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\reports\api\reports.queries.js`

- [ ] Add the buyer-insights path and a `useBuyerInsightsQuery` wrapper using the shared API client and existing unwrap function.
- [ ] Add vendor-performance and operations-overview query wrappers to reuse backend report contracts on the Home route.
- [ ] Keep query keys parameterized by filters and use `keepPreviousData`.

### Task 3: Implement the commercial dashboard UI

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\api\home.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\HomePage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\en\common.json`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\vi\common.json`
- Test: `C:\Users\stack\Task\lng-web-fe\src\features\home\api\home.queries.test.js`
- Test: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\homePageComposition.test.js`

- [ ] Default the analytics period to the preceding 30 calendar days and permit only `REPORTS:READ` users to load financial analytics.
- [ ] Render compact KPI cards for revenue, net profit, margin, orders, returning buyers, and revenue at risk.
- [ ] Reuse `DailyProfitChart` and `ChannelProfitChart`; add compact, semantic visual sections for cost bridge, buyer mix, vendor reliability, operations status, and report links.
- [ ] Retain exception counts only as small drill-down links. Show a permission-safe no-access state and preserve partial-data errors without replacing real values with sample rows.
- [ ] Add concise English and Vietnamese labels for every new visible dashboard string.

### Task 4: Verify the API and UI contracts

- [ ] Run `npm test -- --runInBand src/test/report/services/report.service.test.js src/test/report/routes/index.test.js` in `lng-web-be`.
- [ ] Run `node --test src/features/home/api/home.queries.test.js src/features/home/pages/homePageComposition.test.js` in `lng-web-fe`.
- [ ] Run `npm run lint` and `npm run build` in `lng-web-fe`.
- [ ] Manually verify that an admin sees real aggregates, a user without `REPORTS:READ` sees no financial data, and the dashboard never renders buyer PII or raw IDs.
