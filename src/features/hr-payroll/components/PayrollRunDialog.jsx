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

import { buildRunPayrollPayload } from '../utils/hrPayrollApi.js'

function currentPeriod() {
  const now = new Date()
  return { month: String(now.getMonth() + 1), year: String(now.getFullYear()), profileIds: [] }
}

export default function PayrollRunDialog({
  open,
  profiles,
  loading,
  error,
  onClose,
  onPreview,
  onPersist,
}) {
  const [values, setValues] = useState(currentPeriod)
  const [preview, setPreview] = useState(null)

  function update(field, value) {
    setPreview(null)
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function submit(shadow) {
    const result = await (shadow ? onPreview : onPersist)(
      buildRunPayrollPayload({ ...values, shadow }),
    )
    if (shadow) setPreview(result)
  }

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Run payroll</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent className="grid gap-4 pt-2 sm:grid-cols-2">
        <Alert severity="info" className="sm:col-span-2">
          Preview calculates without saving. Run and persist creates the payroll record after
          confirmation.
        </Alert>
        {error ? (
          <Alert severity="error" className="sm:col-span-2">
            {error}
          </Alert>
        ) : null}
        <TextField
          required
          type="number"
          label="Month"
          value={values.month}
          inputProps={{ min: 1, max: 12 }}
          disabled={loading}
          onChange={(event) => update('month', event.target.value)}
        />
        <TextField
          required
          type="number"
          label="Year"
          value={values.year}
          inputProps={{ min: 2000, max: 2100 }}
          disabled={loading}
          onChange={(event) => update('year', event.target.value)}
        />
        <TextField
          select
          label="Employees (optional)"
          className="sm:col-span-2"
          value={values.profileIds}
          slotProps={{ select: { multiple: true } }}
          disabled={loading}
          onChange={(event) => update('profileIds', event.target.value)}
        >
          {profiles.map((profile) => (
            <MenuItem key={profile.id} value={profile.id}>
              {profile.fullName}
            </MenuItem>
          ))}
        </TextField>
        {preview ? (
          <Alert severity="success" className="sm:col-span-2">
            Preview complete: {preview.results?.length || 0} employee result
            {preview.results?.length === 1 ? '' : 's'} calculated. Nothing was saved.
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
        <Button variant="outlined" onClick={() => submit(true)} disabled={loading}>
          Preview
        </Button>
        <Button variant="contained" onClick={() => submit(false)} disabled={loading}>
          Run and persist
        </Button>
      </DialogActions>
    </AnimatedDialog>
  )
}
