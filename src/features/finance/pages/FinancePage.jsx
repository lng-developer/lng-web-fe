import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Chip, FormControl, MenuItem, Select, TextField } from '@mui/material'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { useFinanceSnapshotsQuery } from '@/features/finance/api/finance.queries'
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
    const current = result[currency] || { revenue: 0, profit: 0, missingCost: 0 }
    current.revenue += Number(row?.revenue?.customerPaidAmount || 0)
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
    orderId: '',
    orderItemId: '',
    shopId: '',
    snapshotStatus: '',
    costStatus: '',
  }))
  const query = compactQuery({ ...filters, page, limit: pageSize })
  const snapshotsQuery = useFinanceSnapshotsQuery(query)
  const rows = snapshotsQuery.data?.items || EMPTY_ROWS
  const pagination = {
    page: snapshotsQuery.data?.page || page,
    limit: snapshotsQuery.data?.limit || pageSize,
    total: snapshotsQuery.data?.total || 0,
  }
  const totals = useMemo(() => visibleTotals(rows), [rows])
  const columns = useMemo(
    () => [
      { key: 'orderItemId', label: t('financeProfit.table.orderItem'), width: '190px' },
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
    if (column.key === 'orderItemId')
      return <span className="font-medium text-ink-strong">{row.orderItemId}</span>
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
            <TextField
              size="small"
              label={t('financeProfit.filters.shopId')}
              value={filters.shopId}
              onChange={(event) => updateFilter('shopId', event.target.value)}
            />
            <TextField
              size="small"
              label={t('financeProfit.filters.orderId')}
              value={filters.orderId}
              onChange={(event) => updateFilter('orderId', event.target.value)}
            />
            <TextField
              size="small"
              label={t('financeProfit.filters.orderItemId')}
              value={filters.orderItemId}
              onChange={(event) => updateFilter('orderItemId', event.target.value)}
            />
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
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {Object.entries(totals).map(([currency, total]) => (
              <div key={currency} className="border border-border bg-surface px-3 py-2">
                <div className="text-xs font-medium uppercase text-ink-muted">
                  {t('financeProfit.visibleTotal')} · {currency}
                </div>
                <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-ink-strong">
                  <span>
                    {t('financeProfit.revenue')}:{' '}
                    <strong>{formatMoney(total.revenue, currency, i18n.language)}</strong>
                  </span>
                  <span>
                    {t('financeProfit.grossProfit')}:{' '}
                    <strong>{formatMoney(total.profit, currency, i18n.language)}</strong>
                  </span>
                  {total.missingCost ? (
                    <span className="text-warning">
                      {t('financeProfit.missingCost', { count: total.missingCost })}
                    </span>
                  ) : null}
                </div>
              </div>
            ))}
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
      <div className="h-full overflow-auto">
        {snapshotsQuery.isError ? (
          <Alert severity="error" className="mb-3">
            {t('financeProfit.loadError')}
          </Alert>
        ) : null}
        <OperationsTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id || row.orderItemId}
          renderCell={renderCell}
          loading={snapshotsQuery.isLoading}
          emptyTitle={t('financeProfit.empty')}
          minWidth="1100px"
        />
      </div>
    </OperationsPageShell>
  )
}
