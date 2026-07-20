import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import VisibilityOutlinedIcon from '@mui/icons-material/VisibilityOutlined'
import { Alert, Button, Drawer, MenuItem, Stack, TextField, Typography } from '@mui/material'
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

import { useAdjustAttendanceMutation } from '../api/hrTime.mutations.js'
import { useAttendanceQuery, useEmployeeProfilesQuery } from '../api/hrTime.queries.js'
import AttendanceAdjustmentDialog from '../components/AttendanceAdjustmentDialog.jsx'

const pageSize = 20
const tabs = ['exceptions', 'today', 'all']
const statuses = [
  'PRESENT',
  'ABSENT',
  'PAID_LEAVE',
  'UNPAID_LEAVE',
  'MIXED_LEAVE',
  'HALF_DAY',
  'HOLIDAY',
  'REST_DAY',
]
const columns = [
  { key: 'employee', width: '210px' },
  { key: 'workDate', width: '130px' },
  { key: 'schedule', width: '210px' },
  { key: 'actual', width: '200px' },
  { key: 'variance', width: '150px' },
  { key: 'status', width: '145px' },
  { key: 'actions', width: '100px', align: 'center' },
]

function localDateKey() {
  const now = new Date()
  const offset = now.getTimezoneOffset() * 60_000
  return new Date(now.getTime() - offset).toISOString().slice(0, 10)
}

function time(value, language) {
  if (!value) return '-'
  return new Intl.DateTimeFormat(language, { hour: '2-digit', minute: '2-digit' }).format(
    new Date(value),
  )
}

function tone(status) {
  if (status === 'PRESENT') return 'success'
  if (status === 'ABSENT') return 'danger'
  if (['HALF_DAY', 'MIXED_LEAVE'].includes(status)) return 'warning'
  return 'info'
}

export default function AttendanceDeskPage() {
  const { t, i18n } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const [searchParams, setSearchParams] = useSearchParams()
  const requestedTab = searchParams.get('tab')
  const tab = tabs.includes(requestedTab) ? requestedTab : 'exceptions'
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const profileId = searchParams.get('profileId') || ''
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const [selected, setSelected] = useState(null)
  const [adjusting, setAdjusting] = useState(null)
  const [actionError, setActionError] = useState('')
  const today = localDateKey()
  const dateFilters = tab === 'today' ? { dateFrom: today, dateTo: today } : { dateFrom, dateTo }
  const query = useAttendanceQuery({
    page,
    limit: pageSize,
    profileId,
    status,
    exceptionsOnly: tab === 'exceptions',
    ...dateFilters,
  })
  const employeeQuery = useEmployeeProfilesQuery({ page: 1, limit: 100, status: 'ACTIVE' })
  const adjustment = useAdjustAttendanceMutation()
  const rows = query.data?.items || []
  const pagination = query.data?.pagination || { page, limit: pageSize, total: 0 }
  const queryError = query.error?.response?.data?.message || query.error?.message

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
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not update attendance' }),
      )
    }
  }

  function renderCell(row, column) {
    if (column.key === 'employee') {
      return (
        <div className="min-w-0">
          <Typography variant="body2" className="truncate font-semibold text-ink-strong">
            {row.employeeName}
          </Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.employee?.employeeCode || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'workDate') return row.workDateKey || '-'
    if (column.key === 'schedule') {
      return (
        <div>
          <Typography variant="body2">{row.shift?.name || row.shiftName || '-'}</Typography>
          <Typography variant="caption" className="text-ink-muted">
            {row.workLocation?.name || row.workLocationName || '-'}
          </Typography>
        </div>
      )
    }
    if (column.key === 'actual')
      return `${time(row.checkInAt, i18n.language)} - ${time(row.checkOutAt, i18n.language)}`
    if (column.key === 'variance')
      return `${row.lateMinutes || 0}m late / ${row.earlyLeaveMinutes || 0}m early`
    if (column.key === 'status') {
      return (
        <StatusBadge tone={tone(row.status)}>{row.status?.replaceAll('_', ' ') || '-'}</StatusBadge>
      )
    }
    if (column.key === 'actions') {
      return (
        <Stack direction="row" spacing={0.25} justifyContent="center">
          <IconActionButton
            label={t('common.view', { defaultValue: 'View' })}
            onClick={() => setSelected(row)}
          >
            <VisibilityOutlinedIcon fontSize="small" />
          </IconActionButton>
          {row.capabilities?.adjust ? (
            <IconActionButton
              label={t('hrTime.actions.adjustAttendance', { defaultValue: 'Adjust attendance' })}
              tone="primary"
              onClick={() => {
                setActionError('')
                setAdjusting(row)
              }}
            >
              <EditOutlinedIcon fontSize="small" />
            </IconActionButton>
          ) : null}
        </Stack>
      )
    }
    return '-'
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.attendance.title', { defaultValue: 'Attendance Desk' })}
          subtitle={t('hrTime.attendance.subtitle', {
            defaultValue: 'Review scheduled and actual time inside your authorized scope.',
          })}
        />
      }
      tabs={
        <OperationsTabs
          variant="nav"
          items={tabs.map((value) => ({
            value,
            label: t(`hrTime.attendance.tabs.${value}`, {
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
            <TextField
              select
              size="small"
              className="w-56"
              label={t('hrTime.filters.employee', { defaultValue: 'Employee' })}
              value={profileId}
              onChange={(event) => updateSearch({ profileId: event.target.value }, true)}
            >
              <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
              {(employeeQuery.data?.items || []).map((employee) => (
                <MenuItem key={employee.id} value={employee.id}>
                  {employee.fullName} ({employee.employeeCode})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              className="w-48"
              label={t('hrTime.filters.exceptionState', { defaultValue: 'Attendance state' })}
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
            {tab !== 'today' ? (
              <>
                <TextField
                  size="small"
                  type="date"
                  label={t('hrTime.filters.dateFrom', { defaultValue: 'From date' })}
                  value={dateFrom}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(event) => updateSearch({ dateFrom: event.target.value }, true)}
                />
                <TextField
                  size="small"
                  type="date"
                  label={t('hrTime.filters.dateTo', { defaultValue: 'To date' })}
                  value={dateTo}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(event) => updateSearch({ dateTo: event.target.value }, true)}
                />
              </>
            ) : null}
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={query.isFetching}
              onClick={() => query.refetch()}
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
          label: t(`hrTime.attendance.columns.${column.key}`, { defaultValue: column.key }),
        }))}
        rows={rows}
        loading={query.isPending}
        getRowKey={(row) => row.id}
        renderCell={renderCell}
        minWidth="1145px"
        emptyTitle={t('hrTime.empty.title', { defaultValue: 'No records found' })}
      />

      <Drawer
        anchor="right"
        open={Boolean(selected)}
        onClose={() => setSelected(null)}
        PaperProps={{ className: 'w-full sm:w-[480px]' }}
      >
        <div className="space-y-5 p-5">
          <Typography variant="h6">{selected?.employeeName}</Typography>
          <div className="grid grid-cols-2 gap-4 border-y border-border py-4">
            <div>
              <Typography variant="caption" className="text-ink-muted">
                Scheduled
              </Typography>
              <Typography variant="body2">{selected?.shift?.name || '-'}</Typography>
              <Typography variant="body2">{selected?.workLocation?.name || '-'}</Typography>
            </div>
            <div>
              <Typography variant="caption" className="text-ink-muted">
                Actual
              </Typography>
              <Typography variant="body2">
                {time(selected?.checkInAt, i18n.language)} -{' '}
                {time(selected?.checkOutAt, i18n.language)}
              </Typography>
              <Typography variant="body2">{selected?.workedMinutes || 0} minutes</Typography>
            </div>
          </div>
          <section>
            <Typography variant="subtitle2">Leave segments</Typography>
            <Typography variant="body2" className="mt-1 text-ink-secondary">
              {selected?.leaveSegments?.length
                ? selected.leaveSegments
                    .map((segment) => `${segment.portion}: ${segment.attendanceStatus}`)
                    .join(', ')
                : '-'}
            </Typography>
          </section>
          <section>
            <Typography variant="subtitle2">Adjustment history</Typography>
            <div className="mt-2 divide-y divide-border">
              {(selected?.manualAdjustments || []).map((item, index) => (
                <div key={`${item.adjustedAt}-${index}`} className="py-2 text-sm">
                  <div className="font-medium text-ink-strong">{item.actorName || '-'}</div>
                  <div className="text-ink-secondary">{item.reason}</div>
                </div>
              ))}
              {!selected?.manualAdjustments?.length ? (
                <Typography variant="body2">-</Typography>
              ) : null}
            </div>
          </section>
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
