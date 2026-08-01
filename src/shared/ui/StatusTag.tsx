import type { ReactNode } from 'react'
import { Tag } from 'antd'

type OperationalStatus =
  | 'operational'
  | 'warning'
  | 'critical'
  | 'pending'
  | 'ready'
  | 'processing'
  | 'approved'
  | 'rejected'
  | 'cancelled'

export interface StatusTagProps {
  readonly status: OperationalStatus
  readonly children: ReactNode
}

const colors: Record<OperationalStatus, string> = {
  operational: 'success',
  warning: 'warning',
  critical: 'error',
  pending: 'warning',
  ready: 'blue',
  processing: 'processing',
  approved: 'success',
  rejected: 'error',
  cancelled: 'default',
}

export function StatusTag({ status, children }: StatusTagProps) {
  return <Tag color={colors[status]}>{children}</Tag>
}
