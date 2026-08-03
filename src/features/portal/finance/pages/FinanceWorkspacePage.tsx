import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { ReloadOutlined } from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Button, Descriptions, Modal, Select, Space, Tabs, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  DataTable,
  FilterBar,
  MetricCard,
  PageHeader,
  SearchInput,
  SectionCard,
  StatusTag,
  useFeedbackToast,
} from '@/shared/ui'

import {
  type FinanceSnapshot,
  type ImportBatch,
  listFinanceSnapshots,
  listImportBatches,
  recalculateOrderItem,
  reprocessImportBatch,
} from '../api/financeApi'
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
  const [search, setSearch] = useState('')
  const [costStatus, setCostStatus] = useState<string>()
  const [selected, setSelected] = useState<FinanceSnapshot>()
  const queryParams = { page, limit: PAGE_SIZE, externalOrderId: search || undefined, costStatus }
  const snapshots = useQuery({
    queryKey: ['finance', 'snapshots', queryParams],
    queryFn: () => listFinanceSnapshots(queryParams),
    retry: false,
  })
  const batches = useQuery({
    queryKey: ['finance', 'imports'],
    queryFn: () => listImportBatches({ page: 1, limit: 20 }),
    enabled: globalRead,
    retry: false,
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
    mutationFn: recalculateOrderItem,
    onSuccess: async () => {
      toast('success', t('finance.feedback.recalculated'))
      setSelected(undefined)
      await client.invalidateQueries({ queryKey: ['finance'] })
    },
    onError: (error) => toast('error', t('finance.feedback.failed'), error.message),
  })
  const summary = snapshots.data?.summaryByCurrency[0]
  const columns = useMemo<TableColumnsType<FinanceSnapshot>>(
    () => [
      {
        title: t('finance.columns.order'),
        render: (_, row) => <Typography.Text strong>{row.externalOrderId || '—'}</Typography.Text>,
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
          onSearchChange={(value) => {
            setSearch(value)
            setPage(1)
          }}
          placeholder={t('finance.filters.search')}
        />
        <Select
          allowClear
          value={costStatus}
          onChange={(value) => {
            setCostStatus(value)
            setPage(1)
          }}
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
      <Tabs
        items={[
          {
            key: 'overview',
            label: t('finance.tabs.overview'),
            children: (
              <>
                <div className={styles.metrics}>
                  <MetricCard
                    label={t('finance.metrics.revenue')}
                    value={money(summary?.revenueAmount, summary?.currency)}
                  />
                  <MetricCard
                    label={t('finance.metrics.cost')}
                    value={money(summary?.totalCostAmount, summary?.currency)}
                  />
                  <MetricCard
                    label={t('finance.metrics.profit')}
                    value={money(summary?.profitAmount, summary?.currency)}
                  />
                  <MetricCard
                    label={t('finance.metrics.missing')}
                    value={String(summary?.missingCostCount ?? '—')}
                  />
                </div>
                {table}
              </>
            ),
          },
          { key: 'orders', label: t('finance.tabs.orders'), children: table },
          ...(globalRead
            ? [
                {
                  key: 'imports',
                  label: t('finance.tabs.imports'),
                  children: (
                    <SectionCard title={t('finance.imports.title')}>
                      <DataTable
                        rowKey="id"
                        columns={importColumns}
                        dataSource={batches.data?.items}
                        loading={batches.isLoading}
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
        {selected ? (
          <Space direction="vertical" className={styles.detail} size="large">
            <Descriptions
              bordered
              column={3}
              items={[
                {
                  key: 'revenue',
                  label: t('finance.columns.revenue'),
                  children: money(selected.revenue.customerPaidAmount, selected.revenue.currency),
                },
                {
                  key: 'fees',
                  label: t('finance.detail.fees'),
                  children: money(selected.revenue.feeAmount, selected.revenue.currency),
                },
                {
                  key: 'refund',
                  label: t('finance.detail.refund'),
                  children: money(selected.revenue.refundAmount, selected.revenue.currency),
                },
                {
                  key: 'base',
                  label: t('finance.detail.baseCost'),
                  children: money(selected.cost.baseCostAmount, selected.revenue.currency),
                },
                {
                  key: 'total',
                  label: t('finance.columns.cost'),
                  children: money(selected.cost.totalCostAmount, selected.revenue.currency),
                },
                {
                  key: 'profit',
                  label: t('finance.columns.profit'),
                  children: money(selected.margin.grossProfitAmount, selected.revenue.currency),
                },
              ]}
            />
            {selected.cost.costLines.map((line) => (
              <div key={line.code}>
                <Typography.Text type="secondary">{line.label || line.code}</Typography.Text>
                <Typography.Text className={styles.amount}>
                  {money(line.amount, selected.revenue.currency)}
                </Typography.Text>
              </div>
            ))}
            {canWrite ? (
              <Button
                icon={<ReloadOutlined />}
                loading={recalculate.isPending}
                onClick={() => recalculate.mutate(selected.orderItemId)}
              >
                {t('finance.actions.recalculate')}
              </Button>
            ) : null}
          </Space>
        ) : null}
      </Modal>
    </section>
  )
}
