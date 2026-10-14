import { ApiResponse, Page } from '@/server/type'
import { apiClient } from '@/shared/api'

type Query = Record<string, boolean | number | string | null | undefined>

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
const get = async <T>(path: string, params?: Query) =>
  unwrap<T>(await apiClient.get(path, ...(params ? [{ params }] : [])))
const post = async <T>(path: string, input?: object) =>
  unwrap<T>(await apiClient.post(path, ...(input ? [input] : [])))
const put = async <T>(path: string, input?: object) =>
  unwrap<T>(await apiClient.put(path, ...(input ? [input] : [])))

export type Attendance = {
  id: string
  profileId: string
  employee?: { fullName?: string; employeeCode?: string; avatarUrl?: string | null } | null
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
export type MyAttendancePage = Page<Attendance> & {
  capabilities: {
    checkIn: boolean
    checkOut: boolean
  }
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
  employee?: { fullName?: string; employeeCode?: string; avatarUrl?: string | null } | null
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
  employee?: { fullName?: string; employeeCode?: string; avatarUrl?: string | null } | null
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
  inputSnapshot?: { period?: { month: number; year: number } }
  id: string
  payrollRunId: string
  profileId: string
  employee?: {
    fullName?: string
    employeeCode?: string
    avatarUrl?: string | null
    jobTitle?: string | null
    departmentName?: string | null
    teamName?: string | null
    employmentType?: string | null
    startDate?: string | null
  } | null
  company?: {
    name?: string
    logoUrl?: string | null
    address?: string
    taxCode?: string
    payrollEmail?: string
    payrollPhone?: string
    currency?: string
  } | null
  baseSalary: number
  workDays: number
  salaryFromWork?: number
  overtimePay?: number
  overtimeBreakdown?: Array<{ rateClass: string; approvedMinutes: number; amount: number }>
  totalAllowances?: number
  allowanceBreakdown?: Record<string, number>
  adjustmentEarnings?: number
  adjustmentDeductions?: number
  grossIncome: number
  insurance?: { social: number; health: number; unemployment: number; total: number }
  personalIncomeTax?: number
  totalDeductions: number
  netIncome: number
  status: string
}
export type PayrollResultsSummary = {
  total: number
  statusCounts: Record<string, number>
  amounts: {
    grossIncome: number
    totalDeductions: number
    netIncome: number
    unpaidNetIncome: number
    paidNetIncome: number
  }
}
export type PayrollResultsPage = Page<PayrollResult> & {
  summary?: PayrollResultsSummary
  capabilities?: { view?: boolean }
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
export type PayrollSettings = {
  adjustmentTypes: string[]
  adjustmentCodes: string[]
  paidLeaveTypes?: string[]
  workHoursPerDay?: number
  pitBrackets?: Array<[number, number]>
  formulaVersion?: string
  otRateBasisPoints?: Record<string, number>
  insuranceRates?: { social: number; health: number; unemployment: number }
  insuranceCap?: number
  personalDeduction?: number
  dependantDeduction?: number
  probationRateBasisPoints?: number
  workUnitScale?: number
  rateScale?: number
  company?: NonNullable<PayrollResult['company']>
  version: number
  updatedAt?: string | null
  [key: string]: unknown
}
export type PayrollSettingsPayload = Partial<PayrollSettings> & { expectedVersion: number }
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
  targetDepartmentIds?: string[]
  targetProfileIds?: string[]
  attachments?: Array<{ mediaId: string; filename?: string | null; mimeType?: string | null }>
  remindAt?: string | null
  eventDetails?: {
    startDate?: string | null
    endDate?: string | null
    location?: string | null
    isMandatory?: boolean
  } | null
  capabilities?: Record<string, boolean>
}
export type HrDashboard = {
  date: string
  employees: {
    total: number
    active: number
    probation: number
    onLeave: number
  }
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
  operations?: { attendanceExceptions: number; pendingActions: number }
  payroll?: {
    id: string
    month: number
    year: number
    status: string
    resultCount: number
    finalizedAt: string | null
    paidAt: string | null
    pendingAdjustments: number
    summary: {
      total: number
      statusCounts: Record<string, number>
      amounts: { grossIncome: number; netIncome: number }
    }
  } | null
  announcements?: {
    published: number
    scheduled: number
    pinned: number
    urgent: number
    dueReminders: number
  }
  rangeDays?: 1 | 7 | 30
  attendanceTrend?: Array<{
    date: string
    records: number
    present: number
    late: number
    absent: number
    onLeave: number
    missingCheckOuts: number
    coverageRate: number
  }>
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
  rangeDays?: 1 | 7 | 30
  profiles: Page<{
    id: string
    employeeCode: string
    fullName: string
    avatarUrl?: string | null
    jobTitle?: string
    status: string
  }>
  attendance: Page<Attendance>
  pendingLeaves: Page<LeaveRequest>
  pendingOvertime: Page<OvertimeRequest>
  assignments: Page<unknown>
}
export type TeamWorkspaceQuery = {
  dateKey: string
  month: number
  year: number
  days?: 1 | 7 | 30
  teamId?: string
}

export const listAttendance = (params: Query = {}) =>
  get<Page<Attendance>>('/api/hr/attendance', params)
export const listAttendanceMatrix = (params: Query) =>
  get<unknown>('/api/hr/attendance/month-matrix', params)
export const listMyAttendance = (params: Query = {}) =>
  get<MyAttendancePage>('/api/hr/attendance/me', params)
export const checkIn = (input: object = {}) =>
  post<Attendance>('/api/hr/attendance/check-in', input)
export const checkOut = (input: object = {}) =>
  post<Attendance>('/api/hr/attendance/check-out', input)
export const adjustAttendance = async (id: string, input: object) =>
  unwrap<Attendance>(await apiClient.patch(`/api/hr/attendance/${id}`, input))

export const listMyLeaveBalances = () =>
  get<LeaveBalance[]>('/api/hr/leave-balances/me', { year: new Date().getFullYear() })
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
  get<PayrollResultsPage>('/api/hr/payrolls/me', params)
export const listPayrollResults = (params: Query = {}) =>
  get<PayrollResultsPage>('/api/hr/payrolls/results', params)
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
export const getPayrollSettings = () => get<PayrollSettings>('/api/hr/payroll-settings')
export const updatePayrollSettings = (input: PayrollSettingsPayload) =>
  put<PayrollSettings>('/api/hr/payroll-settings', input)
export const createPayrollAdjustment = (input: object) =>
  post<PayrollAdjustment>('/api/hr/payroll-adjustments', input)
export const createBulkPayrollAdjustments = (input: object) =>
  post<PayrollAdjustment[]>('/api/hr/payroll-adjustments/bulk', input)
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
export const getHrDashboard = (dateKey?: string, days?: 1 | 7 | 30) =>
  get<HrDashboard>('/api/hr/dashboard', { dateKey, days })
export const getMyHrWorkspace = (params: Query) =>
  get<MyHrWorkspace>('/api/hr/workspace/me', params)
export const getTeamHrWorkspace = (params: TeamWorkspaceQuery) =>
  get<TeamHrWorkspace>('/api/hr/workspace/team', params)
