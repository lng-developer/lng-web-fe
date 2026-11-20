import { type CSSProperties, type KeyboardEvent, memo, type ReactNode } from 'react'
import { Skeleton } from 'antd'

import styles from './sharedUi.module.scss'

export type CompactStatVariant = 'primary' | 'success' | 'warning' | 'danger' | 'info' | 'neutral'

export interface CompactStatItem {
  readonly key?: string | number
  readonly label: ReactNode
  readonly value: ReactNode
  readonly icon?: ReactNode
  readonly variant?: CompactStatVariant
  readonly valueVariant?: CompactStatVariant
  readonly subDetail?: ReactNode
  readonly loading?: boolean
  readonly onClick?: () => void
  readonly className?: string
  readonly style?: CSSProperties
}

export interface CompactStatBarProps {
  readonly items: readonly CompactStatItem[]
  readonly className?: string
  readonly style?: CSSProperties
}

const iconVariantClassMap: Record<CompactStatVariant, string> = {
  primary: styles.compactStatIconPrimary,
  success: styles.compactStatIconSuccess,
  warning: styles.compactStatIconWarning,
  danger: styles.compactStatIconDanger,
  info: styles.compactStatIconInfo,
  neutral: styles.compactStatIconNeutral,
}

const valueVariantClassMap: Record<CompactStatVariant, string> = {
  primary: styles.compactStatValuePrimary,
  success: styles.compactStatValueSuccess,
  warning: styles.compactStatValueWarning,
  danger: styles.compactStatValueDanger,
  info: styles.compactStatValueInfo,
  neutral: '',
}

export const CompactStatBar = memo(function CompactStatBar({
  items,
  className,
  style,
}: CompactStatBarProps) {
  return (
    <div
      className={[styles.compactStatBar, className ?? ''].filter(Boolean).join(' ')}
      style={style}
    >
      {items.map((item, index) => {
        const isClickable = Boolean(item.onClick)
        const variant = item.variant ?? 'neutral'
        const iconClass = [
          styles.compactStatIconBadge,
          iconVariantClassMap[variant] ?? styles.compactStatIconNeutral,
        ].join(' ')

        const valueVariant = item.valueVariant
        const valueClass = [
          styles.compactStatValue,
          valueVariant ? valueVariantClassMap[valueVariant] : '',
        ]
          .filter(Boolean)
          .join(' ')

        const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
          if (isClickable && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault()
            item.onClick?.()
          }
        }

        return (
          <div
            key={item.key ?? index}
            role={isClickable ? 'button' : undefined}
            tabIndex={isClickable ? 0 : undefined}
            className={[
              styles.compactStatSegment,
              isClickable ? styles.compactStatSegmentClickable : '',
              item.className ?? '',
            ]
              .filter(Boolean)
              .join(' ')}
            style={item.style}
            onClick={item.onClick}
            onKeyDown={isClickable ? handleKeyDown : undefined}
          >
            {item.icon ? <div className={iconClass}>{item.icon}</div> : null}
            <div className={styles.compactStatContent}>
              <span className={styles.compactStatLabel}>{item.label}</span>
              <div className={valueClass}>
                {item.loading ? (
                  <Skeleton.Button active size="small" className={styles.compactStatSkeleton} />
                ) : (
                  <>
                    <span>{item.value}</span>
                    {item.subDetail ? (
                      <span className={styles.compactStatSubDetail}>{item.subDetail}</span>
                    ) : null}
                  </>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
})
