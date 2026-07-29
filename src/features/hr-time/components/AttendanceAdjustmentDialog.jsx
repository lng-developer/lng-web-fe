import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  MenuItem,
  TextField,
  Typography,
} from '@mui/material'

import TimePicker from '@/components/form/TimePicker'

import { buildAttendanceAdjustmentPayload } from '../utils/hrTimeApi.js'

const statuses = [
  'PRESENT',
  'ABSENT',
  'ERROR',
  'PAID_LEAVE',
  'UNPAID_LEAVE',
  'SICK_LEAVE',
  'MATERNITY_LEAVE',
  'PATERNITY_LEAVE',
  'MIXED_LEAVE',
  'HALF_DAY',
  'HOLIDAY',
  'REST_DAY',
]

function toLocalParts(value) {
  if (!value) return { date: '', time: '' }
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return { date: '', time: '' }
  return {
    date: [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, '0'),
      String(date.getDate()).padStart(2, '0'),
    ].join('-'),
    time: [
      String(date.getHours()).padStart(2, '0'),
      String(date.getMinutes()).padStart(2, '0'),
    ].join(':'),
  }
}

function toInstant(date, time) {
  return date && time ? new Date(`${date}T${time}`).toISOString() : ''
}

export default function AttendanceAdjustmentDialog({
  open,
  record,
  loading = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const checkIn = toLocalParts(record.checkInAt)
  const checkOut = toLocalParts(record.checkOutAt)
  const workDate = checkIn.date || record.workDateKey || ''
  const [values, setValues] = useState(() => ({
    status: record.status || 'PRESENT',
    checkInDate: workDate,
    checkInTime: checkIn.time,
    checkOutDate: checkOut.date || workDate,
    checkOutTime: checkOut.time,
    reason: '',
  }))

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function submit(event) {
    event.preventDefault()
    onSubmit(
      buildAttendanceAdjustmentPayload({
        ...values,
        status: values.status === record.status ? undefined : values.status,
        checkInAt: toInstant(values.checkInDate, values.checkInTime),
        checkOutAt: toInstant(values.checkOutDate, values.checkOutTime),
      }),
    )
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>
          {t('hrTime.attendance.adjustTitle', { defaultValue: 'Adjust attendance' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <div className="grid grid-cols-2 gap-3 border-y border-border py-3">
            <div>
              <Typography variant="caption" className="text-ink-muted">
                {t('hrTime.attendance.before', { defaultValue: 'Before' })}
              </Typography>
              <Typography variant="body2" className="mt-1 text-ink-secondary">
                {record?.checkInAt ? new Date(record.checkInAt).toLocaleString() : '-'}
                {' / '}
                {record?.checkOutAt ? new Date(record.checkOutAt).toLocaleString() : '-'}
              </Typography>
            </div>
            <div>
              <Typography variant="caption" className="text-ink-muted">
                {t('hrTime.attendance.after', { defaultValue: 'After' })}
              </Typography>
              <Typography variant="body2" className="mt-1 text-ink-secondary">
                {values.checkInTime || '-'}
                {' / '}
                {values.checkOutTime || '-'}
              </Typography>
            </div>
          </div>
          <TextField
            select
            fullWidth
            required
            label={t('hrTime.fields.status.label', { defaultValue: 'Attendance status' })}
            helperText={t('hrTime.fields.status.helperText', {
              defaultValue: 'Choose the corrected result for this work date.',
            })}
            value={values.status || ''}
            onChange={(event) => setField('status', event.target.value)}
          >
            {statuses.map((status) => (
              <MenuItem key={status} value={status}>
                {t(`hrTime.enums.attendanceStatus.${status}`, {
                  defaultValue: status.replaceAll('_', ' '),
                })}
              </MenuItem>
            ))}
          </TextField>
          <div className="grid gap-3 sm:grid-cols-2">
            <TimePicker
              fullWidth
              label={t('hrTime.fields.checkInAt.label', { defaultValue: 'Check-in time' })}
              value={values.checkInTime}
              helperText={t('hrTime.fields.checkInAt.helperText', {
                defaultValue: 'Use the verified local badge time.',
              })}
              onChange={(value) => setField('checkInTime', value)}
            />
            <TimePicker
              fullWidth
              label={t('hrTime.fields.checkOutAt.label', { defaultValue: 'Check-out time' })}
              value={values.checkOutTime}
              helperText={t('hrTime.fields.checkOutAt.helperText', {
                defaultValue: 'Leave empty when the shift is still open.',
              })}
              onChange={(value) => setField('checkOutTime', value)}
            />
          </div>
          <TextField
            fullWidth
            required
            multiline
            minRows={3}
            label={t('hrTime.fields.adjustmentReason.label', { defaultValue: 'Adjustment reason' })}
            helperText={t('hrTime.fields.adjustmentReason.helperText', {
              defaultValue: 'Explain the evidence used; this is saved in adjustment history.',
            })}
            value={values.reason || ''}
            onChange={(event) => setField('reason', event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" variant="contained" disabled={loading || !values.reason?.trim()}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
