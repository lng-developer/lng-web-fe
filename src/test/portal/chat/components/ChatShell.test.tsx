import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/chat/api/chatApi', () => ({
  listChatConversations: vi.fn(),
  listChatMessages: vi.fn(),
  listChatParticipants: vi.fn(),
  markChatConversationRead: vi.fn(),
  sendChatMessage: vi.fn(),
}))
vi.mock('@/features/portal/chat/realtime/chatSocket', () => ({
  createChatSocket: vi.fn(() => null),
}))

import {
  listChatConversations,
  listChatMessages,
  listChatParticipants,
} from '@/features/portal/chat/api/chatApi'
import { ChatShell } from '@/features/portal/chat/components/ChatShell'
import { createChatSocket } from '@/features/portal/chat/realtime/chatSocket'

const account = {
  account: { id: 'account-1', email: 'admin@lng.co', mustChangePassword: false },
  roles: [],
  permissions: [],
  scopes: [],
  profileSetupRequired: false,
}

function renderShell() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <MemoryRouter initialEntries={['/portal/orders']}>
      <QueryClientProvider client={client}>
        <ChatShell account={account} />
      </QueryClientProvider>
    </MemoryRouter>,
  )
}

describe('ChatShell', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(listChatConversations).mockResolvedValue({
      items: [
        {
          id: 'conversation-1',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1', 'account-2'],
          lastMessageAt: null,
          lastMessagePreview: null,
          lastMessageSenderAccountId: null,
          unreadCount: 0,
          hasUnreadFromOthers: false,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 8, total: 1 },
    })
    vi.mocked(listChatMessages).mockResolvedValue({
      items: [],
      pagination: { page: 1, limit: 25, total: 0 },
    })
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [{ id: 'account-2', email: 'designer@lng.co', status: 'active', presence: 'ONLINE' }],
    })
  })

  it('shows the floating chat popup trigger when another account sends a realtime message', async () => {
    const handlers: Record<string, (payload: never) => void> = {}
    vi.mocked(createChatSocket).mockReturnValue({
      disconnect: vi.fn(),
      emit: vi.fn(),
      on: vi.fn((event, handler) => {
        handlers[event] = handler
      }),
    } as never)
    renderShell()

    await waitFor(() => expect(listChatConversations).toHaveBeenCalled())
    expect(screen.getAllByRole('button', { name: 'shell.navigation.chat' })).toHaveLength(1)
    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))
    expect(await screen.findByText('designer@lng.co')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))

    act(() => {
      handlers['message.created']({
        conversation: {
          id: 'conversation-1',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1', 'account-2'],
          lastMessageAt: '2026-08-11T01:00:00.000Z',
          lastMessagePreview: 'hello',
          lastMessageSenderAccountId: 'account-2',
          unreadCount: 0,
          hasUnreadFromOthers: false,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
        message: {
          id: 'message-1',
          conversationId: 'conversation-1',
          senderAccountId: 'account-2',
          body: 'hello',
          assetIds: [],
          mentions: [],
          replyToMessageId: null,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-08-11T01:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
      } as never)
    })

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'shell.navigation.chat' })).toHaveLength(2),
    )
  })
})
