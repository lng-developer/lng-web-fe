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
  | 'draft'
  | 'finalized'
  | 'paid'

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
  cancelled: 'error',
  draft: 'default',
  finalized: 'purple',
  paid: 'success',
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
  cancelled: '#fef2f2',
  draft: '#f5f5f5',
  finalized: '#faf5ff',
  paid: '#f0fdf4',
}

export function StatusTag({ status, children }: StatusTagProps) {
  return (
    <Tag
      color={colors[status] || 'default'}
      style={{
        backgroundColor: backgrounds[status] || '#f5f5f5',
        borderColor: 'currentColor',
        borderRadius: 999,
        paddingInline: 8,
      }}
    >
      {children}
    </Tag>
  )
}
