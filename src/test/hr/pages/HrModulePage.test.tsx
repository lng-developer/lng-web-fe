import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { HrModulePage } from '@/features/hr/pages/HrModulePage'
import { setPermissions } from '@/shared/auth/session'

vi.mock('@/features/hr/pages/HrActionPage', () => ({
  HrActionPage: ({ routeKey }: { routeKey: string }) => <div>{routeKey}</div>,
}))

const renderPath = (path: string) =>
  render(
    <MemoryRouter initialEntries={[path]}>
      <AppProviders>
        <Routes>
          <Route path="/hr/*" element={<HrModulePage />} />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )

describe('HrModulePage routes', () => {
  afterEach(() => {
    cleanup()
    setPermissions([])
  })

  it('opens a permitted focused action URL', async () => {
    setPermissions(['HR_ATTENDANCE:WRITE'])
    renderPath('/hr/me/attendance')

    expect(await screen.findByText('self-attendance')).toBeVisible()
  })

  it('delegates all HR navigation to the application sidebar', async () => {
    setPermissions([
      'HR_ATTENDANCE:WRITE',
      'HR_ATTENDANCE:READ',
      'HR_EMPLOYEES:READ',
      'HR_PAYROLL:READ',
    ])
    renderPath('/hr/me')

    expect(await screen.findByText('self')).toBeVisible()
    expect(screen.queryAllByRole('tab')).toHaveLength(0)
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('removes the generic module header from the personal schedule route', async () => {
    setPermissions([
      'HR_ATTENDANCE:WRITE',
      'HR_ATTENDANCE:READ',
      'HR_EMPLOYEES:READ',
      'HR_PAYROLL:READ',
    ])
    renderPath('/hr/me/schedule')

    expect(await screen.findByText('self-schedule')).toBeVisible()
    expect(screen.queryByRole('heading', { level: 1 })).not.toBeInTheDocument()
  })

  it('redirects an unavailable action to the first permitted workspace', async () => {
    setPermissions(['HR_ATTENDANCE:READ'])
    renderPath('/hr/operations/employees')

    expect(await screen.findByText('team')).toBeVisible()
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
