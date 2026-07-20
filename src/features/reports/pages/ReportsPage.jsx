import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Chip, FormControl, MenuItem, Select, TextField } from '@mui/material'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
} from '@/components/operations'
import {
  useFinanceBySellerQuery,
  useFinanceByTeamQuery,
  useFinanceDailyProfitQuery,
} from '@/features/reports/api/reports.queries'
import ChannelProfitChart from '@/features/reports/components/ChannelProfitChart'
import DailyProfitChart from '@/features/reports/components/DailyProfitChart'
import { formatCurrency } from '@/utils/format'

const EMPTY_ROWS = []

function getChannel(search) {
  const channel = new URLSearchParams(search).get('channel')
  return channel ? channel.toUpperCase() : ''
}

function compactQuery(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== '' && item !== undefined),
  )
}

function formatMoney(amount, currency, language) {
  return formatCurrency(Number(amount || 0) / 100, language, currency || 'USD')
}

function currencyTotals(rows, includeAds) {
  return rows.reduce((result, row) => {
    const currency = row.currency || 'USD'
    const current = result[currency] || {
      revenue: 0,
      grossProfit: 0,
      adSpend: 0,
      netProfit: 0,
      missingCost: 0,
    }
    current.revenue += Number(row.revenueAmount || 0)
    current.grossProfit += Number(row.grossProfitAmount || 0)
    current.adSpend += includeAds ? Number(row.adSpendAmount || 0) : 0
    current.netProfit += includeAds
      ? Number(row.netProfitAmount || 0)
      : Number(row.grossProfitAmount || 0)
    current.missingCost += Number(row.missingCostCount || 0)
    result[currency] = current
    return result
  }, {})
}

function groupByCurrency(rows) {
  return rows.reduce((result, row) => {
    const currency = row.currency || 'USD'
    result[currency] = [...(result[currency] || []), row]
    return result
  }, {})
}

export default function ReportsPage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [view, setView] = useState('daily')
  const [filters, setFilters] = useState(() => ({
    salesChannelCode: getChannel(location.search),
    shopId: '',
    marketplaceCode: '',
    dateFrom: '',
    dateTo: '',
  }))
  const query = compactQuery(filters)
  const dailyQuery = useFinanceDailyProfitQuery(query, { enabled: view === 'daily' })
  const sellerQuery = useFinanceBySellerQuery(query, { enabled: view === 'seller' })
  const teamQuery = useFinanceByTeamQuery(query, { enabled: view === 'team' })
  const activeQuery = view === 'daily' ? dailyQuery : view === 'seller' ? sellerQuery : teamQuery
  const rows = activeQuery.data || EMPTY_ROWS
  const includeAds = view === 'daily'
  const totals = useMemo(() => currencyTotals(rows, includeAds), [includeAds, rows])
  const dailyChartGroups = useMemo(() => groupByCurrency(rows), [rows])
  const tabs = [
    { value: 'daily', label: t('financialReports.tabs.daily') },
    { value: 'seller', label: t('financialReports.tabs.seller') },
    { value: 'team', label: t('financialReports.tabs.team') },
  ]
  const columns = useMemo(() => {
    const moneyColumn = (key, label) => ({ key, label: t(label), width: '150px', align: 'right' })
    if (view === 'daily')
      return [
        { key: 'date', label: t('financialReports.table.date'), width: '125px' },
        { key: 'channel', label: t('financialReports.table.channel'), width: '140px' },
        moneyColumn('revenueAmount', 'financialReports.table.revenue'),
        moneyColumn('baseCostAmount', 'financialReports.table.baseCost'),
        moneyColumn('grossProfitAmount', 'financialReports.table.grossProfit'),
        moneyColumn('adSpendAmount', 'financialReports.table.adSpend'),
        moneyColumn('netProfitAmount', 'financialReports.table.netProfit'),
        {
          key: 'netMarginBps',
          label: t('financialReports.table.netMargin'),
          width: '110px',
          align: 'right',
        },
        {
          key: 'missingCostCount',
          label: t('financialReports.table.missingCost'),
          width: '120px',
          align: 'center',
        },
      ]
    return [
      {
        key: 'dimension',
        label: t(
          view === 'seller' ? 'financialReports.table.seller' : 'financialReports.table.team',
        ),
        width: '240px',
      },
      {
        key: 'itemCount',
        label: t('financialReports.table.items'),
        width: '100px',
        align: 'right',
      },
      moneyColumn('revenueAmount', 'financialReports.table.revenue'),
      moneyColumn('baseCostAmount', 'financialReports.table.baseCost'),
      moneyColumn('grossProfitAmount', 'financialReports.table.grossProfit'),
      {
        key: 'grossMarginBps',
        label: t('financialReports.table.grossMargin'),
        width: '120px',
        align: 'right',
      },
      {
        key: 'missingCostCount',
        label: t('financialReports.table.missingCost'),
        width: '120px',
        align: 'center',
      },
    ]
  }, [t, view])

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
  }

  function renderCell(row, column) {
    const moneyColumns = [
      'revenueAmount',
      'baseCostAmount',
      'grossProfitAmount',
      'adSpendAmount',
      'netProfitAmount',
    ]
    if (moneyColumns.includes(column.key))
      return formatMoney(row[column.key], row.currency, i18n.language)
    if (column.key === 'date') return row.date || '-'
    if (column.key === 'channel')
      return (
        <Chip
          size="small"
          label={`${row.salesChannelCode || '-'} · ${row.marketplaceCode || '-'}`}
        />
      )
    if (column.key === 'dimension')
      return view === 'seller'
        ? row.sellerName || row.sellerEmployeeCode || '-'
        : row.teamName || row.departmentName || row.teamCode || '-'
    if (column.key === 'grossMarginBps' || column.key === 'netMarginBps')
      return row[column.key] === null ? '-' : `${(Number(row[column.key] || 0) / 100).toFixed(2)}%`
    if (column.key === 'missingCostCount')
      return row.missingCostCount ? (
        <span className="font-medium text-warning">{row.missingCostCount}</span>
      ) : (
        '0'
      )
    return row[column.key] ?? '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('financialReports.title')}
          subtitle={t('financialReports.subtitle')}
          actions={
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => activeQuery.refetch()}
              disabled={activeQuery.isFetching}
            >
              {t('financialReports.refresh')}
            </Button>
          }
        />
      }
      tabs={<OperationsTabs items={tabs} value={view} onChange={setView} variant="underline" />}
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-5">
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.salesChannelCode}
                onChange={(event) => updateFilter('salesChannelCode', event.target.value)}
              >
                <MenuItem value="">{t('financialReports.filters.allChannels')}</MenuItem>
                <MenuItem value="AMAZON">Amazon</MenuItem>
                <MenuItem value="ETSY">Etsy</MenuItem>
              </Select>
            </FormControl>
            <TextField
              size="small"
              label={t('financialReports.filters.shopId')}
              value={filters.shopId}
              onChange={(event) => updateFilter('shopId', event.target.value)}
            />
            <TextField
              size="small"
              label={t('financialReports.filters.marketplace')}
              value={filters.marketplaceCode}
              onChange={(event) => updateFilter('marketplaceCode', event.target.value)}
            />
            <TextField
              size="small"
              type="date"
              label={t('financialReports.filters.dateFrom')}
              value={filters.dateFrom}
              onChange={(event) => updateFilter('dateFrom', event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              type="date"
              label={t('financialReports.filters.dateTo')}
              value={filters.dateTo}
              onChange={(event) => updateFilter('dateTo', event.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
          </div>
          <div className="grid grid-cols-1 gap-2 xl:grid-cols-3">
            {Object.entries(totals).map(([currency, total]) => (
              <div key={currency} className="border border-border bg-surface px-3 py-2">
                <div className="text-xs font-medium uppercase text-ink-muted">{currency}</div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-strong">
                  <span>
                    {t('financialReports.revenue')}:{' '}
                    <strong>{formatMoney(total.revenue, currency, i18n.language)}</strong>
                  </span>
                  <span>
                    {t('financialReports.grossProfit')}:{' '}
                    <strong>{formatMoney(total.grossProfit, currency, i18n.language)}</strong>
                  </span>
                  {includeAds ? (
                    <span>
                      {t('financialReports.netProfit')}:{' '}
                      <strong>{formatMoney(total.netProfit, currency, i18n.language)}</strong>
                    </span>
                  ) : null}
                  {total.missingCost ? (
                    <span className="text-warning">
                      {t('financialReports.missingCost', { count: total.missingCost })}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        </OperationsToolbar>
      }
    >
      <div className="h-full overflow-auto">
        {activeQuery.isError ? (
          <Alert severity="error" className="mb-3">
            {t('financialReports.loadError')}
          </Alert>
        ) : null}
        {view === 'daily' && rows.length ? (
          <div className="mb-3 grid gap-3">
            {Object.entries(dailyChartGroups).map(([currency, currencyRows]) => (
              <div key={currency} className="grid gap-3">
                <DailyProfitChart
                  currency={currency}
                  labels={{
                    title: t('financialReports.chart.title'),
                    revenue: t('financialReports.revenue'),
                    grossProfit: t('financialReports.grossProfit'),
                    netProfit: t('financialReports.netProfit'),
                    netMargin: t('financialReports.table.netMargin'),
                  }}
                  language={i18n.language}
                  rows={currencyRows}
                />
                <ChannelProfitChart
                  currency={currency}
                  labels={{ title: t('financialReports.chart.channelTitle') }}
                  language={i18n.language}
                  rows={currencyRows}
                />
              </div>
            ))}
          </div>
        ) : null}
        <OperationsTable
          columns={columns}
          rows={rows}
          getRowKey={(row) =>
            [row.date, row.shopId, row.sellerEmployeeCode, row.teamId, row.currency]
              .filter(Boolean)
              .join('-')
          }
          renderCell={renderCell}
          loading={activeQuery.isLoading}
          emptyTitle={t('financialReports.empty')}
          minWidth="1120px"
        />
      </div>
    </OperationsPageShell>
  )
}
