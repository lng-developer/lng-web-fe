import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Select, Space, Tag, Typography } from 'antd'
import dayjs from 'dayjs'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  exportReportCsv,
  type FinanceDaily,
  getBuyerInsights,
  getOperationsOverview,
  getReportFilterOptions,
  listChannelPerformance,
  listFinanceBySeller,
  listFinanceByTeam,
  listFinanceDaily,
  listFinanceDailyProfit,
  listVendorPerformance,
  type ReportFilters,
  type SellerPerformance,
  type TeamPerformance,
  type VendorPerformance,
} from '@/features/portal/reports/api/reportApi'
import {
  DataTable,
  DateRangePicker,
  FilterBar,
  MetricCard,
  PageHeader,
  SectionCard,
  UiTabLabel,
  UiTabs,
} from '@/shared/ui'

import { buildRevenueTrend } from './reportTrend'
import { ReportTrendChart } from './ReportTrendChart'
import styles from './ReportWorkspacePage.module.scss'

type TabKey = 'overview' | 'sales' | 'operations'

const money = (amount: number, currency: string) =>
  new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)
const percent = (bps: number | null) => (bps === null ? '—' : `${(bps / 100).toFixed(1)}%`)
const sum = (rows: FinanceDaily[], key: keyof FinanceDaily) =>
  rows.reduce((total, row) => total + Number(row[key] || 0), 0)
const topChannels = (rows: FinanceDaily[]) =>
  Object.entries(
    rows.reduce<Record<string, number>>((result, row) => {
      const channel = [row.salesChannelCode, row.marketplaceCode].filter(Boolean).join(' / ') || '—'
      result[channel] = (result[channel] || 0) + row.revenueAmount
      return result
    }, {}),
  )
    .sort(([, left], [, right]) => right - left)
    .slice(0, 4)

function statusSummary(rows: Record<string, number>, empty: string) {
  const entries = Object.entries(rows)
  return entries.length ? (
    <Space wrap>
      {entries.map(([key, value]) => (
        <Tag key={key}>
          {key}: {value}
        </Tag>
      ))}
    </Space>
  ) : (
    <Typography.Text type="secondary">{empty}</Typography.Text>
  )
}

export function ReportWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [activeTab, setActiveTab] = useState<TabKey>('overview')
  const [filters, setFilters] = useState<ReportFilters>(() => ({
    dateFrom: dayjs().subtract(29, 'day').startOf('day').toISOString(),
    dateTo: dayjs().endOf('day').toISOString(),
  }))
  const globalRead = account.permissions.includes('REPORTS:READ')
  const operationalScope =
    globalRead ||
    account.scopes.some(
      (scope) => scope.scopeType === 'shop' && scope.permissions.includes('REPORTS:READ'),
    )

  const options = useQuery({
    queryKey: ['reports', 'filter-options'],
    queryFn: getReportFilterOptions,
  })
  const daily = useQuery({
    queryKey: ['reports', globalRead ? 'daily-profit' : 'daily', filters],
    queryFn: () => (globalRead ? listFinanceDailyProfit(filters) : listFinanceDaily(filters)),
    enabled: activeTab === 'overview',
  })
  const buyers = useQuery({
    queryKey: ['reports', 'buyers', filters],
    queryFn: () => getBuyerInsights(filters),
    enabled: activeTab === 'overview' && operationalScope,
  })
  const overview = useQuery({
    queryKey: ['reports', 'operations', filters],
    queryFn: () => getOperationsOverview(filters),
    enabled: (activeTab === 'overview' || activeTab === 'operations') && operationalScope,
  })
  const sellers = useQuery({
    queryKey: ['reports', 'sellers', filters],
    queryFn: () => listFinanceBySeller(filters),
    enabled: activeTab === 'sales',
  })
  const teams = useQuery({
    queryKey: ['reports', 'teams', filters],
    queryFn: () => listFinanceByTeam(filters),
    enabled: activeTab === 'sales',
  })
  const channels = useQuery({
    queryKey: ['reports', 'channels', filters],
    queryFn: () => listChannelPerformance(filters),
    enabled: activeTab === 'sales' && operationalScope,
  })
  const vendors = useQuery({
    queryKey: ['reports', 'vendors', filters],
    queryFn: () => listVendorPerformance(filters),
    enabled: activeTab === 'operations' && operationalScope,
  })
  const exportCsv = useMutation({
    mutationFn: () => exportReportCsv(filters),
    onSuccess: (result) => {
      const url = URL.createObjectURL(result)
      const link = document.createElement('a')
      link.href = url
      link.download = 'reports.csv'
      link.click()
      URL.revokeObjectURL(url)
    },
  })

  const byCurrency = useMemo(
    () =>
      Object.entries(
        (daily.data || []).reduce<Record<string, FinanceDaily[]>>((result, row) => {
          const currency = row.currency || 'USD'
          result[currency] = [...(result[currency] || []), row]
          return result
        }, {}),
      ),
    [daily.data],
  )

  const sellerColumns: TableColumnsType<SellerPerformance> = [
    {
      title: t('reports.columns.seller'),
      render: (_, row) => row.sellerName || row.sellerEmployeeCode || '—',
    },
    {
      title: t('reports.columns.items'),
      dataIndex: 'itemCount',
      sorter: (a, b) => a.itemCount - b.itemCount,
    },
    {
      title: t('reports.columns.revenue'),
      sorter: (a, b) => a.revenueAmount - b.revenueAmount,
      render: (_, row) => money(row.revenueAmount, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.spend'),
      sorter: (a, b) => (a.adSpendAmount || 0) - (b.adSpendAmount || 0),
      render: (_, row) => money(row.adSpendAmount || 0, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.netProfit'),
      sorter: (a, b) => a.netProfitAmount - b.netProfitAmount,
      render: (_, row) => money(row.netProfitAmount, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.margin'),
      sorter: (a, b) => (a.netMarginBps ?? -Infinity) - (b.netMarginBps ?? -Infinity),
      render: (_, row) => percent(row.netMarginBps),
    },
  ]
  const teamColumns: TableColumnsType<TeamPerformance> = [
    { title: t('reports.columns.team'), render: (_, row) => row.teamName || row.teamCode || '—' },
    { title: t('reports.columns.sellers'), dataIndex: 'activeSellerCount' },
    {
      title: t('reports.columns.items'),
      dataIndex: 'itemCount',
      sorter: (a, b) => a.itemCount - b.itemCount,
    },
    {
      title: t('reports.columns.revenue'),
      sorter: (a, b) => a.revenueAmount - b.revenueAmount,
      render: (_, row) => money(row.revenueAmount, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.spend'),
      sorter: (a, b) => (a.adSpendAmount || 0) - (b.adSpendAmount || 0),
      render: (_, row) => money(row.adSpendAmount || 0, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.netProfit'),
      sorter: (a, b) => a.netProfitAmount - b.netProfitAmount,
      render: (_, row) => money(row.netProfitAmount, row.currency || 'USD'),
    },
    {
      title: t('reports.columns.margin'),
      sorter: (a, b) => (a.netMarginBps ?? -Infinity) - (b.netMarginBps ?? -Infinity),
      render: (_, row) => percent(row.netMarginBps),
    },
  ]
  const vendorColumns: TableColumnsType<VendorPerformance> = [
    {
      title: t('reports.columns.vendor'),
      render: (_, row) => row.vendorName || row.vendorCode || '—',
    },
    { title: t('reports.columns.submitted'), dataIndex: 'submittedCount' },
    { title: t('reports.columns.failed'), dataIndex: 'failedCount' },
    { title: t('reports.columns.shipped'), dataIndex: 'shippedCount' },
    { title: t('reports.columns.successRate'), render: (_, row) => percent(row.successRateBps) },
  ]

  const filterOptions = options.data
  const handleFilterChange = useCallback((key: keyof ReportFilters, value?: string) => {
    setFilters((current) => ({ ...current, [key]: value }))
  }, [])

  const select = useCallback(
    (
      key: keyof ReportFilters,
      placeholder: string,
      values: Array<{ value: string; label: string }>,
    ) => (
      <Select
        allowClear
        showSearch
        optionFilterProp="label"
        value={filters[key]}
        placeholder={placeholder}
        options={values}
        onChange={(value) => handleFilterChange(key, value)}
      />
    ),
    [filters, handleFilterChange],
  )

  const handleDateRangeChange = useCallback((range: { dateFrom?: string; dateTo?: string }) => {
    setFilters((current) => ({ ...current, ...range }))
  }, [])

  const handleTabChange = useCallback((key: string) => {
    setActiveTab(key as TabKey)
  }, [])

  const filterBar = (
    <FilterBar label={t('reports.filters.label')} contentClassName={styles.filters}>
      <DateRangePicker
        value={{ dateFrom: filters.dateFrom, dateTo: filters.dateTo }}
        aria-label={t('reports.filters.date')}
        placeholder={[t('reports.filters.from'), t('reports.filters.to')]}
        onChange={handleDateRangeChange}
      />
      {select(
        'shopId',
        t('reports.filters.shop'),
        (filterOptions?.shops || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
      {select(
        'salesChannelCode',
        t('reports.filters.channel'),
        (filterOptions?.channels || []).map((value) => ({ value, label: value })),
      )}
      {select(
        'marketplaceCode',
        t('reports.filters.marketplace'),
        (filterOptions?.marketplaces || []).map((value) => ({ value, label: value })),
      )}
      {select(
        'sellerEmployeeCode',
        t('reports.filters.seller'),
        (filterOptions?.sellers || []).map((row) => ({
          value: row.employeeCode,
          label: `${row.employeeCode} · ${row.name || t('reports.filters.unnamed')}`,
        })),
      )}
      {select(
        'teamId',
        t('reports.filters.team'),
        (filterOptions?.teams || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
      {select(
        'departmentId',
        t('reports.filters.department'),
        (filterOptions?.departments || []).map((row) => ({
          value: row.id,
          label: row.name || row.code || t('reports.filters.unnamed'),
        })),
      )}
    </FilterBar>
  )

  const overviewTab = (
    <div className={styles.stack}>
      {daily.isError ? <Alert type="error" showIcon message={t('reports.loadError')} /> : null}
      {byCurrency.map(([currency, rows]) => (
        <SectionCard key={currency} title={currency}>
          <div className={styles.metrics}>
            <MetricCard
              label={t('reports.metrics.revenue')}
              value={money(sum(rows, 'revenueAmount'), currency)}
            />
            <MetricCard
              label={t('reports.metrics.grossProfit')}
              value={money(sum(rows, 'grossProfitAmount'), currency)}
            />
            <MetricCard
              label={t('reports.metrics.netProfit')}
              value={money(sum(rows, 'netProfitAmount'), currency)}
            />
            <MetricCard
              label={t('reports.metrics.missingCost')}
              value={String(sum(rows, 'missingCostCount'))}
            />
          </div>
          <div className={styles.trendLayout}>
            <div className={styles.trendPanel}>
              <div className={styles.trendHeader}>
                <Typography.Text strong>{t('reports.trend')}</Typography.Text>
                <Typography.Text type="secondary">
                  {t(
                    dayjs(filters.dateTo).diff(dayjs(filters.dateFrom), 'day') >= 60
                      ? 'reports.cadence.weekly'
                      : 'reports.cadence.daily',
                  )}
                </Typography.Text>
              </div>
              <ReportTrendChart
                ariaLabel={t('reports.trend')}
                data={buildRevenueTrend(rows, filters.dateFrom, filters.dateTo)}
                formatValue={(value) => money(value, currency)}
              />
            </div>
            <div className={styles.channelPanel}>
              <Typography.Text strong>{t('reports.channels.title')}</Typography.Text>
              <div className={styles.channelList}>
                {topChannels(rows).map(([channel, value]) => (
                  <div key={channel} className={styles.channelRow}>
                    <Typography.Text>{channel}</Typography.Text>
                    <Typography.Text strong>{money(value, currency)}</Typography.Text>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </SectionCard>
      ))}
      {operationalScope ? (
        <div className={styles.twoColumns}>
          <SectionCard title={t('reports.buyers.title')}>
            <div className={styles.metricsCompact}>
              <MetricCard
                label={t('reports.buyers.total')}
                value={String(buyers.data?.totalOrderCount || 0)}
              />
              <MetricCard
                label={t('reports.buyers.new')}
                value={String(buyers.data?.newBuyerCount || 0)}
              />
              <MetricCard
                label={t('reports.buyers.returning')}
                value={String(buyers.data?.returningBuyerCount || 0)}
              />
            </div>
          </SectionCard>
          <SectionCard title={t('reports.operations.blockers')}>
            {statusSummary(overview.data?.productionBlockers || {}, t('reports.empty'))}
          </SectionCard>
        </div>
      ) : null}
    </div>
  )

  const salesTab = (
    <div className={styles.stack}>
      <div className={styles.twoColumns}>
        <SectionCard title={t('reports.sales.bySeller')}>
          <DataTable
            rowKey={(row) => `${row.sellerEmployeeCode}-${row.currency}`}
            columns={sellerColumns}
            dataSource={sellers.data || []}
            loading={sellers.isPending}
            pagination={false}
          />
        </SectionCard>
        <SectionCard title={t('reports.sales.byTeam')}>
          <DataTable
            rowKey={(row) => `${row.teamId}-${row.currency}`}
            columns={teamColumns}
            dataSource={teams.data || []}
            loading={teams.isPending}
            pagination={false}
          />
        </SectionCard>
      </div>
      {operationalScope ? (
        <SectionCard title={t('reports.sales.acquisition')}>
          <DataTable
            rowKey={(row) => `${row.salesChannelCode}-${row.marketplaceCode}-${row.currency}`}
            dataSource={channels.data || []}
            pagination={false}
            columns={[
              {
                title: t('reports.columns.channel'),
                render: (_, row) =>
                  `${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`,
              },
              {
                title: t('reports.columns.spend'),
                render: (_, row) => money(row.spendAmount, row.currency || 'USD'),
              },
              {
                title: t('reports.columns.sales'),
                render: (_, row) => money(row.attributedSalesAmount, row.currency || 'USD'),
              },
              { title: t('reports.columns.newBuyers'), dataIndex: 'newBuyerCount' },
            ]}
          />
        </SectionCard>
      ) : (
        <Alert type="info" showIcon message={t('reports.scopeLimited')} />
      )}
    </div>
  )

  const operationsTab = operationalScope ? (
    <div className={styles.stack}>
      <div className={styles.operationsGrid}>
        <SectionCard title={t('reports.operations.orders')}>
          {statusSummary(overview.data?.orderItemsByStatus || {}, t('reports.empty'))}
        </SectionCard>
        <SectionCard title={t('reports.operations.production')}>
          {statusSummary(overview.data?.productionByStatus || {}, t('reports.empty'))}
        </SectionCard>
        <SectionCard title={t('reports.operations.shipments')}>
          {statusSummary(overview.data?.shipmentsByStatus || {}, t('reports.empty'))}
        </SectionCard>
      </div>
      <SectionCard title={t('reports.operations.vendors')}>
        <DataTable
          rowKey={(row) => row.vendorId || row.vendorCode || 'vendor'}
          columns={vendorColumns}
          dataSource={vendors.data?.items || []}
          loading={vendors.isPending}
          pagination={false}
        />
      </SectionCard>
    </div>
  ) : (
    <Alert type="info" showIcon message={t('reports.scopeLimited')} />
  )

  return (
    <div className={styles.page}>
      <PageHeader
        title={t('reports.title')}
        description={t('reports.description')}
        actions={
          <Button
            icon={<DownloadOutlined />}
            loading={exportCsv.isPending}
            onClick={() => exportCsv.mutate()}
          >
            {t('reports.exportCsv')}
          </Button>
        }
      />
      {filterBar}
      <UiTabs
        activeKey={activeTab}
        onChange={handleTabChange}
        items={[
          {
            key: 'overview',
            label: <UiTabLabel>{t('reports.tabs.overview')}</UiTabLabel>,
            children: overviewTab,
          },
          {
            key: 'sales',
            label: <UiTabLabel>{t('reports.tabs.sales')}</UiTabLabel>,
            children: salesTab,
          },
          {
            key: 'operations',
            label: <UiTabLabel>{t('reports.tabs.operations')}</UiTabLabel>,
            children: operationsTab,
          },
        ]}
      />
    </div>
  )
}
