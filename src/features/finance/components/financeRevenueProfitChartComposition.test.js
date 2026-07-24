import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('finance chart compares revenue and gross profit in a card', () => {
  const source = readFileSync(new URL('./FinanceRevenueProfitChart.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('Revenue'), true)
  assert.equal(source.includes('Gross profit'), true)
  assert.equal(source.includes('<svg'), true)
  assert.equal(source.includes('rounded-lg border border-border bg-surface shadow-sm'), true)
})
