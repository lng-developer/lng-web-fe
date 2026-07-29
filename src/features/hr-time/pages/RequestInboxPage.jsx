import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useSearchParams } from 'react-router-dom'
import RefreshIcon from '@mui/icons-material/Refresh'
import { Alert, Button, MenuItem, TextField } from '@mui/material'
import { useSnackbar } from 'notistack'

import DateRangePicker from '@/components/form/DateRangePicker'
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
  useApproveLeaveRequestMutation,
  useApproveOvertimeRequestMutation,
  useCancelLeaveRequestMutation,
  useCancelOvertimeRequestMutation,
  useRefundLeaveRequestMutation,
  useRejectLeaveRequestMutation,
  useRejectOvertimeRequestMutation,
} from '@/features/hr-time/api/hrTime.mutations'
import {
  useEmployeeProfilesQuery,
  useLeaveRequestsQuery,
  useOvertimeRequestsQuery,
} from '@/features/hr-time/api/hrTime.queries'
import dayjs from '@/lib/dayjs'
import { useAuthStore } from '@/store/useAuthStore'

import RequestReviewDrawer from '../components/RequestReviewDrawer'
import TimeRequestTable from '../components/TimeRequestTable'

const pageSize = 20
const tabs = ['leave', 'overtime']
const requestStatuses = ['PENDING', 'APPROVED', 'REJECTED', 'CANCELLED']
const leaveTypes = [
  'ANNUAL',
  'SICK',
  'MATERNITY',
  'PATERNITY',
  'BEREAVEMENT',
  'WEDDING',
  'UNPAID',
  'PERSONAL_PAID',
  'PERSONAL_UNPAID',
]

export default function RequestInboxPage() {
  const { t } = useTranslation()
  const { enqueueSnackbar } = useSnackbar()
  const currentUser = useAuthStore((state) => state.currentUser)
  const [searchParams, setSearchParams] = useSearchParams()
  const canReadLeave = hasAnyPermission(currentUser, ['HR_LEAVE:READ', 'HR_LEAVE:APPROVE'])
  const canReadOvertime = hasAnyPermission(currentUser, ['HR_OVERTIME:READ', 'HR_OVERTIME:APPROVE'])
  const requestedTab = searchParams.get('tab')
  const enabledTabs = tabs.filter((value) => (value === 'leave' ? canReadLeave : canReadOvertime))
  const defaultTab = enabledTabs[0] || tabs[0]
  const tab = enabledTabs.includes(requestedTab) ? requestedTab : defaultTab
  const page = Math.max(Number(searchParams.get('page')) || 1, 1)
  const status = searchParams.get('status') || ''
  const dateFrom = searchParams.get('dateFrom') || ''
  const dateTo = searchParams.get('dateTo') || ''
  const profileId = searchParams.get('profileId') || ''
  const leaveType = searchParams.get('leaveType') || ''
  const year = searchParams.get('year') || ''
  const canReadEmployeeDirectory = hasAnyPermission(currentUser, [
    'HR_EMPLOYEES:READ',
    'HR_EMPLOYEES:WRITE',
  ])
  const [review, setReview] = useState(null)
  const [actionError, setActionError] = useState('')

  const filters = {
    page,
    limit: pageSize,
    ...(status ? { status } : {}),
    ...(dateFrom ? { dateFrom } : {}),
    ...(dateTo ? { dateTo } : {}),
    ...(profileId ? { profileId } : {}),
    ...(tab === 'leave' && leaveType ? { leaveType } : {}),
    ...(tab === 'leave' && year ? { year: Number(year) } : {}),
  }
  const leaveQuery = useLeaveRequestsQuery(filters, {
    enabled: tab === 'leave' && canReadLeave,
  })
  const overtimeQuery = useOvertimeRequestsQuery(filters, {
    enabled: tab === 'overtime' && canReadOvertime,
  })
  const employeesQuery = useEmployeeProfilesQuery(
    { page: 1, limit: 100, status: 'ACTIVE' },
    { enabled: canReadEmployeeDirectory },
  )
  const approveLeaveMutation = useApproveLeaveRequestMutation()
  const rejectLeaveMutation = useRejectLeaveRequestMutation()
  const cancelLeaveMutation = useCancelLeaveRequestMutation()
  const refundLeaveMutation = useRefundLeaveRequestMutation()
  const approveOvertimeMutation = useApproveOvertimeRequestMutation()
  const rejectOvertimeMutation = useRejectOvertimeRequestMutation()
  const cancelOvertimeMutation = useCancelOvertimeRequestMutation()
  const selectedQuery = tab === 'leave' ? leaveQuery : overtimeQuery
  const hasTabAccess = tab === 'leave' ? canReadLeave : canReadOvertime
  const rows = selectedQuery.data?.items || []
  const summary = selectedQuery.data?.summary || { statusCounts: {} }
  const employees = employeesQuery.data?.items || []
  const pagination = selectedQuery.data?.pagination || { page, limit: pageSize, total: 0 }
  const queryError = selectedQuery.error?.data?.message || selectedQuery.error?.message
  const actionLoading = [
    approveLeaveMutation,
    rejectLeaveMutation,
    cancelLeaveMutation,
    refundLeaveMutation,
    approveOvertimeMutation,
    rejectOvertimeMutation,
    cancelOvertimeMutation,
  ].some((mutation) => mutation.isPending)

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

  function clearFilters() {
    updateSearch(
      { status: '', dateFrom: '', dateTo: '', profileId: '', leaveType: '', year: '' },
      true,
    )
  }

  async function decide(payload, overrideAction) {
    const finalAction = overrideAction || review?.action
    if (!review?.row || !finalAction) return
    setActionError('')
    const mutations =
      tab === 'leave'
        ? {
            approve: approveLeaveMutation,
            reject: rejectLeaveMutation,
            cancel: cancelLeaveMutation,
          }
        : {
            approve: approveOvertimeMutation,
            reject: rejectOvertimeMutation,
            cancel: cancelOvertimeMutation,
          }

    try {
      await mutations[finalAction].mutateAsync({ requestId: review.row.id, payload })
      enqueueSnackbar(t('hrTime.messages.actionCompleted', { defaultValue: 'Request updated' }), {
        variant: SNACKBAR_VARIANTS.SUCCESS,
      })
      setReview(null)
    } catch (error) {
      setActionError(
        error?.data?.message ||
          t('hrTime.errors.actionFailed', { defaultValue: 'Could not complete action' }),
      )
    }
  }

  async function refundLeave(payload) {
    if (!review?.row) return
    setActionError('')
    try {
      await refundLeaveMutation.mutateAsync({ requestId: review.row.id, payload })
      enqueueSnackbar(t('hrTime.messages.actionCompleted', { defaultValue: 'Request updated' }), {
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

  return (
    <OperationsPageShell
      header={
        <OperationsHeader
          title={t('hrTime.requestInbox.title', { defaultValue: 'Request Inbox' })}
          subtitle={t('hrTime.requestInbox.subtitle', {
            defaultValue: 'Review only the requests available inside your approval scope.',
          })}
        />
      }
      tabs={
        <OperationsTabs
          variant="nav"
          items={tabs.map((value) => ({
            value,
            label: t(`hrTime.tabs.${value}`, {
              defaultValue: `${value[0].toUpperCase()}${value.slice(1)}`,
            }),
            disabled: value === 'leave' ? !canReadLeave : !canReadOvertime,
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
            {canReadEmployeeDirectory ? (
              <TextField
                select
                size="small"
                className="w-52"
                label={t('hrTime.filters.employee', { defaultValue: 'Employee' })}
                value={profileId}
                onChange={(event) => updateSearch({ profileId: event.target.value }, true)}
              >
                <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                {employees.map((employee) => (
                  <MenuItem key={employee.id} value={employee.id}>
                    {employee.fullName}
                    {employee.employeeCode ? ` · ${employee.employeeCode}` : ''}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
            {tab === 'leave' ? (
              <>
                <TextField
                  select
                  size="small"
                  className="w-44"
                  label={t('hrTime.filters.leaveType', { defaultValue: 'Leave type' })}
                  value={leaveType}
                  onChange={(event) => updateSearch({ leaveType: event.target.value }, true)}
                >
                  <MenuItem value="">{t('common.all', { defaultValue: 'All' })}</MenuItem>
                  {leaveTypes.map((value) => (
                    <MenuItem key={value} value={value}>
                      {t(`hrTime.enums.leaveType.${value}`, {
                        defaultValue: value.replaceAll('_', ' '),
                      })}
                    </MenuItem>
                  ))}
                </TextField>
                <TextField
                  size="small"
                  className="w-28"
                  label={t('hrTime.filters.year', { defaultValue: 'Year' })}
                  value={year}
                  inputProps={{ inputMode: 'numeric', maxLength: 4 }}
                  onChange={(event) =>
                    updateSearch({ year: event.target.value.replace(/\D/g, '').slice(0, 4) }, true)
                  }
                />
              </>
            ) : null}
            <DateRangePicker
              size="small"
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
            <Button
              variant="text"
              startIcon={<RefreshIcon />}
              disabled={!hasTabAccess || selectedQuery.isFetching}
              onClick={() => selectedQuery.refetch()}
            >
              {t('common.refresh', { defaultValue: 'Refresh' })}
            </Button>
            {status || dateFrom || dateTo || profileId || leaveType || year ? (
              <Button variant="text" onClick={clearFilters}>
                {t('common.clearFilters', { defaultValue: 'Clear filters' })}
              </Button>
            ) : null}
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
        <div className="space-y-3">
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            {requestStatuses.map((value) => (
              <Button
                key={value}
                variant={status === value ? 'contained' : 'outlined'}
                className="!min-h-[76px] !justify-start !rounded-lg !border-border !px-4 !text-left !normal-case"
                onClick={() => updateSearch({ status: status === value ? '' : value }, true)}
              >
                <span className="flex flex-col items-start">
                  <span className="text-xs text-ink-muted">
                    {t(`hrTime.enums.status.${value}`, { defaultValue: value })}
                  </span>
                  <span className="mt-1 text-2xl font-bold">
                    {summary.statusCounts?.[value] || 0}
                  </span>
                </span>
              </Button>
            ))}
          </div>
          <div className="flex items-center justify-between px-1 text-sm text-ink-muted">
            <span>
              {t('hrTime.labels.requestsFound', {
                count: pagination.total || 0,
                defaultValue: '{{count}} requests',
              })}
            </span>
            <span>
              {selectedQuery.isFetching
                ? t('common.loading', { defaultValue: 'Loading...' })
                : null}
            </span>
          </div>
          <TimeRequestTable
            type={tab}
            rows={rows}
            loading={selectedQuery.isPending}
            error={queryError}
            showEmployee
            onReview={async (row, action) => {
              setActionError('')
              if (action === 'approve' && tab === 'leave') {
                try {
                  await approveLeaveMutation.mutateAsync({ requestId: row.id, payload: {} })
                  enqueueSnackbar(
                    t('hrTime.messages.actionCompleted', { defaultValue: 'Request updated' }),
                    {
                      variant: SNACKBAR_VARIANTS.SUCCESS,
                    },
                  )
                } catch (error) {
                  setActionError(
                    error?.data?.message ||
                      t('hrTime.errors.actionFailed', {
                        defaultValue: 'Could not complete action',
                      }),
                  )
                }
                return
              }
              setReview({ row, action: action === 'view' ? null : action })
            }}
          />
        </div>
      ) : (
        <Alert severity="info">
          {t('hrTime.restricted.inbox', {
            defaultValue: 'You do not have access to this approval queue.',
          })}
        </Alert>
      )}
      <RequestReviewDrawer
        open={Boolean(review)}
        row={review?.row}
        type={tab}
        action={review?.action}
        loading={actionLoading}
        error={actionError}
        onClose={() => setReview(null)}
        onActionChange={(action) => setReview((current) => ({ ...current, action }))}
        onSubmit={decide}
        onRefund={tab === 'leave' ? refundLeave : undefined}
      />
    </OperationsPageShell>
  )
}
