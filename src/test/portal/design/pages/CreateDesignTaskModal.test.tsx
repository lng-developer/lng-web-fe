import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { CreateDesignTaskModal } from '@/features/portal/design/pages/CreateDesignTaskModal'
import i18n from '@/shared/i18n/i18n'

const onSubmit = vi.fn()

const openModal = () =>
  render(
    <AppProviders>
      <CreateDesignTaskModal
        open
        listings={[{ id: 'listing-1', sku: 'SKU-1', title: 'Target listing' }]}
        templates={[{ id: 'template-1', name: 'Source template' }]}
        saving={false}
        onClose={vi.fn()}
        onSubmit={onSubmit}
      />
    </AppProviders>,
  )

const selectOption = async (label: string, value: string) => {
  fireEvent.mouseDown(screen.getByLabelText(label))
  fireEvent.click(await screen.findByText(value))
}

describe('CreateDesignTaskModal', () => {
  afterEach(() => {
    cleanup()
    onSubmit.mockReset()
  })
  beforeEach(() => i18n.changeLanguage('en'))

  it('requires a brief for an IDEA task', async () => {
    openModal()
    await selectOption('Task type', 'IDEA')
    await selectOption('Listing', 'SKU-1 - Target listing')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Brief is required')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('requires a source for a CLONE task', async () => {
    openModal()
    await selectOption('Task type', 'CLONE')
    await selectOption('Listing', 'SKU-1 - Target listing')
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    expect(await screen.findByText('Select a source')).toBeInTheDocument()
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it('submits only the selected source for a CLONE task', async () => {
    openModal()
    await selectOption('Task type', 'CLONE')
    await selectOption('Listing', 'SKU-1 - Target listing')
    await selectOption('Source type', 'Internal template')
    fireEvent.mouseDown(await screen.findByLabelText('Source'))
    fireEvent.click(await screen.findByText('Source template'))
    fireEvent.click(screen.getByRole('button', { name: 'Create' }))
    await waitFor(() =>
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          listingId: 'listing-1',
          taskType: 'CLONE',
          sourceInternalTemplateId: 'template-1',
        }),
      ),
    )
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('sourceListingId')
  })
})
