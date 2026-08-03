import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type FinanceSnapshot = {
  id: string
  orderItemId: string
  externalOrderId: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  seller: { employeeCode: string | null; name: string | null }
  team: { name: string | null; code: string | null }
  department: { name: string | null; code: string | null }
  revenue: {
    customerPaidAmount: number
    feeAmount: number
    refundAmount: number
    discountAmount: number
    currency: string
  }
  cost: {
    baseCostAmount: number | null
    totalCostAmount: number | null
    costLines: Array<{ code: string; label: string | null; amount: number }>
    costStatus: 'PRESENT' | 'MISSING'
  }
  margin: { grossProfitAmount: number | null; grossMarginBps: number | null }
  orderPnl: {
    additionalFulfillmentCostAmount: number | null
    totalDeductionAmount: number | null
    profitAmount: number | null
  } | null
  snapshotStatus: 'ESTIMATED' | 'MISSING_COST'
  calculatedAt: string
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
export type FinancePage = {
  items: FinanceSnapshot[]
  pagination: { total: number; page: number; limit: number }
  summaryByCurrency: Array<{
    currency: string
    revenueAmount: number
    totalCostAmount: number
    profitAmount: number
    grossMarginBps: number | null
    missingCostCount: number
  }>
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
  dryRun: boolean
  status: string
  processedRows: number
  validRows: number
  skippedRows: number
  unlinkedRows: number
  errorCount: number
  errors: Array<{ row?: number; message?: string; code?: string }>
  createdAt: string
}
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
export async function listFinanceSnapshots(query: FinanceParams) {
  return unwrap<FinancePage>(
    await apiClient.get('/api/finance/snapshots', { params: params(query) }),
  )
}
export async function listFinanceFilterOptions() {
  return unwrap<FinanceFilterOptions>(await apiClient.get('/api/finance/filter-options'))
}
export async function recalculateOrderItem(orderItemId: string) {
  return unwrap(await apiClient.post(`/api/finance/order-items/${orderItemId}/recalculate`))
}
export async function listImportBatches(query: Record<string, unknown> = {}) {
  return unwrap<{
    items: ImportBatch[]
    pagination: { total: number; page: number; limit: number }
  }>(await apiClient.get('/api/finance/import-batches', { params: params(query) }))
}
export async function reprocessImportBatch(id: string) {
  return unwrap(await apiClient.post(`/api/finance/import-batches/${id}/reprocess`))
}
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
