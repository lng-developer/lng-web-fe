import Alert from '@mui/material/Alert'
import Button from '@mui/material/Button'
import DialogActions from '@mui/material/DialogActions'
import DialogContent from '@mui/material/DialogContent'
import DialogTitle from '@mui/material/DialogTitle'
import LinearProgress from '@mui/material/LinearProgress'
import Typography from '@mui/material/Typography'

import AnimatedDialog from '@/components/common/AnimatedDialog'

export default function PayrollActionDialog({
  open,
  title,
  confirmLabel = 'Confirm',
  preview,
  loading,
  error,
  outcome,
  onClose,
  onConfirm,
}) {
  const results = outcome?.results || []
  const failures = results.filter((result) => !result.success)

  return (
    <AnimatedDialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <DialogTitle>{title}</DialogTitle>
      {loading ? <LinearProgress /> : null}
      <DialogContent className="space-y-4">
        <Alert severity="warning">
          <Typography variant="subtitle2">Review preview</Typography>
          <Typography variant="body2">{preview}</Typography>
        </Alert>
        {error ? <Alert severity="error">{error}</Alert> : null}
        {results.length ? (
          <Alert severity={failures.length ? 'warning' : 'success'}>
            {outcome.matchedCount || 0} completed, {failures.length} failed.
            {failures.length ? (
              <ul className="mt-2 list-disc pl-5">
                {failures.map((result) => (
                  <li key={result.payrollResultId}>
                    {result.payrollResultId}: {result.code}
                  </li>
                ))}
              </ul>
            ) : null}
          </Alert>
        ) : null}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={loading}>
          {outcome ? 'Close' : 'Cancel'}
        </Button>
        {!outcome ? (
          <Button variant="contained" color="primary" onClick={onConfirm} disabled={loading}>
            {confirmLabel}
          </Button>
        ) : null}
      </DialogActions>
    </AnimatedDialog>
  )
}
