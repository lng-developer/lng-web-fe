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

test('shipping keeps only the primary tab bar and filters status from the toolbar', () => {
  const source = readPageSource()

  assert.equal(source.match(/<OperationsTabs/g)?.length, 1)
  assert.equal(source.includes('<Select'), true)
  assert.equal(source.includes("'aria-label': t('shipments.table.status')"), true)
})

test('shipping page uses the dense header and toolbar refresh action', () => {
  const source = readPageSource()

  assert.equal(source.includes('OperationsHeader'), false)
  assert.equal(source.includes('min-h-[54px]'), true)
  assert.equal(
    source.includes('<Typography variant="h5" className="text-xl font-bold text-ink-strong">'),
    true,
  )
  assert.equal(source.includes("aria-label={t('common.refresh')}"), true)
  assert.equal(source.includes('onClick={() => activeQuery.refetch()}'), true)
})

test('shipping keeps refresh in the shipment filter row', () => {
  const source = readPageSource()

  assert.ok(
    source.indexOf('onClick={() => activeQuery.refetch()}') >
      source.indexOf('<div className="grid'),
  )
})

test('shipping keeps refresh available for webhook logs', () => {
  const source = readPageSource()

  assert.equal(source.includes("activeTab === 'webhooks' ?"), true)
})

test('shipping page exposes business filters and shipment actions', () => {
  const source = readPageSource()

  assert.equal(source.includes('filters.id'), false)
  assert.equal(source.includes('externalOrderId'), true)
  assert.equal(source.includes('vendorExternalOrderId'), true)
  assert.equal(source.includes('trackingNumber'), true)
  assert.equal(source.includes('useUpdateShipmentTrackingMutation'), true)
  assert.equal(source.includes('useUpdateShipmentStatusMutation'), true)
  assert.equal(source.includes('useRecheckVendorTrackingMutation'), true)
  assert.equal(source.includes('useRecheckSubmittedVendorTrackingMutation'), true)
  assert.equal(source.includes("activeTab === 'webhooks'"), true)
})

test('shipping table omits the internal ID column', () => {
  const source = readPageSource()

  assert.equal(source.includes("{ key: 'id', labelKey: 'shipments.table.id'"), false)
})
