# Orders Targeted Evolution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the Orders screen into focused feature components and fix only measured consistency, accessibility, responsive, or performance defects while preserving its current UI, workflow, API contracts, URL state, and RBAC behavior.

**Architecture:** Keep `OrdersPage.jsx` as the orchestration boundary for URL-derived state and TanStack Query data. Move controls, table behavior, expanded details, and dialogs into feature-owned components that depend only on existing feature APIs, utilities, and shared operations/common components. Preserve the rendered structure and validate every extraction against the current screen and request baseline.

**Tech Stack:** React 19, Vite 8, MUI 9, TanStack Query 5, React Router 7, node:test, ESLint 9, Prettier 3

## Global Constraints

- Preserve the visible layout and existing operator workflow unless a concrete UX defect justifies a change.
- Preserve backend endpoints, DTOs, mappers, query semantics, route state, and permission gates.
- Reuse MUI, TanStack Query, the current theme, and existing shared components.
- Do not add frontend dependencies.
- Create a shared abstraction only when at least two real consumers need it.
- Keep server state in TanStack Query and transient form state inside the owning dialog or component.
- Validate every visible change against desktop and mobile baseline captures.
- Do not stage or commit the existing unrelated `.gitignore`, `package-lock.json`, or `.superpowers/` changes.

---

## File Map

- Create `docs/performance/2026-07-22-orders-baseline.md`: before/after UI, request, test, build, and bundle evidence.
- Modify `src/features/orders/pages/OrdersPage.jsx`: retain URL/query orchestration and page composition only.
- Create `src/features/orders/components/OrdersControls.jsx`: tabs, filter toolbar, selectors, and import trigger.
- Create `src/features/orders/components/OrdersTable.jsx`: table composition, row cells, timeline, and row actions.
- Create `src/features/orders/components/OrderExpandedDetail.jsx`: product, customization, fulfillment, vendor matching, and notes.
- Create `src/features/orders/components/OrderDialogs.jsx`: import, customer, shipping, and case dialogs plus their private form helpers.
- Modify `src/features/orders/utils/ordersFilters.js`: own URL-backed Orders filter parsing and serialization.
- Modify `src/features/orders/utils/ordersFilters.test.js`: behavior tests for URL parsing and serialization.
- Modify `src/features/orders/utils/ordersPageComposition.test.js`: point existing composition protections at the new owners and verify page boundaries.
- Modify `src/features/orders/components/orderUiComponents.test.js`: retain pure display-helper coverage.
- Use existing `src/features/orders/components/orderWorkbenchColumns.js` unchanged unless baseline evidence identifies a real table defect.

### Task 1: Capture the Orders Baseline

**Files:**

- Create: `docs/performance/2026-07-22-orders-baseline.md`
- Modify: none

**Interfaces:**

- Consumes: current `/portal/orders` route, browser network panel, `dist/assets/OrdersPage-*.js`, lint, and node:test output.
- Produces: one evidence document used by Task 7 to accept or reject visible and performance changes.

- [ ] **Step 1: Verify the active branch and preserve unrelated work**

Run:

```powershell
git branch --show-current
git status --short
```

Expected: branch `refactor/orders-targeted-evolution`; `.gitignore`, `package-lock.json`, and `.superpowers/` may remain dirty but must not be staged.

- [ ] **Step 2: Record automated baseline output**

Run:

```powershell
npx eslint src vite.config.js eslint.config.js
node --test "src/**/*.test.js"
npm run build
Get-ChildItem dist\assets -Filter 'OrdersPage-*.js' | Select-Object Name,Length
```

Expected current state: source lint exits `0`; production build exits `0`; the full suite reports the known API-coverage failure separately if `backendEndpoints.test.js` still lacks the four report routes. Do not classify that unrelated failure as an Orders regression.

- [ ] **Step 3: Capture the current operator journeys**

Run the app with the existing local environment:

```powershell
npm run dev -- --host 127.0.0.1
```

In the browser, capture desktop `1440x900` and mobile `390x844` screenshots for `/portal/orders`, then record requests for these exact journeys:

```text
Initial load
Change channel tab
Change seller filter
Change page
Expand one order row
Open and close customer dialog without saving
```

Expected: no mutation occurs during baseline capture; each journey has a screenshot or request-count entry.

- [ ] **Step 4: Write the evidence document**

Create `docs/performance/2026-07-22-orders-baseline.md`. Write only observed values; do not commit empty cells or labels that stand in for measurements. The document must contain:

```text
Title: Orders Targeted Evolution Baseline
Automated checks table: source lint; Node tests; production build; Orders chunk
Operator journeys table: the six journeys from Step 3, request count, and observation
Visual captures list: desktop screenshot path and mobile screenshot path
```

Every automated-check row contains the actual exit code plus count, duration, or bundle size. Every journey row contains the actual request count and observed behavior. The two visual entries contain saved screenshot paths.

- [ ] **Step 5: Commit the baseline only**

```powershell
git add -- docs/performance/2026-07-22-orders-baseline.md
git diff --cached --check
git commit -m "docs(order): record Orders refactor baseline"
```

Expected: commit contains only the baseline document.

### Task 2: Move URL State Into `ordersFilters.js`

**Files:**

- Modify: `src/features/orders/utils/ordersFilters.js`
- Modify: `src/features/orders/utils/ordersFilters.test.js`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**

- Consumes: `orderTabs`, the configured `dayjs` instance, a search string, and an optional pathname.
- Produces: `getOrdersChannel(search)`, `getOrdersTab(search)`, `readOrdersFilters(search)`, and `buildOrdersUrl(search, pathname, updates)`.

- [ ] **Step 1: Add failing behavior tests for Orders URL state**

Append to `src/features/orders/utils/ordersFilters.test.js`:

```js
import dayjs from '@/lib/dayjs'

import {
  buildOrdersUrl,
  getOrdersChannel,
  getOrdersTab,
  readOrdersFilters,
} from './ordersFilters.js'

test('readOrdersFilters restores supported URL state and caps the page size', () => {
  const filters = readOrdersFilters(
    '?channel=amazon&search=mug&shopId=shop-1&seller=Lan&page=3&limit=500&dateFrom=2026-07-01&dateTo=2026-07-22',
  )

  assert.equal(getOrdersChannel('?channel=amazon'), 'amazon')
  assert.equal(getOrdersTab('?tab=openCase'), 'openCase')
  assert.equal(filters.search, 'mug')
  assert.equal(filters.channel, 'amazon')
  assert.equal(filters.shopId, 'shop-1')
  assert.equal(filters.seller, 'Lan')
  assert.equal(
    filters.dateRange.start.format('YYYY-MM-DD'),
    dayjs('2026-07-01').format('YYYY-MM-DD'),
  )
  assert.equal(filters.dateRange.end.format('YYYY-MM-DD'), dayjs('2026-07-22').format('YYYY-MM-DD'))
  assert.equal(filters.page, 3)
  assert.equal(filters.limit, 100)
})

test('buildOrdersUrl preserves unrelated params and removes default Orders values', () => {
  assert.equal(
    buildOrdersUrl('?debug=1&tab=exceptions&page=3', '/portal/orders', {
      tab: 'all',
      page: 1,
      limit: 10,
      channel: 'all',
      search: ' mug ',
    }),
    '/portal/orders?debug=1&search=mug',
  )
})
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run:

```powershell
node --test src/features/orders/utils/ordersFilters.test.js
```

Expected: FAIL because the four URL helpers are not exported.

- [ ] **Step 3: Implement the URL helpers in `ordersFilters.js`**

Add these imports and exports while retaining `buildSellerOptions` and `buildOrderFilterChips`:

```js
import { orderTabs } from '@/features/orders/data/ordersData'
import dayjs from '@/lib/dayjs'

export function getOrdersChannel(search = '') {
  const channel = new URLSearchParams(search).get('channel')
  return channel === 'amazon' || channel === 'etsy' ? channel : null
}

export function getOrdersTab(search = '') {
  const tab = new URLSearchParams(search).get('tab')
  return orderTabs.some((item) => item.key === tab) ? tab : 'all'
}

export function readOrdersFilters(search = '') {
  const params = new URLSearchParams(search)
  const getPositiveInteger = (key, fallback) => Math.max(Number(params.get(key)) || fallback, 1)
  const getDate = (key) => {
    const value = params.get(key)
    const date = value ? dayjs(value) : null
    return date?.isValid?.() ? date : null
  }

  return {
    search: params.get('search') || '',
    channel: getOrdersChannel(search) || 'all',
    shopId: params.get('shopId') || 'all',
    seller: params.get('seller') || 'all',
    dateRange: { start: getDate('dateFrom'), end: getDate('dateTo') },
    page: getPositiveInteger('page', 1),
    limit: Math.min(getPositiveInteger('limit', 10), 100),
  }
}

export function buildOrdersUrl(search = '', pathname = '/portal/orders', updates = {}) {
  const params = new URLSearchParams(search)
  const setParam = (key, value, defaultValue = '') => {
    const normalized = String(value ?? '').trim()
    if (!normalized || normalized === defaultValue) params.delete(key)
    else params.set(key, normalized)
  }

  if (Object.hasOwn(updates, 'tab')) setParam('tab', updates.tab, 'all')
  if (Object.hasOwn(updates, 'page')) setParam('page', Math.max(Number(updates.page) || 1, 1), '1')
  if (Object.hasOwn(updates, 'limit')) {
    setParam('limit', Math.min(Math.max(Number(updates.limit) || 10, 1), 100), '10')
  }
  if (Object.hasOwn(updates, 'search')) setParam('search', updates.search)
  if (Object.hasOwn(updates, 'channel')) {
    if (updates.channel === 'amazon' || updates.channel === 'etsy')
      params.set('channel', updates.channel)
    else params.delete('channel')
  }
  if (Object.hasOwn(updates, 'shopId')) setParam('shopId', updates.shopId, 'all')
  if (Object.hasOwn(updates, 'seller')) setParam('seller', updates.seller, 'all')
  if (Object.hasOwn(updates, 'dateRange')) {
    setParam('dateFrom', updates.dateRange?.start?.format?.('YYYY-MM-DD') || '')
    setParam('dateTo', updates.dateRange?.end?.format?.('YYYY-MM-DD') || '')
  }

  const query = params.toString()
  return `${pathname}${query ? `?${query}` : ''}`
}
```

- [ ] **Step 4: Replace page-owned URL helpers with the utility interface**

In `OrdersPage.jsx`, delete `getChannelFromSearch`, `getOrderTabFromSearch`, `getPositiveIntegerParam`, `getDateParam`, `getInitialOrderFilters`, `setUrlParam`, `formatDateParam`, and `updateOrdersUrl`. Import the new functions and use this page-local adapter:

```js
import {
  buildOrdersUrl,
  buildSellerOptions,
  getOrdersChannel,
  getOrdersTab,
  readOrdersFilters,
} from '@/features/orders/utils/ordersFilters'

function replaceOrdersUrl(updates) {
  window.history.replaceState(
    null,
    '',
    buildOrdersUrl(window.location.search, window.location.pathname, updates),
  )
}
```

Replace page initialization with:

```js
const routeChannel = getOrdersChannel(location.search)
const initialTab = getOrdersTab(location.search)
const [filters, setFilters] = useState(() => readOrdersFilters(location.search))
```

Replace each `updateOrdersUrl(...)` call with `replaceOrdersUrl(...)`.

- [ ] **Step 5: Update the composition assertions to reference the new owner**

In `ordersPageComposition.test.js`, read `ordersFilters.js` and assert:

```js
const filtersSource = readFileSync(new URL('./ordersFilters.js', import.meta.url), 'utf8')

assert.equal(source.includes('readOrdersFilters(location.search)'), true)
assert.equal(source.includes('getOrdersTab(location.search)'), true)
assert.equal(filtersSource.includes('export function buildOrdersUrl'), true)
assert.equal(filtersSource.includes("Object.hasOwn(updates, 'dateRange')"), true)
```

- [ ] **Step 6: Run focused checks**

```powershell
node --test src/features/orders/utils/ordersFilters.test.js src/features/orders/utils/ordersPageComposition.test.js
npx eslint src/features/orders/utils/ordersFilters.js src/features/orders/utils/ordersFilters.test.js src/features/orders/pages/OrdersPage.jsx
```

Expected: all focused tests pass and ESLint exits `0`.

- [ ] **Step 7: Commit the URL boundary**

```powershell
git add -- src/features/orders/utils/ordersFilters.js src/features/orders/utils/ordersFilters.test.js src/features/orders/utils/ordersPageComposition.test.js src/features/orders/pages/OrdersPage.jsx
git diff --cached --check
git commit -m "refactor(order): extract Orders URL state"
```

### Task 3: Extract Orders Controls Without Visual Changes

**Files:**

- Create: `src/features/orders/components/OrdersControls.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**

- Consumes: `activeTab`, `filters`, `tabs`, `sellerOptions`, `shopOptions`, `onTabChange`, `onFiltersChange`, and `onRefresh`.
- Produces: named exports `OrdersTabs`, `OrdersToolbar`, and default export `OrdersControls` only if a combined wrapper is actually used by the page.

- [ ] **Step 1: Add failing ownership assertions**

Add a helper and test to `ordersPageComposition.test.js`:

```js
function readOrdersControlsSource() {
  const url = new URL('../components/OrdersControls.jsx', import.meta.url)
  assert.equal(existsSync(url), true)
  return readFileSync(url, 'utf8')
}

test('Orders controls own tabs and toolbar without owning server queries', () => {
  const pageSource = readOrdersPageSource()
  const controlsSource = readOrdersControlsSource()

  assert.equal(pageSource.includes("from '@/features/orders/components/OrdersControls'"), true)
  assert.equal(pageSource.includes('function OrderTabs'), false)
  assert.equal(pageSource.includes('function FilterBar'), false)
  assert.equal(controlsSource.includes('export function OrdersTabs'), true)
  assert.equal(controlsSource.includes('export function OrdersToolbar'), true)
  assert.equal(controlsSource.includes('useOrderWorkbenchQuery'), false)
  assert.equal(controlsSource.includes('useOrderSummaryQuery'), false)
})
```

- [ ] **Step 2: Run the test and verify it fails**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
```

Expected: FAIL because `OrdersControls.jsx` does not exist.

- [ ] **Step 3: Move the controls into their feature component**

Create `OrdersControls.jsx` by moving `getDisplayText`, `OrdersSelect`, `OrderTabs`, `ImportOrdersModal`, `FilterBar`, and `importSourceOptions` from the page without changing their JSX or styles. Rename and export `OrderTabs` as `OrdersTabs`; rename and export `FilterBar` as `OrdersToolbar`. Their prop lists remain `{ activeTab, onChange, tabs }` and `{ filters, onFiltersChange, onRefresh, sellerOptions, shopOptions }` respectively.

Keep `OrdersSelect`, `ImportOrdersModal`, `getDisplayText`, and `importSourceOptions` private to `OrdersControls.jsx`.

- [ ] **Step 4: Replace page-owned controls**

Import the extracted components:

```js
import { OrdersTabs, OrdersToolbar } from '@/features/orders/components/OrdersControls'
```

Use them in the page shell:

```jsx
<OperationsPageShell
  tabs={<OrdersTabs activeTab={activeTab} onChange={handleChangeTab} tabs={tabs} />}
  toolbar={
    <OrdersToolbar
      filters={effectiveFilters}
      onFiltersChange={handleFiltersChange}
      onRefresh={handleRefreshOrders}
      sellerOptions={sellerOptions}
      shopOptions={shopOptions}
    />
  }
  pagination={paginationElement}
>
  {tableElement}
</OperationsPageShell>
```

Do not create `paginationElement` or `tableElement` variables solely to match this example; keep the current inline composition.

- [ ] **Step 5: Run focused verification**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
npx eslint src/features/orders/components/OrdersControls.jsx src/features/orders/pages/OrdersPage.jsx
npm run build
```

Expected: focused tests pass, ESLint exits `0`, and the production build exits `0` with the same visual markup and route behavior.

- [ ] **Step 6: Commit the controls extraction**

```powershell
git add -- src/features/orders/components/OrdersControls.jsx src/features/orders/pages/OrdersPage.jsx src/features/orders/utils/ordersPageComposition.test.js
git diff --cached --check
git commit -m "refactor(order): extract Orders controls"
```

### Task 4: Extract the Orders Table and Row Actions

**Files:**

- Create: `src/features/orders/components/OrdersTable.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**

- Consumes: `{ loading, onRefresh, orders, pagination }` and existing query/mutation utilities used by row cells.
- Produces: default `OrdersTable` and no page imports.

- [ ] **Step 1: Add a failing table-boundary test**

Add to `ordersPageComposition.test.js`:

```js
test('OrdersTable owns row rendering and exposes one page-facing component', () => {
  const pageSource = readOrdersPageSource()
  const tableUrl = new URL('../components/OrdersTable.jsx', import.meta.url)
  assert.equal(existsSync(tableUrl), true)
  const tableSource = readFileSync(tableUrl, 'utf8')

  assert.equal(pageSource.includes("from '@/features/orders/components/OrdersTable'"), true)
  assert.equal(pageSource.includes('function renderOrderWorkbenchCell'), false)
  assert.equal(pageSource.includes('function CustomerCell'), false)
  assert.equal(tableSource.includes('export default'), true)
  assert.equal(tableSource.includes('<OperationsTable'), true)
  assert.equal(tableSource.includes('useOrderWorkbenchQuery'), false)
})
```

- [ ] **Step 2: Run the test and verify it fails**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
```

Expected: FAIL because `OrdersTable.jsx` does not exist.

- [ ] **Step 3: Move table-owned declarations verbatim**

Move these existing declarations from `OrdersPage.jsx` into `OrdersTable.jsx` without changing JSX, query enablement, memoization, labels, or style values:

```text
getDisplayText only if still needed by table-owned UI
OrderInfoPopover
alwaysExpanded
OrderTimelineButton
RowActionButton
addressStatusVisuals
getAddressStatusVisual
CustomerCell
OrderCaseAction
OrderOtherActions
ShippingTypeCell
DateCell
renderOrderWorkbenchCell
buildCustomerForm
buildShippingServiceForm
CustomerTextField
UpdateCustomerModal
UpdateShippingModal
OpenCaseModal
cleanManualMatchValue
formatManualVendorProduct
formatManualVendorProductMeta
getMappingRecheckFeedback
ProductImages
ProductInfo
CustomizationInfo
ReadOnlyValue
InlineVendorMatch
VendorMatchSummary
FulfillmentInfo
NotePanel
ExpandedOrderDetail
OrdersTable
```

Export only the page-facing component:

```jsx
const OrdersTable = memo(function OrdersTable({ loading, onRefresh, orders, pagination }) {
  const { t } = useTranslation()
  const columns = useMemo(
    () => orderWorkbenchColumns.map((column) => ({ ...column, label: t(column.labelKey) })),
    [t],
  )
  const getRowKey = useCallback((order) => order.apiId || order.id, [])
  const renderCell = useCallback(
    ({ column, row }) => renderOrderWorkbenchCell({ column, onRefresh, order: row, t }),
    [onRefresh, t],
  )
  const renderExpandedRow = useCallback(
    (order) => <ExpandedOrderDetail order={order} onRefresh={onRefresh} />,
    [onRefresh],
  )

  return (
    <OperationsTable
      columns={columns}
      rows={orders}
      getRowKey={getRowKey}
      renderCell={renderCell}
      getRowExpanded={alwaysExpanded}
      renderExpandedRow={renderExpandedRow}
      loading={loading}
      loadingRows={pagination?.limit || 10}
      minWidth={orderWorkbenchTableMinWidth}
      emptyTitle={t('orders.values.common.noData')}
    />
  )
})

export default OrdersTable
```

Keep all moved declarations private to `OrdersTable.jsx` at this checkpoint. Task 5 extracts the detail subtree and Task 6 extracts dialogs; this avoids a circular `OrdersTable -> OrdersPage -> OrdersTable` dependency.

- [ ] **Step 4: Import the extracted table in the page**

Add the table import:

```js
import OrdersTable from '@/features/orders/components/OrdersTable'
```

- [ ] **Step 5: Run focused checks**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js src/features/orders/components/orderUiComponents.test.js
npx eslint src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx
npm run build
```

Expected: tests pass, ESLint exits `0`, and build exits `0`. The route chunk may move between generated files, but request behavior must not change.

- [ ] **Step 6: Commit the table extraction**

```powershell
git add -- src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx src/features/orders/utils/ordersPageComposition.test.js
git diff --cached --check
git commit -m "refactor(order): extract Orders table"
```

### Task 5: Extract Expanded Order Details

**Files:**

- Create: `src/features/orders/components/OrderExpandedDetail.jsx`
- Modify: `src/features/orders/components/OrdersTable.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**

- Consumes: `{ onRefresh, order }`, existing vendor queries, mapping mutations, note mutations, and common display components.
- Produces: default `OrderExpandedDetail` with no page dependency.

- [ ] **Step 1: Add a failing detail-boundary test**

```js
test('OrderExpandedDetail owns item and fulfillment detail without importing the table or page', () => {
  const detailUrl = new URL('../components/OrderExpandedDetail.jsx', import.meta.url)
  assert.equal(existsSync(detailUrl), true)
  const detailSource = readFileSync(detailUrl, 'utf8')

  assert.equal(detailSource.includes('export default'), true)
  assert.equal(detailSource.includes('function ProductInfo'), true)
  assert.equal(detailSource.includes('function FulfillmentInfo'), true)
  assert.equal(detailSource.includes("from '@/features/orders/pages/OrdersPage'"), false)
  const tableSource = readFileSync(
    new URL('../components/OrdersTable.jsx', import.meta.url),
    'utf8',
  )
  assert.equal(tableSource.includes('function ExpandedOrderDetail'), false)
})
```

- [ ] **Step 2: Run the test and verify it fails**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
```

Expected: FAIL because `OrderExpandedDetail.jsx` does not exist and `OrdersTable.jsx` still owns the detail.

- [ ] **Step 3: Move detail-owned declarations verbatim**

Move these declarations from `OrdersTable.jsx` without changing form defaults, query enablement, mutation payloads, messages, layout, or memoization:

```text
cleanManualMatchValue
formatManualVendorProduct
formatManualVendorProductMeta
getMappingRecheckFeedback
ProductImages
ProductInfo
CustomizationInfo
ReadOnlyValue
InlineVendorMatch
VendorMatchSummary
FulfillmentInfo
NotePanel
ExpandedOrderDetail
```

Retain the complete current declaration body, rename the function and constant from `ExpandedOrderDetail` to `OrderExpandedDetail`, append `export default OrderExpandedDetail`, then delete the original table declaration in the same diff. No JSX inside the moved function changes in this task.

- [ ] **Step 4: Replace the temporary page dependency**

In `OrdersTable.jsx`:

```js
import OrderExpandedDetail from '@/features/orders/components/OrderExpandedDetail'
```

```jsx
const renderExpandedRow = useCallback(
  (order) => <OrderExpandedDetail order={order} onRefresh={onRefresh} />,
  [onRefresh],
)
```

Remove all moved declarations and their now-unused imports from `OrdersTable.jsx`.

- [ ] **Step 5: Run focused checks**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js src/features/orders/components/orderUiComponents.test.js src/features/orders/utils/ordersApi.test.js
npx eslint src/features/orders/components/OrderExpandedDetail.jsx src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx
npm run build
```

Expected: all focused tests pass, ESLint exits `0`, and build exits `0`.

- [ ] **Step 6: Commit the detail extraction**

```powershell
git add -- src/features/orders/components/OrderExpandedDetail.jsx src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx src/features/orders/utils/ordersPageComposition.test.js
git diff --cached --check
git commit -m "refactor(order): extract expanded order detail"
```

### Task 6: Consolidate Order Dialogs

**Files:**

- Create: `src/features/orders/components/OrderDialogs.jsx`
- Modify: `src/features/orders/components/OrdersControls.jsx`
- Modify: `src/features/orders/components/OrdersTable.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**

- Consumes: current dialog props, existing order mutations/queries, shop options, and `onClose` or `onCreated` callbacks.
- Produces: `ImportOrdersDialog`, `UpdateCustomerDialog`, `UpdateShippingDialog`, and `OpenCaseDialog`.

- [ ] **Step 1: Add a failing dialog-boundary test**

```js
test('OrderDialogs owns the four order workflows and keeps drafts local', () => {
  const dialogsUrl = new URL('../components/OrderDialogs.jsx', import.meta.url)
  assert.equal(existsSync(dialogsUrl), true)
  const dialogsSource = readFileSync(dialogsUrl, 'utf8')

  ;['ImportOrdersDialog', 'UpdateCustomerDialog', 'UpdateShippingDialog', 'OpenCaseDialog'].forEach(
    (name) => assert.equal(dialogsSource.includes(`export function ${name}`), true),
  )

  assert.equal(dialogsSource.includes('useOrderWorkbenchQuery'), false)
  assert.equal(readOrdersPageSource().includes('function UpdateCustomerModal'), false)
  assert.equal(readOrdersPageSource().includes('function UpdateShippingModal'), false)
  assert.equal(readOrdersPageSource().includes('function OpenCaseModal'), false)
})
```

- [ ] **Step 2: Run the test and verify it fails**

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js
```

Expected: FAIL because `OrderDialogs.jsx` does not exist.

- [ ] **Step 3: Move dialog implementations and private helpers**

Move the Import declarations from `OrdersControls.jsx` and the remaining customer, shipping, and case declarations from `OrdersTable.jsx` without changing their visible JSX, validation, payloads, error handling, or focus behavior provided by `AnimatedDialog`:

```text
importSourceOptions
shippingServiceLevelOptions
shippingServiceLevelNotes
customerFieldKeys
getDisplayText if the dialogs need it after Task 3
buildCustomerForm
buildShippingServiceForm
CustomerTextField
ImportOrdersModal -> export as ImportOrdersDialog
UpdateCustomerModal -> export as UpdateCustomerDialog
UpdateShippingModal -> export as UpdateShippingDialog
OpenCaseModal -> export as OpenCaseDialog
```

Use these exact public interfaces: `ImportOrdersDialog` receives `{ onClose, open, shopOptions }`; `UpdateCustomerDialog` and `UpdateShippingDialog` each receive `{ onClose, open, order }`; `OpenCaseDialog` receives `{ onClose, onCreated, open, order }`.

Keep form builders, constants, field components, and display helpers private.

- [ ] **Step 4: Update component consumers**

In `OrdersControls.jsx`:

```js
import { ImportOrdersDialog } from '@/features/orders/components/OrderDialogs'
```

In `OrdersTable.jsx`:

```js
import {
  OpenCaseDialog,
  UpdateCustomerDialog,
  UpdateShippingDialog,
} from '@/features/orders/components/OrderDialogs'
```

Rename JSX uses from `*Modal` to `*Dialog` without changing props. Remove all moved declarations and imports from `OrdersPage.jsx`.

- [ ] **Step 5: Verify dialog state and errors**

Run:

```powershell
node --test src/features/orders/utils/ordersPageComposition.test.js src/features/orders/components/orderUiComponents.test.js
npx eslint src/features/orders/components/OrderDialogs.jsx src/features/orders/components/OrdersControls.jsx src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx
npm run build
```

Then verify locally:

```text
Open and close each dialog with Escape.
Confirm focus returns to its trigger.
Type customer or shipping draft data, induce a rejected request, and confirm the dialog and draft remain open.
Close and reopen for another order and confirm stale draft data is not shown.
```

Expected: focused checks pass; no visible dialog or workflow change; failed mutations preserve the active draft.

- [ ] **Step 6: Commit the dialog boundary**

```powershell
git add -- src/features/orders/components/OrderDialogs.jsx src/features/orders/components/OrdersControls.jsx src/features/orders/components/OrdersTable.jsx src/features/orders/pages/OrdersPage.jsx src/features/orders/utils/ordersPageComposition.test.js
git diff --cached --check
git commit -m "refactor(order): extract order dialogs"
```

### Task 7: Audit for Evidence-Backed UX and Performance Follow-Ups

**Files:**

- Modify: `docs/performance/2026-07-22-orders-baseline.md`
- Modify: no source file in this task.

**Interfaces:**

- Consumes: before screenshots, request counts, keyboard walkthrough, and measured render/network evidence from Task 1.
- Produces: an explicit PASS result or a reproducible defect entry with owner file, reproduction, expected behavior, and verification command. Source fixes require a separately reviewable follow-up plan after the defect exists.

- [ ] **Step 1: Audit the extracted screen against the approved gates**

Check each item and record PASS or a reproducible defect in the baseline document:

```text
Desktop layout matches baseline.
Mobile controls wrap and remain reachable.
Only table content scrolls horizontally.
Keyboard focus is visible.
Icon-only actions have an accessible name and tooltip.
Empty results retain table headers.
Query errors expose a scoped retry.
Paging does not collapse table height.
Loading, tab, paging, and expansion request counts do not exceed baseline.
```

- [ ] **Step 2: Record each result without changing source**

Append a `Targeted UX audit` table to the baseline document with columns `Gate`, `Result`, `Evidence`, and `Owning file`. Add one row for each gate from Step 1. Every result is either `PASS` or a concrete defect statement; every evidence cell contains its screenshot, keyboard sequence, request comparison, or reproduction; every owner is an exact component path or `none`.

- [ ] **Step 3: Gate source changes**

If all rows pass, continue directly to Task 8. If a row contains a defect, stop implementation and write a narrow follow-up plan named from the observed behavior under `docs/superpowers/plans/`; its first task must reproduce the defect with a failing check. Do not infer a source fix inside this extraction plan.

- [ ] **Step 4: Commit audit evidence with the final report**

Do not create a separate commit here. Task 8 completes the After measurements and commits the evidence document once.

### Task 8: Final Verification and Before/After Report

**Files:**

- Modify: `docs/performance/2026-07-22-orders-baseline.md`
- Modify: none unless verification identifies a pilot regression.

**Interfaces:**

- Consumes: all prior commits and the Task 1 baseline.
- Produces: verified source, test, build, UI, request, and bundle evidence plus a clean scoped diff.

- [ ] **Step 1: Run Orders-focused tests**

```powershell
node --test src/features/orders/utils/ordersFilters.test.js src/features/orders/utils/ordersPageComposition.test.js src/features/orders/components/orderUiComponents.test.js src/features/orders/utils/ordersApi.test.js src/features/orders/api/orders.queries.test.js
```

Expected: all selected Orders tests pass with zero failures.

- [ ] **Step 2: Run repository verification**

```powershell
npx eslint src vite.config.js eslint.config.js
node --test "src/**/*.test.js"
npm run build
Get-ChildItem dist\assets -Filter 'OrdersPage-*.js' | Select-Object Name,Length
```

Expected: source lint and build exit `0`. The full suite must introduce no new failure; if the pre-existing API coverage failure remains, report it by exact test name and route list instead of claiming the suite is green.

- [ ] **Step 3: Repeat the six browser journeys**

Repeat the exact desktop/mobile screenshots and request-count actions from Task 1.

Expected:

```text
No unapproved visible redesign.
No extra request in any representative journey.
URL state restores after reload.
Dialogs retain their existing workflow and error behavior.
Keyboard and mobile checks pass.
```

- [ ] **Step 4: Complete the After columns**

Update `docs/performance/2026-07-22-orders-baseline.md` with actual after values, screenshot paths, accepted changes, rejected speculative changes, and any unrelated repository failure.

- [ ] **Step 5: Review final scope and secrets**

```powershell
git status --short
git diff --stat develop...HEAD
git diff --check develop...HEAD
git diff --name-only develop...HEAD
git grep -n -I -E "(api[_-]?key|secret|token|password)" develop...HEAD -- ':!package-lock.json'
```

Expected: changed files are limited to the Orders feature, its focused tests, the approved spec/plan, and the performance evidence; no secret is introduced. Existing unrelated working-tree files remain unstaged.

- [ ] **Step 6: Commit the final evidence**

```powershell
git add -- docs/performance/2026-07-22-orders-baseline.md
git diff --cached --check
git commit -m "docs(order): record Orders refactor results"
```

Expected: commit contains only the completed before/after evidence document.
