import { useCallback, useEffect, useState, useTransition } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, Stack, TextField } from '@mui/material'
import { useSnackbar } from 'notistack'

import MonthPicker from '@/components/form/MonthPicker'
import { OperationsHeader, OperationsPageShell, OperationsToolbar } from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { useDepartmentsQuery, useTeamsQuery } from '@/features/rbac/api/rbac.queries'
import { useDebounce } from '@/hooks/useDebounce'

import { useAdjustAttendanceMutation } from '../api/hrTime.mutations.js'
import { useAttendanceMonthMatrixQuery, useShiftsQuery } from '../api/hrTime.queries.js'
import AttendanceAdjustmentDialog from '../components/AttendanceAdjustmentDialog.jsx'
import AttendanceStaffDetailDrawer from '../components/AttendanceStaffDetailDrawer.jsx'
import HrOperationsSummaryCards from '../components/HrOperationsSummaryCards.jsx'
import MonthlyStaffMatrix from '../components/MonthlyStaffMatrix.jsx'

const pageSize = 8

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
  const [, startTransition] = useTransition()
  const [selectedAttendance, setSelectedAttendance] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [actionError, setActionError] = useState('')

  const handleMatrixRowOpen = useCallback((row) => {
    setSelectedAttendance({ row, cell: row.cells?.[0] || null })
  }, [])

  const handleMatrixCellOpen = useCallback((cell, row) => {
    setSelectedAttendance({ row, cell })
  }, [])
  const today = new Date()
  const year = Number(searchParams.get('year')) || today.getFullYear()
  const month = monthValue(searchParams.get('month'), today.getMonth() + 1)
  const teamId = searchParams.get('teamId') || ''
  const departmentId = searchParams.get('departmentId') || ''
  const shiftId = searchParams.get('shiftId') || ''
  const q = searchParams.get('q') || ''
  const [searchInput, setSearchInput] = useState(q)
  const debouncedSearch = useDebounce(searchInput, 300)
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const exceptionsOnly = searchParams.get('exceptionsOnly') === 'true'
  const lateOnly = searchParams.get('lateOnly') === 'true'
  const monthLabel = new Intl.DateTimeFormat('en-US', {
    month: 'long',
    year: 'numeric',
  }).format(new Date(year, month - 1))

  const updateSearch = useCallback(
    (updates, resetPage = false) => {
      startTransition(() => {
        setSearchParams(
          (current) => {
            const next = new URLSearchParams(current)
            Object.entries(updates).forEach(([key, value]) => {
              if (value === '' || value === null || value === undefined || value === false)
                next.delete(key)
              else next.set(key, String(value))
            })
            if (resetPage) next.delete('page')
            return next
          },
          { replace: true },
        )
      })
    },
    [setSearchParams, startTransition],
  )

  const handleSummaryFilterChange = useCallback(
    (filters) => updateSearch(filters, true),
    [updateSearch],
  )

  const handlePageChange = useCallback((value) => updateSearch({ page: value }), [updateSearch])

  useEffect(() => {
    if (debouncedSearch !== q) updateSearch({ q: debouncedSearch }, true)
  }, [debouncedSearch, q, updateSearch])

  const matrix = useAttendanceMonthMatrixQuery({
    year,
    month,
    teamId,
    departmentId,
    shiftId,
    q,
    exceptionsOnly,
    lateOnly,
    page,
    limit: pageSize,
  })

  const teamsQuery = useTeamsQuery()
  const departmentsQuery = useDepartmentsQuery()
  const shiftsQuery = useShiftsQuery()
  const teams = teamsQuery.data?.items || []
  const departments = departmentsQuery.data?.items || []
  const shifts = shiftsQuery.data?.items || []
  const pagination = matrix.data?.pagination || { page, limit: pageSize, total: 0 }

  const adjustment = useAdjustAttendanceMutation()
  async function submitAdjustment(payload) {
    setActionError('')
    try {
      const updated = await adjustment.mutateAsync({ attendanceId: adjusting.id, payload })
      setSelectedAttendance((current) =>
        current?.cell?.id === updated.id
          ? { ...current, cell: { ...current.cell, ...updated } }
          : current,
      )
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
      header={<OperationsHeader title="Attendance" subtitle={`${monthLabel} · Company scope`} />}
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
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
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
              onClick={() =>
                updateSearch({ exceptionsOnly: !exceptionsOnly, lateOnly: false }, true)
              }
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
      <Stack spacing={3} className="h-full min-h-0">
        {matrix.isError ? (
          <Alert severity="error">
            {matrix.error?.response?.data?.message || matrix.error?.message}
          </Alert>
        ) : null}
        <HrOperationsSummaryCards
          summary={matrix.data?.summary}
          onFilterChange={handleSummaryFilterChange}
        />
        <MonthlyStaffMatrix
          year={year}
          month={month}
          rows={matrix.data?.items || []}
          onRowOpen={handleMatrixRowOpen}
          onCellOpen={handleMatrixCellOpen}
          page={pagination.page || page}
          pageSize={pagination.limit || pageSize}
          total={pagination.total || 0}
          onPageChange={handlePageChange}
        />
      </Stack>
      <AttendanceStaffDetailDrawer
        row={selectedAttendance?.row}
        cell={selectedAttendance?.cell}
        onClose={() => setSelectedAttendance(null)}
        onAdjust={(cell) => {
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
