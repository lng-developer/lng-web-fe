import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }

export type Paginated<T> = {
  items: T[]
  pagination: { total: number; page: number; limit: number }
}
export type MappingRuleType =
  | 'skuNormalize'
  | 'skuConfig'
  | 'semanticRules'
  | 'valueAliases'
  | 'vendorRouting'
export type MappingContextParams = {
  shopId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  configCode?: string
  productTypeGroupId?: string
  dateFrom?: string
  dateTo?: string
  sampleLimit?: number
}
export type MappingSummary = {
  readyPlanCount: number
  confirmedPlanCount: number
  totalPlanCount: number
  blockedSampleCount: number
  missingSkuConfigCount: number
  missingSemanticRuleCount: number
  missingVendorProductCount: number
  missingVendorCostCenterCount: number
  ambiguousSkuConfigCount: number
  byStatus?: Record<string, number>
  bySelectionMode?: Record<string, number>
}
export type MappingWorkbench = Record<string, unknown> & {
  unmatchedSamples?: UnmatchedMappingItem[]
}
export type NormalizedInput = {
  semanticRole?: string
  label?: string | null
  rawValue?: string | null
  normalizedValue?: string | null
  source?: string | null
  reason?: string | null
}
export type VendorCandidate = {
  id?: string
  vendorId?: string
  vendorName?: string
  vendorProductId: string
  vendorProductName?: string
  vendorCostCenterId: string
  vendorCostCenterCode?: string
  size?: string | null
  color?: string | null
  confidence?: string | null
  matchScore?: number | null
  baseCostAmount?: number | null
  currency?: string | null
  matchReasons?: string[]
}
export type MappingPreview = {
  ready: boolean
  blockingReasons?: string[]
  recommendedFixTypes?: string[]
  skuNormalization?: {
    originalSku?: string | null
    canonicalSku?: string | null
    appliedRuleIds?: string[]
    removedSegments?: unknown[]
    replacedSegments?: unknown[]
  }
  skuMapping?: {
    employeeCode?: string | null
    configCode?: string | null
    dateCode?: string | null
    sequence?: string | null
  }
  listing?: Record<string, unknown> | null
  productTypeGroup?: { id?: string; code?: string; name?: string } | null
  internalTemplate?: { id?: string; code?: string; name?: string } | null
  normalizedInputs?: NormalizedInput[]
  vendorProductCandidates?: VendorCandidate[]
  costCenterCandidates?: VendorCandidate[]
  autoMatch?: VendorCandidate | null
  plan?: FulfillmentPlan | null
}
export type FulfillmentPlan = {
  id?: string
  orderItemId?: string
  status?: string
  selectionMode?: string
  vendorProductId?: string
  vendorCostCenterId?: string
  snapshot?: Record<string, unknown>
}
export type MappingPreviewOrPlan = MappingPreview & { plan?: FulfillmentPlan | null }
export type UnmatchedMappingItem = {
  id: string
  orderItemId?: string
  externalOrderId?: string | null
  sku?: string | null
  asin?: string | null
  shop?: { id: string; name?: string | null } | null
  title?: string | null
  createdAt?: string | null
  blockingReasons: string[]
  recommendedFixTypes?: string[]
  skuNormalization?: MappingPreview['skuNormalization']
  skuMapping?: MappingPreview['skuMapping']
  normalizedInputs?: NormalizedInput[]
}
export type UnmatchedParams = MappingContextParams & {
  page?: number
  limit?: number
}
export type CandidateSearchInput = {
  q?: string
  vendorId?: string
  vendorProductId?: string
  productTypeGroupId?: string
  size?: string
  color?: string
  sku?: string
  lngCode?: string
  includeDifferentProductType?: boolean
  page?: number
  limit?: number
}
export type CandidateResult = Paginated<VendorCandidate> | { items: VendorCandidate[] }
export type CandidateSelection = { vendorProductId: string; vendorCostCenterId: string }
export type RecheckBatchInput = Pick<
  MappingContextParams,
  'shopId' | 'salesChannelCode' | 'marketplaceCode'
> & { limit: number }
export type RecheckBatchResult = { processed?: number; resolved?: number; blocked?: number }
export type MappingRule = Record<string, unknown> & {
  id: string
  name?: string
  status?: 'ACTIVE' | 'INACTIVE'
  priority?: number
  shopId?: string | null
  createdAt?: string
  updatedAt?: string
}
export type MappingRuleInput = Record<string, unknown>
export type RuleListParams = MappingContextParams & {
  page?: number
  limit?: number
  q?: string
  status?: 'ACTIVE' | 'INACTIVE'
}
export type RulePreviewInput = {
  ruleType: MappingRuleType
  rule: MappingRuleInput
  samples?: Array<Record<string, unknown>>
}
export type RulePreviewResult = {
  items?: Array<Record<string, unknown>>
  before?: unknown
  after?: unknown
}
export type RuleConflictInput = {
  ruleId?: string
  ruleType: MappingRuleType
  rule: MappingRuleInput
}
export type RuleConflict = {
  type?: string
  severity?: 'ERROR' | 'WARNING'
  message?: string
  ruleId?: string
}
export type RuleConflictResult = {
  conflicts?: RuleConflict[]
  errors?: RuleConflict[]
  warnings?: RuleConflict[]
  hasExactConflict?: boolean
}
export type RuleHistoryEvent = {
  id: string
  event?: string
  actor?: { displayName?: string | null; email?: string | null } | null
  before?: Record<string, unknown> | null
  after?: Record<string, unknown> | null
  createdAt?: string | null
}
export type AuthorableShopResult = {
  canCreateGlobal: boolean
  items: Array<{ id: string; name?: string; code?: string }>
}

const rulePaths: Record<MappingRuleType, string> = {
  skuNormalize: 'sku-normalize-rules',
  skuConfig: 'sku-config-rules',
  semanticRules: 'semantic-rules',
  valueAliases: 'value-aliases',
  vendorRouting: 'vendor-routing-rules',
}
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data
const compact = <T extends object>(params: T) =>
  Object.fromEntries(Object.entries(params).filter(([, value]) => value !== '' && value != null))

export async function getMappingWorkbench(params: MappingContextParams = {}) {
  return unwrap<MappingWorkbench>(
    await apiClient.get('/api/mapping/config-workbench', { params: compact(params) }),
  )
}
export async function getMappingSummary(params: MappingContextParams = {}) {
  return unwrap<MappingSummary>(
    await apiClient.get('/api/mapping/summary', { params: compact(params) }),
  )
}
export async function listAuthorableShops() {
  return unwrap<AuthorableShopResult>(await apiClient.get('/api/mapping/authorable-shops'))
}
export async function listUnmatchedItems(params: UnmatchedParams = {}) {
  return unwrap<Paginated<UnmatchedMappingItem>>(
    await apiClient.get('/api/mapping/order-items/unmatched', { params: compact(params) }),
  )
}
export async function previewOrderItem(orderItemId: string) {
  return unwrap<MappingPreview>(
    await apiClient.post(`/api/mapping/order-items/${orderItemId}/preview`),
  )
}
export async function resolveOrderItem(orderItemId: string) {
  return unwrap<MappingPreviewOrPlan>(
    await apiClient.post(`/api/mapping/order-items/${orderItemId}/resolve`),
  )
}
export async function recheckOrderItem(orderItemId: string) {
  return unwrap<MappingPreviewOrPlan>(
    await apiClient.post(`/api/mapping/order-items/${orderItemId}/recheck`),
  )
}
export async function recheckUnmatched(input: RecheckBatchInput) {
  return unwrap<RecheckBatchResult>(await apiClient.post('/api/mapping/recheck-unmatched', input))
}
export async function searchVendorCandidates(orderItemId: string, input: CandidateSearchInput) {
  return unwrap<CandidateResult>(
    await apiClient.post(
      `/api/mapping/order-items/${orderItemId}/vendor-candidates/search`,
      compact(input),
    ),
  )
}
export async function selectFulfillmentCandidate(orderItemId: string, input: CandidateSelection) {
  return unwrap<FulfillmentPlan>(
    await apiClient.post(`/api/mapping/order-items/${orderItemId}/select`, input),
  )
}
export async function listMappingRules(type: MappingRuleType, params: RuleListParams = {}) {
  return unwrap<Paginated<MappingRule>>(
    await apiClient.get(`/api/mapping/${rulePaths[type]}`, { params: compact(params) }),
  )
}
export async function createMappingRule(type: MappingRuleType, input: MappingRuleInput) {
  return unwrap<MappingRule>(await apiClient.post(`/api/mapping/${rulePaths[type]}`, input))
}
export async function updateMappingRule(
  type: MappingRuleType,
  id: string,
  input: Partial<MappingRuleInput>,
) {
  return unwrap<MappingRule>(await apiClient.patch(`/api/mapping/${rulePaths[type]}/${id}`, input))
}
export async function previewMappingRule(input: RulePreviewInput) {
  return unwrap<RulePreviewResult>(await apiClient.post('/api/mapping/rule-preview', input))
}
export async function findMappingRuleConflicts(input: RuleConflictInput) {
  return unwrap<RuleConflictResult>(await apiClient.post('/api/mapping/rule-conflicts', input))
}
export async function listMappingRuleHistory(type: MappingRuleType, id: string) {
  return unwrap<{ items: RuleHistoryEvent[] }>(
    await apiClient.get(`/api/mapping/${type}/${id}/history`),
  ).items
}
