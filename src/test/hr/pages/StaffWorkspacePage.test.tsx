import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getMyHrWorkspace } from '@/features/hr/api/hrTimeApi'
import { StaffWorkspacePage } from '@/features/hr/pages/StaffWorkspacePage'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/hr/api/hrTimeApi', () => ({
  getMyHrWorkspace: vi.fn(),
  checkIn: vi.fn(),
  checkOut: vi.fn(),
}))

describe('StaffWorkspacePage', () => {
  const dateKey = dayjs().format('YYYY-MM-DD')
  const attendanceDateKey = dayjs().date(2).format('YYYY-MM-DD')
  const leaveDateKey = dayjs().date(3).format('YYYY-MM-DD')
  const holidayDateKey = dayjs().date(4).format('YYYY-MM-DD')
  let workspaceData: Awaited<ReturnType<typeof getMyHrWorkspace>>

  beforeEach(async () => {
    queryClient.clear()
    setPermissions(['HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE'])
    window.localStorage.setItem('lng.language', 'en')
    await i18n.changeLanguage('en')
    workspaceData = {
      dateKey,
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
          workDateKey: dateKey,
          isWorkingDay: true,
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
        },
        attendance: null,
      },
      schedule: [],
      calendar: [
        {
          workDateKey: attendanceDateKey,
          status: 'WORKING_DAY',
          isWorkingDay: true,
          shift: { name: 'Day', startTime: '08:00', endTime: '17:00' },
          workLocation: { name: 'Office' },
          attendance: {
            id: 'attendance-1',
            profileId: 'profile-1',
            workDateKey: attendanceDateKey,
            status: 'LATE',
            workDayValue: 1,
            checkInAt: `${attendanceDateKey}T08:12:00`,
            checkOutAt: `${attendanceDateKey}T17:05:00`,
            lateMinutes: 12,
            earlyLeaveMinutes: 0,
            workedMinutes: 533,
          },
          leave: [],
          overtime: [
            {
              id: 'ot-1',
              profileId: 'profile-1',
              workDateKey: attendanceDateKey,
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
          workDateKey: leaveDateKey,
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
              startDateKey: leaveDateKey,
              endDateKey: leaveDateKey,
              requestedUnits: 1,
              reason: '',
              status: 'APPROVED',
            },
          ],
          overtime: [],
        },
        {
          workDateKey: holidayDateKey,
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
    }
    vi.mocked(getMyHrWorkspace).mockResolvedValue(workspaceData)
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
    expect(screen.getByText(/1[,.]100/)).toBeVisible()
  })

  it('translates request statuses and leave types in the my requests card', async () => {
    await i18n.changeLanguage('vi')
    vi.mocked(getMyHrWorkspace).mockResolvedValue({
      ...workspaceData,
      leave: {
        ...workspaceData.leave,
        requests: [
          {
            id: 'leave-cancelled',
            profileId: 'profile-1',
            leaveType: 'ANNUAL',
            portion: 'FULL_DAY',
            startDateKey: leaveDateKey,
            endDateKey: leaveDateKey,
            requestedUnits: 1,
            reason: '',
            status: 'CANCELLED',
          },
          {
            id: 'leave-pending',
            profileId: 'profile-1',
            leaveType: 'ANNUAL',
            portion: 'FULL_DAY',
            startDateKey: leaveDateKey,
            endDateKey: leaveDateKey,
            requestedUnits: 1,
            reason: '',
            status: 'PENDING',
          },
        ],
      },
      overtime: {
        requests: [
          {
            id: 'overtime-pending',
            profileId: 'profile-1',
            workDateKey: attendanceDateKey,
            plannedStartTime: '17:30',
            plannedEndTime: '19:00',
            requestedMinutes: 90,
            approvedMinutes: null,
            reason: '',
            status: 'PENDING',
          },
        ],
      },
    })

    render(
      <MemoryRouter>
        <AppProviders>
          <StaffWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Đã huỷ')).toBeVisible()
    expect(screen.getAllByText('Đang chờ')).toHaveLength(2)
    expect(screen.getAllByText('Nghỉ phép năm')).toHaveLength(2)
    expect(screen.queryByText('CANCELLED')).not.toBeInTheDocument()
    expect(screen.queryByText('PENDING')).not.toBeInTheDocument()
    expect(screen.queryByText('ANNUAL')).not.toBeInTheDocument()
  })

  it('shows monthly attendance, leave, overtime and holiday events in a calendar', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <StaffWorkspacePage view="schedule" />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByLabelText('Monthly schedule calendar')).toBeVisible()
    expect(screen.queryByText('Jane Nguyen')).not.toBeInTheDocument()
    expect((await screen.findAllByText('08:12 - 17:05'))[0]).toBeVisible()
    expect((await screen.findAllByText('Late 12 min'))[0]).toBeVisible()
    expect((await screen.findAllByText('90 min overtime'))[0]).toBeVisible()
    expect((await screen.findAllByText('Annual leave'))[0]).toBeVisible()
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

    fireEvent.click(
      await screen.findByRole('button', { name: dayjs(attendanceDateKey).format('DD/MM/YYYY') }),
    )
    expect(screen.getByRole('button', { name: /Request OT/ })).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /Request leave/i }))

    expect(await screen.findByRole('dialog')).toBeInTheDocument()
    expect(screen.getAllByDisplayValue(dayjs(attendanceDateKey).format('DD/MM/YYYY'))).toHaveLength(
      2,
    )
  })
})
