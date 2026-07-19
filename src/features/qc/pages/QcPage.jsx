import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
import {
  Alert,
  Button,
  Checkbox,
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
import {
  QC_ALL_FILTER,
  QC_PAGE_SIZE,
  QC_PLATFORM_TABS,
  QC_STATUS_TABS,
  QC_TABLE_COLUMNS,
} from '@/features/qc/constants/qcConstants'
import {
  buildQcExportQuery,
  buildQcSummaryQuery,
  buildQcTaskQuery,
  isSupportedQcStatusTab,
  mapProductionSummaryToQcCounts,
  mapProductionTaskToQcRow,
  readQcDashboardSearch,
} from '@/features/qc/utils/qcApi'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

const statusTabs = [{ value: QC_STATUS_TABS.PENDING, labelKey: 'qc.statusTabs.pending' }]

const pageSizeOptions = [10, 20, 50]

const qcColumnWidths = {
  select: '48px',
  orderId: '180px',
  orderDate: '150px',
  statusOrder: '150px',
  shippingType: '140px',
  shop: '130px',
  seller: '150px',
  scaleBy: '150px',
}

function getPositiveUrlParam(search, key, fallback) {
  const value = Number(new URLSearchParams(search).get(key))
  return Number.isInteger(value) && value > 0 ? value : fallback
}

function updateQcPaginationUrl(page, pageSize) {
  const params = new URLSearchParams(window.location.search)
  if (page > 1) params.set('page', String(page))
  else params.delete('page')
  if (pageSize !== QC_PAGE_SIZE) params.set('limit', String(pageSize))
  else params.delete('limit')

  const query = params.toString()
  window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
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
  const statusTab = QC_STATUS_TABS.PENDING
  const [shopId, setShopId] = useState(QC_ALL_FILTER)
  const [searchInput, setSearchInput] = useState('')
  const [sellerInput, setSellerInput] = useState('')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [page, setPage] = useState(() => getPositiveUrlParam(location.search, 'page', 1))
  const [pageSize, setPageSize] = useState(() =>
    getPositiveUrlParam(location.search, 'limit', QC_PAGE_SIZE),
  )
  const [selectedTaskIds, setSelectedTaskIds] = useState(() => new Set())
  const [decisionState, setDecisionState] = useState({
    decision: null,
    note: '',
    task: null,
  })
  const debouncedSearch = useDebounce(searchInput, 300)
  const debouncedSeller = useDebounce(sellerInput, 300)
  const supportedStatusTab = isSupportedQcStatusTab(statusTab)

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
  const tasksQuery = useProductionTasksQuery(taskQuery, { enabled: supportedStatusTab })
  const countsQuery = useProductionSummaryQuery(summaryQuery)
  const shopsQuery = useProductionShopsQuery({ page: 1, limit: 100 })
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
      supportedStatusTab
        ? (tasksQuery.data?.items || []).map((task) =>
            mapProductionTaskToQcRow(task, { shopNameById }),
          )
        : [],
    [shopNameById, supportedStatusTab, tasksQuery.data],
  )
  const counts = useMemo(() => mapProductionSummaryToQcCounts(countsQuery.data), [countsQuery.data])
  const total = supportedStatusTab ? Number(tasksQuery.data?.total) || 0 : 0
  const permissionCodes = useMemo(() => new Set(getUserPermissionCodes(currentUser)), [currentUser])
  const canReview = permissionCodes.has('PRODUCTION:WRITE') || permissionCodes.has('DESIGN:REVIEW')
  const allCurrentRowsSelected =
    tasks.length > 0 && tasks.every((task) => selectedTaskIds.has(task.id))
  const someCurrentRowsSelected = tasks.some((task) => selectedTaskIds.has(task.id))

  function resetView() {
    setPage(1)
    updateQcPaginationUrl(1, pageSize)
    setSelectedTaskIds(new Set())
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    setPage(1)
    updateQcPaginationUrl(1, nextPageSize)
    setSelectedTaskIds(new Set())
  }

  function toggleSelected(taskId) {
    setSelectedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
  }

  function toggleAllCurrentRows() {
    setSelectedTaskIds((current) => {
      const next = new Set(current)
      tasks.forEach((task) => {
        if (allCurrentRowsSelected) next.delete(task.id)
        else next.add(task.id)
      })
      return next
    })
  }

  function openDecision(task, decision) {
    setDecisionState({ task, decision, note: '' })
  }

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
      setSelectedTaskIds(new Set())
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

  const tableColumns = QC_TABLE_COLUMNS.map((column) => ({
    key: column.id,
    label:
      column.id === 'select' ? (
        <Checkbox
          size="small"
          checked={allCurrentRowsSelected}
          indeterminate={!allCurrentRowsSelected && someCurrentRowsSelected}
          onChange={toggleAllCurrentRows}
          inputProps={{ 'aria-label': t('qc.actions.selectAll') }}
        />
      ) : column.labelKey ? (
        t(column.labelKey)
      ) : (
        ''
      ),
    width: qcColumnWidths[column.id],
    align: column.id === 'select' ? 'center' : 'left',
    cellPaddingClass: column.id === 'select' ? 'px-2 py-0' : undefined,
  }))

  function renderQcCell(task, column) {
    const selected = selectedTaskIds.has(task.id)

    if (column.key === 'select') {
      return (
        <Checkbox
          size="small"
          checked={selected}
          onChange={() => toggleSelected(task.id)}
          inputProps={{
            'aria-label': t('qc.actions.selectOrder', { orderId: task.orderId }),
          }}
        />
      )
    }

    if (column.key === 'orderId') {
      return (
        <Tooltip title={task.orderId}>
          <span className="inline-flex max-w-36">
            <Badge className="border border-primary bg-surface text-primary">{task.orderId}</Badge>
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
  }

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
                resetView()
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
                  setSearchInput(event.target.value)
                  resetView()
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
                  setSellerInput(event.target.value)
                  resetView()
                }}
                placeholder={t('qc.filters.sellerCode')}
                className="w-full bg-surface"
                inputProps={{ 'aria-label': t('qc.filters.sellerCode') }}
              />
              <FilterSelect
                value={shopId}
                onChange={(value) => {
                  setShopId(value)
                  resetView()
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
                    if (supportedStatusTab) tasksQuery.refetch()
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
                {t('qc.actions.exportExcel', { count: selectedTaskIds.size })}
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
              updateQcPaginationUrl(nextPage, pageSize)
              setSelectedTaskIds(new Set())
            }}
            onPageSizeChange={handlePageSizeChange}
            t={t}
          />
        }
      >
        <div className="flex h-full min-h-0 flex-col gap-3">
          {!supportedStatusTab ? (
            <Alert severity="info">{t('qc.states.unsupportedStatusFilter')}</Alert>
          ) : null}
          {tasksQuery.isError && supportedStatusTab ? (
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
              loading={tasksQuery.isPending && supportedStatusTab}
              getRowKey={(task) => task.id}
              renderCell={renderQcCell}
              minWidth="1380px"
              emptyTitle={
                supportedStatusTab ? t('qc.states.empty') : t('qc.states.unsupportedStatusFilter')
              }
              getRowExpanded={() => true}
              getRowClassName={(task) => (selectedTaskIds.has(task.id) ? 'bg-primary-subtle' : '')}
              renderExpandedRow={(task) => (
                <QcDetailPanel
                  task={task}
                  canReview={canReview}
                  decisionLoading={submitQcMutation.isPending}
                  onDecision={openDecision}
                  onPreviewDecision={saveQcDecision}
                />
              )}
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
    </>
  )
}
