import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Avatar, Badge, Button, Empty, List, Popover, Segmented, Skeleton, Typography } from 'antd'

import type { AppNotification } from '@/features/notifications/api/notificationApi'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { useFeedbackToast } from '@/shared/ui'

import styles from './NotificationCenter.module.scss'

const notificationIcon = (item: AppNotification) => {
  const source = `${item.type} ${item.relatedResource?.type ?? ''}`.toLowerCase()
  if (source.includes('order')) return <ShoppingOutlined />
  if (source.includes('design') || source.includes('production')) return <ToolOutlined />
  if (source.includes('hr') || source.includes('employee') || source.includes('staff')) {
    return <UserOutlined />
  }
  if (source.includes('issue') || source.includes('fail') || source.includes('error')) {
    return <WarningOutlined />
  }
  if (source.includes('file') || source.includes('asset') || source.includes('media')) {
    return <FileTextOutlined />
  }
  return <NotificationOutlined />
}

const relativeTime = (value: string) => {
  const diff = Date.now() - new Date(value).getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (diff < minute) return '<1m'
  if (diff < hour) return `${Math.floor(diff / minute)}m`
  if (diff < day) return `${Math.floor(diff / hour)}h`
  if (diff < 7 * day) return `${Math.floor(diff / day)}d`
  return new Date(value).toLocaleDateString()
}

export function NotificationCenter() {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(8)
  const [filter, setFilter] = useState<'all' | 'unread'>('all')
  const { countQuery, inboxQuery, readMutation, readAllMutation, refresh } = useNotificationCenter(
    open,
    limit,
  )
  const mutationError = (error: Error) =>
    toast('error', t('notifications.updateFailed'), error.message)
  const unreadCount = countQuery.data?.unreadCount ?? 0
  const notifications = inboxQuery.data?.items ?? []
  const visibleNotifications =
    filter === 'unread' ? notifications.filter((item) => !item.readAt) : notifications
  const hasMoreItems = (inboxQuery.data?.pagination.total ?? 0) > (notifications.length ?? 0)

  useEffect(() => {
    if (!open) return
    const closeOnPageScroll = (event: Event) => {
      if (event.target instanceof Node && contentRef.current?.contains(event.target)) return
      setOpen(false)
      setLimit(8)
    }
    window.addEventListener('scroll', closeOnPageScroll, true)
    return () => window.removeEventListener('scroll', closeOnPageScroll, true)
  }, [open])

  const content = (
    <div ref={contentRef} className={styles.content}>
      <div className={styles.header}>
        <div>
          <Typography.Text strong className={styles.title}>
            {t('notifications.title')}
          </Typography.Text>
          {unreadCount > 0 ? (
            <Typography.Text type="secondary" className={styles.subtitle}>
              <strong>{unreadCount}</strong> {t('notifications.unread')}
            </Typography.Text>
          ) : (
            <Typography.Text type="secondary" className={styles.subtitle}>
              {t('notifications.empty', 'All caught up')}
            </Typography.Text>
          )}
        </div>
        <Button
          type="link"
          size="small"
          className={styles.linkButton}
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
      </div>
      <div className={styles.tabs}>
        <Segmented
          size="small"
          value={filter}
          onChange={(value) => setFilter(value as 'all' | 'unread')}
          options={[
            { label: t('notifications.all', 'All'), value: 'all' },
            { label: t('notifications.unread', 'Unread'), value: 'unread' },
          ]}
        />
      </div>
      {inboxQuery.isLoading ? (
        <List
          dataSource={[1, 2, 3, 4]}
          className={styles.list}
          renderItem={() => (
            <List.Item>
              <Skeleton active paragraph={{ rows: 2 }} title={false} />
            </List.Item>
          )}
        />
      ) : (
        <List
          className={styles.list}
          dataSource={visibleNotifications}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notifications.empty')} />
            ),
          }}
          renderItem={(item) => {
            const unread = !item.readAt
            return (
              <List.Item className={unread ? styles.unreadItem : styles.item} role="listitem">
                <Avatar
                  className={unread ? styles.unreadAvatar : styles.avatar}
                  icon={notificationIcon(item)}
                  size={44}
                />
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemText}>
                      <Typography.Text strong={unread} className={styles.itemTitleText}>
                        {item.title}
                      </Typography.Text>
                      <Typography.Text className={styles.message} title={item.message}>
                        {item.message}
                      </Typography.Text>
                      <Typography.Text className={styles.timestamp}>
                        {relativeTime(item.createdAt)}
                      </Typography.Text>
                    </div>
                    {unread ? (
                      <Button
                        type="text"
                        size="small"
                        className={styles.readButton}
                        aria-label={t('notifications.markRead')}
                        icon={<CheckOutlined />}
                        loading={readMutation.isPending && readMutation.variables === item.id}
                        onClick={() =>
                          readMutation.mutate(item.id, {
                            onSuccess: refresh,
                            onError: mutationError,
                          })
                        }
                      />
                    ) : null}
                    {unread ? <span className={styles.unreadDot} aria-hidden="true" /> : null}
                  </div>
                </div>
              </List.Item>
            )
          }}
        />
      )}
      {hasMoreItems ? (
        <div className={styles.footer}>
          <Button
            block
            type="link"
            loading={inboxQuery.isFetching}
            onClick={() => setLimit((value) => value + 8)}
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
        if (!nextOpen) setLimit(8)
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
