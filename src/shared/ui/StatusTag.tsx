import { type CSSProperties, memo, type ReactNode } from 'react'

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

const tones: Record<OperationalStatus, { color: string }> = {
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
    color: 'var(--ant-color-text-secondary)',
  },
  finalized: tone('purple'),
  paid: tone('success'),
  online: tone('success'),
  offline: {
    color: 'var(--ant-color-text-secondary)',
  },
}

function tone(token: 'error' | 'info' | 'processing' | 'purple' | 'success' | 'warning') {
  const colorToken = token === 'processing' ? 'primary' : token
  return {
    color: `var(--ant-color-${colorToken})`,
  }
}

const defaultStatusStyle: CSSProperties = {
  alignItems: 'center',
  color: tones.draft.color,
  display: 'inline-flex',
  fontWeight: 500,
  gap: 8,
}

const statusStyles: Record<OperationalStatus, CSSProperties> = Object.fromEntries(
  Object.entries(tones).map(([key, item]) => [
    key,
    {
      alignItems: 'center',
      color: item.color,
      display: 'inline-flex',
      fontWeight: 500,
      gap: 8,
    },
  ]),
) as Record<OperationalStatus, CSSProperties>

export const StatusTag = memo(function StatusTag({ status, children }: StatusTagProps) {
  const style = statusStyles[status] ?? defaultStatusStyle
  return (
    <span style={style}>
      <span
        aria-hidden
        style={{
          width: 10,
          height: 10,
          flex: '0 0 auto',
          borderRadius: '50%',
          backgroundColor: style.color,
        }}
      />
      {children}
    </span>
  )
})
