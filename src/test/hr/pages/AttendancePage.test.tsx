import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen, within } from '@testing-library/react'
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

    const tableTitle = await screen.findByRole('heading', { name: 'Staff attendance' })
    const tableHeader = tableTitle.closest('.ant-card-head')

    expect(tableHeader).not.toBeNull()
    expect(
      within(tableHeader as HTMLElement).getByRole('button', { name: /Check in$/ }),
    ).toBeVisible()
    expect(
      within(tableHeader as HTMLElement).getByRole('button', { name: /Check out$/ }),
    ).toBeVisible()
  })
})
