import { apiClient } from '@/shared/api'
import { compactParams, unwrapResponse } from '@/shared/api/helpers'

const unwrap = unwrapResponse

// Existing chart slots retain their keys; their values come only from explicit BE stages.
function canonicalProfitRow<T extends ProfitStages>(row: T) {
  return {
    ...row,
    grossProfitAmount: row.profitBeforeAdsAmount ?? null,
    netProfitAmount: row.profitAfterOperatingCostsAmount ?? null,
    netMarginBps: row.profitAfterOperatingCostsMarginBps ?? null,
    grossMarginBps: row.profitBeforeAdsMarginBps ?? null,
  }
}

export type ReportFilters = {
  currency?: string
  externalOrderId?: string
  dateBasis?: 'ORDERED_AT' | 'CALCULATED_AT'
  dateFrom?: string
  dateTo?: string
  shopId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  sellerEmployeeCode?: string
  adStatus?: 'ENABLED' | 'PAUSED' | 'ARCHIVED'
  sellerAttributionSource?: 'CAMPAIGN_NAME' | 'PORTFOLIO_NAME' | 'UNASSIGNED'
  teamId?: string
  departmentId?: string
  costCoverage?: 'MISSING' | 'COMPLETE'
  financialStatus?: 'ACTIVE' | 'CANCELLED' | 'PARTIALLY_REFUNDED' | 'REFUNDED'
  page?: number
  limit?: number
}
export type FinanceCoverage = {
  missingSnapshotCount?: number
  migrationPendingCount?: number
  allocatedFeeCount?: number
  currency: string | null
  itemCount: number
  actualCount: number
  estimatedCount: number
  incompleteCostCount: number
  missingDateCount: number
  latestCalculatedAt: string | null
}

type ProfitStages = {
  profitBeforeAdsMarginBps?: number | null
  profitAfterOperatingCostsMarginBps?: number | null
  operatingCostCoverage?: string
  profitBeforeAdsAmount?: number | null
  profitAfterAdsAmount?: number | null
  profitAfterOperatingCostsAmount?: number | null
  adsCoverage?: string
}

export type FinanceDaily = ProfitStages & {
  date: string
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
  netRevenueAmount?: number
  baseCostAmount: number
  totalCostAmount?: number | null
  additionalFulfillmentCostAmount?: number | null
  marketplaceFeeAmount?: number
  refundAmount?: number
  cancelledCount?: number
  partiallyRefundedCount?: number
  refundedCount?: number
  discountAmount?: number
  grossProfitAmount: number | null
  grossMarginBps: number | null
  missingCostCount: number
  adSpendAmount?: number
  netProfitAmount?: number | null
  netMarginBps?: number | null
}

export type SellerPerformance = ProfitStages & {
  sellerEmployeeCode: string | null
  sellerName: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
  netRevenueAmount?: number
  baseCostAmount: number
  grossProfitAmount: number | null
  partialGrossProfitAmount?: number
  costedItemCount?: number
  operatingCostAmount: number
  adSpendAmount?: number
  netProfitAmount: number | null
  partialNetProfitAmount?: number | null
  netMarginBps: number | null
  missingCostCount: number
}

export type TeamPerformance = SellerPerformance & {
  teamId: string | null
  teamName: string | null
  teamCode: string | null
  departmentName: string | null
  activeSellerCount: number
}

export type BuyerInsights = {
  knownBuyerCount: number
  newBuyerCount: number
  returningBuyerCount: number
  repeatBuyerCount: number
  unidentifiedOrderCount: number
  totalOrderCount: number
}

export type ChannelPerformance = {
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  spendAmount: number
  attributedSalesAmount: number
  impressions: number
  clicks: number
  attributedOrdersCount: number
  newBuyerCount: number
  ctrBps: number | null
  conversionBps: number | null
  cpaAmount: number | null
}

export type SellerDailyProfit = SellerPerformance & {
  date: string
  orderIds?: string[]
  orderCount: number
  totalCostAmount: number | null
  additionalFulfillmentCostAmount: number | null
  marketplaceFeeAmount: number
  refundAmount: number
  cancelledCount?: number
  partiallyRefundedCount?: number
  refundedCount?: number
  discountAmount: number
  taxAmount: number
}

export type AdsDaily = {
  reportDate: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  spendAmount: number
  attributedSalesAmount: number
  impressions: number
  clicks: number
  attributedOrdersCount: number
  ctrBps: number | null
  conversionBps: number | null
  cpaAmount: number | null
}

export type AdsSellerDaily = Omit<
  AdsDaily,
  'reportDate' | 'salesChannelCode' | 'marketplaceCode'
> & {
  date: string | null
  sellerEmployeeCode: string
  sellerName: string | null
}

export type OrderItemThumbnail = {
  orderItemId: string
  title: string | null
  sku: string | null
  asin: string | null
  quantity: number
  imageUrl: string | null
}

export type OrderProfitability = {
  estimatedFulfillmentCostAmount?: number | null
  actualVendorTotalAmount?: number | null
  costVarianceAmount?: number | null
  costSource?: string
  orderId: string | null
  externalOrderId: string | null
  orderedAt: string | null
  reportDate: string | null
  shopId: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  sellerEmployeeCode?: string | null
  sellerName?: string | null
  teamId?: string | null
  teamName?: string | null
  departmentName?: string | null
  productImageUrl?: string | null
  productTitle?: string | null
  productSku?: string | null
  itemThumbnails?: OrderItemThumbnail[]
  itemCount: number
  revenueAmount: number
  netRevenueAmount?: number
  baseCostAmount: number
  totalCostAmount: number | null
  lngFulfillmentFeeAmount: number | null
  shippingCostAmount: number | null
  vendorAdditionalCostAmount: number | null
  marketplaceFeeAmount: number
  refundAmount: number
  cancelledCount?: number
  partiallyRefundedCount?: number
  refundedCount?: number
  discountAmount: number
  profitAmount: number | null
  marginBps: number | null
  missingCostCount: number
}

export type PaginatedReport<T> = {
  items: T[]
  pagination: { total: number; page: number; limit: number }
}

export type OrderProfitabilitySummary = {
  missingSnapshotCount?: number
  refundAmount?: number
  currency: string | null
  orderIds?: string[]
  orderCount: number
  costedOrderCount: number
  missingCostOrderCount: number
  revenueAmount: number
  netRevenueAmount?: number
  totalCostAmount: number | null
  profitAmount: number | null
  marginBps: number | null
  profitableOrderCount: number
  lossOrderCount: number
}

export type OrderProfitabilityReport = PaginatedReport<OrderProfitability> & {
  summaryByCurrency: OrderProfitabilitySummary[]
}

export type OperationsOverview = {
  orderItemsByStatus: Record<string, number>
  productionByStatus: Record<string, number>
  productionBlockers: Record<string, number>
  vendorSubmissionsByStatus: Record<string, number>
  shipmentsByStatus: Record<string, number>
}

export type VendorPerformance = {
  vendorId: string | null
  vendorCode: string | null
  vendorName: string | null
  readyCount: number
  submittedCount: number
  failedCount: number
  cancelledCount: number
  shippedCount: number
  successRateBps: number | null
  avgProcessingHours: number | null
}

export type ReportFilterOptions = {
  channels: string[]
  marketplaces: string[]
  sellers: Array<{ employeeCode: string; name: string | null }>
  teams: Array<{ id: string; code: string | null; name: string | null }>
  departments: Array<{ id: string; code: string | null; name: string | null }>
  shops: Array<{ id: string; code: string | null; name: string | null }>
}

const params = compactParams
const get = async <T>(path: string, filters?: ReportFilters, signal?: AbortSignal) => {
  const config = {
    ...(filters ? { params: params(filters) } : {}),
    ...(signal ? { signal } : {}),
  }
  return unwrap<T>(
    await (Object.keys(config).length > 0 ? apiClient.get(path, config) : apiClient.get(path)),
  )
}
const getBlob = async (path: string, filters?: ReportFilters) =>
  (await apiClient.get(path, {
    params: params(filters || {}),
    responseType: 'blob',
  })) as unknown as Blob

type SignalOptions = { signal?: AbortSignal } | AbortSignal

const extractSignal = (options?: SignalOptions): AbortSignal | undefined =>
  options instanceof AbortSignal ? options : options?.signal

export const getReportFilterOptions = (options?: SignalOptions) =>
  get<ReportFilterOptions>('/api/reports/filter-options', undefined, extractSignal(options))
export const exportReportCsv = (filters: ReportFilters) =>
  getBlob('/api/reports/export.csv', filters)
export const listFinanceDaily = (
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<FinanceDaily[]> =>
  get<FinanceDaily[]>('/api/reports/finance/daily', filters, signal).then((rows) =>
    rows.map(canonicalProfitRow),
  )
export const listFinanceCoverage = (filters: ReportFilters, signal?: AbortSignal) =>
  get<FinanceCoverage[]>('/api/reports/finance/coverage', filters, signal)
export const listFinanceDailyProfit = (
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<FinanceDaily[]> =>
  get<FinanceDaily[]>('/api/reports/finance/daily-profit', filters, signal).then((rows) =>
    rows.map(canonicalProfitRow),
  )
export const listFinanceOrderProfitability = (filters: ReportFilters, signal?: AbortSignal) =>
  get<OrderProfitabilityReport>('/api/reports/finance/orders-profitability', filters, signal)
export const listFinanceBySeller = (
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<SellerPerformance[]> =>
  get<SellerPerformance[]>('/api/reports/finance/by-seller', filters, signal).then((rows) =>
    rows.map(canonicalProfitRow),
  )
export const listFinanceSellerDaily = (
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<SellerDailyProfit[]> =>
  get<SellerDailyProfit[]>('/api/reports/finance/seller-daily', filters, signal).then((rows) =>
    rows.map(canonicalProfitRow),
  )
export const listFinanceByTeam = (
  filters: ReportFilters,
  signal?: AbortSignal,
): Promise<TeamPerformance[]> =>
  get<TeamPerformance[]>('/api/reports/finance/by-team', filters, signal).then((rows) =>
    rows.map(canonicalProfitRow),
  )
export const getBuyerInsights = (filters: ReportFilters, signal?: AbortSignal) =>
  get<BuyerInsights>('/api/reports/buyers/insights', filters, signal)
export const listChannelPerformance = (filters: ReportFilters, signal?: AbortSignal) =>
  get<ChannelPerformance[]>('/api/reports/ads/channel-performance', filters, signal)
export const listAdsDaily = (filters: ReportFilters, signal?: AbortSignal) =>
  get<AdsDaily[]>('/api/reports/ads/daily', filters, signal)
export const listAdsSellerDaily = (filters: ReportFilters, signal?: AbortSignal) =>
  get<AdsSellerDaily[]>('/api/reports/ads/seller-daily', filters, signal)
export const getOperationsOverview = (filters: ReportFilters, signal?: AbortSignal) =>
  get<OperationsOverview>('/api/reports/operations/overview', filters, signal)
export const listVendorPerformance = (filters: ReportFilters, signal?: AbortSignal) =>
  get<{ items: VendorPerformance[] }>('/api/reports/vendor/performance', filters, signal)
