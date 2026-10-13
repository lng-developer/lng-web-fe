import type { ChatConversation, ChatParticipant } from '@/features/portal/chat/api/chatApi'

export function participantLabel(participant?: ChatParticipant) {
  return (
    participant?.displayName ||
    participant?.fullName ||
    participant?.email ||
    participant?.employeeCode ||
    ''
  )
}

export function conversationTitle(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
) {
  if (conversation.type === 'DIRECT') {
    const otherId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const otherParticipant = otherId ? participantById.get(otherId) : undefined
    const name = otherParticipant?.displayName || otherParticipant?.fullName
    if (name) return name
    const fallback = participantLabel(otherParticipant)
    if (fallback) return fallback
    if (conversation.title) return conversation.title
  }
  return (
    conversation.title || conversation.relatedResource?.id || conversation.type.replaceAll('_', ' ')
  )
}
