import assert from 'node:assert/strict'
import test from 'node:test'

import { fromReportDateRange, toReportDateRange } from './reportDateRange.js'

test('toReportDateRange converts report filter strings into picker values', () => {
  const range = toReportDateRange({ dateFrom: '2026-07-01', dateTo: '2026-07-24' })

  assert.equal(range.start.format('YYYY-MM-DD'), '2026-07-01')
  assert.equal(range.end.format('YYYY-MM-DD'), '2026-07-24')
})

test('fromReportDateRange serializes apply and clear values for report filters', () => {
  assert.deepEqual(fromReportDateRange({ start: null, end: null }), { dateFrom: '', dateTo: '' })
  assert.deepEqual(
    fromReportDateRange(toReportDateRange({ dateFrom: '2026-07-01', dateTo: '2026-07-24' })),
    { dateFrom: '2026-07-01', dateTo: '2026-07-24' },
  )
})
