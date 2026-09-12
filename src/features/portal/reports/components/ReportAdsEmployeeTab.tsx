import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { AimOutlined, DollarOutlined, FundOutlined, ShoppingOutlined } from '@ant-design/icons'
import { Button, Empty, Typography } from 'antd'

import { MetricCard, SectionCard } from '@/shared/ui'

import type { AdsSellerDaily } from '../api/reportApi'
import { ReportTrendChart } from '../pages/ReportTrendChart'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'

interface ReportAdsEmployeeTabProps {
  data?: AdsSellerDaily[]
  isPending: boolean
}

type RankingMetric = 'roas' | 'sales' | 'spend' | 'cpa'
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

export function ReportAdsEmployeeTab({ data = [], isPending }: ReportAdsEmployeeTabProps) {
  const rowsByCurrency = useMemo(() => {
    const groups = new Map<string, AdsSellerDaily[]>()
    data.forEach((row) => {
      const currency = row.currency || 'USD'
      groups.set(currency, [...(groups.get(currency) || []), row])
    })
    return [...groups.entries()]
  }, [data])

  if (!data.length && !isPending) {
    return (
      <SectionCard title="">
        <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
      </SectionCard>
    )
  }

  return (
    <div className={styles.stack}>
      {rowsByCurrency.map(([currency, rows]) => (
        <AdsCurrencyReport key={currency} currency={currency} rows={rows} isPending={isPending} />
      ))}
    </div>
  )
}

function AdsCurrencyReport({
  currency,
  rows,
  isPending,
}: {
  currency: string
  rows: AdsSellerDaily[]
  isPending: boolean
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
  const trend = useMemo(
    () => (selectedSummary ? summarizeDaily(rows, selectedSummary.key, currency) : []),
    [currency, rows, selectedSummary],
  )
  const totals = summaries.reduce(
    (result, summary) => ({
      spendAmount: result.spendAmount + summary.spendAmount,
      attributedSalesAmount: result.attributedSalesAmount + summary.attributedSalesAmount,
      attributedOrdersCount: result.attributedOrdersCount + summary.attributedOrdersCount,
    }),
    { spendAmount: 0, attributedSalesAmount: 0, attributedOrdersCount: 0 },
  )
  const roas =
    totals.spendAmount > 0 ? (totals.attributedSalesAmount / totals.spendAmount).toFixed(2) : '—'
  const cpa =
    totals.attributedOrdersCount > 0 ? totals.spendAmount / totals.attributedOrdersCount : null
  const scale = Math.max(
    ...sortedSummaries.map((summary) => Math.abs(rankingValue(summary, rankingMetric))),
    1,
  )

  return (
    <div className={styles.stack}>
      <Typography.Text strong className={styles.currencyLabel}>
        {currency}
      </Typography.Text>
      <div className={styles.metrics}>
        <MetricCard
          icon={<DollarOutlined />}
          label={t('reports.columns.spend')}
          value={formatReportMoney(totals.spendAmount, currency)}
          variant="warning"
          loading={isPending}
        />
        <MetricCard
          icon={<ShoppingOutlined />}
          label={t('reports.columns.sales')}
          value={formatReportMoney(totals.attributedSalesAmount, currency)}
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
      <div className={styles.twoColumns}>
        <SectionCard title={t('reports.adsEmployee.ranking')}>
          <div className={styles.adsRankingTabs}>
            {(['roas', 'sales', 'spend', 'cpa'] as RankingMetric[]).map((metric) => (
              <Button
                key={metric}
                size="small"
                type={rankingMetric === metric ? 'primary' : 'text'}
                onClick={() => setRankingMetric(metric)}
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
              <Typography.Text strong>
                {selectedSummary.sellerName || selectedSummary.sellerEmployeeCode}
              </Typography.Text>
              <ReportTrendChart
                ariaLabel={t('reports.adsEmployee.trend')}
                data={trend}
                formatValue={(value) => formatReportMoney(value, currency)}
              />
            </>
          ) : (
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} />
          )}
        </SectionCard>
      </div>
    </div>
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

function summarizeDaily(rows: AdsSellerDaily[], sellerKey: string, currency: string) {
  const daily = new Map<string, number>()
  rows.forEach((row) => {
    if (`${row.sellerEmployeeCode}-${currency}` !== sellerKey || !row.date) return
    daily.set(row.date, (daily.get(row.date) || 0) + row.attributedSalesAmount)
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
