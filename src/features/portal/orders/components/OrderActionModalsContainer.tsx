import { memo, useCallback } from 'react'
import { useTranslation } from 'react-i18next'

import { useFeedbackToast } from '@/shared/ui'

import type { OrderWorkbenchSummaryRow } from '../api/orderApi'
import { useOrderActionsMutation } from '../hooks/useOrderActionsMutation'
import { useOrderActionStore } from '../hooks/useOrderActionStore'
import { OrderAddressModal } from './OrderAddressModal'
import { OrderCaseModal } from './OrderCaseModal'
import { OrderCustomerModal } from './OrderCustomerModal'
import { OrderReplacementModal } from './OrderReplacementModal'
import { OrderShippingModal } from './OrderShippingModal'
import { OrderTimelineModal } from './OrderTimelineModal'
import type { OrderAction } from './orderTypes'

function successMessageKey(action: OrderAction) {
  switch (action.kind) {
    case 'address':
      return 'orders.messages.addressUpdated'
    case 'customer':
      return 'orders.messages.customerUpdated'
    case 'shipping':
      return 'orders.messages.shippingUpdated'
    case 'validate-address':
      return 'orders.messages.addressValidated'
    case 'override-address':
      return 'orders.messages.addressOverridden'
    case 'replacement':
      return 'orders.messages.itemReplacementCreated'
    case 'order-replacement':
      return 'orders.messages.orderReplacementCreated'
    case 'case-save':
      return action.orderCase ? 'orders.messages.caseUpdated' : 'orders.messages.caseCreated'
    case 'case-resolve':
      return 'orders.messages.caseResolved'
    case 'case-cancel':
      return 'orders.messages.caseCancelled'
    default:
      return 'orders.messages.updated'
  }
}

type OrderActionModalsContainerProps = {
  readonly orderItems: OrderWorkbenchSummaryRow[]
}

export const OrderActionModalsContainer = memo(function OrderActionModalsContainer({
  orderItems,
}: OrderActionModalsContainerProps) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()

  const orderAction = useOrderActionStore((state) => state.orderAction)
  const closeOrderModal = useOrderActionStore((state) => state.closeOrderModal)

  const activeOrderId = orderAction?.orderId
  const activeModal = orderAction?.modal
  const activeAnchor = orderAction?.anchor

  const activeRow = orderItems.find(
    (row) => row.order?.id === activeOrderId || row.order?.externalOrderId === activeOrderId,
  )

  const mutation = useOrderActionsMutation({
    orderId: activeRow?.order?.id ?? activeOrderId ?? '',
    onSuccess: (_, action) => {
      if (action.kind === 'case-comment') {
        toast('success', t('orders.messages.commentAdded'))
        return
      }
      closeOrderModal()
      toast(
        'success',
        t(successMessageKey(action), {
          orderId: activeRow?.order?.externalOrderId || activeRow?.order?.id || '',
        }),
      )
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('orders.messages.actionFailed'))
    },
  })

  const handleClose = useCallback(() => {
    closeOrderModal()
  }, [closeOrderModal])

  if (!orderAction || !activeModal || !activeRow?.order) {
    return null
  }

  return (
    <>
      <OrderAddressModal
        open={activeModal === 'address'}
        anchor={activeAnchor}
        order={activeRow.order}
        pending={mutation.isPending}
        onClose={handleClose}
        onAction={mutation.mutate}
      />

      <OrderCustomerModal
        open={activeModal === 'customer'}
        anchor={activeAnchor}
        initialBuyer={activeRow.order.buyer}
        pending={mutation.isPending}
        onClose={handleClose}
        onAction={mutation.mutate}
      />

      <OrderShippingModal
        open={activeModal === 'shipping'}
        anchor={activeAnchor}
        initialShipping={activeRow.order.shippingService}
        pending={mutation.isPending}
        onClose={handleClose}
        onAction={mutation.mutate}
      />

      <OrderCaseModal
        open={activeModal === 'case'}
        anchor={activeAnchor}
        orderId={activeRow.order.id}
        pending={mutation.isPending}
        onClose={handleClose}
        onAction={mutation.mutate}
      />

      <OrderTimelineModal
        open={activeModal === 'timeline'}
        anchor={activeAnchor}
        orderId={activeRow.order.id}
        onClose={handleClose}
      />

      <OrderReplacementModal
        open={activeModal === 'replacement'}
        anchor={activeAnchor}
        items={activeRow.items ?? []}
        pending={mutation.isPending}
        onClose={handleClose}
        onAction={mutation.mutate}
      />
    </>
  )
})
