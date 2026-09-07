import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Input, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor } from '@/shared/ui'

import type { OrderBuyer } from '../api/orderApi'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import type { OrderAction } from './orderTypes'

const CUSTOMER_FIELDS = ['name', 'emailMasked', 'phoneMasked', 'externalBuyerId'] as const

type OrderCustomerModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly initialBuyer: OrderBuyer
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

export const OrderCustomerModal = memo(function OrderCustomerModal({
  open,
  anchor,
  initialBuyer,
  pending,
  onClose,
  onAction,
}: OrderCustomerModalProps) {
  if (!open) return null

  return (
    <OrderCustomerModalInner
      anchor={anchor}
      initialBuyer={initialBuyer}
      pending={pending}
      onClose={onClose}
      onAction={onAction}
    />
  )
})

type OrderCustomerModalInnerProps = {
  readonly anchor?: PopupModalAnchor
  readonly initialBuyer: OrderBuyer
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

function OrderCustomerModalInner({
  anchor,
  initialBuyer,
  pending,
  onClose,
  onAction,
}: OrderCustomerModalInnerProps) {
  const { t } = useTranslation()
  const [buyer, setBuyer] = useState<OrderBuyer>(initialBuyer)

  return (
    <PopupModal
      centered
      anchor={anchor}
      width={680}
      open
      title={t('orders.actions.editCustomer')}
      okText={t('orders.actions.saveCustomer')}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={() => onAction({ kind: 'customer', buyer })}
    >
      <div className={styles.customerEditor}>
        {CUSTOMER_FIELDS.map((field) => (
          <label key={field}>
            <Typography.Text>{t(`orders.customer.${field}`)}</Typography.Text>
            <Input
              value={buyer[field] ?? ''}
              onChange={(event) =>
                setBuyer((current) => ({ ...current, [field]: event.target.value }))
              }
            />
          </label>
        ))}
      </div>
    </PopupModal>
  )
}

export default OrderCustomerModal
