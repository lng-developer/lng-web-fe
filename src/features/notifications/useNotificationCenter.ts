import { useEffect } from 'react'
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { getSharedChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notificationApi'

const notificationKey = ['notifications'] as const

export function useNotificationCenter(open: boolean, limit: number, unreadOnly = false) {
  const queryClient = useQueryClient()

  useEffect(() => {
    const socket = getSharedChatSocket()
    if (!socket) return

    const handleNotificationCreated = () => {
      void queryClient.invalidateQueries({ queryKey: notificationKey }, { cancelRefetch: false })
    }

    socket.on('notification.created', handleNotificationCreated)
    return () => {
      socket.off('notification.created', handleNotificationCreated)
    }
  }, [queryClient])

  const countQuery = useQuery({
    queryKey: [...notificationKey, 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    // AppShell's important-notification watcher owns the shared unread polling.
    refetchInterval: false,
  })

  const inboxQuery = useInfiniteQuery({
    queryKey: [...notificationKey, 'inbox', limit, unreadOnly],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => listNotifications(unreadOnly, limit, pageParam),
    getNextPageParam: ({ pagination }) =>
      pagination.page * pagination.limit < pagination.total ? pagination.page + 1 : undefined,
    enabled: open,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
  })

  const refresh = () => queryClient.invalidateQueries({ queryKey: notificationKey })

  const readMutation = useMutation({
    mutationFn: markNotificationRead,
  })

  const readAllMutation = useMutation({
    mutationFn: markAllNotificationsRead,
  })

  return {
    countQuery,
    inboxQuery,
    readMutation,
    readAllMutation,
    refresh,
  }
}
