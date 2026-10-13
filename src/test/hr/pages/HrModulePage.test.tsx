import { RouterProvider, createMemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { HrModulePage } from '@/features/hr/pages/HrModulePage'
import type { CurrentAccount } from '@/features/auth/api/authApi'

vi.mock('@/features/hr/pages/HrActionPage', () => ({
  HrActionPage: ({ routeKey }: { routeKey: string }) => <div>{routeKey}</div>,
}))
vi.mock('@/features/hr/pages/HrDashboardPage', () => ({
  HrDashboardPage: () => <div>dashboard</div>,
}))

const account = (permissions: string[] = [], scopedPermissions: string[] = []): CurrentAccount => ({
  account: { id: 'account-1', email: 'staff@example.test', mustChangePassword: false },
  roles: [],
  permissions,
  scopes: scopedPermissions.length
    ? [
        {
          assignmentId: 'scope-1',
          scopeType: 'team',
          scopeId: 'team-sales',
          resourceId: 'team-sales',
          roles: ['LEADER'],
          permissions: scopedPermissions,
        },
      ]
    : [],
  profileSetupRequired: false,
})

const renderPath = (path: string, currentAccount: CurrentAccount = account()) =>
  render(
    <AppProviders>
      <RouterProvider
        router={createMemoryRouter(
          [
            {
              id: 'workspace',
              path: '/hr/*',
              loader: () => currentAccount,
              Component: HrModulePage,
            },
          ],
          { initialEntries: [path] },
        )}
      />
    </AppProviders>,
  )

describe('HrModulePage routes', () => {
  afterEach(() => {
    cleanup()
  })

  it('opens a permitted focused action URL', async () => {
    renderPath('/hr/me/attendance', account(['HR_ATTENDANCE:WRITE']))

    expect(await screen.findByText('self-attendance')).toBeVisible()
  })

  it('delegates all HR navigation to the application sidebar', async () => {
    renderPath(
      '/hr/me',
      account([
        'HR_ATTENDANCE:WRITE',
        'HR_ATTENDANCE:READ',
        'HR_EMPLOYEES:READ',
        'HR_PAYROLL:READ',
      ]),
    )

    expect(await screen.findByText('self')).toBeVisible()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('removes the generic module header from the personal schedule route', async () => {
    renderPath(
      '/hr/me/schedule',
      account([
        'HR_ATTENDANCE:WRITE',
        'HR_ATTENDANCE:READ',
        'HR_EMPLOYEES:READ',
        'HR_PAYROLL:READ',
      ]),
    )

    expect(await screen.findByText('self-schedule')).toBeVisible()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('redirects an unavailable action to the first permitted workspace', async () => {
    renderPath('/hr/operations/employees', account(['HR_ATTENDANCE:READ']))

    expect(await screen.findByText('self')).toBeVisible()
  })

  it('redirects a scoped leader away from the global HR dashboard', async () => {
    renderPath('/hr/dashboard', account([], ['HR_EMPLOYEES:READ', 'HR_SCHEDULE:READ']))

    expect(await screen.findByText('self')).toBeVisible()
    expect(screen.queryByText('dashboard')).not.toBeInTheDocument()
  })

  it('allows employee self-service even without management permissions', async () => {
    setPermissions([])
    renderPath('/hr/me')

    expect(await screen.findByText('self')).toBeVisible()
  })

  it('routes bare /hr to self-service for standard accounts', async () => {
    setPermissions([])
    renderPath('/hr')

    expect(await screen.findByText('self')).toBeVisible()
  })

  it('routes bare /hr to dashboard for management accounts', async () => {
    setPermissions(['HR_EMPLOYEES:READ'])
    renderPath('/hr')

    expect(await screen.findByText(/HR Operations Dashboard/i)).toBeVisible()
  })
})
