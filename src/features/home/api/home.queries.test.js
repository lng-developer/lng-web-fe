import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home dashboard composes permission-enabled module summary queries', async () => {
  const source = await readFile(new URL('./home.queries.js', import.meta.url), 'utf8')

  assert.match(source, /useOrderSummaryQuery/)
  assert.match(source, /useProductionSummaryQuery/)
  assert.match(source, /useDesignTaskSummaryQuery/)
  assert.match(source, /useVendorSubmissionsSummaryQuery/)
  assert.match(source, /useShipmentsSummaryQuery/)
  assert.match(source, /buildDashboardView/)
  assert.doesNotMatch(source, /OPERATIONS_OVERVIEW/)
})
