import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildScopedOverrideSections,
  buildScopedRulePayload,
  filterOverrideRoles,
  getAvailableOverridePermissions,
  getOverrideRoleCode,
  getScopeMatrixCell,
} from './scopedOverridesDisplay.js'

const roles = [
  { id: 'admin-id', code: 'ADMIN', name: 'Admin', permissions: ['p1', 'p2'] },
  { id: 'manager-id', code: 'MANAGER', name: 'Manager', permissions: ['p1'] },
  { id: 'anon-id', code: 'ANONYMOUS', name: 'Anonymous', permissions: [] },
]

const permissions = [
  { id: 'p1', code: 'READ_USERS', name: 'Read users' },
  { id: 'p2', code: 'WRITE_USERS', name: 'Write users' },
  { id: 'p3', code: 'APPROVE_LEAVE', name: 'Approve leave' },
]

test('filterOverrideRoles filters by role code and keeps all roles when empty', () => {
  assert.deepEqual(
    filterOverrideRoles(roles, '').map((role) => role.id),
    ['admin-id', 'manager-id', 'anon-id'],
  )
  assert.deepEqual(
    filterOverrideRoles(roles, 'MANAGER').map((role) => role.id),
    ['manager-id'],
  )
})

test('getOverrideRoleCode supports common backend role fields', () => {
  assert.equal(getOverrideRoleCode({ code: 'manager' }), 'MANAGER')
  assert.equal(getOverrideRoleCode({ roleCode: 'leader' }), 'LEADER')
  assert.equal(getOverrideRoleCode({ role: 'staff' }), 'STAFF')
})

test('buildScopedOverrideSections joins roles with default permissions and scoped rules', () => {
  const sections = buildScopedOverrideSections({
    roles,
    permissions,
    rules: [
      {
        id: 'rule-1',
        roleId: 'manager-id',
        scopeType: 'department',
        scopeId: 'dept-id',
        scope: { name: 'QC' },
        permissionIds: ['p3'],
        permissionDetails: [{ id: 'p3', code: 'APPROVE_LEAVE', name: 'Approve leave' }],
      },
    ],
  })

  const manager = sections.find((section) => section.roleId === 'manager-id')
  assert.deepEqual(
    manager.defaultPermissions.map((permission) => permission.id),
    ['p1'],
  )
  assert.equal(manager.overrideGroups[0].scopeLabel, "DEPARTMENT 'QC'")
  assert.deepEqual(
    manager.overrideGroups[0].permissions.map((permission) => permission.id),
    ['p3'],
  )
})

test('getAvailableOverridePermissions exposes the full replacement permission set', () => {
  assert.deepEqual(
    getAvailableOverridePermissions({
      permissions,
      role: roles[1],
      rule: { permissionIds: ['p3'] },
    }).map((permission) => permission.id),
    ['p1', 'p2', 'p3'],
  )
})

test('buildScopedRulePayload matches PUT /api/auth/scoped-role-permissions contract', () => {
  assert.deepEqual(
    buildScopedRulePayload({
      role: roles[1],
      scope: { scopeType: 'department', scopeId: 'dept-id' },
      permissionIds: ['p3', '', 'p2'],
    }),
    {
      roleId: 'manager-id',
      scopeType: 'department',
      scopeId: 'dept-id',
      permissionIds: ['p3', 'p2'],
    },
  )
})

test('getScopeMatrixCell matches a role and scope without simulating permissions', () => {
  const cell = getScopeMatrixCell(
    [{ roleId: 'manager-id', scopeType: 'department', scopeId: 'dept-id', permissionIds: ['p3'] }],
    roles[1],
    { scopeType: 'department', scopeId: 'dept-id' },
  )

  assert.equal(cell.hasReplacement, true)
  assert.equal(cell.permissionCount, 1)
  assert.equal(cell.rule.roleId, 'manager-id')
  assert.deepEqual(getScopeMatrixCell([], roles[1], { scopeType: 'team', scopeId: 'team-id' }), {
    hasReplacement: false,
    permissionCount: 0,
    rule: null,
  })
})
