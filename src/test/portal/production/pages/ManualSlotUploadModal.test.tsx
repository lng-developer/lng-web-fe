import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { ManualSlotUploadModal } from '@/features/portal/production/pages/ManualSlotUploadModal'
import i18n from '@/shared/i18n/i18n'

describe('ManualSlotUploadModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  afterEach(cleanup)

  it('submits mapped metadata for a visual preset', async () => {
    const onSubmit = vi.fn()
    const file = new File(['scaled'], 'front.png', { type: 'image/png' })
    render(<ManualSlotUploadModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Front' }))
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })
    const submit = screen.getByRole('button', { name: 'Add print position' })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        file,
        slotKey: 'FRONT',
        slotLabel: 'Front',
      }),
    )
  })

  it('derives a stable key for a custom Vietnamese position', async () => {
    const onSubmit = vi.fn()
    const file = new File(['scaled'], 'collar.png', { type: 'image/png' })
    render(<ManualSlotUploadModal open onClose={vi.fn()} onSubmit={onSubmit} />)

    fireEvent.click(screen.getByRole('radio', { name: 'Other position' }))
    fireEvent.change(await screen.findByLabelText('Position name'), {
      target: { value: 'Viền cổ trước' },
    })
    fireEvent.change(document.querySelector('input[type="file"]')!, {
      target: { files: [file] },
    })
    const submit = screen.getByRole('button', { name: 'Add print position' })
    await waitFor(() => expect(submit).toBeEnabled())
    fireEvent.click(submit)

    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith({
        file,
        slotKey: 'CUSTOM_VIEN_CO_TRUOC',
        slotLabel: 'Viền cổ trước',
      }),
    )
  })

  it('hides existing presets and keeps submit disabled until complete', () => {
    render(
      <ManualSlotUploadModal
        open
        existingSlotKeys={['FRONT']}
        onClose={vi.fn()}
        onSubmit={vi.fn()}
      />,
    )

    expect(screen.queryByRole('radio', { name: 'Front' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add print position' })).toBeDisabled()
  })
})
