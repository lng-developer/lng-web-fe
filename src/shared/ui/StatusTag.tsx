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

const backgrounds: Record<OperationalStatus, string> = {
  operational: '#f0fdf4',
  warning: '#fffbeb',
  critical: '#fef2f2',
  pending: '#fffbeb',
  ready: '#eff6ff',
  processing: '#eff6ff',
  approved: '#f0fdf4',
  rejected: '#fef2f2',
  cancelled: '#f5f5f5',
}

export function StatusTag({ status, children }: StatusTagProps) {
  return (
    <Tag
      color={colors[status]}
      style={{
        backgroundColor: backgrounds[status],
        borderColor: 'currentColor',
        borderRadius: 999,
        paddingInline: 8,
      }}
    >
      {children}
    </Tag>
  )
}
