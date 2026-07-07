import assert from 'node:assert/strict'
import test from 'node:test'

import { QC_PLATFORM_TABS, QC_STATUS_TABS } from '../constants/qcConstants.js'
import { filterQcTasks, getQcCounts, resetQcTasksForTest } from './qcMock.js'

test('getQcCounts returns the Amazon QC buckets from the design', () => {
  resetQcTasksForTest()

  assert.deepEqual(getQcCounts(), {
    [QC_STATUS_TABS.ALL]: 22,
    [QC_STATUS_TABS.PENDING]: 0,
    [QC_STATUS_TABS.QC_REJECTED]: 0,
    [QC_STATUS_TABS.FAILED]: 1,
    [QC_STATUS_TABS.COMPLETED]: 22,
    [QC_STATUS_TABS.ADDRESS_INVALID]: 0,
  })
})

test('filterQcTasks exposes the required sample rows and expanded detail', () => {
  resetQcTasksForTest()

  const result = filterQcTasks(undefined, {
    platform: QC_PLATFORM_TABS.AMAZON,
    page: 1,
    pageSize: 10,
  })
  const orderIds = result.items.map((task) => task.orderId)
  const expanded = result.items[1]

  assert.equal(result.total, 22)
  assert.deepEqual(orderIds.slice(0, 3), ['ORD-20041', 'ORD-20039', 'ORD-20035'])
  assert.equal(expanded.detail.product.sku, 'J2S22-WT-070326-109')
  assert.equal(expanded.detail.product.asin, 'B0GRMBFHDD')
  assert.equal(expanded.detail.product.quantity, 1)
  assert.equal(expanded.detail.scaleStatus, 'Complete')
  assert.equal(expanded.detail.orderOwner, 'Nguyễn Phương Nam')
  assert.equal(expanded.detail.fulfillName, '111-1432051-0226621-163934307644241')
  assert.equal(expanded.detail.pngStatus, 'Available')
  assert.equal(expanded.detail.vendorProduct, 'Lenful - US Tapestry')
})

test('filterQcTasks combines status tab, search, seller, shop, and pagination', () => {
  resetQcTasksForTest()

  const result = filterQcTasks(undefined, {
    platform: QC_PLATFORM_TABS.AMAZON,
    statusTab: QC_STATUS_TABS.FAILED,
    search: 'ORD-20035',
    seller: 'Nguyễn Phương Nam',
    shop: 'Acct2',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.total, 1)
  assert.equal(result.items[0].orderId, 'ORD-20035')
})
