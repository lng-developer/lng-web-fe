import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { OrderProfitabilityReport } from '@/features/portal/reports/api/reportApi'
import { ReportOrderCostTab } from '@/features/portal/reports/components/ReportOrderCostTab'

const data = {
  items: [
    {
      orderId: 'order-complete',
      externalOrderId: '114-0000000-0000000',
      currency: 'USD',
      itemCount: 1,
      revenueAmount: 10000,
      baseCostAmount: 2500,
      totalCostAmount: 4000,
      lngFulfillmentFeeAmount: 100,
      shippingCostAmount: 200,
      vendorAdditionalCostAmount: 1200,
      marketplaceFeeAmount: 1000,
      refundAmount: 0,
      discountAmount: 0,
      profitAmount: 5000,
      marginBps: 5000,
      missingCostCount: 0,
    },
    {
      orderId: 'order-incomplete',
      externalOrderId: '114-0000000-0000001',
      currency: 'USD',
      itemCount: 2,
      revenueAmount: 9000,
      baseCostAmount: 0,
      totalCostAmount: null,
      marketplaceFeeAmount: 900,
      refundAmount: 0,
      discountAmount: 0,
      profitAmount: null,
      marginBps: null,
      missingCostCount: 1,
    },
  ],
  pagination: { total: 2, page: 1, limit: 20 },
  summaryByCurrency: [
    {
      currency: 'USD',
      orderCount: 2,
      costedOrderCount: 1,
      missingCostOrderCount: 1,
      revenueAmount: 19000,
      totalCostAmount: 4000,
      profitAmount: 5000,
      marginBps: 5000,
      profitableOrderCount: 1,
      lossOrderCount: 0,
    },
  ],
} as OrderProfitabilityReport

describe('ReportOrderCostTab', () => {
  it('renders overview metrics and operational data table instead of cluttered card grid', () => {
    render(
      <AppProviders>
        <ReportOrderCostTab
          data={data}
          isPending={false}
          onPageChange={() => undefined}
          onCostCoverageChange={() => undefined}
        />
      </AppProviders>,
    )

    // Metrics and operational table are rendered
    expect(screen.getAllByText('Orders').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Revenue').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Total fulfillment cost').length).toBeGreaterThan(0)

    // Operational table is rendered
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)

    // Both orders are displayed in table rows
    expect(screen.getByText('114-0000000-0000000')).toBeInTheDocument()
    expect(screen.getByText('114-0000000-0000001')).toBeInTheDocument()

    // Check status tags and formatting
    expect(screen.getByText('Complete')).toBeInTheDocument()
    expect(screen.getAllByText('Missing cost').length).toBeGreaterThan(0)
  })

  it('requests the selected cost coverage from the paginated data source', () => {
    const onCostCoverageChange = vi.fn()
    render(
      <AppProviders>
        <ReportOrderCostTab
          data={data}
          isPending={false}
          onPageChange={() => undefined}
          onCostCoverageChange={onCostCoverageChange}
        />
      </AppProviders>,
    )

    const missingOption = screen.getByText(/Missing cost \(1\)/i)
    fireEvent.click(missingOption)
    expect(onCostCoverageChange).toHaveBeenLastCalledWith('MISSING')

    const completeOption = screen.getByText(/Cost complete \(1\)/i)
    fireEvent.click(completeOption)
    expect(onCostCoverageChange).toHaveBeenLastCalledWith('COMPLETE')
  })

  it('searches orders by order ID', () => {
    render(
      <AppProviders>
        <ReportOrderCostTab
          data={data}
          isPending={false}
          onPageChange={() => undefined}
          onCostCoverageChange={() => undefined}
        />
      </AppProviders>,
    )

    const searchInput = screen.getByPlaceholderText('Search by order ID...')
    fireEvent.change(searchInput, { target: { value: '0000001' } })

    expect(screen.getByText('114-0000000-0000001')).toBeInTheDocument()
    expect(screen.queryByText('114-0000000-0000000')).not.toBeInTheDocument()
  })

  it('shows each fulfillment cost type in an order breakdown', async () => {
    const { container } = render(
      <AppProviders>
        <ReportOrderCostTab
          data={data}
          isPending={false}
          onPageChange={() => undefined}
          onCostCoverageChange={() => undefined}
        />
      </AppProviders>,
    )

    fireEvent.click(container.querySelector('.ant-table-row-expand-icon')!)

    expect(await screen.findByText('LNG fulfillment fee')).toBeInTheDocument()
    expect(await screen.findByText('Shipping')).toBeInTheDocument()
    expect(await screen.findByText('Vendor extras')).toBeInTheDocument()
    expect(await screen.findByText('1.00')).toBeInTheDocument()
    expect(await screen.findByText('2.00')).toBeInTheDocument()
    expect(await screen.findByText('12.00')).toBeInTheDocument()
  })
})
