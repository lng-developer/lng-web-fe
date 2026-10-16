import type { CurrentAccount } from '@/features/auth/api/authApi'

export type HrViewKey = 'people' | 'schedule' | 'attendance' | 'requests' | 'payroll' | 'overview'
export type HrWorkspaceKey = 'self' | 'team' | 'operations' | 'payroll'
export type HrAccess = {
  globalPermissions: Iterable<string>
  teamPermissions: Iterable<string>
  teamIds: string[]
}

const teamWorkspacePermissions = [
  'HR_EMPLOYEES:READ',
  'HR_SCHEDULE:READ',
  'HR_SCHEDULE:WRITE',
  'HR_CALENDAR:READ',
  'HR_CALENDAR:WRITE',
  'HR_SATURDAY_ROTATION:WRITE',
  'HR_ATTENDANCE:READ',
  'HR_ATTENDANCE:MANAGE',
  'HR_LEAVE:READ',
  'HR_LEAVE:APPROVE',
  'HR_OVERTIME:READ',
  'HR_OVERTIME:APPROVE',
]
const operationsWorkspacePermissions = [
  'HR_EMPLOYEES:READ',
  'HR_EMPLOYEES:WRITE',
  'HR_SCHEDULE:WRITE',
  'HR_CALENDAR:WRITE',
  'HR_ATTENDANCE:MANAGE',
  'HR_ANNOUNCEMENTS:READ',
  'HR_ANNOUNCEMENTS:WRITE',
]
const payrollWorkspacePermissions = [
  'HR_PAYROLL:READ',
  'HR_PAYROLL:WRITE',
  'HR_PAYROLL:FINALIZE',
  'HR_PAYROLL:PAY',
]

const viewPermissions: Array<{ key: HrViewKey; permissions: string[] }> = [
  { key: 'people', permissions: ['HR_EMPLOYEES:READ', 'HR_EMPLOYEES:WRITE'] },
  {
    key: 'schedule',
    permissions: [
      'HR_SCHEDULE:READ',
      'HR_SCHEDULE:WRITE',
      'HR_CALENDAR:READ',
      'HR_CALENDAR:WRITE',
      'HR_SATURDAY_ROTATION:WRITE',
    ],
  },
  {
    key: 'attendance',
    permissions: ['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:WRITE', 'HR_ATTENDANCE:MANAGE'],
  },
  {
    key: 'requests',
    permissions: [
      'HR_LEAVE:READ',
      'HR_LEAVE:WRITE',
      'HR_LEAVE:APPROVE',
      'HR_OVERTIME:READ',
      'HR_OVERTIME:WRITE',
      'HR_OVERTIME:APPROVE',
    ],
  },
  {
    key: 'payroll',
    permissions: ['HR_PAYROLL:READ', 'HR_PAYROLL:WRITE', 'HR_PAYROLL:FINALIZE', 'HR_PAYROLL:PAY'],
  },
  {
    key: 'overview',
    permissions: [
      'HR_EMPLOYEES:READ',
      'HR_EMPLOYEES:WRITE',
      'HR_ANNOUNCEMENTS:READ',
      'HR_ANNOUNCEMENTS:WRITE',
    ],
  },
]

export const getHrViews = (permissions: Iterable<string>) => {
  const granted = new Set(permissions)
  return viewPermissions.filter((view) =>
    view.permissions.some((permission) => granted.has(permission)),
  )
}

export const getHrAccess = (account: Pick<CurrentAccount, 'permissions' | 'scopes'>): HrAccess => {
  const eligibleTeamScopes = account.scopes.filter(
    (scope) =>
      scope.scopeType.toLowerCase() === 'team' &&
      Boolean(scope.scopeId) &&
      scope.permissions.some((permission) => teamWorkspacePermissions.includes(permission)),
  )

  return {
    globalPermissions: account.permissions,
    teamPermissions: eligibleTeamScopes.flatMap((scope) => scope.permissions),
    teamIds: [...new Set(eligibleTeamScopes.map((scope) => scope.scopeId!))],
  }
}

export const getSelectedHrTeamId = (access: HrAccess, selectedTeamId?: string) => {
  if (selectedTeamId && access.teamIds.includes(selectedTeamId)) return selectedTeamId
  return access.teamIds.length === 1 ? access.teamIds[0] : undefined
}

export const getHrWorkspaces = ({ globalPermissions, teamPermissions, teamIds }: HrAccess) => {
  const global = new Set(globalPermissions)
  const team = new Set(teamPermissions)
  const teamGranted = new Set([...global, ...team])
  const workspaces: Array<{ key: HrWorkspaceKey }> = [{ key: 'self' }]

  if (
    teamIds.length &&
    teamWorkspacePermissions.some((permission) => teamGranted.has(permission))
  ) {
    workspaces.push({ key: 'team' })
  }
  if (operationsWorkspacePermissions.some((permission) => global.has(permission)))
    workspaces.push({ key: 'operations' })
  if (payrollWorkspacePermissions.some((permission) => global.has(permission)))
    workspaces.push({ key: 'payroll' })

  return workspaces
}

export const hasHrAccess = (permissions: Iterable<string>) =>
  [...permissions].some((permission) => permission.startsWith('HR_'))
