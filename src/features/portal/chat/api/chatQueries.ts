import { queryOptions, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'

import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { listChatConversations, listChatMessages, syncTeamsChat, type ChatMessage } from './chatApi'
import { chatKeys } from './chatKeys'

const MESSAGE_LIMIT = 50

export const chatConversationOptions = () =>
  queryOptions({
    queryKey: chatKeys.conversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
    queryFn: () => listChatConversations({ page: 1, limit: DEFAULT_PAGE_SIZE }),
  })

export const chatMessageOptions = (conversationId: string | null) =>
  queryOptions({
    queryKey: chatKeys.messages(conversationId),
    queryFn: () => listChatMessages(conversationId!, { page: 1, limit: MESSAGE_LIMIT }),
    enabled: Boolean(conversationId),
  })

export async function receiveChatMessage(client: QueryClient, message: ChatMessage) {
  const queryKey = chatMessageOptions(message.conversationId).queryKey
  const refreshHistory =
    !client.getQueryData(queryKey) || client.getQueryState(queryKey)?.fetchStatus === 'fetching'
  // An older HTTP response must not replace the message delivered by the socket/ACK.
  await client.cancelQueries({ queryKey, exact: true })
  client.setQueryData(queryKey, (current) => {
    if (!current)
      return { items: [message], pagination: { page: 1, limit: MESSAGE_LIMIT, total: 1 } }
    const exists = current.items.some(({ id }) => id === message.id)
    const items = [...current.items.filter(({ id }) => id !== message.id), message]
      .sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id))
      .slice(-MESSAGE_LIMIT)
    return {
      ...current,
      items,
      pagination: { ...current.pagination, total: current.pagination.total + (exists ? 0 : 1) },
    }
  })
  if (refreshHistory) void client.invalidateQueries({ queryKey }, { cancelRefetch: false })
  // Read state is account-specific; use the server result instead of two UI counters.
  void client.invalidateQueries(
    { queryKey: [...chatKeys.all, 'conversations'] },
    { cancelRefetch: false },
  )
  void client.invalidateQueries({ queryKey: chatKeys.unread }, { cancelRefetch: false })
}

export function useTeamsChatSync(conversationId: string | null, enabled: boolean) {
  const client = useQueryClient()
  return useQuery({
    queryKey: ['teams-chat-sync', conversationId],
    queryFn: async () => {
      const result = await syncTeamsChat(conversationId!)
      if (result.syncedCount > 0) {
        await Promise.all([
          client.invalidateQueries(
            { queryKey: chatKeys.messages(conversationId) },
            { cancelRefetch: false },
          ),
          client.invalidateQueries(
            { queryKey: [...chatKeys.all, 'conversations'] },
            { cancelRefetch: false },
          ),
          client.invalidateQueries({ queryKey: chatKeys.unread }, { cancelRefetch: false }),
        ])
      }
      return result
    },
    enabled: Boolean(conversationId) && enabled,
    staleTime: 8000,
    refetchInterval: 8000,
    refetchIntervalInBackground: false,
    retry: false,
  })
}
