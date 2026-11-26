import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Input, Progress, Table, Typography } from 'antd'

import type { CurrentAccount } from '@/features/auth/api/authApi'
import { canUseScopedPermission } from '@/shared/auth/permissions'
import {
  CopyableOrderId,
  CopyableSku,
  DetailDrawer,
  FormattedDateTime,
  TableTextCell,
} from '@/shared/ui'

import {
  getSettlement,
  reconcileSettlement,
  type ImportBatch,
  type SettlementLedgerLine,
} from '../api/financeApi'
import { formatFinanceMoney, settlementBankReceiptStatus } from './financeFormatters'
import styles from './SettlementActivityModal.module.scss'

const PAGE_SIZE = 20

interface SettlementActivityModalProps {
  readonly account: CurrentAccount
  readonly recordId: string
  readonly settlementNumber?: string | null
  readonly importBatches?: readonly ImportBatch[]
  readonly unlinkedOnly?: boolean
  readonly onClose: () => void
}

export function SettlementActivityModal({
  account,
  recordId,
  settlementNumber,
  importBatches,
  unlinkedOnly = false,
  onClose,
}: SettlementActivityModalProps) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const [open, setOpen] = useState(true)
  const [ledgerPage, setLedgerPage] = useState(1)
  const [reviewNote, setReviewNote] = useState('')
  const detail = useQuery({
    queryKey: ['finance', 'settlements', recordId, 'detail', ledgerPage, unlinkedOnly],
    queryFn: () =>
      getSettlement(recordId, {
        page: ledgerPage,
        limit: PAGE_SIZE,
        linkState: unlinkedOnly ? 'UNLINKED' : 'ALL',
      }),
    placeholderData: keepPreviousData,
    retry: false,
  })
  const reconcile = useMutation({
    mutationFn: (input: { status: 'RECONCILED' | 'NEEDS_REVIEW'; note?: string }) =>
      reconcileSettlement(recordId, input),
    onSuccess: () => client.invalidateQueries({ queryKey: ['finance', 'settlements'] }),
  })
  const settlement = detail.data?.settlement
  const ledger = detail.data?.ledger
  const selectedBatch = importBatches?.find((batch) => batch.id === settlement?.importBatchId)
  const canWrite = canUseScopedPermission(account, 'FINANCE:WRITE', {
    scopeType: 'shop',
    scopeId: settlement?.shopId,
  })
  const hasMismatch = Boolean(
    settlement?.ledgerSummary.cashVarianceAmount || ledger?.summary.unlinkedCount,
  )
  const number = settlement?.settlementId ?? settlementNumber

  const ledgerColumns = useMemo<TableColumnsType<SettlementLedgerLine>>(
    () => [
      {
        title: t('finance.settlements.posted'),
        dataIndex: 'postedAt',
        width: 150,
        render: (value) => <FormattedDateTime value={value} />,
      },
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
    <DetailDrawer
      open={open}
      title={
        number
          ? t('finance.settlements.settlementId') + ': ' + number
          : t('finance.settlements.settlement')
      }
      width="min(1360px, 92vw)"
      allowModeToggle={false}
      allowMaximize={false}
      loading={detail.isLoading}
      styles={{ body: { overscrollBehavior: 'contain' } }}
      onClose={() => setOpen(false)}
      afterOpenChange={(visible) => {
        if (!visible) onClose()
      }}
    >
      {detail.isError ? (
        <Alert
          type="error"
          showIcon
          title={t('finance.settlements.detailLoadFailed')}
          action={
            <Button size="small" onClick={() => void detail.refetch()}>
              {t('common.retry')}
            </Button>
          }
        />
      ) : null}
      {settlement && ledger ? (
        <div className={styles.detailContent}>
          <dl className={styles.detailSummary}>
            <div className={styles.detailPeriod}>
              <dt>{t('finance.settlements.period')}</dt>
              <dd className={styles.periodRange}>
                <FormattedDateTime value={settlement.periodStartAt} showRelative={false} />
                <span>–</span>
                <FormattedDateTime value={settlement.periodEndAt} showRelative={false} />
              </dd>
            </div>
            <div>
              <dt>{t('finance.settlements.netSettlement')}</dt>
              <dd>
                {formatFinanceMoney(
                  settlement.netSettlementAmount ?? settlement.totalAmount,
                  settlement.currency,
                )}
              </dd>
            </div>
            <div>
              <dt>{t('finance.settlements.inflow')}</dt>
              <dd>{formatFinanceMoney(ledger.summary.inflowAmount, settlement.currency)}</dd>
            </div>
            <div>
              <dt>{t('finance.settlements.outflow')}</dt>
              <dd>{formatFinanceMoney(ledger.summary.outflowAmount, settlement.currency)}</dd>
            </div>
            <div>
              <dt>{t('finance.settlements.linked')}</dt>
              <dd>
                {ledger.summary.linkedCount}/{ledger.summary.lineCount}
              </dd>
            </div>
          </dl>
          <Alert
            className={styles.reconciliationAlert}
            type={hasMismatch ? 'warning' : 'success'}
            showIcon
            title={t('finance.settlements.reconciliationSummary', {
              variance: formatFinanceMoney(
                settlement.ledgerSummary.cashVarianceAmount,
                settlement.currency,
              ),
              unlinked: ledger.summary.unlinkedCount,
            })}
            description={
              settlement.reconciliation?.note ||
              settlementBankReceiptStatus(t, settlement.reconciliation?.status)
            }
          />
          {canWrite ? (
            <div className={styles.reconciliationActions}>
              <Button
                disabled={hasMismatch}
                loading={reconcile.isPending}
                onClick={() => reconcile.mutate({ status: 'RECONCILED' })}
              >
                {t('finance.settlements.markReconciled')}
              </Button>
              <div className={styles.reviewActions}>
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
                      status: 'NEEDS_REVIEW',
                      note: reviewNote.trim(),
                    })
                  }
                >
                  {t('finance.settlements.needsReview')}
                </Button>
              </div>
            </div>
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
          <div className={styles.ledgerSection}>
            <Typography.Title level={5} className={styles.ledgerTitle}>
              {t('finance.settlements.ledgerMovement')}
            </Typography.Title>
            <Table
              rowKey="id"
              size="small"
              columns={ledgerColumns}
              dataSource={ledger.items}
              loading={detail.isFetching}
              pagination={{
                current: ledgerPage,
                pageSize: PAGE_SIZE,
                total: ledger.pagination.total,
                hideOnSinglePage: true,
                onChange: setLedgerPage,
              }}
              scroll={{ x: 900 }}
            />
          </div>
        </div>
      ) : null}
    </DetailDrawer>
  )
}
