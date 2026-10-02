import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { App } from 'antd'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { CurrentAccount } from '@/features/auth/api/authApi'

vi.mock('@/features/portal/integrations/api/integrationApi', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/portal/integrations/api/integrationApi')>()
  return {
    ...actual,
    getImportJobProgress: vi.fn(),
    listJobRawRecords: vi.fn(),
    retryImportJob: vi.fn(),
    retryPostImportRawRecords: vi.fn(),
  }
})

import {
  getImportJobProgress,
  listJobRawRecords,
  retryImportJob,
  retryPostImportRawRecords,
} from '@/features/portal/integrations/api/integrationApi'
import { integrationKeys } from '@/features/portal/integrations/api/integrationKeys'
import { ImportJobPanel } from '@/features/portal/integrations/pages/ImportJobPanel'
import { setPermissions } from '@/shared/auth/session'
import i18n from '@/shared/i18n/i18n'

const job = {
  id: 'job-1',
  source: 'MANUAL_EXCEL' as const,
  sourceType: 'FILE' as const,
  shopId: 'shop-1',
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
  summary: { postImport: { completed: 7, failed: 1, pending: 0 } },
  createdAt: '2026-07-31T00:00:00.000Z',
  updatedAt: '2026-07-31T00:01:00.000Z',
}

const progress = {
  job,
  phases: {
    parse: {
      total: 12,
      pending: 0,
      completed: 12,
      failed: 1,
      skipped: 0,
      percentage: 100,
    },
    import: {
      total: 12,
      pending: 0,
      completed: 12,
      imported: 8,
      failed: 3,
      skipped: 1,
      percentage: 100,
    },
    postImport: {
      total: 12,
      pending: 2,
      queued: 1,
      processing: 1,
      completed: 7,
      failed: 1,
      skipped: 0,
      percentage: 67,
    },
  },
  issues: { total: 1, open: 1, resolved: 0, ignored: 0 },
  percentage: 89,
  isTerminal: false,
  updatedAt: '2026-07-31T00:01:00.000Z',
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

function renderPanel(
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } }),
  currentAccount = account(),
) {
  const renderView = (jobId: string) => (
    <QueryClientProvider client={client}>
      <App>
        <ImportJobPanel
          account={currentAccount}
          jobId={jobId}
          status="FAILED"
          open
          onClose={vi.fn()}
        />
      </App>
    </QueryClientProvider>
  )
  const view = render(renderView('job-1'))
  return { client, renderView, ...view }
}

describe('ImportJobPanel', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    await i18n.changeLanguage('en')
    vi.mocked(getImportJobProgress).mockResolvedValue(progress)
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [
        {
          id: 'raw-1',
          importJobId: 'job-1',
          source: 'MANUAL_EXCEL',
          rowNumber: 4,
          externalOrderId: 'ORDER-1',
          externalItemId: 'ITEM-1',
          asin: 'B001',
          sku: 'SKU-1',
          normalizeStatus: 'NORMALIZED',
          importStatus: 'FAILED',
          postImportStatus: 'PENDING',
          postImportAttempts: 0,
          postImportQueuedAt: null,
          postImportStartedAt: null,
          postImportFinishedAt: null,
          postImportErrorCode: null,
          postImportErrorMessage: null,
          orderId: null,
          orderItemId: null,
          errorCode: 'INVALID_ADDRESS',
          errorMessage: 'Postal code is missing',
          createdAt: '2026-07-31T00:00:00.000Z',
          updatedAt: '2026-07-31T00:00:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    })
    vi.mocked(retryImportJob).mockResolvedValue({
      jobId: 'job-1',
      status: 'COMPLETED',
      replayedRawRecords: 1,
      requeuedPostImportJobs: 0,
      skippedCompletedRecords: 0,
    })
    vi.mocked(retryPostImportRawRecords).mockResolvedValue({
      requestedCount: 1,
      eligibleCount: 1,
      queuedCount: 1,
      items: [{ rawRecordId: 'raw-1', queued: true }],
    })
  })

  afterEach(() => {
    cleanup()
    vi.useRealTimers()
  })

  it('shows job summary before raw-record diagnostics', async () => {
    renderPanel()

    expect(await screen.findByText('8 imported')).toBeVisible()
    expect(await screen.findByText('Parse progress')).toBeVisible()
    expect(await screen.findByText('Import progress')).toBeVisible()
    expect(await screen.findByText('Post-import progress')).toBeVisible()
    expect(await screen.findByText('Open issues')).toBeVisible()
    expect(
      (
        await screen.findAllByText(
          (_, element) =>
            element?.tagName === 'TD' && element.textContent?.includes('ORDER-1 / ITEM-1') === true,
        )
      ).length,
    ).toBeGreaterThan(0)
    const summary = screen.getByText('Summary')
    const rawRecords = screen.getByText('Raw records')
    expect(
      summary.compareDocumentPosition(rawRecords) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.queryByText('Issues')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Retry import' })).not.toBeInTheDocument()
  })

  it('opens raw records in a wide drawer from the compact panel', async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    render(
      <QueryClientProvider client={client}>
        <App>
          <ImportJobPanel
            account={account()}
            jobId="job-1"
            status="FAILED"
            open
            onClose={vi.fn()}
            presentation="panel"
          />
        </App>
      </QueryClientProvider>,
    )

    expect(await screen.findByText('Summary')).toBeVisible()
    expect(screen.queryByText('Raw records')).not.toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'View raw records' }))
    expect(await screen.findByText('Raw records')).toBeVisible()
  })

  it('confirms retry and invalidates only the affected integration queries', async () => {
    setPermissions(['ORDERS:WRITE'])
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const invalidate = vi.spyOn(client, 'invalidateQueries')
    renderPanel(client, account(['ORDERS:WRITE']))

    fireEvent.click(await screen.findByRole('button', { name: 'Retry import' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Confirm retry' }))

    await waitFor(() => expect(retryImportJob).toHaveBeenCalledWith('job-1'))
    expect(invalidate).toHaveBeenCalledWith({ queryKey: integrationKeys.jobProgress('job-1') })
    expect(invalidate).toHaveBeenCalledWith({ queryKey: [...integrationKeys.all, 'jobs'] })
    expect(invalidate).toHaveBeenCalledTimes(2)
  })

  it('hides retry for a job outside the caller exact write scope', async () => {
    const scopedAccount = account(
      [],
      [
        {
          assignmentId: 'assignment-1',
          scopeType: 'shop',
          scopeId: 'shop-2',
          resourceId: 'shop-2',
          roles: [],
          permissions: ['ORDERS:WRITE'],
        },
      ],
    )

    renderPanel(undefined, scopedAccount)

    expect(await screen.findByText('8 imported')).toBeVisible()
    expect(screen.queryByRole('button', { name: 'Retry import' })).not.toBeInTheDocument()
  })

  it('retries mapping for a selected raw record when writable', async () => {
    renderPanel(undefined, account(['ORDERS:WRITE']))

    fireEvent.click((await screen.findByText('Retry mapping')).closest('button')!)

    await waitFor(() => expect(retryPostImportRawRecords).toHaveBeenCalledWith('job-1', ['raw-1']))
  }, 10_000)

  it('refreshes raw records while post-import mapping is processing', async () => {
    vi.useFakeTimers()
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [
        {
          id: 'raw-1',
          importJobId: 'job-1',
          source: 'MANUAL_EXCEL',
          rowNumber: 4,
          externalOrderId: 'ORDER-1',
          externalItemId: 'ITEM-1',
          asin: 'B001',
          sku: 'SKU-1',
          normalizeStatus: 'NORMALIZED',
          importStatus: 'IMPORTED',
          postImportStatus: 'PROCESSING',
          postImportAttempts: 1,
          postImportQueuedAt: null,
          postImportStartedAt: null,
          postImportFinishedAt: null,
          postImportErrorCode: null,
          postImportErrorMessage: null,
          orderId: 'order-1',
          orderItemId: 'item-1',
          errorCode: null,
          errorMessage: null,
          createdAt: '2026-07-31T00:00:00.000Z',
          updatedAt: '2026-07-31T00:00:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 10 },
    })

    renderPanel()
    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(listJobRawRecords).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(5_000))
    expect(listJobRawRecords).toHaveBeenCalledTimes(2)
  })

  it('resets diagnostics to page one when selecting another job', async () => {
    vi.mocked(listJobRawRecords).mockResolvedValue({
      items: [],
      pagination: { total: 25, page: 1, limit: 10 },
    })
    const { rerender, renderView } = renderPanel()
    const pageButtons = await screen.findAllByTitle('2')
    fireEvent.click(pageButtons[0])
    await waitFor(() =>
      expect(listJobRawRecords).toHaveBeenCalledWith('job-1', { page: 2, limit: 10 }),
    )

    rerender(renderView('job-2'))

    await waitFor(() =>
      expect(listJobRawRecords).toHaveBeenCalledWith('job-2', { page: 1, limit: 10 }),
    )
  })

  it('shows inline raw-record diagnostic errors with retry action', async () => {
    vi.mocked(listJobRawRecords).mockRejectedValue(new Error('Raw request failed'))
    renderPanel()

    expect(await screen.findByText('Raw records are unavailable')).toBeVisible()
    expect(screen.getByRole('button', { name: 'Retry raw records' })).toBeVisible()
  })
})
