import { useEffect, useRef } from 'react'

import { formatDocumentTitle } from '@/app/layout/pageTitle'

export interface UseDocumentTitleBadgeOptions {
  pageTitle?: string | null
  appName?: string
  unreadCount?: number
  flashMessage?: string | null
  onClearFlash?: () => void
}

export function useDocumentTitleBadge({
  pageTitle,
  appName = 'LNG Web',
  unreadCount = 0,
  flashMessage = null,
  onClearFlash,
}: UseDocumentTitleBadgeOptions) {
  const onClearFlashRef = useRef(onClearFlash)

  useEffect(() => {
    onClearFlashRef.current = onClearFlash
  }, [onClearFlash])

  useEffect(() => {
    if (typeof document === 'undefined') return

    const baseTitle = formatDocumentTitle(pageTitle, appName, unreadCount)

    // If no flash message, simply keep the base title updated
    if (!flashMessage) {
      document.title = baseTitle
      return
    }

    const isTabActive = () =>
      document.visibilityState === 'visible' &&
      (typeof document.hasFocus !== 'function' || document.hasFocus())

    // If tab is already active and focused, clear flash and keep base title
    if (isTabActive()) {
      document.title = baseTitle
      onClearFlashRef.current?.()
      return
    }

    let showFlash = true
    document.title = flashMessage

    const intervalId = window.setInterval(() => {
      showFlash = !showFlash
      document.title = showFlash ? flashMessage : baseTitle
    }, 1200)

    const handleActive = () => {
      window.clearInterval(intervalId)
      document.title = baseTitle
      onClearFlashRef.current?.()
    }

    window.addEventListener('focus', handleActive)
    document.addEventListener('visibilitychange', handleActive)

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener('focus', handleActive)
      document.removeEventListener('visibilitychange', handleActive)
    }
  }, [pageTitle, appName, unreadCount, flashMessage])
}
