export const HR_TIME_REQUEST_PERMISSIONS = {
  leave: {
    read: 'HR_LEAVE:READ',
    write: 'HR_LEAVE:WRITE',
    approve: 'HR_LEAVE:APPROVE',
  },
  overtime: {
    read: 'HR_OVERTIME:READ',
    write: 'HR_OVERTIME:WRITE',
    approve: 'HR_OVERTIME:APPROVE',
  },
} as const

export type TimeRequestWorkspace = 'personal' | 'team' | 'operations'

export function getTimeRequestParams(workspace: TimeRequestWorkspace, teamId?: string) {
  if (workspace === 'team' && !teamId) return undefined
  return { limit: 100, ...(workspace === 'team' && teamId ? { teamId } : {}) }
}

export function getTimeRequestAccess(
  permissions: Iterable<string>,
  workspace: TimeRequestWorkspace = 'personal',
) {
  const granted = new Set(permissions)
  const canLeaveWrite = granted.has(HR_TIME_REQUEST_PERMISSIONS.leave.write)
  const canOvertimeWrite = granted.has(HR_TIME_REQUEST_PERMISSIONS.overtime.write)
  const canLeaveApprove = granted.has(HR_TIME_REQUEST_PERMISSIONS.leave.approve)
  const canOvertimeApprove = granted.has(HR_TIME_REQUEST_PERMISSIONS.overtime.approve)

  return {
    canLeaveWrite,
    canOvertimeWrite,
    canLeaveApprove,
    canOvertimeApprove,
    managerLeave:
      workspace !== 'personal' &&
      (granted.has(HR_TIME_REQUEST_PERMISSIONS.leave.read) || canLeaveApprove),
    managerOvertime:
      workspace !== 'personal' &&
      (granted.has(HR_TIME_REQUEST_PERMISSIONS.overtime.read) || canOvertimeApprove),
  }
}
