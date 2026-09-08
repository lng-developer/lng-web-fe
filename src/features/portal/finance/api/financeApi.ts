import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type FinanceSnapshot = {
  id: string
  orderId: string
  orderItemId: string
  shopId?: string | null
  externalOrderId: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  seller: { employeeCode: string | null; name: string | null }
  team: { name: string | null; code: string | null }
  department: { name: string | null; code: string | null }
  revenue: {
    customerPaidAmount: number
    feeAmount: number
    feeSource?: string | null
    refundAmount: number
    discountAmount: number
    currency: string
  }
  cost: {
    baseCostAmount: number | null
    totalCostAmount: number | null
    costLines: Array<{ code: string; label: string | null; amount: number }>
    costStatus: 'PRESENT' | 'MISSING'
    missingCostReason: string | null
  }
  margin: { grossProfitAmount: number | null; grossMarginBps: number | null }
  orderPnl: {
    marketplaceFeeAmount: number
    refundAmount: number
    discountAmount: number
    baseCostAmount: number | null
    additionalFulfillmentCostAmount: number | null
    totalCostAmount: number | null
    totalDeductionAmount: number | null
    profitAmount: number | null
  } | null
  snapshotStatus: 'ESTIMATED' | 'MISSING_COST'
  calculatedAt: string
  calculationHistory: Array<{
    calculatedAt: string
    snapshotStatus: 'ESTIMATED' | 'MISSING_COST'
    costStatus: 'PRESENT' | 'MISSING'
    missingCostReason: string | null
  }>
}
export type OrderFinanceSummary = {
  orderId: string
  itemCount: number
  currency: string | null
  customerPaidAmount: number
  baseCostAmount: number | null
  totalCostAmount: number | null
  grossProfitAmount: number | null
  grossMarginBps: number | null
  missingCostCount: number
  snapshots: FinanceSnapshot[]
}
export type FinanceParams = {
  page?: number
  limit?: number
  externalOrderId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  snapshotStatus?: string
  costStatus?: string
  sellerEmployeeCode?: string
  teamId?: string
  departmentId?: string
  dateFrom?: string
  dateTo?: string
}
export type FinanceSnapshotSummary = {
  currency: string
  orderCount: number
  revenueAmount: number
  marketplaceFeeAmount: number
  refundAmount: number
  discountAmount: number
  baseCostAmount: number | null
  additionalFulfillmentCostAmount: number
  knownCostAmount: number
  totalCostAmount: number | null
  profitAmount: number
  grossMarginBps: number | null
  missingCostCount: number
}
export type FinancePage = {
  items: FinanceSnapshot[]
  pagination: { total: number; page: number; limit: number }
  summaryByCurrency: FinanceSnapshotSummary[]
}
type FinancePageResponse = FinancePage & Partial<FinancePage['pagination']>
type Paginated<T> = {
  items: T[]
  pagination?: { total: number; page: number; limit: number }
  total?: number
  page?: number
  limit?: number
}
export type FinanceFilterOptions = {
  channels: string[]
  marketplaces: string[]
  sellers: Array<{ employeeCode: string; name: string | null }>
  teams: Array<{ id: string; code: string | null; name: string | null }>
  departments: Array<{ id: string; code: string | null; name: string | null }>
}
export type ImportBatch = {
  id: string
  sourceType: string
  originalFilename: string
  contentHash?: string | null
  sourceRef?: string | null
  shopId?: string | null
  salesChannelCode?: string | null
  marketplaceCode?: string | null
  dryRun: boolean
  status: string
  processedRows: number
  validRows: number
  skippedRows: number
  unlinkedRows: number
  errorCount: number
  errors: Array<{ row?: number; field?: string; message?: string; code?: string }>
  recalculationStatus?: string
  recalculationTotal?: number
  recalculationCompleted?: number
  recalculationFailed?: number
  finishedAt?: string | null
  createdAt: string
}
export type AdsUnassignedRow = {
  id: string
  reportDate: string
  advertiserAccountId: string | null
  campaignId: string | null
  campaignName: string | null
  portfolioId: string | null
  portfolioName: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  status: 'PENDING' | 'RESOLVED'
}
export type AdsShopMappingInput = {
  advertiserAccountId: string
  matchType: 'CAMPAIGN' | 'PORTFOLIO'
  externalId: string
  shopId: string
  salesChannelCode?: string
  marketplaceCode?: string
  active?: boolean
}
export type ImportedFinanceData = Record<string, unknown> & { id: string }
export type FinanceImportInput = {
  kind: 'transactions' | 'settlements' | 'ads'
  file: File
  shopId: string
  salesChannelCode: string
  marketplaceCode: string
  dryRun: boolean
}

const params = (value: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ''))
const normalizePagination = <T extends Paginated<unknown>>(
  data: T,
  fallback: { page?: number; limit?: number } = {},
) => ({
  ...data,
  pagination: data.pagination ?? {
    total: data.total ?? 0,
    page: data.page ?? fallback.page ?? 1,
    limit: data.limit ?? fallback.limit ?? 20,
  },
})
export async function listFinanceSnapshots(query: FinanceParams) {
  const data = unwrap<FinancePageResponse>(
    await apiClient.get('/api/finance/snapshots', { params: params(query) }),
  )
  return normalizePagination(data, query)
}
export async function exportFinanceSnapshotsCsv(query: FinanceParams) {
  const response = await apiClient.get('/api/finance/snapshots/export.csv', {
    params: params({ ...query, page: 1, limit: 5000 }),
    responseType: 'blob',
  })
  return response as unknown as Blob
}
export async function listFinanceFilterOptions() {
  return unwrap<FinanceFilterOptions>(await apiClient.get('/api/finance/filter-options'))
}
export async function getOrderFinanceSummary(orderId: string) {
  return unwrap<OrderFinanceSummary>(await apiClient.get(`/api/finance/orders/${orderId}/summary`))
}
export async function recalculateOrder(orderId: string) {
  return unwrap(await apiClient.post(`/api/finance/orders/${orderId}/recalculate`))
}
export async function listImportBatches(query: Record<string, unknown> = {}) {
  const data = unwrap<Paginated<ImportBatch>>(
    await apiClient.get('/api/finance/import-batches', { params: params(query) }),
  )
  return normalizePagination(data, {
    page: Number(query.page) || 1,
    limit: Number(query.limit) || 20,
  })
}
export async function listAdsUnassignedRows(query: Record<string, unknown> = {}) {
  const data = unwrap<Paginated<AdsUnassignedRow>>(
    await apiClient.get('/api/finance/ads-unassigned-rows', { params: params(query) }),
  )
  return normalizePagination(data, query)
}
export async function upsertAdsShopMapping(input: AdsShopMappingInput) {
  return unwrap(await apiClient.put('/api/finance/ads-shop-mappings', input))
}
export const getFinanceImportBatch = async (id: string) =>
  unwrap<ImportBatch>(await apiClient.get(`/api/finance/import-batches/${id}`))
export async function listImportedFinanceData(
  sourceType: 'transactions' | 'settlements' | 'ads',
  query: Record<string, unknown> = {},
) {
  const data = unwrap<Paginated<ImportedFinanceData>>(
    await apiClient.get(`/api/finance/imported-data/${sourceType}`, { params: params(query) }),
  )
  return normalizePagination(data, query)
}
export async function reprocessImportBatch(id: string) {
  return unwrap(await apiClient.post(`/api/finance/import-batches/${id}/reprocess`))
}
export const getOrderItemFinanceSnapshot = async (id: string) =>
  unwrap<FinanceSnapshot | null>(await apiClient.get(`/api/finance/order-items/${id}/snapshot`))
export const recalculateOrderItem = async (id: string) =>
  unwrap(await apiClient.post(`/api/finance/order-items/${id}/recalculate`))
export async function importFinanceFile(
  kind: 'transactions' | 'settlements' | 'ads',
  file: File,
  context: { shopId: string; salesChannelCode: string; marketplaceCode: string; dryRun: boolean },
) {
  const body = new FormData()
  body.append('file', file)
  Object.entries(context).forEach(([key, value]) => body.append(key, String(value)))
  return unwrap(await apiClient.post(`/api/finance/imports/${kind}`, body))
}
