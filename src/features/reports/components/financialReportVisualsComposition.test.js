import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('financial report visuals use Ads-style KPI cards and a dimension profit chart', () => {
  const metrics = readFileSync(new URL('./FinancialMetricCards.jsx', import.meta.url), 'utf8')
  const chart = readFileSync(new URL('./DimensionProfitChart.jsx', import.meta.url), 'utf8')

  assert.equal(metrics.includes('lg:grid-cols-5'), true)
  assert.equal(
    metrics.includes('rounded-lg border border-border bg-surface px-4 py-3 shadow-sm'),
    true,
  )
  assert.equal(chart.includes('Gross profit'), true)
  assert.equal(chart.includes('<svg'), true)
  assert.equal(chart.includes('h-[280px]'), true)
  assert.equal(chart.includes('width="560"'), true)
})
