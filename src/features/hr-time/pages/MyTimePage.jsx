import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'

import {
  OperationsHeader,
  OperationsPageShell,
  OperationsPagination,
  OperationsTabs,
  OperationsToolbar,
} from '@/components/operations'
import { SNACKBAR_VARIANTS } from '@/constants/app'
import { hasAnyPermission } from '@/features/auth/utils/authz'
import {
  useCancelLeaveRequestMutation,
  useCancelOvertimeRequestMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useCreateLeaveRequestMutation,
  useCreateOvertimeRequestMutation,
} from '@/features/hr-time/api/hrTime.mutations'
import {
  useMyAttendanceQuery,
  useMyLeaveBalancesQuery,
  useMyLeaveRequestsQuery,
  useMyOvertimeRequestsQuery,
} from '@/features/hr-time/api/hrTime.queries'
import { useAuthStore } from '@/store/useAuthStore'

import LeaveRequestDialog from '../components/LeaveRequestDialog'
import OvertimeRequestDialog from '../components/OvertimeRequestDialog'
import RequestReviewDrawer from '../components/RequestReviewDrawer'
import TimeRequestTable from '../components/TimeRequestTable'

const pageSize = 20
const tabs = ['today', 'leave', 'overtime', 'history']
const requestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']

export default function MyTimePage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [searchParams, setSearchParams] = useSearchParams()
  const canUseAttendance = hasAnyPermission(currentUser, ['HR_ATTENDANCE:WRITE'])
  const canUseLeave = hasAnyPermission(currentUser, ['HR_LEAVE:WRITE'])
  const canUseOvertime = hasAnyPermission(currentUser, ['HR_OVERTIME:WRITE'])
  const requestedTab = searchParams.get('tab')
  const defaultTab = canUseAttendance ? 'today' : canUseLeave ? 'leave' : 'overtime'
  const tab = tabs.includes(requestedTab) ? requestedTab : defaultTab
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const [createDialog, setCreateDialog] = useState(null)
  const [review, setReview] = useState(null)
  const [actionError, setActionError] = useState('')

  const today = dayjs().format('YYYY-MM-DD')
  const requestFilters = {
    page,
    limit: pageSize,
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }
  const historyFilters = {
    page,
    limit: pageSize,
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
  }
  const todayQuery = useMyAttendanceQuery(
    { page, limit: pageSize, dateFrom: today, dateTo: today },
    { enabled: canUseAttendance },
  )
  const leaveBalancesQuery = useMyLeaveBalancesQuery(dayjs().year(), {
    enabled: tab === 'leave' && canUseLeave,
  })
  const leaveQuery = useMyLeaveRequestsQuery(requestFilters, {
    enabled: tab === 'leave' && canUseLeave,
  })
  const overtimeQuery = useMyOvertimeRequestsQuery(requestFilters, {
    enabled: tab === 'overtime' && canUseOvertime,
  })
  const historyQuery = useMyAttendanceQuery(historyFilters, {
    enabled: tab === 'history' && canUseAttendance,
  })
  const createLeaveMutation = useCreateLeaveRequestMutation()
  const createOvertimeMutation = useCreateOvertimeRequestMutation()
  const checkInMutation = useCheckInMutation()
  const checkOutMutation = useCheckOutMutation()
  const cancelLeaveMutation = useCancelLeaveRequestMutation()
  const cancelOvertimeMutation = useCancelOvertimeRequestMutation()
  const selectedQuery =
    tab === 'leave'
      ? leaveQuery
      : tab === 'overtime'
        ? overtimeQuery
        : tab === 'history'
          ? historyQuery
          : todayQuery
  const type = tab === 'leave' || tab === 'overtime' ? tab : 'attendance'
  const rows = selectedQuery.data?.items || []
  const pagination = selectedQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const hasTabAccess =
    (tab === 'leave' && canUseLeave) ||
    (tab === 'overtime' && canUseOvertime) ||
    ((tab === 'today' || tab === 'history') && canUseAttendance)
  const queryError = selectedQuery.error?.response?.data?.message || selectedQuery.error?.message
  const todayRecord = todayQuery.data?.items?.[0]
  const attendanceAction = !todayQuery.isSuccess
    ? null
    : !todayRecord?.checkInAt
      ? 'checkIn'
      : !todayRecord?.checkOutAt
        ? 'checkOut'
        : null
  const todayState = todayQuery.isPending
    ? t('common.loading', { defaultValue: 'Loading...' })
    : todayQuery.isError
      ? t('hrTime.errors.loadFailed', { defaultValue: 'Could not load today attendance' })
      : todayRecord?.checkOutAt
        ? t('hrTime.myTime.checkedOut', { defaultValue: 'Checked out for today' })
        : todayRecord?.checkInAt
          ? t('hrTime.myTime.checkedIn', { defaultValue: 'Checked in for today' })
          : t('hrTime.myTime.notCheckedIn', { defaultValue: 'Not checked in today' })
  const submitting =
    createLeaveMutation.isPending ||
    createOvertimeMutation.isPending ||
    checkInMutation.isPending ||
    checkOutMutation.isPending ||
    cancelLeaveMutation.isPending ||
    cancelOvertimeMutation.isPending

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

  async function createRequest(kind, payload) {
    setActionError('')
    try {
      const mutation = kind === 'leave' ? createLeaveMutation : createOvertimeMutation
      await mutation.mutateAsync(payload)
      enqueueSnackbar(t('hrTime.messages.requestCreated', { defaultValue: 'Request submitted' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setCreateDialog(null)
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          t('hrTime.errors.requestFailed', { defaultValue: 'Could not submit request' }),
      )
    }
  }

  async function cancelRequest(payload) {
    if (!review?.row || review.action !== 'cancel') return
    setActionError('')
    try {
      const mutation = type === 'leave' ? cancelLeaveMutation : cancelOvertimeMutation
      await mutation.mutateAsync({ requestId: review.row.id, payload })
      enqueueSnackbar(
        t('hrTime.messages.requestCancelled', { defaultValue: 'Request cancelled' }),
        {
          variant: SNACKBAR_VARIANTS.SUCCESS,
        },
      )
      setReview(null)
    } catch (error) {
      setActionError(
        error?.response?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not complete action' }),
      )
    }
  }

  async function recordAttendance() {
    if (!attendanceAction) return
    setActionError('')
    try {
      const mutation = attendanceAction === 'checkIn' ? checkInMutation : checkOutMutation
      await mutation.mutateAsync({ occurredAt: new Date().toISOString() })
      enqueueSnackbar(
        t(`hrTime.messages.${attendanceAction}`, {
          defaultValue: attendanceAction === 'checkIn' ? 'Checked in' : 'Checked out',
        }),
        { variant: SNACKBAR_VARIANTS.SUCCESS },
      )
    } catch (error) {
      enqueueSnackbar(
        error?.response?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not complete action' }),
        { variant: SNACKBAR_VARIANTS.ERROR },
      )
    }
  }

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.myTime.title', { defaultValue: 'My Time' })}
          subtitle={
            tab === 'today'
              ? todayState
              : t('hrTime.myTime.subtitle', {
                  defaultValue: 'Attendance, leave, and overtime in one personal workspace.',
                })
          }
          actions={
            tab === 'today' && attendanceAction && canUseAttendance ? (
              <Button
                variant="contained"
                startIcon={
                  attendanceAction === 'checkIn' ? <LoginOutlinedIcon /> : <LogoutOutlinedIcon />
                }
                disabled={checkInMutation.isPending || checkOutMutation.isPending}
                onClick={recordAttendance}
              >
                {t(`hrTime.actions.${attendanceAction}`, {
                  defaultValue: attendanceAction === 'checkIn' ? 'Check in' : 'Check out',
                })}
              </Button>
            ) : tab === 'leave' && canUseLeave ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setCreateDialog('leave')
                }}
              >
                {t('hrTime.actions.requestLeave', { defaultValue: 'Request leave' })}
              </Button>
            ) : tab === 'overtime' && canUseOvertime ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setCreateDialog('overtime')
                }}
              >
                {t('hrTime.actions.requestOvertime', { defaultValue: 'Request overtime' })}
              </Button>
            ) : null
          }
        />
      }
      tabs={
        <OperationsTabs
          variant="underline"
          items={tabs.map((value) => ({
            value,
            label: t(`hrTime.myTime.tabs.${value}`, {
              defaultValue: `${value[0].toUpperCase()}${value.slice(1)}`,
            }),
          }))}
          value={tab}
          onChange={(value) => {
            setReview(null)
            updateSearch({ tab: value }, true)
          }}
        />
      }
      toolbar={
        <OperationsToolbar>
          {tab === 'leave' && leaveBalancesQuery.data?.length ? (
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border pb-3">
              {leaveBalancesQuery.data.map((balance) => (
                <div key={balance.id || balance.leaveType} className="flex items-baseline gap-2">
                  <Typography variant="caption" className="font-semibold text-ink-muted">
                    {t(`hrTime.enums.leaveType.${balance.leaveType}`, {
                      defaultValue: balance.leaveType?.replaceAll('_', ' '),
                    })}
                  </Typography>
                  <Typography variant="body2" className="font-semibold text-ink-strong">
                    {t('hrTime.units.days', {
                      count: Number(balance.availableUnits || 0) / 2,
                      defaultValue: '{{count}} days',
                    })}
                  </Typography>
                </div>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap items-start gap-3">
            {tab === 'leave' || tab === 'overtime' ? (
              <TextField
                select
                size="small"
                className="w-48"
                label={t('hrTime.filters.status', { defaultValue: 'Status' })}
                value={status}
                onChange={(event) => updateSearch({ status: event.target.value }, true)}
              >
                <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                {requestStatuses.map((value) => (
                  <MenuItem key={value} value={value}>
                    {t(`hrTime.enums.status.${value}`, {
                      defaultValue: value.replaceAll('_', ' '),
                    })}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
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
              disabled={!hasTabAccess || selectedQuery.isFetching}
              onClick={() => selectedQuery.refetch()}
            >
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </Button>
          </div>
        </OperationsToolbar>
      }
      pagination={
        hasTabAccess ? (
          <OperationsPagination
            page={pagination.page || page}
            pageSize={pagination.limit || pageSize}
            total={pagination.total || 0}
            onPageChange={(value) => updateSearch({ page: value })}
          />
        ) : null
      }
    >
      {hasTabAccess ? (
        <TimeRequestTable
          type={type}
          rows={rows}
          loading={selectedQuery.isPending}
          error={queryError}
          allowedActions={['view', 'cancel']}
          onReview={(row, action) => {
            setActionError('')
            setReview({ row, action: action === 'view' ? null : action })
          }}
        />
      ) : (
        <Alert severity="info">
          {t('hrTime.restricted.selfService', {
            defaultValue: 'This area is not available with your current permissions.',
          })}
        </Alert>
      )}
      {createDialog === 'leave' ? (
        <LeaveRequestDialog
          open
          loading={createLeaveMutation.isPending}
          error={actionError}
          onClose={() => setCreateDialog(null)}
          onSubmit={(payload) => createRequest('leave', payload)}
        />
      ) : null}
      {createDialog === 'overtime' ? (
        <OvertimeRequestDialog
          open
          loading={createOvertimeMutation.isPending}
          error={actionError}
          onClose={() => setCreateDialog(null)}
          onSubmit={(payload) => createRequest('overtime', payload)}
        />
      ) : null}
      <RequestReviewDrawer
        open={Boolean(review)}
        row={review?.row}
        type={type}
        action={review?.action}
        loading={submitting}
        error={actionError}
        onClose={() => setReview(null)}
        onActionChange={(action) => setReview((current) => ({ ...current, action }))}
        onSubmit={cancelRequest}
      />
    </OperationsPageShell>
  )
}
