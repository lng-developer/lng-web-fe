# HR API Frontend Coverage

Executable proof: `node --test src/features/hr/hrApiCoverage.test.js`.

- Routes: **79**
- Runtime coverage: **78**
- Headless routes: **1** (`GET /api/hr/health`)
- Exported HR hooks unused outside their definition/tests: **0**

| Method | Route                                                       | Owner page/component                     | Hook/API adapter                                  | Status   |
| ------ | ----------------------------------------------------------- | ---------------------------------------- | ------------------------------------------------- | -------- |
| GET    | `/api/hr/health`                                            | None                                     | None                                              | headless |
| GET    | `/api/hr/employee-profiles`                                 | `PeoplePage.jsx`                         | `useEmployeeProfilesQuery`                        | runtime  |
| POST   | `/api/hr/employee-profiles`                                 | `PeoplePage.jsx`                         | `useCreateEmployeeProfileMutation`                | runtime  |
| GET    | `/api/hr/employee-profiles/me`                              | `ProtectedRoute.jsx`                     | `useMyEmployeeProfileQuery`                       | runtime  |
| PATCH  | `/api/hr/employee-profiles/:profileId/restore`              | `PeoplePage.jsx`                         | `useRestoreEmployeeProfileMutation`               | runtime  |
| GET    | `/api/hr/employee-profiles/:profileId`                      | `EmployeeProfileDrawer.jsx`              | `useEmployeeProfileQuery`                         | runtime  |
| PATCH  | `/api/hr/employee-profiles/:profileId`                      | `PeoplePage.jsx`                         | `useUpdateEmployeeProfileMutation`                | runtime  |
| DELETE | `/api/hr/employee-profiles/:profileId`                      | `PeoplePage.jsx`                         | `useDeleteEmployeeProfileMutation`                | runtime  |
| GET    | `/api/hr/work-locations`                                    | `SchedulePage.jsx`                       | `useWorkLocationsQuery`                           | runtime  |
| POST   | `/api/hr/work-locations`                                    | `SchedulePage.jsx`                       | `useCreateWorkLocationMutation`                   | runtime  |
| PATCH  | `/api/hr/work-locations/:id`                                | `SchedulePage.jsx`                       | `useUpdateWorkLocationMutation`                   | runtime  |
| GET    | `/api/hr/shifts`                                            | `SchedulePage.jsx`                       | `useShiftsQuery`                                  | runtime  |
| POST   | `/api/hr/shifts`                                            | `SchedulePage.jsx`                       | `useCreateShiftMutation`                          | runtime  |
| PATCH  | `/api/hr/shifts/:id`                                        | `SchedulePage.jsx`                       | `useUpdateShiftMutation`                          | runtime  |
| GET    | `/api/hr/shift-assignments`                                 | `SchedulePage.jsx`                       | `useShiftAssignmentsQuery`                        | runtime  |
| POST   | `/api/hr/shift-assignments`                                 | `SchedulePage.jsx`                       | `useCreateShiftAssignmentMutation`                | runtime  |
| PATCH  | `/api/hr/shift-assignments/:id`                             | `SchedulePage.jsx`                       | `useUpdateShiftAssignmentMutation`                | runtime  |
| GET    | `/api/hr/calendar-overrides`                                | `SchedulePage.jsx`                       | `useCalendarOverridesQuery`                       | runtime  |
| POST   | `/api/hr/calendar-overrides`                                | `SchedulePage.jsx`                       | `useCreateCalendarOverrideMutation`               | runtime  |
| PATCH  | `/api/hr/calendar-overrides/:id`                            | `SchedulePage.jsx`                       | `useUpdateCalendarOverrideMutation`               | runtime  |
| GET    | `/api/hr/holidays/templates`                                | `HolidayPolicySummary.jsx`               | `useHolidayTemplatesQuery`                        | runtime  |
| GET    | `/api/hr/holidays/range`                                    | `HolidayPolicySummary.jsx`               | `useHolidayRangeQuery`                            | runtime  |
| GET    | `/api/hr/holidays/check`                                    | `HolidayPolicySummary.jsx`               | `useHolidayCheckQuery`                            | runtime  |
| GET    | `/api/hr/holidays/summary/:year`                            | `HolidayPolicySummary.jsx`               | `useHolidaySummaryQuery`                          | runtime  |
| GET    | `/api/hr/holidays`                                          | `SchedulePage.jsx`                       | `useHolidaysQuery`                                | runtime  |
| GET    | `/api/hr/holidays/:id`                                      | `HolidayDetailDrawer.jsx`                | `useHolidayDetailQuery`                           | runtime  |
| POST   | `/api/hr/holidays/bulk-import`                              | `SchedulePage.jsx`                       | `useBulkImportHolidaysMutation`                   | runtime  |
| POST   | `/api/hr/holidays`                                          | `SchedulePage.jsx`                       | `useCreateHolidayMutation`                        | runtime  |
| PATCH  | `/api/hr/holidays/:id`                                      | `SchedulePage.jsx`                       | `useUpdateHolidayMutation`                        | runtime  |
| DELETE | `/api/hr/holidays/:id`                                      | `SchedulePage.jsx`                       | `useDeleteHolidayMutation`                        | runtime  |
| GET    | `/api/hr/saturday-rotations`                                | `SchedulePage.jsx`                       | `useSaturdayRotationsQuery`                       | runtime  |
| POST   | `/api/hr/saturday-rotations/generate`                       | `SchedulePage.jsx`                       | `useGenerateSaturdayRotationsMutation`            | runtime  |
| PATCH  | `/api/hr/saturday-rotations/:id`                            | `SchedulePage.jsx`                       | `useUpdateSaturdayRotationMutation`               | runtime  |
| DELETE | `/api/hr/saturday-rotations/team/:teamId`                   | `SchedulePage.jsx`                       | `useDeleteTeamSaturdayRotationsMutation`          | runtime  |
| DELETE | `/api/hr/saturday-rotations/:id`                            | `SchedulePage.jsx`                       | `useDeleteSaturdayRotationMutation`               | runtime  |
| GET    | `/api/hr/attendance`                                        | `AttendanceDeskPage.jsx`                 | `useAttendanceQuery`                              | runtime  |
| GET    | `/api/hr/attendance/me`                                     | `MyTimePage.jsx`                         | `useMyAttendanceQuery`                            | runtime  |
| POST   | `/api/hr/attendance/check-in`                               | `MyTimePage.jsx`                         | `useCheckInMutation`                              | runtime  |
| POST   | `/api/hr/attendance/check-out`                              | `MyTimePage.jsx`                         | `useCheckOutMutation`                             | runtime  |
| PATCH  | `/api/hr/attendance/:attendanceId`                          | `AttendanceDeskPage.jsx`                 | `useAdjustAttendanceMutation`                     | runtime  |
| GET    | `/api/hr/leave-balances/me`                                 | `MyTimePage.jsx`                         | `useMyLeaveBalancesQuery`                         | runtime  |
| GET    | `/api/hr/leave-balances/:profileId/:year/:leaveType`        | `LeaveBalancePanel.jsx`                  | `useLeaveBalanceQuery`                            | runtime  |
| PUT    | `/api/hr/leave-balances/:profileId/:year/:leaveType`        | `LeaveBalancePanel.jsx`                  | `useUpsertLeaveBalanceMutation`                   | runtime  |
| PATCH  | `/api/hr/leave-balances/:profileId/:year/:leaveType/adjust` | `LeaveBalancePanel.jsx`                  | `useAdjustLeaveBalanceMutation`                   | runtime  |
| POST   | `/api/hr/leave-balances/accrue`                             | `PeoplePage.jsx`                         | `useAccrueLeaveBalancesMutation`                  | runtime  |
| POST   | `/api/hr/leave-balances/reset`                              | `PeoplePage.jsx`                         | `useResetLeaveBalancesMutation`                   | runtime  |
| POST   | `/api/hr/leave-balances/carry-over`                         | `PeoplePage.jsx`                         | `useCarryOverLeaveBalancesMutation`               | runtime  |
| GET    | `/api/hr/leave-requests`                                    | `RequestInboxPage.jsx`                   | `useLeaveRequestsQuery`                           | runtime  |
| POST   | `/api/hr/leave-requests`                                    | `MyTimePage.jsx`                         | `useCreateLeaveRequestMutation`                   | runtime  |
| POST   | `/api/hr/leave-requests/preview`                            | `MyTimePage.jsx`                         | `usePreviewLeaveRequestMutation`                  | runtime  |
| GET    | `/api/hr/leave-requests/me`                                 | `MyTimePage.jsx`                         | `useMyLeaveRequestsQuery`                         | runtime  |
| POST   | `/api/hr/leave-requests/:requestId/approve`                 | `RequestInboxPage.jsx`                   | `useApproveLeaveRequestMutation`                  | runtime  |
| POST   | `/api/hr/leave-requests/:requestId/reject`                  | `RequestInboxPage.jsx`                   | `useRejectLeaveRequestMutation`                   | runtime  |
| POST   | `/api/hr/leave-requests/:requestId/refund`                  | `RequestInboxPage.jsx`                   | `useRefundLeaveRequestMutation`                   | runtime  |
| POST   | `/api/hr/leave-requests/:requestId/cancel`                  | `MyTimePage.jsx`, `RequestInboxPage.jsx` | `useCancelLeaveRequestMutation`                   | runtime  |
| POST   | `/api/hr/leave-requests/:requestId/attachments`             | `MyTimePage.jsx`                         | `useAttachLeaveReferencesMutation`                | runtime  |
| GET    | `/api/hr/overtime-requests`                                 | `RequestInboxPage.jsx`                   | `useOvertimeRequestsQuery`                        | runtime  |
| POST   | `/api/hr/overtime-requests`                                 | `MyTimePage.jsx`                         | `useCreateOvertimeRequestMutation`                | runtime  |
| GET    | `/api/hr/overtime-requests/me`                              | `MyTimePage.jsx`                         | `useMyOvertimeRequestsQuery`                      | runtime  |
| POST   | `/api/hr/overtime-requests/:requestId/approve`              | `RequestInboxPage.jsx`                   | `useApproveOvertimeRequestMutation`               | runtime  |
| POST   | `/api/hr/overtime-requests/:requestId/reject`               | `RequestInboxPage.jsx`                   | `useRejectOvertimeRequestMutation`                | runtime  |
| POST   | `/api/hr/overtime-requests/:requestId/cancel`               | `MyTimePage.jsx`, `RequestInboxPage.jsx` | `useCancelOvertimeRequestMutation`                | runtime  |
| GET    | `/api/hr/payrolls`                                          | `PayrollRunsPage.jsx`                    | `usePayrollRunsQuery`                             | runtime  |
| POST   | `/api/hr/payrolls/run`                                      | `PayrollRunsPage.jsx`                    | `useRunPayrollMutation`                           | runtime  |
| GET    | `/api/hr/payrolls/me`                                       | `MyPayslipsPage.jsx`                     | `useMyPayslipsQuery`                              | runtime  |
| GET    | `/api/hr/payrolls/:id`                                      | `PayrollReviewDrawer.jsx`                | `usePayrollRunQuery`                              | runtime  |
| POST   | `/api/hr/payrolls/:id/finalize`                             | `PayrollRunsPage.jsx`                    | `useFinalizePayrollMutation`                      | runtime  |
| POST   | `/api/hr/payrolls/:id/mark-paid`                            | `PayrollReviewDrawer.jsx`                | `useMarkPayrollPaidMutation`                      | runtime  |
| POST   | `/api/hr/payrolls/:id/email`                                | `PayrollRunsPage.jsx`                    | `useEmailPayrollMutation`                         | runtime  |
| GET    | `/api/hr/payroll-adjustments`                               | `PayrollAdjustmentsPanel.jsx`            | `usePayrollAdjustmentsQuery`                      | runtime  |
| POST   | `/api/hr/payroll-adjustments`                               | `PayrollAdjustmentsPanel.jsx`            | `useCreatePayrollAdjustmentMutation`              | runtime  |
| PATCH  | `/api/hr/payroll-adjustments/:id`                           | `PayrollAdjustmentsPanel.jsx`            | `useUpdatePayrollAdjustmentMutation`              | runtime  |
| DELETE | `/api/hr/payroll-adjustments/:id`                           | `PayrollAdjustmentsPanel.jsx`            | `useCancelPayrollAdjustmentMutation`              | runtime  |
| GET    | `/api/hr/announcements`                                     | `AnnouncementsPage.jsx`                  | `apiClient.get(ENDPOINTS.HR.ANNOUNCEMENTS)`       | runtime  |
| POST   | `/api/hr/announcements`                                     | `AnnouncementsPage.jsx`                  | `apiClient.post(ENDPOINTS.HR.ANNOUNCEMENTS)`      | runtime  |
| GET    | `/api/hr/announcements/:id`                                 | `AnnouncementDetailDrawer.jsx`           | `apiClient.get(ENDPOINTS.HR.ANNOUNCEMENT(id))`    | runtime  |
| PATCH  | `/api/hr/announcements/:id`                                 | `AnnouncementsPage.jsx`                  | `apiClient.patch(ENDPOINTS.HR.ANNOUNCEMENT(id))`  | runtime  |
| DELETE | `/api/hr/announcements/:id`                                 | `AnnouncementsPage.jsx`                  | `apiClient.delete(ENDPOINTS.HR.ANNOUNCEMENT(id))` | runtime  |
| GET    | `/api/hr/dashboard`                                         | `HrDashboardPage.jsx`                    | `useHrDashboardQuery`                             | runtime  |
