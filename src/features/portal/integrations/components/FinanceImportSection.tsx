import { useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'
import { Alert, Button, InputNumber, Modal, Select, Space, Table, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { ImportBatch } from '@/features/portal/finance/api/financeApi'
import { financeKeys } from '@/features/portal/finance/api/financeKeys'
import {
  allocateRefund,
  confirmRefund,
  listRefundReviews,
  listUnallocatedRefunds,
  type RefundReview,
  type UnallocatedRefund,
} from '@/features/portal/finance/api/financeApi'
import { toMinorUnits } from '@/features/portal/finance/api/refundMoney'
import { formatFinanceMoney } from '@/features/portal/finance/components/financeFormatters'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  FormattedDateTime,
  getDefaultDateRange,
  SectionCard,
  StatusTag,
  TableTextCell,
} from '@/shared/ui'

import {
  ADS_IMPORT_STATUSES,
  type FinanceImportSourceType,
  useFinanceImportBatches,
} from '../hooks/useFinanceImports'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'
import { FinanceImportBatchDetail, FinanceImportStatus } from './FinanceImportBatchDetail'

const PAGE_SIZE = DEFAULT_PAGE_SIZE

export interface FinanceImportSectionProps {
  readonly account: CurrentAccount
  readonly title: string
  readonly permissionHint: string
  readonly sourceType: FinanceImportSourceType
  readonly canRead: boolean
  readonly shops: Shop[]
  readonly isShopsLoading: boolean
  readonly shopNames: Map<string, string>
  readonly isActiveTab: boolean
}

export function FinanceImportSection({
  account,
  title,
  permissionHint,
  sourceType,
  canRead,
  shops,
  isShopsLoading,
  shopNames,
  isActiveTab,
}: FinanceImportSectionProps) {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [shopId, setShopId] = useState<string>()
  const [status, setStatus] = useState<string>()
  const [dates, setDates] = useState<DateRangeValue>(getDefaultDateRange)
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch>()
  const [selectedRefund, setSelectedRefund] = useState<UnallocatedRefund>()
  const [allocationItemId, setAllocationItemId] = useState<string>()
  const [allocationAmount, setAllocationAmount] = useState<number>()
  const queryClient = useQueryClient()
  const unallocatedRefunds = useQuery({
    queryKey: ['finance', 'unallocated-refunds'],
    queryFn: listUnallocatedRefunds,
    enabled: isActiveTab && canRead && sourceType === 'TRANSACTIONS',
  })
  const refundReviews = useQuery({
    queryKey: ['finance', 'refund-reviews'],
    queryFn: listRefundReviews,
    enabled: isActiveTab && canRead && sourceType === 'TRANSACTIONS',
  })
  const allocationMinorUnits =
    allocationAmount === undefined ? undefined : toMinorUnits(allocationAmount)
  const allocate = useMutation({
    mutationFn: () =>
      allocateRefund(selectedRefund!.id, [
        { orderItemId: allocationItemId!, amount: allocationMinorUnits! },
      ]),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: financeKeys.all })
      setSelectedRefund(undefined)
    },
  })
  const confirm = useMutation({
    mutationFn: confirmRefund,
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: financeKeys.all })
    },
  })
  const canWriteRefunds = account.permissions.includes('FINANCE:WRITE')
  const imports = useFinanceImportBatches({
    sourceType,
    page,
    pageSize: PAGE_SIZE,
    shopId,
    status,
    dateFrom: dates.dateFrom,
    dateTo: dates.dateTo,
    enabled: isActiveTab && canRead,
  })
  const resetPage = () => setPage(1)

  const columns: TableColumnsType<ImportBatch> = useMemo(
    () => [
      {
        title: t('portal.integrations.ads.createdAt', { defaultValue: 'Created' }),
        dataIndex: 'createdAt',
        width: 160,
        render: (value: string) => <FormattedDateTime value={value} />,
      },
      {
        title: t('portal.integrations.shop', { defaultValue: 'Shop' }),
        dataIndex: 'shopId',
        width: 160,
        render: (id: string | null) => (
          <TableTextCell value={id ? (shopNames.get(id) ?? id) : '-'} maxWidth={140} />
        ),
      },
      {
        title: t('portal.integrations.ads.status', { defaultValue: 'Status' }),
        dataIndex: 'status',
        width: 120,
        render: (itemStatus: string) => <FinanceImportStatus status={itemStatus} />,
      },
      {
        title: t('portal.integrations.ads.rows', { defaultValue: 'Rows' }),
        width: 180,
        render: (_, batch) =>
          `${batch.processedRows} ${t('portal.integrations.ads.processed', { defaultValue: 'processed' })} / ${batch.validRows} ${t('portal.integrations.ads.valid', { defaultValue: 'valid' })}`,
      },
      {
        title: t('portal.integrations.ads.errors', { defaultValue: 'Errors' }),
        dataIndex: 'errorCount',
        width: 90,
        align: 'center',
      },
      ...(sourceType === 'TRANSACTIONS'
        ? [
            {
              title: 'Profit recalculation',
              width: 200,
              render: (_: unknown, batch: ImportBatch) =>
                batch.recalculationTotal > 0
                  ? `${batch.recalculationStatus} ${batch.recalculationCompleted}/${batch.recalculationTotal} (${batch.recalculationFailed} failed)`
                  : 'Not required',
            },
          ]
        : []),
      {
        title: t('portal.integrations.ads.file', { defaultValue: 'File' }),
        dataIndex: 'originalFilename',
        width: 220,
        render: (value: string) => <TableTextCell value={value} fallback="-" maxWidth={200} />,
      },
    ],
    [shopNames, sourceType, t],
  )

  return (
    <SectionCard title={title}>
      {canRead ? (
        <CoreDataTable
          tableLayout="fixed"
          scroll={{ x: 1_110 }}
          columns={columns}
          dataSource={imports.data?.items ?? []}
          loading={imports.isLoading}
          rowKey="id"
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: imports.data?.pagination.total,
            onChange: setPage,
          }}
          toolbar={
            <FilterBar
              label={t('portal.integrations.financeImports.filters', {
                defaultValue: `${sourceType} import filters`,
              })}
              contentClassName={styles.filters}
            >
              <Select
                allowClear
                aria-label={t('portal.integrations.shop', { defaultValue: 'Shop' })}
                className={styles.filterControl}
                loading={isShopsLoading}
                options={shops.map((shop) => ({
                  label: shop.name,
                  value: shop.id,
                }))}
                placeholder={t('portal.integrations.allShops', { defaultValue: 'All shops' })}
                showSearch
                optionFilterProp="label"
                value={shopId}
                onChange={(nextShopId) => {
                  setShopId(nextShopId)
                  resetPage()
                }}
              />
              <Select
                allowClear
                aria-label={t('portal.integrations.ads.status', { defaultValue: 'Status' })}
                className={styles.filterControl}
                options={ADS_IMPORT_STATUSES.map((s) => ({ label: s, value: s }))}
                placeholder={t('portal.integrations.allStatuses', {
                  defaultValue: 'All statuses',
                })}
                value={status}
                onChange={(nextStatus) => {
                  setStatus(nextStatus)
                  resetPage()
                }}
              />
              <DateRangePicker
                aria-label={t('portal.integrations.ads.dateRange', {
                  defaultValue: 'Created date range',
                })}
                value={dates}
                onChange={(nextDates) => {
                  setDates(nextDates)
                  resetPage()
                }}
              />
            </FilterBar>
          }
          onRow={(batch) => ({ onClick: () => setSelectedBatch(batch) })}
        />
      ) : (
        <Alert type="info" showIcon message={permissionHint} />
      )}
      {selectedBatch ? (
        <FinanceImportBatchDetail
          account={account}
          batchId={selectedBatch.id}
          initialBatch={selectedBatch}
          sourceType={sourceType}
          title={title}
          onClose={() => setSelectedBatch(undefined)}
        />
      ) : null}
      {sourceType === 'TRANSACTIONS' && canRead ? (
        <section style={{ marginTop: 16 }}>
          <Typography.Title level={5}>
            {t('portal.integrations.refunds.unallocatedTitle')}
          </Typography.Title>
          {unallocatedRefunds.isError ? (
            <Alert type="error" showIcon message={t('portal.integrations.refunds.loadFailed')} />
          ) : null}
          <Table<UnallocatedRefund>
            rowKey="id"
            size="small"
            pagination={false}
            loading={unallocatedRefunds.isLoading}
            dataSource={unallocatedRefunds.data || []}
            columns={[
              { title: t('portal.integrations.refunds.order'), dataIndex: 'externalOrderId' },
              {
                title: t('portal.integrations.refunds.remaining'),
                render: (_, row) => formatFinanceMoney(row.remainingAmount, row.currency),
              },
              {
                title: t('portal.integrations.refunds.action'),
                render: (_, row) => (
                  <Button
                    size="small"
                    disabled={!canWriteRefunds}
                    onClick={() => {
                      setSelectedRefund(row)
                      setAllocationItemId(undefined)
                      setAllocationAmount(row.remainingAmount / 100)
                    }}
                  >
                    {t('portal.integrations.refunds.allocate')}
                  </Button>
                ),
              },
            ]}
          />
          <Typography.Title level={5} style={{ marginTop: 16 }}>
            {t('portal.integrations.refunds.reviewTitle')}
          </Typography.Title>
          {refundReviews.isError ? (
            <Alert type="error" showIcon message={t('portal.integrations.refunds.loadFailed')} />
          ) : null}
          <Table<RefundReview>
            rowKey="orderItemId"
            size="small"
            pagination={false}
            loading={refundReviews.isLoading}
            dataSource={refundReviews.data || []}
            columns={[
              { title: t('portal.integrations.refunds.orderItem'), dataIndex: 'orderItemId' },
              {
                title: t('portal.integrations.refunds.refunded'),
                render: (_, row) => formatFinanceMoney(row.allocatedAmount, row.currency),
              },
              {
                title: t('portal.integrations.refunds.originalCharge'),
                render: (_, row) =>
                  formatFinanceMoney(row.expectedCustomerChargeAmount, row.currency),
              },
              {
                title: t('portal.integrations.refunds.review'),
                dataIndex: 'reviewStatus',
                render: (value) => (
                  <StatusTag status={value === 'EXACT_FULL' ? 'operational' : 'warning'}>
                    {t(`portal.integrations.refunds.reviewStatuses.${value}`)}
                  </StatusTag>
                ),
              },
              {
                title: t('portal.integrations.refunds.action'),
                render: (_, row) =>
                  row.canConfirmRefund ? (
                    <Button
                      size="small"
                      loading={confirm.isPending && confirm.variables === row.orderItemId}
                      disabled={!canWriteRefunds}
                      onClick={() => confirm.mutate(row.orderItemId)}
                    >
                      {t('portal.integrations.refunds.confirm')}
                    </Button>
                  ) : (
                    t('portal.integrations.refunds.reviewRequired')
                  ),
              },
            ]}
          />
        </section>
      ) : null}
      <Modal
        open={Boolean(selectedRefund)}
        title={t('portal.integrations.refunds.allocateTitle')}
        onCancel={() => setSelectedRefund(undefined)}
        onOk={() => allocate.mutate()}
        okButtonProps={{
          disabled:
            !allocationItemId ||
            !allocationMinorUnits ||
            allocationMinorUnits > (selectedRefund?.remainingAmount || 0),
          loading: allocate.isPending,
        }}
      >
        <Space direction="vertical" style={{ width: '100%' }}>
          <Typography.Text>
            {selectedRefund
              ? t('portal.integrations.refunds.remainingDescription', {
                  amount: formatFinanceMoney(
                    selectedRefund.remainingAmount,
                    selectedRefund.currency,
                  ),
                })
              : ''}
          </Typography.Text>
          <Select
            placeholder={t('portal.integrations.refunds.orderItem')}
            value={allocationItemId}
            onChange={setAllocationItemId}
            options={(selectedRefund?.items || []).map((item) => ({
              value: item.id,
              label: item.sku || item.id,
            }))}
          />
          <InputNumber
            min={0.01}
            max={(selectedRefund?.remainingAmount || 0) / 100}
            precision={2}
            value={allocationAmount}
            onChange={(value) => setAllocationAmount(typeof value === 'number' ? value : undefined)}
            addonAfter={selectedRefund?.currency || 'USD'}
            aria-label={t('portal.integrations.refunds.amount')}
          />
        </Space>
      </Modal>
    </SectionCard>
  )
}
