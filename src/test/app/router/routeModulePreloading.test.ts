import { createMemoryRouter, type RouteObject } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'

import { createRouteModulePreloader } from '@/app/router/routeModulePreloading'

describe('route module preloading', () => {
  it('loads only the matched module before navigation and shares it with the router', async () => {
    const lazy = vi.fn(async () => ({ Component: () => null }))
    const otherLazy = vi.fn(async () => ({ Component: () => null }))
    const loader = vi.fn(async () => null)
    const routes: RouteObject[] = [
      { path: '/' },
      { path: '/portal/orders', lazy, loader },
      { path: '/portal/extensions/logs', lazy: otherLazy },
    ]
    const preload = createRouteModulePreloader(routes)
    expect(lazy).not.toHaveBeenCalled()

    await preload('/portal/orders?salesChannelCode=amazon')
    expect(lazy).toHaveBeenCalledTimes(1)
    expect(otherLazy).not.toHaveBeenCalled()
    expect(loader).not.toHaveBeenCalled()

    const router = createMemoryRouter(routes)
    await router.navigate('/portal/orders?salesChannelCode=amazon')
    expect(lazy).toHaveBeenCalledTimes(1)
    expect(loader).toHaveBeenCalledTimes(1)
    router.dispose()
  })

  it('allows navigation to retry when a speculative load fails', async () => {
    const lazy = vi.fn(async () => ({ Component: () => null }))
    lazy.mockRejectedValueOnce(new Error('temporary module failure'))
    const routes: RouteObject[] = [{ path: '/' }, { path: '/orders', lazy }]
    const preload = createRouteModulePreloader(routes)

    await preload('/orders')
    const router = createMemoryRouter(routes)
    await router.navigate('/orders')
    expect(lazy).toHaveBeenCalledTimes(2)
    expect(router.state.errors).toBeNull()
    router.dispose()
  })
})
