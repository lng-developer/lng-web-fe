import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/chat/api/chatApi', () => ({
  createConversation: vi.fn(),
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
  createConversation,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  markChatConversationRead,
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
    const el = await screen.findByText('designer@lng.co')
    expect(el).toBeVisible()
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

  it('closes preview popup when clicking outside', async () => {
    renderShell()

    await waitFor(() => expect(listChatConversations).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))
    expect(await screen.findByText('designer@lng.co')).toBeVisible()

    fireEvent.mouseDown(document.body)
    await waitFor(() => {
      expect(screen.queryByText('designer@lng.co')).not.toBeInTheDocument()
    })
  })

  it('opens quick chat window, allows minimizing, expanding, and closing it', async () => {
    renderShell()

    await waitFor(() => expect(listChatConversations).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))
    const item = await screen.findByText('designer@lng.co')
    fireEvent.click(item)

    const windowRegion = await screen.findByRole('region', { name: 'designer@lng.co' })
    expect(windowRegion).toBeInTheDocument()

    const withinWindow = within(windowRegion)
    const minimizeBtn = withinWindow.getByRole('button', { name: /minimize/i })
    fireEvent.click(minimizeBtn)

    const chatButtons = screen.getAllByRole('button', { name: 'shell.navigation.chat' })
    expect(chatButtons.length).toBeGreaterThan(1)
    const bubbleBtn = chatButtons[chatButtons.length - 1]
    fireEvent.click(bubbleBtn)

    expect(await screen.findByRole('region', { name: 'designer@lng.co' })).toBeVisible()

    const closeBtn = withinWindow.getByRole('button', { name: 'Close' })
    fireEvent.click(closeBtn)

    await waitFor(() => {
      expect(screen.queryByRole('region', { name: 'designer@lng.co' })).not.toBeInTheDocument()
    })
  })

  it('opens multiple quick chat windows simultaneously', async () => {
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
        {
          id: 'conversation-2',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1', 'account-3'],
          lastMessageAt: null,
          lastMessagePreview: null,
          lastMessageSenderAccountId: null,
          unreadCount: 0,
          hasUnreadFromOthers: false,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T00:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 8, total: 2 },
    })
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [
        { id: 'account-2', email: 'designer@lng.co', status: 'active', presence: 'ONLINE' },
        { id: 'account-3', email: 'operator@lng.co', status: 'active', presence: 'ONLINE' },
      ],
    })

    renderShell()

    await waitFor(() => expect(listChatConversations).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))
    const item1 = await screen.findByText('designer@lng.co')
    fireEvent.click(item1)

    expect(await screen.findByRole('region', { name: 'designer@lng.co' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'shell.navigation.chat' }))
    const item2 = await screen.findByText('operator@lng.co')
    fireEvent.click(item2)

    expect(await screen.findByRole('region', { name: 'operator@lng.co' })).toBeInTheDocument()
    expect(screen.getByRole('region', { name: 'designer@lng.co' })).toBeInTheDocument()
  })

  it('clears unread badge count when unread conversation is viewed', async () => {
    vi.mocked(listChatConversations).mockResolvedValue({
      items: [
        {
          id: 'conversation-1',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1', 'account-2'],
          lastMessageAt: '2026-08-11T01:00:00.000Z',
          lastMessagePreview: 'new message',
          lastMessageSenderAccountId: 'account-2',
          unreadCount: 3,
          hasUnreadFromOthers: true,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 8, total: 1 },
    })

    renderShell()

    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: 'shell.navigation.chat' })).toHaveLength(2),
    )
    const chatButtons = screen.getAllByRole('button', { name: 'shell.navigation.chat' })
    const bubbleBtn = chatButtons[1]
    fireEvent.click(bubbleBtn)

    expect(await screen.findByRole('region', { name: 'designer@lng.co' })).toBeInTheDocument()
    expect(markChatConversationRead).toHaveBeenCalledWith('conversation-1')
  })

  it('searches conversations and contacts with accent-insensitivity in preview popover', async () => {
    vi.mocked(listChatConversations).mockResolvedValue({
      items: [
        {
          id: 'conversation-1',
          type: 'DIRECT',
          title: null,
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1', 'account-2'],
          lastMessageAt: '2026-08-11T01:00:00.000Z',
          lastMessagePreview: 'Báo cáo doanh thu hôm nay',
          lastMessageSenderAccountId: 'account-2',
          unreadCount: 0,
          hasUnreadFromOthers: false,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 8, total: 1 },
    })
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [
        {
          id: 'account-2',
          email: 'tuan@lng.co',
          displayName: 'Nguyễn Văn Tuấn',
          status: 'active',
          presence: 'ONLINE',
        },
        {
          id: 'account-3',
          email: 'hung@lng.co',
          displayName: 'Lê Văn Hùng',
          status: 'active',
          presence: 'ONLINE',
        },
      ],
    })
    vi.mocked(createConversation).mockResolvedValue({
      id: 'conversation-new',
      type: 'DIRECT',
      title: null,
      shopId: null,
      relatedResource: null,
      participantAccountIds: ['account-1', 'account-3'],
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderAccountId: null,
      unreadCount: 0,
      hasUnreadFromOthers: false,
      createdAt: '2026-08-11T02:00:00.000Z',
      updatedAt: '2026-08-11T02:00:00.000Z',
    })

    renderShell()

    await waitFor(() => expect(listChatConversations).toHaveBeenCalled())
    fireEvent.click(screen.getByRole('button', { name: /^(chat|shell\.navigation\.chat)$/i }))

    // Initially shows existing conversation with Nguyễn Văn Tuấn
    expect(await screen.findByText('Nguyễn Văn Tuấn')).toBeVisible()

    const searchInput = screen.getByPlaceholderText('Search Messenger')
    expect(searchInput).not.toHaveAttribute('readonly')

    // 1. Search for "hung" (unaccented for "Hùng") -> finds other contact "Lê Văn Hùng"
    fireEvent.change(searchInput, { target: { value: 'hung' } })
    expect(screen.queryByText('Nguyễn Văn Tuấn')).not.toBeInTheDocument()
    const hungItem = await screen.findByText('Lê Văn Hùng')
    expect(hungItem).toBeVisible()

    // Clicking contact starts direct chat and opens window
    fireEvent.click(hungItem)
    await waitFor(() =>
      expect(createConversation).toHaveBeenCalledWith({
        type: 'DIRECT',
        title: null,
        participantAccountIds: ['account-3'],
      }),
    )

    // Open popover again and search for message content with tone removal ("doanh thu")
    fireEvent.click(screen.getByRole('button', { name: /^(chat|shell\.navigation\.chat)$/i }))
    const searchInput2 = screen.getByPlaceholderText('Search Messenger')
    fireEvent.change(searchInput2, { target: { value: 'doanh thu' } })
    expect(await screen.findByText('Nguyễn Văn Tuấn')).toBeVisible()

    // Search for non-existent text
    fireEvent.change(searchInput2, { target: { value: 'khongcoaihet' } })
    expect(screen.queryByText('Nguyễn Văn Tuấn')).not.toBeInTheDocument()
    expect(await screen.findByText(/no results found/i)).toBeInTheDocument()
  })
})
