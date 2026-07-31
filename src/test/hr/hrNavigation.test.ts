import { describe, expect, it } from 'vitest'

import { getDefaultHrPath, getHrNavigation } from '@/features/hr/hrNavigation'

describe('HR action navigation', () => {
  it('shows self-service routes without exposing manager operations', () => {
    const paths = getHrNavigation([
      'HR_ATTENDANCE:WRITE',
      'HR_LEAVE:WRITE',
      'HR_OVERTIME:WRITE',
    ]).map(({ path }) => path)

    expect(paths).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
    ])
    expect(getDefaultHrPath(['HR_ATTENDANCE:WRITE'])).toBe('/hr/me')
  })

  it('shows scoped team actions and organization operations independently', () => {
    expect(
      getHrNavigation(['HR_ATTENDANCE:READ', 'HR_LEAVE:APPROVE']).map(({ path }) => path),
    ).toEqual(['/hr/team', '/hr/team/attendance', '/hr/team/approvals', '/hr/team/members'])
    expect(getHrNavigation(['HR_EMPLOYEES:WRITE']).map(({ path }) => path)).toEqual([
      '/hr/operations',
      '/hr/operations/employees',
    ])
  })

  it('keeps payroll operations separate from personal payslips', () => {
    expect(getHrNavigation(['HR_PAYROLL:READ']).map(({ path }) => path)).toEqual(['/hr/payroll'])
  })
})
