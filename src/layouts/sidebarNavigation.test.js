import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { ROUTES } from '../constants/routes.js'
import {
  filterNavigationByRole,
  filterNavigationByUser,
  getFirstNavigableItem,
  getNavItemTo,
  getRoleMeta,
  getSidebarContextForLocation,
  getSidebarWorkspaceForLocation,
  HR_NAVIGATION,
  isNavItemActive,
  PORTAL_NAVIGATION,
  SIDEBAR_CONTEXT_IDS,
  SIDEBAR_HOME_ITEM,
  SIDEBAR_NAVIGATION,
  SIDEBAR_ROLE_FILTERING_ENABLED,
  SIDEBAR_WORKSPACE_NAVIGATION,
  SIDEBAR_WORKSPACES,
} from './sidebarNavigation.js'

function collectLeafIds(items) {
  return items.flatMap((item) => {
    if (item.type === 'section') {
      return collectLeafIds(item.items)
    }

    if (item.children) {
      return collectLeafIds(item.children)
    }

    return [item.id]
  })
}

function findItem(items, id) {
  for (const item of items) {
    if (item.id === id) {
      return item
    }

    const nestedItems = item.items ?? item.children
    if (nestedItems) {
      const match = findItem(nestedItems, id)
      if (match) {
        return match
      }
    }
  }

  return null
}

describe('sidebar navigation', () => {
  const fullPortalLeafIds = [
    'orders-amazon',
    'orders-etsy',
    'listings',
    'product-types',
    'internal-templates',
    'amazon-orders-cost-report',
    'amazon-ads-report',
    'amazon-sale-report',
    'etsy-orders-cost-report',
    'etsy-ads-report',
    'etsy-sale-report',
    'shops-stores',
    'mapping-workbench',
    'users-roles',
    'scale-amazon',
    'scale-etsy',
    'qc-amazon',
    'qc-etsy',
    'design-task-list',
    'vendor-list',
    'products-cost',
    'vendor-submissions',
    'shipping',
    'api-coverage',
    'audit-log',
    'hr-my-time',
    'hr-request-inbox',
    'hr-attendance',
    'hr-schedule',
    'hr-employees',
  ]

  it('groups sidebar by department workspaces', () => {
    assert.deepEqual(
      SIDEBAR_WORKSPACES.map((workspace) => workspace.id),
      ['orders', 'production', 'design', 'vendor', 'admin'],
    )
  })

  it('exposes the global dashboard above workspace navigation', () => {
    assert.deepEqual(SIDEBAR_HOME_ITEM, {
      id: 'dashboard',
      icon: 'dashboard',
      labelKey: 'nav.items.dashboard',
      path: '/',
      type: 'item',
    })
  })

  it('separates HR leaves from Portal navigation', () => {
    assert.equal(collectLeafIds(PORTAL_NAVIGATION).includes('hr-schedule'), false)
    assert.deepEqual(
      collectLeafIds(filterNavigationByUser(HR_NAVIGATION, { permissions: ['HR_SCHEDULE:READ'] })),
      ['hr-schedule'],
    )
  })

  it('derives the navigation context from mounted route families', () => {
    assert.equal(getSidebarContextForLocation(ROUTES.PORTAL_ORDER_LIST), SIDEBAR_CONTEXT_IDS.PORTAL)
    assert.equal(getSidebarContextForLocation(ROUTES.HR_TIME_SCHEDULE), SIDEBAR_CONTEXT_IDS.HR)
  })

  it('finds the first accessible leaf depth-first', () => {
    const navigation = filterNavigationByUser(HR_NAVIGATION, {
      permissions: ['HR_SCHEDULE:READ'],
    })

    assert.equal(getFirstNavigableItem(navigation)?.id, 'hr-schedule')
    assert.equal(getFirstNavigableItem([]), null)
  })

  it('keeps order listing setup and report workflow in the orders workspace', () => {
    assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.orders), [
      'orders-amazon',
      'orders-etsy',
      'listings',
      'product-types',
      'internal-templates',
      'amazon-orders-cost-report',
      'amazon-ads-report',
      'amazon-sale-report',
      'etsy-orders-cost-report',
      'etsy-ads-report',
      'etsy-sale-report',
      'shops-stores',
      'mapping-workbench',
      'users-roles',
    ])
  })

  it('keeps production workflow in the production workspace', () => {
    assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.production), [
      'scale-amazon',
      'scale-etsy',
      'qc-amazon',
      'qc-etsy',
    ])
  })

  it('keeps design workflow in the design workspace', () => {
    assert.deepEqual(collectLeafIds(SIDEBAR_WORKSPACE_NAVIGATION.design), ['design-task-list'])
  })

  it('uses query presets without creating new routes', () => {
    assert.deepEqual(getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-amazon')), {
      pathname: '/portal/orders',
      search: '?channel=amazon',
    })
    assert.deepEqual(
      getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.production, 'scale-etsy')),
      {
        pathname: '/portal/fulfillment/scale',
        search: '?channel=etsy',
      },
    )
    assert.deepEqual(
      getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'etsy-ads-report')),
      {
        pathname: '/portal/reports',
        search: '?channel=etsy&report=ads',
      },
    )
    assert.deepEqual(getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'product-types')), {
      pathname: '/portal/listings',
      search: '?view=product-types',
    })
    assert.deepEqual(
      getNavItemTo(findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'internal-templates')),
      {
        pathname: '/portal/listings',
        search: '?view=internal-templates',
      },
    )
  })

  it('matches active query presets exactly when activeSearch is set', () => {
    const amazonOrders = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-amazon')
    const etsyOrders = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'orders-etsy')
    const listings = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'listings')
    const productTypes = findItem(SIDEBAR_WORKSPACE_NAVIGATION.orders, 'product-types')

    assert.equal(
      isNavItemActive(amazonOrders, { pathname: '/portal/orders', search: '?channel=amazon' }),
      true,
    )
    assert.equal(
      isNavItemActive(amazonOrders, {
        pathname: '/portal/orders',
        search: '?channel=amazon&orderId=123',
      }),
      true,
    )
    assert.equal(
      isNavItemActive(etsyOrders, { pathname: '/portal/orders', search: '?channel=amazon' }),
      false,
    )
    assert.equal(
      isNavItemActive(listings, { pathname: '/portal/listings', search: '?view=product-types' }),
      false,
    )
    assert.equal(
      isNavItemActive(listings, { pathname: '/portal/listings', search: '?page=2' }),
      true,
    )
    assert.equal(
      isNavItemActive(productTypes, {
        pathname: '/portal/listings',
        search: '?view=product-types',
      }),
      true,
    )
  })

  it('resolves the active workspace from the current route', () => {
    assert.equal(getSidebarWorkspaceForLocation('/portal/design/tasks'), 'design')
    assert.equal(getSidebarWorkspaceForLocation('/portal/fulfillment/scale'), 'production')
    assert.equal(getSidebarWorkspaceForLocation('/portal/vendors'), 'vendor')
    assert.equal(getSidebarWorkspaceForLocation('/portal/settings/users-roles'), 'orders')
    assert.equal(getSidebarWorkspaceForLocation('/portal/settings/api-coverage'), 'admin')
  })

  it('keeps the full portal navigation for admin', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'admin')

    assert.deepEqual(collectLeafIds(navigation), fullPortalLeafIds)
  })

  it('filters portal navigation by backend permissions', () => {
    const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
      permissions: ['DESIGN:WORK'],
    })

    assert.deepEqual(collectLeafIds(navigation), ['design-task-list'])
  })

  it('shows only the HR time surface allowed by backend permissions', () => {
    const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
      permissions: ['HR_SCHEDULE:READ'],
    })

    assert.deepEqual(collectLeafIds(navigation), ['hr-schedule'])
  })

  it('shows review and QC surfaces for design reviewers', () => {
    const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
      permissions: ['DESIGN:REVIEW'],
    })

    assert.deepEqual(collectLeafIds(navigation), ['qc-amazon', 'qc-etsy', 'design-task-list'])
  })

  it('does not expose navigation leaves without mounted routes', () => {
    const routeLessIds = [
      'order-detail',
      'tracking',
      'cs',
      'template-center',
      'finance-balance',
      'finance-payout',
      'compensation-pool',
      'store-routing',
      'customers',
      'system-config',
    ]

    const leafIds = collectLeafIds(
      filterNavigationByUser(SIDEBAR_NAVIGATION, { permissions: ['MANAGE_SYSTEM'] }),
    )

    assert.equal(
      routeLessIds.some((id) => leafIds.includes(id)),
      false,
    )
  })

  it('shows auth admin surfaces for auth readers without system debug tools', () => {
    const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
      permissions: ['AUTH:READ'],
    })

    assert.deepEqual(collectLeafIds(navigation), ['users-roles'])
  })

  it('keeps full navigation for manage system', () => {
    const navigation = filterNavigationByUser(SIDEBAR_NAVIGATION, {
      permissions: ['MANAGE_SYSTEM'],
    })

    assert.deepEqual(collectLeafIds(navigation), fullPortalLeafIds)
  })

  it('keeps only design operations for designer', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'designer')

    assert.deepEqual(
      collectLeafIds(navigation),
      SIDEBAR_ROLE_FILTERING_ENABLED ? ['design-task-list'] : fullPortalLeafIds,
    )
  })

  it('keeps only QC fulfillment for qc', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'qc')

    assert.deepEqual(
      collectLeafIds(navigation),
      SIDEBAR_ROLE_FILTERING_ENABLED ? ['qc-amazon', 'qc-etsy'] : fullPortalLeafIds,
    )
  })

  it('keeps primary fulfillment work and advanced shipping for fulfillment', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'fulfillment')

    assert.deepEqual(
      collectLeafIds(navigation),
      SIDEBAR_ROLE_FILTERING_ENABLED
        ? ['scale-amazon', 'scale-etsy', 'shipping', 'vendor-submissions']
        : fullPortalLeafIds,
    )
  })

  it('keeps sales, customers, and CS fulfillment for cs', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'cs')

    assert.deepEqual(
      collectLeafIds(navigation),
      SIDEBAR_ROLE_FILTERING_ENABLED
        ? ['orders-amazon', 'orders-etsy', 'listings', 'product-types', 'internal-templates']
        : fullPortalLeafIds,
    )
  })

  it('keeps duplicate workflow consoles out of the sidebar', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'admin')
    const leafIds = collectLeafIds(navigation)

    assert.equal(leafIds.includes('order-workbench'), false)
    assert.equal(leafIds.includes('production-board'), false)
    assert.equal(leafIds.includes('cost-center-config'), false)
  })

  it('keeps configuration as a top-level orders workspace group', () => {
    const ordersNavigation = SIDEBAR_WORKSPACE_NAVIGATION.orders
    const configuration = ordersNavigation.find((item) => item.id === 'configuration-group')

    assert.notEqual(configuration, null)
    assert.deepEqual(
      configuration.children.map((item) => item.id),
      ['shops-stores', 'mapping-workbench', 'users-roles'],
    )
  })

  it('has locale labels for sidebar group keys', () => {
    const english = JSON.parse(
      readFileSync(new URL('../i18n/locales/en/common.json', import.meta.url)),
    )
    const vietnamese = JSON.parse(
      readFileSync(new URL('../i18n/locales/vi/common.json', import.meta.url)),
    )

    assert.equal(english.nav.groups.reports, 'Reports')
    assert.equal(vietnamese.nav.groups.reports, 'Reports')
  })

  it('removes empty groups after filtering', () => {
    const navigation = filterNavigationByUser(SIDEBAR_WORKSPACE_NAVIGATION.orders, {
      permissions: ['DESIGN:WORK'],
    })

    assert.deepEqual(navigation, [])
  })

  it('does not map an unknown role to admin metadata', () => {
    assert.equal(getRoleMeta('unknown'), null)
  })

  it('treats uppercase backend roles as lowercase canonical roles', () => {
    assert.deepEqual(
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'ADMIN')),
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'admin')),
    )
    assert.deepEqual(
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'DESIGNER')),
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'designer')),
    )
    assert.deepEqual(
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'QC')),
      collectLeafIds(filterNavigationByRole(SIDEBAR_NAVIGATION, 'qc')),
    )
  })

  it('returns role metadata for uppercase backend roles', () => {
    assert.equal(getRoleMeta('ADMIN').labelKey, 'roles.admin')
    assert.equal(getRoleMeta('DESIGNER').labelKey, 'roles.designer')
    assert.equal(getRoleMeta('QC').labelKey, 'roles.qc')
  })
})
