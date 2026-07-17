import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import test from 'node:test'

function readOrdersPageSource() {
  return readFileSync(new URL('../pages/OrdersPage.jsx', import.meta.url), 'utf8')
}

function readOrderTableLayoutSource() {
  const layoutUrl = new URL('../components/orderTableLayout.js', import.meta.url)
  assert.equal(existsSync(layoutUrl), true)
  return readFileSync(layoutUrl, 'utf8')
}

test('orders page keeps operational queues out of the table footer', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('<CasesTab'), false)
  assert.equal(source.includes('<ExceptionsTab'), false)
  assert.equal(source.includes('<ImportIssuesTab'), false)
  assert.equal(source.includes('label="Workflow"'), false)
})

test('orders page opens item timeline lazily from the status cell', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('useOrderTimelineQuery'), false)
  assert.equal(source.includes('useOrderItemTimelineQuery'), true)
  assert.equal(source.includes('enabled: Boolean(orderItemId && timelineAnchor)'), true)
  assert.equal(source.includes('<OrderTimelineButton'), true)
  assert.equal(source.includes('row.actorLabel'), true)
  assert.equal(source.includes('row.message ?'), true)
  assert.equal(source.includes("gridTemplateColumns: '18px minmax(0, 1fr)'"), true)
})

test('expanded order item detail keeps item fields read-only and actions grouped', () => {
  const source = readOrdersPageSource()

  assert.equal(source.includes('function CompactInput'), false)
  assert.equal(source.includes('orders.actions.update'), false)
  assert.equal(source.includes('function ReadOnlyValue'), true)
  assert.equal(source.includes('function ActionsCard'), false)
  assert.equal(source.includes('title="Order actions"'), false)
  assert.equal(source.includes('title="Order item actions"'), false)
})

test('order table splits customer, case, and other row actions by column', () => {
  const source = readOrdersPageSource()
  const layoutSource = readOrderTableLayoutSource()

  assert.equal(layoutSource.includes("'case',"), true)
  assert.equal(layoutSource.includes("'actions',"), true)
  assert.equal(source.includes('<CustomerCell'), true)
  assert.equal(source.includes('<OrderCaseAction'), true)
  assert.equal(source.includes('<OrderOtherActions'), true)
  assert.equal(source.includes('<OrderRowActions'), false)
  assert.equal(source.includes("setCaseAction({ type: 'create' })"), false)
  assert.equal(source.includes("aria-label={t('orders.updateCustomer.title')}"), false)
  assert.equal(source.includes('label="Validate"'), false)
  assert.equal(source.includes('label="Buyer"'), true)
  assert.equal(source.includes('label="Case"'), true)
  assert.equal(source.includes('label="Retest"'), true)
  assert.equal(source.includes('label="Replace"'), true)
  assert.equal(source.includes('label="Service"'), false)
  assert.equal(source.includes('label="Workflow"'), false)
  assert.equal(source.includes('label="Recheck"'), false)
  assert.equal(source.includes('label="Ready"'), false)
  assert.equal(source.includes('label="Cancel"'), false)
  assert.equal(source.includes('caseStatus'), true)
  assert.equal(source.includes('caseTitle'), true)
  assert.equal(source.includes('onCreated={handleCaseCreated}'), true)
  assert.equal(source.includes('caseTitle || caseStatus'), true)
  assert.equal(source.includes('Boolean(caseTitle)'), true)
  assert.equal(source.includes('onRefresh?.()'), true)
})

test('order table summary row uses dense fixed operational columns', () => {
  const source = readOrdersPageSource()
  const layoutSource = readOrderTableLayoutSource()

  assert.equal(source.includes('64px 256px'), false)
  assert.equal(source.includes('const tableColumns ='), false)
  assert.equal(layoutSource.includes('minmax(160px, 1fr)'), false)
  assert.equal(layoutSource.includes('minmax(178px, 1.05fr)'), true)
  assert.equal(layoutSource.includes('minmax(210px, 1.15fr)'), true)
  assert.equal(source.includes("justifySelf: 'center'"), true)
  assert.equal(source.includes("justifyContent: 'center'"), true)
})

test('case and actions columns stay compact and centered', () => {
  const source = readOrdersPageSource()
  const layoutSource = readOrderTableLayoutSource()
  const otherActionsSource = source.slice(
    source.indexOf('function OrderOtherActions'),
    source.indexOf('function OrderRow'),
  )

  assert.equal(layoutSource.includes('minmax(112px, 0.68fr) minmax(112px, 0.68fr)'), false)
  assert.equal(layoutSource.includes('minmax(104px, 0.56fr) minmax(84px, 0.44fr)'), true)
  assert.equal(otherActionsSource.includes("justifyContent: 'center'"), true)
})

test('order table keeps header fixed and aligns header cells with row data', () => {
  const source = readOrdersPageSource()
  const layoutSource = readOrderTableLayoutSource()

  assert.equal(source.includes('const tableHeaders = ['), false)
  assert.equal(source.includes('orderTableHeaders'), true)
  assert.equal(layoutSource.includes("key: 'orderId', align: 'start'"), true)
  assert.equal(layoutSource.includes("key: 'customer', align: 'start'"), true)
  assert.equal(layoutSource.includes("key: 'basecost', align: 'end'"), true)
  assert.equal(source.includes('function OrdersTableBody'), true)
  assert.equal(source.includes("maxHeight: 'calc(100vh - 360px)'"), true)
  assert.equal(source.includes("overflowY: 'auto'"), true)
  assert.equal(source.includes("overflowX: 'visible'"), true)
})

test('order table uses a scoped grid component for header, rows, and skeletons', () => {
  const source = readOrdersPageSource()
  const gridUrl = new URL('../components/OrderTableGrid.jsx', import.meta.url)

  assert.equal(existsSync(gridUrl), true)
  assert.equal(source.includes("import OrderTableGrid from '@/features/orders/components/OrderTableGrid'"), true)
  assert.equal(source.includes('gridTemplateColumns: tableColumns'), false)
  assert.equal(source.match(/<OrderTableGrid/g)?.length, 3)
})

test('expanded order detail shares table horizontal padding', () => {
  const source = readOrdersPageSource()
  const layoutSource = readOrderTableLayoutSource()
  const gridSource = readFileSync(
    new URL('../components/OrderTableGrid.jsx', import.meta.url),
    'utf8',
  )
  const detailSource = source.slice(
    source.indexOf('function ExpandedOrderDetail'),
    source.indexOf('function OrdersTableSkeleton'),
  )

  assert.equal(layoutSource.includes('orderTablePaddingX'), true)
  assert.equal(gridSource.includes('px: orderTablePaddingX'), true)
  assert.equal(detailSource.includes('px: orderTablePaddingX'), true)
  assert.equal(detailSource.includes('px: 3'), false)
})

test('customer cell keeps buyer actions adjacent to the customer name', () => {
  const source = readOrdersPageSource()
  const customerCellSource = source.slice(
    source.indexOf('function CustomerCell'),
    source.indexOf('function OrderCaseAction'),
  )

  assert.equal(customerCellSource.includes('flex: 1'), false)
  assert.equal(customerCellSource.includes("maxWidth: 150"), true)
  assert.equal(customerCellSource.includes("justifyContent: 'flex-start'"), true)
  assert.equal(customerCellSource.includes('useValidateOrderAddressMutation'), false)
  assert.equal(customerCellSource.includes('FactCheckOutlinedIcon'), false)
  assert.equal(customerCellSource.includes('label="Validate"'), false)
  assert.equal(customerCellSource.includes('label="Buyer"'), true)
})

test('order case modal creates a real case instead of hardcoding case status', () => {
  const source = readOrdersPageSource()
  const modalSource = source.slice(
    source.indexOf('function OpenCaseModal'),
    source.indexOf('function OrderTimelineButton'),
  )

  assert.equal(source.includes('const caseOptions'), false)
  assert.equal(modalSource.includes('<Select'), false)
  assert.equal(modalSource.includes('<MenuItem'), false)
  assert.equal(modalSource.includes('useCreateOrderCaseMutation'), true)
  assert.equal(modalSource.includes('useUpdateOrderCaseStatusMutation'), false)
  assert.equal(modalSource.includes("caseStatus: 'OPEN'"), false)
  assert.equal(modalSource.includes('title:'), true)
  assert.equal(modalSource.includes('caseType:'), true)
  assert.equal(modalSource.includes('description:'), true)
})
