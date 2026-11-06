import { beforeEach, describe, expect, it, vi } from 'vitest'

import { getSystemDashboard, type SystemDashboard } from '@/features/system/api/systemDashboardApi'
import { apiClient } from '@/shared/api'

vi.mock('@/shared/api', () => ({
  apiClient: {
    get: vi.fn(),
  },
}))

describe('systemDashboardApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('fetches system dashboard from /api/system/dashboard and extracts data correctly', async () => {
    const mockDashboardData: SystemDashboard = {
      accounts: { total: 42, active: 38 },
      health: {
        status: 'ok',
        infrastructure: {
          mongo: 'CONNECTED',
          redis: 'CONNECTED',
        },
      },
      recentAudit: {
        items: [
          {
            id: 'audit-1',
            action: 'LOGIN',
            actorLabel: 'Admin User',
            createdAt: '2026-11-04T12:00:00.000Z',
          },
          {
            id: 'audit-2',
            action: 'UPDATE_ROLE',
            actorLabel: 'Super Admin',
            createdAt: '2026-11-04T12:05:00.000Z',
          },
        ],
      },
    }

    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: mockDashboardData,
    })

    const result = await getSystemDashboard()

    expect(apiClient.get).toHaveBeenCalledWith('/api/system/dashboard')
    expect(result).toEqual(mockDashboardData)
  })

  it('handles empty response data structure gracefully', async () => {
    vi.mocked(apiClient.get).mockResolvedValue({
      success: true,
      data: undefined,
    })

    const result = await getSystemDashboard()

    expect(apiClient.get).toHaveBeenCalledWith('/api/system/dashboard')
    expect(result).toBeUndefined()
  })
})
