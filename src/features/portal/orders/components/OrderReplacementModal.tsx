import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Input, InputNumber } from 'antd'

import { CopyableSku, PopupModal, type PopupModalAnchor } from '@/shared/ui'

import type { OrderWorkbenchItem } from '../api/orderApi'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import type { OrderAction } from './orderTypes'

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

  const validItems = (items ?? []).filter((item) => Boolean(item?.item?.id))

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
        {validItems.map((item) => {
          const itemId = item.item?.id ?? ''
          const selected = replacementItems[itemId] !== undefined
          const maxQuantity = item.item?.quantity || 1
          return (
            <div key={itemId} className={styles.replacementRow}>
              <Checkbox
                checked={selected}
                onChange={(event) =>
                  setReplacementItems((current) => {
                    if (event.target.checked) return { ...current, [itemId]: maxQuantity }
                    const next = { ...current }
                    delete next[itemId]
                    return next
                  })
                }
              >
                <CopyableSku value={item.item?.sku ?? ''} strong />
              </Checkbox>
              <InputNumber
                min={1}
                max={maxQuantity}
                disabled={!selected}
                value={replacementItems[itemId] ?? maxQuantity}
                onChange={(nextQuantity) =>
                  setReplacementItems((current) => ({
                    ...current,
                    [itemId]: nextQuantity ?? 1,
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
