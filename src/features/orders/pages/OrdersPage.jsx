import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'

import { OperationsPageShell, OperationsPagination } from '@/components/operations'
import {
  useOrderSummaryQuery,
  useOrderWorkbenchQuery,
  useShopsQuery,
} from '@/features/orders/api/orders.queries'
import { OrdersTabs, OrdersToolbar } from '@/features/orders/components/OrdersControls'
import OrdersTable from '@/features/orders/components/OrdersTable'
import { orderTabs } from '@/features/orders/data/ordersData'
import {
  buildOrderListQuery,
  buildOrderSummaryQuery,
  mapApiTabCounts,
  mapWorkbenchRows,
} from '@/features/orders/utils/ordersApi'
import {
  buildOrdersUrl,
  buildSellerOptions,
  getOrdersChannel,
  getOrdersTab,
  readOrdersFilters,
} from '@/features/orders/utils/ordersFilters'

function replaceOrdersUrl(updates) {
  window.history.replaceState(
    null,
    '',
    buildOrdersUrl(window.location.search, window.location.pathname, updates),
  )
}

export default function OrdersPage() {
  const { i18n } = useTranslation()
  const location = useLocation()
  const routeChannel = getOrdersChannel(location.search)
  const initialTab = getOrdersTab(location.search)
  const [activeTab, setActiveTab] = useState(initialTab)
  const [filters, setFilters] = useState(() => readOrdersFilters(location.search))
  const shopsQuery = useShopsQuery({ page: 1, limit: 100 })
  const effectiveFilters = useMemo(
    () => ({
      ...filters,
      channel: routeChannel || filters.channel,
    }),
    [filters, routeChannel],
  )
  const shopOptions = useMemo(
    () =>
      (shopsQuery.data?.items || []).map((shop) => ({
        value: shop.id,
        label: shop.name,
      })),
    [shopsQuery.data],
  )
  const orderQuery = useMemo(
    () => buildOrderListQuery({ ...effectiveFilters, tab: activeTab }),
    [effectiveFilters, activeTab],
  )
  const orderSummaryParams = useMemo(
    () => buildOrderSummaryQuery(effectiveFilters),
    [effectiveFilters],
  )
  const ordersQuery = useOrderWorkbenchQuery(orderQuery)
  const orderSummaryQuery = useOrderSummaryQuery(orderSummaryParams)
  const refetchOrders = ordersQuery.refetch
  const refetchOrderSummary = orderSummaryQuery.refetch
  const orders = useMemo(
    () =>
      mapWorkbenchRows(ordersQuery.data?.items || [], {
        locale: i18n.language,
      }),
    [i18n.language, ordersQuery.data],
  )
  const sellerOptions = useMemo(() => buildSellerOptions(orders), [orders])
  const pagination = useMemo(
    () =>
      ordersQuery.data?.pagination || {
        total: 0,
        page: filters.page,
        limit: filters.limit,
      },
    [filters.limit, filters.page, ordersQuery.data?.pagination],
  )
  const tableState = useMemo(() => ({ orders, pagination }), [orders, pagination])
  const deferredTableState = useDeferredValue(tableState)
  const tabs = useMemo(() => {
    const counts = mapApiTabCounts(orderSummaryQuery.data?.tabCounts || {})

    return orderTabs.map((tab) => ({
      ...tab,
      count: counts[tab.key] || 0,
    }))
  }, [orderSummaryQuery.data])

  const handleFiltersChange = useCallback((nextFilters) => {
    replaceOrdersUrl(nextFilters)
    setFilters(nextFilters)
  }, [])

  const handleChangeTab = useCallback(
    (tab) => {
      if (tab === activeTab) {
        return
      }

      setActiveTab(tab)
      replaceOrdersUrl({ tab, page: 1 })
      setFilters((current) => ({ ...current, page: 1 }))
    },
    [activeTab],
  )

  const handleRefreshOrders = useCallback(() => {
    refetchOrders()
    refetchOrderSummary()
  }, [refetchOrderSummary, refetchOrders])

  return (
    <OperationsPageShell
      tabs={<OrdersTabs activeTab={activeTab} onChange={handleChangeTab} tabs={tabs} />}
      toolbar={
        <OrdersToolbar
          filters={effectiveFilters}
          onFiltersChange={handleFiltersChange}
          onRefresh={handleRefreshOrders}
          sellerOptions={sellerOptions}
          shopOptions={shopOptions}
        />
      }
      pagination={
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={(page) =>
            setFilters((current) => {
              replaceOrdersUrl({ page })
              return { ...current, page }
            })
          }
          onPageSizeChange={(limit) => {
            setFilters((current) => {
              replaceOrdersUrl({ limit, page: 1 })
              return { ...current, limit, page: 1 }
            })
          }}
        />
      }
    >
      <OrdersTable
        loading={ordersQuery.isLoading}
        onRefresh={handleRefreshOrders}
        orders={deferredTableState.orders}
        pagination={deferredTableState.pagination}
      />
    </OperationsPageShell>
  )
}
