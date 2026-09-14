import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Select, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor } from '@/shared/ui'

import type { ShippingService } from '../api/orderApi'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import type { OrderAction } from './orderTypes'

const SHIPPING_LEVEL_OPTIONS = ['Standard', 'Expedited', 'SecondDay', 'NextDay', 'Scheduled']

type OrderShippingModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly initialShipping: ShippingService
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

export const OrderShippingModal = memo(function OrderShippingModal({
  open,
  anchor,
  initialShipping,
  pending,
  onClose,
  onAction,
}: OrderShippingModalProps) {
  if (!open) return null

  return (
    <OrderShippingModalInner
      anchor={anchor}
      initialShipping={initialShipping}
      pending={pending}
      onClose={onClose}
      onAction={onAction}
    />
  )
})

type OrderShippingModalInnerProps = {
  readonly anchor?: PopupModalAnchor
  readonly initialShipping: ShippingService
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

function OrderShippingModalInner({
  anchor,
  initialShipping,
  pending,
  onClose,
  onAction,
}: OrderShippingModalInnerProps) {
  const { t } = useTranslation()
  const [shipping, setShipping] = useState<ShippingService>(initialShipping)

  return (
    <PopupModal
      anchor={anchor}
      open
      title={t('orders.actions.editShipping')}
      okText={t('orders.actions.saveShipping')}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={() => onAction({ kind: 'shipping', shipping })}
    >
      <div className={styles.modalForm}>
        <label>
          <Typography.Text>{t('orders.shipping.name')}</Typography.Text>
          <Input
            value={shipping.name ?? ''}
            onChange={(event) =>
              setShipping((current) => ({ ...current, name: event.target.value }))
            }
          />
        </label>
        <label>
          <Typography.Text>{t('orders.shipping.level')}</Typography.Text>
          <Select
            showSearch
            allowClear
            mode="tags"
            maxCount={1}
            value={shipping.level ? [shipping.level] : []}
            options={SHIPPING_LEVEL_OPTIONS.map((level) => ({ label: level, value: level }))}
            onChange={(values) =>
              setShipping((current) => ({ ...current, level: values[0] ?? null }))
            }
          />
        </label>
      </div>
    </PopupModal>
  )
}

export default OrderShippingModal
