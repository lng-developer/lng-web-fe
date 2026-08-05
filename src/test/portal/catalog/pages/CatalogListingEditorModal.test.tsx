import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { Listing } from '@/features/portal/catalog/api/catalogApi'
import { CatalogListingEditorModal } from '@/features/portal/catalog/pages/CatalogListingEditorModal'
import i18n from '@/shared/i18n/i18n'

const listing: Listing = {
  id: 'listing-1',
  shopId: 'shop-1',
  shop: { id: 'shop-1', name: 'Football' },
  salesChannelCode: 'AMAZON',
  marketplaceCode: 'AMAZON_US',
  sku: 'SKU-1',
  asin: 'B0G4CYCDTJ',
  etsyListingId: null,
  title: 'Shirt',
  baseCostAmount: 0,
  currency: 'USD',
  costCenterStatus: 'MISSING',
  psdStatus: 'MISSING',
  status: 'ACTIVE',
  qcStatus: 'DRAFT',
  salesStats: { orderCount: 0, orderItemCount: 0, quantitySold: 0, lastSoldAt: null },
  createdAt: '2026-08-01T00:00:00.000Z',
  updatedAt: '2026-08-01T00:00:00.000Z',
}

describe('CatalogListingEditorModal', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
  })
  afterEach(cleanup)

  it('keeps identity immutable and submits only PATCH fields when editing', async () => {
    const onSubmit = vi.fn()
    render(
      <AppProviders>
        <CatalogListingEditorModal
          open
          listing={listing}
          shops={[{ id: 'shop-1', name: 'Football', currency: 'USD' }]}
          saving={false}
          onClose={vi.fn()}
          onSubmit={onSubmit}
        />
      </AppProviders>,
    )

    expect(screen.getByText('AMAZON · AMAZON_US · SKU-1')).toBeInTheDocument()
    expect(screen.queryByLabelText('SKU')).not.toBeInTheDocument()
    fireEvent.change(screen.getByLabelText('Title'), { target: { value: 'Updated shirt' } })
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    await waitFor(() => expect(onSubmit).toHaveBeenCalled())
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ title: 'Updated shirt' })
    expect(onSubmit.mock.calls[0][0]).toHaveProperty('asin', 'B0G4CYCDTJ')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('shopId')
    expect(onSubmit.mock.calls[0][0]).not.toHaveProperty('sku')
  })

  it('shows only the marketplace identity field required by the selected channel', () => {
    render(
      <AppProviders>
        <CatalogListingEditorModal
          open
          shops={[{ id: 'shop-1', name: 'Football', currency: 'USD' }]}
          saving={false}
          onClose={vi.fn()}
          onSubmit={vi.fn()}
        />
      </AppProviders>,
    )

    expect(screen.getByLabelText('ASIN')).toBeInTheDocument()
    expect(screen.queryByLabelText('Etsy listing ID')).not.toBeInTheDocument()
  })
})
