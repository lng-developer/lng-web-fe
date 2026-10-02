import { lazy, Suspense } from 'react'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { Select, Skeleton } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'

import { getHrAccess, getSelectedHrTeamId } from '../hrViews'

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
  import('./TeamWorkspace/TeamWorkspacePage').then(({ TeamWorkspacePage }) => ({
    default: TeamWorkspacePage,
  })),
)
const TimeRequestsPage = lazy(() =>
  import('./TimeRequests/TimeRequestsPage').then(({ TimeRequestsPage }) => ({
    default: TimeRequestsPage,
  })),
)

export function HrActionPage({ routeKey }: { routeKey: string }) {
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [searchParams, setSearchParams] = useSearchParams()
  const access = getHrAccess(account)
  const isTeamRoute =
    routeKey === 'team-attendance' || routeKey === 'team-requests' || routeKey === 'team-schedule'
  const selectedTeamId = isTeamRoute
    ? getSelectedHrTeamId(access, searchParams.get('teamId') ?? undefined)
    : undefined
  const teamSelector =
    isTeamRoute && access.teamIds.length > 1 ? (
      <Select
        aria-label="Team"
        options={access.teamIds.map((id) => ({ value: id, label: id }))}
        placeholder="Select team"
        value={selectedTeamId}
        onChange={(teamId) => {
          const next = new URLSearchParams(searchParams)
          next.set('teamId', teamId)
          setSearchParams(next, { replace: true })
        }}
      />
    ) : null
  const page =
    routeKey === 'self' ? (
      <StaffWorkspacePage />
    ) : routeKey === 'self-schedule' ? (
      <StaffWorkspacePage view="schedule" />
    ) : routeKey === 'self-attendance' ? (
      <AttendancePage />
    ) : routeKey === 'team-attendance' ? (
      <AttendancePage workspace="team" teamId={selectedTeamId} />
    ) : routeKey === 'operations-attendance' ? (
      <AttendancePage workspace="operations" />
    ) : routeKey === 'self-requests' ? (
      <TimeRequestsPage />
    ) : routeKey === 'team-requests' ? (
      <TimeRequestsPage workspace="team" teamId={selectedTeamId} />
    ) : routeKey === 'operations-requests' ? (
      <TimeRequestsPage workspace="operations" />
    ) : routeKey === 'self-payroll' ? (
      <PayrollPage />
    ) : routeKey === 'payroll' ? (
      <PayrollPage workspace="management" />
    ) : routeKey === 'self-profile' ? (
      <ProfilePage />
    ) : routeKey === 'team' ? (
      <TeamWorkspacePage />
    ) : routeKey === 'team-approvals' ? (
      <TeamWorkspacePage view="approvals" />
    ) : routeKey === 'team-members' ? (
      <TeamWorkspacePage view="members" />
    ) : routeKey === 'team-schedule' || routeKey === 'operations-scheduling' ? (
      <ScheduleCalendarPage teamId={routeKey === 'team-schedule' ? selectedTeamId : undefined} />
    ) : routeKey === 'operations-employees' ? (
      <HrWorkspacePage />
    ) : routeKey === 'operations-announcements' ? (
      <HrOverviewPage view="announcements" />
    ) : (
      <HrOverviewPage />
    )

  return (
    <Suspense fallback={<Skeleton active paragraph={{ rows: 10 }} />}>
      {teamSelector}
      {page}
    </Suspense>
  )
}
