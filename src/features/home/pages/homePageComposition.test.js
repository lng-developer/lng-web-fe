import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import test from 'node:test'

const homePageSource = await readFile(new URL('./HomePage.jsx', import.meta.url), 'utf8')
const acquisitionTableSource = await readFile(
  new URL('../components/AcquisitionTable.jsx', import.meta.url),
  'utf8',
)
const acquisitionFunnelSource = await readFile(
  new URL('../components/AcquisitionFunnelChart.jsx', import.meta.url),
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
  assert.match(homePageSource, /className="-mx-4 bg-surface-subtle px-6 md:-mx-6"/)
  assert.match(homePageSource, /className="-mx-6 h-full overflow-y-auto px-6"/)
  assert.doesNotMatch(homePageSource, /max-w-\[(?:1440|1520)px\]/)
  assert.doesNotMatch(homePageSource, /max-w-\[1520px\][^"]*overflow-y-auto/)
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

test('HomePage classifies acquisition availability after selected-currency filtering', () => {
  assert.match(homePageSource, /getAnalyticsRowsState\(\{[\s\S]*rows: acquisitionRows[\s\S]*\}\)/)
  assert.match(homePageSource, /isError: data\.acquisitionState === 'unavailable'/)
  assert.match(homePageSource, /isPending: data\.acquisitionState === 'loading'/)
})

test('HomePage styles the net-profit metric by sign', () => {
  assert.match(homePageSource, /tone={getProfitTone\(total\.netProfitAmount\)}/)
})

test('ProfitBridge styles its bar, background, and text from each actual value sign', () => {
  assert.match(homePageSource, /getProfitTone\(entry\.value\)/)
  assert.match(homePageSource, /danger: \{[\s\S]*bar: 'bg-danger'/)
  assert.match(homePageSource, /danger: \{[\s\S]*background: 'bg-danger-bg'/)
  assert.match(homePageSource, /danger: \{[\s\S]*text: 'text-danger'/)
  assert.doesNotMatch(homePageSource, /netProfit[^\n]*tone: 'bg-success'/)
})

test('AcquisitionFunnelChart renders one titled stacked ratio bar per channel', () => {
  assert.match(acquisitionFunnelSource, /buildAcquisitionFunnelRows\(rows\)\.map/)
  assert.match(acquisitionFunnelSource, /getSalesChannelLabel/)
  assert.match(acquisitionFunnelSource, /<title>/)
  assert.match(acquisitionFunnelSource, /labels\.ctr/)
  assert.match(acquisitionFunnelSource, /labels\.conversion/)
  assert.doesNotMatch(acquisitionFunnelSource, /sum\(rows/)
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

test('profit mix charts use localized profit-specific empty copy', () => {
  assert.equal(enLocale.home.commercial.profit.empty, 'No profit data for this period.')
  assert.equal(viLocale.home.commercial.profit.empty, 'Chưa có dữ liệu lợi nhuận trong kỳ này.')
  assert.notEqual(enLocale.home.commercial.profit.empty, enLocale.home.commercial.acquisition.empty)
  assert.equal(homePageSource.match(/empty: t\('home\.commercial\.profit\.empty'\)/g)?.length, 2)
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
