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
