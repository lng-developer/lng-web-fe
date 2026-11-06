import { cleanup, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { SystemDashboard } from '@/features/system/api/systemDashboardApi'
import { SystemDashboardPage } from '@/features/system/pages/SystemDashboardPage'
import { renderWithTestProviders } from '@/test/helpers/testProviders'

const mockUseSystemDashboardQuery = vi.fn()

vi.mock('@/features/system/hooks', () => ({
  useSystemDashboardQuery: () => mockUseSystemDashboardQuery(),
}))

describe('SystemDashboardPage', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  beforeEach(() => {
    mockUseSystemDashboardQuery.mockReset()
  })

  it('renders system dashboard metrics with complete data', () => {
    const mockData: SystemDashboard = {
      accounts: { total: 100, active: 85 },
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
            action: 'AUDIT_ACTION_USER_CREATED',
            actorLabel: 'Admin',
            createdAt: '2026-11-04T10:00:00Z',
          },
          {
            id: 'audit-2',
            action: 'AUDIT_ACTION_ROLE_UPDATED',
            actorLabel: 'SuperAdmin',
            createdAt: '2026-11-04T10:05:00Z',
          },
        ],
      },
    }

    mockUseSystemDashboardQuery.mockReturnValue({
      data: mockData,
      isLoading: false,
      isError: false,
    })

    renderWithTestProviders(<SystemDashboardPage />)

    // Check account metrics
    expect(screen.getAllByText('100').length).toBeGreaterThan(0)
    expect(screen.getAllByText('85').length).toBeGreaterThan(0)

    // Check health status
    expect(screen.getAllByText('ok').length).toBeGreaterThan(0)

    // Check infrastructure side rows
    expect(screen.getByText('MongoDB: CONNECTED')).toBeVisible()
    expect(screen.getByText('Redis: CONNECTED')).toBeVisible()

    // Check audit items & count
    expect(screen.getAllByText('2').length).toBeGreaterThan(0)
    expect(screen.getByText('AUDIT_ACTION_USER_CREATED')).toBeVisible()
    expect(screen.getByText('AUDIT_ACTION_ROLE_UPDATED')).toBeVisible()
  })

  it('renders default fallback values when dashboard data is empty or undefined', () => {
    mockUseSystemDashboardQuery.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: false,
    })

    renderWithTestProviders(<SystemDashboardPage />)

    // Fallbacks for accounts, health, and audit
    expect(screen.getAllByText('0').length).toBeGreaterThan(0)
    expect(screen.getAllByText('—').length).toBeGreaterThan(0)
    expect(screen.getByText('MongoDB: —')).toBeVisible()
    expect(screen.getByText('Redis: —')).toBeVisible()
  })
})
