import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

function readPageSource() {
  return readFileSync(new URL('./VendorSubmissionsPage.jsx', import.meta.url), 'utf8')
}

test('vendor submissions page uses operations layout instead of workflow console', () => {
  const source = readPageSource()

  assert.equal(source.includes("from '@/components/operations'"), true)
  assert.equal(source.includes('<OperationsPageShell'), true)
  assert.equal(source.includes('<OperationsToolbar'), true)
  assert.equal(source.includes('<OperationsTable'), true)
  assert.equal(source.includes('<OperationsTabs'), true)
  assert.equal(source.includes('<OperationsPagination'), true)
  assert.equal(source.includes('ApiWorkflowPage'), false)
})

test('vendor submissions page uses the dense header and toolbar refresh action', () => {
  const source = readPageSource()

  assert.equal(source.includes('OperationsHeader'), false)
  assert.equal(source.includes('min-h-[54px]'), true)
  assert.equal(
    source.includes('<Typography variant="h5" className="text-xl font-bold text-ink-strong">'),
    true,
  )
  assert.equal(source.includes("aria-label={t('common.refresh')}"), true)
  assert.equal(source.includes('onClick={() => submissionsQuery.refetch()}'), true)
})

test('vendor submissions page exposes id filters and BE lifecycle actions', () => {
  const source = readPageSource()

  assert.equal(source.includes('externalOrderId'), true)
  assert.equal(source.includes('vendorExternalOrderId'), true)
  assert.equal(source.includes('useSubmitToVendorMutation'), true)
  assert.equal(source.includes('useMarkSubmittedVendorSubmissionMutation'), true)
  assert.equal(source.includes('useMarkFailedVendorSubmissionMutation'), true)
  assert.equal(source.includes('useRetryVendorSubmissionMutation'), true)
  assert.equal(source.includes('useCancelVendorSubmissionMutation'), true)
  assert.equal(source.includes('useCreateShipmentFromVendorSubmissionMutation'), true)
})
