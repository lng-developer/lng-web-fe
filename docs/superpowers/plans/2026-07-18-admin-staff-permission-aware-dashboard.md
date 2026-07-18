# Admin And Staff Permission-Aware Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn `/` into one permission-aware operations dashboard that routes each admin or staff user to existing workbench queues.

**Architecture:** Keep Home as a thin composition surface. Reuse module summary endpoints and route-level permission rules, project their results through one pure Home feature mapper, and link into existing pages. No aggregate endpoint, role-specific dashboard, generic dashboard framework, or duplicated workbench tables is introduced.

**Tech Stack:** React 19, React Router, MUI, Tailwind utilities, TanStack Query 5, Zustand, Node test runner.

## Global Constraints

- No new dependency.
- Use `hasAnyPermission` and `canBypassPermissions`; do not branch on role names or `allowedRoles`.
- Do not call `/api/reports/operations/overview` for staff dashboard queues and do not grant `REPORTS:READ` to staff.
- Reuse `OperationsPageShell`, `OperationsHeader`, `OperationsTable`, and `StatusBadge`.
- Summary endpoints remain the backend authority for permission and scope.
- No backend code change in this phase.
- Keep existing target workbench defaults unchanged when a dashboard search parameter is absent.

---

## File Structure

- Create `src/features/home/utils/dashboardView.js`: queue definitions, permission visibility, count selectors, priorities, and route builders.
- Create `src/features/home/utils/dashboardView.test.js`: pure unit coverage for visibility, bypass, count projection, partial failure, and URLs.
- Modify `src/features/home/api/home.queries.js`: replace the report-overview query with a composed, permission-enabled dashboard query hook.
- Modify `src/features/home/api/home.keys.js`: add a stable dashboard query-key namespace.
- Modify `src/features/home/api/home.queries.test.js`: remove report-overview mapper expectations and cover the Home query composition contract.
- Modify `src/features/vendor-submissions/api/vendorSubmissions.queries.js`: export the missing summary hook using the existing endpoint/key.
- Modify `src/features/shipments/api/shipments.queries.js`: export the missing summary hook using the existing endpoint/key.
- Create `src/features/home/components/DashboardQueueTable.jsx`: Home-specific operational queue table; no general-purpose component.
- Create `src/features/home/components/DashboardManagementLinks.jsx`: Home-specific permission-filtered management links.
- Modify `src/features/home/pages/HomePage.jsx`: compose query results, loading/error/empty states, queue table, attention list, and management links.
- Modify `src/i18n/locales/en/common.json` and `src/i18n/locales/vi/common.json`: add matching Home copy.
- Modify `src/i18n/locales/i18nParity.test.js`: keep English/Vietnamese keys aligned.
- Modify `src/features/scale/utils/scaleApi.js` and `src/features/scale/pages/ScalePage.jsx`: accept `status` and `channel` dashboard search parameters at initialization.
- Modify `src/features/qc/utils/qcApi.js` and `src/features/qc/pages/QcPage.jsx`: accept `status` and `channel` dashboard search parameters at initialization.
- Modify `src/features/vendor-submissions/utils/vendorSubmissionsApi.js` and `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`: accept a `status` dashboard search parameter at initialization.
- Modify `src/features/shipments/utils/shipmentsApi.js` and `src/features/shipments/pages/ShippingPage.jsx`: accept a `status` dashboard search parameter at initialization.
- Modify the existing `*.test.js` files beside each changed utility/page to cover parsing and composition.

---

### Task 1: Add Missing Module Summary Hooks

**Files:**

- Modify: `src/features/vendor-submissions/api/vendorSubmissions.queries.js`
- Modify: `src/features/shipments/api/shipments.queries.js`
- Create: `src/features/vendor-submissions/api/vendorSubmissions.queries.test.js`
- Create: `src/features/shipments/api/shipments.queries.test.js`

**Interfaces:**

- Produces: `useVendorSubmissionsSummaryQuery(query, options)` returning `{ total, ready, submitted, failed, cancelled, byStatus }`.
- Produces: `useShipmentsSummaryQuery(query, options)` returning `{ total, trackingPending, shipped, delivered, exception, cancelled, byStatus }`.
- Consumes: existing `ENDPOINTS.*.SUMMARY`, `*.Keys.summary(query)`, `apiClient`, and `unwrapApiData`.

- [ ] **Step 1: Add source-contract tests**

Create `vendorSubmissions.queries.test.js` and `shipments.queries.test.js` using the repository's `node:test` style. Each test reads the query source and asserts the hook uses its existing summary endpoint and summary key:

```js
assert.match(source, /useVendorSubmissionsSummaryQuery/)
assert.match(source, /vendorSubmissionsKeys\.summary\(query\)/)
assert.match(source, /ENDPOINTS\.VENDOR_SUBMISSIONS\.SUMMARY/)
```

Repeat with `useShipmentsSummaryQuery`, `shipmentsKeys.summary(query)`, and `ENDPOINTS.SHIPMENTS.SUMMARY`.

- [ ] **Step 2: Run focused tests and confirm failure**

```powershell
node --test src\features\vendor-submissions\api\vendorSubmissions.queries.test.js src\features\shipments\api\shipments.queries.test.js
```

Expected: FAIL because both hooks do not exist.

- [ ] **Step 3: Export the smallest query hooks**

Append this exact pattern to `vendorSubmissions.queries.js`:

```js
export function useVendorSubmissionsSummaryQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: vendorSubmissionsKeys.summary(query),
    queryFn: () =>
      apiClient.get(ENDPOINTS.VENDOR_SUBMISSIONS.SUMMARY, { params: query }).then(unwrapApiData),
    placeholderData: keepPreviousData,
    ...options,
  })
}
```

Append the equivalent shipment hook using `shipmentsKeys.summary(query)` and `ENDPOINTS.SHIPMENTS.SUMMARY`.

- [ ] **Step 4: Verify and commit**

```powershell
node --test src\features\vendor-submissions\api\vendorSubmissions.queries.test.js src\features\shipments\api\shipments.queries.test.js
git add src\features\vendor-submissions\api src\features\shipments\api
git commit -m "feat(home): add operational summary hooks"
```

Expected: focused tests PASS.

### Task 2: Define the Home Queue Projection Once

**Files:**

- Create: `src/features/home/utils/dashboardView.js`
- Create: `src/features/home/utils/dashboardView.test.js`
- Modify: `src/features/home/api/homeSummary.js`
- Modify: `src/features/home/api/home.queries.test.js`

**Interfaces:**

- Produces: `buildDashboardView({ user, summaries, failures })`.
- Return shape: `{ queues, attention, totalCount, managementLinks }`, where every queue has `{ id, count, tone, labelKey, descriptionKey, href }`.
- Consumes: `hasAnyPermission(user, requiredAnyPermissions)`, `canBypassPermissions(user)`, `ROUTES`, and raw module summary payloads.

- [ ] **Step 1: Write failing pure tests**

Cover these fixed cases in `dashboardView.test.js`:

```js
const productionUser = { permissions: ['PRODUCTION:READ'] }
const result = buildDashboardView({
  user: productionUser,
  summaries: { production: { needScale: 4, qcPending: 2, blockers: { MISSING_PSD: 3 } } },
  failures: {},
})

assert.deepEqual(
  result.queues.map(({ id, count }) => ({ id, count })),
  [
    { id: 'scale', count: 4 },
    { id: 'qc', count: 2 },
  ],
)
assert.equal(result.attention[0].id, 'missing-psd')
assert.equal(
  result.queues.every((queue) => !queue.id.includes('orders')),
  true,
)
```

Also assert `MANAGE_SYSTEM` reveals all configured queues, a failed shipment query only omits shipment rows, and generated Scale/QC/Vendor/Shipping URLs use the exact target route and `status` parameter.

- [ ] **Step 2: Run test and confirm failure**

```powershell
node --test src\features\home\utils\dashboardView.test.js
```

Expected: FAIL because `dashboardView.js` does not exist.

- [ ] **Step 3: Implement a declarative queue list and projection**

In `dashboardView.js`, keep all behavior local to Home. Use a small definition array, not classes or a registry:

```js
const queueDefinitions = [
  {
    id: 'scale',
    requiredAnyPermissions: ['PRODUCTION:READ', 'PRODUCTION:WRITE', 'DESIGN:WORK'],
    count: (summaries) => Number(summaries.production?.needScale) || 0,
    href: `${ROUTES.PORTAL_SCALE}?status=needScale`,
    tone: 'warning',
  },
  // qc, design, vendor-ready, tracking-pending, and the existing order tabs
]
```

`buildDashboardView` must filter definitions with `hasAnyPermission`, omit only queue families whose query key is present in `failures`, sort attention before normal queues by a numeric `priority`, and derive `totalCount` from visible queues. Retire `mapHomeSummaryResponse`; the report-overview response must no longer be part of Home.

- [ ] **Step 4: Verify and commit**

```powershell
node --test src\features\home\utils\dashboardView.test.js src\features\home\api\home.queries.test.js
git add src\features\home\utils src\features\home\api\homeSummary.js src\features\home\api\home.queries.test.js
git commit -m "feat(home): project queues by permission"
```

Expected: tests PASS; the only access logic is permission-based.

### Task 3: Compose Permission-Enabled Summary Queries

**Files:**

- Modify: `src/features/home/api/home.keys.js`
- Modify: `src/features/home/api/home.queries.js`
- Modify: `src/features/home/api/home.queries.test.js`

**Interfaces:**

- Produces: `useHomeDashboardQuery(user)`.
- Return shape: `{ data: { queues, attention, totalCount, managementLinks }, isPending, isError, refetch }`.
- Consumes: existing Order, Production, Design, Vendor Submission, and Shipment summary hooks plus `buildDashboardView`.

- [ ] **Step 1: Replace the obsolete report-overview contract test**

Update `home.queries.test.js` to assert the source imports and calls all five module summary hooks and does not contain `OPERATIONS_OVERVIEW`:

```js
assert.match(source, /useOrderSummaryQuery/)
assert.match(source, /useProductionSummaryQuery/)
assert.match(source, /useDesignTaskSummaryQuery/)
assert.match(source, /useVendorSubmissionsSummaryQuery/)
assert.match(source, /useShipmentsSummaryQuery/)
assert.doesNotMatch(source, /OPERATIONS_OVERVIEW/)
```

- [ ] **Step 2: Run test and confirm failure**

```powershell
node --test src\features\home\api\home.queries.test.js
```

Expected: FAIL because Home still calls the report overview endpoint.

- [ ] **Step 3: Compose fixed hook calls with enabled flags**

Add `homeKeys.dashboard()` and replace `useHomeSummaryQuery` with `useHomeDashboardQuery(user)`. Hooks must always be called in a fixed order; only their `enabled` option varies:

```js
const canReadProduction = hasAnyPermission(user, productionPermissions)
const production = useProductionSummaryQuery({}, { enabled: canReadProduction })
```

Use the same pattern for Orders, Design, Vendor Submissions, and Shipments. Build `summaries` only from successful queries, build `failures` only from enabled queries with `isError`, and pass both into `buildDashboardView`. `isPending` is true only while at least one enabled query has no settled result. `refetch` invokes `refetch()` only for enabled queries.

- [ ] **Step 4: Verify and commit**

```powershell
node --test src\features\home\api\home.queries.test.js src\features\home\utils\dashboardView.test.js
git add src\features\home\api
git commit -m "feat(home): load summaries by permission"
```

Expected: Home no longer requests the reporting overview endpoint.

### Task 4: Render the Operations Dashboard Without a New UI System

**Files:**

- Create: `src/features/home/components/DashboardQueueTable.jsx`
- Create: `src/features/home/components/DashboardManagementLinks.jsx`
- Modify: `src/features/home/pages/HomePage.jsx`
- Modify: `src/i18n/locales/en/common.json`
- Modify: `src/i18n/locales/vi/common.json`
- Modify: `src/i18n/locales/i18nParity.test.js`

**Interfaces:**

- `DashboardQueueTable({ queues, attention, loading, onRefresh })` consumes the projection from Task 2.
- `DashboardManagementLinks({ links })` renders only already-authorized route links.
- `HomePage` reads `currentUser` from `useAuthStore` and calls `useHomeDashboardQuery(resolveCurrentUser(currentUser))`.

- [ ] **Step 1: Add composition and locale parity tests**

Create `src/features/home/pages/homePageComposition.test.js` that checks Home uses `OperationsPageShell`, `OperationsHeader`, `DashboardQueueTable`, `DashboardManagementLinks`, and `useHomeDashboardQuery`. Add the required English/Vietnamese `home.dashboard.*` keys and update the parity expectation.

- [ ] **Step 2: Run tests and confirm failure**

```powershell
node --test src\features\home\pages\homePageComposition.test.js src\i18n\locales\i18nParity.test.js
```

Expected: FAIL because Home still renders generic cards and old summary query.

- [ ] **Step 3: Build only Home-specific UI**

Use these existing primitives:

```jsx
<OperationsPageShell header={<OperationsHeader title={t('home.dashboard.title')} />}>
  <DashboardQueueTable queues={data.queues} attention={data.attention} loading={isPending} />
  <DashboardManagementLinks links={data.managementLinks} />
</OperationsPageShell>
```

`DashboardQueueTable` uses `OperationsTable` on desktop with Queue, Count, Priority, Description, and Action columns. It renders a compact stacked list under the existing responsive breakpoint on mobile. Use `StatusBadge` for priority and route `href` through React Router `Link`; do not add cards-within-cards, charts, or a universal KPI component.

Render query failures as a compact retryable `Alert` that names unavailable queue data, while successful queue rows remain visible. Render a single empty state when there are no visible queues.

- [ ] **Step 4: Verify and commit**

```powershell
node --test src\features\home\pages\homePageComposition.test.js src\features\home\api\home.queries.test.js src\features\home\utils\dashboardView.test.js src\i18n\locales\i18nParity.test.js
npm run lint
git add src\features\home src\i18n\locales
git commit -m "feat(home): render permission-aware work queues"
```

Expected: tests and lint PASS.

### Task 5: Accept Dashboard Deep Links in Existing Workbenches

**Files:**

- Modify: `src/features/scale/utils/scaleApi.js`
- Modify: `src/features/scale/utils/scaleApi.test.js`
- Modify: `src/features/scale/pages/ScalePage.jsx`
- Modify: `src/features/qc/utils/qcApi.js`
- Modify: `src/features/qc/utils/qcApi.test.js`
- Modify: `src/features/qc/pages/QcPage.jsx`
- Modify: `src/features/vendor-submissions/utils/vendorSubmissionsApi.js`
- Modify: `src/features/vendor-submissions/utils/vendorSubmissionsApi.test.js`
- Modify: `src/features/vendor-submissions/pages/VendorSubmissionsPage.jsx`
- Modify: `src/features/shipments/utils/shipmentsApi.js`
- Modify: `src/features/shipments/utils/shipmentsApi.test.js`
- Modify: `src/features/shipments/pages/ShippingPage.jsx`

**Interfaces:**

- `readScaleDashboardSearch(search)` returns only valid `{ statusTab, salesChannelCode }` values.
- `readQcDashboardSearch(search)` returns only valid `{ statusTab, platform }` values.
- `readVendorSubmissionDashboardSearch(search)` and `readShipmentDashboardSearch(search)` return a valid status or their existing `ALL` default.
- Each page reads search parameters once during initial state setup; all later filtering remains owned by the page's current state handlers.

- [ ] **Step 1: Add failing parser tests**

For each utility, test a supported dashboard URL and invalid input:

```js
assert.deepEqual(readScaleDashboardSearch('?status=needScale&channel=etsy'), {
  statusTab: SCALE_STATUS_TABS.NEED_SCALE,
  salesChannelCode: SCALE_CHANNELS.ETSY,
})
assert.deepEqual(readScaleDashboardSearch('?status=unknown'), {})
```

Repeat with QC `?status=pending&channel=amazon`, vendor `?status=READY`, and shipping `?status=TRACKING_PENDING`.

- [ ] **Step 2: Run focused parser tests and confirm failure**

```powershell
node --test src\features\scale\utils\scaleApi.test.js src\features\qc\utils\qcApi.test.js src\features\vendor-submissions\utils\vendorSubmissionsApi.test.js src\features\shipments\utils\shipmentsApi.test.js
```

Expected: FAIL because the parsers do not exist.

- [ ] **Step 3: Add minimal initialization-only parsing**

Implement each parser with `URLSearchParams` and existing constants. In each page, use `useLocation()` and initialize state from the parser:

```js
const location = useLocation()
const dashboardSearch = useMemo(() => readScaleDashboardSearch(location.search), [location.search])
const [statusTab, setStatusTab] = useState(() => dashboardSearch.statusTab || SCALE_STATUS_TABS.ALL)
```

Apply the same pattern to initial channel/platform/status only. Do not synchronize every local filter back to the URL and do not introduce a shared URL-state hook.

- [ ] **Step 4: Verify deep links and commit**

```powershell
node --test src\features\scale\utils\scaleApi.test.js src\features\qc\utils\qcApi.test.js src\features\vendor-submissions\utils\vendorSubmissionsApi.test.js src\features\shipments\utils\shipmentsApi.test.js
npm run lint
git add src\features\scale src\features\qc src\features\vendor-submissions src\features\shipments
git commit -m "feat(portal): support dashboard queue links"
```

Expected: focused tests and lint PASS; direct dashboard links open the intended filter.

### Task 6: Full Regression Verification and PR Preparation

**Files:**

- No source changes expected.

- [ ] **Step 1: Inspect final change scope**

```powershell
git status --short --branch
git diff develop...HEAD --stat
git diff develop...HEAD --check
```

Expected: only the Home feature, summary hooks, URL parsing, translations, and their tests are changed.

- [ ] **Step 2: Run full FE verification**

```powershell
node --test
npm run lint
npm run build
```

Expected: all tests pass; build may retain the known Vite chunk-size warning only.

- [ ] **Step 3: Perform manual permission smoke checks**

Use accounts whose effective permissions represent Orders, Design, QC, Fulfillment, Admin (`MANAGE_SYSTEM`), and no supported queue permission. Confirm:

```text
Each account sees only allowed rows.
Each action opens the expected existing route and filter.
A single failed module query leaves unrelated rows visible.
No staff dashboard request targets /api/reports/operations/overview.
```

## Plan Self-Review

- Spec coverage: Tasks 1-3 implement conditional, permission-scoped summary data; Task 4 implements the shared admin/staff UI; Task 5 provides the required deep links; Task 6 validates permission, partial-error, responsive, and regression behavior.
- Placeholder scan: no new endpoint, role dashboard, generic component framework, or undefined follow-up is required.
- Type consistency: `buildDashboardView` is the only view-model boundary; `useHomeDashboardQuery` exposes its result; `DashboardQueueTable` and `DashboardManagementLinks` consume only that result.
