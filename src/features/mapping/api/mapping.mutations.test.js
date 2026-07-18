import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { getMappingFlowInvalidationKeys } from './mappingInvalidation.js'

test('mapping write actions refresh mapping, orders, and production flow data', () => {
  assert.deepEqual(getMappingFlowInvalidationKeys('order-item-1'), [
    ['mapping'],
    ['orders'],
    ['orders', 'items', 'order-item-1', 'readiness'],
    ['production'],
    ['production', 'order-item', 'order-item-1'],
  ])
})

test('vendor routing reorder mutation sends backend reorder body directly', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.equal(source.includes('orderedIds'), false)
  assert.equal(source.includes('patch(ENDPOINTS.MAPPING.VENDOR_ROUTING_REORDER, body)'), true)
})

test('vendor candidate search mutation calls mapping candidate search endpoint', () => {
  const source = readFileSync(new URL('./mapping.mutations.js', import.meta.url), 'utf8')

  assert.equal(source.includes('useMappingVendorCandidatesMutation'), true)
  assert.equal(
    source.includes('ENDPOINTS.MAPPING.ORDER_ITEM_VENDOR_CANDIDATES_SEARCH(orderItemId)'),
    true,
  )
})
