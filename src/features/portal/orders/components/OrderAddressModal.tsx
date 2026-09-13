import { memo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { CheckCircleOutlined } from '@ant-design/icons'
import { Button, Input, Modal, Typography } from 'antd'

import { PopupModal, type PopupModalAnchor, StatusTag } from '@/shared/ui'

import type { OrderWorkbenchRow, ShippingAddress } from '../api/orderApi'
import { orderStatusTone } from '../pages/orderPresentation'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import { displayValue, type OrderAction } from './orderTypes'

const ADDRESS_FIELDS: Array<keyof ShippingAddress> = [
  'name',
  'company',
  'addressLine1',
  'addressLine2',
  'city',
  'stateOrProvinceCode',
  'postalCode',
  'countryCode',
  'phoneMasked',
]

type OrderAddressModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly order: OrderWorkbenchRow['order']
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

export const OrderAddressModal = memo(function OrderAddressModal({
  open,
  anchor,
  order,
  pending,
  onClose,
  onAction,
}: OrderAddressModalProps) {
  if (!open) return null

  return (
    <OrderAddressModalInner
      key={order.id}
      anchor={anchor}
      order={order}
      pending={pending}
      onClose={onClose}
      onAction={onAction}
    />
  )
})

type OrderAddressModalInnerProps = {
  readonly anchor?: PopupModalAnchor
  readonly order: OrderWorkbenchRow['order']
  readonly pending: boolean
  readonly onClose: () => void
  readonly onAction: (action: OrderAction) => void
}

function OrderAddressModalInner({
  anchor,
  order,
  pending,
  onClose,
  onAction,
}: OrderAddressModalInnerProps) {
  const { t } = useTranslation()
  const [address, setAddress] = useState<ShippingAddress>(order.shippingAddress)
  const [overrideReasonOpen, setOverrideReasonOpen] = useState(false)
  const [overrideReason, setOverrideReason] = useState('')

  return (
    <>
      <PopupModal
        anchor={anchor}
        width={920}
        open
        title={t('orders.actions.editAddress')}
        okText={t('orders.actions.saveAddress')}
        confirmLoading={pending}
        onCancel={onClose}
        onOk={() => onAction({ kind: 'address', address })}
      >
        <div className={styles.modalToolbar}>
          <StatusTag status={orderStatusTone(order.addressValidationStatus)}>
            {displayValue(order.addressValidationStatus)}
          </StatusTag>
          <Button
            icon={<CheckCircleOutlined />}
            loading={pending}
            onClick={() => onAction({ kind: 'validate-address' })}
          >
            {t('orders.actions.validateAddress')}
          </Button>
          <Button loading={pending} onClick={() => setOverrideReasonOpen(true)}>
            {t('orders.actions.overrideAddress')}
          </Button>
        </div>
        <div className={styles.addressEditor}>
          {ADDRESS_FIELDS.map((field) => (
            <label key={field}>
              <Typography.Text type="secondary">{t(`orders.address.${field}`)}</Typography.Text>
              <Input
                value={address[field] ?? ''}
                onChange={(event) =>
                  setAddress((current) => ({ ...current, [field]: event.target.value }))
                }
              />
            </label>
          ))}
        </div>
      </PopupModal>

      <Modal
        open={overrideReasonOpen}
        title={t('orders.actions.overrideAddress')}
        okText={t('orders.actions.overrideAddress')}
        confirmLoading={pending}
        onCancel={() => setOverrideReasonOpen(false)}
        onOk={() => {
          onAction({
            kind: 'override-address',
            reason: overrideReason.trim() || undefined,
          })
          setOverrideReasonOpen(false)
        }}
      >
        <Input.TextArea
          rows={4}
          value={overrideReason}
          placeholder={t('orders.actions.overrideAddressReason')}
          onChange={(event) => setOverrideReason(event.target.value)}
        />
      </Modal>
    </>
  )
}

export default OrderAddressModal
