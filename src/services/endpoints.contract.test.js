import assert from 'node:assert/strict'
import test from 'node:test'

import { ENDPOINTS } from './endpoints.js'

test('order mutation endpoints match backend route names', () => {
  assert.equal(ENDPOINTS.ORDERS.SHIPPING_ADDRESS('order-1'), '/api/orders/order-1/shipping-address')
  assert.equal(ENDPOINTS.ORDERS.SHIPPING_SERVICE('order-1'), '/api/orders/order-1/shipping-service')
})

test('external order import job endpoints do not include a jobs segment', () => {
  assert.equal(
    ENDPOINTS.ORDER_IMPORTS.JOB('job-1'),
    '/api/integration/external-order-imports/job-1',
  )
  assert.equal(
    ENDPOINTS.ORDER_IMPORTS.JOB_ISSUES('job-1'),
    '/api/integration/external-order-imports/job-1/issues',
  )
  assert.equal(
    ENDPOINTS.ORDER_IMPORTS.JOB_RAW_RECORDS('job-1'),
    '/api/integration/external-order-imports/job-1/raw-records',
  )
})

test('design workload endpoint matches backend task route', () => {
  assert.equal(ENDPOINTS.DESIGN.WORKLOAD, '/api/design/tasks/workload')
  assert.equal(ENDPOINTS.DESIGN.SUMMARY, '/api/design/tasks/summary')
  assert.equal(ENDPOINTS.DESIGN.SUBMISSIONS('task-1'), '/api/design/tasks/task-1/submissions')
  assert.equal(
    ENDPOINTS.DESIGN.DELETE_SUBMISSION('task-1', 'submission-1'),
    '/api/design/tasks/task-1/submissions/submission-1',
  )
})

test('design PSD task action endpoints match backend routes', () => {
  assert.equal(
    ENDPOINTS.DESIGN.PSD_TEMPLATE_CANDIDATES,
    '/api/design/tasks/psd-template/candidates',
  )
  assert.equal(
    ENDPOINTS.DESIGN.BULK_CREATE_PSD_FROM_LISTINGS,
    '/api/design/tasks/bulk-create-psd-from-listings',
  )
  assert.equal(ENDPOINTS.DESIGN.ASSIGN('task-1'), '/api/design/tasks/task-1/assign')
  assert.equal(ENDPOINTS.DESIGN.CANCEL('task-1'), '/api/design/tasks/task-1/cancel')
})
