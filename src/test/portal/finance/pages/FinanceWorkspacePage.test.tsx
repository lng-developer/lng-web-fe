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
          externalOrderId: 'ORDER-100',
          salesChannelCode: 'AMAZON',
          marketplaceCode: 'AMAZON_US',
          seller: { employeeCode: 'J2508', name: 'Seller One' },
          team: { name: 'Sales A', code: 'SALE_A' },
          department: { name: 'Sales', code: 'SALE' },
          revenue: {
            customerPaidAmount: 10000,
            feeAmount: 900,
            refundAmount: 200,
            discountAmount: 300,
            currency: 'USD',
          },
          cost: {
            baseCostAmount: 4000,
            totalCostAmount: 4500,
            costLines: [],
            costStatus: 'PRESENT',
            missingCostReason: null,
          },
          margin: { grossProfitAmount: 4100, grossMarginBps: 4100 },
          orderPnl: null,
          snapshotStatus: 'ESTIMATED',
          calculatedAt: '2026-08-03T03:00:00.000Z',
          calculationHistory: [],
        },
      ],
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
      externalOrderId: 'ORDER-100',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
      seller: { employeeCode: 'J2508', name: 'Seller One' },
      team: { name: 'Sales A', code: 'SALE_A' },
      department: { name: 'Sales', code: 'SALE' },
      revenue: {
        customerPaidAmount: 10000,
        feeAmount: 900,
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

  it('opens an order-level breakdown and recalculates every item for writers', async () => {
    accountState.current = {
      ...accountState.current,
      permissions: ['FINANCE:READ', 'FINANCE:WRITE'],
    }
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )

    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)
    expect(await screen.findByText('Additional fulfillment cost')).toBeInTheDocument()
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
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )
    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)

    expect(await screen.findByText('Financial breakdown')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Recalculate order/ })).not.toBeInTheDocument()
  })

  it('opens a direct item snapshot returned by the backend', async () => {
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )
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
    render(
      <AppProviders>
        <FinanceWorkspacePage />
      </AppProviders>,
    )
    fireEvent.click((await screen.findByText('ORDER-100')).closest('tr')!)
    fireEvent.click(await screen.findByRole('button', { name: /Recalculate order/ }))

    expect(await screen.findByText('Finance action failed')).toBeInTheDocument()
    expect(screen.getByText('Cost service unavailable')).toBeInTheDocument()
  })
})
