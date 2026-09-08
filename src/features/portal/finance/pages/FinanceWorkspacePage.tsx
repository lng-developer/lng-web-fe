import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData } from 'react-router-dom'
import { DownloadOutlined } from '@ant-design/icons'
import type { TableColumnsType } from 'antd'
import { Button, Select, Space, Tooltip, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import {
  CopyableOrderId,
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  SearchInput,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import type { FinanceSnapshot } from '../api/financeApi'
import { FinanceCurrencySummary } from '../components/FinanceCurrencySummary'
import { formatFinanceMoney } from '../components/financeFormatters'
import { FinanceImportHistory } from '../components/FinanceImportHistory'
import { FinanceItemSnapshotModal } from '../components/FinanceItemSnapshotModal'
import { FinanceOrderDetailModal } from '../components/FinanceOrderDetailModal'
import { SettlementCashFlow } from '../components/SettlementCashFlow'
import { useFinanceMutations } from '../hooks/useFinanceMutations'
import { useFinanceWorkspace } from '../hooks/useFinanceWorkspace'
import styles from './FinanceWorkspacePage.module.scss'

const DEFAULT_PAGE_SIZE = 20

export const FinanceWorkspacePage = () => {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const permissions = [
    ...account.permissions,
    ...account.scopes.flatMap((scope) => scope.permissions),
  ]
  const globalRead =
    account.permissions.includes('FINANCE:READ') || account.permissions.includes('FINANCE:WRITE')
  const canWrite = permissions.includes('FINANCE:WRITE')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [search, setSearch] = useState('')
  const [costStatus, setCostStatus] = useState<string>()
  const [salesChannelCode, setSalesChannelCode] = useState<string>()
  const [sellerEmployeeCode, setSellerEmployeeCode] = useState<string>()
  const [teamId, setTeamId] = useState<string>()
  const [departmentId, setDepartmentId] = useState<string>()
  const [dates, setDates] = useState<DateRangeValue>({})
  const [selected, setSelected] = useState<FinanceSnapshot>()
  const [selectedItemId, setSelectedItemId] = useState<string>()

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value)
    setPage(1)
  }, [])

  const handleSalesChannelChange = useCallback((value?: string) => {
    setSalesChannelCode(value)
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

  const { snapshots, filterOptions, shopNameById, queryParams } = useFinanceWorkspace({
    globalRead,
    page,
    pageSize,
    search,
    costStatus,
    salesChannelCode,
    sellerEmployeeCode,
    teamId,
    departmentId,
    dates,
  })

  const { recalculate, recalculateItem, exportCsv } = useFinanceMutations(queryParams)

  const handleInspectItem = useCallback((orderItemId: string) => {
    setSelected(undefined)
    setSelectedItemId(orderItemId)
  }, [])

  const handleCloseOrderDetail = useCallback(() => {
    setSelected(undefined)
  }, [])

  const handleCloseItemSnapshot = useCallback(() => {
    setSelectedItemId(undefined)
  }, [])

  const columns = useMemo<TableColumnsType<FinanceSnapshot>>(
    () => [
      {
        title: t('finance.columns.order'),
        width: 140,
        render: (_, row) => <CopyableOrderId strong value={row.externalOrderId} />,
      },
      {
        title: t('finance.columns.channel'),
        width: 150,
        ellipsis: true,
        render: (_, row) => (
          <Space orientation="vertical" size={0}>
            <span>{`${row.salesChannelCode || '—'} · ${row.marketplaceCode || '—'}`}</span>
            <Typography.Text type="secondary" ellipsis>
              {(row.shopId ? shopNameById.get(row.shopId) : undefined) || '—'}
            </Typography.Text>
          </Space>
        ),
      },
      {
        title: t('finance.columns.seller'),
        width: 170,
        ellipsis: true,
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
        width: 110,
        align: 'right',
        render: (_, row) =>
          formatFinanceMoney(row.revenue.customerPaidAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.cost'),
        width: 100,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.cost.totalCostAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.profit'),
        width: 100,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.margin.grossProfitAmount, row.revenue.currency),
      },
      {
        title: t('finance.columns.margin'),
        width: 90,
        align: 'right',
        render: (_, row) => {
          if (row.margin.grossMarginBps == null) {
            return '—'
          }
          const marginPercent = (row.margin.grossMarginBps / 100).toFixed(1)
          const marginVal = row.margin.grossMarginBps / 100
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
        title: t('finance.columns.status'),
        width: 150,
        render: (_, row) => {
          const statusTag = (
            <StatusTag status={row.snapshotStatus === 'MISSING_COST' ? 'critical' : 'processing'}>
              {row.cost.costStatus === 'MISSING'
                ? t('finance.costStatuses.MISSING')
                : t('finance.costStatuses.PRESENT')}
            </StatusTag>
          )

          return (
            <Space orientation="vertical" size={4}>
              {row.cost.missingCostReason ? (
                <Tooltip title={t(`finance.missingReasons.${row.cost.missingCostReason}`)}>
                  <span>{statusTag}</span>
                </Tooltip>
              ) : (
                statusTag
              )}
              {row.revenue.feeSource ? (
                <StatusTag
                  status={
                    row.revenue.feeSource === 'ESTIMATED_15_PERCENT' ? 'warning' : 'operational'
                  }
                >
                  {t(`finance.detail.feeSources.${row.revenue.feeSource}`)}
                </StatusTag>
              ) : null}
            </Space>
          )
        },
      },
    ],
    [shopNameById, t],
  )

  return (
    <section className={styles.page}>
      <FinanceCurrencySummary
        summaries={snapshots.data?.summaryByCurrency}
        onFilterMissingCost={() => handleCostStatusChange('MISSING')}
      />

      <SectionCard
        title={t('finance.profitability')}
        extra={
          <Space className={styles.headerActions}>
            <Button type="link" href="/portal/integrations?tab=finance">
              {t('finance.actions.manageReconciliation')}
            </Button>
            <Typography.Text type="secondary">
              {globalRead ? t('finance.scope.global') : t('finance.scope.scoped')}
            </Typography.Text>
            <Button
              icon={<DownloadOutlined />}
              loading={exportCsv.isPending}
              onClick={() => exportCsv.mutate()}
            >
              {t('finance.actions.exportCsv')}
            </Button>
          </Space>
        }
      >
        <FilterBar label={t('finance.filters.label')} contentClassName={styles.filters}>
          <div className={styles.filtersRow} data-testid="finance-filters-row">
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
            <Select
              allowClear
              aria-label={t('finance.filters.cost')}
              value={costStatus}
              onChange={handleCostStatusChange}
              placeholder={t('finance.filters.cost')}
              options={[
                { value: 'PRESENT', label: t('finance.costStatuses.PRESENT') },
                { value: 'MISSING', label: t('finance.costStatuses.MISSING') },
              ]}
            />
            <DateRangePicker
              value={dates}
              onChange={handleDateRangeChange}
              aria-label={t('finance.filters.date')}
            />
          </div>
        </FilterBar>

        <CoreDataTable
          tableLayout="fixed"
          rowKey="id"
          columns={columns}
          dataSource={snapshots.data?.items}
          loading={snapshots.isLoading}
          onRow={(row) => ({ onClick: () => setSelected(row) })}
          pagination={{
            current: page,
            pageSize,
            total: snapshots.data?.pagination.total,
            onChange: (nextPage, nextPageSize) => {
              setPage(nextPage)
              setPageSize(nextPageSize)
            },
          }}
          scroll={{ x: 1010 }}
        />
      </SectionCard>

      {globalRead ? <FinanceImportHistory canReprocess={account.permissions.includes('FINANCE:WRITE')} /> : null}
      {globalRead ? <SettlementCashFlow /> : null}

      <FinanceOrderDetailModal
        selectedOrder={selected}
        canWrite={canWrite}
        isRecalculatingOrder={recalculate.isPending}
        isRecalculatingItem={recalculateItem.isPending}
        onClose={handleCloseOrderDetail}
        onInspectItem={handleInspectItem}
        onRecalculateOrder={(orderId) => recalculate.mutate(orderId)}
        onRecalculateItem={(itemId) => recalculateItem.mutate(itemId)}
      />

      <FinanceItemSnapshotModal
        selectedItemId={selectedItemId}
        canWrite={canWrite}
        isRecalculatingItem={recalculateItem.isPending}
        onClose={handleCloseItemSnapshot}
        onRecalculateItem={(itemId) => recalculateItem.mutate(itemId)}
      />
    </section>
  )
}
