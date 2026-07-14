import { Fragment, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CloudUploadOutlinedIcon from '@mui/icons-material/CloudUploadOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowRightIcon from '@mui/icons-material/KeyboardArrowRight'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
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
import { scaleKeys } from '@/features/scale/api/scale.keys'
import {
  useAssignScaleTaskMutation,
  useDownloadScaleAssetMutation,
  useUpdateScaleTaskNoteMutation,
  useUploadScaleOutputMutation,
} from '@/features/scale/api/scale.mutations'
import {
  useScaleAssigneesQuery,
  useScaleShopsQuery,
  useScaleSummaryQuery,
  useScaleTasksQuery,
} from '@/features/scale/api/scale.queries'
import {
  CS_STATUSES,
  SCALE_ALL_FILTER,
  SCALE_CHANNELS,
  SCALE_PAGE_SIZE,
  SCALE_PAGE_SIZE_OPTIONS,
  SCALE_STATUS_TABS,
  SCALE_STATUSES,
  SCALE_SUB_TABS,
  SCALE_TABLE_COLUMNS,
} from '@/features/scale/constants/scaleConstants'
import { getPaginationRange } from '@/features/scale/utils/scalePagination'
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

const subTabs = [
  { value: SCALE_SUB_TABS.GROUP_TASK, labelKey: 'scale.subTabs.groupTask' },
  { value: SCALE_SUB_TABS.ETSY_TASKS, labelKey: 'scale.subTabs.etsyTasks' },
]

const groupFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  scaleBy: SCALE_ALL_FILTER,
  qcBy: SCALE_ALL_FILTER,
}

const etsyFiltersInitialState = {
  shop: SCALE_ALL_FILTER,
  scaleBy: SCALE_ALL_FILTER,
  qcBy: SCALE_ALL_FILTER,
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

function formatEnumValue(value) {
  if (!value) return '-'
  return String(value)
    .toLowerCase()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

function getSelectTextClass(value) {
  return value === SCALE_ALL_FILTER ? 'text-ink-muted' : 'text-ink'
}

function toOption(value) {
  if (value && typeof value === 'object') {
    return { value: value.id, label: value.name }
  }
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
      key: 'scaleBy',
      placeholder: t('scale.etsy.filters.scaleBy'),
      options: (options.scaleUsers || []).map(toOption),
    },
    {
      key: 'qcBy',
      placeholder: t('scale.etsy.filters.qcByCs'),
      options: (options.qcUsers || []).map(toOption),
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
      key: 'scaleBy',
      placeholder: t('scale.etsy.filters.scaleBy'),
      options: (options.scaleUsers || []).map(toOption),
    },
    {
      key: 'qcBy',
      placeholder: t('scale.etsy.filters.qcByCs'),
      options: (options.qcUsers || []).map(toOption),
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
        onChange={(event) => onChange?.(event.target.value)}
        onBlur={onBlur}
        readOnly={!onChange}
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
  onUploadOutput,
  onDownloadAsset,
  uploadingSlotId,
  t,
}) {
  const { detail } = task

  return (
    <div className="border-b border-border/60 bg-surface-subtle px-5 py-6">
      <div className="grid min-w-[1540px] grid-cols-[230px_390px_133px_220px_220px_280px] gap-6 py-3">
        <section className="flex w-[230px] flex-col items-start gap-2">
          <DetailHeading>{t('scale.detail.productInfo')}</DetailHeading>
          <div className="flex h-[106px] w-[106px] items-center justify-center overflow-hidden rounded-md border border-sky-border bg-sky-soft">
            {detail.product.imageUrl ? (
              <img
                src={detail.product.imageUrl}
                alt={detail.product.name}
                className="h-full w-full object-cover"
              />
            ) : (
              <ImageOutlinedIcon className="text-info-strong !text-[36px]" />
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Badge className="h-[28px] border border-teal bg-surface px-3 text-[11px] text-teal">
              {detail.product.primaryCode}
            </Badge>
            <Badge
              className={`h-[28px] px-3 text-[13px] ${detail.product.psdStatus === 'MISSING' ? 'bg-danger-bg text-danger' : 'bg-pink-bg text-pink-strong'}`}
            >
              {formatEnumValue(detail.product.psdStatus)}
            </Badge>
          </div>
          <Badge className="h-[28px] border border-teal bg-surface px-3 text-[11px] text-teal">
            {detail.product.secondaryCode}
          </Badge>
          <Button
            variant="outlined"
            size="small"
            startIcon={<FileDownloadOutlinedIcon fontSize="small" />}
            disabled={!detail.psdTemplate?.assetId}
            onClick={() => onDownloadAsset(detail.psdTemplate.assetId, `${task.orderId}-psd`)}
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
          <span
            className={`rounded-md px-3 py-[5px] text-center text-[13px] font-semibold ${detail.canScale ? 'bg-success-soft text-success' : 'bg-warning-bg text-warning-strong'}`}
          >
            {formatEnumValue(detail.contextStatus)}
          </span>
          {detail.missingRequirements?.map((requirement) => (
            <Tooltip key={requirement.code} title={requirement.message || requirement.code}>
              <span className="max-w-full truncate rounded-full bg-danger-bg px-2 py-1 text-[11px] text-danger">
                {formatEnumValue(requirement.code)}
              </span>
            </Tooltip>
          ))}
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
              value={getNoteValue(task, 'design')}
              onChange={(value) => onNoteChange(task.id, 'design', value)}
              onBlur={() => onSaveNote(task, 'design')}
              danger
            />
            <EtsyNoteBox label={t('scale.etsy.notes.qc')} value={getNoteValue(task, 'qc')} />
          </div>
        </section>

        <section className="flex w-[280px] flex-col items-start gap-3">
          <DetailHeading>{t('scale.detail.action')}</DetailHeading>
          <div className="flex flex-wrap gap-3">
            {(detail.mockups || []).map((mockup) => {
              const isUploading = uploadingSlotId === mockup.fileCheckId
              const uploadDisabled =
                !detail.canScale || !mockup.fileCheckId || !mockup.inputAssetId || isUploading

              return (
                <div key={mockup.id} className="flex w-28 flex-col gap-1.5">
                  <Tooltip title={mockup.label}>
                    <span className="truncate text-[10px] text-ink-muted">{mockup.label}</span>
                  </Tooltip>
                  <button
                    type="button"
                    disabled={!mockup.outputAssetId}
                    onClick={() =>
                      onDownloadAsset(mockup.outputAssetId, `${task.orderId}-${mockup.label}`)
                    }
                    className="flex h-28 w-28 items-center justify-center rounded-md border border-sky-border bg-sky-soft text-info-strong disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {mockup.outputAssetId ? (
                      <FileDownloadOutlinedIcon className="!text-[28px]" />
                    ) : (
                      <ImageOutlinedIcon className="!text-[28px]" />
                    )}
                  </button>
                  <Tooltip
                    title={
                      uploadDisabled && !isUploading
                        ? t('scale.messages.slotUploadUnavailable')
                        : ''
                    }
                  >
                    <span>
                      <Button
                        component="label"
                        variant="outlined"
                        size="small"
                        disabled={uploadDisabled}
                        startIcon={<CloudUploadOutlinedIcon className="text-xs" />}
                        className="h-7 w-full rounded border-border px-2 text-xs font-normal text-ink-action"
                      >
                        {isUploading
                          ? t('scale.loading.uploading')
                          : t('scale.etsy.actions.upload')}
                        <input
                          hidden
                          type="file"
                          accept=".png,.jpg,.jpeg,.pdf,.zip,.psd"
                          onChange={(event) => {
                            onUploadOutput(task, mockup, event.target.files?.[0])
                            event.target.value = ''
                          }}
                        />
                      </Button>
                    </span>
                  </Tooltip>
                </div>
              )
            })}
            {detail.mockups?.length ? null : (
              <span className="text-xs text-ink-muted">{t('scale.messages.noScaleSlots')}</span>
            )}
          </div>
        </section>
      </div>
    </div>
  )
}

function renderOrderDate(task, activeSubTab) {
  return (
    <span
      className={`truncate ${activeSubTab === SCALE_SUB_TABS.ETSY_TASKS ? 'text-ink-strong' : 'text-ink-secondary'}`}
    >
      {task.orderDate}
    </span>
  )
}

function renderPill(value, fallbackClass = 'border border-border bg-surface text-ink-secondary') {
  return <Badge className={pillClassByValue[value] || fallbackClass}>{value}</Badge>
}

function ScalePagination({ page, pageSize, total, disabled, onPageChange, onPageSizeChange, t }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const safePage = Math.min(page, totalPages)
  const { from, to } = getPaginationRange({ page: safePage, pageSize, total })

  function getItemAriaLabel(type, pageNumber) {
    if (type === 'previous') return t('scale.pagination.previous')
    if (type === 'next') return t('scale.pagination.next')
    if (type === 'page') return t('scale.pagination.pageLabel', { page: pageNumber })
    return t('scale.pagination.morePages')
  }

  return (
    <div className="flex flex-wrap items-center justify-end gap-3">
      <span className="text-[13px] whitespace-nowrap text-ink-muted">
        {t('scale.pagination.range', { from, to, total })}
      </span>
      <Pagination
        count={totalPages}
        page={safePage}
        onChange={(_event, nextPage) => onPageChange(nextPage)}
        getItemAriaLabel={getItemAriaLabel}
        size="small"
        disabled={disabled || total === 0}
      />
      <FormControl size="small" className="min-w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          inputProps={{ 'aria-label': t('scale.pagination.pageSize') }}
          disabled={disabled}
        >
          {SCALE_PAGE_SIZE_OPTIONS.map((option) => (
            <MenuItem key={option} value={option}>
              {t('scale.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
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
  const [dateRange, setDateRange] = useState({ start: null, end: null })
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(SCALE_PAGE_SIZE)
  const [expandedTaskId, setExpandedTaskId] = useState(null)
  const [noteDrafts, setNoteDrafts] = useState({})

  const isEtsyTab = activeSubTab === SCALE_SUB_TABS.ETSY_TASKS
  const activeFilters = isEtsyTab ? etsyFilters : groupFilters
  const salesChannelCode = isEtsyTab ? SCALE_CHANNELS.ETSY : SCALE_CHANNELS.AMAZON

  const query = useMemo(
    () => ({
      salesChannelCode,
      statusTab,
      search: debouncedSearch,
      dateRange,
      ...activeFilters,
      page,
      pageSize,
    }),
    [activeFilters, dateRange, debouncedSearch, page, pageSize, salesChannelCode, statusTab],
  )

  const activeQuery = useScaleTasksQuery(query)
  const summaryQuery = useScaleSummaryQuery(query)
  const assigneesQuery = useScaleAssigneesQuery({ limit: 100 })
  const shopsQuery = useScaleShopsQuery({ page: 1, limit: 100 })

  const assignScaleMutation = useAssignScaleTaskMutation()
  const updateNoteMutation = useUpdateScaleTaskNoteMutation()
  const uploadOutputMutation = useUploadScaleOutputMutation()
  const downloadAssetMutation = useDownloadScaleAssetMutation()

  const data = activeQuery.data
  const listItems = data?.items
  const shops = shopsQuery.data
  const tasks = useMemo(() => {
    const shopNames = new Map((shops || []).map((shop) => [shop.id, shop.name]))
    return (listItems || []).map((task) => ({
      ...task,
      shop: shopNames.get(task.shopId) || task.shop,
    }))
  }, [listItems, shops])
  const counts = summaryQuery.data || {}
  const options = useMemo(
    () => ({
      shops: shops || [],
      scaleUsers: assigneesQuery.data || [],
      qcUsers: data?.options?.qcUsers || [],
    }),
    [assigneesQuery.data, data?.options?.qcUsers, shops],
  )
  const total = data?.total || 0
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const filters = isEtsyTab ? getEtsyFilters(options, t) : getGroupFilters(options, t)
  const statusTabs = groupStatusTabs
  const titleKey = isEtsyTab ? 'scale.etsy.title' : 'scale.title'

  function resetPageAndExpand(nextPage = 1) {
    setPage(nextPage)
    setExpandedTaskId(null)
  }

  useEffect(() => {
    if (!activeQuery.isSuccess || activeQuery.isFetching || page <= totalPages) return
    // The server total can shrink after a settled refresh, leaving the controlled page invalid.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    resetPageAndExpand(totalPages)
  }, [activeQuery.isFetching, activeQuery.isSuccess, page, totalPages])

  function handleSubTabChange(nextSubTab) {
    setActiveSubTab(nextSubTab)
    setStatusTab(SCALE_STATUS_TABS.ALL)
    setSearchInput('')
    setPage(1)
    setGroupFilters(groupFiltersInitialState)
    setEtsyFilters(etsyFiltersInitialState)
    setExpandedTaskId(null)
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

  function handleDateRangeChange(value) {
    setDateRange(value)
    resetPageAndExpand()
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    resetPageAndExpand()
  }

  function handleAssignScale(taskId, assignedDesignUserId) {
    assignScaleMutation.mutate(
      { taskId, assignedDesignUserId },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.assignSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
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

  function getNoteValue(task, noteType = 'design') {
    const key = getNoteDraftKey(task.id, noteType)
    if (Object.hasOwn(noteDrafts, key)) return noteDrafts[key]

    return task.detail.notes?.[noteType] || ''
  }

  function handleSaveNote(task, noteType = 'design') {
    updateNoteMutation.mutate(
      { taskId: task.id, designNote: getNoteValue(task, noteType) },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.noteSuccess'), { variant: SNACKBAR_VARIANTS.SUCCESS })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  function handleUploadOutput(task, slot, file) {
    if (!file) return
    if (!slot?.fileCheckId) {
      enqueueSnackbar(t('scale.messages.noUploadSlot'), { variant: SNACKBAR_VARIANTS.WARNING })
      return
    }

    uploadOutputMutation.mutate(
      { taskId: task.id, fileCheckId: slot.fileCheckId, file },
      {
        onSuccess: () => {
          enqueueSnackbar(t('scale.messages.uploadSuccess'), {
            variant: SNACKBAR_VARIANTS.SUCCESS,
          })
        },
        onError: (error) => {
          enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
        },
      },
    )
  }

  async function handleDownloadAsset(assetId, filename) {
    if (!assetId) return
    try {
      const blob = await downloadAssetMutation.mutateAsync(assetId)
      const href = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = href
      link.download = filename
      document.body.appendChild(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(href)
    } catch (error) {
      enqueueSnackbar(error.message, { variant: SNACKBAR_VARIANTS.ERROR })
    }
  }

  function renderDetailPanel(task) {
    return (
      <ScaleDetailPanel
        task={task}
        getNoteValue={getNoteValue}
        onNoteChange={handleNoteChange}
        onSaveNote={handleSaveNote}
        onUploadOutput={handleUploadOutput}
        onDownloadAsset={handleDownloadAsset}
        uploadingSlotId={
          uploadOutputMutation.isPending && uploadOutputMutation.variables?.taskId === task.id
            ? uploadOutputMutation.variables.fileCheckId
            : null
        }
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
                time: activeQuery.dataUpdatedAt
                  ? new Intl.DateTimeFormat('en-GB', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false,
                    }).format(activeQuery.dataUpdatedAt)
                  : '--:--',
              })}
            </Typography>
          </div>

          <DateRangePicker value={dateRange} onChange={handleDateRangeChange} />
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
                className={`h-9 rounded-lg border px-[14px] text-[13px] font-semibold transition cursor-pointer ${
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
              disabled={tab.disabled}
              onClick={() => handleStatusTabChange(tab.value)}
              className={`flex h-9 items-center gap-2 rounded-lg border px-[14px] text-[13px] font-semibold transition cursor-pointer disabled:cursor-not-allowed disabled:opacity-50 ${
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
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
              widthClass={filter.key === 'qcBy' ? 'w-32' : 'w-[120px]'}
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

        <ScalePagination
          page={page}
          pageSize={pageSize}
          total={total}
          disabled={activeQuery.isLoading}
          onPageChange={(nextPage) => resetPageAndExpand(nextPage)}
          onPageSizeChange={handlePageSizeChange}
          t={t}
        />
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
            ) : activeQuery.isError ? (
              <div className="flex h-48 items-center justify-center text-sm text-danger">
                {activeQuery.error?.message}
              </div>
            ) : tasks.length === 0 ? (
              <div className="flex h-48 items-center justify-center text-sm text-ink-muted">
                {t('scale.empty.noTasks')}
              </div>
            ) : (
              tasks.map((task) => {
                const expanded = expandedTaskId === task.id
                const scaleOptions = options.scaleUsers || []

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
                            value={task.scaleBy}
                            displayEmpty
                            disabled={
                              assigneesQuery.isLoading ||
                              (assignScaleMutation.isPending &&
                                assignScaleMutation.variables?.taskId === task.id)
                            }
                            onChange={(event) => handleAssignScale(task.id, event.target.value)}
                            className={`${isEtsyTab ? 'h-[30px] rounded' : 'h-8 rounded-lg'} bg-surface text-sm`}
                            inputProps={{ 'aria-label': t('scale.table.columns.assignCs') }}
                          >
                            <MenuItem disabled value="">
                              {t('scale.values.csStatus.UNASSIGNED')}
                            </MenuItem>
                            {scaleOptions.map((option) => (
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
                            csStatusBadgeClasses[task.assignmentStatus] ||
                            'bg-neutral-bg text-ink-secondary'
                          }
                        >
                          {task.assignmentStatus === CS_STATUSES.UNASSIGNED
                            ? t(getCsStatusLabelKey(task.assignmentStatus))
                            : task.scaleByName}
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
