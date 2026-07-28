import { useQuery } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import {
  buildUnreadCountQueryOptions,
  fetchNotificationInbox,
  fetchUnreadCount,
} from './notificationApi.js'

export const notificationKeys = {
  all: ['notifications'],
  inbox: () => [...notificationKeys.all, 'inbox'],
  unreadCount: () => [...notificationKeys.all, 'unread-count'],
}

export function useNotificationInboxQuery(authenticated, open) {
  return useQuery({
    queryKey: notificationKeys.inbox(),
    queryFn: () =>
      fetchNotificationInbox(
        (path) => apiClient.get(path, { params: { page: 1, limit: 20 } }),
        ENDPOINTS.NOTIFICATIONS.INBOX,
      ),
    enabled: Boolean(authenticated && open),
  })
}

export function useUnreadCountQuery(authenticated) {
  return useQuery({
    queryKey: notificationKeys.unreadCount(),
    queryFn: () =>
      fetchUnreadCount((path) => apiClient.get(path), ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT),
    ...buildUnreadCountQueryOptions(authenticated),
  })
}
