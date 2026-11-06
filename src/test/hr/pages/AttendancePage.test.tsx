import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { listAttendance, listAttendanceMatrix, listMyAttendance } from '@/features/hr/api/hrTimeApi'
import { AttendancePage } from '@/features/hr/pages/Attendance/AttendancePage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrTimeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/hr/api/hrTimeApi')>()),
  listAttendance: vi.fn(),
  listAttendanceMatrix: vi.fn(),
  listMyAttendance: vi.fn(),
}))

describe('AttendancePage', () => {
  beforeEach(async () => {
    queryClient.clear()
    queryClient.setDefaultOptions({ queries: { retry: false } })
    setPermissions(['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE'])
    await i18n.changeLanguage('en')
    vi.mocked(listAttendanceMatrix).mockResolvedValue({})
    vi.mocked(listAttendance).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20, totalPages: 0 },
    })
    vi.mocked(listMyAttendance).mockResolvedValue({
      items: [],
      capabilities: { checkIn: true, checkOut: false },
    })
  })

  afterEach(() => {
    cleanup()
    setPermissions([])
  })

  it('places check-in and check-out actions in the attendance table header', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage />
        </AppProviders>
      </MemoryRouter>,
    )

    const tableTitle = await screen.findByRole('heading', { name: 'My attendance' })
    const tableHeader = tableTitle.closest('.ant-card-head')

    expect(tableHeader).not.toBeNull()
    expect(
      within(tableHeader as HTMLElement).getByRole('button', { name: /Check in$/ }),
    ).toBeVisible()
    expect(
      within(tableHeader as HTMLElement).getByRole('button', { name: /Check out$/ }),
    ).toBeVisible()
  })

  it("keeps Personal attendance on the employee's own records when they can read team attendance", async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() => expect(listMyAttendance).toHaveBeenCalled())

    expect(listAttendance).not.toHaveBeenCalled()
    expect(listAttendanceMatrix).not.toHaveBeenCalled()
  })

  it('uses the selected team ID only for Team attendance queries', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage workspace="team" teamId="team-sales" />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() => expect(listAttendance).toHaveBeenCalled())

    expect(listAttendance).toHaveBeenCalledWith(expect.objectContaining({ teamId: 'team-sales' }))
    expect(listAttendanceMatrix).toHaveBeenCalledWith(
      expect.objectContaining({ teamId: 'team-sales' }),
    )
  })

  it('displays dash for punctuality rate when records list is empty', async () => {
    vi.mocked(listMyAttendance).mockResolvedValue({
      items: [],
      capabilities: { checkIn: true, checkOut: false },
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() => {
      const punctualityLabel = screen.getByText('On-time punctuality')
      const statItem = punctualityLabel.closest('div')
      expect(statItem).not.toBeNull()
      expect(within(statItem!).getByText('—')).toBeVisible()
    })
  })

  it('displays error alert with retry button when records fail to load', async () => {
    vi.mocked(listMyAttendance).mockRejectedValue(new Error('Network disconnected'))

    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage />
        </AppProviders>
      </MemoryRouter>,
    )

    const alert = await screen.findByRole('alert')
    expect(alert).toBeVisible()
    expect(within(alert).getByText('Network disconnected')).toBeVisible()

    const retryBtn = within(alert).getByRole('button', { name: 'Retry' })
    expect(retryBtn).toBeVisible()

    await waitFor(() => {
      const punctualityLabel = screen.getByText('On-time punctuality')
      const statItem = punctualityLabel.closest('div')
      expect(within(statItem!).getByText('—')).toBeVisible()
    })
  })

  it('calculates punctuality rate correctly when attendance records exist', async () => {
    vi.mocked(listMyAttendance).mockResolvedValue({
      items: [
        {
          id: 'att-1',
          profileId: 'prof-1',
          workDateKey: '2026-11-01',
          status: 'PRESENT',
          lateMinutes: 0,
          checkInAt: '2026-11-01T08:30:00Z',
          checkOutAt: '2026-11-01T17:30:00Z',
        },
        {
          id: 'att-2',
          profileId: 'prof-1',
          workDateKey: '2026-11-02',
          status: 'PRESENT',
          lateMinutes: 15,
          checkInAt: '2026-11-02T08:45:00Z',
          checkOutAt: '2026-11-02T17:30:00Z',
        },
      ] as never,
      capabilities: { checkIn: false, checkOut: false },
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <AttendancePage />
        </AppProviders>
      </MemoryRouter>,
    )

    await waitFor(() => {
      const punctualityLabel = screen.getByText('On-time punctuality')
      const statItem = punctualityLabel.closest('div')
      expect(within(statItem!).getByText('50%')).toBeVisible()
    })
  })
})
