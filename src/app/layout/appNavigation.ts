import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getHrNavigation } from '@/features/hr/hrNavigation'
import { getHrAccess } from '@/features/hr/hrViews'

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
  standalone?: boolean
}

const organizationPermissions = [
  'DEPARTMENTS:READ',
  'DEPARTMENTS:WRITE',
  'TEAMS:READ',
  'TEAMS:WRITE',
]
const systemPermissions = [
  'AUTH:READ',
  'AUTH:WRITE',
  'AUDIT:READ',
  'MEDIA:READ',
  'CUSTOMERS:READ',
  'ORDERS:READ',
  'ORDERS:WRITE',
  'WORK_SCORES:READ',
  'WORK_SCORES:ADJUST',
  'DESIGN:WORK',
]

export const effectivePermissions = (account: CurrentAccount) =>
  new Set([...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)])

export const hasFinanceAccess = (account: CurrentAccount) =>
  account.roles.includes('SUPER_ADMIN') ||
  effectivePermissions(account).has('FINANCE:READ') ||
  effectivePermissions(account).has('FINANCE:WRITE')

export const hasExplicitHrAccess = (permissions: Set<string>) =>
  [...permissions].some((permission) => permission.startsWith('HR_')) ||
  organizationPermissions.some((permission) => permissions.has(permission))

export const canReadHrDashboard = (permissions: Set<string>) =>
  [...permissions].some((permission) => permission.startsWith('HR_'))

export const canReadOperationsDashboard = (permissions: Set<string>) =>
  ['REPORTS:READ', 'FINANCE:READ', 'FINANCE:WRITE'].some((permission) =>
    permissions.has(permission),
  )

const getDashboardGroup = (
  core: AppCoreKey,
  permissions: Set<string>,
): NavigationGroup | undefined => {
  const item =
    core === 'portal' && canReadOperationsDashboard(permissions)
      ? { key: 'operations-dashboard', path: '/portal/dashboard' }
      : core === 'hr' && canReadHrDashboard(permissions)
        ? { key: 'hr-dashboard', path: '/hr/dashboard' }
        : core === 'system' &&
            ['AUTH:READ', 'AUDIT:READ'].some((permission) => permissions.has(permission))
          ? { key: 'system-dashboard', path: '/system/dashboard' }
          : null

  return item
    ? {
        key: 'dashboard',
        labelKey: 'shell.navigation.dashboard',
        standalone: true,
        items: [
          {
            ...item,
            labelKey: 'shell.navigation.dashboard',
          },
        ],
      }
    : undefined
}

const withDashboardGroup = (
  groups: NavigationGroup[],
  core: AppCoreKey,
  permissions: Set<string>,
): NavigationGroup[] => {
  const dashboardGroup = getDashboardGroup(core, permissions)
  return dashboardGroup ? [dashboardGroup, ...groups] : groups
}

export function getContextNavigation(core: AppCoreKey, account: CurrentAccount): NavigationGroup[] {
  const permissions = effectivePermissions(account)
  const globalPermissions = new Set(account.permissions)
  const canAccessFinance = hasFinanceAccess(account)
  if (core === 'portal') {
    return withDashboardGroup(
      [
        {
          key: 'orders',
          labelKey: 'shell.groups.legacyOrders',
          items: [
            permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
              ? {
                  key: 'orders',
                  path: workspaceRouteLinks.orders,
                  labelKey: 'shell.navigation.orders',
                }
              : null,
            ['ORDERS:READ', 'ORDERS:WRITE', 'CATALOG:WRITE'].some((permission) =>
              permissions.has(permission),
            )
              ? {
                  key: 'integrations',
                  path: '/portal/integrations',
                  labelKey: 'shell.navigation.integrations',
                }
              : null,
          ].flatMap((item) => item ?? []),
        },
        {
          key: 'team-tasks',
          labelKey: 'shell.groups.legacyTeamTasks',
          items: [
            ['DESIGN:READ', 'DESIGN:WRITE', 'DESIGN:WORK', 'DESIGN:REVIEW'].some((permission) =>
              permissions.has(permission),
            )
              ? {
                  key: 'design',
                  path: '/portal/design/idea-tasks',
                  labelKey: 'shell.navigation.design',
                }
              : null,
            ['DESIGN:PSD_REQUEST'].some((permission) => permissions.has(permission))
              ? {
                  key: 'psd-requests',
                  path: '/portal/design/psd-tasks',
                  labelKey: 'legacyMenu.psdTasks',
                }
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
          key: 'listing',
          labelKey: 'shell.groups.legacyListing',
          items: [
            permissions.has('SHOPS:READ')
              ? { key: 'shops', path: '/portal/shops', labelKey: 'shell.navigation.shops' }
              : null,
            permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
              ? { key: 'catalog', path: '/portal/catalog', labelKey: 'shell.navigation.catalog' }
              : null,
          ].filter((item): item is NavigationItem => item !== null),
        },
        {
          key: 'cost-centers',
          labelKey: 'shell.groups.legacyCostCenters',
          items: [
            permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
              ? {
                  key: 'product-types',
                  path: '/portal/catalog/product-types',
                  labelKey: 'shell.navigation.productTypes',
                }
              : null,
            permissions.has('CATALOG:READ') || permissions.has('CATALOG:WRITE')
              ? {
                  key: 'internal-templates',
                  path: '/portal/catalog/templates',
                  labelKey: 'shell.navigation.internalTemplates',
                }
              : null,
            permissions.has('MAPPING:READ') || permissions.has('MAPPING:WRITE')
              ? { key: 'mapping', path: '/portal/mapping', labelKey: 'shell.navigation.mapping' }
              : null,
          ].filter((item): item is NavigationItem => item !== null),
        },
        {
          key: 'finance',
          labelKey: 'shell.navigation.finance',
          items: [
            canAccessFinance
              ? { key: 'finance', path: '/portal/finance', labelKey: 'shell.navigation.finance' }
              : null,
            canAccessFinance
              ? {
                  key: 'settlements',
                  path: '/portal/finance/settlements',
                  labelKey: 'finance.settlements.settlement',
                }
              : null,
          ].filter((item): item is NavigationItem => item !== null),
        },
        {
          key: 'reports',
          labelKey: 'shell.navigation.reports',
          items: [
            permissions.has('REPORTS:READ')
              ? { key: 'reports', path: '/portal/reports', labelKey: 'shell.navigation.reports' }
              : null,
          ].filter((item): item is NavigationItem => item !== null),
        },
      ].filter(({ items }) => items.length),
      'portal',
      permissions,
    )
  }
  if (core === 'system') {
    if (!systemPermissions.some((permission) => permissions.has(permission))) return []
    return withDashboardGroup(
      [
        {
          key: 'monitoring',
          labelKey: 'shell.groups.legacyMonitoring',
          items: [
            permissions.has('AUDIT:READ')
              ? { key: 'audit-log', path: '/portal/audit', labelKey: 'shell.navigation.auditLog' }
              : null,
            permissions.has('AUDIT:READ')
              ? {
                  key: 'monitoring',
                  path: '/portal/monitoring',
                  labelKey: 'shell.navigation.monitoring',
                }
              : null,
          ].filter((item): item is NavigationItem => item !== null),
        },
        {
          key: 'configuration',
          labelKey: 'shell.groups.legacyConfiguration',
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
            globalPermissions.has('MEDIA:READ')
              ? { key: 'media', path: '/portal/media', labelKey: 'shell.navigation.media' }
              : null,
            permissions.has('CUSTOMERS:READ')
              ? {
                  key: 'customers',
                  path: '/portal/customers',
                  labelKey: 'shell.navigation.customers',
                }
              : null,
            permissions.has('ORDERS:READ') || permissions.has('ORDERS:WRITE')
              ? {
                  key: 'customizations',
                  path: '/portal/customizations',
                  labelKey: 'shell.navigation.customizations',
                }
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
      ].filter(({ items }) => items.length),
      'system',
      permissions,
    )
  }

  const routes = getHrNavigation(getHrAccess(account), { includeSelf: true })
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
  if (organizationPermissions.some((permission) => globalPermissions.has(permission))) {
    groups[2].items.push({
      key: 'organization',
      path: '/organization',
      labelKey: 'shell.navigation.organization',
    })
  }
  return withDashboardGroup(
    groups.filter(({ items }) => items.length),
    'hr',
    globalPermissions,
  )
}

export function getAvailableCores(account: CurrentAccount) {
  return (['portal', 'hr', 'system'] as const)
    .filter((key) => getContextNavigation(key, account).length)
    .map((key) => ({ key, labelKey: `shell.cores.${key}` }))
}

export function getCoreForPath(pathname: string): AppCoreKey | undefined {
  if (pathname.startsWith('/operations-dashboard') || pathname.startsWith('/foundation'))
    return 'portal'
  if (pathname.startsWith('/system/dashboard')) return 'system'
  if (
    pathname.startsWith('/portal/media') ||
    pathname.startsWith('/portal/customers') ||
    pathname.startsWith('/portal/customizations') ||
    pathname.startsWith('/portal/work-scores') ||
    pathname.startsWith('/portal/monitoring') ||
    pathname.startsWith('/portal/audit')
  )
    return 'system'
  if (pathname.startsWith('/portal')) return 'portal'
  if (pathname.startsWith('/hr') || pathname.startsWith('/organization')) return 'hr'
  if (pathname.startsWith('/auth')) return 'system'
  return undefined
}

export function getDefaultWorkspacePath(account: CurrentAccount) {
  const availableCores = getAvailableCores(account)
  const permissions = effectivePermissions(account)
  const core =
    availableCores.find(({ key }) => key === 'portal')?.key ??
    (hasExplicitHrAccess(permissions)
      ? availableCores.find(({ key }) => key === 'hr')?.key
      : availableCores.find(({ key }) => key === 'system')?.key) ??
    availableCores.find(({ key }) => key === 'hr')?.key
  if (!core) return '/operations-dashboard'
  const groups = getContextNavigation(core, account)
  if (core === 'portal') {
    return groups[0]?.items[0]?.path ?? '/operations-dashboard'
  }
  if (core === 'hr') {
    if (groups[0]?.key === 'dashboard') return groups[0].items[0]?.path ?? '/operations-dashboard'
    const priority = ['operations', 'payroll', 'team', 'personal']
    return (
      priority
        .map((key) => groups.find((group) => group.key === key)?.items[0]?.path)
        .find(Boolean) ?? '/operations-dashboard'
    )
  }
  return (
    groups.find(({ key }) => key !== 'dashboard')?.items[0]?.path ??
    groups[0]?.items[0]?.path ??
    '/operations-dashboard'
  )
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
