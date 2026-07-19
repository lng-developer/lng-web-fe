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

test('HR child routes mount My Time and Request Inbox behind permissions', async () => {
  const routes = await readFile(new URL('../../routes/index.jsx', root), 'utf8')

  assert.match(routes, /MyTimePage/)
  assert.match(routes, /RequestInboxPage/)
  assert.match(routes, /HR_LEAVE:WRITE/)
  assert.match(routes, /HR_OVERTIME:APPROVE/)
})
