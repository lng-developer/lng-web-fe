import { describe, expect, it } from 'vitest'

import {
  getAvailableCores,
  getContextNavigation,
  getCoreForPath,
  getDefaultWorkspacePath,
  getNavigationGroupForItem,
} from '@/app/layout/appNavigation'
import type { CurrentAccount } from '@/features/auth/api/authApi'

const account = (permissions: string[], scopedPermissions: string[] = []): CurrentAccount => ({
  account: { id: 'account-1', email: 'user@lng.co', mustChangePassword: false },
  roles: [],
  permissions,
  scopes: scopedPermissions.length
    ? [
        {
          assignmentId: 'assignment-1',
          scopeType: 'team',
          scopeId: 'team-1',
          resourceId: 'team-1',
          roles: [],
          permissions: scopedPermissions,
        },
      ]
    : [],
  profileSetupRequired: false,
})

describe('app navigation', () => {
  it('shows only cores backed by permitted routes', () => {
    expect(getAvailableCores(account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key)).toEqual([
      'hr',
    ])
    expect(getAvailableCores(account(['AUTH:READ'])).map(({ key }) => key)).toEqual(['system'])
    expect(
      getAvailableCores(account(['HR_ATTENDANCE:WRITE', 'AUTH:READ'])).map(({ key }) => key),
    ).toEqual(['hr', 'system'])
  })

  it('maps nested organization and account routes to their owning core', () => {
    expect(getCoreForPath('/organization')).toBe('hr')
    expect(getCoreForPath('/auth/accounts/account-1')).toBe('system')
    expect(getCoreForPath('/auth/access-control')).toBe('system')
  })

  it('keeps staff navigation personal and exposes scoped manager groups', () => {
    expect(
      getContextNavigation('hr', account(['HR_ATTENDANCE:WRITE'])).map(({ key }) => key),
    ).toEqual(['personal'])
    expect(
      getContextNavigation('hr', account([], ['HR_ATTENDANCE:READ'])).map(({ key }) => key),
    ).toEqual(['team'])
  })

  it('groups organization under HR and chooses the first permitted route', () => {
    const organizationAccount = account(['DEPARTMENTS:READ'])
    expect(getContextNavigation('hr', organizationAccount)).toMatchObject([
      { key: 'operations', items: [{ path: '/organization' }] },
    ])
    expect(getDefaultWorkspacePath(organizationAccount)).toBe('/organization')
  })

  it('shows read-only HR operations when employee read access is granted', () => {
    const groups = getContextNavigation('hr', account(['HR_EMPLOYEES:READ']))
    expect(groups.find(({ key }) => key === 'operations')?.items).toContainEqual(
      expect.objectContaining({
        key: 'operations-employees',
        path: '/hr/operations/employees',
      }),
    )
  })

  it('chooses the highest-priority HR workspace on first visit', () => {
    expect(getDefaultWorkspacePath(account(['HR_EMPLOYEES:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/operations',
    )
    expect(getDefaultWorkspacePath(account(['HR_PAYROLL:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/payroll',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE']))).toBe(
      '/hr/team',
    )
    expect(getDefaultWorkspacePath(account(['HR_ATTENDANCE:WRITE']))).toBe('/hr/me')
    expect(getDefaultWorkspacePath(account(['AUTH:READ']))).toBe('/auth/accounts')
  })

  it('finds the workspace group that owns a navigation item', () => {
    const groups = getContextNavigation('hr', account(['HR_LEAVE:READ']))
    expect(getNavigationGroupForItem(groups, 'team-approvals')).toBe('team')
    expect(getNavigationGroupForItem(groups, 'missing')).toBeUndefined()
  })

  it('uses context-specific labels for each HR workspace root', () => {
    const groups = getContextNavigation(
      'hr',
      account(['HR_ATTENDANCE:WRITE', 'HR_ATTENDANCE:READ', 'HR_EMPLOYEES:READ']),
    )
    expect(groups.find(({ key }) => key === 'personal')?.items[0].labelKey).toBe(
      'shell.navigation.myDay',
    )
    expect(groups.find(({ key }) => key === 'team')?.items[0].labelKey).toBe(
      'shell.navigation.teamOverview',
    )
    expect(groups.find(({ key }) => key === 'operations')?.items[0].labelKey).toBe(
      'shell.navigation.hrOverview',
    )
  })
})
