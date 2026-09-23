import { describe, expect, it } from 'vitest'

import { getTimeRequestAccess } from '@/features/hr/pages/TimeRequests/timeRequestAccess'

describe('getTimeRequestAccess', () => {
  it('recognizes the backend HR_* permissions used by HR navigation', () => {
    expect(getTimeRequestAccess(['HR_LEAVE:WRITE', 'HR_OVERTIME:APPROVE'])).toMatchObject({
      canLeaveWrite: true,
      canOvertimeWrite: false,
      canLeaveApprove: false,
      canOvertimeApprove: true,
      managerLeave: false,
      managerOvertime: true,
    })
  })

  it('allows a read permission to open the corresponding manager queue', () => {
    expect(getTimeRequestAccess(['HR_LEAVE:READ']).managerLeave).toBe(true)
    expect(getTimeRequestAccess(['HR_OVERTIME:READ']).managerOvertime).toBe(true)
  })
})
