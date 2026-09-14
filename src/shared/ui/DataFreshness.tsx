import { memo, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ReloadOutlined } from '@ant-design/icons'
import { Tooltip } from 'antd'

import styles from './DataFreshness.module.scss'

export interface DataFreshnessProps {
  /** Timestamp in ms (e.g. from TanStack Query's dataUpdatedAt) or ISO string or Date */
  readonly timestamp?: number | string | Date | null
  /** Optional callback to trigger manual refetch */
  readonly onRefresh?: () => void
  /** Loading state for the refresh action */
  readonly loading?: boolean
  /** Whether to show the reload button (default true if onRefresh provided) */
  readonly showRefreshButton?: boolean
  /** Optional extra className */
  readonly className?: string
}

export const DataFreshness = memo(function DataFreshness({
  timestamp,
  onRefresh,
  loading = false,
  showRefreshButton = true,
  className,
}: DataFreshnessProps) {
  const { t } = useTranslation()

  const dateObj = useMemo(() => {
    if (!timestamp) return null
    const d = new Date(timestamp)
    return Number.isNaN(d.getTime()) ? null : d
  }, [timestamp])

  if (!dateObj && !onRefresh) {
    return null
  }

  const timeString = dateObj ? dateObj.toLocaleTimeString() : ''
  const fullDateTimeString = dateObj ? dateObj.toLocaleString() : ''

  return (
    <div className={`${styles.freshnessContainer} ${className ?? ''}`.trim()}>
      {dateObj ? (
        <Tooltip title={fullDateTimeString} placement="top">
          <span className={styles.freshnessText}>
            {t('common.updatedAt', {
              time: timeString,
              defaultValue: `Updated at ${timeString}`,
            })}
          </span>
        </Tooltip>
      ) : null}

      {showRefreshButton && onRefresh ? (
        <Tooltip title={t('common.refresh', { defaultValue: 'Refresh' })}>
          <button
            type="button"
            className={styles.refreshButton}
            onClick={onRefresh}
            disabled={loading}
            aria-label={t('common.refresh', { defaultValue: 'Refresh' })}
          >
            <ReloadOutlined spin={loading} className={styles.refreshIcon} />
          </button>
        </Tooltip>
      ) : null}
    </div>
  )
})
