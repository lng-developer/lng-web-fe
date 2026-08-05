import styles from './sharedUi.module.scss'

export interface BarChartDatum {
  readonly label: string
  readonly value: number
}

export interface BarChartProps {
  readonly data: readonly BarChartDatum[]
  readonly ariaLabel: string
}

export function BarChart({ data, ariaLabel }: BarChartProps) {
  const max = Math.max(...data.map((item) => item.value), 1)

  return (
    <div className={styles.barChart} role="img" aria-label={ariaLabel}>
      {data.map((item) => (
        <div className={styles.barChartItem} key={item.label}>
          <div className={styles.barChartTrack}>
            <div
              className={styles.barChartBar}
              style={{ height: `${(item.value / max) * 100}%` }}
            />
          </div>
          <span>{item.label}</span>
        </div>
      ))}
    </div>
  )
}
