import { describe, expect, it } from 'vitest'

import type { NavigationGroup } from '@/app/layout/appNavigation'
import { getSidebarRouteState } from '@/app/layout/sidebarRouteState'

describe('getSidebarRouteState', () => {
  const groups: NavigationGroup[] = [
    {
      key: 'personal',
      labelKey: 'personal',
      items: [
        { key: 'self', path: '/hr/me', labelKey: 'overview' },
        { key: 'attendance', path: '/hr/me/attendance', labelKey: 'attendance' },
      ],
    },
  ]

  it('maps nested routes to their core and longest matching item', () => {
    expect(getSidebarRouteState('/hr/me/attendance/detail', groups)).toEqual({
      core: 'hr',
      selectedKey: 'attendance',
    })
  })

  it('maps organization and system routes to their owning core', () => {
    expect(getSidebarRouteState('/organization', [])).toEqual({
      core: 'hr',
      selectedKey: undefined,
    })
    expect(getSidebarRouteState('/auth/accounts/id', [])).toEqual({
      core: 'system',
      selectedKey: undefined,
    })
    expect(getSidebarRouteState('/portal/monitoring', [])).toEqual({
      core: 'system',
      selectedKey: undefined,
    })
  })

  it('normalizes legacy aliases so sidebar items match correctly', () => {
    const systemGroups: NavigationGroup[] = [
      {
        key: 'system-main',
        labelKey: 'system',
        items: [
          { key: 'monitoring', path: '/auth/monitoring', labelKey: 'monitoring' },
          { key: 'audit-log', path: '/auth/audit-log', labelKey: 'audit' },
        ],
      },
    ]

    expect(getSidebarRouteState('/portal/monitoring', systemGroups)).toEqual({
      core: 'system',
      selectedKey: 'monitoring',
    })
    expect(getSidebarRouteState('/portal/audit', systemGroups)).toEqual({
      core: 'system',
      selectedKey: 'audit-log',
    })
  })
})
