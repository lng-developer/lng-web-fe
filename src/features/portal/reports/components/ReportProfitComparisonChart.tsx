import React, { useMemo } from 'react'
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

    const sortedRows = useMemo(
      () =>
        [...rows].sort((left, right) => right.netProfitAmount - left.netProfitAmount).slice(0, 8),
      [rows],
    )

    const scale = useMemo(
      () => Math.max(...rows.map((row) => Math.abs(row.netProfitAmount)), 1),
      [rows],
    )

    const totalPositiveProfit = useMemo(
      () => rows.reduce((sum, r) => sum + Math.max(r.netProfitAmount, 0), 0),
      [rows],
    )

    return (
      <SectionCard title={t('reports.profitability.comparison')}>
        <div
          className={styles.profitComparison}
          role="img"
          aria-label={t('reports.profitability.comparison')}
        >
          {sortedRows.map((row, index) => {
            const rank = rankBadges[index]
            const contributionPct =
              totalPositiveProfit > 0 && row.netProfitAmount > 0
                ? ((row.netProfitAmount / totalPositiveProfit) * 100).toFixed(1)
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
                </div>
                <Tooltip
                  title={
                    contributionPct != null ? `${contributionPct}% of total profit` : undefined
                  }
                >
                  <div className={styles.profitTrack}>
                    <span
                      className={
                        row.netProfitAmount >= 0 ? styles.profitBar : styles.profitBarNegative
                      }
                      style={{ width: `${(Math.abs(row.netProfitAmount) / scale) * 100}%` }}
                    />
                  </div>
                </Tooltip>
                <div style={{ textAlign: 'right', whiteSpace: 'nowrap' }}>
                  <Typography.Text strong>
                    {formatReportMoney(row.netProfitAmount, currency)}
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
      </SectionCard>
    )
  },
)

ReportProfitComparisonChart.displayName = 'ReportProfitComparisonChart'
