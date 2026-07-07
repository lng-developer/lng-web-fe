import assert from 'node:assert/strict'
import test from 'node:test'

import { DESIGN_TASK_STATUS_TABS, DESIGN_TASK_SUB_TABS } from '../constants/designTasksConstants.js'
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
    subTab: DESIGN_TASK_SUB_TABS.IDEA,
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
    subTab: DESIGN_TASK_SUB_TABS.IDEA,
    statusTab: DESIGN_TASK_STATUS_TABS.ASSIGNED,
    search: 'ornament',
    page: 1,
    pageSize: 10,
  })

  assert.equal(result.total, 1)
  assert.equal(result.items[0].statusTask, 'Assigned')
  assert.equal(result.items[0].assigned, 'Nam')
})
