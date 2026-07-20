function sum(rows, key) {
  return rows.reduce((total, row) => total + Number(row[key] || 0), 0)
}

function compact(value, language) {
  return new Intl.NumberFormat(language, { notation: 'compact', maximumFractionDigits: 1 }).format(
    value,
  )
}

export default function AcquisitionFunnelChart({ labels, language, rows }) {
  const stages = [
    { label: labels.impressions, value: sum(rows, 'impressions'), tone: 'bg-primary' },
    { label: labels.clicks, value: sum(rows, 'clicks'), tone: 'bg-warning' },
    { label: labels.orders, value: sum(rows, 'attributedOrdersCount'), tone: 'bg-success' },
    { label: labels.newBuyers, value: sum(rows, 'newBuyerCount'), tone: 'bg-danger' },
  ]
  const maximum = Math.max(...stages.map((stage) => stage.value), 1)

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
        {labels.title}
      </div>
      <div className="space-y-4 px-4 py-4">
        {stages.map((stage) => (
          <div key={stage.label}>
            <div className="mb-1 flex items-center justify-between gap-3 text-xs text-ink-secondary">
              <span>{stage.label}</span>
              <strong className="text-ink-strong">{compact(stage.value, language)}</strong>
            </div>
            <div className="h-3 bg-surface-subtle">
              <div
                className={stage.tone}
                style={{
                  height: '100%',
                  width: `${Math.max((stage.value / maximum) * 100, stage.value ? 2 : 0)}%`,
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}
