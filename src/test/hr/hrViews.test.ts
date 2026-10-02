import { describe, expect, it } from 'vitest'

import {
  getHrAccess,
  getHrViews,
  getHrWorkspaces,
  getSelectedHrTeamId,
  hasHrAccess,
} from '@/features/hr/hrViews'

const hrAccess = (
  globalPermissions: string[] = [],
  teamPermissions: string[] = [],
  teamIds: string[] = [],
) => ({
  globalPermissions,
  teamPermissions,
  teamIds,
})

describe('HR view permissions', () => {
  it('shows only HR workspaces granted by backend permissions', () => {
    expect(getHrViews(['HR_SCHEDULE:READ', 'HR_CALENDAR:WRITE']).map(({ key }) => key)).toEqual([
      'schedule',
    ])
    expect(getHrViews(['HR_LEAVE:WRITE', 'HR_OVERTIME:APPROVE']).map(({ key }) => key)).toEqual([
      'requests',
    ])
    expect(
      getHrViews(['HR_EMPLOYEES:READ', 'HR_ANNOUNCEMENTS:READ']).map(({ key }) => key),
    ).toEqual(['people', 'overview'])
  })

  it('allows the HR module for any HR permission', () => {
    expect(hasHrAccess(['HR_ATTENDANCE:READ'])).toBe(true)
    expect(hasHrAccess(['AUTH:READ'])).toBe(false)
  })

  it('groups access into personal, scoped team, operations, and payroll workspaces', () => {
    expect(getHrWorkspaces(hrAccess()).map(({ key }) => key)).toEqual(['self'])
    expect(
      getHrWorkspaces(hrAccess(['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE'])).map(({ key }) => key),
    ).toEqual(['self'])
    expect(
      getHrWorkspaces(hrAccess([], ['HR_ATTENDANCE:READ', 'HR_LEAVE:READ'], ['team-sales'])).map(
        ({ key }) => key,
      ),
    ).toEqual(['self', 'team'])
    expect(
      getHrWorkspaces(hrAccess(['HR_EMPLOYEES:WRITE', 'HR_PAYROLL:READ'])).map(({ key }) => key),
    ).toEqual(['self', 'operations', 'payroll'])
    expect(
      getHrWorkspaces(hrAccess([], ['HR_EMPLOYEES:READ'], ['team-sales'])).map(({ key }) => key),
    ).toEqual(['self', 'team'])
  })

  it('derives eligible team IDs only from team scopes with HR read access', () => {
    const access = getHrAccess({
      permissions: [],
      scopes: [
        {
          assignmentId: 'scope-1',
          scopeType: 'team',
          scopeId: 'team-sales',
          resourceId: 'team-sales',
          roles: [],
          permissions: ['HR_ATTENDANCE:READ'],
        },
        {
          assignmentId: 'scope-2',
          scopeType: 'team',
          scopeId: 'team-design',
          resourceId: 'team-design',
          roles: [],
          permissions: ['ORDERS:READ'],
        },
      ],
    })

    expect(access.teamIds).toEqual(['team-sales'])
  })

  it('automatically selects one team but requires explicit selection for many teams', () => {
    expect(getSelectedHrTeamId(hrAccess([], [], ['team-sales']))).toBe('team-sales')
    expect(getSelectedHrTeamId(hrAccess([], [], ['team-sales', 'team-design']))).toBeUndefined()
    expect(
      getSelectedHrTeamId(hrAccess([], [], ['team-sales', 'team-design']), 'team-design'),
    ).toBe('team-design')
  })
})
