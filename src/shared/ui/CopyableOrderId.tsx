import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { App, Typography } from 'antd'

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
      {value}
    </Typography.Text>
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
