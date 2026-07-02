import assert from 'node:assert/strict'
import test from 'node:test'

import { filterOrders, getOrderTabCounts, toggleOrderSelection } from './ordersDisplay.js'

const orders = [
  {
    id: 'A-100',
    tabKey: 'new',
    channel: 'amazon',
    shop: 'lng-group',
    seller: 'dao-quang-tung',
    customer: 'Ethan',
  },
  {
    id: 'E-200',
    tabKey: 'openCase',
    channel: 'etsy',
    shop: 'tan-tan',
    seller: 'dang-thanh-trung-cs',
    customer: 'Sophia',
  },
]

test('filterOrders combines tab, search, and dropdown filters', () => {
  assert.deepEqual(
    filterOrders(orders, {
      tab: 'new',
      search: 'a-100',
      channel: 'amazon',
      shop: 'all',
      seller: 'all',
    }).map((order) => order.id),
    ['A-100'],
  )

  assert.deepEqual(
    filterOrders(orders, {
      tab: 'new',
      search: 'sophia',
      channel: 'all',
      shop: 'all',
      seller: 'all',
    }),
    [],
  )
})

test('getOrderTabCounts includes all and per-status counts', () => {
  assert.deepEqual(getOrderTabCounts(orders), {
    all: 2,
    new: 1,
    openCase: 1,
  })
})

test('toggleOrderSelection adds and removes ids without duplicates', () => {
  assert.deepEqual(toggleOrderSelection(['A-100'], 'E-200'), ['A-100', 'E-200'])
  assert.deepEqual(toggleOrderSelection(['A-100', 'E-200'], 'A-100'), ['E-200'])
})
