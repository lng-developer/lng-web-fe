import assert from 'node:assert/strict'
import test from 'node:test'

import { getListItems, mapWorkflowRows } from './apiWorkflowRows.js'

test('getListItems unwraps common API collection shapes', () => {
  assert.deepEqual(getListItems({ items: [{ id: 1 }] }), [{ id: 1 }])
  assert.deepEqual(getListItems({ rows: [{ id: 2 }] }), [{ id: 2 }])
  assert.deepEqual(getListItems({ results: [{ id: 3 }] }), [{ id: 3 }])
  assert.deepEqual(getListItems({ data: { items: [{ id: 4 }] } }), [{ id: 4 }])
})

test('mapWorkflowRows builds stable display rows from mixed backend records', () => {
  const rows = mapWorkflowRows([
    {
      _id: 'mongo-1',
      externalOrderId: 'AMZ-1',
      status: 'READY',
      vendor: { name: 'Vendor A' },
      updatedAt: '2026-07-15T01:02:03.000Z',
    },
  ])

  assert.deepEqual(rows[0], {
    id: 'mongo-1',
    title: 'AMZ-1',
    status: 'READY',
    owner: 'Vendor A',
    updatedAt: '2026-07-15T01:02:03.000Z',
    raw: {
      _id: 'mongo-1',
      externalOrderId: 'AMZ-1',
      status: 'READY',
      vendor: { name: 'Vendor A' },
      updatedAt: '2026-07-15T01:02:03.000Z',
    },
  })
})
