import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import {
  buildTeamWorkspaceParams,
  getRotationAccess,
} from '@/features/hr/ScheduleCalendar/useScheduleCalendar'

describe('buildTeamWorkspaceParams', () => {
  it('allows rotation-only leaders to manage only their selected team', () => {
    const account = {
      permissions: [],
      roles: [],
      scopes: [
        {
          assignmentId: 'a',
          resourceId: 't1',
          roles: ['LEADER'],
          scopeType: 'team',
          scopeId: 't1',
          permissions: ['HR_SATURDAY_ROTATION:WRITE'],
        },
      ],
    }
    expect(getRotationAccess(account)).toEqual({ rotationTeamId: 't1', canManageRotation: true })
    expect(getRotationAccess(account, 't2').canManageRotation).toBe(false)
    expect(getRotationAccess({ ...account, scopes: [] }).canManageRotation).toBe(false)
  })
  it('includes the required calendar month and year when loading rotation staff', () => {
    expect(buildTeamWorkspaceParams(dayjs('2026-10-02'), 'team-sale-1')).toEqual({
      dateKey: '2026-10-02',
      year: 2026,
      month: 10,
      teamId: 'team-sale-1',
      days: 1,
    })
  })
})
