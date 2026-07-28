import { useState } from 'react'
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

function failuresFrom(result, error) {
  return (
    result?.duplicates || result?.rowFailures || result?.failures || error?.data?.duplicates || []
  )
}

export default function HolidayBulkImportDialog({
  open,
  loading,
  error,
  result,
  onClose,
  onSubmit,
}) {
  const [rawItems, setRawItems] = useState(
    '[\n  { "name": "National Day", "dateKey": "2026-09-02", "holidayType": "PUBLIC_HOLIDAY" }\n]',
  )
  const [validationError, setValidationError] = useState('')
  const failures = failuresFrom(result, error)

  function submit(event) {
    event.preventDefault()
    try {
      const items = JSON.parse(rawItems)
      if (!Array.isArray(items) || items.length < 1 || items.length > 100) {
        setValidationError('Provide a JSON array with 1 to 100 holiday rows.')
        return
      }
      if (
        items.some((item) => !item?.name?.trim() || !/^\d{4}-\d{2}-\d{2}$/.test(item.dateKey || ''))
      ) {
        setValidationError('Every row needs a name and a YYYY-MM-DD dateKey.')
        return
      }
      setValidationError('')
      onSubmit(items)
    } catch {
      setValidationError('Enter a valid JSON array of holiday rows.')
    }
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="md">
      <form onSubmit={submit}>
        <DialogTitle>Import holidays</DialogTitle>
        <DialogContent className="space-y-4 !pt-2">
          <Typography variant="body2" className="text-ink-muted">
            Import 1 to 100 rows. Existing dates are reported after submission.
          </Typography>
          {validationError ? <Alert severity="error">{validationError}</Alert> : null}
          {error ? (
            <Alert severity="error">
              {error?.data?.message || error?.message || 'Could not import holidays'}
            </Alert>
          ) : null}
          <TextField
            multiline
            minRows={12}
            fullWidth
            label="Holiday rows (JSON)"
            value={rawItems}
            onChange={(event) => setRawItems(event.target.value)}
          />
          {result ? (
            <Alert severity="success">
              Imported {result.imported || 0}; skipped {result.skipped || 0}.
            </Alert>
          ) : null}
          {failures.map((failure, index) => (
            <Alert key={`${failure.dateKey || index}-${failure.reason || ''}`} severity="warning">
              Row {failure.dateKey || index + 1}:{' '}
              {failure.reason || failure.message || 'Not imported'}
            </Alert>
          ))}
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            Close
          </Button>
          <Button type="submit" variant="contained" disabled={loading}>
            Import
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
