import { Linter } from 'eslint'
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import test from 'node:test'

const q = 'src/features/hr-time/api/hrTime.queries.js'
const m = 'src/features/hr-time/api/hrTime.mutations.js'
const payrollQ = 'src/features/hr-payroll/api/hrPayroll.queries.js'
const payrollM = 'src/features/hr-payroll/api/hrPayroll.mutations.js'

const routes = [
  { method: 'GET', path: '/api/hr/health', disposition: 'headless', sourceFiles: [] },
  {
    method: 'GET',
    path: '/api/hr/employee-profiles',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILES' },
      { file: 'src/features/hr-time/pages/PeoplePage.jsx', evidence: 'useEmployeeProfilesQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/employee-profiles',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILES' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useCreateEmployeeProfileMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/employee-profiles/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.MY_EMPLOYEE_PROFILE' },
      { file: 'src/routes/ProtectedRoute.jsx', evidence: 'useMyEmployeeProfileQuery' },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/employee-profiles/:profileId/restore',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILE_RESTORE' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useRestoreEmployeeProfileMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/employee-profiles/:profileId',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId)' },
      {
        file: 'src/features/hr-time/components/EmployeeProfileDrawer.jsx',
        evidence: 'useEmployeeProfileQuery',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/employee-profiles/:profileId',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId)' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useUpdateEmployeeProfileMutation',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/employee-profiles/:profileId',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.EMPLOYEE_PROFILE(profileId)' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useDeleteEmployeeProfileMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/work-locations',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.WORK_LOCATIONS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useWorkLocationsQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/work-locations',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.WORK_LOCATIONS' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useCreateWorkLocationMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/work-locations/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.WORK_LOCATION(id)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useUpdateWorkLocationMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/shifts',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.SHIFTS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useShiftsQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/shifts',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SHIFTS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useCreateShiftMutation' },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/shifts/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SHIFT(id)' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useUpdateShiftMutation' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/shift-assignments',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.SHIFT_ASSIGNMENTS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useShiftAssignmentsQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/shift-assignments',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SHIFT_ASSIGNMENTS' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useCreateShiftAssignmentMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/shift-assignments/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SHIFT_ASSIGNMENT(id)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useUpdateShiftAssignmentMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/calendar-overrides',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.CALENDAR_OVERRIDES' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useCalendarOverridesQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/calendar-overrides',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.CALENDAR_OVERRIDES' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useCreateCalendarOverrideMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/calendar-overrides/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.CALENDAR_OVERRIDE(id)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useUpdateCalendarOverrideMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays/templates',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAY_TEMPLATES' },
      {
        file: 'src/features/hr-time/components/HolidayPolicySummary.jsx',
        evidence: 'useHolidayTemplatesQuery',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays/range',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAY_RANGE' },
      {
        file: 'src/features/hr-time/components/HolidayPolicySummary.jsx',
        evidence: 'useHolidayRangeQuery',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays/check',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAY_CHECK' },
      {
        file: 'src/features/hr-time/components/HolidayPolicySummary.jsx',
        evidence: 'useHolidayCheckQuery',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays/summary/:year',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAY_SUMMARY(year)' },
      {
        file: 'src/features/hr-time/components/HolidayPolicySummary.jsx',
        evidence: 'useHolidaySummaryQuery',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAYS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useHolidaysQuery' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/holidays/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.HOLIDAY(holidayId)' },
      {
        file: 'src/features/hr-time/components/HolidayDetailDrawer.jsx',
        evidence: 'useHolidayDetailQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/holidays/bulk-import',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.HOLIDAY_BULK_IMPORT' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useBulkImportHolidaysMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/holidays',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.HOLIDAYS' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useCreateHolidayMutation' },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/holidays/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.HOLIDAY(id)' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useUpdateHolidayMutation' },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/holidays/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.HOLIDAY(id)' },
      { file: 'src/features/hr-time/pages/SchedulePage.jsx', evidence: 'useDeleteHolidayMutation' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/saturday-rotations',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.SATURDAY_ROTATIONS' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useSaturdayRotationsQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/saturday-rotations/generate',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SATURDAY_ROTATIONS_GENERATE' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useGenerateSaturdayRotationsMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/saturday-rotations/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SATURDAY_ROTATION(id)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useUpdateSaturdayRotationMutation',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/saturday-rotations/team/:teamId',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SATURDAY_ROTATION_TEAM(teamId)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useDeleteTeamSaturdayRotationsMutation',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/saturday-rotations/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.SATURDAY_ROTATION(id)' },
      {
        file: 'src/features/hr-time/pages/SchedulePage.jsx',
        evidence: 'useDeleteSaturdayRotationMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/attendance',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.ATTENDANCE' },
      { file: 'src/features/hr-time/pages/AttendanceDeskPage.jsx', evidence: 'useAttendanceQuery' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/attendance/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.MY_ATTENDANCE' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useMyAttendanceQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/attendance/check-in',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.ATTENDANCE_CHECK_IN' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useCheckInMutation' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/attendance/check-out',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.ATTENDANCE_CHECK_OUT' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useCheckOutMutation' },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/attendance/:attendanceId',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.ATTENDANCE_RECORD(attendanceId)' },
      {
        file: 'src/features/hr-time/pages/AttendanceDeskPage.jsx',
        evidence: 'useAdjustAttendanceMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/leave-balances/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.MY_LEAVE_BALANCES' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useMyLeaveBalancesQuery' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/leave-balances/:profileId/:year/:leaveType',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE(profileId, year, leaveType)' },
      {
        file: 'src/features/hr-time/components/LeaveBalancePanel.jsx',
        evidence: 'useLeaveBalanceQuery',
      },
    ],
  },
  {
    method: 'PUT',
    path: '/api/hr/leave-balances/:profileId/:year/:leaveType',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE(profileId, year, leaveType)' },
      {
        file: 'src/features/hr-time/components/LeaveBalancePanel.jsx',
        evidence: 'useUpsertLeaveBalanceMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/leave-balances/:profileId/:year/:leaveType/adjust',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE_ADJUST(profileId, year, leaveType)' },
      {
        file: 'src/features/hr-time/components/LeaveBalancePanel.jsx',
        evidence: 'useAdjustLeaveBalanceMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-balances/accrue',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE_ACCRUE' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useAccrueLeaveBalancesMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-balances/reset',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE_RESET' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useResetLeaveBalancesMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-balances/carry-over',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_BALANCE_CARRY_OVER' },
      {
        file: 'src/features/hr-time/pages/PeoplePage.jsx',
        evidence: 'useCarryOverLeaveBalancesMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/leave-requests',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.LEAVE_REQUESTS' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useLeaveRequestsQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUESTS' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'useCreateLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/preview',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_PREVIEW' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'usePreviewLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/leave-requests/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.MY_LEAVE_REQUESTS' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useMyLeaveRequestsQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/:requestId/approve',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_APPROVE(requestId)' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useApproveLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/:requestId/reject',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_REJECT(requestId)' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useRejectLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/:requestId/refund',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_REFUND(requestId)' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useRefundLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/:requestId/cancel',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_CANCEL(requestId)' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'useCancelLeaveRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/leave-requests/:requestId/attachments',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.LEAVE_REQUEST_ATTACHMENTS(requestId)' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'useAttachLeaveReferencesMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/overtime-requests',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.OVERTIME_REQUESTS' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useOvertimeRequestsQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/overtime-requests',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.OVERTIME_REQUESTS' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'useCreateOvertimeRequestMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/overtime-requests/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: q, evidence: 'ENDPOINTS.HR.MY_OVERTIME_REQUESTS' },
      { file: 'src/features/hr-time/pages/MyTimePage.jsx', evidence: 'useMyOvertimeRequestsQuery' },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/overtime-requests/:requestId/approve',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.OVERTIME_REQUEST_APPROVE(requestId)' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useApproveOvertimeRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/overtime-requests/:requestId/reject',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.OVERTIME_REQUEST_REJECT(requestId)' },
      {
        file: 'src/features/hr-time/pages/RequestInboxPage.jsx',
        evidence: 'useRejectOvertimeRequestMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/overtime-requests/:requestId/cancel',
    disposition: 'runtime',
    sourceFiles: [
      { file: m, evidence: 'ENDPOINTS.HR.OVERTIME_REQUEST_CANCEL(requestId)' },
      {
        file: 'src/features/hr-time/pages/MyTimePage.jsx',
        evidence: 'useCancelOvertimeRequestMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/payrolls',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollQ, evidence: 'ENDPOINTS.HR.PAYROLLS' },
      {
        file: 'src/features/hr-payroll/pages/PayrollRunsPage.jsx',
        evidence: 'usePayrollRunsQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/payrolls/run',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: '`${ENDPOINTS.HR.PAYROLLS}/run`' },
      {
        file: 'src/features/hr-payroll/pages/PayrollRunsPage.jsx',
        evidence: 'useRunPayrollMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/payrolls/me',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollQ, evidence: 'ENDPOINTS.HR.MY_PAYROLLS' },
      { file: 'src/features/hr-payroll/pages/MyPayslipsPage.jsx', evidence: 'useMyPayslipsQuery' },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/payrolls/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollQ, evidence: 'ENDPOINTS.HR.PAYROLL_RUN(id)' },
      {
        file: 'src/features/hr-payroll/components/PayrollReviewDrawer.jsx',
        evidence: 'usePayrollRunQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/payrolls/:id/finalize',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_FINALIZE(payrollRunId)' },
      {
        file: 'src/features/hr-payroll/pages/PayrollRunsPage.jsx',
        evidence: 'useFinalizePayrollMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/payrolls/:id/mark-paid',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_MARK_PAID(payrollRunId)' },
      {
        file: 'src/features/hr-payroll/components/PayrollReviewDrawer.jsx',
        evidence: 'useMarkPayrollPaidMutation',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/payrolls/:id/email',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_EMAIL(payrollRunId)' },
      {
        file: 'src/features/hr-payroll/pages/PayrollRunsPage.jsx',
        evidence: 'useEmailPayrollMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/payroll-adjustments',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollQ, evidence: 'ENDPOINTS.HR.PAYROLL_ADJUSTMENTS' },
      {
        file: 'src/features/hr-payroll/components/PayrollAdjustmentsPanel.jsx',
        evidence: 'usePayrollAdjustmentsQuery',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/payroll-adjustments',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_ADJUSTMENTS' },
      {
        file: 'src/features/hr-payroll/components/PayrollAdjustmentsPanel.jsx',
        evidence: 'useCreatePayrollAdjustmentMutation',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/payroll-adjustments/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_ADJUSTMENT(adjustmentId)' },
      {
        file: 'src/features/hr-payroll/components/PayrollAdjustmentsPanel.jsx',
        evidence: 'useUpdatePayrollAdjustmentMutation',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/payroll-adjustments/:id',
    disposition: 'runtime',
    sourceFiles: [
      { file: payrollM, evidence: 'ENDPOINTS.HR.PAYROLL_ADJUSTMENT(adjustmentId)' },
      {
        file: 'src/features/hr-payroll/components/PayrollAdjustmentsPanel.jsx',
        evidence: 'useCancelPayrollAdjustmentMutation',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/announcements',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-communication/pages/AnnouncementsPage.jsx',
        evidence: 'ENDPOINTS.HR.ANNOUNCEMENTS',
      },
    ],
  },
  {
    method: 'POST',
    path: '/api/hr/announcements',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-communication/pages/AnnouncementsPage.jsx',
        evidence: 'ENDPOINTS.HR.ANNOUNCEMENTS',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/announcements/:id',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-communication/components/AnnouncementDetailDrawer.jsx',
        evidence: 'ENDPOINTS.HR.ANNOUNCEMENT(announcementId)',
      },
    ],
  },
  {
    method: 'PATCH',
    path: '/api/hr/announcements/:id',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-communication/pages/AnnouncementsPage.jsx',
        evidence: 'ENDPOINTS.HR.ANNOUNCEMENT(id)',
      },
    ],
  },
  {
    method: 'DELETE',
    path: '/api/hr/announcements/:id',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-communication/pages/AnnouncementsPage.jsx',
        evidence: 'ENDPOINTS.HR.ANNOUNCEMENT(id)',
      },
    ],
  },
  {
    method: 'GET',
    path: '/api/hr/dashboard',
    disposition: 'runtime',
    sourceFiles: [
      {
        file: 'src/features/hr-dashboard/api/hrDashboard.queries.js',
        evidence: 'ENDPOINTS.HR.DASHBOARD',
      },
      {
        file: 'src/features/hr-dashboard/pages/HrDashboardPage.jsx',
        evidence: 'useHrDashboardQuery',
      },
    ],
  },
]

function listSourceFiles(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name)
    return entry.isDirectory() ? listSourceFiles(path) : [path]
  })
}

function parseSource(file, source) {
  const linter = new Linter({ configType: 'eslintrc' })
  let ast
  linter.defineRule('capture-ast', {
    create(context) {
      ast = context.sourceCode.ast
      return {}
    },
  })
  const errors = linter.verify(
    source,
    {
      parserOptions: { ecmaVersion: 'latest', sourceType: 'module', ecmaFeatures: { jsx: true } },
      rules: { 'capture-ast': 'error' },
    },
    { allowInlineConfig: false },
  )
  assert.deepEqual(errors, [], `${file} must parse before its hooks can be audited`)
  return ast
}

function visit(node, callback) {
  if (!node || typeof node !== 'object') return
  if (Array.isArray(node)) {
    node.forEach((child) => visit(child, callback))
    return
  }
  if (node.type) callback(node)
  Object.entries(node).forEach(([key, child]) => key !== 'parent' && visit(child, callback))
}

function findUnusedHooks(files) {
  const parsedFiles = files.map(({ file, source }) => {
    const ast = parseSource(file, source)
    const calls = new Set()
    visit(ast, (node) => {
      if (node.type !== 'CallExpression') return
      if (node.callee.type === 'Identifier') calls.add(node.callee.name)
      if (node.callee.type === 'MemberExpression' && node.callee.property?.name) {
        calls.add(node.callee.property.name)
      }
    })
    return { file, ast, calls }
  })
  const definitions = parsedFiles
    .filter(
      ({ file }) => file.startsWith('src/features/hr-') && !/\.(test|spec)\.[jt]sx?$/.test(file),
    )
    .flatMap(({ file, ast }) => {
      const hooks = []
      for (const statement of ast.body) {
        assert.notEqual(
          statement.type,
          'ExportAllDeclaration',
          `${file} must name re-exported hooks explicitly`,
        )
        if (
          statement.type !== 'ExportNamedDeclaration' &&
          statement.type !== 'ExportDefaultDeclaration'
        )
          continue
        const declaration = statement.declaration
        if (declaration?.type === 'FunctionDeclaration' && declaration.id)
          hooks.push(declaration.id.name)
        if (statement.type === 'ExportDefaultDeclaration' && declaration?.type === 'Identifier') {
          hooks.push(declaration.name)
        }
        if (declaration?.type === 'VariableDeclaration') {
          declaration.declarations.forEach(
            ({ id }) => id.type === 'Identifier' && hooks.push(id.name),
          )
        }
        statement.specifiers?.forEach(({ exported, local }) => {
          const exportedName = exported.name || exported.value
          hooks.push(exportedName === 'default' ? local.name || local.value : exportedName)
        })
      }
      return hooks.filter((hook) => /^use[A-Z]\w*$/.test(hook)).map((hook) => ({ file, hook }))
    })

  return definitions
    .filter(
      ({ file, hook }) =>
        !parsedFiles.some(
          (candidate) =>
            candidate.file !== file &&
            !/\.(test|spec)\.[jt]sx?$/.test(candidate.file) &&
            candidate.calls.has(hook),
        ),
    )
    .map(({ hook }) => hook)
}

test('hook scan recognizes export lists and requires non-test call expressions', () => {
  const files = [
    {
      file: 'src/features/hr-example/hooks.js',
      source: `
        const useNamedOnlyInTest = () => {}
        export { useNamedOnlyInTest }
        export const useCalled = () => {}
        export const useMentionedOnly = () => {}
        const useDefaultOnly = () => {}
        export default useDefaultOnly
      `,
    },
    {
      file: 'src/features/hr-example/reExport.js',
      source: `
        const useReExportedDefaultOnly = () => {}
        export { useReExportedDefaultOnly as default }
      `,
    },
    {
      file: 'src/features/hr-example/Owner.jsx',
      source: `
        const text = 'useMentionedOnly('
        // useMentionedOnly()
        useCalled()
      `,
    },
    {
      file: 'src/features/hr-example/Owner.test.jsx',
      source: 'useNamedOnlyInTest()',
    },
  ]

  assert.deepEqual(findUnusedHooks(files), [
    'useNamedOnlyInTest',
    'useMentionedOnly',
    'useDefaultOnly',
    'useReExportedDefaultOnly',
  ])
})

test('all 79 HR routes have explicit runtime or headless coverage', () => {
  assert.equal(routes.length, 79)
  assert.equal(routes.filter(({ disposition }) => disposition === 'runtime').length, 78)
  assert.deepEqual(
    routes
      .filter(({ disposition }) => disposition === 'headless')
      .map(({ method, path }) => `${method} ${path}`),
    ['GET /api/hr/health'],
  )
  assert.equal(new Set(routes.map(({ method, path }) => `${method} ${path}`)).size, routes.length)

  for (const route of routes.filter(({ disposition }) => disposition === 'runtime')) {
    assert.ok(
      route.sourceFiles.some(({ file }) => /\/(pages|components)\/|\/routes\//.test(file)),
      `${route.method} ${route.path} has no runtime page/component`,
    )
    for (const { file, evidence } of route.sourceFiles) {
      assert.match(
        readFileSync(file, 'utf8'),
        new RegExp(evidence.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')),
        `${route.method} ${route.path}: ${evidence} missing from ${file}`,
      )
    }
  }
})

test('every exported HR hook is used outside its definition and tests', () => {
  const files = listSourceFiles('src')
    .filter((file) => /\.[jt]sx?$/.test(file))
    .map((file) => ({
      file: relative('.', file).replaceAll('\\', '/'),
      source: readFileSync(file, 'utf8'),
    }))
  assert.deepEqual(findUnusedHooks(files), [])
})
