import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/features/portal/shops/api/shopApi', () => ({ listShops: vi.fn() }))

import { listAllActiveShops } from '@/features/portal/integrations/api/loadActiveShops'
import { listShops, type Shop } from '@/features/portal/shops/api/shopApi'

const shop: Shop = {
  id: 'shop-1',
  name: 'LNG Amazon US',
  currency: 'USD',
  status: 'ACTIVE',
  createdAt: '2026-07-01T00:00:00.000Z',
  updatedAt: '2026-07-01T00:00:00.000Z',
}

describe('listAllActiveShops', () => {
  beforeEach(() => vi.clearAllMocks())

  it('loads every active shop page', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      ...shop,
      id: `shop-${index + 1}`,
    }))
    vi.mocked(listShops)
      .mockResolvedValueOnce({
        items: firstPage,
        pagination: { total: 101, page: 1, limit: 100 },
      })
      .mockResolvedValueOnce({
        items: [{ ...shop, id: 'shop-101' }],
        pagination: { total: 101, page: 2, limit: 100 },
      })

    const result = await listAllActiveShops()

    expect(listShops).toHaveBeenNthCalledWith(2, { page: 2, limit: 100, status: 'ACTIVE' })
    expect(result.items).toHaveLength(101)
  })
})
