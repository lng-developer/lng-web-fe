import assert from 'node:assert/strict'
import test from 'node:test'

import { getPaginationRange } from './scalePagination.js'

test('getPaginationRange returns an empty range when there are no tasks', () => {
  assert.deepEqual(getPaginationRange({ page: 1, pageSize: 10, total: 0 }), { from: 0, to: 0 })
})

test('getPaginationRange returns the first full page range', () => {
  assert.deepEqual(getPaginationRange({ page: 1, pageSize: 10, total: 23 }), { from: 1, to: 10 })
})

test('getPaginationRange returns a middle full page range', () => {
  assert.deepEqual(getPaginationRange({ page: 2, pageSize: 10, total: 23 }), {
    from: 11,
    to: 20,
  })
})

test('getPaginationRange caps the last page range at the total', () => {
  assert.deepEqual(getPaginationRange({ page: 3, pageSize: 10, total: 23 }), {
    from: 21,
    to: 23,
  })
})
