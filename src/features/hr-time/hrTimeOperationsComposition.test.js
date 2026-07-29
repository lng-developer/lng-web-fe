import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('Task 8 pages reuse the operations shell and URL query state', async () => {
  const pages = await Promise.all([
    source('pages/AttendanceDeskPage.jsx'),
    source('pages/SchedulePage.jsx'),
    source('pages/PeoplePage.jsx'),
  ])

  for (const page of pages) {
    assert.match(page, /OperationsPageShell/)
    assert.match(page, /useSearchParams/)
  }

  assert.match(pages[1], /OperationsPagination/)
  assert.match(pages[2], /OperationsPagination/)
})

test('attendance adjustment and schedule edits follow backend capabilities', async () => {
  const [attendance, schedule, matrix, drawer] = await Promise.all([
    source('pages/AttendanceDeskPage.jsx'),
    source('pages/SchedulePage.jsx'),
    source('components/MonthlyStaffMatrix.jsx'),
    source('components/AttendanceStaffDetailDrawer.jsx'),
  ])

  assert.match(attendance, /useAttendanceMonthMatrixQuery/)
  assert.match(attendance, /exceptionsOnly/)
  assert.match(attendance, /cell\.capabilities\?\.adjust/)
  assert.match(attendance, /MonthlyStaffMatrix/)
  assert.doesNotMatch(attendance, /AttendanceStaffList/)
  assert.match(attendance, /setSelectedAttendance/)
  assert.match(attendance, /const updated = await adjustment\.mutateAsync/)
  assert.match(attendance, /setSelectedAttendance\(\(current\) =>/)
  assert.match(attendance, /cell: \{ \.\.\.current\.cell, \.\.\.updated \}/)
  assert.match(matrix, /onCellOpen\?\.\(cell, row\)/)
  assert.match(drawer, /Adjust attendance/)
  assert.match(drawer, /manualAdjustments/)
  assert.match(drawer, /History/)
  assert.match(drawer, /adjustment\.actorName/)
  assert.match(drawer, /adjustment\.reason/)
  assert.match(drawer, /adjustment\.before/)
  assert.match(drawer, /adjustment\.after/)
  assert.match(drawer, /Late check-in/)
  assert.match(drawer, /lateMinutes/)
  assert.doesNotMatch(attendance, /roleName|roles\.includes/)
  assert.match(schedule, /row\.capabilities\?\.edit/)
  assert.doesNotMatch(schedule, /roleName|roles\.includes/)
})

test('attendance matrix keeps the compact mockup footer inside the workbench', async () => {
  const [attendance, matrix, cell] = await Promise.all([
    source('pages/AttendanceDeskPage.jsx'),
    source('components/MonthlyStaffMatrix.jsx'),
    source('components/AttendanceDayCell.jsx'),
  ])

  assert.match(matrix, /Legend/)
  assert.match(matrix, /Showing \{start\}–\{end\} of \{total\} employees/)
  assert.match(matrix, /<Pagination/)
  assert.match(matrix, /className="w-full border-separate/)
  assert.match(matrix, /min-w-\[124px\]/)
  assert.match(matrix, /min-w-\[34px\]/)
  assert.match(matrix, /shrink-0 overflow-x-auto overflow-y-hidden/)
  assert.doesNotMatch(matrix, /Team \/ Shift/)
  assert.doesNotMatch(attendance, /OperationsPagination/)
  assert.match(matrix, /overflow-x-auto overflow-y-hidden/)
  assert.match(attendance, /limit: pageSize/)
  assert.match(attendance, /<Stack spacing=\{3\} className="h-full min-h-0">/)
  assert.match(attendance, /useCallback/)
  assert.match(attendance, /handleMatrixCellOpen/)
  assert.match(attendance, /handleMatrixRowOpen/)
  assert.match(matrix, /memo\(MonthlyStaffMatrix\)/)
  assert.match(matrix, /\[content-visibility:auto\]/)
  assert.match(cell, /title=\{label\}/)
  assert.match(cell, /lateMinutes/)
  assert.doesNotMatch(cell, /Tooltip/)
})

test('attendance summary exposes late arrivals separately from present status', async () => {
  const cards = await source('components/HrOperationsSummaryCards.jsx')

  assert.match(cards, /Late arrivals/)
  assert.match(cards, /summary\.lateCount/)
})

test('Request Inbox supports status cards and documented request filters', async () => {
  const inbox = await source('pages/RequestInboxPage.jsx')

  assert.match(inbox, /summary\.statusCounts/)
  assert.match(inbox, /Pending/)
  assert.match(inbox, /profileId/)
  assert.match(inbox, /leaveType/)
  assert.match(inbox, /year/)
  assert.match(inbox, /Clear filters/)
})

test('Attendance Desk sends documented matrix filters to the paginated API', async () => {
  const attendance = await source('pages/AttendanceDeskPage.jsx')

  assert.match(attendance, /useAttendanceMonthMatrixQuery\(\{/)
  assert.match(attendance, /teamId/)
  assert.match(attendance, /departmentId/)
  assert.match(attendance, /shiftId/)
  assert.match(attendance, /useDebounce\(searchInput, 300\)/)
  assert.match(attendance, /useTransition/)
  assert.match(attendance, /startTransition\(\(\) =>/)
  assert.match(attendance, /handleSummaryFilterChange/)
  assert.match(attendance, /handlePageChange/)
  assert.match(attendance, /setSearchInput\(event\.target\.value\)/)
  assert.doesNotMatch(attendance, /updateSearch\(\{ q: event\.target\.value \}, true\)/)
  assert.doesNotMatch(attendance, /\.filter\(isAttendanceException\)/)
})

test('My Time replaces unavailable personal data with a localized retry state', async () => {
  const myTime = await source('pages/MyTimePage.jsx')

  assert.match(myTime, /hrTime\.myTime\.unavailableTitle/)
  assert.match(myTime, /hrTime\.myTime\.unavailableDescription/)
  assert.match(myTime, /selectedQuery\.refetch/)
  assert.doesNotMatch(myTime, /emptyTitle=\{\s*error\s*\?\s*'Title'/)
})

test('Schedule uses permission-safe HR data for named scope selectors', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /getScheduleScopeOptions/)
  assert.doesNotMatch(schedule, /useDepartmentsQuery|useTeamsQuery|features\/rbac/)
})

test('Schedule renders only permitted configuration tabs', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /const visibleTabs = tabs\.filter/)
  assert.match(schedule, /items=\{visibleTabs\.map/)
})

test('Assignment workbench filters use URL state and server employee search', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /const \[employeeSearch, setEmployeeSearch\] = useState/)
  assert.match(schedule, /effectiveFrom/)
  assert.match(schedule, /effectiveTo/)
  assert.match(schedule, /shiftId/)
  assert.match(schedule, /workLocationId/)
  assert.match(schedule, /<Autocomplete/)
  assert.match(schedule, /<DateRangePicker/)
  assert.doesNotMatch(schedule, /label="Effective from"/)
})

test('Holiday list follows the selected year', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /const holidayYear =/)
  assert.match(schedule, /dateFrom: `\$\{holidayYear\}-01-01`/)
  assert.match(schedule, /dateTo: `\$\{holidayYear\}-12-31`/)
})

test('Schedule keeps staff and team attendance views out of the configuration workspace', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.doesNotMatch(schedule, /'personal',\s*'team',/)
  assert.doesNotMatch(schedule, /StaffMonthlyCalendar/)
  assert.doesNotMatch(schedule, /useAttendanceMonthMatrixQuery/)
  assert.doesNotMatch(schedule, /employee-profiles\?[^\n]*all/)
})

test('operation forms use readable selectors and explicit payload builders', async () => {
  const [adjustment, assignment, configuration, override, profile] = await Promise.all([
    source('components/AttendanceAdjustmentDialog.jsx'),
    source('components/ShiftAssignmentDialog.jsx'),
    source('components/ScheduleConfigurationDialog.jsx'),
    source('components/CalendarOverrideDialog.jsx'),
    source('components/EmployeeProfileDialog.jsx'),
  ])

  assert.match(adjustment, /buildAttendanceAdjustmentPayload/)
  assert.match(adjustment, /import TimePicker from '@\/components\/form\/TimePicker'/)
  assert.match(adjustment, /<TimePicker/)
  assert.doesNotMatch(adjustment, /DatePicker|checkInDate\.label|checkOutDate\.label/)
  assert.match(
    adjustment,
    /status: values\.status === record\.status \? undefined : values\.status/,
  )
  assert.doesNotMatch(adjustment, /type="datetime-local"/)
  ;['ERROR', 'SICK_LEAVE', 'MATERNITY_LEAVE', 'PATERNITY_LEAVE'].forEach((status) => {
    assert.match(adjustment, new RegExp(`['"]${status}['"]`))
  })
  assert.match(assignment, /buildShiftAssignmentPayload/)
  assert.match(assignment, /employees\.map/)
  assert.match(assignment, /shifts\.map/)
  assert.match(assignment, /locations\.map/)
  assert.match(configuration, /buildWorkLocationPayload/)
  assert.match(configuration, /buildShiftPayload/)
  assert.match(configuration, /workLocations\.map/)
  assert.match(override, /buildCalendarOverridePayload/)
  assert.match(override, /scopeOptions\.filter/)
  assert.match(override, /options\.map/)
  assert.match(profile, /buildEmployeeProfilePayload/)
  assert.match(profile, /accounts\.map/)
  assert.doesNotMatch(
    `${assignment}${configuration}${override}${profile}`,
    /label=.*\b(ID|Id|id)\b|helperText=.*\b(ID|Id|id)\b/,
  )
})

test('Schedule exposes global configuration only through permission-derived controls', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /canWriteGlobal/)
  assert.match(schedule, /useCreateWorkLocationMutation/)
  assert.match(schedule, /useCreateShiftMutation/)
  assert.match(schedule, /ScheduleConfigurationDialog/)
  assert.match(schedule, /user\?\.permissions/)
  assert.match(schedule, /scope\.scopeType === 'global'/)
  assert.doesNotMatch(schedule, /canBypassPermissions/)
  assert.doesNotMatch(schedule, /roleName|roles\.includes/)
})

test('Schedule separates calendar read scopes from global policy mutations', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /resolveScheduleTab/)
  assert.match(schedule, /rotationReadTeamIds/)
  assert.match(schedule, /rotationWriteTeamIds/)
  assert.match(schedule, /canCalendarWriteGlobal && tab === 'holidays'/)
  assert.match(schedule, /canWriteRotationRow/)
  assert.match(schedule, /holidayScopeState\.params/)
  assert.match(schedule, /holidayScopeState\.enabled/)
  assert.match(schedule, /No authorized calendar scope/)
})

test('global calendar writers load directory teams for rotation generation', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /canReadDirectory[\s\S]*'HR_CALENDAR:READ'[\s\S]*'HR_CALENDAR:WRITE'/)
  assert.match(schedule, /useEmployeeProfilesQuery\([\s\S]*enabled: canReadDirectory/)
  assert.match(schedule, /canCalendarWriteGlobal[\s\S]*rotationWriteTeams/)
  assert.match(schedule, /Generate rotations/)
  assert.match(schedule, /teams={rotationWriteTeams}/)
})

test('People loads directory rows separately from permission-gated detail sections', async () => {
  const [page, drawer] = await Promise.all([
    source('pages/PeoplePage.jsx'),
    source('components/EmployeeProfileDrawer.jsx'),
  ])

  assert.match(page, /useEmployeeProfilesQuery/)
  assert.match(drawer, /useEmployeeProfileQuery/)
  assert.match(drawer, /getEmployeeProfileSections/)
  assert.doesNotMatch(drawer, /baseSalary.*0|allowances.*\{\}/)
})

test('People renders server-owned employee lifecycle controls', async () => {
  const [page, dialog] = await Promise.all([
    source('pages/PeoplePage.jsx'),
    source('components/EmployeeLifecycleDialog.jsx'),
  ])

  assert.match(page, /includeDeleted/)
  assert.match(page, /useDeleteEmployeeProfileMutation/)
  assert.match(page, /useRestoreEmployeeProfileMutation/)
  assert.match(page, /row\.capabilities\?\.delete/)
  assert.match(page, /row\.capabilities\?\.restore/)
  assert.match(page, /canWrite &&\s*\(\s*<Button[\s\S]{0,400}Include deleted/)
  assert.match(page, /\[403, 404, 409\]\.includes\(error\?\.status\)/)
  assert.doesNotMatch(page, /\[403, 404, 409\]\.includes\(error\?\.response\?\.status\)/)
  assert.match(page, /!row\.isDeleted &&[\s\S]*VisibilityOutlinedIcon/)
  assert.match(dialog, /Delete employee profile/)
  assert.match(dialog, /Restore employee profile/)
})

test('People leave balance administration is permission-gated and preserves backend batch evidence', async () => {
  const [page, drawer, panel, dialog, mutations] = await Promise.all([
    source('pages/PeoplePage.jsx'),
    source('components/EmployeeProfileDrawer.jsx'),
    source('components/LeaveBalancePanel.jsx'),
    source('components/LeaveBalanceAdminDialog.jsx'),
    source('api/hrTime.mutations.js'),
  ])

  assert.match(page, /HR_LEAVE:APPROVE/)
  assert.match(page, /LeaveBalanceAdminDialog/)
  assert.doesNotMatch(`${page}${drawer}${panel}${dialog}`, /roleName|roles\.includes/)
  assert.match(drawer, /LeaveBalancePanel/)
  assert.match(panel, /useLeaveBalanceQuery/)
  assert.match(panel, /history/)
  assert.match(panel, /useUpsertLeaveBalanceMutation/)
  assert.match(panel, /useAdjustLeaveBalanceMutation/)
  assert.match(
    panel,
    /const validYear = Number\.isInteger\(Number\(year\)\) && Number\(year\) >= 2000 && Number\(year\) <= 2100/,
  )
  assert.match(panel, /enabled: Boolean\(profileId\) && validYear/)
  assert.match(
    panel,
    /const validUpsert =\s*validYear[\s\S]*Number\.isInteger\(Number\(entitledUnits\)\)[\s\S]*Number\.isInteger\(Number\(adjustmentUnits\)\)/,
  )
  assert.match(panel, /Number\(entitledUnits\) >= 0/)
  assert.match(
    panel,
    /const validAdjustment =\s*validYear[\s\S]*Number\.isInteger\(Number\(adjustUnits\)\)[\s\S]*Number\(adjustUnits\) !== 0/,
  )
  assert.match(panel, /!validUpsert/)
  assert.match(panel, /!validAdjustment/)
  assert.match(dialog, /Confirm/)
  assert.match(dialog, /result\.processed/)
  assert.match(dialog, /result\.changed/)
  assert.match(dialog, /result\.items/)
  assert.match(dialog, /error\?\.data/)
  assert.doesNotMatch(dialog, /rowFailures|failedRows/)
  assert.match(mutations, /useAccrueLeaveBalancesMutation/)
  assert.match(mutations, /useResetLeaveBalancesMutation/)
  assert.match(mutations, /useCarryOverLeaveBalancesMutation/)
  assert.match(mutations, /LEAVE_BALANCE_ADJUST/)
  assert.match(mutations, /retry: false/)
})

test('scoped leave approvers must target employees before running a batch', async () => {
  const [page, dialog] = await Promise.all([
    source('pages/PeoplePage.jsx'),
    source('components/LeaveBalanceAdminDialog.jsx'),
  ])

  assert.match(page, /hasGlobalPermissionCode\(\s*currentUser,\s*'HR_LEAVE:APPROVE'/)
  assert.match(page, /requireSelection=\{!canManageLeaveBalancesGlobally\}/)
  assert.match(dialog, /if \(requireSelection && !hasSelection\) return/)
  assert.match(dialog, /requireSelection && !hasSelection/)
})

test('HR route children mount attendance, schedule, and people permissions', async () => {
  const routes = await readFile(new URL('../../routes/index.jsx', root), 'utf8')

  assert.match(routes, /AttendanceDeskPage/)
  assert.match(routes, /SchedulePage/)
  assert.match(routes, /PeoplePage/)
  assert.match(routes, /HR_ATTENDANCE:MANAGE/)
  assert.match(routes, /HR_SCHEDULE:READ/)
  assert.match(routes, /HR_EMPLOYEES:READ/)
})

test('Catalog Setup keeps its original protected catalog workbench', async () => {
  const routes = await readFile(new URL('../../routes/index.jsx', root), 'utf8')

  assert.match(
    routes,
    /path: 'portal\/catalog\/setup',[\s\S]*requirePermissions\(\['CATALOG:READ'\], <PodWorkbenchPage moduleId="catalog" \/>\)/,
  )
  assert.doesNotMatch(routes, /PORTAL_LISTINGS\}\?view=product-types/)
})

test('Schedule completes calendar policy administration through focused API consumers', async () => {
  const [schedule, queries, mutations, detail, summary, bulkImport, rotationMaintenance] =
    await Promise.all([
      source('pages/SchedulePage.jsx'),
      source('api/hrTime.queries.js'),
      source('api/hrTime.mutations.js'),
      source('components/HolidayDetailDrawer.jsx'),
      source('components/HolidayPolicySummary.jsx'),
      source('components/HolidayBulkImportDialog.jsx'),
      source('components/RotationMaintenanceDialog.jsx'),
    ])

  assert.match(queries, /useHolidayDetailQuery/)
  assert.match(queries, /useHolidayTemplatesQuery/)
  assert.match(queries, /useHolidayRangeQuery/)
  assert.match(queries, /useHolidayCheckQuery/)
  assert.match(queries, /useHolidaySummaryQuery/)
  assert.match(mutations, /useBulkImportHolidaysMutation/)
  assert.match(mutations, /useUpdateSaturdayRotationMutation/)
  assert.match(mutations, /useDeleteTeamSaturdayRotationsMutation/)
  assert.match(mutations, /SATURDAY_ROTATION_TEAM/)
  assert.match(mutations, /params:\s*\{\s*month,\s*year\s*\}/)
  assert.match(detail, /useHolidayDetailQuery/)
  assert.match(summary, /useHolidayRangeQuery/)
  assert.match(summary, /useHolidayCheckQuery/)
  assert.match(bulkImport, /items\.length < 1 \|\| items\.length > 100/)
  assert.match(bulkImport, /duplicates|rowFailures|failures/)
  assert.match(rotationMaintenance, /employeeProfileIds/)
  assert.match(rotationMaintenance, /<Checkbox/)
  assert.match(rotationMaintenance, /Clear selection/)
  assert.match(rotationMaintenance, /Delete rotations/)
  assert.match(schedule, /HolidayPolicySummary/)
  assert.match(schedule, /HolidayDetailDrawer/)
  assert.match(schedule, /HolidayBulkImportDialog/)
  assert.match(schedule, /RotationMaintenanceDialog/)
})

test('Schedule renders the Saturday rotation matrix from the dedicated read model', async () => {
  const [schedule, queries, mutations, endpoints, matrix] = await Promise.all([
    source('pages/SchedulePage.jsx'),
    source('api/hrTime.queries.js'),
    source('api/hrTime.mutations.js'),
    readFile(new URL('../../services/endpoints.js', root), 'utf8'),
    source('components/SaturdayRotationMatrix.jsx'),
  ])

  assert.match(endpoints, /SATURDAY_ROTATIONS_MATRIX/)
  assert.match(queries, /useSaturdayRotationMatrixQuery/)
  assert.match(mutations, /useCreateSaturdayRotationMutation/)
  assert.match(schedule, /useSaturdayRotationMatrixQuery/)
  assert.match(schedule, /SaturdayRotationMatrix/)
  assert.match(matrix, /offCount/)
  assert.match(matrix, /presentCount/)
  assert.match(matrix, /Saturday rotation/)
  assert.match(matrix, /Selected off/)
  assert.match(matrix, /Manage Saturday/)
  assert.match(matrix, /grid-flow-col/)
  assert.match(schedule, /h-full overflow-y-auto pb-4/)
})

test('Rotation supports a manual plan for every Saturday in the selected month', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /Manual month/)
  assert.match(schedule, /manualMonth/)
  assert.match(schedule, /customRotations/)
  assert.match(schedule, /Search employees/)
  assert.match(schedule, /Clear this day/)
})

test('Schedule uses backend holiday enums and renders rotation generation evidence', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /\['PUBLIC_HOLIDAY', 'SUBSTITUTE_WORK_DAY'\]/)
  assert.doesNotMatch(schedule, /COMPANY_HOLIDAY|SPECIAL_DAY/)
  assert.match(schedule, /setRotationOutcome\(result\)/)
  assert.match(schedule, /outcome\.generated/)
  assert.match(schedule, /outcome\.items/)
})

test('HolidayDialog cannot be dismissed while its write is pending', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /<AnimatedDialog open onClose=\{loading \? undefined : onClose\}/)
  assert.match(schedule, /<Button onClick=\{onClose\} disabled=\{loading\}>\s*Cancel/)
})

test('RotationDialog cannot be dismissed while generation is pending', async () => {
  const schedule = await source('pages/SchedulePage.jsx')
  const dialog = schedule.slice(
    schedule.indexOf('function RotationDialog'),
    schedule.indexOf('function list(data)'),
  )

  assert.match(dialog, /onClose=\{loading \? undefined : onClose\}/)
  assert.match(dialog, /<Button onClick=\{onClose\} disabled=\{loading\}>\s*Cancel/)
})
