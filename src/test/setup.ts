import '@testing-library/jest-dom/vitest'

import { cleanup } from '@testing-library/react'
import { afterEach, vi } from 'vitest'

import i18n from '@/shared/i18n/i18n'

afterEach(async () => {
  cleanup()
  vi.useRealTimers()
  window.localStorage.clear()
  await i18n.changeLanguage('en')
})

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: (query: string): MediaQueryList => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => undefined,
    removeListener: () => undefined,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    dispatchEvent: () => false,
  }),
})

const originalGetComputedStyle = window.getComputedStyle
window.getComputedStyle = (element) => {
  const style = originalGetComputedStyle(element)
  if (
    element.classList?.contains('ant-popover') ||
    element.classList?.contains('ant-modal') ||
    element.classList?.contains('ant-modal-wrap') ||
    element.classList?.contains('ant-modal-content') ||
    element.classList?.contains('ant-modal-container')
  ) {
    return new Proxy(style, {
      get(target, prop) {
        if (prop === 'opacity') return '1'
        return Reflect.get(target, prop)
      },
    })
  }
  return style
}

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

globalThis.ResizeObserver = ResizeObserverMock
