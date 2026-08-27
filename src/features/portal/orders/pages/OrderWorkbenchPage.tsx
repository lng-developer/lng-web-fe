import 'dayjs/locale/vi'

import { type MouseEvent, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  CheckCircleFilled,
  DownloadOutlined,
  EditOutlined,
  EnvironmentOutlined,
  FileExclamationOutlined,
  HistoryOutlined,
  SwapOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Space, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { listVendors } from '@/features/portal/vendors/api/vendorApi'
import { vendorKeys } from '@/features/portal/vendors/api/vendorKeys'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import {
  CopyableOrderId,
  FeedbackAlert,
  type PopupModalAnchor,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
} from '@/shared/ui'

import {
  downloadOrdersCsv,
  getOrderSummary,
  listOrderWorkbench,
  type OrderWorkbenchRow,
} from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { formatMinorMoney, orderStatusTone } from './orderPresentation'
import { OrderWorkbenchExpandedRow } from './OrderWorkbenchExpandedRow'
import { OrderWorkbenchFilterBar } from './OrderWorkbenchFilterBar'
import styles from './OrderWorkbenchPage.module.scss'

dayjs.extend(relativeTime)

const PAGE_SIZE = 20
const TABS = [
  'ALL',
  'NEW_ORDER',
  'NO_COST_CENTER',
  'NO_PSD',
  'PAYMENT_PENDING',
  'IN_PROGRESS',
  'SHIPPED',
  'CANCELLED',
  'OPEN_CASE',
] as const
type TabKey = (typeof TABS)[number]
type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'
type OrderAction = { orderId: string; modal: OrderModal; anchor?: PopupModalAnchor }
const EMPTY_DATES = { dateFrom: undefined, dateTo: undefined } as const

export const OrderWorkbenchPage = () => {
  const { t, i18n } = useTranslation()
  const toast = useFeedbackToast()
  const account = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(PAGE_SIZE)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab: TabKey = TABS.includes(requestedTab as TabKey) ? (requestedTab as TabKey) : 'ALL'
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [shopId, setShopId] = useState<string>()
  const [vendorId, setVendorId] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>(EMPTY_DATES)
  const [orderAction, setOrderAction] = useState<OrderAction>()
  const canWriteOrder = useCallback(
    (row: OrderWorkbenchRow) =>
      canUseScopedPermission(account, 'ORDERS:WRITE', {
        scopeType: 'shop',
        scopeId: row.order.shopId ?? row.order.shop?.id,
      }),
    [account],
  )
  const params = useMemo(
    () => ({
      page,
      limit: pageSize,
      tab,
      search: deferredSearch,
      shopId,
      vendorId,
      ...dates,
    }),
    [dates, page, pageSize, deferredSearch, shopId, tab, vendorId],
  )
  const summaryParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      search: deferredSearch,
      shopId,
      vendorId,
      ...dates,
    }),
    [dates, deferredSearch, shopId, vendorId],
  )
  const orders = useQuery({
    queryKey: orderKeys.workbench(params),
    queryFn: () => listOrderWorkbench(params),
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
  const summary = useQuery({
    queryKey: orderKeys.summary(summaryParams),
    queryFn: () => getOrderSummary(summaryParams),
    retry: false,
    staleTime: 20_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  })
  const shopParams = useMemo(() => ({ page: 1, limit: 100, status: 'ACTIVE' as const }), [])
  const shops = useQuery({
    queryKey: shopKeys.list(shopParams),
    queryFn: () => listShops(shopParams),
    retry: false,
  })
  const vendorParams = useMemo(() => ({ page: 1, limit: 100, status: 'ACTIVE' as const }), [])
  const vendors = useQuery({
    queryKey: vendorKeys.vendors(vendorParams),
    queryFn: () => listVendors(vendorParams),
    retry: false,
  })
  const exportOrders = useMutation({
    mutationFn: () => downloadOrdersCsv(params),
    onSuccess: () => toast('success', t('orders.export.success')),
    onError: () => toast('error', t('orders.export.error')),
  })
  const shopOptions = useMemo(
    () => (shops.data?.items ?? []).map((shop) => ({ value: shop.id, label: shop.name })),
    [shops.data],
  )
  const vendorOptions = useMemo(
    () => (vendors.data?.items ?? []).map((vendor) => ({ value: vendor.id, label: vendor.name })),
    [vendors.data],
  )
  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const onTabChange = useCallback(
    (value: string) => {
      if (!TABS.includes(value as TabKey)) return

      const nextSearchParams = new URLSearchParams(searchParams)
      if (value === 'ALL') nextSearchParams.delete('tab')
      else nextSearchParams.set('tab', value)
      setSearchParams(nextSearchParams, { replace: true })
      setPage(1)
    },
    [searchParams, setSearchParams],
  )
  const onShopChange = useCallback((value?: string) => {
    setShopId(value)
    setPage(1)
  }, [])
  const onVendorChange = useCallback((value?: string) => {
    setVendorId(value)
    setPage(1)
  }, [])
  const onDatesChange = useCallback((value: { dateFrom?: string; dateTo?: string }) => {
    setDates(value)
    setPage(1)
  }, [])
  const closeOrderModal = useCallback(() => setOrderAction(undefined), [])
  const openOrderModal = useCallback(
    (event: MouseEvent<HTMLElement>, orderId: string, modal: OrderModal) => {
      const target = event.currentTarget
      const rect = target.getBoundingClientRect()
      const anchor: PopupModalAnchor = {
        x: rect.left + rect.width / 2,
        y: rect.top + rect.height / 2,
        width: rect.width,
        height: rect.height,
      }

      setOrderAction({ orderId, modal, anchor })
    },
    [],
  )
  // R4: stable clear filter handler
  const handleClearFilters = useCallback(() => {
    setShopId(undefined)
    setVendorId(undefined)
    setDates(EMPTY_DATES)
    setPage(1)
  }, [])
  // R2: memoize tab items — avoids recreating array on every render
  const tabItems = useMemo(
    () =>
      TABS.map((key) => ({
        key,
        label: (
          <UiTabLabel count={summary.data?.tabCounts[key] ?? 0} active={tab === key}>
            {t(`orders.tabs.${key}`)}
          </UiTabLabel>
        ),
      })),
    [summary.data, tab, t],
  )
  // R2: memoize expandedRowKeys — avoids .map() on every render
  const expandedRowKeys = useMemo(
    () => (orders.data?.items ?? []).map((row) => row.order.id),
    [orders.data],
  )
  const hasActiveFilters = Boolean(shopId || vendorId || dates.dateFrom || dates.dateTo)
  const pagination = useMemo(
    () => ({
      current: page,
      pageSize,
      total: orders.data?.pagination.total ?? orders.data?.items.length ?? 0,
    }),
    [orders.data?.items.length, orders.data?.pagination.total, page, pageSize],
  )
  const handlePageChange = useCallback(
    (nextPage: number, nextPageSize: number) => {
      setPage(nextPageSize === pageSize ? nextPage : 1)
      setPageSize(nextPageSize)
    },
    [pageSize],
  )
  const renderExpandedRow = useCallback(
    (row: OrderWorkbenchRow) => {
      const canWrite = canWriteOrder(row)
      return (
        <OrderWorkbenchExpandedRow
          row={row}
          canWrite={canWrite}
          canOperate={canWrite && row.order.status !== 'CANCELLED'}
          requestedModal={orderAction?.orderId === row.order.id ? orderAction.modal : undefined}
          requestedPopupAnchor={
            orderAction?.orderId === row.order.id ? orderAction.anchor : undefined
          }
          onOrderModalClose={closeOrderModal}
        />
      )
    },
    [canWriteOrder, closeOrderModal, orderAction],
  )

  const columns = useMemo<TableColumnsType<OrderWorkbenchRow>>(
    () => [
      {
        title: t('orders.columns.order'),
        width: '14%',
        render: (_, row) => (
          <span className={styles.orderIdChip}>
            <CopyableOrderId strong value={row.order.externalOrderId} />
          </span>
        ),
      },
      {
        title: t('orders.columns.status'),
        width: '12%',
        render: (_, row) => (
          <Space size={4}>
            <StatusTag status={orderStatusTone(row.order.status)}>
              {row.order.status ?? '—'}
            </StatusTag>
            <Tooltip title={t('orders.actions.viewHistory')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.viewHistory')}
                icon={<HistoryOutlined />}
                onClick={(event) => openOrderModal(event, row.order.id, 'timeline')}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: t('orders.columns.created'),
        width: '12%',
        render: (_, row) => {
          if (!row.order.createdAt) return '—'
          const createdAt = dayjs(row.order.createdAt)
          const localizedCreatedAt = createdAt.locale(i18n.language === 'vi' ? 'vi' : 'en')

          return (
            <Tooltip title={createdAt.format('DD/MM/YYYY HH:mm')}>
              <Space direction="vertical" size={0}>
                <Typography.Text>
                  {localizedCreatedAt.format(i18n.language === 'vi' ? 'DD/MM/YYYY' : 'MMM D, YYYY')}
                </Typography.Text>
                <Typography.Text type="secondary">({localizedCreatedAt.fromNow()})</Typography.Text>
              </Space>
            </Tooltip>
          )
        },
      },
      {
        title: t('orders.columns.customer'),
        width: '14%',
        render: (_, row) => (
          <Space size={4}>
            <span>{row.order.buyer.name ?? '—'}</span>
            {row.order.addressValidationStatus === 'VALID' ? (
              <Tooltip title={t('orders.sections.shippingAddress')}>
                <CheckCircleFilled className={styles.validIcon} />
              </Tooltip>
            ) : null}
            {canWriteOrder(row) && row.order.status !== 'CANCELLED' ? (
              <Tooltip title={t('orders.actions.editCustomer')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editCustomer')}
                  icon={<EditOutlined />}
                  onClick={(event) => openOrderModal(event, row.order.id, 'customer')}
                />
              </Tooltip>
            ) : null}
            {canWriteOrder(row) && row.order.status !== 'CANCELLED' ? (
              <Tooltip title={t('orders.actions.editAddress')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editAddress')}
                  icon={<EnvironmentOutlined />}
                  onClick={(event) => openOrderModal(event, row.order.id, 'address')}
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('orders.columns.shipping'),
        width: '12%',
        render: (_, row) => (
          <Space size={4}>
            <span>{row.order.shippingService.name || row.order.shippingService.level || '—'}</span>
            {canWriteOrder(row) && row.order.status !== 'CANCELLED' ? (
              <Tooltip title={t('orders.actions.editShipping')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editShipping')}
                  icon={<TruckOutlined />}
                  onClick={(event) => openOrderModal(event, row.order.id, 'shipping')}
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
      {
        title: t('orders.columns.shop'),
        width: '12%',
        render: (_, row) => row.order.shop?.name ?? '—',
      },
      {
        title: t('orders.columns.totalCost'),
        width: '12%',
        render: (_, row) =>
          formatMinorMoney(
            row.order.pricing.totalCostAmount ?? row.order.pricing.baseCostAmount,
            row.order.pricing.currency ?? 'USD',
            i18n.language === 'vi' ? 'vi-VN' : 'en-US',
          ),
      },
      // {
      //   title: t('orders.columns.handling'),
      //   width: 150,
      //   render: (_, row) => {
      //     if (!row.order.shipByDate) return '—'
      //     const shipBy = dayjs(row.order.shipByDate).locale(i18n.language === 'vi' ? 'vi' : 'en')

      //     return (
      //       <Space direction="vertical" size={0}>
      //         <Typography.Text>
      //           {shipBy.format(i18n.language === 'vi' ? 'DD/MM/YYYY' : 'MMM D, YYYY')}
      //         </Typography.Text>
      //         <Typography.Text type={shipBy.isBefore(dayjs()) ? 'danger' : 'secondary'}>
      //           ({shipBy.fromNow()})
      //         </Typography.Text>
      //       </Space>
      //     )
      //   },
      // },
      {
        title: t('orders.columns.case'),
        width: '5%',
        render: (_, row) => {
          const hasCase = Boolean(row.order.caseStatus && row.order.caseStatus !== 'NONE')

          if (canWriteOrder(row)) {
            return (
              <Tooltip title={t('orders.actions.manageCase')}>
                <Button
                  className={[styles.caseButton, hasCase ? styles.activeCaseIcon : undefined]
                    .filter(Boolean)
                    .join(' ')}
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.manageCase')}
                  icon={<FileExclamationOutlined />}
                  onClick={(event) => openOrderModal(event, row.order.id, 'case')}
                />
              </Tooltip>
            )
          }

          if (!hasCase) return '—'
          return (
            <Tooltip title={row.order.caseTitle ?? t('orders.actions.manageCase')}>
              <span className={styles.caseIndicator} aria-label={t('orders.actions.manageCase')}>
                <FileExclamationOutlined className={styles.activeCaseIcon} />
              </span>
            </Tooltip>
          )
        },
      },
      {
        title: t('orders.sections.itemActions'),
        width: '7%',
        align: 'center',
        render: (_, row) =>
          canWriteOrder(row) ? (
            <Tooltip title={t('orders.actions.replaceOrder')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.replaceOrder')}
                icon={<SwapOutlined />}
                onClick={(event) => openOrderModal(event, row.order.id, 'replacement')}
              />
            </Tooltip>
          ) : (
            '—'
          ),
      },
    ],
    [canWriteOrder, i18n.language, openOrderModal, t],
  )

  return (
    <section className={styles.page}>
      <div className={styles.tabsRow}>
        <div className={styles.tabs}>
          <UiTabs
            className={styles.orderTabs}
            activeKey={tab}
            onChange={onTabChange}
            items={tabItems}
          />
        </div>

        <Button
          icon={<DownloadOutlined />}
          loading={exportOrders.isPending}
          onClick={() => exportOrders.mutate()}
        >
          {t('orders.export.button')}
        </Button>
      </div>
      <OrderWorkbenchFilterBar
        search={search}
        shopId={shopId}
        vendorId={vendorId}
        dates={dates}
        hasActiveFilters={hasActiveFilters}
        shopOptions={shopOptions}
        vendorOptions={vendorOptions}
        filtersLabel={t('orders.filters.label')}
        searchPlaceholder={t('orders.filters.search')}
        shopPlaceholder={t('orders.filters.shop')}
        vendorPlaceholder={t('orders.filters.vendor')}
        clearLabel={t('orders.filters.clear')}
        loadingShops={shops.isLoading}
        loadingVendors={vendors.isLoading}
        onSearchChange={onSearchChange}
        onShopChange={onShopChange}
        onVendorChange={onVendorChange}
        onDatesChange={onDatesChange}
        onClearFilters={handleClearFilters}
      />
      {orders.error ? (
        <FeedbackAlert
          type="error"
          title={t('orders.error')}
          action={
            <Button type="link" onClick={() => void orders.refetch()}>
              {t('orders.actions.retry')}
            </Button>
          }
        />
      ) : null}
      <CoreDataTable
        fillViewport
        className={styles.table}
        rowKey={(row) => row.order.id}
        columns={columns}
        dataSource={orders.data?.items ?? []}
        loading={orders.isFetching}
        scroll={{ x: 1320 }}
        rowClassName={() => styles.stickyOrderRow}
        pagination={{
          ...pagination,
          onChange: handlePageChange,
        }}
        expandable={{
          expandedRowKeys,
          showExpandColumn: false,
          expandedRowRender: renderExpandedRow,
        }}
      />
    </section>
  )
}

export default OrderWorkbenchPage
