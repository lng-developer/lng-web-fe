import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
type Query = Record<string, boolean | number | string | null | undefined>
export type Page<T> = {
  items: T[]
  pagination?: { page: number; limit: number; total: number; totalPages: number }
}
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
const get = async <T>(path: string, params?: Query) =>
  unwrap<T>(await apiClient.get(path, ...(params ? [{ params }] : [])))
const post = async <T>(path: string, input?: object) =>
  unwrap<T>(await apiClient.post(path, ...(input ? [input] : [])))

export type Attendance = {
  id: string
  profileId: string
  employee?: { fullName?: string; employeeCode?: string } | null
  workDateKey: string
  status: string
  workDayValue: number
  checkInAt: string | null
  checkOutAt: string | null
  lateMinutes: number
  earlyLeaveMinutes: number
  workedMinutes: number
  shift?: { name?: string } | null
  capabilities?: { adjust?: boolean }
}
export type LeaveBalance = {
  id: string
  profileId: string
  year: number
  leaveType: string
  entitledUnits: number
  carriedOverUnits: number
  adjustmentUnits: number
  usedUnits: number
  availableUnits: number
}
export type LeaveRequest = {
  id: string
  profileId: string
  employee?: { fullName?: string; employeeCode?: string } | null
  leaveType: string
  portion: string
  startDateKey: string
  endDateKey: string
  requestedUnits: number
  reason: string
  status: string
  capabilities?: Record<string, boolean>
}
export type OvertimeRequest = {
  id: string
  profileId: string
  employee?: { fullName?: string; employeeCode?: string } | null
  workDateKey: string
  plannedStartTime: string
  plannedEndTime: string
  requestedMinutes: number
  approvedMinutes: number | null
  reason: string
  status: string
  capabilities?: Record<string, boolean>
}
export type PayrollRun = {
  id: string
  month: number
  year: number
  formulaVersion: string
  status: string
  version: number
  resultCount: number
  finalizedAt: string | null
  paidAt: string | null
  capabilities: { finalize: boolean; markPaid: boolean }
}
export type PayrollResult = {
  id: string
  payrollRunId: string
  profileId: string
  employee?: { fullName?: string; employeeCode?: string; teamName?: string } | null
  baseSalary: number
  workDays: number
  grossIncome: number
  totalDeductions: number
  netIncome: number
  status: string
}
export type PayrollAdjustment = {
  id: string
  profileId: string
  month: number
  year: number
  type: string
  code: string
  name: string
  amount: number
  note: string | null
  status: string
  version: number
}
export type Announcement = {
  id: string
  title: string
  content: string
  category: string
  priority: string
  sendToAll: boolean
  status: string
  isPinned: boolean
  scheduledAt: string | null
  publishedAt: string | null
  capabilities?: Record<string, boolean>
}
export type HrDashboard = {
  date: string
  employees: { total: number; active: number; probation: number; onLeave: number }
  attendance: {
    expectedEmployees: number
    records: number
    present: number
    late: number
    absent: number
    onLeave: number
    missingCheckOuts: number
    coverageRate: number
  }
  approvals: {
    pendingLeaves: number
    pendingOvertimes: number
    totalPending: number
    approvedOvertimesToday: number
  }
}
export type WorkContext = {
  workDateKey: string
  status?: string
  isWorkingDay?: boolean
  reason?: string
  shift?: { name?: string; startTime?: string; endTime?: string } | null
  workLocation?: { name?: string } | null
  calendarOverride?: { kind?: string; name?: string } | null
}
export type CalendarDay = WorkContext & {
  attendance: Attendance | null
  leave: LeaveRequest[]
  overtime: OvertimeRequest[]
}
export type MyHrWorkspace = {
  dateKey: string
  profile: {
    id: string
    employeeCode: string
    fullName: string
    departmentId: string | null
    teamId: string | null
    jobTitle: string | null
    status: string
  }
  today: { schedule: WorkContext | null; attendance: Attendance | null }
  schedule: WorkContext[]
  calendar: CalendarDay[]
  leave: { balances: LeaveBalance[]; availableUnits: number; requests: LeaveRequest[] }
  overtime: { requests: OvertimeRequest[] }
  latestPayroll: PayrollResult | null
  announcements: Announcement[]
}
export type TeamHrWorkspace = {
  dateKey: string
  profiles: Page<{
    id: string
    employeeCode: string
    fullName: string
    jobTitle?: string
    status: string
  }>
  attendance: Page<Attendance>
  pendingLeaves: Page<LeaveRequest>
  pendingOvertime: Page<OvertimeRequest>
  assignments: Page<unknown>
}

export const listAttendance = (params: Query = {}) =>
  get<Page<Attendance>>('/api/hr/attendance', params)
export const listAttendanceMatrix = (params: Query) =>
  get<unknown>('/api/hr/attendance/month-matrix', params)
export const listMyAttendance = (params: Query = {}) =>
  get<Page<Attendance>>('/api/hr/attendance/me', params)
export const checkIn = (input: object = {}) =>
  post<Attendance>('/api/hr/attendance/check-in', input)
export const checkOut = (input: object = {}) =>
  post<Attendance>('/api/hr/attendance/check-out', input)
export const adjustAttendance = async (id: string, input: object) =>
  unwrap<Attendance>(await apiClient.patch(`/api/hr/attendance/${id}`, input))

export const listMyLeaveBalances = () => get<LeaveBalance[]>('/api/hr/leave-balances/me')
export const getLeaveBalance = (profileId: string, year: number, leaveType: string) =>
  get<LeaveBalance>(`/api/hr/leave-balances/${profileId}/${year}/${leaveType}`)
export const upsertLeaveBalance = async (
  profileId: string,
  year: number,
  leaveType: string,
  input: object,
) =>
  unwrap<LeaveBalance>(
    await apiClient.put(`/api/hr/leave-balances/${profileId}/${year}/${leaveType}`, input),
  )
export const adjustLeaveBalance = async (
  profileId: string,
  year: number,
  leaveType: string,
  input: object,
) =>
  unwrap<LeaveBalance>(
    await apiClient.patch(`/api/hr/leave-balances/${profileId}/${year}/${leaveType}/adjust`, input),
  )
export const accrueLeaveBalances = (input: object) =>
  post<unknown>('/api/hr/leave-balances/accrue', input)
export const resetLeaveBalances = (input: object) =>
  post<unknown>('/api/hr/leave-balances/reset', input)
export const carryOverLeaveBalances = (input: object) =>
  post<unknown>('/api/hr/leave-balances/carry-over', input)
export const listLeaveRequests = (params: Query = {}) =>
  get<Page<LeaveRequest>>('/api/hr/leave-requests', params)
export const listMyLeaveRequests = (params: Query = {}) =>
  get<Page<LeaveRequest>>('/api/hr/leave-requests/me', params)
export const previewLeaveRequest = (input: object) =>
  post<unknown>('/api/hr/leave-requests/preview', input)
export const createLeaveRequest = (input: object) =>
  post<LeaveRequest>('/api/hr/leave-requests', input)
export const updateLeaveRequest = async (id: string, input: object) =>
  unwrap<LeaveRequest>(await apiClient.patch(`/api/hr/leave-requests/${id}`, input))
export const approveLeaveRequest = (id: string, input: object = {}) =>
  post<LeaveRequest>(`/api/hr/leave-requests/${id}/approve`, input)
export const rejectLeaveRequest = (id: string, input: object) =>
  post<LeaveRequest>(`/api/hr/leave-requests/${id}/reject`, input)
export const refundLeaveRequest = (id: string, input: object) =>
  post<LeaveRequest>(`/api/hr/leave-requests/${id}/refund`, input)
export const cancelLeaveRequest = (id: string, input: object = {}) =>
  post<LeaveRequest>(`/api/hr/leave-requests/${id}/cancel`, input)
export const attachLeaveReferences = (id: string, input: object) =>
  post<LeaveRequest>(`/api/hr/leave-requests/${id}/attachments`, input)

export const listOvertimeRequests = (params: Query = {}) =>
  get<Page<OvertimeRequest>>('/api/hr/overtime-requests', params)
export const listMyOvertimeRequests = (params: Query = {}) =>
  get<Page<OvertimeRequest>>('/api/hr/overtime-requests/me', params)
export const createOvertimeRequest = (input: object) =>
  post<OvertimeRequest>('/api/hr/overtime-requests', input)
export const updateOvertimeRequest = async (id: string, input: object) =>
  unwrap<OvertimeRequest>(await apiClient.patch(`/api/hr/overtime-requests/${id}`, input))
export const approveOvertimeRequest = (id: string, input: object = {}) =>
  post<OvertimeRequest>(`/api/hr/overtime-requests/${id}/approve`, input)
export const rejectOvertimeRequest = (id: string, input: object) =>
  post<OvertimeRequest>(`/api/hr/overtime-requests/${id}/reject`, input)
export const cancelOvertimeRequest = (id: string, input: object = {}) =>
  post<OvertimeRequest>(`/api/hr/overtime-requests/${id}/cancel`, input)

export const listPayrolls = (params: Query = {}) =>
  get<Page<PayrollRun>>('/api/hr/payrolls', params)
export const runPayroll = (input: object) => post<PayrollRun>('/api/hr/payrolls/run', input)
export const listMyPayrolls = (params: Query = {}) =>
  get<Page<PayrollResult>>('/api/hr/payrolls/me', params)
export const listPayrollResults = (params: Query = {}) =>
  get<Page<PayrollResult>>('/api/hr/payrolls/results', params)
export const exportPayrollResults = async (params: Query = {}) =>
  apiClient.get('/api/hr/payrolls/results/export', { params, responseType: 'blob' })
export const getPayrollResult = (id: string) => get<PayrollResult>(`/api/hr/payrolls/results/${id}`)
export const getPayroll = (id: string) => get<PayrollRun>(`/api/hr/payrolls/${id}`)
export const finalizePayroll = (id: string, expectedVersion: number) =>
  post<PayrollRun>(`/api/hr/payrolls/${id}/finalize`, { expectedVersion })
export const markPayrollPaid = (id: string, payrollResultIds: string[], expectedVersion: number) =>
  post<PayrollRun>(`/api/hr/payrolls/${id}/mark-paid`, { payrollResultIds, expectedVersion })
export const emailPayroll = (id: string) => post<unknown>(`/api/hr/payrolls/${id}/email`, {})
export const listPayrollAdjustments = (params: Query = {}) =>
  get<Page<PayrollAdjustment>>('/api/hr/payroll-adjustments', params)
export const createPayrollAdjustment = (input: object) =>
  post<PayrollAdjustment>('/api/hr/payroll-adjustments', input)
export const updatePayrollAdjustment = async (id: string, input: object) =>
  unwrap<PayrollAdjustment>(await apiClient.patch(`/api/hr/payroll-adjustments/${id}`, input))
export const cancelPayrollAdjustment = async (id: string, expectedVersion: number) =>
  unwrap<PayrollAdjustment>(
    await apiClient.delete(`/api/hr/payroll-adjustments/${id}`, { data: { expectedVersion } }),
  )

export const listAnnouncements = (params: Query = {}) =>
  get<Page<Announcement>>('/api/hr/announcements', params)
export const getAnnouncement = (id: string) => get<Announcement>(`/api/hr/announcements/${id}`)
export const createAnnouncement = (input: object) =>
  post<Announcement>('/api/hr/announcements', input)
export const updateAnnouncement = async (id: string, input: object) =>
  unwrap<Announcement>(await apiClient.patch(`/api/hr/announcements/${id}`, input))
export const deleteAnnouncement = async (id: string) =>
  unwrap<Announcement>(await apiClient.delete(`/api/hr/announcements/${id}`))
export const getHrDashboard = (dateKey?: string) =>
  get<HrDashboard>('/api/hr/dashboard', dateKey ? { dateKey } : undefined)
export const getMyHrWorkspace = (params: Query) =>
  get<MyHrWorkspace>('/api/hr/workspace/me', params)
export const getTeamHrWorkspace = (params: Query) =>
  get<TeamHrWorkspace>('/api/hr/workspace/team', params)
