import { apiClient } from '@/shared/api'
import type { PrintMethod } from '@/shared/constants/printMethods'

type ApiResponse<T> = { success: boolean; data: T }
type CompactRef = {
  id: string
  code?: string
  name: string
  printMethod?: PrintMethod | null
  status?: string
}
export type CatalogListParams = {
  page: number
  limit: number
  search?: string
  shopId?: string
  salesChannelCode?: string
  qcStatus?: string
  sort?: string
}
export type CatalogSummaryParams = Omit<CatalogListParams, 'page' | 'limit' | 'sort'>
export type Listing = {
  id: string
  shopId: string
  shop: { id: string; name: string } | null
  salesChannelCode: 'AMAZON' | 'ETSY'
  marketplaceCode: string
  sku: string
  asin: string | null
  etsyListingId: string | null
  title: string
  productImageUrl?: string | null
  defaultVariantId?: string | null
  variantCount?: number
  psdReadyCount?: number
  psdVariantCount?: number
  baseCostAmount: number
  currency: string
  costCenterStatus: string
  psdStatus: string
  status: string
  qcStatus: 'DRAFT' | 'APPROVED' | 'REJECTED'
  salesStats: {
    orderCount: number
    orderItemCount: number
    quantitySold: number
    lastSoldAt: string | null
  }
  approvedAt?: string | null
  rejectedAt?: string | null
  rejectionReason?: string | null
  createdAt: string
  updatedAt: string
}
export type CatalogSummary = {
  totalListingCount: number
  noPsdCount: number
  draftCount: number
  approvedCount: number
  rejectedCount: number
}
export type ProductTypeGroup = CompactRef & {
  sortOrder?: number
  printMethod?: PrintMethod | null
  createdAt?: string
  updatedAt?: string
}
export type InternalTemplate = CompactRef & {
  productTypeGroup: CompactRef | null
  requiresPsd: boolean
  description?: string | null
  requiredFieldsCount?: number
  artworkSlotsCount?: number
  designAssetsCount?: number
  requiredFields?: TemplateField[]
  artworkSlots?: ArtworkSlot[]
  designAssets?: DesignAsset[]
}
export type TemplateField = {
  key: string
  label?: string | null
  type: string
  required: boolean
  source?: string | null
  validation?: Record<string, unknown>
  sortOrder?: number
}
export type ArtworkSlot = {
  key: string
  label?: string | null
  type: string
  required: boolean
  acceptedFieldKeys: string[]
  outputRole?: string | null
  sortOrder?: number
}
export type DesignAsset = {
  mediaAssetId: string
  type: string
  version?: string
  label?: string | null
  status?: string
  metadata?: Record<string, unknown>
}
export type ProductTypeGroupInput = {
  code: string
  name: string
  sortOrder?: number
  printMethod?: PrintMethod | null
  status?: string
}
export type InternalTemplateInput = {
  code?: string
  name: string
  description?: string | null
  productTypeGroupId: string
  requiredFields: TemplateField[]
  artworkSlots: ArtworkSlot[]
  designAssets: DesignAsset[]
  requiresPsd: boolean
  status?: string
}
export type ListingOptions = {
  shops: Array<{ id: string; name: string; currency: string; status: string }>
  productTypeGroups: ProductTypeGroup[]
  internalTemplates: InternalTemplate[]
}
export type ListingVariant = {
  id: string
  listingId: string
  productTypeGroup: CompactRef
  internalTemplate: CompactRef | null
  psdTemplateAssetId: string | null
  previewAssetId: string | null
  printMethod?: PrintMethod | null
  scaleDifficulty?: {
    level: 'NORMAL' | 'HARD' | 'SPECIAL'
    reason?: string | null
  } | null
  psdReadiness: {
    required: boolean
    status: 'MISSING' | 'PRESENT' | 'NOT_REQUIRED'
    effectivePsdAssetId: string | null
    source: string | null
  }
  status: string
  createdAt: string
  updatedAt: string
}
export type ListingVariantInput = {
  productTypeGroupId: string
  internalTemplateId?: string | null
  psdTemplateAssetId?: string | null
  previewAssetId?: string | null
  printMethod?: PrintMethod | null
  scaleDifficulty?: {
    level?: 'NORMAL' | 'HARD' | 'SPECIAL'
    reason?: string | null
  }
  status?: string
}
export type CreateListingInput = {
  shopId: string
  salesChannelCode: 'AMAZON' | 'ETSY'
  marketplaceCode: string
  sku: string
  title: string
  asin?: string | null
  etsyListingId?: string | null
  baseCostAmount?: number
  currency?: string
  costCenterStatus?: string
  status?: string
}
export type UpdateListingInput = Omit<
  CreateListingInput,
  'shopId' | 'salesChannelCode' | 'marketplaceCode' | 'sku'
>
export type PaginatedListings = {
  items: Listing[]
  pagination: { total: number; page: number; limit: number }
}

const compact = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export const listListings = async (params: CatalogListParams) =>
  unwrap<PaginatedListings>(
    await apiClient.get('/api/catalog/listings', { params: compact(params) }),
  )
export const getListingSummary = async (params: CatalogSummaryParams) =>
  unwrap<CatalogSummary>(
    await apiClient.get('/api/catalog/listings/summary', { params: compact(params) }),
  )
export const getListing = async (id: string) =>
  unwrap<Listing>(await apiClient.get(`/api/catalog/listings/${id}`))
export const getListingOptions = async () =>
  unwrap<ListingOptions>(await apiClient.get('/api/catalog/listing-options'))
export const createListing = async (input: CreateListingInput) =>
  unwrap<Listing>(await apiClient.post('/api/catalog/listings', input))
export const updateListing = async (id: string, input: UpdateListingInput) =>
  unwrap<Listing>(await apiClient.patch(`/api/catalog/listings/${id}`, input))
export const approveListing = async (id: string) =>
  unwrap<Listing>(await apiClient.post(`/api/catalog/listings/${id}/approve`))
export const rejectListing = async (id: string, rejectionReason: string) =>
  unwrap<Listing>(await apiClient.post(`/api/catalog/listings/${id}/reject`, { rejectionReason }))
export const listListingVariants = async (listingId: string) =>
  unwrap<ListingVariant[]>(await apiClient.get(`/api/catalog/listings/${listingId}/variants`))
export const createListingVariant = async (listingId: string, input: ListingVariantInput) =>
  unwrap<ListingVariant>(await apiClient.post(`/api/catalog/listings/${listingId}/variants`, input))
export const updateListingVariant = async (
  listingId: string,
  variantId: string,
  input: Partial<ListingVariantInput>,
) =>
  unwrap<ListingVariant>(
    await apiClient.patch(`/api/catalog/listings/${listingId}/variants/${variantId}`, input),
  )
export const setDefaultListingVariant = async (listingId: string, variantId: string) =>
  unwrap<ListingVariant>(
    await apiClient.post(`/api/catalog/listings/${listingId}/variants/${variantId}/default`),
  )
export const requestListingVariantPsd = async (listingId: string, variantId: string) =>
  unwrap<{ id: string }>(
    await apiClient.post(`/api/catalog/listings/${listingId}/variants/${variantId}/request-psd`),
  )
export const applyListingVariantPsdToCompatible = async (listingId: string, variantId: string) =>
  unwrap<{
    matchedCount: number
    psdTemplateAssetId: string
    sourceVariantId: string
    updatedVariantIds: string[]
  }>(
    await apiClient.post(
      `/api/catalog/listings/${listingId}/variants/${variantId}/apply-psd-compatible`,
      { onlyMissing: true },
    ),
  )

export const listProductTypeGroups = async (params: {
  page: number
  limit: number
  search?: string
  status?: string
}) =>
  unwrap<{ items: ProductTypeGroup[]; pagination: { total: number; page: number; limit: number } }>(
    await apiClient.get('/api/catalog/product-type-groups', { params: compact(params) }),
  )
export const createProductTypeGroup = async (input: ProductTypeGroupInput) =>
  unwrap<ProductTypeGroup>(await apiClient.post('/api/catalog/product-type-groups', input))
export const updateProductTypeGroup = async (id: string, input: Partial<ProductTypeGroupInput>) =>
  unwrap<ProductTypeGroup>(await apiClient.patch(`/api/catalog/product-type-groups/${id}`, input))
export const listInternalTemplates = async (params: {
  page: number
  limit: number
  q?: string
  productTypeGroupId?: string
  status?: string
}) =>
  unwrap<{ items: InternalTemplate[]; pagination: { total: number; page: number; limit: number } }>(
    await apiClient.get('/api/catalog/internal-templates', { params: compact(params) }),
  )
export const getInternalTemplate = async (id: string) =>
  unwrap<InternalTemplate>(await apiClient.get(`/api/catalog/internal-templates/${id}`))
export const createInternalTemplate = async (input: InternalTemplateInput & { code: string }) =>
  unwrap<InternalTemplate>(await apiClient.post('/api/catalog/internal-templates', input))
export const updateInternalTemplate = async (id: string, input: InternalTemplateInput) =>
  unwrap<InternalTemplate>(await apiClient.patch(`/api/catalog/internal-templates/${id}`, input))
export const uploadCatalogAsset = async (file: File) => {
  const body = new FormData()
  body.append('file', file)
  return unwrap<{
    id: string
    originalFilename: string
    mimeType: string
    size: number
    downloadUrl: string
  }>(await apiClient.post('/api/catalog/assets', body))
}
