import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()
  return {
    ...actual,
    getImportJob: vi.fn(),
    listIssues: vi.fn(),
    listImportJobs: vi.fn(),
    listJobIssues: vi.fn(),
    listJobRawRecords: vi.fn(),
    uploadEtsySoldItems: vi.fn(),
    uploadManualExcel: vi.fn(),
  }
})

vi.mock('@/features/portal/shops/api/shopApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/shops/api/shopApi')>()
  return { ...actual, listShops: vi.fn() }
})

import {
  getImportJob,
  listImportJobs,
  listIssues,
  listJobIssues,
  listJobRawRecords,
  uploadEtsySoldItems,
  uploadManualExcel,
} from '@/features/portal/integrations/api/integrationApi'
import { ImportUploadModal } from '@/features/portal/integrations/pages/ImportUploadModal'
import { IntegrationWorkbenchPage } from '@/features/portal/integrations/pages/IntegrationWorkbenchPage'
import { listShops, type Shop } from '@/features/portal/shops/api/shopApi'
import { setPermissions } from '@/shared/auth/session'

const shop: Shop = {
  id: 'shop-1',
  name: 'LNG Amazon US',
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

const account = (
  permissions: string[] = ['ORDERS:READ'],
  scopes: CurrentAccount['scopes'] = [],
): CurrentAccount => ({
  account: { id: 'account-1', email: 'operator@example.com', mustChangePassword: false },
  roles: [],
  permissions,
  scopes,
  profileSetupRequired: false,
})

const job = {
  id: 'job-1',
  source: 'MANUAL_EXCEL' as const,
  sourceType: 'FILE' as const,
  shopId: shop.id,
  shopConnectionId: null,
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON_US',
  externalAccountId: null,
  sourceFileId: null,
  status: 'FAILED' as const,
  totalRecords: 12,
  parsedCount: 11,
  importedCount: 8,
  skippedCount: 1,
  failedCount: 3,
  startedAt: '2026-07-31T00:00:00.000Z',
  finishedAt: '2026-07-31T00:01:00.000Z',
  triggeredBy: 'account-1',
  errorCode: 'ROW_ERROR',
  errorMessage: 'Three rows failed',
  summary: null,
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:01:00.000Z',
}

function renderWorkbench(path: string, currentAccount = account()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const view = render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/portal/integrations"
            element={<IntegrationWorkbenchPage account={currentAccount} />}
          />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return { client, ...view }
}

describe('IntegrationWorkbenchPage', () => {
  afterEach(cleanup)

  beforeEach(() => {
    vi.clearAllMocks()
    setPermissions(['ORDERS:READ'])
    vi.mocked(listShops).mockResolvedValue({
      items: [shop],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    vi.mocked(listImportJobs).mockResolvedValue({
      items: [job],
      pagination: { total: 1, page: 2, limit: 20 },
    })
    vi.mocked(listIssues).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
    })
    vi.mocked(getImportJob).mockResolvedValue(job)
    vi.mocked(listJobIssues).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 10 },
    })
  })

  it('loads URL-backed filters and renders operational job counts', async () => {
    renderWorkbench(
      '/portal/integrations?shopId=shop-1&source=MANUAL_EXCEL&status=FAILED&page=2&dateFrom=2026-07-01T00%3A00%3A00.000Z&dateTo=2026-07-31T23%3A59%3A59.999Z',
    )

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        shopId: 'shop-1',
        source: 'MANUAL_EXCEL',
        status: 'FAILED',
        page: 2,
        limit: 20,
        dateFrom: '2026-07-01T00:00:00.000Z',
        dateTo: '2026-07-31T23:59:59.999Z',
      }),
    )
    expect((await screen.findAllByText('LNG Amazon US')).length).toBeGreaterThan(0)
    expect(screen.getByText('8 imported / 1 skipped / 3 failed')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Upload report' })).not.toBeInTheDocument()
  })

  it('sanitizes malformed page, source, and status URL filters before querying', async () => {
    renderWorkbench('/portal/integrations?page=-3&source=UNKNOWN_SOURCE&status=UNKNOWN_STATUS')

    await waitFor(() => expect(listImportJobs).toHaveBeenCalledWith({ page: 1, limit: 20 }))
    expect(await screen.findByText('8 imported / 1 skipped / 3 failed')).toBeVisible()
  })

  it('accepts valid date-only deep-link filters', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-07-01&dateTo=2026-07-31')

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        dateFrom: '2026-07-01',
        dateTo: '2026-07-31',
      }),
    )
  })

  it('drops only malformed date filters before querying', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-02-30&dateTo=2026-07-31')

    await waitFor(() =>
      expect(listImportJobs).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        dateTo: '2026-07-31',
      }),
    )
  })

  it('drops a reversed date range before querying', async () => {
    renderWorkbench('/portal/integrations?dateFrom=2026-08-01&dateTo=2026-07-31')

    await waitFor(() => expect(listImportJobs).toHaveBeenCalledWith({ page: 1, limit: 20 }))
  })

  it('selects a job without navigating away from the workbench', async () => {
    renderWorkbench('/portal/integrations')

    const matches = await screen.findAllByText('LNG Amazon US')
    fireEvent.click(matches[matches.length - 1])

    await waitFor(() => expect(window.location.pathname).not.toBe('/portal/integrations/job-1'))
    expect(
      (await screen.findAllByText('Import job job-1')).some((element) => element.textContent),
    ).toBe(true)
  })

  it('shows upload only for writable shops and invalidates every jobs list after success', async () => {
    const shopB = { ...shop, id: 'shop-2', name: 'Read-only shop' }
    vi.mocked(listShops).mockResolvedValue({
      items: [shop, shopB],
      pagination: { total: 2, page: 1, limit: 100 },
    })
    vi.mocked(uploadManualExcel).mockResolvedValue(job)
    const scopedAccount = account(
      [],
      [
        {
          assignmentId: 'assignment-write',
          scopeType: 'shop',
          scopeId: 'shop-1',
          resourceId: 'shop-1',
          roles: [],
          permissions: ['ORDERS:WRITE'],
        },
        {
          assignmentId: 'assignment-read',
          scopeType: 'shop',
          scopeId: 'shop-2',
          resourceId: 'shop-2',
          roles: [],
          permissions: ['ORDERS:READ'],
        },
      ],
    )
    const { client } = renderWorkbench('/portal/integrations', scopedAccount)
    const invalidate = vi.spyOn(client, 'invalidateQueries')

    fireEvent.click(await screen.findByRole('button', { name: 'Upload report' }))
    const uploadShopSelect = document.querySelector('#shopId')!
    fireEvent.mouseDown(uploadShopSelect)
    const writableOptions = await screen.findAllByText('LNG Amazon US')
    expect(writableOptions.some((element) => element.closest('.ant-select-item-option'))).toBe(true)
    expect(
      screen
        .queryAllByText('Read-only shop')
        .some((element) => element.closest('.ant-select-item-option')),
    ).toBe(false)
    fireEvent.change(screen.getByLabelText('Marketplace code'), { target: { value: 'AMAZON_US' } })
    const file = new File(['order-id,order-item-id\n1,2'], 'orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(uploadManualExcel).toHaveBeenCalled())
    await waitFor(() =>
      expect(invalidate).toHaveBeenCalledWith({ queryKey: ['portal', 'integrations', 'jobs'] }),
    )
  })
})

describe('ImportUploadModal', () => {
  afterEach(cleanup)

  it('submits the original file and source-specific format', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.mouseDown(screen.getByLabelText('Import format'))
    fireEvent.click(await screen.findByText('Etsy sold order items'))
    fireEvent.change(screen.getByLabelText('Marketplace code'), { target: { value: 'ETSY_US' } })
    const file = new File(['Order ID,Transaction ID'], 'etsy-orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        source: 'ETSY_SOLD_ORDER_ITEMS',
        file,
        shopId: 'shop-1',
        marketplaceCode: 'ETSY_US',
        shopConnectionId: undefined,
        externalAccountId: undefined,
      }),
    )
  })

  it('rejects files larger than the server 10 MB limit', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)
    const file = new File([new Uint8Array(10 * 1024 * 1024 + 1)], 'orders.csv', {
      type: 'text/csv',
    })

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('File must be 10 MB or smaller')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('rejects Excel workbooks that the delimited backend parser cannot read', async () => {
    const onSubmit = vi.fn()
    render(<ImportUploadModal open shops={[shop]} onClose={vi.fn()} onSubmit={onSubmit} />)
    const file = new File(['not-a-workbook'], 'orders.xlsx', {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    expect(await screen.findByText('Select a supported report file')).toBeInTheDocument()
    expect(screen.getByText('CSV, TSV, or TXT up to 10 MB')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('keeps the modal values when an upload fails', async () => {
    vi.mocked(uploadManualExcel).mockRejectedValue(new Error('Invalid report'))
    vi.mocked(uploadEtsySoldItems).mockRejectedValue(new Error('Invalid report'))
    renderWorkbench('/portal/integrations', account(['ORDERS:WRITE']))

    fireEvent.click(await screen.findByRole('button', { name: 'Upload report' }))
    fireEvent.change(screen.getByLabelText('Marketplace code'), { target: { value: 'AMAZON_US' } })
    const file = new File(['order-id,order-item-id\n1,2'], 'orders.csv', { type: 'text/csv' })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Upload' }))

    await waitFor(() => expect(uploadManualExcel).toHaveBeenCalled())
    expect(await screen.findByText('Invalid report')).toBeInTheDocument()
    expect(screen.getByLabelText('Marketplace code')).toHaveValue('AMAZON_US')
    expect(screen.getByText('orders.csv')).toBeInTheDocument()
  })
})
