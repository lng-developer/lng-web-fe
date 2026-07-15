import assert from 'node:assert/strict'
import test from 'node:test'

import { getUserPermissionCodes } from './authz.js'
import { resolveCurrentUser } from './currentUser.js'

test('resolveCurrentUser preserves effective permissions returned by auth me', () => {
  const user = resolveCurrentUser({
    data: {
      account: { id: 'account-id' },
      roles: ['ADMIN'],
      permissions: ['PRODUCTION:WRITE', 'VENDOR_SUBMISSIONS:WRITE'],
      scopes: [],
    },
  })

  assert.deepEqual(user.permissions, ['PRODUCTION:WRITE', 'VENDOR_SUBMISSIONS:WRITE'])
})

test('getUserPermissionCodes includes permissions nested in auth scopes', () => {
  assert.deepEqual(
    getUserPermissionCodes({
      permissions: ['PRODUCTION:READ'],
      scopes: [{ permissions: ['DESIGN:REVIEW'] }],
    }).sort(),
    ['DESIGN:REVIEW', 'PRODUCTION:READ'],
  )
})
