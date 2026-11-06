import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { DollarOutlined, FallOutlined, RiseOutlined, ShoppingCartOutlined } from '@ant-design/icons'
import { Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import {
  CopyableOrderId,
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import {
  getReportFilterOptions,
  listFinanceOrderProfitability,
  type OrderProfitability,
} from '../api/reportApi'
import { formatReportMoney } from '../components/reportFormatters'
import styles from './ReportOrderCostPage.module.scss'

export function ReportOrderCostPage({
  fixedSalesChannelCode,
}: {
  fixedSalesChannelCode?: 'AMAZON' | 'ETSY'
}) {
  const [financialStatus, setFinancialStatus] = useState<string>()
  const [search, setSearch] = useState('')
  const [sellerEmployeeCode, setSellerEmployeeCode] = useState<string>()
  const [teamId, setTeamId] = useState<string>()
  const [departmentId, setDepartmentId] = useState<string>()
  const [costCoverage, setCostCoverage] = useState<'MISSING' | 'COMPLETE' | undefined>()
  const [dates, setDates] = useState<DateRangeValue>({})
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const filterOptions = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: getReportFilterOptions,
  })
  const query = useQuery({
    queryKey: [
      'reports',
      'order-cost',
      fixedSalesChannelCode,
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
        page,
        limit: pageSize,
        externalOrderId: search || undefined,
        sellerEmployeeCode,
        teamId,
        departmentId,
        costCoverage,
        salesChannelCode: fixedSalesChannelCode,
        financialStatus: financialStatus as never,
      }),
  })
  const rows = query.data?.items || []
  const grossSales = rows.reduce((sum, row) => sum + row.revenueAmount, 0)
  const refunds = rows.reduce((sum, row) => sum + row.refundAmount, 0)
  const netRevenue = rows.reduce(
    (sum, row) => sum + (row.netRevenueAmount ?? row.revenueAmount - row.refundAmount),
    0,
  )
  const columns = [
    {
      title: 'Order',
      dataIndex: 'externalOrderId',
      render: (value: string | null) => (value ? <CopyableOrderId value={value} /> : '—'),
    },
    {
      title: 'Gross sales',
      dataIndex: 'revenueAmount',
      render: (value: number, row: OrderProfitability) => (
        <span className={styles.moneyRevenue}>
          {formatReportMoney(value, row.currency || 'USD')}
        </span>
      ),
    },
    {
      title: 'Refund',
      dataIndex: 'refundAmount',
      render: (value: number, row: OrderProfitability) => (
        <span className={styles.moneyRefund}>
          {formatReportMoney(value, row.currency || 'USD')}
        </span>
      ),
    },
    {
      title: 'Net revenue',
      dataIndex: 'netRevenueAmount',
      render: (value: number, row: OrderProfitability) => (
        <span className={styles.moneyNet}>
          {formatReportMoney(value ?? row.revenueAmount - row.refundAmount, row.currency || 'USD')}
        </span>
      ),
    },
    {
      title: 'Total cost',
      dataIndex: 'totalCostAmount',
      render: (value: number | null, row: OrderProfitability) =>
        value == null ? (
          '—'
        ) : (
          <span className={styles.moneyCost}>
            {formatReportMoney(value, row.currency || 'USD')}
          </span>
        ),
    },
    {
      title: 'Profit',
      dataIndex: 'profitAmount',
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
      title: 'Status',
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
                  ? 'PARTIALLY REFUNDED'
                  : 'ACTIVE'}
          </StatusTag>
          {row.missingCostCount ? <StatusTag status="critical">MISSING COST</StatusTag> : null}
        </Space>
      ),
    },
  ]
  return (
    <div className={styles.page}>
      <PageHeader
        title="Order cost"
        description="Actual profitability grouped by external order"
        actions={<StatusTag status="ready">{fixedSalesChannelCode || 'ALL CHANNELS'}</StatusTag>}
      />
      <div className={styles.metrics}>
        <MetricCard
          icon={<ShoppingCartOutlined />}
          label="Orders"
          value={String(query.data?.pagination?.total || 0)}
          variant="neutral"
        />
        <MetricCard
          icon={<DollarOutlined />}
          label="Gross sales"
          value={formatReportMoney(grossSales, 'USD')}
          variant="primary"
        />
        <MetricCard
          icon={<FallOutlined />}
          label="Refunds"
          value={formatReportMoney(refunds, 'USD')}
          variant="warning"
        />
        <MetricCard
          icon={<RiseOutlined />}
          label="Net revenue"
          value={formatReportMoney(netRevenue, 'USD')}
          variant="success"
        />
      </div>
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
              setSearch(value)
              setPage(1)
            }}
            placeholder="Search external order ID"
          />
          <Select
            allowClear
            placeholder="Financial status"
            value={financialStatus}
            onChange={(value) => {
              setFinancialStatus(value)
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
              setSellerEmployeeCode(value)
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
              setTeamId(value)
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
              setDepartmentId(value)
              setPage(1)
            }}
            options={(filterOptions.data?.departments || []).map((department) => ({
              value: department.id,
              label: department.name || department.code || 'Unnamed',
            }))}
          />
          <Select
            allowClear
            placeholder="Cost status"
            value={costCoverage}
            onChange={(value) => {
              setCostCoverage(value)
              setPage(1)
            }}
            options={[
              { value: 'COMPLETE', label: 'Cost available' },
              { value: 'MISSING', label: 'Missing cost' },
            ]}
          />
          <DateRangePicker
            value={dates}
            onChange={(value) => {
              setDates(value)
              setPage(1)
            }}
          />
        </FilterBar>
        <CoreDataTable
          rowKey={(row) => `${row.externalOrderId || row.orderId}-${row.currency}`}
          columns={columns}
          dataSource={rows}
          loading={query.isLoading}
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
          scroll={{ x: 1100 }}
        />
      </SectionCard>
    </div>
  )
}
