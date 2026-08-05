import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

import {
  cancelVendorSubmission,
  getVendorSubmissionPayloadPreview,
  getVendorSubmissionSummary,
  listVendorSubmissions,
  markVendorSubmissionFailed,
  reconcileVendorSubmission,
  submitVendorSubmission,
} from '@/features/portal/vendor-submissions/api/vendorSubmissionApi'
import { apiClient } from '@/shared/api'

describe('vendorSubmissionApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('uses snapshot-derived submit and explicit reconciliation contracts', async () => {
    await listVendorSubmissions({ page: 1, limit: 20, status: 'NEEDS_REVIEW' })
    await submitVendorSubmission('submission-1')
    await reconcileVendorSubmission('submission-1', {
      outcome: 'REMOTE_FOUND',
      vendorExternalOrderId: 'MZ-1',
    })

    expect(apiClient.get).toHaveBeenCalledWith('/api/vendor-submissions', {
      params: { page: 1, limit: 20, status: 'NEEDS_REVIEW' },
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/vendor-submissions/submission-1/submit-to-vendor',
      { dryRun: false },
    )
    expect(apiClient.post).toHaveBeenCalledWith('/api/vendor-submissions/submission-1/reconcile', {
      outcome: 'REMOTE_FOUND',
      vendorExternalOrderId: 'MZ-1',
    })
  })

  it('uses operational summary, preview, failure, and cancel contracts', async () => {
    await getVendorSubmissionSummary({ status: 'FAILED' })
    await getVendorSubmissionPayloadPreview('submission-1')
    await markVendorSubmissionFailed('submission-1', 'Provider rejected payload')
    await cancelVendorSubmission('submission-1', 'Duplicate')

    expect(apiClient.get).toHaveBeenCalledWith('/api/vendor-submissions/summary', {
      params: { status: 'FAILED' },
    })
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/vendor-submissions/submission-1/payload-preview',
    )
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/vendor-submissions/submission-1/mark-failed',
      { failureReason: 'Provider rejected payload' },
    )
    expect(apiClient.post).toHaveBeenCalledWith('/api/vendor-submissions/submission-1/cancel', {
      cancelReason: 'Duplicate',
    })
  })
})
