import { useSyncExternalStore } from 'react'

import { getSharedChatSocket, isSharedChatSocketConnected } from './chatSocket'

function subscribe(onChange: () => void) {
  const socket = getSharedChatSocket()
  if (!socket) return () => {}
  socket.on('connect', onChange)
  socket.on('disconnect', onChange)
  socket.on('connect_error', onChange)
  return () => {
    socket.off('connect', onChange)
    socket.off('disconnect', onChange)
    socket.off('connect_error', onChange)
  }
}

export function useChatSocketReady() {
  return useSyncExternalStore(subscribe, isSharedChatSocketConnected, () => false)
}
