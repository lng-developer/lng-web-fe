import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCreateShopPayload,
  buildShopListQuery,
  buildUpdateShopStatusPayload,
  mapShopResponse,
  mapShopsResponse,
} from './shopsApi.js'

test('buildShopListQuery keeps id search and uppercases status', () => {
  assert.deepEqual(
    buildShopListQuery({
      id: ' 660000000000000000000001 ',
      search: ' amazon ',
      status: 'active',
      page: 2,
      limit: 500,
    }),
    {
      id: '660000000000000000000001',
      search: 'amazon',
      status: 'ACTIVE',
      page: 2,
      limit: 100,
    },
  )
})

test('mapShopResponse normalizes shop row', () => {
  assert.deepEqual(
    mapShopResponse({
      id: 'shop-1',
      name: 'LNG Amazon US',
      currency: 'USD',
      status: 'ACTIVE',
      updatedAt: '2026-07-17T12:00:00.000Z',
    }),
    {
      id: 'shop-1',
      name: 'LNG Amazon US',
      currency: 'USD',
      status: 'ACTIVE',
      updatedAt: '2026-07-17T12:00:00.000Z',
      raw: {
        id: 'shop-1',
        name: 'LNG Amazon US',
        currency: 'USD',
        status: 'ACTIVE',
        updatedAt: '2026-07-17T12:00:00.000Z',
      },
    },
  )
})

test('mapShopsResponse normalizes pagination', () => {
  assert.deepEqual(
    mapShopsResponse({
      items: [{ id: 'shop-1' }],
      pagination: { page: 2, limit: 20, total: 30 },
    }).pagination,
    { page: 2, limit: 20, total: 30 },
  )
})

test('shop mutation payloads send only BE fields', () => {
  assert.deepEqual(buildCreateShopPayload({ name: ' LNG Amazon ', currency: ' usd ' }), {
    name: 'LNG Amazon',
    currency: 'USD',
  })
  assert.deepEqual(buildUpdateShopStatusPayload({ status: 'inactive' }), { status: 'INACTIVE' })
})
