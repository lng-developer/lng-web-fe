import { ROUTES } from '../constants/routes.js'

export const APP_ROLES = {
  ADMIN: 'admin',
  DESIGNER: 'designer',
  QC: 'qc',
  FULFILLMENT: 'fulfillment',
  CS: 'cs',
}

export const ALL_APP_ROLES = Object.values(APP_ROLES)

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

export const SIDEBAR_NAVIGATION = [
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
              },
              {
                id: 'order-detail',
                type: 'item',
                labelKey: 'nav.items.orderDetail',
                path: ROUTES.PORTAL_ORDER_DETAIL,
                allowedRoles: ROLE_ACCESS.SALES,
              },
              {
                id: 'listings',
                type: 'item',
                labelKey: 'nav.items.listings',
                path: ROUTES.PORTAL_LISTINGS,
                allowedRoles: ROLE_ACCESS.SALES,
              },
              {
                id: 'tracking',
                type: 'item',
                labelKey: 'nav.items.tracking',
                path: ROUTES.PORTAL_TRACKING,
                allowedRoles: ROLE_ACCESS.SALES,
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
                id: 'scale',
                type: 'item',
                labelKey: 'nav.items.scale',
                path: ROUTES.PORTAL_SCALE,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
              },
              {
                id: 'qc',
                type: 'item',
                labelKey: 'nav.items.qc',
                path: ROUTES.PORTAL_QC,
                allowedRoles: ROLE_ACCESS.QC,
              },
              {
                id: 'shipping',
                type: 'item',
                labelKey: 'nav.items.shipping',
                path: ROUTES.PORTAL_SHIPPING,
                allowedRoles: ROLE_ACCESS.FULFILLMENT,
              },
              {
                id: 'cs',
                type: 'item',
                labelKey: 'nav.items.cs',
                path: ROUTES.PORTAL_CS,
                allowedRoles: ROLE_ACCESS.CS,
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
              },
              {
                id: 'template-center',
                type: 'item',
                labelKey: 'nav.items.templateCenter',
                path: ROUTES.PORTAL_TEMPLATE_CENTER,
                allowedRoles: ROLE_ACCESS.DESIGN,
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
              },
              {
                id: 'finance-balance',
                type: 'item',
                labelKey: 'nav.items.balance',
                path: ROUTES.PORTAL_FINANCE_BALANCE,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
              {
                id: 'finance-payout',
                type: 'item',
                labelKey: 'nav.items.payout',
                path: ROUTES.PORTAL_FINANCE_PAYOUT,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
              {
                id: 'compensation-pool',
                type: 'item',
                labelKey: 'nav.items.compensationPool',
                path: ROUTES.PORTAL_COMPENSATION_POOL,
                allowedRoles: ROLE_ACCESS.ADMIN,
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
              },
              {
                id: 'products-cost',
                type: 'item',
                labelKey: 'nav.items.productsCost',
                path: ROUTES.PORTAL_PRODUCTS_COST,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
              {
                id: 'store-routing',
                type: 'item',
                labelKey: 'nav.items.storeRouting',
                path: ROUTES.PORTAL_STORE_ROUTING,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
            ],
          },
          {
            id: 'customers',
            type: 'item',
            labelKey: 'nav.groups.customers',
            path: ROUTES.PORTAL_CUSTOMERS,
            allowedRoles: [APP_ROLES.ADMIN, APP_ROLES.CS],
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
              },
              {
                id: 'shops-stores',
                type: 'item',
                labelKey: 'nav.items.shopsStores',
                path: ROUTES.PORTAL_SHOPS_STORES,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
              {
                id: 'system-config',
                type: 'item',
                labelKey: 'nav.items.systemConfig',
                path: ROUTES.PORTAL_SYSTEM_CONFIG,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
              {
                id: 'audit-log',
                type: 'item',
                labelKey: 'nav.items.auditLog',
                path: ROUTES.PORTAL_AUDIT_LOG,
                allowedRoles: ROLE_ACCESS.ADMIN,
              },
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'hr',
    type: 'item',
    labelKey: 'nav.hr',
    path: ROUTES.HR,
    icon: 'hr',
    trailingIcon: 'chevronRight',
    allowedRoles: ROLE_ACCESS.ADMIN,
  },
]

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

export function filterNavigationByRole(navigation, role) {
  const normalizedRole = normalizeRole(role)

  return navigation.map((item) => filterItem(item, normalizedRole)).filter(Boolean)
}
