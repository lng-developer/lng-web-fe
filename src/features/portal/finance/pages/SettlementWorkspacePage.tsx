import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import {
  DollarCircleOutlined,
  LinkOutlined,
  RollbackOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Input, Modal, Progress, Select, Space, Table, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { type CurrentAccount } from '@/features/auth/api/authApi'
import {
  CopyableOrderId,
  CopyableSku,
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  FormattedDateTime,
  MetricCard,
  SectionCard,
  StatusTag,
  TableTextCell,
} from '@/shared/ui'

import {
  getSettlement,
  listImportBatches,
  listSettlements,
  reconcileSettlement,
  type SettlementLedgerLine,
  type SettlementSummary,
} from '../api/financeApi'
import { formatFinanceMoney } from '../components/financeFormatters'
import { listShops } from '@/features/portal/shops/api/shopApi'
import styles from './SettlementWorkspacePage.module.scss'

const PAGE_SIZE = 20

function date(value: string | null | undefined) {
  return <FormattedDateTime value={value} />
}

function bankReceiptStatus(t: (key: string) => string, status?: string) {
  if (status === 'RECONCILED') return t('finance.settlements.bankReceiptConfirmed')
  if (status === 'NEEDS_REVIEW') return t('finance.settlements.bankReceiptNeedsReview')
  return t('finance.settlements.bankReceiptPending')
}

export function SettlementWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const canWrite = [
    ...account.permissions,
    ...account.scopes.flatMap((scope) => scope.permissions),
  ].includes('FINANCE:WRITE')
  const client = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [dates, setDates] = useState<DateRangeValue>({})
  const [selected, setSelected] = useState<SettlementSummary>()
  const [ledgerPage, setLedgerPage] = useState(1)
  const [reconciliationStatus, setReconciliationStatus] = useState<string>()
  const [hasVariance, setHasVariance] = useState(false)
  const [unlinkedOnly, setUnlinkedOnly] = useState(false)
  const [shopId, setShopId] = useState<string>()
  const [reviewNote, setReviewNote] = useState('')
  const selectedId = selected?.id || searchParams.get('settlementId') || undefined

  const query = useMemo(
    () => ({
      page,
      limit: PAGE_SIZE,
      dateFrom: dates.dateFrom,
      dateTo: dates.dateTo,
      shopId,
      reconciliationStatus,
      hasVariance: hasVariance || undefined,
      hasUnlinkedRows: unlinkedOnly || undefined,
    }),
    [dates.dateFrom, dates.dateTo, hasVariance, reconciliationStatus, shopId, unlinkedOnly, page],
  )
  const settlements = useQuery({
    queryKey: ['finance', 'settlements', query],
    queryFn: () => listSettlements(query),
  })
  const batches = useQuery({
    queryKey: ['finance', 'import-batches', 'SETTLEMENTS'],
    queryFn: () => listImportBatches({ sourceType: 'SETTLEMENTS', limit: 100 }),
  })
  const detail = useQuery({
    queryKey: ['finance', 'settlements', selectedId, 'detail', ledgerPage, unlinkedOnly],
    queryFn: () =>
      getSettlement(selectedId!, {
        page: ledgerPage,
        limit: PAGE_SIZE,
        linkState: unlinkedOnly ? 'UNLINKED' : 'ALL',
      }),
    enabled: Boolean(selectedId),
  })
  const shops = useQuery({
    queryKey: ['shops', 'finance-settlements'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
  })
  const reconcile = useMutation({
    mutationFn: ({
      id,
      status,
      note,
    }: {
      id: string
      status: 'RECONCILED' | 'NEEDS_REVIEW'
      note?: string
    }) => reconcileSettlement(id, { status, note }),
    onSuccess: () => client.invalidateQueries({ queryKey: ['finance', 'settlements'] }),
  })
  const activeSettlement = selected || detail.data?.settlement
  const selectedBatch = batches.data?.items.find(
    (batch) => batch.id === activeSettlement?.importBatchId,
  )
  const currencySummaries = settlements.data?.summaryByCurrency ?? []

  const columns = useMemo<TableColumnsType<SettlementSummary>>(
    () => [
      {
        title: t('finance.settlements.settlementId'),
        dataIndex: 'settlementId',
        width: 160,
        render: (value: string | null) => (
          <Button type="link" className={styles.idButton}>
            {value || '—'}
          </Button>
        ),
      },
      {
        title: t('finance.settlements.period'),
        width: 220,
        render: (_, row) => (
          <Space size={4}>
            {date(row.periodStartAt)}
            <span>–</span>
            {date(row.periodEndAt)}
          </Space>
        ),
      },
      {
        title: t('finance.settlements.amazonTransferDate'),
        dataIndex: 'depositAt',
        width: 150,
        render: date,
      },
      {
        title: t('finance.settlements.amazonPayout'),
        width: 140,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.payoutAmount, row.currency),
      },
      {
        title: t('finance.settlements.ledgerNet'),
        width: 140,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.netAmount, row.currency),
      },
      {
        title: t('finance.settlements.variance'),
        width: 120,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.cashVarianceAmount, row.currency),
      },
      {
        title: t('finance.settlements.linked'),
        width: 110,
        align: 'center',
        render: (_, row) => `${row.ledgerSummary.linkedCount}/${row.ledgerSummary.lineCount}`,
      },
      {
        title: t('finance.settlements.status'),
        width: 140,
        render: (_, row) => (
          <StatusTag
            status={
              row.reconciliation?.status === 'RECONCILED'
                ? 'operational'
                : row.reconciliation?.status === 'NEEDS_REVIEW'
                  ? 'critical'
                  : 'pending'
            }
          >
            {t(
              row.reconciliation?.status === 'RECONCILED'
                ? 'finance.settlements.completed'
                : 'finance.settlements.pending',
            )}
          </StatusTag>
        ),
      },
    ],
    [batches.data?.items, t],
  )

  const ledgerColumns = useMemo<TableColumnsType<SettlementLedgerLine>>(
    () => [
      { title: t('finance.settlements.posted'), dataIndex: 'postedAt', width: 150, render: date },
      {
        title: t('finance.settlements.type'),
        dataIndex: 'transactionType',
        width: 130,
        render: (value) => <TableTextCell value={value} maxWidth={120} />,
      },
      {
        title: t('finance.settlements.amountType'),
        dataIndex: 'amountType',
        width: 140,
        render: (value) => <TableTextCell value={value} maxWidth={130} />,
      },
      {
        title: t('finance.settlements.order'),
        dataIndex: 'externalOrderId',
        width: 180,
        render: (value: string | null) => <CopyableOrderId value={value} fallback="—" />,
      },
      {
        title: t('finance.settlements.sku'),
        dataIndex: 'sku',
        width: 160,
        render: (value: string | null) => <CopyableSku value={value} fallback="—" />,
      },
      {
        title: t('finance.settlements.movement'),
        width: 130,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.amount, row.currency),
      },
    ],
    [t],
  )

  return (
    <section className={styles.page}>
      <SectionCard title={t('finance.settlements.title')}>
        {currencySummaries.length ? (
          <div className={styles.metrics}>
            {currencySummaries.map((summary) => (
              <div className={styles.currencyGroup} key={summary.currency}>
                <Typography.Text strong>{summary.currency}</Typography.Text>
                <div className={styles.metricRow}>
                  <MetricCard
                    icon={<DollarCircleOutlined />}
                    label={t('finance.settlements.total')}
                    value={formatFinanceMoney(summary.netSettlementAmount, summary.currency)}
                    variant="primary"
                  />
                  <MetricCard
                    icon={<WalletOutlined />}
                    label={t('finance.settlements.periods')}
                    value={summary.settlementCount}
                    variant="neutral"
                  />
                  <MetricCard
                    icon={<LinkOutlined />}
                    label={t('finance.settlements.ledgerLines')}
                    value={
                      settlements.data?.items
                        .filter((item) => item.currency === summary.currency)
                        .reduce((total, item) => total + item.ledgerSummary.lineCount, 0) ?? 0
                    }
                    variant="info"
                  />
                </div>
              </div>
            ))}
          </div>
        ) : null}
        <Alert
          className={styles.currencyNote}
          type="info"
          showIcon
          title={t('finance.settlements.currencyNote')}
          description={t('finance.settlements.bankReceiptHint')}
        />
      </SectionCard>

      <SectionCard title={t('finance.settlements.periods')}>
        <FilterBar label={t('finance.filters.label')} contentClassName={styles.filters}>
          <DateRangePicker
            aria-label={t('finance.settlements.depositDate')}
            value={dates}
            onChange={(next) => {
              setDates(next)
              setPage(1)
            }}
          />
          <Select
            allowClear
            aria-label={t('finance.filters.shop')}
            placeholder={t('finance.filters.shop')}
            value={shopId}
            onChange={(value) => {
              setShopId(value)
              setPage(1)
            }}
            options={shops.data?.items.map((shop) => ({ value: shop.id, label: shop.name }))}
          />
          <Select
            allowClear
            aria-label={t('finance.settlements.reconciliationStatus')}
            placeholder={t('finance.settlements.reconciliationStatus')}
            value={reconciliationStatus}
            onChange={(value) => {
              setReconciliationStatus(value)
              setPage(1)
            }}
            options={['OPEN', 'NEEDS_REVIEW', 'RECONCILED'].map((value) => ({
              value,
              label: bankReceiptStatus(t, value),
            }))}
          />
          <Button
            type={hasVariance ? 'primary' : 'default'}
            onClick={() => {
              setHasVariance(!hasVariance)
              setPage(1)
            }}
          >
            {t('finance.settlements.mismatch')}
          </Button>
          <Button
            type={unlinkedOnly ? 'primary' : 'default'}
            onClick={() => {
              setUnlinkedOnly(!unlinkedOnly)
              setPage(1)
              setLedgerPage(1)
            }}
          >
            {t('finance.settlements.unlinkedOnly')}
          </Button>
        </FilterBar>
        <CoreDataTable
          fillViewport
          rowKey="id"
          columns={columns}
          dataSource={settlements.data?.items ?? []}
          loading={settlements.isLoading}
          emptyText={t('finance.settlements.noData')}
          onRow={(row) => ({
            onClick: () => {
              setSelected(row)
              setLedgerPage(1)
            },
          })}
          pagination={{
            current: page,
            pageSize: PAGE_SIZE,
            total: settlements.data?.pagination.total,
            onChange: (nextPage) => setPage(nextPage),
          }}
          scroll={{ x: 1140 }}
        />
      </SectionCard>

      <Modal
        destroyOnClose
        open={Boolean(selectedId)}
        title={
          activeSettlement
            ? `${t('finance.settlements.settlementId')}: ${activeSettlement.settlementId || '—'}`
            : undefined
        }
        width="min(1360px, 92vw)"
        style={{ top: 40 }}
        onCancel={() => {
          setSelected(undefined)
          setSearchParams({})
        }}
        footer={null}
      >
        {detail.data ? (
          <Space orientation="vertical" size={16} style={{ width: '100%' }}>
            <div className={styles.detailHeader}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {date(detail.data.settlement.periodStartAt)}
                <span>–</span>
                {date(detail.data.settlement.periodEndAt)}
              </div>
              <Typography.Title level={4} className={styles.detailAmount}>
                {formatFinanceMoney(
                  detail.data.settlement.netSettlementAmount ?? detail.data.settlement.totalAmount,
                  detail.data.settlement.currency,
                )}
              </Typography.Title>
            </div>
            <div className={styles.movementGrid}>
              <MetricCard
                icon={<DollarCircleOutlined />}
                label={t('finance.settlements.inflow')}
                value={formatFinanceMoney(
                  detail.data.ledger.summary.inflowAmount,
                  detail.data.settlement.currency,
                )}
                variant="success"
              />
              <MetricCard
                icon={<RollbackOutlined />}
                label={t('finance.settlements.outflow')}
                value={formatFinanceMoney(
                  detail.data.ledger.summary.outflowAmount,
                  detail.data.settlement.currency,
                )}
                variant="warning"
              />
              <MetricCard
                icon={<LinkOutlined />}
                label={t('finance.settlements.linked')}
                value={`${detail.data.ledger.summary.linkedCount}/${detail.data.ledger.summary.lineCount}`}
                variant="info"
              />
            </div>
            <Alert
              type={
                detail.data.settlement.ledgerSummary.cashVarianceAmount ||
                detail.data.ledger.summary.unlinkedCount
                  ? 'warning'
                  : 'success'
              }
              showIcon
              title={t('finance.settlements.reconciliationSummary', {
                variance: formatFinanceMoney(
                  detail.data.settlement.ledgerSummary.cashVarianceAmount,
                  detail.data.settlement.currency,
                ),
                unlinked: detail.data.ledger.summary.unlinkedCount,
              })}
              description={
                detail.data.settlement.reconciliation?.note ||
                bankReceiptStatus(t, detail.data.settlement.reconciliation?.status)
              }
            />
            {canWrite ? (
              <Space>
                <Button
                  disabled={Boolean(
                    detail.data.settlement.ledgerSummary.cashVarianceAmount ||
                    detail.data.ledger.summary.unlinkedCount,
                  )}
                  loading={reconcile.isPending}
                  onClick={() =>
                    reconcile.mutate({ id: detail.data!.settlement.id, status: 'RECONCILED' })
                  }
                >
                  {t('finance.settlements.markReconciled')}
                </Button>
                <Input.TextArea
                  aria-label={t('finance.settlements.reviewNote')}
                  autoSize={{ minRows: 1, maxRows: 3 }}
                  placeholder={t('finance.settlements.reviewNoteRequired')}
                  value={reviewNote}
                  onChange={(event) => setReviewNote(event.target.value)}
                />
                <Button
                  disabled={reviewNote.trim().length < 3}
                  loading={reconcile.isPending}
                  onClick={() =>
                    reconcile.mutate({
                      id: detail.data!.settlement.id,
                      status: 'NEEDS_REVIEW',
                      note: reviewNote.trim(),
                    })
                  }
                >
                  {t('finance.settlements.needsReview')}
                </Button>
              </Space>
            ) : null}
            {selectedBatch?.recalculationTotal ? (
              <div>
                <Typography.Text type="secondary">
                  {selectedBatch.recalculationStatus}
                </Typography.Text>
                <Progress
                  percent={Math.round(
                    ((selectedBatch.recalculationCompleted + selectedBatch.recalculationFailed) /
                      selectedBatch.recalculationTotal) *
                      100,
                  )}
                  status={selectedBatch.recalculationFailed ? 'exception' : undefined}
                />
              </div>
            ) : null}
            <Typography.Title level={5}>{t('finance.settlements.ledgerMovement')}</Typography.Title>
            <Table
              rowKey="id"
              size="small"
              columns={ledgerColumns}
              dataSource={detail.data.ledger.items}
              loading={detail.isLoading}
              pagination={{
                current: ledgerPage,
                pageSize: PAGE_SIZE,
                total: detail.data.ledger.pagination.total,
                onChange: setLedgerPage,
              }}
              scroll={{ x: 900 }}
            />
          </Space>
        ) : null}
      </Modal>
    </section>
  )
}
