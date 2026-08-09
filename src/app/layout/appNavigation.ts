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
const systemPermissions = ['AUTH:READ', 'AUTH:WRITE', 'AUDIT:READ']

const effectivePermissions = (account: CurrentAccount) =>
  new Set([...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)])

export function getContextNavigation(core: AppCoreKey, account: CurrentAccount): NavigationGroup[] {
  const permissions = effectivePermissions(account)
  const globalPermissions = new Set(account.permissions)
  if (core === 'portal') {
    return [
      {
        key: 'setup',
        labelKey: 'shell.groups.portalSetup',
        items: [
          permissions.has('SHOPS:READ')
            ? { key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' }
            : null,
          permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
            ? { key: 'catalog', path: '/portal/catalog', labelKey: 'shell.navigation.catalog' }
            : null,
          globalPermissions.has('VENDORS:READ')
            ? { key: 'vendors', path: '/portal/vendors', labelKey: 'shell.navigation.vendors' }
            : null,
          globalPermissions.has('MEDIA:READ')
            ? { key: 'media', path: '/portal/media', labelKey: 'shell.navigation.media' }
            : null,
        ].filter((item): item is NavigationItem => item !== null),
      },
      {
        key: 'order-workflow',
        labelKey: 'shell.groups.portalOrderWorkflow',
        items: [
          permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
            ? { key: 'orders', path: '/portal/orders', labelKey: 'shell.navigation.orders' }
            : null,
          permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
            ? {
                key: 'customizations',
                path: '/portal/customizations',
                labelKey: 'shell.navigation.customizations',
              }
            : null,
          permissions.has('MAPPING:READ') || permissions.has('MAPPING:WRITE')
            ? {
                key: 'mapping',
                path: '/portal/mapping',
                labelKey: 'shell.navigation.mapping',
              }
            : null,
          permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
            ? {
                key: 'integrations',
                path: '/portal/integrations',
                labelKey: 'shell.navigation.integrations',
              }
            : null,
        ].flatMap((item) => item ?? []),
      },
      {
        key: 'fulfillment',
        labelKey: 'shell.groups.portalFulfillment',
        items: [
          ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some((permission) =>
            permissions.has(permission),
          )
            ? { key: 'design', path: '/portal/design', labelKey: 'shell.navigation.design' }
            : null,
          ['PRODUCTION:READ', 'PRODUCTION:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some(
            (permission) => permissions.has(permission),
          )
            ? {
                key: 'production',
                path: '/portal/production',
                labelKey: 'shell.navigation.production',
              }
            : null,
          permissions.has('VENDOR_SUBMISSIONS:READ')
            ? {
                key: 'vendor-submissions',
                path: '/portal/vendor-submissions',
                labelKey: 'shell.navigation.vendorSubmissions',
              }
            : null,
          permissions.has('SHIPMENTS:READ') || permissions.has('SHIPMENTS:WRITE')
            ? {
                key: 'shipments',
                path: '/portal/shipments',
                labelKey: 'shell.navigation.shipments',
              }
            : null,
        ].flatMap((item) => item ?? []),
      },
      {
        key: 'performance',
        labelKey: 'shell.groups.portalPerformance',
        items: [
          permissions.has('FINANCE:READ') || permissions.has('FINANCE:WRITE')
            ? { key: 'finance', path: '/portal/finance', labelKey: 'shell.navigation.finance' }
            : null,
          permissions.has('REPORTS:READ')
            ? { key: 'reports', path: '/portal/reports', labelKey: 'shell.navigation.reports' }
            : null,
          ['WORK_SCORES:READ', 'WORK_SCORES:ADJUST', 'DESIGN:WORK'].some((permission) =>
            permissions.has(permission),
          )
            ? {
                key: 'work-scores',
                path: '/portal/work-scores',
                labelKey: 'shell.navigation.workScores',
              }
            : null,
        ].filter((item): item is NavigationItem => item !== null),
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
          permissions.has('AUTH:READ') || permissions.has('AUTH:WRITE')
            ? { key: 'accounts', path: '/auth/accounts', labelKey: 'shell.navigation.accounts' }
            : null,
          permissions.has('AUTH:READ') || permissions.has('AUTH:WRITE')
            ? {
                key: 'access-control',
                path: '/auth/access-control',
                labelKey: 'shell.navigation.accessControl',
              }
            : null,
          permissions.has('AUDIT:READ')
            ? { key: 'audit-log', path: '/auth/audit-log', labelKey: 'shell.navigation.auditLog' }
            : null,
          permissions.has('AUDIT:READ')
            ? {
                key: 'monitoring',
                path: '/auth/monitoring',
                labelKey: 'shell.navigation.monitoring',
              }
            : null,
        ].filter((item): item is NavigationItem => item !== null),
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
  if (!core) return '/operations-dashboard'
  const groups = getContextNavigation(core, account)
  if (core === 'hr') {
    const priority = ['operations', 'payroll', 'team', 'personal']
    return (
      priority
        .map((key) => groups.find((group) => group.key === key)?.items[0]?.path)
        .find(Boolean) ?? '/operations-dashboard'
    )
  }
  return groups[0]?.items[0]?.path ?? '/operations-dashboard'
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
