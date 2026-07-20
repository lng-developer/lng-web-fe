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
    assert.match(page, /OperationsTable/)
    assert.match(page, /OperationsPagination/)
    assert.match(page, /useSearchParams/)
  }
})

test('attendance adjustment and schedule edits follow backend capabilities', async () => {
  const [attendance, schedule] = await Promise.all([
    source('pages/AttendanceDeskPage.jsx'),
    source('pages/SchedulePage.jsx'),
  ])

  assert.match(attendance, /'exceptions'/)
  assert.match(attendance, /row\.capabilities\?\.adjust/)
  assert.doesNotMatch(attendance, /roleName|roles\.includes/)
  assert.match(schedule, /row\.capabilities\?\.edit/)
  assert.doesNotMatch(schedule, /roleName|roles\.includes/)
})

test('Attendance Desk sends exception filtering to the paginated API', async () => {
  const attendance = await source('pages/AttendanceDeskPage.jsx')

  assert.match(attendance, /exceptionsOnly:\s*tab === 'exceptions'/)
  assert.doesNotMatch(attendance, /\.filter\(isAttendanceException\)/)
})

test('Schedule uses permission-safe HR data for named scope selectors', async () => {
  const schedule = await source('pages/SchedulePage.jsx')

  assert.match(schedule, /getScheduleScopeOptions/)
  assert.doesNotMatch(schedule, /useDepartmentsQuery|useTeamsQuery|features\/rbac/)
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
