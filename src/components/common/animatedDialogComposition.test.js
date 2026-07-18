import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const source = readFileSync(new URL('./AnimatedDialog.jsx', import.meta.url), 'utf8')
const ordersSource = readFileSync(
  new URL('../../features/orders/pages/OrdersPage.jsx', import.meta.url),
  'utf8',
)

test('AnimatedDialog uses a shared slow open and close transition', () => {
  assert.equal(source.includes('Zoom'), true)
  assert.equal(source.includes('TransitionComponent={ZoomTransition}'), true)
  assert.equal(source.includes('transitionDuration = 220'), true)
})

test('OrdersPage modals use AnimatedDialog instead of raw Dialog', () => {
  assert.equal(
    ordersSource.includes("import AnimatedDialog from '@/components/common/AnimatedDialog'"),
    true,
  )
  assert.equal(ordersSource.includes('<AnimatedDialog'), true)
  assert.equal(ordersSource.includes('<Dialog'), false)
})
