import { useMutation, useQueryClient } from '@tanstack/react-query'

import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'

import { notificationKeys } from './notification.queries.js'
import { markAllNotificationsRead, markNotificationRead } from './notificationApi.js'

function useNotificationMutation(mutationFn) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: notificationKeys.all }),
  })
}

export function useMarkNotificationReadMutation() {
  return useNotificationMutation((notificationId) =>
    markNotificationRead(
      (path) => apiClient.patch(path),
      ENDPOINTS.NOTIFICATIONS.MARK_READ(notificationId),
    ),
  )
}

export function useMarkAllNotificationsReadMutation() {
  return useNotificationMutation(() =>
    markAllNotificationsRead(
      (path) => apiClient.patch(path),
      ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ,
    ),
  )
}
