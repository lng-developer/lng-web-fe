import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Typography,
} from '@mui/material'

export default function EmployeeLifecycleDialog({
  action,
  employee,
  loading = false,
  error = '',
  onClose,
  onConfirm,
}) {
  const isDelete = action === 'delete'
  const title = isDelete ? 'Delete employee profile' : 'Restore employee profile'
  const verb = isDelete ? 'Delete' : 'Restore'

  return (
    <Dialog open onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      <DialogContent className="space-y-3 !pt-2">
        {error ? <Alert severity="error">{error}</Alert> : null}
        <Typography>
          {employee?.fullName || '-'} {employee?.employeeCode ? `(${employee.employeeCode})` : ''}
        </Typography>
        <Typography variant="body2" className="text-ink-muted">
          {isDelete
            ? 'This employee profile will no longer appear in the active directory.'
            : 'This employee profile will appear in the active directory again.'}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button
          color={isDelete ? 'error' : 'primary'}
          variant="contained"
          disabled={loading}
          onClick={onConfirm}
        >
          {verb}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
