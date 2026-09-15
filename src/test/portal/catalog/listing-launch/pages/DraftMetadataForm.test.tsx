import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, it, vi } from 'vitest'
import { AppProviders } from '@/app/providers/AppProviders'
import DraftMetadataForm from '@/features/portal/catalog/listing-launch/components/DraftMetadataForm'
import { updateLaunch } from '@/features/portal/catalog/listing-launch/api/listingLaunchApi'
import type { Launch } from '@/features/portal/catalog/listing-launch/api/listingLaunchTypes'
import i18n from '@/shared/i18n/i18n'
vi.mock('@/features/portal/catalog/listing-launch/api/listingLaunchApi', () => ({
  updateLaunch: vi.fn(),
}))
afterEach(cleanup)
it('renames without resubmitting the brief and invalidating content', async () => {
  await i18n.changeLanguage('en')
  const launch = { id: 'draft', brief: 'Original brief', workingTitle: 'Old title' } as Launch
  vi.mocked(updateLaunch).mockResolvedValue(launch)
  render(
    <AppProviders>
      <DraftMetadataForm launch={launch} canWrite onSaved={vi.fn()} onDirty={vi.fn()} />
    </AppProviders>,
  )
  fireEvent.click(screen.getByRole('button', { name: 'Edit draft' }))
  fireEvent.change(screen.getByLabelText('Working title'), { target: { value: 'New title' } })
  fireEvent.click(screen.getByRole('button', { name: 'Save draft' }))
  await waitFor(() =>
    expect(updateLaunch).toHaveBeenCalledWith('draft', { workingTitle: 'New title' }),
  )
})
