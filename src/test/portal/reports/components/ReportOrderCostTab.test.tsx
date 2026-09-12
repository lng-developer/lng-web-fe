import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

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
      itemCount: 1,
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
  it('prioritizes summary and cost-completeness cards over a wide table', () => {
    render(
      <AppProviders>
        <ReportOrderCostTab data={data} isPending={false} onPageChange={() => undefined} />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Order cost overview' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Missing fulfilment cost' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Complete order P&L' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })
})
