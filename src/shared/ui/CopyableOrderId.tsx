import { useTranslation } from 'react-i18next'
import { App, Typography } from 'antd'

export function CopyableText({
  value,
  fallback = '-',
  strong = false,
  copiedMessage,
  title,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
  readonly copiedMessage: string
  readonly title: string
}) {
  const { message } = App.useApp()

  if (!value) return <>{fallback}</>

  const copyValue = async () => {
    await navigator.clipboard.writeText(value)
    message.success(copiedMessage)
  }

  return (
    <Typography.Text
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
}

export function CopyableOrderId({
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
      strong={strong}
      title={t('common.copyOrderId')}
      copiedMessage={t('common.orderIdCopied')}
    />
  )
}
