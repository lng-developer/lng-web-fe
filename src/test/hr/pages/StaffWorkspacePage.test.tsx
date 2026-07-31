import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getMyHrWorkspace } from '@/features/hr/api/hrTimeApi'
import { StaffWorkspacePage } from '@/features/hr/pages/StaffWorkspacePage'
import { setPermissions } from '@/shared/auth/session'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrTimeApi', () => ({
  getMyHrWorkspace: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}))

describe('StaffWorkspacePage', () => {
  beforeEach(() => {
    queryClient.clear()
    setPermissions(['HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE'])
    vi.mocked(getMyHrWorkspace).mockResolvedValue({
      dateKey: '2026-07-31',
      profile: {
        id: 'profile-1',
        employeeCode: 'J001',
        fullName: 'Jane Nguyen',
        departmentId: 'dep-1',
        teamId: 'team-1',
        jobTitle: 'Developer',
        status: 'ACTIVE',
      },
      today: {
        schedule: {
          workDateKey: '2026-07-31',
          isWorkingDay: true,
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
        },
        attendance: null,
      },
      schedule: [],
      calendar: [
        {
          workDateKey: '2026-07-02',
          status: 'WORKING_DAY',
          isWorkingDay: true,
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
          attendance: {
            id: 'attendance-1',
            profileId: 'profile-1',
            workDateKey: '2026-07-02',
            status: 'LATE',
            workDayValue: 1,
            checkInAt: '2026-07-02T08:12:00',
            checkOutAt: '2026-07-02T17:05:00',
            lateMinutes: 12,
            earlyLeaveMinutes: 0,
            workedMinutes: 533,
          },
          leave: [],
          overtime: [
            {
              id: 'ot-1',
              profileId: 'profile-1',
              workDateKey: '2026-07-02',
              plannedStartTime: '17:30',
              plannedEndTime: '19:00',
              requestedMinutes: 90,
              approvedMinutes: 90,
              reason: '',
              status: 'APPROVED',
            },
          ],
        },
        {
          workDateKey: '2026-07-03',
          status: 'WORKING_DAY',
          isWorkingDay: true,
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
          attendance: null,
          leave: [
            {
              id: 'leave-1',
              profileId: 'profile-1',
              leaveType: 'ANNUAL',
              portion: 'FULL_DAY',
              startDateKey: '2026-07-03',
              endDateKey: '2026-07-03',
              requestedUnits: 1,
              reason: '',
              status: 'APPROVED',
            },
          ],
          overtime: [],
        },
        {
          workDateKey: '2026-07-04',
          status: 'HOLIDAY',
          isWorkingDay: false,
          calendarOverride: { kind: 'HOLIDAY', name: 'Company holiday' },
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
          attendance: null,
          leave: [],
          overtime: [],
        },
      ],
      leave: { balances: [], availableUnits: 10, requests: [] },
      overtime: { requests: [] },
      latestPayroll: {
        id: 'pay-1',
        payrollRunId: 'run-1',
        profileId: 'profile-1',
        baseSalary: 1000,
        workDays: 22,
        grossIncome: 1200,
        totalDeductions: 100,
        netIncome: 1100,
        status: 'PAID',
      },
      announcements: [
        {
          id: 'notice-1',
          title: 'Office update',
          content: 'New policy',
          category: 'NEWS',
          priority: 'NORMAL',
          sendToAll: true,
          status: 'PUBLISHED',
          isPinned: false,
          scheduledAt: null,
          publishedAt: null,
        },
      ],
    })
  })
  afterEach(() => {
    cleanup()
    setPermissions([])
  })

  it('puts today, personal status, requests, payroll and announcements on one screen', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StaffWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Jane Nguyen')).toBeVisible()
    expect(screen.getByText('Day')).toBeVisible()
    expect(screen.getByText('Office update')).toBeVisible()
    expect(
      screen.getByText(
        (_, node) =>
          node?.classList.contains('ant-statistic-content') === true &&
          /1[,.]100/.test(node.textContent ?? ''),
      ),
    ).toBeVisible()
  })

  it('shows monthly attendance, leave, overtime and holiday events in a calendar', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StaffWorkspacePage view="schedule" />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Lịch làm việc theo tháng')).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Lịch của tôi' })).toBeVisible()
    expect(screen.queryByText('Jane Nguyen')).not.toBeInTheDocument()
    expect(screen.getAllByText('08:12 - 17:05')[0]).toBeVisible()
    expect(screen.getAllByText('Đi muộn 12 phút')[0]).toBeVisible()
    expect(screen.getAllByText('OT 90 min')[0]).toBeVisible()
    expect(screen.getByText('Nghỉ phép năm')).toBeVisible()
    expect(screen.getByText('Company holiday')).toBeVisible()
  })

  it('opens a prefilled leave request from the selected calendar day', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StaffWorkspacePage view="schedule" />
        </AppProviders>
      </MemoryRouter>,
    )

    fireEvent.click(await screen.findByRole('button', { name: '02/07/2026' }))
    expect(screen.getByRole('button', { name: /OT/ })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /nghỉ/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue('02/07/2026')).toHaveLength(2)
  })
})
