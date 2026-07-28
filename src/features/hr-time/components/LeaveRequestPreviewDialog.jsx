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

export default function LeaveRequestPreviewDialog({
  open,
  preview,
  loading = false,
  error,
  onClose,
  onConfirm,
}) {
  const { t } = useTranslation()
  const requestedDays = Number(preview?.requestedUnits || 0) / 2

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>
        {t('hrTime.leavePreview.title', { defaultValue: 'Confirm leave request' })}
      </DialogTitle>
      <DialogContent className="grid gap-4 !pt-2">
        {error ? <Alert severity="error">{error}</Alert> : null}
        {!preview?.isPossible ? (
          <Alert severity="warning">
            {t('hrTime.leavePreview.notPossible', {
              defaultValue:
                'This request cannot be submitted with the current schedule or balance.',
            })}
          </Alert>
        ) : null}
        <div>
          <Typography variant="caption" className="font-semibold uppercase text-ink-muted">
            {t('hrTime.fields.requestedDays', { defaultValue: 'Requested leave' })}
          </Typography>
          <Typography variant="body1" className="mt-1 font-semibold text-ink-strong">
            {t('hrTime.units.days', { count: requestedDays, defaultValue: '{{count}} days' })}
          </Typography>
        </div>
        <div>
          <Typography variant="caption" className="font-semibold uppercase text-ink-muted">
            {t('hrTime.fields.workingDates', { defaultValue: 'Working dates' })}
          </Typography>
          <Typography variant="body2" className="mt-1 text-ink-secondary">
            {(preview?.workingDateKeys || []).join(', ') || '-'}
          </Typography>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Typography variant="caption" className="font-semibold uppercase text-ink-muted">
              {t('hrTime.fields.availableBalance', { defaultValue: 'Available balance' })}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-secondary">
              {preview?.availableUnits === null || preview?.availableUnits === undefined
                ? t('hrTime.labels.notLimited', { defaultValue: 'Not limited' })
                : t('hrTime.units.days', {
                    count: Number(preview.availableUnits) / 2,
                    defaultValue: '{{count}} days',
                  })}
            </Typography>
          </div>
          <div>
            <Typography variant="caption" className="font-semibold uppercase text-ink-muted">
              {t('hrTime.fields.overlaps', { defaultValue: 'Overlaps' })}
            </Typography>
            <Typography variant="body2" className="mt-1 text-ink-secondary">
              {preview?.conflictCount || 0}
            </Typography>
          </div>
        </div>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {t('common.cancel', { defaultValue: 'Cancel' })}
        </Button>
        <Button variant="contained" disabled={loading || !preview?.isPossible} onClick={onConfirm}>
          {t('hrTime.actions.confirmRequest', { defaultValue: 'Confirm request' })}
        </Button>
      </DialogActions>
    </Dialog>
  )
}
