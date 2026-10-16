import { MemoryRouter } from 'react-router-dom'
import { cleanup, render, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { LegacySidebar } from '@/app/layout/LegacySidebar'
import { AppProviders } from '@/app/providers/AppProviders'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { getOrderSummary } from '@/features/portal/orders/api/orderApi'
import { getDesignSummary } from '@/features/portal/design/api/designApi'
import { summarizeProductionQueueCounts } from '@/features/portal/production/api/productionApi'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/orders/api/orderApi', async (original) => ({
  ...(await original<object>()),
  getOrderSummary: vi.fn(async () => ({ tabCounts: {} })),
}))
vi.mock('@/features/portal/design/api/designApi', async (original) => ({
  ...(await original<object>()),
  getDesignSummary: vi.fn(async () => ({ unassigned: 0 })),
}))
vi.mock('@/features/portal/production/api/productionApi', async (original) => ({
  ...(await original<object>()),
  summarizeProductionQueueCounts: vi.fn(async () => ({ blocked: 0 })),
}))

describe('sidebar summary authorization', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
    localStorage.clear()
  })

  it('does not request badges before the account is available', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <LegacySidebar collapsed={false} onCollapsedChange={() => undefined} />
        </AppProviders>
      </MemoryRouter>,
    )
    expect(getOrderSummary).not.toHaveBeenCalled()
    expect(getDesignSummary).not.toHaveBeenCalled()
    expect(summarizeProductionQueueCounts).not.toHaveBeenCalled()
  })

  it.each([
    ['designer', ['DESIGN:WORK'], false, false, true],
    ['seller', ['ORDERS:READ'], true, false, false],
    ['no access', [], false, false, false],
  ] as const)(
    'only requests permitted badges for %s',
    async (_name, permissions, orders, design, production) => {
      const account: CurrentAccount = {
        account: { id: 'user', email: 'user@example.test', mustChangePassword: false },
        roles: [],
        permissions: [],
        profileSetupRequired: false,
        scopes: [
          {
            assignmentId: 'assignment',
            resourceId: null,
            scopeType: 'team',
            scopeId: 'team',
            roles: [],
            permissions: [...permissions],
          },
        ],
      }
      render(
        <MemoryRouter initialEntries={['/portal/production/scale']}>
          <AppProviders>
            <LegacySidebar
              collapsed={false}
              onCollapsedChange={() => undefined}
              account={account}
            />
          </AppProviders>
        </MemoryRouter>,
      )
      await waitFor(() => {
        expect(getOrderSummary).toHaveBeenCalledTimes(orders ? 1 : 0)
        expect(getDesignSummary).toHaveBeenCalledTimes(design ? 1 : 0)
        expect(summarizeProductionQueueCounts).toHaveBeenCalledTimes(production ? 1 : 0)
      })
    },
  )
})
