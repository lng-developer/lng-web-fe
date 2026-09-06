export const hrKeys = {
  all: ['hr'] as const,
  profilesRoot: ['hr', 'employee-profiles'] as const,
  profiles: (includeDeleted = false) =>
    [...hrKeys.all, 'employee-profiles', includeDeleted] as const,
  profile: (id: string, includeSensitive = false) =>
    [...hrKeys.all, 'employee-profiles', id, includeSensitive] as const,
  myProfile: () => [...hrKeys.all, 'employee-profiles', 'me'] as const,
  assignableRoles: () => [...hrKeys.all, 'assignable-roles'] as const,

  workspaceRoot: ['hr-workspace'] as const,
  workspaceSelf: (params: unknown) => ['hr-workspace', 'self', params] as const,
  workspaceSelfRoot: ['hr-workspace', 'self'] as const,
  workspaceTeam: (dateKey?: string, rangeDays?: number) =>
    ['hr-workspace', 'team', dateKey, rangeDays] as const,
  workspaceTeamRoot: ['hr-workspace', 'team'] as const,

  overviewRoot: ['hr-overview'] as const,
  overviewDashboard: (rangeDays: number) => ['hr-overview', 'dashboard', rangeDays] as const,
  overviewAnnouncements: () => ['hr-overview', 'announcements'] as const,

  payrollRoot: ['hr-payroll'] as const,
  payrollRuns: (month: number, year: number) => ['hr-payroll', 'runs', month, year] as const,
  payrollResults: (month: number, year: number) => ['hr-payroll', 'results', month, year] as const,
  payrollAdjustments: (month: number, year: number) =>
    ['hr-payroll', 'adjustments', month, year] as const,
  payrollSettings: () => ['hr-payroll', 'settings'] as const,

  operationsRoot: ['hr-operations'] as const,
  operationsLocations: () => ['hr-operations', 'locations'] as const,
  operationsShifts: () => ['hr-operations', 'shifts'] as const,
  operationsAssignments: () => ['hr-operations', 'assignments'] as const,
  operationsOverrides: (dateFrom?: string) => ['hr-operations', 'overrides', dateFrom] as const,
  operationsHolidays: (dateFrom?: string) => ['hr-operations', 'holidays', dateFrom] as const,
  operationsRotations: (monthParams?: unknown, teamId?: string) =>
    ['hr-operations', 'rotations', monthParams, teamId] as const,

  timeRoot: ['hr-time'] as const,
  timeBalances: (year: number) => ['hr-time', 'leave-balances', year] as const,
  timeLeaves: (year: number) => ['hr-time', 'leave-requests', year] as const,
  timeOvertime: (year: number) => ['hr-time', 'overtime-requests', year] as const,
  timeAttendance: (params?: unknown) => ['hr-time', 'attendance', params] as const,
}
