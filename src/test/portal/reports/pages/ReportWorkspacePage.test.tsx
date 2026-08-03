import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getBuyerInsights,
  getOperationsOverview,
  getReportFilterOptions,
  listChannelPerformance,
  listFinanceBySeller,
  listFinanceByTeam,
  listFinanceDaily,
  listFinanceDailyProfit,
  listVendorPerformance,
} from '@/features/portal/reports/api/reportApi'
import { ReportWorkspacePage } from '@/features/portal/reports/pages/ReportWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

const { accountState } = vi.hoisted(() => ({
  accountState: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => accountState.current,
}))
vi.mock('@/features/portal/reports/api/reportApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/reports/api/reportApi')>()),
  getBuyerInsights: vi.fn(),
  getOperationsOverview: vi.fn(),
  getReportFilterOptions: vi.fn(),
  listChannelPerformance: vi.fn(),
  listFinanceBySeller: vi.fn(),
  listFinanceByTeam: vi.fn(),
  listFinanceDaily: vi.fn(),
  listFinanceDailyProfit: vi.fn(),
  listVendorPerformance: vi.fn(),
}))

describe('ReportWorkspacePage', () => {
  beforeEach(async () => {
    vi.clearAllMocks()
    accountState.current = {
      account: { id: 'account-1', email: 'report@lng.co', mustChangePassword: false },
      roles: [],
      permissions: ['REPORTS:READ'],
      scopes: [],
      profileSetupRequired: false,
    }
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(getReportFilterOptions).mockResolvedValue({
      channels: [],
      marketplaces: [],
      sellers: [],
      teams: [],
      departments: [],
      shops: [],
    })
    vi.mocked(listFinanceDaily).mockResolvedValue([])
    vi.mocked(listFinanceDailyProfit).mockResolvedValue([
      {
        date: '2026-08-01',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        currency: 'USD',
        itemCount: 2,
        revenueAmount: 10000,
        baseCostAmount: 4000,
        grossProfitAmount: 5000,
        grossMarginBps: 5000,
        missingCostCount: 0,
        adSpendAmount: 1000,
        netProfitAmount: 4000,
      },
      {
        date: '2026-08-01',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'CA',
        currency: 'CAD',
        itemCount: 1,
        revenueAmount: 8000,
        baseCostAmount: 3000,
        grossProfitAmount: 3500,
        grossMarginBps: 4375,
        missingCostCount: 0,
        adSpendAmount: 0,
        netProfitAmount: 3500,
      },
    ])
    vi.mocked(getBuyerInsights).mockResolvedValue({
      knownBuyerCount: 8,
      newBuyerCount: 3,
      returningBuyerCount: 5,
      repeatBuyerCount: 2,
      unidentifiedOrderCount: 1,
      totalOrderCount: 10,
    })
    vi.mocked(getOperationsOverview).mockResolvedValue({
      orderItemsByStatus: {},
      productionByStatus: {},
      productionBlockers: {},
      vendorSubmissionsByStatus: {},
      shipmentsByStatus: {},
    })
    vi.mocked(listFinanceBySeller).mockResolvedValue([])
    vi.mocked(listFinanceByTeam).mockResolvedValue([])
    vi.mocked(listChannelPerformance).mockResolvedValue([])
    vi.mocked(listVendorPerformance).mockResolvedValue({ items: [] })
  })

  afterEach(cleanup)

  it('keeps currencies separate and fetches sales data only after opening its tab', async () => {
    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    expect(await screen.findByText('USD')).toBeInTheDocument()
    expect(screen.getByText('CAD')).toBeInTheDocument()
    expect(listFinanceBySeller).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('tab', { name: 'Sales & finance' }))

    await waitFor(() => expect(listFinanceBySeller).toHaveBeenCalledTimes(1))
  })

  it('does not request unsupported operational aggregates for a team-only reader', async () => {
    accountState.current = {
      ...accountState.current,
      permissions: [],
      scopes: [
        {
          assignmentId: 'a1',
          scopeType: 'team',
          scopeId: 'team-1',
          resourceId: 'team-1',
          roles: [],
          permissions: ['REPORTS:READ'],
        },
      ],
    }

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    await screen.findByText('Report workspace')
    expect(listFinanceDaily).toHaveBeenCalledTimes(1)
    expect(listFinanceDailyProfit).not.toHaveBeenCalled()
    expect(getOperationsOverview).not.toHaveBeenCalled()
  })
})
