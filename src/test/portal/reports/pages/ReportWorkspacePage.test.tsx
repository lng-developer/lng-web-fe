import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import dayjs from 'dayjs'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getBuyerInsights,
  getOperationsOverview,
  getReportFilterOptions,
  listAdsDaily,
  listChannelPerformance,
  listFinanceBySeller,
  listFinanceByTeam,
  listFinanceDaily,
  listFinanceDailyProfit,
  listFinanceSellerDaily,
  listVendorPerformance,
} from '@/features/portal/reports/api/reportApi'
import { buildRevenueTrend } from '@/features/portal/reports/pages/reportTrend'
import { ReportWorkspacePage } from '@/features/portal/reports/pages/ReportWorkspacePage'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

const { accountState } = vi.hoisted(() => ({
  accountState: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: (routeId: string) =>
    routeId === 'workspace' ? accountState.current : undefined,
}))
vi.mock('@/features/portal/reports/api/reportApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/reports/api/reportApi')>()),
  getBuyerInsights: vi.fn(),
  getOperationsOverview: vi.fn(),
  getReportFilterOptions: vi.fn(),
  listAdsDaily: vi.fn(),
  listChannelPerformance: vi.fn(),
  listFinanceBySeller: vi.fn(),
  listFinanceSellerDaily: vi.fn(),
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
        salesChannelCode: 'ETSY',
        marketplaceCode: 'US',
        currency: 'USD',
        itemCount: 1,
        revenueAmount: 5000,
        baseCostAmount: 2000,
        grossProfitAmount: 2500,
        grossMarginBps: 5000,
        missingCostCount: 0,
        adSpendAmount: 500,
        netProfitAmount: 2000,
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
    vi.mocked(listFinanceSellerDaily).mockResolvedValue([])
    vi.mocked(listFinanceByTeam).mockResolvedValue([])
    vi.mocked(listAdsDaily).mockResolvedValue([])
    vi.mocked(listChannelPerformance).mockResolvedValue([])
    vi.mocked(listVendorPerformance).mockResolvedValue({ items: [] })
  })

  afterEach(cleanup)

  it('loads seller profitability immediately with the default seven-day period', async () => {
    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    await waitFor(() => expect(listFinanceBySeller).toHaveBeenCalledTimes(1))
    const initialFilters = vi.mocked(listFinanceBySeller).mock.calls[0][0]
    expect(dayjs(initialFilters.dateTo).diff(dayjs(initialFilters.dateFrom), 'day')).toBe(6)
  })

  it('loads daily ads performance after opening the sales tab', async () => {
    vi.mocked(listAdsDaily).mockResolvedValueOnce([
      {
        reportDate: '2026-08-01',
        salesChannelCode: 'AMAZON',
        marketplaceCode: 'US',
        currency: 'USD',
        spendAmount: 1200,
        attributedSalesAmount: 4800,
        impressions: 1000,
        clicks: 50,
        attributedOrdersCount: 4,
        ctrBps: 500,
        conversionBps: 800,
        cpaAmount: 300,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    fireEvent.click(screen.getByRole('tab', { name: 'Ads & attribution' }))

    expect(await screen.findByRole('heading', { name: 'Daily ad performance' })).toBeInTheDocument()
    expect(listAdsDaily).toHaveBeenCalledTimes(1)
    expect(await screen.findByText('2026-08-01')).toBeInTheDocument()
  })

  it('loads the seller-day P&L matrix only after selecting daily detail', async () => {
    vi.mocked(listFinanceSellerDaily).mockResolvedValueOnce([
      {
        date: '2026-09-05',
        sellerEmployeeCode: 'seller-1',
        sellerName: 'Alex',
        currency: 'USD',
        itemCount: 1,
        revenueAmount: 10000,
        baseCostAmount: 4000,
        totalCostAmount: 4500,
        additionalFulfillmentCostAmount: 500,
        marketplaceFeeAmount: 1500,
        refundAmount: 0,
        discountAmount: 0,
        taxAmount: 0,
        grossProfitAmount: 4500,
        operatingCostAmount: 3000,
        adSpendAmount: 800,
        netProfitAmount: 700,
        netMarginBps: 700,
        missingCostCount: 0,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    expect(
      screen.queryByRole('heading', { name: 'How profit is calculated' }),
    ).not.toBeInTheDocument()
    fireEvent.click(await screen.findByRole('button', { name: 'Daily detail' }))
    expect(await screen.findByRole('heading', { name: 'Daily seller P&L' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'How profit is calculated' })).toBeInTheDocument()
    expect(
      screen.getAllByRole('table').some((table) => table.closest('[class*="dailyTable"]')),
    ).toBe(true)
    expect(screen.getByText('Product cost')).toBeInTheDocument()
    expect(screen.getByText('Gross profit')).toBeInTheDocument()
    expect(await screen.findByText('Additional fulfillment')).toBeInTheDocument()
    expect(
      screen.getByText(
        'Gross profit = Revenue − Product cost − Additional fulfillment − Marketplace fee − Refund − Discount',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Net profit = Gross profit − Operating cost − Ads spend'),
    ).toBeInTheDocument()
    expect(screen.getAllByText('Alex')).toHaveLength(1)
    expect(listFinanceSellerDaily).toHaveBeenCalledTimes(1)
  })

  it('places export alongside the report tabs instead of inside filters', async () => {
    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    expect(await screen.findByTestId('reports-tab-actions')).toHaveTextContent('Export CSV')
  })

  it('opens on seller profitability with a profit comparison chart', async () => {
    vi.mocked(listFinanceBySeller).mockResolvedValueOnce([
      {
        sellerEmployeeCode: 'seller-1',
        sellerName: 'Alex',
        currency: 'USD',
        itemCount: 3,
        revenueAmount: 10000,
        baseCostAmount: 4000,
        grossProfitAmount: 5000,
        operatingCostAmount: 1000,
        netProfitAmount: 4000,
        netMarginBps: 4000,
        missingCostCount: 0,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )

    expect(await screen.findByRole('tab', { name: 'Seller profitability' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(await screen.findByRole('heading', { name: 'Profit comparison' })).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { name: 'How profit is calculated' }),
    ).not.toBeInTheDocument()
    expect((await screen.findAllByText('Alex')).length).toBeGreaterThan(1)
  })

  it('groups long date ranges into weekly revenue points', () => {
    const rows = Array.from({ length: 61 }, (_, index) => ({
      date: dayjs('2026-01-01').add(index, 'day').format('YYYY-MM-DD'),
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'US',
      currency: 'USD',
      itemCount: 1,
      revenueAmount: 100,
      baseCostAmount: 40,
      grossProfitAmount: 50,
      grossMarginBps: 5000,
      missingCostCount: 0,
    }))

    const trend = buildRevenueTrend(rows, '2026-01-01', '2026-03-02')

    expect(trend).toHaveLength(10)
    expect(trend.reduce((total, point) => total + point.value, 0)).toBe(6100)
  })

  it('sorts seller metrics from their column headers', async () => {
    vi.mocked(listFinanceBySeller).mockResolvedValue([
      {
        sellerEmployeeCode: 'J2501',
        sellerName: 'Higher revenue',
        currency: 'USD',
        itemCount: 5,
        revenueAmount: 20000,
        baseCostAmount: 9000,
        grossProfitAmount: 10000,
        operatingCostAmount: 1000,
        netProfitAmount: 9000,
        netMarginBps: 4500,
        missingCostCount: 0,
      },
      {
        sellerEmployeeCode: 'J2502',
        sellerName: 'Lower revenue',
        currency: 'USD',
        itemCount: 2,
        revenueAmount: 10000,
        baseCostAmount: 4000,
        grossProfitAmount: 5000,
        operatingCostAmount: 1000,
        netProfitAmount: 4000,
        netMarginBps: 4000,
        missingCostCount: 0,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )
    const sellerCard = (await screen.findByRole('heading', { name: 'Seller P&L' })).closest(
      '.ant-card',
    ) as HTMLElement | null
    expect(sellerCard).not.toBeNull()
    fireEvent.click(within(sellerCard!).getByRole('columnheader', { name: 'Revenue' }))

    await waitFor(() => {
      const rows = within(sellerCard!).getAllByRole('row')
      expect(rows[1]).toHaveTextContent('Lower revenue')
      expect(rows[2]).toHaveTextContent('Higher revenue')
    })
  })

  it('shows attributed Ads spend beside seller net profit', async () => {
    vi.mocked(listFinanceBySeller).mockResolvedValueOnce([
      {
        sellerEmployeeCode: 'J2508',
        sellerName: 'Ads seller',
        currency: 'USD',
        itemCount: 1,
        revenueAmount: 12000,
        baseCostAmount: 5000,
        grossProfitAmount: 6000,
        operatingCostAmount: 3000,
        adSpendAmount: 800,
        netProfitAmount: 2200,
        netMarginBps: 1833,
        missingCostCount: 0,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )
    const sellerCard = (await screen.findByRole('heading', { name: 'Seller P&L' })).closest(
      '.ant-card',
    ) as HTMLElement
    expect(within(sellerCard).getByRole('columnheader', { name: 'Ad spend' })).toBeVisible()
    expect(await within(sellerCard).findByText('$8.00')).toBeVisible()
  })

  it('shows ads spend in team performance', async () => {
    vi.mocked(listFinanceByTeam).mockResolvedValueOnce([
      {
        teamId: 'team-sales',
        teamCode: 'SALES',
        teamName: 'Sales',
        departmentName: 'Commercial',
        sellerEmployeeCode: null,
        sellerName: null,
        currency: 'USD',
        itemCount: 0,
        revenueAmount: 0,
        baseCostAmount: 0,
        grossProfitAmount: 0,
        operatingCostAmount: 0,
        adSpendAmount: 291,
        netProfitAmount: -291,
        netMarginBps: null,
        missingCostCount: 0,
        activeSellerCount: 1,
      },
    ])

    render(
      <AppProviders>
        <ReportWorkspacePage />
      </AppProviders>,
    )
    fireEvent.click(screen.getByRole('tab', { name: 'Team comparison' }))

    const teamCard = (await screen.findByRole('heading', { name: 'Team performance' })).closest(
      '.ant-card',
    ) as HTMLElement
    expect(within(teamCard).getByRole('columnheader', { name: 'Ad spend' })).toBeVisible()
    expect(await within(teamCard).findByText('$2.91')).toBeVisible()
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

    await waitFor(() => expect(listFinanceBySeller).toHaveBeenCalledTimes(1))
    expect(listFinanceDaily).not.toHaveBeenCalled()
    expect(getOperationsOverview).not.toHaveBeenCalled()
  })
})
