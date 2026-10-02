import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { AdsSellerDaily } from '@/features/portal/reports/api/reportApi'
import { ReportAdsEmployeeTab } from '@/features/portal/reports/components/ReportAdsEmployeeTab'

const rows: AdsSellerDaily[] = Array.from({ length: 200 }, (_, index) => ({
  date: `2026-09-${String((index % 30) + 1).padStart(2, '0')}`,
  sellerEmployeeCode: `seller-${index}`,
  sellerName: `Seller ${index}`,
  currency: 'USD',
  spendAmount: 1000,
  attributedSalesAmount: 3000,
  impressions: 100,
  clicks: 10,
  attributedOrdersCount: 2,
  cpaAmount: 500,
  ctrBps: 1000,
  conversionBps: 2000,
}))

describe('ReportAdsEmployeeTab performance safeguards', () => {
  it('renders a bounded number of rows for long date ranges', () => {
    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={rows} isPending={false} />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Employee ranking' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Employee trend' })).toBeInTheDocument()
    expect(screen.queryByRole('table')).not.toBeInTheDocument()
  })

  it('formats trend chart dates as DD/MM/YYYY', () => {
    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={rows} isPending={false} />
      </AppProviders>,
    )

    expect(screen.getByText('01/09/2026')).toBeInTheDocument()
  })
})
