import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, Drawer, Stack, TextField, Typography } from '@mui/material'
import { useSnackbar } from 'notistack'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsToolbar,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'

import { useAdjustAttendanceMutation } from '../api/hrTime.mutations.js'
import { useAttendanceMonthMatrixQuery } from '../api/hrTime.queries.js'
import AttendanceAdjustmentDialog from '../components/AttendanceAdjustmentDialog.jsx'
import HrOperationsSummaryCards from '../components/HrOperationsSummaryCards.jsx'
import MonthlyStaffMatrix from '../components/MonthlyStaffMatrix.jsx'

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
  const [selected, setSelected] = useState(null)
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
            <TextField
              size="small"
              type="number"
              label="Year"
              value={year}
              onChange={(event) => updateSearch({ year: event.target.value }, true)}
              inputProps={{ min: 2000, max: 2100 }}
            />
            <TextField
              size="small"
              type="number"
              label="Month"
              value={month}
              onChange={(event) => updateSearch({ month: event.target.value }, true)}
              inputProps={{ min: 1, max: 12 }}
            />
            <TextField
              size="small"
              label="Search employee"
              value={q}
              onChange={(event) => updateSearch({ q: event.target.value }, true)}
            />
            <TextField
              size="small"
              label="Team"
              value={teamId}
              onChange={(event) => updateSearch({ teamId: event.target.value }, true)}
            />
            <TextField
              size="small"
              label="Department"
              value={departmentId}
              onChange={(event) => updateSearch({ departmentId: event.target.value }, true)}
            />
            <TextField
              size="small"
              label="Shift"
              value={shiftId}
              onChange={(event) => updateSearch({ shiftId: event.target.value }, true)}
            />
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
        <MonthlyStaffMatrix
          year={year}
          month={month}
          rows={matrix.data?.items || []}
          onCellOpen={(cell) => setSelected(cell)}
        />
        <OperationsPagination
          page={pagination.page}
          pageSize={pagination.limit}
          total={pagination.total}
          onPageChange={(nextPage) => updateSearch({ page: nextPage })}
        />
      </Stack>
      <Drawer anchor="right" open={Boolean(selected)} onClose={() => setSelected(null)}>
        <div className="w-[360px] space-y-4 p-5">
          <Typography variant="h6">Attendance detail</Typography>
          <Typography variant="body2" className="text-ink-muted">
            {selected?.dateKey}
          </Typography>
          <Typography variant="body1">
            {(selected?.status || selected?.emptyReason || 'NO_RECORD').replaceAll('_', ' ')}
          </Typography>
          <Typography variant="body2">
            {selected?.plannedShift?.name || selected?.shift?.name || 'No planned shift'}
          </Typography>
          {canAdjust(selected) ? (
            <Button
              variant="contained"
              onClick={() => {
                setActionError('')
                setAdjusting(selected)
              }}
            >
              Adjust attendance
            </Button>
          ) : null}
        </div>
      </Drawer>
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
