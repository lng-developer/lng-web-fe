import type { NavigationGroup } from './appNavigation'
import { getCoreForPath } from './appNavigation'

export function normalizeSidebarPath(pathname: string): string {
  if (pathname === '/portal/monitoring') return '/auth/monitoring'
  if (pathname === '/portal/audit') return '/auth/audit-log'
  if (pathname === '/operations-dashboard' || pathname === '/foundation') return '/portal/dashboard'
  if (pathname === '/portal/customization') return '/portal/customizations'
  return pathname
}

export function isDashboardRoute(pathname: string): boolean {
  const normalized = normalizeSidebarPath(pathname)
  return normalized === '/portal/dashboard' || normalized === '/hr/dashboard'
}

export function getSidebarRouteState(pathname: string, groups: NavigationGroup[]) {
  const normalized = normalizeSidebarPath(pathname)
  const selected = groups
    .flatMap((group) => group.items)
    .filter(({ path }) => normalized === path || normalized.startsWith(`${path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]
  return { core: getCoreForPath(pathname), selectedKey: selected?.key }
}
