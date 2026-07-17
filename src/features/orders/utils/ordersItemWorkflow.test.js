import assert from 'node:assert/strict'
import test from 'node:test'

import {
  buildOrderItemCaseQuery,
  buildOrderItemExceptionQuery,
  buildOrderItemImportIssueQuery,
  filterRowsForOrderItemWorkflow,
  getOrderItemWorkflowScope,
} from './ordersItemWorkflow.js'

const order = {
  apiId: '660000000000000000000301',
  id: '113-1234567-1234567',
  shopId: '660000000000000000000201',
  workbenchItems: [
    {
      item: {
        id: '660000000000000000000401',
        externalOrderId: '113-1234567-1234567',
        externalItemId: '000000000000000001',
      },
    },
  ],
}

test('getOrderItemWorkflowScope resolves item and external identifiers from a workbench row', () => {
  assert.deepEqual(getOrderItemWorkflowScope(order), {
    orderId: '660000000000000000000301',
    orderItemId: '660000000000000000000401',
    shopId: '660000000000000000000201',
    externalOrderId: '113-1234567-1234567',
    externalItemId: '000000000000000001',
  })
})

test('buildOrderItemCaseQuery scopes case API to the selected order item', () => {
  assert.deepEqual(buildOrderItemCaseQuery(getOrderItemWorkflowScope(order)), {
    orderId: '660000000000000000000301',
    orderItemId: '660000000000000000000401',
    page: 1,
    limit: 5,
  })
})

test('buildOrderItemImportIssueQuery scopes import issues to external order item ids', () => {
  assert.deepEqual(buildOrderItemImportIssueQuery(getOrderItemWorkflowScope(order)), {
    externalOrderId: '113-1234567-1234567',
    externalItemId: '000000000000000001',
    page: 1,
    limit: 5,
  })
})

test('buildOrderItemExceptionQuery uses the narrowest backend-supported scope', () => {
  assert.deepEqual(buildOrderItemExceptionQuery(getOrderItemWorkflowScope(order)), {
    shopId: '660000000000000000000201',
    page: 1,
    limit: 20,
  })
})

test('filterRowsForOrderItemWorkflow keeps only rows for the selected item or order', () => {
  const scope = getOrderItemWorkflowScope(order)

  assert.deepEqual(
    filterRowsForOrderItemWorkflow(
      [
        { id: 'item-match', orderItemId: '660000000000000000000401' },
        { id: 'order-match', orderId: '660000000000000000000301' },
        { id: 'external-match', primary: '113-1234567-1234567' },
        { id: 'miss', orderItemId: '660000000000000000000999' },
      ],
      scope,
    ).map((row) => row.id),
    ['item-match', 'order-match', 'external-match'],
  )
})
