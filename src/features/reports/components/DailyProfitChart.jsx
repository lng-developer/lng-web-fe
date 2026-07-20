import { useMemo } from 'react'

const CHART_TOP = 22
const CHART_HEIGHT = 170

function byDate(rows) {
  return Object.values(
    rows.reduce((result, row) => {
      const current = result[row.date] || {
        date: row.date,
        revenueAmount: 0,
        grossProfitAmount: 0,
        netProfitAmount: 0,
      }
      current.revenueAmount += Number(row.revenueAmount || 0)
      current.grossProfitAmount += Number(row.grossProfitAmount || 0)
      current.netProfitAmount += Number(row.netProfitAmount || 0)
      current.netMarginBps =
        current.revenueAmount > 0
          ? Math.round((current.netProfitAmount / current.revenueAmount) * 10000)
          : null
      result[row.date] = current
      return result
    }, {}),
  ).sort((left, right) => left.date.localeCompare(right.date))
}

function formatMoney(amount, currency, language) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount || 0) / 100)
}

function shortDate(date) {
  return date ? date.slice(5) : '-'
}

export default function DailyProfitChart({ currency, labels, language, rows }) {
  const data = useMemo(() => byDate(rows), [rows])
  const values = data.flatMap((row) => [
    Number(row.revenueAmount || 0),
    Number(row.grossProfitAmount || 0),
    Number(row.netProfitAmount || 0),
  ])
  const positiveMax = Math.max(...values.filter((value) => value > 0), 1)
  const negativeMax = Math.max(...values.map((value) => Math.abs(Math.min(value, 0))), 0)
  const scale = positiveMax + negativeMax
  const zeroY = CHART_TOP + (CHART_HEIGHT * positiveMax) / scale
  const chartWidth = Math.max(720, data.length * 74 + 48)
  const plotWidth = chartWidth - 48
  const groupWidth = plotWidth / Math.max(data.length, 1)
  const barWidth = Math.max(7, Math.min(15, (groupWidth - 16) / 3))
  const metrics = [
    { key: 'revenueAmount', className: 'fill-primary', label: labels.revenue },
    { key: 'grossProfitAmount', className: 'fill-success', label: labels.grossProfit },
    { key: 'netProfitAmount', className: 'fill-danger', label: labels.netProfit },
  ]
  const margins = data.map((row) => Number(row.netMarginBps || 0))
  const marginPositiveMax = Math.max(...margins.filter((value) => value > 0), 1)
  const marginNegativeMax = Math.max(...margins.map((value) => Math.abs(Math.min(value, 0))), 0)
  const marginScale = marginPositiveMax + marginNegativeMax
  const marginPoints = data
    .map((row, index) => {
      const x = 36 + index * groupWidth + groupWidth / 2
      const value = Number(row.netMarginBps || 0)
      const y = CHART_TOP + ((marginPositiveMax - value) / marginScale) * CHART_HEIGHT
      return `${x},${y}`
    })
    .join(' ')

  function bar(value) {
    const amount = Number(value || 0)
    const height = (Math.abs(amount) / scale) * CHART_HEIGHT
    return amount >= 0 ? { height, y: zeroY - height } : { height, y: zeroY }
  }

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-strong">{labels.title}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ink-secondary">
          {metrics.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-1.5">
              <span className={`h-2.5 w-2.5 ${metric.className}`} />
              {metric.label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5">
            <span className="h-0.5 w-3 bg-[#0f766e]" />
            {labels.netMargin}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg
          aria-label={`${labels.title} ${currency}`}
          className="block min-w-[720px]"
          role="img"
          viewBox={`0 0 ${chartWidth} 236`}
          width="100%"
        >
          <line
            x1="36"
            x2={chartWidth - 12}
            y1={zeroY}
            y2={zeroY}
            className="stroke-border"
            strokeWidth="1"
          />
          {marginPoints ? (
            <polyline fill="none" points={marginPoints} stroke="#0f766e" strokeWidth="2" />
          ) : null}
          {data.map((row, index) => {
            const x = 36 + index * groupWidth + (groupWidth - barWidth * 3) / 2
            return (
              <g key={row.date}>
                {metrics.map((metric, metricIndex) => {
                  const value = row[metric.key]
                  const geometry = bar(value)
                  return (
                    <rect
                      key={metric.key}
                      className={metric.className}
                      height={geometry.height}
                      rx="2"
                      width={barWidth}
                      x={x + metricIndex * barWidth}
                      y={geometry.y}
                    >
                      <title>{`${metric.label}: ${formatMoney(value, currency, language)}`}</title>
                    </rect>
                  )
                })}
                <text
                  className="fill-ink-muted text-[10px]"
                  textAnchor="middle"
                  x={x + barWidth * 1.5}
                  y="216"
                >
                  {shortDate(row.date)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
