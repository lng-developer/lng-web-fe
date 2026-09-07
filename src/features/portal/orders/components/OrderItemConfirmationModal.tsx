import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Descriptions, Input, InputNumber, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor } from '@/shared/ui'

import styles from '../pages/OrderWorkbenchPage.module.scss'
import { displayValue, type OrderAction, type OrderItemConfirmation } from './orderTypes'

type OrderItemConfirmationModalProps = {
  readonly confirmation?: OrderItemConfirmation
  readonly anchor?: PopupModalAnchor
  readonly pending: boolean
  readonly onClose: () => void
  readonly onConfirm: (action: OrderAction) => void
}

export const OrderItemConfirmationModal = memo(function OrderItemConfirmationModal({
  confirmation,
  anchor,
  pending,
  onClose,
  onConfirm,
}: OrderItemConfirmationModalProps) {
  if (!confirmation) return null

  return (
    <OrderItemConfirmationModalInner
      key={`${confirmation.kind}-${confirmation.item.item.id}`}
      confirmation={confirmation}
      anchor={anchor}
      pending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
})

type OrderItemConfirmationModalInnerProps = {
  readonly confirmation: NonNullable<OrderItemConfirmationModalProps['confirmation']>
  readonly anchor?: PopupModalAnchor
  readonly pending: boolean
  readonly onClose: () => void
  readonly onConfirm: (action: OrderAction) => void
}

function OrderItemConfirmationModalInner({
  confirmation,
  anchor,
  pending,
  onClose,
  onConfirm,
}: OrderItemConfirmationModalInnerProps) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [quantity, setQuantity] = useState(confirmation.item.item.quantity || 1)

  const isCancel = confirmation.kind === 'cancel'

  const handleOk = () => {
    if (isCancel) {
      onConfirm({
        kind: 'cancel',
        itemId: confirmation.item.item.id,
        reason: reason.trim(),
      })
    } else {
      onConfirm({
        kind: 'replacement',
        itemId: confirmation.item.item.id,
        reason: reason.trim(),
        quantity,
      })
    }
  }

  return (
    <PopupModal
      centered
      anchor={anchor}
      open={Boolean(confirmation)}
      title={t(isCancel ? 'orders.actions.cancelItem' : 'orders.actions.createReplacement')}
      okButtonProps={{ disabled: isCancel && !reason.trim() }}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={handleOk}
    >
      <div className={styles.modalForm}>
        <Descriptions
          size="small"
          column={1}
          items={[
            { key: 'sku', label: 'SKU', children: displayValue(confirmation.item.item.sku) },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children: displayValue(confirmation.item.seller?.employeeCode),
            },
          ]}
        />
        <label>
          <Typography.Text>{t('orders.fields.reason')}</Typography.Text>
          <Input.TextArea value={reason} onChange={(event) => setReason(event.target.value)} />
        </label>
        {!isCancel ? (
          <label>
            <Typography.Text>{t('orders.fields.quantity')}</Typography.Text>
            <InputNumber min={1} value={quantity} onChange={(next) => setQuantity(next ?? 1)} />
          </label>
        ) : null}
      </div>
    </PopupModal>
  )
}

export default OrderItemConfirmationModal
