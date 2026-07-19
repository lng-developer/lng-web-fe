import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Avatar, Button, MenuItem, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  IconActionButton,
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTable,
  OperationsToolbar,
  StatusBadge,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { hasAnyPermission } from '@/features/auth/utils/authz'
import {
  useAccountsQuery,
  useDepartmentsQuery,
  useTeamsQuery,
} from '@/features/rbac/api/rbac.queries'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useCreateEmployeeProfileMutation,
  useUpdateEmployeeProfileMutation,
} from '../api/hrTime.mutations.js'
import { useEmployeeProfilesQuery } from '../api/hrTime.queries.js'
import EmployeeProfileDialog from '../components/EmployeeProfileDialog.jsx'
import EmployeeProfileDrawer from '../components/EmployeeProfileDrawer.jsx'

const pageSize = 20
const statuses = ['ACTIVE', 'PROBATION', 'ON_LEAVE', 'SUSPENDED', 'RESIGNED']
const columns = [
  { key: 'employee', width: '260px' },
  { key: 'organization', width: '230px' },
  { key: 'job', width: '220px' },
  { key: 'employment', width: '190px' },
  { key: 'status', width: '140px' },
  { key: 'actions', width: '90px', align: 'center' },
]

function list(data) {
  return data?.items || data || []
}

export default function PeoplePage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [searchParams, setSearchParams] = useSearchParams()
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const q = searchParams.get('q') || ''
  const status = searchParams.get('status') || ''
  const departmentId = searchParams.get('departmentId') || ''
  const [selected, setSelected] = useState(null)
  const [editing, setEditing] = useState(undefined)
  const [actionError, setActionError] = useState('')
  const canWrite = hasAnyPermission(currentUser, ['HR_EMPLOYEES:WRITE'])
  const canReadAccounts = hasAnyPermission(currentUser, ['AUTH:READ'])

  const directoryQuery = useEmployeeProfilesQuery({
    page,
    limit: pageSize,
    q,
    status,
    departmentId,
  })
  const accountsQuery = useAccountsQuery({ page: 1, limit: 100, status: 'active' })
  const departmentsQuery = useDepartmentsQuery()
  const teamsQuery = useTeamsQuery()
  const createProfile = useCreateEmployeeProfileMutation()
  const updateProfile = useUpdateEmployeeProfileMutation()
  const activeMutation = editing ? updateProfile : createProfile
  const rows = directoryQuery.data?.items || []
  const pagination = directoryQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const queryError = directoryQuery.error?.response?.data?.message || directoryQuery.error?.message

  function updateSearch(updates, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        Object.entries(updates).forEach(([key, value]) => {
          if (value === '' || value === null || value === undefined) next.delete(key)
          else next.set(key, String(value))
        })
        if (resetPage) next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  async function save(payload) {
    setActionError('')
    try {
      if (editing) await updateProfile.mutateAsync({ profileId: editing.id, payload })
      else await createProfile.mutateAsync(payload)
      enqueueSnackbar(
        t('hrTime.messages.profileSaved', { defaultValue: 'Employee profile saved' }),
        {
          variant: SNACKBAR_VARIANTS.SUCCESS,
        },
      )
      setEditing(undefined)
      setSelected(null)
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not save employee profile' }),
      )
    }
  }

  function renderCell(row, column) {
    if (column.key === 'employee') {
      return (
        <div className="flex min-w-0 items-center gap-3">
          <Avatar src={row.avatarUrl || undefined} alt={row.fullName || ''} className="!h-9 !w-9">
            {row.fullName?.slice(0, 1)}
          </Avatar>
          <div className="min-w-0">
            <Typography variant="body2" className="truncate font-semibold text-ink-strong">
              {row.fullName || '-'}
            </Typography>
            <Typography variant="caption" className="text-ink-muted">
              {row.employeeCode || '-'}
            </Typography>
          </div>
        </div>
      )
    }
    if (column.key === 'organization') {
      return (
        <div>
          <Typography variant="body2">{row.department?.name || '-'}</Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.team?.name || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'job') {
      return (
        <div>
          <Typography variant="body2">{row.jobTitle || '-'}</Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.jobLevel || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'employment')
      return `${row.employmentType?.replaceAll('_', ' ') || '-'} / ${row.workMode || '-'}`
    if (column.key === 'status') {
      return (
        <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {row.status?.replaceAll('_', ' ') || '-'}
        </StatusBadge>
      )
    }
    if (column.key === 'actions') {
      return (
        <IconActionButton
          label={t('common.view', { defaultValue: 'View' })}
          onClick={() => setSelected(row)}
        >
          <VisibilityOutlinedIcon fontSize="small" />
        </IconActionButton>
      )
    }
    return '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.people.title', { defaultValue: 'People' })}
          subtitle={t('hrTime.people.subtitle', {
            defaultValue:
              'Directory rows stay minimal; restricted details load only when a profile is opened.',
          })}
          actions={
            canWrite && canReadAccounts ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setEditing(null)
                }}
              >
                {t('hrTime.people.addAction', { defaultValue: 'Add employee' })}
              </Button>
            ) : null
          }
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-start gap-3">
            <TextField
              size="small"
              className="w-72"
              label={t('hrTime.people.search', { defaultValue: 'Search name or employee code' })}
              value={q}
              onChange={(event) => updateSearch({ q: event.target.value }, true)}
            />
            <TextField
              select
              size="small"
              className="w-52"
              label={t('hrTime.filters.department', { defaultValue: 'Department' })}
              value={departmentId}
              onChange={(event) => updateSearch({ departmentId: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {list(departmentsQuery.data).map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              className="w-48"
              label={t('hrTime.filters.status', { defaultValue: 'Status' })}
              value={status}
              onChange={(event) => updateSearch({ status: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {statuses.map((value) => (
                <MenuItem key={value} value={value}>
                  {value.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={directoryQuery.isFetching}
              onClick={() => directoryQuery.refetch()}
            >
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </Button>
          </div>
        </OperationsToolbar>
      }
      pagination={
        <OperationsPagination
          page={pagination.page || page}
          pageSize={pagination.limit || pageSize}
          total={pagination.total || 0}
          onPageChange={(value) => updateSearch({ page: value })}
        />
      }
    >
      {queryError ? (
        <Alert severity="error" className="mb-3">
          {queryError}
        </Alert>
      ) : null}
      <OperationsTable
        columns={columns.map((column) => ({
          ...column,
          label: t(`hrTime.people.columns.${column.key}`, { defaultValue: column.key }),
        }))}
        rows={rows}
        loading={directoryQuery.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="1130px"
        emptyTitle={t('hrTime.empty.title', { defaultValue: 'No records found' })}
      />
      <EmployeeProfileDrawer
        open={Boolean(selected)}
        profileId={selected?.id}
        canEdit={Boolean(selected?.capabilities?.edit)}
        onClose={() => setSelected(null)}
        onEdit={(profile) => {
          setActionError('')
          setEditing(profile)
        }}
      />
      {editing !== undefined ? (
        <EmployeeProfileDialog
          open
          profile={editing || null}
          accounts={canReadAccounts ? list(accountsQuery.data) : []}
          departments={list(departmentsQuery.data)}
          teams={list(teamsQuery.data)}
          loading={activeMutation.isPending}
          error={actionError}
          onClose={() => setEditing(undefined)}
          onSubmit={save}
        />
      ) : null}
    </OperationsPageShell>
  )
}
