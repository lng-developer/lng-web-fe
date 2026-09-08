import { fireEvent, render, screen, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { ShopEditorModal } from '@/features/portal/shops/pages/components/ShopEditorModal'
import i18n from '@/shared/i18n/i18n'

const shop: Shop = {
  id: 'shop-1',
  name: 'Football US',
  currency: 'USD',
  status: 'ACTIVE' as const,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
}

describe('ShopEditorModal', () => {
  beforeEach(() => i18n.changeLanguage('en'))

  it('disables Save status until the status value changes', () => {
    renderEditor({ onClose: vi.fn() })

    expect(screen.getByRole('button', { name: 'Save status' })).toBeDisabled()

    fireEvent.click(screen.getByRole('switch'))

    expect(screen.getByRole('button', { name: 'Save status' })).toBeEnabled()

    fireEvent.click(screen.getByRole('switch'))

    expect(screen.getByRole('button', { name: 'Save status' })).toBeDisabled()
  })

  it('closes without showing a discard confirmation when Cancel is clicked', () => {
    const onClose = vi.fn()
    renderEditor({ onClose })

    fireEvent.click(screen.getByRole('switch'))
    fireEvent.click(
      within(screen.getByRole('dialog', { name: 'Edit shop' })).getByRole('button', {
        name: 'Cancel',
      }),
    )

    expect(onClose).toHaveBeenCalledOnce()
    expect(screen.queryByText('Unsaved changes')).not.toBeInTheDocument()
  })
})

function renderEditor({
  onClose,
  onUpdateStatus = vi.fn(),
}: {
  onClose: () => void
  onUpdateStatus?: (status: 'ACTIVE' | 'INACTIVE' | 'SUSPENDED') => void
}) {
  return render(
    <AppProviders>
      <ShopEditorModal
        canWrite
        open
        shop={shop}
        onClose={onClose}
        onCreate={vi.fn()}
        onUpdateStatus={onUpdateStatus}
      />
    </AppProviders>,
  )
}
