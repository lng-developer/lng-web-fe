import { formatCurrency } from '@/utils/format'

import { buildChannelMixRows, getSalesChannelLabel } from '../utils/commercialDashboard'

const COLOR_CLASSES = [
  'fill-primary bg-primary',
  'fill-success bg-success',
  'fill-warning bg-warning',
  'fill-secondary bg-secondary',
]

function describeArc(cx, cy, radius, startAngle, endAngle) {
  const start = {
    x: cx + radius * Math.cos((Math.PI / 180) * startAngle),
    y: cy + radius * Math.sin((Math.PI / 180) * startAngle),
  }
  const end = {
    x: cx + radius * Math.cos((Math.PI / 180) * endAngle),
    y: cy + radius * Math.sin((Math.PI / 180) * endAngle),
  }
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1
  return `M ${cx} ${cy} L ${start.x} ${start.y} A ${radius} ${radius} 0 ${largeArc} 1 ${end.x} ${end.y} Z`
}

export default function ChannelMixChart({ labels, language, metric, rows }) {
  const grouped = buildChannelMixRows(rows, metric)
  const total = grouped.reduce((sum, row) => sum + row.magnitude, 0)
  const currency = rows[0]?.currency || 'USD'
  let startAngle = -90

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
        {labels.title}
      </div>
      <div className="grid gap-3 px-4 py-4 sm:grid-cols-[160px_1fr] sm:items-center">
        <svg
          aria-label={labels.title}
          className="mx-auto h-40 w-40"
          role="img"
          viewBox="0 0 160 160"
        >
          {grouped.length ? (
            grouped.map((row, index) => {
              const angle = (row.magnitude / total) * 360
              const path = describeArc(80, 80, 64, startAngle, startAngle + angle)
              const channelLabel = getSalesChannelLabel(row.salesChannelCode, labels.unknownChannel)
              startAngle += angle
              return (
                <path
                  className={COLOR_CLASSES[index % COLOR_CLASSES.length]}
                  d={path}
                  key={row.salesChannelCode}
                >
                  <title>{`${channelLabel}: ${formatCurrency(row.amount / 100, language, currency)} (${Math.round((row.magnitude / total) * 100)}%${row.isLoss ? `, ${labels.loss}` : ''})`}</title>
                </path>
              )
            })
          ) : (
            <circle cx="80" cy="80" fill="currentColor" opacity="0.08" r="64" />
          )}
          <circle cx="80" cy="80" className="fill-surface" r="38" />
          <text
            className="fill-ink-strong text-[13px] font-semibold"
            textAnchor="middle"
            x="80"
            y="78"
          >
            {labels.metric}
          </text>
          <text className="fill-ink-muted text-[10px]" textAnchor="middle" x="80" y="94">
            {total ? labels.mix : labels.empty}
          </text>
        </svg>
        <div className="space-y-2 text-sm">
          {grouped.length ? (
            grouped.map((row, index) => (
              <div className="flex items-center justify-between gap-3" key={row.salesChannelCode}>
                <span className="inline-flex items-center gap-2 text-ink-secondary">
                  <span className={`h-2.5 w-2.5 ${COLOR_CLASSES[index % COLOR_CLASSES.length]}`} />
                  {getSalesChannelLabel(row.salesChannelCode, labels.unknownChannel)}
                </span>
                <span
                  className={`text-right font-medium ${row.isLoss ? 'text-danger' : 'text-ink-strong'}`}
                >
                  {formatCurrency(row.amount / 100, language, currency)}
                  <span className="ml-2 text-xs text-ink-muted">
                    {Math.round((row.magnitude / total) * 100)}%
                  </span>
                  {row.isLoss ? <span className="ml-2 text-xs">{labels.loss}</span> : null}
                </span>
              </div>
            ))
          ) : (
            <div className="text-sm text-ink-muted">{labels.empty}</div>
          )}
        </div>
      </div>
    </section>
  )
}
