import 'dayjs/locale/vi'

import { type MouseEvent, useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import {
  CheckCircleFilled,
  EditOutlined,
  EnvironmentOutlined,
  FileExclamationOutlined,
  HistoryOutlined,
  ReloadOutlined,
  SwapOutlined,
  TruckOutlined,
} from '@ant-design/icons'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Space, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listShops } from '@/features/portal/shops/api/shopApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import {
  CopyableOrderId,
  DataTable,
  FeedbackAlert,
  PageHeader,
  type PopupModalAnchor,
  StatusTag,
  UiTabLabel,
  UiTabs,
} from '@/shared/ui'

import { getOrderSummary, listOrderWorkbench, type OrderWorkbenchRow } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { formatMinorMoney, orderStatusTone } from './orderPresentation'
import { OrderWorkbenchExpandedRow } from './OrderWorkbenchExpandedRow'
import { OrderWorkbenchFilterBar } from './OrderWorkbenchFilterBar'
import styles from './OrderWorkbenchPage.module.scss'

dayjs.extend(relativeTime)

const PAGE_SIZE = 10
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
const ADDRESS_STATUSES = ['NOT_CHECKED', 'VALID', 'INVALID', 'WARNING', 'OVERRIDDEN'] as const

type TabKey = (typeof TABS)[number]
type AddressValidationStatus = (typeof ADDRESS_STATUSES)[number]
type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'
type OrderAction = { orderId: string; modal: OrderModal; anchor?: PopupModalAnchor }
const EMPTY_DATES = { dateFrom: undefined, dateTo: undefined } as const

export function OrderWorkbenchPage() {
  const { t, i18n } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState<TabKey>('ALL')
  const [search, setSearch] = useState('')
  const deferredSearch = useDeferredValue(search)
  const [shopId, setShopId] = useState<string>()
  const [addressValidationStatus, setAddressValidationStatus] = useState<AddressValidationStatus>()
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
      limit: PAGE_SIZE,
      tab,
      search: deferredSearch,
      shopId,
      addressValidationStatus,
      ...dates,
    }),
    [addressValidationStatus, dates, page, deferredSearch, shopId, tab],
  )
  const summaryParams = useMemo(
    () => ({
      page: 1,
      limit: 1,
      search: deferredSearch,
      shopId,
      addressValidationStatus,
      ...dates,
    }),
    [addressValidationStatus, dates, deferredSearch, shopId],
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
  const shopOptions = useMemo(
    () => (shops.data?.items ?? []).map((shop) => ({ value: shop.id, label: shop.name })),
    [shops.data],
  )
  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const onTabChange = useCallback((value: string) => {
    setTab(value as TabKey)
    setPage(1)
  }, [])
  const onShopChange = useCallback((value?: string) => {
    setShopId(value)
    setPage(1)
  }, [])
  const onAddressValidationStatusChange = useCallback((value?: string) => {
    setAddressValidationStatus(value as AddressValidationStatus | undefined)
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
  // W2: stable refetch handler — avoid new fn ref on every render
  const handleRefetch = useCallback(
    () => void Promise.all([orders.refetch(), summary.refetch()]),
    [orders, summary],
  )
  // R4: stable clear filter handler
  const handleClearFilters = useCallback(() => {
    setShopId(undefined)
    setAddressValidationStatus(undefined)
    setDates(EMPTY_DATES)
    setPage(1)
  }, [])
  // R2: memoize address status options — avoids .map() on every render
  const addressStatusOptions = useMemo(
    () =>
      ADDRESS_STATUSES.map((status) => ({
        value: status,
        label: t(`orders.addressStatuses.${status}`),
      })),
    [t],
  )
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
  const hasActiveFilters = Boolean(
    shopId || addressValidationStatus || dates.dateFrom || dates.dateTo,
  )
  const pagination = useMemo(
    () => ({
      current: page,
      pageSize: PAGE_SIZE,
      total: orders.data?.pagination.total,
      showSizeChanger: false,
    }),
    [page, orders.data?.pagination.total],
  )
  const handlePageChange = useCallback((nextPage: number) => {
    setPage(nextPage)
  }, [])
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
        render: (_, row) => <CopyableOrderId strong value={row.order.externalOrderId} />,
      },
      {
        title: t('orders.columns.status'),
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
      { title: t('orders.columns.shop'), render: (_, row) => row.order.shop?.name ?? '—' },
      {
        title: t('orders.columns.totalCost'),
        align: 'right',
        render: (_, row) =>
          formatMinorMoney(
            row.order.pricing.totalCostAmount ?? row.order.pricing.baseCostAmount,
            row.order.pricing.currency ?? 'USD',
            i18n.language === 'vi' ? 'vi-VN' : 'en-US',
          ),
      },
      {
        title: t('orders.columns.handling'),
        width: 150,
        render: (_, row) => {
          if (!row.order.shipByDate) return '—'
          const shipBy = dayjs(row.order.shipByDate).locale(i18n.language === 'vi' ? 'vi' : 'en')

          return (
            <Space direction="vertical" size={0}>
              <Typography.Text>
                {shipBy.format(i18n.language === 'vi' ? 'DD/MM/YYYY' : 'MMM D, YYYY')}
              </Typography.Text>
              <Typography.Text type={shipBy.isBefore(dayjs()) ? 'danger' : 'secondary'}>
                ({shipBy.fromNow()})
              </Typography.Text>
            </Space>
          )
        },
      },
      {
        title: t('orders.columns.case'),
        width: 180,
        render: (_, row) => {
          const hasCase = Boolean(row.order.caseStatus && row.order.caseStatus !== 'NONE')

          if (canWriteOrder(row)) {
            return (
              <Tooltip title={t('orders.actions.manageCase')}>
                <Button
                  className={hasCase ? styles.activeCaseIcon : undefined}
                  type={row.order.caseTitle ? 'link' : 'text'}
                  size="small"
                  aria-label={t('orders.actions.manageCase')}
                  icon={<FileExclamationOutlined />}
                  onClick={(event) => openOrderModal(event, row.order.id, 'case')}
                >
                  {row.order.caseTitle}
                </Button>
              </Tooltip>
            )
          }

          if (!hasCase) return '—'
          return (
            <Space size={4}>
              <FileExclamationOutlined className={styles.activeCaseIcon} />
              {row.order.caseTitle}
            </Space>
          )
        },
      },
      {
        title: t('orders.sections.itemActions'),
        width: 72,
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
      <PageHeader
        title={t('orders.title')}
        description={t('orders.description')}
        actions={
          <Button icon={<ReloadOutlined />} onClick={handleRefetch}>
            {t('orders.actions.refresh')}
          </Button>
        }
      />
      <UiTabs activeKey={tab} onChange={onTabChange} items={tabItems} />
      <OrderWorkbenchFilterBar
        search={search}
        shopId={shopId}
        addressValidationStatus={addressValidationStatus}
        dates={dates}
        hasActiveFilters={hasActiveFilters}
        shopOptions={shopOptions}
        addressStatusOptions={addressStatusOptions}
        filtersLabel={t('orders.filters.label')}
        searchPlaceholder={t('orders.filters.search')}
        shopPlaceholder={t('orders.filters.shop')}
        addressPlaceholder={t('orders.filters.addressStatus')}
        clearLabel={t('orders.filters.clear')}
        loadingShops={shops.isLoading}
        onSearchChange={onSearchChange}
        onShopChange={onShopChange}
        onAddressValidationStatusChange={onAddressValidationStatusChange}
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
      <DataTable
        className={styles.table}
        rowKey={(row) => row.order.id}
        columns={columns}
        dataSource={orders.data?.items ?? []}
        loading={orders.isFetching}
        scroll={{ x: 1280 }}
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
