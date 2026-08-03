import { beforeEach, describe, expect, it, vi } from 'vitest'

import { listFinanceSnapshots, listImportBatches } from '@/features/portal/finance/api/financeApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

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
})
