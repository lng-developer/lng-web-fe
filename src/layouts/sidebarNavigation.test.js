import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { filterNavigationByRole, getRoleMeta, SIDEBAR_NAVIGATION } from './sidebarNavigation.js'

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

describe('filterNavigationByRole', () => {
  it('keeps the full portal navigation for admin', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'admin')

    assert.deepEqual(collectLeafIds(navigation), [
      'dashboard',
      'order-list',
      'order-detail',
      'listings',
      'tracking',
      'scale',
      'qc',
      'shipping',
      'cs',
      'design-task-list',
      'template-center',
      'finance-summary',
      'finance-balance',
      'finance-payout',
      'compensation-pool',
      'vendor-list',
      'products-cost',
      'store-routing',
      'customers',
      'users-roles',
      'shops-stores',
      'system-config',
      'audit-log',
      'hr',
    ])
  })

  it('keeps only design operations for designer', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'designer')

    assert.deepEqual(collectLeafIds(navigation), [
      'dashboard',
      'design-task-list',
      'template-center',
    ])
  })

  it('keeps only QC fulfillment for qc', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'qc')

    assert.deepEqual(collectLeafIds(navigation), ['dashboard', 'qc'])
  })

  it('keeps scale and shipping fulfillment for fulfillment', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'fulfillment')

    assert.deepEqual(collectLeafIds(navigation), ['dashboard', 'scale', 'shipping'])
  })

  it('keeps sales, customers, and CS fulfillment for cs', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'cs')

    assert.deepEqual(collectLeafIds(navigation), [
      'dashboard',
      'order-list',
      'order-detail',
      'listings',
      'tracking',
      'cs',
      'customers',
    ])
  })

  it('removes empty sections and parent groups after filtering', () => {
    const navigation = filterNavigationByRole(SIDEBAR_NAVIGATION, 'designer')
    const portal = findItem(navigation, 'portal')

    assert.equal(findItem(navigation, 'sales'), null)
    assert.equal(findItem(navigation, 'fulfillment'), null)
    assert.equal(portal.children.length, 1)
    assert.equal(portal.children[0].id, 'operations')
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
