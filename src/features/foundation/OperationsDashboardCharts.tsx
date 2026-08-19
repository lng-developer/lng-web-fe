import { useTranslation } from 'react-i18next'
import { Popover } from 'antd'

import styles from './FoundationPage.module.scss'
import { formatChartNumber } from './operationsDashboardFormatters'
import { type ChartDatum } from './useOperationsDashboard'

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

function polarToCartesian(centerX: number, centerY: number, radius: number, angle: number) {
  const radians = ((angle - 90) * Math.PI) / 180

  return {
    x: centerX + radius * Math.cos(radians),
    y: centerY + radius * Math.sin(radians),
  }
}

function describeDonutSegment(startAngle: number, endAngle: number) {
  const visibleEndAngle = endAngle - startAngle >= 360 ? startAngle + 359.99 : endAngle
  const start = polarToCartesian(60, 60, 44, visibleEndAngle)
  const end = polarToCartesian(60, 60, 44, startAngle)
  const largeArcFlag = visibleEndAngle - startAngle > 180 ? 1 : 0

  return [
    `M ${start.x.toFixed(3)} ${start.y.toFixed(3)}`,
    `A 44 44 0 ${largeArcFlag} 0 ${end.x.toFixed(3)} ${end.y.toFixed(3)}`,
  ].join(' ')
}

export function DonutChart({ data }: { data: ChartDatum[] }) {
  const { t } = useTranslation()
  const safeData = data.filter((item) => item.value > 0)
  const segmentTotal = safeData.reduce((sum, item) => sum + item.value, 0)
  const displayTotal = segmentTotal
  if (!displayTotal)
    return <div className={styles.mockEmpty}>{t('foundation.portalDashboard.noData')}</div>

  const colors = ['#ff7a1a', '#2563eb', '#10b981', '#14b8a6', '#ef4444']
  const segments = safeData.reduce<{
    cursor: number
    segments: Array<ChartDatum & { color: string; path: string }>
  }>(
    (state, item, index) => {
      const end = state.cursor + (item.value / segmentTotal) * 360
      state.segments.push({
        ...item,
        color: colors[(index + 1) % colors.length],
        path: describeDonutSegment(state.cursor, end),
      })
      return { cursor: end, segments: state.segments }
    },
    { cursor: 0, segments: [] },
  ).segments

  return (
    <div className={styles.mockDonutWrap}>
      <div className={styles.mockDonut}>
        <svg className={styles.mockDonutSvg} viewBox="0 0 120 120">
          {segments.map((item) => (
            <Popover
              key={item.label}
              content={<ChartMetricDetails item={item} total={displayTotal} />}
              trigger={['hover', 'focus']}
              mouseEnterDelay={0}
              mouseLeaveDelay={0}
            >
              <path
                role="button"
                tabIndex={0}
                aria-label={t('foundation.portalDashboard.metricAriaLabel', {
                  label: item.label,
                  value: formatChartNumber(item.value),
                })}
                className={styles.mockDonutSegment}
                d={item.path}
                fill="none"
                stroke={item.color}
                strokeWidth="28"
              />
            </Popover>
          ))}
        </svg>
        <div className={styles.mockDonutCenter}>
          <strong>{displayTotal}</strong>
          <span>{t('foundation.portalDashboard.orders')}</span>
        </div>
      </div>
      <ul className={styles.mockLegend}>
        <li>
          <Popover
            content={
              <ChartMetricDetails
                item={{ label: t('orders.tabs.ALL'), value: displayTotal }}
                total={displayTotal}
              />
            }
            trigger={['hover', 'focus']}
            mouseEnterDelay={0}
            mouseLeaveDelay={0}
          >
            <button
              type="button"
              aria-label={t('foundation.portalDashboard.metricAriaLabel', {
                label: t('orders.tabs.ALL'),
                value: formatChartNumber(displayTotal),
              })}
              className={styles.mockLegendButton}
            >
              <span className={styles.mockLegendDot} style={{ background: colors[0] }} />
              <span>{t('orders.tabs.ALL')}</span>
              <strong>{displayTotal}</strong>
            </button>
          </Popover>
        </li>
        {safeData.slice(0, 5).map((item, index) => (
          <li key={item.label}>
            <Popover
              content={<ChartMetricDetails item={item} total={displayTotal} />}
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
                className={styles.mockLegendButton}
              >
                <span
                  className={styles.mockLegendDot}
                  style={{ background: colors[(index + 1) % colors.length] }}
                />
                <span>{item.label}</span>
                <strong>{item.value}</strong>
              </button>
            </Popover>
          </li>
        ))}
      </ul>
    </div>
  )
}
