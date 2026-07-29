import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'
import { useSnackbar } from 'notistack'

import MonthPicker from '@/components/form/MonthPicker'
import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsToolbar,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useDepartmentsQuery, useTeamsQuery } from '@/features/rbac/api/rbac.queries'

import { useAdjustAttendanceMutation } from '../api/hrTime.mutations.js'
import { useAttendanceMonthMatrixQuery, useShiftsQuery } from '../api/hrTime.queries.js'
import AttendanceAdjustmentDialog from '../components/AttendanceAdjustmentDialog.jsx'
import AttendanceStaffDetailDrawer from '../components/AttendanceStaffDetailDrawer.jsx'
import AttendanceStaffList from '../components/AttendanceStaffList.jsx'
import HrOperationsSummaryCards from '../components/HrOperationsSummaryCards.jsx'

const pageSize = 20

function monthValue(value, fallback) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= 12 ? parsed : fallback
}

function canAdjust(cell) {
  return Boolean(cell?.id && cell.capabilities?.adjust)
}

export default function AttendanceDeskPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const [selectedRow, setSelectedRow] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [actionError, setActionError] = useState('')
  const today = new Date()
  const year = Number(searchParams.get('year')) || today.getFullYear()
  const month = monthValue(searchParams.get('month'), today.getMonth() + 1)
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const teamId = searchParams.get('teamId') || ''
  const departmentId = searchParams.get('departmentId') || ''
  const shiftId = searchParams.get('shiftId') || ''
  const q = searchParams.get('q') || ''
  const exceptionsOnly = searchParams.get('exceptionsOnly') === 'true'
  const matrix = useAttendanceMonthMatrixQuery({
    year,
    month,
    teamId,
    departmentId,
    shiftId,
    q,
    exceptionsOnly,
    page,
    limit: pageSize,
  })

  const teamsQuery = useTeamsQuery()
  const departmentsQuery = useDepartmentsQuery()
  const shiftsQuery = useShiftsQuery()
  const teams = teamsQuery.data?.items || []
  const departments = departmentsQuery.data?.items || []
  const shifts = shiftsQuery.data?.items || []

  const adjustment = useAdjustAttendanceMutation()
  const pagination = matrix.data?.pagination || { page, limit: pageSize, total: 0 }

  function updateSearch(updates, resetPage = false) {
    setSearchParams(
      (current) => {
        const next = new URLSearchParams(current)
        Object.entries(updates).forEach(([key, value]) => {
          if (value === '' || value === null || value === undefined || value === false)
            next.delete(key)
          else next.set(key, String(value))
        })
        if (resetPage) next.set('page', '1')
        return next
      },
      { replace: true },
    )
  }

  async function submitAdjustment(payload) {
    setActionError('')
    try {
      await adjustment.mutateAsync({ attendanceId: adjusting.id, payload })
      enqueueSnackbar(
        t('hrTime.messages.attendanceAdjusted', { defaultValue: 'Attendance updated' }),
        {
          variant: SNACKBAR_VARIANTS.SUCCESS,
        },
      )
      setAdjusting(null)
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          t('hrTime.errors.actionFailed', {
            defaultValue: 'Could not update attendance',
          }),
      )
    }
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.attendance.title', { defaultValue: 'Attendance Desk' })}
          subtitle={t('hrTime.attendance.subtitle', {
            defaultValue: 'Review monthly attendance inside your authorized scope.',
          })}
        />
      }
      toolbar={
        <OperationsToolbar>
          <div className="flex flex-wrap items-center gap-3">
            <MonthPicker
              size="small"
              className="w-48"
              value={`${year}-${String(month).padStart(2, '0')}`}
              onChange={(formatted) => {
                if (!formatted) return
                const [y, m] = formatted.split('-')
                updateSearch({ year: y, month: Number(m) }, true)
              }}
            />
            <TextField
              size="small"
              placeholder={t('common.search', { defaultValue: 'Search...' })}
              value={q}
              onChange={(event) => updateSearch({ q: event.target.value }, true)}
            />
            <TextField
              select
              size="small"
              className="w-44"
              label={t('hrTime.filters.team', { defaultValue: 'Team' })}
              value={teamId}
              onChange={(event) => updateSearch({ teamId: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {teams.map((team) => (
                <MenuItem key={team.id} value={team.id}>
                  {team.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              className="w-48"
              label={t('hrTime.filters.department', { defaultValue: 'Department' })}
              value={departmentId}
              onChange={(event) => updateSearch({ departmentId: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {departments.map((department) => (
                <MenuItem key={department.id} value={department.id}>
                  {department.name}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              className="w-44"
              label={t('hrTime.filters.shift', { defaultValue: 'Shift' })}
              value={shiftId}
              onChange={(event) => updateSearch({ shiftId: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name}
                </MenuItem>
              ))}
            </TextField>
            <Button
              variant={exceptionsOnly ? 'contained' : 'outlined'}
              onClick={() => updateSearch({ exceptionsOnly: !exceptionsOnly }, true)}
            >
              Exceptions
            </Button>
            <Button startIcon={<RefreshIcon />} onClick={() => matrix.refetch()}>
              Refresh
            </Button>
          </div>
        </OperationsToolbar>
      }
    >
      <Stack spacing={3}>
        {matrix.isError ? (
          <Alert severity="error">
            {matrix.error?.response?.data?.message || matrix.error?.message}
          </Alert>
        ) : null}
        <HrOperationsSummaryCards
          summary={matrix.data?.summary}
          onFilterChange={(filters) => updateSearch(filters, true)}
        />
        <AttendanceStaffList
          rows={matrix.data?.items || []}
          onViewDetail={(row) => setSelectedRow(row)}
        />
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={(nextPage) => updateSearch({ page: nextPage })}
        />
      </Stack>
      <AttendanceStaffDetailDrawer
        row={selectedRow}
        month={month}
        year={year}
        onClose={() => setSelectedRow(null)}
        onCellOpen={(cell) => {
          if (canAdjust(cell)) {
            setActionError('')
            setAdjusting(cell)
          }
        }}
      />
      {adjusting ? (
        <AttendanceAdjustmentDialog
          open
          record={adjusting}
          loading={adjustment.isPending}
          error={actionError}
          onClose={() => setAdjusting(null)}
          onSubmit={submitAdjustment}
        />
      ) : null}
    </OperationsPageShell>
  )
}
