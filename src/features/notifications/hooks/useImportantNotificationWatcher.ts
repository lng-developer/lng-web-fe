import { useEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'

import {
  type AppNotification,
  getUnreadCount,
  listNotifications,
} from '@/features/notifications/api/notificationApi'
import { notificationTarget } from '@/features/notifications/notificationTarget'
import { isImportantNotification } from '@/features/notifications/utils/notificationUrgency'
import { getSharedChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { useNotificationAlerts } from '@/shared/notification'

export function useImportantNotificationWatcher() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { alertImportantNotification } = useNotificationAlerts()
  const previousUnreadCountRef = useRef<number | null>(null)
  const alertedIdsRef = useRef<Set<string>>(new Set())
  const isInitializedRef = useRef(false)

  const countQuery = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })

  const currentCount = countQuery.data?.unreadCount

  useEffect(() => {
    const socket = getSharedChatSocket()
    if (!socket) return

    const handleRealtimeNotification = (item: AppNotification) => {
      if (
        !item ||
        item.readAt ||
        alertedIdsRef.current.has(item.id) ||
        !isImportantNotification(item)
      ) {
        return
      }

      alertedIdsRef.current.add(item.id)
      const target = notificationTarget(item)
      alertImportantNotification({
        id: `noti-${item.id}`,
        title: item.title,
        message: item.message,
        actionText: t('notificationAlerts.viewDetail'),
        flashText: t('notificationAlerts.titleFlashNotification'),
        onAction: target
          ? () => {
              navigate(target)
            }
          : undefined,
      })
    }

    socket.on('notification.created', handleRealtimeNotification)
    return () => {
      socket.off('notification.created', handleRealtimeNotification)
    }
  }, [alertImportantNotification, navigate, t])

  useEffect(() => {
    if (typeof currentCount !== 'number') return

    // 1. Initial hydration: record existing notifications so we don't spam toasts on mount
    if (!isInitializedRef.current) {
      isInitializedRef.current = true
      previousUnreadCountRef.current = currentCount
      if (currentCount > 0) {
        listNotifications(true, 10, 1)
          .then((inbox) => {
            for (const item of inbox.items) {
              alertedIdsRef.current.add(item.id)
            }
          })
          .catch(() => {})
      }
      return
    }

    const prevCount = previousUnreadCountRef.current ?? 0
    previousUnreadCountRef.current = currentCount

    // 2. When unreadCount increases, fetch latest unread items and check if any are important
    if (currentCount > prevCount) {
      listNotifications(true, 5, 1)
        .then((inbox) => {
          for (const item of inbox.items) {
            if (
              !item.readAt &&
              !alertedIdsRef.current.has(item.id) &&
              isImportantNotification(item)
            ) {
              alertedIdsRef.current.add(item.id)
              const target = notificationTarget(item)
              alertImportantNotification({
                id: `noti-${item.id}`,
                title: item.title,
                message: item.message,
                actionText: t('notificationAlerts.viewDetail'),
                flashText: t('notificationAlerts.titleFlashNotification'),
                onAction: target
                  ? () => {
                      navigate(target)
                    }
                  : undefined,
              })
            }
          }
        })
        .catch(() => {})
    }
  }, [alertImportantNotification, currentCount, navigate, t])
}
