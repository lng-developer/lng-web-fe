import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  createConversation,
  listChatConversations,
  listChatMessages,
  listChatParticipants,
  markChatConversationRead,
  sendChatMessage,
} from '@/features/portal/chat/api/chatApi'
import { getTeamsOAuthStatus } from '@/features/integration/teams/api/teamsOAuthApi'
import { apiClient } from '@/shared/api'

describe('chatApi', () => {
  it('preserves reply target in the REST payload', async () => {
    await sendChatMessage('c1', {
      body: 'Reply',
      assetIds: [],
      replyToMessageId: 'm1',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/chat/conversations/c1/messages', {
      body: 'Reply',
      assetIds: [],
      replyToMessageId: 'm1',
    })
  })
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

  it('reads the current user Teams OAuth status from the restricted endpoint', async () => {
    await getTeamsOAuthStatus()

    expect(apiClient.get).toHaveBeenCalledWith('/api/integration/teams/oauth/status')
  })
})
