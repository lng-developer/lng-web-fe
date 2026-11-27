import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Checkbox, Descriptions, Input, InputNumber, Typography } from 'antd'

import { CopyableSku, PopupModal, type PopupModalAnchor } from '@/shared/ui'

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
      confirmation={confirmation}
      anchor={anchor}
      pending={pending}
      onClose={onClose}
      onConfirm={onConfirm}
    />
  )
})

type OrderItemConfirmationModalInnerProps = {
  readonly confirmation: OrderItemConfirmation
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
  const [quantity, setQuantity] = useState(
    confirmation.quantity ?? confirmation.item.item?.quantity ?? 1,
  )
  const [requireRework, setRequireRework] = useState(false)

  const isQuantity = confirmation.kind === 'quantity'
  const quantityInvalid =
    !Number.isSafeInteger(quantity) ||
    quantity < 1 ||
    quantity > 9999 ||
    quantity === confirmation.item.item?.quantity
  const quantitySaveDisabled =
    isQuantity && (quantityInvalid || !reason.trim() || reason.trim().length > 1000)
  const isCancel = confirmation.kind === 'cancel'
  const isVendorRematch = confirmation.kind === 'vendor-rematch-recovery'

  const handleOk = () => {
    if (quantitySaveDisabled || pending) return
    const itemId = confirmation.item.item?.id ?? ''
    if (isQuantity) {
      onConfirm({
        kind: 'quantity',
        itemId,
        quantity,
        expectedQuantity: confirmation.item.item.quantity,
        reason: reason.trim(),
      })
    } else if (isCancel || isVendorRematch) {
      onConfirm({
        kind: isVendorRematch ? 'vendor-rematch-recovery' : 'cancel',
        itemId,
        reason: reason.trim(),
        ...(isVendorRematch ? { requireRework } : {}),
      })
    } else {
      onConfirm({
        kind: 'replacement',
        itemId,
        reason: reason.trim(),
        quantity,
      })
    }
  }

  return (
    <PopupModal
      anchor={anchor}
      open={Boolean(confirmation)}
      title={
        isQuantity
          ? t('orders.quantityEdit.title')
          : isVendorRematch
            ? 'Reset vendor matching'
            : t(isCancel ? 'orders.actions.cancelItem' : 'orders.actions.createReplacement')
      }
      okButtonProps={{
        disabled:
          pending || quantitySaveDisabled || ((isCancel || isVendorRematch) && !reason.trim()),
      }}
      confirmLoading={pending}
      onCancel={onClose}
      onOk={handleOk}
    >
      <div className={styles.modalForm}>
        {isQuantity ? (
          <Typography.Paragraph>{t('orders.quantityEdit.description')}</Typography.Paragraph>
        ) : null}
        <Descriptions
          size="small"
          column={1}
          items={[
            {
              key: 'sku',
              label: 'SKU',
              children: <CopyableSku value={confirmation.item.item?.sku ?? ''} fallback="—" />,
            },
            {
              key: 'seller',
              label: t('orders.fields.seller'),
              children: displayValue(confirmation.item.seller?.employeeCode),
            },
          ]}
        />
        <label>
          <Typography.Text>{t('orders.fields.reason')}</Typography.Text>
          <Input.TextArea
            aria-label={t('orders.fields.reason')}
            maxLength={isQuantity ? 1000 : undefined}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </label>
        {isVendorRematch ? (
          <>
            <Checkbox checked={requireRework} onChange={(e) => setRequireRework(e.target.checked)}>
              {t('orders.vendorRematch.requireRework')}
            </Checkbox>
            <Typography.Text type={requireRework ? 'danger' : 'warning'}>
              {requireRework
                ? t('orders.vendorRematch.requireReworkDescription')
                : t('orders.vendorRematch.keepScaleDescription')}
            </Typography.Text>
          </>
        ) : null}
        {confirmation.kind === 'replacement' || isQuantity ? (
          <label>
            <Typography.Text>{t('orders.fields.quantity')}</Typography.Text>
            <InputNumber
              aria-label={t('orders.fields.quantity')}
              min={1}
              precision={0}
              max={isQuantity ? 9999 : confirmation.item.item?.quantity || 1}
              value={quantity}
              onChange={(next) => setQuantity(next ?? (isQuantity ? 0 : 1))}
            />
          </label>
        ) : null}
      </div>
    </PopupModal>
  )
}

export default OrderItemConfirmationModal
