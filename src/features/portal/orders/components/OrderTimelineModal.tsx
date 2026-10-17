import { memo, type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ArrowRightOutlined,
  CheckCircleFilled,
  ClockCircleOutlined,
  EnvironmentFilled,
  InboxOutlined,
  StopFilled,
  SwapOutlined,
  SyncOutlined,
  WarningFilled,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import { Empty, Spin } from 'antd'
import dayjs from 'dayjs'

import { modalQueryOptions } from '@/shared/query/modalQuery'
import { EmployeeAvatar, FeedbackAlert, PopupModal, type PopupModalAnchor } from '@/shared/ui'

import { listOrderItemTimeline, listOrderTimeline } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import {
  formatOrderStatusLabel,
  formatTimelineBlockerLabel,
  formatTimelineEventLabel,
} from '../pages/orderPresentation'
import styles from './OrderTimelineModal.module.scss'
import { extractTimelineBlockers } from './orderTypes'

type OrderTimelineModalProps = {
  readonly open: boolean
  readonly anchor?: PopupModalAnchor
  readonly orderId: string
  readonly orderItemId?: string
  readonly onClose: () => void
}

type TimelineFilter = 'all' | 'blockers' | 'status' | 'actors'

function getEventVisual(
  eventType: string,
  hasBlockers: boolean,
): { icon: ReactNode; className: string } {
  if (
    hasBlockers ||
    eventType.includes('BLOCKED') ||
    eventType.includes('FAILED') ||
    eventType.includes('INVALID')
  ) {
    return {
      icon: <StopFilled />,
      className: styles.iconDanger,
    }
  }

  if (eventType.includes('RESOLVED') || eventType.includes('DELIVERED')) {
    return {
      icon: <CheckCircleFilled />,
      className: styles.iconSuccess,
    }
  }

  if (eventType.includes('VALIDATED') || eventType.includes('ADDRESS')) {
    return {
      icon: <EnvironmentFilled />,
      className: styles.iconSuccess,
    }
  }

  if (eventType.includes('CASE_OPENED') || eventType.includes('NEEDS_REVIEW')) {
    return {
      icon: <WarningFilled />,
      className: styles.iconWarning,
    }
  }

  if (eventType.includes('RECHECKED')) {
    return {
      icon: <SyncOutlined />,
      className: styles.iconWarning,
    }
  }

  if (eventType.includes('STATUS_CHANGED')) {
    return {
      icon: <SwapOutlined />,
      className: styles.iconPurple,
    }
  }

  if (eventType.includes('IMPORTED')) {
    return {
      icon: <InboxOutlined />,
      className: styles.iconInfo,
    }
  }

  return {
    icon: <ClockCircleOutlined />,
    className: styles.iconInfo,
  }
}

export const OrderTimelineModal = memo(function OrderTimelineModal({
  open,
  anchor,
  orderId,
  orderItemId,
  onClose,
}: OrderTimelineModalProps) {
  const { t } = useTranslation()
  const [activeFilter, setActiveFilter] = useState<TimelineFilter>('all')

  const timeline = useQuery({
    queryKey: orderKeys.timeline(orderId, orderItemId),
    queryFn: () => (orderItemId ? listOrderItemTimeline(orderItemId) : listOrderTimeline(orderId)),
    enabled: open,
    ...modalQueryOptions,
    retry: false,
  })

  const rawItems = useMemo(() => timeline.data?.items ?? [], [timeline.data?.items])

  const counts = useMemo(() => {
    return {
      all: rawItems.length,
      blockers: rawItems.filter(
        (ev) =>
          extractTimelineBlockers(ev.metadata).length > 0 ||
          ev.eventType.includes('BLOCKED') ||
          ev.eventType.includes('FAILED'),
      ).length,
      status: rawItems.filter((ev) =>
        Boolean(ev.fromStatus || ev.toStatus || ev.eventType.includes('STATUS_CHANGED')),
      ).length,
      actors: rawItems.filter((ev) => Boolean(ev.actor?.displayName || ev.actor?.employeeCode))
        .length,
    }
  }, [rawItems])

  const filteredItems = useMemo(() => {
    return rawItems.filter((ev) => {
      if (activeFilter === 'blockers') {
        return (
          extractTimelineBlockers(ev.metadata).length > 0 ||
          ev.eventType.includes('BLOCKED') ||
          ev.eventType.includes('FAILED')
        )
      }
      if (activeFilter === 'status') {
        return Boolean(ev.fromStatus || ev.toStatus || ev.eventType.includes('STATUS_CHANGED'))
      }
      if (activeFilter === 'actors') {
        return Boolean(ev.actor?.displayName || ev.actor?.employeeCode)
      }
      return true
    })
  }, [rawItems, activeFilter])

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
          <div style={{ textAlign: 'center', padding: '32px 0' }}>
            <Spin />
          </div>
        ) : timeline.error ? (
          <FeedbackAlert type="error" title={t('orders.messages.historyLoadFailed')} />
        ) : rawItems.length > 0 ? (
          <>
            <div className={styles.filterBar}>
              <button
                type="button"
                className={`${styles.filterPill} ${activeFilter === 'all' ? styles.filterPillActive : ''}`}
                onClick={() => setActiveFilter('all')}
              >
                <span>{t('orders.history.filterAll')}</span>
                <span>({counts.all})</span>
              </button>
              {counts.blockers > 0 && (
                <button
                  type="button"
                  className={`${styles.filterPill} ${activeFilter === 'blockers' ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter('blockers')}
                >
                  <WarningFilled style={{ color: '#ff4d4f' }} />
                  <span>{t('orders.history.filterBlockers')}</span>
                  <span>({counts.blockers})</span>
                </button>
              )}
              {counts.status > 0 && (
                <button
                  type="button"
                  className={`${styles.filterPill} ${activeFilter === 'status' ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter('status')}
                >
                  <SwapOutlined style={{ color: '#722ed1' }} />
                  <span>{t('orders.history.filterStatus')}</span>
                  <span>({counts.status})</span>
                </button>
              )}
              {counts.actors > 0 && (
                <button
                  type="button"
                  className={`${styles.filterPill} ${activeFilter === 'actors' ? styles.filterPillActive : ''}`}
                  onClick={() => setActiveFilter('actors')}
                >
                  <span>{t('orders.history.filterActors')}</span>
                  <span>({counts.actors})</span>
                </button>
              )}
            </div>

            {filteredItems.length > 0 ? (
              <div className={styles.timelineStream}>
                {filteredItems.map((event) => {
                  const blockers = extractTimelineBlockers(event.metadata)
                  const visual = getEventVisual(event.eventType, blockers.length > 0)
                  const actorName = event.actor?.displayName || event.actor?.employeeCode

                  return (
                    <div className={styles.streamItem} key={event.id}>
                      <div className={`${styles.nodeIcon} ${visual.className}`}>{visual.icon}</div>
                      <div className={styles.streamCard}>
                        <div className={styles.cardTop}>
                          <span className={styles.cardTitle}>
                            {formatTimelineEventLabel(event.eventType, t)}
                          </span>
                          <span className={styles.cardTime}>
                            {event.createdAt
                              ? dayjs(event.createdAt).format('DD/MM/YYYY HH:mm')
                              : '—'}
                          </span>
                        </div>

                        {event.message && <div className={styles.cardMessage}>{event.message}</div>}

                        {(event.fromStatus || event.toStatus) && (
                          <div className={styles.statusTransition}>
                            <span className={`${styles.statePill} ${styles.stateFrom}`}>
                              {formatOrderStatusLabel(event.fromStatus, t)}
                            </span>
                            <ArrowRightOutlined className={styles.stateArrow} />
                            <span className={`${styles.statePill} ${styles.stateTo}`}>
                              {formatOrderStatusLabel(event.toStatus, t)}
                            </span>
                          </div>
                        )}

                        {blockers.length > 0 && (
                          <div className={styles.blockerAlert}>
                            <StopFilled />
                            <span>
                              <strong>{t('orders.history.blockers')}:</strong>{' '}
                              {blockers
                                .map((blocker) => formatTimelineBlockerLabel(blocker, t))
                                .join(', ')}
                            </span>
                          </div>
                        )}

                        {actorName && (
                          <div className={styles.actorRow}>
                            <EmployeeAvatar name={actorName} size={18} />
                            <span className={styles.actorName}>{actorName}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className={styles.emptyEvents}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={t('orders.history.noMatchingEvents')}
                />
              </div>
            )}
          </>
        ) : (
          <div className={styles.emptyEvents}>
            <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('orders.history.empty')} />
          </div>
        )}
      </div>
    </PopupModal>
  )
})

export default OrderTimelineModal
