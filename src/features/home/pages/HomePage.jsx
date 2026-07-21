import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import AssessmentOutlinedIcon from '@mui/icons-material/AssessmentOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, FormControl, MenuItem, Select, Typography } from '@mui/material'

import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  StatusBadge,
} from '@/components/operations'
import { ROUTES } from '@/constants/routes'
import { resolveCurrentUser } from '@/features/auth/utils/currentUser'
import ChannelProfitChart from '@/features/reports/components/ChannelProfitChart'
import DailyProfitChart from '@/features/reports/components/DailyProfitChart'
import { useAuthStore } from '@/store/useAuthStore'
import { formatCurrency } from '@/utils/format'

import { useHomeDashboardQuery } from '../api/home.queries'
import AcquisitionFunnelChart from '../components/AcquisitionFunnelChart'
import AcquisitionTable from '../components/AcquisitionTable'
import ChannelMixChart from '../components/ChannelMixChart'
import DashboardSectionHeader from '../components/DashboardSectionHeader'
import {
  buildLastDaysQuery,
  getAnalyticsRowsState,
  getProfitTone,
} from '../utils/commercialDashboard'

const BRIDGE_TONES = {
  danger: { background: 'bg-danger-bg', bar: 'bg-danger', text: 'text-danger' },
  default: { background: 'bg-surface-subtle', bar: 'bg-ink-muted', text: 'text-ink-muted' },
  success: { background: 'bg-success-bg', bar: 'bg-success', text: 'text-success' },
}

function formatMoney(amount, currency, language) {
  return formatCurrency(Number(amount || 0) / 100, language, currency || 'USD')
}

function formatPercent(bps) {
  return bps === null || bps === undefined ? '-' : `${(Number(bps) / 100).toFixed(1)}%`
}

function Metric({ hint, label, value, tone = 'default' }) {
  const toneClass =
    {
      danger: 'text-danger',
      success: 'text-success',
      warning: 'text-warning',
    }[tone] || 'text-ink-strong'

  return (
    <div className="min-w-0 border-l-2 border-border px-3 py-2 first:border-l-0">
      <div className="truncate text-xs font-medium uppercase text-ink-muted">{label}</div>
      <div className={`mt-1 truncate text-xl font-semibold ${toneClass}`}>{value}</div>
      <div className="mt-1 text-xs text-ink-muted">{hint}</div>
    </div>
  )
}

function ExceptionLink({ count, label, to, tone = 'warning' }) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 border-b border-transparent px-1 py-2 text-sm font-medium text-ink-secondary no-underline hover:border-primary hover:text-primary"
    >
      <span>{label}</span>
      <StatusBadge tone={count ? tone : 'info'}>{count}</StatusBadge>
    </Link>
  )
}

function ProfitBridge({ language, total, currency, labels, title }) {
  const entries = [
    { label: labels.sales, value: total.revenueAmount },
    { label: labels.productCost, value: -total.baseCostAmount },
    { label: labels.adSpend, value: -total.adSpendAmount },
    { label: labels.netProfit, value: total.netProfitAmount },
  ]
  const maximum = Math.max(...entries.map((entry) => Math.abs(entry.value)), 1)

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <Typography className="text-sm font-semibold text-ink-strong">{title}</Typography>
        <Typography className="text-xs text-ink-muted">{currency}</Typography>
      </div>
      <div className="space-y-3 px-4 py-4">
        {entries.map((entry) => {
          const tone = BRIDGE_TONES[getProfitTone(entry.value)]
          return (
            <div key={entry.label}>
              <div className="mb-1 flex items-center justify-between gap-3 text-xs text-ink-secondary">
                <span>{entry.label}</span>
                <span className={`font-medium ${tone.text}`}>
                  {formatMoney(entry.value, currency, language)}
                </span>
              </div>
              <div className={`h-2 ${tone.background}`}>
                <div
                  className={tone.bar}
                  style={{
                    height: '100%',
                    width: `${Math.max((Math.abs(entry.value) / maximum) * 100, 2)}%`,
                  }}
                />
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

function BuyerInsights({ buyer, labels, title }) {
  const segments = [
    [labels.new, buyer.newBuyerCount, 'bg-primary'],
    [labels.returning, buyer.returningBuyerCount, 'bg-success'],
    [labels.repeatInPeriod, buyer.repeatBuyerCount, 'bg-warning'],
  ]
  const denominator = Math.max(buyer.knownBuyerCount, 1)

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <Typography className="text-sm font-semibold text-ink-strong">{title}</Typography>
      </div>
      <div className="space-y-3 px-4 py-4">
        {segments.map(([label, count, tone]) => (
          <div key={label}>
            <div className="mb-1 flex justify-between text-xs text-ink-secondary">
              <span>{label}</span>
              <span className="font-medium text-ink-strong">{count}</span>
            </div>
            <div className="h-2 bg-surface-subtle">
              <div
                className={tone}
                style={{ height: '100%', width: `${(count / denominator) * 100}%` }}
              />
            </div>
          </div>
        ))}
        <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 text-xs">
          <div>
            <div className="text-ink-muted">{labels.repeatRate}</div>
            <div className="mt-1 font-semibold text-ink-strong">
              {formatPercent(buyer.repeatPurchaseRateBps)}
            </div>
          </div>
          <div>
            <div className="text-ink-muted">{labels.unidentifiedOrders}</div>
            <div className="mt-1 font-semibold text-ink-strong">{buyer.unidentifiedOrderCount}</div>
          </div>
        </div>
      </div>
    </section>
  )
}

function VendorReliability({ items, labels, title }) {
  const rows = items.slice(0, 5)

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <Typography className="text-sm font-semibold text-ink-strong">{title}</Typography>
      </div>
      <div className="divide-y divide-border">
        {rows.length ? (
          rows.map((vendor) => {
            const total = vendor.submittedCount + vendor.failedCount
            const success = vendor.successRateBps === null ? 0 : Number(vendor.successRateBps) / 100
            return (
              <div key={vendor.vendorId || vendor.vendorCode} className="px-4 py-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="truncate font-medium text-ink-strong">
                    {vendor.vendorName || vendor.vendorCode || labels.unknownVendor}
                  </span>
                  <span className="shrink-0 text-xs text-ink-muted">
                    {labels.submissionsCount({ count: total })}
                  </span>
                </div>
                <div className="mt-2 h-2 bg-surface-subtle">
                  <div className="h-full bg-success" style={{ width: `${success}%` }} />
                </div>
                <div className="mt-1 flex justify-between text-xs text-ink-muted">
                  <span>{formatPercent(vendor.successRateBps)}</span>
                  <span>
                    {vendor.avgProcessingHours === null
                      ? '-'
                      : labels.averageHours({ count: vendor.avgProcessingHours })}
                  </span>
                </div>
              </div>
            )
          })
        ) : (
          <div className="px-4 py-6 text-sm text-ink-muted">{labels.empty}</div>
        )}
      </div>
    </section>
  )
}

function OperationsSummary({ data, labels, title }) {
  const groups = [
    [labels.production, data.productionByStatus],
    [labels.vendor, data.vendorSubmissionsByStatus],
    [labels.shipment, data.shipmentsByStatus],
  ]

  return (
    <section className="border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <Typography className="text-sm font-semibold text-ink-strong">{title}</Typography>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3">
        {groups.map(([label, values]) => (
          <div key={label} className="bg-surface px-4 py-3">
            <div className="text-xs font-medium uppercase text-ink-muted">{label}</div>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-sm text-ink-strong">
              {Object.entries(values || {}).map(([status, count]) => (
                <span key={status}>
                  {status}: <strong>{count}</strong>
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

export default function HomePage() {
  const { t, i18n } = useTranslation()
  const storedCurrentUser = useAuthStore((state) => state.currentUser)
  const user = resolveCurrentUser(storedCurrentUser)
  const [rangeDays, setRangeDays] = useState(30)
  const [channel, setChannel] = useState('')
  const [selectedCurrency, setSelectedCurrency] = useState('')
  const query = useMemo(
    () => ({ ...buildLastDaysQuery(rangeDays), ...(channel ? { salesChannelCode: channel } : {}) }),
    [channel, rangeDays],
  )
  const { data, failedSources, isError, isPending, refetch } = useHomeDashboardQuery(user, query)
  const currency = data.commercial.currencies.includes(selectedCurrency)
    ? selectedCurrency
    : data.commercial.currencies[0] || 'USD'
  const total = data.commercial.byCurrency[currency] || {
    adSpendAmount: 0,
    baseCostAmount: 0,
    grossProfitAmount: 0,
    itemCount: 0,
    netMarginBps: null,
    netProfitAmount: 0,
    revenueAmount: 0,
  }
  const chartRows = data.dailyProfit?.filter((row) => (row.currency || 'USD') === currency) || []
  const acquisitionRows = data.commercial.acquisitionRows.filter(
    (row) => (row.currency || 'USD') === currency,
  )
  const acquisitionState = getAnalyticsRowsState({
    hasAccess: data.hasAnalyticsAccess,
    isError: data.acquisitionState === 'unavailable',
    isPending: data.acquisitionState === 'loading',
    rows: acquisitionRows,
  })
  const acquisitionSpend = acquisitionRows.reduce((sum, row) => sum + row.spendAmount, 0)
  const acquiredBuyers = acquisitionRows.reduce((sum, row) => sum + row.newBuyerCount, 0)
  const cpaAmount = acquiredBuyers ? Math.round(acquisitionSpend / acquiredBuyers) : null

  return (
    <OperationsPageShell
      className="overflow-y-auto bg-surface-subtle px-6"
      header={
        <OperationsHeader
          title={t('home.commercial.title')}
          subtitle={t('home.commercial.subtitle')}
          actions={
            <div className="flex items-center gap-2">
              <FormControl size="small">
                <Select
                  value={rangeDays}
                  onChange={(event) => setRangeDays(Number(event.target.value))}
                >
                  <MenuItem value={7}>{t('home.commercial.filters.days', { count: 7 })}</MenuItem>
                  <MenuItem value={30}>{t('home.commercial.filters.days', { count: 30 })}</MenuItem>
                  <MenuItem value={90}>{t('home.commercial.filters.days', { count: 90 })}</MenuItem>
                </Select>
              </FormControl>
              <FormControl size="small">
                <Select
                  displayEmpty
                  value={channel}
                  onChange={(event) => setChannel(event.target.value)}
                >
                  <MenuItem value="">{t('home.commercial.filters.allChannels')}</MenuItem>
                  <MenuItem value="AMAZON">Amazon</MenuItem>
                  <MenuItem value="ETSY">Etsy</MenuItem>
                </Select>
              </FormControl>
              {data.hasAnalyticsAccess ? (
                <Button
                  component={Link}
                  size="small"
                  startIcon={<AssessmentOutlinedIcon />}
                  to={ROUTES.PORTAL_REPORTS}
                >
                  {t('home.commercial.actions.reports')}
                </Button>
              ) : null}
              <IconActionButton
                label={t('home.dashboard.actions.refresh')}
                loading={isPending}
                onClick={() => refetch()}
              >
                <RefreshIcon fontSize="small" />
              </IconActionButton>
            </div>
          }
        />
      }
    >
      <div className="mx-auto flex h-full min-h-0 w-full max-w-[1520px] flex-col gap-5 overflow-y-auto pb-8">
        {!data.hasAnalyticsAccess ? (
          <Alert severity="info">{t('home.commercial.analyticsPermission')}</Alert>
        ) : null}
        {isError ? (
          <Alert severity="warning">
            {t('home.dashboard.partialData', { count: failedSources.length })}
          </Alert>
        ) : null}

        {data.commercial.currencies.length > 1 ? (
          <div className="flex items-center gap-2 text-sm text-ink-muted">
            <span>{t('home.commercial.currency')}</span>
            <FormControl size="small">
              <Select
                value={currency}
                onChange={(event) => setSelectedCurrency(event.target.value)}
              >
                {data.commercial.currencies.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        ) : null}

        <div className="space-y-3">
          <DashboardSectionHeader
            description={t('home.commercial.decision.description')}
            title={t('home.commercial.decision.title')}
          />
          <div className="grid overflow-hidden rounded-lg border border-border bg-border shadow-sm md:grid-cols-3 xl:grid-cols-6">
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.salesMomentum')}
                label={t('home.commercial.metrics.grossSales')}
                value={formatMoney(total.revenueAmount, currency, i18n.language)}
              />
            </div>
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.takeHomeProfit')}
                label={t('home.commercial.metrics.netProfit')}
                tone={getProfitTone(total.netProfitAmount)}
                value={formatMoney(total.netProfitAmount, currency, i18n.language)}
              />
            </div>
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.marginQuality')}
                label={t('home.commercial.metrics.profitMargin')}
                value={formatPercent(total.netMarginBps)}
              />
            </div>
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.marketingInvestment')}
                label={t('home.commercial.charts.adSpend')}
                value={formatMoney(total.adSpendAmount, currency, i18n.language)}
              />
            </div>
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.marketingEfficiency')}
                label={t('home.commercial.acquisition.cpa')}
                value={cpaAmount === null ? '-' : formatMoney(cpaAmount, currency, i18n.language)}
              />
            </div>
            <div className="bg-surface">
              <Metric
                hint={t('home.commercial.decision.customerRetention')}
                label={t('home.commercial.metrics.returningBuyerRate')}
                value={formatPercent(data.commercial.buyer.returningBuyerRateBps)}
              />
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <DashboardSectionHeader
            description={t('home.commercial.acquisition.description')}
            title={t('home.commercial.acquisition.title')}
          />
          {acquisitionState === 'ready' ? (
            <div className="grid gap-4 xl:grid-cols-12">
              <div className="xl:col-span-8">
                <AcquisitionTable
                  labels={{
                    channel: t('home.commercial.acquisition.channel'),
                    spend: t('home.commercial.acquisition.spend'),
                    newBuyers: t('home.commercial.acquisition.newBuyers'),
                    cpa: t('home.commercial.acquisition.cpa'),
                    ctr: t('home.commercial.acquisition.ctr'),
                    conversion: t('home.commercial.acquisition.conversion'),
                    roas: t('home.commercial.acquisition.roas'),
                    sales: t('home.commercial.acquisition.sales'),
                    empty: t('home.commercial.acquisition.empty'),
                    unknownChannel: t('home.commercial.acquisition.unknownChannel'),
                  }}
                  language={i18n.language}
                  rows={acquisitionRows}
                />
              </div>
              <div className="xl:col-span-4">
                <AcquisitionFunnelChart
                  labels={{
                    title: t('home.commercial.funnel.title'),
                    impressions: t('home.commercial.funnel.impressions'),
                    clicks: t('home.commercial.funnel.clicks'),
                    orders: t('home.commercial.funnel.orders'),
                    ctr: t('home.commercial.acquisition.ctr'),
                    conversion: t('home.commercial.acquisition.conversion'),
                    unknownChannel: t('home.commercial.acquisition.unknownChannel'),
                  }}
                  language={i18n.language}
                  rows={acquisitionRows}
                />
              </div>
            </div>
          ) : acquisitionState === 'empty' ? (
            <section className="rounded-lg border border-border bg-surface px-5 py-8 text-center shadow-sm">
              <Typography className="text-sm font-medium text-ink-strong">
                {t('home.commercial.acquisition.empty')}
              </Typography>
              <Typography className="mt-1 text-sm text-ink-muted">
                {t('home.commercial.acquisition.emptyDescription')}
              </Typography>
              <Button component={Link} size="small" to={ROUTES.PORTAL_REPORTS}>
                {t('home.commercial.acquisition.emptyAction')}
              </Button>
            </section>
          ) : (
            <section className="rounded-lg border border-border bg-surface px-5 py-8 text-center shadow-sm">
              <Typography className="text-sm text-ink-muted">
                {acquisitionState === 'unavailable'
                  ? t('home.commercial.acquisition.unavailable')
                  : t('home.commercial.acquisition.loading')}
              </Typography>
            </section>
          )}
        </div>

        <div className="space-y-3">
          <DashboardSectionHeader
            description={t('home.commercial.profit.description')}
            title={t('home.commercial.profit.title')}
          />
          <div className="grid gap-4 xl:grid-cols-12">
            <div className="xl:col-span-6">
              <DailyProfitChart
                currency={currency}
                labels={{
                  title: t('home.commercial.charts.revenueAndProfit'),
                  revenue: t('home.commercial.charts.revenue'),
                  grossProfit: t('home.commercial.charts.grossProfit'),
                  netProfit: t('home.commercial.charts.netProfit'),
                  netMargin: t('home.commercial.charts.netMargin'),
                }}
                language={i18n.language}
                rows={chartRows}
              />
            </div>
            <div className="xl:col-span-3">
              <ChannelMixChart
                labels={{
                  title: t('home.commercial.channelMix.revenueTitle'),
                  metric: t('home.commercial.charts.revenue'),
                  mix: t('home.commercial.channelMix.mix'),
                  empty: t('home.commercial.profit.empty'),
                  loss: t('home.commercial.channelMix.loss'),
                  unknownChannel: t('home.commercial.acquisition.unknownChannel'),
                }}
                language={i18n.language}
                metric="revenueAmount"
                rows={chartRows}
              />
            </div>
            <div className="xl:col-span-3">
              <ChannelMixChart
                labels={{
                  title: t('home.commercial.channelMix.profitTitle'),
                  metric: t('home.commercial.charts.netProfit'),
                  mix: t('home.commercial.channelMix.mix'),
                  empty: t('home.commercial.profit.empty'),
                  loss: t('home.commercial.channelMix.loss'),
                  unknownChannel: t('home.commercial.acquisition.unknownChannel'),
                }}
                language={i18n.language}
                metric="netProfitAmount"
                rows={chartRows}
              />
            </div>
          </div>
        </div>

        <div className="grid gap-4 xl:grid-cols-8">
          <div className="xl:col-span-5">
            <ChannelProfitChart
              currency={currency}
              labels={{
                title: t('home.commercial.charts.profitByChannel'),
                ranking: t('home.commercial.charts.channelRanking'),
              }}
              language={i18n.language}
              rows={chartRows}
            />
          </div>
          <div className="xl:col-span-3">
            <ProfitBridge
              currency={currency}
              language={i18n.language}
              labels={{
                sales: t('home.commercial.charts.revenue'),
                productCost: t('home.commercial.charts.productCost'),
                adSpend: t('home.commercial.charts.adSpend'),
                netProfit: t('home.commercial.charts.netProfit'),
              }}
              title={t('home.commercial.profitBridge')}
              total={total}
            />
          </div>
        </div>

        <div className="space-y-3">
          <DashboardSectionHeader
            description={t('home.commercial.operatingHealth.description')}
            title={t('home.commercial.operatingHealth.title')}
          />
          <section className="flex flex-wrap items-center gap-x-5 gap-y-1 rounded-lg border border-border bg-surface px-4 py-2 shadow-sm">
            <span className="mr-2 text-xs font-semibold uppercase text-ink-muted">
              {t('home.commercial.exceptions.title')}
            </span>
            <ExceptionLink
              count={data.exceptions.address}
              label={t('home.commercial.exceptions.address')}
              to={`${ROUTES.PORTAL_ORDER_LIST}?tab=addressIssue`}
              tone="danger"
            />
            <ExceptionLink
              count={data.exceptions.missingPsd}
              label={t('home.commercial.exceptions.missingPsd')}
              to={`${ROUTES.PORTAL_ORDER_LIST}?tab=missingPsd`}
              tone="danger"
            />
            <ExceptionLink
              count={data.exceptions.missingCostCenter}
              label={t('home.commercial.exceptions.missingCostCenter')}
              to={`${ROUTES.PORTAL_ORDER_LIST}?tab=missingCostCenter`}
            />
            <ExceptionLink
              count={data.exceptions.openCases}
              label={t('home.commercial.exceptions.openCases')}
              to={`${ROUTES.PORTAL_ORDER_LIST}?tab=openCase`}
            />
          </section>
          <div className="grid gap-4 xl:grid-cols-3">
            <BuyerInsights
              buyer={data.commercial.buyer}
              labels={{
                new: t('home.commercial.buyer.new'),
                returning: t('home.commercial.buyer.returning'),
                repeatInPeriod: t('home.commercial.buyer.repeatInPeriod'),
                repeatRate: t('home.commercial.buyer.repeatRate'),
                unidentifiedOrders: t('home.commercial.buyer.unidentifiedOrders'),
              }}
              title={t('home.commercial.buyer.title')}
            />
            <VendorReliability
              items={data.vendors}
              labels={{
                unknownVendor: t('home.commercial.vendor.unknown'),
                submissionsCount: (values) => t('home.commercial.vendor.submissions', values),
                averageHours: (values) => t('home.commercial.vendor.averageHours', values),
                empty: t('home.commercial.vendor.empty'),
              }}
              title={t('home.commercial.vendor.title')}
            />
            <OperationsSummary
              data={data.operations}
              labels={{
                production: t('home.commercial.operations.production'),
                vendor: t('home.commercial.operations.vendor'),
                shipment: t('home.commercial.operations.shipment'),
              }}
              title={t('home.commercial.operations.title')}
            />
          </div>
        </div>
      </div>
    </OperationsPageShell>
  )
}
