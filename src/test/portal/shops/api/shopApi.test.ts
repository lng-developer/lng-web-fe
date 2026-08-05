import { beforeEach, describe, expect, it, vi } from 'vitest'

import { createShop, listShops, updateShopStatus } from '@/features/portal/shops/api/shopApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() },
}))

describe('shopApi', () => {
  beforeEach(() => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: { items: [], pagination: {} },
    })
    vi.mocked(apiClient.patch).mockResolvedValue({ success: true, data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ success: true, data: {} })
  })

  it('maps list filters to the Shop API while omitting empty values', async () => {
    await listShops({ page: 2, limit: 20, search: 'football', status: 'ACTIVE' })
    await listShops({ page: 1, limit: 20, search: '', status: undefined })

    expect(apiClient.get).toHaveBeenNthCalledWith(1, '/api/shops', {
      params: { page: 2, limit: 20, search: 'football', status: 'ACTIVE' },
    })
    expect(apiClient.get).toHaveBeenNthCalledWith(2, '/api/shops', {
      params: { page: 1, limit: 20 },
    })
  })

  it('uses the create and status mutation contracts', async () => {
    await createShop({ name: 'Football US', currency: 'USD' })
    await updateShopStatus('shop-1', 'SUSPENDED')

    expect(apiClient.post).toHaveBeenCalledWith('/api/shops', {
      name: 'Football US',
      currency: 'USD',
    })
    expect(apiClient.patch).toHaveBeenCalledWith('/api/shops/shop-1/status', {
      status: 'SUSPENDED',
    })
  })
})
