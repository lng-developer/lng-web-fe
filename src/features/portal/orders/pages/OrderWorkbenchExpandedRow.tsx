import { Component, memo, type ReactNode, useEffect, useRef, useState } from 'react'
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

interface RowErrorBoundaryProps {
  children: ReactNode
}

interface RowErrorBoundaryState {
  hasError: boolean
}

class OrderRowErrorBoundary extends Component<RowErrorBoundaryProps, RowErrorBoundaryState> {
  override state: RowErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): RowErrorBoundaryState {
    return { hasError: true }
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('OrderRow render failed:', error, errorInfo)
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className={styles.inlinePanel} style={{ padding: '16px' }}>
          <span style={{ color: '#faad14' }}>
            Không thể hiển thị chi tiết dòng sản phẩm do dữ liệu không đồng bộ. Vui lòng tải lại
            trang.
          </span>
        </div>
      )
    }
    return this.props.children
  }
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
  const orderId = row?.order?.id
  const storeAction = useOrderActionStore((state) =>
    orderId && state.orderAction?.orderId === orderId ? state.orderAction : undefined,
  )
  const storeClose = useOrderActionStore((state) => state.closeOrderModal)

  const requestedModal = propModal ?? storeAction?.modal
  const requestedPopupAnchor = propAnchor ?? storeAction?.anchor
  const onOrderModalClose = propOnClose ?? storeClose

  if (!row?.order) {
    return null
  }

  return (
    <OrderRowErrorBoundary>
      <LazyOrderDetail
        row={row}
        canWrite={canWrite}
        canOperate={canOperate}
        requestedModal={requestedModal}
        requestedPopupAnchor={requestedPopupAnchor}
        onOrderModalClose={onOrderModalClose}
      />
    </OrderRowErrorBoundary>
  )
})

export default OrderWorkbenchExpandedRow
