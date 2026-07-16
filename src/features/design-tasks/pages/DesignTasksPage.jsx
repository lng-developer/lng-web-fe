import { memo, useCallback, useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import CheckIcon from '@mui/icons-material/Check'
import CloseIcon from '@mui/icons-material/Close'
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined'
import FileUploadOutlinedIcon from '@mui/icons-material/FileUploadOutlined'
import PlayArrowIcon from '@mui/icons-material/PlayArrow'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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

import DateRangePicker from '@/components/form/DateRangePicker'
import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsTabs,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { hasAnyPermission } from '@/features/auth/utils/authz'
import { designTasksKeys } from '@/features/design-tasks/api/designTasks.keys'
import {
  useApproveDesignTaskMutation,
  useAssignDesignTaskMutation,
  useBulkCreatePsdTasksMutation,
  useCancelDesignTaskMutation,
  useCreateDesignTaskMutation,
  useRejectDesignTaskMutation,
  useStartDesignTaskMutation,
  useSubmitDesignTaskMutation,
  useUploadMediaAssetMutation,
} from '@/features/design-tasks/api/designTasks.mutations'
import {
  useDesignAssigneesQuery,
  useDesignTasksQuery,
  useDesignTaskSummaryQuery,
  useDesignWorkloadQuery,
  usePsdTemplateCandidatesQuery,
} from '@/features/design-tasks/api/designTasks.queries'
import {
  DESIGN_TASK_OUTPUT_OPTIONS,
  DESIGN_TASK_PRIORITY_OPTIONS,
  DESIGN_TASK_TYPE_OPTIONS,
  getDesignTaskActions,
} from '@/features/design-tasks/utils/designTasksApi'
import {
  useCatalogInternalTemplatesQuery,
  useListingShopsQuery,
  useListingsQuery,
} from '@/features/listings/api/listings.queries'
import { useDebounce } from '@/hooks/useDebounce'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'unassigned', label: 'Unassigned' },
  { value: 'requested', label: 'Requested' },
  { value: 'new', label: 'Open' },
  { value: 'assigned', label: 'Assigned' },
  { value: 'inProgress', label: 'In progress' },
  { value: 'uploaded', label: 'Submitted' },
  { value: 'qcRejected', label: 'Rejected' },
  { value: 'qcPassed', label: 'Approved' },
]

const SORT_OPTIONS = [
  { value: 'createdAt', label: 'Created' },
  { value: 'updatedAt', label: 'Updated' },
  { value: 'submittedAt', label: 'Submitted' },
  { value: 'priority', label: 'Priority' },
  { value: 'status', label: 'Status' },
]

const DESIGN_TASK_TYPE_SLUGS = {
  IDEA: 'idea',
  PSD_TEMPLATE: 'psd-template',
  CLONE: 'clone',
  MOCKUP: 'mockup',
  PNG_ASSET: 'png-asset',
}

const DESIGN_TASK_TYPE_BY_SLUG = Object.fromEntries(
  Object.entries(DESIGN_TASK_TYPE_SLUGS).map(([type, slug]) => [slug, type]),
)

const EMPTY_CREATE_VALUES = {
  taskType: 'IDEA',
  listingId: '',
  sourceListingId: '',
  sourceInternalTemplateId: '',
  brief: '',
  priority: 'NORMAL',
  expectedOutputs: ['MOCKUP'],
  note: '',
  referenceAssetIds: [],
}

function fieldFromParams(params, name, fallback) {
  return params.get(name) || fallback
}

function taskTypeFromTab(value) {
  if (value === 'psd') return 'PSD_TEMPLATE'
  if (value === 'png') return 'PNG_ASSET'
  return value || 'IDEA'
}

function taskTypeFromRoute(slug, params) {
  return DESIGN_TASK_TYPE_BY_SLUG[slug] || taskTypeFromTab(params.get('type')) || 'IDEA'
}

function taskTypePath(taskType) {
  return `/portal/design/tasks/${DESIGN_TASK_TYPE_SLUGS[taskType] || DESIGN_TASK_TYPE_SLUGS.IDEA}`
}

function toStatusTab(value) {
  return STATUS_OPTIONS.some((option) => option.value === value) ? value : 'all'
}

function getCurrentUserAccountId(user) {
  return user?.account?.id || user?.accountId || user?.id || ''
}

function statusTone(status) {
  if (['Approved', 'Available'].includes(status)) return 'success'
  if (['Rejected', 'Cancelled'].includes(status)) return 'danger'
  if (['Assigned', 'In Progress', 'Submitted'].includes(status)) return 'warning'
  return 'neutral'
}

function listingLabel(listing) {
  return listing?.asinProductId || listing?.sku || listing?.title || listing?.label || 'Listing'
}

function mergeFilters(current, next) {
  const nextFilters = { ...current, ...next }
  const changed = Object.keys(nextFilters).some((key) => current[key] !== nextFilters[key])
  return changed ? nextFilters : current
}

function SummaryStrip({ summary, workload, isLoading, activeStatus, onStatusChange }) {
  const source = summary || workload || {}
  const items = [
    { label: 'All', value: 'all', count: source.total },
    { label: 'Unassigned', value: 'unassigned', count: source.unassigned },
    { label: 'In progress', value: 'inProgress', count: source.inProgress },
    { label: 'Submitted', value: 'uploaded', count: source.submitted },
    { label: 'Approved', value: 'qcPassed', count: source.approved },
    { label: 'Rejected', value: 'qcRejected', count: source.rejected },
  ]

  if (isLoading) {
    return <Skeleton variant="rectangular" height={42} className="rounded-lg" />
  }

  return <OperationsTabs items={items} value={activeStatus} onChange={onStatusChange} />
}

function TaskTypeTabsInline({ value, onChange }) {
  return (
    <OperationsTabs
      items={DESIGN_TASK_TYPE_OPTIONS}
      value={value}
      onChange={onChange}
      variant="nav"
    />
  )
}

function DesignFilters({
  filters,
  shops,
  assignees,
  showAssigneeFilter,
  activeWorkMode,
  canManageDesign,
  canReviewDesign,
  onChange,
  onWorkModeChange,
  onRefresh,
}) {
  const [moreOpen, setMoreOpen] = useState(false)

  function setField(name, value) {
    onChange({ ...filters, [name]: value, page: 1 })
  }

  const dateRange = {
    start: filters.dateFrom ? dayjs(filters.dateFrom) : null,
    end: filters.dateTo ? dayjs(filters.dateTo) : null,
  }

  function setDateRange(nextRange) {
    onChange({
      ...filters,
      dateFrom: nextRange?.start ? nextRange.start.format('YYYY-MM-DD') : '',
      dateTo: nextRange?.end ? nextRange.end.format('YYYY-MM-DD') : '',
      page: 1,
    })
  }

  const secondaryFilterCount = [
    filters.shopId !== 'all',
    showAssigneeFilter && filters.assignedDesignerId !== 'all',
    filters.priority !== 'all',
    filters.psdStatus !== 'all',
  ].filter(Boolean).length

  return (
    <OperationsToolbar>
      <div className="grid items-end gap-3 xl:grid-cols-[minmax(260px,1fr)_170px_minmax(250px,340px)_auto_auto]">
        <TextField
          size="small"
          value={filters.searchInput}
          onChange={(event) => setField('searchInput', event.target.value)}
          placeholder="Search listing, SKU, ASIN, task"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" className="text-ink-muted" />
                </InputAdornment>
              ),
            },
          }}
        />
        <FormControl size="small">
          <Select value={activeWorkMode} onChange={(event) => onWorkModeChange(event.target.value)}>
            <MenuItem value="mine">My assigned work</MenuItem>
            {canManageDesign ? <MenuItem value="all">All design tasks</MenuItem> : null}
            {canReviewDesign ? <MenuItem value="review">Needs review</MenuItem> : null}
          </Select>
        </FormControl>
        <div className="min-w-0">
          <DateRangePicker value={dateRange} onChange={setDateRange} fullWidth />
        </div>
        <Button
          variant={moreOpen || secondaryFilterCount ? 'contained' : 'outlined'}
          onClick={() => setMoreOpen((current) => !current)}
          className="h-10 whitespace-nowrap"
        >
          More filters{secondaryFilterCount ? ` (${secondaryFilterCount})` : ''}
        </Button>
        <Tooltip title="Refresh">
          <IconButton
            onClick={onRefresh}
            className="h-10 w-10 rounded-lg border border-border bg-surface"
          >
            <RefreshIcon fontSize="small" />
          </IconButton>
        </Tooltip>
      </div>

      {moreOpen ? (
        <div className="grid gap-3 rounded-lg bg-surface-subtle p-3 md:grid-cols-2 xl:grid-cols-6">
          <FormControl size="small">
            <Select
              value={filters.shopId}
              onChange={(event) => setField('shopId', event.target.value)}
            >
              <MenuItem value="all">All shops</MenuItem>
              {shops.map((shop) => (
                <MenuItem key={shop.id} value={shop.id}>
                  {shop.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {showAssigneeFilter ? (
            <FormControl size="small">
              <Select
                value={filters.assignedDesignerId}
                onChange={(event) => setField('assignedDesignerId', event.target.value)}
              >
                <MenuItem value="all">All designers</MenuItem>
                {assignees.map((assignee) => (
                  <MenuItem key={assignee.id} value={assignee.id}>
                    {assignee.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : null}
          <FormControl size="small">
            <Select
              value={filters.priority}
              onChange={(event) => setField('priority', event.target.value)}
            >
              <MenuItem value="all">All priorities</MenuItem>
              {DESIGN_TASK_PRIORITY_OPTIONS.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <Select
              value={filters.psdStatus}
              onChange={(event) => setField('psdStatus', event.target.value)}
            >
              <MenuItem value="all">All PSD</MenuItem>
              <MenuItem value="missing">PSD missing</MenuItem>
              <MenuItem value="present">PSD present</MenuItem>
            </Select>
          </FormControl>
          <FormControl size="small">
            <Select
              value={filters.sortBy}
              onChange={(event) => setField('sortBy', event.target.value)}
            >
              {SORT_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  Sort: {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <div className="grid grid-cols-2 gap-3">
            <FormControl size="small">
              <Select
                value={filters.sortOrder}
                onChange={(event) => setField('sortOrder', event.target.value)}
              >
                <MenuItem value="desc">Newest</MenuItem>
                <MenuItem value="asc">Oldest</MenuItem>
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={filters.pageSize}
                onChange={(event) => setField('pageSize', Number(event.target.value))}
              >
                {[10, 20, 50, 100].map((size) => (
                  <MenuItem key={size} value={size}>
                    {size}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        </div>
      ) : null}
    </OperationsToolbar>
  )
}

const TaskTable = memo(function TaskTable({
  tasks,
  isLoading,
  isSubmitting,
  currentUser,
  showAssignedColumn,
  emptyMessage,
  sortBy,
  sortOrder,
  onSort,
  onAssign,
  onStart,
  onSubmit,
  onApprove,
  onReject,
  onCancel,
}) {
  const columns = [
    { key: 'task', label: 'Task', width: '300px' },
    { key: 'type', label: 'Type', width: '135px' },
    { key: 'status', label: 'Status', width: '130px', sortable: true },
    { key: 'priority', label: 'Priority', width: '115px', sortable: true },
    showAssignedColumn ? { key: 'owner', label: 'Owner', width: '170px' } : null,
    { key: 'shop', label: 'Shop', width: '140px' },
    { key: 'file', label: 'File', width: '150px' },
    { key: 'updatedAt', label: 'Updated', width: '120px', sortable: true },
    { key: 'actions', label: 'Actions', width: '190px' },
  ].filter(Boolean)

  function renderActions(task) {
    const actions = getDesignTaskActions(task, currentUser)

    return (
      <div className="flex items-center gap-1">
        {actions.canAssign ? (
          <IconActionButton
            label="Assign designer"
            disabled={isSubmitting}
            onClick={() => onAssign(task)}
          >
            <AddIcon fontSize="small" />
          </IconActionButton>
        ) : null}
        {actions.canStart ? (
          <IconActionButton
            label="Start task"
            disabled={isSubmitting}
            onClick={() => onStart(task)}
          >
            <PlayArrowIcon fontSize="small" />
          </IconActionButton>
        ) : null}
        {actions.canSubmit ? (
          <IconActionButton
            label="Submit asset"
            disabled={isSubmitting}
            onClick={() => onSubmit(task)}
          >
            <FileUploadOutlinedIcon fontSize="small" />
          </IconActionButton>
        ) : null}
        {actions.canReview ? (
          <>
            <IconActionButton
              label="Approve latest submission"
              disabled={isSubmitting}
              onClick={() => onApprove(task)}
            >
              <CheckIcon fontSize="small" />
            </IconActionButton>
            <IconActionButton
              label="Reject submission"
              disabled={isSubmitting}
              onClick={() => onReject(task)}
            >
              <CloseIcon fontSize="small" />
            </IconActionButton>
          </>
        ) : null}
        {actions.canCancel ? (
          <IconActionButton
            label="Cancel task"
            disabled={isSubmitting}
            tone="danger"
            onClick={() => onCancel(task)}
          >
            <DeleteOutlineOutlinedIcon fontSize="small" />
          </IconActionButton>
        ) : null}
      </div>
    )
  }

  function renderCell(task, column) {
    if (column.key === 'task') {
      return (
        <div className="min-w-0">
          <div className="block max-w-full truncate text-left text-sm font-semibold text-ink-strong">
            {task.listingTitle}
          </div>
          <div className="mt-1 truncate text-xs text-ink-muted">{task.listingCode}</div>
        </div>
      )
    }
    if (column.key === 'type') return <StatusBadge tone="info">{task.taskTypeLabel}</StatusBadge>
    if (column.key === 'status')
      return <StatusBadge tone={statusTone(task.statusTask)}>{task.statusTask}</StatusBadge>
    if (column.key === 'priority') {
      return <span className="text-sm font-semibold text-ink-secondary">{task.priority}</span>
    }
    if (column.key === 'owner')
      return <span className="text-sm text-ink-secondary">{task.assigned}</span>
    if (column.key === 'shop')
      return <span className="text-sm text-ink-secondary">{task.shop}</span>
    if (column.key === 'file') {
      return (
        <div>
          <div className="truncate text-sm text-ink-secondary">{task.latestFile}</div>
          <div className="text-xs text-ink-muted">{task.submissionCount} submissions</div>
        </div>
      )
    }
    if (column.key === 'updatedAt') {
      return (
        <div>
          <div className="text-sm font-semibold text-ink-secondary">{task.updatedAt.date}</div>
          <div className="text-xs text-ink-muted">{task.createdAt.date}</div>
        </div>
      )
    }
    if (column.key === 'actions') return renderActions(task)
    return null
  }

  return (
    <OperationsTable
      columns={columns}
      rows={tasks}
      getRowKey={(task) => task.id}
      renderCell={renderCell}
      loading={isLoading}
      emptyTitle={emptyMessage || 'No design tasks found'}
      emptyDescription="Adjust filters or create a new task."
      sortBy={sortBy}
      sortOrder={sortOrder}
      onSort={onSort}
      minWidth="1350px"
    />
  )
})

function DesignActionDialog({
  action,
  task,
  assignees,
  state,
  isSubmitting,
  onClose,
  onState,
  onAssign,
  onSubmit,
  onReject,
  onCancel,
}) {
  const open = Boolean(action && task)
  const title =
    action === 'assign'
      ? 'Assign designer'
      : action === 'submit'
        ? 'Submit asset'
        : action === 'reject'
          ? 'Reject submission'
          : action === 'cancel'
            ? 'Cancel task'
            : 'Design action'

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className="space-y-4 pt-3">
        <div className="rounded-lg border border-border bg-surface-subtle p-3">
          <Typography variant="body2" className="font-semibold text-ink-strong">
            {task?.listingTitle || 'Design task'}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {task?.taskTypeLabel || '-'} - {task?.listingCode || '-'} - {task?.statusTask || '-'}
          </Typography>
        </div>

        {action === 'assign' ? (
          <div className="grid gap-3">
            <FormControl size="small" fullWidth>
              <Select
                value={state.assignedDesignerId}
                onChange={(event) => onState('assignedDesignerId', event.target.value)}
                displayEmpty
              >
                <MenuItem value="">Select designer</MenuItem>
                {assignees.map((assignee) => (
                  <MenuItem key={assignee.id} value={assignee.id}>
                    {assignee.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              size="small"
              label="Assign note"
              value={state.assignNote}
              onChange={(event) => onState('assignNote', event.target.value)}
              fullWidth
            />
          </div>
        ) : null}

        {action === 'submit' ? (
          <div className="grid gap-3">
            <Button
              variant="outlined"
              component="label"
              startIcon={<FileUploadOutlinedIcon />}
              disabled={isSubmitting}
            >
              Pick file
              <input
                hidden
                type="file"
                accept=".psd,.zip,.rar,.png,.jpg,.jpeg,.webp,.gif,.pdf"
                onChange={(event) => onState('file', event.target.files?.[0] || null)}
              />
            </Button>
            {state.file ? (
              <Typography variant="body2" className="text-ink-muted">
                {state.file.name}
              </Typography>
            ) : null}
          </div>
        ) : null}

        {action === 'reject' ? (
          <TextField
            size="small"
            label="Reject reason"
            value={state.rejectReason}
            onChange={(event) => onState('rejectReason', event.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
        ) : null}

        {action === 'cancel' ? (
          <TextField
            size="small"
            label="Cancel reason"
            value={state.cancelReason}
            onChange={(event) => onState('cancelReason', event.target.value)}
            fullWidth
            multiline
            minRows={3}
          />
        ) : null}
      </DialogContent>
      <DialogActions className="px-6 pb-5">
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        {action === 'assign' ? (
          <Button
            variant="contained"
            onClick={onAssign}
            disabled={!state.assignedDesignerId || isSubmitting}
          >
            Assign
          </Button>
        ) : null}
        {action === 'submit' ? (
          <Button variant="contained" onClick={onSubmit} disabled={!state.file || isSubmitting}>
            Submit asset
          </Button>
        ) : null}
        {action === 'reject' ? (
          <Button
            color="error"
            variant="contained"
            onClick={onReject}
            disabled={!state.rejectReason.trim() || isSubmitting}
          >
            Reject
          </Button>
        ) : null}
        {action === 'cancel' ? (
          <Button
            color="error"
            variant="contained"
            onClick={onCancel}
            disabled={!state.cancelReason.trim() || isSubmitting}
          >
            Cancel task
          </Button>
        ) : null}
      </DialogActions>
    </Dialog>
  )
}

function CreateTaskDialog({
  open,
  values,
  listings,
  sourceListings,
  templates,
  candidates,
  search,
  isSubmitting,
  onChange,
  onSearchChange,
  onClose,
  onSubmit,
}) {
  const targetOptions = values.taskType === 'PSD_TEMPLATE' ? candidates : listings

  function toggleOutput(output) {
    const current = values.expectedOutputs || []
    onChange(
      'expectedOutputs',
      current.includes(output) ? current.filter((item) => item !== output) : [...current, output],
    )
  }

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="lg"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="font-bold text-ink-strong">Create design task</DialogTitle>
      <DialogContent className="grid gap-4 pt-2">
        <div className="grid gap-3 md:grid-cols-3">
          <FormControl size="small">
            <Select
              value={values.taskType}
              onChange={(event) => onChange('taskType', event.target.value)}
            >
              {DESIGN_TASK_TYPE_OPTIONS.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl size="small">
            <Select
              value={values.priority}
              onChange={(event) => onChange('priority', event.target.value)}
            >
              {DESIGN_TASK_PRIORITY_OPTIONS.map((priority) => (
                <MenuItem key={priority} value={priority}>
                  {priority}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            size="small"
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Search listings"
          />
        </div>

        <FormControl size="small">
          <Select
            value={values.listingId}
            onChange={(event) => onChange('listingId', event.target.value)}
            displayEmpty
          >
            <MenuItem value="">Select target listing</MenuItem>
            {targetOptions.map((listing) => (
              <MenuItem key={listing.id} value={listing.id}>
                {listing.label || listingLabel(listing)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {values.taskType === 'CLONE' ? (
          <div className="grid gap-3 md:grid-cols-2">
            <FormControl size="small">
              <Select
                value={values.sourceListingId}
                onChange={(event) => onChange('sourceListingId', event.target.value)}
                displayEmpty
              >
                <MenuItem value="">Source listing</MenuItem>
                {sourceListings.map((listing) => (
                  <MenuItem key={listing.id} value={listing.id}>
                    {listingLabel(listing)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <FormControl size="small">
              <Select
                value={values.sourceInternalTemplateId}
                onChange={(event) => onChange('sourceInternalTemplateId', event.target.value)}
                displayEmpty
              >
                <MenuItem value="">Source internal template</MenuItem>
                {templates.map((template) => (
                  <MenuItem key={template.id} value={template.id}>
                    {template.name || template.code}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </div>
        ) : null}

        <TextField
          multiline
          minRows={4}
          label={values.taskType === 'IDEA' ? 'Creative brief' : 'Brief or instruction'}
          value={values.brief}
          onChange={(event) => onChange('brief', event.target.value)}
          helperText={
            values.taskType === 'IDEA'
              ? 'Required. Describe what designer should create.'
              : 'Use plain operator instruction. No JSON needed.'
          }
        />

        <div className="rounded-lg border border-border p-3">
          <Typography variant="caption" className="font-semibold uppercase text-ink-muted">
            Expected outputs
          </Typography>
          <div className="mt-2 flex flex-wrap gap-3">
            {DESIGN_TASK_OUTPUT_OPTIONS.map((output) => (
              <label
                key={output}
                className="inline-flex items-center gap-1 text-sm text-ink-secondary"
              >
                <Checkbox
                  checked={(values.expectedOutputs || []).includes(output)}
                  onChange={() => toggleOutput(output)}
                />
                {output}
              </label>
            ))}
          </div>
        </div>

        <TextField
          label="Note"
          value={values.note}
          onChange={(event) => onChange('note', event.target.value)}
          size="small"
        />
      </DialogContent>
      <DialogActions className="px-6 pb-5">
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="contained"
          disabled={
            !values.listingId ||
            (values.taskType === 'IDEA' && !values.brief.trim()) ||
            (values.taskType === 'CLONE' &&
              !values.sourceListingId &&
              !values.sourceInternalTemplateId) ||
            isSubmitting
          }
          onClick={onSubmit}
        >
          Create task
        </Button>
      </DialogActions>
    </Dialog>
  )
}

function BulkPsdCreateDialog({
  open,
  search,
  note,
  selectedIds,
  candidates,
  isLoading,
  isSubmitting,
  onClose,
  onSearchChange,
  onNoteChange,
  onToggleCandidate,
  onSelectVisible,
  onSubmit,
}) {
  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      PaperProps={{ className: 'rounded-xl' }}
    >
      <DialogTitle className="font-bold text-ink-strong">Create PSD tasks</DialogTitle>
      <DialogContent className="grid gap-4 pt-2">
        <TextField
          size="small"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="Search missing PSD listings"
        />
        <TextField
          size="small"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          label="Note"
        />
        <div className="max-h-80 overflow-y-auto rounded-lg border border-border">
          {isLoading ? (
            <div className="p-3">
              <Skeleton height={40} />
              <Skeleton height={40} />
              <Skeleton height={40} />
            </div>
          ) : candidates.length ? (
            candidates.map((candidate) => (
              <div
                key={candidate.id}
                className="flex cursor-pointer items-start gap-2 border-b border-border p-3 last:border-b-0"
              >
                <Checkbox
                  inputProps={{ 'aria-label': `Select ${candidate.label}` }}
                  checked={selectedIds.includes(candidate.id)}
                  onChange={() => onToggleCandidate(candidate.id)}
                />
                <span>
                  <span className="block text-sm font-semibold text-ink-secondary">
                    {candidate.label}
                  </span>
                  <span className="text-xs text-ink-muted">{candidate.seller}</span>
                </span>
              </div>
            ))
          ) : (
            <Typography variant="body2" className="p-4 text-ink-muted">
              No missing PSD listings found.
            </Typography>
          )}
        </div>
      </DialogContent>
      <DialogActions className="px-6 pb-5">
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button variant="outlined" onClick={onSelectVisible} disabled={!candidates.length}>
          Select visible
        </Button>
        <Button
          variant="contained"
          onClick={onSubmit}
          disabled={!selectedIds.length || isSubmitting}
        >
          Create tasks
        </Button>
      </DialogActions>
    </Dialog>
  )
}

export default function DesignTasksPage() {
  const queryClient = useQueryClient()
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  const { taskTypeSlug } = useParams()
  const currentUser = useAuthStore((state) => state.currentUser)
  const currentUserAccountId = getCurrentUserAccountId(currentUser)
  const canManageDesign = hasAnyPermission(currentUser, [
    'DESIGN:WRITE',
    'DESIGN_TASKS:ASSIGN',
    'DESIGN_TASKS:WRITE',
  ])
  const canReviewDesign = hasAnyPermission(currentUser, [
    'DESIGN:REVIEW',
    'DESIGN_TASKS:APPROVE',
    'DESIGN_TASKS:REVIEW',
  ])
  const canSubmitDesign = hasAnyPermission(currentUser, ['DESIGN:WORK', 'DESIGN_TASKS:SUBMIT'])
  const defaultWorkMode = canManageDesign
    ? 'all'
    : canReviewDesign && !canSubmitDesign
      ? 'review'
      : 'mine'
  const routeTaskType = taskTypeFromRoute(taskTypeSlug, searchParams)
  const [workMode, setWorkMode] = useState(() =>
    fieldFromParams(searchParams, 'mode', defaultWorkMode),
  )
  const activeWorkMode = !canManageDesign && workMode === 'all' ? defaultWorkMode : workMode
  const activeTaskType = routeTaskType
  const [filters, setFilters] = useState(() => ({
    statusTab: toStatusTab(fieldFromParams(searchParams, 'status', 'all')),
    searchInput: fieldFromParams(searchParams, 'search', ''),
    shopId: fieldFromParams(searchParams, 'shopId', 'all'),
    assignedDesignerId: fieldFromParams(searchParams, 'assignedDesignerId', 'all'),
    priority: fieldFromParams(searchParams, 'priority', 'all'),
    psdStatus: fieldFromParams(searchParams, 'psdStatus', 'all'),
    dateFrom: fieldFromParams(searchParams, 'dateFrom', ''),
    dateTo: fieldFromParams(searchParams, 'dateTo', ''),
    sortBy: fieldFromParams(searchParams, 'sortBy', 'createdAt'),
    sortOrder: fieldFromParams(searchParams, 'sortOrder', 'desc'),
    page: Number(fieldFromParams(searchParams, 'page', '1')) || 1,
    pageSize: Number(fieldFromParams(searchParams, 'pageSize', '20')) || 20,
  }))
  const debouncedSearch = useDebounce(filters.searchInput, 300)
  const query = useMemo(
    () => ({
      ...filters,
      taskType: activeTaskType,
      search: debouncedSearch,
      shopId: filters.shopId === 'all' ? undefined : filters.shopId,
    }),
    [activeTaskType, debouncedSearch, filters],
  )
  const effectiveQuery = useMemo(
    () => ({
      ...query,
      assignedDesignerId:
        activeWorkMode === 'mine' && !canManageDesign && currentUserAccountId
          ? currentUserAccountId
          : query.assignedDesignerId,
      statusTab: activeWorkMode === 'review' ? 'uploaded' : query.statusTab,
    }),
    [activeWorkMode, canManageDesign, currentUserAccountId, query],
  )
  const summaryQueryFilters = useMemo(
    () => ({ ...effectiveQuery, statusTab: 'all' }),
    [effectiveQuery],
  )

  useEffect(() => {
    const next = new URLSearchParams()
    if (activeWorkMode !== defaultWorkMode) next.set('mode', activeWorkMode)
    if (filters.statusTab !== 'all') next.set('status', filters.statusTab)
    if (filters.searchInput) next.set('search', filters.searchInput)
    if (filters.shopId !== 'all') next.set('shopId', filters.shopId)
    if (filters.assignedDesignerId !== 'all')
      next.set('assignedDesignerId', filters.assignedDesignerId)
    if (filters.priority !== 'all') next.set('priority', filters.priority)
    if (filters.psdStatus !== 'all') next.set('psdStatus', filters.psdStatus)
    if (filters.dateFrom) next.set('dateFrom', filters.dateFrom)
    if (filters.dateTo) next.set('dateTo', filters.dateTo)
    next.set('sortBy', filters.sortBy)
    next.set('sortOrder', filters.sortOrder)
    next.set('page', String(filters.page))
    next.set('pageSize', String(filters.pageSize))
    setSearchParams(next, { replace: true })
  }, [activeWorkMode, defaultWorkMode, filters, setSearchParams])

  useEffect(() => {
    if (taskTypeSlug !== DESIGN_TASK_TYPE_SLUGS[activeTaskType] || searchParams.has('type')) {
      const next = new URLSearchParams(searchParams)
      next.delete('type')
      navigate(
        {
          pathname: taskTypePath(activeTaskType),
          search: next.toString() ? `?${next.toString()}` : '',
        },
        { replace: true },
      )
    }
  }, [activeTaskType, navigate, searchParams, taskTypeSlug])

  const tasksQuery = useDesignTasksQuery(effectiveQuery)
  const summaryQuery = useDesignTaskSummaryQuery(summaryQueryFilters)
  const workloadQuery = useDesignWorkloadQuery(summaryQueryFilters)
  const shopsQuery = useListingShopsQuery({ limit: 100 })
  const assigneesQuery = useDesignAssigneesQuery({ taskType: activeTaskType })
  const [actionTask, setActionTask] = useState(null)
  const [selectedAction, setSelectedAction] = useState(null)
  const [detailState, setDetailState] = useState({
    assignedDesignerId: '',
    assignNote: '',
    file: null,
    rejectReason: '',
    cancelReason: '',
  })
  const [createOpen, setCreateOpen] = useState(false)
  const [createSearch, setCreateSearch] = useState('')
  const debouncedCreateSearch = useDebounce(createSearch, 300)
  const [createValues, setCreateValues] = useState(EMPTY_CREATE_VALUES)
  const listingsQuery = useListingsQuery(
    { search: debouncedCreateSearch, page: 1, limit: 20 },
    { enabled: createOpen },
  )
  const sourceListingsQuery = useListingsQuery(
    { search: debouncedCreateSearch, page: 1, limit: 20 },
    { enabled: createOpen && createValues.taskType === 'CLONE' },
  )
  const templatesQuery = useCatalogInternalTemplatesQuery(
    { limit: 100, status: 'ACTIVE' },
    { enabled: createOpen && createValues.taskType === 'CLONE' },
  )
  const candidatesQuery = usePsdTemplateCandidatesQuery(
    {
      search: debouncedCreateSearch,
      page: 1,
      limit: 20,
    },
    { enabled: createOpen && createValues.taskType === 'PSD_TEMPLATE' },
  )
  const [bulkOpen, setBulkOpen] = useState(false)
  const [bulkSearch, setBulkSearch] = useState('')
  const debouncedBulkSearch = useDebounce(bulkSearch, 300)
  const [bulkNote, setBulkNote] = useState('')
  const [selectedCandidateIds, setSelectedCandidateIds] = useState([])
  const bulkCandidatesQuery = usePsdTemplateCandidatesQuery(
    { search: debouncedBulkSearch, page: 1, limit: 20 },
    { enabled: bulkOpen },
  )
  const createTaskMutation = useCreateDesignTaskMutation()
  const uploadMediaMutation = useUploadMediaAssetMutation()
  const assignMutation = useAssignDesignTaskMutation()
  const startMutation = useStartDesignTaskMutation()
  const submitMutation = useSubmitDesignTaskMutation()
  const approveMutation = useApproveDesignTaskMutation()
  const rejectMutation = useRejectDesignTaskMutation()
  const cancelMutation = useCancelDesignTaskMutation()
  const bulkCreateMutation = useBulkCreatePsdTasksMutation()
  const startDesignTask = startMutation.mutateAsync
  const approveDesignTask = approveMutation.mutateAsync
  const tasks = tasksQuery.data?.items || []
  const total = tasksQuery.data?.total || 0
  const isDetailSubmitting =
    uploadMediaMutation.isPending ||
    assignMutation.isPending ||
    startMutation.isPending ||
    submitMutation.isPending ||
    approveMutation.isPending ||
    rejectMutation.isPending ||
    cancelMutation.isPending

  const setFilter = useCallback((next) => {
    setFilters((current) => mergeFilters(current, next))
  }, [])

  const setDesignFilters = useCallback((next) => {
    const nextFilters = { ...next }
    delete nextFilters.taskType
    setFilters((current) => mergeFilters(current, nextFilters))
  }, [])

  const sortByColumn = useCallback((sortBy) => {
    setFilters((current) =>
      mergeFilters(current, {
        sortBy,
        sortOrder: current.sortBy === sortBy && current.sortOrder === 'asc' ? 'desc' : 'asc',
        page: 1,
      }),
    )
  }, [])

  const setStatusFilter = useCallback(
    (statusTab) => {
      setFilters((current) => mergeFilters(current, { statusTab, page: 1 }))
      if (activeWorkMode === 'review' && statusTab !== 'uploaded' && canManageDesign) {
        setWorkMode('all')
      }
    },
    [activeWorkMode, canManageDesign],
  )

  const setTaskTypePage = useCallback(
    (taskType) => {
      setFilters((current) => mergeFilters(current, { page: 1 }))
      const next = new URLSearchParams(searchParams)
      next.delete('type')
      next.set('page', '1')
      const pathname = taskTypePath(taskType)
      if (pathname === taskTypePath(activeTaskType) && next.toString() === searchParams.toString())
        return
      navigate({
        pathname,
        search: next.toString() ? `?${next.toString()}` : '',
      })
    },
    [activeTaskType, navigate, searchParams],
  )

  const openAction = useCallback((task, action) => {
    setActionTask(task)
    setSelectedAction(action)
    setDetailState({
      assignedDesignerId: '',
      assignNote: '',
      file: null,
      rejectReason: '',
      cancelReason: '',
    })
  }, [])

  const closeAction = useCallback(() => {
    setActionTask(null)
    setSelectedAction(null)
  }, [])

  const resetCreate = useCallback(
    (nextType = activeTaskType) => {
      setCreateValues({ ...EMPTY_CREATE_VALUES, taskType: nextType })
      setCreateSearch('')
    },
    [activeTaskType],
  )

  const runAction = useCallback(
    async (action, successMessage) => {
      try {
        await action()
        enqueueSnackbar(successMessage, { variant: 'success' })
      } catch (error) {
        enqueueSnackbar(error.message || 'Design action failed', { variant: 'error' })
      }
    },
    [enqueueSnackbar],
  )

  const handleAssignTask = useCallback((task) => openAction(task, 'assign'), [openAction])

  const handleStartTask = useCallback(
    (task) => runAction(() => startDesignTask({ taskId: task.id }), 'Task started'),
    [runAction, startDesignTask],
  )

  const handleSubmitAction = useCallback((task) => openAction(task, 'submit'), [openAction])

  const handleApproveTask = useCallback(
    (task) => runAction(() => approveDesignTask({ taskId: task.id }), 'Task approved'),
    [approveDesignTask, runAction],
  )

  const handleRejectTask = useCallback((task) => openAction(task, 'reject'), [openAction])

  const handleCancelTask = useCallback((task) => openAction(task, 'cancel'), [openAction])

  const handleWorkModeChange = useCallback((mode) => {
    setWorkMode((current) => (current === mode ? current : mode))
    setFilters((current) => mergeFilters(current, { page: 1 }))
  }, [])

  function updateDetailState(name, value) {
    setDetailState((current) => ({ ...current, [name]: value }))
  }

  function updateCreateValue(name, value) {
    setCreateValues((current) => ({
      ...current,
      [name]: value,
      ...(name === 'taskType'
        ? {
            listingId: '',
            sourceListingId: '',
            sourceInternalTemplateId: '',
            expectedOutputs:
              value === 'IDEA'
                ? ['MOCKUP']
                : value === 'PSD_TEMPLATE'
                  ? ['PSD_TEMPLATE']
                  : ['PNG_ASSET'],
          }
        : {}),
    }))
  }

  async function handleSubmitTask() {
    if (!detailState.file || !actionTask?.id) return
    await runAction(async () => {
      const asset = await uploadMediaMutation.mutateAsync(detailState.file)
      await submitMutation.mutateAsync({
        taskId: actionTask.id,
        mediaAssetId: asset?.id || asset?._id,
      })
      updateDetailState('file', null)
      closeAction()
    }, 'Asset submitted')
  }

  async function handleCreateTask() {
    await runAction(async () => {
      await createTaskMutation.mutateAsync(createValues)
      setCreateOpen(false)
      resetCreate()
    }, 'Design task created')
  }

  async function handleBulkCreate() {
    await runAction(async () => {
      await bulkCreateMutation.mutateAsync({ listingIds: selectedCandidateIds, note: bulkNote })
      setBulkOpen(false)
      setSelectedCandidateIds([])
      setBulkNote('')
    }, 'PSD tasks created')
  }

  return (
    <>
      <OperationsPageShell
        header={
          <OperationsHeader
            title="Design Operations"
            subtitle="Manage design tasks, files, assignments, and approvals without raw payloads."
            actions={
              canManageDesign ? (
                <>
                  <Button
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      setBulkOpen(true)
                      setSelectedCandidateIds([])
                      setBulkNote('')
                    }}
                  >
                    Bulk PSD
                  </Button>
                  <Button
                    variant="contained"
                    startIcon={<AddIcon />}
                    onClick={() => {
                      resetCreate(activeTaskType)
                      setCreateOpen(true)
                    }}
                  >
                    Create task
                  </Button>
                </>
              ) : null
            }
          />
        }
        tabs={
          <div className="space-y-3">
            <TaskTypeTabsInline value={activeTaskType} onChange={setTaskTypePage} />
            <SummaryStrip
              summary={summaryQuery.data}
              workload={workloadQuery.data}
              isLoading={summaryQuery.isPending}
              activeStatus={activeWorkMode === 'review' ? 'uploaded' : filters.statusTab}
              onStatusChange={setStatusFilter}
            />
          </div>
        }
        toolbar={
          <DesignFilters
            filters={filters}
            shops={shopsQuery.data || []}
            assignees={assigneesQuery.data || []}
            showAssigneeFilter={canManageDesign || canReviewDesign}
            activeWorkMode={activeWorkMode}
            canManageDesign={canManageDesign}
            canReviewDesign={canReviewDesign}
            onChange={setDesignFilters}
            onWorkModeChange={handleWorkModeChange}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: designTasksKeys.all })}
          />
        }
        pagination={
          <OperationsPagination
            page={filters.page}
            pageSize={filters.pageSize}
            total={total}
            onPageChange={(page) => setFilter({ page })}
            onPageSizeChange={(pageSize) => setFilter({ pageSize, page: 1 })}
          />
        }
      >
        <TaskTable
          tasks={tasks}
          isLoading={tasksQuery.isPending}
          isSubmitting={isDetailSubmitting}
          currentUser={currentUser}
          showAssignedColumn={canManageDesign || canReviewDesign}
          sortBy={filters.sortBy}
          sortOrder={filters.sortOrder}
          onSort={sortByColumn}
          emptyMessage={
            activeWorkMode === 'mine'
              ? 'No tasks assigned to you.'
              : activeWorkMode === 'review'
                ? 'No submissions waiting for review.'
                : 'No design tasks found.'
          }
          onAssign={handleAssignTask}
          onStart={handleStartTask}
          onSubmit={handleSubmitAction}
          onApprove={handleApproveTask}
          onReject={handleRejectTask}
          onCancel={handleCancelTask}
        />
      </OperationsPageShell>

      <DesignActionDialog
        action={selectedAction}
        task={actionTask}
        assignees={assigneesQuery.data || []}
        state={detailState}
        isSubmitting={isDetailSubmitting}
        onClose={closeAction}
        onState={updateDetailState}
        onAssign={() =>
          runAction(async () => {
            await assignMutation.mutateAsync({
              taskId: actionTask.id,
              assignedDesignerId: detailState.assignedDesignerId,
              note: detailState.assignNote,
            })
            closeAction()
          }, 'Task assigned')
        }
        onSubmit={handleSubmitTask}
        onReject={() =>
          runAction(async () => {
            await rejectMutation.mutateAsync({
              taskId: actionTask.id,
              rejectReason: detailState.rejectReason,
            })
            closeAction()
          }, 'Task rejected')
        }
        onCancel={() =>
          runAction(async () => {
            await cancelMutation.mutateAsync({
              taskId: actionTask.id,
              cancelReason: detailState.cancelReason,
            })
            closeAction()
          }, 'Task cancelled')
        }
      />

      <CreateTaskDialog
        open={createOpen}
        values={createValues}
        listings={listingsQuery.data?.items || []}
        sourceListings={sourceListingsQuery.data?.items || []}
        templates={templatesQuery.data?.items || []}
        candidates={candidatesQuery.data?.items || []}
        search={createSearch}
        isSubmitting={createTaskMutation.isPending}
        onChange={updateCreateValue}
        onSearchChange={setCreateSearch}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreateTask}
      />

      <BulkPsdCreateDialog
        open={bulkOpen}
        search={bulkSearch}
        note={bulkNote}
        selectedIds={selectedCandidateIds}
        candidates={bulkCandidatesQuery.data?.items || []}
        isLoading={bulkCandidatesQuery.isPending}
        isSubmitting={bulkCreateMutation.isPending}
        onClose={() => setBulkOpen(false)}
        onSearchChange={setBulkSearch}
        onNoteChange={setBulkNote}
        onToggleCandidate={(candidateId) =>
          setSelectedCandidateIds((current) =>
            current.includes(candidateId)
              ? current.filter((id) => id !== candidateId)
              : [...current, candidateId],
          )
        }
        onSelectVisible={() =>
          setSelectedCandidateIds(
            (bulkCandidatesQuery.data?.items || []).map((candidate) => candidate.id),
          )
        }
        onSubmit={handleBulkCreate}
      />
    </>
  )
}
