import assert from 'node:assert/strict'
import test from 'node:test'

import {
  mapCustomerExceptionRows,
  mapImportIssueRows,
  mapOrderCaseRows,
  mapOrderItemOptions,
  mapReadinessRows,
  mapTimelineRows,
} from './ordersOps.js'

test('maps operations queues to readable rows without using ids as primary text', () => {
  const exceptions = mapCustomerExceptionRows({
    items: [
      {
        orderId: '660000000000000000000301',
        orderItemId: '660000000000000000000401',
        externalOrderId: '113-1234567-1234567',
        title: 'Custom shirt',
        reason: 'ADDRESS_INVALID',
        message: 'Address is invalid',
      },
    ],
  })
  const cases = mapOrderCaseRows({
    items: [{ id: 'case-id', title: 'Buyer asked to cancel', description: 'Cancel request' }],
  })
  const issues = mapImportIssueRows({
    items: [{ id: 'issue-id', externalOrderId: '114-1', errorMessage: 'Missing SKU' }],
  })

  assert.equal(exceptions[0].primary, '113-1234567-1234567')
  assert.equal(exceptions[0].secondary, 'Custom shirt')
  assert.equal(cases[0].primary, 'Buyer asked to cancel')
  assert.equal(issues[0].message, 'Missing SKU')
})

test('maps readiness checklist into operator labels', () => {
  const rows = mapReadinessRows({
    ready: false,
    checks: {
      address: { ok: true, status: 'VALID' },
      customization: { ok: false, status: 'NOT_READY' },
      blockingIssues: { ok: false, count: 2 },
      itemStatus: { ok: true, status: 'CUSTOMIZATION_PARSED' },
    },
    blockingReasons: ['CUSTOMIZATION_NOT_READY', 'OPEN_ISSUE'],
  })

  assert.deepEqual(
    rows.map((row) => row.label),
    ['Address', 'Customization', 'Blocking issues', 'Item status'],
  )
  assert.equal(rows[1].ok, false)
  assert.equal(rows[1].value, 'NOT_READY')
  assert.equal(rows[2].value, '2 open')
})

test('maps timeline events into readable event rows', () => {
  const rows = mapTimelineRows({
    items: [
      {
        id: 'timeline-id',
        eventType: 'ORDER_ITEM_STATUS_CHANGED',
        message: 'Item moved forward',
        fromStatus: 'CUSTOMIZATION_PARSED',
        toStatus: 'FULFILLMENT_READY',
        source: 'USER',
        actor: {
          displayName: 'Nguyen Mai Phuong',
          employeeCode: 'J2508',
        },
        createdAt: '2026-07-01T00:00:00.000Z',
      },
      {
        id: 'timeline-id-2',
        eventType: 'SHIPMENT_CONFIRMED',
        source: 'SHIPMENT',
        actorId: '660000000000000000000901',
        createdAt: '2026-07-01T01:00:00.000Z',
      },
    ],
  })

  assert.equal(rows[0].event, 'Order item status changed')
  assert.equal(rows[0].message, 'Item moved forward')
  assert.equal(rows[0].statusChange, 'CUSTOMIZATION_PARSED -> FULFILLMENT_READY')
  assert.equal(rows[0].actorLabel, 'Nguyen Mai Phuong')
  assert.equal(rows[1].message, '')
  assert.equal(rows[1].actorLabel, '660000...000901')
})

test('maps order items for selector with id only in metadata', () => {
  const options = mapOrderItemOptions({
    items: [
      {
        item: {
          id: '660000000000000000000401',
          title: 'Custom mug',
          sku: 'MUG-BLACK-11OZ',
          quantity: 2,
          status: 'CUSTOMIZATION_PARSED',
        },
      },
    ],
  })

  assert.equal(options[0].label, 'Custom mug')
  assert.equal(options[0].caption, 'MUG-BLACK-11OZ | Qty 2 | CUSTOMIZATION_PARSED')
  assert.equal(options[0].value, '660000000000000000000401')
})
