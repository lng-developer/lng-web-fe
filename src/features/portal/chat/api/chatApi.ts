import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

type Page<T> = { items: T[]; pagination: { page: number; limit: number; total: number } }
type Query = Record<string, number | string | undefined>

export type ChatConversationType =
  | 'DIRECT'
  | 'TEAM'
  | 'SHOP'
  | 'ORDER'
  | 'ORDER_ITEM'
  | 'PRODUCTION_TASK'
  | 'VENDOR_SUBMISSION'

export type ChatConversation = {
  id: string
  type: ChatConversationType
  title: string | null
  shopId: string | null
  relatedResource: { type: string; id: string } | null
  participantAccountIds: string[]
  directKey?: string | null
  lastMessageAt: string | null
  lastMessagePreview: string | null
  lastMessageSenderAccountId: string | null
  unreadCount: number
  hasUnreadFromOthers: boolean
  createdAt: string
  updatedAt: string
}

export type ChatMessage = {
  id: string
  conversationId: string
  senderAccountId: string
  body: string
  assetIds: string[]
  assets?: Array<{
    id: string
    originalFilename: string | null
    mimeType: string | null
    size: number | null
    downloadUrl: string | null
  }>
  mentions: string[]
  replyToMessageId: string | null
  replyToMessage?: {
    id: string
    senderAccountId: string
    body: string
    attachmentCount: number
  } | null
  editedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export type ChatParticipant = {
  id: string
  email: string
  displayName?: string | null
  fullName?: string | null
  employeeCode?: string | null
  status?: string
  presence?: 'ONLINE' | 'OFFLINE'
}

export type CreateConversationInput = {
  type: ChatConversationType
  title?: string | null
  shopId?: string | null
  relatedResource?: { type: string; id: string } | null
  participantAccountIds?: string[]
}

export type SendChatMessageInput = {
  replyToMessageId?: string | null
  body: string
  assetIds: string[]
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
const compact = (params: Query = {}) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== undefined))

export const listChatConversations = async (params: Query = {}) =>
  unwrap<Page<ChatConversation>>(
    await apiClient.get('/api/chat/conversations', { params: compact(params) }),
  )

export const getChatUnreadCount = async () =>
  unwrap<{ unreadCount: number }>(await apiClient.get('/api/chat/unread-count'))

export const createConversation = async (input: CreateConversationInput) =>
  unwrap<ChatConversation>(await apiClient.post('/api/chat/conversations', input))

export const listChatParticipants = async (params: Query = {}) =>
  unwrap<{ items: ChatParticipant[] }>(
    await apiClient.get('/api/chat/participants', { params: compact(params) }),
  )

export const listChatMessages = async (conversationId: string, params: Query = {}) =>
  unwrap<Page<ChatMessage>>(
    await apiClient.get(`/api/chat/conversations/${conversationId}/messages`, {
      params: compact(params),
    }),
  )

export const sendChatMessage = async (conversationId: string, input: SendChatMessageInput) => {
  const payload = {
    ...(input.replyToMessageId ? { replyToMessageId: input.replyToMessageId } : {}),
    body: input.body,
    assetIds: input.assetIds,
  }
  const response = await apiClient.post(
    `/api/chat/conversations/${conversationId}/messages`,
    payload,
  )
  return unwrap<ChatMessage>(response)
}

export const syncTeamsChat = async (conversationId: string) =>
  unwrap<{ status: string; syncedCount: number; teamsChatId: string }>(
    await apiClient.post(`/api/integration/teams/sync/${conversationId}`),
  )

export const markChatConversationRead = async (conversationId: string) =>
  unwrap<{ conversationId: string; accountId: string; lastReadAt: string }>(
    await apiClient.patch(`/api/chat/conversations/${conversationId}/read`),
  )
