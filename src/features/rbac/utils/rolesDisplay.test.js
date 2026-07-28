import assert from 'node:assert/strict'
import test from 'node:test'

import {
  filterPermissionsForRole,
  getDefaultPermissionMeta,
  getRolePermissionIds,
  groupPermissionsByModule,
} from './rolesDisplay.js'

test('getDefaultPermissionMeta detects full access and regular permission count', () => {
  assert.deepEqual(getDefaultPermissionMeta({ isFullAccess: true }, 142), {
    key: 'rbac.roles.fullAccess',
    count: 142,
  })

  assert.deepEqual(getDefaultPermissionMeta({ permissionCount: 24 }, 142), {
    key: 'rbac.roles.permissionCount',
    count: 24,
  })

  assert.deepEqual(getDefaultPermissionMeta({ permissions: ['a', 'b'] }, 142), {
    key: 'rbac.roles.permissionCount',
    count: 2,
  })
})

test('getRolePermissionIds supports role permission IDs and permission detail objects', () => {
  assert.deepEqual(getRolePermissionIds({ permissions: ['p1', 'p2'] }), ['p1', 'p2'])
  assert.deepEqual(
    getRolePermissionIds({ permissionDetails: [{ id: 'p1' }, { permissionId: 'p2' }] }),
    ['p1', 'p2'],
  )
})

test('getRolePermissionIds returns an empty list for a null role', () => {
  assert.deepEqual(getRolePermissionIds(null), [])
})

test('groupPermissionsByModule groups permissions by module label', () => {
  const grouped = groupPermissionsByModule([
    { id: 'p1', module: 'ACCOUNTS', name: 'Read account' },
    { id: 'p2', module: 'ACCOUNTS', name: 'Write account' },
    { id: 'p3', module: '', name: 'Other' },
  ])

  assert.deepEqual(
    grouped.map((group) => [group.module, group.permissions.map((permission) => permission.id)]),
    [
      ['ACCOUNTS MODULE', ['p1', 'p2']],
      ['OTHER MODULE', ['p3']],
    ],
  )
})

test('groupPermissionsByModule resolves effective permission codes through the catalog', () => {
  const grouped = groupPermissionsByModule(
    ['AUTH:READ', 'ORDERS:WRITE', 'AUTH:WRITE'],
    [{ code: 'ORDERS:WRITE', module: 'COMMERCE', name: 'Write orders' }],
  )

  assert.deepEqual(
    grouped.map((group) => [group.module, group.permissions.map((permission) => permission.code)]),
    [
      ['AUTH MODULE', ['AUTH:READ', 'AUTH:WRITE']],
      ['COMMERCE MODULE', ['ORDERS:WRITE']],
    ],
  )
})

test('filterPermissionsForRole searches by permission name and code', () => {
  const permissions = [
    { id: 'p1', code: 'READ_ACCOUNTS', name: 'Xem tài khoản' },
    { id: 'p2', code: 'WRITE_ORDERS', name: 'Quản lý đơn' },
  ]

  assert.deepEqual(
    filterPermissionsForRole(permissions, 'accounts').map((item) => item.id),
    ['p1'],
  )
  assert.deepEqual(
    filterPermissionsForRole(permissions, 'quản').map((item) => item.id),
    ['p2'],
  )
  assert.deepEqual(
    filterPermissionsForRole(permissions, '').map((item) => item.id),
    ['p1', 'p2'],
  )
})
