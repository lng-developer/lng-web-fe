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
    ENDPOINTS.DESIGN.VOID_SUBMISSION_SCORE('task-1', 'submission-1', 'asset-1'),
    '/api/design/tasks/task-1/submissions/submission-1/assets/asset-1/score/void',
  )
  assert.equal(ENDPOINTS.DESIGN.SUBMISSIONS('task-1'), '/api/design/tasks/task-1/submissions')
  assert.equal(
    ENDPOINTS.DESIGN.DELETE_SUBMISSION('task-1', 'submission-1'),
    '/api/design/tasks/task-1/submissions/submission-1',
  )
})

test('buyer insights endpoint matches the aggregate report route', () => {
  assert.equal(ENDPOINTS.REPORTS.BUYER_INSIGHTS, '/api/reports/buyers/insights')
  assert.equal(ENDPOINTS.REPORTS.ADS_CHANNEL_PERFORMANCE, '/api/reports/ads/channel-performance')
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

test('notification inbox endpoints match the shared backend module', () => {
  assert.equal(ENDPOINTS.NOTIFICATIONS.INBOX, '/api/notifications')
  assert.equal(ENDPOINTS.NOTIFICATIONS.UNREAD_COUNT, '/api/notifications/unread-count')
  assert.equal(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ, '/api/notifications/read-all')
  assert.equal(
    ENDPOINTS.NOTIFICATIONS.MARK_READ('notification-1'),
    '/api/notifications/notification-1/read',
  )
})

test('HR payroll adjustment endpoints match the shared backend module', () => {
  assert.equal(ENDPOINTS.HR.PAYROLL_ADJUSTMENTS, '/api/hr/payroll-adjustments')
  assert.equal(ENDPOINTS.HR.PAYROLL_ADJUSTMENT('a1'), '/api/hr/payroll-adjustments/a1')
})

test('HR leave preview, attachment, and refund endpoints match backend routes', () => {
  assert.equal(ENDPOINTS.HR.LEAVE_REQUEST_PREVIEW, '/api/hr/leave-requests/preview')
  assert.equal(
    ENDPOINTS.HR.LEAVE_REQUEST_ATTACHMENTS('leave-1'),
    '/api/hr/leave-requests/leave-1/attachments',
  )
  assert.equal(
    ENDPOINTS.HR.LEAVE_REQUEST_REFUND('leave-1'),
    '/api/hr/leave-requests/leave-1/refund',
  )
})

test('HR leave balance administration endpoints match backend routes', () => {
  assert.equal(
    ENDPOINTS.HR.LEAVE_BALANCE_ADJUST('profile-1', 2026, 'ANNUAL'),
    '/api/hr/leave-balances/profile-1/2026/ANNUAL/adjust',
  )
  assert.equal(ENDPOINTS.HR.LEAVE_BALANCE_ACCRUE, '/api/hr/leave-balances/accrue')
  assert.equal(ENDPOINTS.HR.LEAVE_BALANCE_RESET, '/api/hr/leave-balances/reset')
  assert.equal(ENDPOINTS.HR.LEAVE_BALANCE_CARRY_OVER, '/api/hr/leave-balances/carry-over')
})
