import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
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
import { useSnackbar } from 'notistack'

import AnimatedDialog from '@/components/common/AnimatedDialog'
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
import { hasAnyPermission } from '@/features/auth/utils/authz'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useCreateCalendarOverrideMutation,
  useCreateHolidayMutation,
  useCreateShiftAssignmentMutation,
  useCreateShiftMutation,
  useCreateWorkLocationMutation,
  useDeleteHolidayMutation,
  useDeleteSaturdayRotationMutation,
  useGenerateSaturdayRotationsMutation,
  useUpdateCalendarOverrideMutation,
  useUpdateHolidayMutation,
  useUpdateShiftAssignmentMutation,
  useUpdateShiftMutation,
  useUpdateWorkLocationMutation,
} from '../api/hrTime.mutations.js'
import {
  useCalendarOverridesQuery,
  useEmployeeProfilesQuery,
  useHolidaysQuery,
  useSaturdayRotationsQuery,
  useShiftAssignmentsQuery,
  useShiftsQuery,
  useWorkLocationsQuery,
} from '../api/hrTime.queries.js'
import CalendarOverrideDialog from '../components/CalendarOverrideDialog.jsx'
import ScheduleConfigurationDialog from '../components/ScheduleConfigurationDialog.jsx'
import ShiftAssignmentDialog from '../components/ShiftAssignmentDialog.jsx'
import {
  getAuthorizedTeamScopeIds,
  getScheduleScopeOptions,
  hasGlobalPermissionCode,
  resolveRotationTeamId,
} from '../utils/hrTimeApi.js'

const pageSize = 20
const tabs = ['assignments', 'shifts', 'locations', 'overrides', 'holidays', 'rotations']

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
    ['actions', '90px'],
  ],
  locations: [
    ['location', '240px'],
    ['timezone', '240px'],
    ['status', '130px'],
    ['actions', '90px'],
  ],
  overrides: [
    ['date', '150px'],
    ['name', '230px'],
    ['kind', '160px'],
    ['scope', '240px'],
    ['status', '130px'],
    ['actions', '90px'],
  ],
  holidays: [
    ['date', '140px'],
    ['name', '240px'],
    ['kind', '180px'],
    ['scope', '220px'],
    ['status', '120px'],
    ['actions', '90px'],
  ],
  rotations: [
    ['date', '140px'],
    ['team', '220px'],
    ['employeesOff', '230px'],
    ['minPresent', '140px'],
    ['actions', '90px'],
  ],
}

function HolidayDialog({ record, loading, error, onClose, onSubmit }) {
  const [values, setValues] = useState({
    name: record?.name || '',
    dateKey: record?.dateKey || '',
    holidayType: record?.holidayType || 'PUBLIC_HOLIDAY',
    isWorkDay: Boolean(record?.isWorkDay),
    note: record?.note || '',
  })

  return (
    <AnimatedDialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{record ? 'Edit holiday' : 'Add holiday'}</DialogTitle>
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        {error ? <Alert severity="error" className="sm:col-span-2">{error}</Alert> : null}
        <TextField label="Name" className="sm:col-span-2" value={values.name} onChange={(event) => setValues({ ...values, name: event.target.value })} required />
        <TextField type="date" label="Date" slotProps={{ inputLabel: { shrink: true } }} value={values.dateKey} onChange={(event) => setValues({ ...values, dateKey: event.target.value })} required />
        <TextField select label="Holiday type" value={values.holidayType} onChange={(event) => setValues({ ...values, holidayType: event.target.value })}>
          {['PUBLIC_HOLIDAY', 'COMPANY_HOLIDAY', 'SPECIAL_DAY'].map((value) => <MenuItem key={value} value={value}>{value.replaceAll('_', ' ')}</MenuItem>)}
        </TextField>
        <FormControlLabel control={<Checkbox checked={values.isWorkDay} onChange={(_, checked) => setValues({ ...values, isWorkDay: checked })} />} label="Working day" />
        <TextField label="Note" className="sm:col-span-2" multiline minRows={2} value={values.note} onChange={(event) => setValues({ ...values, note: event.target.value })} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={loading || !values.name.trim() || !values.dateKey} onClick={() => onSubmit({ ...values, name: values.name.trim(), note: values.note.trim() || null })}>Save holiday</Button></DialogActions>
    </AnimatedDialog>
  )
}

function RotationDialog({ teams, initialTeamId, loading, error, onClose, onSubmit }) {
  const today = new Date()
  const [values, setValues] = useState({ teamId: initialTeamId || '', month: today.getMonth() + 1, year: today.getFullYear(), minPresent: '' })
  return (
    <AnimatedDialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Generate Saturday rotations</DialogTitle>
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        {error ? <Alert severity="error" className="sm:col-span-2">{error}</Alert> : null}
        <TextField select label="Team" className="sm:col-span-2" value={values.teamId} onChange={(event) => setValues({ ...values, teamId: event.target.value })} required>{teams.map((team) => <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>)}</TextField>
        <TextField type="number" label="Month" value={values.month} inputProps={{ min: 1, max: 12 }} onChange={(event) => setValues({ ...values, month: Number(event.target.value) })} />
        <TextField type="number" label="Year" value={values.year} inputProps={{ min: 2000, max: 9999 }} onChange={(event) => setValues({ ...values, year: Number(event.target.value) })} />
        <TextField type="number" label="Minimum present" helperText="Leave blank to use the server default." value={values.minPresent} inputProps={{ min: 0 }} onChange={(event) => setValues({ ...values, minPresent: event.target.value })} />
      </DialogContent>
      <DialogActions><Button onClick={onClose}>Cancel</Button><Button variant="contained" disabled={loading || !values.teamId} onClick={() => onSubmit({ teamId: values.teamId, month: values.month, year: values.year, ...(values.minPresent === '' ? {} : { minPresent: Number(values.minPresent) }) })}>Generate rotations</Button></DialogActions>
    </AnimatedDialog>
  )
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
  if (
    (user?.permissions || []).some((permission) =>
      typeof permission === 'string'
        ? permission === 'HR_SCHEDULE:WRITE'
        : permission?.code === 'HR_SCHEDULE:WRITE',
    )
  ) {
    return true
  }
  if (
    (user?.scopes || []).some((scope) => scope.scopeType === 'global' && scopePermission(scope))
  ) {
    return true
  }
  return false
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
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const teamId = searchParams.get('teamId') || ''
  const [editor, setEditor] = useState(null)
  const [holidayEditor, setHolidayEditor] = useState(null)
  const [rotationEditor, setRotationEditor] = useState(false)
  const [actionError, setActionError] = useState('')
  const canWrite = hasAnyPermission(currentUser, ['HR_SCHEDULE:WRITE'])
  const canWriteGlobal = globalScheduleWrite(currentUser)
  const canCalendarWrite = hasAnyPermission(currentUser, ['HR_CALENDAR:WRITE'])
  const canCalendarWriteGlobal = hasGlobalPermissionCode(currentUser, 'HR_CALENDAR:WRITE')
  const authorizedCalendarTeamIds = useMemo(
    () => getAuthorizedTeamScopeIds(currentUser, 'HR_CALENDAR:WRITE'),
    [currentUser],
  )
  const rotationTeamId = resolveRotationTeamId(
    teamId,
    authorizedCalendarTeamIds,
    canCalendarWriteGlobal,
  )

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
  const holidayQuery = useHolidaysQuery(
    { page, limit: pageSize },
    { enabled: tab === 'holidays' },
  )
  const rotationQuery = useSaturdayRotationsQuery(
    { page, limit: pageSize, teamId: rotationTeamId, month, year },
    { enabled: tab === 'rotations' && (canCalendarWriteGlobal || Boolean(rotationTeamId)) },
  )

  const employeesQuery = useEmployeeProfilesQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const optionShiftsQuery = useShiftsQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const optionLocationsQuery = useWorkLocationsQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const employees = list(employeesQuery.data)
  const shifts = list(optionShiftsQuery.data)
  const locations = list(optionLocationsQuery.data)
  const teams = useMemo(
    () =>
      [...new Map(employees.filter((employee) => employee.team?.id).map((employee) => [employee.team.id, employee.team])).values()],
    [employees],
  )
  const rotationTeams = useMemo(() => {
    if (canCalendarWriteGlobal) return teams
    const namedTeams = new Map(teams.map((team) => [team.id, team]))
    return authorizedCalendarTeamIds.map(
      (id, index) => namedTeams.get(id) || { id, name: `Authorized team ${index + 1}` },
    )
  }, [authorizedCalendarTeamIds, canCalendarWriteGlobal, teams])
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  )
  const teamById = useMemo(
    () => new Map(rotationTeams.map((team) => [team.id, team])),
    [rotationTeams],
  )

  const createAssignment = useCreateShiftAssignmentMutation()
  const updateAssignment = useUpdateShiftAssignmentMutation()
  const createOverride = useCreateCalendarOverrideMutation()
  const updateOverride = useUpdateCalendarOverrideMutation()
  const createLocation = useCreateWorkLocationMutation()
  const updateLocation = useUpdateWorkLocationMutation()
  const createShift = useCreateShiftMutation()
  const updateShift = useUpdateShiftMutation()
  const createHoliday = useCreateHolidayMutation()
  const updateHoliday = useUpdateHolidayMutation()
  const deleteHoliday = useDeleteHolidayMutation()
  const generateRotations = useGenerateSaturdayRotationsMutation()
  const deleteRotation = useDeleteSaturdayRotationMutation()
  const activeMutation =
    editor?.type === 'override'
      ? editor.record
        ? updateOverride
        : createOverride
      : editor?.type === 'location'
        ? editor.record
          ? updateLocation
          : createLocation
        : editor?.type === 'shift'
          ? editor.record
            ? updateShift
            : createShift
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
    () =>
      getScheduleScopeOptions({
        employees,
        locations,
        overrides: list(overrideQuery.data),
      }),
    [employees, locations, overrideQuery.data],
  )

  const selectedQuery = {
    assignments: assignmentQuery,
    shifts: shiftQuery,
    locations: locationQuery,
    overrides: overrideQuery,
    holidays: holidayQuery,
    rotations: rotationQuery,
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
      } else if (editor.type === 'override') {
        await (editor.record
          ? updateOverride.mutateAsync({ id: editor.record.id, payload })
          : createOverride.mutateAsync(payload))
      } else if (editor.type === 'location') {
        await (editor.record
          ? updateLocation.mutateAsync({ id: editor.record.id, payload })
          : createLocation.mutateAsync(payload))
      } else {
        await (editor.record
          ? updateShift.mutateAsync({ id: editor.record.id, payload })
          : createShift.mutateAsync(payload))
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

  async function saveHoliday(payload) {
    setActionError('')
    try {
      await (holidayEditor?.id
        ? updateHoliday.mutateAsync({ id: holidayEditor.id, payload })
        : createHoliday.mutateAsync(payload))
      setHolidayEditor(null)
      enqueueSnackbar('Holiday saved', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(error.message || 'Could not save holiday')
    }
  }

  async function generateRotationSet(payload) {
    setActionError('')
    try {
      await generateRotations.mutateAsync(payload)
      setRotationEditor(false)
      enqueueSnackbar('Saturday rotations generated', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(error.message || 'Could not generate rotations')
    }
  }

  async function removeCalendarRecord(type, id) {
    setActionError('')
    try {
      await (type === 'holiday' ? deleteHoliday.mutateAsync(id) : deleteRotation.mutateAsync(id))
      enqueueSnackbar(type === 'holiday' ? 'Holiday removed' : 'Rotation removed', {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
    } catch (error) {
      enqueueSnackbar(error.message || 'Could not remove calendar record', {
        variant: SNACKBAR_VARIANTS.ERROR,
      })
    }
  }

  function editButton(row, type) {
    const canEdit = ['location', 'shift'].includes(type) ? canWriteGlobal : row.capabilities?.edit
    return canEdit ? (
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
    if (column.key === 'kind') return (row.kind || row.holidayType)?.replaceAll('_', ' ') || '-'
    if (column.key === 'team') return teamById.get(row.teamId)?.name || '-'
    if (column.key === 'employeesOff') {
      return (row.employeeProfileIds || [])
        .map((id) => employeeById.get(id)?.fullName)
        .filter(Boolean)
        .join(', ') || '-'
    }
    if (column.key === 'minPresent') return row.minPresent ?? '-'
    if (column.key === 'scope')
      return tab === 'holidays'
        ? row.appliedDepartmentIds?.length || row.appliedTeamIds?.length
          ? `${row.appliedDepartmentIds.length} departments · ${row.appliedTeamIds.length} teams`
          : 'Global'
        : row.scopeTarget?.fullName || row.scopeTarget?.name || row.scopeType || '-'
    if (column.key === 'status') {
      const value = tab === 'holidays' ? (row.isActive === false ? 'INACTIVE' : 'ACTIVE') : row.status
      return (
        <StatusBadge tone={value === 'ACTIVE' ? 'success' : 'neutral'}>
          {value || '-'}
        </StatusBadge>
      )
    }
    if (column.key === 'actions') {
      if (tab === 'holidays') {
        return canCalendarWrite ? (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <IconActionButton label="Edit holiday" tone="primary" onClick={() => setHolidayEditor(row)}>
              <EditOutlinedIcon fontSize="small" />
            </IconActionButton>
            <IconActionButton label="Delete holiday" tone="danger" onClick={() => removeCalendarRecord('holiday', row.id)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconActionButton>
          </Stack>
        ) : null
      }
      if (tab === 'rotations') {
        return canCalendarWrite ? (
          <IconActionButton label="Delete rotation" tone="danger" onClick={() => removeCalendarRecord('rotation', row.id)}>
            <DeleteOutlineIcon fontSize="small" />
          </IconActionButton>
        ) : null
      }
      return (
        <Stack direction="row" justifyContent="center">
          {editButton(
            row,
            tab === 'overrides'
              ? 'override'
              : tab === 'shifts'
                ? 'shift'
                : tab === 'locations'
                  ? 'location'
                  : 'assignment',
          )}
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
              'Manage assignments, global schedule configuration, and scoped calendar changes.',
          })}
          actions={
            canCalendarWrite && tab === 'holidays' ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setActionError(''); setHolidayEditor({}) }}>
                Add holiday
              </Button>
            ) : canCalendarWrite && rotationTeams.length && tab === 'rotations' ? (
              <Button variant="contained" startIcon={<AddIcon />} onClick={() => { setActionError(''); setRotationEditor(true) }}>
                Generate rotations
              </Button>
            ) : (canWrite && ['assignments', 'overrides'].includes(tab)) ||
            (canWriteGlobal && ['shifts', 'locations'].includes(tab)) ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setEditor({
                    type:
                      tab === 'overrides'
                        ? 'override'
                        : tab === 'shifts'
                          ? 'shift'
                          : tab === 'locations'
                            ? 'location'
                            : 'assignment',
                    record: null,
                  })
                }}
              >
                {tab === 'overrides'
                  ? t('hrTime.schedule.addOverride', { defaultValue: 'Add override' })
                  : tab === 'shifts'
                    ? t('hrTime.schedule.addShift', { defaultValue: 'Add shift' })
                    : tab === 'locations'
                      ? t('hrTime.schedule.addLocation', { defaultValue: 'Add work location' })
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
            {tab === 'rotations' ? (
              <>
                <TextField select size="small" className="w-56" label="Team" value={rotationTeamId} onChange={(event) => updateSearch({ teamId: event.target.value }, true)}>
                  {canCalendarWriteGlobal ? <MenuItem value="">All</MenuItem> : rotationTeams.length > 1 ? <MenuItem value="" disabled>Select authorized team</MenuItem> : null}
                  {rotationTeams.map((team) => <MenuItem key={team.id} value={team.id}>{team.name}</MenuItem>)}
                </TextField>
                <TextField size="small" type="number" label="Month" value={month} inputProps={{ min: 1, max: 12 }} onChange={(event) => updateSearch({ month: event.target.value }, true)} />
                <TextField size="small" type="number" label="Year" value={year} inputProps={{ min: 2000, max: 9999 }} onChange={(event) => updateSearch({ year: event.target.value }, true)} />
              </>
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
      {['location', 'shift'].includes(editor?.type) ? (
        <ScheduleConfigurationDialog
          key={`${editor.type}-${editor.record?.id || 'new'}`}
          open
          type={editor.type}
          record={editor.record}
          workLocations={locations}
          loading={activeMutation?.isPending}
          error={actionError}
          onClose={() => setEditor(null)}
          onSubmit={save}
        />
      ) : null}
      {holidayEditor ? (
        <HolidayDialog
          key={holidayEditor.id || 'new'}
          record={holidayEditor.id ? holidayEditor : null}
          loading={createHoliday.isPending || updateHoliday.isPending}
          error={actionError}
          onClose={() => setHolidayEditor(null)}
          onSubmit={saveHoliday}
        />
      ) : null}
      {rotationEditor ? (
        <RotationDialog
          teams={rotationTeams}
          initialTeamId={rotationTeamId}
          loading={generateRotations.isPending}
          error={actionError}
          onClose={() => setRotationEditor(false)}
          onSubmit={generateRotationSet}
        />
      ) : null}
    </OperationsPageShell>
  )
}
