/* eslint-disable react-refresh/only-export-components */
import { memo, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  CartesianGrid,
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
import { formatChartNumber, formatCompactNumber } from './operationsDashboardFormatters'
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

export function selectCompactTimelinePoints<T>(points: T[], maxPoints = 5): T[] {
  if (points.length <= maxPoints) return points

  const interval = (points.length - 1) / (maxPoints - 1)
  return Array.from({ length: maxPoints }, (_, index) => points[Math.round(index * interval)])
}

export function MiniBars({
  data,
  total,
  compact = false,
  showPopover = true,
}: {
  data: ChartDatum[]
  total?: number
  compact?: boolean
  showPopover?: boolean
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

        const bar = (
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
        )

        return showPopover ? (
          <Popover
            key={item.label}
            content={<ChartMetricDetails item={item} total={chartTotal} />}
            trigger={['hover', 'focus']}
            mouseEnterDelay={0}
            mouseLeaveDelay={0}
          >
            {bar}
          </Popover>
        ) : (
          <span key={item.label}>{bar}</span>
        )
      })}
    </div>
  )
}

export const SummaryLineChart = memo(function SummaryLineChart({
  points,
  summaryBars,
  summaryTotal,
  compact = false,
  onExpandedChange,
  expandOnHover = true,
}: {
  points: TimelinePoint[]
  summaryBars?: ChartDatum[]
  summaryTotal?: number
  compact?: boolean
  onExpandedChange?: (expanded: boolean) => void
  expandOnHover?: boolean
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(false)
  const isCompact = compact && (!expandOnHover || !expanded)
  const chartPoints = useMemo(
    () => (isCompact ? selectCompactTimelinePoints(points) : points),
    [isCompact, points],
  )

  const setDetailExpanded = (next: boolean) => {
    if (!compact) return
    if (expandOnHover) setExpanded(next)
    onExpandedChange?.(next)
  }

  return (
    <div
      role={compact ? 'group' : undefined}
      aria-label={compact ? t('foundation.portalDashboard.summary') : undefined}
      aria-expanded={compact ? expanded : undefined}
      className={`${styles.summaryChartWrap} ${expanded ? styles.summaryChartExpanded : ''}`}
      onMouseEnter={() => setDetailExpanded(true)}
      onMouseLeave={() => setDetailExpanded(false)}
      onFocus={() => setDetailExpanded(true)}
      onBlur={() => setDetailExpanded(false)}
    >
      <div className={styles.summaryRechartsWrap}>
        <ResponsiveContainer width="100%" height={isCompact ? 72 : 350}>
          <LineChart
            data={chartPoints}
            margin={
              isCompact
                ? { top: 6, right: 4, left: 0, bottom: 2 }
                : { top: 12, right: 12, left: -20, bottom: 0 }
            }
          >
            <CartesianGrid
              strokeDasharray="3 3"
              vertical={false}
              stroke="var(--ant-color-border-secondary, #e2e8f0)"
            />
            {isCompact ? (
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                interval={0}
                height={14}
                padding={{ left: 6, right: 18 }}
                tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 9 }}
              />
            ) : (
              <XAxis
                dataKey="displayDate"
                tickLine={false}
                axisLine={false}
                interval="preserveStartEnd"
                minTickGap={14}
                padding={{ left: 6, right: 20 }}
                tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 12 }}
              />
            )}
            {isCompact ? (
              <YAxis
                tickLine={false}
                axisLine={false}
                width={28}
                tickCount={3}
                tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 9 }}
                tickFormatter={(v: number) => formatCompactNumber(v)}
              />
            ) : (
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: 'var(--ant-color-text-tertiary, #94a3b8)', fontSize: 11 }}
                tickFormatter={(v: number) => (v >= 1000 ? `${Math.round(v / 1000)}K` : String(v))}
              />
            )}
            <RechartsTooltip
              formatter={(value, name) => [
                `$${formatCompactNumber(Number(value ?? 0))}`,
                name === 'incomeGrowth'
                  ? t('foundation.portalDashboard.netCashFlow', { defaultValue: 'Net cash flow' })
                  : t('foundation.portalDashboard.cashIn', { defaultValue: 'Cash in' }),
              ]}
              contentStyle={{
                background: 'var(--ant-color-bg-elevated, #fff)',
                border: '1px solid var(--ant-color-border-secondary, #e2e8f0)',
                borderRadius: 8,
                boxShadow: '0 8px 20px rgb(15 23 42 / 10%)',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="revenue"
              name="revenue"
              stroke="#7c3aed"
              strokeDasharray="4 4"
              strokeWidth={2.5}
              dot={{ r: isCompact ? 2.5 : 3, fill: '#7c3aed' }}
              activeDot={{ r: 6 }}
            />
            <Line
              type="monotone"
              dataKey="incomeGrowth"
              name="incomeGrowth"
              stroke="#ff7a1a"
              strokeWidth={2.5}
              dot={{ r: isCompact ? 2.5 : 3, fill: '#ff7a1a' }}
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
