import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  listFinanceFilterOptions,
  listFinanceSnapshots,
  listImportBatches,
} from '@/features/portal/finance/api/financeApi'
import { FinanceWorkspacePage } from '@/features/portal/finance/pages/FinanceWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => ({
    account: { id: 'account-1', email: 'finance@lng.co', mustChangePassword: false },
    roles: [],
    permissions: ['FINANCE:READ'],
    scopes: [],
    profileSetupRequired: false,
  }),
}))
vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()),
  listFinanceFilterOptions: vi.fn(),
  listFinanceSnapshots: vi.fn(),
  listImportBatches: vi.fn(),
}))

describe('FinanceWorkspacePage', () => {
  beforeEach(async () => {
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listFinanceSnapshots).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
      summaryByCurrency: [
        {
          currency: 'USD',
          revenueAmount: 10000,
          totalCostAmount: 6000,
          profitAmount: 4000,
          grossMarginBps: 4000,
          missingCostCount: 0,
        },
        {
          currency: 'VND',
          revenueAmount: 25000000,
          totalCostAmount: 20000000,
          profitAmount: 5000000,
          grossMarginBps: 2000,
          missingCostCount: 1,
        },
      ],
    })
    vi.mocked(listFinanceFilterOptions).mockResolvedValue({
      channels: ['AMAZON'],
      marketplaces: ['AMAZON_US'],
      sellers: [{ employeeCode: 'J2508', name: 'Nguyễn An' }],
      teams: [{ id: 'team-id', code: 'SALE_A', name: 'Sales A' }],
      departments: [{ id: 'department-id', code: 'SALE', name: 'Sales' }],
    })
    vi.mocked(listImportBatches).mockResolvedValue({
      items: [],
      pagination: { total: 0, page: 1, limit: 20 },
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('shows every currency summary without exposing option IDs', async () => {
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )

    expect(await screen.findByText('USD')).toBeVisible()
    expect(screen.getByText('VND')).toBeVisible()
    fireEvent.mouseDown(screen.getByLabelText('Team'))
    const teamOptions = await screen.findAllByText('Sales A')
    expect(teamOptions.some((element) => element.closest('.ant-select-item-option'))).toBe(true)
  })

  it('applies readable team and channel filters to the snapshot query', async () => {
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )
    await screen.findByText('USD')

    fireEvent.mouseDown(screen.getByLabelText('Sales channel'))
    const channelOptions = await screen.findAllByText('AMAZON')
    fireEvent.click(channelOptions.find((element) => element.closest('.ant-select-item-option'))!)
    fireEvent.mouseDown(screen.getByLabelText('Team'))
    const teamOptions = await screen.findAllByText('Sales A')
    fireEvent.click(teamOptions.find((element) => element.closest('.ant-select-item-option'))!)

    await waitFor(() =>
      expect(listFinanceSnapshots).toHaveBeenLastCalledWith(
        expect.objectContaining({
          salesChannelCode: 'AMAZON',
          teamId: 'team-id',
        }),
      ),
    )
  })
})
