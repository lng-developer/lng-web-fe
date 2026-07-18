import assert from 'node:assert/strict'
import test from 'node:test'

import { buildDashboardView } from './dashboardView.js'

test('buildDashboardView exposes only production queues for a production user', () => {
  const result = buildDashboardView({
    user: { permissions: ['PRODUCTION:READ'] },
    summaries: {
      production: { needScale: 4, qcPending: 2, blockers: { MISSING_PSD: 3 } },
    },
    failures: {},
  })

  assert.deepEqual(
    result.queues.map(({ id, count }) => ({ id, count })),
    [
      { id: 'scale', count: 4 },
      { id: 'qc', count: 2 },
    ],
  )
  assert.deepEqual(
    result.attention.map(({ id, count }) => ({ id, count })),
    [{ id: 'missing-psd', count: 3 }],
  )
  assert.equal(
    result.queues.every((queue) => queue.id !== 'order-cases'),
    true,
  )
})

test('buildDashboardView keeps successful queue families when another query fails', () => {
  const result = buildDashboardView({
    user: { permissions: ['PRODUCTION:READ', 'SHIPMENTS:READ'] },
    summaries: {
      production: { needScale: 4, qcPending: 2 },
      shipments: { trackingPending: 9 },
    },
    failures: { shipments: true },
  })

  assert.deepEqual(
    result.queues.map((queue) => queue.id),
    ['scale', 'qc'],
  )
  assert.equal(
    result.attention.some((item) => item.id === 'tracking-pending'),
    false,
  )
  assert.deepEqual(result.failedSources, ['shipments'])
})

test('buildDashboardView gives manage system users every configured queue and management link', () => {
  const result = buildDashboardView({
    user: { permissions: ['MANAGE_SYSTEM'] },
    summaries: {
      orders: { tabCounts: { OPEN_CASE: 1, NO_COST_CENTER: 2, NO_PSD: 3 } },
      production: { needScale: 4, qcPending: 5, blockers: { MISSING_PSD: 6 } },
      design: { total: 7 },
      vendorSubmissions: { ready: 8, failed: 9 },
      shipments: { trackingPending: 10 },
    },
    failures: {},
  })

  assert.equal(result.queues.length, 4)
  assert.equal(result.managementLinks.length, 6)
  assert.equal(result.totalCount, 17)
})

test('buildDashboardView creates route-safe queue links', () => {
  const result = buildDashboardView({
    user: { permissions: ['PRODUCTION:READ', 'VENDOR_SUBMISSIONS:READ', 'SHIPMENTS:READ'] },
    summaries: {
      production: { needScale: 1, qcPending: 1 },
      vendorSubmissions: { ready: 1 },
      shipments: { trackingPending: 1 },
    },
    failures: {},
  })

  assert.equal(
    result.queues.find((queue) => queue.id === 'scale').href,
    '/portal/fulfillment/scale?status=needScale',
  )
  assert.equal(
    result.queues.find((queue) => queue.id === 'qc').href,
    '/portal/fulfillment/qc?status=pending',
  )
  assert.equal(
    result.attention.find((item) => item.id === 'vendor-ready').href,
    '/portal/vendor-submissions?status=READY',
  )
  assert.equal(
    result.attention.find((item) => item.id === 'tracking-pending').href,
    '/portal/fulfillment/shipping?status=TRACKING_PENDING',
  )
})
