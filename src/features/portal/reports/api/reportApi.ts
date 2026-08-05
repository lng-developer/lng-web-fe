import { apiClient } from '@/shared/api'

type ApiResponse<T> = { success: boolean; data: T }
const unwrap = <T>(response: unknown) => (response as ApiResponse<T>).data

export type ReportFilters = {
  dateFrom?: string
  dateTo?: string
  shopId?: string
  salesChannelCode?: string
  marketplaceCode?: string
  sellerEmployeeCode?: string
  teamId?: string
  departmentId?: string
}

export type FinanceDaily = {
  date: string
  salesChannelCode: string | null
  marketplaceCode: string | null
  currency: string | null
  itemCount: number
  revenueAmount: number
  baseCostAmount: number
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
  grossProfitAmount: number
  operatingCostAmount: number
  netProfitAmount: number
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

export const getReportFilterOptions = () => get<ReportFilterOptions>('/api/reports/filter-options')
export const listFinanceDaily = (filters: ReportFilters) =>
  get<FinanceDaily[]>('/api/reports/finance/daily', filters)
export const listFinanceDailyProfit = (filters: ReportFilters) =>
  get<FinanceDaily[]>('/api/reports/finance/daily-profit', filters)
export const listFinanceBySeller = (filters: ReportFilters) =>
  get<SellerPerformance[]>('/api/reports/finance/by-seller', filters)
export const listFinanceByTeam = (filters: ReportFilters) =>
  get<TeamPerformance[]>('/api/reports/finance/by-team', filters)
export const getBuyerInsights = (filters: ReportFilters) =>
  get<BuyerInsights>('/api/reports/buyers/insights', filters)
export const listChannelPerformance = (filters: ReportFilters) =>
  get<ChannelPerformance[]>('/api/reports/ads/channel-performance', filters)
export const getOperationsOverview = (filters: ReportFilters) =>
  get<OperationsOverview>('/api/reports/operations/overview', filters)
export const listVendorPerformance = (filters: ReportFilters) =>
  get<{ items: VendorPerformance[] }>('/api/reports/vendor/performance', filters)
