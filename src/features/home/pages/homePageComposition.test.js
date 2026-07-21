import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const homePageSource = await readFile(new URL('./HomePage.jsx', import.meta.url), 'utf8')
const acquisitionTableSource = await readFile(
  new URL('../components/AcquisitionTable.jsx', import.meta.url),
  'utf8',
)
const channelMixChartSource = await readFile(
  new URL('../components/ChannelMixChart.jsx', import.meta.url),
  'utf8',
)

test('HomePage composes the commercial operations dashboard', async () => {
  assert.match(homePageSource, /useHomeDashboardQuery/)
  assert.match(homePageSource, /OperationsPageShell/)
  assert.match(homePageSource, /OperationsHeader/)
  assert.match(homePageSource, /DailyProfitChart/)
  assert.match(homePageSource, /ChannelProfitChart/)
  assert.match(homePageSource, /AcquisitionTable/)
  assert.match(homePageSource, /AcquisitionFunnelChart/)
  assert.match(homePageSource, /ChannelMixChart/)
  assert.match(homePageSource, /home\.commercial\.buyer\.title|Buyer insights/)
  assert.doesNotMatch(homePageSource, /useHomeSummaryQuery/)
})

test('AcquisitionTable renders ROAS', () => {
  assert.match(acquisitionTableSource, /labels\.roas/)
  assert.match(acquisitionTableSource, /row\.roas/)
})

test('HomePage renders decision summary efficiency and retention metrics', () => {
  assert.match(homePageSource, /total\.adSpendAmount/)
  assert.match(homePageSource, /cpaAmount/)
  assert.match(homePageSource, /returningBuyerRateBps/)
  assert.match(homePageSource, /home\.commercial\.decision\.marketingEfficiency/)
  assert.match(homePageSource, /home\.commercial\.decision\.customerRetention/)
})

test('HomePage renders currency-filtered revenue and net-profit channel mix', () => {
  assert.match(homePageSource, /metric="revenueAmount"/)
  assert.match(homePageSource, /metric="netProfitAmount"/)
  assert.match(homePageSource, /rows={chartRows}/)
  assert.match(channelMixChartSource, /row\[metric\]/)
})

test('ChannelMixChart uses semantic chart color classes', () => {
  assert.doesNotMatch(channelMixChartSource, /#[\da-f]{3,8}/i)
  assert.match(channelMixChartSource, /fill-primary/)
})

test('HomePage links an informative empty acquisition state to Reports', () => {
  assert.match(homePageSource, /home\.commercial\.acquisition\.emptyDescription/)
  assert.match(homePageSource, /ROUTES\.PORTAL_REPORTS/)
})

test('HomePage orders decision and acquisition sections before operating health', () => {
  const decisionSection = homePageSource.indexOf('home.commercial.decision.title')
  const acquisitionSection = homePageSource.indexOf('home.commercial.acquisition.title')
  const operationsSection = homePageSource.indexOf('home.commercial.operations.title')
  assert.ok(decisionSection >= 0 && decisionSection < acquisitionSection)
  assert.ok(acquisitionSection < operationsSection)
})
