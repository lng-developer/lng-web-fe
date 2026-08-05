import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@/shared/api', () => ({ apiClient: { get: vi.fn(), post: vi.fn(), patch: vi.fn() } }))

import {
  approveListing,
  createInternalTemplate,
  createListing,
  type CreateListingInput,
  createListingVariant,
  createProductTypeGroup,
  getListing,
  getListingOptions,
  getListingSummary,
  listInternalTemplates,
  listListings,
  listListingVariants,
  listProductTypeGroups,
  rejectListing,
  requestListingVariantPsd,
  setDefaultListingVariant,
  updateListing,
  updateListingVariant,
  uploadCatalogAsset,
} from '@/features/portal/catalog/api/catalogApi'
import { apiClient } from '@/shared/api'

describe('catalogApi', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(apiClient.get).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.post).mockResolvedValue({ data: {} })
    vi.mocked(apiClient.patch).mockResolvedValue({ data: {} })
  })

  it('uses Catalog list, summary, detail, options, and mutation contracts', async () => {
    const createInput: CreateListingInput = {
      shopId: 'shop-1',
      salesChannelCode: 'AMAZON',
      marketplaceCode: 'AMAZON_US',
      sku: 'SKU-1',
      title: 'Shirt',
    }
    await listListings({ page: 1, limit: 20, search: '' })
    await getListingSummary({ shopId: 'shop-1' })
    await getListing('listing-1')
    await getListingOptions()
    await createListing(createInput)
    await updateListing('listing-1', { title: 'Updated' })
    await approveListing('listing-1')
    await rejectListing('listing-1', 'Missing setup')
    await listProductTypeGroups({ page: 1, limit: 20 })
    await createProductTypeGroup({ code: 'SHIRT', name: 'Shirt' })
    await listInternalTemplates({ page: 1, limit: 20 })
    await createInternalTemplate({
      code: 'SHIRT_MAIN',
      name: 'Main',
      productTypeGroupId: 'group-1',
      requiredFields: [],
      artworkSlots: [],
      designAssets: [],
      requiresPsd: true,
    })
    const file = new File(['asset'], 'template.psd', { type: 'application/octet-stream' })
    await uploadCatalogAsset(file)
    await listListingVariants('listing-1')
    await createListingVariant('listing-1', { productTypeGroupId: 'group-1' })
    await updateListingVariant('listing-1', 'variant-1', { status: 'INACTIVE' })
    await setDefaultListingVariant('listing-1', 'variant-1')
    await requestListingVariantPsd('listing-1', 'variant-1')

    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings', {
      params: { page: 1, limit: 20 },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings/summary', {
      params: { shopId: 'shop-1' },
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings/listing-1')
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listing-options')
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings', createInput)
    expect(apiClient.patch).toHaveBeenCalledWith('/api/catalog/listings/listing-1', {
      title: 'Updated',
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings/listing-1/approve')
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings/listing-1/reject', {
      rejectionReason: 'Missing setup',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/product-type-groups', {
      params: { page: 1, limit: 20 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/product-type-groups', {
      code: 'SHIRT',
      name: 'Shirt',
    })
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/internal-templates', {
      params: { page: 1, limit: 20 },
    })
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/assets', expect.any(FormData))
    expect(apiClient.get).toHaveBeenCalledWith('/api/catalog/listings/listing-1/variants')
    expect(apiClient.post).toHaveBeenCalledWith('/api/catalog/listings/listing-1/variants', {
      productTypeGroupId: 'group-1',
    })
    expect(apiClient.patch).toHaveBeenCalledWith(
      '/api/catalog/listings/listing-1/variants/variant-1',
      { status: 'INACTIVE' },
    )
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/catalog/listings/listing-1/variants/variant-1/default',
    )
    expect(apiClient.post).toHaveBeenCalledWith(
      '/api/catalog/listings/listing-1/variants/variant-1/request-psd',
    )
  })
})
