import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
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

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { useFinanceSnapshotsQuery } from '@/features/finance/api/finance.queries'
import FinanceRevenueProfitChart from '@/features/finance/components/FinanceRevenueProfitChart'
import { useShopDetailQuery, useShopsQuery } from '@/features/shops/api/shops.queries'
import { useDebounce } from '@/hooks/useDebounce'
import { formatCurrency } from '@/utils/format'

const pageSize = 20
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

function statusTone(value) {
  if (value === 'PRESENT' || value === 'ESTIMATED') return 'success'
  if (value === 'MISSING' || value === 'MISSING_COST') return 'warning'
  return 'neutral'
}

function visibleTotals(rows) {
  return rows.reduce((result, row) => {
    const currency = row?.revenue?.currency || row?.currency || 'USD'
    const current = result[currency] || {
      revenue: 0,
      fees: 0,
      baseCost: 0,
      profit: 0,
      missingCost: 0,
    }
    current.revenue += Number(row?.revenue?.customerPaidAmount || 0)
    current.fees += Number(row?.revenue?.feeAmount || 0)
    current.baseCost += Number(row?.cost?.baseCostAmount || 0)
    current.profit += Number(row?.margin?.grossProfitAmount || 0)
    current.missingCost += row?.snapshotStatus === 'MISSING_COST' ? 1 : 0
    result[currency] = current
    return result
  }, {})
}

export default function FinancePage() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState(() => ({
    salesChannelCode: getChannel(location.search),
    marketplaceCode: '',
    search: '',
    shopId: '',
    snapshotStatus: '',
    costStatus: '',
  }))
  const [shopSearch, setShopSearch] = useState('')
  const debouncedShopSearch = useDebounce(shopSearch)
  const { search, ...filterQuery } = filters
  const query = compactQuery({ ...filterQuery, externalOrderId: search, page, limit: pageSize })
  const snapshotsQuery = useFinanceSnapshotsQuery(query)
  const rows = snapshotsQuery.data?.items || EMPTY_ROWS
  const shopsQuery = useShopsQuery({ search: debouncedShopSearch, status: 'ACTIVE', limit: 20 })
  const selectedShopQuery = useShopDetailQuery(filters.shopId)
  const pagination = {
    page: snapshotsQuery.data?.page || page,
    limit: snapshotsQuery.data?.limit || pageSize,
    total: snapshotsQuery.data?.total || 0,
  }
  const totals = useMemo(() => visibleTotals(rows), [rows])
  const marketplaceOptions = useMemo(
    () => [
      ...new Set(
        [filters.marketplaceCode, ...rows.map((row) => row.marketplaceCode)].filter(Boolean),
      ),
    ],
    [filters.marketplaceCode, rows],
  )
  const shopOptions = shopsQuery.data?.items || EMPTY_ROWS
  const selectedShop =
    shopOptions.find((shop) => shop.id === filters.shopId) || selectedShopQuery.data || null
  const columns = useMemo(
    () => [
      { key: 'externalOrderId', label: t('financeProfit.table.externalOrder'), width: '190px' },
      { key: 'channel', label: t('financeProfit.table.channel'), width: '115px' },
      { key: 'revenue', label: t('financeProfit.table.revenue'), width: '145px', align: 'right' },
      { key: 'fees', label: t('financeProfit.table.fees'), width: '130px', align: 'right' },
      { key: 'baseCost', label: t('financeProfit.table.baseCost'), width: '145px', align: 'right' },
      {
        key: 'profit',
        label: t('financeProfit.table.grossProfit'),
        width: '155px',
        align: 'right',
      },
      { key: 'margin', label: t('financeProfit.table.margin'), width: '105px', align: 'right' },
      {
        key: 'costStatus',
        label: t('financeProfit.table.costStatus'),
        width: '125px',
        align: 'center',
      },
    ],
    [t],
  )

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function renderCell(row, column) {
    const currency = row?.revenue?.currency || row?.currency || 'USD'
    if (column.key === 'externalOrderId')
      return <span className="font-medium text-ink-strong">{row.externalOrderId}</span>
    if (column.key === 'channel') return <Chip size="small" label={row.salesChannelCode || '-'} />
    if (column.key === 'revenue')
      return formatMoney(row?.revenue?.customerPaidAmount, currency, i18n.language)
    if (column.key === 'fees') return formatMoney(row?.revenue?.feeAmount, currency, i18n.language)
    if (column.key === 'baseCost')
      return formatMoney(row?.cost?.baseCostAmount, currency, i18n.language)
    if (column.key === 'profit')
      return row?.margin?.grossProfitAmount === null
        ? '-'
        : formatMoney(row?.margin?.grossProfitAmount, currency, i18n.language)
    if (column.key === 'margin')
      return row?.margin?.grossMarginBps === null
        ? '-'
        : `${(Number(row?.margin?.grossMarginBps || 0) / 100).toFixed(2)}%`
    if (column.key === 'costStatus') {
      return (
        <StatusBadge tone={statusTone(row.costStatus)}>
          {row.costStatus || row.snapshotStatus}
        </StatusBadge>
      )
    }
    return '-'
  }

  return (
    <OperationsPageShell
      className="-mx-4 md:-mx-6"
      header={
        <OperationsHeader
          title={t('financeProfit.title')}
          subtitle={t('financeProfit.subtitle')}
          actions={
            <Button
              size="small"
              startIcon={<RefreshIcon />}
              onClick={() => snapshotsQuery.refetch()}
              disabled={snapshotsQuery.isFetching}
            >
              {t('financeProfit.refresh')}
            </Button>
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
            <TextField
              size="small"
              placeholder="Search external order ID"
              value={filters.search}
              onChange={(event) => updateFilter('search', event.target.value)}
            />
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.salesChannelCode}
                onChange={(event) => updateFilter('salesChannelCode', event.target.value)}
              >
                <MenuItem value="">{t('financeProfit.filters.allChannels')}</MenuItem>
                <MenuItem value="AMAZON">Amazon</MenuItem>
                <MenuItem value="ETSY">Etsy</MenuItem>
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
              renderInput={(params) => <TextField {...params} label="Search shop" />}
            />
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.marketplaceCode}
                onChange={(event) => updateFilter('marketplaceCode', event.target.value)}
              >
                <MenuItem value="">All marketplaces</MenuItem>
                {marketplaceOptions.map((marketplace) => (
                  <MenuItem key={marketplace} value={marketplace}>
                    {marketplace}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.snapshotStatus}
                onChange={(event) => updateFilter('snapshotStatus', event.target.value)}
              >
                <MenuItem value="">{t('financeProfit.filters.allSnapshots')}</MenuItem>
                <MenuItem value="ESTIMATED">ESTIMATED</MenuItem>
                <MenuItem value="MISSING_COST">MISSING_COST</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                displayEmpty
                value={filters.costStatus}
                onChange={(event) => updateFilter('costStatus', event.target.value)}
              >
                <MenuItem value="">{t('financeProfit.filters.allCosts')}</MenuItem>
                <MenuItem value="PRESENT">PRESENT</MenuItem>
                <MenuItem value="MISSING">MISSING</MenuItem>
              </Select>
            </FormControl>
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={setPage}
        />
      }
    >
      <div className="h-full -mr-4 overflow-auto pr-4">
        {snapshotsQuery.isError ? (
          <Alert severity="error" className="mb-3">
            {t('financeProfit.loadError')}
          </Alert>
        ) : null}
        {Object.entries(totals).map(([currency, total]) => (
          <section key={currency} className="mb-3 grid gap-3">
            <div className="grid grid-cols-2 gap-2 lg:grid-cols-5">
              {[
                [t('financeProfit.revenue'), formatMoney(total.revenue, currency, i18n.language)],
                [t('financeProfit.table.fees'), formatMoney(total.fees, currency, i18n.language)],
                [
                  t('financeProfit.table.baseCost'),
                  formatMoney(total.baseCost, currency, i18n.language),
                ],
                [
                  t('financeProfit.grossProfit'),
                  formatMoney(total.profit, currency, i18n.language),
                ],
                [t('financeProfit.missingCost', { count: total.missingCost }), total.missingCost],
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
            <FinanceRevenueProfitChart
              currency={currency}
              grossProfit={total.profit}
              language={i18n.language}
              revenue={total.revenue}
            />
          </section>
        ))}
        <section className="rounded-lg border border-border bg-surface shadow-sm">
          <h2 className="border-b border-border px-4 py-3 text-sm font-semibold text-ink-strong">
            Finance snapshots
          </h2>
          <OperationsTable
            columns={columns}
            rows={rows}
            getRowKey={(row) => row.id || row.orderItemId}
            renderCell={renderCell}
            loading={snapshotsQuery.isLoading}
            emptyTitle={t('financeProfit.empty')}
            minWidth="1100px"
          />
        </section>
      </div>
    </OperationsPageShell>
  )
}
