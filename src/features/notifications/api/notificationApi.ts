import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

export type AppNotification = {
  id: string
  type: string
  title: string
  message: string
  relatedResource: { type: string; id: string } | null
  readAt: string | null
  createdAt: string
  updatedAt: string
}

export type NotificationInbox = {
  items: AppNotification[]
  pagination: { total: number; page: number; limit: number }
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export async function listNotifications(
  unreadOnly = false,
  limit = 8,
  page = 1,
): Promise<NotificationInbox> {
  return unwrap(await apiClient.get('/api/notifications', { params: { unreadOnly, page, limit } }))
}

export async function getUnreadCount(): Promise<{ unreadCount: number }> {
  return unwrap(await apiClient.get('/api/notifications/unread-count'))
}

export async function markNotificationRead(id: string): Promise<AppNotification> {
  return unwrap(await apiClient.patch(`/api/notifications/${id}/read`))
}

export async function markAllNotificationsRead(): Promise<{ updatedCount: number }> {
  return unwrap(await apiClient.patch('/api/notifications/read-all'))
}
