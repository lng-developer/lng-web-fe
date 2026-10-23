import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BellOutlined,
  CalendarOutlined,
  CheckOutlined,
  FileTextOutlined,
  ShoppingOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Badge, Button, Popover, Skeleton, Tooltip } from 'antd'
import 'dayjs/locale/vi'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import type { AppNotification } from '@/features/notifications/api/notificationApi'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { notificationTarget } from '@/features/notifications/notificationTarget'
import { FeedbackAlert, useFeedbackToast } from '@/shared/ui'

import styles from './NotificationCenter.module.scss'

dayjs.extend(relativeTime)

function formatFacebookTime(value: string | Date | number, lang = 'vi'): string {
  const date = dayjs(value)
  if (!date.isValid()) return ''

  const now = dayjs()
  const diffSeconds = Math.max(0, now.diff(date, 'second'))
  const isVi = lang.startsWith('vi')

  if (diffSeconds < 60) {
    return isVi ? 'Vừa xong' : 'Just now'
  }

  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) {
    return isVi ? `${diffMinutes} phút trước` : `${diffMinutes}m ago`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return isVi ? `${diffHours} giờ trước` : `${diffHours}h ago`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return isVi ? `${diffDays} ngày trước` : `${diffDays}d ago`
  }

  const diffWeeks = Math.floor(diffDays / 7)
  if (diffWeeks < 5) {
    return isVi ? `${diffWeeks} tuần trước` : `${diffWeeks}w ago`
  }

  const diffMonths = Math.floor(diffDays / 30)
  if (diffMonths < 12) {
    return isVi ? `${diffMonths} tháng trước` : `${diffMonths}mo ago`
  }

  const diffYears = Math.floor(diffDays / 365)
  return isVi ? `${diffYears} năm trước` : `${diffYears}y ago`
}

const notificationIcon = (item: AppNotification) => {
  const source = `${item.type} ${item.relatedResource?.type ?? ''}`.toLowerCase()
  if (source.includes('order')) return <ShoppingOutlined />
  if (source.includes('design') || source.includes('production')) return <ToolOutlined />
  if (source.includes('leave') || source.includes('overtime') || source.includes('time')) {
    return <CalendarOutlined />
  }
  if (
    source.includes('hr') ||
    source.includes('employee') ||
    source.includes('staff') ||
    source.includes('payroll')
  ) {
    return <UserOutlined />
  }
  if (source.includes('issue') || source.includes('fail') || source.includes('error')) {
    return <WarningOutlined />
  }
  if (source.includes('file') || source.includes('asset') || source.includes('media')) {
    return <FileTextOutlined />
  }
  return <BellOutlined />
}

export function NotificationCenter() {
  const { t, i18n } = useTranslation()
  const toast = useFeedbackToast()
  const navigate = useNavigate()
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { countQuery, inboxQuery, readMutation, readAllMutation, refresh } = useNotificationCenter(
    open,
    8,
    filter === 'unread',
  )
  const mutationError = (error: Error) =>
    toast('error', t('notifications.updateFailed'), error.message)

  const isChatNotification = (item: AppNotification) => {
    const type = (item.type || '').toUpperCase()
    const resourceType = (item.relatedResource?.type || '').toLowerCase()
    return (
      type.startsWith('CHAT_') ||
      resourceType === 'chatconversation' ||
      resourceType === 'chatmessage'
    )
  }

  const unreadCount = countQuery.data?.unreadCount ?? 0
  const notifications = inboxQuery.data?.pages.flatMap((page) => page.items) ?? []
  const visibleNotifications = notifications.filter((item) => !isChatNotification(item))
  const hasMoreItems = inboxQuery.hasNextPage

  useEffect(() => {
    if (!open) return
    const closeOnPageScroll = (event: Event) => {
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', closeOnPageScroll, true)
    return () => window.removeEventListener('scroll', closeOnPageScroll, true)
  }, [open])

  const handleItemClick = (item: AppNotification) => {
    const target = notificationTarget(item)
    if (!item.readAt) {
      readMutation.mutate(item.id, {
        onSuccess: refresh,
        onError: mutationError,
      })
    }
    if (target) {
      setOpen(false)
      navigate(target)
    }
  }

  const content = (
    <div ref={contentRef} className={styles.content}>
      {/* Facebook Header */}
      <div className={styles.header}>
        <span className={styles.title}>{t('notifications.title')}</span>
        <Button
          type="link"
          size="small"
          icon={<CheckOutlined />}
          aria-label={t('notifications.markAllRead')}
          className={styles.markAllReadBtn}
          disabled={unreadCount === 0 || readAllMutation.isPending}
          loading={readAllMutation.isPending}
          onClick={() =>
            readAllMutation.mutate(undefined, {
              onSuccess: () => {
                void refresh()
              },
              onError: mutationError,
            })
          }
        >
          {t('notifications.markAllRead')}
        </Button>
      </div>

      {/* Facebook Pill Tabs */}
      <div className={styles.pills}>
        <button
          type="button"
          className={filter === 'all' ? styles.pillActive : styles.pill}
          onClick={() => setFilter('all')}
        >
          {t('notifications.all')}
        </button>
        <button
          type="button"
          className={filter === 'unread' ? styles.pillActive : styles.pill}
          onClick={() => setFilter('unread')}
        >
          {t('notifications.unread')}
          {unreadCount > 0 ? (
            <span className={styles.pillBadge}>{unreadCount > 99 ? '99+' : unreadCount}</span>
          ) : null}
        </button>
      </div>

      {/* Notification List / Loading / Empty */}
      {inboxQuery.isLoading ? (
        <div className={styles.skeletonList}>
          {[1, 2, 3].map((n) => (
            <Skeleton active avatar paragraph={{ rows: 1 }} key={n} />
          ))}
        </div>
      ) : visibleNotifications.length === 0 ? (
        <div className={styles.emptyState}>
          <BellOutlined className={styles.emptyIcon} />
          <div className={styles.emptyTitle}>
            {filter === 'unread'
              ? t('notifications.allCaughtUp', 'Tất cả đã đọc') || 'All caught up'
              : t('notifications.empty')}
          </div>
        </div>
      ) : (
        <div className={styles.list}>
          {visibleNotifications.map((item) => {
            const unread = !item.readAt
            return (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                className={unread ? styles.itemUnread : styles.item}
                onClick={() => handleItemClick(item)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleItemClick(item)
                  }
                }}
              >
                <div className={unread ? styles.avatarUnread : styles.avatar}>
                  {notificationIcon(item)}
                </div>
                <div className={styles.itemContent}>
                  <div className={unread ? styles.itemTitleUnread : styles.itemTitle}>
                    {item.title}
                  </div>
                  <p className={styles.itemMessage} title={item.message}>
                    {item.message}
                  </p>
                  <div className={styles.itemFooter}>
                    <Tooltip
                      title={dayjs(item.createdAt).format('DD/MM/YYYY HH:mm')}
                      placement="top"
                    >
                      <span className={unread ? styles.timestampUnread : styles.timestamp}>
                        {formatFacebookTime(item.createdAt, i18n.language)}
                      </span>
                    </Tooltip>
                  </div>
                </div>
                <div className={styles.itemActions}>
                  {unread ? (
                    <>
                      <Button
                        type="text"
                        shape="circle"
                        size="small"
                        className={styles.markReadBtn}
                        aria-label={t('notifications.markRead')}
                        icon={<CheckOutlined />}
                        loading={readMutation.isPending && readMutation.variables === item.id}
                        onClick={(e) => {
                          e.stopPropagation()
                          readMutation.mutate(item.id, {
                            onSuccess: refresh,
                            onError: mutationError,
                          })
                        }}
                      />
                      <span className={styles.unreadBlueDot} aria-hidden="true" />
                    </>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {inboxQuery.isError ? <FeedbackAlert type="error" title={inboxQuery.error.message} /> : null}

      {hasMoreItems ? (
        <div className={styles.footer}>
          <Button
            block
            type="link"
            loading={inboxQuery.isFetchingNextPage}
            onClick={() => void inboxQuery.fetchNextPage()}
          >
            {t('notifications.loadMore')}
          </Button>
        </div>
      ) : null}
    </div>
  )

  return (
    <Popover
      trigger="click"
      placement="bottomRight"
      open={open}
      overlayClassName={styles.popover}
      content={content}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
      }}
    >
      <Badge count={countQuery.data?.unreadCount ?? 0} size="small" overflowCount={99}>
        <Button
          type="text"
          shape="circle"
          aria-label={t('notifications.open')}
          icon={<BellOutlined />}
        />
      </Badge>
    </Popover>
  )
}
