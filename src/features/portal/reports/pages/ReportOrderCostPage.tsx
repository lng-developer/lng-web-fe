import { useUrlFilters } from '@/shared/hooks/useUrlFilters'
import { OrderCostSummary } from '../components/OrderCostSummary'
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouteLoaderData } from 'react-router-dom'
import { EyeOutlined, InfoCircleOutlined, PictureOutlined, ReloadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Image, Popover, Select, Space, Tag, Tooltip, Typography } from 'antd'
import dayjs from 'dayjs'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import { FinanceItemSnapshotModal } from '@/features/portal/finance/components/FinanceItemSnapshotModal'
import { FinanceOrderDetailModal } from '@/features/portal/finance/components/FinanceOrderDetailModal'
import { useFinanceMutations } from '@/features/portal/finance/hooks/useFinanceMutations'
import {
  CopyableOrderId,
  DateRangePicker,
  FilterBar,
  getDefaultDateRange,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import {
  getReportFilterOptions,
  listFinanceOrderProfitability,
  type OrderProfitability,
  type ReportFilters,
} from '../api/reportApi'
import { formatReportMoney } from '../components/reportFormatters'
import styles from './ReportOrderCostPage.module.scss'

export function ReportOrderCostPage({
  fixedSalesChannelCode,
}: {
  fixedSalesChannelCode?: 'AMAZON' | 'ETSY'
}) {
  const queryClient = useQueryClient()
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount | undefined
  const permissions = account
    ? [...account.permissions, ...account.scopes.flatMap((scope) => scope.permissions)]
    : []
  const canWrite = permissions.includes('FINANCE:WRITE') || permissions.includes('REPORTS:WRITE')

  const [filters, setFilters] = useUrlFilters<ReportFilters>(
    {
      ...getDefaultDateRange(7, dayjs(), 'Asia/Ho_Chi_Minh'),
      salesChannelCode: fixedSalesChannelCode,
    },
    [
      'externalOrderId',
      'shopId',
      'salesChannelCode',
      'marketplaceCode',
      'currency',
      'sellerEmployeeCode',
      'teamId',
      'departmentId',
      'financialStatus',
      'costCoverage',
      'dateFrom',
      'dateTo',
    ],
  )
  const {
    financialStatus,
    salesChannelCode,
    shopId,
    sellerEmployeeCode,
    teamId,
    departmentId,
    costCoverage,
    marketplaceCode,
    currency,
  } = filters
  const search = filters.externalOrderId || ''
  const dates = { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) =>
    setFilters((current) => ({ ...current, [key]: value }))
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)

  // Selected row keys for bulk actions
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])

  // Selected order & item for detail modals
  const [selectedOrder, setSelectedOrder] = useState<{ orderId: string; currency?: string } | null>(
    null,
  )
  const [selectedItemId, setSelectedItemId] = useState<string>()

  const filterOptions = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: getReportFilterOptions,
  })

  const shopNameById = useMemo(
    () =>
      new Map(
        (filterOptions.data?.shops || []).map((shop) => [
          shop.id,
          shop.name || shop.code || 'Unnamed',
        ]),
      ),
    [filterOptions.data?.shops],
  )

  const effectiveChannel = fixedSalesChannelCode || salesChannelCode

  const query = useQuery({
    queryKey: [
      'reports',
      'order-cost',
      effectiveChannel,
      marketplaceCode,
      currency,
      shopId,
      financialStatus,
      search,
      sellerEmployeeCode,
      teamId,
      departmentId,
      costCoverage,
      dates,
      page,
      pageSize,
    ],
    queryFn: () =>
      listFinanceOrderProfitability({
        ...dates,
        dateBasis: 'ORDERED_AT',
        page,
        limit: pageSize,
        externalOrderId: search || undefined,
        shopId,
        marketplaceCode,
        currency,
        sellerEmployeeCode,
        teamId,
        departmentId,
        costCoverage,
        salesChannelCode: effectiveChannel,
        financialStatus: financialStatus as never,
      }),
  })

  const rows = query.data?.items || []
  const summaries = query.data?.summaryByCurrency || []
  // Finance mutations for recalculate
  const { recalculate, recalculateBulk, recalculateItem } = useFinanceMutations()

  const handleInspectOrder = useCallback((row: OrderProfitability) => {
    if (row.orderId) {
      setSelectedOrder({ orderId: row.orderId, currency: row.currency || undefined })
    }
  }, [])

  const handleCloseOrderDetail = useCallback(() => {
    setSelectedOrder(null)
  }, [])

  const handleInspectItem = useCallback((itemId: string) => {
    setSelectedOrder(null)
    setSelectedItemId(itemId)
  }, [])

  const handleCloseItemSnapshot = useCallback(() => {
    setSelectedItemId(undefined)
  }, [])

  const handleRecalculateOrder = useCallback(
    (orderId: string) => {
      recalculate.mutate(orderId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['reports', 'order-cost'] })
        },
      })
    },
    [queryClient, recalculate],
  )

  const handleBulkRecalculate = useCallback(() => {
    const orderIds = [
      ...new Set(
        selectedRowKeys.map((key) => String(key).split('|')[0]).filter((id) => id.length === 24),
      ),
    ]
    if (!orderIds.length) return
    recalculateBulk.mutate(orderIds, {
      onSuccess: () => {
        setSelectedRowKeys([])
        queryClient.invalidateQueries({ queryKey: ['reports', 'order-cost'] })
      },
    })
  }, [selectedRowKeys, recalculateBulk, queryClient])

  const handleRecalculateItem = useCallback(
    (itemId: string) => {
      recalculateItem.mutate(itemId, {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: ['reports', 'order-cost'] })
        },
      })
    },
    [queryClient, recalculateItem],
  )

  const columns: TableColumnsType<OrderProfitability> = useMemo(
    () => [
      {
        title: 'Order · Product',
        dataIndex: 'externalOrderId',
        width: 250,
        render: (_: unknown, row: OrderProfitability) => {
          const hasMultipleItems = (row.itemThumbnails?.length || 0) > 1 || row.itemCount > 1
          const mainImage = row.productImageUrl || row.itemThumbnails?.[0]?.imageUrl
          const mainTitle = row.productTitle || row.itemThumbnails?.[0]?.title || 'Custom Product'

          const thumbnailElement = (
            <div style={{ position: 'relative', width: 42, height: 42, flexShrink: 0 }}>
              {mainImage ? (
                <Image
                  src={mainImage}
                  alt={mainTitle}
                  width={42}
                  height={42}
                  style={{
                    objectFit: 'cover',
                    borderRadius: 6,
                    border: '1px solid #e5e7eb',
                  }}
                  preview={{
                    mask: <EyeOutlined style={{ fontSize: 12 }} />,
                  }}
                  onClick={(e) => e.stopPropagation()}
                />
              ) : (
                <div
                  style={{
                    width: 42,
                    height: 42,
                    borderRadius: 6,
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#9ca3af',
                    fontSize: 18,
                    border: '1px solid #e5e7eb',
                  }}
                >
                  <PictureOutlined />
                </div>
              )}
              {hasMultipleItems && (
                <Tag
                  color="blue"
                  style={{
                    position: 'absolute',
                    bottom: -4,
                    right: -6,
                    margin: 0,
                    padding: '0 4px',
                    fontSize: 10,
                    lineHeight: '16px',
                    borderRadius: 8,
                    fontWeight: 700,
                  }}
                >
                  +{Math.max(1, (row.itemThumbnails?.length || row.itemCount) - 1)}
                </Tag>
              )}
            </div>
          )

          const multiItemsPopover =
            hasMultipleItems && (row.itemThumbnails?.length || 0) > 0 ? (
              <div style={{ display: 'grid', gap: 8, maxWidth: 300, padding: '4px 0' }}>
                <Typography.Text
                  strong
                  style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}
                >
                  Order Items ({row.itemThumbnails!.length})
                </Typography.Text>
                {row.itemThumbnails!.map((t, idx) => (
                  <div
                    key={t.orderItemId || idx}
                    style={{ display: 'flex', gap: 8, alignItems: 'center' }}
                  >
                    {t.imageUrl ? (
                      <img
                        src={t.imageUrl}
                        alt={t.title || ''}
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 4,
                          objectFit: 'cover',
                          border: '1px solid #e5e7eb',
                          flexShrink: 0,
                        }}
                      />
                    ) : (
                      <div
                        style={{
                          width: 32,
                          height: 32,
                          borderRadius: 4,
                          background: '#f3f4f6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <PictureOutlined style={{ color: '#9ca3af', fontSize: 12 }} />
                      </div>
                    )}
                    <div style={{ overflow: 'hidden', flex: 1, minWidth: 0 }}>
                      <Typography.Text ellipsis style={{ fontSize: 12, display: 'block' }}>
                        {t.title || 'Product'}
                      </Typography.Text>
                      <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                        {t.sku ? `SKU: ${t.sku}` : ''}{' '}
                        {t.quantity > 1 ? `· Qty: ${t.quantity}` : ''}
                      </Typography.Text>
                    </div>
                  </div>
                ))}
              </div>
            ) : null

          return (
            <Space align="start" size={10}>
              {multiItemsPopover ? (
                <Popover content={multiItemsPopover} trigger="hover" placement="right">
                  <div>{thumbnailElement}</div>
                </Popover>
              ) : (
                thumbnailElement
              )}
              <Space orientation="vertical" size={2} style={{ minWidth: 0 }}>
                {row.externalOrderId ? <CopyableOrderId strong value={row.externalOrderId} /> : '—'}
                <Typography.Text ellipsis style={{ fontSize: 12, maxWidth: 160 }} title={mainTitle}>
                  {mainTitle}
                </Typography.Text>
                <Typography.Text type="secondary" style={{ fontSize: 11 }}>
                  {row.orderedAt ? dayjs(row.orderedAt).format('YYYY-MM-DD HH:mm') : '—'}
                </Typography.Text>
              </Space>
            </Space>
          )
        },
      },
      {
        title: 'Channel · Shop',
        width: 150,
        ellipsis: true,
        render: (_: unknown, row: OrderProfitability) => (
          <Space orientation="vertical" size={2}>
            <Typography.Text strong>
              {`${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
              {(row.shopId ? shopNameById.get(row.shopId) : undefined) || '—'}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Seller · Team',
        width: 160,
        ellipsis: true,
        render: (_: unknown, row: OrderProfitability) => (
          <Space orientation="vertical" size={2}>
            <Typography.Text ellipsis>
              {row.sellerName || row.sellerEmployeeCode || '—'}
            </Typography.Text>
            <Typography.Text type="secondary" ellipsis style={{ fontSize: 12 }}>
              {row.teamName || '—'}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: 'Items',
        dataIndex: 'itemCount',
        width: 70,
        align: 'center',
        render: (value: number) => <span>{value || 1}</span>,
      },
      {
        title: 'Gross sales',
        dataIndex: 'revenueAmount',
        width: 110,
        align: 'right',
        render: (value: number, row: OrderProfitability) => (
          <span className={styles.moneyRevenue}>
            {formatReportMoney(value, row.currency || 'USD')}
          </span>
        ),
      },
      {
        title: 'Fee',
        dataIndex: 'marketplaceFeeAmount',
        width: 90,
        align: 'right',
        render: (value: number, row: OrderProfitability) => (
          <Tooltip title="Marketplace referral / transaction fee">
            <span style={{ color: '#6b7280', fontVariantNumeric: 'tabular-nums' }}>
              {formatReportMoney(value, row.currency || 'USD')}
            </span>
          </Tooltip>
        ),
      },
      ...(
        [
          ['estimatedFulfillmentCostAmount', 'estimatedCost'],
          ['actualVendorTotalAmount', 'actualVendorCost'],
          ['costVarianceAmount', 'costVariance'],
        ] as const
      ).map(([field, label]) => ({
        title: t(`finance.metrics.${label}`),
        dataIndex: field,
        width: 120,
        align: 'right' as const,
        render: (value: number | null | undefined, row: OrderProfitability) =>
          value == null ? '—' : formatReportMoney(value, row.currency || 'USD'),
      })),
      {
        title: t('finance.metrics.effectiveCost'),
        dataIndex: 'totalCostAmount',
        width: 130,
        align: 'right',
        render: (value: number | null, row: OrderProfitability) => {
          if (value == null) {
            return (
              <Tooltip title="One or more items are missing cost calculation">
                <Typography.Text type="danger" strong>
                  Missing cost
                </Typography.Text>
              </Tooltip>
            )
          }

          const breakdownContent = (
            <div className={styles.costBreakdown}>
              <Typography.Text
                strong
                style={{ borderBottom: '1px solid #f0f0f0', paddingBottom: 4 }}
              >
                Cost Breakdown
              </Typography.Text>
              <div className={styles.costBreakdownRow}>
                <Typography.Text type="secondary">Base product cost:</Typography.Text>
                <span>{formatReportMoney(row.baseCostAmount, row.currency || 'USD')}</span>
              </div>
              <div className={styles.costBreakdownRow}>
                <Typography.Text type="secondary">LNG fulfillment fee:</Typography.Text>
                <span>
                  {formatReportMoney(row.lngFulfillmentFeeAmount ?? 0, row.currency || 'USD')}
                </span>
              </div>
              <div className={styles.costBreakdownRow}>
                <Typography.Text type="secondary">Shipping cost:</Typography.Text>
                <span>{formatReportMoney(row.shippingCostAmount ?? 0, row.currency || 'USD')}</span>
              </div>
              {row.vendorAdditionalCostAmount ? (
                <div className={styles.costBreakdownRow}>
                  <Typography.Text type="secondary">Vendor additional:</Typography.Text>
                  <span>
                    {formatReportMoney(row.vendorAdditionalCostAmount, row.currency || 'USD')}
                  </span>
                </div>
              ) : null}
              <div className={styles.costBreakdownTotal}>
                <span>Total cost:</span>
                <span className={styles.moneyCost}>
                  {formatReportMoney(value, row.currency || 'USD')}
                </span>
              </div>
            </div>
          )

          return (
            <Popover content={breakdownContent} trigger="hover" placement="left">
              <span className={`${styles.moneyCost} ${styles.costTrigger}`}>
                {formatReportMoney(value, row.currency || 'USD')}{' '}
                <InfoCircleOutlined style={{ fontSize: 11, color: '#9ca3af' }} />
              </span>
            </Popover>
          )
        },
      },
      {
        title: t('finance.metrics.profit'),
        dataIndex: 'profitAmount',
        width: 110,
        align: 'right',
        render: (value: number | null, row: OrderProfitability) =>
          value == null ? (
            '—'
          ) : (
            <span className={value < 0 ? styles.moneyNegative : styles.moneyPositive}>
              {formatReportMoney(value, row.currency || 'USD')}
            </span>
          ),
      },
      {
        title: 'Margin',
        dataIndex: 'marginBps',
        width: 95,
        align: 'right',
        render: (value: number | null) => {
          if (value == null) {
            return '—'
          }
          const marginPercent = (value / 100).toFixed(1)
          const marginVal = value / 100
          const barWidth = Math.min(Math.max(marginVal, 0), 100)
          const barColor =
            marginVal >= 20
              ? 'var(--ant-color-success)'
              : marginVal >= 10
                ? 'var(--ant-color-warning)'
                : 'var(--ant-color-error)'

          return (
            <div className={styles.marginCell}>
              <span className={styles.marginPercentText}>{`${marginPercent}%`}</span>
              <div className={styles.marginMiniTrack}>
                <div
                  className={styles.marginMiniFill}
                  style={{ width: `${barWidth}%`, backgroundColor: barColor }}
                />
              </div>
            </div>
          )
        },
      },
      {
        title: 'Status',
        width: 130,
        render: (_: unknown, row: OrderProfitability) => (
          <Space orientation="vertical" size={2}>
            <StatusTag
              status={
                row.cancelledCount
                  ? 'cancelled'
                  : row.refundedCount || row.partiallyRefundedCount
                    ? 'warning'
                    : 'operational'
              }
            >
              {row.cancelledCount
                ? 'CANCELLED'
                : row.refundedCount
                  ? 'REFUNDED'
                  : row.partiallyRefundedCount
                    ? 'PARTIAL REFUND'
                    : 'ACTIVE'}
            </StatusTag>
            {row.missingCostCount ? (
              <StatusTag status="critical">MISSING COST</StatusTag>
            ) : (
              <StatusTag status="ready">Cost available</StatusTag>
            )}
          </Space>
        ),
      },
      {
        title: '',
        key: 'actions',
        width: 60,
        align: 'center',
        render: (_: unknown, row: OrderProfitability) =>
          row.orderId ? (
            <Tooltip title="View order financial detail">
              <Button
                type="text"
                size="small"
                icon={<EyeOutlined />}
                onClick={(e) => {
                  e.stopPropagation()
                  handleInspectOrder(row)
                }}
              />
            </Tooltip>
          ) : null,
      },
    ],
    [handleInspectOrder, shopNameById, t],
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title="Order cost"
        description="Comprehensive order profitability, cost breakdown, and margins"
        actions={<StatusTag status="ready">{effectiveChannel || 'ALL CHANNELS'}</StatusTag>}
      />

      {summaries.some((row) => row.missingSnapshotCount) && (
        <Alert
          type="warning"
          showIcon
          message={t('finance.missingSnapshots', {
            count: summaries.reduce((total, row) => total + (row.missingSnapshotCount || 0), 0),
          })}
        />
      )}
      <OrderCostSummary summaries={summaries} />

      <SectionCard
        title="Order profitability"
        extra={
          <Typography.Text type="secondary">
            {query.data?.pagination?.total || 0} orders
          </Typography.Text>
        }
      >
        <FilterBar label="Order profitability filters" contentClassName={styles.filters}>
          <SearchInput
            value={search}
            onSearchChange={(value) => {
              setFilter('externalOrderId', value)
              setPage(1)
            }}
            placeholder="Search external order ID"
          />
          {!fixedSalesChannelCode ? (
            <Select
              allowClear
              placeholder="Sales channel"
              value={salesChannelCode}
              onChange={(value) => {
                setFilter('salesChannelCode', value)
                setPage(1)
              }}
              options={(filterOptions.data?.channels || []).map((ch) => ({
                value: ch,
                label: ch,
              }))}
            />
          ) : null}
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Shop"
            value={shopId}
            onChange={(value) => {
              setFilter('shopId', value)
              setPage(1)
            }}
            options={(filterOptions.data?.shops || []).map((shop) => ({
              value: shop.id,
              label: shop.name || shop.code || 'Unnamed',
            }))}
          />
          <Select
            allowClear
            placeholder="Financial status"
            value={financialStatus}
            onChange={(value) => {
              setFilter('financialStatus', value)
              setPage(1)
            }}
            options={['ACTIVE', 'CANCELLED', 'PARTIALLY_REFUNDED', 'REFUNDED'].map((value) => ({
              value,
              label: value.replaceAll('_', ' '),
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Seller"
            value={sellerEmployeeCode}
            onChange={(value) => {
              setFilter('sellerEmployeeCode', value)
              setPage(1)
            }}
            options={(filterOptions.data?.sellers || []).map((seller) => ({
              value: seller.employeeCode,
              label: `${seller.employeeCode} · ${seller.name || 'Unnamed'}`,
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Team"
            value={teamId}
            onChange={(value) => {
              setFilter('teamId', value)
              setPage(1)
            }}
            options={(filterOptions.data?.teams || []).map((team) => ({
              value: team.id,
              label: team.name || team.code || 'Unnamed',
            }))}
          />
          <Select
            allowClear
            showSearch
            optionFilterProp="label"
            placeholder="Department"
            value={departmentId}
            onChange={(value) => {
              setFilter('departmentId', value)
              setPage(1)
            }}
            options={(filterOptions.data?.departments || []).map((dept) => ({
              value: dept.id,
              label: dept.name || dept.code || 'Unnamed',
            }))}
          />
          <Select
            allowClear
            placeholder="Cost status"
            value={costCoverage}
            onChange={(value) => {
              setFilter('costCoverage', value)
              setPage(1)
            }}
            options={[
              { value: 'COMPLETE', label: 'Cost available' },
              { value: 'MISSING', label: 'Missing cost' },
            ]}
          />
          <Select
            allowClear
            aria-label={t('finance.filters.marketplace')}
            placeholder={t('finance.filters.marketplace')}
            value={marketplaceCode}
            onChange={(value) => {
              setFilter('marketplaceCode', value)
              setPage(1)
            }}
            options={(filterOptions.data?.marketplaces || []).map((value) => ({
              value,
              label: value,
            }))}
          />
          <Select
            allowClear
            aria-label={t('finance.filters.currency')}
            placeholder={t('finance.filters.currency')}
            value={currency}
            onChange={(value) => {
              setFilter('currency', value)
              setPage(1)
            }}
            options={['USD', 'CAD', 'EUR', 'GBP', 'VND'].map((value) => ({ value, label: value }))}
          />
          <DateRangePicker
            timeZone="Asia/Ho_Chi_Minh"
            value={dates}
            onChange={(value) => {
              setFilters((current) => ({
                ...current,
                dateFrom: value.dateFrom,
                dateTo: value.dateTo,
              }))
              setPage(1)
            }}
          />
        </FilterBar>

        {selectedRowKeys.length > 0 ? (
          <div className={styles.bulkActionBar}>
            <Space>
              <span>
                {t('finance.bulk.selectedCount', {
                  count: selectedRowKeys.length,
                  defaultValue: `Đã chọn ${selectedRowKeys.length} đơn hàng`,
                })}
              </span>
              <Button
                type="primary"
                icon={<ReloadOutlined />}
                loading={recalculateBulk.isPending}
                disabled={!canWrite}
                onClick={handleBulkRecalculate}
              >
                {t('finance.actions.recalculateBulk', {
                  count: selectedRowKeys.length,
                  defaultValue: `Tính lại tài chính (${selectedRowKeys.length})`,
                })}
              </Button>
            </Space>
            <Button type="link" onClick={() => setSelectedRowKeys([])}>
              {t('common.clearSelection', { defaultValue: 'Bỏ chọn' })}
            </Button>
          </div>
        ) : null}

        <CoreDataTable
          rowKey={(row) => `${row.orderId || row.externalOrderId || ''}|${row.currency}`}
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
          rowSelection={{
            selectedRowKeys,
            onChange: setSelectedRowKeys,
            preserveSelectedRowKeys: true,
            getCheckboxProps: (row) => ({
              disabled: !row.orderId,
            }),
          }}
          onRow={(row) => ({
            className: styles.interactiveRow,
            onClick: (event) => {
              const target = event.target as HTMLElement | null
              if (target?.closest('.ant-checkbox-wrapper') || target?.closest('.ant-btn')) {
                return
              }
              handleInspectOrder(row)
            },
          })}
          pagination={
            query.data?.pagination
              ? {
                  current: query.data.pagination.page,
                  pageSize: query.data.pagination.limit,
                  total: query.data.pagination.total,
                  onChange: (nextPage, nextPageSize) => {
                    setPage(nextPage)
                    if (nextPageSize !== pageSize) {
                      setPageSize(nextPageSize)
                      setPage(1)
                    }
                  },
                }
              : false
          }
          scroll={{ x: 1200 }}
        />
      </SectionCard>

      <FinanceOrderDetailModal
        filters={{
          ...dates,
          marketplaceCode,
          currency,
          shopId,
          sellerEmployeeCode,
          teamId,
          departmentId,
          financialStatus,
          salesChannelCode: effectiveChannel,
        }}
        selectedOrder={selectedOrder}
        canWrite={canWrite}
        isRecalculatingOrder={recalculate.isPending}
        isRecalculatingItem={recalculateItem.isPending}
        onClose={handleCloseOrderDetail}
        onInspectItem={handleInspectItem}
        onRecalculateOrder={handleRecalculateOrder}
        onRecalculateItem={handleRecalculateItem}
      />

      <FinanceItemSnapshotModal
        selectedItemId={selectedItemId}
        canWrite={canWrite}
        isRecalculatingItem={recalculateItem.isPending}
        onClose={handleCloseItemSnapshot}
        onRecalculateItem={handleRecalculateItem}
      />
    </div>
  )
}
