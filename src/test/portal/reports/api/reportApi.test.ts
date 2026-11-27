import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  getReportFilterOptions,
  listAdsDaily,
  listFinanceDaily,
  listFinanceBySeller,
} from '@/features/portal/reports/api/reportApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn() } }))

describe('reportApi', () => {
  it('uses explicit profit stages without deducting refunds again', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: [
        {
          grossProfitAmount: 9999,
          netProfitAmount: 9999,
          refundAmount: 300,
          profitBeforeAdsAmount: 4999,
          profitAfterAdsAmount: 3999,
          profitAfterOperatingCostsAmount: 3799,
        },
      ],
    })
    expect((await listFinanceBySeller({}))[0]).toMatchObject({
      grossProfitAmount: 4999,
      netProfitAmount: 3799,
      profitAfterAdsAmount: 3999,
    })
  })
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

  it('sends Ads status and attribution filters', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ success: true, data: [] })

    await listAdsDaily({ adStatus: 'PAUSED', sellerAttributionSource: 'UNASSIGNED' })

    expect(apiClient.get).toHaveBeenCalledWith('/api/reports/ads/daily', {
      params: { adStatus: 'PAUSED', sellerAttributionSource: 'UNASSIGNED' },
    })
  })
})
