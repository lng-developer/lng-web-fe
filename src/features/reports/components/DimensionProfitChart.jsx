import { useMemo } from 'react'

function formatMoney(amount, currency, language) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount || 0) / 100)
}

export default function DimensionProfitChart({ currency, language, rows, title }) {
  const data = useMemo(
    () =>
      rows
        .map((row) => ({
          label:
            row.sellerName ||
            row.sellerEmployeeCode ||
            row.teamName ||
            row.departmentName ||
            row.teamCode ||
            '-',
          amount: Number(row.grossProfitAmount || 0),
        }))
        .sort((left, right) => right.amount - left.amount),
    [rows],
  )
  const highest = Math.max(...data.map((row) => Math.abs(row.amount)), 1)
  const height = Math.max(156, data.length * 48 + 28)

  return (
    <section className="h-[280px] rounded-lg border border-border bg-surface shadow-sm">
      <div className="border-b border-border px-4 py-3">
        <div className="text-sm font-semibold text-ink-strong">{title}</div>
        <div className="text-xs text-ink-muted">{currency}</div>
      </div>
      <div className="h-[230px] overflow-auto px-3 py-3">
        <svg
          aria-label={`${title} Gross profit ${currency}`}
          className="block"
          height={height}
          role="img"
          viewBox={`0 0 560 ${height}`}
          width="560"
        >
          {data.map((row, index) => {
            const y = 30 + index * 48
            const width = (Math.abs(row.amount) / highest) * 300
            return (
              <g key={`${row.label}-${index}`}>
                <text className="fill-ink-secondary text-[12px]" textAnchor="end" x="184" y={y + 4}>
                  {row.label}
                </text>
                <rect
                  fill={row.amount < 0 ? '#dc2626' : '#2563eb'}
                  height="18"
                  rx="2"
                  width={width}
                  x="196"
                  y={y - 10}
                >
                  <title>{`Gross profit: ${formatMoney(row.amount, currency, language)}`}</title>
                </rect>
                <text className="fill-ink-strong text-[11px]" x={204 + width} y={y + 4}>
                  {formatMoney(row.amount, currency, language)}
                </text>
              </g>
            )
          })}
        </svg>
      </div>
    </section>
  )
}
