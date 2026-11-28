import { useTranslation } from 'react-i18next'

import { CopyableOrderId, TableTextCell } from '@/shared/ui'

export function VendorOrderIdentity({
  order,
}: {
  readonly order: {
    provider: string | null
    vendorExternalOrderId: string | null
    vendorOrderCode?: string | null
    vendorOrderReference?: string | null
  }
}) {
  const { t } = useTranslation()
  if (order.provider !== 'MERCHIZE') {
    return <TableTextCell value={order.vendorExternalOrderId} fallback="-" />
  }
  if (order.vendorOrderCode) return <CopyableOrderId value={order.vendorOrderCode} />
  if (order.vendorOrderReference) {
    return (
      <span>
        {t('portal.vendorSubmissions.vendorOrderReference')}:{' '}
        <CopyableOrderId value={order.vendorOrderReference} />
      </span>
    )
  }
  return <>{t('portal.vendorSubmissions.vendorOrderUnavailable')}</>
}
