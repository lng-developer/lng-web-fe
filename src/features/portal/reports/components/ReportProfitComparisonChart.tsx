import React from 'react'
import { useTranslation } from 'react-i18next'
import { Tooltip, Typography } from 'antd'

import { SectionCard } from '@/shared/ui'

import type { SellerPerformance } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney } from './reportFormatters'

interface ReportProfitComparisonChartProps {
  rows: SellerPerformance[]
  currency: string
}

const rankBadges: Record<number, { text: string; bg: string; color: string }> = {
  0: { text: '#1', bg: 'rgba(212, 136, 6, 0.15)', color: '#d48806' },
  1: { text: '#2', bg: 'rgba(140, 140, 140, 0.15)', color: '#8c8c8c' },
  2: { text: '#3', bg: 'rgba(184, 115, 51, 0.15)', color: '#b87333' },
}

export const ReportProfitComparisonChart: React.FC<ReportProfitComparisonChartProps> = React.memo(
  ({ rows, currency }) => {
    const { t } = useTranslation()
    const usesPartialGrossProfit = rows.some((row) => row.missingCostCount > 0)
    const profitAmount = (row: SellerPerformance) =>
      usesPartialGrossProfit ? (row.partialGrossProfitAmount ?? 0) : (row.netProfitAmount ?? 0)
    const sortedRows = [...rows]
      .sort((left, right) => profitAmount(right) - profitAmount(left))
      .slice(0, 8)
    const scale = Math.max(...rows.map((row) => Math.abs(profitAmount(row))), 1)
    const totalPositiveProfit = rows.reduce((sum, row) => sum + Math.max(profitAmount(row), 0), 0)

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
          ) : null}
          {sortedRows.map((row, index) => {
            const rank = rankBadges[index]
            const amount = profitAmount(row)
            const contributionPct =
              totalPositiveProfit > 0 && amount > 0
                ? ((amount / totalPositiveProfit) * 100).toFixed(1)
                : null

            return (
              <div key={row.sellerEmployeeCode || row.sellerName} className={styles.profitRow}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
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
                  <Typography.Text ellipsis style={{ flex: 1, minWidth: 0 }}>
                    {row.sellerName || row.sellerEmployeeCode || '—'}
                  </Typography.Text>
                  {usesPartialGrossProfit ? (
                    <Typography.Text type="secondary">
                      {t('reports.profitability.costCoverage', {
                        costed:
                          row.costedItemCount ?? Math.max(row.itemCount - row.missingCostCount, 0),
                        total: row.itemCount,
                      })}
                    </Typography.Text>
                  ) : null}
                </div>
                <Tooltip
                  title={
                    contributionPct != null ? `${contributionPct}% of total profit` : undefined
                  }
                >
                  <div className={styles.profitTrack}>
                    <span
                      className={amount >= 0 ? styles.profitBar : styles.profitBarNegative}
                      style={{ width: `${(Math.abs(amount) / scale) * 100}%` }}
                    />
                  </div>
                </Tooltip>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography.Text strong>{formatReportMoney(amount, currency)}</Typography.Text>
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
      </SectionCard>
    )
  },
)

ReportProfitComparisonChart.displayName = 'ReportProfitComparisonChart'
