import {
  type CSSProperties,
  type KeyboardEvent,
  memo,
  type ReactNode,
  useCallback,
  useMemo,
} from 'react'
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
  readonly subtext?: ReactNode
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

export const MetricCard = memo(function MetricCard({
  label,
  value,
  icon,
  variant = 'neutral',
  status,
  subtext,
  loading = false,
  className,
  style,
  onClick,
}: MetricCardProps) {
  const isClickable = Boolean(onClick)

  const rootClass = useMemo(
    () =>
      [styles.metricCard, isClickable ? styles.metricCardClickable : '', className ?? '']
        .filter(Boolean)
        .join(' '),
    [isClickable, className],
  )

  const iconClass = useMemo(
    () =>
      [styles.metricIcon, variantClassMap[variant] ?? styles.metricIconNeutral]
        .filter(Boolean)
        .join(' '),
    [variant],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLDivElement>) => {
      if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault()
        onClick?.()
      }
    },
    [isClickable, onClick],
  )

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={rootClass}
      style={style}
      onClick={onClick}
      onKeyDown={isClickable ? handleKeyDown : undefined}
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
        {subtext ? <span className={styles.metricSubtext}>{subtext}</span> : null}
      </div>
    </div>
  )
})
