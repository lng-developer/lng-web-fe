import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

test('reports page renders finance and Ads views with searchable report filters', () => {
  const source = readFileSync(new URL('./ReportsPage.jsx', import.meta.url), 'utf8')

  assert.equal(source.includes('useFinanceDailyProfitQuery'), true)
  assert.equal(source.includes('useFinanceBySellerQuery'), true)
  assert.equal(source.includes('useFinanceByTeamQuery'), true)
  assert.equal(source.includes('useShopsQuery'), true)
  assert.equal(source.includes('useAdsChannelPerformanceQuery'), true)
  assert.equal(source.includes('import AdsReportView'), true)
  assert.equal(source.includes('<Autocomplete'), true)
  assert.equal(source.includes("value: 'ads'"), true)
  assert.equal(source.includes('<AdsReportView'), true)
  assert.equal(source.includes('h-full -mr-4 overflow-auto pr-4'), true)
  assert.equal(source.includes('<OperationsPageShell\n      className="-mx-4 md:-mx-6"'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('import DailyProfitChart'), true)
  assert.equal(source.includes('import ChannelProfitChart'), true)
  assert.equal(source.includes('import FinancialMetricCards'), true)
  assert.equal(source.includes('import DimensionProfitChart'), true)
  assert.equal(
    source.includes("import DateRangePicker from '@/components/form/DateRangePicker'"),
    true,
  )
  assert.equal(source.includes('<DailyProfitChart'), true)
  assert.equal(source.includes('<ChannelProfitChart'), true)
  assert.equal(source.includes('<FinancialMetricCards'), true)
  assert.equal(source.includes('<DimensionProfitChart'), true)
  assert.equal(source.includes('Daily profit records'), true)
  assert.equal(source.includes('Seller performance'), true)
  assert.equal(source.includes('Team performance'), true)
  assert.equal(source.includes('adSpendAmount'), true)
  assert.equal(source.includes('netProfitAmount'), true)
  assert.equal(source.includes('ApiWorkflowPage'), false)
  assert.equal(source.includes('<DateRangePicker'), true)
  assert.equal(source.includes('type="date"'), false)
  assert.equal(source.includes('onClear={updateDateRange}'), true)
  assert.equal(source.includes('sellerEmployeeCode'), true)
  assert.equal(source.includes('teamId'), true)
})
