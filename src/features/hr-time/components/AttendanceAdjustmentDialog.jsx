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

import { buildAttendanceAdjustmentPayload } from '../utils/hrTimeApi.js'

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

function toLocalDateTime(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const offset = date.getTimezoneOffset() * 60_000
  return new Date(date.getTime() - offset).toISOString().slice(0, 16)
}

function toInstant(value) {
  return value ? new Date(value).toISOString() : ''
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
  const [values, setValues] = useState(() => ({
    status: record.status || 'PRESENT',
    checkInAt: toLocalDateTime(record.checkInAt),
    checkOutAt: toLocalDateTime(record.checkOutAt),
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
        checkInAt: toInstant(values.checkInAt),
        checkOutAt: toInstant(values.checkOutAt),
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
                {values.checkInAt || '-'} / {values.checkOutAt || '-'}
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
            <TextField
              type="datetime-local"
              label={t('hrTime.fields.checkInAt.label', { defaultValue: 'Check-in time' })}
              helperText={t('hrTime.fields.checkInAt.helperText', {
                defaultValue: 'Use the verified local badge time.',
              })}
              value={values.checkInAt || ''}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(event) => setField('checkInAt', event.target.value)}
            />
            <TextField
              type="datetime-local"
              label={t('hrTime.fields.checkOutAt.label', { defaultValue: 'Check-out time' })}
              helperText={t('hrTime.fields.checkOutAt.helperText', {
                defaultValue: 'Leave empty when the shift is still open.',
              })}
              value={values.checkOutAt || ''}
              slotProps={{ inputLabel: { shrink: true } }}
              onChange={(event) => setField('checkOutAt', event.target.value)}
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
