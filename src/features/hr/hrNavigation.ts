import { getHrWorkspaces, type HrWorkspaceKey } from './hrViews'

export type HrRoute = {
  key: string
  path: string
  workspace: HrWorkspaceKey
  labelKey: string
  permissions?: string[]
}

const teamPermissions = [
  'HR_SCHEDULE:READ',
  'HR_SCHEDULE:WRITE',
  'HR_CALENDAR:READ',
  'HR_CALENDAR:WRITE',
  'HR_ATTENDANCE:READ',
  'HR_ATTENDANCE:MANAGE',
  'HR_LEAVE:READ',
  'HR_LEAVE:APPROVE',
  'HR_OVERTIME:READ',
  'HR_OVERTIME:APPROVE',
]

const routes: HrRoute[] = [
  { key: 'self', path: '/hr/me', workspace: 'self', labelKey: 'hrOperations.navigation.overview' },
  {
    key: 'self-schedule',
    path: '/hr/me/schedule',
    workspace: 'self',
    labelKey: 'hrOperations.navigation.schedule',
  },
  {
    key: 'self-attendance',
    path: '/hr/me/attendance',
    workspace: 'self',
    labelKey: 'hrOperations.navigation.attendance',
  },
  {
    key: 'self-requests',
    path: '/hr/me/requests',
    workspace: 'self',
    labelKey: 'hrOperations.navigation.requests',
  },
  {
    key: 'self-payroll',
    path: '/hr/me/payroll',
    workspace: 'self',
    labelKey: 'hrOperations.navigation.payroll',
  },
  {
    key: 'self-profile',
    path: '/hr/me/profile',
    workspace: 'self',
    labelKey: 'hrOperations.navigation.profile',
  },
  {
    key: 'team',
    path: '/hr/team',
    workspace: 'team',
    labelKey: 'hrOperations.navigation.overview',
  },
  {
    key: 'team-schedule',
    path: '/hr/team/schedule',
    workspace: 'team',
    labelKey: 'hrOperations.navigation.schedule',
    permissions: ['HR_SCHEDULE:READ', 'HR_SCHEDULE:WRITE', 'HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'],
  },
  {
    key: 'team-attendance',
    path: '/hr/team/attendance',
    workspace: 'team',
    labelKey: 'hrOperations.navigation.attendance',
    permissions: ['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:MANAGE'],
  },
  {
    key: 'team-approvals',
    path: '/hr/team/approvals',
    workspace: 'team',
    labelKey: 'hrOperations.navigation.approvals',
    permissions: ['HR_LEAVE:READ', 'HR_LEAVE:APPROVE', 'HR_OVERTIME:READ', 'HR_OVERTIME:APPROVE'],
  },
  {
    key: 'team-members',
    path: '/hr/team/members',
    workspace: 'team',
    labelKey: 'hrOperations.navigation.members',
    permissions: teamPermissions,
  },
  {
    key: 'operations',
    path: '/hr/operations',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.overview',
  },
  {
    key: 'operations-employees',
    path: '/hr/operations/employees',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.employees',
    permissions: ['HR_EMPLOYEES:READ', 'HR_EMPLOYEES:WRITE'],
  },
  {
    key: 'operations-scheduling',
    path: '/hr/operations/scheduling',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.scheduling',
    permissions: ['HR_SCHEDULE:WRITE', 'HR_CALENDAR:WRITE'],
  },
  {
    key: 'operations-attendance',
    path: '/hr/operations/attendance',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.attendance',
    permissions: ['HR_ATTENDANCE:MANAGE'],
  },
  {
    key: 'operations-requests',
    path: '/hr/operations/requests',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.requests',
    permissions: ['HR_LEAVE:APPROVE', 'HR_OVERTIME:APPROVE'],
  },
  {
    key: 'operations-announcements',
    path: '/hr/operations/announcements',
    workspace: 'operations',
    labelKey: 'hrOperations.navigation.announcements',
    permissions: ['HR_ANNOUNCEMENTS:WRITE'],
  },
  {
    key: 'payroll',
    path: '/hr/payroll',
    workspace: 'payroll',
    labelKey: 'hrOperations.navigation.payroll',
  },
]

export function getHrNavigation(
  permissions: Iterable<string>,
  options: { includeSelf?: boolean } = {},
) {
  const granted = new Set(permissions)
  const workspaces = new Set(getHrWorkspaces(granted).map(({ key }) => key))
  if (options.includeSelf) workspaces.add('self')
  return routes.filter(
    (route) =>
      workspaces.has(route.workspace) &&
      (!route.permissions || route.permissions.some((permission) => granted.has(permission))),
  )
}

export const getDefaultHrPath = (permissions: Iterable<string>) =>
  getHrNavigation(permissions)[0]?.path
