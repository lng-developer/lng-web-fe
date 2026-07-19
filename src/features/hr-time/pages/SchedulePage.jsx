import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

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
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { canBypassPermissions, hasAnyPermission } from '@/features/auth/utils/authz'
import { useDepartmentsQuery, useTeamsQuery } from '@/features/rbac/api/rbac.queries'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useCreateCalendarOverrideMutation,
  useCreateShiftAssignmentMutation,
  useUpdateCalendarOverrideMutation,
  useUpdateShiftAssignmentMutation,
} from '../api/hrTime.mutations.js'
import {
  useCalendarOverridesQuery,
  useEmployeeProfilesQuery,
  useShiftAssignmentsQuery,
  useShiftsQuery,
  useWorkLocationsQuery,
} from '../api/hrTime.queries.js'
import CalendarOverrideDialog from '../components/CalendarOverrideDialog.jsx'
import ShiftAssignmentDialog from '../components/ShiftAssignmentDialog.jsx'

const pageSize = 20
const tabs = ['assignments', 'shifts', 'locations', 'overrides']

const columnSets = {
  assignments: [
    ['employee', '220px'],
    ['shift', '180px'],
    ['location', '180px'],
    ['effective', '220px'],
    ['status', '130px'],
    ['actions', '90px'],
  ],
  shifts: [
    ['shift', '220px'],
    ['hours', '180px'],
    ['location', '200px'],
    ['workdays', '220px'],
    ['status', '130px'],
  ],
  locations: [
    ['location', '240px'],
    ['timezone', '240px'],
    ['status', '130px'],
  ],
  overrides: [
    ['date', '150px'],
    ['name', '230px'],
    ['kind', '160px'],
    ['scope', '240px'],
    ['status', '130px'],
    ['actions', '90px'],
  ],
}

function list(data) {
  return data?.items || data || []
}

function scopePermission(scope) {
  return (scope?.permissions || []).some((permission) =>
    typeof permission === 'string'
      ? permission === 'HR_SCHEDULE:WRITE'
      : permission?.code === 'HR_SCHEDULE:WRITE',
  )
}

function globalScheduleWrite(user) {
  if (canBypassPermissions(user)) return true
  if (
    (user?.scopes || []).some((scope) => scope.scopeType === 'global' && scopePermission(scope))
  ) {
    return true
  }
  return (user?.permissions || []).some((permission) =>
    typeof permission === 'string'
      ? permission === 'HR_SCHEDULE:WRITE'
      : permission?.code === 'HR_SCHEDULE:WRITE',
  )
}

export default function SchedulePage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = tabs.includes(requestedTab) ? requestedTab : 'assignments'
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const q = searchParams.get('q') || ''
  const profileId = searchParams.get('profileId') || ''
  const scopeType = searchParams.get('scopeType') || ''
  const [editor, setEditor] = useState(null)
  const [actionError, setActionError] = useState('')
  const canWrite = hasAnyPermission(currentUser, ['HR_SCHEDULE:WRITE'])
  const canWriteGlobal = globalScheduleWrite(currentUser)

  const assignmentQuery = useShiftAssignmentsQuery(
    { page, limit: pageSize, profileId },
    { enabled: tab === 'assignments' },
  )
  const shiftQuery = useShiftsQuery({ page, limit: pageSize, q }, { enabled: tab === 'shifts' })
  const locationQuery = useWorkLocationsQuery(
    { page, limit: pageSize, q },
    { enabled: tab === 'locations' },
  )
  const overrideQuery = useCalendarOverridesQuery(
    { page, limit: pageSize, scopeType },
    { enabled: tab === 'overrides' },
  )

  const employeesQuery = useEmployeeProfilesQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const optionShiftsQuery = useShiftsQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const optionLocationsQuery = useWorkLocationsQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const departmentsQuery = useDepartmentsQuery()
  const teamsQuery = useTeamsQuery()
  const employees = list(employeesQuery.data)
  const shifts = list(optionShiftsQuery.data)
  const locations = list(optionLocationsQuery.data)
  const departments = list(departmentsQuery.data)
  const teams = list(teamsQuery.data)

  const createAssignment = useCreateShiftAssignmentMutation()
  const updateAssignment = useUpdateShiftAssignmentMutation()
  const createOverride = useCreateCalendarOverrideMutation()
  const updateOverride = useUpdateCalendarOverrideMutation()
  const activeMutation =
    editor?.type === 'override'
      ? editor.record
        ? updateOverride
        : createOverride
      : editor?.record
        ? updateAssignment
        : createAssignment

  const allowedScopeTypes = useMemo(() => {
    if (canWriteGlobal) return ['GLOBAL', 'WORK_LOCATION', 'DEPARTMENT', 'TEAM', 'PROFILE']
    const scoped = new Set(['PROFILE'])
    ;(currentUser?.scopes || []).filter(scopePermission).forEach((scope) => {
      if (scope.scopeType === 'department') scoped.add('DEPARTMENT')
      if (scope.scopeType === 'team') scoped.add('TEAM')
    })
    return Array.from(scoped)
  }, [canWriteGlobal, currentUser])

  const scopeOptions = useMemo(
    () => [
      ...employees.map((employee) => ({
        type: 'PROFILE',
        id: employee.id,
        label: `${employee.fullName} (${employee.employeeCode})`,
      })),
      ...locations.map((location) => ({
        type: 'WORK_LOCATION',
        id: location.id,
        label: location.name,
      })),
      ...departments.map((department) => ({
        type: 'DEPARTMENT',
        id: department.id,
        label: department.name,
      })),
      ...teams.map((team) => ({ type: 'TEAM', id: team.id, label: team.name })),
    ],
    [departments, employees, locations, teams],
  )

  const selectedQuery = {
    assignments: assignmentQuery,
    shifts: shiftQuery,
    locations: locationQuery,
    overrides: overrideQuery,
  }[tab]
  const rows = list(selectedQuery.data)
  const pagination = selectedQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const queryError = selectedQuery.error?.response?.data?.message || selectedQuery.error?.message

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
      if (editor.type === 'assignment') {
        await (editor.record
          ? updateAssignment.mutateAsync({ id: editor.record.id, payload })
          : createAssignment.mutateAsync(payload))
      } else {
        await (editor.record
          ? updateOverride.mutateAsync({ id: editor.record.id, payload })
          : createOverride.mutateAsync(payload))
      }
      enqueueSnackbar(t('hrTime.messages.scheduleSaved', { defaultValue: 'Schedule updated' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setEditor(null)
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not save schedule' }),
      )
    }
  }

  function editButton(row, type) {
    return row.capabilities?.edit ? (
      <IconActionButton
        label={t('common.edit', { defaultValue: 'Edit' })}
        tone="primary"
        onClick={() => {
          setActionError('')
          setEditor({ type, record: row })
        }}
      >
        <EditOutlinedIcon fontSize="small" />
      </IconActionButton>
    ) : null
  }

  function renderCell(row, column) {
    if (column.key === 'employee') return row.employeeName || row.employee?.fullName || '-'
    if (column.key === 'shift') {
      return (
        <div>
          <Typography variant="body2" className="font-semibold text-ink-strong">
            {row.shift?.name || row.name || '-'}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.shift?.code || row.code || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'location') return row.workLocation?.name || row.name || '-'
    if (column.key === 'effective')
      return `${row.effectiveFrom || '-'} - ${row.effectiveTo || 'Open'}`
    if (column.key === 'hours') return `${row.startTime || '-'} - ${row.endTime || '-'}`
    if (column.key === 'workdays') return (row.workdays || []).join(', ') || '-'
    if (column.key === 'timezone') return row.timezone || '-'
    if (column.key === 'date') return row.dateKey || '-'
    if (column.key === 'name') return row.name || '-'
    if (column.key === 'kind') return row.kind?.replaceAll('_', ' ') || '-'
    if (column.key === 'scope')
      return row.scopeTarget?.fullName || row.scopeTarget?.name || row.scopeType || '-'
    if (column.key === 'status') {
      return (
        <StatusBadge tone={row.status === 'ACTIVE' ? 'success' : 'neutral'}>
          {row.status || '-'}
        </StatusBadge>
      )
    }
    if (column.key === 'actions') {
      return (
        <Stack direction="row" justifyContent="center">
          {editButton(row, tab === 'overrides' ? 'override' : 'assignment')}
        </Stack>
      )
    }
    return '-'
  }

  const columns = columnSets[tab].map(([key, width]) => ({
    key,
    width,
    align: key === 'actions' ? 'center' : 'left',
    label: t(`hrTime.schedule.columns.${key}`, { defaultValue: key }),
  }))

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.schedule.title', { defaultValue: 'Schedule' })}
          subtitle={t('hrTime.schedule.subtitle', {
            defaultValue:
              'Manage assignments and scoped calendar changes; global configuration stays read-only here.',
          })}
          actions={
            canWrite && ['assignments', 'overrides'].includes(tab) ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setEditor({ type: tab === 'overrides' ? 'override' : 'assignment', record: null })
                }}
              >
                {tab === 'overrides'
                  ? t('hrTime.schedule.addOverride', { defaultValue: 'Add override' })
                  : t('hrTime.schedule.addAssignment', { defaultValue: 'Add assignment' })}
              </Button>
            ) : null
          }
        />
      }
      tabs={
        <OperationsTabs
          variant="nav"
          items={tabs.map((value) => ({
            value,
            label: t(`hrTime.schedule.tabs.${value}`, {
              defaultValue: value[0].toUpperCase() + value.slice(1),
            }),
          }))}
          value={tab}
          onChange={(value) => updateSearch({ tab: value }, true)}
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-start gap-3">
            {tab === 'assignments' ? (
              <TextField
                select
                size="small"
                className="w-60"
                label={t('hrTime.filters.employee', { defaultValue: 'Employee' })}
                value={profileId}
                onChange={(event) => updateSearch({ profileId: event.target.value }, true)}
              >
                <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.fullName} ({employee.employeeCode})
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {['shifts', 'locations'].includes(tab) ? (
              <TextField
                size="small"
                className="w-72"
                label={t('common.search', { defaultValue: 'Search' })}
                value={q}
                onChange={(event) => updateSearch({ q: event.target.value }, true)}
              />
            ) : null}
            {tab === 'overrides' ? (
              <TextField
                select
                size="small"
                className="w-56"
                label={t('hrTime.filters.calendarScope', { defaultValue: 'Calendar scope' })}
                value={scopeType}
                onChange={(event) => updateSearch({ scopeType: event.target.value }, true)}
              >
                <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                {['GLOBAL', 'WORK_LOCATION', 'DEPARTMENT', 'TEAM', 'PROFILE'].map((value) => (
                  <MenuItem key={value} value={value}>
                    {value.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={selectedQuery.isFetching}
              onClick={() => selectedQuery.refetch()}
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
        columns={columns}
        rows={rows}
        loading={selectedQuery.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth={tab === 'locations' ? '720px' : '1040px'}
        emptyTitle={t('hrTime.empty.title', { defaultValue: 'No records found' })}
      />
      {editor?.type === 'assignment' ? (
        <ShiftAssignmentDialog
          open
          assignment={editor.record}
          employees={employees}
          shifts={shifts}
          locations={locations}
          loading={activeMutation?.isPending}
          error={actionError}
          onClose={() => setEditor(null)}
          onSubmit={save}
        />
      ) : null}
      {editor?.type === 'override' ? (
        <CalendarOverrideDialog
          open
          override={editor.record}
          allowedScopeTypes={allowedScopeTypes}
          scopeOptions={scopeOptions}
          loading={activeMutation?.isPending}
          error={actionError}
          onClose={() => setEditor(null)}
          onSubmit={save}
        />
      ) : null}
    </OperationsPageShell>
  )
}
