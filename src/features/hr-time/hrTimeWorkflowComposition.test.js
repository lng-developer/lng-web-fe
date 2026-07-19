import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const root = new URL('./', import.meta.url)

async function source(path) {
  return readFile(new URL(path, root), 'utf8')
}

test('staff and approver pages reuse operations primitives and URL search params', async () => {
  const [myTime, inbox] = await Promise.all([
    source('pages/MyTimePage.jsx'),
    source('pages/RequestInboxPage.jsx'),
  ])

  for (const page of [myTime, inbox]) {
    assert.match(page, /OperationsPageShell/)
    assert.match(page, /OperationsTabs/)
    assert.match(page, /OperationsToolbar/)
    assert.match(page, /OperationsPagination/)
    assert.match(page, /useSearchParams/)
  }

  assert.match(myTime, /today/)
  assert.match(myTime, /history/)
  assert.match(inbox, /leave/)
  assert.match(inbox, /overtime/)
})

test('HR pages normalize URL tabs to the first enabled tab and use the supported nav variant', async () => {
  const [myTime, inbox] = await Promise.all([
    source('pages/MyTimePage.jsx'),
    source('pages/RequestInboxPage.jsx'),
  ])

  for (const page of [myTime, inbox]) {
    assert.match(page, /const enabledTabs = tabs\.filter/)
    assert.match(
      page,
      /const tab = enabledTabs\.includes\(requestedTab\) \? requestedTab : defaultTab/,
    )
    assert.match(page, /variant="nav"/)
    assert.doesNotMatch(page, /variant="underline"/)
  }
})

test('request actions are capability-gated and use focused dialogs', async () => {
  const [table, drawer, decision, leaveDialog, overtimeDialog] = await Promise.all([
    source('components/TimeRequestTable.jsx'),
    source('components/RequestReviewDrawer.jsx'),
    source('components/RequestDecisionDialog.jsx'),
    source('components/LeaveRequestDialog.jsx'),
    source('components/OvertimeRequestDialog.jsx'),
  ])

  assert.match(table, /row\.capabilities/)
  assert.doesNotMatch(table, /roleName|\.role\b|roles\.includes/)
  assert.match(drawer, /RequestDecisionDialog/)
  assert.match(decision, /approvedMinutes/)
  assert.match(leaveDialog, /startDateKey/)
  assert.match(leaveDialog, /helperText/)
  assert.match(overtimeDialog, /plannedStartTime/)
  assert.match(overtimeDialog, /helperText/)
})

test('profile details only request compensation for a global grant and My Time uses server attendance actions', async () => {
  const [queries, drawer, myTime] = await Promise.all([
    source('api/hrTime.queries.js'),
    source('components/EmployeeProfileDrawer.jsx'),
    source('pages/MyTimePage.jsx'),
  ])

  assert.match(queries, /\.get\(endpoint, \{ params: normalizeHrTimeQuery\(params\) \}\)/)
  assert.match(drawer, /HR_COMPENSATION:READ/)
  assert.match(drawer, /HR_COMPENSATION:WRITE/)
  assert.match(drawer, /hasCompensationPermission\(user\?\.permissions\)/)
  assert.match(drawer, /scopeType \|\| ''\)\.toLowerCase\(\) === 'global'/)
  assert.match(drawer, /includeSensitive: true/)
  assert.doesNotMatch(drawer, /roleName|\.role\b|roles\.includes/)
  assert.match(myTime, /getSelfAttendanceActions\(todayQuery\.data\)/)
  assert.doesNotMatch(myTime, /todayRecord/)
  assert.match(myTime, /window\.setTimeout/)
  assert.match(myTime, /startOf\('day'\)\.add\(1, 'day'\)\.diff\(now\)/)
})

test('HR child routes mount My Time and Request Inbox behind permissions', async () => {
  const routes = await readFile(new URL('../../routes/index.jsx', root), 'utf8')

  assert.match(routes, /MyTimePage/)
  assert.match(routes, /RequestInboxPage/)
  assert.match(routes, /HR_LEAVE:WRITE/)
  assert.match(routes, /HR_OVERTIME:APPROVE/)
})
