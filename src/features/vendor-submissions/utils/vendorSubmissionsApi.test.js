import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildCancelVendorSubmissionPayload,
  buildCreateVendorSubmissionQuery,
  buildMarkFailedVendorSubmissionPayload,
  buildSubmitToVendorPayload,
  buildVendorSubmissionListQuery,
  mapVendorSubmissionDetail,
  mapVendorSubmissionResponse,
  mapVendorSubmissionsResponse,
  readVendorSubmissionDashboardSearch,
} from './vendorSubmissionsApi.js'

test('readVendorSubmissionDashboardSearch accepts a supported status', () => {
  assert.deepEqual(readVendorSubmissionDashboardSearch('?status=READY'), { status: 'READY' })
  assert.deepEqual(readVendorSubmissionDashboardSearch('?status=unknown'), {})
})

test('buildVendorSubmissionListQuery keeps operator id filters and removes empty values', () => {
  assert.deepEqual(
    buildVendorSubmissionListQuery({
      id: ' 660000000000000000120001 ',
      externalOrderId: ' 112-1234567-1234567 ',
      vendorExternalOrderId: ' MZ-ORDER-1 ',
      status: 'ready',
      shopId: '',
      page: 2,
      limit: 500,
    }),
    {
      id: '660000000000000000120001',
      externalOrderId: '112-1234567-1234567',
      vendorExternalOrderId: 'MZ-ORDER-1',
      status: 'READY',
      page: 2,
      limit: 100,
    },
  )
})

test('mapVendorSubmissionResponse exposes display fields for table rows', () => {
  assert.deepEqual(
    mapVendorSubmissionResponse({
      id: 'sub-1',
      productionTaskId: 'prod-1',
      externalOrderId: '112-1234567-1234567',
      status: 'READY',
      vendorName: 'Merchize',
      vendorProductName: 'Hoodie',
      costCenterCode: 'CC-HOODIE',
      provider: 'MERCHIZE',
      vendorExternalOrderId: 'MZ-ORDER-1',
      updatedAt: '2026-07-17T12:00:00.000Z',
    }),
    {
      id: 'sub-1',
      productionTaskId: 'prod-1',
      orderId: '112-1234567-1234567',
      status: 'READY',
      vendor: 'Merchize',
      vendorProduct: 'Hoodie',
      costCenter: 'CC-HOODIE',
      provider: 'MERCHIZE',
      vendorOrderId: 'MZ-ORDER-1',
      updatedAt: '2026-07-17T12:00:00.000Z',
      raw: {
        id: 'sub-1',
        productionTaskId: 'prod-1',
        externalOrderId: '112-1234567-1234567',
        status: 'READY',
        vendorName: 'Merchize',
        vendorProductName: 'Hoodie',
        costCenterCode: 'CC-HOODIE',
        provider: 'MERCHIZE',
        vendorExternalOrderId: 'MZ-ORDER-1',
        updatedAt: '2026-07-17T12:00:00.000Z',
      },
    },
  )
})

test('mapVendorSubmissionsResponse normalizes BE pagination', () => {
  assert.deepEqual(
    mapVendorSubmissionsResponse({
      items: [{ id: 'sub-1', status: 'READY' }],
      pagination: { page: 2, limit: 20, total: 41 },
    }).pagination,
    { page: 2, limit: 20, total: 41 },
  )
})

test('detail mapper keeps preview fields and history arrays', () => {
  const detail = mapVendorSubmissionDetail({
    id: 'sub-1',
    payloadSnapshot: { orderItem: { sku: 'SKU-1' } },
    submittedResponse: { ok: true },
    statusHistory: [{ status: 'READY' }],
  })

  assert.equal(detail.id, 'sub-1')
  assert.deepEqual(detail.payloadSnapshot.orderItem, { sku: 'SKU-1' })
  assert.deepEqual(detail.submittedResponse, { ok: true })
  assert.deepEqual(detail.statusHistory, [{ status: 'READY' }])
})

test('mutation payload builders send only BE fields', () => {
  assert.deepEqual(buildCreateVendorSubmissionQuery({ limit: 200, shopId: '' }), { limit: 100 })
  assert.deepEqual(buildSubmitToVendorPayload({ provider: ' merchize ', dryRun: true }), {
    provider: 'MERCHIZE',
    dryRun: true,
  })
  assert.deepEqual(buildMarkFailedVendorSubmissionPayload({ failureReason: ' Bad payload ' }), {
    failureReason: 'Bad payload',
  })
  assert.deepEqual(buildCancelVendorSubmissionPayload({ cancelReason: '' }), {})
})
