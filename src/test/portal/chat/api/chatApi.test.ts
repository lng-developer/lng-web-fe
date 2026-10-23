import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))
vi.mock('@/features/auth/microsoft/msalClient', () => ({ getMsalInstance: vi.fn() }))

import {
  createConversation,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  markChatConversationRead,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { getMsalInstance } from '@/features/auth/microsoft/msalClient'
import { apiClient } from '@/shared/api'

describe('chatApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('calls chat REST endpoints with compact message payloads', async () => {
    await listChatConversations({ page: 2, limit: 20 })
    await createConversation({ type: 'DIRECT', participantAccountIds: ['account-2'] })
    await listChatParticipants({ limit: 100 })
    await listChatMessages('conversation-1', { page: 1, limit: 50 })
    await sendChatMessage('conversation-1', { body: 'hello', assetIds: ['asset-1'] })
    await markChatConversationRead('conversation-1')

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/chat/conversations', {
      params: { page: 2, limit: 20 },
    })
    expect(apiClient.post).toHaveBeenNthCalledWith(1, '/api/chat/conversations', {
      type: 'DIRECT',
      participantAccountIds: ['account-2'],
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/chat/participants', {
      params: { limit: 100 },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(
      3,
      '/api/chat/conversations/conversation-1/messages',
      { params: { page: 1, limit: 50 } },
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/chat/conversations/conversation-1/messages',
      { body: 'hello', assetIds: ['asset-1'] },
    )
    expect(apiClient.patch).toHaveBeenCalledWith('/api/chat/conversations/conversation-1/read')
  })

  it('sends a Portal message without waiting for an optional Teams token refresh', async () => {
    vi.mocked(getMsalInstance).mockResolvedValue({
      getAllAccounts: () => [{}],
      acquireTokenSilent: () => new Promise(() => undefined),
    } as never)

    const send = sendChatMessage('conversation-1', { body: 'hello', assetIds: [] })

    await expect(send).resolves.toEqual({})
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/conversations/conversation-1/messages', {
      body: 'hello',
      assetIds: [],
    })
  })
})
