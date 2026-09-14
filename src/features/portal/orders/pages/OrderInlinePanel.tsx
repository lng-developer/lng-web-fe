import { memo, type MouseEvent, useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'

import {
  getPopupAnchorFromMouseEvent,
  InteractiveImageViewerModal,
  type PopupModalAnchor,
  useFeedbackToast,
} from '@/shared/ui'

import type { OrderWorkbenchItem, OrderWorkbenchRow } from '../api/orderApi'
import { OrderAddressModal } from '../components/OrderAddressModal'
import { OrderCaseModal } from '../components/OrderCaseModal'
import { OrderCustomerModal } from '../components/OrderCustomerModal'
import { OrderItemConfirmationModal } from '../components/OrderItemConfirmationModal'
import { OrderItemPanel } from '../components/OrderItemPanel'
import { OrderReplacementModal } from '../components/OrderReplacementModal'
import { OrderShippingModal } from '../components/OrderShippingModal'
import { OrderTimelineModal } from '../components/OrderTimelineModal'
import type { OrderItemConfirmation, OrderModal } from '../components/orderTypes'
import { useOrderActionsMutation } from '../hooks/useOrderActionsMutation'
import styles from './OrderWorkbenchPage.module.scss'

function isReadyMappingPlan(result: unknown) {
  if (!result || typeof result !== 'object') return false
  const plan = result as {
    status?: string
    vendorProduct?: { id?: string | null } | null
    vendorCostCenter?: { id?: string | null } | null
  }
  return (
    plan.status === 'READY' && Boolean(plan.vendorProduct?.id) && Boolean(plan.vendorCostCenter?.id)
  )
}

function isProductionBlockedByOpenCase(result: unknown) {
  if (!result || typeof result !== 'object') return false
  const task = result as { status?: string; blockers?: string[] }
  return task.status === 'BLOCKED' && task.blockers?.includes('OPEN_CASE')
}

type OrderInlinePanelProps = {
  readonly row: OrderWorkbenchRow
  readonly canWrite: boolean
  readonly canOperate?: boolean
  readonly requestedModal?: OrderModal
  readonly requestedPopupAnchor?: PopupModalAnchor
  readonly onOrderModalClose?: () => void
}

export const OrderInlinePanel = memo(function OrderInlinePanel({
  row,
  canWrite,
  canOperate = canWrite,
  requestedModal,
  requestedPopupAnchor,
  onOrderModalClose,
}: OrderInlinePanelProps) {
  const { t } = useTranslation()
  const toast = useFeedbackToast()

  const [confirmation, setConfirmation] = useState<OrderItemConfirmation>()
  const [confirmationAnchor, setConfirmationAnchor] = useState<PopupModalAnchor>()
  const [itemTimelineId, setItemTimelineId] = useState<string>()
  const [itemTimelineAnchor, setItemTimelineAnchor] = useState<PopupModalAnchor>()
  const [imageViewer, setImageViewer] = useState<string>()
  const [imageViewerAnchor, setImageViewerAnchor] = useState<PopupModalAnchor>()
  const [imageViewerList, setImageViewerList] = useState<string[]>([])

  const closeOrderModal = useCallback(() => {
    onOrderModalClose?.()
  }, [onOrderModalClose])

  const mutation = useOrderActionsMutation({
    orderId: row.order.id,
    onSuccess: (result, action) => {
      if (action.kind === 'case-comment') {
        toast('success', t('orders.messages.commentAdded'))
        return
      }
      closeOrderModal()
      setConfirmation(undefined)
      setConfirmationAnchor(undefined)
      if (action.kind === 'recheck-mapping') {
        toast(
          isReadyMappingPlan(result) ? 'success' : 'warning',
          t(
            isReadyMappingPlan(result)
              ? 'orders.messages.mappingMatched'
              : 'orders.messages.mappingStillBlocked',
          ),
        )
        return
      }
      if (action.kind === 'recheck-production' && isProductionBlockedByOpenCase(result)) {
        toast('warning', t('orders.messages.productionBlockedOpenCase'))
        return
      }
      toast('success', t('orders.messages.updated'))
    },
    onError: (error) => {
      toast('error', error instanceof Error ? error.message : t('orders.messages.actionFailed'))
    },
  })

  const openConfirmation = useCallback(
    (target: EventTarget | null, kind: OrderItemConfirmation['kind'], item: OrderWorkbenchItem) => {
      setConfirmation({ kind, item })
      const rect = target instanceof Element ? target.getBoundingClientRect() : undefined
      setConfirmationAnchor(
        rect
          ? {
              x: rect.left + rect.width / 2,
              y: rect.top + rect.height / 2,
              width: rect.width,
              height: rect.height,
            }
          : undefined,
      )
    },
    [],
  )

  const closeConfirmation = useCallback(() => {
    setConfirmation(undefined)
    setConfirmationAnchor(undefined)
  }, [])

  const openTimelineForItem = useCallback((event: MouseEvent<HTMLElement>, itemId: string) => {
    setItemTimelineId(itemId)
    setItemTimelineAnchor(getPopupAnchorFromMouseEvent(event))
  }, [])

  const closeTimeline = useCallback(() => {
    setItemTimelineId(undefined)
    setItemTimelineAnchor(undefined)
    closeOrderModal()
  }, [closeOrderModal])

  const openImageViewer = useCallback(
    (event: MouseEvent<HTMLElement>, url?: string | null, images: string[] = []) => {
      if (!url) return
      setImageViewer(url)
      setImageViewerList(images)
      setImageViewerAnchor(getPopupAnchorFromMouseEvent(event))
    },
    [],
  )

  const closeImageViewer = useCallback(() => {
    setImageViewer(undefined)
    setImageViewerAnchor(undefined)
  }, [])

  return (
    <div className={styles.inlinePanel}>
      {row.items.map((item) => (
        <OrderItemPanel
          key={item.item.id}
          item={item}
          canWrite={canWrite}
          canOperate={canOperate}
          pending={mutation.isPending}
          onAction={mutation.mutate}
          onConfirm={openConfirmation}
          onHistory={openTimelineForItem}
          onOpenImageViewer={openImageViewer}
        />
      ))}

      <OrderAddressModal
        open={requestedModal === 'address'}
        anchor={requestedPopupAnchor}
        order={row.order}
        pending={mutation.isPending}
        onClose={closeOrderModal}
        onAction={mutation.mutate}
      />

      <OrderCustomerModal
        open={requestedModal === 'customer'}
        anchor={requestedPopupAnchor}
        initialBuyer={row.order.buyer}
        pending={mutation.isPending}
        onClose={closeOrderModal}
        onAction={mutation.mutate}
      />

      <OrderShippingModal
        open={requestedModal === 'shipping'}
        anchor={requestedPopupAnchor}
        initialShipping={row.order.shippingService}
        pending={mutation.isPending}
        onClose={closeOrderModal}
        onAction={mutation.mutate}
      />

      <OrderCaseModal
        open={requestedModal === 'case'}
        anchor={requestedPopupAnchor}
        orderId={row.order.id}
        pending={mutation.isPending}
        onClose={closeOrderModal}
        onAction={mutation.mutate}
      />

      {requestedModal === 'timeline' || itemTimelineId ? (
        <OrderTimelineModal
          open
          anchor={itemTimelineId ? itemTimelineAnchor : requestedPopupAnchor}
          orderId={row.order.id}
          orderItemId={itemTimelineId}
          onClose={closeTimeline}
        />
      ) : null}

      <OrderReplacementModal
        open={requestedModal === 'replacement'}
        anchor={requestedPopupAnchor}
        items={row.items}
        pending={mutation.isPending}
        onClose={closeOrderModal}
        onAction={mutation.mutate}
      />

      <OrderItemConfirmationModal
        confirmation={confirmation}
        anchor={confirmationAnchor}
        pending={mutation.isPending}
        onClose={closeConfirmation}
        onConfirm={mutation.mutate}
      />

      <InteractiveImageViewerModal
        open={Boolean(imageViewer)}
        anchor={imageViewerAnchor}
        imageUrl={imageViewer}
        images={imageViewerList}
        onClose={closeImageViewer}
        onSelectImage={setImageViewer}
      />
    </div>
  )
})

export default OrderInlinePanel
