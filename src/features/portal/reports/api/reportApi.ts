import { ApiResponse } from '@/server/type'
import { apiClient } from '@/shared/api'

const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type ReportFilters = {
  dateBasis?: 'ORDERED_AT' | 'CALCULATED_AT'
  dateFrom?: string
  dateTo?: string
  shopId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  sellerEmployeeCode?: string
  teamId?: string
  departmentId?: string
  page?: number
  limit?: number
}
export type FinanceCoverage = {
  currency: string | null
  itemCount: number
  actualCount: number
  estimatedCount: number
  incompleteCostCount: number
  missingDateCount: number
  latestCalculatedAt: string | null
}

export type FinanceDaily = {
  date: string
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
  baseCostAmount: number
  totalCostAmount?: number | null
  additionalFulfillmentCostAmount?: number | null
  marketplaceFeeAmount?: number
  refundAmount?: number
  discountAmount?: number
  grossProfitAmount: number
  grossMarginBps: number | null
  missingCostCount: number
  adSpendAmount?: number
  netProfitAmount?: number
  netMarginBps?: number | null
}

export type SellerPerformance = {
  sellerEmployeeCode: string | null
  sellerName: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
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
  orderCount: number
  totalCostAmount: number | null
  additionalFulfillmentCostAmount: number | null
  marketplaceFeeAmount: number
  refundAmount: number
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

export type OrderProfitability = {
  orderId: string | null
  externalOrderId: string | null
  orderedAt: string | null
  reportDate: string | null
  shopId: string | null
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
  baseCostAmount: number
  totalCostAmount: number | null
  marketplaceFeeAmount: number
  refundAmount: number
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
  currency: string | null
  orderCount: number
  costedOrderCount: number
  missingCostOrderCount: number
  revenueAmount: number
  totalCostAmount: number
  profitAmount: number
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

const params = (value: ReportFilters) =>
  Object.fromEntries(Object.entries(value).filter(([, item]) => item !== undefined && item !== ''))
const get = async <T>(path: string, filters?: ReportFilters) =>
  unwrap<T>(await apiClient.get(path, ...(filters ? [{ params: params(filters) }] : [])))
const getBlob = async (path: string, filters?: ReportFilters) =>
  (await apiClient.get(path, {
    params: params(filters || {}),
    responseType: 'blob',
  })) as unknown as Blob

export const getReportFilterOptions = () => get<ReportFilterOptions>('/api/reports/filter-options')
export const exportReportCsv = (filters: ReportFilters) =>
  getBlob('/api/reports/export.csv', filters)
export const listFinanceDaily = (filters: ReportFilters) =>
  get<FinanceDaily[]>('/api/reports/finance/daily', filters)
export const listFinanceCoverage = (filters: ReportFilters) =>
  get<FinanceCoverage[]>('/api/reports/finance/coverage', filters)
export const listFinanceDailyProfit = (filters: ReportFilters) =>
  get<FinanceDaily[]>('/api/reports/finance/daily-profit', filters)
export const listFinanceOrderProfitability = (filters: ReportFilters) =>
  get<OrderProfitabilityReport>('/api/reports/finance/orders-profitability', filters)
export const listFinanceBySeller = (filters: ReportFilters) =>
  get<SellerPerformance[]>('/api/reports/finance/by-seller', filters)
export const listFinanceSellerDaily = (filters: ReportFilters) =>
  get<SellerDailyProfit[]>('/api/reports/finance/seller-daily', filters)
export const listFinanceByTeam = (filters: ReportFilters) =>
  get<TeamPerformance[]>('/api/reports/finance/by-team', filters)
export const getBuyerInsights = (filters: ReportFilters) =>
  get<BuyerInsights>('/api/reports/buyers/insights', filters)
export const listChannelPerformance = (filters: ReportFilters) =>
  get<ChannelPerformance[]>('/api/reports/ads/channel-performance', filters)
export const listAdsDaily = (filters: ReportFilters) =>
  get<AdsDaily[]>('/api/reports/ads/daily', filters)
export const listAdsSellerDaily = (filters: ReportFilters) =>
  get<AdsSellerDaily[]>('/api/reports/ads/seller-daily', filters)
export const getOperationsOverview = (filters: ReportFilters) =>
  get<OperationsOverview>('/api/reports/operations/overview', filters)
export const listVendorPerformance = (filters: ReportFilters) =>
  get<{ items: VendorPerformance[] }>('/api/reports/vendor/performance', filters)
