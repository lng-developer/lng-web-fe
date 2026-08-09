import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { Badge, Button, Empty, List, Popover, Skeleton, Typography } from 'antd'

import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { useFeedbackToast } from '@/shared/ui'

import styles from './NotificationCenter.module.scss'

export function NotificationCenter() {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const contentRef = useRef<HTMLDivElement>(null)
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(8)
  const { countQuery, inboxQuery, readMutation, readAllMutation, refresh } = useNotificationCenter(
    open,
    limit,
  )
  const mutationError = (error: Error) =>
    toast('error', t('notifications.updateFailed'), error.message)
  const unreadCount = countQuery.data?.unreadCount ?? 0
  const notifications = inboxQuery.data?.items ?? []
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
          dataSource={notifications}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notifications.empty')} />
            ),
          }}
          renderItem={(item) => {
            const unread = !item.readAt
            return (
              <List.Item className={unread ? styles.unreadItem : styles.item}>
                <div className={styles.itemContent}>
                  <div className={styles.itemHeader}>
                    <div className={styles.itemTitle}>
                      {unread && <span className={styles.unreadDot} aria-hidden="true" />}
                      <Typography.Text strong={unread} className={styles.itemTitleText}>
                        {item.title}
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
                      >
                        {t('notifications.markRead')}
                      </Button>
                    ) : null}
                  </div>
                  <Typography.Text className={styles.message} title={item.message}>
                    {item.message}
                  </Typography.Text>
                  <Typography.Text type="secondary" className={styles.timestamp}>
                    {new Date(item.createdAt).toLocaleString()}
                  </Typography.Text>
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
