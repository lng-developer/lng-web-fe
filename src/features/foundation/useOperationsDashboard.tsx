import { useCallback, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery } from '@tanstack/react-query'
import dayjs from 'dayjs'

import { getListingSummary, listListings } from '@/features/portal/catalog/api/catalogApi'
import { getCustomerSummary } from '@/features/portal/customers/api/customerApi'
import { getOrderSummary, listOrderWorkbench } from '@/features/portal/orders/api/orderApi'
import {
  getOperationsOverview,
  listFinanceDailyProfit,
} from '@/features/portal/reports/api/reportApi'
import { getPermissions } from '@/shared/auth/session'

import { formatDashboardDate, numberOf } from './operationsDashboardFormatters'

export type ChartDatum = { label: string; value: number }

const NON_STATUS_ORDER_TAB_KEYS = new Set(['ALL', 'OPEN_CASE'])

function normalizeDataKey(key: string) {
  return key.replaceAll('_', ' ')
}

export function useOperationsDashboard(dateFrom?: string, dateTo?: string) {
  const { t, i18n } = useTranslation()
  const handleOpenListingQueue = useCallback(() => console.log('Opening listing queue'), [])
  const permissionSet = useMemo(
    () => new Set(getPermissions().map((permission) => permission.toUpperCase())),
    [],
  )
  const canOrders = permissionSet.has('ORDERS:READ') || permissionSet.has('ORDERS:WRITE')
  const canCatalog = permissionSet.has('CATALOG:READ') || permissionSet.has('CATALOG:WRITE')
  const canCustomers = permissionSet.has('CUSTOMERS:READ')
  const canFinance = permissionSet.has('FINANCE:READ') || permissionSet.has('FINANCE:WRITE')
  const canReports = permissionSet.has('REPORTS:READ')

  const orderParams = useMemo(() => ({ page: 1, limit: 8, dateFrom, dateTo }), [dateFrom, dateTo])
  const orderSummary = useQuery({
    queryKey: ['foundation', 'orders', 'summary', dateFrom, dateTo],
    queryFn: () => getOrderSummary(orderParams),
    enabled: canOrders,
  })
  const recentOrders = useQuery({
    queryKey: ['foundation', 'orders', 'recent', dateFrom, dateTo],
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
  const customerSummary = useQuery({
    queryKey: ['foundation', 'customers', 'summary'],
    queryFn: () => getCustomerSummary(),
    enabled: canCustomers,
  })
  const reportFilters = useMemo(() => ({ dateFrom, dateTo }), [dateFrom, dateTo])
  const finance = useQuery({
    queryKey: ['foundation', 'finance', reportFilters],
    queryFn: () => listFinanceDailyProfit(reportFilters),
    enabled: canFinance,
  })
  const operations = useQuery({
    queryKey: ['foundation', 'reports', reportFilters],
    queryFn: () => getOperationsOverview(reportFilters),
    enabled: canReports,
  })
  const financeRevenue = (finance.data ?? []).reduce((sum, row) => sum + row.revenueAmount, 0)
  const reportItems = Object.values(operations.data?.orderItemsByStatus ?? {}).reduce(
    (sum, value) => sum + value,
    0,
  )

  const tabCounts = orderSummary.data?.tabCounts ?? {}
  const orderStatusEntries = Object.entries(tabCounts).filter(
    ([key]) => !NON_STATUS_ORDER_TAB_KEYS.has(key.toUpperCase()),
  )
  const allOrderCount = tabCounts.ALL ?? tabCounts.all
  const orderTotal =
    allOrderCount != null
      ? numberOf(allOrderCount)
      : orderStatusEntries.reduce((sum, [, value]) => sum + numberOf(value), 0)
  const listingTotal = numberOf(listingSummary.data?.totalListingCount)
  const approvedListings = numberOf(listingSummary.data?.approvedCount)
  const targetPercent = listingTotal ? Math.round((approvedListings / listingTotal) * 100) : 0
  const safeTargetPercent = Math.min(100, Math.max(0, targetPercent))
  const orderStatus = orderStatusEntries
    .map(([key, value]) => ({
      label: t(`orders.tabs.${key}`, { defaultValue: normalizeDataKey(key) }),
      value: numberOf(value),
    }))
    .filter((item) => item.value > 0)
  const orderStatusTotal = orderStatus.reduce((sum, item) => sum + item.value, 0)
  const displayedOrderTotal = orderStatusTotal || orderTotal
  const orderBars = orderStatus.length
    ? orderStatus
    : [{ label: t('foundation.portalDashboard.orders'), value: displayedOrderTotal }]
  const summaryBars = [
    { label: t('foundation.portalDashboard.orders'), value: displayedOrderTotal },
    { label: t('foundation.portalDashboard.approved'), value: approvedListings },
    {
      label: t('foundation.portalDashboard.draft'),
      value: numberOf(listingSummary.data?.draftCount),
    },
    {
      label: t('foundation.portalDashboard.noPsd'),
      value: numberOf(listingSummary.data?.noPsdCount),
    },
    {
      label: t('foundation.portalDashboard.rejected'),
      value: numberOf(listingSummary.data?.rejectedCount),
    },
  ]
  const rangeStart = dateFrom ? dayjs(dateFrom).toDate() : dayjs().startOf('month').toDate()
  const rangeEnd = dateTo ? dayjs(dateTo).toDate() : dayjs().toDate()

  return {
    value: {
      canViewDashboard: canOrders || canCatalog,
      dateRangeLabel: `${formatDashboardDate(rangeStart, i18n.language)} - ${formatDashboardDate(rangeEnd, i18n.language)}`,
      todayLabel: formatDashboardDate(rangeEnd, i18n.language),
      displayedOrderTotal,
      orderBars,
      orderStatus,
      summaryBars,
      summaryTotal: displayedOrderTotal + listingTotal,
      approvedListings,
      listingTotal,
      safeTargetPercent,
      targetPercent,
      newCustomerCount: numberOf(customerSummary.data?.newCount),
      financeRevenue,
      reportItems,
      canFinance,
      canReports,
      topListings: topListings.data?.items ?? [],
      recentOrders: recentOrders.data?.items ?? [],
    },
    handle: {
      openListingQueue: handleOpenListingQueue,
    },
  }
}
