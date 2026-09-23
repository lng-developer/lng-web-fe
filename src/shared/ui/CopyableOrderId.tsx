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
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly className?: string
  readonly strong?: boolean
  readonly copiedMessage: string
  readonly title: string
}) {
  const { message } = App.useApp()

  if (!value) return <>{fallback}</>

  const copyValue = async () => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value)
    }
    message.success(copiedMessage)
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
            void copyValue()
          }
        }}
      >
        <span className={styles.badgeText}>{value}</span>
        <CopyOutlined className={styles.copyIcon} aria-hidden />
      </Typography.Text>
    </Tooltip>
  )
})

export const CopyableOrderId = memo(function CopyableOrderId({
  value,
  fallback = '-',
  strong = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={styles.orderIdBadge}
      strong={strong}
      title={t('common.copyOrderId')}
      copiedMessage={t('common.orderIdCopied')}
    />
  )
})

export const CopyableSku = memo(function CopyableSku({
  value,
  fallback = '-',
  strong = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={styles.skuBadge}
      strong={strong}
      title={t('portal.catalog.copySku', { defaultValue: 'Copy SKU' })}
      copiedMessage={t('portal.catalog.skuCopied', { defaultValue: 'SKU copied' })}
    />
  )
})

export const CopyableAsin = memo(function CopyableAsin({
  value,
  fallback = '-',
  strong = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={styles.asinBadge}
      strong={strong}
      title={t('portal.catalog.copyAsin', { defaultValue: 'Copy ASIN' })}
      copiedMessage={t('portal.catalog.asinCopied', { defaultValue: 'ASIN copied' })}
    />
  )
})

export const CopyableListingId = memo(function CopyableListingId({
  value,
  fallback = '-',
  strong = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
}) {
  const { t } = useTranslation()

  return (
    <CopyableText
      value={value}
      fallback={fallback}
      className={styles.listingIdBadge}
      strong={strong}
      title={t('portal.catalog.copyListingId', { defaultValue: 'Copy listing ID' })}
      copiedMessage={t('portal.catalog.listingIdCopied', { defaultValue: 'Listing ID copied' })}
    />
  )
})
