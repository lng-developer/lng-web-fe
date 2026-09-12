import { MemoryRouter } from 'react-router-dom'
import { render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { VendorWorkspacePage } from '@/features/portal/vendors/pages/VendorWorkspacePage'
import vendorWorkspaceSource from '@/features/portal/vendors/pages/VendorWorkspacePage.tsx?raw'
import productsTabSource from '@/features/portal/vendors/pages/VendorWorkspaceProductsTabPage.tsx?raw'
import vendorsTabSource from '@/features/portal/vendors/pages/VendorWorkspaceVendorsTabPage.tsx?raw'
import i18n from '@/shared/i18n/i18n'

vi.mock('@/features/portal/vendors/pages/VendorTree', () => ({
  VendorTree: () => <div>Vendor tree</div>,
}))

describe('VendorWorkspacePage', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })

  it('renders the Vendor locale without a duplicate workspace tab bar', () => {
    render(
      <MemoryRouter>
        <AppProviders>
          <VendorWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
    expect(screen.queryByText('vendors.title')).not.toBeInTheDocument()
  })

  it('opens the integrations workflow from its URL parameter without a tab bar', () => {
    render(
      <MemoryRouter initialEntries={['/portal/vendors?tab=integrations']}>
        <AppProviders>
          <VendorWorkspacePage />
        </AppProviders>
      </MemoryRouter>,
    )

    expect(screen.queryByRole('tab')).not.toBeInTheDocument()
  })

  it('uses the shared permission helper so Admin keeps Vendor write actions', () => {
    expect(vendorWorkspaceSource).toContain(
      "import { hasAnyPermission } from '@/shared/auth/permissions'",
    )
    expect(vendorWorkspaceSource).toContain(
      "hasAnyPermission(['VENDORS:WRITE'], { globalOnly: true })",
    )
  })

  it('opens cost centers on their dedicated product route instead of a workspace drawer', () => {
    expect(vendorWorkspaceSource).not.toContain('VendorWorkspaceCostCenterDrawer')
    expect(productsTabSource).toContain('/portal/vendors/products/${row.id}/cost-centers')
  })

  it('loads product-type groups only when the active workflow needs them', () => {
    expect(vendorWorkspaceSource).not.toContain('summaryVendors')
    expect(vendorWorkspaceSource).toContain(
      "enabled: importTarget?.kind === 'product' || tab === 'migration' || tab === 'products'",
    )
    expect(vendorWorkspaceSource).toContain('listProductTypeGroups({ page: 1, limit: 100 })')
  })

  it('fits both vendor tables within the workspace viewport', () => {
    expect(productsTabSource).toContain('fillViewport')
    expect(vendorsTabSource).toContain('fillViewport')
  })
})
