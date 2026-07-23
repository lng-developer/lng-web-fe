import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { describe, it } from 'node:test'

import { ROUTES } from '../constants/routes.js'
import {
  filterNavigationByUser,
  getFirstNavigableItem,
  getNavItemTo,
  getSidebarContextForLocation,
  HR_NAVIGATION,
  isNavItemActive,
  PORTAL_NAVIGATION,
  SIDEBAR_CONTEXT_IDS,
  SIDEBAR_HOME_ITEM,
  SIDEBAR_NAVIGATION,
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
    if (item.id === id) return item

    const match = findItem(item.items ?? item.children ?? [], id)
    if (match) return match
  }

  return null
}

describe('sidebar navigation', () => {
  const portalLeafIds = [
    'orders-all',
    'listings',
    'product-types',
    'internal-templates',
    'shops-stores',
    'scale-production',
    'quality-control',
    'vendor-submissions',
    'shipping',
    'design-task-list',
    'quality-scoring',
    'psd-file-library',
    'vendor-list',
    'products-cost',
    'mapping-workbench',
    'finance',
    'reports',
    'api-coverage',
    'audit-log',
    'users-roles',
  ]

  it('uses the approved Portal domain hierarchy', () => {
    assert.equal(PORTAL_NAVIGATION[0], SIDEBAR_HOME_ITEM)
    assert.deepEqual(
      PORTAL_NAVIGATION.map((item) => item.id),
      [
        'dashboard',
        'orders-all',
        'catalog-group',
        'shops-stores',
        'fulfillment-group',
        'design-workspace-group',
        'supply-data-group',
        'finance-reporting-group',
        'system-operations-group',
        'system-group',
      ],
    )
    assert.deepEqual(collectLeafIds(PORTAL_NAVIGATION.slice(1)), portalLeafIds)

    const financeReporting = findItem(PORTAL_NAVIGATION, 'finance-reporting-group')
    const systemOperations = findItem(PORTAL_NAVIGATION, 'system-operations-group')

    assert.deepEqual(
      financeReporting.children.map((item) => item.id),
      ['finance', 'reports'],
    )
    assert.deepEqual(
      systemOperations.children.map((item) => item.id),
      ['api-coverage', 'audit-log'],
    )
  })

  it('keeps all orders on the base route and inactive for marketplace filters', () => {
    const allOrders = findItem(PORTAL_NAVIGATION, 'orders-all')

    assert.equal(getNavItemTo(allOrders), ROUTES.PORTAL_ORDER_LIST)
    assert.equal(allOrders.search, undefined)
    assert.equal(isNavItemActive(allOrders, { pathname: '/portal/orders', search: '' }), true)
    assert.equal(
      isNavItemActive(allOrders, { pathname: '/portal/orders', search: '?channel=amazon' }),
      false,
    )
  })

  it('keeps base fulfillment and report leaves active for marketplace filters', () => {
    for (const [id, pathname, search] of [
      ['scale-production', ROUTES.PORTAL_SCALE, '?channel=amazon'],
      ['quality-control', ROUTES.PORTAL_QC, '?channel=etsy'],
      ['reports', ROUTES.PORTAL_REPORTS, '?channel=amazon&report=ads'],
    ]) {
      const item = findItem(PORTAL_NAVIGATION, id)

      assert.equal(item.activeSearch, undefined)
      assert.equal(isNavItemActive(item, { pathname, search }), true)
    }
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
    assert.equal(getSidebarContextForLocation(ROUTES.HR), SIDEBAR_CONTEXT_IDS.HR)
  })

  it('finds the first accessible leaf depth-first', () => {
    const navigation = filterNavigationByUser(HR_NAVIGATION, {
      permissions: ['HR_SCHEDULE:READ'],
    })

    assert.equal(getFirstNavigableItem(navigation)?.id, 'hr-schedule')
    assert.equal(getFirstNavigableItem([]), null)
  })

  it('keeps Portal leaves filtered by backend permissions', () => {
    assert.deepEqual(
      collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, { permissions: ['DESIGN:WORK'] })),
      ['dashboard', 'design-task-list', 'quality-scoring', 'psd-file-library'],
    )
    assert.deepEqual(
      collectLeafIds(filterNavigationByUser(SIDEBAR_NAVIGATION, { permissions: ['AUTH:READ'] })),
      ['dashboard', 'users-roles'],
    )
  })

  it('has locale labels for domain groups and fulfillment items', () => {
    const english = JSON.parse(
      readFileSync(new URL('../i18n/locales/en/common.json', import.meta.url)),
    )
    const vietnamese = JSON.parse(
      readFileSync(new URL('../i18n/locales/vi/common.json', import.meta.url)),
    )

    for (const locale of [english, vietnamese]) {
      for (const key of [
        'commerce',
        'catalog',
        'designWorkspace',
        'supplyData',
        'financeReporting',
        'systemOperations',
        'system',
      ]) {
        assert.equal(typeof locale.nav.groups[key], 'string')
      }

      for (const key of ['scaleProduction', 'qualityControl', 'qualityScoring', 'psdFileLibrary']) {
        assert.equal(typeof locale.nav.items[key], 'string')
      }
    }
  })
})
