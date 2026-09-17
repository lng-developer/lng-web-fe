import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { CashFlowSummary } from '@/features/portal/finance/components/CashFlowSummary'

it('renders one summary group per currency without a converted total', () => {
  render(
    <CashFlowSummary
      summaries={[
        { currency: 'USD', transactionNetAmount: 2312, feeAmount: -425, settlementPayoutAmount: 1907, unlinkedCount: 2, payoutVarianceCount: 0 },
        { currency: 'VND', transactionNetAmount: 100000, feeAmount: -10000, settlementPayoutAmount: 90000, unlinkedCount: 0, payoutVarianceCount: 1 },
      ]}
      importErrorCount={3}
      onStatusSelect={vi.fn()}
    />,
  )

  expect(screen.getByText('USD')).toBeInTheDocument()
  expect(screen.getByText('VND')).toBeInTheDocument()
  expect(screen.getByText('3 import errors')).toBeInTheDocument()
  expect(screen.queryByText(/grand total/i)).not.toBeInTheDocument()
})
