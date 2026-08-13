export const chatKeys = {
  all: ['chat'] as const,
  conversations: (params: object = {}) => [...chatKeys.all, 'conversations', params] as const,
  messages: (conversationId: string | null) =>
    [...chatKeys.all, 'messages', conversationId] as const,
}
