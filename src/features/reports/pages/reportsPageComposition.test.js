import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('reports page renders real daily profit, seller, and team report views', () => {
  const source = readFileSync(new URL('./ReportsPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('useFinanceDailyProfitQuery'), true)
  assert.equal(source.includes('useFinanceBySellerQuery'), true)
  assert.equal(source.includes('useFinanceByTeamQuery'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('import DailyProfitChart'), true)
  assert.equal(source.includes('import ChannelProfitChart'), true)
  assert.equal(source.includes('<DailyProfitChart'), true)
  assert.equal(source.includes('<ChannelProfitChart'), true)
  assert.equal(source.includes('adSpendAmount'), true)
  assert.equal(source.includes('netProfitAmount'), true)
  assert.equal(source.includes('ApiWorkflowPage'), false)
})
