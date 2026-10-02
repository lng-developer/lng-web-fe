import { describe, expect, it } from 'vitest'

import { getDefaultHrPath, getHrNavigation } from '@/features/hr/hrNavigation'

const hrAccess = (
  globalPermissions: string[] = [],
  teamPermissions: string[] = [],
  teamIds: string[] = [],
) => ({
  globalPermissions,
  teamPermissions,
  teamIds,
})

describe('HR action navigation', () => {
  it('shows only self-service navigation without HR permissions', () => {
    expect(getHrNavigation(hrAccess()).map(({ path }) => path)).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
    ])
    expect(getDefaultHrPath(hrAccess())).toBe('/hr/me')
  })

  it('shows self-service routes without exposing manager operations', () => {
    const paths = getHrNavigation(
      hrAccess(['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE']),
    ).map(({ path }) => path)

    expect(paths).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
    ])
    expect(getDefaultHrPath(hrAccess(['HR_ATTENDANCE:WRITE']))).toBe('/hr/me')
  })

  it('shows scoped team actions and organization operations independently', () => {
    expect(
      getHrNavigation(hrAccess([], ['HR_ATTENDANCE:READ', 'HR_LEAVE:READ'], ['team-sales'])).map(
        ({ path }) => path,
      ),
    ).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
      '/hr/team',
      '/hr/team/attendance',
      '/hr/team/requests',
      '/hr/team/members',
    ])
    expect(getHrNavigation(hrAccess(['HR_EMPLOYEES:WRITE'])).map(({ path }) => path)).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
      '/hr/operations',
      '/hr/operations/employees',
    ])
  })

  it('keeps payroll operations separate from personal payslips', () => {
    expect(getHrNavigation(hrAccess(['HR_PAYROLL:READ'])).map(({ path }) => path)).toEqual([
      '/hr/me',
      '/hr/me/schedule',
      '/hr/me/attendance',
      '/hr/me/requests',
      '/hr/me/payroll',
      '/hr/me/profile',
      '/hr/payroll',
    ])
  })
})
