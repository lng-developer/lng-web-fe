import { io, type Socket } from 'socket.io-client'

import type { AppNotification } from '@/features/notifications/api/notificationApi'
import type { ChatConversation, ChatMessage } from '@/features/portal/chat/api/chatApi'
import type { SendChatMessageInput } from '@/features/portal/chat/api/chatApi'
import { getAccessToken } from '@/shared/auth/session'
import { env } from '@/shared/config/env'

type ServerToClientEvents = {
  'message.created': (payload: { conversation: ChatConversation; message: ChatMessage }) => void
  'message.read': (state: { conversationId: string; accountId: string; lastReadAt: string }) => void
  'presence.changed': (event: { accountId: string; presence: 'ONLINE' | 'OFFLINE' }) => void
  typing: (event: { conversationId: string; accountId: string; isTyping: boolean }) => void
  'notification.created': (notification: AppNotification) => void
}

type ClientToServerEvents = {
  'conversation.join': (
    payload: { conversationId: string },
    ack?: (result: { ok: boolean; error?: string }) => void,
  ) => void
  'message.send': (
    payload: SendChatMessageInput & { conversationId: string },
    ack?: (result: { ok: boolean; error?: string; message?: ChatMessage }) => void,
  ) => void
  typing: (payload: { conversationId: string; isTyping: boolean }) => void
}

export type ChatSocket = Socket<ServerToClientEvents, ClientToServerEvents>

let sharedSocket: ChatSocket | null = null

export function createChatSocket(): ChatSocket | null {
  const token = getAccessToken()
  if (!token) return null
  return io(env.apiBaseUrl, {
    auth: { token },
    transports: ['websocket'],
  })
}

export function getSharedChatSocket(): ChatSocket | null {
  const token = getAccessToken()
  if (!token) {
    if (sharedSocket) {
      sharedSocket.disconnect?.()
      sharedSocket = null
    }
    return null
  }
  if (!sharedSocket) {
    sharedSocket = createChatSocket()
  }
  return sharedSocket
}

export function resetSharedChatSocket(): void {
  if (sharedSocket) {
    sharedSocket.disconnect?.()
    sharedSocket = null
  }
}

export function isSharedChatSocketConnected(): boolean {
  return Boolean(sharedSocket?.connected)
}
