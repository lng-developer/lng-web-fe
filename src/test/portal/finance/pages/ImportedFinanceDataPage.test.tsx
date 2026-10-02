import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { listImportedFinanceData } from '@/features/portal/finance/api/financeApi'
import { TransactionLedgerPage } from '@/features/portal/finance/pages/TransactionLedgerPage'

vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()),
  listImportedFinanceData: vi.fn(),
}))

describe('TransactionLedgerPage', () => {
  beforeEach(() => {
    vi.mocked(listImportedFinanceData).mockResolvedValue({
      items: [
        {
          id: 'transaction-1',
          postedAt: '2026-09-17T00:00:00.000Z',
          transactionType: 'Order Payment',
          transactionStatus: 'Released',
          externalOrderId: '111-6597703-1797039',
          amount: 2312,
          currency: 'USD',
          feeSummary: { totalAmount: 425 },
        },
      ],
      pagination: { total: 1, page: 1, limit: 20 },
    })
  })

  it('shows imported transaction net amount and fees', async () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <TransactionLedgerPage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(await screen.findByText('Order Payment')).toBeInTheDocument()
    expect(screen.getByText('23.12 USD')).toBeInTheDocument()
    expect(screen.getByText('4.25 USD')).toBeInTheDocument()
    expect(listImportedFinanceData).toHaveBeenCalledWith('transactions', {
      page: 1,
      limit: 10,
      dateFrom: undefined,
      dateTo: undefined,
      transactionType: undefined,
      transactionStatus: undefined,
      externalOrderId: undefined,
      linkStatus: undefined,
    })
  })
})
