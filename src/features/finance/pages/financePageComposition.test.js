import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('finance page renders the snapshot-backed Profit and Cost workbench', () => {
  const source = readFileSync(new URL('./FinancePage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('useFinanceSnapshotsQuery'), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('snapshotStatus'), true)
  assert.equal(source.includes('costStatus'), true)
  assert.equal(source.includes('salesChannelCode'), true)
  assert.equal(source.includes('search'), true)
  assert.equal(source.includes('<Autocomplete'), true)
  assert.equal(source.includes('marketplaceCode'), true)
  assert.equal(source.includes('import FinanceRevenueProfitChart'), true)
  assert.equal(source.includes('<FinanceRevenueProfitChart'), true)
  assert.equal(source.includes('Finance snapshots'), true)
  assert.equal(source.includes('rounded-lg border border-border bg-surface shadow-sm'), true)
  assert.equal(source.includes('total: snapshotsQuery.data?.total'), true)
  assert.equal(source.includes('ApiWorkflowPage'), false)
})
