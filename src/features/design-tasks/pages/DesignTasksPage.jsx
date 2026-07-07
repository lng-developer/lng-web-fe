import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import AddIcon from '@mui/icons-material/Add'
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import GridViewIcon from '@mui/icons-material/GridView'
import ImageOutlinedIcon from '@mui/icons-material/ImageOutlined'
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown'
import KeyboardArrowLeftIcon from '@mui/icons-material/KeyboardArrowLeft'
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

import { TASK_TYPES } from '@/constants/app'
import { designTasksKeys } from '@/features/design-tasks/api/designTasks.keys'
import { useDesignTasksQuery } from '@/features/design-tasks/api/designTasks.queries'
import TaskTypeTabs from '@/features/design-tasks/components/TaskTypeTabs'
import {
  DESIGN_TASK_PAGE_SIZE,
  DESIGN_TASK_STATUS_TABS,
  DESIGN_TASK_TABLE_COLUMNS,
} from '@/features/design-tasks/constants/designTasksConstants'
import { useDebounce } from '@/hooks/useDebounce'

const statusTabs = [
  { value: DESIGN_TASK_STATUS_TABS.ALL, labelKey: 'designTasks.statusTabs.all' },
  { value: DESIGN_TASK_STATUS_TABS.NEW, labelKey: 'designTasks.statusTabs.new' },
  { value: DESIGN_TASK_STATUS_TABS.ASSIGNED, labelKey: 'designTasks.statusTabs.assigned' },
  { value: DESIGN_TASK_STATUS_TABS.IN_PROGRESS, labelKey: 'designTasks.statusTabs.inProgress' },
  { value: DESIGN_TASK_STATUS_TABS.UPLOADED, labelKey: 'designTasks.statusTabs.uploaded' },
  { value: DESIGN_TASK_STATUS_TABS.QC_PASSED, labelKey: 'designTasks.statusTabs.qcPassed' },
  { value: DESIGN_TASK_STATUS_TABS.QC_REJECTED, labelKey: 'designTasks.statusTabs.qcRejected' },
]

const pageSizeOptions = [10, 20, 50]

const statusClasses = {
  New: 'border border-success bg-surface text-success',
  Assigned: 'border border-warning bg-surface text-warning',
}

const chipClasses = {
  'Pending assign': 'border border-border bg-surface text-ink-muted',
  Nam: 'bg-warning-bg text-warning-deep',
  Hoa: 'bg-warning-bg text-warning-deep',
  Acct: 'bg-warning-bg text-warning-deep',
  Acct2: 'bg-warning-bg text-warning-deep',
  Main: 'bg-info-bg text-info-strong',
  'T-Shirt': 'border border-teal bg-surface text-teal',
  Ornament: 'border border-teal bg-surface text-teal',
}

function Badge({ children, className = '' }) {
  return (
    <span
      className={`inline-flex h-6 max-w-full items-center justify-center rounded-full px-3 text-xs font-semibold ${className}`}
    >
      <span className="truncate">{children}</span>
    </span>
  )
}

function Chip({ value }) {
  return <Badge className={chipClasses[value] || 'bg-neutral-bg text-ink-secondary'}>{value}</Badge>
}

function StatusChip({ value }) {
  return (
    <Badge className={statusClasses[value] || 'border border-border bg-surface text-ink-muted'}>
      <span className="inline-flex items-center gap-1">
        <AccessTimeIcon fontSize="inherit" />
        {value}
      </span>
    </Badge>
  )
}

function DateValue({ value }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="truncate text-sm font-semibold text-ink-secondary">{value.date}</span>
      <span className="truncate text-xs text-ink-muted">{value.relative}</span>
    </div>
  )
}

function ProductImagePlaceholder() {
  return (
    <div className="flex size-20 items-center justify-center rounded-lg bg-neutral-bg">
      <ImageOutlinedIcon className="text-ink-muted" fontSize="small" />
    </div>
  )
}

function LoadingRows() {
  return Array.from({ length: 5 }, (_, index) => (
    <tr key={index} className="border-b border-border">
      {DESIGN_TASK_TABLE_COLUMNS.map((column) => (
        <td key={column.id} className="px-6 py-4">
          <Skeleton variant="text" height={20} />
        </td>
      ))}
    </tr>
  ))
}

function DesignTasksPagination({ page, pageSize, total, onPageChange, onPageSizeChange, t }) {
  const totalPages = Math.max(Math.ceil(total / pageSize), 1)
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1
  const to = Math.min(page * pageSize, total)
  const pages = [1, 2, 3].filter((pageNumber) => pageNumber <= totalPages)

  return (
    <div className="flex items-center gap-2">
      <Typography variant="body2" className="mr-2 text-sm text-ink-muted">
        {t('designTasks.pagination.range', { from, to, total })}
      </Typography>
      <IconButton
        aria-label={t('designTasks.pagination.previous')}
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
          inputProps={{ 'aria-label': t('designTasks.pagination.pageSize') }}
        >
          {pageSizeOptions.map((option) => (
            <MenuItem key={option} value={option}>
              {t('designTasks.pagination.pageSizeValue', { size: option })}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
    </div>
  )
}

export default function DesignTasksPage() {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const [subTab, setSubTab] = useState(TASK_TYPES.IDEA)
  const [statusTab, setStatusTab] = useState(DESIGN_TASK_STATUS_TABS.ALL)
  const [searchInput, setSearchInput] = useState('')
  const debouncedSearch = useDebounce(searchInput, 300)
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DESIGN_TASK_PAGE_SIZE)

  const query = useMemo(
    () => ({
      subTab,
      statusTab,
      search: debouncedSearch,
      page,
      pageSize,
    }),
    [debouncedSearch, page, pageSize, statusTab, subTab],
  )
  const { data, isPending } = useDesignTasksQuery(query)
  const tasks = data?.items || []
  const counts = data?.counts || {}
  const total = data?.total || 0

  function resetPage(nextPage = 1) {
    setPage(nextPage)
  }

  function handleSubTabChange(nextSubTab) {
    setSubTab(nextSubTab)
    setStatusTab(DESIGN_TASK_STATUS_TABS.ALL)
    setSearchInput('')
    resetPage()
  }

  function handlePageSizeChange(nextPageSize) {
    setPageSize(nextPageSize)
    resetPage()
  }

  const titleKey =
    subTab === TASK_TYPES.IDEA
      ? 'designTasks.titles.idea'
      : subTab === TASK_TYPES.PSD
        ? 'designTasks.titles.psd'
        : 'designTasks.titles.png'

  return (
    <div className="flex min-h-full flex-col bg-surface p-2">
      <TaskTypeTabs value={subTab} onChange={handleSubTabChange} />

      <header className="mt-8 flex flex-wrap items-center justify-between gap-4">
        <Typography variant="h5" className="text-xl font-bold text-ink-strong">
          {t(titleKey)}
        </Typography>
        <div className="flex items-center gap-3">
          <Button
            variant="outlined"
            startIcon={<CalendarMonthOutlinedIcon fontSize="small" />}
            endIcon={<KeyboardArrowDownIcon fontSize="small" />}
            className="h-10 rounded-lg border-border bg-surface px-4 text-sm font-normal text-ink-secondary"
          >
            {t('designTasks.dateRange')}
          </Button>
          <Button
            variant="contained"
            startIcon={<AddIcon fontSize="small" />}
            className="h-10 rounded-lg px-4 text-sm font-semibold"
          >
            {t('designTasks.actions.createTask')}
          </Button>
        </div>
      </header>

      <div className="mt-6 flex flex-wrap items-center gap-2">
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
        <div className="flex items-center gap-2">
          <TextField
            size="small"
            value={searchInput}
            onChange={(event) => {
              setSearchInput(event.target.value)
              resetPage()
            }}
            placeholder={t('designTasks.searchPlaceholder')}
            className="w-56 bg-surface"
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
          <Tooltip title={t('designTasks.actions.refresh')}>
            <IconButton
              aria-label={t('designTasks.actions.refresh')}
              onClick={() => queryClient.invalidateQueries({ queryKey: designTasksKeys.all })}
              className="h-9 w-9 rounded-lg border border-border bg-surface text-ink-secondary"
            >
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </div>

        <DesignTasksPagination
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
              {DESIGN_TASK_TABLE_COLUMNS.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className="h-12 whitespace-nowrap px-6 text-left text-xs font-semibold uppercase text-ink-muted"
                >
                  {t(column.labelKey)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isPending ? (
              <LoadingRows />
            ) : (
              tasks.slice(0, 5).map((task) => (
                <tr key={task.id} className="border-b border-border bg-surface last:border-b-0">
                  <td className="whitespace-nowrap px-6 py-4">
                    <DateValue value={task.createdAt} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-3">
                    <ProductImagePlaceholder />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <StatusChip value={task.statusTask} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Badge className="bg-info-bg text-info-strong">{task.linkProduct}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Chip value={task.assigned} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Chip value={task.seller} />
                  </td>
                  <td className="px-6 py-4">
                    <div className="rounded-lg border border-border bg-surface px-3 py-2 text-sm text-ink-secondary">
                      {task.description}
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <Chip value={task.productType} />
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-1">
                      <Tooltip title={t('designTasks.actions.upload')}>
                        <IconButton
                          aria-label={t('designTasks.actions.upload')}
                          size="small"
                          className="text-ink-muted"
                        >
                          <FileUploadOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('designTasks.actions.download')}>
                        <IconButton
                          aria-label={t('designTasks.actions.download')}
                          size="small"
                          className="text-ink-muted"
                        >
                          <FileDownloadOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('designTasks.actions.viewGrid')}>
                        <IconButton
                          aria-label={t('designTasks.actions.viewGrid')}
                          size="small"
                          className="text-ink-muted"
                        >
                          <GridViewIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tooltip title={t('designTasks.actions.edit')}>
                        <IconButton
                          aria-label={t('designTasks.actions.edit')}
                          size="small"
                          className="text-ink-muted"
                        >
                          <EditOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title={t('designTasks.actions.delete')}>
                        <IconButton
                          aria-label={t('designTasks.actions.delete')}
                          size="small"
                          className="text-danger"
                        >
                          <DeleteOutlineOutlinedIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </section>
    </div>
  )
}
