import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { expect, it, vi } from 'vitest'

import { CashFlowMovementTable } from '@/features/portal/finance/components/CashFlowMovementTable'

it('links a settlement activity to its existing settlement detail', () => {
  render(
    <MemoryRouter>
      <CashFlowMovementTable
        data={{
          items: [{ id: 'line-1', occurredAt: '2026-09-17T00:00:00.000Z', sourceKind: 'SETTLEMENT_ACTIVITY', amount: 2312, currency: 'USD', reconciliationStatus: 'LINKED', orderId: null, orderItemId: null, externalOrderId: '111-6597703-1797039', settlementId: '27545699901', settlementRecordId: 'settlement-1', sourceRef: null, importBatchId: null, reason: null }],
          pagination: { total: 1, page: 1, limit: 10 },
        }}
        onPageChange={vi.fn()}
      />
    </MemoryRouter>,
  )

  expect(screen.getByRole('link', { name: 'View settlement' })).toHaveAttribute(
    'href',
    '/portal/finance/settlements?settlementId=settlement-1',
  )
})
