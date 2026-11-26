import { matchRoutes, type RouteObject } from 'react-router-dom'

function cacheLazyModules(routes: RouteObject[]) {
  for (const route of routes) {
    const load = route.lazy
    if (typeof load === 'function') {
      let pending: ReturnType<typeof load> | undefined
      route.lazy = () => {
        pending ??= Promise.resolve()
          .then(load)
          .catch((error: unknown) => {
            pending = undefined
            throw error
          })
        return pending
      }
    }
    if (route.children) cacheLazyModules(route.children)
  }
}

export function createRouteModulePreloader(routes: RouteObject[]) {
  cacheLazyModules(routes)

  return async (path: string) => {
    const matches = matchRoutes(routes, path) ?? []
    await Promise.all(
      matches.map(({ route }) => {
        if (typeof route.lazy === 'function') return route.lazy().catch(() => undefined)
      }),
    )
  }
}
