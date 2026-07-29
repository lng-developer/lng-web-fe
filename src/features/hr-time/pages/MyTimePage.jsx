import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import AddIcon from '@mui/icons-material/Add'
import LoginOutlinedIcon from '@mui/icons-material/LoginOutlined'
import LogoutOutlinedIcon from '@mui/icons-material/LogoutOutlined'
import RefreshIcon from '@mui/icons-material/Refresh'
import {
  Alert,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'
import dayjs from 'dayjs'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
import MonthPicker from '@/components/form/MonthPicker'
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
  useAttachLeaveReferencesMutation,
  useCancelLeaveRequestMutation,
  useCancelOvertimeRequestMutation,
  useCheckInMutation,
  useCheckOutMutation,
  useCreateLeaveRequestMutation,
  useCreateOvertimeRequestMutation,
  usePreviewLeaveRequestMutation,
  useUploadLeaveAttachmentMutation,
} from '@/features/hr-time/api/hrTime.mutations'
import {
  useMyAttendanceQuery,
  useMyLeaveBalancesQuery,
  useMyLeaveRequestsQuery,
  useMyOvertimeRequestsQuery,
} from '@/features/hr-time/api/hrTime.queries'
import { useAuthStore } from '@/store/useAuthStore'

import LeaveRequestDialog from '../components/LeaveRequestDialog'
import LeaveRequestPreviewDialog from '../components/LeaveRequestPreviewDialog'
import OvertimeRequestDialog from '../components/OvertimeRequestDialog'
import RequestReviewDrawer from '../components/RequestReviewDrawer'
import StaffMonthlyCalendar from '../components/StaffMonthlyCalendar'
import TimeRequestTable from '../components/TimeRequestTable'
import { getSelfAttendanceActions } from '../utils/hrTimeApi.js'

const pageSize = 20
const tabs = ['schedule', 'leave', 'overtime']
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
  const enabledTabs = tabs.filter((value) =>
    value === 'schedule' ? canUseAttendance : value === 'leave' ? canUseLeave : canUseOvertime,
  )
  const defaultTab = enabledTabs[0] || tabs[0]
  const tab = enabledTabs.includes(requestedTab) ? requestedTab : defaultTab
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const scheduleMonth = searchParams.get('month') || dayjs().format('YYYY-MM')
  const [createDialog, setCreateDialog] = useState(null)
  const [quickActionDate, setQuickActionDate] = useState(null)
  const [leavePreview, setLeavePreview] = useState(null)
  const [review, setReview] = useState(null)
  const [actionError, setActionError] = useState('')

  const [today, setToday] = useState(() => dayjs().format('YYYY-MM-DD'))

  useEffect(() => {
    const now = dayjs()
    const timeout = window.setTimeout(
      () => setToday(dayjs().format('YYYY-MM-DD')),
      now.startOf('day').add(1, 'day').diff(now) + 100,
    )

    return () => window.clearTimeout(timeout)
  }, [today])
  const requestFilters = {
    page,
    limit: pageSize,
    ...(status ? { status } : {}),
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

  const scheduleMonthStart = dayjs(`${scheduleMonth}-01`).format('YYYY-MM-DD')
  const scheduleMonthEnd = dayjs(`${scheduleMonth}-01`).endOf('month').format('YYYY-MM-DD')
  const scheduleFilters = { dateFrom: scheduleMonthStart, dateTo: scheduleMonthEnd, limit: 100 }

  const scheduleAttendanceQuery = useMyAttendanceQuery(scheduleFilters, {
    enabled: tab === 'schedule' && canUseAttendance,
  })
  const scheduleLeaveQuery = useMyLeaveRequestsQuery(scheduleFilters, {
    enabled: tab === 'schedule' && canUseLeave,
  })
  const scheduleOvertimeQuery = useMyOvertimeRequestsQuery(scheduleFilters, {
    enabled: tab === 'schedule' && canUseOvertime,
  })
  const createLeaveMutation = useCreateLeaveRequestMutation()
  const previewLeaveMutation = usePreviewLeaveRequestMutation()
  const uploadLeaveAttachmentMutation = useUploadLeaveAttachmentMutation()
  const attachLeaveReferencesMutation = useAttachLeaveReferencesMutation()
  const createOvertimeMutation = useCreateOvertimeRequestMutation()
  const checkInMutation = useCheckInMutation()
  const checkOutMutation = useCheckOutMutation()
  const cancelLeaveMutation = useCancelLeaveRequestMutation()
  const cancelOvertimeMutation = useCancelOvertimeRequestMutation()
  const selectedQuery =
    tab === 'leave' ? leaveQuery : tab === 'overtime' ? overtimeQuery : scheduleAttendanceQuery
  const type = tab === 'leave' || tab === 'overtime' ? tab : 'attendance'
  const rows = selectedQuery.data?.items || []
  const pagination = selectedQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const hasTabAccess =
    (tab === 'leave' && canUseLeave) ||
    (tab === 'overtime' && canUseOvertime) ||
    (tab === 'schedule' && canUseAttendance)
  const queryError = selectedQuery.error?.data?.message || selectedQuery.error?.message
  const noProfile = selectedQuery.error?.status === 404
  const selfAttendanceActions = getSelfAttendanceActions(todayQuery.data)
  const attendanceAction = !todayQuery.isSuccess
    ? null
    : selfAttendanceActions.checkOut
      ? 'checkOut'
      : selfAttendanceActions.checkIn
        ? 'checkIn'
        : null
  const todayState = todayQuery.isPending
    ? t('common.loading', { defaultValue: 'Loading...' })
    : todayQuery.isError
      ? t('hrTime.errors.loadFailed', { defaultValue: 'Could not load today attendance' })
      : attendanceAction === 'checkOut'
        ? t('hrTime.myTime.checkedIn', { defaultValue: 'Checked in' })
        : attendanceAction === 'checkIn'
          ? t('hrTime.myTime.notCheckedIn', { defaultValue: 'Ready to check in' })
          : t('hrTime.myTime.attendanceUnavailable', {
              defaultValue: 'No attendance action is available right now',
            })
  const submitting =
    createLeaveMutation.isPending ||
    previewLeaveMutation.isPending ||
    uploadLeaveAttachmentMutation.isPending ||
    attachLeaveReferencesMutation.isPending ||
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
    if (kind === 'leave') {
      try {
        const preview = await previewLeaveMutation.mutateAsync(payload)
        setCreateDialog(null)
        setLeavePreview({ payload, preview })
      } catch (error) {
        setActionError(
          error?.data?.message ||
            t('hrTime.errors.requestFailed', { defaultValue: 'Could not preview request' }),
        )
      }
      return
    }
    try {
      await createOvertimeMutation.mutateAsync(payload)
      enqueueSnackbar(t('hrTime.messages.requestCreated', { defaultValue: 'Request submitted' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setCreateDialog(null)
    } catch (error) {
      setActionError(
        error?.data?.message ||
          t('hrTime.errors.requestFailed', { defaultValue: 'Could not submit request' }),
      )
    }
  }

  async function confirmLeaveRequest() {
    if (!leavePreview) return
    setActionError('')
    try {
      await createLeaveMutation.mutateAsync(leavePreview.payload)
      enqueueSnackbar(t('hrTime.messages.requestCreated', { defaultValue: 'Request submitted' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setLeavePreview(null)
    } catch (error) {
      setActionError(
        error?.data?.message ||
          t('hrTime.errors.requestFailed', { defaultValue: 'Could not submit request' }),
      )
    }
  }

  async function attachLeaveFile(file) {
    if (!review?.row) return
    setActionError('')
    try {
      const asset = await uploadLeaveAttachmentMutation.mutateAsync(file)
      await attachLeaveReferencesMutation.mutateAsync({ requestId: review.row.id, assets: [asset] })
      enqueueSnackbar(t('hrTime.messages.attachmentAdded', { defaultValue: 'Attachment added' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setReview(null)
      return true
    } catch (error) {
      setActionError(
        error?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not complete action' }),
      )
      return false
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
        error?.data?.message ||
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
        error?.data?.message ||
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
            tab === 'schedule'
              ? todayState
              : t('hrTime.myTime.subtitle', {
                  defaultValue: 'Attendance, leave, and overtime in one personal workspace.',
                })
          }
          actions={
            tab === 'leave' && canUseLeave ? (
              <Button
                variant="contained"
                startIcon={<AddIcon />}
                onClick={() => {
                  setActionError('')
                  setCreateDialog({ type: 'leave' })
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
                  setCreateDialog({ type: 'overtime' })
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
          variant="nav"
          items={tabs.map((value) => ({
            value,
            disabled: !enabledTabs.includes(value),
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
            {tab === 'schedule' ? (
              <MonthPicker
                size="small"
                className="w-48"
                value={scheduleMonth}
                onChange={(val) => updateSearch({ month: val }, true)}
              />
            ) : null}
            {tab !== 'schedule' ? (
              <DateRangePicker
                size="small"
                className="w-56"
                value={{
                  start: dateFrom ? dayjs(dateFrom) : null,
                  end: dateTo ? dayjs(dateTo) : null,
                }}
                onChange={(range) => {
                  updateSearch(
                    {
                      dateFrom: range.start ? range.start.format('YYYY-MM-DD') : '',
                      dateTo: range.end ? range.end.format('YYYY-MM-DD') : '',
                    },
                    true,
                  )
                }}
                onClear={() => updateSearch({ dateFrom: '', dateTo: '' }, true)}
              />
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
        hasTabAccess && tab !== 'schedule' ? (
          <OperationsPagination
            page={pagination.page || page}
            pageSize={pagination.limit || pageSize}
            total={pagination.total || 0}
            onPageChange={(value) => updateSearch({ page: value })}
          />
        ) : null
      }
    >
      {hasTabAccess && selectedQuery.isError ? (
        <Alert
          severity="warning"
          action={
            <Button color="inherit" size="small" onClick={() => selectedQuery.refetch()}>
              {t('common.retry', { defaultValue: 'Retry' })}
            </Button>
          }
        >
          <Typography variant="subtitle2">
            {t(noProfile ? 'hrTime.myTime.noProfileTitle' : 'hrTime.myTime.unavailableTitle', {
              defaultValue: noProfile
                ? 'No employee profile found'
                : 'Personal time data is unavailable',
            })}
          </Typography>
          <Typography variant="body2">
            {queryError ||
              t(
                noProfile
                  ? 'hrTime.myTime.noProfileDescription'
                  : 'hrTime.myTime.unavailableDescription',
                {
                  defaultValue: noProfile
                    ? 'Ask HR to link your account to an employee profile.'
                    : 'Try again in a moment. If this continues, contact HR.',
                },
              )}
          </Typography>
        </Alert>
      ) : hasTabAccess ? (
        <div className="flex h-full flex-col gap-6 overflow-y-auto pb-6 pr-2">
          {tab === 'schedule' && canUseAttendance && (
            <div className="flex flex-col lg:flex-row gap-6 min-h-0">
              <div className="lg:w-1/3 shrink-0 flex flex-col gap-6">
                <div className="rounded-xl border border-border bg-surface shadow-sm overflow-hidden flex flex-col">
                  <div className="p-5 flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                      <Typography
                        variant="subtitle2"
                        className="text-ink-strong font-semibold uppercase tracking-wider text-xs"
                      >
                        {t('hrTime.myTime.timeClock', { defaultValue: 'Time Clock' })}
                      </Typography>
                    </div>
                    <Typography variant="h3" className="font-bold text-ink-strong tracking-tight">
                      {dayjs().format('hh:mm A')}
                    </Typography>
                    <Typography variant="body2" className="text-ink-muted font-medium">
                      {dayjs().format('dddd, MMMM D, YYYY')}
                    </Typography>
                  </div>

                  <div className="p-5 bg-black/5 dark:bg-white/5 border-t border-border flex flex-col justify-center gap-3">
                    <Typography
                      variant="body2"
                      className="font-semibold text-ink-strong text-center"
                    >
                      {attendanceAction === 'checkOut'
                        ? t('hrTime.myTime.checkedIn', { defaultValue: 'Checked in' })
                        : attendanceAction === 'checkIn'
                          ? t('hrTime.myTime.notCheckedIn', { defaultValue: 'Ready to check in' })
                          : t('hrTime.myTime.attendanceUnavailable', {
                              defaultValue: 'No action available',
                            })}
                    </Typography>

                    {attendanceAction && (
                      <Button
                        variant="contained"
                        size="large"
                        className="w-full shadow-md"
                        color={attendanceAction === 'checkIn' ? 'primary' : 'warning'}
                        startIcon={
                          attendanceAction === 'checkIn' ? (
                            <LoginOutlinedIcon />
                          ) : (
                            <LogoutOutlinedIcon />
                          )
                        }
                        disabled={checkInMutation.isPending || checkOutMutation.isPending}
                        onClick={recordAttendance}
                      >
                        {t(`hrTime.actions.${attendanceAction}`, {
                          defaultValue: attendanceAction === 'checkIn' ? 'Check in' : 'Check out',
                        })}
                      </Button>
                    )}
                  </div>
                </div>
              </div>

              <div className="lg:w-2/3 flex-1 flex flex-col gap-4 min-h-0">
                {(scheduleAttendanceQuery.isPending ||
                  scheduleLeaveQuery.isPending ||
                  scheduleOvertimeQuery.isPending) && <LinearProgress className="rounded-full" />}
                <StaffMonthlyCalendar
                  month={{
                    year: parseInt(scheduleMonth.split('-')[0], 10),
                    month: parseInt(scheduleMonth.split('-')[1], 10),
                  }}
                  records={{
                    attendance: scheduleAttendanceQuery.data?.items || [],
                    leave: scheduleLeaveQuery.data?.items || [],
                    overtime: scheduleOvertimeQuery.data?.items || [],
                  }}
                  onDayOpen={(day) => {
                    if (day.leave) {
                      setReview({ row: day.leave, action: null })
                    } else if (day.overtime) {
                      setReview({ row: day.overtime, action: null })
                    } else if (day.attendance) {
                      setReview({ row: day.attendance, action: null })
                    } else {
                      setQuickActionDate(day.dateKey)
                    }
                  }}
                />
              </div>
            </div>
          )}

          {tab === 'leave' && canUseLeave && leaveBalancesQuery.data?.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {leaveBalancesQuery.data.map((balance) => {
                const total =
                  (balance.entitledUnits || 0) +
                  (balance.carriedOverUnits || 0) +
                  (balance.adjustmentUnits || 0)
                const used = balance.usedUnits || 0
                const available = balance.availableUnits || 0
                const totalDays = total / 2
                const usedDays = used / 2
                const availableDays = available / 2
                const percent = total > 0 ? (used / total) * 100 : 0

                return (
                  <div
                    key={balance.id || balance.leaveType}
                    className="rounded-xl border border-border bg-surface p-4 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex justify-between items-center">
                      <Typography
                        variant="subtitle2"
                        className="font-semibold text-ink-strong uppercase tracking-wide text-xs"
                      >
                        {t(`hrTime.enums.leaveType.${balance.leaveType}`, {
                          defaultValue: balance.leaveType?.replaceAll('_', ' '),
                        })}
                      </Typography>
                      <div className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 px-2 py-0.5 rounded text-xs font-bold">
                        {t('hrTime.units.days', {
                          count: availableDays,
                          defaultValue: '{{count}} days left',
                        })}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 mt-1">
                      <LinearProgress
                        variant="determinate"
                        value={percent}
                        className="h-2 rounded-full"
                        color={percent > 80 ? 'error' : percent > 50 ? 'warning' : 'primary'}
                      />
                      <div className="flex justify-between text-xs text-ink-muted font-medium mt-1">
                        <span>{usedDays} used</span>
                        <span>{totalDays} total</span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {tab !== 'schedule' && (
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
          )}
        </div>
      ) : (
        <Alert severity="info">
          {t('hrTime.restricted.selfService', {
            defaultValue: 'This area is not available with your current permissions.',
          })}
        </Alert>
      )}
      <Dialog
        open={Boolean(quickActionDate)}
        onClose={() => setQuickActionDate(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle className="text-center font-bold">
          {t('hrTime.quickAction.title', { defaultValue: 'Quick Action' })}
        </DialogTitle>
        <DialogContent className="flex flex-col gap-3 pb-6">
          <Typography variant="body2" className="text-center text-ink-muted mb-2">
            {quickActionDate ? dayjs(quickActionDate).format('dddd, MMMM D, YYYY') : ''}
          </Typography>
          <Button
            variant="contained"
            onClick={() => {
              setCreateDialog({ type: 'leave', date: quickActionDate })
              setQuickActionDate(null)
            }}
          >
            {t('hrTime.actions.requestLeave', { defaultValue: 'Request leave' })}
          </Button>
          <Button
            variant="contained"
            color="secondary"
            onClick={() => {
              setCreateDialog({ type: 'overtime', date: quickActionDate })
              setQuickActionDate(null)
            }}
          >
            {t('hrTime.actions.requestOvertime', { defaultValue: 'Request overtime' })}
          </Button>
        </DialogContent>
      </Dialog>
      {createDialog?.type === 'leave' ? (
        <LeaveRequestDialog
          open
          initialDate={createDialog.date}
          loading={previewLeaveMutation.isPending}
          error={actionError}
          onClose={() => setCreateDialog(null)}
          onSubmit={(payload) => createRequest('leave', payload)}
        />
      ) : null}
      {createDialog?.type === 'overtime' ? (
        <OvertimeRequestDialog
          open
          initialDate={createDialog.date}
          loading={createOvertimeMutation.isPending}
          error={actionError}
          onClose={() => setCreateDialog(null)}
          onSubmit={(payload) => createRequest('overtime', payload)}
        />
      ) : null}
      {leavePreview ? (
        <LeaveRequestPreviewDialog
          open
          preview={leavePreview.preview}
          loading={createLeaveMutation.isPending}
          error={actionError}
          onClose={() => setLeavePreview(null)}
          onConfirm={confirmLeaveRequest}
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
        onAttach={type === 'leave' ? attachLeaveFile : undefined}
      />
    </OperationsPageShell>
  )
}
