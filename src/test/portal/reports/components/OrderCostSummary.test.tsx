import { render, screen, cleanup } from '@testing-library/react'
import { afterEach, expect, it } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import { OrderCostSummary } from '@/features/portal/reports/components/OrderCostSummary'
import i18n from '@/shared/i18n/i18n'

afterEach(cleanup)
it('shows full-filter refunds, all currencies and unavailable profit independently of table rows', async () => {
  await i18n.changeLanguage('en')
  render(
    <AppProviders>
      <OrderCostSummary
        summaries={[
          {
            currency: 'USD',
            orderCount: 60,
            costedOrderCount: 59,
            missingCostOrderCount: 1,
            revenueAmount: 9240,
            refundAmount: 5185,
            totalCostAmount: null,
            profitAmount: null,
            marginBps: null,
            profitableOrderCount: 0,
            lossOrderCount: 0,
          },
          {
            currency: 'EUR',
            orderCount: 1,
            costedOrderCount: 1,
            missingCostOrderCount: 0,
            revenueAmount: 100,
            refundAmount: 0,
            totalCostAmount: 0,
            profitAmount: 100,
            marginBps: 10000,
            profitableOrderCount: 1,
            lossOrderCount: 0,
          },
        ]}
      />
    </AppProviders>,
  )
  expect(screen.getByText(/51\.85/)).toBeInTheDocument()
  expect(screen.getByText('USD')).toBeInTheDocument()
  expect(screen.getByText('EUR')).toBeInTheDocument()
  expect(screen.getAllByText('Profit before ads')).toHaveLength(2)
  expect(screen.queryByText('All costs captured')).not.toBeInTheDocument()
  expect(screen.getAllByText('—').length).toBeGreaterThan(0)
})
