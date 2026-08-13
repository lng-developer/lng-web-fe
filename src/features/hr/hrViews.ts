export type HrViewKey = 'people' | 'schedule' | 'attendance' | 'requests' | 'payroll' | 'overview'
export type HrWorkspaceKey = 'self' | 'team' | 'operations' | 'payroll'

const workspacePermissions: Array<{ key: HrWorkspaceKey; permissions?: string[] }> = [
  { key: 'self' },
  {
    key: 'team',
    permissions: [
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
    ],
  },
  {
    key: 'operations',
    permissions: [
      'HR_EMPLOYEES:READ',
      'HR_EMPLOYEES:WRITE',
      'HR_SCHEDULE:WRITE',
      'HR_CALENDAR:WRITE',
      'HR_ATTENDANCE:MANAGE',
      'HR_ANNOUNCEMENTS:READ',
      'HR_ANNOUNCEMENTS:WRITE',
    ],
  },
  {
    key: 'payroll',
    permissions: ['HR_PAYROLL:READ', 'HR_PAYROLL:WRITE', 'HR_PAYROLL:FINALIZE', 'HR_PAYROLL:PAY'],
  },
]

const viewPermissions: Array<{ key: HrViewKey; permissions: string[] }> = [
  { key: 'people', permissions: ['HR_EMPLOYEES:READ', 'HR_EMPLOYEES:WRITE'] },
  {
    key: 'schedule',
    permissions: ['HR_SCHEDULE:READ', 'HR_SCHEDULE:WRITE', 'HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'],
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

export const getHrWorkspaces = (permissions: Iterable<string>) => {
  const granted = new Set(permissions)
  return workspacePermissions.filter(
    (workspace) =>
      !workspace.permissions || workspace.permissions.some((permission) => granted.has(permission)),
  )
}

export const hasHrAccess = (permissions: Iterable<string>) =>
  getHrWorkspaces(permissions).length > 0
