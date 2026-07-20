import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  TextField,
  Typography,
} from '@mui/material'

export default function RequestDecisionDialog({
  open,
  action,
  requestType,
  row,
  loading = false,
  error,
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [reason, setReason] = useState('')
  const [approvedMinutes, setApprovedMinutes] = useState(
    row?.requestedMinutes ? String(row.requestedMinutes) : '',
  )

  const isOvertimeApproval = requestType === 'overtime' && action === 'approve'
  const requiresReason = action === 'reject' || action === 'cancel'
  const canSubmit =
    (!requiresReason || reason.trim()) &&
    (!isOvertimeApproval || !approvedMinutes || Number(approvedMinutes) > 0)
  const actionLabel = t(`hrTime.actions.${action}`, {
    defaultValue: action ? `${action[0].toUpperCase()}${action.slice(1)}` : '',
  })

  function submit(event) {
    event.preventDefault()
    if (!canSubmit) return

    if (requestType === 'leave' && action === 'approve') {
      onSubmit({})
      return
    }

    if (isOvertimeApproval) {
      onSubmit({
        ...(approvedMinutes ? { approvedMinutes: Number(approvedMinutes) } : {}),
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      })
      return
    }

    onSubmit({ reason: reason.trim() })
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="xs">
      <form onSubmit={submit}>
        <DialogTitle>
          {t('hrTime.decision.title', {
            action: actionLabel,
            defaultValue: `${actionLabel} request`,
          })}
        </DialogTitle>
        <DialogContent className="grid gap-4 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Typography variant="body2" className="text-ink-muted">
            {row?.employeeName || row?.employee?.fullName || ''}
          </Typography>
          {isOvertimeApproval ? (
            <TextField
              fullWidth
              type="number"
              label={t('hrTime.fields.approvedMinutes', { defaultValue: 'Approved minutes' })}
              value={approvedMinutes}
              helperText={t('hrTime.help.approvedMinutes', {
                defaultValue: 'Leave blank to approve the full requested duration.',
              })}
              slotProps={{ htmlInput: { min: 1, step: 1 } }}
              onChange={(event) => setApprovedMinutes(event.target.value)}
            />
          ) : null}
          {action !== 'approve' || requestType === 'overtime' ? (
            <TextField
              required={requiresReason}
              fullWidth
              multiline
              minRows={3}
              inputProps={{ maxLength: 500 }}
              label={t('hrTime.fields.reason', { defaultValue: 'Reason' })}
              value={reason}
              helperText={t('hrTime.help.decisionReason', {
                defaultValue: requiresReason
                  ? 'This reason is recorded with the decision.'
                  : 'Optional note for the employee.',
              })}
              onChange={(event) => setReason(event.target.value)}
            />
          ) : null}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <Button
            type="submit"
            variant="contained"
            color={action === 'reject' || action === 'cancel' ? 'error' : 'primary'}
            disabled={!canSubmit || loading}
          >
            {actionLabel}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
