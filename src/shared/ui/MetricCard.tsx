import type { CSSProperties, ReactNode } from 'react'
import { Skeleton } from 'antd'

import styles from './sharedUi.module.scss'

export type MetricCardVariant =
  | 'primary'
  | 'success'
  | 'warning'
  | 'danger'
  | 'info'
  | 'neutral'
  | 'blocked'
  | 'ready'
  | 'confirmed'
  | 'ambiguous'

export interface MetricCardProps {
  readonly label: ReactNode
  readonly value: ReactNode | number | string
  readonly icon?: ReactNode
  readonly variant?: MetricCardVariant
  readonly status?: ReactNode
  readonly loading?: boolean
  readonly className?: string
  readonly style?: CSSProperties
  readonly onClick?: () => void
}

const variantClassMap: Record<MetricCardVariant, string> = {
  primary: styles.metricIconPrimary,
  success: styles.metricIconSuccess,
  warning: styles.metricIconWarning,
  danger: styles.metricIconDanger,
  info: styles.metricIconInfo,
  neutral: styles.metricIconNeutral,
  blocked: styles.metricIconBlocked,
  ready: styles.metricIconReady,
  confirmed: styles.metricIconConfirmed,
  ambiguous: styles.metricIconAmbiguous,
}

export function MetricCard({
  label,
  value,
  icon,
  variant = 'neutral',
  status,
  loading = false,
  className,
  style,
  onClick,
}: MetricCardProps) {
  const isClickable = Boolean(onClick)
  const rootClass = [
    styles.metricCard,
    isClickable ? styles.metricCardClickable : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ')

  const iconClass = [styles.metricIcon, variantClassMap[variant] ?? styles.metricIconNeutral]
    .filter(Boolean)
    .join(' ')

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={rootClass}
      style={style}
      onClick={onClick}
      onKeyDown={isClickable ? (e) => e.key === 'Enter' && onClick?.() : undefined}
    >
      {icon ? <span className={iconClass}>{icon}</span> : null}
      <div className={styles.metricBody}>
        <div className={styles.metricValueRow}>
          <span
            className={styles.metricValue}
            title={
              typeof value === 'string' || typeof value === 'number' ? String(value) : undefined
            }
          >
            {loading ? (
              <Skeleton.Button active size="small" style={{ width: 48, height: 24 }} />
            ) : (
              (value ?? 0)
            )}
          </span>
          {status}
        </div>
        <span className={styles.metricLabel}>{label}</span>
      </div>
    </div>
  )
}
