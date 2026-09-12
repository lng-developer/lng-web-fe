import React from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Space, Tooltip, Typography } from 'antd'

import { SectionCard } from '@/shared/ui'

import type { SellerPerformance } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'

interface ReportProfitComparisonChartProps {
  rows: SellerPerformance[]
  currency: string
  variant?: 'profitability' | 'sales'
}

type SalesMetric = 'netProfit' | 'adSpend' | 'revenue'

const rankBadges: Record<number, { text: string; bg: string; color: string }> = {
  0: { text: '#1', bg: 'rgba(212, 136, 6, 0.15)', color: '#d48806' },
  1: { text: '#2', bg: 'rgba(140, 140, 140, 0.15)', color: '#8c8c8c' },
  2: { text: '#3', bg: 'rgba(184, 115, 51, 0.15)', color: '#b87333' },
}

export const ReportProfitComparisonChart: React.FC<ReportProfitComparisonChartProps> = React.memo(
  ({ rows, currency, variant = 'profitability' }) => {
    const { t } = useTranslation()
    const [salesMetric, setSalesMetric] = React.useState<SalesMetric>('netProfit')
    const isSalesComparison = variant === 'sales'
    const usesPartialGrossProfit =
      !isSalesComparison && rows.some((row) => row.missingCostCount > 0)
    const usesPartialNetProfit =
      isSalesComparison &&
      salesMetric === 'netProfit' &&
      rows.some((row) => row.missingCostCount > 0 && row.partialNetProfitAmount != null)
    const profitAmount = (row: SellerPerformance) =>
      isSalesComparison
        ? salesMetric === 'revenue'
          ? row.revenueAmount
          : salesMetric === 'adSpend'
            ? row.adSpendAmount || 0
            : (row.partialNetProfitAmount ?? row.netProfitAmount ?? 0)
        : usesPartialGrossProfit
          ? (row.partialGrossProfitAmount ?? 0)
          : (row.netProfitAmount ?? 0)
    const isIncompleteRow = (row: SellerPerformance) =>
      isSalesComparison &&
      salesMetric === 'netProfit' &&
      row.netProfitAmount === null &&
      row.partialNetProfitAmount == null
    const sortedRows = [...rows].sort((left, right) => {
      if (isIncompleteRow(left) !== isIncompleteRow(right)) return isIncompleteRow(left) ? 1 : -1
      return profitAmount(right) - profitAmount(left)
    })
    const visibleRows = isSalesComparison ? sortedRows : sortedRows.slice(0, 8)
    const shouldScrollRows = isSalesComparison && visibleRows.length > 8
    const scale = Math.max(...rows.map((row) => Math.abs(profitAmount(row))), 1)
    const totalPositiveProfit = rows.reduce(
      (sum, row) => sum + (isIncompleteRow(row) ? 0 : Math.max(profitAmount(row), 0)),
      0,
    )
    const metricLabel = isSalesComparison
      ? salesMetric === 'revenue'
        ? t('reports.columns.revenue')
        : salesMetric === 'adSpend'
          ? t('reports.columns.spend')
          : t('reports.metrics.netProfit')
      : t('reports.metrics.netProfit')
    let completeRank = 0

    return (
      <SectionCard title={t('reports.profitability.comparison')}>
        <div
          className={styles.profitComparison}
          role="img"
          aria-label={t('reports.profitability.comparison')}
        >
          {usesPartialGrossProfit ? (
            <Typography.Text type="secondary">
              {t('reports.profitability.partialGrossProfit')}
            </Typography.Text>
          ) : usesPartialNetProfit ? (
            <Typography.Text type="secondary">
              {t('reports.profitability.partialNetProfit')}
            </Typography.Text>
          ) : null}
          {isSalesComparison ? (
            <Space size={4} className={styles.profitComparisonTabs}>
              <Button
                size="small"
                type={salesMetric === 'netProfit' ? 'primary' : 'text'}
                onClick={() => setSalesMetric('netProfit')}
              >
                {t('reports.metrics.netProfit')}
              </Button>
              <Button
                size="small"
                type={salesMetric === 'adSpend' ? 'primary' : 'text'}
                onClick={() => setSalesMetric('adSpend')}
              >
                {t('reports.columns.spend')}
              </Button>
              <Button
                size="small"
                type={salesMetric === 'revenue' ? 'primary' : 'text'}
                onClick={() => setSalesMetric('revenue')}
              >
                {t('reports.columns.revenue')}
              </Button>
            </Space>
          ) : null}
          <div
            className={
              shouldScrollRows ? styles.profitComparisonRowsScrollable : styles.profitComparisonRows
            }
          >
            {visibleRows.map((row) => {
              const isIncomplete = isIncompleteRow(row)
              const rank = isIncomplete ? undefined : rankBadges[completeRank++]
              const amount = profitAmount(row)
              const contributionPct =
                !isIncomplete && totalPositiveProfit > 0 && amount > 0
                  ? ((amount / totalPositiveProfit) * 100).toFixed(1)
                  : null

              return (
                <div key={row.sellerEmployeeCode || row.sellerName} className={styles.profitRow}>
                  <div className={styles.profitSellerMeta}>
                    <div className={styles.profitSellerNameLine}>
                      {rank ? (
                        <span
                          style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: 10,
                            fontWeight: 700,
                            padding: '1px 5px',
                            borderRadius: 4,
                            background: rank.bg,
                            color: rank.color,
                            flexShrink: 0,
                          }}
                        >
                          {rank.text}
                        </span>
                      ) : null}
                      <Typography.Text
                        className={styles.profitSellerName}
                        title={row.sellerName || row.sellerEmployeeCode || '—'}
                      >
                        {row.sellerName || row.sellerEmployeeCode || '—'}
                      </Typography.Text>
                    </div>
                    {usesPartialGrossProfit || usesPartialNetProfit ? (
                      <Typography.Text type="secondary" className={styles.profitCoverage}>
                        {t('reports.profitability.costCoverage', {
                          costed:
                            row.costedItemCount ??
                            Math.max(row.itemCount - row.missingCostCount, 0),
                          total: row.itemCount,
                        })}
                      </Typography.Text>
                    ) : null}
                  </div>
                  <Tooltip
                    title={
                      contributionPct != null
                        ? t('reports.profitability.contribution', {
                            percent: contributionPct,
                            metric: metricLabel,
                          })
                        : undefined
                    }
                  >
                    <div className={styles.profitTrack}>
                      <span
                        className={
                          isIncomplete
                            ? styles.profitBarIncomplete
                            : amount >= 0
                              ? styles.profitBar
                              : styles.profitBarNegative
                        }
                        style={{
                          width: `${isIncomplete ? 100 : (Math.abs(amount) / scale) * 100}%`,
                        }}
                      />
                    </div>
                  </Tooltip>
                  <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                    <Typography.Text strong>
                      {isIncomplete
                        ? t('reports.profitability.incomplete')
                        : formatReportMoney(amount, currency)}
                    </Typography.Text>
                    {contributionPct != null ? (
                      <div
                        style={{
                          fontSize: 11,
                          color: 'var(--ant-color-text-secondary)',
                          lineHeight: 1,
                          marginTop: 2,
                        }}
                      >
                        {contributionPct}%
                      </div>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </SectionCard>
    )
  },
)

ReportProfitComparisonChart.displayName = 'ReportProfitComparisonChart'
