import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import { Space, Spin, Timeline, Typography } from 'antd'
import dayjs from 'dayjs'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { FeedbackAlert, PopupModal, type PopupModalAnchor } from '@/shared/ui'

import { listOrderItemTimeline, listOrderTimeline } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import {
  formatOrderStatusLabel,
  formatTimelineBlockerLabel,
  formatTimelineEventLabel,
} from '../pages/orderPresentation'
import styles from '../pages/OrderWorkbenchPage.module.scss'
import { extractTimelineBlockers } from './orderTypes'

type OrderTimelineModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly orderId: string
  readonly orderItemId?: string
  readonly onClose: () => void
}

export const OrderTimelineModal = memo(function OrderTimelineModal({
  open,
  anchor,
  orderId,
  orderItemId,
  onClose,
}: OrderTimelineModalProps) {
  const { t } = useTranslation()

  const timeline = useQuery({
    queryKey: orderKeys.timeline(orderId, orderItemId),
    queryFn: () => (orderItemId ? listOrderItemTimeline(orderItemId) : listOrderTimeline(orderId)),
    enabled: open,
    ...modalQueryOptions,
    retry: false,
  })

  if (!open) return null

  return (
    <PopupModal
      anchor={anchor}
      width={720}
      open={open}
      footer={null}
      title={t(orderItemId ? 'orders.history.itemTitle' : 'orders.history.orderTitle')}
      onCancel={onClose}
    >
      <div className={styles.historyScroll}>
        {timeline.isLoading ? (
          <Spin />
        ) : timeline.error ? (
          <FeedbackAlert type="error" title={t('orders.messages.historyLoadFailed')} />
        ) : timeline.data?.items.length ? (
          <Timeline
            items={timeline.data.items.map((event) => ({
              children: (
                <div className={styles.historyEntry}>
                  <Space wrap>
                    <Typography.Text strong>
                      {formatTimelineEventLabel(event.eventType, t)}
                    </Typography.Text>
                    <Typography.Text type="secondary">
                      {event.createdAt ? dayjs(event.createdAt).format('DD/MM/YYYY HH:mm') : '—'}
                    </Typography.Text>
                  </Space>
                  {event.message ? <Typography.Text>{event.message}</Typography.Text> : null}
                  {event.fromStatus || event.toStatus ? (
                    <Typography.Text type="secondary">
                      {formatOrderStatusLabel(event.fromStatus, t)} →{' '}
                      {formatOrderStatusLabel(event.toStatus, t)}
                    </Typography.Text>
                  ) : null}
                  {extractTimelineBlockers(event.metadata).length ? (
                    <Typography.Text type="danger">
                      {t('orders.history.blockers')}:{' '}
                      {extractTimelineBlockers(event.metadata)
                        .map((blocker) => formatTimelineBlockerLabel(blocker, t))
                        .join(', ')}
                    </Typography.Text>
                  ) : null}
                  {event.actor ? (
                    <Typography.Text type="secondary">
                      {event.actor.displayName || event.actor.employeeCode}
                    </Typography.Text>
                  ) : null}
                </div>
              ),
            }))}
          />
        ) : (
          <Typography.Text type="secondary">{t('orders.history.empty')}</Typography.Text>
        )}
      </div>
    </PopupModal>
  )
})

export default OrderTimelineModal
