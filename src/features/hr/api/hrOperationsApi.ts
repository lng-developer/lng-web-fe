import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
export type Page<T> = {
  items: T[]
  pagination: { page: number; limit: number; total: number; totalPages: number }
}
type Query = Record<string, boolean | number | string | null | undefined>
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type WorkLocation = {
  id: string
  code: string
  name: string
  timezone: string
  status: string
}
export type WorkLocationInput = { code?: string; name?: string; timezone?: string; status?: string }
export type Shift = {
  id: string
  code: string
  name: string
  workLocationId: string | null
  workLocation?: WorkLocation | null
  startTime: string
  endTime: string
  breakMinutes: number
  graceMinutes: number
  workdays: number[]
  status: string
}
export type ShiftInput = {
  code?: string
  name?: string
  workLocationId?: string | null
  startTime?: string
  endTime?: string
  breakMinutes?: number
  graceMinutes?: number
  workdays?: number[]
  status?: string
}
export type ShiftAssignment = {
  id: string
  profileId: string
  shiftId: string
  workLocationId: string
  employee?: { fullName?: string; employeeCode?: string } | null
  shift?: Shift | null
  workLocation?: WorkLocation | null
  effectiveFrom: string
  effectiveTo: string | null
  status: string
}
export type ShiftAssignmentInput = {
  profileId?: string
  shiftId?: string
  workLocationId?: string
  effectiveFrom?: string
  effectiveTo?: string | null
  status?: string
}
export type CalendarOverride = {
  id: string
  dateKey: string
  kind: string
  scopeType: string
  scopeId: string | null
  name: string
  status: string
  scopeTarget?: { name?: string } | null
}
export type CalendarOverrideInput = {
  dateKey?: string
  kind?: string
  scopeType?: string
  scopeId?: string | null
  name?: string
  status?: string
}
export type Holiday = {
  id: string
  name: string
  dateKey: string
  holidayType: string
  isWorkDay: boolean
  isPaid: boolean
  appliedDepartmentIds: string[]
  appliedTeamIds: string[]
  note: string | null
  isActive?: boolean
}
export type HolidayInput = {
  name?: string
  dateKey?: string
  holidayType?: string
  isWorkDay?: boolean
  appliedDepartmentIds?: string[]
  appliedTeamIds?: string[]
  note?: string | null
  isActive?: boolean
}
export type SaturdayRotation = {
  id: string
  teamId: string
  dateKey: string
  month: number
  year: number
  employeeProfileIds: string[]
  minPresent: number
  source: string
}
export type RotationInput = {
  teamId: string
  month: number
  year: number
  minPresent?: number
  customRotations?: Array<{ dateKey: string; employeeProfileIds: string[] }>
}
export type SaturdayRotationGenerateResponse = {
  generated: number
  items: SaturdayRotation[]
}

const list = async <T>(path: string, params: Query = {}) =>
  unwrap<Page<T>>(await apiClient.get(path, { params }))
const create = async <T>(path: string, input: object) =>
  unwrap<T>(await apiClient.post(path, input))
const update = async <T>(path: string, input: object) =>
  unwrap<T>(await apiClient.patch(path, input))

export const listWorkLocations = (params: Query = {}) =>
  list<WorkLocation>('/api/hr/work-locations', params)
export const createWorkLocation = (input: WorkLocationInput) =>
  create<WorkLocation>('/api/hr/work-locations', input)
export const updateWorkLocation = (id: string, input: WorkLocationInput) =>
  update<WorkLocation>(`/api/hr/work-locations/${id}`, input)
export const listShifts = (params: Query = {}) => list<Shift>('/api/hr/shifts', params)
export const createShift = (input: ShiftInput) => create<Shift>('/api/hr/shifts', input)
export const updateShift = (id: string, input: ShiftInput) =>
  update<Shift>(`/api/hr/shifts/${id}`, input)
export const listShiftAssignments = (params: Query = {}) =>
  list<ShiftAssignment>('/api/hr/shift-assignments', params)
export const createShiftAssignment = (input: ShiftAssignmentInput) =>
  create<ShiftAssignment>('/api/hr/shift-assignments', input)
export const updateShiftAssignment = (id: string, input: ShiftAssignmentInput) =>
  update<ShiftAssignment>(`/api/hr/shift-assignments/${id}`, input)
export const listCalendarOverrides = (params: Query = {}) =>
  list<CalendarOverride>('/api/hr/calendar-overrides', params)
export const createCalendarOverride = (input: CalendarOverrideInput) =>
  create<CalendarOverride>('/api/hr/calendar-overrides', input)
export const updateCalendarOverride = (id: string, input: CalendarOverrideInput) =>
  update<CalendarOverride>(`/api/hr/calendar-overrides/${id}`, input)

export const listHolidays = (params: Query = {}) => list<Holiday>('/api/hr/holidays', params)
export const getHoliday = async (id: string) =>
  unwrap<Holiday>(await apiClient.get(`/api/hr/holidays/${id}`))
export const listHolidayTemplates = async () =>
  unwrap<Holiday[]>(await apiClient.get('/api/hr/holidays/templates'))
export const listHolidayRange = async (params: Query) =>
  unwrap<Holiday[]>(await apiClient.get('/api/hr/holidays/range', { params }))
export const checkHoliday = async (params: Query) =>
  unwrap<unknown>(await apiClient.get('/api/hr/holidays/check', { params }))
export const summarizeHolidays = async (year: number) =>
  unwrap<unknown>(await apiClient.get(`/api/hr/holidays/summary/${year}`))
export const bulkImportHolidays = (items: HolidayInput[]) =>
  create<Holiday[]>('/api/hr/holidays/bulk-import', { items })
export const createHoliday = (input: HolidayInput) => create<Holiday>('/api/hr/holidays', input)
export const updateHoliday = (id: string, input: HolidayInput) =>
  update<Holiday>(`/api/hr/holidays/${id}`, input)
export const deleteHoliday = async (id: string) =>
  unwrap<Holiday>(await apiClient.delete(`/api/hr/holidays/${id}`))

export const listSaturdayRotations = (params: Query = {}) =>
  list<SaturdayRotation>('/api/hr/saturday-rotations', params)
export const listSaturdayRotationMatrix = async (params: Query) =>
  unwrap<unknown>(await apiClient.get('/api/hr/saturday-rotations/matrix', { params }))
export const createSaturdayRotation = (input: {
  teamId: string
  dateKey: string
  employeeProfileIds: string[]
  minPresent?: number
}) => create<SaturdayRotation>('/api/hr/saturday-rotations', input)
export const generateSaturdayRotations = (input: RotationInput) =>
  create<SaturdayRotationGenerateResponse>('/api/hr/saturday-rotations/generate', input)
export const updateSaturdayRotation = (id: string, employeeProfileIds: string[]) =>
  update<SaturdayRotation>(`/api/hr/saturday-rotations/${id}`, { employeeProfileIds })
export const deleteSaturdayRotation = async (id: string) =>
  unwrap<SaturdayRotation>(await apiClient.delete(`/api/hr/saturday-rotations/${id}`))
export const deleteTeamSaturdayRotations = async (teamId: string, month: number, year: number) =>
  unwrap<unknown>(
    await apiClient.delete(`/api/hr/saturday-rotations/team/${teamId}`, {
      params: { month, year },
    }),
  )
