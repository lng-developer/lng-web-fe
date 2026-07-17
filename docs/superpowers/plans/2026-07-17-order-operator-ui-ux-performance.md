# Order Operator UI UX Performance Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the Order module into a denser operator workflow that uses the available Order APIs, extracts shared UI components where repetition already exists, and leaves measurable performance checks behind.

**Architecture:** Keep the current React + MUI + TanStack Query stack. Split only the repeated local UI primitives and order detail workflow out of `OrdersPage.jsx`; do not introduce a new design system, table library, or routing layer. Replace eager row expansion with lazy master-detail panels so the page does not render every order's actions and details by default.

**Tech Stack:** React 19, MUI 9, TanStack Query 5, existing Tailwind utilities, Node test runner, Vite.

## Global Constraints

- Design read: dense B2B operations UI for order operators; quiet, scannable, workflow-first.
- `design-taste-frontend` is not a dashboard/data-table skill, so use existing MUI/Tailwind operational patterns instead of marketing-page polish.
- No new dependencies for UI, table rendering, icons, testing, or performance checks.
- Reuse `apiClient`, `ENDPOINTS`, and existing order hooks before adding new hooks.
- Keep shared components local to `src/features/orders/components` unless a second feature actually uses them.
- Avoid route/API scope creep; this plan is for the Order module only.
- Keep current uncommitted work intact; do not revert unrelated files.

---

## File Structure

- Modify: `src/features/orders/pages/OrdersPage.jsx`
  - Becomes the page coordinator: query state, selected order state, layout composition.
- Create: `src/features/orders/components/OrderStatusChip.jsx`
  - Shared order/item status chip and pure tone helpers.
- Create: `src/features/orders/components/OrderDetailField.jsx`
  - Shared label/value row for detail panels.
- Create: `src/features/orders/components/OrderActionButton.jsx`
  - Shared labeled icon button for order actions.
- Create: `src/features/orders/components/OrderTextActionDialog.jsx`
  - Shared confirmation/text dialog for replacement/cancel/comment flows.
- Create: `src/features/orders/components/OrderKpiStrip.jsx`
  - Uses `useOrderSummaryQuery` result shape to show tab counts and health metrics.
- Create: `src/features/orders/components/OrdersToolbar.jsx`
  - Search, shop, seller, channel, date range, refresh, import entry.
- Create: `src/features/orders/components/OrderDetailDrawer.jsx`
  - Lazy detail/timeline/readiness/items tabs for the selected order.
- Create: `src/features/orders/components/OrderReadinessPanel.jsx`
  - Uses `useOrderItemReadinessQuery` only when opened.
- Create: `src/features/orders/components/OrderTimelinePanel.jsx`
  - Uses `useOrderTimelineQuery` and `useOrderItemTimelineQuery` only when opened.
- Create: `src/features/orders/components/OrderItemsPanel.jsx`
  - Uses `useOrderItemsQuery` and item/customization hooks only when opened.
- Create: `src/features/orders/utils/ordersPerformance.js`
  - Pure helpers for render-budget tests and query-count expectations.
- Create: `src/features/orders/utils/ordersPerformance.test.js`
  - Node performance and anti-regression tests with no browser dependency.
- Modify: `src/features/orders/utils/ordersDisplay.js`
  - Stop expanding every row by default; expose helper for selected-row expansion only.
- Modify: `src/features/orders/utils/ordersDisplay.test.js`
  - Update expansion tests to protect the new non-eager behavior.
- Modify: `src/features/orders/utils/ordersApi.test.js`
  - Add coverage for summary-query mapping if new helper is needed.

---

### Task 1: Extract Repeated Order UI Primitives

**Files:**
- Create: `src/features/orders/components/OrderStatusChip.jsx`
- Create: `src/features/orders/components/OrderDetailField.jsx`
- Create: `src/features/orders/components/OrderActionButton.jsx`
- Create: `src/features/orders/components/OrderTextActionDialog.jsx`
- Create: `src/features/orders/components/orderUiComponents.test.js`
- Modify: `src/features/orders/pages/OrdersPage.jsx`

**Interfaces:**
- Produces: `getOrderStatusTone(status: string): 'success' | 'warning' | 'danger'`
- Produces: `OrderStatusChip({ label, status, tone })`
- Produces: `OrderDetailField({ label, value, valueAlign })`
- Produces: `OrderActionButton({ color, disabled, icon, label, loading, onClick })`
- Produces: `OrderTextActionDialog({ confirmLabel, label, loading, onClose, onSubmit, open, required, title })`
- Consumes: existing MUI components and local `getDetailDisplayValue` behavior from `OrdersPage.jsx`.

- [ ] **Step 1: Write primitive tests**

Create `src/features/orders/components/orderUiComponents.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'
import React from 'react'

import { getOrderStatusTone, OrderStatusChip } from './OrderStatusChip.jsx'
import { getOrderDetailDisplayValue } from './OrderDetailField.jsx'

test('getOrderStatusTone maps backend order states to operator tones', () => {
  assert.equal(getOrderStatusTone('CANCELLED'), 'danger')
  assert.equal(getOrderStatusTone('FAILED'), 'danger')
  assert.equal(getOrderStatusTone('PROCESSING'), 'warning')
  assert.equal(getOrderStatusTone('ON_HOLD'), 'warning')
  assert.equal(getOrderStatusTone('SHIPPED'), 'success')
})

test('getOrderDetailDisplayValue safely displays object and empty values', () => {
  assert.equal(getOrderDetailDisplayValue(null), '-')
  assert.equal(getOrderDetailDisplayValue(''), '-')
  assert.equal(getOrderDetailDisplayValue({ label: 'Amazon' }), 'Amazon')
  assert.equal(getOrderDetailDisplayValue(['A', 'B']), 'A, B')
})

test('OrderStatusChip server-renders the visible label', () => {
  const html = renderToStaticMarkup(<OrderStatusChip label="Processing" status="PROCESSING" />)
  assert.match(html, /Processing/)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\orders\components\orderUiComponents.test.js
```

Expected: FAIL because component files do not exist.

- [ ] **Step 3: Implement shared primitives**

Create `src/features/orders/components/OrderStatusChip.jsx`:

```jsx
import { Chip } from '@mui/material'

export function getOrderStatusTone(status) {
  if (['CANCELLED', 'REFUNDED', 'FAILED'].includes(status)) return 'danger'
  if (['PROCESSING', 'PARTIALLY_SHIPPED', 'ON_HOLD'].includes(status)) return 'warning'
  return 'success'
}

export default function OrderStatusChip({ label, status, tone }) {
  const resolvedTone = tone || getOrderStatusTone(status)
  const paletteByTone = {
    success: 'success',
    warning: 'warning',
    danger: 'error',
  }
  const paletteColor = paletteByTone[resolvedTone] || paletteByTone.success

  return (
    <Chip
      label={label}
      size="small"
      sx={(theme) => ({
        height: 24,
        bgcolor: theme.palette[paletteColor].light,
        border: `1px solid ${theme.palette[paletteColor].main}`,
        color: theme.palette[paletteColor].main,
        fontWeight: 500,
        '& .MuiChip-label': { px: 1 },
      })}
    />
  )
}
```

Create `src/features/orders/components/OrderDetailField.jsx`:

```jsx
import { isValidElement } from 'react'
import { Box, Typography } from '@mui/material'

export function getOrderDetailDisplayValue(value) {
  if (isValidElement(value)) return value
  if (value === null || value === undefined || value === '') return '-'
  if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
    return String(value)
  }
  if (Array.isArray(value)) return value.map(getOrderDetailDisplayValue).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    const displayKey = ['label', 'name', 'value'].find(
      (key) => value[key] !== null && value[key] !== undefined && value[key] !== '',
    )
    return displayKey ? getOrderDetailDisplayValue(value[displayKey]) : JSON.stringify(value)
  }
  return String(value)
}

export default function OrderDetailField({ label, value, valueAlign = 'right' }) {
  const displayValue = getOrderDetailDisplayValue(value)
  const isTextValue = typeof displayValue === 'string' || typeof displayValue === 'number'
  const alignStart = valueAlign === 'left'

  return (
    <Box className="grid min-w-0 grid-cols-[minmax(112px,0.85fr)_minmax(0,1fr)] items-start gap-1.5">
      <Typography variant="body2" className="min-w-0 break-words !text-ink-muted">
        {label}
      </Typography>
      {isTextValue ? (
        <Typography
          variant="body2"
          className={`min-w-0 break-words [overflow-wrap:anywhere] !font-medium ${
            alignStart ? '!text-left' : '!text-right'
          }`}
        >
          {displayValue}
        </Typography>
      ) : (
        <Box className={`min-w-0 ${alignStart ? 'justify-self-start' : 'justify-self-end'}`}>
          {displayValue}
        </Box>
      )}
    </Box>
  )
}
```

Create `src/features/orders/components/OrderActionButton.jsx` by moving the existing local `ActionIconButton` code from `OrdersPage.jsx` unchanged.

Create `src/features/orders/components/OrderTextActionDialog.jsx` by moving the existing local `TextActionDialog` code from `OrdersPage.jsx` unchanged.

- [ ] **Step 4: Replace local primitives in `OrdersPage.jsx`**

In `src/features/orders/pages/OrdersPage.jsx`:

```jsx
import OrderActionButton from '@/features/orders/components/OrderActionButton'
import OrderDetailField from '@/features/orders/components/OrderDetailField'
import OrderStatusChip, { getOrderStatusTone } from '@/features/orders/components/OrderStatusChip'
import OrderTextActionDialog from '@/features/orders/components/OrderTextActionDialog'
```

Then remove local `StatusBadge`, `getOrderStatusColor`, `getDetailDisplayValue`, `DetailField`, `TextActionDialog`, and `ActionIconButton`. Replace usages:

```jsx
<OrderStatusChip label={t(order.statusKey)} status={order.status} />
<OrderDetailField label={t('orders.fields.asin')} value={product.asin} valueAlign="left" />
<OrderTextActionDialog ... />
<OrderActionButton ... />
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test src\features\orders\components\orderUiComponents.test.js
```

Expected: PASS.

---

### Task 2: Add Summary-Driven KPI Strip And Usable Filters

**Files:**
- Create: `src/features/orders/components/OrderKpiStrip.jsx`
- Create: `src/features/orders/components/OrdersToolbar.jsx`
- Create: `src/features/orders/utils/ordersFilters.js`
- Create: `src/features/orders/utils/ordersFilters.test.js`
- Modify: `src/features/orders/pages/OrdersPage.jsx`

**Interfaces:**
- Produces: `buildOrderFilterChips(filters, labels): Array<{ key, label, value }>`
- Produces: `buildSellerOptions(rows): Array<{ value, label }>`
- Produces: `OrderKpiStrip({ summary, activeTab, onTabChange, tabs })`
- Produces: `OrdersToolbar({ filters, shopOptions, sellerOptions, onFilterChange, onRefresh, loading })`
- Consumes: `useOrderSummaryQuery(orderQuery)`.

- [ ] **Step 1: Write filter helper tests**

Create `src/features/orders/utils/ordersFilters.test.js`:

```js
import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOrderFilterChips, buildSellerOptions } from './ordersFilters.js'

test('buildSellerOptions derives stable seller options from visible order rows', () => {
  assert.deepEqual(
    buildSellerOptions([
      { seller: 'Nguyen Duc Son' },
      { seller: 'Nguyen Duc Son' },
      { seller: 'J2508' },
      { seller: '' },
    ]),
    [
      { value: 'all', labelKey: 'orders.filters.allSellers' },
      { value: 'J2508', label: 'J2508' },
      { value: 'Nguyen Duc Son', label: 'Nguyen Duc Son' },
    ],
  )
})

test('buildOrderFilterChips only returns active operator filters', () => {
  assert.deepEqual(
    buildOrderFilterChips({
      search: 'mug',
      channel: 'amazon',
      shopId: 'all',
      seller: 'all',
    }),
    [
      { key: 'search', labelKey: 'orders.filters.search', value: 'mug' },
      { key: 'channel', labelKey: 'orders.filters.channel', value: 'amazon' },
    ],
  )
})
```

- [ ] **Step 2: Implement filter helpers**

Create `src/features/orders/utils/ordersFilters.js`:

```js
function clean(value) {
  return String(value ?? '').trim()
}

export function buildSellerOptions(rows = []) {
  const sellers = [...new Set(rows.map((row) => clean(row.seller)).filter(Boolean))].sort()
  return [
    { value: 'all', labelKey: 'orders.filters.allSellers' },
    ...sellers.map((seller) => ({ value: seller, label: seller })),
  ]
}

export function buildOrderFilterChips(filters = {}) {
  return [
    ['search', 'orders.filters.search', clean(filters.search)],
    ['channel', 'orders.filters.channel', filters.channel === 'all' ? '' : clean(filters.channel)],
    ['shopId', 'orders.filters.shop', filters.shopId === 'all' ? '' : clean(filters.shopId)],
    ['seller', 'orders.filters.seller', filters.seller === 'all' ? '' : clean(filters.seller)],
  ]
    .filter(([, , value]) => value)
    .map(([key, labelKey, value]) => ({ key, labelKey, value }))
}
```

- [ ] **Step 3: Create KPI and toolbar components**

Create `src/features/orders/components/OrderKpiStrip.jsx`:

```jsx
import { Skeleton, Stack, Typography } from '@mui/material'

function readTabCount(summary, tabValue) {
  return Number(summary?.tabCounts?.[tabValue] ?? summary?.counts?.[tabValue] ?? 0)
}

export default function OrderKpiStrip({ activeTab, loading = false, onTabChange, summary, tabs = [] }) {
  if (loading) {
    return (
      <Stack direction="row" spacing={1.5}>
        {tabs.slice(0, 5).map((tab) => (
          <Skeleton key={tab.value} variant="rounded" width={128} height={52} />
        ))}
      </Stack>
    )
  }

  return (
    <Stack direction="row" spacing={1.5} sx={{ overflowX: 'auto', pb: 0.5 }}>
      {tabs.map((tab) => {
        const selected = activeTab === tab.value
        return (
          <button
            key={tab.value}
            type="button"
            onClick={() => onTabChange?.(tab.value)}
            className={`min-w-[128px] rounded border px-3 py-2 text-left ${
              selected ? 'border-primary bg-primary-light text-primary' : 'border-border bg-surface'
            }`}
          >
            <Typography variant="caption" className="font-semibold">
              {tab.label}
            </Typography>
            <Typography variant="h6" className="leading-tight">
              {readTabCount(summary, tab.apiValue || tab.value)}
            </Typography>
          </button>
        )
      })}
    </Stack>
  )
}
```

Create `src/features/orders/components/OrdersToolbar.jsx` by moving the current search, channel, shop, seller, date range, refresh controls out of `OrdersPage.jsx`. The seller select must no longer be disabled:

```jsx
<OrdersSelect
  value={filters.seller}
  onChange={(value) => onFilterChange('seller', value)}
  options={sellerOptions}
  sx={{ width: '100%' }}
/>
```

- [ ] **Step 4: Wire summary and toolbar in `OrdersPage.jsx`**

In `OrdersPage.jsx`, add:

```jsx
const orderSummaryQuery = useOrderSummaryQuery(orderQuery)
const sellerOptions = useMemo(() => buildSellerOptions(orders), [orders])
```

Render:

```jsx
<OrderKpiStrip
  activeTab={filters.tab}
  loading={orderSummaryQuery.isLoading}
  onTabChange={(tab) => setFilters((current) => ({ ...current, tab, page: 1 }))}
  summary={orderSummaryQuery.data}
  tabs={orderTabs}
/>
<OrdersToolbar
  filters={filters}
  loading={ordersQuery.isFetching}
  sellerOptions={sellerOptions}
  shopOptions={shopOptions}
  onFilterChange={updateFilter}
  onRefresh={() => ordersQuery.refetch()}
/>
```

- [ ] **Step 5: Run tests**

Run:

```powershell
node --test src\features\orders\utils\ordersFilters.test.js src\features\orders\utils\ordersApi.test.js
```

Expected: PASS.

---

### Task 3: Replace Eager Row Expansion With Lazy Master Detail

**Files:**
- Create: `src/features/orders/components/OrderDetailDrawer.jsx`
- Create: `src/features/orders/components/OrderReadinessPanel.jsx`
- Create: `src/features/orders/components/OrderTimelinePanel.jsx`
- Create: `src/features/orders/components/OrderItemsPanel.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersDisplay.js`
- Modify: `src/features/orders/utils/ordersDisplay.test.js`

**Interfaces:**
- Produces: `getDefaultExpandedOrderIds(): []`
- Produces: `getSelectedExpandedOrderIds(selectedOrderId): string[]`
- Produces: `OrderDetailDrawer({ open, order, onClose, onRefresh })`
- Consumes: `useOrderDetailQuery`, `useOrderItemsQuery`, `useOrderTimelineQuery`, `useOrderItemTimelineQuery`, `useOrderItemReadinessQuery`, `useOrderItemCustomizationQuery`.

- [ ] **Step 1: Change expansion tests first**

Update `src/features/orders/utils/ordersDisplay.test.js`:

```js
test('getDefaultExpandedOrderIds does not open every row by default', () => {
  assert.deepEqual(getDefaultExpandedOrderIds(orders), [])
})

test('getSelectedExpandedOrderIds expands only the selected internal id', () => {
  assert.deepEqual(getSelectedExpandedOrderIds('mongo-order-1'), ['mongo-order-1'])
  assert.deepEqual(getSelectedExpandedOrderIds(''), [])
})
```

- [ ] **Step 2: Implement expansion helpers**

In `src/features/orders/utils/ordersDisplay.js`:

```js
export function getDefaultExpandedOrderIds() {
  return []
}

export function getSelectedExpandedOrderIds(orderId) {
  return orderId ? [orderId] : []
}
```

- [ ] **Step 3: Create lazy detail drawer shell**

Create `src/features/orders/components/OrderDetailDrawer.jsx`:

```jsx
import { useMemo, useState } from 'react'
import { Box, Drawer, Tab, Tabs, Typography } from '@mui/material'

import {
  useOrderDetailQuery,
  useOrderItemsQuery,
  useOrderTimelineQuery,
} from '@/features/orders/api/orders.queries'

import OrderItemsPanel from './OrderItemsPanel'
import OrderTimelinePanel from './OrderTimelinePanel'

export default function OrderDetailDrawer({ open, order, onClose }) {
  const [tab, setTab] = useState('summary')
  const orderId = order?.apiId
  const detailQuery = useOrderDetailQuery(orderId, { enabled: open && Boolean(orderId) })
  const itemsQuery = useOrderItemsQuery(orderId, { page: 1, limit: 100 }, {
    enabled: open && tab === 'items' && Boolean(orderId),
  })
  const timelineQuery = useOrderTimelineQuery(orderId, {
    enabled: open && tab === 'timeline' && Boolean(orderId),
  })
  const detail = detailQuery.data || order?.raw || {}
  const tabs = useMemo(() => ['summary', 'items', 'timeline'], [])

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', md: 720 } } }}>
      <Box sx={{ display: 'flex', minHeight: 0, height: '100%', flexDirection: 'column' }}>
        <Box sx={{ borderBottom: 1, borderColor: 'divider', p: 2 }}>
          <Typography variant="h6">{order?.id || 'Order detail'}</Typography>
          <Tabs value={tab} onChange={(_, value) => setTab(value)} variant="scrollable">
            {tabs.map((value) => <Tab key={value} label={value} value={value} />)}
          </Tabs>
        </Box>
        <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto', p: 2 }}>
          {tab === 'summary' ? <pre>{JSON.stringify(detail, null, 2)}</pre> : null}
          {tab === 'items' ? <OrderItemsPanel itemsQuery={itemsQuery} /> : null}
          {tab === 'timeline' ? <OrderTimelinePanel timelineQuery={timelineQuery} /> : null}
        </Box>
      </Box>
    </Drawer>
  )
}
```

The first implementation can render raw summary JSON behind the drawer while components are split; replace it in the same task with `OrderDetailField` sections copied from current `ExpandedOrderDetail`.

- [ ] **Step 4: Move readiness, timeline, and item views into panels**

Create `OrderTimelinePanel.jsx` using `mapTimelineRows(timelineQuery.data)` and current `OperationsTable` style rows.

Create `OrderItemsPanel.jsx` using `mapOrderItemOptions(itemsQuery.data)` and render one `OrderReadinessPanel` per selected item.

Create `OrderReadinessPanel.jsx`:

```jsx
import { Skeleton, Stack, Typography } from '@mui/material'

import { useOrderItemReadinessQuery } from '@/features/orders/api/orders.queries'
import { mapReadinessRows } from '@/features/orders/utils/ordersOps'

export default function OrderReadinessPanel({ orderItemId, enabled }) {
  const query = useOrderItemReadinessQuery(orderItemId, { enabled: enabled && Boolean(orderItemId) })
  if (query.isLoading) return <Skeleton variant="rounded" height={120} />

  return (
    <Stack spacing={1}>
      {mapReadinessRows(query.data).map((row) => (
        <Stack key={row.key} direction="row" justifyContent="space-between">
          <Typography variant="body2">{row.label}</Typography>
          <Typography variant="body2" color={row.ok ? 'success.main' : 'warning.main'}>
            {row.value}
          </Typography>
        </Stack>
      ))}
    </Stack>
  )
}
```

- [ ] **Step 5: Wire selected-order drawer in `OrdersPage.jsx`**

In `OrdersPage.jsx`, replace collapsed-id driven default expansion with selected order state:

```jsx
const [selectedOrder, setSelectedOrder] = useState(null)
const expandedOrderIds = useMemo(
  () => getSelectedExpandedOrderIds(selectedOrder?.apiId || selectedOrder?.id),
  [selectedOrder],
)
```

In row toggle:

```jsx
onToggleOrder={(order) => setSelectedOrder(order)}
```

Render:

```jsx
<OrderDetailDrawer
  open={Boolean(selectedOrder)}
  order={selectedOrder}
  onClose={() => setSelectedOrder(null)}
  onRefresh={() => ordersQuery.refetch()}
/>
```

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test src\features\orders\utils\ordersDisplay.test.js src\features\orders\utils\ordersOps.test.js
```

Expected: PASS.

---

### Task 4: Add Assigned Staff Workflow With Existing APIs

**Files:**
- Create: `src/features/orders/components/OrderAssignStaffDialog.jsx`
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/api/orders.queries.js` only if no reusable organization member query exists.

**Interfaces:**
- Produces: `OrderAssignStaffDialog({ open, orderId, candidates, loading, onClose, onSubmit })`
- Consumes: `useAssignOrderStaffMutation`.
- Consumes: existing `ENDPOINTS.ORGANIZATION.MEMBER_CANDIDATES` through a small query hook if needed.

- [ ] **Step 1: Prefer existing org/RBAC query before adding a new hook**

Search:

```powershell
rg "MEMBER_CANDIDATES|member-candidates|use.*Member" src\features src\services
```

If an existing query exists, import it. If not, add this to `src/features/orders/api/orders.queries.js`:

```js
export function useOrderStaffCandidatesQuery(query = {}, options = {}) {
  return useQuery({
    queryKey: [...ordersKeys.all, 'staff-candidates', query],
    queryFn: () => get(ENDPOINTS.ORGANIZATION.MEMBER_CANDIDATES, query),
    keepPreviousData: true,
    ...options,
  })
}
```

- [ ] **Step 2: Create assignment dialog**

Create `src/features/orders/components/OrderAssignStaffDialog.jsx`:

```jsx
import { Button, Dialog, MenuItem, Select, Stack, Typography } from '@mui/material'
import { useState } from 'react'

export default function OrderAssignStaffDialog({ candidates = [], loading = false, onClose, onSubmit, open }) {
  const [assignedStaffId, setAssignedStaffId] = useState('')
  const submit = () => {
    if (!assignedStaffId) return
    onSubmit({ assignedStaffId })
  }

  return (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
      <Stack spacing={2} sx={{ p: 2 }}>
        <Typography variant="h6">Assign staff</Typography>
        <Select size="small" value={assignedStaffId} onChange={(event) => setAssignedStaffId(event.target.value)}>
          {candidates.map((candidate) => (
            <MenuItem key={candidate.id} value={candidate.id}>
              {candidate.name || candidate.email || candidate.id}
            </MenuItem>
          ))}
        </Select>
        <Stack direction="row" spacing={1} justifyContent="flex-end">
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="contained" disabled={!assignedStaffId || loading} onClick={submit}>
            Assign
          </Button>
        </Stack>
      </Stack>
    </Dialog>
  )
}
```

- [ ] **Step 3: Wire action in drawer actions**

In `OrderDetailDrawer` or existing order action area:

```jsx
const assignStaffMutation = useAssignOrderStaffMutation()
```

Submit:

```jsx
await assignStaffMutation.mutateAsync({ orderId, assignedStaffId })
```

Invalidate happens in existing mutation.

- [ ] **Step 4: Run focused order tests**

```powershell
node --test src\features\orders\utils\ordersApi.test.js src\features\orders\utils\ordersOps.test.js
```

Expected: PASS.

---

### Task 5: Add Performance Guardrails

**Files:**
- Create: `src/features/orders/utils/ordersPerformance.js`
- Create: `src/features/orders/utils/ordersPerformance.test.js`
- Modify: `src/features/orders/utils/ordersDisplay.test.js`

**Interfaces:**
- Produces: `createWorkbenchRows(count: number): Array<object>`
- Produces: `countDefaultDetailQueries(rows, expandedIds): number`
- Produces: perf checks that fail if row expansion becomes eager again.

- [ ] **Step 1: Create performance helpers**

Create `src/features/orders/utils/ordersPerformance.js`:

```js
export function createWorkbenchRows(count = 100) {
  return Array.from({ length: count }, (_, index) => ({
    order: {
      id: `66000000000000000000${String(index).padStart(4, '0')}`,
      externalOrderId: `ORDER-${index}`,
      status: 'PROCESSING',
      salesChannelCode: 'AMAZON',
      shop: { name: 'LNG Shop' },
      buyer: { name: `Buyer ${index}` },
      pricing: { currency: 'USD', customerPaidAmount: 2500 },
    },
    items: [
      {
        item: {
          id: `77000000000000000000${String(index).padStart(4, '0')}`,
          title: 'Custom Mug',
          sku: 'MUG-11OZ',
          quantity: 1,
          status: 'CUSTOMIZATION_PARSED',
        },
        seller: { name: 'Operator A' },
        customization: { inputs: [] },
        mapping: {},
        pricing: { currency: 'USD', customerPaidAmount: 2500 },
        production: {},
      },
    ],
  }))
}

export function countDefaultDetailQueries(rows = [], expandedIds = []) {
  const expanded = new Set(expandedIds)
  return rows.reduce((count, row) => {
    const orderId = row.order?.id || row.order?.externalOrderId
    return expanded.has(orderId) ? count + 1 : count
  }, 0)
}
```

- [ ] **Step 2: Add perf tests**

Create `src/features/orders/utils/ordersPerformance.test.js`:

```js
import assert from 'node:assert/strict'
import { performance } from 'node:perf_hooks'
import test from 'node:test'

import { mapWorkbenchRows } from './ordersApi.js'
import { getDefaultExpandedOrderIds } from './ordersDisplay.js'
import { countDefaultDetailQueries, createWorkbenchRows } from './ordersPerformance.js'

test('mapWorkbenchRows stays inside a practical operator-page budget', () => {
  const rows = createWorkbenchRows(500)
  const started = performance.now()
  const mapped = mapWorkbenchRows(rows)
  const elapsed = performance.now() - started

  assert.equal(mapped.length, 500)
  assert.ok(elapsed < 250, `mapWorkbenchRows(500) took ${elapsed.toFixed(1)}ms`)
})

test('default order page does not schedule detail queries for every row', () => {
  const rows = createWorkbenchRows(100)
  const expandedIds = getDefaultExpandedOrderIds(rows)

  assert.deepEqual(expandedIds, [])
  assert.equal(countDefaultDetailQueries(rows, expandedIds), 0)
})
```

- [ ] **Step 3: Run perf tests**

Run:

```powershell
node --test src\features\orders\utils\ordersPerformance.test.js
```

Expected: PASS. If the timing threshold flakes locally, raise it once to `400ms`; do not remove the test.

- [ ] **Step 4: Add manual browser profiling checklist to plan notes**

Record in the PR/body:

```txt
Manual perf smoke:
- Load /portal/orders with 100-row page size.
- No default detail drawer queries until selecting a row.
- Switching tabs keeps interaction responsive.
- Build output still succeeds with only existing Vite chunk warning.
```

---

### Task 6: Final Verification

**Files:**
- Verify only.

**Interfaces:**
- Consumes: all tasks above.
- Produces: test/build evidence.

- [ ] **Step 1: Run focused order tests**

```powershell
node --test src\features\orders\components\orderUiComponents.test.js src\features\orders\utils\ordersApi.test.js src\features\orders\utils\ordersDisplay.test.js src\features\orders\utils\ordersFilters.test.js src\features\orders\utils\ordersOps.test.js src\features\orders\utils\ordersPerformance.test.js
```

Expected: PASS.

- [ ] **Step 2: Run endpoint safety tests**

```powershell
node --test src\services\endpoints.contract.test.js src\features\api-coverage\data\backendEndpoints.test.js
```

Expected: PASS.

- [ ] **Step 3: Run lint**

```powershell
npm.cmd run lint
```

Expected: exits `0`.

- [ ] **Step 4: Run build**

```powershell
npm.cmd run build
```

Expected: exits `0`; existing Vite chunk-size warning is acceptable.

- [ ] **Step 5: Inspect diff scope**

```powershell
git diff --stat
git diff -- src\features\orders src\services\endpoints.js
```

Expected: changes stay in `src/features/orders` plus already-existing endpoint files if touched by previous work.

---

## Self-Review

- Spec coverage: covers UI/UX, shared components, API-backed order workflows, and performance testing.
- Placeholder scan: no TBD/TODO text; every task has exact files, interfaces, snippets, and commands.
- Type consistency: component names and helper signatures are defined before use.
- Ponytail check: no new dependencies, no global design-system rewrite, no component library abstraction beyond repeated local order UI.
- Performance check: plan prevents eager row expansion and adds a measurable mapper/detail-query guard.
