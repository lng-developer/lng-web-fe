import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { VendorWorkspacePage } from '@/features/portal/vendors/pages/VendorWorkspacePage'
import vendorWorkspaceSource from '@/features/portal/vendors/pages/VendorWorkspacePage.tsx?raw'
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

    expect(screen.getByRole('tab', { name: i18n.t('portal.vendors.tabs.vendors') })).toBeVisible()
    expect(screen.queryByText('vendors.title')).not.toBeInTheDocument()
  })

  it('does not repeat the portal prefix in translation keys', () => {
    expect(vendorWorkspaceSource).not.toContain("t('portal.")
  })

  it('passes the active state to each shared tab label', () => {
    expect(vendorWorkspaceSource).toContain(
      "<UiTabLabel count={vendors.data?.pagination.total} active={tab === 'vendors'}>",
    )
    expect(vendorWorkspaceSource).toContain(
      "<UiTabLabel count={products.data?.pagination.total} active={tab === 'products'}>",
    )
    expect(vendorWorkspaceSource).toContain("<UiTabLabel active={tab === 'migration'}>")
  })
})
