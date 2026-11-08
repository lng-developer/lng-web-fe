import { useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  BellOutlined,
  CheckOutlined,
  FileTextOutlined,
  NotificationOutlined,
  ShoppingOutlined,
  ToolOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { Avatar, Badge, Button, Empty, List, Popover, Skeleton, Typography } from 'antd'

import type { AppNotification } from '@/features/notifications/api/notificationApi'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { notificationTarget } from '@/features/notifications/notificationTarget'
import { FeedbackAlert, FormattedDateTime, useFeedbackToast } from '@/shared/ui'

import styles from './NotificationCenter.module.scss'

const notificationIconConfig = (item: AppNotification) => {
  const source = `${item.type} ${item.relatedResource?.type ?? ''}`.toLowerCase()
  if (source.includes('order')) {
    return { icon: <ShoppingOutlined />, className: styles.iconOrder }
  }
  if (source.includes('design') || source.includes('production')) {
    return { icon: <ToolOutlined />, className: styles.iconProduction }
  }
  if (
    source.includes('hr') ||
    source.includes('employee') ||
    source.includes('staff') ||
    source.includes('leave')
  ) {
    return { icon: <UserOutlined />, className: styles.iconHr }
  }
  if (
    source.includes('issue') ||
    source.includes('fail') ||
    source.includes('error') ||
    source.includes('cancel')
  ) {
    return { icon: <WarningOutlined />, className: styles.iconWarning }
  }
  if (source.includes('file') || source.includes('asset') || source.includes('media')) {
    return { icon: <FileTextOutlined />, className: styles.iconMedia }
  }
  return { icon: <NotificationOutlined />, className: styles.iconDefault }
}

function formatNotificationMessage(message: string): string {
  if (!message) return ''
  // Clean raw 24-character hexadecimal IDs (e.g. 6ad09a6a3d3775a03d8c4d59) into readable #6ad09a6a
  return message.replace(/\b([a-f0-9]{8})[a-f0-9]{16}\b/gi, '#$1')
}

const getNotificationAvatar = (item: AppNotification) => {
  const source = `${item.type} ${item.relatedResource?.type ?? ''} ${item.title}`.toLowerCase()
  if (
    source.includes('hr') ||
    source.includes('leave') ||
    source.includes('employee') ||
    source.includes('staff')
  ) {
    return {
      text: 'HR',
      style: { backgroundColor: '#fef3c7', color: '#b45309' },
    }
  }
  if (source.includes('design')) {
    return {
      text: 'DS',
      style: { backgroundColor: '#ede9fe', color: '#6d28d9' },
    }
  }
  if (source.includes('production')) {
    return {
      text: 'PR',
      style: { backgroundColor: '#dcfce7', color: '#15803d' },
    }
  }
  if (source.includes('order')) {
    return {
      text: 'OD',
      style: { backgroundColor: '#dbeafe', color: '#1d4ed8' },
    }
  }
  if (source.includes('shipment')) {
    return {
      text: 'SP',
      style: { backgroundColor: '#e0e7ff', color: '#4338ca' },
    }
  }
  if (source.includes('announcement') || source.includes('news')) {
    return {
      text: 'TB',
      style: { backgroundColor: '#fee2e2', color: '#b91c1c' },
    }
  }
  const cleanTitle = item.title.trim().replace(/^[^a-zA-Z0-9]+/, '')
  const parts = cleanTitle.split(/\s+/).filter(Boolean)
  const initials =
    parts.length > 1
      ? (parts[0][0] + parts[1][0]).toUpperCase()
      : cleanTitle.slice(0, 2).toUpperCase() || 'NT'
  return {
    text: initials,
    style: { backgroundColor: '#f1f5f9', color: '#334155' },
  }
}

function formatNotificationRelative(
  dateStr: string,
  labels: { now: string; minute: string; hour: string; day: string },
): string {
  if (!dateStr) return ''
  const diffMin = Math.max(0, Math.round((Date.now() - new Date(dateStr).getTime()) / 60000))
  if (diffMin < 1) return labels.now
  if (diffMin < 60) return `${diffMin}${labels.minute}`
  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours}${labels.hour}`
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}${labels.day}`
}

export function NotificationCenter() {
  const { t } = useTranslation()
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
  const unreadCount = countQuery.data?.unreadCount ?? 0
  const notifications = inboxQuery.data?.pages.flatMap((page) => page.items) ?? []
  const visibleNotifications = notifications
  const hasMoreItems = inboxQuery.hasNextPage

  const timeLabels = useMemo(
    () => ({
      now: t('chat.relativeTime.justNow', 'Just now'),
      minute: t('chat.relativeTime.minute', 'm'),
      hour: t('chat.relativeTime.hour', 'h'),
      day: t('chat.relativeTime.day', 'd'),
    }),
    [t],
  )

  useEffect(() => {
    if (!open) return
    const closeOnPageScroll = (event: Event) => {
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return
      setOpen(false)
    }
    window.addEventListener('scroll', closeOnPageScroll, true)
    return () => window.removeEventListener('scroll', closeOnPageScroll, true)
  }, [open])

  const content = (
    <div ref={contentRef} className={styles.content}>
      <div className={styles.header}>
        <div className={styles.headerTitleGroup}>
          <Typography.Title level={4} className={styles.title}>
            {t('notifications.title')}
          </Typography.Title>
          {unreadCount > 0 ? (
            <span className={styles.headerUnreadBadge}>
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          ) : null}
        </div>
        {unreadCount > 0 ? (
          <Button
            type="link"
            size="small"
            className={styles.markAllReadButton}
            disabled={!unreadCount}
            loading={readAllMutation.isPending}
            onClick={() =>
              readAllMutation.mutate(undefined, {
                onSuccess: () => {
                  toast('success', t('notifications.markedAllRead'))
                  void refresh()
                },
                onError: mutationError,
              })
            }
          >
            {t('notifications.markAllRead')}
          </Button>
        ) : null}
      </div>

      <div className={styles.tabs}>
        <button
          type="button"
          className={`${styles.tabPill} ${filter === 'all' ? styles.tabPillActive : ''}`}
          onClick={() => setFilter('all')}
        >
          {t('notifications.all', 'All')}
        </button>
        <button
          type="button"
          className={`${styles.tabPill} ${filter === 'unread' ? styles.tabPillActive : ''}`}
          onClick={() => setFilter('unread')}
        >
          {t('notifications.unread', 'Unread')}
          {unreadCount > 0 ? <span className={styles.tabBadge}>{unreadCount}</span> : null}
        </button>
      </div>

      {inboxQuery.isLoading ? (
        <List
          dataSource={[1, 2, 3, 4]}
          className={styles.list}
          renderItem={() => (
            <List.Item className={styles.skeletonItem}>
              <Skeleton avatar active paragraph={{ rows: 2 }} title={false} />
            </List.Item>
          )}
        />
      ) : (
        <List
          className={styles.list}
          dataSource={visibleNotifications}
          locale={{
            emptyText: (
              <div className={styles.emptyContainer}>
                <Empty
                  image={Empty.PRESENTED_IMAGE_SIMPLE}
                  description={
                    filter === 'unread'
                      ? t('notifications.markedAllRead', 'All caught up')
                      : t('notifications.empty')
                  }
                />
              </div>
            ),
          }}
          renderItem={(item) => {
            const unread = !item.readAt
            const target = notificationTarget(item)
            const iconConfig = notificationIconConfig(item)
            const avatarMeta = getNotificationAvatar(item)
            return (
              <List.Item
                className={`${styles.item} ${unread ? styles.unreadItem : ''} ${target ? styles.clickableItem : ''}`}
                role="listitem"
                onClick={() => {
                  if (target) {
                    setOpen(false)
                    navigate(target)
                  }
                }}
              >
                <div className={styles.avatarWrapper}>
                  <Avatar size={48} className={styles.notificationAvatar} style={avatarMeta.style}>
                    {avatarMeta.text}
                  </Avatar>
                  <span className={`${styles.subBadge} ${iconConfig.className}`}>
                    {iconConfig.icon}
                  </span>
                </div>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <span className={unread ? styles.itemTitleUnread : styles.itemTitle}>
                      {item.title}
                    </span>
                    {unread ? (
                      <span className={styles.unreadDot} aria-hidden="true" title="Unread" />
                    ) : null}
                  </div>
                  <div className={styles.message} title={item.message}>
                    {formatNotificationMessage(item.message)}
                  </div>
                  <div className={styles.itemFooter}>
                    <span className={`${styles.timestamp} ${unread ? styles.timestampUnread : ''}`}>
                      <span className={styles.relativeTime}>
                        {formatNotificationRelative(item.createdAt, timeLabels)}
                      </span>
                      <span className={styles.timeBullet} aria-hidden="true">
                        ·
                      </span>
                      <FormattedDateTime value={item.createdAt} />
                    </span>
                    {target ? (
                      <Button
                        type="link"
                        size="small"
                        className={styles.targetLink}
                        onClick={(event) => {
                          event.stopPropagation()
                          setOpen(false)
                          navigate(target)
                        }}
                      >
                        {t('notifications.openResource')}
                      </Button>
                    ) : null}
                  </div>
                </div>
                {unread ? (
                  <Button
                    type="text"
                    size="small"
                    shape="circle"
                    className={styles.readButton}
                    aria-label={t('notifications.markRead')}
                    icon={<CheckOutlined />}
                    title={t('notifications.markRead')}
                    loading={readMutation.isPending && readMutation.variables === item.id}
                    onClick={(event) => {
                      event.stopPropagation()
                      readMutation.mutate(item.id, {
                        onSuccess: refresh,
                        onError: mutationError,
                      })
                    }}
                  />
                ) : null}
              </List.Item>
            )
          }}
        />
      )}
      {inboxQuery.isError ? <FeedbackAlert type="error" title={inboxQuery.error.message} /> : null}
      {hasMoreItems ? (
        <div className={styles.footer}>
          <Button
            block
            type="link"
            className={styles.loadMoreButton}
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
          className={styles.headerIconButton}
          aria-label={t('notifications.open')}
          icon={<BellOutlined />}
        />
      </Badge>
    </Popover>
  )
}
