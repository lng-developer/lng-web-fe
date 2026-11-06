import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { CopyOutlined } from '@ant-design/icons'
import { App, Tooltip, Typography } from 'antd'

import styles from './CopyableOrderId.module.scss'

export const CopyableText = memo(function CopyableText({
  value,
  fallback = '-',
  className,
  strong = false,
  copiedMessage,
  title,
  showIcon = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly copiedMessage: string
  readonly title: string
  readonly showIcon?: boolean
}) {
  const { message } = App.useApp()

  if (!value) return <>{fallback}</>

  const copyValue = async (event?: React.SyntheticEvent) => {
    event?.stopPropagation?.()
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const textArea = document.createElement('textarea')
        textArea.value = value
        textArea.style.position = 'fixed'
        textArea.style.left = '-9999px'
        document.body.appendChild(textArea)
        textArea.select()
        document.execCommand('copy')
        document.body.removeChild(textArea)
      }
      message.success(copiedMessage)
    } catch {
      message.success(copiedMessage)
    }
  }

  return (
    <Tooltip title={title} placement="top">
      <Typography.Text
        className={className}
        strong={strong}
        role="button"
        tabIndex={0}
        title={title}
        style={{ cursor: 'copy' }}
        onClick={copyValue}
        onKeyDown={(event) => {
          if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            void copyValue(event)
          }
        }}
      >
        <span className={styles.badgeText}>{value}</span>
        {showIcon ? <CopyOutlined className={styles.copyIcon} aria-hidden /> : null}
      </Typography.Text>
    </Tooltip>
  )
})

export const CopyableOrderId = memo(function CopyableOrderId({
  value,
  fallback = '-',
  className,
  strong = false,
  showIcon = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly showIcon?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={className ? `${styles.orderIdBadge} ${className}` : styles.orderIdBadge}
      strong={strong}
      showIcon={showIcon}
      title={t('common.copyOrderId')}
      copiedMessage={t('common.orderIdCopied')}
    />
  )
})

export const CopyableSku = memo(function CopyableSku({
  value,
  fallback = '-',
  className,
  strong = false,
  showIcon = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly showIcon?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={className ? `${styles.skuBadge} ${className}` : styles.skuBadge}
      strong={strong}
      showIcon={showIcon}
      title={t('portal.catalog.copySku', { defaultValue: 'Copy SKU' })}
      copiedMessage={t('portal.catalog.skuCopied', { defaultValue: 'SKU copied' })}
    />
  )
})

export const CopyableAsin = memo(function CopyableAsin({
  value,
  fallback = '-',
  className,
  strong = false,
  showIcon = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly showIcon?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={className ? `${styles.asinBadge} ${className}` : styles.asinBadge}
      strong={strong}
      showIcon={showIcon}
      title={t('portal.catalog.copyAsin', { defaultValue: 'Copy ASIN' })}
      copiedMessage={t('portal.catalog.asinCopied', { defaultValue: 'ASIN copied' })}
    />
  )
})

export const CopyableListingId = memo(function CopyableListingId({
  value,
  fallback = '-',
  className,
  strong = false,
  showIcon = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly showIcon?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={className ? `${styles.listingIdBadge} ${className}` : styles.listingIdBadge}
      strong={strong}
      showIcon={showIcon}
      title={t('portal.catalog.copyListingId', { defaultValue: 'Copy listing ID' })}
      copiedMessage={t('portal.catalog.listingIdCopied', { defaultValue: 'Listing ID copied' })}
    />
  )
})
