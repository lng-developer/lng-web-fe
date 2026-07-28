import { useMemo, useState } from 'react'
import { Controller, useForm, useWatch } from 'react-hook-form'
import { useSearchParams } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
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

import { buildAnnouncementPayload, mapAnnouncementCollection } from '../utils/announcementApi.js'

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
    if (!values.sendToAll && !values.targetDepartmentIds.length && !values.targetProfileIds.length) {
      context.addIssue({ code: 'custom', path: ['targetProfileIds'], message: 'Select an audience' })
    }
    if (values.status === 'SCHEDULED' && !values.scheduledAt) {
      context.addIssue({ code: 'custom', path: ['scheduledAt'], message: 'Schedule time is required' })
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
    () =>
      [...new Map(profiles.filter((profile) => profile.department?.id).map((profile) => [profile.department.id, profile.department])).values()],
    [profiles],
  )

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={handleSubmit(onSubmit)}>
        <DialogTitle>{record ? 'Edit announcement' : 'Create announcement'}</DialogTitle>
        <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
          {error ? <Alert severity="error" className="sm:col-span-2">{error}</Alert> : null}
          <TextField
            label="Title"
            className="sm:col-span-2"
            {...register('title')}
            error={Boolean(errors.title)}
            helperText={errors.title?.message}
          />
          <TextField select label="Category" defaultValue={defaultValues(record).category} {...register('category')}>
            {categories.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
          <TextField select label="Priority" defaultValue={defaultValues(record).priority} {...register('priority')}>
            {priorities.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
          </TextField>
          <TextField select label="Status" defaultValue={defaultValues(record).status} {...register('status')}>
            {statuses.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}
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
          ) : <span />}
          <Controller
            name="sendToAll"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
                label="Send to all employees"
              />
            )}
          />
          <Controller
            name="isPinned"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Checkbox checked={field.value} onChange={(_, checked) => field.onChange(checked)} />}
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
                  <TextField select label="Departments" slotProps={{ select: { multiple: true } }} {...field}>
                    {departments.map((department) => <MenuItem key={department.id} value={department.id}>{department.name}</MenuItem>)}
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
                    {profiles.map((profile) => <MenuItem key={profile.id} value={profile.id}>{profile.fullName}</MenuItem>)}
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
          <Button onClick={onClose} disabled={loading}>Cancel</Button>
          <Button type="submit" variant="contained" disabled={loading}>Save announcement</Button>
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
  const [actionError, setActionError] = useState('')
  const canCreate = hasAnyPermission(user, ['HR_ANNOUNCEMENTS:WRITE'])
  const profilesQuery = useEmployeeProfilesQuery({ page: 1, limit: 100, status: 'ACTIVE' }, { enabled: canCreate })
  const query = useQuery({
    queryKey: [...queryKey, { page, search, category, status }],
    queryFn: () => apiClient.get(ENDPOINTS.HR.ANNOUNCEMENTS, { params: { page, limit: pageSize, search: search || undefined, category: category || undefined, status: status || undefined } }).then(unwrap).then(mapAnnouncementCollection),
  })
  const save = useMutation({
    mutationFn: ({ id, payload }) =>
      (id ? apiClient.patch(ENDPOINTS.HR.ANNOUNCEMENT(id), payload) : apiClient.post(ENDPOINTS.HR.ANNOUNCEMENTS, payload)).then(unwrap),
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

  function updateSearch(key, value, resetPage = false) {
    setSearchParams((current) => {
      const next = new URLSearchParams(current)
      if (value === '') next.delete(key)
      else next.set(key, String(value))
      if (resetPage) next.set('page', '1')
      return next
    }, { replace: true })
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
    if (column.key === 'announcement') return <div><Typography variant="body2" className="font-semibold text-ink-strong">{row.title}</Typography><Typography variant="caption" className="line-clamp-2 text-ink-muted">{row.content}</Typography></div>
    if (column.key === 'category') return `${row.category}${row.isPinned ? ' · PINNED' : ''}`
    if (column.key === 'audience') return row.sendToAll ? 'All employees' : `${row.targetDepartmentIds?.length || 0} departments · ${row.targetProfileIds?.length || 0} employees`
    if (column.key === 'status') return <StatusBadge tone={row.status === 'PUBLISHED' ? 'success' : row.status === 'SCHEDULED' ? 'info' : 'neutral'}>{row.status}</StatusBadge>
    if (column.key === 'publishedAt') return row.publishedAt || row.scheduledAt ? new Date(row.publishedAt || row.scheduledAt).toLocaleString() : '-'
    if (column.key === 'actions') return <Stack direction="row" spacing={0.25} justifyContent="center">{row.capabilities?.update ? <IconActionButton label="Edit announcement" tone="primary" onClick={() => setEditor(row)}><EditOutlinedIcon fontSize="small" /></IconActionButton> : null}{row.capabilities?.delete ? <IconActionButton label="Delete announcement" tone="danger" onClick={() => setDeleting(row)}><DeleteOutlineIcon fontSize="small" /></IconActionButton> : null}</Stack>
    return '-'
  }

  return (
    <OperationsPageShell
      header={<OperationsHeader title="Announcements" subtitle="Publish HR news, policies, and events to authorized audiences." actions={canCreate ? <Button variant="contained" startIcon={<AddIcon />} onClick={() => setEditor({})}>Create announcement</Button> : null} />}
      toolbar={<OperationsToolbar><div className="flex flex-wrap items-start gap-3"><TextField size="small" className="w-72" label="Search" value={search} onChange={(event) => updateSearch('search', event.target.value, true)} /><TextField select size="small" className="w-44" label="Category" value={category} onChange={(event) => updateSearch('category', event.target.value, true)}><MenuItem value="">All</MenuItem>{categories.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField>{canCreate ? <TextField select size="small" className="w-44" label="Status" value={status} onChange={(event) => updateSearch('status', event.target.value, true)}><MenuItem value="">All</MenuItem>{statuses.map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</TextField> : null}<Button variant="text" startIcon={<RefreshIcon />} disabled={query.isFetching} onClick={() => query.refetch()}>Refresh</Button></div></OperationsToolbar>}
      pagination={<OperationsPagination page={pagination.page || page} pageSize={pagination.limit || pageSize} total={pagination.total || 0} onPageChange={(value) => updateSearch('page', value)} />}
    >
      {query.error ? <Alert severity="error" className="mb-3">{query.error.message}</Alert> : null}
      <OperationsTable columns={columns} rows={rows} loading={query.isPending} getRowKey={(row) => row.id} renderCell={renderCell} minWidth="1060px" emptyTitle="No announcements" emptyDescription="Published announcements and drafts in your access scope appear here." />
      {editor ? <AnnouncementDialog key={editor.id || 'new'} record={editor.id ? editor : null} profiles={profilesQuery.data?.items || []} open loading={save.isPending} error={actionError} onClose={() => setEditor(null)} onSubmit={submit} /> : null}
      <AnimatedDialog open={Boolean(deleting)} onClose={() => setDeleting(null)}><DialogTitle>Delete announcement?</DialogTitle><DialogContent><Typography>This removes “{deleting?.title}” from active announcement lists.</Typography>{actionError ? <Alert severity="error" className="mt-3">{actionError}</Alert> : null}</DialogContent><DialogActions><Button onClick={() => setDeleting(null)}>Cancel</Button><Button color="error" variant="contained" disabled={remove.isPending} onClick={async () => { setActionError(''); try { await remove.mutateAsync(deleting.id); setDeleting(null) } catch (error) { setActionError(error.message || 'Could not delete announcement') } }}>Delete</Button></DialogActions></AnimatedDialog>
    </OperationsPageShell>
  )
}
