import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('orders tab header does not force synchronous full-page renders', () => {
  const pageSource = readFileSync(new URL('../pages/OrdersPage.jsx', import.meta.url), 'utf8')
  const tableSource = readFileSync(
    new URL('../components/OrdersTable.jsx', import.meta.url),
    'utf8',
  )
  const detailSource = readFileSync(
    new URL('../components/OrderExpandedDetail.jsx', import.meta.url),
    'utf8',
  )

  assert.equal(pageSource.includes('flushSync'), false)
  assert.equal(pageSource.includes('useTransition'), false)
  assert.equal(pageSource.includes('queryTab'), false)
  assert.equal(pageSource.includes('useDeferredValue'), true)
  assert.equal(pageSource.includes('const deferredTableState = useDeferredValue(tableState)'), true)
  assert.equal(pageSource.includes('orders={deferredTableState.orders}'), true)
  assert.equal(pageSource.includes('pagination={deferredTableState.pagination}'), true)
  assert.equal(tableSource.includes('const OrdersTable = memo(function OrdersTable'), true)
  assert.equal(
    detailSource.includes('const OrderExpandedDetail = memo(function OrderExpandedDetail'),
    true,
  )
  assert.equal(tableSource.includes('const OrderCaseAction = memo(function OrderCaseAction'), true)
  assert.equal(
    detailSource.includes('const VendorMatchSummary = memo(function VendorMatchSummary'),
    true,
  )
  assert.equal(
    detailSource.includes('const InlineVendorMatch = memo(function InlineVendorMatch'),
    true,
  )
  assert.equal(detailSource.includes('editingVendorMatch ? ('), true)
})
