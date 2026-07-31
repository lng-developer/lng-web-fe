import type { AppCoreKey, NavigationGroup } from './appNavigation'

const storageKey = (core: AppCoreKey) => `lng:last-route:${core}`
const items = (groups: NavigationGroup[]) => groups.flatMap((group) => group.items)

export function rememberCoreRoute(core: AppCoreKey, pathname: string, groups: NavigationGroup[]) {
  const match = items(groups)
    .filter(({ path }) => pathname === path || pathname.startsWith(`${path}/`))
    .sort((left, right) => right.path.length - left.path.length)[0]
  if (match) localStorage.setItem(storageKey(core), match.path)
}

export function getRememberedCoreRoute(core: AppCoreKey, groups: NavigationGroup[]) {
  const available = items(groups)
  const remembered = localStorage.getItem(storageKey(core))
  return available.find(({ path }) => path === remembered)?.path ?? available[0]?.path
}
