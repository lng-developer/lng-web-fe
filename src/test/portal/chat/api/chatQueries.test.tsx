import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, renderHook, waitFor } from '@testing-library/react'
import type { PropsWithChildren } from 'react'
import { afterEach, expect, it, vi } from 'vitest'

import { type ChatMessage, syncTeamsChat } from '@/features/portal/chat/api/chatApi'
import { chatKeys } from '@/features/portal/chat/api/chatKeys'
import { receiveChatMessage, useTeamsChatSync } from '@/features/portal/chat/api/chatQueries'

vi.mock('@/features/portal/chat/api/chatApi', () => ({ syncTeamsChat: vi.fn() }))
afterEach(() => {
  cleanup()
  vi.clearAllMocks()
  vi.useRealTimers()
})
const message: ChatMessage = {
  id: 'm1',
  conversationId: 'c1',
  senderAccountId: 'other',
  body: 'Hello',
  assetIds: [],
  mentions: [],
  replyToMessageId: null,
  editedAt: null,
  deletedAt: null,
  createdAt: '2026-10-15T00:00:00Z',
  updatedAt: '2026-10-15T00:00:00Z',
}
it('deduplicates echoed messages and keeps delayed messages in chronological order', async () => {
  const client = new QueryClient()
  client.setQueryData(chatKeys.messages('c1'), {
    items: [{ ...message, id: 'm2', createdAt: '2026-10-15T01:00:00Z' }],
    pagination: { page: 1, limit: 50, total: 1 },
  })
  await receiveChatMessage(client, message)
  await receiveChatMessage(client, message)
  expect(client.getQueryData(chatKeys.messages('c1'))).toMatchObject({
    items: [{ id: 'm1' }, { id: 'm2' }],
    pagination: { total: 2 },
  })
  client.clear()
})
it('shares one Teams sync request between popup and Messenger and refreshes chat data', async () => {
  vi.mocked(syncTeamsChat).mockResolvedValue({
    status: 'SYNCED',
    syncedCount: 1,
    teamsChatId: 't1',
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(chatKeys.messages('c1'), { items: [] })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  renderHook(
    () => {
      useTeamsChatSync('c1', true)
      useTeamsChatSync('c1', true)
    },
    { wrapper },
  )
  await waitFor(() => expect(syncTeamsChat).toHaveBeenCalledTimes(1))
  await waitFor(() =>
    expect(client.getQueryState(chatKeys.messages('c1'))?.isInvalidated).toBe(true),
  )
  cleanup()
  client.clear()
})
it('does not let a late history response overwrite a newly received message', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  let resolveHistory!: (page: {
    items: ChatMessage[]
    pagination: { page: number; limit: number; total: number }
  }) => void
  const history = client.fetchQuery({
    queryKey: chatKeys.messages('c1'),
    queryFn: () =>
      new Promise<{
        items: ChatMessage[]
        pagination: { page: number; limit: number; total: number }
      }>((resolve) => {
        resolveHistory = resolve
      }),
  })
  const settled = history.catch(() => undefined)
  await receiveChatMessage(client, message)
  resolveHistory({ items: [], pagination: { page: 1, limit: 50, total: 0 } })
  await settled
  expect(client.getQueryData(chatKeys.messages('c1'))).toMatchObject({ items: [{ id: 'm1' }] })
  client.clear()
})
it('stops polling when both chat surfaces are closed or minimized', async () => {
  vi.useFakeTimers()
  vi.mocked(syncTeamsChat).mockResolvedValue({
    status: 'SYNCED',
    syncedCount: 0,
    teamsChatId: 't1',
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  )
  const hook = renderHook(
    ({ enabled }) => {
      useTeamsChatSync('c1', enabled)
      useTeamsChatSync('c1', enabled)
    },
    {
      wrapper,
      initialProps: { enabled: true },
    },
  )
  await act(async () => {
    await vi.advanceTimersByTimeAsync(1)
  })
  expect(syncTeamsChat).toHaveBeenCalledTimes(1)
  await act(async () => {
    await vi.advanceTimersByTimeAsync(8000)
  })
  expect(syncTeamsChat).toHaveBeenCalledTimes(2)
  hook.rerender({ enabled: false })
  await act(async () => {
    await vi.advanceTimersByTimeAsync(16000)
  })
  expect(syncTeamsChat).toHaveBeenCalledTimes(2)
  hook.unmount()
  client.clear()
})
