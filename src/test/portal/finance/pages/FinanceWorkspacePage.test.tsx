import { MemoryRouter, useLocation } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getOrderFinanceSummary,
  getOrderItemFinanceSnapshot,
  listFinanceFilterOptions,
  listFinanceSnapshots,
  listImportBatches,
  recalculateOrder,
} from '@/features/portal/finance/api/financeApi'
import { FinanceWorkspacePage } from '@/features/portal/finance/pages/FinanceWorkspacePage'
import { listShops } from '@/features/portal/shops/api/shopApi'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

const { accountState } = vi.hoisted(() => ({
  accountState: { current: null as unknown as Record<string, unknown> },
}))

vi.mock('react-router-dom', async (importOriginal) => ({
  ...(await importOriginal<typeof import('react-router-dom')>()),
  useRouteLoaderData: () => accountState.current,
}))
vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()),
  listFinanceFilterOptions: vi.fn(),
  listFinanceSnapshots: vi.fn(),
  listImportBatches: vi.fn(),
  getOrderFinanceSummary: vi.fn(),
  getOrderItemFinanceSnapshot: vi.fn(),
  recalculateOrder: vi.fn(),
}))
vi.mock('@/features/portal/shops/api/shopApi', () => ({
  listShops: vi.fn(),
}))

function LocationProbe() {
  const location = useLocation()
  return <output aria-label="Current location">{location.pathname + location.search}</output>
}

function renderPage(initialEntry = '/portal/finance') {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <AppProviders>
        <FinanceWorkspacePage />
        <LocationProbe />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('FinanceWorkspacePage', () => {
  beforeEach(async () => {
    accountState.current = {
      account: { id: 'account-1', email: 'finance@lng.co', mustChangePassword: false },
      roles: [],
      permissions: ['FINANCE:READ'],
      scopes: [],
      profileSetupRequired: false,
    }
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listFinanceSnapshots).mockResolvedValue({
      items: [
        {
          id: 'snapshot-1',
          orderId: 'order-1',
          orderItemId: 'item-1',
          shopId: 'shop-1',
          externalOrderId: 'ORDER-100',
          salesChannelCode: 'AMAZON',
          marketplaceCode: 'AMAZON_US',
          seller: { employeeCode: 'J2508', name: 'Seller One' },
          team: { name: 'Sales A', code: 'SALE_A' },
          department: { name: 'Sales', code: 'SALE' },
          revenue: {
            customerPaidAmount: 10000,
            feeAmount: 900,
            feeSource: 'ESTIMATED_15_PERCENT',
            refundAmount: 200,
            discountAmount: 300,
            currency: 'USD',
          },
          cost: {
            baseCostAmount: 4000,
            totalCostAmount: 4500,
            costLines: [],
            costStatus: 'PRESENT',
            missingCostReason: 'COST_ESTIMATE_NOT_AVAILABLE',
          },
          margin: { grossProfitAmount: 4100, grossMarginBps: 4100 },
          orderPnl: null,
          snapshotStatus: 'ESTIMATED',
          calculatedAt: '2026-08-03T03:00:00.000Z',
          calculationHistory: [],
        },
      ],
      pagination: { total: 120, page: 1, limit: 20 },
      summaryByCurrency: [
        {
          currency: 'USD',
          orderCount: 64,
          revenueAmount: 10000,
          marketplaceFeeAmount: 1000,
          refundAmount: 200,
          discountAmount: 100,
          baseCostAmount: 5000,
          additionalFulfillmentCostAmount: 1000,
          knownCostAmount: 6000,
          totalCostAmount: 6000,
          profitAmount: 4000,
          grossMarginBps: 4000,
          missingCostCount: 0,
        },
        {
          currency: 'VND',
          orderCount: 12,
          revenueAmount: 25000000,
          marketplaceFeeAmount: 2000000,
          refundAmount: 0,
          discountAmount: 0,
          baseCostAmount: 16000000,
          additionalFulfillmentCostAmount: 4000000,
          knownCostAmount: 18000000,
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
      pagination: { total: 120, page: 1, limit: 20 },
    })
    vi.mocked(listShops).mockResolvedValue({
      items: [
        {
          id: 'shop-1',
          name: 'Evermore LLC',
          currency: 'USD',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: '',
        },
      ],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    vi.mocked(getOrderFinanceSummary).mockResolvedValue({
      orderId: 'order-1',
      itemCount: 1,
      currency: 'USD',
      customerPaidAmount: 10000,
      baseCostAmount: 4000,
      totalCostAmount: 4500,
      grossProfitAmount: 4100,
      grossMarginBps: 4100,
      missingCostCount: 0,
      snapshots: [
        {
          ...(await vi.mocked(listFinanceSnapshots)({})).items[0],
          orderPnl: {
            marketplaceFeeAmount: 900,
            refundAmount: 200,
            discountAmount: 300,
            baseCostAmount: 4000,
            additionalFulfillmentCostAmount: 500,
            totalCostAmount: 4500,
            totalDeductionAmount: 5900,
            profitAmount: 4100,
          },
          calculationHistory: [
            {
              calculatedAt: '2026-08-03T03:00:00.000Z',
              snapshotStatus: 'ESTIMATED',
              costStatus: 'PRESENT',
              missingCostReason: null,
            },
          ],
        },
      ],
    })
    vi.mocked(recalculateOrder).mockResolvedValue({})
    vi.mocked(getOrderItemFinanceSnapshot).mockResolvedValue({
      id: 'snapshot-1',
      orderId: 'order-1',
      orderItemId: 'item-1',
      shopId: 'shop-1',
      externalOrderId: 'ORDER-100',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
      seller: { employeeCode: 'J2508', name: 'Seller One' },
      team: { name: 'Sales A', code: 'SALE_A' },
      department: { name: 'Sales', code: 'SALE' },
      revenue: {
        customerPaidAmount: 10000,
        feeAmount: 900,
        feeSource: 'ESTIMATED_15_PERCENT',
        refundAmount: 200,
        discountAmount: 300,
        currency: 'USD',
      },
      cost: {
        baseCostAmount: 4000,
        totalCostAmount: 4500,
        costLines: [{ code: 'BASE', label: 'Base product', amount: 4000 }],
        costStatus: 'PRESENT',
        missingCostReason: null,
      },
      margin: { grossProfitAmount: 4100, grossMarginBps: 4100 },
      orderPnl: null,
      snapshotStatus: 'ESTIMATED',
      calculatedAt: '2026-08-03T03:00:00.000Z',
      calculationHistory: [],
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('shows every currency summary without exposing option IDs', async () => {
    renderPage()

    expect(await screen.findByText('USD')).toBeVisible()
    expect(screen.getByText('VND')).toBeVisible()
    fireEvent.mouseDown(screen.getByLabelText('Team'))
    const teamOptions = await screen.findAllByText('Sales A')
    expect(teamOptions.some((element) => element.closest('.ant-select-item-option'))).toBe(true)
  })

  it('applies readable team and channel filters to the snapshot query', async () => {
    renderPage()
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

  it('keeps profitability filters in one scrollable row', async () => {
    renderPage()

    const filters = await screen.findByTestId('finance-filters-row')
    expect(filters).toContainElement(screen.getByLabelText('Sales channel'))
    expect(filters).toContainElement(screen.getByLabelText('Cost status'))
    expect(
      screen
        .getAllByLabelText('Order date')
        .every((input) => filters.lastElementChild?.contains(input)),
    ).toBe(true)
  })

  it('keeps shop, status, and fee source within existing table cells', async () => {
    renderPage()

    expect(await screen.findByText('Evermore LLC')).toBeVisible()
    expect(screen.getAllByText('Missing cost').length).toBeGreaterThan(0)
    expect(screen.getByText('Estimated 15%')).toBeVisible()
  })

  it('renders USD with a single symbol', async () => {
    renderPage()

    await screen.findByText('USD')
    expect(screen.getAllByText('$100.00')).not.toHaveLength(0)
    expect(screen.queryByText(/US\$/)).not.toBeInTheDocument()
  })

  it('uses semantic shared metric cards for the finance summary', async () => {
    renderPage()

    await screen.findByText('USD')
    expect(document.querySelectorAll('[data-icon="dollar-circle"]')).toHaveLength(2)
    expect(document.querySelectorAll('[data-icon="wallet"]')).toHaveLength(4)
    expect(document.querySelectorAll('[data-icon="rise"]')).toHaveLength(2)
    expect(document.querySelectorAll('[data-icon="exclamation-circle"]')).toHaveLength(2)
  })

  it('shows known cost separately from an incomplete total cost', async () => {
    renderPage()

    expect(await screen.findAllByText('Known cost')).toHaveLength(2)
  })

  it('offers a collapsed cost and deductions breakdown for every currency', async () => {
    renderPage()

    expect(await screen.findAllByText('Cost & deductions')).toHaveLength(2)
    fireEvent.click(screen.getAllByText('Cost & deductions')[0])
    expect(await screen.findByText('Additional fulfillment cost')).toBeInTheDocument()
  })

  it('keeps one filter row, omits marketplace, and puts export in the profitability header', async () => {
    renderPage()

    await screen.findByText('USD')
    expect(screen.queryByLabelText('Marketplace')).not.toBeInTheDocument()
    expect(screen.queryByTestId('finance-secondary-filters')).not.toBeInTheDocument()
    expect(screen.getByText('Export CSV').closest('.ant-card-head')).not.toBeNull()
  })

  it('opens an order-level breakdown and recalculates every item for writers', async () => {
    accountState.current = {
      ...accountState.current,
      permissions: ['FINANCE:READ', 'FINANCE:WRITE'],
    }
    renderPage()

    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)
    expect((await screen.findAllByText('Gross sales')).length).toBeGreaterThan(0)
    expect(screen.getAllByText('Net profit').length).toBeGreaterThan(0)
    expect(await screen.findByText('Additional fulfillment cost')).toBeInTheDocument()
    expect(screen.getAllByText('Estimated 15%')).toHaveLength(2)
    expect(screen.getByText('Revenue & deductions')).toBeInTheDocument()
    expect(screen.getByText('Costs & profit')).toBeInTheDocument()
    expect(screen.getByText('Current calculation')).toBeInTheDocument()
    expect(screen.getByText('Total deductions')).toBeInTheDocument()
    expect(screen.getByText('Calculation history')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: /Recalculate order/ }))

    await waitFor(() => expect(recalculateOrder).toHaveBeenCalledWith('order-1', expect.anything()))
  })

  it('hides write actions for scoped readers', async () => {
    accountState.current = {
      ...accountState.current,
      permissions: [],
      scopes: [
        {
          scopeType: 'team',
          scopeId: 'team-id',
          resourceId: 'team-id',
          roles: [],
          permissions: ['FINANCE:READ'],
        },
      ],
    }
    renderPage()
    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)

    expect(await screen.findByText('Financial breakdown')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recalculate order/ })).not.toBeInTheDocument()
  })

  it('opens a direct item snapshot returned by the backend', async () => {
    renderPage()
    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)
    fireEvent.click(await screen.findByRole('button', { name: 'Inspect item' }))

    await waitFor(() => expect(getOrderItemFinanceSnapshot).toHaveBeenCalledWith('item-1'))
    expect(await screen.findByText('Item financial snapshot')).toBeInTheDocument()
  })

  it('shows a useful toast when order recalculation fails', async () => {
    accountState.current = {
      ...accountState.current,
      permissions: ['FINANCE:READ', 'FINANCE:WRITE'],
    }
    vi.mocked(recalculateOrder).mockRejectedValueOnce(new Error('Cost service unavailable'))
    renderPage()
    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)
    fireEvent.click(await screen.findByRole('button', { name: /Recalculate order/ }))

    expect(await screen.findByText('Finance action failed')).toBeInTheDocument()
    expect(screen.getByText('Cost service unavailable')).toBeInTheDocument()
  })

  it('keeps Finance focused on profitability and links reconciliation to Integrations', async () => {
    renderPage()

    expect(await screen.findByText('Order profitability')).toBeVisible()
    expect(screen.queryByRole('tab', { name: 'Imports & reconciliation' })).not.toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Manage reconciliation' })).toHaveAttribute(
      'href',
      '/portal/integrations?tab=finance',
    )
  })

  it('reloads finance snapshots when the shared page-size control changes', async () => {
    renderPage()

    fireEvent.mouseDown(await screen.findByRole('combobox', { name: 'Rows per page' }))
    fireEvent.click((await screen.findAllByText('50')).at(-1)!)

    await waitFor(() =>
      expect(listFinanceSnapshots).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50, page: 1 }),
      ),
    )
  })
})
