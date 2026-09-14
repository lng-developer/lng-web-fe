import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Modal, Progress, Select, Space, Table, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { ImportBatch } from '@/features/portal/finance/api/financeApi'
import type { Shop } from '@/features/portal/shops/api/shopApi'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  DateRangePicker,
  FilterBar,
  FormattedDateTime,
  SectionCard,
  StatusTag,
  TableTextCell,
} from '@/shared/ui'

import { canWriteFinanceForShop } from '../auth/integrationAccess'
import { useFinanceImportPolling } from '../hooks/useFinanceImportPolling'
import {
  ADS_IMPORT_STATUSES,
  type FinanceImportSourceType,
  useFinanceImportBatches,
  useImportedFinanceData,
  useReprocessFinanceImportMutation,
} from '../hooks/useFinanceImports'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE

function statusTone(status: string) {
  if (status === 'COMPLETED') return 'operational'
  if (status === 'FAILED') return 'critical'
  if (status === 'PARTIAL_FAILED') return 'warning'
  if (status === 'CANCELLED') return 'cancelled'
  return 'pending'
}

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
  const [dates, setDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [selectedBatch, setSelectedBatch] = useState<ImportBatch>()

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
  const selectedBatchQuery = useFinanceImportPolling(selectedBatch?.id, selectedBatch)
  const currentBatch = selectedBatchQuery.data ?? selectedBatch
  const importedData = useImportedFinanceData(sourceType, currentBatch?.id, Boolean(canRead))
  const reprocess = useReprocessFinanceImportMutation(() => setSelectedBatch(undefined))

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
        render: (itemStatus: string) => (
          <StatusTag status={statusTone(itemStatus)}>
            {t(`portal.integrations.ads.statuses.${itemStatus}`, { defaultValue: itemStatus })}
          </StatusTag>
        ),
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
      {
        title: 'Profit recalculation',
        width: 200,
        render: (_, batch) =>
          batch.recalculationTotal > 0
            ? `${batch.recalculationStatus} ${batch.recalculationCompleted}/${batch.recalculationTotal} (${batch.recalculationFailed} failed)`
            : 'Not required',
      },
      {
        title: t('portal.integrations.ads.file', { defaultValue: 'File' }),
        dataIndex: 'originalFilename',
        width: 220,
        render: (value: string) => <TableTextCell value={value} fallback="-" maxWidth={200} />,
      },
    ],
    [shopNames, t],
  )

  const detailColumns = useMemo(() => {
    const amount = (value: unknown, currency = 'USD') => {
      const number = Number(value)
      return Number.isFinite(number) ? `${(number / 100).toFixed(2)} ${currency}` : '-'
    }
    const date = (value: unknown) => <FormattedDateTime value={value ? String(value) : null} />
    if (sourceType === 'TRANSACTIONS') {
      return [
        { title: 'Posted', dataIndex: 'postedAt', width: 150, render: date },
        { title: 'Type', dataIndex: 'transactionType', width: 130 },
        { title: 'Status', dataIndex: 'transactionStatus', width: 120 },
        {
          title: 'Order ID',
          dataIndex: 'externalOrderId',
          width: 180,
          render: (id: string | null) => <CopyableOrderId value={id} fallback="—" />,
        },
        {
          title: 'Amount',
          width: 130,
          align: 'right' as const,
          render: (_: unknown, row: Record<string, unknown>) =>
            amount(row.amount, String(row.currency || 'USD')),
        },
      ]
    }
    if (sourceType === 'SETTLEMENTS') {
      return [
        { title: 'Posted', dataIndex: 'postedAt', width: 150, render: date },
        { title: 'Type', dataIndex: 'transactionType', width: 130 },
        {
          title: 'Order ID',
          dataIndex: 'externalOrderId',
          width: 180,
          render: (id: string | null) => <CopyableOrderId value={id} fallback="—" />,
        },
        { title: 'Amount type', dataIndex: 'amountType', width: 140 },
        {
          title: 'Amount',
          width: 130,
          align: 'right' as const,
          render: (_: unknown, row: Record<string, unknown>) =>
            amount(row.amount, String(row.currency || 'USD')),
        },
      ]
    }
    return [
      { title: 'Date', dataIndex: 'reportDate', width: 150, render: date },
      {
        title: 'Campaign',
        dataIndex: 'campaignName',
        width: 220,
        render: (name: string | null) => <TableTextCell value={name} maxWidth={200} />,
      },
      {
        title: 'Spend',
        width: 130,
        align: 'right' as const,
        render: (_: unknown, row: Record<string, unknown>) =>
          amount(row.spendAmount, String(row.currency || 'USD')),
      },
    ]
  }, [sourceType])

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
      <Modal
        open={Boolean(selectedBatch)}
        title={currentBatch?.originalFilename || title}
        width="min(1360px, 92vw)"
        style={{ top: 40 }}
        onCancel={() => setSelectedBatch(undefined)}
        footer={null}
        destroyOnClose
      >
        {currentBatch ? (
          <Space direction="vertical" size={8} style={{ width: '100%', marginBottom: 16 }}>
            <Typography.Text type="secondary">
              {`${currentBatch.processedRows} processed · ${currentBatch.validRows} valid · ${currentBatch.errorCount} errors`}
            </Typography.Text>
            <Space wrap>
              <StatusTag status={statusTone(currentBatch.status)}>{currentBatch.status}</StatusTag>
              <Typography.Text>
                {currentBatch.recalculationTotal > 0
                  ? `Profit recalculation: ${currentBatch.recalculationStatus} (${currentBatch.recalculationCompleted}/${currentBatch.recalculationTotal}; ${currentBatch.recalculationFailed} failed)`
                  : 'Profit recalculation: not required'}
              </Typography.Text>
            </Space>
            {currentBatch.recalculationTotal > 0 ? (
              <Progress
                percent={Math.round(
                  ((currentBatch.recalculationCompleted + currentBatch.recalculationFailed) /
                    currentBatch.recalculationTotal) *
                    100,
                )}
                status={currentBatch.recalculationFailed > 0 ? 'exception' : undefined}
              />
            ) : null}
            {canWriteFinanceForShop(account, currentBatch.shopId ?? null) &&
            (['FAILED', 'PARTIAL_FAILED'].includes(currentBatch.status) ||
              currentBatch.recalculationStatus === 'PARTIAL_FAILED') ? (
              <Button
                loading={reprocess.isPending}
                onClick={() => reprocess.mutate(currentBatch.id)}
              >
                Reprocess
              </Button>
            ) : null}
          </Space>
        ) : null}
        <Table
          rowKey="id"
          size="small"
          loading={importedData.isLoading}
          dataSource={importedData.data?.items ?? []}
          columns={detailColumns}
          pagination={false}
          scroll={{ x: 800 }}
        />
      </Modal>
    </SectionCard>
  )
}
