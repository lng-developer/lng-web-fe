import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { RequestDecisionModal } from '@/features/hr/components/RequestDecisionModal'

describe('RequestDecisionModal', () => {
  it('shows the employee and request type before approving', () => {
    const onSubmit = vi.fn()

    render(
      <AppProviders>
        <RequestDecisionModal
          decision={{ action: 'approve', employeeName: 'Jane Nguyen', requestKind: 'leave' }}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </AppProviders>,
    )

    expect(screen.getByText('Approve Leave request from Jane Nguyen?')).toBeInTheDocument()
    expect(screen.getByRole('dialog').closest('.ant-modal')).toHaveClass('request-decision-modal')
    expect(screen.getByRole('dialog').querySelector('.ant-modal-container')).toHaveAttribute(
      'style',
      expect.stringContaining('padding: 0px'),
    )
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }))
    expect(onSubmit).toHaveBeenCalledWith()
  })

  it('requires a written reason before rejecting a request', async () => {
    const onSubmit = vi.fn()

    render(
      <AppProviders>
        <RequestDecisionModal
          decision={{ action: 'reject', employeeName: 'Jane Nguyen', requestKind: 'leave' }}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </AppProviders>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Reject' }))

    expect(await screen.findByText('A reason is required.')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
