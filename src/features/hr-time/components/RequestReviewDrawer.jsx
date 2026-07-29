import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import AttachFileOutlinedIcon from '@mui/icons-material/AttachFileOutlined'
import CancelOutlinedIcon from '@mui/icons-material/CancelOutlined'
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined'
import CloseIcon from '@mui/icons-material/Close'
import CloseOutlinedIcon from '@mui/icons-material/CloseOutlined'
import { Button, Dialog, IconButton, Typography } from '@mui/material'

import { StatusBadge } from '@/components/operations'

import { formatMinutes } from '../utils/hrTimeApi'
import LeaveAttachmentDialog from './LeaveAttachmentDialog'
import LeaveRefundDialog from './LeaveRefundDialog'
import RequestDecisionDialog from './RequestDecisionDialog'

function statusTone(status) {
  if (status === 'APPROVED' || status === 'PRESENT') return 'success'
  if (status === 'REJECTED' || status === 'ABSENT') return 'danger'
  if (status === 'PENDING' || status === 'HALF_DAY') return 'warning'
  if (status === 'CANCELLED') return 'neutral'
  return 'info'
}

function valueOrDash(value) {
  return value === null || value === undefined || value === '' ? '-' : value
}

export default function RequestReviewDrawer({
  open,
  row,
  type,
  action,
  loading = false,
  error,
  onClose,
  onActionChange,
  onSubmit,
  onAttach,
  onRefund,
}) {
  const { t, i18n } = useTranslation()
  const capabilities = row?.capabilities || {}
  const [leaveDialog, setLeaveDialog] = useState(null)
  const isAttendance = type === 'attendance'
  const employeeName = row?.employeeName || row?.employee?.fullName
  const dateFormatter = new Intl.DateTimeFormat(i18n.language, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  })
  const timeFormatter = new Intl.DateTimeFormat(i18n.language, {
    hour: '2-digit',
    minute: '2-digit',
  })
  const date = (value) => (value ? dateFormatter.format(new Date(`${value}T12:00:00`)) : '-')
  const time = (value) => (value ? timeFormatter.format(new Date(value)) : '-')
  const details = isAttendance
    ? [
        ['workDate', date(row?.workDateKey)],
        ['shift', row?.shift?.name || row?.shiftName],
        ['workLocation', row?.workLocation?.name || row?.workLocationName],
        ['checkIn', time(row?.checkInAt)],
        ['checkOut', time(row?.checkOutAt)],
        ['workedMinutes', row?.workedMinutes],
      ]
    : type === 'leave'
      ? [
          [
            'leaveType',
            t(`hrTime.enums.leaveType.${row?.leaveType}`, {
              defaultValue: valueOrDash(row?.leaveType).replaceAll('_', ' '),
            }),
          ],
          [
            'portion',
            t(`hrTime.enums.portion.${row?.portion}`, {
              defaultValue: valueOrDash(row?.portion).replaceAll('_', ' '),
            }),
          ],
          ['startDate', date(row?.startDateKey)],
          ['endDate', date(row?.endDateKey)],
          [
            'requestedDays',
            t('hrTime.units.days', {
              count: Number(row?.requestedUnits || 0) / 2,
              defaultValue: '{{count}} days',
            }),
          ],
          ['reason', row?.reason],
        ]
      : [
          ['workDate', date(row?.workDateKey)],
          ['plannedTime', `${row?.plannedStartTime || '-'} - ${row?.plannedEndTime || '-'}`],
          ['requestedMinutes', formatMinutes(row?.requestedMinutes, t)],
          ['approvedMinutes', formatMinutes(row?.approvedMinutes, t)],
          ['reason', row?.reason],
        ]

  function closeDrawer() {
    setLeaveDialog(null)
    onClose()
  }

  async function submitAttachment(file) {
    if (await onAttach(file)) setLeaveDialog(null)
  }

  async function submitRefund(payload) {
    if (await onRefund(payload)) setLeaveDialog(null)
  }

  return (
    <>
      <Dialog
        open={open && !action && !leaveDialog}
        onClose={loading ? undefined : closeDrawer}
        maxWidth="sm"
        fullWidth
      >
        <div className="flex flex-col bg-surface">
          <div className="flex items-start justify-between gap-3 border-b border-border p-5">
            <div className="min-w-0">
              <Typography variant="h6" className="font-bold text-ink-strong">
                {t('hrTime.review.title', { defaultValue: 'Request details' })}
              </Typography>
              {employeeName ? (
                <Typography variant="body2" className="mt-1 truncate text-ink-muted">
                  {employeeName}
                </Typography>
              ) : null}
            </div>
            <IconButton
              aria-label={t('common.close', { defaultValue: 'Close' })}
              onClick={closeDrawer}
              disabled={loading}
            >
              <CloseIcon />
            </IconButton>
          </div>
          <div className="min-h-0 flex-1 overflow-auto p-5">
            <div className="mb-5">
              <StatusBadge tone={statusTone(row?.status)}>
                {t(`hrTime.enums.status.${row?.status}`, {
                  defaultValue: valueOrDash(row?.status).replaceAll('_', ' '),
                })}
              </StatusBadge>
            </div>
            <dl className="grid gap-4 sm:grid-cols-2">
              {details.map(([label, value]) => (
                <div key={label} className={label === 'reason' ? 'sm:col-span-2' : ''}>
                  <dt className="text-xs font-semibold uppercase text-ink-muted">
                    {t(`hrTime.fields.${label}`, {
                      defaultValue: label.replace(/([A-Z])/g, ' $1'),
                    })}
                  </dt>
                  <dd className="mt-1 break-words text-sm text-ink-strong">{valueOrDash(value)}</dd>
                </div>
              ))}
            </dl>
            {row?.decision?.reason || row?.cancellation?.reason ? (
              <section className="mt-6 border-t border-border pt-4">
                <Typography variant="subtitle2" className="font-semibold text-ink-strong">
                  {t('hrTime.review.latestDecision', { defaultValue: 'Latest decision' })}
                </Typography>
                <Typography variant="body2" className="mt-1 text-ink-secondary">
                  {row.decision?.reason || row.cancellation?.reason}
                </Typography>
              </section>
            ) : null}
          </div>
          {!isAttendance &&
          (capabilities.approve ||
            capabilities.reject ||
            capabilities.cancel ||
            (type === 'leave' && capabilities.attach && onAttach) ||
            (type === 'leave' && capabilities.refund && onRefund)) ? (
            <div className="flex flex-wrap justify-end gap-2 border-t border-border p-4">
              {type === 'leave' && capabilities.attach && onAttach ? (
                <Button
                  startIcon={<AttachFileOutlinedIcon />}
                  onClick={() => setLeaveDialog('attach')}
                >
                  {t('hrTime.actions.attach', { defaultValue: 'Attach file' })}
                </Button>
              ) : null}
              {type === 'leave' && capabilities.refund && onRefund ? (
                <Button color="warning" onClick={() => setLeaveDialog('refund')}>
                  {t('hrTime.actions.refund', { defaultValue: 'Refund dates' })}
                </Button>
              ) : null}
              {capabilities.cancel ? (
                <Button
                  color="error"
                  startIcon={<CancelOutlinedIcon />}
                  onClick={() => onActionChange('cancel')}
                >
                  {t('hrTime.actions.cancel', { defaultValue: 'Cancel' })}
                </Button>
              ) : null}
              {capabilities.reject ? (
                <Button
                  color="error"
                  variant="outlined"
                  startIcon={<CloseOutlinedIcon />}
                  onClick={() => onActionChange('reject')}
                >
                  {t('hrTime.actions.reject', { defaultValue: 'Reject' })}
                </Button>
              ) : null}
              {capabilities.approve ? (
                <Button
                  variant="contained"
                  startIcon={<CheckCircleOutlineOutlinedIcon />}
                  onClick={() => {
                    if (type === 'leave') {
                      onSubmit({}, 'approve')
                    } else {
                      onActionChange('approve')
                    }
                  }}
                >
                  {t('hrTime.actions.approve', { defaultValue: 'Approve' })}
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </Dialog>
      {open && action ? (
        <RequestDecisionDialog
          open
          action={action}
          requestType={type}
          row={row}
          loading={loading}
          error={error}
          onClose={() => onActionChange(null)}
          onSubmit={onSubmit}
        />
      ) : null}
      {open && leaveDialog === 'attach' ? (
        <LeaveAttachmentDialog
          open
          loading={loading}
          error={error}
          onClose={() => setLeaveDialog(null)}
          onSubmit={submitAttachment}
        />
      ) : null}
      {open && leaveDialog === 'refund' ? (
        <LeaveRefundDialog
          open
          row={row}
          loading={loading}
          error={error}
          onClose={() => setLeaveDialog(null)}
          onSubmit={submitRefund}
        />
      ) : null}
    </>
  )
}
