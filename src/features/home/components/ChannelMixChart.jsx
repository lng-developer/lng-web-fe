const COLORS = ['#2563eb', '#16a34a', '#ea580c', '#7c3aed']

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

export default function ChannelMixChart({ labels, rows }) {
  const grouped = Object.values(
    rows.reduce((result, row) => {
      const key = row.salesChannelCode || 'UNKNOWN'
      result[key] = result[key] || { channel: key, amount: 0 }
      result[key].amount += Number(row.attributedSalesAmount || 0)
      return result
    }, {}),
  ).sort((left, right) => right.amount - left.amount)
  const total = grouped.reduce((sum, row) => sum + row.amount, 0)
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
              const angle = (row.amount / total) * 360
              const path = describeArc(80, 80, 64, startAngle, startAngle + angle)
              startAngle += angle
              return (
                <path d={path} fill={COLORS[index % COLORS.length]} key={row.channel}>
                  <title>{`${row.channel}: ${Math.round((row.amount / total) * 100)}%`}</title>
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
            {labels.sales}
          </text>
          <text className="fill-ink-muted text-[10px]" textAnchor="middle" x="80" y="94">
            {total ? labels.mix : labels.empty}
          </text>
        </svg>
        <div className="space-y-2 text-sm">
          {grouped.length ? (
            grouped.map((row, index) => (
              <div className="flex items-center justify-between gap-3" key={row.channel}>
                <span className="inline-flex items-center gap-2 text-ink-secondary">
                  <span
                    className="h-2.5 w-2.5"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  />
                  {row.channel}
                </span>
                <span className="font-medium text-ink-strong">
                  {Math.round((row.amount / total) * 100)}%
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
