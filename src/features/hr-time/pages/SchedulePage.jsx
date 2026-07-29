import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlineOutlined'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import {
  Alert,
  Autocomplete,
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
import ConfirmDialog from '@/components/common/ConfirmDialog'
import DatePicker from '@/components/form/DatePicker'
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
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { hasAnyPermission } from '@/features/auth/utils/authz'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

import {
  useBulkImportHolidaysMutation,
  useCheckHolidayPolicyMutation,
  useCreateCalendarOverrideMutation,
  useCreateHolidayMutation,
  useCreateSaturdayRotationMutation,
  useCreateShiftAssignmentMutation,
  useCreateShiftMutation,
  useCreateWorkLocationMutation,
  useDeleteHolidayMutation,
  useDeleteSaturdayRotationMutation,
  useDeleteTeamSaturdayRotationsMutation,
  useGenerateSaturdayRotationsMutation,
  useUpdateCalendarOverrideMutation,
  useUpdateHolidayMutation,
  useUpdateSaturdayRotationMutation,
  useUpdateShiftAssignmentMutation,
  useUpdateShiftMutation,
  useUpdateWorkLocationMutation,
} from '../api/hrTime.mutations.js'
import {
  useCalendarOverridesQuery,
  useEmployeeProfilesQuery,
  useHolidaysQuery,
  useSaturdayRotationMatrixQuery,
  useShiftAssignmentsQuery,
  useShiftsQuery,
  useWorkLocationsQuery,
} from '../api/hrTime.queries.js'
import CalendarOverrideDialog from '../components/CalendarOverrideDialog.jsx'
import HolidayBulkImportDialog from '../components/HolidayBulkImportDialog.jsx'
import HolidayDetailDrawer from '../components/HolidayDetailDrawer.jsx'
import HolidayPolicySummary from '../components/HolidayPolicySummary.jsx'
import RotationMaintenanceDialog from '../components/RotationMaintenanceDialog.jsx'
import SaturdayRotationMatrix from '../components/SaturdayRotationMatrix.jsx'
import ScheduleConfigurationDialog from '../components/ScheduleConfigurationDialog.jsx'
import ShiftAssignmentDialog from '../components/ShiftAssignmentDialog.jsx'
import {
  canAccessTeamScope,
  getAuthorizedTeamScopeIds,
  getScheduleScopeOptions,
  hasGlobalPermissionCode,
  resolveCalendarScopeQuery,
  resolveRotationTeamId,
  resolveScheduleTab,
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

function HolidayDialog({ record, loading, error, onClose, onDraftChange, onSubmit }) {
  const [values, setValues] = useState({
    name: record?.name || '',
    dateKey: record?.dateKey || '',
    holidayType: record?.holidayType || 'PUBLIC_HOLIDAY',
    isWorkDay: Boolean(record?.isWorkDay),
    note: record?.note || '',
  })
  const updateValues = (changes) =>
    setValues((current) => {
      const next = { ...current, ...changes }
      onDraftChange?.(next)
      return next
    })

  return (
    <AnimatedDialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{record ? 'Edit holiday' : 'Add holiday'}</DialogTitle>
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        {error ? (
          <Alert severity="error" className="sm:col-span-2">
            {error}
          </Alert>
        ) : null}
        <TextField
          label="Name"
          className="sm:col-span-2"
          value={values.name}
          onChange={(event) => updateValues({ name: event.target.value })}
          required
        />
        <DatePicker
          label="Date"
          value={values.dateKey}
          onChange={(val) => updateValues({ dateKey: val })}
          required
        />
        <TextField
          select
          label="Holiday type"
          value={values.holidayType}
          onChange={(event) => updateValues({ holidayType: event.target.value })}
        >
          {['PUBLIC_HOLIDAY', 'SUBSTITUTE_WORK_DAY'].map((value) => (
            <MenuItem key={value} value={value}>
              {value.replaceAll('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
        <FormControlLabel
          control={
            <Checkbox
              checked={values.isWorkDay}
              onChange={(_, checked) => updateValues({ isWorkDay: checked })}
            />
          }
          label="Working day"
        />
        <TextField
          label="Note"
          className="sm:col-span-2"
          multiline
          minRows={2}
          value={values.note}
          onChange={(event) => updateValues({ note: event.target.value })}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading || !values.name.trim() || !values.dateKey}
          onClick={() =>
            onSubmit({ ...values, name: values.name.trim(), note: values.note.trim() || null })
          }
        >
          Save holiday
        </Button>
      </DialogActions>
    </AnimatedDialog>
  )
}

function saturdaysInMonth(month, year) {
  const date = new Date(Date.UTC(year, month - 1, 1))
  const dates = []
  while (date.getUTCMonth() === month - 1) {
    if (date.getUTCDay() === 6) dates.push(date.toISOString().slice(0, 10))
    date.setUTCDate(date.getUTCDate() + 1)
  }
  return dates
}

function RotationDialog({
  teams,
  employees,
  initialTeamId,
  loading,
  error,
  outcome,
  manualMonth,
  onClose,
  onSubmit,
}) {
  const today = new Date()
  const [values, setValues] = useState({
    teamId: initialTeamId || '',
    month: today.getMonth() + 1,
    year: today.getFullYear(),
    minPresent: '',
    customRotations: {},
  })
  const dates = saturdaysInMonth(values.month, values.year)
  const teamEmployees = employees.filter((employee) => employee.team?.id === values.teamId)
  const [employeeSearch, setEmployeeSearch] = useState('')
  const filteredTeamEmployees = teamEmployees.filter((employee) =>
    `${employee.fullName || ''} ${employee.employeeCode || ''}`
      .toLowerCase()
      .includes(employeeSearch.trim().toLowerCase()),
  )
  return (
    <AnimatedDialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <DialogTitle>
        {manualMonth ? 'Manual Saturday rotation month' : 'Generate Saturday rotations'}
      </DialogTitle>
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        {error ? (
          <Alert severity="error" className="sm:col-span-2">
            {error}
          </Alert>
        ) : null}
        {outcome ? (
          <Alert severity="success" className="sm:col-span-2">
            <Typography variant="subtitle2">Generated: {outcome.generated}</Typography>
            {(outcome.items || []).map((item, index) => (
              <Typography key={item.id || index} variant="body2">
                {item.dateKey || '-'} · Rotation {item.id || '-'} · Team {item.teamId || '-'} ·
                Minimum present {item.minPresent ?? '-'} · Employees off{' '}
                {(item.employeeProfileIds || []).join(', ') || 'none'}
              </Typography>
            ))}
          </Alert>
        ) : null}
        <TextField
          select
          label="Team"
          className="sm:col-span-2"
          value={values.teamId}
          onChange={(event) => setValues({ ...values, teamId: event.target.value })}
          required
        >
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="number"
          label="Month"
          value={values.month}
          inputProps={{ min: 1, max: 12 }}
          onChange={(event) => setValues({ ...values, month: Number(event.target.value) })}
        />
        <TextField
          type="number"
          label="Year"
          value={values.year}
          inputProps={{ min: 2000, max: 9999 }}
          onChange={(event) => setValues({ ...values, year: Number(event.target.value) })}
        />
        <TextField
          type="number"
          label="Minimum present"
          helperText="Leave blank to use the server default."
          value={values.minPresent}
          inputProps={{ min: 0 }}
          onChange={(event) => setValues({ ...values, minPresent: event.target.value })}
        />
        {manualMonth ? (
          <div className="grid gap-4 sm:col-span-2">
            <TextField
              size="small"
              label="Search employees"
              placeholder="Search by name or employee code"
              value={employeeSearch}
              onChange={(event) => setEmployeeSearch(event.target.value)}
            />
            {dates.map((dateKey) => (
              <section
                key={dateKey}
                className="rounded-xl border border-border bg-surface-subtle p-4"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <Typography variant="subtitle2">
                      {new Date(`${dateKey}T00:00:00`).toLocaleDateString(undefined, {
                        weekday: 'long',
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                      })}
                    </Typography>
                    <Typography variant="caption" className="text-ink-muted">
                      {(values.customRotations[dateKey] || []).length} employees selected off
                    </Typography>
                  </div>
                  <Button
                    size="small"
                    variant="outlined"
                    onClick={() =>
                      setValues({
                        ...values,
                        customRotations: { ...values.customRotations, [dateKey]: [] },
                      })
                    }
                  >
                    Clear this day
                  </Button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredTeamEmployees.map((employee) => {
                    const selected = (values.customRotations[dateKey] || []).includes(employee.id)
                    return (
                      <div
                        key={employee.id}
                        className={`flex cursor-pointer items-center gap-2 rounded-lg border p-2.5 transition ${selected ? 'border-primary bg-primary-light' : 'border-border bg-surface hover:border-primary/40'}`}
                      >
                        <Checkbox
                          size="small"
                          checked={selected}
                          onChange={() => {
                            const current = values.customRotations[dateKey] || []
                            setValues({
                              ...values,
                              customRotations: {
                                ...values.customRotations,
                                [dateKey]: selected
                                  ? current.filter((id) => id !== employee.id)
                                  : [...current, employee.id],
                              },
                            })
                          }}
                        />
                        <span>
                          <span className="block text-sm font-semibold text-ink-strong">
                            {employee.fullName || employee.employeeCode}
                          </span>
                          <span className="block text-xs text-ink-muted">
                            {employee.employeeCode || 'Employee'}
                          </span>
                        </span>
                      </div>
                    )
                  })}
                </div>
              </section>
            ))}
          </div>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading || !values.teamId}
          onClick={() =>
            onSubmit({
              teamId: values.teamId,
              month: values.month,
              year: values.year,
              ...(values.minPresent === '' ? {} : { minPresent: Number(values.minPresent) }),
              ...(manualMonth
                ? {
                    customRotations: dates.map((dateKey) => ({
                      dateKey,
                      employeeProfileIds: values.customRotations[dateKey] || [],
                    })),
                  }
                : {}),
            })
          }
        >
          {manualMonth ? 'Save manual month' : 'Generate rotations'}
        </Button>
      </DialogActions>
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
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const q = searchParams.get('q') || ''
  const profileId = searchParams.get('profileId') || ''
  const shiftId = searchParams.get('shiftId') || ''
  const workLocationId = searchParams.get('workLocationId') || ''
  const status = searchParams.get('status') || ''
  const effectiveFrom = searchParams.get('effectiveFrom') || ''
  const effectiveTo = searchParams.get('effectiveTo') || ''
  const scopeType = searchParams.get('scopeType') || ''
  const holidayScopeKey = searchParams.get('holidayScope') || ''
  const month = searchParams.get('month') || ''
  const year = searchParams.get('year') || ''
  const holidayYear =
    Number(year) >= 2000 && Number(year) <= 9999 ? Number(year) : new Date().getFullYear()
  const rotationMonth =
    Number(month) >= 1 && Number(month) <= 12 ? Number(month) : new Date().getMonth() + 1
  const rotationYear =
    Number(year) >= 2000 && Number(year) <= 9999 ? Number(year) : new Date().getFullYear()
  const teamId = searchParams.get('teamId') || ''
  const [editor, setEditor] = useState(null)
  const [holidayEditor, setHolidayEditor] = useState(null)
  const [holidayDraft, setHolidayDraft] = useState(null)
  const [holidayDetailId, setHolidayDetailId] = useState('')
  const [bulkImportOpen, setBulkImportOpen] = useState(false)
  const [bulkImportResult, setBulkImportResult] = useState(null)
  const [rotationEditor, setRotationEditor] = useState('')
  const [rotationOutcome, setRotationOutcome] = useState(null)
  const [rotationMaintenance, setRotationMaintenance] = useState(null)
  const [deletingRecord, setDeletingRecord] = useState(null)
  const [actionError, setActionError] = useState('')
  const [employeeSearch, setEmployeeSearch] = useState('')
  const [shiftSearch, setShiftSearch] = useState('')
  const [locationSearch, setLocationSearch] = useState('')
  const canWrite = hasAnyPermission(currentUser, ['HR_SCHEDULE:WRITE'])
  const canScheduleRead = hasAnyPermission(currentUser, ['HR_SCHEDULE:READ', 'HR_SCHEDULE:WRITE'])
  const canCalendarRead = hasAnyPermission(currentUser, ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE'])
  const canReadDirectory = hasAnyPermission(currentUser, [
    'HR_EMPLOYEES:READ',
    'HR_EMPLOYEES:WRITE',
    'HR_CALENDAR:READ',
    'HR_CALENDAR:WRITE',
    'HR_SCHEDULE:READ',
    'HR_SCHEDULE:WRITE',
  ])
  const canWriteGlobal = globalScheduleWrite(currentUser)
  const canCalendarWriteGlobal = hasGlobalPermissionCode(currentUser, 'HR_CALENDAR:WRITE')
  const canCalendarReadGlobal =
    hasGlobalPermissionCode(currentUser, 'HR_CALENDAR:READ') || canCalendarWriteGlobal
  const tab = resolveScheduleTab(requestedTab, { canScheduleRead, canCalendarRead })
  const visibleTabs = tabs.filter((value) =>
    ['assignments', 'shifts', 'locations', 'overrides'].includes(value)
      ? canScheduleRead
      : canCalendarRead,
  )
  const holidayScopeState = resolveCalendarScopeQuery(currentUser, holidayScopeKey, [
    'HR_CALENDAR:READ',
    'HR_CALENDAR:WRITE',
  ])
  const rotationReadTeamIds = useMemo(
    () => getAuthorizedTeamScopeIds(currentUser, ['HR_CALENDAR:READ', 'HR_CALENDAR:WRITE']),
    [currentUser],
  )
  const rotationWriteTeamIds = useMemo(
    () => getAuthorizedTeamScopeIds(currentUser, 'HR_CALENDAR:WRITE'),
    [currentUser],
  )
  const rotationTeamId = resolveRotationTeamId(teamId, rotationReadTeamIds, canCalendarReadGlobal)
  const rotationWriteTeamId = resolveRotationTeamId(
    teamId,
    rotationWriteTeamIds,
    canCalendarWriteGlobal,
  )

  const assignmentQuery = useShiftAssignmentsQuery(
    {
      page,
      limit: pageSize,
      profileId,
      shiftId,
      workLocationId,
      status,
      effectiveFrom,
      effectiveTo,
    },
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
    {
      page,
      limit: pageSize,
      dateFrom: `${holidayYear}-01-01`,
      dateTo: `${holidayYear}-12-31`,
      ...holidayScopeState.params,
    },
    { enabled: tab === 'holidays' && holidayScopeState.enabled },
  )
  const rotationMatrixQuery = useSaturdayRotationMatrixQuery(
    { teamId: rotationTeamId, month: rotationMonth, year: rotationYear },
    { enabled: tab === 'rotations' && (canCalendarReadGlobal || Boolean(rotationTeamId)) },
  )

  const employeesQuery = useEmployeeProfilesQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: canReadDirectory },
  )
  const assignmentEmployeesQuery = useEmployeeProfilesQuery(
    { page: 1, limit: 20, status: 'ACTIVE', q: employeeSearch },
    { enabled: tab === 'assignments' && canScheduleRead },
  )
  const assignmentShiftsQuery = useShiftsQuery(
    { page: 1, limit: 20, q: shiftSearch },
    { enabled: tab === 'assignments' && canScheduleRead },
  )
  const assignmentLocationsQuery = useWorkLocationsQuery(
    { page: 1, limit: 20, q: locationSearch },
    { enabled: tab === 'assignments' && canScheduleRead },
  )
  const optionShiftsQuery = useShiftsQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: canScheduleRead },
  )
  const optionLocationsQuery = useWorkLocationsQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: canScheduleRead },
  )
  const employees = list(employeesQuery.data)
  const shifts = list(optionShiftsQuery.data)
  const locations = list(optionLocationsQuery.data)
  const assignmentEmployees = list(assignmentEmployeesQuery.data)
  const assignmentShifts = list(assignmentShiftsQuery.data)
  const assignmentLocations = list(assignmentLocationsQuery.data)
  const teams = useMemo(
    () => [
      ...new Map(
        employees
          .filter((employee) => employee.team?.id)
          .map((employee) => [employee.team.id, employee.team]),
      ).values(),
    ],
    [employees],
  )
  const departments = useMemo(
    () => [
      ...new Map(
        employees
          .filter((employee) => employee.department?.id)
          .map((employee) => [employee.department.id, employee.department]),
      ).values(),
    ],
    [employees],
  )
  const holidayScopeOptions = useMemo(() => {
    const namedTeams = new Map(teams.map((team) => [team.id, team.name]))
    const namedDepartments = new Map(
      departments.map((department) => [department.id, department.name]),
    )
    return holidayScopeState.scopes.map((scope, index) => ({
      ...scope,
      label:
        (scope.scopeType === 'team'
          ? namedTeams.get(scope.scopeId)
          : namedDepartments.get(scope.scopeId)) || `Authorized ${scope.scopeType} ${index + 1}`,
    }))
  }, [departments, holidayScopeState.scopes, teams])
  const namedRotationTeams = new Map(teams.map((team) => [team.id, team]))
  const rotationReadTeams = canCalendarReadGlobal
    ? teams
    : rotationReadTeamIds.map(
        (id, index) => namedRotationTeams.get(id) || { id, name: `Authorized team ${index + 1}` },
      )
  const rotationWriteTeams = canCalendarWriteGlobal
    ? teams
    : rotationWriteTeamIds.map(
        (id, index) => namedRotationTeams.get(id) || { id, name: `Authorized team ${index + 1}` },
      )
  const employeeById = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee])),
    [employees],
  )
  const teamById = useMemo(
    () => new Map(rotationReadTeams.map((team) => [team.id, team])),
    [rotationReadTeams],
  )

  function canWriteRotationRow(row) {
    return canAccessTeamScope(currentUser, 'HR_CALENDAR:WRITE', row.teamId)
  }

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
  const bulkImportHolidays = useBulkImportHolidaysMutation()
  const checkHolidayPolicy = useCheckHolidayPolicyMutation()
  const generateRotations = useGenerateSaturdayRotationsMutation()
  const createRotation = useCreateSaturdayRotationMutation()
  const deleteRotation = useDeleteSaturdayRotationMutation()
  const updateRotation = useUpdateSaturdayRotationMutation()
  const deleteTeamRotations = useDeleteTeamSaturdayRotationsMutation()
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
    rotations: rotationMatrixQuery,
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
      await checkHolidayPolicy.mutateAsync({
        dateKey: payload.dateKey,
        ...holidayScopeState.params,
      })
      await (holidayEditor?.id
        ? updateHoliday.mutateAsync({ id: holidayEditor.id, payload })
        : createHoliday.mutateAsync(payload))
      setHolidayEditor(null)
      enqueueSnackbar('Holiday saved', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(error?.data?.message || error?.message || 'Could not save holiday')
    }
  }

  async function importHolidays(items) {
    setActionError('')
    try {
      const result = await bulkImportHolidays.mutateAsync({ items })
      setBulkImportResult(result)
      enqueueSnackbar('Holidays imported', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(error?.data?.message || error?.message || 'Could not import holidays')
    }
  }

  async function generateRotationSet(payload) {
    setActionError('')
    try {
      const result = await generateRotations.mutateAsync(payload)
      setRotationOutcome(result)
      enqueueSnackbar('Saturday rotations generated', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(error?.data?.message || error?.message || 'Could not generate rotations')
    }
  }

  async function saveRotation(payload) {
    setActionError('')
    try {
      await (payload.id ? updateRotation.mutateAsync(payload) : createRotation.mutateAsync(payload))
      setRotationMaintenance(null)
      enqueueSnackbar(
        payload.id ? 'Saturday rotation updated' : 'Manual Saturday rotation created',
        { variant: SNACKBAR_VARIANTS.SUCCESS },
      )
    } catch (error) {
      setActionError(error?.data?.message || error?.message || 'Could not update Saturday rotation')
    }
  }

  async function removeTeamRotations(payload) {
    setActionError('')
    try {
      await deleteTeamRotations.mutateAsync(payload)
      setRotationMaintenance(null)
      enqueueSnackbar('Saturday rotations removed', { variant: SNACKBAR_VARIANTS.SUCCESS })
    } catch (error) {
      setActionError(
        error?.data?.message || error?.message || 'Could not remove Saturday rotations',
      )
    }
  }

  async function removeCalendarRecord(type, id) {
    setDeletingRecord({ type, id })
  }

  async function confirmRemoveCalendarRecord() {
    if (!deletingRecord) return
    const { type, id } = deletingRecord
    setActionError('')
    try {
      await (type === 'holiday' ? deleteHoliday.mutateAsync(id) : deleteRotation.mutateAsync(id))
      enqueueSnackbar(type === 'holiday' ? 'Holiday removed' : 'Rotation removed', {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setDeletingRecord(null)
    } catch (error) {
      enqueueSnackbar(
        error?.data?.message || error?.message || 'Could not remove calendar record',
        {
          variant: SNACKBAR_VARIANTS.ERROR,
        },
      )
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
      return (
        (row.employeeProfileIds || [])
          .map((id) => employeeById.get(id)?.fullName)
          .filter(Boolean)
          .join(', ') || '-'
      )
    }
    if (column.key === 'minPresent') return row.minPresent ?? '-'
    if (column.key === 'scope')
      return tab === 'holidays'
        ? row.appliedDepartmentIds?.length || row.appliedTeamIds?.length
          ? `${row.appliedDepartmentIds.length} departments · ${row.appliedTeamIds.length} teams`
          : 'Global'
        : row.scopeTarget?.fullName || row.scopeTarget?.name || row.scopeType || '-'
    if (column.key === 'status') {
      const value =
        tab === 'holidays' ? (row.isActive === false ? 'INACTIVE' : 'ACTIVE') : row.status
      return (
        <StatusBadge tone={value === 'ACTIVE' ? 'success' : 'neutral'}>{value || '-'}</StatusBadge>
      )
    }
    if (column.key === 'actions') {
      if (tab === 'holidays') {
        return (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <IconActionButton
              label="View holiday"
              tone="primary"
              onClick={() => setHolidayDetailId(row.id)}
            >
              <VisibilityOutlinedIcon fontSize="small" />
            </IconActionButton>
            {canCalendarWriteGlobal ? (
              <>
                <IconActionButton
                  label="Edit holiday"
                  tone="primary"
                  onClick={() => {
                    setHolidayDraft(row)
                    setHolidayEditor(row)
                  }}
                >
                  <EditOutlinedIcon fontSize="small" />
                </IconActionButton>
                <IconActionButton
                  label="Delete holiday"
                  tone="danger"
                  onClick={() => removeCalendarRecord('holiday', row.id)}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconActionButton>
              </>
            ) : null}
          </Stack>
        )
      }
      if (tab === 'rotations') {
        return canWriteRotationRow(row) ? (
          <Stack direction="row" spacing={0.25} justifyContent="center">
            <IconActionButton
              label="Maintain rotation"
              tone="primary"
              onClick={() => setRotationMaintenance(row)}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconActionButton>
            <IconActionButton
              label="Delete rotation"
              tone="danger"
              onClick={() => removeCalendarRecord('rotation', row.id)}
            >
              <DeleteOutlineIcon fontSize="small" />
            </IconActionButton>
          </Stack>
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

  const columns = (columnSets[tab] || []).map(([key, width]) => ({
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
            canCalendarWriteGlobal && tab === 'holidays' ? (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setActionError('')
                    setBulkImportResult(null)
                    setBulkImportOpen(true)
                  }}
                >
                  Import holidays
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setActionError('')
                    setHolidayDraft({})
                    setHolidayEditor({})
                  }}
                >
                  Add holiday
                </Button>
              </Stack>
            ) : rotationWriteTeams.length && tab === 'rotations' ? (
              <Stack direction="row" spacing={1}>
                <Button
                  variant="outlined"
                  onClick={() => {
                    setActionError('')
                    setRotationOutcome(null)
                    setRotationEditor('manual')
                  }}
                >
                  Manual month
                </Button>
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={() => {
                    setActionError('')
                    setRotationOutcome(null)
                    setRotationEditor('generate')
                  }}
                >
                  Generate rotations
                </Button>
              </Stack>
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
          items={visibleTabs.map((value) => ({
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
        <OperationsToolbar className="border-0 shadow-none">
          <div className="flex flex-wrap items-start gap-3">
            {tab === 'assignments' ? (
              <>
                <Autocomplete
                  size="small"
                  className="w-64"
                  options={assignmentEmployees}
                  value={assignmentEmployees.find((employee) => employee.id === profileId) || null}
                  loading={assignmentEmployeesQuery.isFetching}
                  getOptionLabel={(employee) =>
                    `${employee.fullName || ''}${employee.employeeCode ? ` (${employee.employeeCode})` : ''}`
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onInputChange={(_, value, reason) => {
                    if (reason !== 'reset') setEmployeeSearch(value)
                  }}
                  onChange={(_, employee) => {
                    updateSearch({ profileId: employee?.id || '' }, true)
                    setEmployeeSearch(employee?.fullName || '')
                  }}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      label={t('hrTime.filters.employee', { defaultValue: 'Employee' })}
                      placeholder={t('common.search', { defaultValue: 'Search' })}
                    />
                  )}
                />
                <Autocomplete
                  size="small"
                  className="w-52"
                  options={assignmentShifts}
                  value={assignmentShifts.find((shift) => shift.id === shiftId) || null}
                  loading={assignmentShiftsQuery.isFetching}
                  getOptionLabel={(shift) =>
                    `${shift.name || ''}${shift.code ? ` (${shift.code})` : ''}`
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onInputChange={(_, value, reason) => {
                    if (reason !== 'reset') setShiftSearch(value)
                  }}
                  onChange={(_, shift) => {
                    updateSearch({ shiftId: shift?.id || '' }, true)
                    setShiftSearch(shift?.name || '')
                  }}
                  renderInput={(params) => <TextField {...params} label="Shift" />}
                />
                <Autocomplete
                  size="small"
                  className="w-52"
                  options={assignmentLocations}
                  value={
                    assignmentLocations.find((location) => location.id === workLocationId) || null
                  }
                  loading={assignmentLocationsQuery.isFetching}
                  getOptionLabel={(location) =>
                    `${location.name || ''}${location.code ? ` (${location.code})` : ''}`
                  }
                  isOptionEqualToValue={(option, value) => option.id === value.id}
                  onInputChange={(_, value, reason) => {
                    if (reason !== 'reset') setLocationSearch(value)
                  }}
                  onChange={(_, location) => {
                    updateSearch({ workLocationId: location?.id || '' }, true)
                    setLocationSearch(location?.name || '')
                  }}
                  renderInput={(params) => <TextField {...params} label="Work location" />}
                />
                <TextField
                  select
                  size="small"
                  className="w-36"
                  label={t('common.status', { defaultValue: 'Status' })}
                  value={status}
                  onChange={(event) => updateSearch({ status: event.target.value }, true)}
                >
                  <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                  <MenuItem value="ACTIVE">Active</MenuItem>
                  <MenuItem value="SUSPENDED">Suspended</MenuItem>
                </TextField>
                <DateRangePicker
                  value={{
                    start: effectiveFrom ? dayjs(effectiveFrom) : null,
                    end: effectiveTo ? dayjs(effectiveTo) : null,
                  }}
                  onChange={({ start, end }) =>
                    updateSearch(
                      {
                        effectiveFrom: start?.format('YYYY-MM-DD') ?? '',
                        effectiveTo: end?.format('YYYY-MM-DD') ?? '',
                      },
                      true,
                    )
                  }
                  onClear={() => updateSearch({ effectiveFrom: '', effectiveTo: '' }, true)}
                />
                <Button
                  variant="text"
                  disabled={
                    !profileId &&
                    !shiftId &&
                    !workLocationId &&
                    !status &&
                    !effectiveFrom &&
                    !effectiveTo
                  }
                  onClick={() =>
                    updateSearch(
                      {
                        profileId: '',
                        shiftId: '',
                        workLocationId: '',
                        status: '',
                        effectiveFrom: '',
                        effectiveTo: '',
                      },
                      true,
                    )
                  }
                >
                  Clear filters
                </Button>
              </>
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
            {tab === 'holidays' && !holidayScopeState.global && holidayScopeState.enabled ? (
              <TextField
                select
                size="small"
                className="w-64"
                label="Calendar scope"
                value={holidayScopeState.selectedScopeKey}
                onChange={(event) => updateSearch({ holidayScope: event.target.value }, true)}
              >
                {holidayScopeOptions.map((scope) => (
                  <MenuItem key={scope.key} value={scope.key}>
                    {scope.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {tab === 'holidays' ? (
              <TextField
                size="small"
                type="number"
                className="w-32"
                label="Year"
                value={year || holidayYear}
                inputProps={{ min: 2000, max: 9999 }}
                onChange={(event) => updateSearch({ year: event.target.value }, true)}
              />
            ) : null}
            {tab === 'rotations' ? (
              <>
                <TextField
                  select
                  size="small"
                  className="w-56"
                  label="Team"
                  value={rotationTeamId}
                  onChange={(event) => updateSearch({ teamId: event.target.value }, true)}
                >
                  {canCalendarReadGlobal ? (
                    <MenuItem value="">All</MenuItem>
                  ) : rotationReadTeams.length > 1 ? (
                    <MenuItem value="" disabled>
                      Select authorized team
                    </MenuItem>
                  ) : null}
                  {rotationReadTeams.map((team) => (
                    <MenuItem key={team.id} value={team.id}>
                      {team.name}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  type="number"
                  label="Month"
                  value={rotationMonth}
                  inputProps={{ min: 1, max: 12 }}
                  onChange={(event) => updateSearch({ month: event.target.value }, true)}
                />
                <TextField
                  size="small"
                  type="number"
                  label="Year"
                  value={rotationYear}
                  inputProps={{ min: 2000, max: 9999 }}
                  onChange={(event) => updateSearch({ year: event.target.value }, true)}
                />
              </>
            ) : null}
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={
                selectedQuery.isFetching || (tab === 'holidays' && !holidayScopeState.enabled)
              }
              onClick={() => selectedQuery.refetch()}
            >
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </Button>
          </div>
        </OperationsToolbar>
      }
      pagination={
        tab === 'rotations' ? null : (
          <OperationsPagination
            page={pagination.page || page}
            pageSize={pagination.limit || pageSize}
            total={pagination.total || 0}
            onPageChange={(value) => updateSearch({ page: value })}
          />
        )
      }
    >
      {queryError ? (
        <Alert severity="error" className="mb-3">
          {queryError}
        </Alert>
      ) : null}
      {tab === 'holidays' ? (
        <HolidayPolicySummary
          canShowSummary={canCalendarReadGlobal}
          checkParams={
            holidayDraft?.dateKey
              ? { dateKey: holidayDraft.dateKey, ...holidayScopeState.params }
              : undefined
          }
          rangeParams={
            holidayScopeState.enabled
              ? {
                  dateFrom: `${holidayYear}-01-01`,
                  dateTo: `${holidayYear}-12-31`,
                  ...holidayScopeState.params,
                }
              : undefined
          }
          year={holidayYear}
        />
      ) : null}
      {tab === 'rotations' ? (
        <div className="h-full overflow-y-auto pb-4">
          <SaturdayRotationMatrix
            matrix={rotationMatrixQuery.data}
            employees={employees}
            canWriteCell={(team) => canWriteRotationRow({ teamId: team.id })}
            onSelectCell={(team, cell) => {
              setActionError('')
              setRotationMaintenance({
                id: cell.rotationId,
                teamId: team.id,
                dateKey: cell.dateKey,
                month: rotationMonth,
                year: rotationYear,
                employeeProfileIds: cell.employeeProfileIds,
              })
            }}
          />
        </div>
      ) : (
        <OperationsTable
          columns={columns}
          rows={rows}
          loading={selectedQuery.isPending}
          getRowKey={(row) => row.id}
          renderCell={renderCell}
          minWidth={tab === 'locations' ? '720px' : '1040px'}
          emptyTitle={t('hrTime.empty.title', { defaultValue: 'No records found' })}
        />
      )}
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
      {tab === 'holidays' && !holidayScopeState.enabled ? (
        <Alert severity="warning" className="mb-3">
          No authorized calendar scope is available for holiday records.
        </Alert>
      ) : null}
      {holidayEditor ? (
        <HolidayDialog
          key={holidayEditor.id || 'new'}
          record={holidayEditor.id ? holidayEditor : null}
          loading={createHoliday.isPending || updateHoliday.isPending}
          error={actionError}
          onClose={() => {
            setHolidayEditor(null)
            setHolidayDraft(null)
          }}
          onDraftChange={setHolidayDraft}
          onSubmit={saveHoliday}
        />
      ) : null}
      {rotationEditor ? (
        <RotationDialog
          teams={rotationWriteTeams}
          employees={employees}
          initialTeamId={rotationWriteTeamId}
          manualMonth={rotationEditor === 'manual'}
          loading={generateRotations.isPending}
          error={actionError}
          outcome={rotationOutcome}
          onClose={() => {
            setRotationEditor('')
            setRotationOutcome(null)
          }}
          onSubmit={generateRotationSet}
        />
      ) : null}
      {holidayDetailId ? (
        <HolidayDetailDrawer
          open
          holidayId={holidayDetailId}
          onClose={() => setHolidayDetailId('')}
        />
      ) : null}
      {bulkImportOpen ? (
        <HolidayBulkImportDialog
          open
          loading={bulkImportHolidays.isPending}
          error={actionError ? { message: actionError } : null}
          result={bulkImportResult}
          onClose={() => setBulkImportOpen(false)}
          onSubmit={importHolidays}
        />
      ) : null}
      {rotationMaintenance ? (
        <RotationMaintenanceDialog
          key={
            rotationMaintenance.id || `${rotationMaintenance.teamId}-${rotationMaintenance.dateKey}`
          }
          employees={employees}
          error={actionError ? { message: actionError } : null}
          loading={
            createRotation.isPending || updateRotation.isPending || deleteTeamRotations.isPending
          }
          rotation={rotationMaintenance}
          teams={rotationWriteTeams}
          onClose={() => setRotationMaintenance(null)}
          onDeleteTeam={removeTeamRotations}
          onCreate={saveRotation}
          onUpdate={saveRotation}
        />
      ) : null}
      <ConfirmDialog
        open={Boolean(deletingRecord)}
        title={deletingRecord?.type === 'holiday' ? 'Delete holiday?' : 'Delete rotation?'}
        description={`Are you sure you want to delete this ${deletingRecord?.type}? This action cannot be undone.`}
        loading={deleteHoliday.isPending || deleteRotation.isPending}
        onClose={() => setDeletingRecord(null)}
        onConfirm={confirmRemoveCalendarRecord}
      />
    </OperationsPageShell>
  )
}
