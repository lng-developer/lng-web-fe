import { useMemo } from 'react'

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#7c3aed']

function summarize(rows) {
  const channels = new Map()
  rows.forEach((row) => {
    const channel = row.salesChannelCode || 'UNKNOWN'
    channels.set(channel, (channels.get(channel) || 0) + Number(row.netProfitAmount || 0))
  })
  return [...channels.entries()]
    .map(([channel, amount]) => ({ channel, amount }))
    .sort((left, right) => right.amount - left.amount)
}

function formatMoney(amount, currency, language) {
  return new Intl.NumberFormat(language, {
    style: 'currency',
    currency,
    notation: 'compact',
    maximumFractionDigits: 1,
  }).format(Number(amount || 0) / 100)
}

export default function ChannelProfitChart({ currency, labels, language, rows }) {
  const data = useMemo(() => summarize(rows), [rows])
  const highest = Math.max(...data.map((row) => row.amount), 0)
  const lowest = Math.min(...data.map((row) => row.amount), 0)
  const scale = highest - lowest || 1
  const chartHeight = Math.max(160, data.length * 54 + 34)
  const zeroX = 168 + ((0 - lowest) / scale) * 330
  const xFor = (value) => 168 + ((value - lowest) / scale) * 330

  return (
    <section className="h-full rounded-lg border border-border bg-surface shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-strong">{labels.title}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
        <div className="text-xs text-ink-muted">{labels.ranking}</div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg
          aria-label={`${labels.title} ${currency}`}
          className="block min-w-[560px]"
          role="img"
          viewBox={`0 0 560 ${chartHeight}`}
          width="100%"
        >
          <line
            x1={zeroX}
            x2={zeroX}
            y1="18"
            y2={chartHeight - 26}
            className="stroke-border"
            strokeWidth="1"
          />
          {data.map((row, index) => {
            const y = 34 + index * 54
            const color = COLORS[index % COLORS.length]
            return (
              <g key={row.channel}>
                <text className="fill-ink-secondary text-[12px]" textAnchor="end" x="154" y={y + 4}>
                  {row.channel}
                </text>
                <line
                  stroke={color}
                  strokeWidth="3"
                  x1={zeroX}
                  x2={xFor(row.amount)}
                  y1={y}
                  y2={y}
                />
                <circle cx={xFor(row.amount)} cy={y} fill={color} r="7">
                  <title>{`${row.channel}: ${formatMoney(row.amount, currency, language)}`}</title>
                </circle>
                <text
                  className="fill-ink-strong text-[11px]"
                  x={xFor(row.amount) + (row.amount >= 0 ? 12 : -12)}
                  y={y + 4}
                  textAnchor={row.amount >= 0 ? 'start' : 'end'}
                >
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
