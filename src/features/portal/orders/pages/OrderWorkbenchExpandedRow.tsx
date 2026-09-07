import { memo, useEffect, useRef, useState } from 'react'
import { Skeleton } from 'antd'

import { type PopupModalAnchor } from '@/shared/ui'

import { type OrderWorkbenchRow } from '../api/orderApi'
import type { OrderModal } from '../components/orderTypes'
import { useOrderActionStore } from '../hooks/useOrderActionStore'
import { OrderInlinePanel } from './OrderInlinePanel'
import styles from './OrderWorkbenchPage.module.scss'

type OrderWorkbenchExpandedRowProps = {
  readonly row: OrderWorkbenchRow
  readonly canWrite: boolean
  readonly canOperate: boolean
  readonly requestedModal?: OrderModal
  readonly requestedPopupAnchor?: PopupModalAnchor
  readonly onOrderModalClose?: () => void
}

const LazyOrderDetail = memo(function LazyOrderDetail({
  row,
  canWrite,
  canOperate,
  requestedModal,
  requestedPopupAnchor,
  onOrderModalClose,
}: OrderWorkbenchExpandedRowProps) {
  const elementRef = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(() => typeof IntersectionObserver === 'undefined')

  useEffect(() => {
    if (visible || !elementRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setVisible(true)
        observer.disconnect()
      },
      { rootMargin: '600px 0px' },
    )
    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={elementRef} className={styles.lazyOrderDetail}>
      {visible ? (
        <OrderInlinePanel
          row={row}
          canWrite={canWrite}
          canOperate={canOperate}
          requestedModal={requestedModal}
          requestedPopupAnchor={requestedPopupAnchor}
          onOrderModalClose={onOrderModalClose}
        />
      ) : (
        <Skeleton active title={false} paragraph={{ rows: 4 }} />
      )}
    </div>
  )
})

export const OrderWorkbenchExpandedRow = memo(function OrderWorkbenchExpandedRow({
  row,
  canWrite,
  canOperate,
  requestedModal: propModal,
  requestedPopupAnchor: propAnchor,
  onOrderModalClose: propOnClose,
}: OrderWorkbenchExpandedRowProps) {
  const storeAction = useOrderActionStore((state) =>
    state.orderAction?.orderId === row.order.id ? state.orderAction : undefined,
  )
  const storeClose = useOrderActionStore((state) => state.closeOrderModal)

  const requestedModal = propModal ?? storeAction?.modal
  const requestedPopupAnchor = propAnchor ?? storeAction?.anchor
  const onOrderModalClose = propOnClose ?? storeClose

  return (
    <LazyOrderDetail
      row={row}
      canWrite={canWrite}
      canOperate={canOperate}
      requestedModal={requestedModal}
      requestedPopupAnchor={requestedPopupAnchor}
      onOrderModalClose={onOrderModalClose}
    />
  )
})

export default OrderWorkbenchExpandedRow
