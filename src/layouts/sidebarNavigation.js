import { ROUTES } from '../constants/routes.js'
import { hasAnyPermission } from '../features/auth/utils/authz.js'

export const APP_ROLES = {
  ADMIN: 'admin',
  DESIGNER: 'designer',
  QC: 'qc',
  FULFILLMENT: 'fulfillment',
  CS: 'cs',
}

export const ALL_APP_ROLES = Object.values(APP_ROLES)
export const SIDEBAR_ROLE_FILTERING_ENABLED = false
export const SIDEBAR_NAV_TABS = {
  PORTAL: 'portal',
  HR: 'hr',
}

const MOUNTED_ROUTE_PATHS = new Set([
  ROUTES.HOME,
  ROUTES.PORTAL_ORDER_LIST,
  ROUTES.PORTAL_ORDER_WORKBENCH,
  ROUTES.PORTAL_CATALOG_SETUP,
  ROUTES.PORTAL_LISTINGS,
  ROUTES.PORTAL_MAPPING_WORKBENCH,
  ROUTES.PORTAL_PRODUCTION,
  ROUTES.PORTAL_SCALE,
  ROUTES.PORTAL_QC,
  ROUTES.PORTAL_SHIPPING,
  ROUTES.PORTAL_VENDOR_SUBMISSIONS,
  ROUTES.PORTAL_DESIGN_TASKS,
  ROUTES.PORTAL_FINANCE_SUMMARY,
  ROUTES.PORTAL_REPORTS,
  ROUTES.PORTAL_VENDOR_LIST,
  ROUTES.PORTAL_PRODUCTS_COST,
  ROUTES.PORTAL_USERS_ROLES,
  ROUTES.PORTAL_API_COVERAGE,
  ROUTES.PORTAL_AUDIT_LOG,
])

export const SIDEBAR_TABS = [
  {
    id: SIDEBAR_NAV_TABS.PORTAL,
    labelKey: 'nav.portal',
  },
  {
    id: SIDEBAR_NAV_TABS.HR,
    labelKey: 'nav.hr',
  },
]

const ROLE_ACCESS = {
  ALL: ALL_APP_ROLES,
  ADMIN: [APP_ROLES.ADMIN],
  DESIGN: [APP_ROLES.ADMIN, APP_ROLES.DESIGNER],
  QC: [APP_ROLES.ADMIN, APP_ROLES.QC],
  FULFILLMENT: [APP_ROLES.ADMIN, APP_ROLES.FULFILLMENT],
  CS: [APP_ROLES.ADMIN, APP_ROLES.CS],
  SALES: [APP_ROLES.ADMIN, APP_ROLES.CS],
}

export const ROLE_META = {
  [APP_ROLES.ADMIN]: {
    labelKey: 'roles.admin',
    color: 'primary',
  },
  [APP_ROLES.DESIGNER]: {
    labelKey: 'roles.designer',
    color: 'info',
  },
  [APP_ROLES.QC]: {
    labelKey: 'roles.qc',
    color: 'warning',
  },
  [APP_ROLES.FULFILLMENT]: {
    labelKey: 'roles.fulfillment',
    color: 'success',
  },
  [APP_ROLES.CS]: {
    labelKey: 'roles.cs',
    color: 'secondary',
  },
}

const SIDEBAR_NAVIGATION_ROOT = [
  {
    id: 'dashboard',
    type: 'item',
    labelKey: 'nav.dashboard',
    path: ROUTES.HOME,
    icon: 'dashboard',
    allowedRoles: ROLE_ACCESS.ALL,
  },
  {
    id: 'portal',
    type: 'item',
    labelKey: 'nav.portal',
    icon: 'portal',
    defaultOpen: true,
    allowedRoles: ROLE_ACCESS.ALL,
    children: [
      {
        id: 'sales',
        type: 'section',
        labelKey: 'nav.sections.sales',
        allowedRoles: ROLE_ACCESS.SALES,
        items: [
          {
            id: 'orders',
            type: 'group',
            labelKey: 'nav.groups.orders',
            defaultOpen: true,
            allowedRoles: ROLE_ACCESS.SALES,
            children: [
              {
                id: 'order-list',
                type: 'item',
                labelKey: 'nav.items.orderList',
                path: ROUTES.PORTAL_ORDER_LIST,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['ORDERS:READ'],
              },
              {
                id: 'order-workbench',
                type: 'item',
                labelKey: 'nav.items.orderWorkbench',
                path: ROUTES.PORTAL_ORDER_WORKBENCH,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['ORDERS:READ'],
              },
              {
                id: 'order-detail',
                type: 'item',
                labelKey: 'nav.items.orderDetail',
                path: ROUTES.PORTAL_ORDER_DETAIL,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['ORDERS:READ'],
              },
              {
                id: 'catalog-setup',
                type: 'item',
                labelKey: 'nav.items.catalogSetup',
                path: ROUTES.PORTAL_CATALOG_SETUP,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['CATALOG:READ'],
              },
              {
                id: 'listings',
                type: 'item',
                labelKey: 'nav.items.listings',
                path: ROUTES.PORTAL_LISTINGS,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['CATALOG:READ'],
              },
              {
                id: 'mapping-workbench',
                type: 'item',
                labelKey: 'nav.items.mappingWorkbench',
                path: ROUTES.PORTAL_MAPPING_WORKBENCH,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['MAPPING:READ'],
              },
              {
                id: 'tracking',
                type: 'item',
                labelKey: 'nav.items.tracking',
                path: ROUTES.PORTAL_TRACKING,
                allowedRoles: ROLE_ACCESS.SALES,
                requiredPermissions: ['SHIPMENTS:READ'],
              },
            ],
          },
        ],
      },
      {
        id: 'operations',
        type: 'section',
        labelKey: 'nav.sections.operations',
        allowedRoles: [
          APP_ROLES.ADMIN,
          APP_ROLES.DESIGNER,
          APP_ROLES.QC,
          APP_ROLES.FULFILLMENT,
          APP_ROLES.CS,
        ],
        items: [
          {
            id: 'fulfillment',
            type: 'group',
            labelKey: 'nav.groups.fulfillment',
            defaultOpen: true,
            allowedRoles: [APP_ROLES.ADMIN, APP_ROLES.QC, APP_ROLES.FULFILLMENT, APP_ROLES.CS],
            children: [
              {
                id: 'production-board',
                type: 'item',
                labelKey: 'nav.items.productionBoard',
                path: ROUTES.PORTAL_PRODUCTION,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
                requiredPermissions: ['PRODUCTION:READ'],
              },
              {
                id: 'scale',
                type: 'item',
                labelKey: 'nav.items.scale',
                path: ROUTES.PORTAL_SCALE,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
                requiredPermissions: ['PRODUCTION:READ'],
              },
              {
                id: 'qc',
                type: 'item',
                labelKey: 'nav.items.qc',
                path: ROUTES.PORTAL_QC,
                allowedRoles: ROLE_ACCESS.QC,
                requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
              },
              {
                id: 'shipping',
                type: 'item',
                labelKey: 'nav.items.shipping',
                path: ROUTES.PORTAL_SHIPPING,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
                requiredPermissions: ['SHIPMENTS:READ'],
              },
              {
                id: 'vendor-submissions',
                type: 'item',
                labelKey: 'nav.items.vendorSubmissions',
                path: ROUTES.PORTAL_VENDOR_SUBMISSIONS,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
                requiredPermissions: ['VENDOR_SUBMISSIONS:READ'],
              },
              {
                id: 'cs',
                type: 'item',
                labelKey: 'nav.items.cs',
                path: ROUTES.PORTAL_CS,
                allowedRoles: ROLE_ACCESS.CS,
                requiredPermissions: ['ORDERS:READ'],
              },
            ],
          },
          {
            id: 'design',
            type: 'group',
            labelKey: 'nav.groups.design',
            defaultOpen: true,
            allowedRoles: ROLE_ACCESS.DESIGN,
            children: [
              {
                id: 'design-task-list',
                type: 'item',
                labelKey: 'nav.items.taskList',
                path: ROUTES.PORTAL_DESIGN_TASKS,
                allowedRoles: ROLE_ACCESS.DESIGN,
                requiredPermissions: [
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'DESIGN_TASKS:READ',
                ],
              },
              {
                id: 'template-center',
                type: 'item',
                labelKey: 'nav.items.templateCenter',
                path: ROUTES.PORTAL_TEMPLATE_CENTER,
                allowedRoles: ROLE_ACCESS.DESIGN,
                requiredPermissions: [
                  'DESIGN:READ',
                  'DESIGN:WRITE',
                  'DESIGN:WORK',
                  'DESIGN:REVIEW',
                  'DESIGN_TASKS:READ',
                ],
              },
            ],
          },
        ],
      },
      {
        id: 'business',
        type: 'section',
        labelKey: 'nav.sections.business',
        allowedRoles: [APP_ROLES.ADMIN, APP_ROLES.CS],
        items: [
          {
            id: 'finance',
            type: 'group',
            labelKey: 'nav.groups.finance',
            defaultOpen: true,
            allowedRoles: ROLE_ACCESS.ADMIN,
            children: [
              {
                id: 'finance-summary',
                type: 'item',
                labelKey: 'nav.items.summary',
                path: ROUTES.PORTAL_FINANCE_SUMMARY,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['FINANCE:READ'],
              },
              {
                id: 'reports',
                type: 'item',
                labelKey: 'nav.items.reports',
                path: ROUTES.PORTAL_REPORTS,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['REPORTS:READ'],
              },
              {
                id: 'finance-balance',
                type: 'item',
                labelKey: 'nav.items.balance',
                path: ROUTES.PORTAL_FINANCE_BALANCE,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['FINANCE:READ'],
              },
              {
                id: 'finance-payout',
                type: 'item',
                labelKey: 'nav.items.payout',
                path: ROUTES.PORTAL_FINANCE_PAYOUT,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['FINANCE:READ'],
              },
              {
                id: 'compensation-pool',
                type: 'item',
                labelKey: 'nav.items.compensationPool',
                path: ROUTES.PORTAL_COMPENSATION_POOL,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['FINANCE:READ'],
              },
            ],
          },
          {
            id: 'vendors',
            type: 'group',
            labelKey: 'nav.groups.vendors',
            defaultOpen: true,
            allowedRoles: ROLE_ACCESS.ADMIN,
            children: [
              {
                id: 'vendor-list',
                type: 'item',
                labelKey: 'nav.items.vendorList',
                path: ROUTES.PORTAL_VENDOR_LIST,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['VENDORS:READ'],
              },
              {
                id: 'products-cost',
                type: 'item',
                labelKey: 'nav.items.productsCost',
                path: ROUTES.PORTAL_PRODUCTS_COST,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['VENDORS:READ'],
              },
              {
                id: 'store-routing',
                type: 'item',
                labelKey: 'nav.items.storeRouting',
                path: ROUTES.PORTAL_STORE_ROUTING,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['VENDORS:READ'],
              },
            ],
          },
          {
            id: 'customers',
            type: 'item',
            labelKey: 'nav.groups.customers',
            path: ROUTES.PORTAL_CUSTOMERS,
            allowedRoles: [APP_ROLES.ADMIN, APP_ROLES.CS],
            requiredPermissions: ['CUSTOMERS:READ'],
          },
        ],
      },
      {
        id: 'admin',
        type: 'section',
        labelKey: 'nav.sections.admin',
        allowedRoles: ROLE_ACCESS.ADMIN,
        items: [
          {
            id: 'settings',
            type: 'group',
            labelKey: 'nav.groups.settings',
            defaultOpen: true,
            allowedRoles: ROLE_ACCESS.ADMIN,
            children: [
              {
                id: 'users-roles',
                type: 'item',
                labelKey: 'nav.items.usersRoles',
                path: ROUTES.PORTAL_USERS_ROLES,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['AUTH:READ'],
              },
              {
                id: 'shops-stores',
                type: 'item',
                labelKey: 'nav.items.shopsStores',
                path: ROUTES.PORTAL_SHOPS_STORES,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['SHOPS:READ'],
              },
              {
                id: 'system-config',
                type: 'item',
                labelKey: 'nav.items.systemConfig',
                path: ROUTES.PORTAL_SYSTEM_CONFIG,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['SYSTEM:READ'],
              },
              {
                id: 'api-coverage',
                type: 'item',
                labelKey: 'nav.items.apiCoverage',
                path: ROUTES.PORTAL_API_COVERAGE,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['MANAGE_SYSTEM'],
              },
              {
                id: 'audit-log',
                type: 'item',
                labelKey: 'nav.items.auditLog',
                path: ROUTES.PORTAL_AUDIT_LOG,
                allowedRoles: ROLE_ACCESS.ADMIN,
                requiredPermissions: ['AUDIT:READ'],
              },
            ],
          },
        ],
      },
    ],
  },
]

const portalRoot = SIDEBAR_NAVIGATION_ROOT.find((item) => item.id === SIDEBAR_NAV_TABS.PORTAL)

export const SIDEBAR_NAVIGATION = [
  SIDEBAR_NAVIGATION_ROOT.find((item) => item.id === 'dashboard'),
  ...(portalRoot?.children ?? []),
]

export const HR_NAVIGATION = []

export const SIDEBAR_TAB_NAVIGATION = {
  [SIDEBAR_NAV_TABS.PORTAL]: SIDEBAR_NAVIGATION,
  [SIDEBAR_NAV_TABS.HR]: HR_NAVIGATION,
}

export function getSidebarTabForPath(pathname) {
  return pathname === ROUTES.HR || pathname?.startsWith(`${ROUTES.HR}/`)
    ? SIDEBAR_NAV_TABS.HR
    : SIDEBAR_NAV_TABS.PORTAL
}

export function normalizeRole(role) {
  return typeof role === 'string' ? role.trim().toLowerCase() : ''
}

export function getRoleMeta(role) {
  return ROLE_META[normalizeRole(role)] ?? null
}

function canAccessItem(item, role) {
  return !item.allowedRoles || item.allowedRoles.includes(role)
}

function filterItem(item, role) {
  if (!canAccessItem(item, role)) {
    return null
  }

  if (item.type === 'section') {
    const items = item.items.map((child) => filterItem(child, role)).filter(Boolean)

    return items.length > 0 ? { ...item, items } : null
  }

  if (item.children) {
    const children = item.children.map((child) => filterItem(child, role)).filter(Boolean)

    return children.length > 0 || item.path ? { ...item, children } : null
  }

  return { ...item }
}

function cloneNavigationItem(item) {
  if (item.type === 'section') {
    return { ...item, items: item.items.map(cloneNavigationItem) }
  }

  if (item.children) {
    return { ...item, children: item.children.map(cloneNavigationItem) }
  }

  return { ...item }
}

function filterMountedItem(item) {
  if (item.path && !MOUNTED_ROUTE_PATHS.has(item.path)) {
    return null
  }

  if (item.type === 'section') {
    const items = item.items.map(filterMountedItem).filter(Boolean)

    return items.length > 0 ? { ...item, items } : null
  }

  if (item.children) {
    const children = item.children.map(filterMountedItem).filter(Boolean)

    return children.length > 0 || item.path ? { ...item, children } : null
  }

  return { ...item }
}

function canAccessByPermission(item, user) {
  return !item.requiredPermissions || hasAnyPermission(user, item.requiredPermissions)
}

function filterItemByUser(item, user) {
  const mountedItem = filterMountedItem(item)
  if (!mountedItem || !canAccessByPermission(mountedItem, user)) {
    return null
  }

  if (mountedItem.type === 'section') {
    const items = mountedItem.items.map((child) => filterItemByUser(child, user)).filter(Boolean)

    return items.length > 0 ? { ...mountedItem, items } : null
  }

  if (mountedItem.children) {
    const children = mountedItem.children
      .map((child) => filterItemByUser(child, user))
      .filter(Boolean)

    return children.length > 0 || mountedItem.path ? { ...mountedItem, children } : null
  }

  return { ...mountedItem }
}

export function filterNavigationByUser(navigation, user) {
  return navigation.map((item) => filterItemByUser(item, user)).filter(Boolean)
}

export function filterNavigationByRole(navigation, role) {
  const normalizedRole = normalizeRole(role)
  const mountedNavigation = navigation.map(filterMountedItem).filter(Boolean)

  if (!SIDEBAR_ROLE_FILTERING_ENABLED) {
    return mountedNavigation.map(cloneNavigationItem)
  }

  return mountedNavigation.map((item) => filterItem(item, normalizedRole)).filter(Boolean)
}
