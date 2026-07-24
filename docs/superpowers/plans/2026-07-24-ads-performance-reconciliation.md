# Ads Performance & Reconciliation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real Ads performance and reconciliation view to the existing Reports page, reusing current report and Finance Imports contracts.

**Architecture:** Extend the existing Reports query layer with daily and seller Ads endpoints, keep calculations in one pure utility, and render one `AdsReportView` selected by `?report=ads`. Reuse Finance Imports queries for evidence and link to its existing workbench instead of duplicating import/reprocess behavior.

**Tech Stack:** React 19, Vite 8, MUI 9, Tailwind CSS 4, TanStack Query 5, React Router 7, Node test runner.

## Global Constraints

- Work in the current `C:\lng_system\lng-web\lng-web-fe` checkout on its current branch; do not create or switch branches or worktrees.
- Because that branch is `develop`, do not commit or push during execution unless the user explicitly authorizes committing to `develop`; stop at a verified working diff.
- Use `C:\lng_system\lng-web\lng-web-fe-v3\.stitch` only as visual reference.
- Preserve existing changes in `src/features/finance/pages/FinancePage.jsx` and `docs/superpowers/plans/2026-07-23-finance-data-imports.md`.
- Follow `CONVENTIONS.md`; reuse MUI, Tailwind, TanStack Query, `Operations*`, `apiClient`, endpoint constants, and Finance Imports hooks.
- Add no dependency and no backend behavior.
- Never aggregate different currencies.
- Keep import, batch detail, and reprocess actions in Finance Data Imports.

---

### Task 1: Add Ads Metrics and Missing Query Contracts

**Files:**

- Modify: `src/services/endpoints.js`
- Modify: `src/features/reports/api/reports.keys.js`
- Modify: `src/features/reports/api/reports.queries.js`
- Create: `src/features/reports/utils/adsReport.js`
- Create: `src/features/reports/utils/adsReport.test.js`
- Create: `src/features/reports/api/reportsAdsQueries.test.js`

**Interfaces:**

- Produces: `useAdsDailyQuery(query, options)`, `useAdsSellerAttributionQuery(query, options)`, `summarizeAdsCurrency(rows, currency)`, and `getAdsQualityState(value)`.

- [ ] **Step 1: Write failing pure-function tests**

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { getAdsQualityState, summarizeAdsCurrency } from './adsReport.js'

test('summarizeAdsCurrency isolates currencies and handles zero denominators', () => {
  assert.deepEqual(
    summarizeAdsCurrency(
      [
        {
          currency: 'USD',
          spendAmount: 2000,
          attributedSalesAmount: 8000,
          clicks: 10,
          attributedOrdersCount: 2,
        },
        {
          currency: 'EUR',
          spendAmount: 1000,
          attributedSalesAmount: 3000,
          clicks: 5,
          attributedOrdersCount: 1,
        },
      ],
      'USD',
    ),
    {
      spendAmount: 2000,
      attributedSalesAmount: 8000,
      clicks: 10,
      attributedOrdersCount: 2,
      roas: 4,
      cpcAmount: 200,
    },
  )
  assert.equal(summarizeAdsCurrency([{ currency: 'USD' }], 'USD').roas, null)
  assert.equal(summarizeAdsCurrency([{ currency: 'USD' }], 'USD').cpcAmount, null)
})

test('getAdsQualityState returns evidence-backed warnings only', () => {
  assert.equal(getAdsQualityState({ sellerEmployeeCode: 'UNASSIGNED' }), 'UNASSIGNED_SELLER')
  assert.equal(getAdsQualityState({ status: 'PARTIAL_FAILED' }), 'PARTIAL_IMPORT')
  assert.equal(getAdsQualityState({ status: 'FAILED' }), 'FAILED_IMPORT')
  assert.equal(getAdsQualityState({ status: 'COMPLETED' }), null)
})
```

- [ ] **Step 2: Run the tests and verify failure**

Run from `C:\lng_system\lng-web\lng-web-fe`:

```powershell
node --test src/features/reports/utils/adsReport.test.js
```

Expected: FAIL because `adsReport.js` does not exist.

- [ ] **Step 3: Implement the minimal utility**

```js
export function summarizeAdsCurrency(rows = [], currency) {
  const totals = rows
    .filter((row) => row.currency === currency)
    .reduce(
      (sum, row) => ({
        spendAmount: sum.spendAmount + Number(row.spendAmount || 0),
        attributedSalesAmount: sum.attributedSalesAmount + Number(row.attributedSalesAmount || 0),
        clicks: sum.clicks + Number(row.clicks || 0),
        attributedOrdersCount: sum.attributedOrdersCount + Number(row.attributedOrdersCount || 0),
      }),
      { spendAmount: 0, attributedSalesAmount: 0, clicks: 0, attributedOrdersCount: 0 },
    )
  return {
    ...totals,
    roas: totals.spendAmount > 0 ? totals.attributedSalesAmount / totals.spendAmount : null,
    cpcAmount: totals.clicks > 0 ? Math.round(totals.spendAmount / totals.clicks) : null,
  }
}

export function getAdsQualityState(value = {}) {
  const batchState = {
    PARTIAL_FAILED: 'PARTIAL_IMPORT',
    FAILED: 'FAILED_IMPORT',
    PROCESSING: 'PROCESSING',
  }[value.status]
  if (batchState) return batchState
  if (
    Object.hasOwn(value, 'sellerEmployeeCode') &&
    (!value.sellerEmployeeCode || value.sellerEmployeeCode === 'UNASSIGNED')
  )
    return 'UNASSIGNED_SELLER'
  return null
}
```

- [ ] **Step 4: Add endpoint constants, keys, hooks, and composition assertions**

Add:

```js
ADS_BY_SELLER: '/api/reports/ads/by-seller',
ADS_DAILY: '/api/reports/ads/daily',
```

Add keys `adsDaily(query)` and `adsBySeller(query)`, then implement both hooks through the existing `useReportQuery` helper. In `reportsAdsQueries.test.js`, use `readFileSync` assertions to prove the hooks use `ENDPOINTS.REPORTS.ADS_DAILY`, `ENDPOINTS.REPORTS.ADS_BY_SELLER`, and the matching keys.

- [ ] **Step 5: Verify the task checkpoint**

```powershell
node --test src/features/reports/utils/adsReport.test.js src/features/reports/api/reportsAdsQueries.test.js
npm run lint
git diff --check
```

### Task 2: Build the Ads Report View

**Files:**

- Create: `src/features/reports/components/AdsDailyChart.jsx`
- Create: `src/features/reports/components/AdsReportView.jsx`
- Create: `src/features/reports/components/adsReportViewComposition.test.js`

**Interfaces:**

- Consumes: channel, daily, seller, latest Ads batch, and recent imported Ads row query results.
- Produces: `AdsReportView({ filters, canReadFinance })` with per-currency KPIs, daily chart, channel table, seller table, import health, and campaign evidence.

Use the repository-required `design-taste-frontend` skill before editing UI files, while preserving the current dense MUI/Tailwind operations language.

- [ ] **Step 1: Write the failing composition test**

```js
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('AdsReportView composes performance and optional finance evidence', () => {
  const source = readFileSync(new URL('./AdsReportView.jsx', import.meta.url), 'utf8')
  assert.match(source, /useAdsChannelPerformanceQuery/)
  assert.match(source, /useAdsDailyQuery/)
  assert.match(source, /useAdsSellerAttributionQuery/)
  assert.match(source, /useFinanceImportBatchesQuery/)
  assert.match(source, /useFinanceImportedDataQuery/)
  assert.match(source, /canReadFinance/)
  assert.doesNotMatch(source, /Reprocess|useFinanceImportBatchReprocessMutation/)
})
```

- [ ] **Step 2: Run the test and verify failure**

```powershell
node --test src/features/reports/components/adsReportViewComposition.test.js
```

Expected: FAIL because `AdsReportView.jsx` does not exist.

- [ ] **Step 3: Implement the daily chart without a dependency**

Follow `DailyProfitChart.jsx`: use a semantic heading, MUI surface styles, responsive SVG `viewBox`, keyboard-neutral presentation, and formatted tooltip text. Render Spend and Attributed Sales only; do not add a chart package.

- [ ] **Step 4: Implement the view with existing operations components**

Use:

```js
const channelQuery = useAdsChannelPerformanceQuery(filters)
const dailyQuery = useAdsDailyQuery(filters)
const sellerQuery = useAdsSellerAttributionQuery(filters)
const batchQuery = useFinanceImportBatchesQuery(
  { ...filters, sourceType: 'ADS', page: 1, limit: 1 },
  { enabled: canReadFinance },
)
const evidenceQuery = useFinanceImportedDataQuery(
  'ADS',
  { ...filters, page: 1, limit: 10 },
  { enabled: canReadFinance },
)
```

Group KPI/chart/table rows by currency. Use `OperationsTable`, MUI `Alert`, `Button`, `Chip`, and existing formatting helpers. Render `UNASSIGNED` with warning text. Link evidence to `ROUTES.PORTAL_FINANCE_IMPORTS`; do not add drawer, import, or reprocess code.

- [ ] **Step 5: Verify the task checkpoint**

```powershell
node --test src/features/reports/components/adsReportViewComposition.test.js
npm run lint
git diff --check
```

### Task 3: Integrate the Ads View Into Reports and URL State

**Files:**

- Modify: `src/features/reports/pages/ReportsPage.jsx`
- Modify: `src/features/reports/pages/reportsPageComposition.test.js`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`

**Interfaces:**

- Consumes: `AdsReportView`, current user permissions, current Report filters, and `?report=ads`.
- Produces: an Ads tab inside `/portal/reports` without changing the route or sidebar hierarchy.

- [ ] **Step 1: Extend the failing Reports composition test**

Add assertions:

```js
assert.equal(source.includes('import AdsReportView'), true)
assert.equal(source.includes("value: 'ads'"), true)
assert.equal(source.includes("searchParams.get('report')"), true)
assert.equal(source.includes('<AdsReportView'), true)
assert.equal(source.includes("hasAllPermissions(currentUser, ['FINANCE:READ'])"), true)
```

Also assert both locale files contain `financialReports.tabs.ads`, `financialReports.ads.spend`, `financialReports.ads.attributedSales`, `financialReports.ads.unassignedSeller`, and `financialReports.ads.openImports`.

- [ ] **Step 2: Run the existing test and verify failure**

```powershell
node --test src/features/reports/pages/reportsPageComposition.test.js
```

- [ ] **Step 3: Make report selection URL-addressable**

Use `useSearchParams`. Accept `daily`, `seller`, `team`, and `ads`; default invalid/missing values to `daily`. Tab changes update only `report` while preserving `channel` and other query parameters.

- [ ] **Step 4: Render AdsReportView with conditional Finance access**

Import `useAuthStore` from `@/store/useAuthStore` and `hasAllPermissions` from `@/features/auth/utils/authz.js`, then use the same selector as `FinanceDataImportsPage`:

```js
const currentUser = useAuthStore((state) => state.currentUser)
const canReadFinance = hasAllPermissions(currentUser, ['FINANCE:READ'])
```

Render `<AdsReportView filters={query} canReadFinance={canReadFinance} />` only for the Ads tab. Keep current daily/seller/team behavior unchanged.

- [ ] **Step 5: Add English and Vietnamese copy**

Add concise labels for Ads KPIs, channel/seller tables, import states, evidence, empty/error messages, and the Finance Imports link. Do not expose backend enum names as primary user-facing copy.

- [ ] **Step 6: Verify the task checkpoint**

```powershell
node --test src/features/reports/pages/reportsPageComposition.test.js src/layouts/sidebarNavigation.test.js
npm run lint
git diff --check
```

### Task 4: Contract, Regression, and Browser Verification

**Files:**

- Modify only Ads/report files that fail verification.
- Do not modify `src/features/finance/pages/FinancePage.jsx`.

**Interfaces:**

- Produces: verified behavior against the current Finance and Report APIs.

- [ ] **Step 1: Verify backend contracts in the current backend checkout**

```powershell
npm test -- src/test/report/routes/index.test.js src/test/finance/routes/index.test.js --runInBand
```

Run from `C:\lng_system\lng-web\lng-web-be`. Expected: PASS.

- [ ] **Step 2: Run focused and broad frontend checks**

```powershell
node --test src/features/reports/**/*.test.js src/layouts/sidebarNavigation.test.js
npm run lint
npm run build
```

Run from `C:\lng_system\lng-web\lng-web-fe`. Expected: all commands exit `0`.

- [ ] **Step 3: Verify in the browser**

Open `/portal/reports?report=ads` and test desktop, narrow viewport, keyboard focus, loading, empty, one-panel failure, mixed currencies, `UNASSIGNED`, failed/partial batch, users with and without `FINANCE:READ`, and the link to Finance Data Imports.

- [ ] **Step 4: Check final scope**

```powershell
git status --short
git diff --check
git diff --stat
```

Confirm the pre-existing `FinancePage.jsx` change and Finance Imports plan remain untouched. Leave the verified Ads diff uncommitted on `develop` unless the user explicitly authorizes a direct commit.
