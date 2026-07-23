import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import ReplayIcon from '@mui/icons-material/Replay'
import VisibilityIcon from '@mui/icons-material/Visibility'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Drawer,
  FormControl,
  FormControlLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import {
  useFinanceImportBatchesQuery,
  useFinanceImportBatchQuery,
  useFinanceImportBatchReprocessMutation,
  useFinanceImportedDataQuery,
  useFinanceImportMutation,
} from '@/features/finance-imports/api/financeImports.queries'
import {
  getFinanceImportBatchActions,
  getFinanceImportBatchSummary,
  getFinanceImportDefaults,
  getFinanceImportedDataActions,
  getFinanceImportedDataQuery,
  getFinanceImportFileValues,
} from '@/features/finance-imports/utils/financeImportsAccess'
import { useAuthStore } from '@/store/useAuthStore'

const pageSize = 20
const sourceTypes = ['ADS', 'SETTLEMENTS', 'TRANSACTIONS']
const EMPTY_ROWS = []

function compactQuery(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, item]) => item !== '' && item !== undefined),
  )
}

function formatDate(value, language) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(language, { dateStyle: 'medium', timeStyle: 'short' }).format(
    new Date(value),
  )
}

function statusTone(status) {
  if (status === 'COMPLETED') return 'success'
  if (status === 'FAILED') return 'danger'
  if (status === 'PARTIAL_FAILED') return 'warning'
  return 'info'
}

function SourceSummary({ batch, canWrite, onImport, sourceType, total, t }) {
  const summary = getFinanceImportBatchSummary(batch)

  return (
    <div className="border border-border bg-surface px-3 py-2">
      <div className="flex items-center justify-between gap-2 text-xs font-medium uppercase text-ink-muted">
        <span>{t(`financeImports.sources.${sourceType}`)}</span>
        {canWrite ? (
          <Button size="small" onClick={() => onImport(sourceType)}>
            {t('financeImports.actions.import')}
          </Button>
        ) : null}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-ink-strong">
        <StatusBadge tone={statusTone(summary.status)}>{summary.status}</StatusBadge>
        <span>{t('financeImports.importedRows', { count: summary.importedRows })}</span>
        <span>{t('financeImports.table.errorCount', { count: summary.errorCount })}: {summary.errorCount}</span>
      </div>
      <div className="mt-1 text-xs text-ink-muted">{total || 0} {t('financeImports.batchCount')}</div>
    </div>
  )
}

function ImportDialog({ open, onClose, onSubmit, pending, sourceType, t }) {
  const [values, setValues] = useState(() => getFinanceImportDefaults(sourceType))

  function update(key, value) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  function updateFile(file) {
    setValues((current) => getFinanceImportFileValues(current, file))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit(values)
  }

  return (
    <Dialog open={open} maxWidth="sm" fullWidth onClose={onClose}>
      <form onSubmit={submit}>
        <DialogTitle>{t('financeImports.importDialog.title')}</DialogTitle>
        <DialogContent className="grid gap-3 pt-3">
          <FormControl size="small" fullWidth>
            <Select
              value={values.sourceType}
              onChange={(event) => update('sourceType', event.target.value)}
            >
              {sourceTypes.map((sourceType) => (
                <MenuItem key={sourceType} value={sourceType}>
                  {t(`financeImports.sources.${sourceType}`)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            required
            size="small"
            label={t('financeImports.filters.shopId')}
            value={values.shopId}
            onChange={(event) => update('shopId', event.target.value)}
          />
          <TextField
            required
            size="small"
            label={t('financeImports.filters.salesChannel')}
            value={values.salesChannelCode}
            onChange={(event) => update('salesChannelCode', event.target.value.toUpperCase())}
          />
          <TextField
            required
            size="small"
            label={t('financeImports.filters.marketplace')}
            value={values.marketplaceCode}
            onChange={(event) => update('marketplaceCode', event.target.value.toUpperCase())}
          />
          <TextField
            size="small"
            label={t('financeImports.importDialog.sourceRef')}
            value={values.sourceRef}
            onChange={(event) => update('sourceRef', event.target.value)}
          />
          <Button component="label" variant="outlined">
            {values.file?.name || t('financeImports.importDialog.file')}
            <input
              hidden
              required
              type="file"
              accept=".csv,.txt"
              onChange={(event) => updateFile(event.target.files?.[0] || null)}
            />
          </Button>
          <FormControlLabel
            control={
              <Switch
                checked={values.dryRun}
                onChange={(event) => update('dryRun', event.target.checked)}
              />
            }
            label={t('financeImports.importDialog.dryRun')}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>{t('financeImports.actions.cancel')}</Button>
          <Button type="submit" variant="contained" disabled={pending || !values.file}>
            {t('financeImports.actions.import')}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}

function BatchDrawer({ batchId, onClose, open, t }) {
  const { i18n } = useTranslation()
  const batchQuery = useFinanceImportBatchQuery(batchId, { enabled: open })
  const batch = batchQuery.data

  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-[520px] max-w-[100vw] flex-col gap-4 overflow-auto bg-surface p-5">
        <div>
          <Typography variant="h6" className="font-bold text-ink-strong">
            {t('financeImports.detail.title')}
          </Typography>
          <Typography variant="body2" className="text-ink-muted">
            {batch?.id || batchId || '-'}
          </Typography>
        </div>
        <div className="grid grid-cols-2 gap-3 text-sm">
          {[
            ['sourceType', batch?.sourceType],
            ['status', batch?.status],
            ['filename', batch?.originalFilename],
            ['createdAt', formatDate(batch?.createdAt, i18n.language)],
            ['processedRows', batch?.processedRows],
            ['errorCount', batch?.errorCount],
          ].map(([key, value]) => (
            <div key={key}>
              <div className="text-xs uppercase text-ink-muted">{t(`financeImports.detail.${key}`)}</div>
              <div className="mt-1 font-medium text-ink-strong">{value ?? '-'}</div>
            </div>
          ))}
        </div>
        <section>
          <Typography className="mb-2 text-sm font-bold text-ink-strong">
            {t('financeImports.detail.errors')}
          </Typography>
          <div className="space-y-2">
            {(batch?.errors || EMPTY_ROWS).map((item, index) => (
              <div key={`${item.row || index}-${item.message}`} className="border border-border p-2 text-sm">
                <div className="font-medium text-ink-strong">{item.row || '-'}</div>
                <div className="text-ink-muted">{item.message}</div>
              </div>
            ))}
            {!batchQuery.isLoading && !batch?.errors?.length ? (
              <Typography variant="body2" className="text-ink-muted">
                {t('financeImports.detail.noErrors')}
              </Typography>
            ) : null}
          </div>
        </section>
      </div>
    </Drawer>
  )
}

function SourceDataDrawer({ onClose, open, row, t }) {
  return (
    <Drawer anchor="right" open={open} onClose={onClose}>
      <div className="flex h-full w-[520px] max-w-[100vw] flex-col gap-4 overflow-auto bg-surface p-5">
        <div>
          <Typography variant="h6" className="font-bold text-ink-strong">
            {t('financeImports.sourceData.detailTitle')}
          </Typography>
          <Typography variant="body2" className="text-ink-muted">
            {row?.id || '-'}
          </Typography>
        </div>
        <pre className="max-h-full overflow-auto border border-border bg-surface-subtle p-3 text-xs text-ink-secondary">
          {JSON.stringify(row || {}, null, 2)}
        </pre>
      </div>
    </Drawer>
  )
}

export default function FinanceDataImportsPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const canWrite = getFinanceImportBatchActions(currentUser, 'FAILED').includes('REPROCESS')
  const [sourceType, setSourceType] = useState('ADS')
  const [page, setPage] = useState(1)
  const [batchFilters, setBatchFilters] = useState({
    sourceType: '',
    status: '',
    shopId: '',
    salesChannelCode: '',
    marketplaceCode: '',
    dateFrom: '',
    dateTo: '',
  })
  const [sourceFilters, setSourceFilters] = useState({
    shopId: '',
    salesChannelCode: '',
    marketplaceCode: '',
    status: '',
    dateFrom: '',
    dateTo: '',
  })
  const [importOpen, setImportOpen] = useState(false)
  const [importSourceType, setImportSourceType] = useState('ADS')
  const [selectedBatchId, setSelectedBatchId] = useState(null)
  const [selectedSourceRow, setSelectedSourceRow] = useState(null)
  const batchQuery = compactQuery({ ...batchFilters, page, limit: pageSize })
  const sourceQuery = getFinanceImportedDataQuery(sourceFilters, page, pageSize)
  const batchesQuery = useFinanceImportBatchesQuery(batchQuery)
  const adsSummaryQuery = useFinanceImportBatchesQuery({ sourceType: 'ADS', limit: 1 })
  const settlementsSummaryQuery = useFinanceImportBatchesQuery({ sourceType: 'SETTLEMENTS', limit: 1 })
  const transactionsSummaryQuery = useFinanceImportBatchesQuery({ sourceType: 'TRANSACTIONS', limit: 1 })
  const importedDataQuery = useFinanceImportedDataQuery(sourceType, sourceQuery)
  const importMutation = useFinanceImportMutation()
  const reprocessMutation = useFinanceImportBatchReprocessMutation()
  const batches = batchesQuery.data?.items || EMPTY_ROWS
  const sourceRows = importedDataQuery.data?.items || EMPTY_ROWS
  const batchColumns = useMemo(
    () => [
      { key: 'sourceType', label: t('financeImports.table.sourceType'), width: '135px' },
      { key: 'originalFilename', label: t('financeImports.table.filename'), width: '220px' },
      { key: 'scope', label: t('financeImports.table.scope'), width: '210px' },
      { key: 'status', label: t('financeImports.table.status'), width: '140px', align: 'center' },
      { key: 'processedRows', label: t('financeImports.table.processedRows'), width: '120px', align: 'right' },
      { key: 'errorCount', label: t('financeImports.table.errorCount'), width: '100px', align: 'right' },
      { key: 'createdAt', label: t('financeImports.table.createdAt'), width: '180px' },
      { key: 'actions', label: t('financeImports.table.actions'), width: '170px', align: 'center' },
    ],
    [t],
  )
  const sourceColumns = useMemo(
    () => [
      { key: 'id', label: t('financeImports.sourceData.id'), width: '210px' },
      { key: 'scope', label: t('financeImports.table.scope'), width: '240px' },
      { key: 'importBatchId', label: t('financeImports.sourceData.batchId'), width: '210px' },
      { key: 'createdAt', label: t('financeImports.table.createdAt'), width: '180px' },
      { key: 'actions', label: t('financeImports.table.actions'), width: '120px', align: 'center' },
    ],
    [t],
  )
  const summaries = {
    ADS: { total: adsSummaryQuery.data?.total, batch: adsSummaryQuery.data?.items?.[0] },
    SETTLEMENTS: { total: settlementsSummaryQuery.data?.total, batch: settlementsSummaryQuery.data?.items?.[0] },
    TRANSACTIONS: { total: transactionsSummaryQuery.data?.total, batch: transactionsSummaryQuery.data?.items?.[0] },
  }

  function updateBatchFilter(key, value) {
    setBatchFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function updateSourceFilter(key, value) {
    setSourceFilters((current) => ({ ...current, [key]: value }))
    setPage(1)
  }

  function updateSourceType(nextType) {
    setSourceType(nextType)
    setPage(1)
  }

  function openImport(nextSourceType = sourceType) {
    setImportSourceType(nextSourceType)
    setImportOpen(true)
  }

  function submitImport(values) {
    importMutation.mutate(values, {
      onSuccess: () => {
        setImportOpen(false)
        enqueueSnackbar(t('financeImports.messages.imported'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      },
      onError: () => enqueueSnackbar(t('financeImports.messages.importError'), { variant: SNACKBAR_VARIANTS.ERROR }),
    })
  }

  function reprocess(batchId) {
    reprocessMutation.mutate(batchId, {
      onSuccess: () => enqueueSnackbar(t('financeImports.messages.reprocessed'), { variant: SNACKBAR_VARIANTS.SUCCESS }),
      onError: () => enqueueSnackbar(t('financeImports.messages.reprocessError'), { variant: SNACKBAR_VARIANTS.ERROR }),
    })
  }

  function renderBatchCell(row, column) {
    if (column.key === 'status')
      return <StatusBadge tone={statusTone(row.status)}>{row.status || '-'}</StatusBadge>
    if (column.key === 'scope')
      return [row.shopId, row.salesChannelCode, row.marketplaceCode].filter(Boolean).join(' · ') || '-'
    if (column.key === 'createdAt') return formatDate(row.createdAt, i18n.language)
    if (column.key === 'actions')
      {
        const actions = getFinanceImportBatchActions(currentUser, row.status)

      return (
        <div className="flex justify-center gap-1">
          <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setSelectedBatchId(row.id)}>
            {t('financeImports.actions.details')}
          </Button>
          {actions.includes('REPROCESS') ? (
            <Button
              size="small"
              startIcon={<ReplayIcon />}
              disabled={reprocessMutation.isPending}
              onClick={() => reprocess(row.id)}
            >
              {t('financeImports.actions.reprocess')}
            </Button>
          ) : null}
        </div>
      )
      }
    return row[column.key] ?? '-'
  }

  function renderSourceCell(row, column) {
    if (column.key === 'scope')
      return [row.shopId, row.salesChannelCode, row.marketplaceCode].filter(Boolean).join(' · ') || '-'
    if (column.key === 'createdAt') return formatDate(row.createdAt, i18n.language)
    if (column.key === 'actions') {
      const actions = getFinanceImportedDataActions()

      return actions.includes('DETAILS') ? (
        <Button size="small" startIcon={<VisibilityIcon />} onClick={() => setSelectedSourceRow(row)}>
          {t('financeImports.actions.details')}
        </Button>
      ) : null
    }
    return row[column.key] ?? '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('financeImports.title')}
          subtitle={t('financeImports.subtitle')}
          actions={
            <div className="flex gap-2">
              <Button
                size="small"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  batchesQuery.refetch()
                  importedDataQuery.refetch()
                }}
              >
                {t('financeImports.actions.refresh')}
              </Button>
              {canWrite ? (
                <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => openImport()}>
                  {t('financeImports.actions.import')}
                </Button>
              ) : null}
            </div>
          }
        />
      }
      tabs={
        <OperationsTabs
          items={sourceTypes.map((value) => ({
            value,
            label: t(`financeImports.sources.${value}`),
            count: summaries[value].total || 0,
          }))}
          value={sourceType}
          onChange={updateSourceType}
          variant="underline"
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
            {sourceTypes.map((value) => (
              <SourceSummary
                key={value}
                batch={summaries[value].batch}
                canWrite={canWrite}
                onImport={openImport}
                sourceType={value}
                total={summaries[value].total}
                t={t}
              />
            ))}
          </div>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-7">
            <FormControl size="small">
              <Select
                displayEmpty
                value={batchFilters.sourceType}
                onChange={(event) => updateBatchFilter('sourceType', event.target.value)}
              >
                <MenuItem value="">{t('financeImports.filters.allSources')}</MenuItem>
                {sourceTypes.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`financeImports.sources.${value}`)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                displayEmpty
                value={batchFilters.status}
                onChange={(event) => updateBatchFilter('status', event.target.value)}
              >
                <MenuItem value="">{t('financeImports.filters.allStatuses')}</MenuItem>
                {['PROCESSING', 'COMPLETED', 'PARTIAL_FAILED', 'FAILED'].map((value) => (
                  <MenuItem key={value} value={value}>{value}</MenuItem>
                ))}
              </Select>
            </FormControl>
            {['shopId', 'salesChannelCode', 'marketplaceCode', 'dateFrom', 'dateTo'].map((key) => (
              <TextField
                key={key}
                size="small"
                type={key.startsWith('date') ? 'date' : 'text'}
                label={t(`financeImports.filters.${key === 'salesChannelCode' ? 'salesChannel' : key === 'marketplaceCode' ? 'marketplace' : key}`)}
                value={batchFilters[key]}
                onChange={(event) => updateBatchFilter(key, event.target.value)}
                slotProps={key.startsWith('date') ? { inputLabel: { shrink: true } } : undefined}
              />
            ))}
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={batchesQuery.data?.page || page}
          pageSize={batchesQuery.data?.limit || pageSize}
          total={batchesQuery.data?.total || 0}
          onPageChange={setPage}
        />
      }
    >
      <div className="space-y-4 overflow-auto">
        {batchesQuery.isError ? <Alert severity="error">{t('financeImports.messages.loadError')}</Alert> : null}
        <section>
          <Typography variant="h6" className="mb-2 font-bold text-ink-strong">
            {t('financeImports.batchTable')}
          </Typography>
          <OperationsTable
            columns={batchColumns}
            rows={batches}
            getRowKey={(row) => row.id}
            renderCell={renderBatchCell}
            loading={batchesQuery.isLoading}
            emptyTitle={t('financeImports.emptyBatches')}
            minWidth="1280px"
          />
        </section>
        <section>
          <Typography variant="h6" className="mb-2 font-bold text-ink-strong">
            {t('financeImports.sourceData.title', { source: t(`financeImports.sources.${sourceType}`) })}
          </Typography>
          <div className="mb-2 grid grid-cols-1 gap-2 md:grid-cols-3 xl:grid-cols-6">
            {['shopId', 'salesChannelCode', 'marketplaceCode', 'status', 'dateFrom', 'dateTo'].map((key) => (
              <TextField
                key={key}
                size="small"
                type={key.startsWith('date') ? 'date' : 'text'}
                label={t(`financeImports.filters.${key === 'salesChannelCode' ? 'salesChannel' : key === 'marketplaceCode' ? 'marketplace' : key}`)}
                value={sourceFilters[key]}
                onChange={(event) => updateSourceFilter(key, event.target.value)}
                slotProps={key.startsWith('date') ? { inputLabel: { shrink: true } } : undefined}
              />
            ))}
          </div>
          <OperationsTable
            columns={sourceColumns}
            rows={sourceRows}
            getRowKey={(row) => row.id}
            renderCell={renderSourceCell}
            loading={importedDataQuery.isLoading}
            emptyTitle={t('financeImports.emptySourceData')}
            minWidth="900px"
          />
        </section>
      </div>
      <ImportDialog
        key={importSourceType}
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onSubmit={submitImport}
        pending={importMutation.isPending}
        sourceType={importSourceType}
        t={t}
      />
      <BatchDrawer
        batchId={selectedBatchId}
        open={Boolean(selectedBatchId)}
        onClose={() => setSelectedBatchId(null)}
        t={t}
      />
      <SourceDataDrawer
        open={Boolean(selectedSourceRow)}
        row={selectedSourceRow}
        onClose={() => setSelectedSourceRow(null)}
        t={t}
      />
    </OperationsPageShell>
  )
}
