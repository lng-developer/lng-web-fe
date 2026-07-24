import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Autocomplete,
  Button,
  Chip,
  FormControl,
  MenuItem,
  Select,
  TextField,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'

import DateRangePicker from '@/components/form/DateRangePicker'
import {
  OperationsHeader,
  OperationsPageShell,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
} from '@/components/operations'
import { hasAllPermissions } from '@/features/auth/utils/authz'
import {
  useAdsChannelPerformanceQuery,
  useFinanceBySellerQuery,
  useFinanceByTeamQuery,
  useFinanceDailyProfitQuery,
} from '@/features/reports/api/reports.queries'
import AdsReportView from '@/features/reports/components/AdsReportView'
import ChannelProfitChart from '@/features/reports/components/ChannelProfitChart'
import DailyProfitChart from '@/features/reports/components/DailyProfitChart'
import DimensionProfitChart from '@/features/reports/components/DimensionProfitChart'
import FinancialMetricCards from '@/features/reports/components/FinancialMetricCards'
import { getAdsFilterOptions } from '@/features/reports/utils/adsReport'
import { fromReportDateRange, toReportDateRange } from '@/features/reports/utils/reportDateRange'
import { useShopDetailQuery, useShopsQuery } from '@/features/shops/api/shops.queries'
import { useDebounce } from '@/hooks/useDebounce'
import { useAuthStore } from '@/store/useAuthStore'
import { formatCurrency } from '@/utils/format'

const EMPTY_ROWS = []

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
      baseCost: 0,
      grossProfit: 0,
      adSpend: 0,
      netProfit: 0,
      missingCost: 0,
    }
    current.revenue += Number(row.revenueAmount || 0)
    current.baseCost += Number(row.baseCostAmount || 0)
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

function reportMetrics(total, rows, view, currency, language, t) {
  const money = (amount) => formatMoney(amount, currency, language)
  if (view === 'daily') {
    return [
      [t('financialReports.revenue'), money(total.revenue)],
      [t('financialReports.table.baseCost'), money(total.baseCost)],
      [t('financialReports.grossProfit'), money(total.grossProfit)],
      [t('financialReports.table.adSpend'), money(total.adSpend)],
      [t('financialReports.netProfit'), money(total.netProfit)],
    ]
  }
  return [
    [t('financialReports.revenue'), money(total.revenue)],
    [t('financialReports.table.baseCost'), money(total.baseCost)],
    [t('financialReports.grossProfit'), money(total.grossProfit)],
    [
      t('financialReports.table.grossMargin'),
      total.revenue ? `${((total.grossProfit / total.revenue) * 100).toFixed(2)}%` : '-',
    ],
    [
      t('financialReports.table.items'),
      rows.reduce((sum, row) => sum + Number(row.itemCount || 0), 0),
    ],
  ]
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
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.currentUser)
  const canReadFinance = hasAllPermissions(currentUser, ['FINANCE:READ'])
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedView = searchParams.get('report')
  const [view, setView] = useState(
    ['daily', 'seller', 'team', 'ads'].includes(requestedView) ? requestedView : 'daily',
  )
  const [filters, setFilters] = useState(() => ({
    salesChannelCode: (searchParams.get('channel') || '').toUpperCase(),
    shopId: searchParams.get('shopId') || '',
    marketplaceCode: (searchParams.get('marketplace') || '').toUpperCase(),
    sellerEmployeeCode: (searchParams.get('seller') || '').toUpperCase(),
    teamId: searchParams.get('teamId') || '',
    dateFrom: searchParams.get('dateFrom') || '',
    dateTo: searchParams.get('dateTo') || '',
  }))
  const [shopSearch, setShopSearch] = useState('')
  const debouncedShopSearch = useDebounce(shopSearch)
  const query = compactQuery(filters)
  const dailyQuery = useFinanceDailyProfitQuery(query, { enabled: view === 'daily' })
  const sellerQuery = useFinanceBySellerQuery(query, { enabled: view === 'seller' })
  const teamQuery = useFinanceByTeamQuery(query, { enabled: view === 'team' })
  const optionQuery = useAdsChannelPerformanceQuery(
    compactQuery({ shopId: filters.shopId, dateFrom: filters.dateFrom, dateTo: filters.dateTo }),
  )
  const shopsQuery = useShopsQuery({ search: debouncedShopSearch, status: 'ACTIVE', limit: 20 })
  const selectedShopQuery = useShopDetailQuery(filters.shopId)
  const filterOptions = useMemo(
    () => getAdsFilterOptions(optionQuery.data || EMPTY_ROWS, filters.salesChannelCode),
    [filters.salesChannelCode, optionQuery.data],
  )
  const shopOptions = shopsQuery.data?.items || EMPTY_ROWS
  const selectedShop =
    shopOptions.find((shop) => shop.id === filters.shopId) || selectedShopQuery.data || null
  const activeQuery =
    view === 'daily'
      ? dailyQuery
      : view === 'seller'
        ? sellerQuery
        : view === 'team'
          ? teamQuery
          : optionQuery
  const rows = activeQuery.data || EMPTY_ROWS
  const currencyGroups = useMemo(() => groupByCurrency(rows), [rows])
  const sellerOptions = useMemo(
    () => [
      ...new Map(
        rows.filter((row) => row.sellerEmployeeCode).map((row) => [row.sellerEmployeeCode, row]),
      ).values(),
    ],
    [rows],
  )
  const teamOptions = useMemo(
    () => [...new Map(rows.filter((row) => row.teamId).map((row) => [row.teamId, row])).values()],
    [rows],
  )
  const tabs = [
    { value: 'daily', label: t('financialReports.tabs.daily') },
    { value: 'seller', label: t('financialReports.tabs.seller') },
    { value: 'team', label: t('financialReports.tabs.team') },
    { value: 'ads', label: t('financialReports.tabs.ads') },
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
    const next = {
      ...filters,
      [key]: value,
      ...(key === 'salesChannelCode' ? { marketplaceCode: '' } : {}),
    }
    setFilters(next)
    setSearchParams(
      compactQuery({
        report: view,
        channel: next.salesChannelCode.toLowerCase(),
        shopId: next.shopId,
        marketplace: next.marketplaceCode.toLowerCase(),
        seller: next.sellerEmployeeCode.toLowerCase(),
        teamId: next.teamId,
        dateFrom: next.dateFrom,
        dateTo: next.dateTo,
      }),
    )
  }

  function updateView(nextView) {
    setView(nextView)
    setSearchParams(
      compactQuery({
        report: nextView,
        channel: filters.salesChannelCode.toLowerCase(),
        shopId: filters.shopId,
        marketplace: filters.marketplaceCode.toLowerCase(),
        seller: filters.sellerEmployeeCode.toLowerCase(),
        teamId: filters.teamId,
        dateFrom: filters.dateFrom,
        dateTo: filters.dateTo,
      }),
    )
  }

  function updateDateRange(range) {
    const next = { ...filters, ...fromReportDateRange(range) }
    setFilters(next)
    setSearchParams(
      compactQuery({
        report: view,
        channel: next.salesChannelCode.toLowerCase(),
        shopId: next.shopId,
        marketplace: next.marketplaceCode.toLowerCase(),
        seller: next.sellerEmployeeCode.toLowerCase(),
        teamId: next.teamId,
        dateFrom: next.dateFrom,
        dateTo: next.dateTo,
      }),
    )
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ['reports'] })
    if (view === 'ads' && canReadFinance)
      queryClient.invalidateQueries({ queryKey: ['finance-imports'] })
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
      className="-mx-4 md:-mx-6"
      header={
        <OperationsHeader
          title={t('financialReports.title')}
          subtitle={t('financialReports.subtitle')}
          actions={
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={refresh}
              disabled={activeQuery.isFetching}
            >
              {t('financialReports.refresh')}
            </Button>
          }
        />
      }
      tabs={<OperationsTabs items={tabs} value={view} onChange={updateView} variant="underline" />}
      toolbar={
        <OperationsToolbar>
          <div
            className={`grid grid-cols-1 gap-2 md:grid-cols-2 ${view === 'daily' ? 'xl:grid-cols-4' : 'xl:grid-cols-5'}`}
          >
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.salesChannelCode}
                onChange={(event) => updateFilter('salesChannelCode', event.target.value)}
              >
                <MenuItem value="">{t('financialReports.filters.allChannels')}</MenuItem>
                {[
                  ...new Set([filters.salesChannelCode, ...filterOptions.channels].filter(Boolean)),
                ].map((channel) => (
                  <MenuItem key={channel} value={channel}>
                    {channel}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Autocomplete
              size="small"
              options={shopOptions}
              value={selectedShop}
              getOptionLabel={(shop) => shop.name || ''}
              isOptionEqualToValue={(option, value) => option.id === value.id}
              onInputChange={(_, value, reason) => reason !== 'reset' && setShopSearch(value)}
              onChange={(_, shop) => {
                updateFilter('shopId', shop?.id || '')
                setShopSearch(shop?.name || '')
              }}
              renderInput={(params) => (
                <TextField {...params} label={t('financialReports.filters.shop')} />
              )}
            />
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.marketplaceCode}
                onChange={(event) => updateFilter('marketplaceCode', event.target.value)}
              >
                <MenuItem value="">{t('financialReports.filters.allMarketplaces')}</MenuItem>
                {[
                  ...new Set(
                    [filters.marketplaceCode, ...filterOptions.marketplaces].filter(Boolean),
                  ),
                ].map((marketplace) => (
                  <MenuItem key={marketplace} value={marketplace}>
                    {marketplace}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <DateRangePicker
              fullWidth
              value={toReportDateRange(filters)}
              onChange={updateDateRange}
              onClear={updateDateRange}
            />
            {view === 'seller' ? (
              <FormControl size="small">
                <Select
                  displayEmpty
                  value={filters.sellerEmployeeCode}
                  onChange={(event) => updateFilter('sellerEmployeeCode', event.target.value)}
                >
                  <MenuItem value="">All sellers</MenuItem>
                  {sellerOptions.map((seller) => (
                    <MenuItem key={seller.sellerEmployeeCode} value={seller.sellerEmployeeCode}>
                      {seller.sellerName || seller.sellerEmployeeCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
            {view === 'team' ? (
              <FormControl size="small">
                <Select
                  displayEmpty
                  value={filters.teamId}
                  onChange={(event) => updateFilter('teamId', event.target.value)}
                >
                  <MenuItem value="">All teams</MenuItem>
                  {teamOptions.map((team) => (
                    <MenuItem key={team.teamId} value={team.teamId}>
                      {team.teamName || team.teamCode}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            ) : null}
          </div>
        </OperationsToolbar>
      }
    >
      <div className="h-full -mr-4 overflow-auto pr-4">
        {view !== 'ads' && activeQuery.isError ? (
          <Alert severity="error" className="mb-3">
            {t('financialReports.loadError')}
          </Alert>
        ) : null}
        {view !== 'ads'
          ? Object.entries(currencyGroups).map(([currency, currencyRows]) => {
              const total = currencyTotals(currencyRows, view === 'daily')[currency]
              const dimensionTitle =
                view === 'seller' ? 'Gross profit by seller' : 'Gross profit by team'
              return (
                <section key={currency} className="mb-3 grid gap-3">
                  <FinancialMetricCards
                    currency={currency}
                    metrics={reportMetrics(total, currencyRows, view, currency, i18n.language, t)}
                  />
                  {view === 'daily' ? (
                    <div className="grid gap-3">
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
                  ) : (
                    <DimensionProfitChart
                      currency={currency}
                      language={i18n.language}
                      rows={currencyRows}
                      title={dimensionTitle}
                    />
                  )}
                </section>
              )
            })
          : null}
        {view === 'ads' ? (
          <AdsReportView canReadFinance={canReadFinance} filters={query} />
        ) : (
          <section className="rounded-lg border border-border bg-surface shadow-sm">
            <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
              {view === 'daily'
                ? 'Daily profit records'
                : view === 'seller'
                  ? 'Seller performance'
                  : 'Team performance'}
            </h2>
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
          </section>
        )}
      </div>
    </OperationsPageShell>
  )
}
