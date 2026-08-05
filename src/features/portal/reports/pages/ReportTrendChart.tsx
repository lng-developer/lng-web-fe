import styles from './ReportWorkspacePage.module.scss'

type TrendPoint = { label: string; value: number }

export function ReportTrendChart({
  ariaLabel,
  data,
  formatValue,
}: {
  ariaLabel: string
  data: TrendPoint[]
  formatValue: (value: number) => string
}) {
  if (!data.length) return null

  const width = 1000
  const height = 220
  const padding = 16
  const max = Math.max(...data.map((point) => point.value), 1)
  const x = (index: number) =>
    data.length === 1 ? width / 2 : padding + (index / (data.length - 1)) * (width - padding * 2)
  const y = (value: number) => height - padding - (value / max) * (height - padding * 2)
  const points = data.map((point, index) => `${x(index)},${y(point.value)}`).join(' ')
  const area = `M ${x(0)} ${y(data[0].value)} ${data
    .slice(1)
    .map((point, index) => `L ${x(index + 1)} ${y(point.value)}`)
    .join(' ')} L ${x(data.length - 1)} ${height - padding} L ${x(0)} ${height - padding} Z`
  const labelIndexes = [
    ...new Set([0, 0.25, 0.5, 0.75, 1].map((ratio) => Math.round((data.length - 1) * ratio))),
  ]

  return (
    <div className={styles.trendChart} role="img" aria-label={ariaLabel}>
      <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
        {[0.25, 0.5, 0.75].map((ratio) => (
          <line
            key={ratio}
            x1={padding}
            x2={width - padding}
            y1={height * ratio}
            y2={height * ratio}
            className={styles.trendGridLine}
          />
        ))}
        <path d={area} className={styles.trendArea} />
        <polyline points={points} className={styles.trendLine} vectorEffect="non-scaling-stroke" />
        {data.map((point, index) => (
          <circle key={`${point.label}-${index}`} cx={x(index)} cy={y(point.value)} r="4">
            <title>{`${point.label}: ${formatValue(point.value)}`}</title>
          </circle>
        ))}
      </svg>
      <div className={styles.trendLabels}>
        {labelIndexes.map((index) => (
          <span key={data[index].label}>{data[index].label}</span>
        ))}
      </div>
    </div>
  )
}
