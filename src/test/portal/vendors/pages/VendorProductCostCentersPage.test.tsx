import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { getVendorProduct, listVendorCostCenters } from '@/features/portal/vendors/api/vendorApi'
import { VendorProductCostCentersPage } from '@/features/portal/vendors/pages/VendorProductCostCentersPage'
import { setGlobalPermissions, setPermissions } from '@/shared/auth/session'
import { queryClient } from '@/shared/query/queryClient'

vi.mock('@/features/portal/vendors/api/vendorApi', () => ({
  getVendorProduct: vi.fn(),
  listVendorCostCenters: vi.fn(),
}))

vi.mock('@/features/portal/vendors/pages/VendorCostCenterEditorModal', () => ({
  VendorCostCenterEditorModal: () => null,
}))

const product = {
  id: 'product-1',
  code: 'TEE',
  name: 'Tee',
  vendor: null,
  productTypeGroup: null,
  externalProductId: null,
  imageUrl: null,
  productUrl: null,
  designTemplateUrl: null,
  minProductionDays: null,
  maxProductionDays: null,
  costCenterCount: 1,
  status: 'ACTIVE',
} as never

const costCenter = {
  id: 'cost-center-1',
  vendorProductId: 'product-1',
  code: 'TEE-XL',
  name: 'Tee XL',
  sku: 'TEE-XL',
  status: 'ACTIVE',
  baseCostAmount: 1750,
  currency: 'USD',
} as never

function renderPage(productId = 'product-1') {
  return render(
    <MemoryRouter initialEntries={[`/portal/vendors/products/${productId}/cost-centers`]}>
      <AppProviders>
        <Routes>
          <Route
            path="/portal/vendors/products/:productId/cost-centers"
            element={<VendorProductCostCentersPage />}
          />
        </Routes>
      </AppProviders>
    </MemoryRouter>,
  )
}

function tableColumnStyles() {
  const table = screen.getAllByRole('table')[0]
  return Array.from(table.querySelectorAll('col')).map((column) => column.getAttribute('style'))
}

describe('VendorProductCostCentersPage table layout', () => {
  afterEach(() => {
    cleanup()
    queryClient.clear()
  })

  beforeEach(() => {
    vi.clearAllMocks()
    setPermissions(['VENDORS:READ'])
    setGlobalPermissions(['VENDORS:READ'])
    vi.mocked(getVendorProduct).mockResolvedValue(product)
  })

  it('keeps the same column geometry when the list is empty or populated', async () => {
    vi.mocked(listVendorCostCenters).mockResolvedValue({
      items: [],
      pagination: { limit: 10, page: 1, total: 0 },
    })
    const emptyView = renderPage()
    await waitFor(() =>
      expect(screen.getByText('No data', { selector: '.ant-empty-description' })).toBeVisible(),
    )
    const emptyColumns = tableColumnStyles()
    expect(emptyColumns[0]).toBe('width: 4%;')
    emptyView.unmount()
    queryClient.clear()

    vi.mocked(listVendorCostCenters).mockResolvedValue({
      items: [costCenter],
      pagination: { limit: 10, page: 1, total: 1 },
    })
    renderPage('product-2')
    await waitFor(() => expect(listVendorCostCenters).toHaveBeenCalledTimes(2))
    expect((await screen.findAllByText('TEE-XL')).length).toBeGreaterThan(0)

    expect(tableColumnStyles()).toEqual(emptyColumns)
  })
})
