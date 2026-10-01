import { MemoryRouter } from 'react-router-dom'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { listCashFlow } from '@/features/portal/finance/api/financeApi'
import { CashFlowWorkspacePage } from '@/features/portal/finance/pages/CashFlowWorkspacePage'

vi.mock('@/features/portal/finance/api/financeApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/finance/api/financeApi')>()),
  listCashFlow: vi.fn(),
}))

beforeEach(() => {
  vi.mocked(listCashFlow).mockResolvedValue({
    summaryByCurrency: [
      {
        currency: 'USD',
        transactionNetAmount: 2312,
        feeAmount: -425,
        settlementPayoutAmount: 1907,
        unlinkedCount: 2,
        payoutVarianceCount: 0,
      },
    ],
    importErrorCount: 0,
    items: [],
    pagination: { total: 0, page: 1, limit: 10 },
  })
})

it('uses one scope for cards and movements, then filters exceptions server-side', async () => {
  render(
    <MemoryRouter>
      <AppProviders>
        <CashFlowWorkspacePage />
      </AppProviders>
    </MemoryRouter>,
  )

  await screen.findByText('Transaction net')
  fireEvent.click(screen.getByRole('button', { name: 'View unlinked' }))

  await waitFor(() =>
    expect(listCashFlow).toHaveBeenLastCalledWith(
      expect.objectContaining({ status: 'UNLINKED', page: 1 }),
    ),
  )
  expect(screen.getByText('Exception queue: UNLINKED')).toBeInTheDocument()
})
