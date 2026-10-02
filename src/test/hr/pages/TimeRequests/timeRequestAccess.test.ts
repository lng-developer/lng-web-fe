import { describe, expect, it } from 'vitest'

import {
  getTimeRequestAccess,
  getTimeRequestParams,
} from '@/features/hr/pages/TimeRequests/timeRequestAccess'

describe('getTimeRequestAccess', () => {
  it('recognizes the backend HR_* permissions used by HR navigation', () => {
    expect(
      getTimeRequestAccess(['HR_LEAVE:WRITE', 'HR_OVERTIME:APPROVE'], 'operations'),
    ).toMatchObject({
      canLeaveWrite: true,
      canOvertimeWrite: false,
      canLeaveApprove: false,
      canOvertimeApprove: true,
      managerLeave: false,
      managerOvertime: true,
    })
  })

  it('keeps Personal requests private even when the employee can read their team queue', () => {
    expect(getTimeRequestAccess(['HR_LEAVE:READ'], 'personal').managerLeave).toBe(false)
    expect(getTimeRequestAccess(['HR_OVERTIME:READ'], 'personal').managerOvertime).toBe(false)
    expect(getTimeRequestAccess(['HR_LEAVE:READ'], 'team').managerLeave).toBe(true)
    expect(getTimeRequestAccess(['HR_OVERTIME:READ'], 'team').managerOvertime).toBe(true)
    expect(getTimeRequestAccess(['HR_LEAVE:READ'], 'operations').managerLeave).toBe(true)
    expect(getTimeRequestAccess(['HR_OVERTIME:READ'], 'operations').managerOvertime).toBe(true)
  })

  it('keeps Personal request params free of team scope', () => {
    expect(getTimeRequestParams('personal', 'team-sales')).toEqual({ limit: 100 })
    expect(getTimeRequestParams('team', 'team-sales')).toEqual({ limit: 100, teamId: 'team-sales' })
    expect(getTimeRequestParams('team')).toBeUndefined()
  })
})
