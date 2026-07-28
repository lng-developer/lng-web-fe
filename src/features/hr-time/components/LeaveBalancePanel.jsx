import { useState } from 'react'
import { Alert, Button, MenuItem, TextField, Typography } from '@mui/material'

import {
  useAdjustLeaveBalanceMutation,
  useUpsertLeaveBalanceMutation,
} from '../api/hrTime.mutations.js'
import { useLeaveBalanceQuery } from '../api/hrTime.queries.js'

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

function errorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    'Could not update leave balance'
  )
}

function metric(label, value) {
  return (
    <div key={label}>
      <Typography variant="caption" className="uppercase text-ink-muted">
        {label}
      </Typography>
      <Typography variant="body2" className="font-semibold text-ink-strong">
        {value ?? 0}
      </Typography>
    </div>
  )
}

export default function LeaveBalancePanel({ profileId, canManage = false }) {
  const [year, setYear] = useState(String(new Date().getFullYear()))
  const [leaveType, setLeaveType] = useState('ANNUAL')
  const [entitledUnits, setEntitledUnits] = useState('')
  const [adjustmentUnits, setAdjustmentUnits] = useState('')
  const [adjustUnits, setAdjustUnits] = useState('')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const validYear = Number.isInteger(Number(year)) && Number(year) >= 2000 && Number(year) <= 2100
  const validUpsert =
    validYear &&
    String(entitledUnits).trim() !== '' &&
    String(adjustmentUnits).trim() !== '' &&
    Number.isInteger(Number(entitledUnits)) &&
    Number(entitledUnits) >= 0 &&
    Number.isInteger(Number(adjustmentUnits))
  const validAdjustment =
    validYear &&
    String(adjustUnits).trim() !== '' &&
    Number.isInteger(Number(adjustUnits)) &&
    Number(adjustUnits) !== 0
  const balanceQuery = useLeaveBalanceQuery(profileId, Number(year), leaveType, {
    enabled: Boolean(profileId) && validYear,
  })
  const upsert = useUpsertLeaveBalanceMutation()
  const adjust = useAdjustLeaveBalanceMutation()
  const balance = balanceQuery.data
  const loading = upsert.isPending || adjust.isPending

  async function saveBalance() {
    if (!validUpsert) return

    setError('')
    try {
      await upsert.mutateAsync({
        profileId,
        year: Number(year),
        leaveType,
        payload: {
          entitledUnits: Number(entitledUnits),
          adjustmentUnits: Number(adjustmentUnits),
          reason: reason.trim(),
        },
      })
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  async function adjustBalance() {
    if (!validAdjustment) return

    setError('')
    try {
      await adjust.mutateAsync({
        profileId,
        year: Number(year),
        leaveType,
        payload: { units: Number(adjustUnits), reason: reason.trim() },
      })
      setAdjustUnits('')
    } catch (requestError) {
      setError(errorMessage(requestError))
    }
  }

  return (
    <section className="py-4">
      <Typography variant="subtitle2" className="mb-3 uppercase text-ink-muted">
        Leave balance
      </Typography>
      <div className="grid gap-3 sm:grid-cols-2">
        <TextField
          type="number"
          label="Year"
          value={year}
          inputProps={{ min: 2000, max: 2100, step: 1 }}
          onChange={(event) => setYear(event.target.value)}
        />
        <TextField
          select
          label="Leave type"
          value={leaveType}
          onChange={(event) => setLeaveType(event.target.value)}
        >
          {leaveTypes.map((type) => (
            <MenuItem key={type} value={type}>
              {type.replaceAll('_', ' ')}
            </MenuItem>
          ))}
        </TextField>
      </div>
      {balanceQuery.error ? (
        <Alert severity="error" className="mt-3">
          {errorMessage(balanceQuery.error)}
        </Alert>
      ) : null}
      {error ? (
        <Alert severity="error" className="mt-3">
          {error}
        </Alert>
      ) : null}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {metric('Entitled', balance?.entitledUnits)}
        {metric('Carried over', balance?.carriedOverUnits)}
        {metric('Adjustment', balance?.adjustmentUnits)}
        {metric('Used', balance?.usedUnits)}
        {metric('Available', balance?.availableUnits)}
        {metric('Last accrued month', balance?.lastAccruedMonth)}
      </div>
      {canManage ? (
        <div className="mt-4 grid gap-3 border-t border-border pt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <TextField
              required
              type="number"
              label="Entitled units"
              value={entitledUnits}
              inputProps={{ min: 0, step: 1 }}
              onChange={(event) => setEntitledUnits(event.target.value)}
            />
            <TextField
              required
              type="number"
              label="Adjustment units"
              value={adjustmentUnits}
              inputProps={{ step: 1 }}
              onChange={(event) => setAdjustmentUnits(event.target.value)}
            />
          </div>
          <TextField
            required
            multiline
            minRows={2}
            label="Reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
          <div className="flex flex-wrap gap-2">
            <Button
              variant="contained"
              disabled={loading || !validUpsert || !reason.trim()}
              onClick={saveBalance}
            >
              Save balance
            </Button>
            <TextField
              required
              type="number"
              size="small"
              label="Signed adjustment units"
              value={adjustUnits}
              inputProps={{ step: 1 }}
              onChange={(event) => setAdjustUnits(event.target.value)}
            />
            <Button
              variant="outlined"
              disabled={loading || !validAdjustment || !reason.trim()}
              onClick={adjustBalance}
            >
              Adjust balance
            </Button>
          </div>
        </div>
      ) : null}
      <div className="mt-4 border-t border-border pt-4">
        <Typography variant="subtitle2">History</Typography>
        {(balance?.history || []).length ? (
          <div className="mt-2 space-y-2">
            {balance.history.map((entry, index) => (
              <div
                key={`${entry.occurredAt || index}-${entry.action}`}
                className="text-sm text-ink-secondary"
              >
                <strong>{entry.action}</strong> {entry.units} units — {entry.reason || '-'}
              </div>
            ))}
          </div>
        ) : (
          <Typography variant="body2" className="mt-2 text-ink-muted">
            No balance history.
          </Typography>
        )}
      </div>
    </section>
  )
}
