import { useState } from 'react'
import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import MenuItem from '@mui/material/MenuItem'
import TextField from '@mui/material/TextField'

import AnimatedDialog from '@/components/common/AnimatedDialog'

import { buildPayrollAdjustmentPayload } from '../utils/hrPayrollApi.js'

export const payrollAdjustmentConflictMessage =
  'This adjustment changed on the server. Review the refreshed row before retrying.'

function emptyValues() {
  const now = new Date()
  return {
    profileId: '',
    month: String(now.getMonth() + 1),
    year: String(now.getFullYear()),
    type: 'EARNING',
    code: 'BONUS',
    name: '',
    amount: '',
    note: '',
    expectedVersion: 0,
  }
}

function initialValues(adjustment) {
  return adjustment
    ? {
        profileId: adjustment.profileId,
        month: String(adjustment.month),
        year: String(adjustment.year),
        type: adjustment.type,
        code: adjustment.code,
        name: adjustment.name,
        amount: String(adjustment.amount),
        note: adjustment.note || '',
        expectedVersion: adjustment.version,
      }
    : emptyValues()
}

export default function PayrollAdjustmentDialog({
  open,
  adjustment,
  profiles,
  loading,
  error,
  onClose,
  onSubmit,
}) {
  const [values, setValues] = useState(() => initialValues(adjustment))

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  const valid =
    values.profileId &&
    values.month &&
    values.year &&
    values.type &&
    values.code &&
    values.name.trim() &&
    values.amount !== '' &&
    Number.isInteger(Number(values.amount)) &&
    Number(values.amount) >= 0

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{adjustment ? 'Edit adjustment' : 'Create adjustment'}</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        {error ? (
          <Alert severity="error" className="sm:col-span-2">
            {error}
          </Alert>
        ) : null}
        <TextField
          required
          select
          label="Employee"
          value={values.profileId}
          disabled={loading || Boolean(adjustment)}
          className="sm:col-span-2"
          onChange={(event) => update('profileId', event.target.value)}
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.fullName}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          required
          type="number"
          label="Month"
          value={values.month}
          disabled={loading || Boolean(adjustment)}
          inputProps={{ min: 1, max: 12 }}
          onChange={(event) => update('month', event.target.value)}
        />
        <TextField
          required
          type="number"
          label="Year"
          value={values.year}
          disabled={loading || Boolean(adjustment)}
          inputProps={{ min: 2000, max: 2100 }}
          onChange={(event) => update('year', event.target.value)}
        />
        <TextField
          required
          select
          label="Type"
          value={values.type}
          disabled={loading}
          onChange={(event) => update('type', event.target.value)}
        >
          {['EARNING', 'ALLOWANCE', 'DEDUCTION'].map((type) => (
            <MenuItem key={type} value={type}>
              {type}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          required
          select
          label="Code"
          value={values.code}
          disabled={loading}
          onChange={(event) => update('code', event.target.value)}
        >
          {['BONUS', 'PENALTY', 'ADVANCE', 'ARREARS', 'OTHER'].map((code) => (
            <MenuItem key={code} value={code}>
              {code}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          required
          label="Name"
          value={values.name}
          disabled={loading}
          className="sm:col-span-2"
          onChange={(event) => update('name', event.target.value)}
        />
        <TextField
          required
          type="number"
          label="Amount (VND)"
          value={values.amount}
          disabled={loading}
          inputProps={{ min: 0, step: 1 }}
          className="sm:col-span-2"
          onChange={(event) => update('amount', event.target.value)}
        />
        <TextField
          label="Note"
          value={values.note}
          disabled={loading}
          multiline
          minRows={2}
          className="sm:col-span-2"
          onChange={(event) => update('note', event.target.value)}
        />
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          variant="contained"
          disabled={loading || !valid}
          onClick={() =>
            onSubmit(buildPayrollAdjustmentPayload(values, { update: Boolean(adjustment) }))
          }
        >
          {adjustment ? 'Save adjustment' : 'Create adjustment'}
        </Button>
      </DialogActions>
    </AnimatedDialog>
  )
}
