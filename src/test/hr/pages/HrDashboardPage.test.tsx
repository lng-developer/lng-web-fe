import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { HrDashboardPage } from '@/features/hr/pages/HrDashboardPage'
import i18n from '@/shared/i18n/i18n'

const { mockHrDashboardData, mockAnnouncements, mockDepartments, mockProfiles } = vi.hoisted(
  () => ({
    mockHrDashboardData: {
      date: '2026-09-21',
      employees: {
        total: 85,
        active: 82,
        probation: 5,
        onLeave: 2,
      },
      attendance: {
        expectedEmployees: 80,
        records: 78,
        present: 75,
        late: 3,
        absent: 2,
        onLeave: 2,
        missingCheckOuts: 1,
        coverageRate: 94,
      },
      approvals: {
        pendingLeaves: 4,
        pendingOvertimes: 2,
        totalPending: 6,
        approvedOvertimesToday: 3,
      },
      operations: { attendanceExceptions: 4, pendingActions: 6 },
      payroll: {
        id: 'pay-1',
        month: 9,
        year: 2026,
        status: 'CALCULATED',
        resultCount: 82,
        finalizedAt: null,
        paidAt: null,
        pendingAdjustments: 3,
        summary: {
          total: 82,
          statusCounts: { CALCULATED: 82 },
          amounts: { grossIncome: 850000000, netIncome: 720000000 },
        },
      },
      announcements: {
        published: 3,
        scheduled: 0,
        pinned: 1,
        urgent: 1,
        dueReminders: 0,
      },
      attendanceTrend: [
        {
          date: '2026-09-15',
          records: 79,
          present: 77,
          late: 2,
          absent: 1,
          onLeave: 2,
          missingCheckOuts: 0,
          coverageRate: 97,
        },
        {
          date: '2026-09-16',
          records: 80,
          present: 78,
          late: 1,
          absent: 1,
          onLeave: 2,
          missingCheckOuts: 1,
          coverageRate: 98,
        },
      ],
    },
    mockAnnouncements: {
      items: [
        {
          id: 'ann-1',
          title: 'Company Outing 2026',
          content: 'All team members please register before Friday.',
          category: 'EVENT',
          priority: 'URGENT',
          status: 'PUBLISHED',
          isPinned: true,
          publishedAt: '2026-09-20T08:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 100, total: 1, totalPages: 1 },
    },
    mockDepartments: {
      items: [
        { id: 'dept-1', name: 'Engineering', code: 'ENG', status: 'ACTIVE', teamCount: 3 },
        { id: 'dept-2', name: 'Operations', code: 'OPS', status: 'ACTIVE', teamCount: 2 },
      ],
      total: 2,
    },
    mockProfiles: {
      items: [
        {
          id: 'p-1',
          fullName: 'Nguyen Van A',
          departmentId: 'dept-1',
          departmentName: 'Engineering',
        },
        {
          id: 'p-2',
          fullName: 'Tran Thi B',
          departmentId: 'dept-1',
          departmentName: 'Engineering',
        },
        { id: 'p-3', fullName: 'Le Van C', departmentId: 'dept-2', departmentName: 'Operations' },
      ],
      pagination: { page: 1, limit: 100, total: 3, totalPages: 1 },
    },
  }),
)

vi.mock('@/features/hr/hooks', () => ({
  useHrDashboardQuery: vi.fn(() => ({
    data: mockHrDashboardData,
    isFetching: false,
  })),
  useHrAnnouncementsQuery: vi.fn(() => ({
    data: mockAnnouncements,
    isFetching: false,
  })),
  useEmployeeProfilesQuery: vi.fn(() => ({
    data: mockProfiles,
    isFetching: false,
  })),
}))

vi.mock('@/features/organization/api/organizationApi', () => ({
  loadDepartments: vi.fn().mockResolvedValue(mockDepartments),
}))

describe('HrDashboardPage', () => {
  beforeEach(() => {
    i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('renders executive KPI metric cards with accurate HR counts', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <HrDashboardPage />
        </AppProviders>
      </MemoryRouter>,
    )

    // Header title
    expect(screen.getByText('HR Operations Dashboard')).toBeVisible()

    // KPI Card 1: Headcount
    expect(screen.getByText('Total Headcount')).toBeVisible()
    expect(screen.getByText('82')).toBeVisible()

    // KPI Card 2: Present today
    expect(screen.getByText('Present today')).toBeVisible()
    expect(screen.getByText('75/80')).toBeVisible()

    // KPI Card 3: Exceptions (3 late + 1 missing check-out + 2 absent = 6)
    expect(screen.getAllByText('Attendance Exceptions').length).toBeGreaterThan(0)
    expect(screen.getAllByText('6').length).toBeGreaterThan(0)

    // KPI Card 4: Pending approvals
    expect(screen.getByText('Pending Approvals')).toBeVisible()

    // KPI Card 5: Payroll period
    expect(screen.getByText('Payroll Period')).toBeVisible()
  })

  it('renders Action Queue with review buttons and quick navigation', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <HrDashboardPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText('Action Queue & Approvals')).toBeVisible()
    expect(screen.getByText('Pending leave requests')).toBeVisible()
    expect(screen.getByText('Pending overtime requests')).toBeVisible()
    expect(screen.getAllByText('Attendance Exceptions').length).toBeGreaterThan(0)

    // Quick Workspaces
    expect(screen.getByText('Quick Workspaces')).toBeVisible()
    expect(screen.getByText('Work Schedule')).toBeVisible()
    expect(screen.getAllByText('Go to Approvals').length).toBeGreaterThan(0)
    expect(screen.getByText('Payroll')).toBeVisible()
    expect(screen.getByText('Employees')).toBeVisible()
    expect(screen.getAllByText('Organization').length).toBeGreaterThanOrEqual(1)
  })

  it('renders Company Announcements with pinned items', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <HrDashboardPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.getByText('Company Announcements')).toBeVisible()
    expect(screen.getByText('Company Outing 2026')).toBeVisible()
    expect(screen.getByText('All team members please register before Friday.')).toBeVisible()
  })

  it('allows toggling date range between 1, 7, and 30 days', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <HrDashboardPage />
        </AppProviders>
      </MemoryRouter>,
    )

    const days30Option = screen.getByText('30 days')
    expect(days30Option).toBeVisible()
    fireEvent.click(days30Option)
  })
})
