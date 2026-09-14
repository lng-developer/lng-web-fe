import { memo, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyOutlined, EyeOutlined } from '@ant-design/icons'
import { App, Popover, Tooltip, Typography } from 'antd'

import styles from './TableTextCell.module.scss'

export interface TableTextCellProps {
  readonly value?: ReactNode | string | number | null
  readonly maxWidth?: number | string
  readonly maxChars?: number
  readonly strong?: boolean
  readonly secondary?: boolean
  readonly code?: boolean
  readonly copyable?: boolean
  readonly badge?: boolean
  readonly expandable?: boolean
  readonly fallback?: string
  readonly placement?: 'top' | 'topLeft' | 'bottom' | 'bottomLeft'
  readonly title?: string
  readonly popoverTitle?: ReactNode
  readonly className?: string
}

export const TableTextCell = memo(function TableTextCell({
  value,
  maxWidth,
  maxChars = 36,
  strong = false,
  secondary = false,
  code = false,
  copyable = false,
  badge = false,
  expandable = false,
  fallback = '—',
  placement = 'topLeft',
  title,
  popoverTitle,
  className,
}: TableTextCellProps) {
  const { t } = useTranslation()
  const { message } = App.useApp()

  if (value === null || value === undefined || value === '') {
    return <Typography.Text type="secondary">{fallback}</Typography.Text>
  }

  const isStringOrNumber = typeof value === 'string' || typeof value === 'number'
  const textValue = isStringOrNumber ? String(value) : ''
  const isLong = isStringOrNumber && textValue.length > maxChars

  const handleCopy = async (e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (textValue && navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(textValue)
      message.success(t('actionFeedback.copied', { defaultValue: 'Copied to clipboard' }))
    }
  }

  const tooltipTitle = title || (isStringOrNumber ? textValue : undefined)

  const popoverContent =
    isLong && expandable ? (
      <div className={styles.popoverCard}>
        <div className={styles.popoverHeader}>
          <span>{popoverTitle || t('common.table.viewDetails', { defaultValue: 'Details' })}</span>
          <button type="button" className={styles.copyLink} onClick={handleCopy}>
            <CopyOutlined />
            <span>{t('common.copy', { defaultValue: 'Copy' })}</span>
          </button>
        </div>
        <div>{textValue}</div>
      </div>
    ) : null

  const mainContent = (
    <Typography.Text
      code={code}
      strong={strong}
      type={secondary ? 'secondary' : undefined}
      className={styles.text}
      style={{ maxWidth: maxWidth ?? (isLong ? 260 : undefined) }}
    >
      {value}
    </Typography.Text>
  )

  const copyButton = copyable ? (
    <button
      type="button"
      className={styles.copyLink}
      title={t('common.copy', { defaultValue: 'Copy' })}
      onClick={handleCopy}
      aria-label={t('common.copy', { defaultValue: 'Copy' })}
    >
      <CopyOutlined />
    </button>
  ) : null

  const wrappedContent =
    isLong || badge ? (
      <span className={`${styles.longBadge} ${className ?? ''}`.trim()}>
        {mainContent}
        {copyButton}
      </span>
    ) : (
      <span className={`${styles.container} ${className ?? ''}`.trim()} style={{ maxWidth }}>
        {mainContent}
        {copyButton}
      </span>
    )

  if (isLong && expandable && popoverContent) {
    return (
      <span className={styles.container}>
        <Tooltip title={tooltipTitle} placement={placement}>
          {wrappedContent}
        </Tooltip>
        <Popover
          content={popoverContent}
          trigger="click"
          placement={placement}
          overlayStyle={{ zIndex: 1060 }}
        >
          <button
            type="button"
            className={styles.moreTrigger}
            title={t('common.table.viewDetails', { defaultValue: 'View details' })}
            onClick={(e) => e.stopPropagation()}
          >
            <EyeOutlined />
            <span>...</span>
          </button>
        </Popover>
      </span>
    )
  }

  if (isLong || tooltipTitle) {
    return (
      <Tooltip title={tooltipTitle} placement={placement}>
        {wrappedContent}
      </Tooltip>
    )
  }

  return wrappedContent
})
