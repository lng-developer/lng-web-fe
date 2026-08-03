import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { FinanceImportModal } from '@/features/portal/finance/pages/FinanceImportModal'
import i18n from '@/shared/i18n/i18n'

describe('FinanceImportModal', () => {
  beforeEach(async () => i18n.changeLanguage('en'))
  afterEach(cleanup)

  it('submits a validated file as a dry run by default', async () => {
    const onSubmit = vi.fn()
    const file = new File(['order-id,total\n1,10'], 'transactions.csv', { type: 'text/csv' })
    render(
      <FinanceImportModal
        open
        shops={[{ id: 'shop-1', name: 'Amazon US' }]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.mouseDown(screen.getByLabelText('Shop'))
    fireEvent.click(await screen.findByText('Amazon US'))
    fireEvent.change(screen.getByLabelText('Sales channel'), { target: { value: 'amazon' } })
    fireEvent.change(screen.getByLabelText('Marketplace'), { target: { value: 'amazon_us' } })
    fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: 'Run import' }))

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        kind: 'transactions',
        file,
        shopId: 'shop-1',
        salesChannelCode: 'amazon',
        marketplaceCode: 'amazon_us',
        dryRun: true,
      }),
    )
  })

  it('rejects unsupported files before submit', async () => {
    const onSubmit = vi.fn()
    render(
      <FinanceImportModal
        open
        shops={[{ id: 'shop-1', name: 'Amazon US' }]}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />,
    )

    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [new File(['bad'], 'payload.exe')] },
    })

    expect(
      await within(screen.getByRole('dialog')).findByText('Use a CSV or TXT file up to 25 MB.'),
    ).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })
})
