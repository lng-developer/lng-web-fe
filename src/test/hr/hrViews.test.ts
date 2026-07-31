import { describe, expect, it } from 'vitest'

import { getHrViews, getHrWorkspaces, hasHrAccess } from '@/features/hr/hrViews'

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
    expect(
      getHrWorkspaces(['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE']).map(({ key }) => key),
    ).toEqual(['self'])
    expect(
      getHrWorkspaces(['HR_ATTENDANCE:READ', 'HR_LEAVE:APPROVE']).map(({ key }) => key),
    ).toEqual(['team'])
    expect(
      getHrWorkspaces(['HR_EMPLOYEES:WRITE', 'HR_PAYROLL:READ']).map(({ key }) => key),
    ).toEqual(['operations', 'payroll'])
  })
})
