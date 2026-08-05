import { useTranslation } from 'react-i18next'
import { Typography } from 'antd'

export function CopyableOrderId({
  value,
  fallback = '—',
  strong = false,
}: {
  readonly value?: string | null
  readonly fallback?: string
  readonly strong?: boolean
}) {
  const { t } = useTranslation()

  if (!value) return <>{fallback}</>

  return (
    <Typography.Text
      strong={strong}
      copyable={{
        text: value,
        tooltips: [t('common.copyOrderId'), t('common.orderIdCopied')],
      }}
    >
      {value}
    </Typography.Text>
  )
}
