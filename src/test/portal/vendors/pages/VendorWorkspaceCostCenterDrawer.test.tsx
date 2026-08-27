import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import { VendorWorkspaceCostCenterDrawer } from '@/features/portal/vendors/pages/VendorWorkspaceCostCenterDrawer'

describe('VendorWorkspaceCostCenterDrawer', () => {
  it('shows the selected cost center shipping and package data', () => {
    render(
      <AppProviders>
        <VendorWorkspaceCostCenterDrawer
          canWrite
          costCenters={[
            {
              id: 'cost-center-1',
              vendorProductId: 'product-1',
              code: 'BLACK-L',
              name: 'Black / L',
              sku: 'VENDOR-BLACK-L',
              lngCode: 'LNG-BLACK-L',
              vendorSize: 'L',
              vendorColor: 'Black',
              standardSize: 'L',
              standardColor: 'Black',
              printMethod: null,
              attributes: {},
              weight: 8.5,
              weightUnit: 'oz',
              width: 10,
              length: 12,
              height: 1,
              dimensionUnit: 'in',
              baseCostAmount: 575,
              currency: 'USD',
              domesticShipping: { economyAmount: 450, additionalAmount: 200 },
              internationalShipping: { economyAmount: 850, additionalAmount: 350 },
              priorityShipping: { economyAmount: 1500, additionalAmount: 600 },
              importTaxAmount: 40,
              additionalCosts: {
                embroideryAmount: 100,
                twoSidedPrintAmount: 75,
                twoPositionPrintAmount: 50,
              },
              status: 'ACTIVE',
            },
          ]}
          costCentersError={undefined}
          costCentersLoading={false}
          costCentersPage={1}
          costCentersTotal={1}
          onAddCostCenter={() => undefined}
          onClose={() => undefined}
          onCostCentersPageChange={() => undefined}
          onEditCostCenter={() => undefined}
          onOpenCostCenterImport={() => undefined}
          onSearchCostCentersChange={() => undefined}
          open
          product={{
            id: 'product-1',
            code: 'TEE-001',
            name: 'Classic tee',
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
          }}
          searchCostCenters=""
        />
      </AppProviders>,
    )

    expect(screen.getByText('Shipping')).toBeVisible()
    expect(screen.getByText('Domestic')).toBeVisible()
    expect(screen.getByText('$4.50')).toBeVisible()
    expect(screen.getByText('8.5 oz')).toBeVisible()
  })
})
