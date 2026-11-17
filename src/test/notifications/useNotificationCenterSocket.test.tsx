import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useImportantNotificationWatcher } from '@/features/notifications/hooks/useImportantNotificationWatcher'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { getSharedChatSocket } from '@/features/portal/chat/realtime/chatSocket'
import { useNotificationAlerts } from '@/shared/notification'

vi.mock('@/features/notifications/api/notificationApi', () => ({
  listNotifications: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
  getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))

vi.mock('@/shared/notification', () => ({
  useNotificationAlerts: vi.fn(() => ({
    alertImportantNotification: vi.fn(),
  })),
}))

vi.mock('react-router-dom', () => ({
  useNavigate: () => vi.fn(),
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('@/features/portal/chat/realtime/chatSocket', () => ({
  getSharedChatSocket: vi.fn(),
}))

type MockListener = (...args: unknown[]) => void

describe('Notification realtime socket integration', () => {
  let mockSocket: {
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    listeners: Record<string, MockListener[]>
  }
  let alertMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const listeners: Record<string, MockListener[]> = {}
    mockSocket = {
      listeners,
      on: vi.fn((event: string, callback: MockListener) => {
        if (!listeners[event]) listeners[event] = []
        listeners[event].push(callback)
      }),
      off: vi.fn((event: string, callback: MockListener) => {
        if (listeners[event]) {
          listeners[event] = listeners[event].filter((cb) => cb !== callback)
        }
      }),
    }
    vi.mocked(getSharedChatSocket).mockReturnValue(
      mockSocket as unknown as ReturnType<typeof getSharedChatSocket>,
    )
    alertMock = vi.fn()
    vi.mocked(useNotificationAlerts).mockReturnValue({
      alertImportantNotification: alertMock,
    } as unknown as ReturnType<typeof useNotificationAlerts>)
  })

  afterEach(cleanup)

  it('invalidates queries on notification.created event in useNotificationCenter', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')

    renderHook(() => useNotificationCenter(false, 8), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })

    expect(mockSocket.on).toHaveBeenCalledWith('notification.created', expect.any(Function))
    const handler = mockSocket.listeners['notification.created']?.[0]
    expect(handler).toBeDefined()

    act(() => {
      handler?.({
        id: 'noti-1',
        type: 'ORDER_TRACKING_OVERDUE',
        title: 'Order tracking overdue',
        message: 'Order 123 is overdue',
        relatedResource: { type: 'order', id: 'order-1' },
        readAt: null,
      })
    })

    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey: ['notifications'] })
  })

  it('alerts important notification instantly on notification.created in useImportantNotificationWatcher', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })

    renderHook(() => useImportantNotificationWatcher(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })

    const handler = mockSocket.listeners['notification.created']?.[0]
    expect(handler).toBeDefined()

    act(() => {
      handler?.({
        id: 'noti-overdue-1',
        type: 'ORDER_TRACKING_OVERDUE',
        title: 'Order tracking overdue: AMZ-123',
        message: 'Order AMZ-123 has shipByDate on 2026-11-17 but is missing tracking.',
        relatedResource: { type: 'order', id: 'order-1' },
        readAt: null,
      })
    })

    expect(alertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'noti-noti-overdue-1',
        title: 'Order tracking overdue: AMZ-123',
        message: expect.stringContaining('missing tracking'),
      }),
    )
  })
})
