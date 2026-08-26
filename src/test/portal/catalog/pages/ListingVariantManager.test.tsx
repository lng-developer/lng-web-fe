import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { AppProviders } from '@/app/providers/AppProviders'
import type { Listing } from '@/features/portal/catalog/api/catalogApi'
import { ListingVariantManager } from '@/features/portal/catalog/pages/ListingVariantManager'
import i18n from '@/shared/i18n/i18n'

const { requestListingVariantPsd } = vi.hoisted(() => ({ requestListingVariantPsd: vi.fn() }))

vi.mock('@/features/portal/catalog/api/catalogApi', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/features/portal/catalog/api/catalogApi')>()),
  listListingVariants: vi.fn().mockResolvedValue([
    {
      id: 'variant-1',
      listingId: 'listing-1',
      productTypeGroup: { id: 'group-1', name: 'Unisex Hoodie' },
      internalTemplate: { id: 'template-1', name: 'Hoodie template' },
      psdTemplateAssetId: null,
      previewAssetId: null,
      psdReadiness: { required: true, status: 'MISSING', source: null },
      status: 'ACTIVE',
    },
  ]),
  requestListingVariantPsd,
}))

describe('ListingVariantManager', () => {
  beforeEach(async () => {
    requestListingVariantPsd.mockReset()
    await i18n.changeLanguage('en')
  })

  it('uses staff actions instead of raw asset ID fields', async () => {
    render(
      <AppProviders>
        <ListingVariantManager
          listing={{ id: 'listing-1' } as Listing}
          productTypes={[{ id: 'group-1', name: 'Unisex Hoodie' }]}
          templates={[
            {
              id: 'template-1',
              name: 'Hoodie template',
              productTypeGroup: { id: 'group-1', name: 'Unisex Hoodie' },
            } as never,
          ]}
          canWrite
        />
      </AppProviders>,
    )

    expect(
      await screen.findByRole('button', { name: i18n.t('portal.catalog.variants.requestPsd') }),
    ).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: i18n.t('portal.catalog.variants.edit') }))
    await waitFor(() =>
      expect(screen.getByText(i18n.t('portal.catalog.variants.editTitle'))).toBeInTheDocument(),
    )
    expect(screen.queryByLabelText('PSD asset ID')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Preview asset ID')).not.toBeInTheDocument()
  }, 15_000)
})
