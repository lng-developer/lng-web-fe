import { keepPreviousData, useQuery } from '@tanstack/react-query'

import { useDebounce } from '@/hooks/useDebounce'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  mapAttendanceMonthMatrix,
  mapAttendanceRow,
  mapCalendarOverrideRow,
  mapEmployeeProfileRow,
  mapHrTimeCollection,
  mapLeaveBalanceRow,
  mapLeaveRequestRow,
  mapOvertimeRequestRow,
  mapShiftAssignmentRow,
  mapShiftRow,
  mapWorkLocationRow,
  normalizeHrTimeQuery,
  unwrapHrTimeResponse,
} from '../utils/hrTimeApi.js'
import { hrTimeKeys } from './hrTime.keys.js'

function useHrTimeListQuery(queryKey, endpoint, params = {}, mapper, options = {}) {
  const debouncedSearch = useDebounce(params.q, 300)
  const query = normalizeHrTimeQuery({ ...params, q: debouncedSearch })

  return useQuery({
    queryKey: queryKey(query),
    queryFn: () =>
      apiClient
        .get(endpoint, { params: query })
        .then(unwrapHrTimeResponse)
        .then((payload) => mapHrTimeCollection(payload, mapper)),
    placeholderData: keepPreviousData,
    ...options,
  })
}

function useHrTimeDetailQuery(queryKey, endpoint, params, mapper, options = {}) {
  return useQuery({
    queryKey,
    queryFn: () =>
      apiClient
        .get(endpoint, { params: normalizeHrTimeQuery(params) })
        .then(unwrapHrTimeResponse)
        .then(mapper),
    enabled: Boolean(endpoint),
    ...options,
  })
}

export function useEmployeeProfilesQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listEmployeeProfiles,
    ENDPOINTS.HR.EMPLOYEE_PROFILES,
    params,
    mapEmployeeProfileRow,
    options,
  )
}

export function useAssignableStaffRolesQuery(options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.assignableStaffRoles(),
    ENDPOINTS.HR.STAFF_PROVISIONING_ROLES,
    undefined,
    (roles) => roles,
    options,
  )
}

export function useEmployeeProfileQuery(profileId, params, options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.employeeProfile(profileId, params),
    profileId && ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId),
    params,
    mapEmployeeProfileRow,
    options,
  )
}

export function useMyEmployeeProfileQuery(options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.myEmployeeProfile(),
    ENDPOINTS.HR.MY_EMPLOYEE_PROFILE,
    undefined,
    mapEmployeeProfileRow,
    options,
  )
}

export function useWorkLocationsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listWorkLocations,
    ENDPOINTS.HR.WORK_LOCATIONS,
    params,
    mapWorkLocationRow,
    options,
  )
}

export function useShiftsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listShifts,
    ENDPOINTS.HR.SHIFTS,
    params,
    mapShiftRow,
    options,
  )
}

export function useShiftAssignmentsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listAssignments,
    ENDPOINTS.HR.SHIFT_ASSIGNMENTS,
    params,
    mapShiftAssignmentRow,
    options,
  )
}

export function useCalendarOverridesQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listCalendarOverrides,
    ENDPOINTS.HR.CALENDAR_OVERRIDES,
    params,
    mapCalendarOverrideRow,
    options,
  )
}

export function useHolidaysQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listHolidays,
    ENDPOINTS.HR.HOLIDAYS,
    params,
    (row) => row,
    options,
  )
}

export function useHolidayDetailQuery(holidayId, options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.holiday(holidayId),
    holidayId && ENDPOINTS.HR.HOLIDAY(holidayId),
    undefined,
    (holiday) => holiday,
    options,
  )
}

export function useHolidayTemplatesQuery(options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.holidayTemplates(),
    ENDPOINTS.HR.HOLIDAY_TEMPLATES,
    undefined,
    (templates) => templates,
    options,
  )
}

export function useHolidayRangeQuery(params = {}, options = {}) {
  const { dateFrom, dateTo } = params
  return useHrTimeDetailQuery(
    hrTimeKeys.holidayRange(params),
    dateFrom && dateTo && ENDPOINTS.HR.HOLIDAY_RANGE,
    params,
    (range) => range,
    { ...options, enabled: Boolean(dateFrom && dateTo) && options.enabled !== false },
  )
}

export function useHolidayCheckQuery(params = {}, options = {}) {
  return useHrTimeDetailQuery(
    hrTimeKeys.holidayCheck(params),
    params.dateKey && ENDPOINTS.HR.HOLIDAY_CHECK,
    params,
    (result) => result,
    { ...options, enabled: Boolean(params.dateKey) && options.enabled !== false },
  )
}

export function useHolidaySummaryQuery(year, options = {}) {
  const validYear = Number.isInteger(Number(year)) && Number(year) >= 2000 && Number(year) <= 9999
  return useHrTimeDetailQuery(
    hrTimeKeys.holidaySummary(year),
    validYear && ENDPOINTS.HR.HOLIDAY_SUMMARY(year),
    undefined,
    (summary) => summary,
    { ...options, enabled: validYear && options.enabled !== false },
  )
}

export function useSaturdayRotationsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listRotations,
    ENDPOINTS.HR.SATURDAY_ROTATIONS,
    params,
    (row) => row,
    options,
  )
}

export function useSaturdayRotationMatrixQuery(params, options = {}) {
  return useHrTimeDetailQuery(
    hrTimeKeys.rotationMatrix(params),
    ENDPOINTS.HR.SATURDAY_ROTATIONS_MATRIX,
    params,
    (matrix) => matrix,
    options,
  )
}

export function useAttendanceQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listAttendance,
    ENDPOINTS.HR.ATTENDANCE,
    params,
    mapAttendanceRow,
    options,
  )
}

export function useAttendanceMonthMatrixQuery(params = {}, options = {}) {
  const debouncedSearch = useDebounce(params.q, 300)
  const query = normalizeHrTimeQuery({ ...params, q: debouncedSearch })

  return useQuery({
    queryKey: hrTimeKeys.attendanceMonthMatrix(query),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.ATTENDANCE_MONTH_MATRIX, { params: query })
        .then(unwrapHrTimeResponse)
        .then(mapAttendanceMonthMatrix),
    placeholderData: keepPreviousData,
    ...options,
  })
}

export function useMyAttendanceQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.myAttendance,
    ENDPOINTS.HR.MY_ATTENDANCE,
    params,
    mapAttendanceRow,
    options,
  )
}

export function useMyLeaveBalancesQuery(year, options = {}) {
  return useQuery({
    queryKey: hrTimeKeys.myLeaveBalances(year),
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.MY_LEAVE_BALANCES, { params: normalizeHrTimeQuery({ year }) })
        .then(unwrapHrTimeResponse)
        .then((balances) => balances.map(mapLeaveBalanceRow)),
    enabled: Boolean(year) && options.enabled !== false,
    ...options,
  })
}

export function useLeaveBalanceQuery(profileId, year, leaveType, options) {
  return useHrTimeDetailQuery(
    hrTimeKeys.leaveBalance(profileId, year, leaveType),
    profileId && year && leaveType && ENDPOINTS.HR.LEAVE_BALANCE(profileId, year, leaveType),
    undefined,
    mapLeaveBalanceRow,
    options,
  )
}

export function useLeaveRequestsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listLeave,
    ENDPOINTS.HR.LEAVE_REQUESTS,
    params,
    mapLeaveRequestRow,
    options,
  )
}

export function useMyLeaveRequestsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.myLeave,
    ENDPOINTS.HR.MY_LEAVE_REQUESTS,
    params,
    mapLeaveRequestRow,
    options,
  )
}

export function useOvertimeRequestsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.listOvertime,
    ENDPOINTS.HR.OVERTIME_REQUESTS,
    params,
    mapOvertimeRequestRow,
    options,
  )
}

export function useMyOvertimeRequestsQuery(params, options) {
  return useHrTimeListQuery(
    hrTimeKeys.myOvertime,
    ENDPOINTS.HR.MY_OVERTIME_REQUESTS,
    params,
    mapOvertimeRequestRow,
    options,
  )
}
