import assert from 'node:assert/strict'
import test from 'node:test'

import { SCALE_STATUS_TABS, SCALE_STATUSES } from '../constants/scaleConstants.js'
import {
  assignScaleTaskCs,
  filterEtsyScaleTasks,
  filterScaleTasks,
  getEtsyScaleCounts,
  getScaleCounts,
  resetScaleTasksForTest,
} from './scaleMock.js'

test('getScaleCounts returns all status buckets for the 19 task seed', () => {
  resetScaleTasksForTest()

  const counts = getScaleCounts()

  assert.equal(counts[SCALE_STATUS_TABS.ALL], 19)
  assert.ok(counts[SCALE_STATUS_TABS.NEED_SCALE] > 0)
  assert.ok(counts[SCALE_STATUS_TABS.PENDING] > 0)
  assert.ok(counts[SCALE_STATUS_TABS.COMPLETED] > 0)
  assert.ok(counts[SCALE_STATUS_TABS.QC_REJECTED] > 0)
})

test('filterScaleTasks combines tab, search, dropdown filters, and pagination', () => {
  resetScaleTasksForTest()

  const result = filterScaleTasks(undefined, {
    statusTab: SCALE_STATUS_TABS.NEED_SCALE,
    search: 'ORD-10042',
    shop: 'LNG Group',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.total, 1)
  assert.equal(result.items[0].orderId, 'ORD-10042')
  assert.equal(result.items[0].scaleStatus, SCALE_STATUSES.NEED_SCALE)
  assert.equal(result.counts[SCALE_STATUS_TABS.ALL], 19)
})

test('filterScaleTasks returns the future API response contract', () => {
  resetScaleTasksForTest()

  const result = filterScaleTasks(undefined, { page: 2, pageSize: 10 })

  assert.equal(result.items.length, 9)
  assert.equal(result.total, 19)
  assert.ok(result.counts)
  assert.ok(result.options)
})

test('filterScaleTasks exposes Amazon detail data for the shared expanded panel', () => {
  resetScaleTasksForTest()

  const result = filterScaleTasks(undefined, { page: 1, pageSize: 10 })
  const detail = result.items[0].detail

  assert.equal(detail.product.primaryCode, 'B0SW9200EM')
  assert.equal(detail.product.secondaryCode, 'SW9200-EMB')
  assert.equal(detail.product.psdStatus, 'NORMAL')
  assert.equal(detail.customization.length, 10)
  assert.equal(detail.customization.at(-1).type, 'image')
  assert.equal(detail.costCenter.vendorProduct, 'Monster Digital - SW-9200-SAN-L')
  assert.equal(detail.costCenter.size, 'Sand / L')
  assert.equal(detail.orderInfo, undefined)
})

test('assignScaleTaskCs updates assignee and derived CS status', async () => {
  resetScaleTasksForTest()

  const updated = await assignScaleTaskCs({ taskId: 'scale-task-ord-10042', csBy: 'cs-anna' })

  assert.equal(updated.csBy, 'cs-anna')
  assert.equal(updated.csStatus, 'ASSIGNED')
})

test('getEtsyScaleCounts matches the Etsy scale design buckets', () => {
  resetScaleTasksForTest()

  assert.deepEqual(getEtsyScaleCounts(), {
    [SCALE_STATUS_TABS.ALL]: 31,
    [SCALE_STATUS_TABS.NEED_SCALE]: 0,
    [SCALE_STATUS_TABS.PENDING]: 1,
    [SCALE_STATUS_TABS.COMPLETED]: 30,
    [SCALE_STATUS_TABS.QC_REJECTED]: 0,
  })
})

test('filterEtsyScaleTasks exposes the required sample rows and future contract', () => {
  resetScaleTasksForTest()

  const result = filterEtsyScaleTasks(undefined, { page: 1, pageSize: 10 })
  const ids = result.items.map((task) => task.orderId)

  assert.equal(result.total, 31)
  assert.deepEqual(ids.slice(0, 3), ['ORD-10042', 'ORD-10039', 'ORD-10035'])
  assert.equal(result.lastUpdatedAt, '10:46')
  assert.equal(result.items[1].groupId, null)
  assert.equal(result.items[1].detail.product.primaryCode, 'B0GRMKNZNV')
  assert.equal(result.items[1].detail.product.secondaryCode, 'J2522-WT-070326-103')
  assert.equal(result.items[1].detail.product.psdStatus, 'NORMAL')
  assert.equal(result.items[1].detail.customization.length, 10)
  assert.deepEqual(
    result.items[1].detail.customization.map((item) => item.label),
    [
      'Choose Your Size:',
      'Custom Name:',
      'Custom Text:',
      'Date/Location:',
      'Text Color:',
      'BG Color:',
      'Priority:',
      'URL:',
      'Link SP:',
      'Customer Photo:',
    ],
  )
  assert.equal(result.items[1].detail.costCenter.color, undefined)
  assert.ok(result.options.vendors.includes('Lenful'))
})

test('filterEtsyScaleTasks combines tab, toolbar filters, search, and pagination', () => {
  resetScaleTasksForTest()

  const result = filterEtsyScaleTasks(undefined, {
    statusTab: SCALE_STATUS_TABS.COMPLETED,
    search: 'ORD-10035',
    shop: 'Acct2',
    vendor: 'Lenful',
    orderStatus: 'Delivered',
    scaleBy: 'Duc',
    qcByCs: 'Mai',
    scaleFile: 'Done',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.total, 1)
  assert.equal(result.items[0].orderId, 'ORD-10035')
})
