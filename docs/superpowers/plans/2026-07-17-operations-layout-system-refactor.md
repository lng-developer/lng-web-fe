# Operations Layout System Refactor Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make operational screens share one layout system so Orders, Design Tasks, Listings, and later modules use the same page shell, toolbar, table, pagination, spacing, and override contract instead of each screen defining its own layout wrappers.

**Architecture:** Reuse and extend the existing shared `src/components/operations` layer. Add missing extension points to `OperationsTable` and shared layout tokens there, then migrate Orders onto these primitives. Screen-specific code should only provide data, column definitions, cell renderers, expanded row content, and small class overrides.

**Tech Stack:** React, MUI, existing Tailwind utility tokens, existing `src/components/operations/*`, Node test runner source-level tests, ESLint, Vite.

## Global Constraints

- Use `src/components/operations` as the shared layout system; do not create an order-only layout system.
- Do not create a generic table outside `operations` in this phase.
- Do not change backend API calls, query keys, DTO mapping, order actions, or modal payloads.
- Preserve current Orders behavior: tabs, filters, sticky header, scroll body, pagination, expanded row, timeline button, customer/case/actions.
- Existing `DesignTasksPage` and `ListingPage` already use `OperationsTable`; changes must be backward compatible.
- New shared components must support overrides via props or column metadata, not per-screen wrapper rewrites.
- Do not add dependencies.
- Every task starts with a failing test and ends with a narrow test pass.
- Final verification must run operations/order tests, `npm.cmd run lint`, and `npm.cmd run build`.

---

## File Structure

- Modify: `src/components/operations/OperationsPageShell.jsx`
  - Keep shared page vertical layout; add small override props only if needed.
- Modify: `src/components/operations/OperationsTable.jsx`
  - Add shared expanded-row and class override support.
- Modify: `src/components/operations/OperationsToolbar.jsx`
  - Keep toolbar as common wrapper; add class override usage only.
- Modify: `src/components/operations/OperationsPagination.jsx`
  - Reuse for Orders pagination.
- Modify: `src/components/operations/index.js`
  - Export any new shared helpers.
- Create: `src/components/operations/operationsLayout.js`
  - Shared operational layout constants.
- Create: `src/components/operations/operationsLayout.test.js`
  - Tests for shared layout constants and override contract.
- Create: `src/components/operations/operationsTableComposition.test.js`
  - Source-level tests for `OperationsTable` extension points.
- Modify: `src/features/orders/pages/OrdersPage.jsx`
  - Migrate Orders from `OrderTableGrid`/custom wrappers to shared operations layout.
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`
  - Guard that Orders consumes `OperationsPageShell`, `OperationsToolbar`, `OperationsTable`, and `OperationsPagination`.
- Delete after migration if unused: `src/features/orders/components/OrderTableGrid.jsx`
- Delete after migration if unused: `src/features/orders/components/orderTableLayout.js`

---

### Task 1: Add Shared Operations Layout Tokens

**Files:**
- Create: `src/components/operations/operationsLayout.js`
- Create: `src/components/operations/operationsLayout.test.js`
- Modify: `src/components/operations/index.js`

**Interfaces:**
- Produces: `operationsPageHeightClass`
- Produces: `operationsTableSurfaceClass`
- Produces: `operationsTableHeaderClass`
- Produces: `operationsTableCellPaddingClass`
- Produces: `operationsTableRowClass`
- Later tasks consume these constants in `OperationsPageShell` and `OperationsTable`.

- [ ] **Step 1: Write the failing test**

Create `src/components/operations/operationsLayout.test.js`:

```javascript
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  operationsPageHeightClass,
  operationsTableCellPaddingClass,
  operationsTableHeaderClass,
  operationsTableRowClass,
  operationsTableSurfaceClass,
} from './operationsLayout.js'

test('operations layout exposes shared shell and table tokens', () => {
  assert.equal(operationsPageHeightClass.includes('h-[calc(100dvh-80px)]'), true)
  assert.equal(operationsTableSurfaceClass.includes('bg-surface'), true)
  assert.equal(operationsTableHeaderClass.includes('sticky top-0'), true)
  assert.equal(operationsTableCellPaddingClass, 'px-4 py-3')
  assert.equal(operationsTableRowClass.includes('border-t border-border'), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\components\operations\operationsLayout.test.js
```

Expected: FAIL because `operationsLayout.js` does not exist.

- [ ] **Step 3: Create `operationsLayout.js`**

```javascript
export const operationsPageHeightClass =
  'h-[calc(100dvh-80px)] md:h-[calc(100dvh-96px)]'

export const operationsTableSurfaceClass = 'h-full overflow-auto bg-surface'

export const operationsTableHeaderClass = 'sticky top-0 z-10 bg-surface-subtle'

export const operationsTableCellPaddingClass = 'px-4 py-3'

export const operationsTableRowClass = 'border-t border-border hover:bg-surface-subtle'
```

- [ ] **Step 4: Export layout tokens**

In `src/components/operations/index.js` add:

```javascript
export * from './operationsLayout'
```

- [ ] **Step 5: Run test to verify it passes**

Run:

```powershell
node --test src\components\operations\operationsLayout.test.js
```

Expected: PASS.

---

### Task 2: Make Existing Operations Shell Consume Shared Tokens

**Files:**
- Modify: `src/components/operations/OperationsPageShell.jsx`
- Modify: `src/components/operations/OperationsTable.jsx`
- Test: `src/components/operations/operationsLayout.test.js`

**Interfaces:**
- Consumes: layout constants from `operationsLayout.js`
- Produces: unchanged public props for current users.

- [ ] **Step 1: Write failing composition assertions**

Extend `operationsLayout.test.js`:

```javascript
import { readFileSync } from 'node:fs'

test('operations shell and table consume shared layout tokens', () => {
  const shellSource = readFileSync(new URL('./OperationsPageShell.jsx', import.meta.url), 'utf8')
  const tableSource = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(shellSource.includes('operationsPageHeightClass'), true)
  assert.equal(tableSource.includes('operationsTableSurfaceClass'), true)
  assert.equal(tableSource.includes('operationsTableHeaderClass'), true)
  assert.equal(tableSource.includes('operationsTableCellPaddingClass'), true)
  assert.equal(tableSource.includes('operationsTableRowClass'), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\components\operations\operationsLayout.test.js
```

Expected: FAIL because shell/table still hardcode class strings.

- [ ] **Step 3: Update `OperationsPageShell.jsx`**

```jsx
import { operationsPageHeightClass } from './operationsLayout'

export default function OperationsPageShell({
  header,
  tabs,
  toolbar,
  children,
  pagination,
  className = '',
}) {
  return (
    <div
      className={`flex ${operationsPageHeightClass} flex-col gap-3 overflow-hidden bg-surface p-4 ${className}`}
    >
      {header ? <div className="shrink-0">{header}</div> : null}
      {tabs ? <div className="shrink-0">{tabs}</div> : null}
      {toolbar ? <div className="shrink-0">{toolbar}</div> : null}
      <div className="min-h-0 flex-1 overflow-hidden">{children}</div>
      {pagination ? <div className="shrink-0">{pagination}</div> : null}
    </div>
  )
}
```

- [ ] **Step 4: Update `OperationsTable.jsx` imports and classes**

Import:

```jsx
import {
  operationsTableCellPaddingClass,
  operationsTableHeaderClass,
  operationsTableRowClass,
  operationsTableSurfaceClass,
} from './operationsLayout'
```

Replace hardcoded table wrapper/header/row/cell classes:

```jsx
<section className={operationsTableSurfaceClass}>
...
<thead className={operationsTableHeaderClass}>
...
className={`${operationsTableRowClass} ${getRowClassName?.(row) || ''}`}
...
className={`${operationsTableCellPaddingClass} align-middle ${alignClass(column.align)}`}
```

- [ ] **Step 5: Run test**

Run:

```powershell
node --test src\components\operations\operationsLayout.test.js
```

Expected: PASS.

---

### Task 3: Add Override and Expanded Row Contract to `OperationsTable`

**Files:**
- Modify: `src/components/operations/OperationsTable.jsx`
- Create: `src/components/operations/operationsTableComposition.test.js`

**Interfaces:**
- Adds optional prop: `renderExpandedRow(row)`
- Adds optional prop: `getRowExpanded(row)`
- Adds optional prop: `getRowCellClassName(row, column)`
- Adds optional prop: `headerClassName`
- Adds optional prop: `bodyClassName`
- Existing screens can ignore all new props.

- [ ] **Step 1: Write failing source-level test**

Create `src/components/operations/operationsTableComposition.test.js`:

```javascript
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('OperationsTable supports shared overrides and expanded rows', () => {
  const source = readFileSync(new URL('./OperationsTable.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('renderExpandedRow'), true)
  assert.equal(source.includes('getRowExpanded'), true)
  assert.equal(source.includes('getRowCellClassName'), true)
  assert.equal(source.includes('headerClassName'), true)
  assert.equal(source.includes('bodyClassName'), true)
  assert.equal(source.includes('colSpan={columns.length}'), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\components\operations\operationsTableComposition.test.js
```

Expected: FAIL because `OperationsTable` does not support expanded row slots yet.

- [ ] **Step 3: Extend `OperationsTable` props**

Add defaults:

```jsx
  renderExpandedRow,
  getRowExpanded,
  getRowCellClassName,
  headerClassName = '',
  bodyClassName = '',
```

- [ ] **Step 4: Apply override props**

Update wrapper/header/body:

```jsx
<section className={`${operationsTableSurfaceClass} ${bodyClassName}`}>
...
<thead className={`${operationsTableHeaderClass} ${headerClassName}`}>
```

Update cell class:

```jsx
className={`${operationsTableCellPaddingClass} align-middle ${alignClass(column.align)} ${getRowCellClassName?.(row, column) || ''}`}
```

- [ ] **Step 5: Render expanded rows after the base row**

Wrap each row in a fragment:

```jsx
{rows.map((row) => {
  const rowKey = getRowKey(row)
  const expanded = Boolean(getRowExpanded?.(row))

  return (
    <Fragment key={rowKey}>
      <tr className={`${operationsTableRowClass} ${getRowClassName?.(row) || ''}`}>
        {columns.map((column) => (
          <td
            key={column.key}
            className={`${operationsTableCellPaddingClass} align-middle ${alignClass(column.align)} ${getRowCellClassName?.(row, column) || ''}`}
          >
            {renderCell(row, column)}
          </td>
        ))}
      </tr>
      {expanded && renderExpandedRow ? (
        <tr className="border-t border-border bg-surface">
          <td colSpan={columns.length} className="p-0 align-top">
            {renderExpandedRow(row)}
          </td>
        </tr>
      ) : null}
    </Fragment>
  )
})}
```

Add `Fragment` import from React.

- [ ] **Step 6: Run tests**

Run:

```powershell
node --test src\components\operations\operationsTableComposition.test.js src\components\operations\operationsLayout.test.js
```

Expected: PASS.

---

### Task 4: Plan Orders Columns as Data, Not Layout Wrappers

**Files:**
- Create: `src/features/orders/components/orderWorkbenchColumns.js`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**
- Produces: `orderWorkbenchColumns`
- Column shape:
```javascript
{
  key: 'orderId',
  labelKey: 'orders.table.orderId',
  width: '178px',
  align: 'left'
}
```

- [ ] **Step 1: Write failing test**

Add to `ordersPageComposition.test.js`:

```javascript
test('orders table declares columns as shared operations table config', () => {
  const columnsUrl = new URL('../components/orderWorkbenchColumns.js', import.meta.url)
  assert.equal(existsSync(columnsUrl), true)

  const columnsSource = readFileSync(columnsUrl, 'utf8')
  assert.equal(columnsSource.includes('export const orderWorkbenchColumns'), true)
  assert.equal(columnsSource.includes("key: 'orderId'"), true)
  assert.equal(columnsSource.includes("key: 'actions'"), true)
  assert.equal(columnsSource.includes('labelKey'), true)
  assert.equal(columnsSource.includes('width'), true)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: FAIL because `orderWorkbenchColumns.js` does not exist.

- [ ] **Step 3: Create `orderWorkbenchColumns.js`**

```javascript
export const orderWorkbenchColumns = [
  { key: 'expand', labelKey: '', width: '32px', align: 'center' },
  { key: 'orderId', labelKey: 'orders.table.orderId', width: '178px', align: 'left' },
  { key: 'status', labelKey: 'orders.table.status', width: '112px', align: 'center' },
  { key: 'createdAt', labelKey: 'orders.table.createdAt', width: '120px', align: 'center' },
  { key: 'orderDate', labelKey: 'orders.table.orderDate', width: '120px', align: 'center' },
  { key: 'shippingType', labelKey: 'orders.table.shippingType', width: '130px', align: 'center' },
  { key: 'customer', labelKey: 'orders.table.customer', width: '210px', align: 'left' },
  { key: 'basecost', labelKey: 'orders.table.basecost', width: '88px', align: 'right' },
  { key: 'store', labelKey: 'orders.table.store', width: '150px', align: 'center' },
  { key: 'handling', labelKey: 'orders.table.handling', width: '78px', align: 'center' },
  { key: 'case', labelKey: 'orders.table.case', width: '104px', align: 'center' },
  { key: 'actions', labelKey: 'orders.table.actions', width: '84px', align: 'center' },
]

export const orderWorkbenchTableMinWidth = '1404px'
```

- [ ] **Step 4: Run test**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: PASS for the column config test.

---

### Task 5: Migrate Orders Page to Shared Operations Layout

**Files:**
- Modify: `src/features/orders/pages/OrdersPage.jsx`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**
- Consumes: `OperationsPageShell`, `OperationsToolbar`, `OperationsTable`, `OperationsPagination`
- Consumes: `orderWorkbenchColumns`, `orderWorkbenchTableMinWidth`
- Produces: Orders no longer uses `OrderTableGrid`, `TableHeader`, `OrdersTableSkeleton`, or custom `Paper` table shell.

- [ ] **Step 1: Write failing test**

Add:

```javascript
test('orders page consumes the shared operations layout system', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
  assert.equal(source.includes('<OrderTableGrid'), false)
  assert.equal(source.includes('function TableHeader'), false)
  assert.equal(source.includes('function OrdersTableSkeleton'), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: FAIL because Orders still uses custom table wrappers.

- [ ] **Step 3: Import shared operations components**

```jsx
import {
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
} from '@/components/operations'
import {
  orderWorkbenchColumns,
  orderWorkbenchTableMinWidth,
} from '@/features/orders/components/orderWorkbenchColumns'
```

- [ ] **Step 4: Convert `FilterBar` wrapper to `OperationsToolbar`**

Return:

```jsx
<OperationsToolbar>
  <Box
    sx={{
      display: 'grid',
      gap: 1.25,
      gridTemplateColumns: {
        xs: '1fr',
        md: 'minmax(220px, 1fr) minmax(220px, 1fr) minmax(260px, 1.1fr) minmax(220px, 1fr) auto auto',
      },
      alignItems: 'center',
    }}
  >
    ...
  </Box>
</OperationsToolbar>
```

- [ ] **Step 5: Convert `OrdersTable` to `OperationsTable`**

Inside `OrdersTable`, build translated columns:

```jsx
const columns = useMemo(
  () =>
    orderWorkbenchColumns.map((column) => ({
      ...column,
      label: column.labelKey ? t(column.labelKey) : '',
    })),
  [t],
)
```

Render:

```jsx
<OperationsTable
  columns={columns}
  rows={orders}
  getRowKey={(order) => order.apiId || order.id}
  renderCell={(order, column) =>
    renderOrderWorkbenchCell({
      column,
      expanded: expandedOrderIds.includes(order.apiId || order.id),
      onRefresh,
      onToggle: () => onToggleOrder(order),
      order,
      t,
    })
  }
  getRowExpanded={(order) => expandedOrderIds.includes(order.apiId || order.id)}
  renderExpandedRow={(order) => <ExpandedOrderDetail order={order} />}
  loading={loading}
  loadingRows={pagination?.limit || 10}
  minWidth={orderWorkbenchTableMinWidth}
  emptyTitle={t('orders.empty.title', 'No orders found')}
/>
```

- [ ] **Step 6: Add `renderOrderWorkbenchCell` near `OrderRow` replacement**

Move the current cell JSX from `OrderRow` into a switch:

```jsx
function renderOrderWorkbenchCell({ column, expanded, onRefresh, onToggle, order, t }) {
  const orderItemId = getOrderItemWorkflowScope(order).orderItemId

  if (column.key === 'expand') {
    return (
      <IconButton size="small" onClick={onToggle} aria-expanded={expanded} sx={{ height: 28, width: 28 }}>
        {expanded ? <KeyboardArrowDownIcon /> : <KeyboardArrowRightIcon />}
      </IconButton>
    )
  }

  if (column.key === 'orderId') {
    return (
      <Box component="span" className="text-xs" sx={{ overflowWrap: 'anywhere', pr: 1 }}>
        {order.id}
      </Box>
    )
  }

  if (column.key === 'status') {
    return (
      <Stack spacing={0.5} sx={{ alignItems: 'center', flexDirection: 'row', justifyContent: 'center', minWidth: 0 }}>
        <StatusBadge label={t(order.statusKey)} color={getOrderStatusColor(order.status)} />
        <OrderTimelineButton orderItemId={orderItemId} />
      </Stack>
    )
  }

  if (column.key === 'createdAt') return <DateCell date={order.createdAt} agoKey={order.createdAgoKey} />
  if (column.key === 'orderDate') return <DateCell date={order.orderDate} agoKey={order.orderAgoKey} />
  if (column.key === 'shippingType') return <StatusBadge label={order.shippingType || '-'} />
  if (column.key === 'customer') return <CustomerCell order={order} />
  if (column.key === 'basecost') return <Typography variant="body2">{order.basecost}</Typography>
  if (column.key === 'store') return <StatusBadge label={order.storeKey ? t(order.storeKey) : order.storeName} color="danger" />
  if (column.key === 'handling') return <Typography variant="body2">{order.handlingKey ? t(order.handlingKey) : order.handling}</Typography>
  if (column.key === 'case') return <OrderCaseAction order={order} onRefresh={onRefresh} />
  if (column.key === 'actions') return <OrderOtherActions order={order} onRefresh={onRefresh} />

  return null
}
```

Create helper:

```jsx
function DateCell({ agoKey, date }) {
  const { t } = useTranslation()

  return (
    <Box sx={{ textAlign: 'center' }}>
      <Typography variant="body2">{date}</Typography>
      <Typography variant="caption" color="text.disabled">
        {t(agoKey)}
      </Typography>
    </Box>
  )
}
```

- [ ] **Step 7: Replace page wrapper with `OperationsPageShell`**

In `OrdersPage` return body, use:

```jsx
<OperationsPageShell
  tabs={<OrderTabs activeTab={activeTab} tabs={tabs} onChange={handleChangeTab} />}
  toolbar={
    <FilterBar
      filters={filters}
      onFiltersChange={setFilters}
      onRefresh={() => ordersQuery.refetch()}
      sellerOptions={sellerOptions}
      shopOptions={shopOptions}
    />
  }
  pagination={
    <OperationsPagination
      page={pagination.page}
      pageSize={pagination.limit}
      total={pagination.total}
      onPageChange={(page) => setFilters((current) => ({ ...current, page }))}
      onPageSizeChange={(limit) => {
        setFilters((current) => ({ ...current, limit, page: 1 }))
        setSelectedOrderId('')
        updateOrdersUrl({ orderId: '' })
      }}
    />
  }
>
  <OrdersTable ... />
</OperationsPageShell>
```

- [ ] **Step 8: Remove custom table wrappers**

Delete from `OrdersPage.jsx` after replacement:
- `TableHeader`
- `OrderRow`
- `OrdersTableSkeleton`
- custom `PaginationBar` if unused
- imports only used by deleted wrappers

- [ ] **Step 9: Run test**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: PASS.

---

### Task 6: Remove Order-Only Layout Layer

**Files:**
- Delete: `src/features/orders/components/OrderTableGrid.jsx`
- Delete: `src/features/orders/components/orderTableLayout.js`
- Modify: `src/features/orders/utils/ordersPageComposition.test.js`

**Interfaces:**
- Removes order-only grid primitives after Orders uses shared operations layout.

- [ ] **Step 1: Write failing guard**

Add:

```javascript
test('orders no longer carries an order-only table layout system', () => {
  assert.equal(existsSync(new URL('../components/OrderTableGrid.jsx', import.meta.url)), false)
  assert.equal(existsSync(new URL('../components/orderTableLayout.js', import.meta.url)), false)
})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: FAIL because the order-only layout files still exist.

- [ ] **Step 3: Delete files**

Remove:

```powershell
Remove-Item -LiteralPath src\features\orders\components\OrderTableGrid.jsx
Remove-Item -LiteralPath src\features\orders\components\orderTableLayout.js
```

- [ ] **Step 4: Run test**

Run:

```powershell
node --test src\features\orders\utils\ordersPageComposition.test.js
```

Expected: PASS.

---

### Task 7: Compatibility Verification Across Existing Operations Screens

**Files:**
- Test only.

**Interfaces:**
- Proves `DesignTasksPage` and `ListingPage` still compile after `OperationsTable` extension.

- [ ] **Step 1: Run operations tests**

Run:

```powershell
node --test src\components\operations\operationsLayout.test.js src\components\operations\operationsTableComposition.test.js
```

Expected: PASS.

- [ ] **Step 2: Run order tests**

Run:

```powershell
node --test src\features\orders\utils\ordersItemWorkflow.test.js src\features\orders\utils\ordersPageComposition.test.js src\features\orders\utils\ordersApi.test.js src\features\orders\utils\ordersHeaderPerformance.test.js src\features\orders\utils\ordersPerformance.test.js src\features\orders\utils\ordersDisplay.test.js src\features\orders\utils\ordersFilters.test.js src\features\orders\components\orderUiComponents.test.js src\features\orders\utils\ordersOps.test.js
```

Expected: PASS.

- [ ] **Step 3: Run lint**

Run:

```powershell
npm.cmd run lint
```

Expected: exit code `0`.

- [ ] **Step 4: Run build**

Run:

```powershell
npm.cmd run build
```

Expected: exit code `0`; existing Vite chunk-size warning is acceptable if unchanged.

---

## Self-Review

- Spec coverage: This plan creates one shared operations layout system and migrates Orders into it. It does not keep layout scoped only to Orders.
- Placeholder scan: No `TBD`, `TODO`, or vague implementation placeholders are present.
- Type consistency: Props are consistent across tasks: `renderExpandedRow`, `getRowExpanded`, `getRowCellClassName`, `headerClassName`, `bodyClassName`, `orderWorkbenchColumns`, `orderWorkbenchTableMinWidth`.
- Scope guard: Existing users of `OperationsTable` remain compatible because all new props are optional.
