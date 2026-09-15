import { useSyncExternalStore } from 'react'
const subscribe = (listener: () => void) => {
  document.addEventListener('visibilitychange', listener)
  return () => document.removeEventListener('visibilitychange', listener)
}
export const activeRun = (status?: string) => status === 'QUEUED' || status === 'RUNNING'
export function useLaunchRunPolling() {
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState !== 'hidden',
    () => true,
  )
}
