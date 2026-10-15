import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { getListingSummary, listListings } from '@/features/portal/catalog/api/catalogApi'
import {
  getOrderSummary,
  listOrderWorkbench,
  type OrderWorkbenchRow,
} from '@/features/portal/orders/api/orderApi'
import {
  getBuyerInsights,
  listFinanceBySeller,
  getOperationsOverview,
  listFinanceDailyProfit,
  listVendorPerformance,
} from '@/features/portal/reports/api/reportApi'
import { getPermissions } from '@/shared/auth/session'

import { formatCompactNumber, formatDashboardDate, numberOf } from './operationsDashboardFormatters'

export type ChartDatum = { label: string; value: number }

export type TimelinePoint = {
  date: string
  displayDate: string
  revenue: number
  incomeGrowth: number | null
  orderCount: number
}

export type CashFlowRow = {
  date: string
  displayDate: string
  revenueAmount: number
  costAmount: number | null
  grossProfitAmount: number | null
  missingCostCount: number
  currency: string | null
}

export type ChannelDatum = {
  name: string
  value: number
  color: string
  percent: number
}

export type TopCategoryItem = {
  id: string
  name: string
  salesAmount: string
  orderCount: number
  imageUrl?: string | null
  growthPercent?: number
  preset?: 'blue' | 'purple' | 'pink' | 'amber'
}
export type TopSeller = { id: string; name: string; revenueAmount: number; currency: string | null }

export type OperationalIssue = {
  key: string
  labelKey: string
  count: number
  href: string
}

const NON_STATUS_ORDER_TAB_KEYS = new Set(['ALL', 'OPEN_CASE'])

function normalizeDataKey(key: string) {
  return key.replaceAll('_', ' ')
}

export function useOperationsDashboard(
  dateFrom?: string,
  dateTo?: string,
  loadOperationalHealth = true,
  salesChannelCode?: string,
) {
  const { t, i18n } = useTranslation()
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedStatus, setSelectedStatus] = useState<string>('all')

  const handleOpenListingQueue = useCallback(() => console.log('Opening listing queue'), [])

  const permissions = getPermissions()
  const permissionSet = new Set(permissions.map((permission) => permission.toUpperCase()))
  const canOrders = permissionSet.has('ORDERS:READ') || permissionSet.has('ORDERS:WRITE')
  const canCatalog = permissionSet.has('CATALOG:READ') || permissionSet.has('CATALOG:WRITE')
  const canFinance = permissionSet.has('FINANCE:READ') || permissionSet.has('FINANCE:WRITE')
  const canReports = permissionSet.has('REPORTS:READ')

  const orderParams = useMemo(
    () => ({ page: 1, limit: 12, dateFrom, dateTo, salesChannelCode }),
    [dateFrom, dateTo, salesChannelCode],
  )

  const orderSummary = useQuery({
    queryKey: ['foundation', 'orders', 'summary', dateFrom, dateTo, salesChannelCode],
    queryFn: () => getOrderSummary(orderParams),
    enabled: canOrders,
  })

  const recentOrders = useQuery({
    queryKey: ['foundation', 'orders', 'recent', dateFrom, dateTo, salesChannelCode],
    queryFn: () => listOrderWorkbench(orderParams),
    enabled: canOrders,
  })

  const listingSummary = useQuery({
    queryKey: ['foundation', 'catalog', 'summary'],
    queryFn: () => getListingSummary({}),
    enabled: canCatalog,
  })

  const topListings = useQuery({
    queryKey: ['foundation', 'catalog', 'top-listings'],
    queryFn: () => listListings({ page: 1, limit: 8, sort: 'quantitySoldDesc' }),
    enabled: canCatalog,
  })

  const buyerInsights = useQuery({
    queryKey: ['foundation', 'buyers', 'insights', dateFrom, dateTo, salesChannelCode],
    queryFn: () => getBuyerInsights({ dateFrom, dateTo, salesChannelCode }),
    enabled: canReports,
  })

  const reportFilters = useMemo(
    () => ({ dateFrom, dateTo, salesChannelCode, dateBasis: 'ORDERED_AT' as const }),
    [dateFrom, dateTo, salesChannelCode],
  )

  const finance = useQuery({
    queryKey: ['foundation', 'finance', reportFilters],
    queryFn: () => listFinanceDailyProfit(reportFilters),
    enabled: canFinance,
  })
  const sellerPerformance = useQuery({
    queryKey: ['foundation', 'finance', 'by-seller', reportFilters],
    queryFn: () => listFinanceBySeller(reportFilters),
    enabled: canFinance,
  })

  const operationsOverview = useQuery({
    queryKey: ['foundation', 'operations', reportFilters],
    queryFn: () => getOperationsOverview(reportFilters),
    enabled: canReports && loadOperationalHealth,
  })

  const vendorPerformance = useQuery({
    queryKey: ['foundation', 'vendor-performance', reportFilters],
    queryFn: () => listVendorPerformance(reportFilters),
    enabled: canReports && loadOperationalHealth,
  })

  const financeRevenue = (finance.data ?? []).reduce((sum, row) => sum + row.revenueAmount, 0)
  const topSellers: TopSeller[] = (sellerPerformance.data ?? [])
    .filter((seller) => seller.sellerEmployeeCode || seller.sellerName)
    .sort((left, right) => right.revenueAmount - left.revenueAmount)
    .slice(0, 3)
    .map((seller) => ({
      id: seller.sellerEmployeeCode || seller.sellerName || 'unknown',
      name: seller.sellerName || seller.sellerEmployeeCode || t('common.unknown'),
      revenueAmount: seller.revenueAmount,
      currency: seller.currency,
    }))

  const tabCounts = orderSummary.data?.tabCounts ?? {}
  const orderStatusEntries = Object.entries(tabCounts).filter(
    ([key]) => !NON_STATUS_ORDER_TAB_KEYS.has(key.toUpperCase()),
  )
  const allOrderCount = tabCounts.ALL ?? tabCounts.all
  const orderTotal = numberOf(allOrderCount)

  const listingTotal = numberOf(listingSummary.data?.totalListingCount) || 0

  const orderStatus = orderStatusEntries
    .map(([key, value]) => ({
      label: t(`orders.tabs.${key}`, { defaultValue: normalizeDataKey(key) }),
      value: numberOf(value),
    }))
    .filter((item) => item.value > 0)

  const displayedOrderTotal = orderTotal

  const orderBars = orderStatus.length
    ? orderStatus
    : [{ label: t('foundation.portalDashboard.orders'), value: displayedOrderTotal }]

  const rangeStart = dateFrom ? dayjs(dateFrom).toDate() : dayjs().startOf('month').toDate()
  const rangeEnd = dateTo ? dayjs(dateTo).toDate() : dayjs().toDate()

  // Timeline points for Summary chart (100% real data from finance reports)
  const timelinePoints: TimelinePoint[] = useMemo(() => {
    if (finance.data && finance.data.length > 0) {
      return finance.data.map((row) => ({
        date: row.date,
        displayDate: dayjs(row.date).format('D MMM'),
        revenue: Math.round(row.revenueAmount / 100),
        incomeGrowth:
          row.grossProfitAmount === null ? null : Math.round(row.grossProfitAmount / 100),
        orderCount: row.itemCount || 0,
      }))
    }
    return []
  }, [finance.data])

  const cashFlowRows: CashFlowRow[] = useMemo(
    () =>
      (finance.data ?? []).map((row) => ({
        date: row.date,
        displayDate: dayjs(row.date).format('D MMM'),
        revenueAmount: row.revenueAmount,
        costAmount: row.totalCostAmount ?? null,
        grossProfitAmount: row.netProfitAmount ?? row.grossProfitAmount ?? null,
        missingCostCount: row.missingCostCount,
        currency: row.currency,
      })),
    [finance.data],
  )

  // Channel distribution for Donut Chart (100% real data)
  const channelBreakdown: ChannelDatum[] = useMemo(() => {
    const rawChannels: Record<string, number> = {}
    if (finance.data && finance.data.length > 0) {
      for (const row of finance.data) {
        const key = (row.salesChannelCode || 'AMAZON').toUpperCase()
        rawChannels[key] = (rawChannels[key] || 0) + (row.revenueAmount || row.itemCount || 0)
      }
    }

    const totalVal = Object.values(rawChannels).reduce((s, v) => s + v, 0)
    if (totalVal > 0) {
      const palette = ['#ff7a1a', '#2563eb', '#10b981', '#f59e0b', '#8b5cf6']
      return Object.entries(rawChannels).map(([k, val], i) => ({
        name: k,
        value: val >= 100 ? Math.round(val / 100) : val,
        percent: Math.round((val / totalVal) * 100),
        color: palette[i % palette.length],
      }))
    }

    return []
  }, [finance.data])

  // Filtered recent orders
  const allRecentOrders: OrderWorkbenchRow[] = useMemo(
    () => recentOrders.data?.items ?? [],
    [recentOrders.data?.items],
  )
  const filteredRecentOrders = useMemo(() => {
    return allRecentOrders.filter((row) => {
      if (selectedStatus !== 'all') {
        const orderStatusNorm = String(row.order.status || '').toLowerCase()
        if (orderStatusNorm !== selectedStatus.toLowerCase()) return false
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase()
        const orderId = String(row.order.externalOrderId || row.order.id).toLowerCase()
        const title = String(row.items[0]?.item.title || '').toLowerCase()
        const sku = String(row.items[0]?.item.sku || '').toLowerCase()
        if (!orderId.includes(q) && !title.includes(q) && !sku.includes(q)) return false
      }
      return true
    })
  }, [allRecentOrders, searchQuery, selectedStatus])

  const revenueFormatted = new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency: finance.data?.[0]?.currency || 'USD',
    maximumFractionDigits: 0,
  }).format(financeRevenue / 100)
  const latestDailyPoint = timelinePoints[timelinePoints.length - 1]
  const latestDataLabel = latestDailyPoint?.displayDate || null
  const missingCostItemCount = (finance.data ?? []).reduce(
    (sum, row) => sum + row.missingCostCount,
    0,
  )

  const rawCustomerCount = numberOf(buyerInsights.data?.newBuyerCount)
  const formattedCustomers = canReports ? formatCompactNumber(rawCustomerCount) : '—'
  const operationalIssueDefs: [string, string, number | undefined, string][] = [
    [
      'mapping',
      'needsMapping',
      operationsOverview.data?.orderItemsByStatus.MAPPING_PENDING,
      '/portal/mapping',
    ],
    [
      'production',
      'needsProduction',
      operationsOverview.data?.orderItemsByStatus.NEED_PRODUCTION,
      '/portal/production',
    ],
    [
      'qc-rejected',
      'qcRejected',
      operationsOverview.data?.orderItemsByStatus.QC_REJECTED,
      '/portal/production',
    ],
    [
      'vendor-submission',
      'vendorSubmitFailed',
      operationsOverview.data?.vendorSubmissionsByStatus.FAILED,
      '/portal/vendor-submissions',
    ],
    [
      'tracking',
      'trackingPending',
      operationsOverview.data?.shipmentsByStatus.TRACKING_PENDING,
      '/portal/shipments',
    ],
    [
      'shipment-exception',
      'shipmentException',
      operationsOverview.data?.shipmentsByStatus.EXCEPTION,
      '/portal/shipments',
    ],
  ]
  const operationalIssues: OperationalIssue[] = operationalIssueDefs
    .map(([key, labelKey, count, href]) => ({ key, labelKey, count: numberOf(count), href }))
    .filter((issue) => issue.count > 0)
  const vendorFailures = (vendorPerformance.data?.items ?? [])
    .filter((vendor) => vendor.failedCount > 0)
    .sort((left, right) => right.failedCount - left.failedCount)
    .slice(0, 3)
  const hasQueryError = [
    orderSummary,
    recentOrders,
    listingSummary,
    buyerInsights,
    finance,
    sellerPerformance,
    operationsOverview,
    vendorPerformance,
  ].some((query) => query.isError)

  return {
    value: {
      canViewDashboard: canOrders || canCatalog,
      dateRangeLabel: `${formatDashboardDate(rangeStart, i18n.language)} - ${formatDashboardDate(rangeEnd, i18n.language)}`,
      todayLabel: formatDashboardDate(rangeEnd, i18n.language),
      displayedOrderTotal,
      orderBars,
      orderStatus,
      listingTotal,
      revenueFormatted,
      latestDataLabel,
      missingCostItemCount,
      newCustomerCount: rawCustomerCount,
      formattedCustomers,
      financeRevenue,
      canFinance,
      canReports,
      hasQueryError,
      operationalIssues,
      vendorFailures,
      timelinePoints,
      cashFlowRows,
      channelBreakdown,
      topSellers,
      topListings: topListings.data?.items ?? [],
      recentOrders: allRecentOrders,
      filteredRecentOrders,
      searchQuery,
      selectedStatus,
    },
    handle: {
      openListingQueue: handleOpenListingQueue,
      setSearchQuery,
      setSelectedStatus,
      refetch: () => {
        void orderSummary.refetch()
        void recentOrders.refetch()
        void listingSummary.refetch()
        void topListings.refetch()
        void buyerInsights.refetch()
        void finance.refetch()
        void sellerPerformance.refetch()
        void operationsOverview.refetch()
        void vendorPerformance.refetch()
      },
    },
  }
}
