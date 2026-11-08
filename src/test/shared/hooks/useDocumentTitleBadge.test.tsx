import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { useDocumentTitleBadge } from '@/shared/hooks/useDocumentTitleBadge'

describe('useDocumentTitleBadge', () => {
  const originalTitle = document.title

  beforeEach(() => {
    vi.useFakeTimers()
    document.title = ''
  })

  afterEach(() => {
    vi.useRealTimers()
    document.title = originalTitle
    vi.restoreAllMocks()
  })

  it('updates document title with page title and app name without badge when unread is 0', () => {
    renderHook(() =>
      useDocumentTitleBadge({
        pageTitle: 'Orders',
        appName: 'LNG Web',
        unreadCount: 0,
      }),
    )

    expect(document.title).toBe('Orders | LNG Web')
  })

  it('includes unread badge in document title when unreadCount > 0', () => {
    renderHook(() =>
      useDocumentTitleBadge({
        pageTitle: 'Orders',
        appName: 'LNG Web',
        unreadCount: 9,
      }),
    )

    expect(document.title).toBe('(9) Orders | LNG Web')
  })

  it('alternates title when flashMessage is active and tab is hidden', () => {
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'hidden',
    })
    Object.defineProperty(document, 'hasFocus', {
      configurable: true,
      value: () => false,
    })

    const onClearFlash = vi.fn()

    renderHook(() =>
      useDocumentTitleBadge({
        pageTitle: 'Orders',
        appName: 'LNG Web',
        unreadCount: 3,
        flashMessage: '🔔 Tin nhắn mới!',
        onClearFlash,
      }),
    )

    expect(document.title).toBe('🔔 Tin nhắn mới!')

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(document.title).toBe('(3) Orders | LNG Web')

    act(() => {
      vi.advanceTimersByTime(1200)
    })
    expect(document.title).toBe('🔔 Tin nhắn mới!')

    // When focus returns, flash should stop and call onClearFlash
    act(() => {
      window.dispatchEvent(new Event('focus'))
    })

    expect(document.title).toBe('(3) Orders | LNG Web')
    expect(onClearFlash).toHaveBeenCalled()
  })
})
