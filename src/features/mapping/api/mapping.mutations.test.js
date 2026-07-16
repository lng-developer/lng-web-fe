import assert from 'node:assert/strict'
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
