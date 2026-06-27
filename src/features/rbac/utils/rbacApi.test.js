import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildAccountCreatePayload,
  buildCleanQuery,
  buildPermissionPayload,
  buildRolePayload,
  buildScopedRolePermissionPayload,
  buildScopePayload,
  unwrapApiData,
} from './rbacApi.js'

test('buildCleanQuery removes empty search and caps limit at 100', () => {
  assert.deepEqual(
    buildCleanQuery({
      page: 1,
      limit: 500,
      search: '   ',
      status: '',
      roleId: 'abc',
    }),
    { page: 1, limit: 100, roleId: 'abc' },
  )
})

test('unwrapApiData returns nested data and supports direct payloads', () => {
  assert.deepEqual(unwrapApiData({ success: true, data: { items: [1] } }), { items: [1] })
  assert.deepEqual(unwrapApiData({ items: [2] }), { items: [2] })
})

test('buildAccountCreatePayload sends backend assignment field names', () => {
  assert.deepEqual(
    buildAccountCreatePayload({
      fullName: ' Nguyen Van A ',
      email: 'Admin@LNG.com ',
      password: '12345678',
      roleId: 'role-id',
      scopeType: 'global',
      customPermissionIds: ['p1', '', 'p2'],
    }),
    {
      fullName: 'Nguyen Van A',
      email: 'admin@lng.com',
      password: '12345678',
      assignments: [
        {
          roleId: 'role-id',
          scopeType: 'global',
          scopeId: null,
          customPermissionIds: ['p1', 'p2'],
        },
      ],
    },
  )
})

test('buildRolePayload normalizes code and permissionIds', () => {
  assert.deepEqual(
    buildRolePayload({
      code: ' manager ',
      name: ' Manager ',
      description: '',
      permissionIds: ['p1', '', 'p2'],
    }),
    {
      code: 'MANAGER',
      name: 'Manager',
      description: null,
      permissionIds: ['p1', 'p2'],
    },
  )
})

test('buildPermissionPayload derives code from action and module and strips UI-only fields', () => {
  assert.deepEqual(
    buildPermissionPayload({
      code: '',
      module: 'employees',
      action: 'read',
      name: ' Xem nhan vien ',
      description: '',
    }),
    {
      code: 'READ_EMPLOYEES',
      name: 'Xem nhan vien',
      description: null,
    },
  )
})

test('buildScopedRolePermissionPayload matches PUT /api/auth/scoped-role-permissions', () => {
  assert.deepEqual(
    buildScopedRolePermissionPayload({
      scopeType: 'team',
      scopeId: 'team-id',
      roleId: 'role-id',
      permissionIds: ['p1', '', 'p2'],
    }),
    {
      scopeType: 'team',
      scopeId: 'team-id',
      roleId: 'role-id',
      permissionIds: ['p1', 'p2'],
    },
  )
})

test('buildScopePayload matches backend create scope contract and strips UI-only fields', () => {
  assert.deepEqual(
    buildScopePayload({
      scopeType: 'team',
      scopeId: 'team-id',
      name: ' Print Team ',
      code: 'TEAM-PRINT',
      status: 'active',
    }),
    {
      scopeType: 'team',
      scopeId: 'team-id',
      name: 'Print Team',
    },
  )
})
