import { formatCurrency } from '@/utils/format'

export default function FinanceRevenueProfitChart({ currency, revenue, grossProfit, language }) {
  const highest = Math.max(Math.abs(revenue), Math.abs(grossProfit), 1)
  const series = [
    ['Revenue', revenue, '#2563eb'],
    ['Gross profit', grossProfit, '#16a34a'],
  ]

  return (
    <section className="rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-ink-strong">Revenue vs Gross profit</div>
        <div className="text-xs text-ink-muted">{currency}</div>
      </div>
      <div className="overflow-x-auto px-4 py-3">
        <svg
          aria-label={`Revenue versus Gross profit ${currency}`}
          height="128"
          role="img"
          viewBox="0 0 560 128"
          width="560"
        >
          {series.map(([label, amount, color], index) => {
            const y = 34 + index * 48
            const width = (Math.abs(Number(amount || 0)) / highest) * 290
            return (
              <g key={label}>
                <text className="fill-ink-secondary text-[12px]" textAnchor="end" x="160" y={y + 4}>
                  {label}
                </text>
                <rect fill={color} height="18" rx="2" width={width} x="174" y={y - 10} />
                <text className="fill-ink-strong text-[11px]" x={182 + width} y={y + 4}>
                  {formatCurrency(Number(amount || 0) / 100, language, currency)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
