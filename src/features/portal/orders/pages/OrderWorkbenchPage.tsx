import { useCallback, useDeferredValue, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
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
import { Button, Select, Space, Table, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { listShops } from '@/features/portal/shops/api/shopApi'
import { shopKeys } from '@/features/portal/shops/api/shopKeys'
import { getPermissions } from '@/shared/auth/session'
import {
  CopyableOrderId,
  DateRangePicker,
  FeedbackAlert,
  FilterBar,
  SearchInput,
  StatusTag,
  UiTabs,
} from '@/shared/ui'

import { getOrderSummary, listOrderWorkbench, type OrderWorkbenchRow } from '../api/orderApi'
import { orderKeys } from '../api/orderKeys'
import { OrderInlinePanel } from './OrderInlinePanel'
import { formatMinorMoney, orderStatusTone } from './orderPresentation'
import styles from './OrderWorkbenchPage.module.scss'

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
]
const ADDRESS_STATUSES = ['NOT_CHECKED', 'VALID', 'INVALID', 'WARNING', 'OVERRIDDEN']
type OrderModal = 'address' | 'customer' | 'shipping' | 'case' | 'replacement' | 'timeline'

export function OrderWorkbenchPage() {
  const { t, i18n } = useTranslation()
  const [page, setPage] = useState(1)
  const [tab, setTab] = useState('ALL')
  const [search, setSearch] = useState('')
  const [shopId, setShopId] = useState<string>()
  const [employeeCode, setEmployeeCode] = useState('')
  const [addressValidationStatus, setAddressValidationStatus] = useState<string>()
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [orderAction, setOrderAction] = useState<{ orderId: string; modal: OrderModal }>()
  const canWrite = getPermissions().includes('ORDERS:WRITE')
  const params = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      tab,
      search,
      shopId,
      employeeCode,
      addressValidationStatus,
      ...dates,
    }),
    [addressValidationStatus, dates, employeeCode, page, search, shopId, tab],
  )
  const summaryParams = useMemo(
    () => ({ page: 1, limit: 1, search, shopId, employeeCode, addressValidationStatus, ...dates }),
    [addressValidationStatus, dates, employeeCode, search, shopId],
  )
  const orders = useQuery({
    queryKey: orderKeys.workbench(params),
    queryFn: () => listOrderWorkbench(params),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const summary = useQuery({
    queryKey: orderKeys.summary(summaryParams),
    queryFn: () => getOrderSummary(summaryParams),
    retry: false,
  })
  const shopParams = useMemo(() => ({ page: 1, limit: 100, status: 'ACTIVE' as const }), [])
  const shops = useQuery({
    queryKey: shopKeys.list(shopParams),
    queryFn: () => listShops(shopParams),
    retry: false,
  })
  const displayedOrders = useDeferredValue(orders.data)
  const onSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])
  const closeOrderModal = useCallback(() => setOrderAction(undefined), [])

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
                onClick={() => setOrderAction({ orderId: row.order.id, modal: 'timeline' })}
              />
            </Tooltip>
          </Space>
        ),
      },
      {
        title: t('orders.columns.created'),
        render: (_, row) =>
          row.order.createdAt ? dayjs(row.order.createdAt).format('DD/MM/YYYY HH:mm') : '—',
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
            {canWrite ? (
              <Tooltip title={t('orders.actions.editCustomer')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editCustomer')}
                  icon={<EditOutlined />}
                  onClick={() => setOrderAction({ orderId: row.order.id, modal: 'customer' })}
                />
              </Tooltip>
            ) : null}
            {canWrite ? (
              <Tooltip title={t('orders.actions.editAddress')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editAddress')}
                  icon={<EnvironmentOutlined />}
                  onClick={() => setOrderAction({ orderId: row.order.id, modal: 'address' })}
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
            {canWrite ? (
              <Tooltip title={t('orders.actions.editShipping')}>
                <Button
                  type="text"
                  size="small"
                  aria-label={t('orders.actions.editShipping')}
                  icon={<TruckOutlined />}
                  onClick={() => setOrderAction({ orderId: row.order.id, modal: 'shipping' })}
                />
              </Tooltip>
            ) : null}
          </Space>
        ),
      },
      { title: t('orders.columns.shop'), render: (_, row) => row.order.shop?.name ?? '—' },
      {
        title: t('orders.columns.cost'),
        align: 'right',
        render: (_, row) =>
          formatMinorMoney(
            row.order.pricing.baseCostAmount,
            row.order.pricing.currency ?? 'USD',
            i18n.language === 'vi' ? 'vi-VN' : 'en-US',
          ),
      },
      {
        title: t('orders.columns.handling'),
        width: 110,
        render: (_, row) => row.order.handlingLabel ?? '—',
      },
      {
        title: t('orders.columns.case'),
        width: 72,
        align: 'center',
        render: (_, row) =>
          canWrite ? (
            <Tooltip title={t('orders.actions.manageCase')}>
              <Button
                className={
                  row.order.caseStatus && row.order.caseStatus !== 'NONE'
                    ? styles.activeCaseIcon
                    : undefined
                }
                type="text"
                size="small"
                aria-label={t('orders.actions.manageCase')}
                icon={<FileExclamationOutlined />}
                onClick={() => setOrderAction({ orderId: row.order.id, modal: 'case' })}
              />
            </Tooltip>
          ) : row.order.caseStatus && row.order.caseStatus !== 'NONE' ? (
            <FileExclamationOutlined className={styles.activeCaseIcon} />
          ) : (
            '—'
          ),
      },
      {
        title: t('orders.sections.itemActions'),
        width: 72,
        align: 'center',
        render: (_, row) =>
          canWrite ? (
            <Tooltip title={t('orders.actions.replaceOrder')}>
              <Button
                type="text"
                size="small"
                aria-label={t('orders.actions.replaceOrder')}
                icon={<SwapOutlined />}
                onClick={() => setOrderAction({ orderId: row.order.id, modal: 'replacement' })}
              />
            </Tooltip>
          ) : (
            '—'
          ),
      },
    ],
    [canWrite, i18n.language, t],
  )

  return (
    <section className={styles.page}>
      <header className={styles.header}>
        <div>
          <Typography.Title level={3}>{t('orders.title')}</Typography.Title>
          <Typography.Text type="secondary">{t('orders.description')}</Typography.Text>
        </div>
        <Button
          icon={<ReloadOutlined />}
          onClick={() => void Promise.all([orders.refetch(), summary.refetch()])}
        >
          {t('orders.actions.refresh')}
        </Button>
      </header>
      <UiTabs
        activeKey={tab}
        onChange={(value) => {
          setTab(value)
          setPage(1)
        }}
        items={TABS.map((key) => ({
          key,
          label: `${t(`orders.tabs.${key}`)} ${summary.data?.tabCounts[key] ?? 0}`,
        }))}
      />
      <FilterBar label={t('orders.filters.label')} contentClassName={styles.filters}>
        <SearchInput
          className={styles.orderSearch}
          value={search}
          onSearchChange={onSearchChange}
          placeholder={t('orders.filters.search')}
        />
        <Select
          className={styles.filterSelect}
          allowClear
          showSearch
          optionFilterProp="label"
          value={shopId}
          loading={shops.isLoading}
          placeholder={t('orders.filters.shop')}
          options={(shops.data?.items ?? []).map((shop) => ({ value: shop.id, label: shop.name }))}
          onChange={(value) => {
            setShopId(value)
            setPage(1)
          }}
        />
        <SearchInput
          className={styles.sellerFilter}
          value={employeeCode}
          onSearchChange={(value) => {
            setEmployeeCode(value)
            setPage(1)
          }}
          placeholder={t('orders.filters.seller')}
        />
        <Select
          className={styles.filterSelect}
          allowClear
          value={addressValidationStatus}
          placeholder={t('orders.filters.addressStatus')}
          options={ADDRESS_STATUSES.map((status) => ({
            value: status,
            label: t(`orders.addressStatuses.${status}`),
          }))}
          onChange={(value) => {
            setAddressValidationStatus(value)
            setPage(1)
          }}
        />
        <DateRangePicker
          value={dates}
          onChange={(value) => {
            setDates(value)
            setPage(1)
          }}
        />
        {shopId || employeeCode || addressValidationStatus || dates.dateFrom || dates.dateTo ? (
          <Button
            onClick={() => {
              setShopId(undefined)
              setEmployeeCode('')
              setAddressValidationStatus(undefined)
              setDates({})
              setPage(1)
            }}
          >
            {t('orders.filters.clear')}
          </Button>
        ) : null}
      </FilterBar>
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
      <Table
        className={styles.table}
        rowKey={(row) => row.order.id}
        columns={columns}
        dataSource={displayedOrders?.items ?? []}
        loading={orders.isFetching}
        scroll={{ x: 1280 }}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: displayedOrders?.pagination.total,
          showSizeChanger: false,
          onChange: setPage,
        }}
        expandable={{
          expandedRowKeys: (displayedOrders?.items ?? []).map((row) => row.order.id),
          showExpandColumn: false,
          expandedRowRender: (row) => (
            <OrderInlinePanel
              row={row}
              canWrite={canWrite}
              requestedModal={orderAction?.orderId === row.order.id ? orderAction.modal : undefined}
              onOrderModalClose={closeOrderModal}
            />
          ),
        }}
      />
    </section>
  )
}

export default OrderWorkbenchPage
