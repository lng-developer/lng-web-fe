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
import { useSnackbar } from 'notistack'

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
import { hasAnyPermission } from '@/features/auth/utils/authz'
import {
  useOverrideSubmissionScoreMutation,
  useVoidSubmissionScoreMutation,
} from '@/features/design-tasks/api/designTasks.mutations'
import {
  useDesignAssigneesQuery,
  useSubmissionScoresQuery,
} from '@/features/design-tasks/api/designTasks.queries'
import QualityScoreDetailDrawer from '@/features/design-tasks/components/QualityScoreDetailDrawer'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

const SCORE_LEVELS = ['BASIC', 'STANDARD', 'HARD', 'BONUS']

const columns = [
  { key: 'file', label: 'Submission file', width: '250px' },
  { key: 'listing', label: 'Listing / task', width: '230px' },
  { key: 'designer', label: 'Designer', width: '170px' },
  { key: 'version', label: 'Version', width: '90px', align: 'center' },
  { key: 'approvedAt', label: 'Approved', width: '150px' },
  { key: 'points', label: 'Points', width: '100px', align: 'right' },
  { key: 'level', label: 'Level', width: '120px' },
  { key: 'status', label: 'Status', width: '120px' },
  { key: 'actions', label: '', width: '72px', align: 'right' },
]

function formatDate(value) {
  return value ? dayjs(value).format('MMM D, YYYY HH:mm') : '-'
}

function statusTone(status) {
  if (status === 'ACTIVE') return 'success'
  if (status === 'VOIDED') return 'danger'
  return 'neutral'
}

export default function QualityScoringPage() {
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const currentUser = useAuthStore((state) => state.currentUser)
  const canReview = hasAnyPermission(currentUser, ['DESIGN:REVIEW', 'DESIGN:WRITE'])
  const [selectedRowId, setSelectedRowId] = useState(null)
  const searchInput = searchParams.get('search') || ''
  const debouncedSearch = useDebounce(searchInput, 300)

  const designerId = searchParams.get('designerId') || 'all'
  const scoreLevel = searchParams.get('scoreLevel') || 'all'
  const scoreStatus = searchParams.get('scoreStatus') || 'ACTIVE'
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const pageSize = Math.max(Number(searchParams.get('pageSize')) || 20, 1)

  const filters = useMemo(
    () => ({
      search: debouncedSearch,
      designerId,
      scoreLevel,
      scoreStatus,
      dateFrom,
      dateTo,
      page,
      pageSize,
    }),
    [dateFrom, dateTo, debouncedSearch, designerId, page, pageSize, scoreLevel, scoreStatus],
  )
  const scoresQuery = useSubmissionScoresQuery(filters)
  const assigneesQuery = useDesignAssigneesQuery({ taskType: 'PSD_TEMPLATE' })
  const overrideMutation = useOverrideSubmissionScoreMutation()
  const voidMutation = useVoidSubmissionScoreMutation()
  const rows = scoresQuery.data?.items || []
  const selectedRow = rows.find((row) => row.id === selectedRowId) || null
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

  async function handleOverride(payload) {
    try {
      await overrideMutation.mutateAsync(payload)
      enqueueSnackbar('Score updated', { variant: 'success' })
    } catch {
      enqueueSnackbar('Unable to update score', { variant: 'error' })
    }
  }

  async function handleVoid(taskId, submissionId, assetId, voidReason) {
    try {
      await voidMutation.mutateAsync({ taskId, submissionId, assetId, voidReason })
      enqueueSnackbar('Score voided', { variant: 'success' })
    } catch {
      enqueueSnackbar('Unable to void score', { variant: 'error' })
    }
  }

  function renderCell(row, column) {
    if (column.key === 'file') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate font-semibold text-ink-strong">
            {row.file?.filename || 'Unknown file'}
          </Typography>
          <Typography variant="caption" className="truncate text-ink-muted">
            {row.file?.mimeType || 'Unknown type'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'listing') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate text-ink-strong">
            {row.listingLabel}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.task?.status || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'designer') return row.designerLabel
    if (column.key === 'version') return row.submission?.version || '-'
    if (column.key === 'approvedAt') return formatDate(row.submission?.approvedAt)
    if (column.key === 'points') return row.points ?? '-'
    if (column.key === 'level')
      return <StatusBadge tone="info">{row.scoreLevel || '-'}</StatusBadge>
    if (column.key === 'status') {
      return <StatusBadge tone={statusTone(row.scoreStatus)}>{row.scoreStatus || '-'}</StatusBadge>
    }
    if (column.key === 'actions') {
      return (
        <IconActionButton
          label="View score details"
          onClick={() => setSelectedRowId(row.id)}
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
            title="Quality Scoring"
            subtitle="Audit and correct scores for approved PSD submissions."
          />
        }
        toolbar={
          <OperationsToolbar>
            <div className="flex flex-wrap items-center gap-3">
              <TextField
                size="small"
                value={searchInput}
                onChange={(event) => setFilters({ search: event.target.value })}
                placeholder="Search file, listing, or task reference"
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
              <FormControl size="small" className="min-w-36">
                <Select
                  value={scoreLevel}
                  onChange={(event) => setFilters({ scoreLevel: event.target.value })}
                >
                  <MenuItem value="all">All levels</MenuItem>
                  {SCORE_LEVELS.map((level) => (
                    <MenuItem key={level} value={level}>
                      {level}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <FormControl size="small" className="min-w-36">
                <Select
                  value={scoreStatus}
                  onChange={(event) => setFilters({ scoreStatus: event.target.value })}
                >
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="VOIDED">Voided</MenuItem>
                  <MenuItem value="ALL">All statuses</MenuItem>
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
              <Tooltip title="Refresh">
                <IconButton
                  aria-label="Refresh quality scores"
                  className="h-10 w-10 rounded-lg border border-border bg-surface"
                  onClick={() => scoresQuery.refetch()}
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
            total={scoresQuery.data?.total || 0}
            onPageChange={(nextPage) => setFilters({ page: nextPage })}
            onPageSizeChange={(nextPageSize) => setFilters({ pageSize: nextPageSize, page: 1 })}
          />
        }
      >
        <OperationsTable
          columns={columns}
          rows={rows}
          getRowKey={(row) => row.id}
          renderCell={renderCell}
          loading={scoresQuery.isPending}
          minWidth="1302px"
          emptyTitle={scoresQuery.isError ? 'Unable to load quality scores' : 'No PSD scores found'}
          emptyDescription={
            scoresQuery.isError
              ? 'Refresh to retry the request.'
              : 'No PSD submission scores match the active filters.'
          }
          emptyAction={
            scoresQuery.isError ? (
              <Button variant="outlined" onClick={() => scoresQuery.refetch()}>
                Retry
              </Button>
            ) : null
          }
        />
      </OperationsPageShell>

      <QualityScoreDetailDrawer
        row={selectedRow}
        open={Boolean(selectedRow)}
        canReview={canReview}
        isSubmitting={overrideMutation.isPending || voidMutation.isPending}
        onClose={() => setSelectedRowId(null)}
        onOverride={handleOverride}
        onVoid={handleVoid}
      />
    </>
  )
}
