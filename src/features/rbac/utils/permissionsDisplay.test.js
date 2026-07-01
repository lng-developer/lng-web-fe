import assert from 'node:assert/strict'
import test from 'node:test'

import { buildPermissionCode, filterPermissionItems } from './permissionsDisplay.js'

test('filterPermissionItems filters by search, module, action, and status', () => {
  const permissions = [
    {
      id: 'p1',
      code: 'READ_ACCOUNTS',
      name: 'Xem tai khoan',
      description: 'Read account list',
      module: 'ACCOUNTS',
      action: 'READ',
      status: 'active',
    },
    {
      id: 'p2',
      code: 'WRITE_EMPLOYEES',
      name: 'Quan ly nhan vien',
      description: 'Update employee profiles',
      module: 'EMPLOYEES',
      action: 'WRITE',
      status: 'deprecated',
    },
    {
      id: 'p3',
      code: 'MANAGE_SYSTEM',
      name: 'Quan tri he thong',
      description: '',
      module: 'SYSTEM',
      action: 'MANAGE',
      status: 'active',
    },
  ]

  assert.deepEqual(
    filterPermissionItems(permissions, {
      search: 'employee',
      module: 'EMPLOYEES',
      action: 'WRITE',
      status: 'deprecated',
    }).map((permission) => permission.id),
    ['p2'],
  )

  assert.deepEqual(
    filterPermissionItems(permissions, {
      search: 'manage',
      module: '',
      action: '',
      status: 'active',
    }).map((permission) => permission.id),
    ['p3'],
  )
})

test('buildPermissionCode normalizes code from action and module when code is empty', () => {
  assert.equal(buildPermissionCode({ code: ' read_accounts ' }), 'READ_ACCOUNTS')
  assert.equal(
    buildPermissionCode({ code: '', action: 'write', module: 'employees' }),
    'WRITE_EMPLOYEES',
  )
})
