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
  onDeleteTeam,
  onUpdate,
  rotation,
  teams = [],
}) {
  const [employeeProfileIds, setEmployeeProfileIds] = useState(rotation?.employeeProfileIds || [])
  const [teamId, setTeamId] = useState(rotation?.teamId || '')
  const [month, setMonth] = useState(rotation?.month || '')
  const [year, setYear] = useState(rotation?.year || '')
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
          onChange={(event) => setTeamId(event.target.value)}
        >
          {teams.map((team) => (
            <MenuItem key={team.id} value={team.id}>
              {team.name}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          type="number"
          label="Month"
          value={month}
          inputProps={{ min: 1, max: 12 }}
          onChange={(event) => setMonth(Number(event.target.value))}
        />
        <TextField
          type="number"
          label="Year"
          value={year}
          inputProps={{ min: 2000, max: 9999 }}
          onChange={(event) => setYear(Number(event.target.value))}
        />
        <TextField
          select
          label="Employees off"
          className="sm:col-span-2"
          value={employeeProfileIds}
          SelectProps={{ multiple: true, renderValue: (selected) => `${selected.length} selected` }}
          onChange={(event) => setEmployeeProfileIds(event.target.value)}
        >
          {teamEmployees.map((employee) => (
            <MenuItem key={employee.id} value={employee.id}>
              {employee.fullName || employee.employeeCode}
            </MenuItem>
          ))}
        </TextField>
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
          disabled={loading || !rotation?.id}
          onClick={() => onUpdate({ id: rotation.id, employeeProfileIds })}
        >
          Save employees
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
