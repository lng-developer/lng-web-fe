import { useMemo } from 'react'

const CHART_TOP = 18
const CHART_HEIGHT = 168

function weekStart(value) {
  const date = new Date(`${value}T00:00:00Z`)
  date.setUTCDate(date.getUTCDate() - ((date.getUTCDay() + 6) % 7))
  return date.toISOString().slice(0, 10)
}

function byWeek(rows) {
  return Object.values(
    rows.reduce((result, row) => {
      const date = weekStart(row.date)
      const current = result[date] || {
        date,
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
      result[date] = current
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
  const data = useMemo(() => byWeek(rows), [rows])
  const values = data.flatMap((row) => [
    Number(row.revenueAmount || 0),
    Number(row.grossProfitAmount || 0),
    Number(row.netProfitAmount || 0),
  ])
  const highest = Math.max(...values, 1)
  const lowest = Math.min(...values, 0)
  const scale = highest - lowest || 1
  const chartWidth = Math.max(640, data.length * 56 + 48)
  const plotWidth = chartWidth - 48
  const groupWidth = plotWidth / Math.max(data.length, 1)
  const metrics = [
    { key: 'revenueAmount', color: '#2563eb', label: labels.revenue },
    { key: 'grossProfitAmount', color: '#16a34a', label: labels.grossProfit },
    { key: 'netProfitAmount', color: '#dc2626', label: labels.netProfit },
  ]
  const xFor = (index) => 36 + index * groupWidth + groupWidth / 2
  const yFor = (value) => CHART_TOP + ((highest - Number(value || 0)) / scale) * CHART_HEIGHT

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-strong">{labels.title}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ink-secondary">
          {metrics.map((metric) => (
            <span key={metric.key} className="inline-flex items-center gap-1.5">
              <span className="h-2.5 w-2.5" style={{ backgroundColor: metric.color }} />
              {metric.label}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg
          aria-label={`${labels.title} ${currency}`}
          className="block min-w-[640px]"
          role="img"
          viewBox={`0 0 ${chartWidth} 226`}
          width="100%"
        >
          <line
            x1="36"
            x2={chartWidth - 12}
            y1={yFor(0)}
            y2={yFor(0)}
            className="stroke-border"
            strokeWidth="1"
          />
          {metrics.map((metric) => (
            <g key={metric.key}>
              <polyline
                fill="none"
                points={data
                  .map((row, index) => `${xFor(index)},${yFor(row[metric.key])}`)
                  .join(' ')}
                stroke={metric.color}
                strokeWidth="2"
              />
              {data.map((row, index) => (
                <circle
                  cx={xFor(index)}
                  cy={yFor(row[metric.key])}
                  fill={metric.color}
                  key={row.date}
                  r="3"
                >
                  <title>{`${metric.label}: ${formatMoney(row[metric.key], currency, language)}`}</title>
                </circle>
              ))}
            </g>
          ))}
          {data.map((row, index) => (
            <g key={row.date}>
              <text
                className="fill-ink-muted text-[10px]"
                textAnchor="middle"
                x={xFor(index)}
                y="210"
              >
                {shortDate(row.date)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
