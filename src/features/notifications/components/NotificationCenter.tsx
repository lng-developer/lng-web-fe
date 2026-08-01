import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { BellOutlined, CheckOutlined } from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Badge, Button, Empty, List, Popover, Skeleton, Space, Typography } from 'antd'

import { useFeedbackToast } from '@/shared/ui'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../api/notificationApi'
import styles from './NotificationCenter.module.scss'

const notificationKey = ['notifications'] as const

export function NotificationCenter() {
  const { t } = useTranslation()
  const toast = useFeedbackToast()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [limit, setLimit] = useState(8)
  const countQuery = useQuery({
    queryKey: [...notificationKey, 'unread-count'],
    queryFn: getUnreadCount,
    refetchInterval: 60_000,
  })
  const inboxQuery = useQuery({
    queryKey: [...notificationKey, 'inbox', limit],
    queryFn: () => listNotifications(false, limit),
    enabled: open,
    placeholderData: keepPreviousData,
  })
  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKey })
  const mutationError = (error: Error) =>
    toast('error', t('notifications.updateFailed'), error.message)
  const readMutation = useMutation({
    mutationFn: markNotificationRead,
    onSuccess: refresh,
    onError: mutationError,
  })
  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: () => {
      toast('success', t('notifications.markedAllRead'))
      void refresh()
    },
    onError: mutationError,
  })

  const content = (
    <div className={styles.content}>
      <Space className="mb-3 flex w-full justify-between">
        <Typography.Title level={5} className="!mb-0">
          {t('notifications.title')}
        </Typography.Title>
        <Button
          type="link"
          size="small"
          disabled={!countQuery.data?.unreadCount}
          loading={readAllMutation.isPending}
          onClick={() => readAllMutation.mutate()}
        >
          {t('notifications.markAllRead')}
        </Button>
      </Space>
      {inboxQuery.isLoading ? (
        <Skeleton active paragraph={{ rows: 4 }} />
      ) : (
        <List
          className={styles.list}
          dataSource={inboxQuery.data?.items ?? []}
          locale={{
            emptyText: (
              <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={t('notifications.empty')} />
            ),
          }}
          renderItem={(item) => (
            <List.Item
              className={item.readAt ? undefined : '!bg-primary-light'}
              actions={
                !item.readAt
                  ? [
                      <Button
                        key="read"
                        type="text"
                        size="small"
                        aria-label={t('notifications.markRead')}
                        icon={<CheckOutlined />}
                        loading={readMutation.isPending && readMutation.variables === item.id}
                        onClick={() => readMutation.mutate(item.id)}
                      />,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                title={item.title}
                description={
                  <>
                    <div>{item.message}</div>
                    <Typography.Text type="secondary">
                      {new Date(item.createdAt).toLocaleString()}
                    </Typography.Text>
                  </>
                }
              />
            </List.Item>
          )}
        />
      )}
      {(inboxQuery.data?.pagination.total ?? 0) > (inboxQuery.data?.items.length ?? 0) ? (
        <Button
          block
          type="link"
          loading={inboxQuery.isFetching}
          onClick={() => setLimit((value) => value + 8)}
        >
          {t('notifications.loadMore')}
        </Button>
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
