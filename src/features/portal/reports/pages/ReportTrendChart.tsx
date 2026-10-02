import { useState } from 'react'
import dayjs from 'dayjs'
import styles from './ReportWorkspacePage.module.scss'

type TrendPoint = { label: string; value: number }

export function ReportTrendChart({
  ariaLabel,
  data,
  formatValue,
  formatDate,
}: {
  ariaLabel: string
  data: TrendPoint[]
  formatValue: (value: number) => string
  formatDate?: (date: string) => string
}) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null)

  if (!data.length) return null

  const formatDateLabel = (rawDate: string) => {
    if (formatDate) return formatDate(rawDate)
    const parsed = dayjs(rawDate)
    return parsed.isValid() ? parsed.format('DD/MM/YYYY') : rawDate
  }

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

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (data.length <= 1) {
      setHoveredIndex(0)
      return
    }
    const rect = e.currentTarget.getBoundingClientRect()
    if (rect.width <= 0) return
    const mouseX = e.clientX - rect.left
    const svgX = (mouseX / rect.width) * width
    const ratio = (svgX - padding) / (width - padding * 2)
    const index = Math.round(ratio * (data.length - 1))
    const clampedIndex = Math.max(0, Math.min(data.length - 1, index))
    setHoveredIndex(clampedIndex)
  }

  const handlePointerLeave = () => {
    setHoveredIndex(null)
  }

  const hoveredPoint = hoveredIndex !== null && data[hoveredIndex] ? data[hoveredIndex] : null
  const activeX = hoveredIndex !== null ? x(hoveredIndex) : 0
  const activeY = hoveredPoint ? y(hoveredPoint.value) : 0

  const isNearTop = activeY < 55
  const isNearLeft = data.length > 2 && hoveredIndex !== null && hoveredIndex < data.length * 0.15
  const isNearRight = data.length > 2 && hoveredIndex !== null && hoveredIndex > data.length * 0.85
  const horizontalTransform = isNearLeft ? '0%' : isNearRight ? '-100%' : '-50%'
  const verticalTransform = isNearTop ? '12px' : 'calc(-100% - 12px)'

  return (
    <div className={styles.trendChart} role="img" aria-label={ariaLabel}>
      <div className={styles.trendChartSvgWrap}>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          aria-hidden="true"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
          style={{ cursor: 'crosshair' }}
        >
          {[0.25, 0.5, 0.75].map((ratio) => (
            <g key={ratio}>
              <line
                x1={padding}
                x2={width - padding}
                y1={height * ratio}
                y2={height * ratio}
                className={styles.trendGridLine}
              />
              <text
                x={padding + 4}
                y={height * ratio - 4}
                fill="currentColor"
                opacity={0.4}
                fontSize={10}
              >
                {formatValue(Math.round(max * (1 - ratio)))}
              </text>
            </g>
          ))}
          <path d={area} className={styles.trendArea} />
          <polyline
            points={points}
            className={styles.trendLine}
            vectorEffect="non-scaling-stroke"
          />

          {/* Active crosshair guideline */}
          {hoveredIndex !== null && (
            <line
              x1={activeX}
              x2={activeX}
              y1={padding}
              y2={height - padding}
              stroke="var(--ant-color-primary)"
              strokeWidth="1.5"
              strokeDasharray="4 3"
              opacity="0.6"
              pointerEvents="none"
            />
          )}

          {/* Data point circles */}
          {data.map((point, index) => {
            const isHovered = hoveredIndex === index
            return (
              <circle
                key={`${point.label}-${index}`}
                cx={x(index)}
                cy={y(point.value)}
                r={isHovered ? 5.5 : 3.5}
                fill={isHovered ? 'var(--ant-color-primary)' : 'var(--ant-color-bg-container)'}
                stroke="var(--ant-color-primary)"
                strokeWidth={isHovered ? 2.5 : 2}
              >
                <title>{`${formatDateLabel(point.label)}: ${formatValue(point.value)}`}</title>
              </circle>
            )
          })}

          {/* Transparent hit target columns for immediate hover response */}
          {data.map((point, index) => {
            const prevX = index === 0 ? 0 : (x(index - 1) + x(index)) / 2
            const nextX = index === data.length - 1 ? width : (x(index) + x(index + 1)) / 2
            return (
              <rect
                key={`hit-${point.label}-${index}`}
                x={prevX}
                y={0}
                width={Math.max(nextX - prevX, 1)}
                height={height}
                fill="transparent"
                style={{ cursor: 'pointer' }}
                onPointerEnter={() => setHoveredIndex(index)}
              >
                <title>{`${formatDateLabel(point.label)}: ${formatValue(point.value)}`}</title>
              </rect>
            )
          })}
        </svg>

        {/* Floating instant tooltip */}
        {hoveredPoint && (
          <div
            className={styles.trendTooltip}
            style={{
              left: `${(activeX / width) * 100}%`,
              top: `${(activeY / height) * 100}%`,
              transform: `translate(${horizontalTransform}, ${verticalTransform})`,
            }}
          >
            <div className={styles.trendTooltipDate}>{formatDateLabel(hoveredPoint.label)}</div>
            <div className={styles.trendTooltipValue}>{formatValue(hoveredPoint.value)}</div>
          </div>
        )}
      </div>

      <div className={styles.trendLabels}>
        {labelIndexes.map((index) => (
          <span key={data[index].label}>{formatDateLabel(data[index].label)}</span>
        ))}
      </div>
    </div>
  )
}
