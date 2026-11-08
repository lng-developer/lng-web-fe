import { useMemo, useState, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { AimOutlined, DollarOutlined, FundOutlined, ShoppingOutlined } from '@ant-design/icons'
import { Button, Empty, Space, Typography, type TableColumnsType } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { MetricCard, SectionCard } from '@/shared/ui'

import type { AdsSellerDaily } from '../api/reportApi'
import { ReportTrendChart } from '../pages/ReportTrendChart'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'

interface ReportAdsEmployeeTabProps {
  data?: AdsSellerDaily[]
  isPending: boolean
  dates?: string[]
  filterBar?: ReactNode
}

type RankingMetric = 'roas' | 'sales' | 'spend' | 'cpa'
type TrendMetric = 'spend' | 'sales' | 'orders' | 'clicks'

type SellerSummary = {
  key: string
  sellerEmployeeCode: string
  sellerName: string | null
  currency: string
  spendAmount: number
  attributedSalesAmount: number
  impressions: number
  clicks: number
  attributedOrdersCount: number
}

type AdsDailyMatrixMetricKey =
  | 'spend'
  | 'sales'
  | 'roas'
  | 'orders'
  | 'clicks'
  | 'impressions'
  | 'cpa'

type AdsDailyMatrixRow = {
  key: string
  seller: string
  sellerEmployeeCode: string
  metric: string
  metricKey: AdsDailyMatrixMetricKey
  sellerGroup: number
  isFirstSellerRow: boolean
  total: number | null
  values: Record<string, number | null>
}

export function ReportAdsEmployeeTab({
  data = [],
  isPending,
  dates = [],
  filterBar,
}: ReportAdsEmployeeTabProps) {
  const { t } = useTranslation()
  const [viewMode, setViewMode] = useState<'summary' | 'daily'>('summary')

  const effectiveDates = useMemo(() => {
    if (dates && dates.length > 0) return dates
    const set = new Set<string>()
    data.forEach((row) => {
      if (row.date) set.add(row.date)
    })
    return [...set].sort()
  }, [dates, data])

  const rowsByCurrency = useMemo(() => {
    const groups = new Map<string, AdsSellerDaily[]>()
    data.forEach((row) => {
      const currency = row.currency || 'USD'
      groups.set(currency, [...(groups.get(currency) || []), row])
    })
    return groups.size ? [...groups.entries()] : ([['USD', [] as AdsSellerDaily[]]] as const)
  }, [data])

  return (
    <div className={styles.stack}>
      {/* 1. Metric cards ALWAYS at the very top */}
      {rowsByCurrency.map(([currency, rows]) => {
        const totalSpend = rows.reduce((sum, r) => sum + r.spendAmount, 0)
        const totalSales = rows.reduce((sum, r) => sum + r.attributedSalesAmount, 0)
        const totalOrders = rows.reduce((sum, r) => sum + r.attributedOrdersCount, 0)
        const roas = totalSpend > 0 ? (totalSales / totalSpend).toFixed(2) : '—'
        const cpa = totalOrders > 0 ? totalSpend / totalOrders : null

        return (
          <section
            key={`top-metrics-${currency}`}
            className={styles.currencySection}
            aria-label={currency}
          >
            {rowsByCurrency.length > 1 ? (
              <Typography.Text strong className={styles.currencyLabel}>
                {currency}
              </Typography.Text>
            ) : null}
            <div className={styles.metrics}>
              <MetricCard
                icon={<DollarOutlined />}
                label={t('reports.columns.spend')}
                value={formatReportMoney(totalSpend, currency)}
                variant="warning"
                loading={isPending}
              />
              <MetricCard
                icon={<ShoppingOutlined />}
                label={t('reports.columns.sales')}
                value={formatReportMoney(totalSales, currency)}
                variant="primary"
                loading={isPending}
              />
              <MetricCard
                icon={<FundOutlined />}
                label={t('reports.columns.roas')}
                value={roas === '—' ? roas : `${roas}x`}
                variant="success"
                loading={isPending}
              />
              <MetricCard
                icon={<AimOutlined />}
                label={t('reports.columns.cpa')}
                value={cpa == null ? '—' : formatReportMoney(cpa, currency)}
                variant="neutral"
                loading={isPending}
              />
            </div>
          </section>
        )
      })}

      {/* 2. Filter Bar */}
      {filterBar}

      {/* 3. View Mode Switcher: Summary / Daily */}
      <Space className={styles.profitabilityMode}>
        <Button
          type={viewMode === 'summary' ? 'primary' : 'default'}
          onClick={() => setViewMode('summary')}
        >
          {t('reports.profitability.summary')}
        </Button>
        <Button
          type={viewMode === 'daily' ? 'primary' : 'default'}
          onClick={() => setViewMode('daily')}
        >
          {t('reports.profitability.daily')}
        </Button>
      </Space>

      {/* 4. Content according to View Mode */}
      {!data.length && !isPending ? (
        <SectionCard title="">
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        </SectionCard>
      ) : (
        rowsByCurrency.map(([currency, rows]) =>
          viewMode === 'summary' ? (
            <AdsSummaryReport
              key={`summary-${currency}`}
              currency={currency}
              rows={rows}
              dates={effectiveDates}
            />
          ) : (
            <AdsDailyReport
              key={`daily-${currency}`}
              currency={currency}
              rows={rows}
              isPending={isPending}
              dates={effectiveDates}
            />
          ),
        )
      )}
    </div>
  )
}

function AdsSummaryReport({
  currency,
  rows,
  dates,
}: {
  currency: string
  rows: AdsSellerDaily[]
  dates: string[]
}) {
  const { t } = useTranslation()
  const [rankingMetric, setRankingMetric] = useState<RankingMetric>('roas')
  const [selectedSellerKey, setSelectedSellerKey] = useState<string | null>(null)
  const summaries = useMemo(() => summarizeSellers(rows, currency), [currency, rows])
  const sortedSummaries = useMemo(
    () =>
      [...summaries].sort(
        (left, right) => rankingValue(right, rankingMetric) - rankingValue(left, rankingMetric),
      ),
    [rankingMetric, summaries],
  )
  const selectedSummary =
    summaries.find((summary) => summary.key === selectedSellerKey) || sortedSummaries[0]

  // Trend metric state: intelligently default to 'spend' if seller has spend but 0 sales
  const [userTrendMetric, setUserTrendMetric] = useState<TrendMetric | null>(null)

  const activeTrendMetric: TrendMetric = useMemo(() => {
    if (userTrendMetric) return userTrendMetric
    if (rankingMetric === 'spend') return 'spend'
    if (rankingMetric === 'sales') return 'sales'
    if (rankingMetric === 'cpa') return 'spend'
    // rankingMetric === 'roas': if sales is 0 but spend > 0, show spend
    if (
      selectedSummary &&
      selectedSummary.attributedSalesAmount === 0 &&
      selectedSummary.spendAmount > 0
    ) {
      return 'spend'
    }
    return 'sales'
  }, [userTrendMetric, rankingMetric, selectedSummary])

  const trend = useMemo(
    () =>
      selectedSummary
        ? summarizeDailyTrend(rows, selectedSummary.key, currency, activeTrendMetric, dates)
        : [],
    [currency, rows, selectedSummary, activeTrendMetric, dates],
  )

  const scale = Math.max(
    ...sortedSummaries.map((summary) => Math.abs(rankingValue(summary, rankingMetric))),
    1,
  )

  const formatTrendValue = (value: number) => {
    if (activeTrendMetric === 'spend' || activeTrendMetric === 'sales') {
      return formatReportMoney(value, currency)
    }
    return value.toLocaleString()
  }

  return (
    <div className={styles.twoColumns}>
      <SectionCard title={t('reports.adsEmployee.ranking')}>
        <div className={styles.adsRankingTabs}>
          {(['roas', 'sales', 'spend', 'cpa'] as RankingMetric[]).map((metric) => (
            <Button
              key={metric}
              size="small"
              type={rankingMetric === metric ? 'primary' : 'text'}
              onClick={() => {
                setRankingMetric(metric)
                setUserTrendMetric(null)
              }}
            >
              {rankingLabel(metric, t)}
            </Button>
          ))}
        </div>
        <div className={styles.adsRankingRows}>
          {sortedSummaries.map((summary, index) => (
            <button
              key={summary.key}
              type="button"
              className={`${styles.adsRankingRow} ${summary.key === selectedSummary?.key ? styles.adsRankingRowSelected : ''}`}
              aria-pressed={summary.key === selectedSummary?.key}
              onClick={() => setSelectedSellerKey(summary.key)}
            >
              <span className={styles.adsRankingName}>
                <small>#{index + 1}</small>
                {summary.sellerName || summary.sellerEmployeeCode}
              </span>
              <span className={styles.adsRankingTrack}>
                <span
                  style={{
                    width: `${(Math.abs(rankingValue(summary, rankingMetric)) / scale) * 100}%`,
                  }}
                />
              </span>
              <strong>{formatRankingValue(summary, rankingMetric, currency)}</strong>
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard title={t('reports.adsEmployee.trend')}>
        {selectedSummary ? (
          <>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 8,
                marginBottom: 8,
              }}
            >
              <Typography.Text strong style={{ fontSize: 14 }}>
                {selectedSummary.sellerName || selectedSummary.sellerEmployeeCode}
              </Typography.Text>
              <Space size="small" wrap>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('reports.columns.sales')}:{' '}
                  <Typography.Text strong style={{ color: 'var(--ant-color-primary)' }}>
                    {formatReportMoney(selectedSummary.attributedSalesAmount, currency)}
                  </Typography.Text>
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('reports.columns.spend')}:{' '}
                  <Typography.Text strong>
                    {formatReportMoney(selectedSummary.spendAmount, currency)}
                  </Typography.Text>
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                  {t('reports.columns.orders')}:{' '}
                  <Typography.Text strong>
                    {selectedSummary.attributedOrdersCount.toLocaleString()}
                  </Typography.Text>
                </Typography.Text>
              </Space>
            </div>

            {/* Metric selector for trend chart */}
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12,
              }}
            >
              <Space size={4}>
                <Button
                  size="small"
                  type={activeTrendMetric === 'spend' ? 'primary' : 'text'}
                  onClick={() => setUserTrendMetric('spend')}
                >
                  {t('reports.columns.spend')}
                </Button>
                <Button
                  size="small"
                  type={activeTrendMetric === 'sales' ? 'primary' : 'text'}
                  onClick={() => setUserTrendMetric('sales')}
                >
                  {t('reports.columns.sales')}
                </Button>
                <Button
                  size="small"
                  type={activeTrendMetric === 'orders' ? 'primary' : 'text'}
                  onClick={() => setUserTrendMetric('orders')}
                >
                  {t('reports.columns.orders')}
                </Button>
                <Button
                  size="small"
                  type={activeTrendMetric === 'clicks' ? 'primary' : 'text'}
                  onClick={() => setUserTrendMetric('clicks')}
                >
                  {t('reports.columns.clicks')}
                </Button>
              </Space>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {trendMetricLabel(activeTrendMetric, t)}
              </Typography.Text>
            </div>

            <ReportTrendChart
              ariaLabel={t('reports.adsEmployee.trend')}
              data={trend}
              formatValue={formatTrendValue}
              formatDate={(date) => dayjs(date).format('DD/MM/YYYY')}
            />
          </>
        ) : (
          <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
        )}
      </SectionCard>
    </div>
  )
}

function AdsDailyReport({
  currency,
  rows,
  isPending,
  dates,
}: {
  currency: string
  rows: AdsSellerDaily[]
  isPending: boolean
  dates: string[]
}) {
  const { t } = useTranslation()

  const metrics: Array<{ key: AdsDailyMatrixMetricKey; label: string }> = useMemo(
    () => [
      { key: 'spend', label: t('reports.columns.spend') },
      { key: 'sales', label: t('reports.columns.sales') },
      { key: 'roas', label: t('reports.columns.roas') },
      { key: 'orders', label: t('reports.columns.orders') },
      { key: 'clicks', label: t('reports.columns.clicks') },
      { key: 'impressions', label: t('reports.columns.impressions') },
      { key: 'cpa', label: t('reports.columns.cpa') },
    ],
    [t],
  )

  const matrixRows = useMemo<AdsDailyMatrixRow[]>(() => {
    const sellersByKey = new Map<string, AdsSellerDaily[]>()
    rows.forEach((row) => {
      const key = `${row.sellerEmployeeCode || 'UNASSIGNED'}-${row.sellerName || ''}`
      sellersByKey.set(key, [...(sellersByKey.get(key) || []), row])
    })

    return [...sellersByKey.entries()].flatMap(([sellerKey, sellerRows], sellerGroup) => {
      const sellerName = sellerRows[0]?.sellerName || sellerRows[0]?.sellerEmployeeCode || '—'
      const sellerCode = sellerRows[0]?.sellerEmployeeCode || 'UNASSIGNED'

      // Index daily rows by date
      const rowByDate = new Map<string, AdsSellerDaily>()
      sellerRows.forEach((r) => {
        if (r.date) rowByDate.set(r.date, r)
      })

      // Calculate totals for seller
      const sellerTotalSpend = sellerRows.reduce((sum, r) => sum + r.spendAmount, 0)
      const sellerTotalSales = sellerRows.reduce((sum, r) => sum + r.attributedSalesAmount, 0)
      const sellerTotalOrders = sellerRows.reduce((sum, r) => sum + r.attributedOrdersCount, 0)
      const sellerTotalClicks = sellerRows.reduce((sum, r) => sum + r.clicks, 0)
      const sellerTotalImpressions = sellerRows.reduce((sum, r) => sum + r.impressions, 0)

      return metrics.map(({ key, label }, metricIndex) => {
        const values: Record<string, number | null> = {}
        dates.forEach((date) => {
          const item = rowByDate.get(date)
          if (!item) {
            values[date] = 0
            return
          }
          if (key === 'spend') values[date] = item.spendAmount
          else if (key === 'sales') values[date] = item.attributedSalesAmount
          else if (key === 'roas') {
            values[date] =
              item.spendAmount > 0 ? item.attributedSalesAmount / item.spendAmount : null
          } else if (key === 'orders') values[date] = item.attributedOrdersCount
          else if (key === 'clicks') values[date] = item.clicks
          else if (key === 'impressions') values[date] = item.impressions
          else if (key === 'cpa') {
            values[date] =
              item.attributedOrdersCount > 0 ? item.spendAmount / item.attributedOrdersCount : null
          }
        })

        let total: number | null = null
        if (key === 'spend') total = sellerTotalSpend
        else if (key === 'sales') total = sellerTotalSales
        else if (key === 'roas') {
          total = sellerTotalSpend > 0 ? sellerTotalSales / sellerTotalSpend : null
        } else if (key === 'orders') total = sellerTotalOrders
        else if (key === 'clicks') total = sellerTotalClicks
        else if (key === 'impressions') total = sellerTotalImpressions
        else if (key === 'cpa') {
          total = sellerTotalOrders > 0 ? sellerTotalSpend / sellerTotalOrders : null
        }

        return {
          key: `${sellerKey}-${key}`,
          seller: metricIndex === 0 ? sellerName : '',
          sellerEmployeeCode: sellerCode,
          metric: label,
          metricKey: key,
          sellerGroup,
          isFirstSellerRow: metricIndex === 0,
          total,
          values,
        }
      })
    })
  }, [rows, dates, metrics])

  const renderAmount = (amount: number | null, metricKey: AdsDailyMatrixMetricKey) => {
    if (amount === null) return '—'
    if (metricKey === 'spend' || metricKey === 'sales' || metricKey === 'cpa') {
      return formatReportMoney(amount, currency)
    }
    if (metricKey === 'roas') {
      return amount > 0 ? `${amount.toFixed(2)}x` : '—'
    }
    return amount.toLocaleString()
  }

  const columns: TableColumnsType<AdsDailyMatrixRow> = useMemo(
    () => [
      {
        title: t('reports.columns.seller'),
        dataIndex: 'seller',
        width: 160,
        fixed: 'left',
        render: (_, row) =>
          row.seller ? <Typography.Text strong>{row.seller}</Typography.Text> : null,
        onCell: () => ({ className: styles.dailySellerCell }),
      },
      {
        title: t('reports.columns.metric'),
        dataIndex: 'metric',
        width: 160,
        fixed: 'left',
        render: (_, row) => <span className={styles.dailyMetric}>{row.metric}</span>,
        onCell: () => ({ className: styles.dailyMetricCell }),
      },
      {
        title: t('reports.columns.total'),
        width: 120,
        fixed: 'left',
        align: 'right',
        render: (_, row) => renderAmount(row.total, row.metricKey),
        onCell: () => ({ className: styles.dailyTotalCell }),
      },
      ...dates.map((date) => {
        const d = dayjs(date)
        return {
          title: (
            <div style={{ textAlign: 'center', lineHeight: 1.2 }}>
              <div>{d.format('DD/MM')}</div>
              <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                {d.format('ddd')}
              </Typography.Text>
            </div>
          ),
          width: 112,
          align: 'right' as const,
          render: (_: unknown, row: AdsDailyMatrixRow) =>
            renderAmount(row.values[date] ?? null, row.metricKey),
        }
      }),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, dates, currency],
  )

  return (
    <SectionCard title={t('reports.adsEmployee.dailyTable')}>
      <CoreDataTable
        className={styles.dailyTable}
        tableLayout="fixed"
        rowKey="key"
        columns={columns}
        dataSource={matrixRows}
        loading={isPending}
        pagination={false}
        scroll={{ x: 440 + dates.length * 112, y: 560 }}
        rowClassName={(row) =>
          [
            row.metricKey === 'sales' ? styles.dailyRowGrossProfit : '',
            row.metricKey === 'spend' ? styles.dailyRowNetProfit : '',
            row.sellerGroup % 2 ? styles.dailySellerStripe : '',
            row.isFirstSellerRow ? styles.dailySellerGroupStart : '',
          ]
            .filter(Boolean)
            .join(' ')
        }
      />
    </SectionCard>
  )
}

function summarizeSellers(rows: AdsSellerDaily[], currency: string): SellerSummary[] {
  const summaries = new Map<string, SellerSummary>()
  rows.forEach((row) => {
    const key = `${row.sellerEmployeeCode}-${currency}`
    const current = summaries.get(key) || {
      key,
      sellerEmployeeCode: row.sellerEmployeeCode,
      sellerName: row.sellerName,
      currency,
      spendAmount: 0,
      attributedSalesAmount: 0,
      impressions: 0,
      clicks: 0,
      attributedOrdersCount: 0,
    }
    current.spendAmount += row.spendAmount
    current.attributedSalesAmount += row.attributedSalesAmount
    current.impressions += row.impressions
    current.clicks += row.clicks
    current.attributedOrdersCount += row.attributedOrdersCount
    summaries.set(key, current)
  })
  return [...summaries.values()]
}

function summarizeDailyTrend(
  rows: AdsSellerDaily[],
  sellerKey: string,
  currency: string,
  metric: TrendMetric,
  dates: string[],
) {
  const daily = new Map<string, number>()
  if (dates.length) {
    dates.forEach((d) => daily.set(d, 0))
  }
  rows.forEach((row) => {
    if (`${row.sellerEmployeeCode}-${currency}` !== sellerKey || !row.date) return
    let val = 0
    if (metric === 'spend') val = row.spendAmount
    else if (metric === 'sales') val = row.attributedSalesAmount
    else if (metric === 'orders') val = row.attributedOrdersCount
    else if (metric === 'clicks') val = row.clicks
    daily.set(row.date, (daily.get(row.date) || 0) + val)
  })
  return [...daily.entries()]
    .map(([label, value]) => ({ label, value }))
    .sort((left, right) => left.label.localeCompare(right.label))
}

function rankingValue(summary: SellerSummary, metric: RankingMetric) {
  if (metric === 'sales') return summary.attributedSalesAmount
  if (metric === 'spend') return summary.spendAmount
  if (metric === 'cpa')
    return summary.attributedOrdersCount > 0
      ? -summary.spendAmount / summary.attributedOrdersCount
      : Number.NEGATIVE_INFINITY
  return summary.spendAmount > 0 ? summary.attributedSalesAmount / summary.spendAmount : 0
}

function rankingLabel(metric: RankingMetric, t: (key: string) => string) {
  if (metric === 'sales') return t('reports.columns.sales')
  if (metric === 'spend') return t('reports.columns.spend')
  if (metric === 'cpa') return t('reports.columns.cpa')
  return t('reports.columns.roas')
}

function trendMetricLabel(metric: TrendMetric, t: (key: string) => string) {
  if (metric === 'spend') return `${t('reports.columns.spend')} trend`
  if (metric === 'sales') return `${t('reports.columns.sales')} trend`
  if (metric === 'orders') return `${t('reports.columns.orders')} trend`
  return `${t('reports.columns.clicks')} trend`
}

function formatRankingValue(summary: SellerSummary, metric: RankingMetric, currency: string) {
  if (metric === 'sales') return formatReportMoney(summary.attributedSalesAmount, currency)
  if (metric === 'spend') return formatReportMoney(summary.spendAmount, currency)
  if (metric === 'cpa')
    return summary.attributedOrdersCount > 0
      ? formatReportMoney(summary.spendAmount / summary.attributedOrdersCount, currency)
      : '—'
  return summary.spendAmount > 0
    ? `${(summary.attributedSalesAmount / summary.spendAmount).toFixed(2)}x`
    : '—'
}
