import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getReportFilterOptions, listFinanceDaily } from '@/features/portal/reports/api/reportApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

describe('reportApi', () => {
  beforeEach(() => vi.clearAllMocks())

  it('omits empty filters from report requests', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] })

    await listFinanceDaily({ salesChannelCode: '', teamId: undefined, dateFrom: '2026-08-01' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/reports/finance/daily', {
      params: { dateFrom: '2026-08-01' },
    })
  })

  it('loads permission-aware filter options from Report', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: { channels: ['AMAZON'] } })

    await expect(getReportFilterOptions()).resolves.toMatchObject({ channels: ['AMAZON'] })
    expect(apiClient.get).toHaveBeenCalledWith('/api/reports/filter-options')
  })
})
