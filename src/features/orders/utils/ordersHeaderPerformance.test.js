import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('orders tab header does not force synchronous full-page renders', () => {
  const source = readFileSync(new URL('../pages/OrdersPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('flushSync'), false)
  assert.equal(source.includes('useTransition'), false)
  assert.equal(source.includes('queryTab'), false)
  assert.equal(source.includes('useDeferredValue'), true)
  assert.equal(source.includes('const deferredTableState = useDeferredValue(tableState)'), true)
  assert.equal(source.includes('const OrdersTable = memo(function OrdersTable'), true)
  assert.equal(
    source.includes('const ExpandedOrderDetail = memo(function ExpandedOrderDetail'),
    true,
  )
  assert.equal(source.includes('const OrderCaseAction = memo(function OrderCaseAction'), true)
  assert.equal(source.includes('const VendorMatchSummary = memo(function VendorMatchSummary'), true)
  assert.equal(source.includes('const InlineVendorMatch = memo(function InlineVendorMatch'), true)
  assert.equal(source.includes('editingVendorMatch ? ('), true)
})
