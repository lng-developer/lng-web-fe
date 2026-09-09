import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { SellerDailyProfit } from '@/features/portal/reports/api/reportApi'
import { ReportSalesTab } from '@/features/portal/reports/components/ReportSalesTab'

const selectedDates = Array.from({ length: 62 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 6, 1 + index))
  return date.toISOString().slice(0, 10)
})

const sellerRows: SellerDailyProfit[] = Array.from({ length: 9 }, (_, index) => ({
  date: selectedDates[0],
  sellerEmployeeCode: `seller-${index + 1}`,
  sellerName: `Seller ${index + 1}`,
  currency: 'USD',
  itemCount: 1,
  orderCount: 1,
  revenueAmount: 10000,
  baseCostAmount: 4000,
  totalCostAmount: 5000,
  additionalFulfillmentCostAmount: 1000,
  marketplaceFeeAmount: 500,
  refundAmount: 0,
  discountAmount: 0,
  taxAmount: 0,
  grossProfitAmount: 4500,
  operatingCostAmount: 0,
  adSpendAmount: 0,
  netProfitAmount: 4500,
  netMarginBps: 4500,
  missingCostCount: 0,
}))

describe('ReportSalesTab performance safeguards', () => {
  it('reuses the money formatter across matrix cells', async () => {
    const nativeNumberFormat = Intl.NumberFormat
    const numberFormat = vi.spyOn(Intl, 'NumberFormat').mockImplementation(function (...args) {
      return new nativeNumberFormat(...args)
    })

    try {
      vi.resetModules()
      const { formatReportMoney } =
        await import('@/features/portal/reports/components/reportFormatters')

      formatReportMoney(10000, 'USD')
      formatReportMoney(20000, 'USD')

      expect(numberFormat).toHaveBeenCalledTimes(1)
    } finally {
      numberFormat.mockRestore()
    }
  })

  it('renders a bounded number of matrix rows for a two-month range', () => {
    render(
      <AppProviders>
        <ReportSalesTab
          data={sellerRows}
          isPending={false}
          canCompareSellers={false}
          dates={selectedDates}
        />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Daily seller P&L · USD' })).toBeInTheDocument()
    expect(screen.getAllByRole('row').length).toBeLessThan(109)
  })
})
