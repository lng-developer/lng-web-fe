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

import { buildShiftAssignmentPayload } from '../utils/hrTimeApi.js'

const initialValues = {
  profileId: '',
  shiftId: '',
  workLocationId: '',
  effectiveFrom: '',
  effectiveTo: '',
  status: 'ACTIVE',
}

export default function ShiftAssignmentDialog({
  open,
  assignment,
  employees = [],
  shifts = [],
  locations = [],
  loading = false,
  error = '',
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [values, setValues] = useState(() =>
    assignment
      ? {
          profileId: assignment.profileId || '',
          shiftId: assignment.shiftId || '',
          workLocationId: assignment.workLocationId || '',
          effectiveFrom: assignment.effectiveFrom || '',
          effectiveTo: assignment.effectiveTo || '',
          status: assignment.status || 'ACTIVE',
        }
      : initialValues,
  )

  function setField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          onSubmit(buildShiftAssignmentPayload(values))
        }}
      >
        <DialogTitle>
          {assignment
            ? t('hrTime.schedule.editAssignment', { defaultValue: 'Edit assignment' })
            : t('hrTime.schedule.addAssignment', { defaultValue: 'Add assignment' })}
        </DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <TextField
            select
            fullWidth
            required
            label={t('hrTime.fields.employee.label', { defaultValue: 'Employee' })}
            helperText={t('hrTime.fields.employee.helperText', {
              defaultValue: 'Choose the person whose schedule will change.',
            })}
            value={values.profileId}
            onChange={(event) => setField('profileId', event.target.value)}
          >
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.fullName} ({employee.employeeCode})
              </MenuItem>
            ))}
          </TextField>
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              select
              required
              label={t('hrTime.fields.shift.label', { defaultValue: 'Shift' })}
              helperText={t('hrTime.fields.shift.helperText', {
                defaultValue: 'Select a named shift with its standard hours.',
              })}
              value={values.shiftId}
              onChange={(event) => setField('shiftId', event.target.value)}
            >
              {shifts.map((shift) => (
                <MenuItem key={shift.id} value={shift.id}>
                  {shift.name} ({shift.startTime}-{shift.endTime})
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              required
              label={t('hrTime.fields.workLocation.label', { defaultValue: 'Work location' })}
              helperText={t('hrTime.fields.workLocation.helperText', {
                defaultValue: 'Select the location used for schedule policy.',
              })}
              value={values.workLocationId}
              onChange={(event) => setField('workLocationId', event.target.value)}
            >
              {locations.map((location) => (
                <MenuItem key={location.id} value={location.id}>
                  {location.name} ({location.timezone})
                </MenuItem>
              ))}
            </TextField>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <DatePicker
              required
              label={t('hrTime.fields.effectiveFrom.label', { defaultValue: 'Effective from' })}
              helperText={t('hrTime.fields.effectiveFrom.helperText', {
                defaultValue: 'First work date covered by this assignment.',
              })}
              value={values.effectiveFrom}
              onChange={(val) => setField('effectiveFrom', val)}
            />
            <DatePicker
              label={t('hrTime.fields.effectiveTo.label', { defaultValue: 'Effective to' })}
              helperText={t('hrTime.fields.effectiveTo.helperText', {
                defaultValue: 'Leave empty for an ongoing assignment.',
              })}
              value={values.effectiveTo}
              onChange={(val) => setField('effectiveTo', val)}
            />
          </div>
          <TextField
            select
            fullWidth
            label={t('hrTime.fields.assignmentStatus.label', { defaultValue: 'Status' })}
            helperText={t('hrTime.fields.assignmentStatus.helperText', {
              defaultValue: 'Suspend an assignment without deleting its history.',
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
