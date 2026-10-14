import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { useNotificationCenter } from '@/features/notifications/useNotificationCenter'
import { listNotifications } from '@/features/notifications/api/notificationApi'

vi.mock('@/features/notifications/api/notificationApi', () => ({
  listNotifications: vi.fn().mockResolvedValue({ items: [], pagination: { total: 0 } }),
  getUnreadCount: vi.fn().mockResolvedValue({ unreadCount: 0 }),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}))
afterEach(cleanup)
it('loads subsequent server pages with a bounded page size', async () => {
  vi.mocked(listNotifications).mockImplementation(async (_unread, limit = 8, page = 1) => ({
    items: [],
    pagination: { page, limit, total: 16 },
  }))
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { result } = renderHook(() => useNotificationCenter(true, 8), {
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(result.current.inboxQuery.hasNextPage).toBe(true))
  await act(async () => {
    await result.current.inboxQuery.fetchNextPage()
  })
  expect(listNotifications).toHaveBeenCalledWith(false, 8, 2)
  await waitFor(() => expect(result.current.inboxQuery.data?.pages).toHaveLength(2))
  expect(result.current.inboxQuery.hasNextPage).toBe(false)
})
it('requests unread filtering from the server and refetches when filter changes', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const { rerender } = renderHook(({ unread }) => useNotificationCenter(true, 8, unread), {
    initialProps: { unread: true },
    wrapper: ({ children }) => (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    ),
  })
  await waitFor(() => expect(listNotifications).toHaveBeenCalledWith(true, 8, 1))
  rerender({ unread: false })
  await waitFor(() => expect(listNotifications).toHaveBeenCalledWith(false, 8, 1))
})
