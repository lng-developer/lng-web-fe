import { useMemo } from 'react'

import { groupAdsDailyRows } from '@/features/reports/utils/adsReport'

const TOP = 16
const HEIGHT = 150

export default function AdsDailyChart({ currency, labels, language, rows }) {
  const data = useMemo(() => groupAdsDailyRows(rows), [rows])
  const width = Math.max(640, data.length * 52 + 48)
  const highest = Math.max(
    ...data.flatMap((row) => [
      Number(row.spendAmount || 0),
      Number(row.attributedSalesAmount || 0),
    ]),
    1,
  )
  const x = (index) => 36 + index * ((width - 48) / Math.max(data.length - 1, 1))
  const y = (value) => TOP + (1 - Number(value || 0) / highest) * HEIGHT
  const metrics = [
    { key: 'spendAmount', label: labels.spend, color: '#2563eb' },
    { key: 'attributedSalesAmount', label: labels.sales, color: '#16a34a' },
  ]
  const money = (value) =>
    new Intl.NumberFormat(language, {
      style: 'currency',
      currency,
      notation: 'compact',
      maximumFractionDigits: 1,
    }).format(Number(value || 0) / 100)

  return (
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-strong">{labels.title}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
        <div className="flex gap-3 text-xs text-ink-secondary">
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
          role="img"
          viewBox={`0 0 ${width} 205`}
          width="100%"
        >
          {metrics.map((metric) => (
            <polyline
              key={metric.key}
              fill="none"
              points={data.map((row, index) => `${x(index)},${y(row[metric.key])}`).join(' ')}
              stroke={metric.color}
              strokeWidth="2"
            />
          ))}
          {data.map((row, index) => (
            <g key={`${row.reportDate}-${row.currency}-${index}`}>
              {metrics.map((metric) => (
                <circle
                  key={metric.key}
                  cx={x(index)}
                  cy={y(row[metric.key])}
                  fill={metric.color}
                  r="3"
                >
                  <title>{`${metric.label}: ${money(row[metric.key])}`}</title>
                </circle>
              ))}
              <text className="fill-ink-muted text-[10px]" textAnchor="middle" x={x(index)} y="192">
                {String(row.reportDate || '').slice(5, 10)}
              </text>
            </g>
          ))}
        </svg>
      </div>
    </section>
  )
}
