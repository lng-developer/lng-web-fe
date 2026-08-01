import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), patch: vi.fn(), post: vi.fn() } }))

import {
  listMappingRuleHistory,
  listUnmatchedItems,
  previewMappingRule,
  selectFulfillmentCandidate,
} from '@/features/portal/mapping/api/mappingApi'
import { apiClient } from '@/shared/api'

describe('mappingApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [], pagination: {} } })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
  })

  it('omits blank optional query values from unmatched requests', async () => {
    await listUnmatchedItems({ shopId: 'shop-1', configCode: '', limit: 25 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/mapping/order-items/unmatched', {
      params: { shopId: 'shop-1', limit: 25 },
    })
  })

  it('serializes bounded workbench filters', async () => {
    await listUnmatchedItems({
      q: 'J2501',
      blocker: 'LISTING_NOT_FOUND',
      stage: 'PRODUCT_MAPPING',
      age: 'OVER_24_HOURS',
      page: 1,
      limit: 20,
    })

    expect(apiClient.get).toHaveBeenCalledWith('/api/mapping/order-items/unmatched', {
      params: {
        q: 'J2501',
        blocker: 'LISTING_NOT_FOUND',
        stage: 'PRODUCT_MAPPING',
        age: 'OVER_24_HOURS',
        page: 1,
        limit: 20,
      },
    })
  })

  it('posts candidate selection to the canonical select endpoint', async () => {
    await selectFulfillmentCandidate('item-1', {
      vendorProductId: 'product-1',
      vendorCostCenterId: 'cost-1',
    })

    expect(apiClient.post).toHaveBeenCalledWith('/api/mapping/order-items/item-1/select', {
      vendorProductId: 'product-1',
      vendorCostCenterId: 'cost-1',
    })
  })

  it('uses the rule preview safety endpoint', async () => {
    const input = { ruleType: 'skuConfig' as const, rule: { configCode: 'TS1S' }, samples: [] }
    await previewMappingRule(input)
    expect(apiClient.post).toHaveBeenCalledWith('/api/mapping/rule-preview', input)
  })

  it('unwraps rule history items', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: { items: [{ id: 'event-1' }] } })

    await expect(listMappingRuleHistory('skuConfig', 'rule-1')).resolves.toEqual([
      { id: 'event-1' },
    ])
  })
})
