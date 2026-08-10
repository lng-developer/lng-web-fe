import { beforeEach, describe, expect, expectTypeOf, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

import {
  getImportJob,
  getImportJobProgress,
  type ImportUploadResult,
  listImportJobs,
  listIssues,
  listJobIssues,
  listJobRawRecords,
  retryImportJob,
  retryPostImportRawRecords,
  updateIssueStatus,
  uploadEtsySoldItems,
  uploadManualExcel,
} from '@/features/portal/integrations/api/integrationApi'
import { apiClient } from '@/shared/api'

describe('integrationApi', () => {
  it('types upload responses as operation results', () => {
    expectTypeOf(uploadManualExcel).returns.resolves.toEqualTypeOf<ImportUploadResult>()
    expectTypeOf(uploadEtsySoldItems).returns.resolves.toEqualTypeOf<ImportUploadResult>()
  })
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('uses the import job, issue, raw-record, and retry contracts', async () => {
    const jobParams = {
      dateFrom: '2026-07-01T00:00:00.000Z',
      dateTo: '2026-07-31T23:59:59.999Z',
      limit: 20,
      page: 2,
      shopId: 'shop-1',
      source: 'MANUAL_EXCEL' as const,
      status: 'FAILED' as const,
    }
    const issueParams = {
      externalItemId: 'ITEM-1',
      externalOrderId: 'ORDER-1',
      issueType: 'ORDER_IMPORT_FAILED',
      limit: 20,
      page: 1,
      severity: 'ERROR' as const,
      shopId: 'shop-1',
      source: 'MANUAL_EXCEL' as const,
      status: 'OPEN' as const,
    }

    await listImportJobs(jobParams)
    await getImportJob('job-1')
    await getImportJobProgress('job-1')
    await listJobIssues('job-1', { limit: 10, page: 1 })
    await listJobRawRecords('job-1', { limit: 10, page: 2, postImportStatus: 'FAILED' })
    await listIssues(issueParams)
    await retryImportJob('job-1')
    await retryPostImportRawRecords('job-1', ['raw-1'])
    await updateIssueStatus('issue-1', { note: 'Corrected source row', status: 'RESOLVED' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/integration/external-order-imports', {
      params: jobParams,
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/integration/external-order-imports/job-1')
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/job-1/progress',
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/job-1/issues',
      { params: { limit: 10, page: 1 } },
    )
    expect(apiClient.get).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/job-1/raw-records',
      { params: { limit: 10, page: 2, postImportStatus: 'FAILED' } },
    )
    expect(apiClient.get).toHaveBeenCalledWith('/api/integration/external-order-imports/issues', {
      params: issueParams,
    })
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/job-1/retry',
    )
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/job-1/raw-records/retry-post-import',
      { rawRecordIds: ['raw-1'] },
    )
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/integration/external-order-imports/issues/issue-1',
      { note: 'Corrected source row', status: 'RESOLVED' },
    )
  })

  it('uploads the original file and metadata as multipart form data', async () => {
    const file = new File(['Order ID,Transaction ID'], 'etsy-orders.csv', { type: 'text/csv' })
    const input = {
      externalAccountId: 'etsy-account',
      file,
      marketplaceCode: 'ETSY_US',
      shopConnectionId: 'connection-1',
      shopId: 'shop-1',
    }

    await uploadManualExcel(input)
    await uploadEtsySoldItems(input)

    const manualForm = vi.mocked(apiClient.post).mock.calls[0][1] as FormData
    const etsyForm = vi.mocked(apiClient.post).mock.calls[1][1] as FormData
    expect(apiClient.post).toHaveBeenNthCalledWith(
      1,
      '/api/integration/external-order-imports/manual-excel',
      expect.any(FormData),
    )
    expect(apiClient.post).toHaveBeenNthCalledWith(
      2,
      '/api/integration/external-order-imports/etsy-sold-order-items',
      expect.any(FormData),
    )
    for (const form of [manualForm, etsyForm]) {
      expect(form.get('file')).toBe(file)
      expect(form.get('shopId')).toBe('shop-1')
      expect(form.get('marketplaceCode')).toBe('ETSY_US')
      expect(form.get('shopConnectionId')).toBe('connection-1')
      expect(form.get('externalAccountId')).toBe('etsy-account')
      expect(form.has('fileBase64')).toBe(false)
    }
  })
})
