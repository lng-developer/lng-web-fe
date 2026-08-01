import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { VendorWorkspacePage } from '@/features/portal/vendors/pages/VendorWorkspacePage'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/vendors/pages/VendorTree', () => ({
  VendorTree: () => <div>Vendor tree</div>,
}))

describe('VendorWorkspacePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the Vendor locale instead of raw translation keys', () => {
    render(
      <AppProviders>
        <VendorWorkspacePage />
      </AppProviders>,
    )

    expect(screen.getByRole('heading', { name: 'Vendor workspace' })).toBeVisible()
    expect(screen.queryByText('vendors.title')).not.toBeInTheDocument()
  })
})
