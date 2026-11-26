import { type ReactNode, useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Button, Input, Progress, Select, Space, Table, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import type { ImportBatch } from '@/features/portal/finance/api/financeApi'
import { SettlementActivityModal } from '@/features/portal/finance/components/SettlementActivityModal'
import { DEFAULT_PAGE_SIZE } from '@/shared/constants/enum'
import {
  CopyableOrderId,
  DateRangePicker,
  DetailDrawer,
  FilterBar,
  FormattedDateTime,
  humanizeCode,
  StatusTag,
  TableTextCell,
} from '@/shared/ui'

import { canWriteFinanceForShop } from '../auth/integrationAccess'
import { useFinanceImportPolling } from '../hooks/useFinanceImportPolling'
import {
  type FinanceImportSourceType,
  useImportedFinanceData,
  useReprocessFinanceImportMutation,
} from '../hooks/useFinanceImports'
import styles from '../pages/IntegrationWorkbenchPage.module.scss'

const PAGE_SIZE = DEFAULT_PAGE_SIZE

type FeeSummary = {
  totalAmount?: unknown
  items?: Array<{ type?: unknown; amount?: unknown }>
}

function formatAmount(value: unknown, currency = 'USD') {
  const number = Number(value)
  return Number.isFinite(number) ? `${(number / 100).toFixed(2)} ${currency}` : '-'
}

function financeImportStatusTone(status: string) {
  if (status === 'COMPLETED') return 'operational'
  if (status === 'FAILED') return 'critical'
  if (status === 'PARTIAL_FAILED') return 'warning'
  if (status === 'CANCELLED') return 'cancelled'
  return 'pending'
}

export function FinanceImportStatus({ status }: { readonly status: string }) {
  const { t } = useTranslation()
  return (
    <StatusTag status={financeImportStatusTone(status)}>
      {t(`portal.integrations.financeImports.details.statuses.${status}`, {
        defaultValue: humanizeCode(status),
      })}
    </StatusTag>
  )
}

type FinanceImportBatchDetailProps = {
  readonly account: CurrentAccount
  readonly batchId?: string
  readonly initialBatch?: ImportBatch
  readonly candidates?: ImportBatch[]
  readonly expectedShopId?: string
  readonly commandError?: string | null
  readonly noBatchContent?: ReactNode
  readonly loading?: boolean
  readonly sourceType: FinanceImportSourceType
  readonly title: string
  readonly onClose: () => void
}

export function FinanceImportBatchDetail({
  account,
  batchId,
  initialBatch,
  candidates,
  expectedShopId,
  commandError,
  noBatchContent,
  loading,
  sourceType,
  title,
  onClose,
}: FinanceImportBatchDetailProps) {
  const { t } = useTranslation()
  const [selectedCandidate, setSelectedCandidate] = useState<string>()
  const candidate =
    candidates?.length === 1
      ? candidates[0]
      : candidates?.find((batch) => batch.id === selectedCandidate)
  const batchQuery = useFinanceImportPolling(batchId ?? candidate?.id, initialBatch ?? candidate)
  const batch = batchQuery.data
  const matchesCommand =
    !expectedShopId || (batch?.shopId === expectedShopId && batch.sourceType === sourceType)
  const chooseReportLabel = t('portal.integrations.financeImports.details.chooseReport')
  const compact = Boolean(noBatchContent && !batchId && !candidates?.length)

  return (
    <DetailDrawer
      open
      title={(matchesCommand && batch?.originalFilename) || title}
      width={compact ? 'min(640px, 94vw)' : 'min(1450px, 94vw)'}
      drawerWidth={compact ? 'min(640px, 94vw)' : undefined}
      onClose={onClose}
      loading={loading || batchQuery.isLoading}
      styles={{ body: { overscrollBehavior: 'contain' } }}
    >
      {commandError && !compact ? <Alert type="error" showIcon title={commandError} /> : null}
      {candidates?.length ? (
        <Space orientation="vertical" size={8} className={styles.financeBatchCandidates}>
          <Typography.Text type="secondary">
            {t('portal.integrations.financeImports.details.relatedReports')}
          </Typography.Text>
          {candidates.length > 1 ? (
            <Select
              className={styles.financeBatchSelect}
              popupMatchSelectWidth={false}
              aria-label={chooseReportLabel}
              placeholder={chooseReportLabel}
              value={selectedCandidate}
              onChange={setSelectedCandidate}
              options={candidates.map((report) => ({
                value: report.id,
                label: (
                  <Space size={8}>
                    {report.originalFilename}
                    <FormattedDateTime value={report.createdAt} />
                  </Space>
                ),
              }))}
            />
          ) : null}
        </Space>
      ) : null}
      {batchQuery.isError || (batch && !matchesCommand) ? (
        <Alert
          type="error"
          showIcon
          title={t('portal.integrations.financeImports.details.loadFailed')}
        />
      ) : null}
      {batch && matchesCommand ? (
        <FinanceImportBatchContents
          key={batch.id}
          account={account}
          currentBatch={batch}
          sourceType={sourceType}
          onClose={onClose}
        />
      ) : null}
      {compact && !loading ? noBatchContent : null}
    </DetailDrawer>
  )
}

function FinanceImportBatchContents({
  account,
  currentBatch,
  sourceType,
  onClose,
}: {
  readonly account: CurrentAccount
  readonly currentBatch: ImportBatch
  readonly sourceType: FinanceImportSourceType
  readonly onClose: () => void
}) {
  const { t } = useTranslation()
  const label = useCallback(
    (key: string) => t(`portal.integrations.financeImports.details.${key}`),
    [t],
  )
  const [detailPage, setDetailPage] = useState(1)
  const [detailDates, setDetailDates] = useState<{ dateFrom?: string; dateTo?: string }>({})
  const [transactionType, setTransactionType] = useState('')
  const [transactionStatus, setTransactionStatus] = useState('')
  const [externalOrderId, setExternalOrderId] = useState('')
  const [linkStatus, setLinkStatus] = useState<string>()
  const [settlementId, setSettlementId] = useState('')
  const [activeSettlement, setActiveSettlement] = useState<{ id: string; number: string | null }>()

  const importedData = useImportedFinanceData(
    sourceType,
    currentBatch.id,
    {
      page: detailPage,
      limit: PAGE_SIZE,
      dateFrom: detailDates.dateFrom,
      dateTo: detailDates.dateTo,
      ...(sourceType === 'TRANSACTIONS'
        ? {
            transactionType: transactionType || undefined,
            transactionStatus: transactionStatus || undefined,
            externalOrderId: externalOrderId || undefined,
            linkStatus,
          }
        : sourceType === 'SETTLEMENTS'
          ? { settlementId: settlementId || undefined }
          : {}),
    },
    true,
  )
  const reprocess = useReprocessFinanceImportMutation(onClose)

  const resetDetailPage = () => setDetailPage(1)
  const detailColumns = useMemo(() => {
    const amount = formatAmount
    const date = (value: unknown) => <FormattedDateTime value={value ? String(value) : null} />
    if (sourceType === 'TRANSACTIONS') {
      return [
        { title: label('posted'), dataIndex: 'postedAt', width: 150, render: date },
        { title: label('type'), dataIndex: 'transactionType', width: 130 },
        { title: label('status'), dataIndex: 'transactionStatus', width: 120 },
        {
          title: label('orderId'),
          dataIndex: 'externalOrderId',
          width: 180,
          render: (id: string | null) => <CopyableOrderId value={id} fallback="—" />,
        },
        {
          title: label('netAmount'),
          width: 130,
          align: 'right' as const,
          render: (_: unknown, row: Record<string, unknown>) =>
            amount(row.amount, String(row.currency || 'USD')),
        },
        {
          title: label('fees'),
          width: 130,
          align: 'right' as const,
          render: (_: unknown, row: Record<string, unknown>) =>
            amount(
              (row.feeSummary as FeeSummary | undefined)?.totalAmount,
              String(row.currency || 'USD'),
            ),
        },
      ]
    }
    if (sourceType === 'SETTLEMENTS') {
      return [
        { title: label('depositDate'), dataIndex: 'depositAt', width: 150, render: date },
        {
          title: label('settlementId'),
          dataIndex: 'settlementId',
          width: 260,
          render: (number: string | null, row: Record<string, unknown>) => {
            const id = typeof row.id === 'string' ? row.id : undefined
            return (
              <Space size={4}>
                <TableTextCell value={number} fallback="—" maxWidth={120} />
                <Button
                  type="link"
                  size="small"
                  aria-haspopup="dialog"
                  disabled={!id}
                  onClick={() => id && setActiveSettlement({ id, number })}
                >
                  {label('viewSettlement')}
                </Button>
              </Space>
            )
          },
        },
        { title: label('periodStart'), dataIndex: 'periodStartAt', width: 150, render: date },
        { title: label('periodEnd'), dataIndex: 'periodEndAt', width: 150, render: date },
        {
          title: label('payoutAmount'),
          width: 130,
          align: 'right' as const,
          render: (_: unknown, row: Record<string, unknown>) =>
            amount(row.netSettlementAmount || row.totalAmount, String(row.currency || 'USD')),
        },
      ]
    }
    return [
      { title: label('date'), dataIndex: 'reportDate', width: 150, render: date },
      {
        title: label('campaign'),
        dataIndex: 'campaignName',
        width: 220,
        render: (name: string | null) => <TableTextCell value={name} maxWidth={200} />,
      },
      {
        title: label('spend'),
        width: 130,
        align: 'right' as const,
        render: (_: unknown, row: Record<string, unknown>) =>
          amount(row.spendAmount, String(row.currency || 'USD')),
      },
    ]
  }, [label, sourceType])

  return (
    <div className={styles.financeBatchContent}>
      <div className={styles.financeBatchSummary}>
        <Space wrap size={[12, 4]}>
          <FinanceImportStatus status={currentBatch.status} />
          <Typography.Text type="secondary">
            {t('portal.integrations.financeImports.details.rows', {
              processed: currentBatch.processedRows,
              valid: currentBatch.validRows,
              errors: currentBatch.errorCount,
            })}
          </Typography.Text>
          {canWriteFinanceForShop(account, currentBatch.shopId ?? null) &&
          (['FAILED', 'PARTIAL_FAILED'].includes(currentBatch.status) ||
            currentBatch.recalculationStatus === 'PARTIAL_FAILED') ? (
            <Button
              size="small"
              loading={reprocess.isPending}
              onClick={() => reprocess.mutate(currentBatch.id)}
            >
              {label('reprocess')}
            </Button>
          ) : null}
        </Space>
        {sourceType === 'TRANSACTIONS' ? (
          <Typography.Text type="secondary">
            {currentBatch.recalculationTotal > 0
              ? t('portal.integrations.financeImports.details.recalculation', {
                  status: t(
                    'portal.integrations.financeImports.details.statuses.' +
                      currentBatch.recalculationStatus,
                    { defaultValue: humanizeCode(currentBatch.recalculationStatus) },
                  ),
                  done: currentBatch.recalculationCompleted,
                  total: currentBatch.recalculationTotal,
                  failed: currentBatch.recalculationFailed,
                })
              : label('noRecalculation')}
          </Typography.Text>
        ) : null}
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
      </div>

      {sourceType === 'TRANSACTIONS' ? (
        <FilterBar label={label('transactionFilters')}>
          <DateRangePicker
            aria-label={label('postedDateRange')}
            value={detailDates}
            onChange={(nextDates) => {
              setDetailDates(nextDates)
              resetDetailPage()
            }}
          />
          <Input
            className={styles.financeBatchFilter}
            aria-label={label('transactionType')}
            placeholder={label('transactionType')}
            value={transactionType}
            onChange={(event) => {
              setTransactionType(event.target.value)
              resetDetailPage()
            }}
          />
          <Input
            className={styles.financeBatchFilter}
            aria-label={label('transactionStatus')}
            placeholder={label('transactionStatus')}
            value={transactionStatus}
            onChange={(event) => {
              setTransactionStatus(event.target.value)
              resetDetailPage()
            }}
          />
          <Input
            className={styles.financeBatchFilter}
            aria-label={label('orderId')}
            placeholder={label('orderId')}
            value={externalOrderId}
            onChange={(event) => {
              setExternalOrderId(event.target.value)
              resetDetailPage()
            }}
          />
          <Select
            allowClear
            aria-label={label('linkStatus')}
            className={styles.financeBatchFilter}
            options={[
              { label: label('linked'), value: 'LINKED' },
              { label: label('unlinked'), value: 'UNLINKED' },
            ]}
            placeholder={label('linkStatus')}
            value={linkStatus}
            onChange={(nextLinkStatus) => {
              setLinkStatus(nextLinkStatus)
              resetDetailPage()
            }}
          />
        </FilterBar>
      ) : null}
      {sourceType === 'SETTLEMENTS' ? (
        <FilterBar label={label('settlementFilters')}>
          <DateRangePicker
            aria-label={label('depositDateRange')}
            value={detailDates}
            onChange={(nextDates) => {
              setDetailDates(nextDates)
              resetDetailPage()
            }}
          />
          <Input
            className={styles.financeBatchFilter}
            aria-label={label('settlementId')}
            placeholder={label('settlementId')}
            value={settlementId}
            onChange={(event) => {
              setSettlementId(event.target.value)
              resetDetailPage()
            }}
          />
        </FilterBar>
      ) : null}
      {importedData.isError ? <Alert type="error" showIcon title={label('loadFailed')} /> : null}
      <Table
        rowKey="id"
        size="small"
        loading={importedData.isLoading}
        dataSource={importedData.data?.items ?? []}
        columns={detailColumns}
        expandable={
          sourceType === 'TRANSACTIONS'
            ? {
                expandedRowRender: (row: Record<string, unknown>) => {
                  const fees = (row.feeSummary as FeeSummary | undefined)?.items ?? []
                  return fees.length ? (
                    <Space size="middle" wrap>
                      {fees.map((fee) => (
                        <Typography.Text key={String(fee.type)}>
                          {String(fee.type || label('fees')).replaceAll('_', ' ')}:{' '}
                          {formatAmount(fee.amount, String(row.currency || 'USD'))}
                        </Typography.Text>
                      ))}
                    </Space>
                  ) : (
                    <Typography.Text type="secondary">{label('noFees')}</Typography.Text>
                  )
                },
              }
            : undefined
        }
        pagination={{
          current: detailPage,
          pageSize: PAGE_SIZE,
          total: importedData.data?.pagination.total,
          hideOnSinglePage: true,
          onChange: setDetailPage,
        }}
        scroll={{ x: 800 }}
      />
      {activeSettlement ? (
        <SettlementActivityModal
          key={activeSettlement.id}
          account={account}
          recordId={activeSettlement.id}
          settlementNumber={activeSettlement.number}
          importBatches={[currentBatch]}
          onClose={() => setActiveSettlement(undefined)}
        />
      ) : null}
    </div>
  )
}
