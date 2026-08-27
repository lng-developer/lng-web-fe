import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { VendorWorkspaceProductsTabPage } from '@/features/portal/vendors/pages/VendorWorkspaceProductsTabPage'

describe('VendorWorkspaceProductsTabPage', () => {
  it('keeps the vendor code under the vendor name instead of a separate column', () => {
    render(
      <AppProviders>
        <VendorWorkspaceProductsTabPage
          canWrite
          onAddProduct={() => undefined}
          onEditProduct={() => undefined}
          onOpenCostCenters={() => undefined}
          onOpenProductImport={() => undefined}
          onProductStatusChange={() => undefined}
          onProductsPageChange={() => undefined}
          onProductTypeGroupFilterChange={() => undefined}
          onSearchProductsChange={() => undefined}
          onVendorFilterChange={() => undefined}
          productStatus={undefined}
          productTypeGroupFilter={undefined}
          productTypeGroupOptions={[]}
          products={[
            {
              id: 'product-1',
              code: 'TEE-001',
              name: 'Classic Unisex T-Shirt',
              vendor: {
                id: 'vendor-1',
                code: 'MERCHIZE',
                name: 'Merchize',
                providerKey: null,
                fulfillmentType: 'POD',
                status: 'ACTIVE',
              },
              productTypeGroup: null,
              externalProductId: null,
              imageUrl: null,
              productUrl: null,
              designTemplateUrl: null,
              minProductionDays: null,
              maxProductionDays: null,
              costCenterCount: 0,
              status: 'ACTIVE',
            },
          ]}
          productsError={undefined}
          productsLoading={false}
          productsPage={1}
          productsTotal={1}
          searchProducts=""
          vendorFilter={undefined}
          vendorFilterOptions={[]}
        />
      </AppProviders>,
    )

    expect(screen.getByRole('columnheader', { name: 'Vendor' })).toBeVisible()
    expect(screen.queryByRole('columnheader', { name: 'Vendor code' })).not.toBeInTheDocument()
    expect(screen.getByText('MERCHIZE')).toBeVisible()
  })
})
