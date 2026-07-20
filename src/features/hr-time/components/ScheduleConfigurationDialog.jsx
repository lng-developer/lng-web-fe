import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  TextField,
} from '@mui/material'

import { buildShiftPayload, buildWorkLocationPayload } from '../utils/hrTimeApi.js'

const weekdays = [
  [1, 'Mon'],
  [2, 'Tue'],
  [3, 'Wed'],
  [4, 'Thu'],
  [5, 'Fri'],
  [6, 'Sat'],
  [7, 'Sun'],
]

function initialValues(type, record) {
  if (type === 'location') {
    return {
      code: record?.code || '',
      name: record?.name || '',
      timezone: record?.timezone || 'Asia/Ho_Chi_Minh',
      status: record?.status || 'ACTIVE',
    }
  }

  return {
    code: record?.code || '',
    name: record?.name || '',
    workLocationId: record?.workLocationId || '',
    startTime: record?.startTime || '09:00',
    endTime: record?.endTime || '18:00',
    breakMinutes: record?.breakMinutes ?? 60,
    graceMinutes: record?.graceMinutes ?? 0,
    workdays: record?.workdays || [1, 2, 3, 4, 5],
    status: record?.status || 'ACTIVE',
  }
}

export default function ScheduleConfigurationDialog({
  open,
  type,
  record,
  workLocations = [],
  loading = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() => initialValues(type, record))
  const isLocation = type === 'location'

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  function toggleWorkday(day) {
    setValues((current) => ({
      ...current,
      workdays: current.workdays.includes(day)
        ? current.workdays.filter((value) => value !== day)
        : [...current.workdays, day].sort((left, right) => left - right),
    }))
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(isLocation ? buildWorkLocationPayload(values) : buildShiftPayload(values))
        }}
      >
        <DialogTitle>
          {record
            ? isLocation
              ? t('hrTime.schedule.editLocation', { defaultValue: 'Edit work location' })
              : t('hrTime.schedule.editShift', { defaultValue: 'Edit shift' })
            : isLocation
              ? t('hrTime.schedule.addLocation', { defaultValue: 'Add work location' })
              : t('hrTime.schedule.addShift', { defaultValue: 'Add shift' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              required
              label={t('hrTime.fields.code.label', { defaultValue: 'Code' })}
              helperText={t('hrTime.fields.code.helperText', {
                defaultValue: 'Short, stable code used by schedules.',
              })}
              value={values.code}
              onChange={(event) => setField('code', event.target.value)}
            />
            <TextField
              required
              label={t('hrTime.fields.name.label', { defaultValue: 'Name' })}
              helperText={t('hrTime.fields.name.helperText', {
                defaultValue: 'Clear name shown to operators.',
              })}
              value={values.name}
              onChange={(event) => setField('name', event.target.value)}
            />
          </div>
          {isLocation ? (
            <TextField
              required
              fullWidth
              label={t('hrTime.fields.timezone.label', { defaultValue: 'Timezone' })}
              helperText={t('hrTime.fields.timezone.helperText', {
                defaultValue: 'IANA timezone, for example Asia/Ho_Chi_Minh.',
              })}
              value={values.timezone}
              onChange={(event) => setField('timezone', event.target.value)}
            />
          ) : (
            <>
              <TextField
                select
                fullWidth
                label={t('hrTime.fields.workLocation.label', { defaultValue: 'Work location' })}
                helperText={t('hrTime.fields.workLocation.optionalHelperText', {
                  defaultValue: 'Leave empty when this shift can be used at any location.',
                })}
                value={values.workLocationId}
                onChange={(event) => setField('workLocationId', event.target.value)}
              >
                <MenuItem value="">{t('common.all', { defaultValue: 'Any location' })}</MenuItem>
                {workLocations.map((location) => (
                  <MenuItem key={location.id} value={location.id}>
                    {location.name} ({location.timezone})
                  </MenuItem>
                ))}
              </TextField>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  required
                  type="time"
                  label={t('hrTime.fields.startTime.label', { defaultValue: 'Start time' })}
                  value={values.startTime}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(event) => setField('startTime', event.target.value)}
                />
                <TextField
                  required
                  type="time"
                  label={t('hrTime.fields.endTime.label', { defaultValue: 'End time' })}
                  helperText={t('hrTime.fields.endTime.helperText', {
                    defaultValue: 'An earlier end time means an overnight shift.',
                  })}
                  value={values.endTime}
                  slotProps={{ inputLabel: { shrink: true } }}
                  onChange={(event) => setField('endTime', event.target.value)}
                />
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <TextField
                  type="number"
                  label={t('hrTime.fields.breakMinutes.label', { defaultValue: 'Break minutes' })}
                  value={values.breakMinutes}
                  slotProps={{ htmlInput: { min: 0, max: 960 } }}
                  onChange={(event) => setField('breakMinutes', event.target.value)}
                />
                <TextField
                  type="number"
                  label={t('hrTime.fields.graceMinutes.label', { defaultValue: 'Grace minutes' })}
                  helperText={t('hrTime.fields.graceMinutes.helperText', {
                    defaultValue: 'Late-arrival allowance before attendance is marked late.',
                  })}
                  value={values.graceMinutes}
                  slotProps={{ htmlInput: { min: 0, max: 960 } }}
                  onChange={(event) => setField('graceMinutes', event.target.value)}
                />
              </div>
              <div>
                <p className="mb-1 text-sm font-medium text-ink-strong">
                  {t('hrTime.fields.workdays.label', { defaultValue: 'Working days' })}
                </p>
                <div className="flex flex-wrap gap-x-2">
                  {weekdays.map(([day, label]) => (
                    <FormControlLabel
                      key={day}
                      control={
                        <Checkbox
                          size="small"
                          checked={values.workdays.includes(day)}
                          onChange={() => toggleWorkday(day)}
                        />
                      }
                      label={label}
                    />
                  ))}
                </div>
              </div>
            </>
          )}
          <TextField
            select
            fullWidth
            label={t('hrTime.fields.scheduleStatus.label', { defaultValue: 'Status' })}
            helperText={t('hrTime.fields.scheduleStatus.helperText', {
              defaultValue: 'Suspend configuration without removing historical records.',
            })}
            value={values.status}
            onChange={(event) => setField('status', event.target.value)}
          >
            {['ACTIVE', 'SUSPENDED'].map((status) => (
              <MenuItem key={status} value={status}>
                {status}
              </MenuItem>
            ))}
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!isLocation && !values.workdays.length)}
          >
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
