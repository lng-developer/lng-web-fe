import assert from 'node:assert/strict'
import test from 'node:test'

import {
  canBypassPermissions,
  getUserPermissionCodes,
  hasAllPermissions,
  hasAnyPermission,
} from './authz.js'
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

test('permission helpers support any all and manage-system bypass', () => {
  const user = {
    permissions: ['DESIGN_TASKS:READ', 'DESIGN_TASKS:SUBMIT'],
  }

  assert.equal(hasAnyPermission(user, ['DESIGN_TASKS:APPROVE', 'DESIGN_TASKS:SUBMIT']), true)
  assert.equal(hasAnyPermission(user, ['DESIGN_TASKS:APPROVE']), false)
  assert.equal(hasAllPermissions(user, ['DESIGN_TASKS:READ', 'DESIGN_TASKS:SUBMIT']), true)
  assert.equal(hasAllPermissions(user, ['DESIGN_TASKS:READ', 'DESIGN_TASKS:APPROVE']), false)
  assert.equal(canBypassPermissions({ permissions: ['MANAGE_SYSTEM'] }), true)
  assert.equal(hasAllPermissions({ permissions: ['MANAGE_SYSTEM'] }, ['ANYTHING:WRITE']), true)
})
