import type { ReactNode } from 'react'
import { Card, Statistic } from 'antd'

export interface MetricCardProps {
  readonly icon?: ReactNode
  readonly label: string
  readonly value: string
  readonly status?: ReactNode
}

export function MetricCard({ icon, label, value, status }: MetricCardProps) {
  return (
    <Card>
      <Statistic title={label} value={value} prefix={icon} suffix={status} />
    </Card>
  )
}
