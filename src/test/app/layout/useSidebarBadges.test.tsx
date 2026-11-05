import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { workspaceRouteLinks } from '@/app/router/workspaceRoutes'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { useOrderSummaryQuery } from '@/features/portal/orders/hooks/useOrderSummaryQuery'
import { useSidebarBadges } from '@/app/layout/useSidebarBadges'

vi.mock('@/features/portal/orders/hooks/useOrderSummaryQuery', () => ({
  useOrderSummaryQuery: vi.fn(),
}))

const mockAccount: CurrentAccount = {
  account: { id: 'u1', email: 'test@example.com', mustChangePassword: false },
  roles: [],
  permissions: [],
  profileSetupRequired: false,
  scopes: [],
}

function createWrapper(initialEntries = ['/portal/dashboard']) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return <MemoryRouter initialEntries={initialEntries}>{children}</MemoryRouter>
  }
}

describe('useSidebarBadges', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useOrderSummaryQuery).mockReturnValue({
      data: undefined,
    } as ReturnType<typeof useOrderSummaryQuery>)
  })

  it('disables query when sidebar is collapsed', () => {
    renderHook(
      () =>
        useSidebarBadges({
          account: mockAccount,
          permissions: new Set(['ORDERS:READ']),
          collapsed: true,
          activeMenu: 'sales',
        }),
      { wrapper: createWrapper() },
    )

    expect(useOrderSummaryQuery).toHaveBeenCalledWith(
      { page: 1, limit: 1 },
      expect.objectContaining({ enabled: false }),
    )
  })

  it('enables query and returns tabCounts.NEW when activeMenu is sales', () => {
    vi.mocked(useOrderSummaryQuery).mockReturnValue({
      data: {
        tabCounts: { NEW: 15 },
      },
    } as unknown as ReturnType<typeof useOrderSummaryQuery>)

    const { result } = renderHook(
      () =>
        useSidebarBadges({
          account: mockAccount,
          permissions: new Set(['ORDERS:READ']),
          collapsed: false,
          activeMenu: 'sales',
        }),
      { wrapper: createWrapper() },
    )

    expect(useOrderSummaryQuery).toHaveBeenCalledWith(
      { page: 1, limit: 1 },
      expect.objectContaining({ enabled: true, staleTime: 60_000 }),
    )
    expect(result.current).toEqual({
      [workspaceRouteLinks.orders]: 15,
    })
  })

  it('disables query when permissions are missing', () => {
    renderHook(
      () =>
        useSidebarBadges({
          account: mockAccount,
          permissions: new Set(['OTHER:PERMISSION']),
          collapsed: false,
          activeMenu: 'sales',
        }),
      { wrapper: createWrapper() },
    )

    expect(useOrderSummaryQuery).toHaveBeenCalledWith(
      { page: 1, limit: 1 },
      expect.objectContaining({ enabled: false }),
    )
  })

  it('disables query when account is undefined', () => {
    renderHook(
      () =>
        useSidebarBadges({
          account: undefined,
          permissions: new Set(['ORDERS:READ']),
          collapsed: false,
          activeMenu: 'sales',
        }),
      { wrapper: createWrapper() },
    )

    expect(useOrderSummaryQuery).toHaveBeenCalledWith(
      { page: 1, limit: 1 },
      expect.objectContaining({ enabled: false }),
    )
  })

  it('enables query when on /portal/orders pathname even if activeMenu is not sales', () => {
    renderHook(
      () =>
        useSidebarBadges({
          account: mockAccount,
          permissions: new Set(['ORDERS:WRITE']),
          collapsed: false,
          activeMenu: 'production',
        }),
      { wrapper: createWrapper(['/portal/orders/all']) },
    )

    expect(useOrderSummaryQuery).toHaveBeenCalledWith(
      { page: 1, limit: 1 },
      expect.objectContaining({ enabled: true }),
    )
  })
})
