import { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, Chip } from '@mui/material'

import { OperationsTable, StatusBadge } from '@/components/operations'
import {
  useFinanceImportBatchesQuery,
  useFinanceImportedDataQuery,
} from '@/features/finance-imports/api/financeImports.queries'
import {
  useAdsChannelPerformanceQuery,
  useAdsDailyQuery,
  useAdsSellerAttributionQuery,
} from '@/features/reports/api/reports.queries'
import { getAdsQualityState, summarizeAdsCurrency } from '@/features/reports/utils/adsReport'
import { formatCurrency, formatDate } from '@/utils/format'

import AdsDailyChart from './AdsDailyChart'

const EMPTY_ROWS = []
const money = (amount, currency, language) =>
  formatCurrency(Number(amount || 0) / 100, language, currency || 'USD')
const percent = (bps) =>
  bps === null || bps === undefined ? '-' : `${(Number(bps) / 100).toFixed(2)}%`

function statusTone(status) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PARTIAL_FAILED') return 'warning'
  return 'neutral'
}

export default function AdsReportView({ canReadFinance, filters }) {
  const { t, i18n } = useTranslation()
  const channelQuery = useAdsChannelPerformanceQuery(filters)
  const sellerQuery = useAdsSellerAttributionQuery(filters)
  const dailyQuery = useAdsDailyQuery(filters)
  const batchQuery = useFinanceImportBatchesQuery(
    { ...filters, sourceType: 'ADS', limit: 5 },
    { enabled: canReadFinance },
  )
  const evidenceQuery = useFinanceImportedDataQuery(
    'ADS',
    { ...filters, limit: 8 },
    { enabled: canReadFinance },
  )
  const channelRows = channelQuery.data || EMPTY_ROWS
  const sellerRows = sellerQuery.data || EMPTY_ROWS
  const dailyRows = dailyQuery.data || EMPTY_ROWS
  const evidenceRows = evidenceQuery.data?.items || EMPTY_ROWS
  const currencies = useMemo(
    () => [...new Set(channelRows.map((row) => row.currency || 'USD'))].sort(),
    [channelRows],
  )
  const hasError = channelQuery.isError || sellerQuery.isError || dailyQuery.isError
  const channelColumns = [
    { key: 'scope', label: t('financialReports.ads.table.channel'), width: '210px' },
    { key: 'spendAmount', label: t('financialReports.ads.spend'), width: '135px', align: 'right' },
    {
      key: 'attributedSalesAmount',
      label: t('financialReports.ads.sales'),
      width: '145px',
      align: 'right',
    },
    { key: 'roas', label: 'ROAS', width: '90px', align: 'right' },
    { key: 'clicks', label: t('financialReports.ads.clicks'), width: '90px', align: 'right' },
    {
      key: 'conversionBps',
      label: t('financialReports.ads.conversion'),
      width: '110px',
      align: 'right',
    },
  ]
  const sellerColumns = [
    { key: 'sellerEmployeeCode', label: t('financialReports.table.seller'), width: '170px' },
    { key: 'spendAmount', label: t('financialReports.ads.spend'), width: '135px', align: 'right' },
    {
      key: 'attributedSalesAmount',
      label: t('financialReports.ads.sales'),
      width: '145px',
      align: 'right',
    },
    { key: 'orders', label: t('financialReports.ads.orders'), width: '95px', align: 'right' },
    { key: 'cpaAmount', label: 'CPA', width: '120px', align: 'right' },
    { key: 'quality', label: t('financialReports.ads.quality'), width: '140px' },
  ]
  const evidenceColumns = [
    { key: 'campaignName', label: t('financialReports.ads.table.campaign'), width: '240px' },
    { key: 'scope', label: t('financialReports.ads.table.channel'), width: '190px' },
    { key: 'sellerEmployeeCode', label: t('financialReports.table.seller'), width: '140px' },
    { key: 'spendAmount', label: t('financialReports.ads.spend'), width: '125px', align: 'right' },
    { key: 'status', label: t('financialReports.ads.status'), width: '125px' },
    { key: 'reportDate', label: t('financialReports.table.date'), width: '120px' },
  ]

  function renderPerformanceCell(row, column) {
    if (column.key === 'scope')
      return (
        <Chip
          size="small"
          label={`${row.salesChannelCode || '-'} · ${row.marketplaceCode || '-'}`}
        />
      )
    if (column.key === 'spendAmount' || column.key === 'attributedSalesAmount')
      return money(row[column.key], row.currency, i18n.language)
    if (column.key === 'roas')
      return row.spendAmount ? `${(row.attributedSalesAmount / row.spendAmount).toFixed(2)}x` : '-'
    if (column.key === 'conversionBps') return percent(row.conversionBps)
    return row[column.key] ?? '-'
  }

  function renderSellerCell(row, column) {
    if (
      column.key === 'spendAmount' ||
      column.key === 'attributedSalesAmount' ||
      column.key === 'cpaAmount'
    )
      return money(row[column.key], row.currency, i18n.language)
    if (column.key === 'orders') return row.attributedOrdersCount || 0
    if (column.key === 'quality') {
      const state = getAdsQualityState(row)
      return state ? (
        <StatusBadge tone="warning">{t(`financialReports.ads.qualityStates.${state}`)}</StatusBadge>
      ) : (
        <StatusBadge tone="success">{t('financialReports.ads.qualityStates.READY')}</StatusBadge>
      )
    }
    return row[column.key] ?? '-'
  }

  function renderEvidenceCell(row, column) {
    if (column.key === 'scope')
      return [row.salesChannelCode, row.marketplaceCode].filter(Boolean).join(' · ') || '-'
    if (column.key === 'spendAmount') return money(row.spendAmount, row.currency, i18n.language)
    if (column.key === 'status')
      return (
        <StatusBadge tone={getAdsQualityState(row) ? 'warning' : 'neutral'}>
          {row.status || '-'}
        </StatusBadge>
      )
    if (column.key === 'reportDate') return row.reportDate ? formatDate(row.reportDate) : '-'
    return row[column.key] ?? '-'
  }

  return (
    <div className="grid gap-3">
      {hasError ? <Alert severity="error">{t('financialReports.loadError')}</Alert> : null}
      {currencies.map((currency) => {
        const summary = summarizeAdsCurrency(channelRows, currency)
        return (
          <section key={currency} className="grid gap-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {[
                [
                  t('financialReports.ads.spend'),
                  money(summary.spendAmount, currency, i18n.language),
                ],
                [
                  t('financialReports.ads.sales'),
                  money(summary.attributedSalesAmount, currency, i18n.language),
                ],
                ['ROAS', summary.roas === null ? '-' : `${summary.roas.toFixed(2)}x`],
                [
                  'CPC',
                  summary.cpcAmount === null
                    ? '-'
                    : money(summary.cpcAmount, currency, i18n.language),
                ],
                [t('financialReports.ads.orders'), summary.attributedOrdersCount],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="rounded-lg border border-border bg-surface px-4 py-3 shadow-sm"
                >
                  <div className="text-xs font-medium uppercase text-ink-muted">{label}</div>
                  <div className="mt-1 text-xl font-semibold text-ink-strong">{value}</div>
                  <div className="text-xs text-ink-muted">{currency}</div>
                </div>
              ))}
            </div>
            <AdsDailyChart
              currency={currency}
              labels={{
                title: t('financialReports.ads.trend'),
                spend: t('financialReports.ads.spend'),
                sales: t('financialReports.ads.sales'),
              }}
              language={i18n.language}
              rows={dailyRows.filter((row) => (row.currency || 'USD') === currency)}
            />
          </section>
        )
      })}
      <div className="grid gap-3 xl:grid-cols-2">
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
            {t('financialReports.ads.channelPerformance')}
          </h2>
          <OperationsTable
            columns={channelColumns}
            rows={channelRows}
            getRowKey={(row) => `${row.salesChannelCode}-${row.marketplaceCode}-${row.currency}`}
            renderCell={renderPerformanceCell}
            loading={channelQuery.isLoading}
            emptyTitle={t('financialReports.empty')}
            minWidth="770px"
          />
        </section>
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
            {t('financialReports.ads.sellerAttribution')}
          </h2>
          <OperationsTable
            columns={sellerColumns}
            rows={sellerRows}
            getRowKey={(row) => `${row.sellerEmployeeCode}-${row.currency}`}
            renderCell={renderSellerCell}
            loading={sellerQuery.isLoading}
            emptyTitle={t('financialReports.empty')}
            minWidth="770px"
          />
        </section>
      </div>
      {canReadFinance ? (
        <div className="grid gap-3 xl:grid-cols-[320px_minmax(0,1fr)]">
          <section className="rounded-lg border border-border bg-surface p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-ink-strong">
              {t('financialReports.ads.importHealth')}
            </h2>
            <div className="mt-3 grid gap-2">
              {(batchQuery.data?.items || EMPTY_ROWS).map((batch) => (
                <div
                  key={batch.id}
                  className="flex items-center justify-between gap-2 border-b border-border pb-2 text-sm last:border-0"
                >
                  <div className="min-w-0">
                    <div className="truncate font-medium text-ink-strong">
                      {batch.originalFilename}
                    </div>
                    <div className="text-xs text-ink-muted">
                      {batch.processedRows || 0} {t('financialReports.ads.rows')}
                    </div>
                  </div>
                  <StatusBadge tone={statusTone(batch.status)}>{batch.status}</StatusBadge>
                </div>
              ))}
            </div>
          </section>
          <section>
            <h2 className="mb-2 text-sm font-semibold text-ink-strong">
              {t('financialReports.ads.evidence')}
            </h2>
            <OperationsTable
              columns={evidenceColumns}
              rows={evidenceRows}
              getRowKey={(row) => row.id}
              renderCell={renderEvidenceCell}
              loading={evidenceQuery.isLoading}
              emptyTitle={t('financialReports.empty')}
              minWidth="940px"
            />
          </section>
        </div>
      ) : null}
    </div>
  )
}
