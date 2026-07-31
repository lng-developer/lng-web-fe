import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getTeamHrWorkspace } from '@/features/hr/api/hrTimeApi'
import { TeamWorkspacePage } from '@/features/hr/pages/TeamWorkspacePage'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrTimeApi', () => ({
  getTeamHrWorkspace: vi.fn(),
  approveLeaveRequest: vi.fn(),
  rejectLeaveRequest: vi.fn(),
  approveOvertimeRequest: vi.fn(),
  rejectOvertimeRequest: vi.fn(),
}))

describe('TeamWorkspacePage', () => {
  beforeEach(() => {
    queryClient.clear()
    vi.mocked(getTeamHrWorkspace).mockResolvedValue({
      dateKey: '2026-07-31',
      profiles: {
        items: [
          {
            id: 'profile-1',
            employeeCode: 'J001',
            fullName: 'Jane Nguyen',
            jobTitle: 'Developer',
            status: 'ACTIVE',
          },
        ],
      },
      attendance: {
        items: [
          {
            id: 'attendance-1',
            profileId: 'profile-1',
            employee: { fullName: 'Jane Nguyen', employeeCode: 'J001' },
            workDateKey: '2026-07-31',
            status: 'PRESENT',
            workDayValue: 1,
            checkInAt: '2026-07-31T01:00:00Z',
            checkOutAt: null,
            lateMinutes: 0,
            earlyLeaveMinutes: 0,
            workedMinutes: 0,
          },
        ],
      },
      pendingLeaves: {
        items: [
          {
            id: 'leave-1',
            profileId: 'profile-1',
            employee: { fullName: 'Jane Nguyen' },
            leaveType: 'ANNUAL',
            portion: 'FULL_DAY',
            startDateKey: '2026-08-01',
            endDateKey: '2026-08-01',
            requestedUnits: 1,
            reason: 'Family',
            status: 'PENDING',
          },
        ],
      },
      pendingOvertime: { items: [] },
      assignments: { items: [] },
    })
  })
  afterEach(cleanup)

  it('groups team health, attendance, approvals and members on one screen', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <TeamWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findAllByText('Jane Nguyen')).not.toHaveLength(0)
    expect(screen.getByText('ANNUAL')).toBeVisible()
    expect(screen.getByText('J001')).toBeVisible()
  })
})
