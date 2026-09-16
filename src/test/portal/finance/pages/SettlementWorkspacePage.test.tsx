import { MemoryRouter } from 'react-router-dom'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getSettlement,
  listImportBatches,
  listSettlements,
  reconcileSettlement,
} from '@/features/portal/finance/api/financeApi'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { SettlementWorkspacePage } from '@/features/portal/finance/pages/SettlementWorkspacePage'
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
  getSettlement: vi.fn(),
  listImportBatches: vi.fn(),
  listSettlements: vi.fn(),
  reconcileSettlement: vi.fn(),
}))
vi.mock('@/features/portal/shops/api/shopApi', () => ({ listShops: vi.fn() }))

const settlement = {
  id: 'settlement-1',
  settlementId: 'S-1',
  shopId: 'shop-1',
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON_US',
  periodStartAt: '2026-09-05T00:00:00.000Z',
  periodEndAt: '2026-09-06T00:00:00.000Z',
  depositAt: '2026-09-08T00:00:00.000Z',
  currency: 'USD',
  totalAmount: 96215,
  grossSalesAmount: null,
  refundAmount: null,
  feeAmount: null,
  advertisingCostAmount: null,
  netSettlementAmount: 96215,
  lineCount: 1,
  ledgerSummary: {
    inflowAmount: 10000,
    outflowAmount: -3785,
    netAmount: 6215,
    payoutAmount: 96215,
    ledgerNetAmount: 6215,
    cashVarianceAmount: 90000,
    lineCount: 1,
    linkedCount: 1,
    unlinkedCount: 0,
    linkCoverageBps: 10000,
  },
  sourceRef: 'settlements-S-1.txt',
  importBatchId: 'batch-1',
}

function renderPage() {
  return render(
    <MemoryRouter>
      <AppProviders>
        <SettlementWorkspacePage />
      </AppProviders>
    </MemoryRouter>,
  )
}

describe('SettlementWorkspacePage', () => {
  beforeEach(async () => {
    accountState.current = {
      permissions: ['FINANCE:READ'],
      scopes: [],
    }
    queryClient.clear()
    await i18n.changeLanguage('en')
    vi.mocked(listSettlements).mockResolvedValue({
      items: [settlement],
      pagination: { total: 1, page: 1, limit: 20 },
      summaryByCurrency: [
        { currency: 'USD', settlementCount: 1, totalAmount: 96215, netSettlementAmount: 96215 },
      ],
    })
    vi.mocked(getSettlement).mockResolvedValue({
      settlement,
      ledger: {
        items: [
          {
            id: 'line-1',
            settlementId: 'S-1',
            orderId: 'order-1',
            orderItemId: 'item-1',
            externalOrderId: 'ORDER-1',
            externalItemId: 'ITEM-1',
            sku: 'SKU-1',
            transactionType: 'Order',
            amountType: 'ItemPrice',
            amountDescription: 'Principal',
            amount: 10000,
            currency: 'USD',
            quantityPurchased: 1,
            postedAt: '2026-09-05T00:00:00.000Z',
          },
        ],
        pagination: { total: 1, page: 1, limit: 20 },
        summary: settlement.ledgerSummary,
      },
    })
    vi.mocked(listImportBatches).mockResolvedValue({
      items: [
        {
          id: 'batch-1',
          sourceType: 'SETTLEMENTS',
          originalFilename: 'settlement.txt',
          dryRun: false,
          status: 'COMPLETED',
          processedRows: 1,
          validRows: 1,
          skippedRows: 0,
          unlinkedRows: 0,
          errorCount: 0,
          errors: [],
          recalculationStatus: 'COMPLETED',
          recalculationTotal: 1,
          recalculationCompleted: 1,
          recalculationFailed: 0,
          recalculationErrors: [],
          createdAt: '2026-09-08T00:00:00.000Z',
        },
      ],
      pagination: { total: 1, page: 1, limit: 100 },
    })
    vi.mocked(listShops).mockResolvedValue({
      items: [
        {
          id: 'shop-1',
          name: 'Football US',
          currency: 'USD',
          status: 'ACTIVE',
          createdAt: '',
          updatedAt: '',
        },
      ],
      pagination: { total: 1, page: 1, limit: 100 },
    })
  })

  afterEach(() => {
    cleanup()
    queryClient.clear()
    vi.clearAllMocks()
  })

  it('shows settlement cash movement and opens ledger details', async () => {
    renderPage()

    expect(await screen.findByText('Settlement cash flow')).toBeVisible()
    expect((await screen.findAllByText('$962.15')).length).toBeGreaterThan(0)
    expect(await screen.findByText('S-1')).toBeVisible()
    expect(screen.getAllByText('Amazon payout').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Status').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Pending').length).toBeGreaterThan(0)
    expect(screen.queryByText('Import completed')).not.toBeInTheDocument()

    fireEvent.click(screen.getByText('S-1'))

    expect(await screen.findByText('Ledger movement')).toBeVisible()
    expect(screen.getByText('ORDER-1')).toBeVisible()
  })

  it('forwards mismatch and shop filters to the settlement query', async () => {
    renderPage()
    await screen.findByText('S-1')

    fireEvent.click(screen.getByText('Mismatch'))
    await waitFor(() =>
      expect(listSettlements).toHaveBeenLastCalledWith(
        expect.objectContaining({ hasVariance: true }),
      ),
    )
  })

  it('allows a finance writer to send an explicit review note', async () => {
    accountState.current = { permissions: ['FINANCE:WRITE'], scopes: [] }
    vi.mocked(reconcileSettlement).mockResolvedValue({
      settlement: {
        ...settlement,
        reconciliation: {
          status: 'NEEDS_REVIEW',
          note: 'Ledger amount differs',
          reconciledAt: null,
          reconciledByAccountId: null,
        },
      },
      ledger: {
        items: [],
        pagination: { total: 0, page: 1, limit: 20 },
        summary: settlement.ledgerSummary,
      },
    })
    renderPage()
    fireEvent.click(await screen.findByText('S-1'))
    fireEvent.change(await screen.findByLabelText('Review note'), {
      target: { value: 'Ledger amount differs' },
    })
    fireEvent.click(screen.getByText('Needs review'))

    await waitFor(() =>
      expect(reconcileSettlement).toHaveBeenCalledWith('settlement-1', {
        status: 'NEEDS_REVIEW',
        note: 'Ledger amount differs',
      }),
    )
  })
})
