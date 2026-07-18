import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('HomePage composes the permission-aware operations dashboard', async () => {
  const source = await readFile(new URL('./HomePage.jsx', import.meta.url), 'utf8')

  assert.match(source, /useHomeDashboardQuery/)
  assert.match(source, /OperationsPageShell/)
  assert.match(source, /OperationsHeader/)
  assert.match(source, /DashboardQueueTable/)
  assert.match(source, /DashboardManagementLinks/)
  assert.doesNotMatch(source, /useHomeSummaryQuery/)
})
