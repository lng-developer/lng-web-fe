import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
type CompactRef = { id: string; code?: string; name: string; status?: string }
type AssetRef = {
  assetId: string
  downloadUrl: string
  previewUrl?: string
  originalFilename?: string
}

export type CatalogListParams = {
  page: number
  limit: number
  search?: string
  shopId?: string
  salesChannelCode?: string
  qcStatus?: string
  psdReadinessStatus?: 'MISSING' | 'PRESENT' | 'NOT_REQUIRED'
  productTypeGroupId?: string
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
  productTypeGroup: CompactRef | null
  internalTemplate: CompactRef | null
  previewAssetId: string | null
  previewAsset: AssetRef | null
  psdTemplateAssetId: string | null
  psdTemplateAsset: AssetRef | null
  baseCostAmount: number
  currency: string
  costCenterStatus: string
  psdStatus: string
  psdReadiness: {
    required: boolean
    status: string
    source: string | null
    effectivePsdAssetId: string | null
  } | null
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
export type ProductTypeGroup = CompactRef
export type InternalTemplate = CompactRef & {
  productTypeGroup: CompactRef | null
  requiresPsd: boolean
}
export type ListingOptions = {
  shops: Array<{ id: string; name: string; currency: string; status: string }>
  productTypeGroups: ProductTypeGroup[]
  internalTemplates: InternalTemplate[]
}
export type CreateListingInput = {
  shopId: string
  salesChannelCode: 'AMAZON' | 'ETSY'
  marketplaceCode: string
  sku: string
  title: string
  productTypeGroupId: string
  internalTemplateId?: string | null
  asin?: string | null
  etsyListingId?: string | null
  previewAssetId?: string | null
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
