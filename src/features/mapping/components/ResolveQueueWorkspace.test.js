import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterResolveQueueRows,
  initialResolveQueueState,
  resolveQueueReducer,
} from '../utils/resolveQueueState.js'

test('keeps the selected order item trace visible while the resolve queue is filtered', () => {
  const selectedRow = {
    canonicalSku: 'J2501-BLK-M',
    id: 'item-729481',
    itemLabel: 'AMZ-729481',
    normalizedInputs: ['SKU: J2501-BLK-M'],
    orderLabel: 'ORDER-1',
  }
  const rows = [selectedRow, { id: 'item-2', itemLabel: 'AMZ-OTHER', canonicalSku: 'TS1-WHT-L' }]

  const selectedState = resolveQueueReducer(initialResolveQueueState, {
    row: selectedRow,
    type: 'select-row',
  })
  const filteredState = resolveQueueReducer(selectedState, {
    search: 'J2501',
    type: 'set-search',
  })

  assert.deepEqual(filterResolveQueueRows(rows, filteredState.resolveSearch), [selectedRow])
  assert.equal(filteredState.selectedRow.itemLabel, 'AMZ-729481')
  assert.deepEqual(filteredState.selectedRow.normalizedInputs, ['SKU: J2501-BLK-M'])
})
