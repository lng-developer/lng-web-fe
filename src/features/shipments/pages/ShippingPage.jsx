import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReportProblemOutlinedIcon from '@mui/icons-material/ReportProblemOutlined'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Button,
  Drawer,
  IconButton,
  InputAdornment,
  Stack,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useRecheckSubmittedVendorTrackingMutation,
  useRecheckVendorTrackingMutation,
  useUpdateShipmentStatusMutation,
  useUpdateShipmentTrackingMutation,
} from '@/features/shipments/api/shipments.mutations'
import {
  useShipmentDetailQuery,
  useShipmentsQuery,
  useShipmentWebhookLogsQuery,
} from '@/features/shipments/api/shipments.queries'
import { readShipmentDashboardSearch } from '@/features/shipments/utils/shipmentsApi'
import { useDebounce } from '@/hooks/useDebounce'

const pageSize = 20
const tabs = [
  { value: 'shipments', labelKey: 'shipments.tabs.shipments' },
  { value: 'webhooks', labelKey: 'shipments.tabs.webhooks' },
]
const statusTabs = ['ALL', 'TRACKING_PENDING', 'SHIPPED', 'DELIVERED', 'EXCEPTION', 'CANCELLED']
const shipmentColumns = [
  { key: 'orderId', labelKey: 'shipments.table.orderId', width: '180px' },
  { key: 'status', labelKey: 'shipments.table.status', width: '145px' },
  { key: 'carrier', labelKey: 'shipments.table.carrier', width: '120px' },
  { key: 'trackingNumber', labelKey: 'shipments.table.trackingNumber', width: '190px' },
  { key: 'vendorOrderId', labelKey: 'shipments.table.vendorOrderId', width: '170px' },
  { key: 'updatedAt', labelKey: 'shipments.table.updatedAt', width: '150px' },
  { key: 'actions', labelKey: 'shipments.table.actions', width: '150px', align: 'center' },
]
const webhookColumns = [
  { key: 'provider', labelKey: 'shipments.table.provider', width: '130px' },
  { key: 'outcome', labelKey: 'shipments.table.outcome', width: '130px' },
  { key: 'trackingNumber', labelKey: 'shipments.table.trackingNumber', width: '190px' },
  { key: 'carrier', labelKey: 'shipments.table.carrier', width: '120px' },
  { key: 'message', labelKey: 'shipments.table.message', width: '360px' },
  { key: 'createdAt', labelKey: 'shipments.table.createdAt', width: '160px' },
]

function statusTone(status) {
  if (status === 'DELIVERED') return 'success'
  if (status === 'SHIPPED') return 'info'
  if (status === 'EXCEPTION') return 'danger'
  if (status === 'CANCELLED') return 'neutral'
  return 'warning'
}

function formatDate(value, language) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(language, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value))
}

function JsonBlock({ value }) {
  return (
    <pre className="max-h-96 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 text-xs text-ink-secondary">
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  )
}

function ShipmentDrawer({ row, open, onClose, t }) {
  const detailQuery = useShipmentDetailQuery(row?.id, { enabled: open && Boolean(row?.id) })
  const detail = detailQuery.data || row

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-[480px] max-w-[100vw] flex-col gap-4 overflow-auto bg-surface p-5">
        <div>
          <Typography variant="h6" className="font-bold text-ink-strong">
            {t('shipments.detail.title')}
          </Typography>
          <Typography variant="body2" className="text-ink-muted">
            {detail?.id || '-'}
          </Typography>
        </div>
        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase text-ink-muted">{t('shipments.table.orderId')}</div>
            <div className="font-semibold text-ink-strong">{detail?.orderId || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">{t('shipments.table.status')}</div>
            <StatusBadge tone={statusTone(detail?.status)}>{detail?.status || '-'}</StatusBadge>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">{t('shipments.table.carrier')}</div>
            <div className="font-semibold text-ink-strong">{detail?.carrier || '-'}</div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">
              {t('shipments.table.trackingNumber')}
            </div>
            <div className="font-semibold text-ink-strong">{detail?.trackingNumber || '-'}</div>
          </div>
        </section>
        <section>
          <Typography className="mb-2 text-sm font-bold text-ink-strong">
            {t('shipments.detail.rawRecord')}
          </Typography>
          <JsonBlock value={detail?.raw || detail} />
        </section>
      </div>
    </Drawer>
  )
}

export default function ShippingPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const location = useLocation()
  const [activeTab, setActiveTab] = useState('shipments')
  const [status, setStatus] = useState(
    () => readShipmentDashboardSearch(location.search).status || 'ALL',
  )
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({
    id: '',
    externalOrderId: '',
    vendorExternalOrderId: '',
    trackingNumber: '',
  })
  const [selectedRow, setSelectedRow] = useState(null)
  const debouncedFilters = useDebounce(filters, 300)
  const shipmentsQuery = useShipmentsQuery(
    { ...debouncedFilters, status, page, limit: pageSize },
    { enabled: activeTab === 'shipments' },
  )
  const webhookQuery = useShipmentWebhookLogsQuery(
    { page, limit: pageSize },
    { enabled: activeTab === 'webhooks' },
  )
  const updateTrackingMutation = useUpdateShipmentTrackingMutation()
  const updateStatusMutation = useUpdateShipmentStatusMutation()
  const recheckVendorTrackingMutation = useRecheckVendorTrackingMutation()
  const recheckSubmittedVendorTrackingMutation = useRecheckSubmittedVendorTrackingMutation()
  const activeQuery = activeTab === 'shipments' ? shipmentsQuery : webhookQuery
  const rows = activeQuery.data?.items || []
  const pagination = activeQuery.data?.pagination || { page, limit: pageSize, total: 0 }

  function mutate(mutation, payload, message) {
    mutation.mutate(payload, {
      onSuccess: () => enqueueSnackbar(message, { variant: SNACKBAR_VARIANTS.SUCCESS }),
      onError: (error) =>
        enqueueSnackbar(error?.response?.data?.message || t('shipments.messages.actionFailed'), {
          variant: SNACKBAR_VARIANTS.ERROR,
        }),
    })
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function updateTracking(row) {
    const carrier = window.prompt(
      t('shipments.prompts.carrier'),
      row.carrier === '-' ? '' : row.carrier,
    )
    const trackingNumber = window.prompt(
      t('shipments.prompts.trackingNumber'),
      row.trackingNumber === '-' ? '' : row.trackingNumber,
    )
    if (!carrier || !trackingNumber) return
    mutate(
      updateTrackingMutation,
      { id: row.id, carrier, trackingNumber, note: 'Updated from UI' },
      t('shipments.messages.trackingUpdated'),
    )
  }

  function recheckTracking(row) {
    mutate(
      recheckVendorTrackingMutation,
      {
        provider: row.raw.provider || 'MERCHIZE',
        externalOrderId: row.raw.vendorExternalOrderId || row.vendorOrderId,
        vendorSubmissionId: row.raw.vendorSubmissionId,
      },
      t('shipments.messages.trackingRechecked'),
    )
  }

  function renderShipmentActions(row) {
    return (
      <Stack direction="row" spacing={0.5} justifyContent="center">
        <Tooltip title={t('common.view')}>
          <IconButton size="small" onClick={() => setSelectedRow(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {row.status === 'TRACKING_PENDING' ? (
          <>
            <Tooltip title={t('shipments.actions.recheckTracking')}>
              <IconButton size="small" onClick={() => recheckTracking(row)}>
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('shipments.actions.updateTracking')}>
              <IconButton size="small" onClick={() => updateTracking(row)}>
                <LocalShippingOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
        {row.status === 'SHIPPED' ? (
          <>
            <Tooltip title={t('shipments.actions.markDelivered')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    updateStatusMutation,
                    { id: row.id, status: 'DELIVERED' },
                    t('shipments.messages.markedDelivered'),
                  )
                }
              >
                <CheckCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('shipments.actions.markException')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    updateStatusMutation,
                    { id: row.id, status: 'EXCEPTION' },
                    t('shipments.messages.markedException'),
                  )
                }
              >
                <ReportProblemOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
      </Stack>
    )
  }

  function renderShipmentCell(row, column) {
    if (column.key === 'status') {
      return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
    }
    if (column.key === 'updatedAt') return formatDate(row.updatedAt, i18n.language)
    if (column.key === 'actions') return renderShipmentActions(row)
    return row[column.key] || '-'
  }

  function renderWebhookCell(row, column) {
    if (column.key === 'outcome') {
      return (
        <StatusBadge tone={row.outcome === 'SUCCESS' ? 'success' : 'danger'}>
          {row.outcome}
        </StatusBadge>
      )
    }
    if (column.key === 'createdAt') return formatDate(row.createdAt, i18n.language)
    return row[column.key] || '-'
  }

  return (
    <OperationsPageShell
      header={
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Typography variant="h5" className="text-xl font-bold text-ink-strong">
              {t('shipments.title')}
            </Typography>
            <Typography variant="body2" className="text-sm text-ink-muted">
              {t('shipments.subtitle')}
            </Typography>
          </div>
        </div>
      }
      tabs={
        <OperationsTabs
          items={tabs.map((item) => ({ ...item, label: t(item.labelKey) }))}
          value={activeTab}
          onChange={(value) => {
            setActiveTab(value)
            setPage(1)
          }}
        />
      }
      toolbar={
        <OperationsToolbar>
          <Tooltip title={t('common.refresh')}>
            <IconButton
              aria-label={t('common.refresh')}
              onClick={() => activeQuery.refetch()}
              className="h-10 w-10 rounded-lg border border-border bg-surface text-ink-secondary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {activeTab === 'shipments' ? (
            <>
              <OperationsTabs
                items={statusTabs.map((item) => ({
                  value: item,
                  label: item === 'ALL' ? t('common.all') : item,
                }))}
                value={status}
                onChange={(nextStatus) => {
                  setStatus(nextStatus)
                  setPage(1)
                }}
              />
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-[220px_220px_220px_220px_auto]">
                <TextField
                  size="small"
                  value={filters.id}
                  onChange={(event) => updateFilter('id', event.target.value)}
                  placeholder={t('shipments.filters.id')}
                  slotProps={{
                    input: {
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" />
                        </InputAdornment>
                      ),
                    },
                  }}
                />
                <TextField
                  size="small"
                  value={filters.externalOrderId}
                  onChange={(event) => updateFilter('externalOrderId', event.target.value)}
                  placeholder={t('shipments.filters.orderId')}
                />
                <TextField
                  size="small"
                  value={filters.vendorExternalOrderId}
                  onChange={(event) => updateFilter('vendorExternalOrderId', event.target.value)}
                  placeholder={t('shipments.filters.vendorOrderId')}
                />
                <TextField
                  size="small"
                  value={filters.trackingNumber}
                  onChange={(event) => updateFilter('trackingNumber', event.target.value)}
                  placeholder={t('shipments.filters.trackingNumber')}
                />
                <Button
                  variant="contained"
                  startIcon={<RefreshIcon fontSize="small" />}
                  onClick={() =>
                    mutate(
                      recheckSubmittedVendorTrackingMutation,
                      { limit: 50 },
                      t('shipments.messages.submittedRechecked'),
                    )
                  }
                >
                  {t('shipments.actions.recheckSubmitted')}
                </Button>
              </div>
            </>
          ) : null}
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
      <OperationsTable
        columns={(activeTab === 'shipments' ? shipmentColumns : webhookColumns).map((column) => ({
          ...column,
          label: t(column.labelKey),
        }))}
        rows={rows}
        loading={activeQuery.isPending}
        getRowKey={(row) => row.id}
        renderCell={activeTab === 'shipments' ? renderShipmentCell : renderWebhookCell}
        minWidth={activeTab === 'shipments' ? '1260px' : '1090px'}
        emptyTitle={
          activeTab === 'shipments' ? t('shipments.empty.shipments') : t('shipments.empty.webhooks')
        }
      />
      <ShipmentDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        t={t}
      />
    </OperationsPageShell>
  )
}
