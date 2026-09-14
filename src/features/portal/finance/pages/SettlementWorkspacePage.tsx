import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  DollarCircleOutlined,
  LinkOutlined,
  RollbackOutlined,
  WalletOutlined,
} from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Modal, Progress, Space, Table, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
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
  type SettlementLedgerLine,
  type SettlementSummary,
} from '../api/financeApi'
import { formatFinanceMoney } from '../components/financeFormatters'
import styles from './SettlementWorkspacePage.module.scss'

const PAGE_SIZE = 20

function date(value: string | null | undefined) {
  return <FormattedDateTime value={value} />
}

function statusTone(status?: string) {
  if (status === 'COMPLETED') return 'operational' as const
  if (status === 'FAILED' || status === 'PARTIAL_FAILED') return 'critical' as const
  if (status === 'PROCESSING') return 'processing' as const
  return 'pending' as const
}

export function SettlementWorkspacePage() {
  const { t } = useTranslation()
  const [page, setPage] = useState(1)
  const [dates, setDates] = useState<DateRangeValue>({})
  const [selected, setSelected] = useState<SettlementSummary>()
  const [ledgerPage, setLedgerPage] = useState(1)

  const query = useMemo(
    () => ({ page, limit: PAGE_SIZE, dateFrom: dates.dateFrom, dateTo: dates.dateTo }),
    [dates.dateFrom, dates.dateTo, page],
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
    queryKey: ['finance', 'settlements', selected?.id, 'detail', ledgerPage],
    queryFn: () => getSettlement(selected!.id, { page: ledgerPage, limit: PAGE_SIZE }),
    enabled: Boolean(selected),
  })
  const selectedBatch = batches.data?.items.find((batch) => batch.id === selected?.importBatchId)
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
        title: t('finance.settlements.depositDate'),
        dataIndex: 'depositAt',
        width: 150,
        render: date,
      },
      {
        title: t('finance.settlements.netSettlement'),
        width: 140,
        align: 'right',
        render: (_, row) =>
          formatFinanceMoney(row.netSettlementAmount ?? row.totalAmount, row.currency),
      },
      {
        title: t('finance.settlements.ledgerNet'),
        width: 140,
        align: 'right',
        render: (_, row) => formatFinanceMoney(row.ledgerSummary.netAmount, row.currency),
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
        render: (_, row) => {
          const batch = batches.data?.items.find((item) => item.id === row.importBatchId)
          return (
            <Space orientation="vertical" size={2}>
              <StatusTag status={statusTone(batch?.status)}>
                {batch?.status || 'IMPORTED'}
              </StatusTag>
              {batch?.recalculationTotal ? (
                <Typography.Text type="secondary">
                  {`${batch.recalculationCompleted}/${batch.recalculationTotal}`}
                </Typography.Text>
              ) : null}
            </Space>
          )
        },
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
          scroll={{ x: 1020 }}
        />
      </SectionCard>

      <Modal
        destroyOnClose
        open={Boolean(selected)}
        title={
          selected
            ? `${t('finance.settlements.settlementId')}: ${selected.settlementId || '—'}`
            : undefined
        }
        width="min(1360px, 92vw)"
        style={{ top: 40 }}
        onCancel={() => setSelected(undefined)}
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
