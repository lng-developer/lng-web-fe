import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/chat/api/chatApi', () => ({
  createConversation: vi.fn(),
  listChatConversations: vi.fn(),
  listChatMessages: vi.fn(),
  listChatParticipants: vi.fn(),
  sendChatMessage: vi.fn(),
}))
vi.mock('@/features/portal/media/api/mediaApi', () => ({ uploadMediaAsset: vi.fn() }))
vi.mock('@/features/portal/chat/realtime/chatSocket', () => ({
  createChatSocket: vi.fn(() => null),
}))
vi.mock('@/shared/media', () => ({
  AuthenticatedMediaImage: ({ alt, downloadUrl }: { alt: string; downloadUrl?: string | null }) => (
    <img alt={alt} src={downloadUrl || ''} />
  ),
}))

import {
  createConversation,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { ChatWorkspacePage } from '@/features/portal/chat/pages/ChatWorkspacePage'
import { createChatSocket } from '@/features/portal/chat/realtime/chatSocket'

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={client}>
      <ChatWorkspacePage />
    </QueryClientProvider>,
  )
}

describe('ChatWorkspacePage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(createChatSocket).mockReturnValue(null)
    vi.mocked(listChatConversations).mockResolvedValue({
      items: [
        {
          id: 'conversation-1',
          type: 'DIRECT',
          title: 'Design handoff',
          shopId: null,
          relatedResource: null,
          participantAccountIds: ['account-1'],
          lastMessageAt: '2026-08-11T01:00:00.000Z',
          lastMessagePreview: 'Latest note',
          lastMessageSenderAccountId: 'account-2',
          unreadCount: 1,
          hasUnreadFromOthers: true,
          createdAt: '2026-08-11T00:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 20, total: 1 },
    })
    vi.mocked(listChatMessages).mockResolvedValue({
      items: [
        {
          id: 'message-1',
          conversationId: 'conversation-1',
          senderAccountId: 'account-2',
          body: 'Please check this file',
          assetIds: ['asset-1'],
          assets: [
            {
              id: 'asset-1',
              originalFilename: 'proof.png',
              mimeType: 'image/png',
              size: 1234,
              downloadUrl: '/api/media/assets/asset-1/download',
            },
          ],
          mentions: [],
          replyToMessageId: null,
          editedAt: null,
          deletedAt: null,
          createdAt: '2026-08-11T01:00:00.000Z',
          updatedAt: '2026-08-11T01:00:00.000Z',
        },
      ],
      pagination: { page: 1, limit: 50, total: 1 },
    })
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [{ id: 'account-2', email: 'designer@lng.co', status: 'active', presence: 'ONLINE' }],
    })
    vi.mocked(createConversation).mockResolvedValue({
      id: 'conversation-2',
      type: 'DIRECT',
      title: 'Support',
      shopId: null,
      relatedResource: null,
      participantAccountIds: ['account-1', 'account-2'],
      lastMessageAt: null,
      lastMessagePreview: null,
      lastMessageSenderAccountId: null,
      unreadCount: 0,
      hasUnreadFromOthers: false,
      createdAt: '2026-08-11T01:02:00.000Z',
      updatedAt: '2026-08-11T01:02:00.000Z',
    })
    vi.mocked(sendChatMessage).mockResolvedValue({
      id: 'message-2',
      conversationId: 'conversation-1',
      senderAccountId: 'account-1',
      body: 'Done',
      assetIds: [],
      mentions: [],
      replyToMessageId: null,
      editedAt: null,
      deletedAt: null,
      createdAt: '2026-08-11T01:01:00.000Z',
      updatedAt: '2026-08-11T01:01:00.000Z',
    })
  })

  it('renders conversations, messages, and sends a message from the composer', async () => {
    renderPage()

    expect((await screen.findAllByText('Design handoff'))[0]).toBeVisible()
    expect(await screen.findByText('Please check this file')).toBeVisible()
    expect(screen.getByRole('img', { name: 'proof.png' })).toHaveAttribute(
      'src',
      '/api/media/assets/asset-1/download',
    )
    fireEvent.change(screen.getByPlaceholderText('Write a message'), {
      target: { value: 'Done' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(sendChatMessage).toHaveBeenCalledWith('conversation-1', {
        body: 'Done',
        assetIds: [],
      }),
    )
  })

  it('sends composer messages through the realtime socket when connected', async () => {
    const emit = vi.fn((event, payload, ack) => {
      if (event === 'message.send') {
        ack({
          ok: true,
          message: {
            id: 'message-2',
            conversationId: payload.conversationId,
            senderAccountId: 'account-1',
            body: payload.body,
            assetIds: payload.assetIds,
            mentions: [],
            replyToMessageId: null,
            editedAt: null,
            deletedAt: null,
            createdAt: '2026-08-11T01:01:00.000Z',
            updatedAt: '2026-08-11T01:01:00.000Z',
          },
        })
      }
    })
    vi.mocked(createChatSocket).mockReturnValue({
      disconnect: vi.fn(),
      emit,
      on: vi.fn(),
    } as never)
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Write a message'), {
      target: { value: 'Done' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Send' }))

    await waitFor(() =>
      expect(emit).toHaveBeenCalledWith(
        'message.send',
        { conversationId: 'conversation-1', body: 'Done', assetIds: [] },
        expect.any(Function),
      ),
    )
    expect(sendChatMessage).not.toHaveBeenCalled()
  })

  it('creates a direct conversation by clicking a person', async () => {
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: /designer@lng.co/i }))

    await waitFor(() =>
      expect(createConversation).toHaveBeenCalledWith({
        type: 'DIRECT',
        title: null,
        participantAccountIds: ['account-2'],
      }),
    )
  })

  it('creates a group conversation from the group dialog', async () => {
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [
        { id: 'account-2', email: 'designer@lng.co', status: 'active', presence: 'ONLINE' },
        { id: 'account-3', email: 'qc@lng.co', status: 'active', presence: 'OFFLINE' },
      ],
    })
    renderPage()

    fireEvent.click(await screen.findByRole('button', { name: 'New group' }))
    fireEvent.change(screen.getByPlaceholderText('Group title'), {
      target: { value: 'Support' },
    })
    fireEvent.mouseDown(screen.getByRole('combobox'))
    fireEvent.click((await screen.findAllByText('designer@lng.co')).at(-1)!)
    fireEvent.click((await screen.findAllByText('qc@lng.co')).at(-1)!)
    fireEvent.click(screen.getByRole('button', { name: 'Create group' }))

    await waitFor(() =>
      expect(createConversation).toHaveBeenCalledWith({
        type: 'TEAM',
        title: 'Support',
        participantAccountIds: ['account-2', 'account-3'],
      }),
    )
  })

  it('filters the chat sidebar by search text', async () => {
    vi.mocked(listChatParticipants).mockResolvedValue({
      items: [
        { id: 'account-2', email: 'designer@lng.co', status: 'active', presence: 'ONLINE' },
        { id: 'account-3', email: 'qc@lng.co', status: 'active', presence: 'OFFLINE' },
      ],
    })
    renderPage()

    fireEvent.change(await screen.findByPlaceholderText('Search Messenger'), {
      target: { value: 'qc' },
    })

    expect(screen.queryByRole('button', { name: /designer@lng.co/i })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /qc@lng.co/i })).toBeVisible()
  })
})
