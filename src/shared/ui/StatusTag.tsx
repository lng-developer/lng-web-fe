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
  | 'online'
  | 'offline'

export interface StatusTagProps {
  readonly status: OperationalStatus
  readonly children: ReactNode
}

const tones: Record<OperationalStatus, { bg: string; border: string; color: string }> = {
  operational: tone('success'),
  warning: tone('warning'),
  critical: tone('error'),
  pending: tone('warning'),
  ready: tone('info'),
  processing: tone('processing'),
  approved: tone('success'),
  rejected: tone('error'),
  cancelled: tone('error'),
  draft: {
    bg: 'var(--ant-color-fill-tertiary)',
    border: 'var(--ant-color-border)',
    color: 'var(--ant-color-text-secondary)',
  },
  finalized: tone('purple'),
  paid: tone('success'),
  online: tone('success'),
  offline: {
    bg: 'var(--ant-color-fill-tertiary)',
    border: 'var(--ant-color-border)',
    color: 'var(--ant-color-text-secondary)',
  },
}

function tone(token: 'error' | 'info' | 'processing' | 'purple' | 'success' | 'warning') {
  const colorToken = token === 'processing' ? 'primary' : token
  return {
    bg: `color-mix(in srgb, var(--ant-color-${colorToken}-bg) 64%, var(--ant-color-bg-container))`,
    border: `color-mix(in srgb, var(--ant-color-${colorToken}) 42%, var(--ant-color-border))`,
    color: `var(--ant-color-${colorToken})`,
  }
}

export function StatusTag({ status, children }: StatusTagProps) {
  const tone = tones[status] ?? tones.draft
  return (
    <Tag
      style={{
        backgroundColor: tone.bg,
        borderColor: tone.border,
        borderRadius: 999,
        color: tone.color,
        fontWeight: 700,
        paddingInline: 8,
      }}
    >
      {children}
    </Tag>
  )
}
