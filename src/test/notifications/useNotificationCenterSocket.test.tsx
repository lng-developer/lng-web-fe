import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useImportantNotificationWatcher } from '@/features/notifications/hooks/useImportantNotificationWatcher'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import {
  getSharedChatSocket,
  isSharedChatSocketConnected,
} from '@/features/portal/chat/realtime/chatSocket'
import { useUnreadSocketSync } from '@/features/portal/chat/realtime/useUnreadSocketSync'
import { getUnreadCount } from '@/features/notifications/api/notificationApi'
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
  isSharedChatSocketConnected: vi.fn(),
}))

type MockListener = (...args: unknown[]) => void

describe('Notification realtime socket integration', () => {
  let mockSocket: {
    connected: boolean
    on: ReturnType<typeof vi.fn>
    off: ReturnType<typeof vi.fn>
    listeners: Record<string, MockListener[]>
  }
  let alertMock: ReturnType<typeof vi.fn>

  beforeEach(() => {
    vi.clearAllMocks()
    const listeners: Record<string, MockListener[]> = {}
    mockSocket = {
      connected: true,
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
    vi.mocked(isSharedChatSocketConnected).mockImplementation(() => mockSocket.connected)
    alertMock = vi.fn()
    vi.mocked(useNotificationAlerts).mockReturnValue({
      alertImportantNotification: alertMock,
    } as unknown as ReturnType<typeof useNotificationAlerts>)
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('stops unread polling while connected, resumes offline and refreshes on reconnect', async () => {
    vi.useFakeTimers()
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { result, unmount } = renderHook(
      () => {
        const ready = useUnreadSocketSync()
        useNotificationCenter(false, 8)
        useImportantNotificationWatcher()
        return ready
      },
      {
        wrapper: ({ children }) => (
          <QueryClientProvider client={client}>{children}</QueryClientProvider>
        ),
      },
    )
    await act(async () => {
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current).toBe(true)
    vi.mocked(getUnreadCount).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(getUnreadCount).not.toHaveBeenCalled()

    act(() => {
      mockSocket.connected = false
      mockSocket.listeners.disconnect.forEach((handler) => handler())
    })
    expect(result.current).toBe(false)
    await act(async () => {
      await vi.advanceTimersByTimeAsync(60_000)
    })
    expect(getUnreadCount).toHaveBeenCalled()
    vi.mocked(getUnreadCount).mockClear()
    await act(async () => {
      mockSocket.connected = true
      mockSocket.listeners.connect.forEach((handler) => handler())
      await vi.advanceTimersByTimeAsync(1)
    })
    expect(result.current).toBe(true)
    expect(getUnreadCount).toHaveBeenCalledTimes(1)
    vi.mocked(getUnreadCount).mockClear()
    await act(async () => {
      await vi.advanceTimersByTimeAsync(120_000)
    })
    expect(getUnreadCount).not.toHaveBeenCalled()
    unmount()
    expect(Object.values(mockSocket.listeners).every((listeners) => listeners.length === 0)).toBe(
      true,
    )
    client.clear()
  })

  it.each([
    ['message.created', ['chat', 'unread']],
    ['message.read', ['chat', 'unread']],
    ['notification.created', ['notifications']],
  ])('refreshes unread state on %s without cancelling an in-flight fetch', (event, queryKey) => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidateSpy = vi.spyOn(client, 'invalidateQueries')
    renderHook(() => useUnreadSocketSync(), {
      wrapper: ({ children }) => (
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      ),
    })
    act(() => {
      mockSocket.listeners[event].forEach((handler) => handler())
    })
    expect(invalidateSpy).toHaveBeenCalledWith({ queryKey }, { cancelRefetch: false })
  })

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

    expect(invalidateSpy).toHaveBeenCalledWith(
      { queryKey: ['notifications'] },
      { cancelRefetch: false },
    )
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
