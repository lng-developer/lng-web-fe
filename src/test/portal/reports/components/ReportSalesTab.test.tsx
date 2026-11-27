import { render, screen, within, cleanup } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { SellerDailyProfit } from '@/features/portal/reports/api/reportApi'
import { ReportProfitComparisonChart } from '@/features/portal/reports/components/ReportProfitComparisonChart'
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
  it('does not chart partial profit as final profit', () => {
    cleanup()
    render(
      <AppProviders>
        <ReportProfitComparisonChart
          currency="USD"
          rows={[
            {
              ...sellerRows[0],
              netProfitAmount: null,
              partialNetProfitAmount: 9999,
              partialGrossProfitAmount: 9999,
            },
          ]}
        />
      </AppProviders>,
    )
    expect(screen.queryByText('$99.99')).not.toBeInTheDocument()
    cleanup()
  })
  it('counts an order shared by two sellers once', () => {
    cleanup()
    render(
      <AppProviders>
        <ReportSalesTab
          data={sellerRows.slice(0, 2).map((row) => ({ ...row, orderIds: ['same-order'] }))}
          isPending={false}
          canCompareSellers={false}
          dates={[selectedDates[0]]}
        />
      </AppProviders>,
    )
    const label = screen
      .getAllByText('Orders')
      .find((element) => element.closest('[class*="metricCard"]'))!
    expect(label.closest('[class*="metricCard"]')).toHaveTextContent('1')
    cleanup()
  })
  it('does not label an incomplete date range as a complete profit total', () => {
    cleanup()
    render(
      <AppProviders>
        <ReportSalesTab
          data={[sellerRows[0]]}
          isPending={false}
          canCompareSellers={false}
          dates={selectedDates.slice(0, 2)}
        />
      </AppProviders>,
    )
    const row = screen
      .getAllByText('Profit before ads')
      .map((el) => el.closest('tr'))
      .find(Boolean)!
    expect(within(row).getAllByRole('cell')[1]).toHaveTextContent('—')
    const summaryLabel = screen
      .getAllByText('Profit after ads and operating costs')
      .find((element) => !element.closest('tr'))!
    expect(summaryLabel.closest('[class*="metricCard"]')).toHaveTextContent('—')
    cleanup()
  })
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
  }, 15000)
})
