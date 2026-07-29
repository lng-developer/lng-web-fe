import { useState } from 'react'
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogTitle,
  LinearProgress,
  MenuItem,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material'

import AnimatedDialog from '@/components/common/AnimatedDialog'

import { buildRunPayrollPayload, formatVnd, payrollResultIdentity } from '../utils/hrPayrollApi.js'

function currentPeriod() {
  const now = new Date()
  return { month: String(now.getMonth() + 1), year: String(now.getFullYear()), profileIds: [] }
}

const steps = ['Configuration', 'Preview', 'Run']

export default function PayrollRunDialog({
  open,
  profiles,
  loading,
  error,
  onClose,
  onPreview,
  onPersist,
}) {
  const [activeStep, setActiveStep] = useState(0)
  const [values, setValues] = useState(currentPeriod)
  const [preview, setPreview] = useState(null)

  function close() {
    setPreview(null)
    setActiveStep(0)
    onClose()
  }

  function update(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
  }

  async function handleNext() {
    if (activeStep === 0) {
      const result = await onPreview(buildRunPayrollPayload({ ...values, shadow: true }))
      if (result) {
        setPreview(result)
        setActiveStep(1)
      }
    } else if (activeStep === 1) {
      setActiveStep(2)
    } else if (activeStep === 2) {
      await onPersist(buildRunPayrollPayload({ ...values, shadow: false }))
    }
  }

  function handleBack() {
    setActiveStep((prev) => prev - 1)
  }

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : close} fullWidth maxWidth="sm">
      <DialogTitle>Run payroll</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent className="pt-2">
        <Stepper activeStep={activeStep} className="mb-6">
          {steps.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {error ? (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        ) : null}

        {activeStep === 0 && (
          <div className="grid gap-4 sm:grid-cols-2 mt-2">
            <Alert severity="info" className="sm:col-span-2">
              Select the period and employees to calculate payroll for.
            </Alert>
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
          </div>
        )}

        {activeStep === 1 && preview && (
          <div className="space-y-4 mt-2">
            <Alert severity="success">
              Preview complete: {preview.results?.length || 0} employee result
              {preview.results?.length === 1 ? '' : 's'} calculated. Nothing was saved.
            </Alert>
            <div className="max-h-72 overflow-y-auto space-y-3">
              {(preview.results || []).map((result, index) => {
                const identity = payrollResultIdentity(result, index)
                return (
                  <div
                    key={identity.key}
                    className="rounded-xl border border-border p-4 bg-surface-subtle shadow-sm"
                  >
                    <Typography variant="subtitle2" className="font-semibold text-ink-strong">
                      {identity.label}
                    </Typography>
                    <Typography variant="caption" className="text-ink-secondary mb-3 block">
                      Result: {identity.reference}
                    </Typography>
                    <div className="grid grid-cols-2 gap-y-3 gap-x-4 text-sm">
                      <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-ink-muted text-xs block mb-0.5">Gross Income</span>
                        <span className="font-semibold text-ink-strong">
                          {formatVnd(result.grossIncome)}
                        </span>
                      </div>
                      <div className="bg-emerald-50 dark:bg-emerald-900/20 p-2 rounded-lg border border-emerald-100 dark:border-emerald-800/30">
                        <span className="text-emerald-700 dark:text-emerald-400 text-xs block mb-0.5">
                          Net Pay
                        </span>
                        <span className="font-bold text-emerald-800 dark:text-emerald-300">
                          {formatVnd(result.netIncome)}
                        </span>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-ink-muted text-xs block mb-0.5">Adj. Earnings</span>
                        <span className="text-ink-strong">
                          {formatVnd(result.adjustmentEarnings)}
                        </span>
                      </div>
                      <div className="bg-white/50 dark:bg-black/20 p-2 rounded-lg">
                        <span className="text-ink-muted text-xs block mb-0.5">Adj. Deductions</span>
                        <span className="text-ink-strong">
                          {formatVnd(result.adjustmentDeductions)}
                        </span>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {activeStep === 2 && (
          <div className="space-y-4 mt-2 p-6 bg-warning-bg rounded-xl border border-warning/20">
            <Typography variant="h6" className="text-warning-strong text-center">
              Ready to Finalize
            </Typography>
            <Typography variant="body2" className="text-center text-ink-strong">
              You are about to persist the payroll calculation. This will create immutable records
              for this period that will be visible to employees once finalized.
            </Typography>
            <div className="bg-white dark:bg-black/30 p-4 rounded-lg flex justify-between items-center mt-4">
              <span className="font-semibold text-ink-muted">Target Period:</span>
              <span className="font-bold text-lg">
                {values.month}/{values.year}
              </span>
            </div>
          </div>
        )}
      </DialogContent>
      <DialogActions className="px-6 pb-6 pt-2">
        <Button onClick={close} disabled={loading} color="inherit">
          Cancel
        </Button>
        <div className="flex-grow" />
        <Button onClick={handleBack} disabled={activeStep === 0 || loading}>
          Back
        </Button>
        <Button variant="contained" onClick={handleNext} disabled={loading}>
          {activeStep === steps.length - 1 ? 'Run and persist' : 'Next'}
        </Button>
      </DialogActions>
    </AnimatedDialog>
  )
}
