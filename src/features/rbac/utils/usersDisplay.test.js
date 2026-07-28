import assert from 'node:assert/strict'
import test from 'node:test'

import {
  formatLastLoginLabel,
  getAccountAccessSummary,
  getAvatarMeta,
  getRoleMeta,
  getStatusMeta,
  normalizeRoleKey,
} from './usersDisplay.js'

test('getAccountAccessSummary keeps global and scoped access separate', () => {
  const result = getAccountAccessSummary({
    access: { roleIds: ['role-1'], customPermissionIds: ['permission-1'] },
    roles: ['ADMIN'],
    permissions: ['AUTH:READ'],
    effectiveRoles: ['ADMIN'],
    effectivePermissions: ['AUTH:READ', 'AUTH:WRITE'],
    scopes: [{ assignmentId: 'assignment-1', scopeType: 'team', scopeId: 'team-1' }],
  })

  assert.deepEqual(result.globalRoles, ['ADMIN'])
  assert.deepEqual(result.globalPermissions, ['AUTH:READ'])
  assert.deepEqual(result.globalRoleIds, ['role-1'])
  assert.deepEqual(result.globalPermissionIds, ['permission-1'])
  assert.deepEqual(
    result.scopedAssignments.map((item) => item.assignmentId),
    ['assignment-1'],
  )
  assert.deepEqual(result.effectivePermissions, ['AUTH:READ', 'AUTH:WRITE'])
})

test('normalizeRoleKey maps backend role codes to figma role keys', () => {
  assert.equal(normalizeRoleKey('SYSTEM_ADMIN'), 'admin')
  assert.equal(normalizeRoleKey('MANAGER'), 'manager')
  assert.equal(normalizeRoleKey('TEAM_LEADER'), 'leader')
  assert.equal(normalizeRoleKey('STAFF'), 'staff')
  assert.equal(normalizeRoleKey('ANONYMOUS'), 'anonymous')
})

test('getRoleMeta returns label and className for known roles', () => {
  assert.deepEqual(getRoleMeta('SYSTEM_ADMIN'), {
    key: 'admin',
    label: 'Admin',
    className: '!bg-primary-light !text-primary !border-primary',
  })
  assert.equal(getRoleMeta('UNKNOWN').label, 'Unknown')
})

test('getStatusMeta returns figma status labels and classes', () => {
  assert.equal(getStatusMeta('active').labelKey, 'rbac.users.status.active')
  assert.match(getStatusMeta('active').className, /!text-success/)
  assert.equal(getStatusMeta('inactive').labelKey, 'rbac.users.status.inactive')
  assert.match(getStatusMeta('inactive').className, /!text-warning/)
})

test('getAvatarMeta returns deterministic color and anonymous override', () => {
  assert.deepEqual(getAvatarMeta('Nguyễn Văn A', 0), {
    initials: 'NV',
    className: '!bg-primary-light !text-primary',
  })
  assert.deepEqual(getAvatarMeta('Khách (ẩn danh)', 4, true), {
    initials: 'KH',
    className: '!bg-page !text-ink-muted border border-border',
  })
})

test('formatLastLoginLabel returns relative labels and dash fallback', () => {
  const now = new Date('2026-06-26T10:00:00.000Z')

  assert.equal(formatLastLoginLabel(null, now), '—')
  assert.equal(formatLastLoginLabel('2026-06-26T09:58:00.000Z', now), '2 phút trước')
  assert.equal(formatLastLoginLabel('2026-06-26T09:00:00.000Z', now), '1 giờ trước')
  assert.equal(formatLastLoginLabel('2026-06-23T09:00:00.000Z', now), '3 ngày trước')
})

test('formatLastLoginLabel supports English labels', () => {
  const now = new Date('2026-06-26T10:00:00.000+07:00')

  assert.equal(formatLastLoginLabel('2026-06-26T09:59:00.000+07:00', now, 'en'), '1 minute ago')
  assert.equal(formatLastLoginLabel('2026-06-26T08:00:00.000+07:00', now, 'en'), '2 hours ago')
  assert.equal(formatLastLoginLabel('2026-06-25T08:00:00.000+07:00', now, 'en'), 'Yesterday, 08:00')
  assert.equal(formatLastLoginLabel('2026-06-23T08:00:00.000+07:00', now, 'en'), '3 days ago')
})
