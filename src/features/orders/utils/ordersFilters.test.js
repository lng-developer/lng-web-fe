import assert from 'node:assert/strict'
import test from 'node:test'

import { buildOrderFilterChips, buildSellerOptions } from './ordersFilters.js'

test('buildSellerOptions derives stable seller options from visible order rows', () => {
  assert.deepEqual(
    buildSellerOptions([
      { seller: 'Nguyen Duc Son' },
      { seller: 'Nguyen Duc Son' },
      { seller: 'J2508' },
      { seller: '' },
    ]),
    [
      { value: 'all', labelKey: 'orders.values.sellers.all' },
      { value: 'J2508', label: 'J2508' },
      { value: 'Nguyen Duc Son', label: 'Nguyen Duc Son' },
    ],
  )
})

test('buildOrderFilterChips only returns active operator filters', () => {
  assert.deepEqual(
    buildOrderFilterChips({
      search: 'mug',
      channel: 'amazon',
      shopId: 'all',
      seller: 'all',
    }),
    [
      { key: 'search', labelKey: 'orders.filters.search', value: 'mug' },
      { key: 'channel', labelKey: 'orders.filters.channel', value: 'amazon' },
    ],
  )
})
