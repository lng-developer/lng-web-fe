import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildShipmentListQuery,
  buildUpdateShipmentStatusPayload,
  buildUpdateShipmentTrackingPayload,
  buildVendorTrackingRecheckPayload,
  mapShipmentResponse,
  mapShipmentsResponse,
} from './shipmentsApi.js'

test('buildShipmentListQuery keeps operator ids and caps page size', () => {
  assert.deepEqual(
    buildShipmentListQuery({
      id: ' ship-1 ',
      externalOrderId: ' 112-1234567-1234567 ',
      vendorExternalOrderId: ' MZ-ORDER-1 ',
      trackingNumber: ' 9214490411375403131206 ',
      status: 'shipped',
      page: 2,
      limit: 500,
    }),
    {
      id: 'ship-1',
      externalOrderId: '112-1234567-1234567',
      vendorExternalOrderId: 'MZ-ORDER-1',
      trackingNumber: '9214490411375403131206',
      status: 'SHIPPED',
      page: 2,
      limit: 100,
    },
  )
})

test('mapShipmentResponse exposes display fields for table rows', () => {
  assert.deepEqual(
    mapShipmentResponse({
      id: 'ship-1',
      externalOrderId: '112-1234567-1234567',
      vendorExternalOrderId: 'MZ-ORDER-1',
      status: 'TRACKING_PENDING',
      provider: 'MERCHIZE',
      carrier: 'USPS',
      trackingNumber: '9214490411375403131206',
      updatedAt: '2026-07-17T12:00:00.000Z',
    }),
    {
      id: 'ship-1',
      orderId: '112-1234567-1234567',
      vendorOrderId: 'MZ-ORDER-1',
      status: 'TRACKING_PENDING',
      provider: 'MERCHIZE',
      carrier: 'USPS',
      trackingNumber: '9214490411375403131206',
      trackingUrl: null,
      updatedAt: '2026-07-17T12:00:00.000Z',
      raw: {
        id: 'ship-1',
        externalOrderId: '112-1234567-1234567',
        vendorExternalOrderId: 'MZ-ORDER-1',
        status: 'TRACKING_PENDING',
        provider: 'MERCHIZE',
        carrier: 'USPS',
        trackingNumber: '9214490411375403131206',
        updatedAt: '2026-07-17T12:00:00.000Z',
      },
    },
  )
})

test('mapShipmentsResponse normalizes pagination', () => {
  assert.deepEqual(
    mapShipmentsResponse({
      items: [{ id: 'ship-1', status: 'SHIPPED' }],
      pagination: { page: 3, limit: 20, total: 42 },
    }).pagination,
    { page: 3, limit: 20, total: 42 },
  )
})

test('shipment mutation payload builders send only BE fields', () => {
  assert.deepEqual(
    buildUpdateShipmentTrackingPayload({
      carrier: ' usps ',
      trackingNumber: ' 9214490411375403131206 ',
      trackingUrl: '',
      note: ' Vendor tracking ',
    }),
    {
      carrier: 'usps',
      trackingNumber: '9214490411375403131206',
      note: 'Vendor tracking',
    },
  )
  assert.deepEqual(buildUpdateShipmentStatusPayload({ status: 'delivered', note: '' }), {
    status: 'DELIVERED',
  })
  assert.deepEqual(
    buildVendorTrackingRecheckPayload({ provider: ' merchize ', externalOrderId: ' MZ-1 ' }),
    {
      provider: 'MERCHIZE',
      externalOrderId: 'MZ-1',
    },
  )
})
