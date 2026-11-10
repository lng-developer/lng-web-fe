import { fireEvent, render, screen, within } from '@testing-library/react'
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

  it('always renders metric cards at the top even when data is empty', () => {
    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={[]} isPending={false} />
      </AppProviders>,
    )

    expect(screen.getByText('Ad spend')).toBeInTheDocument()
    expect(screen.getByText('Attributed sales')).toBeInTheDocument()
    expect(screen.getByText('ROAS')).toBeInTheDocument()
    expect(screen.getByText('CPA')).toBeInTheDocument()
  })

  it('switches to daily detail view and renders matrix table', () => {
    const dates = ['2026-09-01', '2026-09-02']
    const sampleRows: AdsSellerDaily[] = [
      {
        date: '2026-09-01',
        sellerEmployeeCode: 'seller-1',
        sellerName: 'Alice',
        currency: 'USD',
        spendAmount: 2000,
        attributedSalesAmount: 6000,
        impressions: 200,
        clicks: 20,
        attributedOrdersCount: 4,
        cpaAmount: 500,
        ctrBps: 1000,
        conversionBps: 2000,
      },
    ]

    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={sampleRows} isPending={false} dates={dates} />
      </AppProviders>,
    )

    // Click "Daily detail" view mode button
    const dailyButton = screen.getByRole('button', { name: /Daily detail/i })
    fireEvent.click(dailyButton)

    // Table should now be rendered (AntD table uses multiple tables for fixed header/body)
    expect(screen.getAllByRole('table').length).toBeGreaterThan(0)
    expect(
      screen.getByRole('heading', { name: 'Daily advertising performance' }),
    ).toBeInTheDocument()
    expect(screen.getAllByText('01/09').length).toBeGreaterThan(0)
    expect(screen.getAllByText('02/09').length).toBeGreaterThan(0)
  })

  it('renders employee ranking and trend based purely on Ad spend', () => {
    const sampleRows: AdsSellerDaily[] = [
      {
        date: '2026-09-01',
        sellerEmployeeCode: 'seller-1',
        sellerName: 'Alice',
        currency: 'USD',
        spendAmount: 2000,
        attributedSalesAmount: 6000,
        impressions: 200,
        clicks: 20,
        attributedOrdersCount: 4,
        cpaAmount: 500,
        ctrBps: 1000,
        conversionBps: 2000,
      },
    ]

    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={sampleRows} isPending={false} dates={['2026-09-01']} />
      </AppProviders>,
    )

    // Check Employee ranking card exists
    expect(screen.getByRole('heading', { name: 'Employee ranking' })).toBeInTheDocument()
    // Check Employee trend card exists and renders chart
    expect(screen.getByRole('heading', { name: 'Employee trend' })).toBeInTheDocument()
    expect(screen.getByLabelText('Employee trend')).toBeInTheDocument()
  })

  it('does not render ROAS, Attributed sales, CPA, Orders, or Clicks in the two summary panels', () => {
    const sampleRows: AdsSellerDaily[] = [
      {
        date: '2026-09-01',
        sellerEmployeeCode: 'seller-1',
        sellerName: 'Alice',
        currency: 'USD',
        spendAmount: 2000,
        attributedSalesAmount: 6000,
        impressions: 200,
        clicks: 20,
        attributedOrdersCount: 4,
        cpaAmount: 500,
        ctrBps: 1000,
        conversionBps: 2000,
      },
    ]

    render(
      <AppProviders>
        <ReportAdsEmployeeTab data={sampleRows} isPending={false} dates={['2026-09-01']} />
      </AppProviders>,
    )

    const rankingCard = screen
      .getByRole('heading', { name: 'Employee ranking' })
      .closest('.ant-card')
    expect(rankingCard).not.toBeNull()
    const rankingText = rankingCard?.textContent || ''
    expect(rankingText).not.toContain('ROAS')
    expect(rankingText).not.toContain('CPA')
    expect(rankingText).not.toContain('Attributed sales')
    expect(
      within(rankingCard as HTMLElement).getByRole('button', { name: 'Ad spend' }),
    ).toBeInTheDocument()

    const trendCard = screen.getByRole('heading', { name: 'Employee trend' }).closest('.ant-card')
    expect(trendCard).not.toBeNull()
    const trendText = trendCard?.textContent || ''
    expect(trendText).not.toContain('Attributed sales')
    expect(trendText).not.toContain('Orders')
    expect(trendText).not.toContain('Clicks')
    expect(trendText).not.toContain('ROAS')
    expect(trendText).not.toContain('CPA')
    expect(
      within(trendCard as HTMLElement).getByRole('button', { name: 'Ad spend' }),
    ).toBeInTheDocument()
  })
})
