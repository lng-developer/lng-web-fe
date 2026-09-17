import { type ReactNode, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarOutlined,
  ExclamationCircleOutlined,
  RiseOutlined,
  SearchOutlined,
  ShoppingCartOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Input, Segmented, Tag, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { CopyableOrderId, FormattedDateTime, MetricCard, StatusTag } from '@/shared/ui'

import type { OrderProfitability, OrderProfitabilityReport } from '../api/reportApi'
import styles from '../pages/ReportWorkspacePage.module.scss'
import { formatReportMoney, formatReportPercent } from './reportFormatters'

interface ReportOrderCostTabProps {
  data?: OrderProfitabilityReport
  isPending: boolean
  onPageChange: (page: number) => void
  costCoverage?: 'MISSING' | 'COMPLETE'
  onCostCoverageChange: (value?: 'MISSING' | 'COMPLETE') => void
  filterBar?: ReactNode
}

type StatusFilter = 'all' | 'missing' | 'complete'

export function ReportOrderCostTab({
  data,
  isPending,
  onPageChange,
  costCoverage,
  onCostCoverageChange,
  filterBar,
}: ReportOrderCostTabProps) {
  const { t } = useTranslation()
  const [search, setSearch] = useState('')
  const statusFilter: StatusFilter =
    costCoverage === 'MISSING' ? 'missing' : costCoverage === 'COMPLETE' ? 'complete' : 'all'

  const items = useMemo(() => data?.items || [], [data?.items])
  const summary = data?.summaryByCurrency?.[0]

  const missingCount = useMemo(
    () => items.filter((row) => row.missingCostCount > 0).length,
    [items],
  )
  const completeCount = useMemo(
    () => items.filter((row) => row.missingCostCount === 0).length,
    [items],
  )

  const filteredItems = useMemo(() => {
    let result = items
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(
        (row) =>
          (row.externalOrderId && row.externalOrderId.toLowerCase().includes(q)) ||
          (row.orderId && row.orderId.toLowerCase().includes(q)) ||
          (row.salesChannelCode && row.salesChannelCode.toLowerCase().includes(q)) ||
          (row.marketplaceCode && row.marketplaceCode.toLowerCase().includes(q)),
      )
    }
    return result
  }, [items, search])

  const columns: TableColumnsType<OrderProfitability> = useMemo(
    () => [
      {
        title: t('reports.columns.order'),
        dataIndex: 'externalOrderId',
        key: 'orderId',
        width: 220,
        fixed: 'left',
        sorter: (a, b) =>
          (a.externalOrderId || a.orderId || '').localeCompare(
            b.externalOrderId || b.orderId || '',
          ),
        render: (_: unknown, record: OrderProfitability) => {
          const displayId = record.externalOrderId || record.orderId || '—'

          return (
            <div className={styles.orderIdMeta}>
              <div className="flex items-center gap-1.5">
                <CopyableOrderId value={displayId} />
              </div>
              <div className={styles.orderIdSub}>
                <span>
                  {record.itemCount} {t('reports.columns.items').toLowerCase()}
                </span>
                {record.marketplaceCode ? (
                  <Tag className="!m-0 !px-1.5 !text-[11px] !leading-tight">
                    {record.marketplaceCode}
                  </Tag>
                ) : null}
              </div>
            </div>
          )
        },
      },
      {
        title: t('reports.columns.date'),
        dataIndex: 'orderedAt',
        key: 'orderedAt',
        width: 120,
        sorter: (a, b) =>
          (a.orderedAt || a.reportDate || '').localeCompare(b.orderedAt || b.reportDate || ''),
        render: (value: string | null, record: OrderProfitability) => {
          const rawDate = value || record.reportDate
          return <FormattedDateTime value={rawDate} />
        },
      },
      {
        title: t('reports.columns.revenue'),
        dataIndex: 'revenueAmount',
        key: 'revenueAmount',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.revenueAmount - b.revenueAmount,
        render: (value: number, record: OrderProfitability) => (
          <Typography.Text strong>
            {formatReportMoney(value, record.currency || 'USD')}
          </Typography.Text>
        ),
      },
      {
        title: t('reports.orderCost.totalFulfillmentCost'),
        dataIndex: 'totalCostAmount',
        key: 'totalCostAmount',
        width: 140,
        align: 'right',
        sorter: (a, b) => (a.totalCostAmount ?? -1) - (b.totalCostAmount ?? -1),
        render: (value: number | null, record: OrderProfitability) => {
          if (value == null) {
            return <Tag color="warning">{t('reports.orderCost.costMissing')}</Tag>
          }
          return <span>{formatReportMoney(value, record.currency || 'USD')}</span>
        },
      },
      {
        title: t('reports.columns.marketplaceFee'),
        dataIndex: 'marketplaceFeeAmount',
        key: 'marketplaceFeeAmount',
        width: 120,
        align: 'right',
        sorter: (a, b) => a.marketplaceFeeAmount - b.marketplaceFeeAmount,
        render: (value: number, record: OrderProfitability) => (
          <Typography.Text type="secondary">
            {formatReportMoney(value, record.currency || 'USD')}
          </Typography.Text>
        ),
      },
      {
        title: t('reports.orderCost.feesAndDeductions'),
        key: 'deductions',
        width: 130,
        align: 'right',
        sorter: (a, b) =>
          (a.refundAmount || 0) +
          (a.discountAmount || 0) -
          ((b.refundAmount || 0) + (b.discountAmount || 0)),
        render: (_: unknown, record: OrderProfitability) => {
          const deductions = (record.refundAmount || 0) + (record.discountAmount || 0)
          if (deductions === 0) return <span className={styles.moneyMuted}>—</span>
          return (
            <Tooltip
              title={
                <div>
                  <div>
                    {t('reports.columns.refund')}:{' '}
                    {formatReportMoney(record.refundAmount, record.currency || 'USD')}
                  </div>
                  <div>
                    {t('reports.columns.discount')}:{' '}
                    {formatReportMoney(record.discountAmount, record.currency || 'USD')}
                  </div>
                </div>
              }
            >
              <span className={styles.moneyNegative}>
                -{formatReportMoney(deductions, record.currency || 'USD')}
              </span>
            </Tooltip>
          )
        },
      },
      {
        title: t('reports.metrics.netProfit'),
        dataIndex: 'profitAmount',
        key: 'profitAmount',
        width: 130,
        align: 'right',
        sorter: (a, b) => (a.profitAmount ?? -Infinity) - (b.profitAmount ?? -Infinity),
        render: (value: number | null, record: OrderProfitability) => {
          if (value == null) return <span className={styles.moneyMuted}>—</span>
          const currency = record.currency || 'USD'
          if (value > 0) {
            return (
              <span className={styles.moneyPositive}>+{formatReportMoney(value, currency)}</span>
            )
          }
          if (value < 0) {
            return (
              <span className={styles.moneyNegative}>{formatReportMoney(value, currency)}</span>
            )
          }
          return <span>{formatReportMoney(value, currency)}</span>
        },
      },
      {
        title: t('reports.columns.margin'),
        dataIndex: 'marginBps',
        key: 'marginBps',
        width: 100,
        align: 'center',
        sorter: (a, b) => (a.marginBps ?? -Infinity) - (b.marginBps ?? -Infinity),
        render: (value: number | null) => {
          if (value == null) return <span className={styles.moneyMuted}>—</span>
          const color = value >= 2000 ? 'success' : value >= 0 ? 'blue' : 'error'
          return <Tag color={color}>{formatReportPercent(value)}</Tag>
        },
      },
      {
        title: t('reports.orderCost.costStatus'),
        key: 'costStatus',
        width: 120,
        align: 'center',
        sorter: (a, b) => a.missingCostCount - b.missingCostCount,
        render: (_: unknown, record: OrderProfitability) => {
          if (record.missingCostCount > 0) {
            return <StatusTag status="warning">{t('reports.orderCost.costMissing')}</StatusTag>
          }
          if (record.profitAmount != null && record.profitAmount < 0) {
            return <StatusTag status="critical">{t('reports.orderCost.loss')}</StatusTag>
          }
          return <StatusTag status="operational">{t('reports.orderCost.costComplete')}</StatusTag>
        },
      },
    ],
    [t],
  )

  const segmentedOptions = useMemo(
    () => [
      {
        label: `${t('reports.orderCost.allOrders')} (${summary?.orderCount ?? items.length})`,
        value: 'all',
      },
      {
        label: `${t('reports.orderCost.missingCostOnly')} (${summary?.missingCostOrderCount ?? missingCount})`,
        value: 'missing',
      },
      {
        label: `${t('reports.orderCost.completeCostOnly')} (${summary?.costedOrderCount ?? completeCount})`,
        value: 'complete',
      },
    ],
    [t, summary, items.length, missingCount, completeCount],
  )

  const toolbar = (
    <div className={styles.orderCostToolbar}>
      <Segmented
        value={statusFilter}
        onChange={(val) =>
          onCostCoverageChange(
            val === 'missing' ? 'MISSING' : val === 'complete' ? 'COMPLETE' : undefined,
          )
        }
        options={segmentedOptions}
      />
      <div className={styles.orderCostToolbarActions}>
        <Input
          allowClear
          prefix={<SearchOutlined className="text-gray-400" />}
          placeholder={t('reports.orderCost.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={styles.orderCostSearchInput}
        />
      </div>
    </div>
  )

  return (
    <div className={styles.stack}>
      {(data?.summaryByCurrency || []).map((currSummary) => (
        <div key={currSummary.currency || 'unknown'} className={styles.salesMetrics}>
          <MetricCard
            icon={<ShoppingCartOutlined />}
            label={t('reports.columns.orders')}
            value={String(currSummary.orderCount)}
            variant="neutral"
            loading={isPending}
          />
          <MetricCard
            icon={<DollarOutlined />}
            label={t('reports.columns.revenue')}
            value={formatReportMoney(currSummary.revenueAmount, currSummary.currency || 'USD')}
            variant="primary"
            loading={isPending}
          />
          <MetricCard
            icon={<RiseOutlined />}
            label={t('reports.metrics.netProfit')}
            value={formatReportMoney(currSummary.profitAmount, currSummary.currency || 'USD')}
            status={formatReportPercent(currSummary.marginBps)}
            variant="success"
            loading={isPending}
          />
          <MetricCard
            icon={<WalletOutlined />}
            label={t('reports.orderCost.costCoverage')}
            value={t('reports.orderCost.costCoverageValue', {
              costed: currSummary.costedOrderCount,
              total: currSummary.orderCount,
            })}
            variant="info"
            loading={isPending}
          />
          <MetricCard
            icon={<ExclamationCircleOutlined />}
            label={t('reports.metrics.missingCost')}
            value={String(currSummary.missingCostOrderCount)}
            variant="danger"
            loading={isPending}
          />
        </div>
      ))}

      {filterBar}

      <CoreDataTable
        toolbar={toolbar}
        className={styles.orderCostTable}
        tableLayout="fixed"
        rowKey={(row) => `${row.orderId || row.externalOrderId || ''}-${row.currency || 'USD'}`}
        dataSource={filteredItems}
        columns={columns}
        loading={isPending}
        scroll={{ x: 1200 }}
        pagination={{
          current: data?.pagination.page || 1,
          pageSize: data?.pagination.limit || 20,
          total: data?.pagination.total || 0,
          showSizeChanger: false,
          onChange: onPageChange,
        }}
        expandable={{
          expandedRowRender: (record: OrderProfitability) => {
            const currency = record.currency || 'USD'
            const formatCost = (amount: number | null) =>
              amount == null
                ? t('reports.orderCost.costMissing')
                : formatReportMoney(amount, currency)
            return (
              <div className={styles.orderExpandedBreakdown}>
                <div className={styles.orderExpandedTitle}>
                  {t('reports.orderCost.breakdown')} · {record.externalOrderId || record.orderId}
                </div>
                <div className={styles.orderExpandedGrid}>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.columns.revenue')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatReportMoney(record.revenueAmount, currency)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.orderCost.baseCost')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatReportMoney(record.baseCostAmount, currency)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.orderCost.lngFulfillmentFee')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatCost(record.lngFulfillmentFeeAmount)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.orderCost.vendorExtras')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatCost(record.vendorAdditionalCostAmount)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.orderCost.shipping')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatCost(record.shippingCostAmount)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.columns.marketplaceFee')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatReportMoney(record.marketplaceFeeAmount, currency)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.columns.refund')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatReportMoney(record.refundAmount, currency)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>−</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.columns.discount')}
                    </span>
                    <span className={styles.orderExpandedItemValue}>
                      {formatReportMoney(record.discountAmount, currency)}
                    </span>
                  </div>
                  <span className={styles.orderExpandedOperator}>=</span>
                  <div className={styles.orderExpandedItem}>
                    <span className={styles.orderExpandedItemLabel}>
                      {t('reports.metrics.netProfit')}
                    </span>
                    <span
                      className={`${styles.orderExpandedItemValue} ${
                        record.profitAmount != null && record.profitAmount >= 0
                          ? styles.moneyPositive
                          : styles.moneyNegative
                      }`}
                    >
                      {record.profitAmount == null
                        ? '—'
                        : formatReportMoney(record.profitAmount, currency)}
                    </span>
                  </div>
                </div>
              </div>
            )
          },
          rowExpandable: () => true,
        }}
      />
    </div>
  )
}
