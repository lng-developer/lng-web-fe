import { Fragment, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import SendIcon from '@mui/icons-material/Send'
import TableChartOutlinedIcon from '@mui/icons-material/TableChartOutlined'
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

import { qcKeys } from '@/features/qc/api/qc.keys'
import { useQcTasksQuery } from '@/features/qc/api/qc.queries'
import {
  QC_ALL_FILTER,
  QC_DETAIL_COLUMNS,
  QC_PAGE_SIZE,
  QC_PLATFORM_TABS,
  QC_STATUS_TABS,
  QC_TABLE_COLUMNS,
} from '@/features/qc/constants/qcConstants'
import { getDefaultQcExpandedTaskId } from '@/features/qc/utils/qcDisplay'
import { useDebounce } from '@/hooks/useDebounce'

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
  Pending: 'bg-warning-bg text-warning-strong',
  Complete: 'bg-success-soft text-success-strong',
  Failed: 'bg-danger-bg text-danger',
  Processing: 'bg-warning-bg text-warning-deep',
  Shipped: 'bg-success-soft text-success-strong',
  Delivered: 'bg-neutral-bg text-ink-muted',
  Standard: 'border border-border bg-surface text-ink-secondary',
  Express: 'border border-border bg-surface text-ink-secondary',
  Acct: 'bg-warning-bg text-warning-deep',
  Acct2: 'bg-warning-bg text-warning-deep',
  Main: 'bg-info-bg text-info-strong',
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

function renderBadge(value, fallbackClass = 'border border-border bg-surface text-ink-secondary') {
  return <Badge className={statusClasses[value] || fallbackClass}>{value}</Badge>
}

function getSelectTextClass(value) {
  return value === QC_ALL_FILTER ? 'text-ink-muted' : 'text-ink'
}

function toOption(value) {
  return { value, label: value }
}

function FilterSelect({ value, onChange, ariaLabel, placeholder, options, widthClass }) {
  return (
    <FormControl size="small" className={widthClass}>
      <Select
        displayEmpty
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={`h-9 rounded-lg bg-surface text-sm ${getSelectTextClass(value)}`}
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

function DateValue({ value }) {
  return (
    <div className="flex min-w-0 flex-col gap-0.5">
      <span className="truncate text-sm font-semibold text-ink-secondary">{value.date}</span>
      <span className="truncate text-xs text-ink-muted">{value.relative}</span>
    </div>
  )
}

function SelectCircle({ active = false }) {
  return (
    <span
      className={`block size-5 rounded-full border ${
        active ? 'border-primary bg-primary-light' : 'border-border-strong bg-surface'
      }`}
    />
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

function QcDetailPanel({ task, t }) {
  const { detail } = task

  return (
    <div className="border-b border-border bg-surface px-4 pb-7 pt-3">
      <div className="grid min-w-full grid-cols-8 bg-neutral-bg px-2 py-2">
        {QC_DETAIL_COLUMNS.map((column) => (
          <Typography
            key={column.id}
            variant="caption"
            className={`px-2 text-xs font-semibold uppercase text-ink-muted ${
              column.id === 'productInfo' ? 'col-span-2' : ''
            }`}
          >
            {t(column.labelKey)}
          </Typography>
        ))}
      </div>

      <div className="grid min-w-full grid-cols-8 px-2 py-4">
        <div className="col-span-2 flex items-start gap-4 px-2">
          <div className="flex size-24 shrink-0 items-center justify-center rounded-md border border-sky-border bg-sky-soft">
            <ImageOutlinedIcon className="text-info-strong" fontSize="large" />
          </div>
          <div className="flex min-w-0 flex-col gap-1.5">
            <Typography variant="caption" className="text-xs text-ink-muted">
              {t('qc.detail.sku')}
            </Typography>
            <Badge className="h-6 bg-ink-strong px-3 text-xs text-white">
              {detail.product.sku}
            </Badge>
            <Typography variant="caption" className="mt-1 text-xs text-ink-muted">
              {t('qc.detail.asin')}
            </Typography>
            <Badge className="h-6 border border-info bg-surface px-2 text-xs text-info-strong">
              <span className="inline-flex items-center gap-1">
                {detail.product.asin}
                <OpenInNewIcon fontSize="inherit" />
              </span>
            </Badge>
            <Typography variant="caption" className="mt-1 text-xs text-ink-secondary">
              {t('qc.detail.quantity', { quantity: detail.product.quantity })}
            </Typography>
          </div>
        </div>

        <div className="px-2">
          <Badge className="h-7 border border-success bg-surface px-3 text-sm text-success">
            {detail.scaleStatus}
          </Badge>
        </div>

        <div className="px-2">
          <Badge className="h-7 border border-warning-strong bg-surface px-3 text-xs text-warning-deep">
            {detail.orderOwner}
          </Badge>
        </div>

        <Typography className="min-w-0 truncate px-2 text-xs text-ink-secondary">
          {detail.fulfillName}
        </Typography>

        <div className="px-2">
          <Badge className="h-7 border border-success bg-surface px-3 text-sm text-success">
            {detail.pngStatus}
          </Badge>
        </div>

        <Typography className="min-w-0 truncate px-2 text-xs text-ink-secondary">
          {detail.vendorProduct}
        </Typography>

        <div className="flex px-2">
          <CheckCircleIcon className="text-success" fontSize="small" />
        </div>
      </div>
    </div>
  )
}

function QcPagination({ page, pageSize, total, onPageChange, onPageSizeChange, t }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = [1, 2, 3].filter((pageNumber) => pageNumber <= totalPages)

  return (
    <div className="flex items-center gap-2">
      <Typography variant="body2" className="mr-2 text-sm text-ink-muted">
        {t('qc.pagination.range', { from, to, total })}
      </Typography>
      <IconButton
        aria-label={t('qc.pagination.previous')}
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
        className="h-9 w-9 rounded-lg border border-border bg-surface"
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
            className={`h-9 w-9 rounded-lg border text-sm font-semibold ${
              active
                ? 'border-primary bg-primary-light text-primary'
                : 'border-border bg-surface text-ink-secondary'
            }`}
          >
            {pageNumber}
          </button>
        )
      })}
      <FormControl size="small" className="w-28">
        <Select
          value={pageSize}
          onChange={(event) => onPageSizeChange(Number(event.target.value))}
          className="h-9 rounded-lg bg-surface text-sm text-ink-secondary"
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
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [platform, setPlatform] = useState(QC_PLATFORM_TABS.AMAZON)
  const [statusTab, setStatusTab] = useState(QC_STATUS_TABS.ALL)
  const [filters, setFilters] = useState({ seller: QC_ALL_FILTER, shop: QC_ALL_FILTER })
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(QC_PAGE_SIZE)
  const [expandedTaskId, setExpandedTaskId] = useState(getDefaultQcExpandedTaskId)

  const query = useMemo(
    () => ({
      platform,
      statusTab,
      search: debouncedSearch,
      seller: filters.seller,
      shop: filters.shop,
      page,
      pageSize,
    }),
    [debouncedSearch, filters.seller, filters.shop, page, pageSize, platform, statusTab],
  )
  const { data, isPending } = useQcTasksQuery(query)
  const tasks = data?.items || []
  const counts = data?.counts || {}
  const options = data?.options || {}
  const total = data?.total || 0

  function resetPage(nextPage = 1) {
    setPage(nextPage)
    setExpandedTaskId(getDefaultQcExpandedTaskId())
  }

  function handlePlatformChange(nextPlatform) {
    setPlatform(nextPlatform)
    setStatusTab(QC_STATUS_TABS.ALL)
    setFilters({ seller: QC_ALL_FILTER, shop: QC_ALL_FILTER })
    setSearchInput('')
    resetPage()
  }

  function updateFilter(key, value) {
    setFilters((current) => ({ ...current, [key]: value }))
    resetPage()
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    resetPage()
  }

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <header className="flex items-center justify-between gap-4">
        <Typography variant="h5" className="text-xl font-bold text-ink-strong">
          {t('qc.title')}
        </Typography>
        <Button
          variant="outlined"
          startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
          endIcon={<KeyboardArrowDownIcon fontSize="small" />}
          className="h-10 rounded-lg border-border bg-surface px-4 text-sm font-normal text-ink-secondary"
        >
          {t('qc.dateRange')}
        </Button>
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
                resetPage()
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
              resetPage()
            }}
            placeholder={t('qc.searchPlaceholder')}
            className="w-48 bg-surface"
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
          <FilterSelect
            value={filters.seller}
            onChange={(value) => updateFilter('seller', value)}
            ariaLabel={t('qc.filters.seller')}
            placeholder={t('qc.filters.seller')}
            options={(options.sellers || []).map(toOption)}
            widthClass="w-24"
          />
          <FilterSelect
            value={filters.shop}
            onChange={(value) => updateFilter('shop', value)}
            ariaLabel={t('qc.filters.shop')}
            placeholder={t('qc.filters.shop')}
            options={(options.shops || []).map(toOption)}
            widthClass="w-20"
          />
          <Tooltip title={t('qc.actions.refresh')}>
            <IconButton
              aria-label={t('qc.actions.refresh')}
              onClick={() => queryClient.invalidateQueries({ queryKey: qcKeys.all })}
              className="h-9 w-9 rounded-lg border border-border bg-surface text-ink-secondary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Button
            variant="outlined"
            disabled
            startIcon={<TableChartOutlinedIcon fontSize="small" />}
            className="h-9 rounded-lg border-border bg-neutral-bg px-4 text-sm font-semibold text-ink-muted"
          >
            {t('qc.actions.exportExcel', { count: 0 })}
          </Button>
          <Button
            variant="outlined"
            disabled
            startIcon={<SendIcon fontSize="small" />}
            className="h-9 rounded-lg border-border bg-neutral-bg px-4 text-sm font-semibold text-ink-muted"
          >
            {t('qc.actions.pushFulfillment', { count: 0 })}
          </Button>
        </div>

        <QcPagination
          page={page}
          pageSize={pageSize}
          total={total}
          onPageChange={setPage}
          onPageSizeChange={handlePageSizeChange}
          t={t}
        />
      </div>

      <section className="mt-4 overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full border-collapse">
          <thead className="bg-surface-subtle">
            <tr>
              {QC_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="h-12 whitespace-nowrap px-4 text-left text-xs font-semibold uppercase text-ink-muted"
                >
                  {column.id === 'select' ? (
                    <SelectCircle />
                  ) : column.labelKey ? (
                    t(column.labelKey)
                  ) : (
                    ''
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <LoadingRows />
            ) : (
              tasks.map((task) => {
                const expanded = expandedTaskId === task.id

                return (
                  <Fragment key={task.id}>
                    <tr
                      className={`border-b border-border ${
                        expanded ? 'bg-primary-subtle' : 'bg-surface'
                      }`}
                    >
                      <td className="h-14 whitespace-nowrap px-4">
                        <IconButton
                          aria-label={expanded ? t('qc.actions.collapse') : t('qc.actions.expand')}
                          size="small"
                          onClick={() => setExpandedTaskId(expanded ? null : task.id)}
                          className={expanded ? 'text-primary' : 'text-ink-muted'}
                        >
                          {expanded ? (
                            <KeyboardArrowDownIcon className="rotate-180" fontSize="small" />
                          ) : (
                            <KeyboardArrowDownIcon fontSize="small" />
                          )}
                        </IconButton>
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">
                        <SelectCircle active={expanded} />
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">
                        <Badge className="h-6 border border-primary bg-surface px-2 text-xs text-primary">
                          {task.orderId}
                        </Badge>
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">{renderBadge(task.statusQc)}</td>
                      <td className="h-14 whitespace-nowrap px-4">
                        <DateValue value={task.created} />
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">
                        <DateValue value={task.orderDate} />
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">
                        {renderBadge(task.statusOrder)}
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">
                        {renderBadge(task.shippingType)}
                      </td>
                      <td className="h-14 whitespace-nowrap px-4">{renderBadge(task.shop)}</td>
                      <td className="h-14 whitespace-nowrap px-4 text-sm text-ink-secondary">
                        {task.scaleBy}
                      </td>
                      <td className="h-14 whitespace-nowrap px-4 text-sm text-ink-secondary">
                        {task.qcBy}
                      </td>
                    </tr>
                    {expanded ? (
                      <tr>
                        <td className="p-0" colSpan={QC_TABLE_COLUMNS.length}>
                          <QcDetailPanel task={task} t={t} />
                        </td>
                      </tr>
                    ) : null}
                  </Fragment>
                )
              })
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
