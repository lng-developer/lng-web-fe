import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { filterNavigationByUser, SIDEBAR_NAVIGATION } from '../../../layouts/sidebarNavigation.js'
import {
  getCurrentUserAvatar,
  getCurrentUserDisplayName,
  getCurrentUserInitials,
  getCurrentUserRole,
  resolveCurrentUser,
} from './currentUser.js'

const adminMeResponse = {
  success: true,
  data: {
    account: {
      id: '6a2bb97c64ae65719d55e56d',
      email: 'admin@example.com',
      status: 'active',
    },
    profile: {
      id: '6a2bb97c64ae65719d55e56e',
      accountId: '6a2bb97c64ae65719d55e56d',
      email: 'admin@example.com',
      fullName: 'Admin User',
    },
    roles: ['ADMIN'],
    permissions: ['AUDIT:READ'],
    scopes: [
      {
        scopeType: 'global',
        roles: ['ADMIN'],
        permissions: ['AUDIT:READ'],
      },
    ],
  },
}

function collectLeafIds(items) {
  return items.flatMap((item) => {
    if (item.type === 'section') {
      return collectLeafIds(item.items)
    }

    if (item.children) {
      return collectLeafIds(item.children)
    }

    return [item.id]
  })
}

describe('current user utilities', () => {
  it('extracts display name email and role from the real /api/auth/me response', () => {
    const user = resolveCurrentUser(adminMeResponse)

    assert.deepEqual(user, {
      account: adminMeResponse.data.account,
      profile: adminMeResponse.data.profile,
      roles: ['ADMIN'],
      permissions: ['AUDIT:READ'],
      scopes: adminMeResponse.data.scopes,
    })
    assert.equal(getCurrentUserDisplayName(user), 'Admin User')
    assert.equal(getCurrentUserRole(user), 'admin')
    assert.equal(getCurrentUserAvatar(user), '')
    assert.equal(getCurrentUserInitials(getCurrentUserDisplayName(user)), 'AU')
  })

  it('extracts role and profile from inner login mutation data', () => {
    const user = resolveCurrentUser({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
      account: { email: 'admin@example.com' },
      profile: { fullName: 'Admin User', email: 'admin@example.com' },
      roles: ['ADMIN'],
      scopes: [],
    })

    assert.equal(getCurrentUserDisplayName(user), 'Admin User')
    assert.equal(getCurrentUserRole(user), 'admin')
  })

  it('falls back to profile email then account email for display name', () => {
    const user = resolveCurrentUser({
      data: {
        account: { email: 'account@example.com' },
        profile: { email: 'profile@example.com' },
        roles: ['CS'],
      },
    })

    assert.equal(getCurrentUserDisplayName(user), 'profile@example.com')
    assert.equal(getCurrentUserRole(user), 'cs')
  })

  it('falls back to first scoped role when data.roles is empty', () => {
    const user = resolveCurrentUser({
      data: {
        account: { email: 'qc@example.com' },
        profile: { fullName: 'QC User' },
        roles: [],
        scopes: [{ roles: ['QC'] }],
      },
    })

    assert.equal(getCurrentUserRole(user), 'qc')
  })

  it('supports legacy flat user response shape without breaking callers', () => {
    const user = resolveCurrentUser({
      data: {
        user: {
          name: 'Designer One',
          role: 'DESIGNER',
          avatarUrl: '/designer.png',
        },
      },
    })

    assert.equal(getCurrentUserDisplayName(user), 'Designer One')
    assert.equal(getCurrentUserRole(user), 'designer')
    assert.equal(getCurrentUserAvatar(user), '/designer.png')
  })

  it('maps ADMIN account payload to the full admin sidebar', () => {
    const user = resolveCurrentUser({
      data: {
        ...adminMeResponse.data,
        permissions: ['MANAGE_SYSTEM'],
      },
    })
    const role = getCurrentUserRole(user)
    const leafIds = collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, user))

    assert.equal(role, 'admin')
    assert.equal(leafIds.includes('dashboard'), true)
    assert.equal(leafIds.includes('api-coverage'), true)
    assert.equal(leafIds.includes('audit-log'), true)
    assert.equal(leafIds.includes('amazon-orders-cost-report'), false)
    assert.equal(leafIds.includes('template-center'), false)
  })

  it('maps DESIGNER account payload to design sidebar only', () => {
    const user = resolveCurrentUser({ data: { roles: ['DESIGNER'], permissions: ['DESIGN:WORK'] } })

    assert.deepEqual(collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, user)), [
      'dashboard',
      'design-task-list',
      'hr-payslips',
    ])
  })

  it('maps QC account payload to QC sidebar only', () => {
    const user = resolveCurrentUser({ data: { roles: ['QC'], permissions: ['DESIGN:REVIEW'] } })

    assert.deepEqual(collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, user)), [
      'dashboard',
      'quality-control',
      'design-task-list',
      'hr-payslips',
    ])
  })

  it('maps FULFILLMENT account payload to scale and shipping sidebar', () => {
    const user = resolveCurrentUser({
      data: { roles: ['FULFILLMENT'], permissions: ['PRODUCTION:READ', 'SHIPMENTS:READ'] },
    })

    assert.deepEqual(collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, user)), [
      'dashboard',
      'scale-production',
      'quality-control',
      'shipping',
      'hr-payslips',
    ])
  })

  it('maps CS account payload to sales customers and CS sidebar', () => {
    const user = resolveCurrentUser({
      data: { roles: ['CS'], permissions: ['ORDERS:READ', 'CATALOG:READ'] },
    })

    assert.deepEqual(collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, user)), [
      'dashboard',
      'orders-all',
      'listings',
      'product-types',
      'internal-templates',
      'hr-payslips',
    ])
  })

  it('returns empty values when response is missing', () => {
    assert.equal(resolveCurrentUser(null), null)
    assert.equal(getCurrentUserDisplayName(null), '')
    assert.equal(getCurrentUserRole(null), '')
    assert.equal(getCurrentUserAvatar(null), '')
    assert.equal(getCurrentUserInitials(''), 'U')
  })
})
