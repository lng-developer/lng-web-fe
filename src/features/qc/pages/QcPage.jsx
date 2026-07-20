import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import {
  Alert,
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Pagination,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import {
  OperationsPageShell,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { getUserPermissionCodes } from '@/features/auth/utils/authz'
import { getOrderStatusTone } from '@/features/orders/utils/orderStatus'
import {
  useExportProductionQcTasksMutation,
  useSubmitProductionQcMutation,
} from '@/features/production/api/production.mutations'
import {
  useProductionShopsQuery,
  useProductionSummaryQuery,
  useProductionTasksQuery,
} from '@/features/production/api/production.queries'
import QcDecisionDialog from '@/features/qc/components/QcDecisionDialog'
import QcDetailPanel from '@/features/qc/components/QcDetailPanel'
import QcImageReviewDialog from '@/features/qc/components/QcImageReviewDialog'
import {
  QC_ALL_FILTER,
  QC_PAGE_SIZE,
  QC_PLATFORM_TABS,
  QC_STATUS_TABS,
  QC_TABLE_COLUMNS,
} from '@/features/qc/constants/qcConstants'
import {
  buildQcDashboardSearch,
  buildQcExportQuery,
  buildQcSummaryQuery,
  buildQcTaskQuery,
  canSubmitQcPass,
  canSubmitQcReject,
  mapProductionSummaryToQcCounts,
  mapProductionTaskToQcRow,
  readQcDashboardSearch,
} from '@/features/qc/utils/qcApi'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

const statusTabs = [
  { value: QC_STATUS_TABS.ALL, labelKey: 'qc.statusTabs.all' },
  { value: QC_STATUS_TABS.PENDING, labelKey: 'qc.statusTabs.pending' },
  { value: QC_STATUS_TABS.QC_REJECTED, labelKey: 'qc.statusTabs.qcRejected' },
  { value: QC_STATUS_TABS.FAILED, labelKey: 'qc.statusTabs.failed' },
  { value: QC_STATUS_TABS.COMPLETED, labelKey: 'qc.statusTabs.completed' },
  { value: QC_STATUS_TABS.ADDRESS_INVALID, labelKey: 'qc.statusTabs.addressInvalid' },
]

const pageSizeOptions = [10, 20, 50]
const qcQueryOptions = { staleTime: 30_000, refetchOnWindowFocus: false }
const qcShopsQueryOptions = { staleTime: 5 * 60_000, refetchOnWindowFocus: false }

const qcColumnWidths = {
  orderId: '180px',
  orderDate: '150px',
  statusOrder: '150px',
  shippingType: '140px',
  shop: '130px',
  seller: '150px',
  scaleBy: '150px',
}

function getQcRowKey(task) {
  return task.id
}

function isQcRowExpanded() {
  return true
}

function humanizeStatus(value) {
  if (!value || value === '-') return '-'
  return String(value)
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center justify-center rounded-full px-2.5 text-xs font-semibold ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

function QcOrderStatusBadge({ value, t }) {
  const label = t(`qc.values.status.${value}`, { defaultValue: humanizeStatus(value) })

  return (
    <StatusBadge
      tone={value && value !== '-' ? getOrderStatusTone(value) : 'neutral'}
      tooltip={label}
      variant="text"
    >
      {label}
    </StatusBadge>
  )
}

function FilterSelect({ ariaLabel, disabled, onChange, options, placeholder, value, widthClass }) {
  return (
    <FormControl size="small" className={widthClass} disabled={disabled}>
      <Select
        displayEmpty
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-10 rounded-lg bg-surface text-sm"
        inputProps={{ 'aria-label': ariaLabel }}
        renderValue={(selected) => {
          if (selected === QC_ALL_FILTER) return placeholder
          return options.find((option) => option.value === selected)?.label || selected
        }}
      >
        <MenuItem value={QC_ALL_FILTER}>{placeholder}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function DateValue({ language, value }) {
  if (!value) return <span className="text-sm text-ink-muted">-</span>

  const parsed = dayjs(value).locale(language)
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-semibold text-ink-secondary">
        {parsed.format('DD MMM YYYY')}
      </span>
      <span className="truncate text-xs text-ink-muted">{parsed.fromNow()}</span>
    </div>
  )
}

function QcPagination({ onPageChange, onPageSizeChange, page, pageSize, t, total }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <Typography variant="body2" className="text-sm text-ink-muted">
        {t('qc.pagination.range', { from, to, total })}
      </Typography>
      <Pagination
        count={totalPages}
        page={Math.min(page, totalPages)}
        onChange={(_event, nextPage) => onPageChange(nextPage)}
        size="small"
        color="primary"
        shape="rounded"
      />
      <FormControl size="small" className="w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-10 rounded-lg bg-surface text-sm text-ink-secondary"
          inputProps={{ 'aria-label': t('qc.pagination.pageSize') }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {t('qc.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

export default function QcPage() {
  const { enqueueSnackbar } = useSnackbar()
  const { i18n, t } = useTranslation()
  const currentUser = useAuthStore((state) => state.currentUser)
  const location = useLocation()
  const dashboardSearch = useMemo(() => readQcDashboardSearch(location.search), [location.search])
  const platform = dashboardSearch.platform || QC_PLATFORM_TABS.AMAZON
  const [statusTab, setStatusTab] = useState(
    () => dashboardSearch.statusTab || QC_STATUS_TABS.PENDING,
  )
  const [shopId, setShopId] = useState(() => dashboardSearch.shopId || QC_ALL_FILTER)
  const [searchInput, setSearchInput] = useState(() => dashboardSearch.search || '')
  const [sellerInput, setSellerInput] = useState(() => dashboardSearch.sellerCode || '')
  const [dateRange, setDateRange] = useState(
    () => dashboardSearch.dateRange || { start: null, end: null },
  )
  const [page, setPage] = useState(() => dashboardSearch.page || 1)
  const [pageSize, setPageSize] = useState(() => dashboardSearch.pageSize || QC_PAGE_SIZE)
  const [previewTask, setPreviewTask] = useState(null)
  const [decisionState, setDecisionState] = useState({
    decision: null,
    note: '',
    task: null,
  })
  const debouncedSearch = useDebounce(searchInput, 300)
  const debouncedSeller = useDebounce(sellerInput, 300)
  const taskFilters = useMemo(
    () => ({
      platform,
      statusTab,
      search: debouncedSearch,
      sellerCode: debouncedSeller,
      shopId,
      dateRange,
      page,
      pageSize,
    }),
    [dateRange, debouncedSearch, debouncedSeller, page, pageSize, platform, shopId, statusTab],
  )
  const taskQuery = useMemo(() => buildQcTaskQuery(taskFilters), [taskFilters])
  const summaryQuery = useMemo(() => buildQcSummaryQuery(taskFilters), [taskFilters])
  const exportQuery = useMemo(() => buildQcExportQuery(taskFilters), [taskFilters])
  const tasksQuery = useProductionTasksQuery(taskQuery, qcQueryOptions)
  const countsQuery = useProductionSummaryQuery(summaryQuery, qcQueryOptions)
  const shopsQuery = useProductionShopsQuery({ page: 1, limit: 100 }, qcShopsQueryOptions)
  const submitQcMutation = useSubmitProductionQcMutation()
  const exportTasksMutation = useExportProductionQcTasksMutation()

  const shopOptions = useMemo(
    () =>
      (shopsQuery.data?.items || []).map((shop) => ({
        value: String(shop.id),
        label: shop.name || shop.code || String(shop.id),
      })),
    [shopsQuery.data],
  )
  const shopNameById = useMemo(
    () => new Map(shopOptions.map((shop) => [shop.value, shop.label])),
    [shopOptions],
  )
  const tasks = useMemo(
    () =>
      (tasksQuery.data?.items || []).map((task) =>
        mapProductionTaskToQcRow(task, { shopNameById }),
      ),
    [shopNameById, tasksQuery.data],
  )
  const counts = useMemo(() => mapProductionSummaryToQcCounts(countsQuery.data), [countsQuery.data])
  const total = Number(tasksQuery.data?.total) || 0
  const permissionCodes = useMemo(() => new Set(getUserPermissionCodes(currentUser)), [currentUser])
  const canReview = permissionCodes.has('PRODUCTION:WRITE') || permissionCodes.has('DESIGN:REVIEW')

  function replaceQcUrl(nextState = {}) {
    const query = buildQcDashboardSearch({
      platform,
      statusTab,
      search: searchInput,
      sellerCode: sellerInput,
      shopId,
      dateRange,
      page,
      pageSize,
      ...nextState,
    })
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  function resetView(nextState = {}) {
    setPage(1)
    replaceQcUrl({ ...nextState, page: 1 })
  }

  function handleStatusTabChange(nextStatusTab) {
    setStatusTab(nextStatusTab)
    setPage(1)
    replaceQcUrl({ statusTab: nextStatusTab, page: 1 })
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    setPage(1)
    replaceQcUrl({ page: 1, pageSize: nextPageSize })
  }

  const openDecision = useCallback((task, decision) => {
    setDecisionState({ task, decision, note: '' })
  }, [])

  function closeDecision() {
    if (!submitQcMutation.isPending) {
      setDecisionState({ task: null, decision: null, note: '' })
    }
  }

  async function saveQcDecision(task, decision, note) {
    try {
      await submitQcMutation.mutateAsync({
        taskId: task.id,
        decision,
        note,
      })
      enqueueSnackbar(
        t(decision === 'PASSED' ? 'qc.messages.passSuccess' : 'qc.messages.rejectSuccess'),
        { variant: SNACKBAR_VARIANTS.SUCCESS },
      )
      setPreviewTask((current) => (current?.id === task.id ? null : current))
    } catch (error) {
      enqueueSnackbar(error?.message || t('qc.messages.decisionError'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
      throw error
    }
  }

  async function submitDecision() {
    try {
      await saveQcDecision(decisionState.task, decisionState.decision, decisionState.note)
      closeDecision()
    } catch {
      // Error snackbar is handled by saveQcDecision.
    }
  }

  async function exportTasks() {
    try {
      const blob = await exportTasksMutation.mutateAsync(exportQuery)
      const fileBlob =
        blob instanceof Blob
          ? blob
          : new Blob([blob], { type: 'application/vnd.ms-excel;charset=utf-8' })
      const url = window.URL.createObjectURL(fileBlob)
      const link = document.createElement('a')

      link.href = url
      link.download = 'production-qc-tasks.xls'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      enqueueSnackbar(t('qc.messages.exportSuccess'), { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      enqueueSnackbar(error?.message || t('qc.messages.exportError'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  const tableColumns = useMemo(
    () =>
      QC_TABLE_COLUMNS.filter((column) => column.id !== 'select').map((column) => ({
        key: column.id,
        label: column.labelKey ? t(column.labelKey) : '',
        width: qcColumnWidths[column.id],
        align: 'left',
      })),
    [t],
  )

  const renderQcCell = useCallback(
    (task, column) => {
      if (column.key === 'orderId') {
        return (
          <Tooltip title={task.orderId}>
            <span className="inline-flex max-w-36">
              <Badge className="border border-primary bg-surface text-primary">
                {task.orderId}
              </Badge>
            </span>
          </Tooltip>
        )
      }

      if (column.key === 'orderDate') {
        return <DateValue value={task.orderDate} language={i18n.language} />
      }
      if (column.key === 'statusOrder') return <QcOrderStatusBadge value={task.statusOrder} t={t} />
      if (column.key === 'shippingType') {
        return <span className="truncate text-sm text-ink-secondary">{task.shippingType}</span>
      }
      if (column.key === 'shop' || column.key === 'seller' || column.key === 'scaleBy') {
        return (
          <Tooltip title={task[column.key]}>
            <span className="block max-w-28 truncate whitespace-nowrap text-sm text-ink-secondary">
              {task[column.key]}
            </span>
          </Tooltip>
        )
      }

      return task[column.key] || '-'
    },
    [i18n.language, t],
  )

  const renderExpandedQcRow = useCallback(
    (task) => (
      <QcDetailPanel
        task={task}
        canReview={canReview}
        decisionLoading={submitQcMutation.isPending}
        onDecision={openDecision}
        onPreview={setPreviewTask}
      />
    ),
    [canReview, openDecision, submitQcMutation.isPending],
  )

  return (
    <>
      <OperationsPageShell
        header={
          <div className="flex min-h-[54px] flex-wrap items-center justify-between gap-4">
            <Typography variant="h5" className="text-xl font-bold text-ink-strong">
              {t('qc.title')}
            </Typography>
            <DateRangePicker
              value={dateRange}
              onChange={(nextRange) => {
                setDateRange(nextRange)
                resetView({ dateRange: nextRange })
              }}
              placeholder={t('qc.filters.dateRange')}
            />
          </div>
        }
        tabs={
          <OperationsTabs
            items={statusTabs.map((tab) => ({
              value: tab.value,
              label: t(tab.labelKey),
              count: counts[tab.value] || 0,
            }))}
            value={statusTab}
            onChange={handleStatusTabChange}
            variant="underline"
          />
        }
        toolbar={
          <OperationsToolbar>
            <div className="grid w-full grid-cols-1 items-center gap-2 md:grid-cols-2 xl:grid-cols-[minmax(220px,1.35fr)_minmax(128px,0.8fr)_minmax(128px,0.8fr)_36px_minmax(140px,auto)_minmax(180px,auto)]">
              <TextField
                size="small"
                value={searchInput}
                onChange={(event) => {
                  const nextSearch = event.target.value
                  setSearchInput(nextSearch)
                  resetView({ search: nextSearch })
                }}
                placeholder={t('qc.searchPlaceholder')}
                className="w-full bg-surface"
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon className="text-ink-muted" fontSize="small" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
              <TextField
                size="small"
                value={sellerInput}
                onChange={(event) => {
                  const nextSeller = event.target.value
                  setSellerInput(nextSeller)
                  resetView({ sellerCode: nextSeller })
                }}
                placeholder={t('qc.filters.sellerCode')}
                className="w-full bg-surface"
                inputProps={{ 'aria-label': t('qc.filters.sellerCode') }}
              />
              <FilterSelect
                value={shopId}
                onChange={(value) => {
                  setShopId(value)
                  resetView({ shopId: value })
                }}
                ariaLabel={t('qc.filters.shop')}
                placeholder={t('qc.filters.shop')}
                options={shopOptions}
                widthClass="w-full"
              />
              <Tooltip title={t('qc.actions.refresh')}>
                <IconButton
                  aria-label={t('qc.actions.refresh')}
                  onClick={() => {
                    tasksQuery.refetch()
                    countsQuery.refetch()
                  }}
                  className="h-10 w-10 rounded-lg border border-border bg-surface text-ink-secondary"
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Button
                variant="outlined"
                disabled={exportTasksMutation.isPending}
                startIcon={<TableChartOutlinedIcon fontSize="small" />}
                onClick={exportTasks}
                className="h-10 rounded-lg border-border bg-neutral-bg px-4 text-sm font-semibold text-ink-muted"
              >
                {t('qc.actions.exportExcel')}
              </Button>
            </div>
          </OperationsToolbar>
        }
        pagination={
          <QcPagination
            page={page}
            pageSize={pageSize}
            total={total}
            onPageChange={(nextPage) => {
              setPage(nextPage)
              replaceQcUrl({ page: nextPage })
            }}
            onPageSizeChange={handlePageSizeChange}
            t={t}
          />
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-3">
          {tasksQuery.isError ? (
            <Alert
              severity="error"
              action={
                <Button color="inherit" size="small" onClick={() => tasksQuery.refetch()}>
                  {t('qc.actions.retry')}
                </Button>
              }
            >
              {tasksQuery.error?.message || t('qc.states.listError')}
            </Alert>
          ) : null}
          <div className="min-h-0 flex-1 overflow-hidden">
            <OperationsTable
              columns={tableColumns}
              rows={tasks}
              loading={tasksQuery.isPending}
              getRowKey={getQcRowKey}
              renderCell={renderQcCell}
              minWidth="1380px"
              emptyTitle={t('qc.states.empty')}
              getRowExpanded={isQcRowExpanded}
              renderExpandedRow={renderExpandedQcRow}
            />
          </div>
        </div>
      </OperationsPageShell>
      <QcDecisionDialog
        open={Boolean(decisionState.task)}
        task={decisionState.task}
        orderId={decisionState.task?.orderId || '-'}
        decision={decisionState.decision}
        note={decisionState.note}
        onNoteChange={(note) => setDecisionState((current) => ({ ...current, note }))}
        onClose={closeDecision}
        onConfirm={submitDecision}
        loading={submitQcMutation.isPending}
      />
      <QcImageReviewDialog
        open={Boolean(previewTask)}
        task={previewTask || {}}
        canReview={canReview}
        canPass={canSubmitQcPass(previewTask || {})}
        canReject={canSubmitQcReject(previewTask || {})}
        decisionLoading={submitQcMutation.isPending}
        onClose={() => setPreviewTask(null)}
        onSubmitDecision={saveQcDecision}
      />
    </>
  )
}
