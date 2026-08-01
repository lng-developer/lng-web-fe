import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getUnreadCount,
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '@/features/notifications/api/notificationApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn() } }))

describe('notificationApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
  })

  it('uses the inbox and unread count contracts', async () => {
    await listNotifications(true)
    await getUnreadCount()
    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/notifications', {
      params: { unreadOnly: true, page: 1, limit: 10 },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/notifications/unread-count')
  })

  it('uses the read mutation contracts', async () => {
    await markNotificationRead('notification-1')
    await markAllNotificationsRead()
    expect(apiClient.patch).toHaveBeenNthCalledWith(1, '/api/notifications/notification-1/read')
    expect(apiClient.patch).toHaveBeenNthCalledWith(2, '/api/notifications/read-all')
  })
})
