import { Component, memo, type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Skeleton } from 'antd'

import { FeedbackAlert, type PopupModalAnchor } from '@/shared/ui'

import { type OrderWorkbenchRow } from '../api/orderApi'
import type { OrderModal } from '../components/orderTypes'
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
  errorMessage: string
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
        <div className={styles.inlinePanel}>
          <FeedbackAlert type="error" title={this.props.errorMessage} />
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
      { rootMargin: '200px 0px' },
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
        <Skeleton title={false} paragraph={{ rows: 4 }} />
      )}
    </div>
  )
})

export const OrderWorkbenchExpandedRow = memo(function OrderWorkbenchExpandedRow({
  row,
  canWrite,
  canOperate,
  requestedModal,
  requestedPopupAnchor,
  onOrderModalClose,
}: OrderWorkbenchExpandedRowProps) {
  const { t } = useTranslation()
  if (!row?.order) {
    return null
  }

  return (
    <OrderRowErrorBoundary errorMessage={t('orders.detailError')}>
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
