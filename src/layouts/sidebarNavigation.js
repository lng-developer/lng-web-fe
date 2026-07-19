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
  ROUTES.PORTAL_SHOPS_STORES,
  ROUTES.PORTAL_USERS_ROLES,
  ROUTES.PORTAL_API_COVERAGE,
  ROUTES.PORTAL_AUDIT_LOG,
  ROUTES.HR_TIME_MY_TIME,
  ROUTES.HR_TIME_REQUEST_INBOX,
  ROUTES.HR_TIME_ATTENDANCE,
  ROUTES.HR_TIME_SCHEDULE,
  ROUTES.HR_TIME_EMPLOYEES,
])

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

export const SIDEBAR_WORKSPACE_IDS = {
  ORDERS: 'orders',
  PRODUCTION: 'production',
  DESIGN: 'design',
  VENDOR: 'vendor',
  ADMIN: 'admin',
}

export const SIDEBAR_WORKSPACES = [
  { id: SIDEBAR_WORKSPACE_IDS.ORDERS, labelKey: 'nav.workspaces.orders', icon: 'orders' },
  {
    id: SIDEBAR_WORKSPACE_IDS.PRODUCTION,
    labelKey: 'nav.workspaces.production',
    icon: 'production',
  },
  { id: SIDEBAR_WORKSPACE_IDS.DESIGN, labelKey: 'nav.workspaces.design', icon: 'design' },
  { id: SIDEBAR_WORKSPACE_IDS.VENDOR, labelKey: 'nav.workspaces.vendor', icon: 'vendor' },
  { id: SIDEBAR_WORKSPACE_IDS.ADMIN, labelKey: 'nav.workspaces.admin', icon: 'admin' },
]

function withSearch(search) {
  return { search, activeSearch: search }
}

function withoutSearch(inactiveSearchParams = []) {
  return { activeSearch: '', inactiveSearchParams }
}

export const SIDEBAR_WORKSPACE_NAVIGATION = {
  [SIDEBAR_WORKSPACE_IDS.ORDERS]: [
    {
      id: 'orders-group',
      type: 'group',
      labelKey: 'nav.groups.orders',
      icon: 'orders',
      defaultOpen: true,
      children: [
        {
          id: 'orders-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonOrders',
          icon: 'amazon',
          path: ROUTES.PORTAL_ORDER_LIST,
          ...withSearch('?channel=amazon'),
          allowedRoles: ROLE_ACCESS.SALES,
          requiredPermissions: ['ORDERS:READ'],
        },
        {
          id: 'orders-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyOrders',
          icon: 'etsy',
          path: ROUTES.PORTAL_ORDER_LIST,
          ...withSearch('?channel=etsy'),
          allowedRoles: ROLE_ACCESS.SALES,
          requiredPermissions: ['ORDERS:READ'],
        },
      ],
    },
    {
      id: 'listings',
      type: 'item',
      labelKey: 'nav.items.listings',
      icon: 'listings',
      path: ROUTES.PORTAL_LISTINGS,
      ...withoutSearch(['view']),
      allowedRoles: ROLE_ACCESS.SALES,
      requiredPermissions: ['CATALOG:READ'],
    },
    {
      id: 'cost-centers-group',
      type: 'group',
      labelKey: 'nav.groups.costCenters',
      icon: 'costCenters',
      defaultOpen: true,
      children: [
        {
          id: 'product-types',
          type: 'item',
          labelKey: 'nav.items.productTypes',
          icon: 'productTypes',
          path: ROUTES.PORTAL_LISTINGS,
          ...withSearch('?view=product-types'),
          allowedRoles: ROLE_ACCESS.SALES,
          requiredPermissions: ['CATALOG:READ'],
        },
        {
          id: 'internal-templates',
          type: 'item',
          labelKey: 'nav.items.internalTemplates',
          icon: 'templates',
          path: ROUTES.PORTAL_LISTINGS,
          ...withSearch('?view=internal-templates'),
          allowedRoles: ROLE_ACCESS.SALES,
          requiredPermissions: ['CATALOG:READ'],
        },
      ],
    },
    {
      id: 'reports-group',
      type: 'group',
      labelKey: 'nav.groups.reports',
      icon: 'reports',
      defaultOpen: true,
      children: [
        {
          id: 'amazon-reports-group',
          type: 'group',
          labelKey: 'nav.groups.amazon',
          icon: 'amazon',
          defaultOpen: true,
          children: [
            {
              id: 'amazon-orders-cost-report',
              type: 'item',
              labelKey: 'nav.items.ordersCost',
              icon: 'costs',
              path: ROUTES.PORTAL_FINANCE_SUMMARY,
              ...withSearch('?channel=amazon&report=orders-cost'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['FINANCE:READ'],
            },
            {
              id: 'amazon-ads-report',
              type: 'item',
              labelKey: 'nav.items.adsReport',
              icon: 'ads',
              path: ROUTES.PORTAL_REPORTS,
              ...withSearch('?channel=amazon&report=ads'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['REPORTS:READ'],
            },
            {
              id: 'amazon-sale-report',
              type: 'item',
              labelKey: 'nav.items.saleReport',
              icon: 'reports',
              path: ROUTES.PORTAL_REPORTS,
              ...withSearch('?channel=amazon&report=sales'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['REPORTS:READ'],
            },
          ],
        },
        {
          id: 'etsy-reports-group',
          type: 'group',
          labelKey: 'nav.groups.etsy',
          icon: 'etsy',
          defaultOpen: true,
          children: [
            {
              id: 'etsy-orders-cost-report',
              type: 'item',
              labelKey: 'nav.items.ordersCost',
              icon: 'costs',
              path: ROUTES.PORTAL_FINANCE_SUMMARY,
              ...withSearch('?channel=etsy&report=orders-cost'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['FINANCE:READ'],
            },
            {
              id: 'etsy-ads-report',
              type: 'item',
              labelKey: 'nav.items.adsReport',
              icon: 'ads',
              path: ROUTES.PORTAL_REPORTS,
              ...withSearch('?channel=etsy&report=ads'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['REPORTS:READ'],
            },
            {
              id: 'etsy-sale-report',
              type: 'item',
              labelKey: 'nav.items.saleReport',
              icon: 'reports',
              path: ROUTES.PORTAL_REPORTS,
              ...withSearch('?channel=etsy&report=sales'),
              allowedRoles: ROLE_ACCESS.ADMIN,
              requiredPermissions: ['REPORTS:READ'],
            },
          ],
        },
      ],
    },
    {
      id: 'configuration-group',
      type: 'group',
      labelKey: 'nav.groups.configuration',
      icon: 'configuration',
      defaultOpen: false,
      children: [
        {
          id: 'shops-stores',
          type: 'item',
          labelKey: 'nav.items.manageStores',
          icon: 'shops',
          path: ROUTES.PORTAL_SHOPS_STORES,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['SHOPS:READ'],
        },
        {
          id: 'mapping-workbench',
          type: 'item',
          labelKey: 'nav.items.skuMapping',
          icon: 'mapping',
          path: ROUTES.PORTAL_MAPPING_WORKBENCH,
          allowedRoles: ROLE_ACCESS.SALES,
          requiredPermissions: ['MAPPING:READ'],
        },
        {
          id: 'users-roles',
          type: 'item',
          labelKey: 'nav.items.account',
          icon: 'users',
          path: ROUTES.PORTAL_USERS_ROLES,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['AUTH:READ'],
        },
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.PRODUCTION]: [
    {
      id: 'scale-group',
      type: 'group',
      labelKey: 'nav.groups.scale',
      icon: 'scale',
      path: ROUTES.PORTAL_SCALE,
      defaultOpen: true,
      children: [
        {
          id: 'scale-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonScale',
          icon: 'amazon',
          path: ROUTES.PORTAL_SCALE,
          ...withSearch('?channel=amazon'),
          allowedRoles: ROLE_ACCESS.FULFILLMENT,
          requiredPermissions: ['PRODUCTION:READ'],
        },
        {
          id: 'scale-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyScale',
          icon: 'etsy',
          path: ROUTES.PORTAL_SCALE,
          ...withSearch('?channel=etsy'),
          allowedRoles: ROLE_ACCESS.FULFILLMENT,
          requiredPermissions: ['PRODUCTION:READ'],
        },
      ],
    },
    {
      id: 'qc-group',
      type: 'group',
      labelKey: 'nav.groups.qc',
      icon: 'qc',
      path: ROUTES.PORTAL_QC,
      defaultOpen: true,
      children: [
        {
          id: 'qc-amazon',
          type: 'item',
          labelKey: 'nav.items.amazonQc',
          icon: 'amazon',
          path: ROUTES.PORTAL_QC,
          ...withSearch('?channel=amazon'),
          allowedRoles: ROLE_ACCESS.QC,
          requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
        },
        {
          id: 'qc-etsy',
          type: 'item',
          labelKey: 'nav.items.etsyQc',
          icon: 'etsy',
          path: ROUTES.PORTAL_QC,
          ...withSearch('?channel=etsy'),
          allowedRoles: ROLE_ACCESS.QC,
          requiredPermissions: ['PRODUCTION:READ', 'DESIGN:REVIEW'],
        },
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.DESIGN]: [
    {
      id: 'design-group',
      type: 'group',
      labelKey: 'nav.groups.design',
      icon: 'design',
      defaultOpen: true,
      children: [
        {
          id: 'design-task-list',
          type: 'item',
          labelKey: 'nav.items.psdTasks',
          icon: 'design',
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
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.VENDOR]: [
    {
      id: 'vendor-group',
      type: 'group',
      labelKey: 'nav.groups.vendors',
      icon: 'vendors',
      defaultOpen: true,
      children: [
        {
          id: 'vendor-list',
          type: 'item',
          labelKey: 'nav.items.vendorList',
          icon: 'vendors',
          path: ROUTES.PORTAL_VENDOR_LIST,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['VENDORS:READ'],
        },
        {
          id: 'products-cost',
          type: 'item',
          labelKey: 'nav.items.productsCost',
          icon: 'products',
          path: ROUTES.PORTAL_PRODUCTS_COST,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['VENDORS:READ'],
        },
      ],
    },
    {
      id: 'vendor-fulfillment-group',
      type: 'group',
      labelKey: 'nav.groups.fulfillment',
      icon: 'fulfillment',
      defaultOpen: true,
      children: [
        {
          id: 'vendor-submissions',
          type: 'item',
          labelKey: 'nav.items.vendorSubmissions',
          icon: 'submissions',
          path: ROUTES.PORTAL_VENDOR_SUBMISSIONS,
          allowedRoles: ROLE_ACCESS.FULFILLMENT,
          requiredPermissions: ['VENDOR_SUBMISSIONS:READ'],
        },
        {
          id: 'shipping',
          type: 'item',
          labelKey: 'nav.items.shipping',
          icon: 'shipping',
          path: ROUTES.PORTAL_SHIPPING,
          allowedRoles: ROLE_ACCESS.FULFILLMENT,
          requiredPermissions: ['SHIPMENTS:READ'],
        },
      ],
    },
  ],
  [SIDEBAR_WORKSPACE_IDS.ADMIN]: [
    {
      id: 'monitoring-group',
      type: 'group',
      labelKey: 'nav.groups.monitoring',
      icon: 'monitoring',
      defaultOpen: true,
      children: [
        {
          id: 'api-coverage',
          type: 'item',
          labelKey: 'nav.items.apiCoverage',
          icon: 'api',
          path: ROUTES.PORTAL_API_COVERAGE,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['MANAGE_SYSTEM'],
        },
        {
          id: 'audit-log',
          type: 'item',
          labelKey: 'nav.items.auditLog',
          icon: 'audit',
          path: ROUTES.PORTAL_AUDIT_LOG,
          allowedRoles: ROLE_ACCESS.ADMIN,
          requiredPermissions: ['AUDIT:READ'],
        },
      ],
    },
    {
      id: 'hr-time-group',
      type: 'group',
      labelKey: 'hrTime.title',
      icon: 'users',
      defaultOpen: true,
      children: [
        {
          id: 'hr-my-time',
          type: 'item',
          labelKey: 'hrTime.navigation.myTime',
          icon: 'orders',
          path: ROUTES.HR_TIME_MY_TIME,
          requiredPermissions: ['HR_ATTENDANCE:WRITE', 'HR_LEAVE:WRITE', 'HR_OVERTIME:WRITE'],
        },
        {
          id: 'hr-request-inbox',
          type: 'item',
          labelKey: 'hrTime.navigation.requestInbox',
          icon: 'reports',
          path: ROUTES.HR_TIME_REQUEST_INBOX,
          requiredPermissions: [
            'HR_LEAVE:READ',
            'HR_LEAVE:APPROVE',
            'HR_OVERTIME:READ',
            'HR_OVERTIME:APPROVE',
          ],
        },
        {
          id: 'hr-attendance',
          type: 'item',
          labelKey: 'hrTime.navigation.attendance',
          icon: 'qc',
          path: ROUTES.HR_TIME_ATTENDANCE,
          requiredPermissions: ['HR_ATTENDANCE:READ', 'HR_ATTENDANCE:MANAGE'],
        },
        {
          id: 'hr-schedule',
          type: 'item',
          labelKey: 'hrTime.navigation.schedule',
          icon: 'config',
          path: ROUTES.HR_TIME_SCHEDULE,
          requiredPermissions: ['HR_SCHEDULE:READ', 'HR_SCHEDULE:WRITE'],
        },
        {
          id: 'hr-employees',
          type: 'item',
          labelKey: 'hrTime.navigation.employees',
          icon: 'users',
          path: ROUTES.HR_TIME_EMPLOYEES,
          requiredPermissions: ['HR_EMPLOYEES:READ', 'HR_EMPLOYEES:WRITE'],
        },
      ],
    },
  ],
}

export const SIDEBAR_NAVIGATION = Object.values(SIDEBAR_WORKSPACE_NAVIGATION).flat()
export const HR_NAVIGATION = []

export function getNavItemTo(item) {
  return item.search ? { pathname: item.path, search: item.search } : item.path
}

export function isNavItemActive(item, location) {
  if (!item.path) {
    return false
  }

  const currentPath = location.pathname
  const pathActive =
    item.path === '/'
      ? currentPath === item.path
      : currentPath === item.path || currentPath.startsWith(`${item.path}/`)

  if (!pathActive) {
    return false
  }

  if (!Object.hasOwn(item, 'activeSearch')) {
    return true
  }

  if (item.activeSearch === '') {
    const inactiveSearchParams = item.inactiveSearchParams || []
    const currentParams = new URLSearchParams(location.search)

    return !inactiveSearchParams.some((key) => currentParams.has(key))
  }

  const expectedParams = new URLSearchParams(item.activeSearch)
  const currentParams = new URLSearchParams(location.search)

  return Array.from(expectedParams).every(([key, value]) => currentParams.get(key) === value)
}

function hasActivePath(item, location) {
  if (isNavItemActive(item, location)) {
    return true
  }

  const nestedItems = item.items ?? item.children

  return nestedItems ? nestedItems.some((nestedItem) => hasActivePath(nestedItem, location)) : false
}

export function getSidebarWorkspaceForLocation(pathname, search = '') {
  const location = { pathname, search }
  const match = SIDEBAR_WORKSPACES.find((workspace) =>
    (SIDEBAR_WORKSPACE_NAVIGATION[workspace.id] ?? []).some((item) =>
      hasActivePath(item, location),
    ),
  )

  return match?.id ?? SIDEBAR_WORKSPACE_IDS.ORDERS
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
