import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
} from '@mui/material'

import DatePicker from '@/components/form/DatePicker'
import TimePicker from '@/components/form/TimePicker'

const initialForm = {
  workDateKey: '',
  plannedStartTime: '',
  plannedEndTime: '',
  reason: '',
}

export default function OvertimeRequestDialog({
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
    workDateKey: initialDate || '',
  })

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }))
  }

  const canSubmit =
    form.workDateKey && form.plannedStartTime && form.plannedEndTime && form.reason.trim()

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (!canSubmit) return
          onSubmit({ ...form, reason: form.reason.trim() })
        }}
      >
        <DialogTitle>
          {t('hrTime.overtimeRequest.title', { defaultValue: 'Request overtime' })}
        </DialogTitle>
        <DialogContent className="grid gap-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <DatePicker
            required
            fullWidth
            label={t('hrTime.fields.workDate', { defaultValue: 'Work date' })}
            value={form.workDateKey}
            helperText={t('hrTime.help.workDate', {
              defaultValue: 'Date the overtime shift starts.',
            })}
            onChange={(val) => update('workDateKey', val)}
          />
          <div className="grid gap-4 sm:grid-cols-2">
            <TimePicker
              required
              fullWidth
              label={t('hrTime.fields.startTime', { defaultValue: 'Start time' })}
              value={form.plannedStartTime}
              helperText={t('hrTime.help.startTime', {
                defaultValue: 'Planned overtime start.',
              })}
              onChange={(val) => update('plannedStartTime', val)}
            />
            <TimePicker
              required
              fullWidth
              label={t('hrTime.fields.endTime', { defaultValue: 'End time' })}
              value={form.plannedEndTime}
              helperText={t('hrTime.help.endTime', {
                defaultValue: 'May be after midnight; duration must be 30 minutes to 16 hours.',
              })}
              onChange={(val) => update('plannedEndTime', val)}
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
            helperText={t('hrTime.help.overtimeReason', {
              defaultValue: 'Describe the work that requires overtime.',
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
