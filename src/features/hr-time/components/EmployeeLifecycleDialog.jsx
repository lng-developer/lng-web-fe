import { useTranslation } from 'react-i18next'
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
  const { t } = useTranslation()
  const isDelete = action === 'delete'
  const title = t(`hrTime.people.lifecycle.${isDelete ? 'deleteTitle' : 'restoreTitle'}`)
  const verb = t(`hrTime.people.lifecycle.${isDelete ? 'deleteAction' : 'restoreAction'}`)

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
            ? t('hrTime.people.lifecycle.deleteDescription')
            : t('hrTime.people.lifecycle.restoreDescription')}
        </Typography>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel')}
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
