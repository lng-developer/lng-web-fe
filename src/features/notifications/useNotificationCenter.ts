import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './api/notificationApi'

const notificationKey = ['notifications'] as const

export function useNotificationCenter(open: boolean, limit: number) {
  const queryClient = useQueryClient()

  const countQuery = useQuery({
    queryKey: [...notificationKey, 'unread-count'],
    queryFn: getUnreadCount,
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    refetchInterval: 60_000,
  })

  const inboxQuery = useQuery({
    queryKey: [...notificationKey, 'inbox', limit],
    queryFn: () => listNotifications(false, limit),
    enabled: open,
    staleTime: 30_000,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
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
