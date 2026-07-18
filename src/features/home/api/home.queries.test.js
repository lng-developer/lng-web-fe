import assert from 'node:assert/strict'
import test from 'node:test'

import { mapHomeSummaryResponse } from './homeSummary.js'

test('mapHomeSummaryResponse maps operations overview to dashboard cards', () => {
  assert.deepEqual(
    mapHomeSummaryResponse({
      orderItemsByStatus: { NEW: 2, MAPPING_PENDING: 3 },
      productionByStatus: { NEED_SCALE: 4, QC_PENDING: 5 },
      productionBlockers: { MISSING_PSD: 6 },
      vendorSubmissionsByStatus: { READY: 7 },
      shipmentsByStatus: { TRACKING_PENDING: 8 },
    }),
    {
      totalUsers: null,
      totalOrders: 5,
      totalRevenue: null,
      queues: [
        {
          id: 'orders',
          count: 5,
          labelKey: 'home.queues.orders',
          statusKey: 'home.queueStatus.active',
        },
        {
          id: 'scale',
          count: 4,
          labelKey: 'home.queues.scale',
          statusKey: 'home.queueStatus.warning',
        },
        {
          id: 'qc',
          count: 5,
          labelKey: 'home.queues.qc',
          statusKey: 'home.queueStatus.active',
        },
      ],
      exceptions: [
        { id: 'missing-psd', count: 6, labelKey: 'home.exceptions.missingPsd' },
        { id: 'shipping-hold', count: 8, labelKey: 'home.exceptions.shippingHold' },
        { id: 'vendor-ready', count: 7, labelKey: 'home.exceptions.vendorReady' },
      ],
    },
  )
})
