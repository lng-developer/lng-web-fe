import { useMemo } from 'react'

const COLORS = ['#2563eb', '#ea580c', '#16a34a', '#7c3aed']
const CHART_TOP = 22
const CHART_HEIGHT = 156

function summarize(rows) {
  const dates = new Map()
  const channels = new Set()
  rows.forEach((row) => {
    const date = row.date || '-'
    const channel = row.salesChannelCode || 'UNKNOWN'
    const current = dates.get(date) || { date, values: {} }
    current.values[channel] = (current.values[channel] || 0) + Number(row.netProfitAmount || 0)
    dates.set(date, current)
    channels.add(channel)
  })
  return {
    channels: [...channels].sort(),
    rows: [...dates.values()].sort((left, right) => left.date.localeCompare(right.date)),
  }
}

function shortDate(date) {
  return date ? date.slice(5) : '-'
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
  const positiveMax = Math.max(
    ...data.rows.map((row) =>
      data.channels.reduce((sum, channel) => sum + Math.max(row.values[channel] || 0, 0), 0),
    ),
    1,
  )
  const negativeMax = Math.max(
    ...data.rows.map((row) =>
      data.channels.reduce(
        (sum, channel) => sum + Math.abs(Math.min(row.values[channel] || 0, 0)),
        0,
      ),
    ),
    0,
  )
  const scale = positiveMax + negativeMax
  const zeroY = CHART_TOP + (CHART_HEIGHT * positiveMax) / scale
  const chartWidth = Math.max(720, data.rows.length * 56 + 48)
  const groupWidth = (chartWidth - 48) / Math.max(data.rows.length, 1)
  const barWidth = Math.max(14, Math.min(32, groupWidth - 20))

  return (
    <section className="border border-border bg-surface">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3">
        <div>
          <div className="text-sm font-semibold text-ink-strong">{labels.title}</div>
          <div className="text-xs text-ink-muted">{currency}</div>
        </div>
        <div className="flex flex-wrap gap-3 text-xs text-ink-secondary">
          {data.channels.map((channel, index) => (
            <span key={channel} className="inline-flex items-center gap-1.5">
              <span
                className="h-2.5 w-2.5"
                style={{ backgroundColor: COLORS[index % COLORS.length] }}
              />
              {channel}
            </span>
          ))}
        </div>
      </div>
      <div className="overflow-x-auto px-3 py-3">
        <svg
          aria-label={`${labels.title} ${currency}`}
          className="block min-w-[720px]"
          role="img"
          viewBox={`0 0 ${chartWidth} 218`}
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
          {data.rows.map((row, rowIndex) => {
            const x = 36 + rowIndex * groupWidth + (groupWidth - barWidth) / 2
            let positiveY = zeroY
            let negativeY = zeroY
            return (
              <g key={row.date}>
                {data.channels.map((channel, channelIndex) => {
                  const amount = Number(row.values[channel] || 0)
                  const height = (Math.abs(amount) / scale) * CHART_HEIGHT
                  const y = amount >= 0 ? positiveY - height : negativeY
                  if (amount >= 0) positiveY -= height
                  else negativeY += height
                  return (
                    <rect
                      key={channel}
                      fill={COLORS[channelIndex % COLORS.length]}
                      height={height}
                      rx="2"
                      width={barWidth}
                      x={x}
                      y={y}
                    >
                      <title>{`${channel}: ${formatMoney(amount, currency, language)}`}</title>
                    </rect>
                  )
                })}
                <text
                  className="fill-ink-muted text-[10px]"
                  textAnchor="middle"
                  x={x + barWidth / 2}
                  y="202"
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
