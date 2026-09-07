import { memo, useMemo } from 'react'

import styles from './sharedUi.module.scss'

export interface BarChartDatum {
  readonly label: string
  readonly value: number
}

export interface BarChartProps {
  readonly data: readonly BarChartDatum[]
  readonly ariaLabel: string
}

export const BarChart = memo(function BarChart({ data, ariaLabel }: BarChartProps) {
  const max = useMemo(() => Math.max(...data.map((item) => item.value), 1), [data])

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
})
