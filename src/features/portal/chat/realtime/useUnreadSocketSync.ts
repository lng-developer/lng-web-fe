import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'

import { chatKeys } from '../api/chatKeys'
import { getSharedChatSocket } from './chatSocket'
import { useChatSocketReady } from './useChatSocketReady'

// Mounted once by AppShell; all unread observers share the same query cache.
export function useUnreadSocketSync() {
  const client = useQueryClient()
  const ready = useChatSocketReady()
  useEffect(() => {
    const socket = getSharedChatSocket()
    if (!socket) return
    const refreshChat = () => {
      void client.invalidateQueries({ queryKey: chatKeys.unread }, { cancelRefetch: false })
    }
    const refreshNotifications = () => {
      void client.invalidateQueries({ queryKey: ['notifications'] }, { cancelRefetch: false })
    }
    const refreshAll = () => {
      refreshChat()
      refreshNotifications()
    }
    socket.on('connect', refreshAll)
    socket.on('message.created', refreshChat)
    socket.on('message.read', refreshChat)
    socket.on('notification.created', refreshNotifications)
    return () => {
      socket.off('connect', refreshAll)
      socket.off('message.created', refreshChat)
      socket.off('message.read', refreshChat)
      socket.off('notification.created', refreshNotifications)
    }
  }, [client])
  return ready
}
