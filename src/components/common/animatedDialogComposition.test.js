import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./AnimatedDialog.jsx', import.meta.url), 'utf8')
const orderDialogsSource = readFileSync(
  new URL('../../features/orders/components/OrderDialogs.jsx', import.meta.url),
  'utf8',
)
const ordersControlsSource = readFileSync(
  new URL('../../features/orders/components/OrdersControls.jsx', import.meta.url),
  'utf8',
)
const ordersTableSource = readFileSync(
  new URL('../../features/orders/components/OrdersTable.jsx', import.meta.url),
  'utf8',
)

test('AnimatedDialog uses a shared slow open and close transition', () => {
  assert.equal(source.includes('Zoom'), true)
  assert.equal(source.includes('TransitionComponent={ZoomTransition}'), true)
  assert.equal(source.includes('transitionDuration = 220'), true)
})

test('Orders dialog owners use AnimatedDialog instead of raw Dialog', () => {
  assert.equal(
    orderDialogsSource.includes("import AnimatedDialog from '@/components/common/AnimatedDialog'"),
    true,
  )
  assert.equal((orderDialogsSource.match(/<AnimatedDialog/g) || []).length, 4)
  assert.equal(orderDialogsSource.includes('<Dialog'), false)
  assert.equal(ordersControlsSource.includes('ImportOrdersDialog'), true)
  assert.equal(ordersTableSource.includes('OpenCaseDialog'), true)
  assert.equal(ordersTableSource.includes('UpdateCustomerDialog'), true)
  assert.equal(ordersTableSource.includes('UpdateShippingDialog'), true)
})
