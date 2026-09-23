import { ApiResponse, Paginated } from '@/server/type'
import { apiClient } from '@/shared/api'
import type { PrintMethod } from '@/shared/constants/printMethods'

export type RecordStatus = 'ACTIVE' | 'INACTIVE'
export type VendorFulfillmentType = 'FBM' | 'FBA' | 'POD' | 'DROPSHIP' | 'CUSTOM'
export type VendorIntegrationAuthType = 'API_KEY' | 'ACCESS_REFRESH' | 'LOGIN_PASSWORD'
export type VendorIntegrationStatus = 'CONNECTED' | 'DISCONNECTED'
export type VendorIntegrationMode = 'MANUAL' | 'GENERIC_API' | 'NATIVE'

export type Vendor = {
  id: string
  code: string
  name: string
  providerKey: string | null
  fulfillmentType: VendorFulfillmentType | null
  unitSurchargeAmount?: number | null
  status: RecordStatus
  metadata?: Record<string, unknown>
}

export type VendorProduct = {
  id: string
  vendor: Pick<Vendor, 'code' | 'id' | 'name' | 'providerKey' | 'fulfillmentType' | 'status'> | null
  productTypeGroup: { id: string; code?: string; name?: string; status?: RecordStatus } | null
  code: string
  name: string
  externalProductId: string | null
  imageUrl: string | null
  productUrl: string | null
  designTemplateUrl: string | null
  minProductionDays: number | null
  maxProductionDays: number | null
  baseCostAmount?: number
  unitSurchargeAmount?: number | null
  currency?: string
  costCenterCount: number
  status: RecordStatus
  metadata?: Record<string, unknown>
}

export type ShippingCost = { economyAmount?: number; additionalAmount?: number }
export type AdditionalCosts = {
  embroideryAmount?: number
  twoSidedPrintAmount?: number
  twoPositionPrintAmount?: number
}

export type VendorCostCenter = {
  id: string
  vendorProductId: string
  code: string
  name: string
  sku: string | null
  lngCode: string | null
  vendorSize: string | null
  vendorColor: string | null
  standardSize: string | null
  standardColor: string | null
  printMethod: PrintMethod | null
  attributes: Record<string, unknown>
  weight: number | null
  weightUnit: string | null
  width: number | null
  length: number | null
  height: number | null
  dimensionUnit: string | null
  baseCostAmount?: number
  unitSurchargeAmount?: number | null
  currency?: string
  domesticShipping: ShippingCost
  internationalShipping: ShippingCost
  priorityShipping: ShippingCost
  importTaxAmount?: number
  additionalCosts: AdditionalCosts
  status: RecordStatus
  metadata?: Record<string, unknown>
}

export type VendorIntegrationConfig = {
  id: string
  vendorId: string
  mode?: VendorIntegrationMode
  adapterKey?: string | null
  providerKey: string | null
  baseUrl: string | null
  orderEndpointUrl?: string | null
  trackingEndpointUrl?: string | null
  pushOrderEndpointUrl?: string | null
  authType: VendorIntegrationAuthType | null
  status: VendorIntegrationStatus
  expiresAt: string | null
  lastCheckedAt: string | null
  lastError: string | null
  accessTokenConfigured: boolean
  refreshTokenConfigured: boolean
  usernameConfigured: boolean
  passwordConfigured: boolean
  apiKeyConfigured?: boolean
  apiSecretConfigured?: boolean
  metadata: Record<string, unknown>
}

export type LenfulOrder = {
  id: string
  orderNumber: string
  shortId: string | null
  status: string | null
  paymentStatus: string | null
  currency: string | null
  totalItems: number | null
  totalPrice: number | null
  createdAt: string | null
  shippingMethod: { name: string | null; description: string | null; price: number | null } | null
  items: Array<{
    id: string
    productId: string | null
    productName: string | null
    quantity: number | null
    fulfillment: string | null
    status: string | null
    variant: { id: string | null; name: string | null; sku: string | null } | null
  }>
}

export type VendorMigrationReviewItem = {
  id: string
  vendorCode: string | null
  vendorName: string | null
  code: string
  name: string
  externalProductId: string | null
  imageUrl: string | null
  variantCount: number
}
export type VendorMigrationReview = Paginated<VendorMigrationReviewItem> & {
  summary: { pending: number; ready: number; orphaned: number }
}

export type VendorListParams = {
  page?: number
  limit?: number
  q?: string
  status?: RecordStatus
  providerKey?: string
  fulfillmentType?: VendorFulfillmentType
}
export type ProductListParams = VendorListParams & {
  vendorId?: string
  productTypeGroupId?: string
}
export type CostCenterListParams = VendorListParams

export type VendorInput = {
  code: string
  name: string
  providerKey?: string | null
  fulfillmentType: VendorFulfillmentType
  unitSurchargeAmount?: number | null
  status?: RecordStatus
  metadata?: Record<string, unknown>
}
export type VendorUpdateInput = Omit<Partial<VendorInput>, 'code'>
export type VendorProductInput = {
  vendorId: string
  productTypeGroupId: string
  code: string
  name: string
  externalProductId?: string | null
  imageUrl?: string | null
  productUrl?: string | null
  designTemplateUrl?: string | null
  minProductionDays?: number | null
  maxProductionDays?: number | null
  baseCostAmount?: number
  unitSurchargeAmount?: number | null
  currency?: string
  status?: RecordStatus
  metadata?: Record<string, unknown>
}
export type VendorProductUpdateInput = Omit<Partial<VendorProductInput>, 'code' | 'vendorId'>
export type VendorCostCenterInput = Omit<Partial<VendorCostCenter>, 'id' | 'vendorProductId'> & {
  code: string
  name: string
}
export type VendorCostCenterUpdateInput = Omit<Partial<VendorCostCenterInput>, 'code'>
export type VendorImportRow = Record<string, string>
export type VendorProductImportPayload = {
  vendorId: string
  rows: VendorImportRow[]
  dryRun?: boolean
}
export type VendorCostCenterImportPayload = {
  rows: Array<Record<string, unknown>>
  dryRun?: boolean
}
export type VendorImportSummary = {
  total: number
  created: number
  failed: string[]
}
export type VendorTemplateImportPayload = {
  vendors: VendorImportRow[]
  vendorProducts: VendorImportRow[]
  vendorCostCenters: VendorImportRow[]
  dryRun: boolean
}
export type VendorTemplateImportSummary = {
  dryRun: boolean
  valid: boolean
  counts: { vendors: number; vendorProducts: number; vendorCostCenters: number }
  created: { vendors: number; vendorProducts: number; vendorCostCenters: number }
  updated: { vendors: number; vendorProducts: number; vendorCostCenters: number }
  skipped: { vendors: number; vendorProducts: number; vendorCostCenters: number }
  errors: Array<{ type?: string; message?: string; [key: string]: unknown }>
}
export type VendorIntegrationConfigInput = {
  mode?: VendorIntegrationMode
  adapterKey?: string | null
  providerKey: string
  baseUrl: string
  orderEndpointUrl?: string | null
  trackingEndpointUrl?: string | null
  pushOrderEndpointUrl?: string | null
  authType: VendorIntegrationAuthType
  accessToken?: string
  refreshToken?: string
  username?: string
  password?: string
  apiKey?: string
  apiSecret?: string
  expiresAt?: string | null
  status?: VendorIntegrationStatus
  metadata?: Record<string, unknown>
}

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

function toListParams<T extends { q?: string }>({ q, ...params }: T) {
  const search = q?.trim()
  return { ...params, ...(search ? { q: search } : {}) }
}

export async function listVendors(params: VendorListParams = {}) {
  return unwrap<Paginated<Vendor>>(
    await apiClient.get('/api/vendors', { params: toListParams(params) }),
  )
}

export async function getVendor(vendorId: string) {
  return unwrap<Vendor>(await apiClient.get(`/api/vendors/${vendorId}`))
}

export async function createVendor(input: VendorInput) {
  return unwrap<Vendor>(await apiClient.post('/api/vendors', input))
}

export async function updateVendor(vendorId: string, input: VendorUpdateInput) {
  return unwrap<Vendor>(await apiClient.patch(`/api/vendors/${vendorId}`, input))
}

export async function listVendorProducts(params: ProductListParams = {}) {
  return unwrap<Paginated<VendorProduct>>(
    await apiClient.get('/api/vendors/products', { params: toListParams(params) }),
  )
}

export async function getVendorProduct(productId: string) {
  return unwrap<VendorProduct>(await apiClient.get(`/api/vendors/products/${productId}`))
}

export async function createVendorProduct(input: VendorProductInput) {
  return unwrap<VendorProduct>(await apiClient.post('/api/vendors/products', input))
}

export async function importVendorProducts(payload: VendorProductImportPayload) {
  return unwrap<VendorImportSummary>(await apiClient.post('/api/vendors/products/import', payload))
}

export async function importVendorTemplate(payload: VendorTemplateImportPayload) {
  return unwrap<VendorTemplateImportSummary>(
    await apiClient.post('/api/vendors/catalog-import', payload),
  )
}

export async function updateVendorProduct(productId: string, input: VendorProductUpdateInput) {
  return unwrap<VendorProduct>(await apiClient.patch(`/api/vendors/products/${productId}`, input))
}

export async function listVendorMigrationReview(
  params: { page?: number; limit?: number; q?: string; vendorId?: string } = {},
) {
  return unwrap<VendorMigrationReview>(
    await apiClient.get('/api/vendors/migration/review', { params: toListParams(params) }),
  )
}

export async function bulkAssignVendorMigrationProductTypeGroup(input: {
  productIds: string[]
  productTypeGroupId: string
}) {
  return unwrap<{ updated: number }>(
    await apiClient.patch('/api/vendors/migration/review/product-type-group', input),
  )
}

export async function listVendorCostCenters(productId: string, params: CostCenterListParams = {}) {
  return unwrap<Paginated<VendorCostCenter>>(
    await apiClient.get(`/api/vendors/products/${productId}/cost-centers`, {
      params: toListParams(params),
    }),
  )
}

export async function createVendorCostCenter(productId: string, input: VendorCostCenterInput) {
  return unwrap<VendorCostCenter>(
    await apiClient.post(`/api/vendors/products/${productId}/cost-centers`, input),
  )
}

export async function importVendorCostCenters(
  productId: string,
  payload: VendorCostCenterImportPayload,
) {
  return unwrap<VendorImportSummary>(
    await apiClient.post(`/api/vendors/products/${productId}/cost-centers/import`, payload),
  )
}

export async function updateVendorCostCenter(
  productId: string,
  costCenterId: string,
  input: VendorCostCenterUpdateInput,
) {
  return unwrap<VendorCostCenter>(
    await apiClient.patch(`/api/vendors/products/${productId}/cost-centers/${costCenterId}`, input),
  )
}

export async function getVendorIntegrationConfig(
  vendorId: string,
): Promise<VendorIntegrationConfig | null> {
  const config = unwrap<VendorIntegrationConfig & Record<string, unknown>>(
    await apiClient.get(`/api/vendors/${vendorId}/integration`),
  )
  if (!config) return null
  const {
    accessToken: ignoredAccessToken,
    password: ignoredPassword,
    refreshToken: ignoredRefreshToken,
    username: ignoredUsername,
    ...redacted
  } = config
  void ignoredAccessToken
  void ignoredPassword
  void ignoredRefreshToken
  void ignoredUsername
  return redacted as VendorIntegrationConfig
}

export async function updateVendorIntegrationConfig(
  vendorId: string,
  input: VendorIntegrationConfigInput,
) {
  return unwrap<VendorIntegrationConfig>(
    await apiClient.patch(`/api/vendors/${vendorId}/integration`, input),
  )
}

export async function deleteVendorIntegrationConfig(vendorId: string) {
  return unwrap<{ deleted: boolean }>(
    await apiClient.delete(`/api/vendors/${vendorId}/integration`),
  )
}

export async function testVendorIntegrationConnection(vendorId: string) {
  return unwrap<VendorIntegrationConfig>(
    await apiClient.post(`/api/vendors/${vendorId}/integration/test-connection`),
  )
}

export async function getLenfulOrder(vendorId: string, orderNumber: string) {
  return unwrap<LenfulOrder>(
    await apiClient.get(`/api/vendors/${vendorId}/integration/lenful/order`, {
      params: { orderNumber: orderNumber.trim() },
    }),
  )
}

export async function refreshVendorIntegrationCredential(
  vendorId: string,
  input: { providerKey: string },
) {
  return unwrap<
    Pick<VendorIntegrationConfig, 'authType' | 'baseUrl' | 'expiresAt' | 'providerKey' | 'status'>
  >(await apiClient.post(`/api/vendors/${vendorId}/integration/refresh`, input))
}
