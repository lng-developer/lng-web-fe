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

export function getInitials(name?: string) {
  if (!name) return ''
  const cleanName = name.replace(/@.*$/, '').trim()
  const parts = cleanName.split(/\s+/).filter(Boolean)
  if (!parts.length) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
}

export function conversationTitle(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
  deletedUserLabel = 'Người dùng đã xóa',
) {
  if (conversation.type === 'DIRECT') {
    const otherId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const otherParticipant = otherId ? participantById.get(otherId) : undefined
    const name = otherParticipant?.displayName || otherParticipant?.fullName
    if (name) return name
    const fallback = participantLabel(otherParticipant)
    if (fallback) return fallback
    if (conversation.title) return conversation.title
    return deletedUserLabel
  }
  return (
    conversation.title || conversation.relatedResource?.id || conversation.type.replaceAll('_', ' ')
  )
}

export function conversationInitials(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
) {
  if (conversation.type === 'DIRECT') {
    const otherId = conversation.participantAccountIds.find((id) => id !== currentAccountId)
    const otherParticipant = otherId ? participantById.get(otherId) : undefined
    if (!otherParticipant) return ''
    const name = otherParticipant.displayName || otherParticipant.fullName
    if (name) return getInitials(name)
    const fallback = participantLabel(otherParticipant)
    if (fallback) return getInitials(fallback)
    return ''
  }
  if (conversation.title) {
    return getInitials(conversation.title)
  }
  return ''
}

export function formatRelativeTime(
  value: string | null,
  labels: { now: string; minute: string; hour: string; day: string },
) {
  if (!value) return ''
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60000))
  if (minutes < 1) return labels.now
  if (minutes < 60) return `${minutes}${labels.minute}`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}${labels.hour}`
  return `${Math.round(hours / 24)}${labels.day}`
}

export function messagePreviewText(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
  emptyLabel = 'Chưa có tin nhắn',
  ownLabel = 'Bạn',
) {
  if (!conversation.lastMessagePreview) return emptyLabel
  if (conversation.lastMessageSenderAccountId === currentAccountId) {
    return `${ownLabel}: ${conversation.lastMessagePreview}`
  }
  const sender = conversation.lastMessageSenderAccountId
    ? participantLabel(participantById.get(conversation.lastMessageSenderAccountId))
    : ''
  return sender ? `${sender}: ${conversation.lastMessagePreview}` : conversation.lastMessagePreview
}

export function removeVietnameseTones(str?: string | null): string {
  if (!str) return ''
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'd')
    .toLowerCase()
    .trim()
}

export function matchesParticipantSearch(participant?: ChatParticipant, search?: string): boolean {
  if (!search || !search.trim()) return true
  if (!participant) return false
  const query = search.trim().toLowerCase()
  const normalizedQuery = removeVietnameseTones(query)

  const candidates = [
    participant.displayName,
    participant.fullName,
    participant.email,
    participant.employeeCode,
  ].filter(Boolean) as string[]

  return candidates.some((field) => {
    const lower = field.toLowerCase()
    if (lower.includes(query)) return true
    const normalizedField = removeVietnameseTones(field)
    return normalizedField.includes(normalizedQuery)
  })
}

export function matchesConversationSearch(
  conversation: ChatConversation,
  participantById: Map<string, ChatParticipant>,
  currentAccountId?: string,
  search?: string,
): boolean {
  if (!search || !search.trim()) return true
  const query = search.trim().toLowerCase()
  const normalizedQuery = removeVietnameseTones(query)

  if (conversation.title) {
    if (conversation.title.toLowerCase().includes(query)) return true
    if (removeVietnameseTones(conversation.title).includes(normalizedQuery)) return true
  }

  if (conversation.lastMessagePreview) {
    if (conversation.lastMessagePreview.toLowerCase().includes(query)) return true
    if (removeVietnameseTones(conversation.lastMessagePreview).includes(normalizedQuery))
      return true
  }

  const otherIds = conversation.participantAccountIds.filter((id) => id !== currentAccountId)
  for (const id of otherIds) {
    const participant = participantById.get(id)
    if (matchesParticipantSearch(participant, search)) return true
  }

  return false
}
