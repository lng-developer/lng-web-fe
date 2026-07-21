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
const enLocale = JSON.parse(
  await readFile(new URL('../../../i18n/locales/en/common.json', import.meta.url), 'utf8'),
)
const viLocale = JSON.parse(
  await readFile(new URL('../../../i18n/locales/vi/common.json', import.meta.url), 'utf8'),
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
  assert.match(channelMixChartSource, /buildChannelMixRows\(rows, metric\)/)
})

test('ChannelMixChart uses semantic chart color classes', () => {
  assert.doesNotMatch(channelMixChartSource, /#[\da-f]{3,8}/i)
  assert.match(channelMixChartSource, /fill-primary/)
})

test('HomePage links an informative empty acquisition state to Reports', () => {
  assert.match(homePageSource, /home\.commercial\.acquisition\.emptyDescription/)
  assert.match(homePageSource, /ROUTES\.PORTAL_REPORTS/)
})

test('HomePage renders the Reports CTA only for a successful empty acquisition query', () => {
  assert.match(homePageSource, /acquisitionState === 'empty'/)
  assert.match(homePageSource, /acquisitionState === 'unavailable'/)
  assert.match(homePageSource, /home\.commercial\.acquisition\.unavailable/)
  assert.match(homePageSource, /data\.hasAnalyticsAccess\s*\?\s*\(\s*<Button/)
})

test('HomePage styles the net-profit metric by sign', () => {
  assert.match(homePageSource, /tone={getProfitTone\(total\.netProfitAmount\)}/)
})

test('commercial analytics uses plain localized labels', () => {
  assert.equal(enLocale.home.commercial.acquisition.cpa, 'Cost per new buyer')
  assert.equal(enLocale.home.commercial.acquisition.ctr, 'Click-through rate')
  assert.equal(enLocale.home.commercial.acquisition.conversion, 'Click-to-order conversion')
  assert.equal(enLocale.home.commercial.acquisition.roas, 'Return on ad spend')
  assert.equal(viLocale.home.commercial.acquisition.cpa, 'Chi phí cho mỗi khách hàng mới')
  assert.doesNotMatch(JSON.stringify(enLocale.home.commercial), /CPA|CTR|ROAS|REPORTS:READ/)
  assert.doesNotMatch(JSON.stringify(viLocale.home.commercial), /CPA|CTR|ROAS|REPORTS:READ/)
})

test('commercial charts render recognized channel labels and explicit loss state', () => {
  assert.match(acquisitionTableSource, /getSalesChannelLabel/)
  assert.match(channelMixChartSource, /getSalesChannelLabel/)
  assert.match(channelMixChartSource, /labels\.loss/)
  assert.match(channelMixChartSource, /row\.amount/)
  assert.match(channelMixChartSource, /row\.magnitude/)
})

test('HomePage orders decision and acquisition sections before operating health', () => {
  const decisionSection = homePageSource.indexOf('home.commercial.decision.title')
  const acquisitionSection = homePageSource.indexOf('home.commercial.acquisition.title')
  const operationsSection = homePageSource.indexOf('home.commercial.operations.title')
  assert.ok(decisionSection >= 0 && decisionSection < acquisitionSection)
  assert.ok(acquisitionSection < operationsSection)
})
