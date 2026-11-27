import { cleanup, render, screen, within } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import {
  getOrderFinanceSummary,
  type OrderFinanceSummary,
} from '@/features/portal/finance/api/financeApi'
import { FinanceOrderDetailModal } from '@/features/portal/finance/components/FinanceOrderDetailModal'
import i18n from '@/shared/i18n/i18n'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/finance/api/financeApi', () => ({ getOrderFinanceSummary: vi.fn() }))
afterEach(() => {
  cleanup()
  queryClient.clear()
  vi.clearAllMocks()
})

it('uses the same canonical profit and effective cost in the scoped waterfall', async () => {
  await i18n.changeLanguage('en')
  vi.mocked(getOrderFinanceSummary).mockResolvedValue({
    orderId: 'order',
    itemCount: 1,
    currency: 'USD',
    customerPaidAmount: 9240,
    recognizedNetRevenueAmount: 9240,
    marketplaceFeeAmount: 677,
    revenueAdjustmentAmount: 0,
    totalCostAmount: 3564,
    grossProfitAmount: 4999,
    grossMarginBps: null,
    snapshots: [
      {
        orderItemId: 'item',
        revenue: {
          currency: 'USD',
          customerPaidAmount: 9240,
          feeAmount: 677,
          feeConfidence: 'ALLOCATED',
          financialStatus: 'ACTIVE',
        },
        cost: { totalCostAmount: 3564 },
        estimatedFulfillmentCostAmount: 3814,
        recognizedNetRevenueAmount: 9240,
        costComponents: [
          { code: 'VENDOR_BASE', amount: 2559 },
          { code: 'VENDOR_SHIPPING', amount: 1005 },
        ],
        profitStatus: 'ESTIMATED',
        calculationHistory: [],
        actualVendorCost: {
          totalAmount: 3564,
          currency: 'USD',
          allocation: {
            vendorOrderId: 'vendor-1',
            totalAmount: 3564,
            currency: 'USD',
            orderItemIds: ['a', 'b', 'c'],
          },
        },
      },
    ],
  } as unknown as OrderFinanceSummary)
  const filters = { sellerEmployeeCode: 'J2503', shopId: 'shop', currency: 'USD' }
  render(
    <AppProviders>
      <FinanceOrderDetailModal
        selectedOrder={{ orderId: 'order' }}
        filters={filters}
        canWrite={false}
        isRecalculatingOrder={false}
        isRecalculatingItem={false}
        onClose={vi.fn()}
        onInspectItem={vi.fn()}
        onRecalculateOrder={vi.fn()}
        onRecalculateItem={vi.fn()}
      />
    </AppProviders>,
  )
  const waterfall = await screen.findByRole('region', {
    name: i18n.t('finance.detail.pnlWaterfall'),
  })
  expect(within(waterfall).getByText('$49.99')).toBeVisible()
  expect(within(waterfall).getByText('-$35.64')).toBeVisible()
  expect(within(waterfall).queryByText('$38.14')).not.toBeInTheDocument()
  expect(screen.getByText(/vendor-1/)).toBeVisible()
  expect(getOrderFinanceSummary).toHaveBeenCalledWith('order', filters)
})

it('opens the selected currency rather than the first currency group', async () => {
  await i18n.changeLanguage('en')
  const group = (currency: string, profit: number) => ({
    currency,
    itemCount: 1,
    customerPaidAmount: 10000,
    recognizedNetRevenueAmount: 10000,
    marketplaceFeeAmount: 0,
    revenueAdjustmentAmount: 0,
    totalCostAmount: 10000 - profit,
    grossProfitAmount: profit,
    snapshots: [],
  })
  vi.mocked(getOrderFinanceSummary).mockResolvedValue({
    orderId: 'mixed',
    summaryByCurrency: [group('USD', 500), group('EUR', 2500)],
  } as unknown as OrderFinanceSummary)
  render(
    <AppProviders>
      <FinanceOrderDetailModal
        selectedOrder={{ orderId: 'mixed', currency: 'EUR' }}
        canWrite={false}
        isRecalculatingOrder={false}
        isRecalculatingItem={false}
        onClose={vi.fn()}
        onInspectItem={vi.fn()}
        onRecalculateOrder={vi.fn()}
        onRecalculateItem={vi.fn()}
      />
    </AppProviders>,
  )
  const waterfall = await screen.findByRole('region', {
    name: i18n.t('finance.detail.pnlWaterfall'),
  })
  expect(within(waterfall).getByText('EUR 25.00')).toBeVisible()
  expect(within(waterfall).queryByText('$5.00')).not.toBeInTheDocument()
})
