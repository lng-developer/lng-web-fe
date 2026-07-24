import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('Ads report view renders performance, attribution, daily trend, and import evidence', () => {
  const source = readFileSync(new URL('./AdsReportView.jsx', import.meta.url), 'utf8')

  assert.match(source, /useAdsChannelPerformanceQuery/)
  assert.match(source, /useAdsSellerAttributionQuery/)
  assert.match(source, /useAdsDailyQuery/)
  assert.match(source, /useFinanceImportBatchesQuery/)
  assert.match(source, /useFinanceImportedDataQuery/)
  assert.match(source, /summarizeAdsCurrency/)
  assert.match(source, /<AdsDailyChart/)
  assert.match(source, /<OperationsTable/)
  assert.equal(
    (source.match(/rounded-lg border border-border bg-surface shadow-sm/g) || []).length,
    2,
  )
})
