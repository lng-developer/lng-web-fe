import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterOrders,
  getDefaultExpandedOrderIds,
  getOrderTabCounts,
  getPaginationPages,
  toggleOrderSelection,
} from './ordersDisplay.js'

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

test('getDefaultExpandedOrderIds opens every order row by default', () => {
  assert.deepEqual(getDefaultExpandedOrderIds(orders), ['A-100', 'E-200'])
})

test('getDefaultExpandedOrderIds prefers internal api ids over display order ids', () => {
  assert.deepEqual(
    getDefaultExpandedOrderIds([
      { apiId: 'mongo-order-1', id: '113-duplicate' },
      { apiId: 'mongo-order-2', id: '113-duplicate' },
    ]),
    ['mongo-order-1', 'mongo-order-2'],
  )
})

test('getPaginationPages keeps the current page visible for later pages', () => {
  assert.deepEqual(getPaginationPages(6, 10), [1, '...', 5, 6, 7, '...', 10])
  assert.deepEqual(getPaginationPages(2, 4), [1, 2, 3, 4])
  assert.deepEqual(getPaginationPages(10, 10), [1, '...', 9, 10])
})
