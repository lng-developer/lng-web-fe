# UI, UX, and Performance Modernization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the LNG portal feel like one deliberate operational product while reducing the FE and BE work that currently makes route changes, large tables, and dashboard reads feel slow.

**Architecture:** Keep business behavior in feature modules. FE work extends the existing `src/components/operations/` primitives and module-owned mappers; BE work keeps report reads behind module public ports and adds indexes or response shaping only when profiling proves the need. Each phase is independently deployable and has a visible operator outcome.

**Tech Stack:** React 19, Vite, MUI 9, Tailwind 4, TanStack Query 5, Zustand 5, Express 5, Mongoose 9, Jest, node:test.

## Global Constraints

- Keep the existing FE feature/API/query-key pattern from `C:\Users\stack\Task\lng-web-fe\CONVENTIONS.md`.
- Use `apiClient` and `ENDPOINTS`; do not call raw URLs from pages.
- Keep permission checks based on backend permissions/scopes, never role names.
- Use existing MUI, Tailwind, native SVG, and browser tooling; do not add a chart, table, or animation dependency.
- Preserve minor-unit money values in BE and format only at the FE display boundary.
- Use a shared UI primitive only after it is needed by at least two module screens.
- Do not add caching or indexes without measuring the relevant request/query first.

---

## File Map

### Frontend

- `src/components/operations/OperationsPageShell.jsx`: fixed header/content/pagination behavior.
- `src/components/operations/OperationsHeader.jsx`: page title, filter/action layout.
- `src/components/operations/OperationsTabs.jsx`, `OperationsToolbar.jsx`, `OperationsTable.jsx`, `OperationsPagination.jsx`: shared operational navigation and table surfaces.
- `src/features/home/pages/HomePage.jsx`: admin commercial dashboard.
- `src/features/orders/pages/OrdersPage.jsx`, `src/features/listings/pages/ListingPage.jsx`, `src/features/design-tasks/pages/DesignTasksPage.jsx`: highest-use operational screens to migrate.
- `src/features/home/api/home.queries.js`, `src/features/orders/api/orders.queries.js`, `src/features/listings/api/listings.queries.js`, `src/features/design-tasks/api/designTasks.queries.js`: module-owned reads.
- `src/theme/palette.js`, `src/styles/tailwind.css`: only the paired theme/token source if token drift is found.

### Backend

- `src/modules/report/services/report.service.js`, `controllers/report.controller.js`, `dtos/report.dto.js`, `routes/index.js`: permission-scoped report reads.
- `src/modules/finance/repositories/financeSnapshot.repository.js`: finance/report aggregation pipelines.
- `src/modules/order/repositories/order.repository.js`: order/buyer aggregate pipelines.
- `src/modules/finance/models/financeSnapshot.model.js`, `src/modules/finance/models/adsSpendDaily.model.js`, `src/modules/order/models/order.model.js`: indexes only after `explain('executionStats')` proves a missing index.
- `src/test/report/services/report.service.test.js`, `src/test/report/routes/index.test.js`, `src/scripts/seedAnalyticsDemo.test.js`: contract, aggregate, and seed safety checks.

## Phase 0: Establish Baseline and Decision Metrics

### Task 1: Capture real UI and request baselines

**Files:**

- Create: `C:\Users\stack\Task\lng-web-fe\docs\performance\2026-07-20-baseline.md`
- Modify: none

**Interfaces:**

- Consumes: live local routes and browser network timings.
- Produces: a short baseline table that later phases must compare against.

- [ ] **Step 1: Record the five representative user journeys**

Record cold and warm timings for:

```text
/                    dashboard load and range/channel change
/portal/orders       channel tab change and order expansion
/portal/listings     search, filter, and page change
/portal/design/tasks page/type/status change
/portal/fulfillment/scale queue change
```

- [ ] **Step 2: Record API and render evidence separately**

Use browser network timing and document each request as:

```markdown
| Journey | API p95 | Visible UI ready | Extra requests | Observation |
| ------- | ------: | ---------------: | -------------: | ----------- |
```

Do not call a backend query slow when the API timing is fast and the UI render is late.

- [ ] **Step 3: Verify the document is actionable**

Every row must name the route, user action, current timing, and intended target. No source changes are allowed in this task.

### Task 2: Explain the three highest-cost BE reads

**Files:**

- Create: `C:\Users\stack\Task\lng-web-be\docs\performance\2026-07-20-report-query-baseline.md`
- Modify: none

**Interfaces:**

- Consumes: production-shaped Mongo data and report/order query filters.
- Produces: query execution evidence before adding any index or cache.

- [ ] **Step 1: Run `explain('executionStats')` for report, workbench, and listing reads**

Capture `totalKeysExamined`, `totalDocsExamined`, `executionTimeMillis`, and winning index for the actual query shapes used by FE.

- [ ] **Step 2: Classify each cost**

Use only one of these outcomes per query:

```text
INDEX_MISSING       -> add one compound index matching equality fields then sort
PAYLOAD_TOO_LARGE   -> remove fields from the list DTO, preserve detail endpoint
N_PLUS_ONE          -> combine repository lookup or batch lookup behind a public port
ACCEPTABLE          -> do not change code
```

- [ ] **Step 3: Verify no speculative optimization enters the next phase**

The document must contain an evidence link or copied `executionStats` result for every proposed BE change.

## Phase 1: Make Shared Operational UI Truly Shared

### Task 3: Define the shared operational visual contract

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\OperationsPageShell.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\OperationsHeader.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\OperationsTabs.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\OperationsTable.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\StatusBadge.jsx`
- Test: existing `src/components/operations/*.test.js` when present; otherwise add `src/components/operations/operationsComposition.test.js`

**Interfaces:**

- Consumes: page-provided content, tab data, columns, and actions.
- Produces: one fixed header region, one scroll region, aligned table headers, consistent active/hover/focus states, and semantic status tones.

- [ ] **Step 1: Add a failing source-composition test**

```js
assert.match(shellSource, /overflow-hidden/)
assert.match(shellSource, /min-h-0 flex-1/)
assert.match(tableSource, /sticky/)
assert.match(tabsSource, /aria-current|aria-selected/)
```

- [ ] **Step 2: Implement only the shared behavior needed by Design, Listings, and Orders**

The contract is:

```jsx
<OperationsPageShell header={header} tabs={tabs} toolbar={toolbar} pagination={pagination}>
  <OperationsTable columns={columns} rows={rows} />
</OperationsPageShell>
```

`OperationsPageShell` owns viewport structure. `OperationsTable` owns horizontal scroll and sticky header. Feature pages own query state and business row rendering.

- [ ] **Step 3: Verify keyboard and small-screen behavior**

At 1280px and 390px verify: controls remain reachable, only table content scrolls horizontally, and focus styling remains visible.

### Task 4: Migrate the high-use screens without changing workflow logic

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\orders\pages\OrdersPage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\listings\pages\ListingPage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\design-tasks\pages\DesignTasksPage.jsx`
- Test: `src/features/orders/utils/ordersPageComposition.test.js`
- Test: `src/features/listings/pages/listingPageComposition.test.js`
- Test: `src/features/design-tasks/utils/designTasksPageComposition.test.js`

**Interfaces:**

- Consumes: the shared contract from Task 3.
- Produces: consistent header/filter/table/pagination layout while preserving feature API calls and route query params.

- [ ] **Step 1: Add one failing assertion per page**

```js
assert.match(source, /OperationsTable/)
assert.match(source, /OperationsToolbar/)
assert.doesNotMatch(source, /overflow-y-auto.*table/)
```

- [ ] **Step 2: Replace only page-owned duplicate layout wrappers**

Keep order cards, listing-specific status/action controls, and design action dialogs inside the feature. Do not create generic workflow/modals.

- [ ] **Step 3: Verify route state and scrolling**

For each route, refresh on a non-default tab/filter/page and confirm state persists; scroll records and confirm headers and filters stay fixed.

## Phase 2: Design User Journeys, Not API Screens

### Task 5: Document admin and staff decision paths

**Files:**

- Create: `C:\Users\stack\Task\lng-web-fe\docs\ux\operator-journeys.md`
- Modify: none

**Interfaces:**

- Consumes: current backend permission/scopes and workflow statuses.
- Produces: a compact decision map used by modules before UI changes.

- [ ] **Step 1: Write one table per role context**

```markdown
| User context | Starts at         | Reads                       | Decides             | Writes                   | Completion signal    |
| ------------ | ----------------- | --------------------------- | ------------------- | ------------------------ | -------------------- |
| Admin        | Dashboard         | exceptions, financial trend | prioritize queue    | assignment/status/action | queue count changes  |
| CS staff     | Orders            | address/customization/case  | resolve or escalate | address/case/comment     | item can advance     |
| Designer     | Design tasks      | brief/assets/submission     | create/revise asset | submit asset             | review status        |
| Ops staff    | Scale/QC/Shipping | readiness/vendor/tracking   | process handoff     | task/submission/tracking | next workflow status |
```

- [ ] **Step 2: List fields by operator meaning**

Each field must be categorized as `primary decision`, `supporting context`, or `debug-only`. Raw IDs can only appear in debug-only content.

- [ ] **Step 3: Verify permissions remain backend-derived**

Every action path references a backend permission, not `ADMIN`, `STAFF`, or a frontend role-name branch.

### Task 6: Rework dashboard hierarchy around decisions

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\HomePage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\components\*.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\en\common.json`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\i18n\locales\vi\common.json`
- Test: `C:\Users\stack\Task\lng-web-fe\src\features\home\pages\homePageComposition.test.js`

**Interfaces:**

- Consumes: `useHomeDashboardQuery(user, query)` and its report-safe aggregates.
- Produces: an admin dashboard that answers what changed, what needs attention, where profit comes from, and which queue needs action.

- [ ] **Step 1: Add failing page composition checks**

```js
assert.match(source, /ExceptionLink/)
assert.match(source, /AcquisitionTable/)
assert.match(source, /DailyProfitChart/)
assert.match(source, /ChannelProfitChart/)
```

- [ ] **Step 2: Keep the page order fixed**

```text
Header filters/actions
Decision bar: actionable exceptions
KPI strip: sales, profit, margin, items, buyer health
Acquisition efficiency + funnel
Weekly trend + channel mix
Buyer, vendor, operations context
Profit-by-channel ranking + profit bridge
```

- [ ] **Step 3: Apply the visual direction without copying the reference**

Use the existing surface, border, text, and status tokens. Use compact cards only to group real decision units; give tables/metrics stable spacing and use accent colors only for status or data series.

- [ ] **Step 4: Verify no dashboard request changed**

Use browser network inspection to confirm that range/channel changes call only existing report endpoints once each and do not trigger `/me` or unrelated workbench queries.

### Task 7: Standardize readable create/edit/action interactions

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\mapping\pages\MappingPage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\listings\pages\ListingPage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\design-tasks\pages\DesignTasksPage.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\orders\pages\OrdersPage.jsx`

**Interfaces:**

- Consumes: module read queries for labels/options and module mutation hooks for writes.
- Produces: focused action dialogs/forms that require user-readable fields, not raw IDs or JSON.

- [ ] **Step 1: Add source tests forbidding generic JSON input in operator routes**

```js
assert.doesNotMatch(mappingPage, /JSON\.parse|raw JSON|Object\.keys\(blankRule\)/)
```

- [ ] **Step 2: Keep one dialog per action intent**

Examples: Assign designer, submit asset, reject submission, select vendor, update tracking. Do not use one expanding detail panel as an all-actions form.

- [ ] **Step 3: Verify each mutation has one success signal and invalidates the nearest query key**

Use the existing mutation pattern. Disable destructive actions until required inputs exist and require confirmation for cancel/reject/failed status.

## Phase 3: Remove Measured FE and BE Bottlenecks

### Task 8: Remove redundant FE query and render work

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\home\api\home.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\orders\api\orders.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\listings\api\listings.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\features\design-tasks\api\designTasks.queries.js`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\lib\queryClient.js` only if baseline proves defaults are wrong.
- Test: affected `*.test.js`

**Interfaces:**

- Consumes: Phase 0 timings and existing TanStack Query keys.
- Produces: stable query keys, debounced free-text input, preserved prior rows during paging, and no duplicate tab-change fetches.

- [ ] **Step 1: Add a failing Listings search query-composition test**

```js
assert.match(source, /useDebounce/)
assert.match(source, /keepPreviousData/)
assert.doesNotMatch(source, /queryFn:.*searchTerm/)
```

- [ ] **Step 2: Make the smallest source fix**

Use existing `keepPreviousData`, `useDebounce`, `useMemo`, stable query objects, and URL query state. Do not introduce a custom cache abstraction.

- [ ] **Step 3: Verify warm tab switches**

Repeat the same browser action three times. The first may fetch; subsequent unchanged tab visits must reuse cached data until its existing stale time expires.

### Task 9: Turn measured BE bottlenecks into a scoped follow-up plan

**Files:**

- Create: `C:\Users\stack\Task\lng-web-be\docs\superpowers\plans\2026-07-20-measured-query-fixes.md`
- Modify: none in this roadmap task.
- Test: `C:\Users\stack\Task\lng-web-be\src\test\report\services\report.service.test.js` and `src\test\report\routes\index.test.js` after the follow-up plan is implemented.

**Interfaces:**

- Consumes: Phase 0 `executionStats` and the existing public-port architecture.
- Produces: one evidence-backed, repository-specific implementation plan with an identical scoped DTO contract.

- [ ] **Step 1: Select one query from the Phase 0 evidence**

```js
Select only a query classified as `INDEX_MISSING`, `PAYLOAD_TOO_LARGE`, or `N_PLUS_ONE`. If all three queries are `ACCEPTABLE`, record that result and do not create a code task.
```

- [ ] **Step 2: Write the exact repository/model/test path and result contract**

The follow-up plan must include the measured filter, sort, current winning plan, expected DTO, failing test command, and one permitted optimization: targeted compound index, list projection, or batched repository lookup.

- [ ] **Step 3: Require a before/after explain check in the follow-up plan**

The later implementation retains its change only when documents examined decrease or a projection removes list payload that the UI demonstrably does not render.

## Phase 4: Reliability, Accessibility, and Release

### Task 10: Harden loading, error, empty, and dev-server states

**Files:**

- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\common\ErrorBoundary.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\components\operations\OperationsTable.jsx`
- Modify: `C:\Users\stack\Task\lng-web-fe\src\routes\index.jsx` only if lazy-route fallback lacks recovery.
- Test: nearest existing component/page composition tests.

**Interfaces:**

- Consumes: route/module loading failures and TanStack Query state.
- Produces: an actionable route failure message, a retry/reload path, and descriptive empty states that retain table headers.

- [ ] **Step 1: Reproduce a stopped Vite dev-server origin or failed lazy module**

Document whether the failure is an unreachable dev origin, a Vite transform error, or a real React render error before changing the boundary.

- [ ] **Step 2: Add recovery only for a real client-side recoverable failure**

Keep Vite-origin errors actionable: show the active local URL and a reload action. Do not mask a source-module transform failure as a generic data empty state.

- [ ] **Step 3: Verify keyboard, contrast, and empty-table behavior**

At desktop and mobile widths, tab through filters/actions; ensure errors explain their next action and empty operational tables retain their column header context.

### Task 11: Full verification and rollout

**Files:**

- Modify: module tests/documents created above only.

- [ ] **Step 1: Run frontend verification**

```powershell
Set-Location C:\Users\stack\Task\lng-web-fe
npm run lint
npm run build
node --test src\services\endpoints.contract.test.js src\features\home\utils\commercialDashboard.test.js
```

Expected: exit code `0`.

- [ ] **Step 2: Run backend verification**

```powershell
Set-Location C:\Users\stack\Task\lng-web-be
npx jest src/test/report --runInBand
npx jest src/scripts/seedAnalyticsDemo.test.js --runInBand
```

Expected: exit code `0`.

- [ ] **Step 3: Verify user journeys**

```text
Admin: dashboard -> exception queue -> resolve action -> count refresh
CS: order address/customization -> valid next status -> excluded/included in fulfilment correctly
Designer: task -> assign/start/submit -> approve/reject state transition
Ops: scale/QC/shipping -> vendor/tracking state becomes visible
```

- [ ] **Step 4: Compare with the baseline**

Update both Phase 0 documents with before/after timing. Ship only improvements that preserve scope, response shape, permissions, and workflow gates.

## Recommended Delivery Order

1. Phase 0 baseline
2. Phase 1 shared shell/table migration
3. Phase 2 dashboard and action-dialog UX
4. Phase 3 measured optimizations
5. Phase 4 reliability and release

This order avoids styling screens that will immediately change after shared layout work, and prevents premature BE optimization before the FE has evidence for where latency actually comes from.
