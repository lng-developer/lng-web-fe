import { useState } from 'react'
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
const titles = {
  accrue: 'Accrue leave balances',
  reset: 'Reset leave balances',
  carryOver: 'Carry over leave balances',
}

function requestErrorMessage(error) {
  const message = error?.data?.message || error?.data?.error?.message || error?.message
  return error?.status
    ? `Request failed (${error.status}): ${message || 'Could not update leave balances'}`
    : message || 'Could not update leave balances'
}

export default function LeaveBalanceAdminDialog({
  open,
  mode,
  employees = [],
  loading = false,
  error,
  result,
  onClose,
  onConfirm,
}) {
  const currentYear = new Date().getFullYear()
  const [values, setValues] = useState({
    profileIds: [],
    year: String(currentYear),
    month: String(new Date().getMonth() + 1),
    units: '2',
    leaveType: 'ANNUAL',
    entitledUnits: '',
    fromYear: String(currentYear - 1),
    toYear: String(currentYear),
    maxUnits: '',
    reason: '',
  })
  const setField = (field, value) => setValues((current) => ({ ...current, [field]: value }))
  const hasSelection = values.profileIds.length > 0

  function submit(event) {
    event.preventDefault()
    const profileIds = hasSelection ? { profileIds: values.profileIds } : {}
    const payload =
      mode === 'accrue'
        ? {
            ...profileIds,
            year: Number(values.year),
            month: Number(values.month),
            units: Number(values.units),
            reason: values.reason.trim(),
          }
        : mode === 'reset'
          ? {
              ...profileIds,
              year: Number(values.year),
              leaveType: values.leaveType,
              entitledUnits: Number(values.entitledUnits),
              reason: values.reason.trim(),
            }
          : {
              ...profileIds,
              fromYear: Number(values.fromYear),
              toYear: Number(values.toYear),
              leaveType: values.leaveType,
              maxUnits: Number(values.maxUnits),
              reason: values.reason.trim(),
            }
    onConfirm(payload)
  }

  const invalid =
    !values.reason.trim() ||
    (mode === 'accrue' && (!values.year || !values.month || !values.units)) ||
    (mode === 'reset' && (!values.year || values.entitledUnits === '')) ||
    (mode === 'carryOver' && (!values.fromYear || !values.toYear || values.maxUnits === ''))

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form onSubmit={submit}>
        <DialogTitle>{titles[mode]}</DialogTitle>
        <DialogContent className="grid gap-4 !pt-2">
          {error ? <Alert severity="error">{requestErrorMessage(error)}</Alert> : null}
          <Alert severity="warning">
            {hasSelection
              ? `This will apply to ${values.profileIds.length} selected employee${values.profileIds.length === 1 ? '' : 's'}.`
              : 'This will apply to all active employees.'}
          </Alert>
          <TextField
            select
            label="Employees (optional)"
            value={values.profileIds}
            SelectProps={{
              multiple: true,
              renderValue: (selected) =>
                selected.length ? `${selected.length} selected` : 'All active employees',
            }}
            onChange={(event) => setField('profileIds', event.target.value)}
          >
            {employees.map((employee) => (
              <MenuItem key={employee.id} value={employee.id}>
                {employee.fullName || employee.employeeCode || employee.id}
              </MenuItem>
            ))}
          </TextField>
          {mode === 'accrue' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                required
                type="number"
                label="Year"
                value={values.year}
                onChange={(event) => setField('year', event.target.value)}
              />
              <TextField
                required
                type="number"
                label="Month"
                value={values.month}
                inputProps={{ min: 1, max: 12, step: 1 }}
                onChange={(event) => setField('month', event.target.value)}
              />
              <TextField
                required
                type="number"
                label="Units"
                value={values.units}
                inputProps={{ min: 1, step: 1 }}
                onChange={(event) => setField('units', event.target.value)}
              />
            </div>
          ) : null}
          {mode === 'reset' ? (
            <div className="grid gap-3 sm:grid-cols-3">
              <TextField
                required
                type="number"
                label="Year"
                value={values.year}
                onChange={(event) => setField('year', event.target.value)}
              />
              <TextField
                select
                label="Leave type"
                value={values.leaveType}
                onChange={(event) => setField('leaveType', event.target.value)}
              >
                {leaveTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                type="number"
                label="Entitled units"
                value={values.entitledUnits}
                inputProps={{ min: 0, step: 1 }}
                onChange={(event) => setField('entitledUnits', event.target.value)}
              />
            </div>
          ) : null}
          {mode === 'carryOver' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <TextField
                required
                type="number"
                label="From year"
                value={values.fromYear}
                onChange={(event) => setField('fromYear', event.target.value)}
              />
              <TextField
                required
                type="number"
                label="To year"
                value={values.toYear}
                onChange={(event) => setField('toYear', event.target.value)}
              />
              <TextField
                select
                label="Leave type"
                value={values.leaveType}
                onChange={(event) => setField('leaveType', event.target.value)}
              >
                {leaveTypes.map((type) => (
                  <MenuItem key={type} value={type}>
                    {type.replaceAll('_', ' ')}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                required
                type="number"
                label="Maximum units"
                value={values.maxUnits}
                inputProps={{ min: 0, step: 1 }}
                onChange={(event) => setField('maxUnits', event.target.value)}
              />
            </div>
          ) : null}
          <TextField
            required
            multiline
            minRows={3}
            label="Reason"
            value={values.reason}
            onChange={(event) => setField('reason', event.target.value)}
          />
          {result ? (
            <div className="space-y-2 border-t border-border pt-3">
              <Typography variant="subtitle2">Result</Typography>
              <Typography variant="body2">Processed: {result.processed}</Typography>
              {mode === 'accrue' && result.changed !== undefined ? (
                <Typography variant="body2">Changed: {result.changed}</Typography>
              ) : null}
              {(result.items || []).map((item, index) => (
                <Typography key={item.id || index} variant="body2" className="text-ink-secondary">
                  {item.employee?.fullName || item.profileId || 'Employee'}: {item.availableUnits}{' '}
                  available units
                </Typography>
              ))}
            </div>
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button type="submit" variant="contained" disabled={loading || invalid}>
            Confirm
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
