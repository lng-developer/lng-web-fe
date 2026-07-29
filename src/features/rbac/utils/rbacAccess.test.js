import assert from 'node:assert/strict'
import test from 'node:test'

import { getRbacCapabilities } from './rbacAccess.js'

test('AUTH:READ grants view-only RBAC access', () => {
  assert.deepEqual(getRbacCapabilities({ permissions: ['AUTH:READ'] }), {
    canRead: true,
    canWrite: false,
  })
})

test('AUTH:WRITE grants mutation access', () => {
  assert.equal(getRbacCapabilities({ permissions: ['AUTH:READ', 'AUTH:WRITE'] }).canWrite, true)
})

test('MANAGE_SYSTEM keeps the established permission bypass', () => {
  assert.equal(getRbacCapabilities({ permissions: ['MANAGE_SYSTEM'] }).canWrite, true)
})
