import { Component, memo, type ReactNode, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Button, Skeleton } from 'antd'

import { FeedbackAlert, type PopupModalAnchor } from '@/shared/ui'

import type { OrderWorkbenchSummaryRow } from '../api/orderApi'
import type { OrderModal } from '../components/orderTypes'
import {
  ORDER_WORKBENCH_DETAIL_BATCH_SIZE,
  useOrderWorkbenchDetailsQuery,
} from '../hooks/useOrderWorkbenchQuery'
import { OrderInlinePanel } from './OrderInlinePanel'
import styles from './OrderWorkbenchPage.module.scss'

type OrderWorkbenchExpandedRowProps = {
  readonly row: OrderWorkbenchSummaryRow
  readonly index?: number
  readonly detailIds: readonly string[]
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
  index,
  detailIds,
  canWrite,
  canOperate,
  requestedModal,
  requestedPopupAnchor,
  onOrderModalClose,
}: OrderWorkbenchExpandedRowProps) {
  const { t } = useTranslation()
  const elementRef = useRef<HTMLDivElement>(null)
  const isAboveTheFold = typeof index === 'number' && index < ORDER_WORKBENCH_DETAIL_BATCH_SIZE
  const [hasEnteredViewport, setHasEnteredViewport] = useState(false)
  const visible =
    isAboveTheFold || hasEnteredViewport || typeof IntersectionObserver === 'undefined'
  const details = useOrderWorkbenchDetailsQuery(detailIds, visible)
  const detailRow = details.data?.items.find((detail) => detail.order.id === row.order.id)

  useEffect(() => {
    if (visible || !elementRef.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return
        setHasEnteredViewport(true)
        observer.disconnect()
      },
      { rootMargin: '200px 0px' },
    )
    observer.observe(elementRef.current)
    return () => observer.disconnect()
  }, [visible])

  return (
    <div ref={elementRef} className={styles.lazyOrderDetail}>
      {visible && detailRow ? (
        <OrderInlinePanel
          row={detailRow}
          canWrite={canWrite}
          canOperate={canOperate}
          requestedModal={requestedModal}
          requestedPopupAnchor={requestedPopupAnchor}
          onOrderModalClose={onOrderModalClose}
        />
      ) : visible && (details.isError || details.isSuccess) ? (
        <div className={styles.inlinePanel}>
          <FeedbackAlert
            type="error"
            title={t('orders.detailError')}
            action={
              <Button type="link" onClick={() => void details.refetch()}>
                {t('orders.actions.retry')}
              </Button>
            }
          />
        </div>
      ) : (
        <Skeleton active={visible && details.isFetching} title={false} paragraph={{ rows: 4 }} />
      )}
    </div>
  )
})

export const OrderWorkbenchExpandedRow = memo(function OrderWorkbenchExpandedRow({
  row,
  index,
  detailIds,
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
        index={index}
        detailIds={detailIds}
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
