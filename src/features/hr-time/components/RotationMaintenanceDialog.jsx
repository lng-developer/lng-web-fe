import { useState } from 'react'
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

import ConfirmDialog from '@/components/common/ConfirmDialog'

function errorMessage(error) {
  return (
    error?.data?.message ||
    error?.data?.error?.message ||
    error?.message ||
    'Could not update Saturday rotations'
  )
}

export default function RotationMaintenanceDialog({
  employees = [],
  error,
  loading,
  onClose,
  onCreate,
  onDeleteTeam,
  onUpdate,
  rotation,
  teams = [],
}) {
  const [employeeProfileIds, setEmployeeProfileIds] = useState(rotation?.employeeProfileIds || [])
  const [teamId, setTeamId] = useState(rotation?.teamId || '')
  const month = rotation?.month || ''
  const year = rotation?.year || ''
  const dateKey = rotation?.dateKey || ''
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  const teamEmployees = employees.filter((employee) => !teamId || employee.team?.id === teamId)

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>Maintain Saturday rotation</DialogTitle>
      <DialogContent className="grid gap-4 !pt-2 sm:grid-cols-2">
        {error ? (
          <Alert severity="error" className="sm:col-span-2">
            {errorMessage(error)}
          </Alert>
        ) : null}
        <TextField
          select
          label="Team"
          className="sm:col-span-2"
          value={teamId}
          onChange={(event) => {
            setTeamId(event.target.value)
            setEmployeeProfileIds([])
          }}
        >
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          label="Saturday"
          value={dateKey || `${month}/${year}`}
          InputProps={{ readOnly: true }}
        />
        <div className="sm:col-span-2">
          <div className="mb-2 flex items-center justify-between gap-3">
            <span className="text-sm font-semibold text-ink-strong">
              Employees off · {employeeProfileIds.length}
            </span>
            <Button
              size="small"
              onClick={() => setEmployeeProfileIds([])}
              disabled={loading || employeeProfileIds.length === 0}
            >
              Clear selection
            </Button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            {teamEmployees.map((employee) => {
              const selected = employeeProfileIds.includes(employee.id)
              return (
                <FormControlLabel
                  key={employee.id}
                  className={`m-0 rounded-lg border px-2 py-1.5 ${selected ? 'border-primary bg-primary-light' : 'border-border bg-surface'}`}
                  control={
                    <Checkbox
                      size="small"
                      checked={selected}
                      onChange={() =>
                        setEmployeeProfileIds((current) =>
                          current.includes(employee.id)
                            ? current.filter((id) => id !== employee.id)
                            : [...current, employee.id],
                        )
                      }
                    />
                  }
                  label={
                    <span>
                      <span className="block text-sm font-semibold text-ink-strong">
                        {employee.fullName || employee.employeeCode}
                      </span>
                      <span className="block text-xs text-ink-muted">
                        {employee.employeeCode || 'Employee'}
                      </span>
                    </span>
                  }
                />
              )
            })}
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Close
        </Button>
        <Button
          color="error"
          disabled={loading || !teamId || !month || !year}
          onClick={() => setConfirmingDelete(true)}
        >
          Delete team month
        </Button>
        <Button
          variant="contained"
          disabled={loading || !teamId || !dateKey}
          onClick={() =>
            rotation?.id
              ? onUpdate({ id: rotation.id, employeeProfileIds })
              : onCreate({ teamId, dateKey, employeeProfileIds })
          }
        >
          {rotation?.id ? 'Save employees' : 'Create manual rotation'}
        </Button>
      </DialogActions>
      <ConfirmDialog
        open={confirmingDelete}
        title="Delete rotations?"
        description="Are you sure you want to delete all Saturday rotations for this team and month? This action cannot be undone."
        loading={loading}
        onClose={() => setConfirmingDelete(false)}
        onConfirm={() => onDeleteTeam({ teamId, month, year })}
      />
    </Dialog>
  )
}
