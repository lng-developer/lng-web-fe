import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input, InputNumber, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import { displayValue, type OrderAction } from './orderTypes'

type OrderReplacementModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly items: OrderWorkbenchItem[]
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

export const OrderReplacementModal = memo(function OrderReplacementModal({
  open,
  anchor,
  items,
  pending,
  onClose,
  onAction,
}: OrderReplacementModalProps) {
  if (!open) return null

  return (
    <OrderReplacementModalInner
      anchor={anchor}
      items={items}
      pending={pending}
      onClose={onClose}
      onAction={onAction}
    />
  )
})

type OrderReplacementModalInnerProps = {
  readonly anchor?: PopupModalAnchor
  readonly items: OrderWorkbenchItem[]
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

function OrderReplacementModalInner({
  anchor,
  items,
  pending,
  onClose,
  onAction,
}: OrderReplacementModalInnerProps) {
  const { t } = useTranslation()
  const [replacementItems, setReplacementItems] = useState<Record<string, number>>({})
  const [orderReplacementReason, setOrderReplacementReason] = useState('')

  const handleOk = () => {
    onAction({
      kind: 'order-replacement',
      reason: orderReplacementReason,
      items: Object.entries(replacementItems).map(([orderItemId, selectedQuantity]) => ({
        orderItemId,
        quantity: selectedQuantity,
      })),
    })
  }

  return (
    <PopupModal
      anchor={anchor}
      width={760}
      open
      title={t('orders.actions.replaceOrder')}
      okText={t('orders.actions.createReplacement')}
      okButtonProps={{ disabled: Object.keys(replacementItems).length === 0 }}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={handleOk}
    >
      <div className={styles.replacementForm}>
        {items.map((item) => {
          const selected = replacementItems[item.item.id] !== undefined
          return (
            <div key={item.item.id} className={styles.replacementRow}>
              <Checkbox
                checked={selected}
                onChange={(event) =>
                  setReplacementItems((current) => {
                    if (event.target.checked)
                      return { ...current, [item.item.id]: item.item.quantity || 1 }
                    const next = { ...current }
                    delete next[item.item.id]
                    return next
                  })
                }
              >
                <Typography.Text strong>{displayValue(item.item.sku)}</Typography.Text>
              </Checkbox>
              <InputNumber
                min={1}
                max={item.item.quantity || 1}
                disabled={!selected}
                value={replacementItems[item.item.id] ?? item.item.quantity ?? 1}
                onChange={(nextQuantity) =>
                  setReplacementItems((current) => ({
                    ...current,
                    [item.item.id]: nextQuantity ?? 1,
                  }))
                }
              />
            </div>
          )
        })}
        <Input.TextArea
          value={orderReplacementReason}
          placeholder={t('orders.fields.replacementReason')}
          autoSize={{ minRows: 2, maxRows: 4 }}
          onChange={(event) => setOrderReplacementReason(event.target.value)}
        />
      </div>
    </PopupModal>
  )
}

export default OrderReplacementModal
