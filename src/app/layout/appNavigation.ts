import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getHrNavigation } from '@/features/hr/hrNavigation'

export type AppCoreKey = 'portal' | 'hr' | 'system'

export type NavigationItem = {
  key: string
  path: string
  labelKey: string
}

export type NavigationGroup = {
  key: string
  labelKey: string
  items: NavigationItem[]
}

const organizationPermissions = [
  'DEPARTMENTS:READ',
  'DEPARTMENTS:WRITE',
  'TEAMS:READ',
  'TEAMS:WRITE',
]
const systemPermissions = ['AUTH:READ', 'AUTH:WRITE']

const effectivePermissions = (account: CurrentAccount) =>
  new Set([...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)])

export function getContextNavigation(core: AppCoreKey, account: CurrentAccount): NavigationGroup[] {
  const permissions = effectivePermissions(account)
  const globalPermissions = new Set(account.permissions)
  if (core === 'portal') {
    return [
      {
        key: 'configuration',
        labelKey: 'shell.groups.portalConfiguration',
        items: [
          permissions.has('SHOPS:READ')
            ? { key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' }
            : null,
          globalPermissions.has('VENDORS:READ')
            ? { key: 'vendors', path: '/portal/vendors', labelKey: 'shell.navigation.vendors' }
            : null,
        ].filter((item): item is NavigationItem => item !== null),
      },
      {
        key: 'operations',
        labelKey: 'shell.groups.portalOperations',
        items:
          permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
            ? [
                {
                  key: 'integrations',
                  path: '/portal/integrations',
                  labelKey: 'shell.navigation.integrations',
                },
              ]
            : [],
      },
    ].filter(({ items }) => items.length)
  }
  if (core === 'system') {
    if (!systemPermissions.some((permission) => permissions.has(permission))) return []
    return [
      {
        key: 'system',
        labelKey: 'shell.groups.system',
        items: [
          { key: 'accounts', path: '/auth/accounts', labelKey: 'shell.navigation.accounts' },
          {
            key: 'access-control',
            path: '/auth/access-control',
            labelKey: 'shell.navigation.accessControl',
          },
        ],
      },
    ]
  }

  const routes = getHrNavigation(permissions)
  const groups: NavigationGroup[] = [
    {
      key: 'personal',
      labelKey: 'shell.groups.personal',
      items: routes.filter(({ workspace }) => workspace === 'self').map(toItem),
    },
    {
      key: 'team',
      labelKey: 'shell.groups.team',
      items: routes.filter(({ workspace }) => workspace === 'team').map(toItem),
    },
    {
      key: 'operations',
      labelKey: 'shell.groups.hrOperations',
      items: routes.filter(({ workspace }) => workspace === 'operations').map(toItem),
    },
    {
      key: 'payroll',
      labelKey: 'shell.groups.payroll',
      items: routes.filter(({ workspace }) => workspace === 'payroll').map(toItem),
    },
  ]
  if (organizationPermissions.some((permission) => permissions.has(permission))) {
    groups[2].items.push({
      key: 'organization',
      path: '/organization',
      labelKey: 'shell.navigation.organization',
    })
  }
  return groups.filter(({ items }) => items.length)
}

export function getAvailableCores(account: CurrentAccount) {
  return (['portal', 'hr', 'system'] as const)
    .filter((key) => getContextNavigation(key, account).length)
    .map((key) => ({ key, labelKey: `shell.cores.${key}` }))
}

export function getCoreForPath(pathname: string): AppCoreKey | undefined {
  if (pathname.startsWith('/portal')) return 'portal'
  if (pathname.startsWith('/hr') || pathname.startsWith('/organization')) return 'hr'
  if (pathname.startsWith('/auth')) return 'system'
  return undefined
}

export function getDefaultWorkspacePath(account: CurrentAccount) {
  const core = getAvailableCores(account)[0]?.key
  if (!core) return '/foundation'
  const groups = getContextNavigation(core, account)
  if (core === 'hr') {
    const priority = ['operations', 'payroll', 'team', 'personal']
    return (
      priority
        .map((key) => groups.find((group) => group.key === key)?.items[0]?.path)
        .find(Boolean) ?? '/foundation'
    )
  }
  return groups[0]?.items[0]?.path ?? '/foundation'
}

export function getNavigationGroupForItem(groups: NavigationGroup[], itemKey?: string) {
  return groups.find((group) => group.items.some(({ key }) => key === itemKey))?.key
}

function toItem(route: ReturnType<typeof getHrNavigation>[number]): NavigationItem {
  const rootLabels: Record<string, string> = {
    self: 'shell.navigation.myDay',
    team: 'shell.navigation.teamOverview',
    operations: 'shell.navigation.hrOverview',
  }
  return { key: route.key, path: route.path, labelKey: rootLabels[route.key] ?? route.labelKey }
}
