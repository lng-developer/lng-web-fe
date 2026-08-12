import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({
  apiClient: { get: vi.fn() },
}))

import { getSystemLogs } from '@/features/monitoring/api/monitoringApi'
import { apiClient } from '@/shared/api'

describe('monitoringApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: { content: ['ok'] } })
  })

  it('loads system logs with bounded query params', async () => {
    await getSystemLogs({ process: 'lng-web-be', stream: 'error', lines: 100 })

    expect(apiClient.get).toHaveBeenCalledWith('/api/system/logs', {
      params: { process: 'lng-web-be', stream: 'error', lines: 100 },
    })
  })
})
