import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { ReloadOutlined, UploadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Divider, Modal, Select, Space, Spin, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { listShops } from '@/features/portal/shops/api/shopApi'
import {
  CopyableOrderId,
  DataTable,
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  UiTabLabel,
  UiTabs,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type FinanceImportInput,
  type FinanceSnapshot,
  getFinanceImportBatch,
  getOrderFinanceSummary,
  getOrderItemFinanceSnapshot,
  type ImportBatch,
  importFinanceFile,
  listFinanceFilterOptions,
  listFinanceSnapshots,
  listImportBatches,
  listImportedFinanceData,
  recalculateOrder,
  recalculateOrderItem,
  reprocessImportBatch,
} from '../api/financeApi'
import { FinanceImportModal } from './FinanceImportModal'
import styles from './FinanceWorkspacePage.module.scss'

const PAGE_SIZE = 20
const money = (amount: number | null | undefined, currency = 'USD') =>
  amount == null
    ? '—'
    : new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(amount / 100)

export function FinanceWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = [
    ...account.permissions,
    ...account.scopes.flatMap((scope) => scope.permissions),
  ]
  const globalRead =
    account.permissions.includes('FINANCE:READ') || account.permissions.includes('FINANCE:WRITE')
  const globalWrite = account.permissions.includes('FINANCE:WRITE')
  const canWrite = permissions.includes('FINANCE:WRITE')
  const client = useQueryClient()
  const toast = useFeedbackToast()
  const [page, setPage] = useState(1)
  const [importPage, setImportPage] = useState(1)
  const [search, setSearch] = useState('')
  const [costStatus, setCostStatus] = useState<string>()
  const [salesChannelCode, setSalesChannelCode] = useState<string>()
  const [marketplaceCode, setMarketplaceCode] = useState<string>()
  const [sellerEmployeeCode, setSellerEmployeeCode] = useState<string>()
  const [teamId, setTeamId] = useState<string>()
  const [departmentId, setDepartmentId] = useState<string>()
  const [dates, setDates] = useState<DateRangeValue>({})
  const [selected, setSelected] = useState<FinanceSnapshot>()
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch>()
  const [selectedItemId, setSelectedItemId] = useState<string>()
  const [importOpen, setImportOpen] = useState(false)

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleSalesChannelChange = useCallback((value?: string) => {
    setSalesChannelCode(value)
    setPage(1)
  }, [])

  const handleMarketplaceChange = useCallback((value?: string) => {
    setMarketplaceCode(value)
    setPage(1)
  }, [])

  const handleSellerChange = useCallback((value?: string) => {
    setSellerEmployeeCode(value)
    setPage(1)
  }, [])

  const handleTeamChange = useCallback((value?: string) => {
    setTeamId(value)
    setPage(1)
  }, [])

  const handleDepartmentChange = useCallback((value?: string) => {
    setDepartmentId(value)
    setPage(1)
  }, [])

  const handleDateRangeChange = useCallback((value: DateRangeValue) => {
    setDates(value)
    setPage(1)
  }, [])

  const handleCostStatusChange = useCallback((value?: string) => {
    setCostStatus(value)
    setPage(1)
  }, [])

  const queryParams = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      externalOrderId: search || undefined,
      costStatus,
      salesChannelCode,
      marketplaceCode,
      sellerEmployeeCode,
      teamId,
      departmentId,
      ...dates,
    }),
    [
      page,
      search,
      costStatus,
      salesChannelCode,
      marketplaceCode,
      sellerEmployeeCode,
      teamId,
      departmentId,
      dates,
    ],
  )
  const snapshots = useQuery({
    queryKey: ['finance', 'snapshots', queryParams],
    queryFn: () => listFinanceSnapshots(queryParams),
    retry: false,
  })
  const batches = useQuery({
    queryKey: ['finance', 'imports', importPage],
    queryFn: () => listImportBatches({ page: importPage, limit: PAGE_SIZE }),
    enabled: globalRead,
    retry: false,
  })
  const filterOptions = useQuery({
    queryKey: ['finance', 'filter-options'],
    queryFn: listFinanceFilterOptions,
    retry: false,
  })
  const orderDetail = useQuery({
    queryKey: ['finance', 'orders', selected?.orderId, 'summary'],
    queryFn: () => getOrderFinanceSummary(selected!.orderId),
    enabled: Boolean(selected?.orderId),
    retry: false,
  })
  const batchDetail = useQuery({
    queryKey: ['finance', 'import-batches', selectedBatch?.id],
    queryFn: () => getFinanceImportBatch(selectedBatch!.id),
    enabled: Boolean(selectedBatch?.id),
    retry: false,
  })
  const importedData = useQuery({
    queryKey: ['finance', 'imported-data', selectedBatch?.sourceType, selectedBatch?.shopId],
    queryFn: () =>
      listImportedFinanceData(
        selectedBatch!.sourceType.toLowerCase() as 'transactions' | 'settlements' | 'ads',
        {
          shopId: selectedBatch!.shopId,
          salesChannelCode: selectedBatch!.salesChannelCode,
          marketplaceCode: selectedBatch!.marketplaceCode,
          limit: 10,
        },
      ),
    enabled: Boolean(selectedBatch?.sourceType),
    retry: false,
  })
  const itemDetail = useQuery({
    queryKey: ['finance', 'order-items', selectedItemId, 'snapshot'],
    queryFn: () => getOrderItemFinanceSnapshot(selectedItemId!),
    enabled: Boolean(selectedItemId),
    retry: false,
  })
  const shops = useQuery({
    queryKey: ['shops', 'finance-import'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
    enabled: globalWrite,
    retry: false,
  })
  const importFile = useMutation({
    mutationFn: (input: FinanceImportInput) => {
      const { kind, file, ...context } = input
      return importFinanceFile(kind, file, {
        ...context,
        salesChannelCode: context.salesChannelCode.trim().toUpperCase(),
        marketplaceCode: context.marketplaceCode.trim().toUpperCase(),
      })
    },
    onSuccess: async () => {
      toast('success', t('finance.feedback.imported'))
      setImportOpen(false)
      await client.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const reprocess = useMutation({
    mutationFn: reprocessImportBatch,
    onSuccess: async () => {
      toast('success', t('finance.feedback.reprocessed'))
      await client.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const recalculate = useMutation({
    mutationFn: recalculateOrder,
    onSuccess: async () => {
      toast('success', t('finance.feedback.recalculated'))
      await client.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const recalculateItem = useMutation({
    mutationFn: recalculateOrderItem,
    onSuccess: async () => {
      toast('success', t('finance.feedback.recalculated'))
      await client.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const columns = useMemo<TableColumnsType<FinanceSnapshot>>(
    () => [
      {
        title: t('finance.columns.order'),
        render: (_, row) => <CopyableOrderId strong value={row.externalOrderId} />,
      },
      {
        title: t('finance.columns.channel'),
        render: (_, row) => `${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`,
      },
      {
        title: t('finance.columns.seller'),
        render: (_, row) => (
          <>
            {row.seller.name || row.seller.employeeCode || '—'}
            <br />
            <Typography.Text type="secondary">{row.team.name || '—'}</Typography.Text>
          </>
        ),
      },
      {
        title: t('finance.columns.revenue'),
        align: 'right',
        render: (_, row) => money(row.revenue.customerPaidAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.cost'),
        align: 'right',
        render: (_, row) => money(row.cost.totalCostAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.profit'),
        align: 'right',
        render: (_, row) => money(row.margin.grossProfitAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.margin'),
        align: 'right',
        render: (_, row) =>
          row.margin.grossMarginBps == null
            ? '—'
            : `${(row.margin.grossMarginBps / 100).toFixed(1)}%`,
      },
      {
        title: t('finance.columns.status'),
        render: (_, row) => (
          <StatusTag status={row.snapshotStatus === 'MISSING_COST' ? 'critical' : 'processing'}>
            {row.snapshotStatus}
          </StatusTag>
        ),
      },
    ],
    [t],
  )
  const importColumns: TableColumnsType<ImportBatch> = [
    { title: t('finance.imports.source'), dataIndex: 'sourceType' },
    { title: t('finance.columns.status'), dataIndex: 'status' },
    { title: t('finance.imports.processed'), dataIndex: 'processedRows' },
    { title: t('finance.imports.unlinked'), dataIndex: 'unlinkedRows' },
    {
      title: '',
      render: (_, row) =>
        globalWrite && ['FAILED', 'PARTIAL_FAILED'].includes(row.status) ? (
          <Button
            size="small"
            icon={<ReloadOutlined />}
            loading={reprocess.isPending}
            onClick={() => reprocess.mutate(row.id)}
          >
            {t('finance.actions.reprocess')}
          </Button>
        ) : null,
    },
  ]
  const table = (
    <SectionCard title={t('finance.profitability')}>
      <FilterBar label={t('finance.filters.label')} contentClassName={styles.filters}>
        <SearchInput
          value={search}
          onSearchChange={handleSearchChange}
          placeholder={t('finance.filters.search')}
        />
        <Select
          allowClear
          aria-label={t('finance.filters.channel')}
          value={salesChannelCode}
          onChange={handleSalesChannelChange}
          placeholder={t('finance.filters.channel')}
          options={filterOptions.data?.channels.map((value) => ({ value, label: value }))}
        />
        <Select
          allowClear
          aria-label={t('finance.filters.marketplace')}
          value={marketplaceCode}
          onChange={handleMarketplaceChange}
          placeholder={t('finance.filters.marketplace')}
          options={filterOptions.data?.marketplaces.map((value) => ({ value, label: value }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          aria-label={t('finance.filters.seller')}
          value={sellerEmployeeCode}
          onChange={handleSellerChange}
          placeholder={t('finance.filters.seller')}
          options={filterOptions.data?.sellers.map((seller) => ({
            value: seller.employeeCode,
            label: `${seller.employeeCode} · ${seller.name || t('finance.filters.unnamed')}`,
          }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          aria-label={t('finance.filters.team')}
          value={teamId}
          onChange={handleTeamChange}
          placeholder={t('finance.filters.team')}
          options={filterOptions.data?.teams.map((team) => ({
            value: team.id,
            label: team.name || team.code || t('finance.filters.unnamed'),
          }))}
        />
        <Select
          allowClear
          showSearch
          optionFilterProp="label"
          aria-label={t('finance.filters.department')}
          value={departmentId}
          onChange={handleDepartmentChange}
          placeholder={t('finance.filters.department')}
          options={filterOptions.data?.departments.map((department) => ({
            value: department.id,
            label: department.name || department.code || t('finance.filters.unnamed'),
          }))}
        />
        <DateRangePicker
          value={dates}
          onChange={handleDateRangeChange}
          aria-label={t('finance.filters.date')}
        />
        <Select
          allowClear
          value={costStatus}
          onChange={handleCostStatusChange}
          placeholder={t('finance.filters.cost')}
          options={[
            { value: 'PRESENT', label: 'PRESENT' },
            { value: 'MISSING', label: 'MISSING' },
          ]}
        />
      </FilterBar>
      <DataTable
        rowKey="id"
        columns={columns}
        dataSource={snapshots.data?.items}
        loading={snapshots.isLoading}
        onRow={(row) => ({ onClick: () => setSelected(row) })}
        pagination={{
          current: page,
          pageSize: PAGE_SIZE,
          total: snapshots.data?.pagination.total,
          showSizeChanger: false,
          onChange: setPage,
        }}
      />
    </SectionCard>
  )
  return (
    <section className={styles.page}>
      <PageHeader
        title={t('finance.title')}
        description={t('finance.description')}
        actions={
          <Typography.Text type="secondary">
            {globalRead ? t('finance.scope.global') : t('finance.scope.scoped')}
          </Typography.Text>
        }
      />
      <UiTabs
        destroyOnHidden={false}
        items={[
          {
            key: 'overview',
            label: <UiTabLabel>{t('finance.tabs.overview')}</UiTabLabel>,
            children: (
              <>
                <div className={styles.summaryGroups}>
                  {snapshots.data?.summaryByCurrency.map((summary) => (
                    <section key={summary.currency} className={styles.currencySummary}>
                      <Typography.Text strong className={styles.currency}>
                        {summary.currency}
                      </Typography.Text>
                      <div className={styles.metrics}>
                        <MetricCard
                          label={t('finance.metrics.revenue')}
                          value={money(summary.revenueAmount, summary.currency)}
                        />
                        <MetricCard
                          label={t('finance.metrics.cost')}
                          value={money(summary.totalCostAmount, summary.currency)}
                        />
                        <MetricCard
                          label={t('finance.metrics.profit')}
                          value={money(summary.profitAmount, summary.currency)}
                        />
                        <MetricCard
                          label={t('finance.metrics.missing')}
                          value={String(summary.missingCostCount)}
                        />
                      </div>
                    </section>
                  ))}
                </div>
                {table}
              </>
            ),
          },
          ...(globalRead
            ? [
                {
                  key: 'imports',
                  label: <UiTabLabel>{t('finance.tabs.imports')}</UiTabLabel>,
                  children: (
                    <SectionCard title={t('finance.imports.title')}>
                      {globalWrite ? (
                        <Space className={styles.importActions}>
                          <Button
                            type="primary"
                            icon={<UploadOutlined />}
                            onClick={() => setImportOpen(true)}
                          >
                            {t('finance.actions.import')}
                          </Button>
                        </Space>
                      ) : null}
                      <DataTable
                        rowKey="id"
                        columns={importColumns}
                        dataSource={batches.data?.items}
                        loading={batches.isLoading}
                        onRow={(row) => ({ onClick: () => setSelectedBatch(row) })}
                        pagination={{
                          current: importPage,
                          pageSize: PAGE_SIZE,
                          total: batches.data?.pagination.total,
                          showSizeChanger: false,
                          onChange: setImportPage,
                        }}
                      />
                    </SectionCard>
                  ),
                },
              ]
            : []),
        ]}
      />
      <Modal
        centered
        width={900}
        open={Boolean(selected)}
        title={t('finance.detail.title')}
        footer={null}
        onCancel={() => setSelected(undefined)}
        destroyOnHidden
      >
        {orderDetail.isLoading ? (
          <Spin />
        ) : orderDetail.data ? (
          <Space orientation="vertical" className={styles.detail} size="large">
            <Descriptions
              bordered
              column={4}
              items={[
                {
                  key: 'items',
                  label: t('finance.detail.items'),
                  children: orderDetail.data.itemCount,
                },
                {
                  key: 'revenue',
                  label: t('finance.columns.revenue'),
                  children: money(
                    orderDetail.data.customerPaidAmount,
                    orderDetail.data.currency || 'USD',
                  ),
                },
                {
                  key: 'cost',
                  label: t('finance.columns.cost'),
                  children: money(
                    orderDetail.data.totalCostAmount,
                    orderDetail.data.currency || 'USD',
                  ),
                },
                {
                  key: 'profit',
                  label: t('finance.columns.profit'),
                  children: money(
                    orderDetail.data.grossProfitAmount,
                    orderDetail.data.currency || 'USD',
                  ),
                },
              ]}
            />
            {orderDetail.data.snapshots.map((snapshot, index) => (
              <section key={snapshot.orderItemId} className={styles.itemBreakdown}>
                <Typography.Title level={5}>
                  {t('finance.detail.item', { number: index + 1 })}
                </Typography.Title>
                <Space>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelected(undefined)
                      setSelectedItemId(snapshot.orderItemId)
                    }}
                  >
                    {t('finance.actions.inspectItem')}
                  </Button>
                  {canWrite ? (
                    <Button
                      size="small"
                      icon={<ReloadOutlined />}
                      loading={recalculateItem.isPending}
                      onClick={() => recalculateItem.mutate(snapshot.orderItemId)}
                    >
                      {t('finance.actions.recalculateItem')}
                    </Button>
                  ) : null}
                </Space>
                <Descriptions
                  size="small"
                  column={4}
                  items={[
                    {
                      key: 'revenue',
                      label: t('finance.columns.revenue'),
                      children: money(
                        snapshot.revenue.customerPaidAmount,
                        snapshot.revenue.currency,
                      ),
                    },
                    {
                      key: 'fee',
                      label: t('finance.detail.fees'),
                      children: money(
                        snapshot.orderPnl?.marketplaceFeeAmount,
                        snapshot.revenue.currency,
                      ),
                    },
                    {
                      key: 'refund',
                      label: t('finance.detail.refund'),
                      children: money(snapshot.orderPnl?.refundAmount, snapshot.revenue.currency),
                    },
                    {
                      key: 'discount',
                      label: t('finance.detail.discount'),
                      children: money(snapshot.orderPnl?.discountAmount, snapshot.revenue.currency),
                    },
                    {
                      key: 'base',
                      label: t('finance.detail.baseCost'),
                      children: money(snapshot.orderPnl?.baseCostAmount, snapshot.revenue.currency),
                    },
                    {
                      key: 'additional',
                      label: t('finance.detail.additionalCost'),
                      children: money(
                        snapshot.orderPnl?.additionalFulfillmentCostAmount,
                        snapshot.revenue.currency,
                      ),
                    },
                    {
                      key: 'deductions',
                      label: t('finance.detail.deductions'),
                      children: money(
                        snapshot.orderPnl?.totalDeductionAmount,
                        snapshot.revenue.currency,
                      ),
                    },
                    {
                      key: 'profit',
                      label: t('finance.columns.profit'),
                      children: money(snapshot.orderPnl?.profitAmount, snapshot.revenue.currency),
                    },
                  ]}
                />
                {snapshot.cost.missingCostReason ? (
                  <Typography.Text type="danger">
                    {t(`finance.missingReasons.${snapshot.cost.missingCostReason}`)}
                  </Typography.Text>
                ) : null}
                <Divider titlePlacement="start">{t('finance.detail.history')}</Divider>
                <div className={styles.history}>
                  {snapshot.calculationHistory.map((entry) => (
                    <div key={`${entry.calculatedAt}-${entry.snapshotStatus}`}>
                      <Typography.Text>
                        {new Date(entry.calculatedAt).toLocaleString()}
                      </Typography.Text>
                      <StatusTag
                        status={entry.costStatus === 'MISSING' ? 'critical' : 'operational'}
                      >
                        {entry.snapshotStatus}
                      </StatusTag>
                      {entry.missingCostReason ? (
                        <Typography.Text type="secondary">
                          {t(`finance.missingReasons.${entry.missingCostReason}`)}
                        </Typography.Text>
                      ) : null}
                    </div>
                  ))}
                </div>
              </section>
            ))}
            {canWrite && selected ? (
              <Button
                icon={<ReloadOutlined />}
                loading={recalculate.isPending}
                onClick={() => recalculate.mutate(selected.orderId)}
              >
                {t('finance.actions.recalculateOrder')}
              </Button>
            ) : null}
          </Space>
        ) : null}
      </Modal>
      <Modal
        centered
        width={820}
        open={Boolean(selectedBatch)}
        title={t('finance.imports.detailTitle')}
        footer={null}
        onCancel={() => setSelectedBatch(undefined)}
        destroyOnHidden
      >
        {batchDetail.isLoading ? (
          <Spin />
        ) : batchDetail.data ? (
          <Space orientation="vertical" size="large" className={styles.detail}>
            <Descriptions
              bordered
              column={3}
              size="small"
              items={[
                {
                  key: 'file',
                  label: t('finance.imports.file'),
                  children: batchDetail.data.originalFilename,
                },
                {
                  key: 'source',
                  label: t('finance.imports.source'),
                  children: batchDetail.data.sourceType,
                },
                {
                  key: 'status',
                  label: t('finance.columns.status'),
                  children: batchDetail.data.status,
                },
                {
                  key: 'processed',
                  label: t('finance.imports.processed'),
                  children: batchDetail.data.processedRows,
                },
                {
                  key: 'valid',
                  label: t('finance.imports.valid'),
                  children: batchDetail.data.validRows,
                },
                {
                  key: 'errors',
                  label: t('finance.imports.errors'),
                  children: batchDetail.data.errorCount,
                },
              ]}
            />
            {batchDetail.data.errors.length ? (
              <section>
                <Typography.Title level={5}>{t('finance.imports.importErrors')}</Typography.Title>
                {batchDetail.data.errors.map((error, index) => (
                  <Typography.Paragraph
                    key={`${error.row ?? index}-${error.message}`}
                    type="danger"
                  >
                    {error.row ? `${t('finance.imports.row')} ${error.row}: ` : ''}
                    {error.message || error.code}
                  </Typography.Paragraph>
                ))}
              </section>
            ) : null}
            <section>
              <Typography.Title level={5}>{t('finance.imports.recentSourceData')}</Typography.Title>
              {importedData.data?.items.length ? (
                importedData.data.items.map((row) => (
                  <Descriptions
                    bordered
                    column={2}
                    size="small"
                    key={row.id}
                    items={Object.entries(row)
                      .filter(([key]) => key !== 'id' && !key.toLowerCase().endsWith('id'))
                      .slice(0, 8)
                      .map(([key, value]) => ({
                        key,
                        label: key,
                        children:
                          typeof value === 'object' ? JSON.stringify(value) : String(value ?? '—'),
                      }))}
                  />
                ))
              ) : (
                <Typography.Text type="secondary">
                  {t('finance.imports.noSourceData')}
                </Typography.Text>
              )}
            </section>
          </Space>
        ) : null}
      </Modal>
      <Modal
        centered
        width={760}
        open={Boolean(selectedItemId)}
        title={t('finance.detail.itemSnapshot')}
        footer={null}
        onCancel={() => setSelectedItemId(undefined)}
        destroyOnHidden
      >
        {itemDetail.isLoading ? (
          <Spin />
        ) : itemDetail.data ? (
          <Space orientation="vertical" size="large" className={styles.detail}>
            <Descriptions
              bordered
              column={3}
              size="small"
              items={[
                {
                  key: 'revenue',
                  label: t('finance.columns.revenue'),
                  children: money(
                    itemDetail.data.revenue.customerPaidAmount,
                    itemDetail.data.revenue.currency,
                  ),
                },
                {
                  key: 'cost',
                  label: t('finance.columns.cost'),
                  children: money(
                    itemDetail.data.cost.totalCostAmount,
                    itemDetail.data.revenue.currency,
                  ),
                },
                {
                  key: 'profit',
                  label: t('finance.columns.profit'),
                  children: money(
                    itemDetail.data.margin.grossProfitAmount,
                    itemDetail.data.revenue.currency,
                  ),
                },
                {
                  key: 'status',
                  label: t('finance.columns.status'),
                  children: itemDetail.data.snapshotStatus,
                },
                {
                  key: 'reason',
                  label: t('finance.detail.missingReason'),
                  children: itemDetail.data.cost.missingCostReason
                    ? t(`finance.missingReasons.${itemDetail.data.cost.missingCostReason}`)
                    : '—',
                },
              ]}
            />
            <section>
              <Typography.Title level={5}>{t('finance.detail.costLines')}</Typography.Title>
              {itemDetail.data.cost.costLines.map((line) => (
                <Typography.Paragraph key={line.code}>
                  {line.label || line.code}: {money(line.amount, itemDetail.data!.revenue.currency)}
                </Typography.Paragraph>
              ))}
            </section>
            {canWrite ? (
              <Button
                icon={<ReloadOutlined />}
                loading={recalculateItem.isPending}
                onClick={() => recalculateItem.mutate(selectedItemId!)}
              >
                {t('finance.actions.recalculateItem')}
              </Button>
            ) : null}
          </Space>
        ) : null}
      </Modal>
      <FinanceImportModal
        open={importOpen}
        shops={shops.data?.items ?? []}
        saving={importFile.isPending}
        onClose={() => setImportOpen(false)}
        onSubmit={(input) => importFile.mutate(input)}
      />
    </section>
  )
}
