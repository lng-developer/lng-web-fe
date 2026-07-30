import type { ReactNode } from 'react'
import { Tag } from 'antd'

type OperationalStatus = 'operational' | 'warning' | 'critical'

export interface StatusTagProps {
  readonly status: OperationalStatus
  readonly children: ReactNode
}

const colors: Record<OperationalStatus, string> = {
  operational: 'success',
  warning: 'warning',
  critical: 'error',
}

export function StatusTag({ status, children }: StatusTagProps) {
  return <Tag color={colors[status]}>{children}</Tag>
}
