import dayjs from 'dayjs'
import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderFilterChips,
  buildOrdersUrl,
  buildSellerOptions,
  getOrdersChannel,
  getOrdersTab,
  readOrdersFilters,
} from './ordersFilters.js'

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

test('readOrdersFilters restores supported URL state and caps the page size', () => {
  const filters = readOrdersFilters(
    '?channel=amazon&search=mug&shopId=shop-1&seller=Lan&page=3&limit=500&dateFrom=2026-07-01&dateTo=2026-07-22',
  )

  assert.equal(getOrdersChannel('?channel=amazon'), 'amazon')
  assert.equal(getOrdersTab('?tab=openCase'), 'openCase')
  assert.equal(filters.search, 'mug')
  assert.equal(filters.channel, 'amazon')
  assert.equal(filters.shopId, 'shop-1')
  assert.equal(filters.seller, 'Lan')
  assert.equal(
    filters.dateRange.start.format('YYYY-MM-DD'),
    dayjs('2026-07-01').format('YYYY-MM-DD'),
  )
  assert.equal(filters.dateRange.end.format('YYYY-MM-DD'), dayjs('2026-07-22').format('YYYY-MM-DD'))
  assert.equal(filters.page, 3)
  assert.equal(filters.limit, 100)
})

test('buildOrdersUrl preserves unrelated params and removes default Orders values', () => {
  assert.equal(
    buildOrdersUrl('?debug=1&tab=exceptions&page=3', '/portal/orders', {
      tab: 'all',
      page: 1,
      limit: 10,
      channel: 'all',
      search: ' mug ',
    }),
    '/portal/orders?debug=1&search=mug',
  )
})
