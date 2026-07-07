import assert from 'node:assert/strict'
import test from 'node:test'

import { TASK_TYPES } from '../../../constants/app.js'
import { DESIGN_TASK_STATUS_TABS } from '../constants/designTasksConstants.js'
import {
  filterDesignTasks,
  getDesignTaskCounts,
  resetDesignTasksForTest,
} from './designTasksMock.js'

test('getDesignTaskCounts returns the Idea Tasks buckets from the design', () => {
  resetDesignTasksForTest()

  assert.deepEqual(getDesignTaskCounts(), {
    [DESIGN_TASK_STATUS_TABS.ALL]: 5,
    [DESIGN_TASK_STATUS_TABS.NEW]: 4,
    [DESIGN_TASK_STATUS_TABS.ASSIGNED]: 1,
    [DESIGN_TASK_STATUS_TABS.IN_PROGRESS]: 0,
    [DESIGN_TASK_STATUS_TABS.UPLOADED]: 0,
    [DESIGN_TASK_STATUS_TABS.QC_PASSED]: 0,
    [DESIGN_TASK_STATUS_TABS.QC_REJECTED]: 0,
  })
})

test('filterDesignTasks exposes the required first page rows', () => {
  resetDesignTasksForTest()

  const result = filterDesignTasks(undefined, {
    subTab: TASK_TYPES.IDEA,
    page: 1,
    pageSize: 10,
  })
  const first = result.items[0]

  assert.equal(result.total, 22)
  assert.equal(result.items.length, 10)
  assert.equal(first.createdAt.date, '24 Jun 2026')
  assert.equal(first.statusTask, 'New')
  assert.equal(first.linkProduct, 'etsy.com/listing/123...')
  assert.equal(first.assigned, 'Pending assign')
  assert.equal(first.seller, 'Acct')
  assert.equal(first.description, 'Custom tumbler design for wedding...')
  assert.equal(first.productType, 'T-Shirt')
})

test('filterDesignTasks combines status tab, search, and pagination', () => {
  resetDesignTasksForTest()

  const result = filterDesignTasks(undefined, {
    subTab: TASK_TYPES.IDEA,
    statusTab: DESIGN_TASK_STATUS_TABS.ASSIGNED,
    search: 'ornament',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.total, 1)
  assert.equal(result.items[0].statusTask, 'Assigned')
  assert.equal(result.items[0].assigned, 'Nam')
})

test('filterDesignTasks exposes the PSD Tasks screen rows and summary counts', () => {
  resetDesignTasksForTest()

  const result = filterDesignTasks(undefined, {
    subTab: TASK_TYPES.PSD,
    page: 1,
    pageSize: 10,
  })
  const first = result.items[0]

  assert.equal(result.total, 5)
  assert.equal(result.summaryTotal, 2)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.ALL], 2)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.NEW], 0)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.REQUESTED], 0)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.UPLOADED], 2)
  assert.equal(first.createdAt.date, '01 Jul 2026')
  assert.equal(first.asin, 'B08Z4P8W5N')
  assert.equal(first.statusTask, 'Uploaded')
  assert.equal(first.assigned, 'Jane Cooper')
  assert.equal(first.priority, 'Medium')
  assert.equal(first.psdStatus, 'Available')
  assert.equal(first.seller, 'Global Shop')
  assert.equal(first.asinType, 'Normal')
})

test('filterDesignTasks exposes the PNG Tasks rows, counts, and expanded detail data', () => {
  resetDesignTasksForTest()

  const result = filterDesignTasks(undefined, {
    subTab: TASK_TYPES.PNG,
    page: 1,
    pageSize: 10,
  })
  const first = result.items[0]

  assert.equal(result.total, 22)
  assert.equal(result.items.length, 2)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.ALL], 2)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.PENDING_ASSIGNMENT], 0)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.NEED_SCALE], 0)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.PENDING], 0)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.COMPLETED], 2)
  assert.equal(result.counts[DESIGN_TASK_STATUS_TABS.QC_REJECTED], 0)
  assert.equal(first.orderId, '#PNG-1042')
  assert.equal(first.scaleStatus, 'Complete')
  assert.equal(first.scaleBy, 'Jane Cooper')
  assert.equal(first.shop, 'Global Shop')
  assert.equal(first.orderStatus, 'Completed')
  assert.equal(first.orderOwner, 'Mia Chen')
  assert.equal(first.qcBy, 'Alex Rivera')
  assert.equal(first.detail.customization.customName, "Violeta's Bachelorette")
  assert.equal(first.detail.orderInfo.fulfillName, '113-1524195-6858656-163604606457041')
})
