import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  Skeleton,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'
import { useQueryClient } from '@tanstack/react-query'
import { useSnackbar } from 'notistack'

import { SNACKBAR_VARIANTS } from '@/constants/app'
import { scaleKeys } from '@/features/scale/api/scale.keys'
import {
  useAssignEtsyScaleTaskCsMutation,
  useAssignScaleTaskCsMutation,
  useUpdateEtsyScaleTaskMockupsMutation,
  useUpdateEtsyScaleTaskNoteMutation,
  useUpdateScaleTaskMockupsMutation,
  useUpdateScaleTaskNoteMutation,
} from '@/features/scale/api/scale.mutations'
import { useEtsyScaleTasksQuery, useScaleGroupTasksQuery } from '@/features/scale/api/scale.queries'
import {
  CS_STATUSES,
  ETSY_EXPANDED_TASK_ID,
  SCALE_ALL_FILTER,
  SCALE_PAGE_SIZE,
  SCALE_STATUS_TABS,
  SCALE_STATUSES,
  SCALE_SUB_TABS,
  SCALE_TABLE_COLUMNS,
} from '@/features/scale/constants/scaleConstants'
import { useDebounce } from '@/hooks/useDebounce'

const tableGridClass =
  'grid-cols-[40px_130px_160px_130px_120px_130px_110px_145px_140px_120px_220px_191px]'

const groupStatusTabs = [
  { value: SCALE_STATUS_TABS.ALL, labelKey: 'scale.statusTabs.all' },
  { value: SCALE_STATUS_TABS.CS_UNASSIGNED, labelKey: 'scale.statusTabs.csUnassigned' },
  { value: SCALE_STATUS_TABS.NEED_SCALE, labelKey: 'scale.statusTabs.needScale' },
  { value: SCALE_STATUS_TABS.PENDING, labelKey: 'scale.statusTabs.pending' },
  { value: SCALE_STATUS_TABS.COMPLETED, labelKey: 'scale.statusTabs.completed' },
  { value: SCALE_STATUS_TABS.QC_REJECTED, labelKey: 'scale.statusTabs.qcRejected' },
]

const etsyStatusTabs = [
  { value: SCALE_STATUS_TABS.ALL, labelKey: 'scale.statusTabs.all' },
  { value: SCALE_STATUS_TABS.NEED_SCALE, labelKey: 'scale.statusTabs.needScale' },
  { value: SCALE_STATUS_TABS.PENDING, labelKey: 'scale.statusTabs.pending' },
  { value: SCALE_STATUS_TABS.COMPLETED, labelKey: 'scale.statusTabs.completed' },
  { value: SCALE_STATUS_TABS.QC_REJECTED, labelKey: 'scale.statusTabs.qcRejected' },
]

const subTabs = [
  { value: SCALE_SUB_TABS.GROUP_TASK, labelKey: 'scale.subTabs.groupTask' },
  { value: SCALE_SUB_TABS.ETSY_TASKS, labelKey: 'scale.subTabs.etsyTasks' },
]

const groupFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  seller: SCALE_ALL_FILTER,
  csBy: SCALE_ALL_FILTER,
  csStatus: SCALE_ALL_FILTER,
}

const etsyFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  vendor: SCALE_ALL_FILTER,
  orderStatus: SCALE_ALL_FILTER,
  scaleBy: SCALE_ALL_FILTER,
  qcByCs: SCALE_ALL_FILTER,
  scaleFile: SCALE_ALL_FILTER,
}

const statusBadgeClasses = {
  [SCALE_STATUSES.NEED_SCALE]: 'bg-warning-bg text-warning-strong',
  [SCALE_STATUSES.SENT]: 'bg-info-bg text-info-strong',
  [SCALE_STATUSES.PENDING]: 'bg-warning-bg text-warning-strong',
  [SCALE_STATUSES.COMPLETED]: 'bg-success-soft text-success-strong',
  [SCALE_STATUSES.QC_REJECTED]: 'bg-danger-bg text-danger',
}

const csStatusBadgeClasses = {
  [CS_STATUSES.UNASSIGNED]: 'bg-neutral-bg text-ink-secondary',
  [CS_STATUSES.ASSIGNED]: 'bg-secondary-light text-secondary',
  [CS_STATUSES.PENDING]: 'bg-warning-bg text-warning-strong',
  [CS_STATUSES.COMPLETED]: 'bg-success-soft text-success-strong',
  'In Review': 'bg-warning-bg text-warning-deep',
  Assigned: 'bg-success-soft text-success-strong',
  Done: 'bg-success-soft text-success-strong',
  'No data': 'bg-neutral-bg text-ink-muted',
}

const pillClassByValue = {
  Standard: 'border border-border bg-surface text-ink-secondary',
  Express: 'border border-border bg-surface text-ink-secondary',
  Acct: 'bg-warning-bg text-warning-deep',
  Acct2: 'bg-warning-bg text-warning-deep',
  Main: 'bg-info-bg text-info-strong',
  Shipped: 'bg-success-soft text-success-strong',
  Delivered: 'bg-success-soft text-success-strong',
  Processing: 'bg-warning-bg text-warning-deep',
  Nam: 'bg-violet-bg text-violet-strong',
  Duc: 'bg-violet-bg text-violet-strong',
  Hoa: 'bg-success-soft text-success-strong',
  Lan: 'bg-pink-bg text-pink-strong',
  Mai: 'bg-pink-bg text-pink-strong',
  Tuan: 'bg-info-bg text-info-strong',
}

function getStatusLabelKey(status) {
  return `scale.values.scaleStatus.${status || 'unknown'}`
}

function getCsStatusLabelKey(status) {
  return `scale.values.csStatus.${status || 'unknown'}`
}

function getSelectTextClass(value) {
  return value === SCALE_ALL_FILTER ? 'text-ink-muted' : 'text-ink'
}

function getCsName(csUsers = [], csBy) {
  return csUsers.find((user) => user.id === csBy)?.name || csBy || '-'
}

function toOption(value) {
  return { value, label: value }
}

function getGroupFilters(options, t) {
  return [
    {
      key: 'shop',
      placeholder: t('scale.filters.shop'),
      options: (options.shops || []).map(toOption),
    },
    {
      key: 'seller',
      placeholder: t('scale.filters.seller'),
      options: (options.sellers || []).map(toOption),
    },
    {
      key: 'csBy',
      placeholder: t('scale.filters.csBy'),
      options: (options.csUsers || []).map((user) => ({ value: user.id, label: user.name })),
    },
    {
      key: 'csStatus',
      placeholder: t('scale.filters.csStatus'),
      options: (options.csStatuses || []).map((status) => ({
        value: status,
        label: t(getCsStatusLabelKey(status)),
      })),
    },
  ]
}

function getEtsyFilters(options, t) {
  return [
    {
      key: 'shop',
      placeholder: t('scale.etsy.filters.shop'),
      options: (options.shops || []).map(toOption),
    },
    {
      key: 'vendor',
      placeholder: t('scale.etsy.filters.vendor'),
      options: (options.vendors || []).map(toOption),
    },
    {
      key: 'orderStatus',
      placeholder: t('scale.etsy.filters.orderStatus'),
      options: (options.orderStatuses || []).map(toOption),
    },
    {
      key: 'scaleBy',
      placeholder: t('scale.etsy.filters.scaleBy'),
      options: (options.scaleBy || []).map(toOption),
    },
    {
      key: 'qcByCs',
      placeholder: t('scale.etsy.filters.qcByCs'),
      options: (options.qcByCs || []).map(toOption),
    },
    {
      key: 'scaleFile',
      placeholder: t('scale.etsy.filters.scaleFile'),
      options: (options.scaleFiles || []).map(toOption),
    },
  ]
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

function FilterSelect({
  value,
  onChange,
  ariaLabel,
  placeholder,
  options,
  widthClass = 'min-w-[120px]',
}) {
  return (
    <FormControl size="small" className={widthClass}>
      <Select
        displayEmpty
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 rounded-lg bg-surface text-sm ${getSelectTextClass(value)}`}
        inputProps={{ 'aria-label': ariaLabel }}
        renderValue={(selected) => {
          if (selected === SCALE_ALL_FILTER) return placeholder
          return options.find((option) => option.value === selected)?.label || selected
        }}
      >
        <MenuItem value={SCALE_ALL_FILTER}>{placeholder}</MenuItem>
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <div
      key={index}
      className={`grid h-14 items-center border-b border-border px-4 ${tableGridClass}`}
    >
      {SCALE_TABLE_COLUMNS.map((column) => (
        <div key={column.id} className="px-2">
          <Skeleton variant="text" height={20} />
        </div>
      ))}
    </div>
  ))
}

function DetailHeading({ children }) {
  return (
    <Typography variant="caption" className="text-[10px] font-semibold uppercase text-ink-muted">
      {children}
    </Typography>
  )
}

function EtsyReadonlyField({ label, value, widthClass = 'w-[70px]', muted = false }) {
  return (
    <>
      <Typography variant="caption" className="text-[10px] text-ink-muted">
        {label}
      </Typography>
      <div
        className={`flex items-center rounded border border-teal bg-surface px-[10px] py-1 ${widthClass}`}
      >
        <span
          className={`truncate text-xs ${muted ? 'text-ink-muted' : 'font-semibold text-teal'}`}
        >
          {value}
        </span>
      </div>
    </>
  )
}

function EtsyNoteBox({ label, value, onChange, onBlur, danger = false, heightClass = 'h-[52px]' }) {
  return (
    <>
      <Typography variant="caption" className="text-[10px] text-ink-muted">
        {label}
      </Typography>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        className={`${heightClass} w-full resize-none rounded border border-border bg-surface px-[10px] py-2 text-[11px] outline-none ${danger ? 'text-danger' : 'text-ink-muted'}`}
      />
    </>
  )
}

function EtsyCustomizationValue({ item }) {
  if (item.type === 'link') {
    return (
      <a
        href={item.url}
        target="_blank"
        rel="noreferrer"
        className="truncate text-right text-[13px] font-light text-link-blue underline"
      >
        {item.value}
      </a>
    )
  }

  if (item.type === 'danger') {
    return (
      <span className="truncate text-right text-[13px] font-light text-danger">{item.value}</span>
    )
  }

  if (item.type === 'image') {
    return (
      <div className="mt-2 flex h-[82px] w-[82px] items-center justify-center rounded bg-neutral-bg">
        <ImageOutlinedIcon className="text-ink-muted" fontSize="medium" />
      </div>
    )
  }

  return (
    <span className="truncate text-right text-[13px] font-light text-link-blue">{item.value}</span>
  )
}

function ScaleDetailPanel({
  task,
  getNoteValue,
  onNoteChange,
  onSaveNote,
  onUploadMockup,
  onAddMockup,
  onDeleteMockup,
  t,
}) {
  const { detail } = task

  return (
    <div className="border-b border-border/60 bg-surface-subtle px-5 py-6">
      <div className="grid min-w-[1540px] grid-cols-[230px_390px_133px_220px_220px_280px] gap-6 py-3">
        <section className="flex w-[230px] flex-col items-start gap-2">
          <DetailHeading>{t('scale.detail.productInfo')}</DetailHeading>
          <div className="flex h-[106px] w-[106px] items-center justify-center rounded-md border border-sky-border bg-sky-soft">
            <ImageOutlinedIcon className="text-info-strong !text-[36px]" />
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-[28px] border border-teal bg-surface px-3 text-[11px] text-teal">
              {detail.product.primaryCode}
            </Badge>
            <Badge className="h-[28px] bg-pink-bg px-3 text-[13px] text-pink-strong">
              {t('scale.etsy.psdStatus.normal')}
            </Badge>
          </div>
          <Badge className="h-[28px] border border-teal bg-surface px-3 text-[11px] text-teal">
            {detail.product.secondaryCode}
          </Badge>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            className="h-[28px] rounded-full border-success px-3 text-[13px] font-semibold text-success"
          >
            {t('scale.etsy.actions.downloadPsd')}
          </Button>
        </section>

        <section className="flex w-[390px] flex-col gap-3">
          <DetailHeading>{t('scale.detail.customization')}</DetailHeading>
          <div className="space-y-[4px]">
            {detail.customization.map((item, index) => (
              <div
                key={`${item.label}-${index}`}
                className={`flex items-start justify-between gap-4 ${item.type === 'image' ? 'min-h-[84px]' : 'min-h-[18px]'}`}
              >
                <span className="shrink-0 text-[13px] font-bold text-ink-detail">{item.label}</span>
                <EtsyCustomizationValue item={item} />
              </div>
            ))}
          </div>
        </section>

        <section className="flex w-[133px] flex-col items-center gap-3">
          <DetailHeading>{t('scale.detail.taskStatus')}</DetailHeading>
          <span className="rounded-md bg-success-soft px-3 py-[5px] text-[13px] font-semibold text-success">
            {t('scale.etsy.taskStatus.complete')}
          </span>
        </section>

        <section className="flex w-[220px] flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.costCenter')}</DetailHeading>
          <div className="flex w-full flex-col gap-1">
            <EtsyReadonlyField
              label={t('scale.etsy.costCenter.vendorProduct')}
              value={detail.costCenter.vendorProduct}
              widthClass="w-full"
            />
            <EtsyReadonlyField
              label={t('scale.etsy.costCenter.size')}
              value={detail.costCenter.size}
            />
          </div>
        </section>

        <section className="flex w-[220px] flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.csNote')}</DetailHeading>
          <div className="flex w-full flex-col gap-1">
            <EtsyNoteBox
              label={t('scale.etsy.notes.cs')}
              value={getNoteValue(task, 'cs')}
              onChange={(value) => onNoteChange(task.id, 'cs', value)}
              onBlur={() => onSaveNote(task, 'cs')}
              danger
            />
            <EtsyNoteBox
              label={t('scale.etsy.notes.qc')}
              value={getNoteValue(task, 'qc')}
              onChange={(value) => onNoteChange(task.id, 'qc', value)}
              onBlur={() => onSaveNote(task, 'qc')}
            />
          </div>
        </section>

        <section className="flex w-[280px] flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.action')}</DetailHeading>
          <div className="flex flex-col gap-1.5">
            <div className="flex w-[191px] gap-1.5">
              <Button
                component="label"
                variant="outlined"
                size="small"
                startIcon={<CloudUploadOutlinedIcon className="text-[12px]" />}
                className="h-7 w-[92.5px] rounded border-border px-[10px] text-xs font-normal text-ink-action"
              >
                {t('scale.etsy.actions.upload')}
                <input
                  hidden
                  type="file"
                  accept="image/*"
                  onChange={(event) => onUploadMockup(task, event.target.files?.[0])}
                />
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<AddIcon className="text-[12px]" />}
                onClick={() => onAddMockup(task)}
                className="h-7 w-[92.5px] rounded border-border px-[10px] text-xs font-bold text-ink-action"
              >
                {t('scale.etsy.actions.add')}
              </Button>
            </div>
            <div className="flex gap-4">
              {(detail.mockups || []).slice(0, 2).map((mockup) => (
                <div key={mockup.id || mockup.url} className="flex flex-col gap-1">
                  <span className="text-[10px] text-ink-muted">{mockup.label}</span>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => window.open(mockup.url, '_blank', 'noopener,noreferrer')}
                      className="flex h-[112px] w-[112px] items-center justify-center rounded-md border border-sky-border bg-sky-soft text-info-strong"
                    >
                      <ImageOutlinedIcon className="!text-[28px]" />
                    </button>
                    <IconButton
                      aria-label={t('scale.actions.deleteMockup')}
                      size="small"
                      onClick={() => onDeleteMockup(task, mockup.url)}
                      className="!absolute -right-2 -top-2 h-6 w-6 bg-danger text-white shadow-sm"
                    >
                      <DeleteOutlineOutlinedIcon fontSize="inherit" />
                    </IconButton>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}

function renderOrderDate(task, activeSubTab) {
  if (activeSubTab === SCALE_SUB_TABS.ETSY_TASKS) {
    return (
      <div className="flex min-w-0 flex-col gap-0.5">
        <span className="truncate text-[13px] text-ink-strong">{task.orderDate.date}</span>
        <span className="truncate text-[11px] text-ink-muted">{task.orderDate.relative}</span>
      </div>
    )
  }

  return <span className="truncate text-ink-secondary">{task.orderDate}</span>
}

function renderPill(value, fallbackClass = 'border border-border bg-surface text-ink-secondary') {
  return <Badge className={pillClassByValue[value] || fallbackClass}>{value}</Badge>
}

function ScalePagination({ page, totalPages, onPageChange, t }) {
  const pages = [1, 2, 3, 4].filter((pageNumber) => pageNumber <= totalPages)

  return (
    <div className="flex items-center gap-1.5">
      <IconButton
        aria-label={t('scale.pagination.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-[30px] w-[30px] rounded border border-border"
      >
        <KeyboardArrowLeftIcon fontSize="small" />
      </IconButton>
      {pages.map((pageNumber) => {
        const active = page === pageNumber

        return (
          <button
            key={pageNumber}
            type="button"
            onClick={() => onPageChange(pageNumber)}
            className={`h-[30px] w-[30px] rounded border text-[13px] ${
              active
                ? 'border-danger bg-primary-light font-bold text-danger'
                : 'border-border bg-surface font-semibold text-ink-secondary'
            }`}
          >
            {pageNumber}
          </button>
        )
      })}
      {totalPages >= 4 ? <span className="px-1 text-[13px] text-ink-muted">...</span> : null}
      <IconButton
        aria-label={t('scale.pagination.next')}
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
        className="h-[30px] w-[30px] rounded border border-border"
      >
        <KeyboardArrowRightIcon fontSize="small" />
      </IconButton>
    </div>
  )
}

export default function ScalePage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [activeSubTab, setActiveSubTab] = useState(SCALE_SUB_TABS.GROUP_TASK)
  const [statusTab, setStatusTab] = useState(SCALE_STATUS_TABS.ALL)
  const [groupFilters, setGroupFilters] = useState(groupFiltersInitialState)
  const [etsyFilters, setEtsyFilters] = useState(etsyFiltersInitialState)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(1)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})

  const isEtsyTab = activeSubTab === SCALE_SUB_TABS.ETSY_TASKS
  const activeFilters = isEtsyTab ? etsyFilters : groupFilters

  const query = useMemo(
    () => ({
      statusTab,
      search: debouncedSearch,
      ...activeFilters,
      page,
      pageSize: SCALE_PAGE_SIZE,
    }),
    [activeFilters, debouncedSearch, page, statusTab],
  )

  const groupQuery = useScaleGroupTasksQuery(query, {
    enabled: !isEtsyTab,
  })
  const etsyQuery = useEtsyScaleTasksQuery(query, {
    enabled: isEtsyTab,
  })
  const activeQuery = isEtsyTab ? etsyQuery : groupQuery

  const assignCsMutation = useAssignScaleTaskCsMutation()
  const assignEtsyCsMutation = useAssignEtsyScaleTaskCsMutation()
  const updateNoteMutation = useUpdateScaleTaskNoteMutation()
  const updateEtsyNoteMutation = useUpdateEtsyScaleTaskNoteMutation()
  const updateMockupsMutation = useUpdateScaleTaskMockupsMutation()
  const updateEtsyMockupsMutation = useUpdateEtsyScaleTaskMockupsMutation()

  const data = activeQuery.data
  const tasks = data?.items || []
  const counts = data?.counts || {}
  const options = data?.options || {}
  const total = data?.total || 0
  const totalPages = Math.max(Math.ceil(total / SCALE_PAGE_SIZE), 1)
  const filters = isEtsyTab ? getEtsyFilters(options, t) : getGroupFilters(options, t)
  const statusTabs = isEtsyTab ? etsyStatusTabs : groupStatusTabs
  const titleKey = isEtsyTab ? 'scale.etsy.title' : 'scale.title'
  const dateRangeLabel = isEtsyTab ? t('scale.etsy.dateRange') : t('scale.dateRange.today')

  function resetPageAndExpand(nextPage = 1) {
    setPage(nextPage)
    setExpandedTaskId(isEtsyTab ? ETSY_EXPANDED_TASK_ID : null)
  }

  function handleSubTabChange(nextSubTab) {
    setActiveSubTab(nextSubTab)
    setStatusTab(SCALE_STATUS_TABS.ALL)
    setSearchInput('')
    setPage(1)
    setGroupFilters(groupFiltersInitialState)
    setEtsyFilters(etsyFiltersInitialState)
    setExpandedTaskId(nextSubTab === SCALE_SUB_TABS.ETSY_TASKS ? ETSY_EXPANDED_TASK_ID : null)
  }

  function updateFilter(key, value) {
    if (isEtsyTab) {
      setEtsyFilters((current) => ({ ...current, [key]: value }))
    } else {
      setGroupFilters((current) => ({ ...current, [key]: value }))
    }
    resetPageAndExpand()
  }

  function handleStatusTabChange(nextStatusTab) {
    setStatusTab(nextStatusTab)
    resetPageAndExpand()
  }

  function handleAssignCs(taskId, csBy) {
    const mutation = isEtsyTab ? assignEtsyCsMutation : assignCsMutation

    mutation.mutate(
      { taskId, csBy },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.assignSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
      },
    )
  }

  function getNoteDraftKey(taskId, noteType) {
    return `${taskId}:${noteType}`
  }

  function handleNoteChange(taskId, noteType, value) {
    setNoteDrafts((current) => ({ ...current, [getNoteDraftKey(taskId, noteType)]: value }))
  }

  function getNoteValue(task, noteType = 'cs') {
    const key = getNoteDraftKey(task.id, noteType)
    if (Object.hasOwn(noteDrafts, key)) return noteDrafts[key]

    return task.detail.notes?.[noteType] || (noteType === 'cs' ? task.detail.csNote || '' : '')
  }

  function handleSaveNote(task, noteType = 'cs') {
    const mutation = isEtsyTab ? updateEtsyNoteMutation : updateNoteMutation
    const payload = isEtsyTab
      ? { taskId: task.id, noteType, note: getNoteValue(task, noteType) }
      : { taskId: task.id, noteType, note: getNoteValue(task, noteType) }

    mutation.mutate(payload, {
      onSuccess: () => {
        enqueueSnackbar(t('scale.messages.noteSuccess'), { variant: SNACKBAR_VARIANTS.SUCCESS })
      },
    })
  }

  function updateMockups(task, mockups) {
    const mutation = isEtsyTab ? updateEtsyMockupsMutation : updateMockupsMutation

    mutation.mutate(
      { taskId: task.id, mockups },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.uploadSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
      },
    )
  }

  function handleUploadMockup(task, file) {
    if (!file) return

    const mockups = [
      ...(task.detail.mockups || []),
      {
        id: `${task.id}-${Date.now()}`,
        label: file.name,
        name: file.name,
        url: URL.createObjectURL(file),
      },
    ]
    updateMockups(task, mockups)
  }

  function handleAddMockup(task) {
    const mockups = [
      ...(task.detail.mockups || []),
      {
        id: `${task.id}-mockup-${Date.now()}`,
        label: t('scale.etsy.actions.addedMockup'),
        url: 'https://example.test/mockup.jpg',
      },
    ]
    updateMockups(task, mockups)
  }

  function handleDeleteMockup(task, url) {
    const mockups = (task.detail.mockups || []).filter((mockup) => mockup.url !== url)
    const mutation = isEtsyTab ? updateEtsyMockupsMutation : updateMockupsMutation

    mutation.mutate(
      { taskId: task.id, mockups },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.deleteMockupSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
      },
    )
  }

  function renderDetailPanel(task) {
    return (
      <ScaleDetailPanel
        task={task}
        getNoteValue={getNoteValue}
        onNoteChange={handleNoteChange}
        onSaveNote={handleSaveNote}
        onUploadMockup={handleUploadMockup}
        onAddMockup={handleAddMockup}
        onDeleteMockup={handleDeleteMockup}
        t={t}
      />
    )
  }

  return (
    <div className="flex min-h-full flex-col gap-4 bg-surface p-6">
      <header className="flex flex-col gap-3">
        <div className="flex min-h-[54px] items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Typography variant="h5" className="text-xl font-bold text-ink-strong">
              {t(titleKey)}
            </Typography>
            <Typography variant="caption" className="text-xs text-ink-muted">
              {t('scale.lastUpdated', {
                time: data?.lastUpdatedAt || (isEtsyTab ? '10:46' : '09:12'),
              })}
            </Typography>
          </div>

          <Button
            variant="outlined"
            startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" />}
            className="h-[38px] rounded-lg border-border bg-surface px-[14px] text-[13px] font-normal text-ink-secondary"
          >
            {dateRangeLabel}
          </Button>
        </div>

        <div className="flex items-center gap-2">
          {subTabs.map((tab) => {
            const active = activeSubTab === tab.value
            const etsyActive = active && tab.value === SCALE_SUB_TABS.ETSY_TASKS

            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => handleSubTabChange(tab.value)}
                className={`h-9 rounded-lg border px-[14px] text-[13px] font-semibold transition ${
                  etsyActive
                    ? 'border-border bg-ink text-white'
                    : active
                      ? 'border-border bg-surface text-primary shadow-sm'
                      : 'border-border bg-transparent text-ink-secondary hover:bg-page'
                }`}
              >
                {t(tab.labelKey)}
              </button>
            )
          })}
        </div>
      </header>

      <div className="flex flex-wrap items-center gap-1.5">
        {statusTabs.map((tab) => {
          const active = statusTab === tab.value

          return (
            <button
              key={tab.value}
              type="button"
              onClick={() => handleStatusTabChange(tab.value)}
              className={`flex h-9 items-center gap-2 rounded-lg border px-[14px] text-[13px] font-semibold transition ${
                active && isEtsyTab
                  ? 'border-danger bg-danger text-white'
                  : active
                    ? 'border-primary-light bg-primary-light text-primary'
                    : 'border-border bg-surface text-ink-secondary hover:bg-page'
              }`}
            >
              <span>{t(tab.labelKey)}</span>
              <span
                className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${
                  active && isEtsyTab
                    ? 'bg-primary-light text-danger'
                    : active
                      ? 'bg-surface text-primary'
                      : 'bg-surface-subtle text-ink-muted'
                }`}
              >
                {counts[tab.value] || 0}
              </span>
            </button>
          )
        })}
      </div>

      <div className="flex h-9 items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <TextField
            size="small"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetPageAndExpand()
            }}
            placeholder={
              isEtsyTab ? t('scale.etsy.searchPlaceholder') : t('scale.searchPlaceholder')
            }
            className={`${isEtsyTab ? 'w-[180px]' : 'w-[280px]'} bg-surface`}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon className="text-ink-muted" fontSize="small" />
                </InputAdornment>
              ),
            }}
          />
          {filters.map((filter) => (
            <FilterSelect
              key={filter.key}
              value={activeFilters[filter.key]}
              onChange={(value) => updateFilter(filter.key, value)}
              ariaLabel={filter.placeholder}
              placeholder={filter.placeholder}
              options={filter.options}
              widthClass={
                filter.key === 'orderStatus'
                  ? 'w-[140px]'
                  : filter.key === 'qcByCs'
                    ? 'w-32'
                    : 'w-[120px]'
              }
            />
          ))}
          <Tooltip title={t('scale.actions.refresh')}>
            <IconButton
              aria-label={t('scale.actions.refresh')}
              onClick={() => queryClient.invalidateQueries({ queryKey: scaleKeys.all })}
              className="h-9 w-9 rounded-md border border-border bg-surface text-ink-secondary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        <div className="flex items-center gap-2.5">
          <span className="text-[13px] text-ink-muted">
            {t(isEtsyTab ? 'scale.etsy.pagination.total' : 'scale.pagination.total', { total })}
          </span>
          <ScalePagination
            page={page}
            totalPages={totalPages}
            onPageChange={(nextPage) => resetPageAndExpand(nextPage)}
            t={t}
          />
        </div>
      </div>

      <section className="overflow-hidden rounded-[10px] border border-border bg-surface">
        <div className="overflow-x-auto">
          <div className="min-w-[1636px]">
            <div
              className={`grid h-11 items-center border-b border-border bg-surface-subtle px-4 text-[11px] font-semibold uppercase text-ink-muted ${tableGridClass}`}
            >
              {SCALE_TABLE_COLUMNS.map((column) => (
                <div key={column.id} className="truncate px-4">
                  {column.labelKey ? t(column.labelKey) : '^'}
                </div>
              ))}
            </div>

            {activeQuery.isLoading ? (
              <LoadingRows />
            ) : tasks.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
                {t('scale.empty.noTasks')}
              </div>
            ) : (
              tasks.map((task) => {
                const expanded = expandedTaskId === task.id
                const csOptions = options.csUsers || []

                return (
                  <Fragment key={task.id}>
                    <div
                      className={`grid h-14 items-center border-b border-border px-4 text-[13px] transition ${tableGridClass} ${
                        expanded ? 'bg-primary-subtle' : 'bg-surface hover:bg-page'
                      }`}
                    >
                      <div className="px-4">
                        <IconButton
                          aria-label={
                            expanded ? t('scale.actions.collapse') : t('scale.actions.expand')
                          }
                          size="small"
                          onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                          className={`${expanded && isEtsyTab ? 'text-danger' : 'text-ink-secondary'} h-7 w-7`}
                        >
                          {expanded ? (
                            <KeyboardArrowDownIcon fontSize="small" />
                          ) : (
                            <KeyboardArrowRightIcon fontSize="small" />
                          )}
                        </IconButton>
                      </div>
                      <div className="px-4">
                        <Badge className="border border-danger bg-surface font-mono text-xs text-danger">
                          {task.orderId}
                        </Badge>
                      </div>
                      <div className="min-w-0 px-4">{renderOrderDate(task, activeSubTab)}</div>
                      <div className="px-4">
                        <Badge className={statusBadgeClasses[task.scaleStatus]}>
                          {t(getStatusLabelKey(task.scaleStatus))}
                        </Badge>
                      </div>
                      <div className="px-4">
                        {task.groupId ? (
                          <span className="truncate text-ink-secondary">{task.groupId}</span>
                        ) : (
                          <Badge className="bg-neutral-bg text-ink-muted">
                            {t('scale.common.noData')}
                          </Badge>
                        )}
                      </div>
                      <div className="px-4">
                        {task.groupType ? (
                          isEtsyTab ? (
                            renderPill(task.groupType)
                          ) : (
                            <span className="truncate text-ink-secondary">{task.groupType}</span>
                          )
                        ) : (
                          <Badge className="bg-neutral-bg text-ink-muted">
                            {t('scale.common.noData')}
                          </Badge>
                        )}
                      </div>
                      <div className="px-4">
                        {isEtsyTab ? (
                          renderPill(task.shop)
                        ) : (
                          <span className="truncate text-ink-secondary">{task.shop}</span>
                        )}
                      </div>
                      <div className="px-4">
                        {isEtsyTab ? (
                          renderPill(task.orderStatus)
                        ) : (
                          <span className="truncate text-ink-secondary">{task.orderStatus}</span>
                        )}
                      </div>
                      <div className="px-4">
                        {isEtsyTab ? renderPill(task.orderOwner) : task.orderOwner}
                      </div>
                      <div className="px-4">{isEtsyTab ? renderPill(task.qcBy) : task.qcBy}</div>
                      <div className="px-4">
                        <FormControl size="small" className={isEtsyTab ? 'w-[120px]' : 'w-full'}>
                          <Select
                            value={task.csBy}
                            onChange={(event) => handleAssignCs(task.id, event.target.value)}
                            className={`${isEtsyTab ? 'h-[30px] rounded' : 'h-8 rounded-lg'} bg-surface text-sm`}
                            inputProps={{ 'aria-label': t('scale.table.columns.assignCs') }}
                          >
                            {csOptions.map((option) => (
                              <MenuItem key={option.id} value={option.id}>
                                {option.name}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </div>
                      <div className="px-4">
                        <Badge
                          className={
                            csStatusBadgeClasses[task.csStatus] ||
                            'bg-neutral-bg text-ink-secondary'
                          }
                        >
                          {isEtsyTab
                            ? task.csStatus
                            : task.csStatus === CS_STATUSES.UNASSIGNED
                              ? t(getCsStatusLabelKey(task.csStatus))
                              : getCsName(options.csUsers, task.csBy)}
                        </Badge>
                      </div>
                    </div>
                    {expanded ? renderDetailPanel(task) : null}
                  </Fragment>
                )
              })
            )}
          </div>
        </div>

        {activeQuery.isFetching && !activeQuery.isLoading ? (
          <div className="border-t border-border px-4 py-2 text-xs text-ink-muted">
            {t('scale.loading.refreshing')}
          </div>
        ) : null}
      </section>
    </div>
  )
}
