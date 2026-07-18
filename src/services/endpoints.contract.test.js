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
  assert.equal(ENDPOINTS.DESIGN.SCORE_SUMMARY, '/api/design/score-summary')
  assert.equal(
    ENDPOINTS.DESIGN.OVERRIDE_SUBMISSION_SCORE('score-1'),
    '/api/design/submission-scores/score-1/override',
  )
  assert.equal(
    ENDPOINTS.DESIGN.VOID_SUBMISSION_SCORE('task-1', 'submission-1'),
    '/api/design/tasks/task-1/submissions/submission-1/score/void',
  )
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

test('missing backend endpoint constants match backend routes', () => {
  assert.equal(ENDPOINTS.AUTH.LOGOUT, '/api/auth/logout')
  assert.equal(ENDPOINTS.AUTH.REGISTER, '/api/auth/register')
  assert.equal(ENDPOINTS.MAPPING.SUMMARY, '/api/mapping/summary')
  assert.equal(ENDPOINTS.MAPPING.UNMATCHED_ORDER_ITEMS, '/api/mapping/order-items/unmatched')
  assert.equal(
    ENDPOINTS.PRODUCTION.MANUAL_FILE_CHECK('task-1'),
    '/api/production/tasks/task-1/file-checks/manual',
  )
  assert.equal(
    ENDPOINTS.PRODUCTION.MANUAL_SCALED_OUTPUT_FILE('task-1'),
    '/api/production/tasks/task-1/file-checks/manual/scaled-output-file',
  )
  assert.equal(ENDPOINTS.SHIPMENTS.SUMMARY, '/api/shipments/summary')
  assert.equal(
    ENDPOINTS.SHIPMENTS.RECHECK_VENDOR_TRACKING,
    '/api/shipments/vendor-tracking/recheck',
  )
  assert.equal(
    ENDPOINTS.SHIPMENTS.RECHECK_SUBMITTED_VENDOR_TRACKING,
    '/api/shipments/vendor-tracking/recheck-submitted',
  )
  assert.equal(ENDPOINTS.SHOPS.STATUS('shop-1'), '/api/shops/shop-1/status')
  assert.equal(ENDPOINTS.VENDOR_SUBMISSIONS.SUMMARY, '/api/vendor-submissions/summary')
  assert.equal(
    ENDPOINTS.VENDOR_SUBMISSIONS.SUBMIT_TO_VENDOR('submission-1'),
    '/api/vendor-submissions/submission-1/submit-to-vendor',
  )
  assert.equal(ENDPOINTS.VENDORS.INTEGRATION('vendor-1'), '/api/vendors/vendor-1/integration')
  assert.equal(
    ENDPOINTS.VENDORS.INTEGRATION_REFRESH('vendor-1'),
    '/api/vendors/vendor-1/integration/refresh',
  )
})
