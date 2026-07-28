import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  TextField,
} from '@mui/material'

export default function LeaveRefundDialog({
  open,
  row,
  loading = false,
  error,
  onClose,
  onSubmit,
}) {
  const { t } = useTranslation()
  const [selectedDateKeys, setSelectedDateKeys] = useState([])
  const [reason, setReason] = useState('')
  const refunded = new Set(row?.refundedDateKeys || [])
  const remainingDateKeys = (row?.workingDateSnapshots || [])
    .map(({ dateKey }) => dateKey)
    .filter((dateKey) => !refunded.has(dateKey))
  const cannotRefundAll = selectedDateKeys.length >= remainingDateKeys.length
  const canSubmit = selectedDateKeys.length > 0 && reason.trim() && !cannotRefundAll

  function toggleDate(dateKey) {
    setSelectedDateKeys((current) =>
      current.includes(dateKey)
        ? current.filter((value) => value !== dateKey)
        : [...current, dateKey],
    )
  }

  return (
    <Dialog open={open} onClose={loading ? undefined : onClose} fullWidth maxWidth="sm">
      <form
        onSubmit={(event) => {
          event.preventDefault()
          if (canSubmit) onSubmit({ dateKeys: selectedDateKeys, reason: reason.trim() })
        }}
      >
        <DialogTitle>
          {t('hrTime.refund.title', { defaultValue: 'Refund leave dates' })}
        </DialogTitle>
        <DialogContent className="grid gap-3 !pt-2">
          {error ? <Alert severity="error">{error}</Alert> : null}
          <Alert severity="info">
            {t('hrTime.refund.help', {
              defaultValue: 'Select one or more dates, but keep at least one active leave date.',
            })}
          </Alert>
          {remainingDateKeys.map((dateKey) => {
            const selected = selectedDateKeys.includes(dateKey)
            const disableSelection =
              !selected && selectedDateKeys.length >= remainingDateKeys.length - 1
            return (
              <FormControlLabel
                key={dateKey}
                label={dateKey}
                control={
                  <Checkbox
                    checked={selected}
                    disabled={loading || disableSelection}
                    onChange={() => toggleDate(dateKey)}
                  />
                }
              />
            )
          })}
          <TextField
            required
            fullWidth
            multiline
            minRows={3}
            inputProps={{ maxLength: 500 }}
            label={t('hrTime.fields.reason', { defaultValue: 'Reason' })}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} disabled={loading}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            type="submit"
            color="warning"
            variant="contained"
            disabled={!canSubmit || loading}
          >
            {t('hrTime.actions.refund', { defaultValue: 'Refund selected dates' })}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  )
}
