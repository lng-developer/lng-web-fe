import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildLeaveAttachmentPayload,
  buildLeaveRefundPayload,
  normalizeIdArray,
  unwrapHrTimeResponse,
} from '../utils/hrTimeApi.js'
import { hrTimeKeys } from './hrTime.keys.js'

function request(method, endpoint, payload) {
  return apiClient[method](endpoint, payload).then(unwrapHrTimeResponse)
}

function useHrTimeMutation(mutationFn, keysForSuccess) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    retry: false,
    onSuccess: async (_data, variables) => {
      await Promise.all(
        keysForSuccess(variables).map((queryKey) => queryClient.invalidateQueries({ queryKey })),
      )
    },
  })
}

export function useCreateEmployeeProfileMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.EMPLOYEE_PROFILES, payload),
    () => [hrTimeKeys.employeeProfiles()],
  )
}

export function useUpdateEmployeeProfileMutation() {
  return useHrTimeMutation(
    ({ profileId, payload }) => request('patch', ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId), payload),
    ({ profileId }) => [hrTimeKeys.employeeProfiles(), hrTimeKeys.employeeProfile(profileId)],
  )
}

export function useRestoreEmployeeProfileMutation() {
  return useHrTimeMutation(
    ({ profileId }) => request('patch', ENDPOINTS.HR.EMPLOYEE_PROFILE_RESTORE(profileId)),
    ({ profileId }) => [hrTimeKeys.employeeProfiles(), hrTimeKeys.employeeProfile(profileId)],
  )
}

export function useDeleteEmployeeProfileMutation() {
  return useHrTimeMutation(
    ({ profileId }) => request('delete', ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId)),
    ({ profileId }) => [hrTimeKeys.employeeProfiles(), hrTimeKeys.employeeProfile(profileId)],
  )
}

export function useCreateWorkLocationMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.WORK_LOCATIONS, payload),
    () => [hrTimeKeys.workLocations(), hrTimeKeys.shifts(), hrTimeKeys.assignments()],
  )
}

export function useUpdateWorkLocationMutation() {
  return useHrTimeMutation(
    ({ id, payload }) => request('patch', ENDPOINTS.HR.WORK_LOCATION(id), payload),
    () => [hrTimeKeys.workLocations(), hrTimeKeys.shifts(), hrTimeKeys.assignments()],
  )
}

export function useCreateShiftMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.SHIFTS, payload),
    () => [hrTimeKeys.shifts(), hrTimeKeys.assignments()],
  )
}

export function useUpdateShiftMutation() {
  return useHrTimeMutation(
    ({ id, payload }) => request('patch', ENDPOINTS.HR.SHIFT(id), payload),
    () => [hrTimeKeys.shifts(), hrTimeKeys.assignments()],
  )
}

export function useCreateShiftAssignmentMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.SHIFT_ASSIGNMENTS, payload),
    () => [hrTimeKeys.assignments()],
  )
}

export function useUpdateShiftAssignmentMutation() {
  return useHrTimeMutation(
    ({ id, payload }) => request('patch', ENDPOINTS.HR.SHIFT_ASSIGNMENT(id), payload),
    () => [hrTimeKeys.assignments()],
  )
}

export function useCreateCalendarOverrideMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.CALENDAR_OVERRIDES, payload),
    () => [hrTimeKeys.calendarOverrides()],
  )
}

export function useUpdateCalendarOverrideMutation() {
  return useHrTimeMutation(
    ({ id, payload }) => request('patch', ENDPOINTS.HR.CALENDAR_OVERRIDE(id), payload),
    () => [hrTimeKeys.calendarOverrides()],
  )
}

export function useCreateHolidayMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.HOLIDAYS, payload),
    () => [hrTimeKeys.holidays()],
  )
}

export function useUpdateHolidayMutation() {
  return useHrTimeMutation(
    ({ id, payload }) => request('patch', ENDPOINTS.HR.HOLIDAY(id), payload),
    () => [hrTimeKeys.holidays()],
  )
}

export function useDeleteHolidayMutation() {
  return useHrTimeMutation(
    (id) => request('delete', ENDPOINTS.HR.HOLIDAY(id)),
    () => [hrTimeKeys.holidays()],
  )
}

export function useBulkImportHolidaysMutation() {
  return useHrTimeMutation(
    ({ items }) => request('post', ENDPOINTS.HR.HOLIDAY_BULK_IMPORT, { items }),
    () => [hrTimeKeys.holidays()],
  )
}

export function useCheckHolidayPolicyMutation() {
  return useHrTimeMutation(
    (params) => request('get', ENDPOINTS.HR.HOLIDAY_CHECK, { params }),
    () => [],
  )
}

export function useGenerateSaturdayRotationsMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.SATURDAY_ROTATIONS_GENERATE, payload),
    () => [hrTimeKeys.rotations()],
  )
}

export function useCreateSaturdayRotationMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.SATURDAY_ROTATIONS, payload),
    () => [hrTimeKeys.rotations()],
  )
}

export function useDeleteSaturdayRotationMutation() {
  return useHrTimeMutation(
    (id) => request('delete', ENDPOINTS.HR.SATURDAY_ROTATION(id)),
    () => [hrTimeKeys.rotations()],
  )
}

export function useUpdateSaturdayRotationMutation() {
  return useHrTimeMutation(
    ({ id, employeeProfileIds }) =>
      request('patch', ENDPOINTS.HR.SATURDAY_ROTATION(id), {
        employeeProfileIds: normalizeIdArray(employeeProfileIds),
      }),
    () => [hrTimeKeys.rotations()],
  )
}

export function useDeleteTeamSaturdayRotationsMutation() {
  return useHrTimeMutation(
    ({ teamId, month, year }) =>
      request('delete', ENDPOINTS.HR.SATURDAY_ROTATION_TEAM(teamId), {
        params: { month, year },
      }),
    () => [hrTimeKeys.rotations()],
  )
}

export function useCheckInMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.ATTENDANCE_CHECK_IN, payload),
    () => [hrTimeKeys.attendance(), hrTimeKeys.myAttendance()],
  )
}

export function useCheckOutMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.ATTENDANCE_CHECK_OUT, payload),
    () => [hrTimeKeys.attendance(), hrTimeKeys.myAttendance()],
  )
}

export function useAdjustAttendanceMutation() {
  return useHrTimeMutation(
    ({ attendanceId, payload }) =>
      request('patch', ENDPOINTS.HR.ATTENDANCE_RECORD(attendanceId), payload),
    () => [hrTimeKeys.attendance(), hrTimeKeys.myAttendance()],
  )
}

export function useUpsertLeaveBalanceMutation() {
  return useHrTimeMutation(
    ({ profileId, year, leaveType, payload }) =>
      request('put', ENDPOINTS.HR.LEAVE_BALANCE(profileId, year, leaveType), payload),
    ({ profileId, year, leaveType }) => [
      hrTimeKeys.leaveBalancesForEmployee(profileId),
      hrTimeKeys.leaveBalance(profileId, year, leaveType),
      hrTimeKeys.myLeaveBalances(year),
    ],
  )
}

export function useAdjustLeaveBalanceMutation() {
  return useHrTimeMutation(
    ({ profileId, year, leaveType, payload }) =>
      request('patch', ENDPOINTS.HR.LEAVE_BALANCE_ADJUST(profileId, year, leaveType), payload),
    ({ profileId, year, leaveType }) => [
      hrTimeKeys.leaveBalancesForEmployee(profileId),
      hrTimeKeys.leaveBalance(profileId, year, leaveType),
      hrTimeKeys.myLeaveBalances(year),
    ],
  )
}

export function useAccrueLeaveBalancesMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.LEAVE_BALANCE_ACCRUE, payload),
    () => [hrTimeKeys.leaveBalances()],
  )
}

export function useResetLeaveBalancesMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.LEAVE_BALANCE_RESET, payload),
    () => [hrTimeKeys.leaveBalances()],
  )
}

export function useCarryOverLeaveBalancesMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.LEAVE_BALANCE_CARRY_OVER, payload),
    () => [hrTimeKeys.leaveBalances()],
  )
}

export function useCreateLeaveRequestMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.LEAVE_REQUESTS, payload),
    () => [hrTimeKeys.leave()],
  )
}

export function usePreviewLeaveRequestMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.LEAVE_REQUEST_PREVIEW, payload),
    () => [],
  )
}

export function useUploadLeaveAttachmentMutation() {
  return useHrTimeMutation(
    (file) => {
      const formData = new FormData()
      formData.append('file', file)
      return request('post', ENDPOINTS.MEDIA.ASSETS, formData)
    },
    () => [],
  )
}

export function useAttachLeaveReferencesMutation() {
  return useHrTimeMutation(
    ({ requestId, assets }) =>
      request(
        'post',
        ENDPOINTS.HR.LEAVE_REQUEST_ATTACHMENTS(requestId),
        buildLeaveAttachmentPayload(assets),
      ),
    ({ requestId }) => [hrTimeKeys.leave(), hrTimeKeys.leaveDetail(requestId)],
  )
}

export function useRefundLeaveRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request(
        'post',
        ENDPOINTS.HR.LEAVE_REQUEST_REFUND(requestId),
        buildLeaveRefundPayload(payload),
      ),
    ({ requestId }) => [
      hrTimeKeys.leave(),
      hrTimeKeys.leaveDetail(requestId),
      hrTimeKeys.leaveBalances(),
    ],
  )
}

export function useApproveLeaveRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.LEAVE_REQUEST_APPROVE(requestId), payload),
    ({ requestId }) => [
      hrTimeKeys.leave(),
      hrTimeKeys.leaveDetail(requestId),
      hrTimeKeys.leaveBalances(),
    ],
  )
}

export function useRejectLeaveRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.LEAVE_REQUEST_REJECT(requestId), payload),
    ({ requestId }) => [hrTimeKeys.leave(), hrTimeKeys.leaveDetail(requestId)],
  )
}

export function useCancelLeaveRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.LEAVE_REQUEST_CANCEL(requestId), payload),
    ({ requestId }) => [
      hrTimeKeys.leave(),
      hrTimeKeys.leaveDetail(requestId),
      hrTimeKeys.leaveBalances(),
    ],
  )
}

export function useCreateOvertimeRequestMutation() {
  return useHrTimeMutation(
    (payload) => request('post', ENDPOINTS.HR.OVERTIME_REQUESTS, payload),
    () => [hrTimeKeys.overtime()],
  )
}

export function useApproveOvertimeRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.OVERTIME_REQUEST_APPROVE(requestId), payload),
    ({ requestId }) => [hrTimeKeys.overtime(), hrTimeKeys.overtimeDetail(requestId)],
  )
}

export function useRejectOvertimeRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.OVERTIME_REQUEST_REJECT(requestId), payload),
    ({ requestId }) => [hrTimeKeys.overtime(), hrTimeKeys.overtimeDetail(requestId)],
  )
}

export function useCancelOvertimeRequestMutation() {
  return useHrTimeMutation(
    ({ requestId, payload }) =>
      request('post', ENDPOINTS.HR.OVERTIME_REQUEST_CANCEL(requestId), payload),
    ({ requestId }) => [hrTimeKeys.overtime(), hrTimeKeys.overtimeDetail(requestId)],
  )
}
