import type { NavigationGroup } from './appNavigation'
import { getCoreForPath } from './appNavigation'

export function getSidebarRouteState(pathname: string, groups: NavigationGroup[]) {
  const selected = groups
    .flatMap((group) => group.items)
    .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]
  return { core: getCoreForPath(pathname), selectedKey: selected?.key }
}
