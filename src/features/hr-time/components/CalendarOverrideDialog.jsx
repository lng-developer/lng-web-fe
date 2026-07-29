import { useMemo, useState } from 'react'
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

import { buildCalendarOverridePayload } from '../utils/hrTimeApi.js'

const initialValues = {
  dateKey: '',
  kind: 'HOLIDAY',
  scopeType: 'PROFILE',
  scopeId: '',
  name: '',
  status: 'ACTIVE',
}

export default function CalendarOverrideDialog({
  open,
  override,
  allowedScopeTypes = [],
  scopeOptions = [],
  loading = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const fallbackScope = allowedScopeTypes[0] || 'PROFILE'
  const [values, setValues] = useState(() =>
    override
      ? {
          dateKey: override.dateKey || '',
          kind: override.kind || 'HOLIDAY',
          scopeType: override.scopeType || fallbackScope,
          scopeId: override.scopeId || '',
          name: override.name || '',
          status: override.status || 'ACTIVE',
        }
      : { ...initialValues, scopeType: fallbackScope },
  )
  const options = useMemo(
    () => scopeOptions.filter((option) => option.type === values.scopeType),
    [scopeOptions, values.scopeType],
  )

  function setField(field, value) {
    setValues((current) => ({
      ...current,
      [field]: value,
      ...(field === 'scopeType' ? { scopeId: '' } : {}),
    }))
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(buildCalendarOverridePayload(values))
        }}
      >
        <DialogTitle>
          {override
            ? t('hrTime.schedule.editOverride', { defaultValue: 'Edit calendar override' })
            : t('hrTime.schedule.addOverride', { defaultValue: 'Add calendar override' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker
              required
              label={t('hrTime.fields.overrideDate.label', { defaultValue: 'Calendar date' })}
              helperText={t('hrTime.fields.overrideDate.helperText', {
                defaultValue: 'Date whose normal work rule is replaced.',
              })}
              value={values.dateKey}
              onChange={(val) => setField('dateKey', val)}
            />
            <TextField
              select
              required
              label={t('hrTime.fields.overrideKind.label', { defaultValue: 'Day type' })}
              helperText={t('hrTime.fields.overrideKind.helperText', {
                defaultValue: 'Choose how attendance treats this date.',
              })}
              value={values.kind}
              onChange={(event) => setField('kind', event.target.value)}
            >
              {['HOLIDAY', 'REST_DAY', 'WORKING_DAY'].map((kind) => (
                <MenuItem key={kind} value={kind}>
                  {kind.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              select
              required
              label={t('hrTime.fields.scopeType.label', { defaultValue: 'Calendar scope' })}
              helperText={t('hrTime.fields.scopeType.helperText', {
                defaultValue: 'Only scopes you are allowed to configure are shown.',
              })}
              value={values.scopeType}
              onChange={(event) => setField('scopeType', event.target.value)}
            >
              {allowedScopeTypes.map((scopeType) => (
                <MenuItem key={scopeType} value={scopeType}>
                  {scopeType.replaceAll('_', ' ')}
                </MenuItem>
              ))}
            </TextField>
            {values.scopeType !== 'GLOBAL' ? (
              <TextField
                select
                required
                label={t('hrTime.fields.scopeTarget.label', { defaultValue: 'Applies to' })}
                helperText={t('hrTime.fields.scopeTarget.helperText', {
                  defaultValue: 'Choose a named employee, team, department, or location.',
                })}
                value={values.scopeId}
                onChange={(event) => setField('scopeId', event.target.value)}
              >
                {options.map((option) => (
                  <MenuItem key={`${option.type}-${option.id}`} value={option.id}>
                    {option.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}
          </div>
          <TextField
            fullWidth
            required
            label={t('hrTime.fields.overrideName.label', { defaultValue: 'Calendar label' })}
            helperText={t('hrTime.fields.overrideName.helperText', {
              defaultValue: 'Use a short name staff will recognize.',
            })}
            value={values.name}
            onChange={(event) => setField('name', event.target.value)}
          />
          <TextField
            select
            fullWidth
            label={t('hrTime.fields.overrideStatus.label', { defaultValue: 'Status' })}
            helperText={t('hrTime.fields.overrideStatus.helperText', {
              defaultValue: 'Suspend an override without removing its audit history.',
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
          <Button type="submit" variant="contained" disabled={loading}>
            {t('common.save', { defaultValue: 'Save' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
