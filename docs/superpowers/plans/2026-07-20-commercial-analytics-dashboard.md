# Commercial Analytics Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Portal home page into a decision-oriented commercial dashboard, backed by safe aggregate reports and a repeatable 90-day demo dataset that makes every chart useful on a local database.

**Architecture:** Keep `/` as the single dashboard route. Reuse the existing daily-profit, buyer-insights, vendor-performance, and operations-overview reports; add one narrowly scoped ads/channel aggregate because CPA, CTR, and conversion cannot be derived accurately from the existing endpoints. Add a new backend-only analytics seed that writes records marked `DASH-DEMO` / `analytics-demo-seed`, so resetting the demonstration dataset never deletes imported production data.

**Tech Stack:** Express, Mongoose, Jest, React, TanStack Query, MUI, Tailwind, i18next, native SVG charts.

## Global Constraints

- Do not add dependencies.
- Store and aggregate money as integer minor units; format only at the UI boundary.
- Report endpoints require `REPORTS:READ` and use existing global/shop scope behavior.
- Buyer analytics must return aggregate counts only; never return names, email, phone, or buyer IDs.
- Seed data must be idempotent and its reset mode may delete only records carrying the `DASH-DEMO` / `analytics-demo-seed` marker.
- The dashboard must explain the decision behind each metric in concise visible copy or a tooltip; no generic chart labels.
- Reuse the current operations components and native SVG chart style; do not add a chart library.

---

### Task 1: Add the channel acquisition/performance report contract

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\finance\repositories\financeSnapshot.repository.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\finance\public.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\order\repositories\order.repository.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\order\public.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\dtos\report.dto.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\services\report.service.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\controllers\report.controller.js`
- Modify: `C:\Users\stack\Task\lng-web-be\src\modules\report\routes\index.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\services\report.service.test.js`
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\routes\index.test.js`

**Interfaces:**

- Produces `GET /api/reports/ads/channel-performance`.
- Response item shape:
  ```js
  {
    salesChannelCode: 'AMAZON',
    marketplaceCode: 'AMAZON_US',
    currency: 'USD',
    spendAmount: 0,
    attributedSalesAmount: 0,
    impressions: 0,
    clicks: 0,
    attributedOrdersCount: 0,
    newBuyerCount: 0,
    ctrBps: null,
    conversionBps: null,
    cpaAmount: null,
  }
  ```
- Consumes the existing `baseReportQuerySchema` (`dateFrom`, `dateTo`, `shopId`, `salesChannelCode`, `marketplaceCode`) and `applyReportScope()`.

- [ ] **Step 1: Write failing route and service assertions**

  Add a service test using two channel rows and an ads row with `spendAmount: 8000`, `clicks: 100`, `orders7d: 8`, `newBuyerCount: 4`. Assert the output has `ctrBps`, `conversionBps`, and `cpaAmount: 2000`; assert it has no buyer identity fields. Add a route test proving `/ads/channel-performance` returns `403` without `REPORTS:READ` and normalizes `salesChannelCode=amazon` to `AMAZON`.

- [ ] **Step 2: Run the focused tests and confirm they fail because the endpoint does not exist**

  Run:

  ```powershell
  npm test -- --runInBand src/test/report/services/report.service.test.js src/test/report/routes/index.test.js
  ```

  Expected: the new service method and route assertion fail.

- [ ] **Step 3: Implement bounded source aggregations**

  Add `summarizeAdsByChannel(query)` in the finance repository. Group `AdsSpendDaily` by `salesChannelCode`, `marketplaceCode`, and `currency`; sum `spendAmount`, `attributedSalesAmount`, `impressions`, `clicks`, and `orders7d`.

  Add `summarizeNewBuyersByChannel(query)` in the order repository. Reuse the buyer identity filter and report period semantics, group by channel/marketplace, and return only `newBuyerCount`. Do not include the grouped buyer identifier in the final projection.

  Expose both through their module `public.js` ports. In `report.service.js`, merge by `salesChannelCode|marketplaceCode|currency` and calculate:

  ```js
  ctrBps: impressions > 0 ? Math.round((clicks / impressions) * 10000) : null,
  conversionBps: clicks > 0 ? Math.round((attributedOrdersCount / clicks) * 10000) : null,
  cpaAmount: newBuyerCount > 0 ? Math.round(spendAmount / newBuyerCount) : null,
  ```

  Map through `toAdsChannelPerformanceDto`, register the controller, and add the protected route.

- [ ] **Step 4: Re-run focused tests**

  Run the command from Step 2.
  Expected: all report route/service tests pass, including scoped and PII-safe assertions.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/modules/finance src/modules/order src/modules/report src/test/report
  git commit -m "feat(report): add channel acquisition analytics"
  ```

### Task 2: Create a safe, repeatable analytics demo dataset

**Files:**

- Create: `C:\Users\stack\Task\lng-web-be\src\scripts\seedAnalyticsDemo.js`
- Create: `C:\Users\stack\Task\lng-web-be\src\scripts\seedAnalyticsDemo.test.js`
- Modify: `C:\Users\stack\Task\lng-web-be\package.json`
- Modify: `C:\Users\stack\Task\lng-web-be\README.md`

**Interfaces:**

- Produces `npm run seed:analytics:demo` and `npm run seed:analytics:demo -- --reset`.
- The default seed upserts a deterministic 90-day dataset across `Order`, `OrderItem`, `FinanceSnapshot`, and `AdsSpendDaily`.
- `--reset` deletes only records where the order external ID begins `DASH-DEMO-` or the ads source reference is `analytics-demo-seed`; it then recreates the same dataset.

- [ ] **Step 1: Write failing seed tests**

  Test pure builders, not a live database:

  ```js
  expect(buildAnalyticsRows(new Date('2026-07-20T12:00:00.000Z'))).toHaveLength(720)
  expect(rows.some((row) => row.order.externalOrderId.startsWith('DASH-DEMO-'))).toBe(true)
  expect(rows.filter((row) => row.order.buyer.externalBuyerId).length).toBeGreaterThan(500)
  expect(buildAnalyticsAds(rows).every((row) => row.sourceRef === 'analytics-demo-seed')).toBe(true)
  ```

  Also assert the first and last order dates span exactly 90 UTC days, multiple buyer IDs repeat across dates, and all money fields are integers.

- [ ] **Step 2: Run the seed test and confirm it fails because builders do not exist**

  Run:

  ```powershell
  npm test -- --runInBand src/scripts/seedAnalyticsDemo.test.js
  ```

  Expected: module-not-found or missing-builder failure.

- [ ] **Step 3: Implement deterministic, non-destructive seed builders**

  Use a small local seeded hash function. Generate 4 orders/day/channel for 90 days: Amazon US for `Football US Shop` and Etsy US for `Pet Memorial Shop` (720 orders/items total). Use a fixed pool of 120 buyer IDs with a deterministic repeat pattern so new, returning, and repeat-in-period metrics are meaningful.

  For every order item, write an estimated finance snapshot with prices, fees, base cost, refunds, and margin in minor units. For every day/channel, write two campaign rows (`BRANDED`, `PROSPECTING`) with realistic impressions, clicks, orders7d, spend, attributed sales, CTR, ACOS, ROAS, and CPC. Set a small deterministic spread of item statuses (`DELIVERED`, `SHIPPED`, `SENT_TO_VENDOR`, `NEED_PRODUCTION`, `MAPPING_PENDING`) so operations status does not render as all zero.

  Upsert orders by `{ shopId, salesChannelCode, externalOrderId }`, items by `{ orderId, externalItemId }`, snapshots by `orderItemId`, and ads by the existing unique campaign key. Set `timestamps: false` only while explicitly writing historical `createdAt`, `updatedAt`, `orderedAt`, and `calculatedAt`.

- [ ] **Step 4: Implement reset guard and CLI script**

  Implement:

  ```js
  const demoOrderFilter = { externalOrderId: { $regex: '^DASH-DEMO-' } }
  const demoAdsFilter = { sourceRef: 'analytics-demo-seed' }
  ```

  Resolve seeded order IDs first, then delete dependent demo `OrderItem` and `FinanceSnapshot` records by those IDs. Never call `deleteMany({})` and never delete records selected only by shop or channel.

  Add package scripts:

  ```json
  "seed:analytics:demo": "node src/scripts/seedAnalyticsDemo.js",
  "reset:analytics:demo": "node src/scripts/seedAnalyticsDemo.js --reset"
  ```

- [ ] **Step 5: Re-run seed tests and perform a dry local verification**

  Run:

  ```powershell
  npm test -- --runInBand src/scripts/seedAnalyticsDemo.test.js
  npm run seed:analytics:demo
  npm run seed:analytics:demo
  ```

  Expected: the test passes; the second command is idempotent and reports zero duplicate records.

- [ ] **Step 6: Document the seed commands and commit**

  Add a README section stating that the seed is local demo data, is safe to rerun, and reset only removes marker-owned data.

  ```powershell
  git add package.json README.md src/scripts/seedAnalyticsDemo.*
  git commit -m "feat(seed): add commercial analytics demo data"
  ```

### Task 3: Expose channel analytics to the frontend

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\services\endpoints.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\services\endpoints.contract.test.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\reports\api\reports.keys.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\reports\api\reports.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\api\home.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\api\home.queries.test.js`

**Interfaces:**

- Adds `ENDPOINTS.REPORTS.ADS_CHANNEL_PERFORMANCE` and `useAdsChannelPerformanceQuery(query, options)`.
- `useHomeDashboardQuery(user, query)` returns `channelPerformance: []` when reports are unavailable and otherwise exposes the API response unchanged.

- [ ] **Step 1: Add a failing endpoint contract assertion**

  Add:

  ```js
  assert.equal(ENDPOINTS.REPORTS.ADS_CHANNEL_PERFORMANCE, '/api/reports/ads/channel-performance')
  ```

  Add a source-composition assertion for `useAdsChannelPerformanceQuery` in `home.queries.test.js`.

- [ ] **Step 2: Run the narrow FE tests and confirm they fail**

  Run:

  ```powershell
  node --test src/services/endpoints.contract.test.js src/features/home/api/home.queries.test.js
  ```

  Expected: the new endpoint/query symbols are missing.

- [ ] **Step 3: Implement the smallest query wiring**

  Add one endpoint constant, one report query key, and one query wrapper using the existing `useReportQuery` helper. Include it in `useHomeDashboardQuery` with the same `REPORTS:READ` gate and refetch aggregation as the four current report queries. Do not add a second API client or a feature-specific fetch function.

- [ ] **Step 4: Re-run narrow FE tests**

  Run the command from Step 2.
  Expected: all assertions pass.

- [ ] **Step 5: Commit**

  ```powershell
  git add src/services/endpoints.js src/services/endpoints.contract.test.js src/features/reports/api src/features/home/api
  git commit -m "feat(home): load channel acquisition analytics"
  ```

### Task 4: Replace generic charts with decision-oriented commercial analytics

**Files:**

- Create: `C:\Users\stack\Task\lng-web-fe\src\features\home\components\AcquisitionTable.jsx`
- Create: `C:\Users\stack\Task\lng-web-fe\src\features\home\components\AcquisitionFunnelChart.jsx`
- Create: `C:\Users\stack\Task\lng-web-fe\src\features\home\components\ChannelMixChart.jsx`
- Create: `C:\Users\stack\Task\lng-web-fe\src\features\home\components\DashboardSectionHeader.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\HomePage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\utils\commercialDashboard.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\utils\commercialDashboard.test.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\homePageComposition.test.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\en\common.json`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\vi\common.json`

**Interfaces:**

- `AcquisitionTable({ rows, language })` renders channel, ad spend, new buyers, CPA, CTR, conversion, and ROAS without exposing technical IDs.
- `AcquisitionFunnelChart({ rows })` renders each channel as a stacked ratio bar: impressions -> clicks -> attributed orders; tooltips show absolute counts and derived percentages.
- `ChannelMixChart({ rows, metric, language })` renders one donut for revenue mix and one for net-profit mix; `metric` is either `revenueAmount` or `netProfitAmount`.
- `buildCommercialDashboard()` adds stable `acquisitionRows` and preserves currency separation.

- [ ] **Step 1: Write failing mapper/component composition tests**

  Extend `commercialDashboard.test.js` with rows for Amazon and Etsy and assert the mapper retains each currency independently and calculates no CPA when `newBuyerCount` is zero. In `homePageComposition.test.js`, assert `AcquisitionTable`, `AcquisitionFunnelChart`, and `ChannelMixChart` are present and generic labels such as `Operations status` are not the first dashboard section.

- [ ] **Step 2: Run the focused tests and confirm they fail**

  Run:

  ```powershell
  node --test src/features/home/utils/commercialDashboard.test.js src/features/home/pages/homePageComposition.test.js
  ```

  Expected: missing component and mapper assertions fail.

- [ ] **Step 3: Build the four dashboard sections using native SVG/CSS**

  Keep the page dense and organized in this order:
  1. Header: `Commercial overview` plus a one-line purpose, 7/30/90-day and channel filters, report link, refresh.
  2. Decision summary: sales, net profit, margin, ad spend, CPA, returning buyer rate; each metric has a short interpretation label such as `Marketing efficiency` or `Customer retention`.
  3. Acquisition: CPA table on the left and a funnel/CTR-conversion stacked bar chart on the right.
  4. Profit: existing daily revenue/cost/profit chart, then revenue/profit mix donuts by channel.
  5. Operating health: existing exception links, vendor reliability, and operations status as the final section.

  Use the screenshot only as a structural reference: bordered analytical panels, clear legends, dark data marks, and no decorative gradients. Use existing theme/Tailwind semantic tokens rather than new hex palettes.

- [ ] **Step 4: Add user-facing i18n copy**

  Add short labels and helper copy in both locales. Required examples:

  ```json
  {
    "acquisition": "Customer acquisition",
    "cpa": "Cost per new buyer",
    "conversion": "Click-to-order conversion",
    "profitMix": "Net-profit mix by channel",
    "decisionHint": "Compare acquisition cost with margin before increasing ad spend."
  }
  ```

  Vietnamese must be human-readable, not technical field names.

- [ ] **Step 5: Verify empty and partial states**

  Render an informative empty panel when channel performance has no rows: explain that imports or demo analytics data are required and link to Reports. Preserve the existing partial-data alert when one report fails; do not show fake UI rows.

- [ ] **Step 6: Re-run focused tests, lint, and build**

  Run:

  ```powershell
  node --test src/features/home/utils/commercialDashboard.test.js src/features/home/pages/homePageComposition.test.js src/services/endpoints.contract.test.js
  npm run lint
  npm run build
  ```

  Expected: all tests pass, lint exits 0, and Vite build exits 0.

- [ ] **Step 7: Commit**

  ```powershell
  git add src/features/home src/i18n/locales
  git commit -m "feat(home): add commercial acquisition dashboard"
  ```

### Task 5: Validate seeded reports and the actual dashboard flow

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-be\README.md`
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\services\report.service.test.js`
- Test: `C:\Users\stack\Task\lng-web-fe\src\features\home\utils\commercialDashboard.test.js`

**Interfaces:**

- The demo seed supports a documented local validation sequence and does not require external marketplace credentials.

- [ ] **Step 1: Seed and inspect report payloads**

  Run:

  ```powershell
  npm run reset:analytics:demo
  ```

  Authenticate locally, then verify these report endpoints for a 90-day range:

  ```text
  /api/reports/finance/daily-profit?dateFrom=2026-04-22&dateTo=2026-07-20
  /api/reports/buyers/insights?dateFrom=2026-04-22&dateTo=2026-07-20
  /api/reports/ads/channel-performance?dateFrom=2026-04-22&dateTo=2026-07-20
  ```

  Expected: multiple Amazon/Etsy rows, non-zero ad spend, repeat buyers, CPA, CTR, and conversion metrics; no buyer identities in any report response.

- [ ] **Step 2: Perform manual UI checks**

  Open `http://localhost:5173/` as an authenticated admin and verify:
  - Dashboard immediately states its purpose and the active date range.
  - Changing 7/30/90 days updates the acquisition table and all charts without route reset.
  - Changing Amazon/Etsy filters all commercial panels consistently.
  - No chart mixes currencies; the currency selector changes only the money panels.
  - The 90-day seeded dataset makes all chart sections non-empty at desktop and mobile widths.
  - With report permission removed, the dashboard keeps non-sensitive order exceptions and shows the analytics-access notice instead of crashing.

- [ ] **Step 3: Run final checks and commit documentation**

  Run:

  ```powershell
  npm test -- --runInBand src/test/report/services/report.service.test.js src/test/report/routes/index.test.js src/scripts/seedAnalyticsDemo.test.js
  ```

  Then commit the README validation instructions:

  ```powershell
  git add README.md src/test/report src/scripts/seedAnalyticsDemo.test.js
  git commit -m "docs: add analytics dashboard validation"
  ```

## Self-Review

- Coverage: tasks cover the missing data source, PII-safe API contract, deterministic seed history, FE query wiring, chart replacement, empty states, and live verification.
- Scope: no external ad provider integration, customer PII report, chart dependency, or production-data deletion is included.
- Consistency: all report data uses the existing report permission/scope flow and all amounts remain minor units until formatting.

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-07-20-commercial-analytics-dashboard.md`.

1. Subagent-Driven: dispatch a fresh subagent per task with review gates.
2. Inline Execution: execute the tasks in this session with checkpoints.
