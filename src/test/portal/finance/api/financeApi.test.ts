import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getFinanceImportBatch,
  getOrderItemFinanceSnapshot,
  getSettlement,
  listFinanceSnapshots,
  listImportBatches,
  listImportedFinanceData,
  listSettlements,
  recalculateOrderItem,
} from '@/features/portal/finance/api/financeApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }))

describe('financeApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('normalizes the legacy root pagination returned by a running backend', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 12, page: 2, limit: 20, summaryByCurrency: [] },
    })

    await expect(listFinanceSnapshots({ page: 2, limit: 20 })).resolves.toMatchObject({
      pagination: { total: 12, page: 2, limit: 20 },
    })
  })

  it('normalizes legacy import batch pagination too', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 3, page: 1, limit: 20 },
    })

    await expect(listImportBatches()).resolves.toMatchObject({
      pagination: { total: 3, page: 1, limit: 20 },
    })
  })

  it('uses the finance investigation contracts', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })

    await getFinanceImportBatch('batch-1')
    await listImportedFinanceData('transactions', { salesChannelCode: 'AMAZON', limit: 10 })
    await getOrderItemFinanceSnapshot('item-1')
    await recalculateOrderItem('item-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/finance/import-batches/batch-1')
    expect(apiClient.get).toHaveBeenCalledWith('/api/finance/imported-data/transactions', {
      params: { salesChannelCode: 'AMAZON', limit: 10 },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/finance/order-items/item-1/snapshot')
    expect(apiClient.post).toHaveBeenCalledWith('/api/finance/order-items/item-1/recalculate')
  })

  it('uses the settlement cash-flow contracts', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { items: [], total: 0, page: 1, limit: 20, summaryByCurrency: [] },
    })

    await listSettlements({ dateFrom: '2026-09-01', dateTo: '2026-09-30' })
    await getSettlement('settlement-1', { page: 2, limit: 10 })

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/finance/settlements', {
      params: { dateFrom: '2026-09-01', dateTo: '2026-09-30' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/finance/settlements/settlement-1', {
      params: { page: 2, limit: 10 },
    })
  })
})
