import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn() },
}))

import { getMongoIndexUsageSnapshots } from '@/features/monitoring/api/monitoringApi'
import { apiClient } from '@/shared/api'

describe('monitoringApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: [] })
  })

  it('loads the bounded Mongo index usage snapshot history', async () => {
    await getMongoIndexUsageSnapshots(7)

    expect(apiClient.get).toHaveBeenCalledWith('/api/audit/mongo-index-usage-snapshots', {
      params: { limit: 7 },
    })
  })
})
