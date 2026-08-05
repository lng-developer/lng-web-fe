import { beforeEach, describe, expect, it } from 'vitest'

import type { NavigationGroup } from '@/app/layout/appNavigation'
import { getRememberedCoreRoute, rememberCoreRoute } from '@/app/layout/coreRouteMemory'

const hrGroups: NavigationGroup[] = [
  {
    key: 'personal',
    labelKey: 'personal',
    items: [
      { key: 'overview', path: '/hr/me', labelKey: 'overview' },
      { key: 'attendance', path: '/hr/me/attendance', labelKey: 'attendance' },
    ],
  },
]
const systemGroups: NavigationGroup[] = [
  {
    key: 'system',
    labelKey: 'system',
    items: [{ key: 'accounts', path: '/auth/accounts', labelKey: 'accounts' }],
  },
]

describe('core route memory', () => {
  beforeEach(() => localStorage.clear())

  it('remembers an exact permitted HR route', () => {
    rememberCoreRoute('hr', '/hr/me/attendance', hrGroups)
    expect(getRememberedCoreRoute('hr', hrGroups)).toBe('/hr/me/attendance')
  })

  it('falls back when a remembered route is no longer permitted', () => {
    localStorage.setItem('lng:last-route:hr', '/hr/operations/employees')
    expect(getRememberedCoreRoute('hr', hrGroups)).toBe('/hr/me')
  })

  it('stores the navigation base instead of a record identifier', () => {
    rememberCoreRoute('system', '/auth/accounts/account-id', systemGroups)
    expect(localStorage.getItem('lng:last-route:system')).toBe('/auth/accounts')
  })
})
