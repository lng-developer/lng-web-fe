export default function FinancialMetricCards({ currency, metrics }) {
  return (
    <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
      {metrics.map(([label, value]) => (
        <div key={label} className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm">
          <div className="text-xs font-medium uppercase text-ink-muted">{label}</div>
          <div className="mt-1 text-xl font-semibold text-ink-strong">{value}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
      ))}
    </div>
  )
}
