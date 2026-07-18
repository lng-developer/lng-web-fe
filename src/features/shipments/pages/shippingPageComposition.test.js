import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./ShippingPage.jsx', import.meta.url), 'utf8')
}

test('shipping page uses operations layout instead of api workflow console', () => {
  const source = readPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
  assert.equal(source.includes('ApiWorkflowPage'), false)
})

test('shipping page exposes id filters and shipment actions', () => {
  const source = readPageSource()

  assert.equal(source.includes('externalOrderId'), true)
  assert.equal(source.includes('vendorExternalOrderId'), true)
  assert.equal(source.includes('trackingNumber'), true)
  assert.equal(source.includes('useUpdateShipmentTrackingMutation'), true)
  assert.equal(source.includes('useUpdateShipmentStatusMutation'), true)
  assert.equal(source.includes('useRecheckVendorTrackingMutation'), true)
  assert.equal(source.includes('useRecheckSubmittedVendorTrackingMutation'), true)
  assert.equal(source.includes("activeTab === 'webhooks'"), true)
})
