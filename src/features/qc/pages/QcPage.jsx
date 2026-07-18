import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useLocation } from 'react-router-dom'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import SendIcon from '@mui/icons-material/Send'
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
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { getUserPermissionCodes } from '@/features/auth/utils/authz'
import { productionKeys } from '@/features/production/api/production.keys'
import {
  useExportProductionQcTasksMutation,
  usePushProductionTasksMutation,
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
  getPushableQcTaskIds,
  isSupportedQcStatusTab,
  mapProductionSummaryToQcCounts,
  mapProductionTaskToQcRow,
  readQcDashboardSearch,
} from '@/features/qc/utils/qcApi'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

const platformTabs = [
  { value: QC_PLATFORM_TABS.AMAZON, labelKey: 'qc.platform.amazon' },
  { value: QC_PLATFORM_TABS.ETSY, labelKey: 'qc.platform.etsy' },
]

const statusTabs = [
  { value: QC_STATUS_TABS.ALL, labelKey: 'qc.statusTabs.all' },
  { value: QC_STATUS_TABS.PENDING, labelKey: 'qc.statusTabs.pending' },
  { value: QC_STATUS_TABS.QC_REJECTED, labelKey: 'qc.statusTabs.qcRejected' },
  { value: QC_STATUS_TABS.FAILED, labelKey: 'qc.statusTabs.failed' },
  { value: QC_STATUS_TABS.COMPLETED, labelKey: 'qc.statusTabs.completed' },
  { value: QC_STATUS_TABS.ADDRESS_INVALID, labelKey: 'qc.statusTabs.addressInvalid' },
]

const pageSizeOptions = [10, 20, 50]

const statusClasses = {
  PENDING: 'bg-warning-bg text-warning-strong',
  PASSED: 'bg-success-soft text-success-strong',
  REJECTED: 'bg-danger-bg text-danger',
  NOT_READY: 'bg-neutral-bg text-ink-muted',
  PROCESSING: 'bg-warning-bg text-warning-deep',
  SHIPPED: 'bg-success-soft text-success-strong',
  SENT_TO_VENDOR: 'bg-info-bg text-info-strong',
  READY_TO_SEND_VENDOR: 'bg-success-soft text-success-strong',
  CANCELLED: 'bg-danger-bg text-danger',
  FAILED: 'bg-danger-bg text-danger',
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

function StatusBadge({ value, t }) {
  const label = t(`qc.values.status.${value}`, { defaultValue: humanizeStatus(value) })

  return (
    <Tooltip title={label} disableHoverListener={label.length < 18}>
      <span className="inline-flex max-w-full">
        <Badge
          className={statusClasses[value] || 'border border-border bg-surface text-ink-secondary'}
        >
          {label}
        </Badge>
      </span>
    </Tooltip>
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

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index} className="border-b border-border">
      {QC_TABLE_COLUMNS.map((column) => (
        <td key={column.id} className="px-4 py-3">
          <Skeleton variant="text" height={20} />
        </td>
      ))}
    </tr>
  ))
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
  const queryClient = useQueryClient()
  const currentUser = useAuthStore((state) => state.currentUser)
  const location = useLocation()
  const dashboardSearch = useMemo(() => readQcDashboardSearch(location.search), [location.search])
  const [platform, setPlatform] = useState(
    () => dashboardSearch.platform || QC_PLATFORM_TABS.AMAZON,
  )
  const [statusTab, setStatusTab] = useState(() => dashboardSearch.statusTab || QC_STATUS_TABS.ALL)
  const [shopId, setShopId] = useState(QC_ALL_FILTER)
  const [searchInput, setSearchInput] = useState('')
  const [sellerInput, setSellerInput] = useState('')
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(QC_PAGE_SIZE)
  const [expandedTaskIds, setExpandedTaskIds] = useState(() => new Set())
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
  const pushTasksMutation = usePushProductionTasksMutation()
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
  const canPush = permissionCodes.has('PRODUCTION:WRITE')
  const pushableTaskIds = useMemo(
    () => getPushableQcTaskIds(tasks, selectedTaskIds),
    [selectedTaskIds, tasks],
  )
  const allCurrentRowsSelected =
    tasks.length > 0 && tasks.every((task) => selectedTaskIds.has(task.id))
  const someCurrentRowsSelected = tasks.some((task) => selectedTaskIds.has(task.id))

  function resetView() {
    setPage(1)
    setExpandedTaskIds(new Set())
    setSelectedTaskIds(new Set())
  }

  function handlePlatformChange(nextPlatform) {
    setPlatform(nextPlatform)
    setStatusTab(QC_STATUS_TABS.ALL)
    setShopId(QC_ALL_FILTER)
    setSearchInput('')
    setSellerInput('')
    setDateRange({ start: null, end: null })
    resetView()
  }

  function toggleExpanded(taskId) {
    setExpandedTaskIds((current) => {
      const next = new Set(current)
      if (next.has(taskId)) next.delete(taskId)
      else next.add(taskId)
      return next
    })
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

  async function pushSelectedTasks() {
    try {
      const result = await pushTasksMutation.mutateAsync({ taskIds: pushableTaskIds })
      const variant = result.failed ? SNACKBAR_VARIANTS.WARNING : SNACKBAR_VARIANTS.SUCCESS
      enqueueSnackbar(
        t('qc.messages.pushResult', { succeeded: result.succeeded, failed: result.failed }),
        { variant },
      )
      setSelectedTaskIds(new Set())
    } catch (error) {
      enqueueSnackbar(error?.message || t('qc.messages.pushError'), {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
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

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <header className="flex flex-wrap items-center justify-between gap-4">
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
      </header>

      <div className="mt-6 flex items-center gap-2">
        {platformTabs.map((tab) => {
          const active = platform === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handlePlatformChange(tab.value)}
              className={`h-10 rounded-lg border px-4 text-sm font-semibold ${
                active
                  ? 'border-ink-strong bg-ink-strong text-white'
                  : 'border-border bg-surface text-ink-secondary'
              }`}
            >
              {t(tab.labelKey)}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {statusTabs.map((tab) => {
          const active = statusTab === tab.value
          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => {
                setStatusTab(tab.value)
                resetView()
              }}
              className={`inline-flex h-10 items-center gap-2 rounded-lg border px-4 text-sm font-semibold ${
                active
                  ? 'border-primary bg-primary text-white'
                  : 'border-border bg-surface text-ink-secondary'
              }`}
            >
              <span>{t(tab.labelKey)}</span>
              <span
                className={`inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-xs ${
                  active ? 'bg-white text-primary' : 'bg-neutral-bg text-ink-muted'
                }`}
              >
                {counts[tab.value] || 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <TextField
            size="small"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetView()
            }}
            placeholder={t('qc.searchPlaceholder')}
            className="w-52 bg-surface"
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
            className="w-32 bg-surface"
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
            widthClass="w-32"
          />
          <Tooltip title={t('qc.actions.refresh')}>
            <IconButton
              aria-label={t('qc.actions.refresh')}
              onClick={() => queryClient.invalidateQueries({ queryKey: productionKeys.all })}
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
          <Tooltip
            title={canPush ? t('qc.actions.pushHint') : t('qc.actions.noProductionWritePermission')}
          >
            <span>
              <Button
                variant="outlined"
                disabled={!canPush || pushableTaskIds.length === 0 || pushTasksMutation.isPending}
                startIcon={<SendIcon fontSize="small" />}
                onClick={pushSelectedTasks}
                className="h-10 rounded-lg border-border px-4 text-sm font-semibold"
              >
                {t('qc.actions.pushFulfillment', { count: pushableTaskIds.length })}
              </Button>
            </span>
          </Tooltip>
        </div>

        <QcPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={(nextPage) => {
            setPage(nextPage)
            setExpandedTaskIds(new Set())
            setSelectedTaskIds(new Set())
          }}
          onPageSizeChange={(nextPageSize) => {
            setPageSize(nextPageSize)
            resetView()
          }}
          t={t}
        />
      </div>

      {!supportedStatusTab ? (
        <Alert severity="info" className="mt-4">
          {t('qc.states.unsupportedStatusFilter')}
        </Alert>
      ) : null}
      {tasksQuery.isError && supportedStatusTab ? (
        <Alert
          severity="error"
          className="mt-4"
          action={
            <Button color="inherit" size="small" onClick={() => tasksQuery.refetch()}>
              {t('qc.actions.retry')}
            </Button>
          }
        >
          {tasksQuery.error?.message || t('qc.states.listError')}
        </Alert>
      ) : null}

      <section className="mt-4 overflow-x-auto rounded-lg border border-border bg-surface">
        <table className="min-w-full table-fixed border-collapse">
          <thead className="bg-surface-subtle">
            <tr>
              {QC_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="h-12 whitespace-nowrap px-3 text-left text-xs font-semibold uppercase text-ink-muted"
                >
                  {column.id === 'select' ? (
                    <Checkbox
                      size="small"
                      checked={allCurrentRowsSelected}
                      indeterminate={!allCurrentRowsSelected && someCurrentRowsSelected}
                      onChange={toggleAllCurrentRows}
                      inputProps={{ 'aria-label': t('qc.actions.selectAll') }}
                    />
                  ) : column.labelKey ? (
                    t(column.labelKey)
                  ) : null}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tasksQuery.isPending && supportedStatusTab ? <LoadingRows /> : null}
            {!tasksQuery.isPending && tasks.length === 0 ? (
              <tr>
                <td colSpan={QC_TABLE_COLUMNS.length} className="h-32 text-center">
                  <Typography variant="body2" className="text-sm text-ink-muted">
                    {t('qc.states.empty')}
                  </Typography>
                </td>
              </tr>
            ) : null}
            {!tasksQuery.isPending
              ? tasks.map((task) => {
                  const expanded = expandedTaskIds.has(task.id)
                  const selected = selectedTaskIds.has(task.id)

                  return (
                    <Fragment key={task.id}>
                      <tr
                        className={`border-b border-border ${
                          expanded || selected ? 'bg-primary-subtle' : 'bg-surface'
                        }`}
                      >
                        <td className="h-14 w-12 whitespace-nowrap px-2">
                          <IconButton
                            aria-label={
                              expanded ? t('qc.actions.collapse') : t('qc.actions.expand')
                            }
                            size="small"
                            onClick={() => toggleExpanded(task.id)}
                            className={expanded ? 'text-primary' : 'text-ink-muted'}
                          >
                            <KeyboardArrowDownIcon
                              className={expanded ? 'rotate-180' : ''}
                              fontSize="small"
                            />
                          </IconButton>
                        </td>
                        <td className="h-14 w-12 whitespace-nowrap px-2">
                          <Checkbox
                            size="small"
                            checked={selected}
                            onChange={() => toggleSelected(task.id)}
                            inputProps={{
                              'aria-label': t('qc.actions.selectOrder', { orderId: task.orderId }),
                            }}
                          />
                        </td>
                        <td className="h-14 min-w-32 px-3">
                          <Tooltip title={task.orderId}>
                            <span className="inline-flex max-w-36">
                              <Badge className="border border-primary bg-surface text-primary">
                                {task.orderId}
                              </Badge>
                            </span>
                          </Tooltip>
                        </td>
                        <td className="h-14 whitespace-nowrap px-3">
                          <StatusBadge value={task.statusQc} t={t} />
                        </td>
                        <td className="h-14 whitespace-nowrap px-3">
                          <DateValue value={task.createdAt} language={i18n.language} />
                        </td>
                        <td className="h-14 whitespace-nowrap px-3">
                          <DateValue value={task.orderDate} language={i18n.language} />
                        </td>
                        <td className="h-14 whitespace-nowrap px-3">
                          <StatusBadge value={task.statusOrder} t={t} />
                        </td>
                        <td className="h-14 whitespace-nowrap px-3">
                          <StatusBadge value={task.shippingType} t={t} />
                        </td>
                        <td className="h-14 min-w-24 px-3">
                          <Tooltip title={task.shop}>
                            <span className="block max-w-28 truncate text-sm text-ink-secondary">
                              {task.shop}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="h-14 min-w-24 px-3">
                          <Tooltip title={task.scaleBy}>
                            <span className="block max-w-28 truncate whitespace-nowrap text-sm text-ink-secondary">
                              {task.scaleBy}
                            </span>
                          </Tooltip>
                        </td>
                        <td className="h-14 min-w-24 px-3">
                          <Tooltip title={task.qcBy}>
                            <span className="block max-w-28 truncate whitespace-nowrap text-sm text-ink-secondary">
                              {task.qcBy}
                            </span>
                          </Tooltip>
                        </td>
                      </tr>
                      {expanded ? (
                        <tr>
                          <td className="p-0" colSpan={QC_TABLE_COLUMNS.length}>
                            <QcDetailPanel
                              task={task}
                              canReview={canReview}
                              decisionLoading={submitQcMutation.isPending}
                              onDecision={openDecision}
                              onPreviewDecision={saveQcDecision}
                            />
                          </td>
                        </tr>
                      ) : null}
                    </Fragment>
                  )
                })
              : null}
          </tbody>
        </table>
      </section>

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
    </div>
  )
}
