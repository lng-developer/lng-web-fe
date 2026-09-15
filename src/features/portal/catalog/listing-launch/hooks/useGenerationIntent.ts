import { useRef } from 'react'
import { getAccount } from '@/shared/auth/session'
export function useGenerationIntent(launchId: string, kind: 'analysis' | 'content') {
  const key = `listing-launch-intent:${getAccount()?.id || 'anonymous'}:${launchId}:${kind}`
  const fallback = useRef<{ command: string; requestKey: string } | null>(null)
  return {
    getOrCreate(command: { expectedMockupRevision?: number; expectedInputVersion?: number }) {
      const encoded = JSON.stringify(command)
      let stored = fallback.current
      try {
        const raw = sessionStorage.getItem(key)
        if (raw) stored = JSON.parse(raw)
      } catch {
        /* Memory fallback when session storage is unavailable. */
      }
      if (stored?.command !== encoded || !/^[a-f0-9-]{36}$/.test(stored.requestKey))
        stored = { command: encoded, requestKey: crypto.randomUUID() }
      fallback.current = stored
      try {
        sessionStorage.setItem(key, JSON.stringify(stored))
      } catch {
        /* No image or facts are persisted. */
      }
      return { ...command, requestKey: stored.requestKey }
    },
    clear() {
      fallback.current = null
      try {
        sessionStorage.removeItem(key)
      } catch {
        /* Storage may be disabled. */
      }
    },
  }
}
