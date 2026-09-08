import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()
  return { ...actual, getFinanceImportBatch: vi.fn() }
})

import { getFinanceImportBatch, type ImportBatch } from '@/features/portal/finance/api/financeApi'
import { useFinanceImportPolling } from '@/features/portal/integrations/hooks/useFinanceImportPolling'

const activeBatch: ImportBatch = {
  id: 'batch-1',
  sourceType: 'TRANSACTIONS',
  originalFilename: 'transactions.csv',
  shopId: 'shop-1',
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'US',
  dryRun: false,
  status: 'COMPLETED',
  processedRows: 2,
  validRows: 2,
  skippedRows: 0,
  unlinkedRows: 0,
  errorCount: 0,
  errors: [],
  recalculationStatus: 'PROCESSING',
  recalculationTotal: 2,
  recalculationCompleted: 1,
  recalculationFailed: 0,
  recalculationErrors: [],
  createdAt: '2026-09-07T00:00:00.000Z',
}

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}

function setVisibility(value: DocumentVisibilityState) {
  Object.defineProperty(document, 'visibilityState', { configurable: true, value })
  document.dispatchEvent(new Event('visibilitychange'))
}

describe('useFinanceImportPolling', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.mocked(getFinanceImportBatch).mockResolvedValue(activeBatch)
    setVisibility('visible')
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('polls while recalculation is processing even when import is completed', async () => {
    renderHook(() => useFinanceImportPolling('batch-1', activeBatch), { wrapper })

    await act(async () => vi.advanceTimersByTimeAsync(1))
    expect(getFinanceImportBatch).toHaveBeenCalledTimes(1)

    await act(async () => vi.advanceTimersByTimeAsync(5_000))
    expect(getFinanceImportBatch).toHaveBeenCalledTimes(2)
  })

  it('stops polling after recalculation reaches a terminal state', async () => {
    vi.mocked(getFinanceImportBatch).mockResolvedValue({
      ...activeBatch,
      recalculationStatus: 'COMPLETED',
      recalculationCompleted: 2,
    })
    renderHook(() => useFinanceImportPolling('batch-1', activeBatch), { wrapper })

    await act(async () => vi.advanceTimersByTimeAsync(1))
    await act(async () => vi.advanceTimersByTimeAsync(10_000))

    expect(getFinanceImportBatch).toHaveBeenCalledTimes(1)
  })

  it('pauses polling while the document is hidden', async () => {
    setVisibility('hidden')
    renderHook(() => useFinanceImportPolling('batch-1', activeBatch), { wrapper })

    await act(async () => vi.advanceTimersByTimeAsync(10_000))
    expect(getFinanceImportBatch).toHaveBeenCalledTimes(1)
  })
})
