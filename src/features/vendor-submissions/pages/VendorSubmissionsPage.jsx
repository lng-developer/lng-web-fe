import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import AddTaskOutlinedIcon from '@mui/icons-material/AddTaskOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplayOutlinedIcon from '@mui/icons-material/ReplayOutlined'
import SearchIcon from '@mui/icons-material/Search'
import SendOutlinedIcon from '@mui/icons-material/SendOutlined'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Button,
  Drawer,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
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
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useCreateShipmentFromVendorSubmissionMutation } from '@/features/vendor-submissions/api/vendorSubmissions.mutations'
import {
  useCancelVendorSubmissionMutation,
  useMarkFailedVendorSubmissionMutation,
  useMarkSubmittedVendorSubmissionMutation,
  useRecheckReadyVendorSubmissionsMutation,
  useRetryVendorSubmissionMutation,
  useSubmitToVendorMutation,
} from '@/features/vendor-submissions/api/vendorSubmissions.mutations'
import {
  useVendorSubmissionDetailQuery,
  useVendorSubmissionPayloadPreviewQuery,
  useVendorSubmissionsQuery,
} from '@/features/vendor-submissions/api/vendorSubmissions.queries'
import { readVendorSubmissionDashboardSearch } from '@/features/vendor-submissions/utils/vendorSubmissionsApi'
import { useDebounce } from '@/hooks/useDebounce'

const pageSize = 20
const statusTabs = ['ALL', 'READY', 'SUBMITTED', 'FAILED', 'CANCELLED']
const columns = [
  { key: 'orderId', labelKey: 'vendorSubmissions.table.orderId', width: '180px' },
  { key: 'status', labelKey: 'vendorSubmissions.table.status', width: '120px' },
  { key: 'vendor', labelKey: 'vendorSubmissions.table.vendor', width: '150px' },
  { key: 'costCenter', labelKey: 'vendorSubmissions.table.costCenter', width: '140px' },
  { key: 'provider', labelKey: 'vendorSubmissions.table.provider', width: '120px' },
  { key: 'vendorOrderId', labelKey: 'vendorSubmissions.table.vendorOrderId', width: '160px' },
  { key: 'updatedAt', labelKey: 'vendorSubmissions.table.updatedAt', width: '150px' },
  { key: 'actions', labelKey: 'vendorSubmissions.table.actions', width: '150px', align: 'center' },
]

function statusTone(status) {
  if (status === 'SUBMITTED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'READY') return 'info'
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
    <pre className="max-h-80 overflow-auto rounded-lg border border-border bg-surface-subtle p-3 text-xs text-ink-secondary">
      {JSON.stringify(value || {}, null, 2)}
    </pre>
  )
}

function DetailDrawer({ row, open, onClose, t }) {
  const detailQuery = useVendorSubmissionDetailQuery(row?.id, { enabled: open && Boolean(row?.id) })
  const previewQuery = useVendorSubmissionPayloadPreviewQuery(row?.id, {
    enabled: open && Boolean(row?.id),
  })
  const detail = detailQuery.data

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-[520px] max-w-[100vw] flex-col gap-4 overflow-auto bg-surface p-5">
        <div>
          <Typography variant="h6" className="font-bold text-ink-strong">
            {t('vendorSubmissions.detail.title')}
          </Typography>
          <Typography variant="body2" className="text-ink-muted">
            {row?.id || '-'}
          </Typography>
        </div>
        <section className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <div className="text-xs uppercase text-ink-muted">
              {t('vendorSubmissions.table.orderId')}
            </div>
            <div className="font-semibold text-ink-strong">
              {detail?.orderId || row?.orderId || '-'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">
              {t('vendorSubmissions.table.status')}
            </div>
            <StatusBadge tone={statusTone(detail?.status || row?.status)}>
              {detail?.status || row?.status || '-'}
            </StatusBadge>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">
              {t('vendorSubmissions.table.vendor')}
            </div>
            <div className="font-semibold text-ink-strong">
              {detail?.vendor || row?.vendor || '-'}
            </div>
          </div>
          <div>
            <div className="text-xs uppercase text-ink-muted">
              {t('vendorSubmissions.detail.vendorOrder')}
            </div>
            <div className="font-semibold text-ink-strong">
              {detail?.vendorOrderId || row?.vendorOrderId || '-'}
            </div>
          </div>
        </section>
        <section>
          <Typography className="mb-2 text-sm font-bold text-ink-strong">
            {t('vendorSubmissions.detail.payloadPreview')}
          </Typography>
          <JsonBlock value={previewQuery.data || detail?.payloadSnapshot} />
        </section>
        <section>
          <Typography className="mb-2 text-sm font-bold text-ink-strong">
            {t('vendorSubmissions.detail.submittedResponse')}
          </Typography>
          <JsonBlock value={detail?.submittedResponse} />
        </section>
        <section>
          <Typography className="mb-2 text-sm font-bold text-ink-strong">
            {t('vendorSubmissions.detail.statusHistory')}
          </Typography>
          <div className="space-y-2">
            {(detail?.statusHistory || []).map((item, index) => (
              <div
                key={`${item.status}-${item.at || index}`}
                className="rounded-lg border border-border p-2"
              >
                <div className="text-sm font-semibold text-ink-strong">{item.status}</div>
                <div className="text-xs text-ink-muted">{item.reason || item.at || '-'}</div>
              </div>
            ))}
            {!detail?.statusHistory?.length ? (
              <Typography variant="body2" className="text-ink-muted">
                {t('vendorSubmissions.detail.noHistory')}
              </Typography>
            ) : null}
          </div>
        </section>
      </div>
    </Drawer>
  )
}

export default function VendorSubmissionsPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const location = useLocation()
  const [status, setStatus] = useState(
    () => readVendorSubmissionDashboardSearch(location.search).status || 'ALL',
  )
  const [page, setPage] = useState(1)
  const [filters, setFilters] = useState({ id: '', externalOrderId: '', vendorExternalOrderId: '' })
  const [selectedRow, setSelectedRow] = useState(null)
  const debouncedFilters = useDebounce(filters, 300)
  const query = { ...debouncedFilters, status, page, limit: pageSize }
  const submissionsQuery = useVendorSubmissionsQuery(query)
  const recheckReadyMutation = useRecheckReadyVendorSubmissionsMutation()
  const submitToVendorMutation = useSubmitToVendorMutation()
  const markSubmittedMutation = useMarkSubmittedVendorSubmissionMutation()
  const markFailedMutation = useMarkFailedVendorSubmissionMutation()
  const retryMutation = useRetryVendorSubmissionMutation()
  const cancelMutation = useCancelVendorSubmissionMutation()
  const createShipmentMutation = useCreateShipmentFromVendorSubmissionMutation()
  const rows = submissionsQuery.data?.items || []
  const pagination = submissionsQuery.data?.pagination || { page, limit: pageSize, total: 0 }

  function mutate(mutation, payload, message) {
    mutation.mutate(payload, {
      onSuccess: () => enqueueSnackbar(message, { variant: SNACKBAR_VARIANTS.SUCCESS }),
      onError: (error) =>
        enqueueSnackbar(
          error?.response?.data?.message || t('vendorSubmissions.messages.actionFailed'),
          {
            variant: SNACKBAR_VARIANTS.ERROR,
          },
        ),
    })
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function renderActions(row) {
    const statusValue = row.status
    return (
      <Stack direction="row" spacing={0.5} justifyContent="center">
        <Tooltip title={t('common.view')}>
          <IconButton size="small" onClick={() => setSelectedRow(row)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconButton>
        </Tooltip>
        {statusValue === 'READY' ? (
          <>
            <Tooltip title={t('vendorSubmissions.actions.submitToVendor')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    submitToVendorMutation,
                    { id: row.id, provider: row.raw.provider || 'MERCHIZE', dryRun: true },
                    t('vendorSubmissions.messages.submittedToVendor'),
                  )
                }
              >
                <SendOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('vendorSubmissions.actions.markSubmitted')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    markSubmittedMutation,
                    row.id,
                    t('vendorSubmissions.messages.markedSubmitted'),
                  )
                }
              >
                <CheckCircleOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('common.cancel')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    cancelMutation,
                    {
                      id: row.id,
                      cancelReason:
                        window.prompt(t('vendorSubmissions.prompts.cancelReason')) || '',
                    },
                    t('vendorSubmissions.messages.cancelled'),
                  )
                }
              >
                <CancelOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
        {statusValue === 'FAILED' ? (
          <>
            <Tooltip title={t('common.retry')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    retryMutation,
                    { id: row.id, reason: 'Retry from UI' },
                    t('vendorSubmissions.messages.retried'),
                  )
                }
              >
                <ReplayOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title={t('vendorSubmissions.actions.markFailed')}>
              <IconButton
                size="small"
                onClick={() =>
                  mutate(
                    markFailedMutation,
                    {
                      id: row.id,
                      failureReason:
                        window.prompt(t('vendorSubmissions.prompts.failureReason')) ||
                        'Manual failure',
                    },
                    t('vendorSubmissions.messages.markedFailed'),
                  )
                }
              >
                <CancelOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        ) : null}
        {statusValue === 'SUBMITTED' ? (
          <Tooltip title={t('vendorSubmissions.actions.createShipment')}>
            <IconButton
              size="small"
              onClick={() =>
                mutate(
                  createShipmentMutation,
                  row.id,
                  t('vendorSubmissions.messages.shipmentCreated'),
                )
              }
            >
              <LocalShippingOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        ) : null}
      </Stack>
    )
  }

  function renderCell(row, column) {
    if (column.key === 'status') {
      return <StatusBadge tone={statusTone(row.status)}>{row.status}</StatusBadge>
    }
    if (column.key === 'updatedAt') return formatDate(row.updatedAt, i18n.language)
    if (column.key === 'actions') return renderActions(row)
    return row[column.key] || '-'
  }

  return (
    <OperationsPageShell
      header={
        <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3">
            <Typography variant="h5" className="text-xl font-bold text-ink-strong">
              {t('vendorSubmissions.title')}
            </Typography>
            <Typography variant="body2" className="text-sm text-ink-muted">
              {t('vendorSubmissions.subtitle')}
            </Typography>
          </div>
        </div>
      }
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3 xl:grid-cols-[180px_220px_220px_220px_auto_auto]">
            <FormControl size="small" className="w-full">
              <Select
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value)
                  setPage(1)
                }}
                className="h-10 rounded-lg bg-surface text-sm"
                inputProps={{ 'aria-label': t('vendorSubmissions.table.status') }}
              >
                {statusTabs.map((item) => (
                  <MenuItem key={item} value={item}>
                    {item === 'ALL' ? t('common.all') : item}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              value={filters.id}
              onChange={(event) => updateFilter('id', event.target.value)}
              placeholder={t('vendorSubmissions.filters.id')}
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
              placeholder={t('vendorSubmissions.filters.orderId')}
            />
            <TextField
              size="small"
              value={filters.vendorExternalOrderId}
              onChange={(event) => updateFilter('vendorExternalOrderId', event.target.value)}
              placeholder={t('vendorSubmissions.filters.vendorOrderId')}
            />
            <Button
              variant="contained"
              startIcon={<AddTaskOutlinedIcon fontSize="small" />}
              onClick={() =>
                mutate(
                  recheckReadyMutation,
                  { limit: 50 },
                  t('vendorSubmissions.messages.readyRechecked'),
                )
              }
            >
              {t('vendorSubmissions.actions.recheckReady')}
            </Button>
            <Tooltip title={t('common.refresh')}>
              <IconButton
                aria-label={t('common.refresh')}
                onClick={() => submissionsQuery.refetch()}
                className="h-10 w-10 rounded-lg border border-border bg-surface text-ink-secondary"
              >
                <RefreshIcon fontSize="small" />
              </IconButton>
            </Tooltip>
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
      <OperationsTable
        columns={columns.map((column) => ({ ...column, label: t(column.labelKey) }))}
        rows={rows}
        loading={submissionsQuery.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="1340px"
        emptyTitle={t('vendorSubmissions.empty')}
      />
      <DetailDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRow(null)}
        t={t}
      />
    </OperationsPageShell>
  )
}
