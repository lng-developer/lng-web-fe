import { hasAnyPermission } from '@/features/auth/utils/authz'
import { useOrderSummaryQuery } from '@/features/orders/api/orders.queries'
import {
  useAdsChannelPerformanceQuery,
  useBuyerInsightsQuery,
  useFinanceDailyProfitQuery,
  useOperationsOverviewQuery,
  useVendorPerformanceQuery,
} from '@/features/reports/api/reports.queries'

import { buildCommercialDashboard } from '../utils/commercialDashboard.js'

const ORDER_PERMISSIONS = ['ORDERS:READ', 'ORDERS:WRITE']
const REPORT_PERMISSIONS = ['REPORTS:READ']

function collectQueryState(queryDefinitions) {
  const failures = []
  queryDefinitions.forEach(({ source, enabled, query }) => {
    if (enabled && query.isError) failures.push(source)
  })
  return failures
}

function getExceptionCounts(summary = {}) {
  const tabCounts = summary.tabCounts || {}
  return {
    address: Number(tabCounts.ADDRESS_ISSUE || 0),
    missingCostCenter: Number(tabCounts.NO_COST_CENTER || 0),
    missingPsd: Number(tabCounts.NO_PSD || 0),
    openCases: Number(tabCounts.OPEN_CASE || 0),
  }
}

export function useHomeDashboardQuery(user, query = {}) {
  const canReadOrders = hasAnyPermission(user, ORDER_PERMISSIONS)
  const canReadReports = hasAnyPermission(user, REPORT_PERMISSIONS)
  const orders = useOrderSummaryQuery({}, { enabled: canReadOrders })
  const dailyProfit = useFinanceDailyProfitQuery(query, { enabled: canReadReports })
  const channelPerformance = useAdsChannelPerformanceQuery(query, { enabled: canReadReports })
  const buyerInsights = useBuyerInsightsQuery(query, { enabled: canReadReports })
  const vendorPerformance = useVendorPerformanceQuery(query, { enabled: canReadReports })
  const operations = useOperationsOverviewQuery(query, { enabled: canReadReports })
  const queryDefinitions = [
    { source: 'orders', enabled: canReadOrders, query: orders },
    { source: 'dailyProfit', enabled: canReadReports, query: dailyProfit },
    { source: 'channelPerformance', enabled: canReadReports, query: channelPerformance },
    { source: 'buyerInsights', enabled: canReadReports, query: buyerInsights },
    { source: 'vendorPerformance', enabled: canReadReports, query: vendorPerformance },
    { source: 'operations', enabled: canReadReports, query: operations },
  ]
  const failedSources = collectQueryState(queryDefinitions)

  return {
    data: {
      commercial: buildCommercialDashboard({
        buyerInsights: buyerInsights.data,
        channelPerformance: channelPerformance.data || [],
        dailyProfit: dailyProfit.data || [],
      }),
      exceptions: getExceptionCounts(orders.data),
      dailyProfit: dailyProfit.data || [],
      hasAnalyticsAccess: canReadReports,
      operations: operations.data || {},
      vendors: vendorPerformance.data?.items || [],
    },
    isPending: queryDefinitions.some(({ enabled, query: current }) => enabled && current.isPending),
    isError: failedSources.length > 0,
    failedSources,
    refetch: () =>
      Promise.all(
        queryDefinitions
          .filter(({ enabled }) => enabled)
          .map(({ query: current }) => current.refetch()),
      ),
  }
}
