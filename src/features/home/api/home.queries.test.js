import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

test('home dashboard composes permission-enabled commercial report queries', async () => {
  const source = await readFile(new URL('./home.queries.js', import.meta.url), 'utf8')

  assert.match(source, /useOrderSummaryQuery/)
  assert.match(source, /useFinanceDailyProfitQuery/)
  assert.match(source, /useBuyerInsightsQuery/)
  assert.match(source, /useAdsChannelPerformanceQuery/)
  assert.match(source, /useVendorPerformanceQuery/)
  assert.match(source, /useOperationsOverviewQuery/)
  assert.match(source, /buildCommercialDashboard/)
})
