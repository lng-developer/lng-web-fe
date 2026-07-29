import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Button,
  Checkbox,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { z } from 'zod'

import AnimatedDialog from '@/components/common/AnimatedDialog'
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
import { useEmployeeProfilesQuery } from '@/features/hr-time/api/hrTime.queries.js'
import { apiClient } from '@/services/axiosInstance'
import { ENDPOINTS } from '@/services/endpoints'
import { useAuthStore } from '@/store/useAuthStore'

import AnnouncementDetailDrawer from '../components/AnnouncementDetailDrawer.jsx'
import {
  announcementPreview,
  buildAnnouncementPayload,
  mapAnnouncementCollection,
} from '../utils/announcementApi.js'

const pageSize = 20
const queryKey = ['hr-announcements']
const categories = ['NEWS', 'POLICY', 'EVENT', 'OTHER']
const statuses = ['DRAFT', 'SCHEDULED', 'PUBLISHED', 'ARCHIVED']
const priorities = ['LOW', 'NORMAL', 'HIGH', 'URGENT']
const columns = [
  { key: 'announcement', label: 'Announcement', width: '330px' },
  { key: 'category', label: 'Category', width: '130px' },
  { key: 'audience', label: 'Audience', width: '180px' },
  { key: 'status', label: 'Status', width: '130px' },
  { key: 'publishedAt', label: 'Publication', width: '190px' },
  { key: 'actions', label: 'Actions', width: '100px', align: 'center' },
]

const schema = z
  .object({
    title: z.string().trim().min(1, 'Title is required').max(200),
    content: z.string().trim().min(1, 'Content is required').max(20_000),
    category: z.enum(categories),
    priority: z.enum(priorities),
    status: z.enum(statuses),
    sendToAll: z.boolean(),
    targetDepartmentIds: z.array(z.string()),
    targetProfileIds: z.array(z.string()),
    isPinned: z.boolean(),
    scheduledAt: z.string(),
  })
  .superRefine((values, context) => {
    if (
      !values.sendToAll &&
      !values.targetDepartmentIds.length &&
      !values.targetProfileIds.length
    ) {
      context.addIssue({
        code: 'custom',
        path: ['targetProfileIds'],
        message: 'Select an audience',
      })
    }
    if (values.status === 'SCHEDULED' && !values.scheduledAt) {
      context.addIssue({
        code: 'custom',
        path: ['scheduledAt'],
        message: 'Schedule time is required',
      })
    }
  })

function unwrap(response) {
  return response?.data ?? response
}

function defaultValues(record) {
  return {
    title: record?.title || '',
    content: record?.content || '',
    category: record?.category || 'NEWS',
    priority: record?.priority || 'NORMAL',
    status: record?.status || 'DRAFT',
    sendToAll: record?.sendToAll ?? true,
    targetDepartmentIds: record?.targetDepartmentIds || [],
    targetProfileIds: record?.targetProfileIds || [],
    isPinned: Boolean(record?.isPinned),
    scheduledAt: record?.scheduledAt ? new Date(record.scheduledAt).toISOString().slice(0, 16) : '',
  }
}

function AnnouncementDialog({ record, profiles, open, loading, error, onClose, onSubmit }) {
  const {
    control,
    handleSubmit,
    register,
    formState: { errors },
  } = useForm({ resolver: zodResolver(schema), defaultValues: defaultValues(record) })
  const sendToAll = useWatch({ control, name: 'sendToAll' })
  const status = useWatch({ control, name: 'status' })
  const departments = useMemo(
    () => [
      ...new Map(
        profiles
          .filter((profile) => profile.department?.id)
          .map((profile) => [profile.department.id, profile.department]),
      ).values(),
    ],
    [profiles],
  )

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{record ? 'Edit announcement' : 'Create announcement'}</DialogTitle>
        <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
          {error ? (
            <Alert severity="error" className="sm:col-span-2">
              {error}
            </Alert>
          ) : null}
          <TextField
            label="Title"
            className="sm:col-span-2"
            {...register('title')}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
          />
          <TextField
            select
            label="Category"
            defaultValue={defaultValues(record).category}
            {...register('category')}
          >
            {categories.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Priority"
            defaultValue={defaultValues(record).priority}
            {...register('priority')}
          >
            {priorities.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            label="Status"
            defaultValue={defaultValues(record).status}
            {...register('status')}
          >
            {statuses.map((value) => (
              <MenuItem key={value} value={value}>
                {value}
              </MenuItem>
            ))}
          </TextField>
          {status === 'SCHEDULED' ? (
            <TextField
              type="datetime-local"
              label="Publish at"
              slotProps={{ inputLabel: { shrink: true } }}
              {...register('scheduledAt')}
              error={Boolean(errors.scheduledAt)}
              helperText={errors.scheduledAt?.message}
            />
          ) : (
            <span />
          )}
          <Controller
            name="sendToAll"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                  />
                }
                label="Send to all employees"
              />
            )}
          />
          <Controller
            name="isPinned"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={
                  <Checkbox
                    checked={field.value}
                    onChange={(_, checked) => field.onChange(checked)}
                  />
                }
                label="Pin announcement"
              />
            )}
          />
          {!sendToAll ? (
            <>
              <Controller
                name="targetDepartmentIds"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Departments"
                    slotProps={{ select: { multiple: true } }}
                    {...field}
                  >
                    {departments.map((department) => (
                      <MenuItem key={department.id} value={department.id}>
                        {department.name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
              <Controller
                name="targetProfileIds"
                control={control}
                render={({ field }) => (
                  <TextField
                    select
                    label="Employees"
                    slotProps={{ select: { multiple: true } }}
                    error={Boolean(errors.targetProfileIds)}
                    helperText={errors.targetProfileIds?.message}
                    {...field}
                  >
                    {profiles.map((profile) => (
                      <MenuItem key={profile.id} value={profile.id}>
                        {profile.fullName}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </>
          ) : null}
          <TextField
            label="Message"
            multiline
            minRows={7}
            className="sm:col-span-2"
            {...register('content')}
            error={Boolean(errors.content)}
            helperText={errors.content?.message}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Save announcement
          </Button>
        </DialogActions>
      </form>
    </AnimatedDialog>
  )
}

export default function AnnouncementsPage() {
  const user = useAuthStore((state) => state.currentUser)
  const queryClient = useQueryClient()
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const search = searchParams.get('search') || ''
  const category = searchParams.get('category') || ''
  const status = searchParams.get('status') || ''
  const [editor, setEditor] = useState(null)
  const [deleting, setDeleting] = useState(null)
  const [selectedId, setSelectedId] = useState(null)
  const [actionError, setActionError] = useState('')
  const canCreate = hasAnyPermission(user, ['HR_ANNOUNCEMENTS:WRITE'])
  const profilesQuery = useEmployeeProfilesQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: canCreate },
  )
  const query = useQuery({
    queryKey: [...queryKey, { page, search, category, status }],
    queryFn: () =>
      apiClient
        .get(ENDPOINTS.HR.ANNOUNCEMENTS, {
          params: {
            page,
            limit: pageSize,
            search: search || undefined,
            category: category || undefined,
            status: status || undefined,
          },
        })
        .then(unwrap)
        .then(mapAnnouncementCollection),
  })
  const save = useMutation({
    mutationFn: ({ id, payload }) =>
      (id
        ? apiClient.patch(ENDPOINTS.HR.ANNOUNCEMENT(id), payload)
        : apiClient.post(ENDPOINTS.HR.ANNOUNCEMENTS, payload)
      ).then(unwrap),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const remove = useMutation({
    mutationFn: (id) => apiClient.delete(ENDPOINTS.HR.ANNOUNCEMENT(id)).then(unwrap),
    retry: false,
    onSuccess: () => queryClient.invalidateQueries({ queryKey }),
  })
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const pinnedRows = rows.filter((row) => row.isPinned)
  const inboxRows = rows.filter((row) => !row.isPinned)
  const statusCounts = statuses.reduce(
    (counts, value) => ({
      ...counts,
      [value]: rows.filter((row) => row.status === value).length,
    }),
    {},
  )

  function updateSearch(key, value, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        if (value === '') next.delete(key)
        else next.set(key, String(value))
        if (resetPage) next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  async function submit(values) {
    setActionError('')
    try {
      const payload = buildAnnouncementPayload(values)
      await save.mutateAsync({ id: editor?.id, payload })
      setEditor(null)
    } catch (error) {
      setActionError(error.message || 'Could not save announcement')
    }
  }

  function renderCell(row, column) {
    if (column.key === 'announcement')
      return (
        <button
          type="button"
          className="w-full text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary"
          onClick={() => setSelectedId(row.id)}
        >
          <div className="flex items-start gap-2">
            {row.isPinned && (
              <span className="shrink-0 mt-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                Pinned
              </span>
            )}
            <div>
              <Typography variant="body2" className="font-bold text-ink-strong">
                {row.title}
              </Typography>
              <Typography variant="caption" className="line-clamp-2 text-ink-muted mt-0.5">
                {announcementPreview(row.content)}
              </Typography>
            </div>
          </div>
        </button>
      )
    if (column.key === 'category') {
      const colors = {
        NEWS: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200 dark:border-blue-800/50',
        POLICY:
          'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200 dark:border-purple-800/50',
        EVENT:
          'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200 dark:border-amber-800/50',
        OTHER:
          'bg-slate-50 text-slate-700 dark:bg-slate-800/50 dark:text-slate-400 border-slate-200 dark:border-slate-700/50',
      }
      return (
        <span
          className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${colors[row.category] || colors.OTHER}`}
        >
          {row.category}
        </span>
      )
    }
    if (column.key === 'audience')
      return row.sendToAll
        ? 'All employees'
        : `${row.targetDepartmentIds?.length || 0} depts · ${row.targetProfileIds?.length || 0} users`
    if (column.key === 'status')
      return (
        <StatusBadge
          tone={
            row.status === 'PUBLISHED' ? 'success' : row.status === 'SCHEDULED' ? 'info' : 'neutral'
          }
        >
          {row.status}
        </StatusBadge>
      )
    if (column.key === 'publishedAt')
      return row.publishedAt || row.scheduledAt
        ? new Date(row.publishedAt || row.scheduledAt).toLocaleString()
        : '-'
    if (column.key === 'actions')
      return (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <IconActionButton label="View announcement" onClick={() => setSelectedId(row.id)}>
            <VisibilityOutlinedIcon fontSize="small" />
          </IconActionButton>
          {row.capabilities?.update ? (
            <IconActionButton
              label="Edit announcement"
              tone="primary"
              onClick={() => setEditor(row)}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
          {row.capabilities?.delete ? (
            <IconActionButton
              label="Delete announcement"
              tone="danger"
              onClick={() => setDeleting(row)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconActionButton>
          ) : null}
        </Stack>
      )
    return '-'
  }

  const [viewMode, setViewMode] = useState('list')

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title="Announcements"
          subtitle="Publish HR news, policies, and events to authorized audiences."
          actions={
            <div className="flex gap-2">
              <Button
                variant="outlined"
                onClick={() => setViewMode(viewMode === 'list' ? 'grid' : 'list')}
              >
                {viewMode === 'list' ? 'Grid view' : 'List view'}
              </Button>
              {canCreate ? (
                <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditor({})}>
                  Create announcement
                </Button>
              ) : null}
            </div>
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-start gap-3">
            <TextField
              size="small"
              className="w-72"
              label="Search"
              value={search}
              onChange={(event) => updateSearch('search', event.target.value, true)}
            />
            <TextField
              select
              size="small"
              className="w-44"
              label="Category"
              value={category}
              onChange={(event) => updateSearch('category', event.target.value, true)}
            >
              <MenuItem value="">All</MenuItem>
              {categories.map((value) => (
                <MenuItem key={value} value={value}>
                  {value}
                </MenuItem>
              ))}
            </TextField>
            {canCreate ? (
              <TextField
                select
                size="small"
                className="w-44"
                label="Status"
                value={status}
                onChange={(event) => updateSearch('status', event.target.value, true)}
              >
                <MenuItem value="">All</MenuItem>
                {statuses.map((value) => (
                  <MenuItem key={value} value={value}>
                    {value}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={query.isFetching}
              onClick={() => query.refetch()}
            >
              Refresh
            </Button>
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page || page}
          pageSize={pagination.limit || pageSize}
          total={pagination.total || 0}
          onPageChange={(value) => updateSearch('page', value)}
        />
      }
    >
      {query.error ? (
        <Alert severity="error" className="mb-3">
          {query.error.message}
        </Alert>
      ) : null}

      <div className="h-full overflow-y-auto pb-4">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_240px]">
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-3">
              {[
                ['Published', statusCounts.PUBLISHED || 0, 'border-success/40 text-success-dark'],
                ['Scheduled', statusCounts.SCHEDULED || 0, 'border-warning/40 text-warning-dark'],
                ['Draft', statusCounts.DRAFT || 0, 'border-primary/30 text-primary'],
              ].map(([label, value, tone]) => (
                <div key={label} className={`rounded-lg border bg-surface px-4 py-3 ${tone}`}>
                  <div className="text-2xl font-bold">{value}</div>
                  <div className="text-sm text-ink-muted">{label}</div>
                </div>
              ))}
            </div>

            {pinnedRows.length ? (
              <section>
                <Typography variant="subtitle2" className="mb-2 font-semibold text-ink-strong">
                  Pinned announcements
                </Typography>
                <div className="space-y-2">
                  {pinnedRows.map((row) => (
                    <button
                      key={row.id}
                      type="button"
                      onClick={() => setSelectedId(row.id)}
                      className="grid w-full grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 rounded-lg border border-warning/40 border-l-4 border-l-warning bg-warning-light/40 px-4 py-3 text-left"
                    >
                      {renderCell(row, { key: 'category' })}
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-ink-strong">
                          {row.title}
                        </span>
                        <span className="block truncate text-xs text-ink-muted">
                          {announcementPreview(row.content)}
                        </span>
                      </span>
                      <StatusBadge tone="success">{row.status}</StatusBadge>
                    </button>
                  ))}
                </div>
              </section>
            ) : null}

            {viewMode === 'list' ? (
              <OperationsTable
                columns={columns}
                rows={inboxRows}
                loading={query.isPending}
                getRowKey={(row) => row.id}
                renderCell={renderCell}
                minWidth="1060px"
                bodyClassName="h-auto overflow-visible rounded-lg border border-border"
                emptyTitle="No announcements"
                emptyDescription="Published announcements and drafts in your access scope appear here."
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {inboxRows.map((row) => (
                  <button
                    key={row.id}
                    onClick={() => setSelectedId(row.id)}
                    className="flex flex-col text-left border border-border bg-surface hover:shadow-md transition-all rounded-xl overflow-hidden focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary group"
                  >
                    <div className="p-5 flex-grow w-full">
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex gap-2">
                          {renderCell(row, { key: 'category' })}
                          {row.isPinned && (
                            <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-800 dark:bg-rose-900/40 dark:text-rose-300">
                              Pinned
                            </span>
                          )}
                        </div>
                      </div>
                      <Typography
                        variant="subtitle1"
                        className="font-bold text-ink-strong mb-2 group-hover:text-primary transition-colors line-clamp-2"
                      >
                        {row.title}
                      </Typography>
                      <Typography variant="body2" className="text-ink-muted line-clamp-3 mb-4">
                        {announcementPreview(row.content)}
                      </Typography>
                    </div>
                    <div className="bg-surface-subtle border-t border-border p-3 w-full flex justify-between items-center text-xs text-ink-secondary">
                      <span>{renderCell(row, { key: 'publishedAt' })}</span>
                      <span>{renderCell(row, { key: 'audience' })}</span>
                    </div>
                  </button>
                ))}
                {inboxRows.length === 0 && !query.isPending && (
                  <div className="col-span-full py-10 text-center">
                    <Typography variant="subtitle1" className="text-ink-strong">
                      No announcements
                    </Typography>
                    <Typography variant="body2" className="text-ink-muted">
                      Published announcements and drafts in your access scope appear here.
                    </Typography>
                  </div>
                )}
              </div>
            )}
          </div>
          <aside className="rounded-lg border border-border bg-surface p-4">
            <Typography variant="subtitle2" className="font-semibold text-ink-strong">
              Announcements overview
            </Typography>
            <dl className="mt-4 space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-ink-muted">Total announcements</dt>
                <dd className="font-semibold text-ink-strong">{pagination.total || rows.length}</dd>
              </div>
              {categories.map((value) => (
                <div key={value} className="flex justify-between gap-3">
                  <dt className="text-ink-muted">{value}</dt>
                  <dd className="font-semibold text-ink-strong">
                    {rows.filter((row) => row.category === value).length}
                  </dd>
                </div>
              ))}
            </dl>
          </aside>
        </div>
      </div>

      <AnnouncementDetailDrawer
        announcementId={selectedId}
        open={Boolean(selectedId)}
        onClose={() => setSelectedId(null)}
        onEdit={(announcement) => {
          setSelectedId(null)
          setEditor(announcement)
        }}
        onDelete={(announcement) => {
          setSelectedId(null)
          setDeleting(announcement)
        }}
      />
      {editor ? (
        <AnnouncementDialog
          key={editor.id || 'new'}
          record={editor.id ? editor : null}
          profiles={profilesQuery.data?.items || []}
          open
          loading={save.isPending}
          error={actionError}
          onClose={() => setEditor(null)}
          onSubmit={submit}
        />
      ) : null}
      <AnimatedDialog open={Boolean(deleting)} onClose={() => setDeleting(null)}>
        <DialogTitle>Delete announcement?</DialogTitle>
        <DialogContent>
          <Typography>This removes “{deleting?.title}” from active announcement lists.</Typography>
          {actionError ? (
            <Alert severity="error" className="mt-3">
              {actionError}
            </Alert>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleting(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            disabled={remove.isPending}
            onClick={async () => {
              setActionError('')
              try {
                await remove.mutateAsync(deleting.id)
                setDeleting(null)
              } catch (error) {
                setActionError(error.message || 'Could not delete announcement')
              }
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </AnimatedDialog>
    </OperationsPageShell>
  )
}
