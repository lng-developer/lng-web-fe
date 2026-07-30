import type { ReactNode } from 'react'
import { Card, Statistic } from 'antd'

export interface MetricCardProps {
  readonly label: string
  readonly value: string
  readonly status?: ReactNode
}

export function MetricCard({ label, value, status }: MetricCardProps) {
  return (
    <Card>
      <Statistic title={label} value={value} suffix={status} />
    </Card>
  )
}
