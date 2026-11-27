import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { TrackingBatchHistory } from '@/features/portal/integrations/components/TrackingBatchHistory'
import {
  getAmazonTrackingSubmission,
  listAmazonTrackingSubmissions,
  type AmazonTrackingSubmission,
} from '@/features/portal/integrations/api/integrationApi'
import i18n from '@/shared/i18n/i18n'
vi.mock('@/features/portal/integrations/api/integrationApi', () => ({
  getAmazonTrackingSubmission: vi.fn(),
  listAmazonTrackingSubmissions: vi.fn(),
}))
const batch: AmazonTrackingSubmission = {
  id: 'batch-1',
  shopId: 'shop-1',
  agentId: 'agent-1',
  shipmentIds: ['s1'],
  filename: 'upload-nov26.txt',
  rowCount: 2,
  checksum: 'checksum',
  status: 'SUCCEEDED',
  amazonBatchId: 'AMZ-123',
  result: { importedCount: 1, failedCount: 1, diagnostics: ['One row rejected'] },
  createdAt: '2026-11-26T08:00:00Z',
  updatedAt: '2026-11-26T08:00:00Z',
}
function mount() {
  return render(
    <QueryClientProvider
      client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}
    >
      <TrackingBatchHistory shopId="shop-1" />
    </QueryClientProvider>,
  )
}
describe('Tracking batch history', () => {
  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
  })
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(listAmazonTrackingSubmissions).mockResolvedValue({
      items: [batch],
      total: 11,
      page: 1,
      limit: 10,
    })
    vi.mocked(getAmazonTrackingSubmission).mockResolvedValue({
      ...batch,
      tsv: '',
      rows: [
        {
          shipmentId: 's1',
          orderId: 'o1',
          externalOrderId: '111-3512578-3541012',
          shipDate: '2026-11-23',
          carrierCode: 'USPS',
          carrierName: null,
          trackingNumber: '9214490374008505223783',
          shipMethod: 'Ground Advantage',
        },
      ],
    })
  })
  it('loads shop-scoped batches and fetches snapshot rows only when expanded', async () => {
    mount()
    expect(await screen.findByText('AMZ-123')).toBeVisible()
    expect(listAmazonTrackingSubmissions).toHaveBeenCalledWith({
      shopId: 'shop-1',
      page: 1,
      limit: 10,
    })
    expect(getAmazonTrackingSubmission).not.toHaveBeenCalled()
    expect(screen.getByText('1 accepted · 1 failed')).toBeVisible()
    fireEvent.click(screen.getByRole('button', { name: /expand row/i }))
    expect(await screen.findByText('111-3512578-3541012')).toBeVisible()
    expect(screen.getByText('9214490374008505223783')).toBeVisible()
    expect(screen.getByText('One row rejected')).toBeVisible()
    expect(screen.queryByText(/confirmed/i)).not.toBeInTheDocument()
    fireEvent.change(screen.getByRole('searchbox'), { target: { value: 'not-this-order' } })
    expect(screen.queryByText('111-3512578-3541012')).not.toBeInTheDocument()
    fireEvent.click(screen.getByTitle('2'))
    await waitFor(() =>
      expect(listAmazonTrackingSubmissions).toHaveBeenCalledWith({
        shopId: 'shop-1',
        page: 2,
        limit: 10,
      }),
    )
    expect(screen.queryByText('One row rejected')).not.toBeInTheDocument()
  })
  it.each([
    ['en', 'Ready for manual upload', 'Not uploaded to Amazon', 'Download TSV (.txt)'],
    ['vi', 'Sẵn sàng upload thủ công', 'Chưa upload lên Amazon', 'Tải TSV (.txt)'],
  ])(
    'downloads the exact draft feed without submitting it (%s)',
    async (language, status, result, downloadLabel) => {
      await i18n.changeLanguage(language)
      const draft = {
        ...batch,
        status: 'DRAFT' as const,
        agentId: null,
        amazonBatchId: undefined,
        result: undefined,
      }
      const tsv = 'order-id\ttracking-number\r\n111-3512578-3541012\t9214490374008505223783\r\n'
      vi.mocked(listAmazonTrackingSubmissions).mockResolvedValue({
        items: [draft],
        total: 1,
        page: 1,
        limit: 10,
      })
      vi.mocked(getAmazonTrackingSubmission).mockResolvedValue({
        ...draft,
        tsv,
        rows: [
          {
            shipmentId: 's1',
            orderId: 'o1',
            externalOrderId: '111-3512578-3541012',
            externalItemId: 'item-73',
            quantity: '2',
            shipDate: '2026-11-26',
            carrierCode: 'USPS',
            carrierName: null,
            trackingNumber: '9214490374008505223783',
            shipMethod: 'Ground Advantage',
          },
        ],
      })
      const createObjectURL = vi.fn<(blob: Blob) => string>(() => 'blob:tracking-draft')
      const revokeObjectURL = vi.fn()
      class TestUrl extends URL {}
      Object.assign(TestUrl, { createObjectURL, revokeObjectURL })
      vi.stubGlobal('URL', TestUrl)
      let downloadedFilename: string | undefined
      vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (
        this: HTMLAnchorElement,
      ) {
        downloadedFilename = this.download
      })
      mount()
      expect(await screen.findByText(status)).toBeVisible()
      expect(screen.getByText(result)).toBeVisible()
      expect(screen.queryByText(/0 accepted|0 chấp nhận/)).not.toBeInTheDocument()
      expect(getAmazonTrackingSubmission).not.toHaveBeenCalled()
      fireEvent.click(screen.getByRole('button', { name: /expand row/i }))
      fireEvent.click(await screen.findByRole('button', { name: downloadLabel }))
      expect(
        screen.getByText(i18n.t('portal.shipments.trackingPreview.itemPrefix', { id: 'item-73' })),
      ).toBeVisible()
      expect(
        screen.getByText(i18n.t('portal.shipments.trackingPreview.itemCount', { count: 2 })),
      ).toBeVisible()
      expect(downloadedFilename).toBe('upload-nov26.txt')
      const blob = createObjectURL.mock.calls[0][0] as Blob
      const contents = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onload = () => resolve(String(reader.result))
        reader.onerror = reject
        reader.readAsText(blob)
      })
      expect(contents).toBe(tsv)
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:tracking-draft')
      expect(listAmazonTrackingSubmissions).toHaveBeenCalledTimes(1)
      expect(getAmazonTrackingSubmission).toHaveBeenCalledTimes(1)
    },
  )

  it('does not invent Amazon totals when a command failed before a result', async () => {
    vi.mocked(listAmazonTrackingSubmissions).mockResolvedValue({
      items: [
        {
          ...batch,
          status: 'FAILED',
          errorMessage: 'Worker disconnected',
          result: { importedCount: 0, failedCount: 0, diagnostics: [] },
        },
      ],
      total: 1,
      page: 1,
      limit: 10,
    })
    mount()
    expect(await screen.findByText('No Amazon result available')).toBeVisible()
    expect(screen.queryByText('0 accepted · 0 failed')).not.toBeInTheDocument()
  })

  it('shows actionable errors instead of an empty history', async () => {
    vi.mocked(listAmazonTrackingSubmissions).mockRejectedValue(new Error('offline'))
    mount()
    expect(await screen.findByText('Unable to load upload batches')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry' })).toBeVisible()
  })
  it('shows a detail error without treating failed loading as no orders', async () => {
    vi.mocked(getAmazonTrackingSubmission).mockRejectedValue(new Error('offline'))
    mount()
    await screen.findByText('AMZ-123')
    fireEvent.click(screen.getByRole('button', { name: /expand row/i }))
    expect(await screen.findByText('Unable to load orders in this batch')).toBeVisible()
  })
})
