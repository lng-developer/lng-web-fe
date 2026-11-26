import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useRouteLoaderData, useSearchParams } from 'react-router-dom'
import { DollarCircleOutlined, LinkOutlined, WalletOutlined } from '@ant-design/icons'
import { useQuery } from '@tanstack/react-query'
import type { TableColumnsType } from 'antd'
import { Alert, Button, Select, Space, Typography } from 'antd'

import { CoreDataTable } from '@/app/common/CoreDataTable'
import { type CurrentAccount } from '@/features/auth/api/authApi'
import {
  DateRangePicker,
  type DateRangeValue,
  FilterBar,
  FormattedDateTime,
  getDefaultDateRange,
  MetricCard,
  SectionCard,
  StatusTag,
} from '@/shared/ui'

import { listImportBatches, listSettlements, type SettlementSummary } from '../api/financeApi'
import { formatFinanceMoney, settlementBankReceiptStatus } from '../components/financeFormatters'
import { SettlementActivityModal } from '../components/SettlementActivityModal'
import { listShops } from '@/features/portal/shops/api/shopApi'
import styles from './SettlementWorkspacePage.module.scss'

const PAGE_SIZE = 20

function date(value: string | null | undefined) {
  return <FormattedDateTime value={value} />
}

export function SettlementWorkspacePage() {
  const { t } = useTranslation()
  const account = useRouteLoaderData('workspace') as CurrentAccount
  const [searchParams, setSearchParams] = useSearchParams()
  const [page, setPage] = useState(1)
  const [dates, setDates] = useState<DateRangeValue>(getDefaultDateRange)
  const [selected, setSelected] = useState<SettlementSummary>()
  const [reconciliationStatus, setReconciliationStatus] = useState<string>()
  const [hasVariance, setHasVariance] = useState(false)
  const [unlinkedOnly, setUnlinkedOnly] = useState(false)
  const [shopId, setShopId] = useState<string>()
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
  const shops = useQuery({
    queryKey: ['shops', 'finance-settlements'],
    queryFn: () => listShops({ page: 1, limit: 100, status: 'ACTIVE' }),
  })
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
    [t],
  )

  return (
    <section className={styles.page}>
      <Alert
        type="info"
        showIcon
        closable
        message={<Typography.Text strong>{t('finance.banners.settlementsTitle')}</Typography.Text>}
        description={t('finance.banners.settlementsDesc')}
      />

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
              label: settlementBankReceiptStatus(t, value),
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

      {selectedId ? (
        <SettlementActivityModal
          key={selectedId}
          account={account}
          recordId={selectedId}
          settlementNumber={selected?.settlementId}
          importBatches={batches.data?.items}
          unlinkedOnly={unlinkedOnly}
          onClose={() => {
            setSelected(undefined)
            setSearchParams({})
          }}
        />
      ) : null}
    </section>
  )
}
