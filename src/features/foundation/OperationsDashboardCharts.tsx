import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { Popover } from 'antd'

import styles from './FoundationPage.module.scss'
import { formatChartNumber } from './operationsDashboardFormatters'
import { type ChannelDatum, type ChartDatum, type TimelinePoint } from './useOperationsDashboard'

function ChartMetricDetails({ item, total }: { item: ChartDatum; total: number }) {
  const { t } = useTranslation()
  const percent = total ? Math.round((item.value / total) * 100) : 0

  return (
    <div className={styles.chartPopover}>
      <strong>{item.label}</strong>
      <div className={styles.chartPopoverRows}>
        <span>{t('foundation.portalDashboard.value')}</span>
        <b>{formatChartNumber(item.value)}</b>
        <span>{t('foundation.portalDashboard.share')}</span>
        <b>{t('foundation.portalDashboard.percentValue', { percent })}</b>
        <span>{t('foundation.portalDashboard.total')}</span>
        <b>{formatChartNumber(total)}</b>
      </div>
    </div>
  )
}

export function MiniBars({
  data,
  total,
  compact = false,
}: {
  data: ChartDatum[]
  total?: number
  compact?: boolean
}) {
  const { t } = useTranslation()
  const max = Math.max(...data.map((item) => item.value), 1)
  const chartTotal = total ?? data.reduce((sum, item) => sum + item.value, 0)
  const heightBase = total && total > 0 ? total : max
  const minHeight = compact ? 34 : 18
  const boost = compact && total ? 1.45 : 1

  return (
    <div className={styles.mockBars}>
      {data.map((item) => {
        const fillPercent = Math.min(100, (item.value / heightBase) * 100 * boost)
        const fillHeight = `${Math.max(minHeight, fillPercent)}%`

        return (
          <Popover
            key={item.label}
            content={<ChartMetricDetails item={item} total={chartTotal} />}
            trigger={['hover', 'focus']}
            mouseEnterDelay={0}
            mouseLeaveDelay={0}
          >
            <button
              type="button"
              aria-label={t('foundation.portalDashboard.metricAriaLabel', {
                label: item.label,
                value: formatChartNumber(item.value),
              })}
              className={styles.mockBarButton}
              style={{ height: fillHeight }}
            >
              <span aria-hidden="true" className={styles.mockBarFill} />
            </button>
          </Popover>
        )
      })}
    </div>
  )
}

export const SummaryLineChart = memo(function SummaryLineChart({
  points,
  summaryBars,
  summaryTotal,
}: {
  points: TimelinePoint[]
  summaryBars?: ChartDatum[]
  summaryTotal?: number
}) {
  const { t } = useTranslation()

  return (
    <div className={styles.summaryChartWrap}>
      <div className={styles.summaryRechartsWrap}>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={points} margin={{ top: 12, right: 12, left: -20, bottom: 0 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--ant-color-border-secondary, #e2e8f0)"
            />
            <XAxis
              dataKey="displayDate"
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 12 }}
            />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 11 }}
              tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
            />
            <RechartsTooltip
              contentStyle={{
                background: 'var(--ant-color-bg-elevated, #fff)',
                border: '1px solid var(--ant-color-border-secondary, #e2e8f0)',
                borderRadius: 8,
                boxShadow: '0 8px 20px rgb(15 23 42 / 10%)',
                fontSize: 12,
              }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              iconType="circle"
              formatter={(val: string) => (
                <span
                  style={{ color: 'var(--ant-color-text, #0f172a)', fontSize: 12, fontWeight: 500 }}
                >
                  {val === 'incomeGrowth'
                    ? t('foundation.portalDashboard.incomeGrowth', {
                        defaultValue: 'Income Growth',
                      })
                    : t('foundation.portalDashboard.orders', { defaultValue: 'Order' })}
                </span>
              )}
            />
            <Line
              type="monotone"
              dataKey="orderCount"
              name="orderCount"
              stroke="#7c3aed"
              strokeDasharray="4 4"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#7c3aed' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="incomeGrowth"
              name="incomeGrowth"
              stroke="#ff7a1a"
              strokeWidth={2.5}
              dot={{ r: 3, fill: '#ff7a1a' }}
              activeDot={{ r: 6 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Accessible bars preserved for screen-reader/test compliance */}
      {summaryBars && summaryBars.length > 0 && (
        <div className={styles.hiddenAccessibleBars}>
          <MiniBars data={summaryBars} total={summaryTotal} />
        </div>
      )}
    </div>
  )
})

export const TrafficSourcesDonut = memo(function TrafficSourcesDonut({
  data,
  totalLabel,
  subLabel,
}: {
  data: ChannelDatum[]
  totalLabel: string
  subLabel: string
}) {
  const chartData = useMemo(() => {
    return data.map((d) => ({ name: d.name, value: d.value, color: d.color }))
  }, [data])

  return (
    <div className={styles.donutContainer}>
      <div className={styles.donutGraphicWrap}>
        <ResponsiveContainer width={170} height={170}>
          <PieChart>
            <Pie
              data={chartData}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={78}
              paddingAngle={3}
              dataKey="value"
              stroke="transparent"
            >
              {chartData.map((entry) => (
                <Cell key={`cell-${entry.name}`} fill={entry.color} />
              ))}
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.donutCenterText}>
          <strong>{totalLabel}</strong>
          <small>{subLabel}</small>
        </div>
      </div>

      <div className={styles.donutLegendGrid}>
        {data.map((item) => (
          <div className={styles.donutLegendItem} key={item.name}>
            <span className={styles.donutLegendDot} style={{ background: item.color }} />
            <span className={styles.donutLegendValue}>{item.value}</span>
            <span className={styles.donutLegendName}>{item.name}</span>
          </div>
        ))}
      </div>
    </div>
  )
})

// Semi-circle gauge for Monthly Target
export const MonthlyTargetGauge = memo(function MonthlyTargetGauge({
  percent,
  targetAmount,
  revenueAmount,
  todayAmount,
  trendBadge,
  trendText,
  targetLabel,
  revenueLabel,
  todayLabel,
}: {
  percent: number
  targetAmount: string
  revenueAmount: string
  todayAmount?: string
  trendBadge?: string
  trendText?: React.ReactNode
  targetLabel: string
  revenueLabel: string
  todayLabel?: string
}) {
  const numPercent = Number(percent)
  const safePercent = Math.min(100, Math.max(0, Number.isFinite(numPercent) ? numPercent : 0))
  // Semi-circle radius = 80, circumference of half-circle = PI * 80 ~= 251.3
  const halfCircumference = Math.PI * 80
  const strokeDashoffset = halfCircumference * (1 - safePercent / 100)

  return (
    <div className={styles.targetGaugeWrap}>
      <div className={styles.semiCircleSvgWrap}>
        <svg viewBox="0 0 200 115" className={styles.gaugeSvg}>
          {/* Background track arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="var(--ant-color-fill-tertiary, #e2e8f0)"
            strokeWidth="14"
            strokeLinecap="round"
          />
          {/* Active colored arc */}
          <path
            d="M 20 100 A 80 80 0 0 1 180 100"
            fill="none"
            stroke="url(#targetGradient)"
            strokeWidth="14"
            strokeLinecap="round"
            strokeDasharray={halfCircumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 1s ease' }}
          />
          <defs>
            <linearGradient id="targetGradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ff7a1a" />
              <stop offset="100%" stopColor="#e83b4a" />
            </linearGradient>
          </defs>
        </svg>
        <div className={styles.gaugeCenterLabel}>
          <strong>{safePercent}%</strong>
          {trendBadge ? <span className={styles.gaugeTrendBadge}>{trendBadge}</span> : null}
        </div>
      </div>

      {trendText ? <div className={styles.targetTrendText}>{trendText}</div> : null}

      <div className={styles.targetSubStatsRow}>
        <div className={styles.targetSubStatItem}>
          <strong>{targetAmount}</strong>
          <span>{targetLabel}</span>
        </div>
        <div className={`${styles.targetSubStatItem} ${styles.targetSubStatItemDivider}`}>
          <strong>{revenueAmount}</strong>
          <span>{revenueLabel}</span>
        </div>
        {todayAmount ? (
          <div className={styles.targetSubStatItem}>
            <strong>{todayAmount}</strong>
            <span>{todayLabel}</span>
          </div>
        ) : null}
      </div>
    </div>
  )
})

// Keep backwards-compatible DonutChart SVG export for existing unit tests
export function DonutChart({ data }: { data: ChartDatum[] }) {
  const channelData: ChannelDatum[] = useMemo(() => {
    const palette = ['#ff7a1a', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6']
    return data.map((d, i) => ({
      name: d.label,
      value: d.value,
      color: palette[i % palette.length],
      percent: 0,
    }))
  }, [data])

  const total = data.reduce((sum, item) => sum + item.value, 0)

  return <TrafficSourcesDonut data={channelData} totalLabel={String(total)} subLabel="Orders" />
}
