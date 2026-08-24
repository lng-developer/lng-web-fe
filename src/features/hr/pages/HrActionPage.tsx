import { lazy, Suspense } from 'react'
import { Skeleton } from 'antd'

const AttendancePage = lazy(() =>
  import('./Attendance/AttendancePage').then(({ AttendancePage }) => ({ default: AttendancePage })),
)
const HrOverviewPage = lazy(() =>
  import('./HrOverviewPage').then(({ HrOverviewPage }) => ({ default: HrOverviewPage })),
)
const HrWorkspacePage = lazy(() =>
  import('./HrWorkspacePage').then(({ HrWorkspacePage }) => ({ default: HrWorkspacePage })),
)
const PayrollPage = lazy(() =>
  import('./PayrollPage').then(({ PayrollPage }) => ({ default: PayrollPage })),
)
const ProfilePage = lazy(() =>
  import('@/features/auth/setup/pages/ProfileSetupPage').then(({ ProfileSetupPage }) => ({
    default: () => <ProfileSetupPage embedded />,
  })),
)
const ScheduleCalendarPage = lazy(() =>
  import('../ScheduleCalendar').then(({ ScheduleCalendarPage }) => ({
    default: ScheduleCalendarPage,
  })),
)
const StaffWorkspacePage = lazy(() =>
  import('./StaffWorkspacePage').then(({ StaffWorkspacePage }) => ({
    default: StaffWorkspacePage,
  })),
)
const TeamWorkspacePage = lazy(() =>
  import('./TeamWorkspacePage').then(({ TeamWorkspacePage }) => ({ default: TeamWorkspacePage })),
)
const TimeRequestsPage = lazy(() =>
  import('./TimeRequests/TimeRequestsPage').then(({ TimeRequestsPage }) => ({
    default: TimeRequestsPage,
  })),
)

export function HrActionPage({ routeKey }: { routeKey: string }) {
  const page =
    routeKey === 'self' ? (
      <StaffWorkspacePage />
    ) : routeKey === 'self-schedule' ? (
      <StaffWorkspacePage view="schedule" />
    ) : routeKey === 'self-attendance' ||
      routeKey === 'team-attendance' ||
      routeKey === 'operations-attendance' ? (
      <AttendancePage />
    ) : routeKey === 'self-requests' || routeKey === 'operations-requests' ? (
      <TimeRequestsPage />
    ) : routeKey === 'self-payroll' || routeKey === 'payroll' ? (
      <PayrollPage />
    ) : routeKey === 'self-profile' ? (
      <ProfilePage />
    ) : routeKey === 'team' ? (
      <TeamWorkspacePage />
    ) : routeKey === 'team-approvals' ? (
      <TeamWorkspacePage view="approvals" />
    ) : routeKey === 'team-members' ? (
      <TeamWorkspacePage view="members" />
    ) : routeKey === 'team-schedule' || routeKey === 'operations-scheduling' ? (
      <ScheduleCalendarPage />
    ) : routeKey === 'operations-employees' ? (
      <HrWorkspacePage />
    ) : routeKey === 'operations-announcements' ? (
      <HrOverviewPage view="announcements" />
    ) : (
      <HrOverviewPage />
    )

  return <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>{page}</Suspense>
}
