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
} from '@mui/material'

import DatePicker from '@/components/form/DatePicker'

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
const portions = ['FULL_DAY', 'MORNING', 'AFTERNOON']
const initialForm = {
  leaveType: 'ANNUAL',
  portion: 'FULL_DAY',
  startDateKey: '',
  endDateKey: '',
  reason: '',
}

function enumLabel(t, group, value) {
  return t(`hrTime.enums.${group}.${value}`, { defaultValue: value.replaceAll('_', ' ') })
}

export default function LeaveRequestDialog({
  open,
  initialDate,
  loading = false,
  error,
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [form, setForm] = useState({
    ...initialForm,
    startDateKey: initialDate || '',
    endDateKey: initialDate || '',
  })

  function update(key, value) {
    setForm((current) => ({
      ...current,
      [key]: value,
      ...(key === 'startDateKey' && current.portion !== 'FULL_DAY' ? { endDateKey: value } : {}),
      ...(key === 'portion' && value !== 'FULL_DAY' ? { endDateKey: current.startDateKey } : {}),
    }))
  }

  const endDate = form.portion === 'FULL_DAY' ? form.endDateKey : form.startDateKey
  const invalidRange = Boolean(form.startDateKey && endDate && endDate < form.startDateKey)
  const canSubmit = form.startDateKey && endDate && form.reason.trim() && !invalidRange

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, endDateKey: endDate, reason: form.reason.trim() })
        }}
      >
        <DialogTitle>
          {t('hrTime.leaveRequest.title', { defaultValue: 'Request leave' })}
        </DialogTitle>
        <DialogContent className="grid gap-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            required
            fullWidth
            label={t('hrTime.fields.leaveType', { defaultValue: 'Leave type' })}
            value={form.leaveType}
            helperText={t('hrTime.help.leaveType', {
              defaultValue: 'Choose the policy balance this request should use.',
            })}
            onChange={(event) => update('leaveType', event.target.value)}
          >
            {leaveTypes.map((value) => (
              <MenuItem key={value} value={value}>
                {enumLabel(t, 'leaveType', value)}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            required
            fullWidth
            label={t('hrTime.fields.portion', { defaultValue: 'Day portion' })}
            value={form.portion}
            helperText={t('hrTime.help.portion', {
              defaultValue: 'Morning and afternoon requests must use one date.',
            })}
            onChange={(event) => update('portion', event.target.value)}
          >
            {portions.map((value) => (
              <MenuItem key={value} value={value}>
                {enumLabel(t, 'portion', value)}
              </MenuItem>
            ))}
          </TextField>
          <div className="grid gap-4 sm:grid-cols-2">
            <DatePicker
              required
              fullWidth
              label={t('hrTime.fields.startDate', { defaultValue: 'Start date' })}
              value={form.startDateKey}
              helperText={t('hrTime.help.startDate', {
                defaultValue: 'First requested working date.',
              })}
              onChange={(val) => update('startDateKey', val)}
            />
            <DatePicker
              required
              fullWidth
              disabled={form.portion !== 'FULL_DAY'}
              label={t('hrTime.fields.endDate', { defaultValue: 'End date' })}
              value={endDate}
              error={invalidRange}
              helperText={
                invalidRange
                  ? t('hrTime.errors.endBeforeStart', {
                      defaultValue: 'End date must not be before start date.',
                    })
                  : t('hrTime.help.endDate', { defaultValue: 'Last requested working date.' })
              }
              onChange={(val) => update('endDateKey', val)}
            />
          </div>
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            inputProps={{ maxLength: 500 }}
            label={t('hrTime.fields.reason', { defaultValue: 'Reason' })}
            value={form.reason}
            helperText={t('hrTime.help.leaveReason', {
              defaultValue: 'Provide enough context for the approver.',
            })}
            onChange={(event) => update('reason', event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button type="submit" variant="contained" disabled={!canSubmit || loading}>
            {t('hrTime.actions.submitRequest', { defaultValue: 'Submit request' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
