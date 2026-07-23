import { useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Button,
  FormControl,
  IconButton,
  InputAdornment,
  MenuItem,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material'

import DateRangePicker from '@/components/form/DateRangePicker'
import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import {
  useDesignAssigneesQuery,
  usePsdFilesQuery,
} from '@/features/design-tasks/api/designTasks.queries'
import PsdFileDetailDrawer from '@/features/design-tasks/components/PsdFileDetailDrawer'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'

const FILE_ROLES = ['REFERENCE', 'SUBMISSION', 'APPROVED']
const TASK_STATUSES = [
  'REQUESTED',
  'OPEN',
  'ASSIGNED',
  'IN_PROGRESS',
  'SUBMITTED',
  'REJECTED',
  'APPROVED',
  'CANCELLED',
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'File uploaded' },
  { value: 'submittedAt', label: 'Submission uploaded' },
]

const columns = [
  { key: 'filename', label: 'File name', width: '260px' },
  { key: 'role', label: 'Role', width: '130px' },
  { key: 'listing', label: 'Listing / task', width: '240px' },
  { key: 'designer', label: 'Designer', width: '170px' },
  { key: 'version', label: 'Version', width: '90px', align: 'center' },
  { key: 'uploadedAt', label: 'Uploaded', width: '150px' },
  { key: 'size', label: 'Size', width: '110px', align: 'right' },
  { key: 'actions', label: '', width: '72px', align: 'right' },
]

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY HH:mm') : '-'
}

function formatSize(value) {
  if (!Number.isFinite(Number(value))) return '-'
  const bytes = Number(value)
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function roleTone(role) {
  if (role === 'APPROVED') return 'success'
  if (role === 'SUBMISSION') return 'info'
  return 'neutral'
}

export default function PsdFileLibraryPage() {
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRowKey, setSelectedRowKey] = useState(null)
  const searchInput = searchParams.get('search') || ''
  const debouncedSearch = useDebounce(searchInput, 300)

  const role = searchParams.get('role') || 'all'
  const designerId = searchParams.get('designerId') || 'all'
  const taskStatus = searchParams.get('taskStatus') || 'all'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const sortBy = searchParams.get('sortBy') || 'createdAt'
  const sortOrder = searchParams.get('sortOrder') || 'desc'
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const pageSize = Math.max(Number(searchParams.get('pageSize')) || 20, 1)

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      role,
      designerId,
      taskStatus,
      dateFrom,
      dateTo,
      sortBy,
      sortOrder,
      page,
      pageSize,
    }),
    [
      dateFrom,
      dateTo,
      debouncedSearch,
      designerId,
      page,
      pageSize,
      role,
      sortBy,
      sortOrder,
      taskStatus,
    ],
  )
  const filesQuery = usePsdFilesQuery(filters)
  const assigneesQuery = useDesignAssigneesQuery({ taskType: 'PSD_TEMPLATE' })
  const rows = filesQuery.data?.items || []
  const selectedRow = rows.find((row) => row.rowKey === selectedRowKey) || null
  const dateRange = useMemo(
    () => ({
      start: dateFrom ? dayjs(dateFrom) : null,
      end: dateTo ? dayjs(dateTo) : null,
    }),
    [dateFrom, dateTo],
  )

  function setFilters(values) {
    const next = new URLSearchParams(searchParams)
    Object.entries(values).forEach(([key, value]) => {
      if (value === '' || value === 'all' || value == null) next.delete(key)
      else next.set(key, String(value))
    })
    if (!Object.hasOwn(values, 'page')) next.delete('page')
    setSearchParams(next, { replace: true })
  }

  function renderCell(row, column) {
    if (column.key === 'filename') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate font-semibold text-ink-strong">
            {row.filename}
          </Typography>
          <Typography variant="caption" className="truncate text-ink-muted">
            {row.asset?.mimeType || 'Unknown type'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'role') {
      return <StatusBadge tone={roleTone(row.role)}>{row.role || '-'}</StatusBadge>
    }
    if (column.key === 'listing') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate text-ink-strong">
            {row.listingLabel}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.taskStatus || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'designer') return row.designerLabel
    if (column.key === 'version') return row.submissionVersion || '-'
    if (column.key === 'uploadedAt') return formatDate(row.submittedAt || row.createdAt)
    if (column.key === 'size') return formatSize(row.size)
    if (column.key === 'actions') {
      return (
        <IconActionButton
          label="View PSD file details"
          onClick={() => setSelectedRowKey(row.rowKey)}
          icon={<VisibilityOutlinedIcon fontSize="small" />}
        />
      )
    }
    return '-'
  }

  return (
    <>
      <OperationsPageShell
        header={
          <OperationsHeader
            title="PSD File Library"
            subtitle="Find and download files linked to PSD template tasks."
          />
        }
        toolbar={
          <OperationsToolbar>
            <div className="flex flex-wrap items-center gap-3">
              <TextField
                size="small"
                value={searchInput}
                onChange={(event) => setFilters({ search: event.target.value })}
                placeholder="Search file or listing"
                className="min-w-64 flex-1"
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
              <FormControl size="small" className="min-w-36">
                <Select value={role} onChange={(event) => setFilters({ role: event.target.value })}>
                  <MenuItem value="all">All roles</MenuItem>
                  {FILE_ROLES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="min-w-44">
                <Select
                  value={designerId}
                  onChange={(event) => setFilters({ designerId: event.target.value })}
                >
                  <MenuItem value="all">All designers</MenuItem>
                  {(assigneesQuery.data || []).map((assignee) => (
                    <MenuItem key={assignee.id} value={assignee.id}>
                      {assignee.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="min-w-40">
                <Select
                  value={taskStatus}
                  onChange={(event) => setFilters({ taskStatus: event.target.value })}
                >
                  <MenuItem value="all">All task statuses</MenuItem>
                  {TASK_STATUSES.map((value) => (
                    <MenuItem key={value} value={value}>
                      {value}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <DateRangePicker
                value={dateRange}
                onChange={({ start, end }) =>
                  setFilters({
                    dateFrom: start?.format('YYYY-MM-DD') || '',
                    dateTo: end?.format('YYYY-MM-DD') || '',
                  })
                }
              />
              <FormControl size="small" className="min-w-44">
                <Select
                  value={sortBy}
                  onChange={(event) => setFilters({ sortBy: event.target.value })}
                >
                  {SORT_OPTIONS.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="min-w-28">
                <Select
                  value={sortOrder}
                  onChange={(event) => setFilters({ sortOrder: event.target.value })}
                >
                  <MenuItem value="desc">Newest</MenuItem>
                  <MenuItem value="asc">Oldest</MenuItem>
                </Select>
              </FormControl>
              <Tooltip title="Refresh">
                <IconButton
                  aria-label="Refresh PSD files"
                  className="h-10 w-10 rounded-lg border border-border bg-surface"
                  onClick={() => filesQuery.refetch()}
                >
                  <RefreshIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </div>
          </OperationsToolbar>
        }
        pagination={
          <OperationsPagination
            page={page}
            pageSize={pageSize}
            total={filesQuery.data?.total || 0}
            onPageChange={(nextPage) => setFilters({ page: nextPage })}
            onPageSizeChange={(nextPageSize) => setFilters({ pageSize: nextPageSize, page: 1 })}
          />
        }
      >
        <OperationsTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.rowKey}
          renderCell={renderCell}
          loading={filesQuery.isPending}
          minWidth="1222px"
          emptyTitle={filesQuery.isError ? 'Unable to load PSD files' : 'No PSD files found'}
          emptyDescription={
            filesQuery.isError
              ? 'Refresh to retry the request.'
              : 'No PSD-linked files match the active filters.'
          }
          emptyAction={
            filesQuery.isError ? (
              <Button variant="outlined" onClick={() => filesQuery.refetch()}>
                Retry
              </Button>
            ) : null
          }
        />
      </OperationsPageShell>

      <PsdFileDetailDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        onClose={() => setSelectedRowKey(null)}
      />
    </>
  )
}
