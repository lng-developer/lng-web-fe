import dayjs from 'dayjs'
import { describe, expect, it } from 'vitest'

import { buildTeamWorkspaceParams } from '@/features/hr/ScheduleCalendar/useScheduleCalendar'

describe('buildTeamWorkspaceParams', () => {
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
