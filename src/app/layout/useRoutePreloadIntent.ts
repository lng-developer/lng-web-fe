import { type FocusEvent, type MouseEvent, useEffect, useRef } from 'react'

const HOVER_DELAY_MS = 80

function routeHref(target: EventTarget | null) {
  if (!(target instanceof Element)) return undefined
  const link =
    target.closest('a[href]') ?? target.closest('li[role="menuitem"]')?.querySelector('a[href]')
  const href = link?.getAttribute('href')
  return href?.startsWith('/') && !href.startsWith('//') ? href : undefined
}

export function useRoutePreloadIntent(preloadRoute?: (path: string) => void) {
  const timer = useRef<number | undefined>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  if (!preloadRoute) return {}

  return {
    onMouseOver(event: MouseEvent<HTMLElement>) {
      const href = routeHref(event.target)
      if (!href || href === routeHref(event.relatedTarget)) return
      window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => preloadRoute(href), HOVER_DELAY_MS)
    },
    onMouseOut(event: MouseEvent<HTMLElement>) {
      if (routeHref(event.target) !== routeHref(event.relatedTarget)) {
        window.clearTimeout(timer.current)
      }
    },
    onFocusCapture(event: FocusEvent<HTMLElement>) {
      const href = routeHref(event.target)
      if (href) preloadRoute(href)
    },
  }
}
